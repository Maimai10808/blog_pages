# Web3 空投领取前端怎么落地：从 React Query、钱包切链到链上 Claim 的完整工程封装

空投领取页面看起来很简单：连钱包、做任务、点一个按钮、领取代币。

但在真实项目里，Airdrop Claim 不是一个按钮组件，而是一条完整的业务链路。它同时涉及用户登录态、任务进度、后端资格接口、Telegram / X / 社区任务、钱包连接、链 ID 校验、合约调用、交易确认、错误处理、状态恢复和领取后刷新。

如果把这些逻辑全部写在一个页面组件里，前期确实能跑，但后期会很难维护：组件越来越长，接口状态和链上状态混在一起，按钮 loading 无法区分，用户切换钱包后状态残留，交易失败后不知道该不该重试，领取成功后页面也不一定刷新正确。

本文以一个空投领取模块为例，整理一套更接近真实项目的前端落地方案：用 React Query 管理后端资格数据，用 wagmi / viem 管理链上交互，用业务 Hook 封装 claim 交易，用流程组件消费封装结果。

---

## 1. 空投领取前端到底解决什么问题

空投领取不是单纯的“调用合约 claim”。

从业务链路看，它至少包含三类状态。

第一类是用户本地流程状态。例如当前完成到第几步、是否跳过 Telegram 绑定、是否已经关注 X、是否已经加入社区。这类状态通常属于 client state，可以保存在 `localStorage`、Zustand 或普通组件状态里。

第二类是后端服务端状态。例如用户是否具备领取资格、后端生成的 Merkle proof、可领取数量、Telegram 绑定结果、市场列表、活动配置。这些是 server state，更适合交给 React Query 管理缓存、loading、error、refetch 和 enabled 条件请求。

第三类是链上状态。例如当前钱包地址是否已经领取过、当前钱包连接在哪条链、claim 交易 hash、receipt 是否成功、合约调用是否被用户拒签。这些状态来自钱包和区块链，需要通过 wagmi / viem 处理。

所以空投前端的核心不是 UI，而是把三类状态分清楚：

- 本地流程状态：当前步骤、跳过任务、按钮状态。
- 后端状态：领取参数、用户绑定、活动配置。
- 链上状态：钱包地址、链 ID、hasClaimed、txHash、receipt。

适合空投领取模块的场景包括：Web3 项目代币空投、NFT 白名单 claim、任务型增长活动、Telegram Mini App 绑定领取、邀请活动奖励领取、交易平台用户激励领取。

不适合的做法是：把所有状态都塞进一个组件，或者把所有接口数据都复制进本地 store。这样短期能跑，长期一定会乱。

---

## 2. 最简单的写法是什么

最简单的写法大概是这样：

```tsx
import { parseEther } from 'viem';
import { useAccount, useSwitchChain } from 'wagmi';
import { useWriteAirdropClaim } from '@/lib/web3/hooks/useAbi';

export function ClaimButton({ data }: { data: any }) {
  const { chainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending } = useWriteAirdropClaim();

  const handleClaim = async () => {
    if (chainId !== 42161) {
      await switchChainAsync({ chainId: 42161 });
    }

    await writeContractAsync({
      args: [
        parseEther(data.amount),
        data.proof,
        data.apiary_key,
        parseEther(data.apiary_amount),
        data.apiary_proof,
      ],
    });
  };

  return (
    <button disabled={isPending} onClick={handleClaim}>
      {isPending ? 'Claiming...' : 'Receive Airdrop'}
    </button>
  );
}
```

这段代码确实能完成最基本的合约调用：检查链，切链，发送交易。

但是它距离真实项目还差很多。

它没有处理后端资格接口什么时候请求；没有区分“交易发送中”和“等待 receipt 中”；没有读取用户是否已领取；没有处理用户拒签、合约 revert、fee cap 过低；没有在领取成功后刷新用户状态；没有在用户退出登录后重置本地状态；也没有把领取流程和任务步骤拆开。

更严重的是，组件开始直接理解链上参数结构。一旦 claim 参数变化，UI 组件也要跟着改。

---

## 3. 简单写法在真实项目中的问题

真实项目里的空投领取会遇到很多边界。

首先是请求时机。领取参数通常不是页面一加载就请求，而是用户完成任务、进入最后一步、登录态有效、钱包地址存在时才请求。如果没有 `enabled` 控制，就会产生无效请求，甚至导致未登录状态下请求私有接口。

其次是 server state 和 chain state 混在一起。后端返回的是 `amount`、`proof`、`apiary_key` 等 claim 参数；链上返回的是 `txHash`、`receipt.status`、`hasClaimed`。这两类数据生命周期不同，不应该混在一个组件状态里。

第三是交易状态不止一个 pending。`writeContractAsync` 的 pending 通常表示钱包交互或交易发送阶段；`waitForTransactionReceipt` 表示等待链上确认阶段。UI 上都可以叫 Claiming，但工程上应该分清楚。

第四是错误处理复杂。用户拒签不应该自动重试；合约执行失败可能是 proof 不对、已领取、金额不匹配；`FeeCapTooLow` 可能需要调整 gas 或提示用户；网络错误和业务错误也要分开。

第五是领取成功后的缓存同步。交易成功后，前端应该刷新用户资格、领取状态、余额、任务状态，而不是只弹一个 toast。

第六是流程恢复。空投任务一般有多个步骤，用户刷新页面后不能从第一步重新开始。任务进度应该通过本地配置或后端状态恢复。

第七是组件职责失控。如果页面组件同时做接口请求、Telegram 绑定、X 跳转、链上交易、错误判断、按钮文案和步骤计算，后期维护成本会很高。

所以一个可维护的空投模块，必须把“请求”“交易”“流程”“展示”拆开。

---

## 4. 推荐的项目落地结构

针对空投领取模块，可以采用一个轻量的 feature-based 结构：

```txt
src/
  features/
    airdrop/
      api.ts
      types.ts
      queryKeys.ts
      queries.ts
      mutations.ts
      hooks/
        useClaimAirdrop.ts
        useAirdropProcess.ts
      components/
        ClaimProcess.tsx
        ClaimStep.tsx
        ClaimButton.tsx
  lib/
    web3/
      hooks/
        useAbi.ts
  config/
    wallet.ts
    site.ts
```

每个文件的职责要明确。

`api.ts` 只放后端请求函数，例如获取领取参数、绑定 Telegram、获取市场或活动配置。

`types.ts` 定义后端返回数据、步骤类型、任务配置类型、claim 参数类型。

`queryKeys.ts` 统一管理 React Query 的 key，避免组件里到处写 `['private', 'user', 'receiveAirdrop']`。

`queries.ts` 封装只读请求，例如领取参数查询、市场列表查询。

`mutations.ts` 封装写操作，例如 Telegram 绑定、提交任务完成状态。

`useClaimAirdrop.ts` 封装链上 claim 逻辑，不渲染 UI。

`useAirdropProcess.ts` 封装流程状态，比如当前步骤、跳过步骤、完成步骤、资格判断。

`ClaimProcess.tsx` 负责组合页面流程，但不直接写合约细节。

`ClaimStep.tsx` 负责单个步骤 UI。

`ClaimButton.tsx` 只负责领取按钮展示和触发动作。

这套结构不追求复杂，而是让边界清楚：React Query 管接口，wagmi / viem 管链上交互，流程 Hook 管业务步骤，组件只消费结果。

---

## 5. 推荐写法一：先把类型定义清楚

空投领取最容易乱的地方，是数据结构没有明确边界。

先定义基础类型：

```ts
// src/features/airdrop/types.ts
import type { Hash } from 'viem';

export type AirdropStep = 1 | 2 | 3 | 4 | 5 | 6;

export type AirdropTaskConfig = {
  task1: boolean;
  task2: boolean;
  task3: boolean;
  task4: boolean;
  task5: boolean;
  skippedTasks: number[];
};

export type ReceiveAirdropData = {
  amount: string;
  proof: `0x${string}`[];
  apiary_key: string;
  apiary_amount: string;
  apiary_proof: `0x${string}`[];
};

export type AirdropProfile = {
  is_bind: boolean;
  connect_wallet_receive_amount: string;
  verify_wallet_receive_amount: string;
};

export type ClaimSuccessCallback = (hash: Hash) => void;
```

这里要注意，链上金额不要用 `number`。后端可以返回字符串，前端在合约调用前用 `parseEther` 转成 `bigint`。

`AirdropStep` 用联合类型限制步骤范围，避免出现 `activeStep = 99` 这种无效状态。

`ReceiveAirdropData` 对应后端 claim 参数。这个类型应该和合约参数保持一致。

---

## 6. 推荐写法二：React Query 统一管理后端状态

你的材料里有这样的查询封装：

```ts
export function useReceiveAirdropQuery(enabled: boolean) {
  return useQuery({
    queryKey: ['private', 'user', 'receiveAirdrop'],
    queryFn: () => getReceiveAirdrop(),
    enabled,
  });
}

export function useMarketsQuery() {
  return useQuery({
    queryKey: ['markets'],
    queryFn: () => getMarkets(),
  });
}
```

这比直接在组件里 `useEffect(fetch)` 好很多。但真实项目里建议进一步抽出 `queryKeys`，避免 key 到处硬编码。

```ts
// src/features/airdrop/queryKeys.ts
export const airdropQueryKeys = {
  all: ['airdrop'] as const,
  receive: () => [...airdropQueryKeys.all, 'receive'] as const,
  profile: () => [...airdropQueryKeys.all, 'profile'] as const,
};

export const marketQueryKeys = {
  all: ['markets'] as const,
};
```

然后封装查询：

```ts
// src/features/airdrop/queries.ts
import { useQuery } from '@tanstack/react-query';
import { getMarkets, getReceiveAirdrop } from './api';
import { airdropQueryKeys, marketQueryKeys } from './queryKeys';

export function useReceiveAirdropQuery(enabled: boolean) {
  return useQuery({
    queryKey: airdropQueryKeys.receive(),
    queryFn: getReceiveAirdrop,
    enabled,
    retry: false,
  });
}

export function useMarketsQuery() {
  return useQuery({
    queryKey: marketQueryKeys.all,
    queryFn: getMarkets,
    staleTime: 60_000,
  });
}
```

这里有两个工程点。

第一，`enabled` 很重要。领取参数是私有接口，应该在用户进入最后一步、已登录、钱包状态可用后再请求。

第二，如果 `getReceiveAirdrop` 真的会触发“领取”这种副作用，那它不应该用 `useQuery`，而应该改成 `useMutation`。查询只能做只读请求，写操作必须用 mutation，这是 React Query 落地里很重要的边界。

---

## 7. 推荐写法三：把链上 claim 封装成业务 Hook

链上 claim 逻辑不应该写在页面组件里。它应该被封装成一个业务 Hook，比如 `useClaimAirdrop`。

这个 Hook 负责：

- 读取钱包地址和链 ID。
- 必要时切换到目标链。
- 读取 `hasClaimed`。
- 发送 claim 交易。
- 等待 receipt。
- 处理 viem 错误。
- 成功后回调。
- 失败后更新错误状态。
- 用户登出时重置状态。

简化实现如下：

```ts
// src/features/airdrop/hooks/useClaimAirdrop.ts
import { useCallback, useEffect, useState } from 'react';
import { waitForTransactionReceipt } from '@wagmi/core';
import { toast } from 'sonner';
import {
  type Address,
  type BaseErrorType,
  type Hash,
  CallExecutionError,
  ContractFunctionExecutionError,
  FeeCapTooLowError,
  parseEther,
} from 'viem';
import { useAccount, useSwitchChain } from 'wagmi';
import { APP_CHAIN_ID, config } from '@/config/wallet';
import { eventBus, EVENTS } from '@/lib/events/eventBus';
import {
  useReadAirdropHasAddressClaimed,
  useWriteAirdropClaim,
} from '@/lib/web3/hooks/useAbi';
import type { ClaimSuccessCallback, ReceiveAirdropData } from '../types';

const initGas = parseEther('0.001', 'gwei');

export function useClaimAirdrop(airdropAmount?: string) {
  const { chainId, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [isError, setIsError] = useState(false);
  const [isWaitingReceipt, setIsWaitingReceipt] = useState(false);
  const [gas, setGas] = useState<bigint | undefined>(initGas);

  const { writeContractAsync, isPending: isWalletPending } = useWriteAirdropClaim();

  const { data: hasClaimed, refetch: refetchHasClaimed } =
    useReadAirdropHasAddressClaimed({
      args: [address as Address, parseEther(airdropAmount || '0')],
      query: {
        enabled: Boolean(address),
      },
    });

  const resetClaim = useCallback(() => {
    setIsError(false);
    setIsWaitingReceipt(false);
    setGas(initGas);
  }, []);

  useEffect(() => {
    const unsubscribe = eventBus.on(EVENTS.USER_SIGN_OUT, resetClaim);

    return () => {
      unsubscribe();
    };
  }, [resetClaim]);

  const increaseGas = useCallback(() => {
    setGas(current => (current ? current * 2n : initGas));
  }, []);

  const claim = useCallback(
    async (data: ReceiveAirdropData, onSuccess?: ClaimSuccessCallback) => {
      if (!data || !chainId || !address) return;

      setIsError(false);
      setIsWaitingReceipt(true);

      try {
        if (chainId !== APP_CHAIN_ID) {
          await switchChainAsync({ chainId: APP_CHAIN_ID });
        }

        const txHash = await writeContractAsync({
          args: [
            parseEther(data.amount),
            data.proof,
            data.apiary_key,
            parseEther(data.apiary_amount),
            data.apiary_proof,
          ],
          gas,
        });

        const receipt = await waitForTransactionReceipt(config, {
          chainId: APP_CHAIN_ID,
          hash: txHash,
        });

        if (receipt.status !== 'success') {
          setIsError(true);
          toast.error('Claim failed');
          return;
        }

        await refetchHasClaimed();
        onSuccess?.(txHash as Hash);
        toast.success('Congratulations! Claim success');
      } catch (error) {
        const normalizedError = error as BaseErrorType;

        setIsError(true);
        toast.error(normalizedError.shortMessage || 'Claim failed');

        if (normalizedError instanceof CallExecutionError) {
          console.error(
            'CallExecutionError:',
            normalizedError.name,
            normalizedError.cause?.name
          );
        }

        if (normalizedError instanceof ContractFunctionExecutionError) {
          const isUserRejected =
            normalizedError.shortMessage?.includes('User rejected the request');

          if (!isUserRejected) {
            increaseGas();
          }
        }

        if (normalizedError instanceof FeeCapTooLowError) {
          increaseGas();
        }
      } finally {
        setIsWaitingReceipt(false);
      }
    },
    [
      chainId,
      address,
      switchChainAsync,
      writeContractAsync,
      gas,
      increaseGas,
      refetchHasClaimed,
    ]
  );

  return {
    claim,
    hasClaimed,
    isError,
    isWalletPending,
    isWaitingReceipt,
    isClaiming: isWalletPending || isWaitingReceipt,
    resetClaim,
  };
}
```

这个 Hook 的重点不是“封装一层函数”，而是把链上交易生命周期收敛起来。

组件不应该知道 `waitForTransactionReceipt` 怎么写，也不应该知道 `FeeCapTooLowError` 是什么。组件只需要知道：现在能不能点、是不是 claiming、失败没有、成功后做什么。

---

## 8. 推荐写法四：把流程状态单独封装

空投页面通常不是只有 claim 按钮，而是一个任务流程。

比如：

1. 连接 Arbitrum 钱包。
2. 绑定 Telegram Mini App。
3. 关注官方 X。
4. 加入 Telegram 社区。
5. 领取链上空投。

这些属于业务流程状态，不应该和合约交易混在一起。

可以抽一个 `useAirdropProcess`：

```ts
// src/features/airdrop/hooks/useAirdropProcess.ts
import { useCallback, useMemo } from 'react';
import type { AirdropProfile, AirdropStep, AirdropTaskConfig } from '../types';

const defaultConfig: AirdropTaskConfig = {
  task1: false,
  task2: false,
  task3: false,
  task4: false,
  task5: false,
  skippedTasks: [],
};

type UseAirdropProcessOptions = {
  isLogin: boolean;
  hasClaimed?: boolean;
  airdrop?: AirdropProfile;
  config: AirdropTaskConfig;
  setConfig: (updater: (prev: AirdropTaskConfig) => AirdropTaskConfig) => void;
};

export function useAirdropProcess({
  isLogin,
  hasClaimed,
  airdrop,
  config = defaultConfig,
  setConfig,
}: UseAirdropProcessOptions) {
  const activeStep = useMemo<AirdropStep>(() => {
    if (!config.task1) return 1;
    if (!config.task2) return 2;
    if (!config.task3) return 3;
    if (!config.task4) return 4;
    if (!config.task5) return 5;

    return 6;
  }, [config]);

  const hasEligible = useMemo(() => {
    if (!airdrop) return false;

    const connectAmount = Number(airdrop.connect_wallet_receive_amount || 0);
    const verifyAmount = Number(airdrop.verify_wallet_receive_amount || 0);

    return connectAmount > 0 || verifyAmount > 0;
  }, [airdrop]);

  const completeStep = useCallback(
    (stepId: number) => {
      setConfig(prev => ({
        ...prev,
        [`task${stepId}`]: true,
      }));
    },
    [setConfig]
  );

  const skipStep = useCallback(
    (stepId: number) => {
      setConfig(prev => ({
        ...prev,
        [`task${stepId}`]: true,
        skippedTasks: prev.skippedTasks.includes(stepId)
          ? prev.skippedTasks
          : [...prev.skippedTasks, stepId],
      }));
    },
    [setConfig]
  );

  const syncByUserState = useCallback(() => {
    if (!isLogin) return;

    if (hasClaimed) {
      setConfig(prev => ({
        ...prev,
        task1: true,
        task2: true,
        task3: true,
        task4: true,
        task5: true,
        skippedTasks: airdrop?.is_bind ? prev.skippedTasks : [2],
      }));
      return;
    }

    if (airdrop?.is_bind) {
      setConfig(prev => ({
        ...prev,
        task1: true,
        task2: true,
      }));
      return;
    }

    setConfig(prev => ({
      ...prev,
      task1: true,
    }));
  }, [isLogin, hasClaimed, airdrop, setConfig]);

  return {
    activeStep,
    hasEligible,
    completeStep,
    skipStep,
    syncByUserState,
  };
}
```

这样做之后，流程逻辑就从页面组件里拿出来了。页面组件只负责把步骤渲染出来，并在用户点击时调用 `completeStep` 或 `skipStep`。

---

## 9. 组件如何消费封装后的结果

流程组件可以这样组织：

```tsx
// src/features/airdrop/components/ClaimProcess.tsx
'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { siteConfig } from '@/config/site';
import { useClient } from '@/hooks/useClient';
import { useUserConfig } from '@/hooks/useUserConfig';
import { useReceiveAirdropQuery } from '../queries';
import { useClaimAirdrop } from '../hooks/useClaimAirdrop';
import { useAirdropProcess } from '../hooks/useAirdropProcess';
import { useUserBindMutation } from '../mutations';
import { ClaimStep } from './ClaimStep';

export function ClaimProcess() {
  const { isLogin, airdrop } = useClient();
  const { config, setConfig } = useUserConfig();
  const bindTelegram = useUserBindMutation();

  const { claim, hasClaimed, isClaiming, isError } =
    useClaimAirdrop(airdrop?.connect_wallet_receive_amount);

  const {
    activeStep,
    hasEligible,
    completeStep,
    skipStep,
    syncByUserState,
  } = useAirdropProcess({
    isLogin,
    hasClaimed,
    airdrop,
    config,
    setConfig,
  });

  const { data: airdropData, isLoading: isAirdropDataLoading } =
    useReceiveAirdropQuery(activeStep === 5 && isLogin && !hasClaimed);

  useEffect(() => {
    syncByUserState();
  }, [syncByUserState]);

  const handleBindTelegram = async (payload: any) => {
    const result = await bindTelegram.mutateAsync(payload);

    if (result.code === 0) {
      completeStep(2);
    }
  };

  const handleFollowX = () => {
    window.open(siteConfig.links.twitter, '_blank');
    completeStep(3);
  };

  const handleJoinTelegram = () => {
    window.open(siteConfig.links.telegram, '_blank');
    completeStep(4);
  };

  const handleClaim = async () => {
    if (!airdropData?.data || isClaiming || !hasEligible) return;

    await claim(airdropData.data, () => {
      completeStep(5);
    });
  };

  const claimButtonText = (() => {
    if (isClaiming) {
      return (
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Claiming...
        </span>
      );
    }

    if (activeStep > 5 || hasClaimed) return 'Airdrop claimed';
    if (!hasEligible) return 'Not eligible';
    if (isAirdropDataLoading) return 'Loading...';

    return 'Receive Airdrop';
  })();

  return (
    <div className="flex flex-col">
      <ClaimStep
        id={1}
        activeStep={activeStep}
        title="Connect to Arbitrum Wallet"
        description="The system will automatically calculate your available airdrop amount."
      >
        {/* 这里可以放 ConnectButton */}
      </ClaimStep>

      <ClaimStep
        id={2}
        activeStep={activeStep}
        title="Verify Telegram Mini App"
        canSkip
        onSkip={() => skipStep(2)}
      >
        <button onClick={() => handleBindTelegram({})}>
          Login with Telegram
        </button>
      </ClaimStep>

      <ClaimStep id={3} activeStep={activeStep} title="Follow Syrupal Official">
        <button onClick={handleFollowX}>Follow X</button>
      </ClaimStep>

      <ClaimStep
        id={4}
        activeStep={activeStep}
        title="Join Telegram community"
        canSkip
        onSkip={() => skipStep(4)}
      >
        <button onClick={handleJoinTelegram}>Join Telegram</button>
      </ClaimStep>

      <ClaimStep id={5} activeStep={activeStep}>
        <button
          disabled={activeStep !== 5 || isClaiming || !hasEligible || !airdropData?.data}
          onClick={handleClaim}
        >
          {claimButtonText}
        </button>

        {isError && <span>Airdrop claim failed</span>}
      </ClaimStep>
    </div>
  );
}
```

这个组件仍然负责业务编排，但复杂细节已经被拆出去了。

它不直接写 `parseEther`，不直接写 `waitForTransactionReceipt`，不直接判断 viem 错误类型，也不直接硬编码 queryKey。

组件只做几件事：读取 Hook 结果、渲染步骤、触发绑定、触发跳转、触发 claim。

---

## 10. ClaimStep 只做步骤 UI，不承载业务

单个步骤组件应该尽量保持纯粹：

```tsx
// src/features/airdrop/components/ClaimStep.tsx
import type { ReactNode } from 'react';
import type { AirdropStep } from '../types';

type ClaimStepProps = {
  id: number;
  activeStep: AirdropStep;
  title?: string;
  description?: string;
  canSkip?: boolean;
  onSkip?: () => void;
  children?: ReactNode;
};

export function ClaimStep({
  id,
  activeStep,
  title,
  description,
  canSkip,
  onSkip,
  children,
}: ClaimStepProps) {
  const isActive = activeStep === id;
  const isCompleted = activeStep > id;

  return (
    <section data-active={isActive} data-completed={isCompleted}>
      <div>
        <span>{id}</span>

        <div>
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
          {isActive && children}
        </div>

        {canSkip && isActive && <button onClick={onSkip}>Skip</button>}
        {isCompleted && <span>Completed</span>}
      </div>
    </section>
  );
}
```

这类组件不要调用 `useUserConfig`，也不要自己判断 Telegram 绑定是否完成。否则每个 Step 都订阅同一份配置，步骤一多就会让数据流变散。

更推荐的做法是：父组件计算好 `activeStep`、`isCompleted`、`isSkipped`，子组件只负责展示。

---

## 11. 错误处理、重试和缓存同步

空投模块里最关键的错误处理在链上交易部分。

用户拒签是正常行为，不应该展示成系统错误，也不应该提高 gas 后自动重试。

合约执行失败需要看具体原因。可能是 proof 错误、已领取、活动结束、参数不匹配。前端可以先给通用提示，但最好在业务层做错误码映射，而不是只依赖 `shortMessage.includes()`。

`FeeCapTooLowError` 可以尝试提高 gas 或提示用户钱包网络费用过低。但 gas 策略要谨慎，不要无限翻倍。真实项目里更建议设置最大重试次数或最大 gas 上限。

领取成功后，不要只改本地步骤。至少应该刷新这些数据：

```ts
queryClient.invalidateQueries({
  queryKey: airdropQueryKeys.profile(),
});

queryClient.invalidateQueries({
  queryKey: airdropQueryKeys.receive(),
});
```

如果页面还展示余额，也要刷新 token balance 或账户资产。如果后端有领取记录，也要刷新领取历史。

React Query 的关键价值就在这里：不要让每个组件自己想办法刷新，而是通过统一 queryKey 做失效刷新。

如果项目有 SSE 或 WebSocket 推送交易状态，也可以在收到“claim success”事件后 `setQueryData` 或 `invalidateQueries`，让页面和服务端状态保持一致。

---

## 12. 结合真实业务：一个完整空投领取链路

真实落地时，可以把整个链路拆成这样：

1. 用户进入 Airdrop 页面，先读取本地任务配置和用户登录态。如果用户没有连接钱包，第一步展示 `ConnectButton`。
2. 钱包连接后，读取后端用户空投配置，比如钱包连接可领取额度、Telegram 绑定可领取额度、是否已绑定 Telegram。
3. 如果用户已绑定 Telegram，就自动完成前两步；如果没有绑定，则第二步展示 Telegram `LoginButton`，并在绑定成功后更新用户配置和任务状态。
4. 关注 X 和加入 Telegram 社区通常是外部跳转任务。前端可以在点击后标记完成，但如果项目要求严格校验，就应该让后端校验关注状态，而不是前端点击即完成。
5. 进入第 5 步后，`useReceiveAirdropQuery(activeStep === 5)` 才请求领取参数。这样可以避免未完成任务时提前拿到 proof。
6. 用户点击领取按钮后，前端检查 `hasEligible`、`airdropData`、`isClaiming`、`chainId`。链不对就先切链，然后发送合约交易。
7. 拿到 hash 后继续等待 receipt。只有 receipt 成功，才标记任务完成，刷新 `hasClaimed` 和后端用户状态。
8. 用户退出登录时，通过 `eventBus` 重置 claim 本地状态，避免旧钱包的错误或 pending 状态影响下一个用户。

这条链路里，React Query、wagmi、viem、local config、eventBus 各自负责一部分，不要混成一个巨型组件。

---

## 13. 完整代码示例：空投模块核心实现

下面给一个相对完整的模块化示例。

先是 API：

```ts
// src/features/airdrop/api.ts
import type { ReceiveAirdropData, AirdropProfile } from './types';

type ApiResponse<T> = {
  code: number;
  data: T;
  message?: string;
};

export async function getReceiveAirdrop(): Promise<ApiResponse<ReceiveAirdropData>> {
  const response = await fetch('/api/airdrop/receive', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch receive airdrop data');
  }

  return response.json();
}

export async function getAirdropProfile(): Promise<ApiResponse<AirdropProfile>> {
  const response = await fetch('/api/airdrop/profile', {
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch airdrop profile');
  }

  return response.json();
}

export async function bindTelegram(payload: unknown): Promise<ApiResponse<AirdropProfile>> {
  const response = await fetch('/api/user/bind-telegram', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to bind Telegram');
  }

  return response.json();
}
```

然后是 `queryKeys`：

```ts
// src/features/airdrop/queryKeys.ts
export const airdropQueryKeys = {
  all: ['airdrop'] as const,
  profile: () => [...airdropQueryKeys.all, 'profile'] as const,
  receive: () => [...airdropQueryKeys.all, 'receive'] as const,
};
```

查询和 mutation：

```ts
// src/features/airdrop/queries.ts
import { useQuery } from '@tanstack/react-query';
import { getAirdropProfile, getReceiveAirdrop } from './api';
import { airdropQueryKeys } from './queryKeys';

export function useAirdropProfileQuery(enabled: boolean) {
  return useQuery({
    queryKey: airdropQueryKeys.profile(),
    queryFn: getAirdropProfile,
    enabled,
  });
}

export function useReceiveAirdropQuery(enabled: boolean) {
  return useQuery({
    queryKey: airdropQueryKeys.receive(),
    queryFn: getReceiveAirdrop,
    enabled,
    retry: false,
  });
}
```

```ts
// src/features/airdrop/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bindTelegram } from './api';
import { airdropQueryKeys } from './queryKeys';

export function useBindTelegramMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bindTelegram,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: airdropQueryKeys.profile(),
      });
    },
  });
}
```

链上 claim Hook：

```ts
// src/features/airdrop/hooks/useClaimAirdrop.ts
import { useCallback, useState } from 'react';
import { waitForTransactionReceipt } from '@wagmi/core';
import { toast } from 'sonner';
import {
  type BaseErrorType,
  type Hash,
  ContractFunctionExecutionError,
  FeeCapTooLowError,
  parseEther,
} from 'viem';
import { useAccount, useSwitchChain } from 'wagmi';
import { APP_CHAIN_ID, config } from '@/config/wallet';
import { useWriteAirdropClaim } from '@/lib/web3/hooks/useAbi';
import type { ReceiveAirdropData } from '../types';

export function useClaimAirdrop() {
  const { chainId, address } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isWalletPending } = useWriteAirdropClaim();
  const [isWaitingReceipt, setIsWaitingReceipt] = useState(false);
  const [isError, setIsError] = useState(false);

  const claim = useCallback(
    async (data: ReceiveAirdropData, onSuccess?: (hash: Hash) => void) => {
      if (!address || !chainId) {
        toast.error('Please connect wallet first');
        return;
      }

      setIsError(false);
      setIsWaitingReceipt(true);

      try {
        if (chainId !== APP_CHAIN_ID) {
          await switchChainAsync({ chainId: APP_CHAIN_ID });
        }

        const hash = await writeContractAsync({
          args: [
            parseEther(data.amount),
            data.proof,
            data.apiary_key,
            parseEther(data.apiary_amount),
            data.apiary_proof,
          ],
        });

        const receipt = await waitForTransactionReceipt(config, {
          chainId: APP_CHAIN_ID,
          hash,
        });

        if (receipt.status !== 'success') {
          setIsError(true);
          toast.error('Claim failed');
          return;
        }

        onSuccess?.(hash);
        toast.success('Claim success');
      } catch (error) {
        const normalizedError = error as BaseErrorType;

        setIsError(true);

        if (normalizedError instanceof ContractFunctionExecutionError) {
          const isUserRejected = normalizedError.shortMessage?.includes('User rejected');
          toast.error(isUserRejected ? 'User rejected request' : 'Contract execution failed');
          return;
        }

        if (normalizedError instanceof FeeCapTooLowError) {
          toast.error('Network fee is too low, please try again');
          return;
        }

        toast.error(normalizedError.shortMessage || 'Claim failed');
      } finally {
        setIsWaitingReceipt(false);
      }
    },
    [address, chainId, switchChainAsync, writeContractAsync]
  );

  return {
    claim,
    isError,
    isWalletPending,
    isWaitingReceipt,
    isClaiming: isWalletPending || isWaitingReceipt,
  };
}
```

最后是组件消费：

```tsx
// src/features/airdrop/components/AirdropClaimPanel.tsx
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useReceiveAirdropQuery } from '../queries';
import { airdropQueryKeys } from '../queryKeys';
import { useClaimAirdrop } from '../hooks/useClaimAirdrop';

type AirdropClaimPanelProps = {
  activeStep: number;
  hasEligible: boolean;
  onClaimSuccess: () => void;
};

export function AirdropClaimPanel({
  activeStep,
  hasEligible,
  onClaimSuccess,
}: AirdropClaimPanelProps) {
  const queryClient = useQueryClient();
  const { claim, isClaiming, isError } = useClaimAirdrop();

  const { data, isLoading } = useReceiveAirdropQuery(
    activeStep === 5 && hasEligible
  );

  const handleClaim = async () => {
    if (!data?.data || isClaiming || !hasEligible) return;

    await claim(data.data, async () => {
      onClaimSuccess();

      await queryClient.invalidateQueries({
        queryKey: airdropQueryKeys.profile(),
      });

      await queryClient.invalidateQueries({
        queryKey: airdropQueryKeys.receive(),
      });
    });
  };

  const buttonText = (() => {
    if (!hasEligible) return 'Not eligible';
    if (isLoading) return 'Loading...';
    if (isClaiming) return 'Claiming...';

    return 'Receive Airdrop';
  })();

  return (
    <div>
      <button
        disabled={!hasEligible || isLoading || isClaiming || !data?.data}
        onClick={handleClaim}
      >
        {buttonText}
      </button>

      {isError && <p>Airdrop claim failed</p>}
    </div>
  );
}
```

这一版的组件不关心合约参数怎么转，也不关心 receipt 怎么等，只消费 `useClaimAirdrop` 的结果。

---

## 14. 工程化注意事项

空投领取模块有几个常见坑。

第一，领取接口如果会改变状态，不要用 `useQuery`。比如接口名字叫 `receiveAirdrop`，但它只是返回 claim 参数，可以用 query。如果它真的会标记领取或发放奖励，就必须用 mutation。

第二，`queryKey` 不要散落。空投模块会有 `profile`、`receive`、`history`、`markets` 等多个查询。统一 `queryKey` 后，领取成功才能准确 invalidate。

第三，链上金额必须用字符串加 `parseEther` 或 `parseUnits`。不要用 JS 浮点数计算最终链上金额。

第四，claim 成功不能只看 `writeContractAsync` 返回 hash。hash 只代表交易发送出去了，不代表链上成功。必须等 receipt，并判断 `receipt.status`。

第五，用户拒签不是异常事故。它是正常用户行为，不应该自动重试，也不应该污染业务错误状态太久。

第六，切链失败要中断交易。用户拒绝切链时，不要继续发送 claim。

第七，`hasClaimed` 应该依赖钱包地址启用。地址为空时不要强行读取合约，避免无效参数。

第八，任务完成状态和链上领取状态要能互相校正。如果链上已经领取，本地任务状态应该自动完成，而不是仍然停留在第 3 步。

第九，外部跳转任务要看业务要求。点击 X 或 Telegram 后立刻完成，体验好但校验弱；如果奖励价值较高，应该交给后端做任务校验。

第十，gas 兜底策略不能无限增长。可以有限重试，但最好设置上限，并把具体错误暴露给用户。

第十一，组件不要直接处理 viem error class。错误类型判断属于交易 Hook 的职责，组件最多展示 `isError` 和错误文案。

第十二，领取成功后要刷新缓存。用户资格、领取参数、`hasClaimed`、余额、任务状态，都可能需要同步更新。

---

## 15. 总结

空投领取前端的工程重点，不是把合约方法调通，而是把一条跨后端、钱包、合约和本地流程的业务链路拆清楚。

一个比较稳的落地方式是：

- React Query 管后端领取参数和用户资格。
- wagmi / viem 管钱包状态、切链、合约写入和 receipt。
- 业务 Hook 封装 claim 交易生命周期。
- 流程 Hook 管步骤推进和状态恢复。
- 组件只负责展示步骤和触发动作。

这样拆完之后，空投模块的复杂度并没有消失，但它被放到了正确的位置。后续要改 Telegram 绑定、增加任务、替换合约参数、调整错误提示、领取成功后刷新余额，都可以在对应层里改，而不是不断往一个巨型页面组件里塞逻辑。

对于 Web3 前端来说，这种模块边界比单次交易代码更重要。因为真正上线后，用户不会只遇到“正常领取成功”这一条路径，他们会切错链、拒签、刷新页面、重复点击、换钱包、网络失败、合约 revert。

空投模块能不能稳定，主要就看这些边界有没有被提前设计进去。
