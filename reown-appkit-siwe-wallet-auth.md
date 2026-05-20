# Reown AppKit + SIWE 项目落地：从钱包连接到后端登录态的完整前端方案

在 Web3 项目里，钱包连接和用户登录经常被混在一起讲，但它们不是一回事。

钱包连接只是证明“浏览器里有一个钱包，并且当前连接了某个地址”。SIWE，也就是 Sign-In with Ethereum，解决的是另一个问题：让用户用钱包签名一段标准化消息，然后由后端验证签名，并建立自己的业务登录态。

真实项目里不能只写一个 connect wallet 按钮。交易平台、资产面板、用户中心、订单系统、空投任务、账户风控都会依赖稳定的登录态。前端需要处理钱包弹窗、链配置、nonce、签名、后端校验、session 同步、地址变化退出、网络变化退出、断开钱包后的行为等一整条链路。

本文以一个真实 Web3 前端项目里的落地方式为背景，讲清楚 SIWE 在工程项目中应该怎么组织，而不是只写一个能跑的 demo。

---

## 1. SIWE 解决什么问题

在普通 Web2 系统里，用户一般用邮箱、手机号、密码、验证码登录。后端校验通过后，给浏览器设置 cookie 或返回 token，后续接口都基于这个登录态识别用户。

Web3 项目不一定有传统账号体系。用户最核心的身份通常是钱包地址。SIWE 的思路是：

```txt
用户连接钱包
  -> 前端从后端获取一次性 nonce
  -> 前端构造 SIWE message
  -> 让钱包签名
  -> 前端把 message 和 signature 交给后端
  -> 后端用签名恢复地址并校验 message 内容
  -> 校验通过后建立 session
```

这里面最重要的是 nonce。没有 nonce，签名可能被重放。比如用户曾经签过一段登录消息，攻击者如果拿到这段 message 和 signature，就可能重复提交给后端。nonce 的作用就是让每次登录签名都只能使用一次。

SIWE 适合这些场景：

- 用户中心：展示钱包地址、IP、设备、账户信息。
- 交易平台：下单、撤单、查看订单、查看持仓前需要登录。
- 空投 / 任务系统：绑定用户地址，记录任务完成状态。
- Web3 SaaS：用钱包地址作为组织或用户身份。
- 链上 + 链下混合系统：链上签名证明身份，链下 session 管业务权限。

它不适合替代所有签名场景。比如链上交易签名、EIP-712 订单签名、Permit 授权签名，这些不是登录签名。SIWE 的职责是“登录认证”，不是“业务授权”或“链上交易”。

---

## 2. 最简单的写法是什么

很多人刚开始会这样写钱包登录：

```tsx
'use client';

import {useAccount, useConnect, useSignMessage} from 'wagmi';

export function LoginButton() {
  const {address, isConnected} = useAccount();
  const {connect, connectors} = useConnect();
  const {signMessageAsync} = useSignMessage();

  async function handleLogin() {
    if (!isConnected) {
      connect({connector: connectors[0]});
      return;
    }

    const message = `Login with wallet: ${address}`;
    const signature = await signMessageAsync({message});

    await fetch('/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({address, message, signature}),
    });
  }

  return <button onClick={handleLogin}>Connect / Login</button>;
}
```

这段代码能说明基本流程：连接钱包、签名消息、提交给后端。

但是它不适合真实项目。原因很直接：它把钱包连接、登录消息构造、nonce、防重放、后端 session、链 ID、地址变化、网络变化、退出登录全部堆在一个组件里。随着业务复杂度上来，这种写法很快会失控。

---

## 3. 简单写法在真实项目中的问题

第一个问题是 message 不标准。SIWE 不是随便签一句 `Login with wallet`。标准 SIWE message 通常包含 `domain`、`address`、`statement`、`uri`、`version`、`chainId`、`nonce`、`issuedAt` 等信息。后端校验时需要判断这些字段是否可信。

第二个问题是 nonce 缺失或管理混乱。nonce 应该由后端生成，并且登录成功后失效。前端不能自己生成一个随机字符串就完事，因为真正要防的是服务端认证重放。

第三个问题是 session 和钱包状态没有同步。用户切换钱包地址后，如果后端 session 仍然绑定旧地址，就会出现“钱包显示 A 地址，接口返回 B 地址数据”的问题。对于交易平台、资产系统来说，这是严重问题。

第四个问题是 `chainId` 没有纳入登录约束。项目如果只支持 Arbitrum 或测试网，那么用户切换到不支持的链时，前端必须明确处理。否则后端 session、链上读写、业务链配置会出现不一致。

第五个问题是组件承担了太多职责。组件应该只负责触发登录弹窗和展示状态，不应该关心 nonce 从哪里来、SIWE message 怎么格式化、signature 怎么提交、登录成功后 AppKit 怎么同步 session。

第六个问题是退出策略没有定义。断开钱包是否退出后端登录态？切换地址是否退出？切换网络是否退出？这些都不是 UI 细节，而是产品安全策略。

---

## 4. 推荐的项目落地结构

SIWE 登录模块建议围绕“钱包配置、SIWE 配置、后端认证服务、组件消费”拆开，而不是把所有逻辑写进按钮组件。

一个精简但真实可维护的结构可以这样设计：

```txt
src/
  app/
    providers.tsx
  config/
    wallet.ts
    siwe.ts
  lib/
    services/
      auth.ts
    device.ts
    util.ts
  components/
    ConnectButton.tsx
    Auth.tsx
  features/
    account/
      AccountContent.tsx
  state/
    atomState.ts
```

`config/wallet.ts` 负责 Reown AppKit、WagmiAdapter、支持链、默认链、钱包入口、项目 metadata 等配置。它是钱包连接层的核心。

`config/siwe.ts` 负责 SIWE 登录流程。包括获取 nonce、生成 message、提交签名、读取 session、退出登录、地址变化和网络变化策略。

`lib/services/auth.ts` 只负责调用后端认证接口，例如 `getCsrfToken`、`signIn`、`getSession`、`signOut`。它不应该依赖 React 组件。

`lib/device.ts` 负责设备信息，比如 `deviceUuid`。登录时把设备信息带给后端，方便后端做设备记录、风控或登录审计。

`components/ConnectButton.tsx` 只负责展示连接按钮，并调用 `useAppKit().open()` 打开钱包弹窗。

`components/Auth.tsx` 负责路由级或组件级鉴权保护。用户未登录时可以拦截页面、显示登录入口或跳转。

`features/account/AccountContent.tsx` 是业务消费层。它不关心 SIWE 的底层实现，只消费登录后的账户信息，例如 address、IP、地区、上次登录 IP 等。

这个结构的关键是边界清楚：钱包连接归钱包配置，签名登录归 SIWE 配置，后端接口归 service，业务页面只消费结果。

---

## 5. 推荐写法一：把 SIWE 流程抽成独立配置

在使用 Reown AppKit 时，SIWE 不应该散落在按钮组件中，而应该集中放在 `siwe.ts` 中。

```ts
'use client';

import {createSIWEConfig, formatMessage} from '@reown/appkit-siwe';
import type {
  SIWECreateMessageArgs,
  SIWEVerifyMessageArgs,
} from '@reown/appkit-siwe';
import {chains} from './wallet';
import {sleep} from '@/lib/util';
import {getDeviceInfo} from '@/lib/device';
import {getCsrfToken, getSession, signIn, signOut} from '@/lib/services/auth';

export const siweConfig = createSIWEConfig({
  signOutOnAccountChange: true,
  signOutOnNetworkChange: true,
  signOutOnDisconnect: false,
  getMessageParams: async () => ({
    domain: typeof window !== 'undefined' ? window.location.host : '',
    uri: typeof window !== 'undefined' ? window.location.origin : '',
    chains: chains.map(chain => chain.id),
    statement: 'Please sign with your account',
  }),
  createMessage: ({address, ...args}: SIWECreateMessageArgs) => {
    return formatMessage(args, address);
  },
  getNonce: async address => {
    if (!address) {
      throw new Error('Address is required');
    }

    const nonce = await getCsrfToken(address);

    if (!nonce) {
      throw new Error('Failed to get nonce');
    }

    return nonce;
  },
  getSession: async () => {
    await sleep(500);

    const session = await getSession();

    if (!session) {
      return null;
    }

    return {
      address: session.address,
      chainId: session.chain_id,
    };
  },
  verifyMessage: async ({message, signature}: SIWEVerifyMessageArgs) => {
    const {deviceUuid} = getDeviceInfo();
    const result = await signIn({
      message,
      signature,
      device_uuid: deviceUuid,
    });

    return Boolean(result);
  },
  signOut: async () => {
    try {
      await signOut();
      return true;
    } catch {
      return false;
    }
  },
  onSignIn: async () => {
    // 登录成功后可以做埋点、刷新用户信息、同步全局状态等
  },
});
```

这里有几个关键点。

`signOutOnAccountChange: true` 表示钱包地址变化时退出登录。这对交易类应用很重要。因为用户地址就是身份主体，地址变了，原 session 就不应该继续使用。

`signOutOnNetworkChange: true` 表示链变化时退出登录。这个策略适合强依赖链 ID 的业务，比如交易平台、链上期权、Swap、借贷、空投领取等。

`signOutOnDisconnect: false` 表示断开钱包时不强制退出后端 session。这个策略要看业务。如果你的产品希望“断开钱包就彻底登出”，可以设为 true。如果你希望用户刷新页面后仍能短时间保持后端登录态，可以设为 false。

`getMessageParams` 统一构造 SIWE message 的基础参数。这里的 domain 和 uri 不应该写死。开发环境、测试环境、生产环境的域名不同，应该从 `window.location` 动态获取。

`getNonce` 从后端获取 nonce。前端不自己生成 nonce，这是 SIWE 落地里的基本原则。

`verifyMessage` 把 message 和 signature 交给后端。真正的签名校验应该发生在后端，前端只负责收集签名结果。

---

## 6. 推荐写法二：钱包配置和 SIWE 配置解耦

SIWE 配置完成后，需要注入到 Reown AppKit。钱包配置本身也应该独立维护。

```ts
'use client';

import {createAppKit, type Metadata} from '@reown/appkit/react';
import {WagmiAdapter} from '@reown/appkit-adapter-wagmi';
import {
  arbitrum,
  arbitrumSepolia,
  berachainTestnetbArtio,
} from '@reown/appkit/networks';
import type {Config} from '@wagmi/core';
import {siweConfig} from './siwe';

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
export const APP_CHAIN_ID = process.env.NEXT_PUBLIC_APP_CHAIN_ID;
export const APP_NET_TYPE = process.env.NEXT_PUBLIC_APP_NET_TYPE;

if (!projectId) {
  throw new Error('Project ID is not defined');
}

export const metadata: Metadata = {
  name: 'Syrupal Wallet',
  description: 'Option Trade On Chain',
  url: 'https://app.example.com',
  icons: ['/icons/logo.png'],
};

export function getChains() {
  if (APP_NET_TYPE === 'testnet') {
    return [arbitrumSepolia, berachainTestnetbArtio] as const;
  }

  if (APP_NET_TYPE === 'mainnet') {
    return [arbitrum, berachainTestnetbArtio] as const;
  }

  throw new Error('Invalid network type');
}

export const chains = getChains();
export type ChainId = 42161 | 421614;

export const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  chains,
  networks: [...chains],
});

export const appKitModal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...chains],
  defaultNetwork: chains[0],
  allowUnsupportedChain: false,
  siweConfig,
  metadata,
  projectId,
  features: {
    swaps: false,
    onramp: false,
    email: false,
    socials: false,
  },
  enableWalletConnect: false,
  featuredWalletIds: [
    // MetaMask
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96',
    // OKX Wallet
    '971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709',
  ],
});

appKitModal.subscribeCaipNetworkChange(caip => {
  const id = Number(caip?.id) as ChainId;
  console.log('caip network changed:', id);
});

export const config = wagmiAdapter.wagmiConfig as Config<typeof chains>;

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
```

这段配置解决的是“钱包基础设施”问题，不直接写业务。

`getChains` 根据环境变量选择支持链。这样测试网和主网可以复用同一套代码，只通过环境配置切换。

`allowUnsupportedChain: false` 表示不允许用户停留在不支持的链。真实交易项目里，这个配置很关键。否则用户可能连接了钱包，但链不对，后续读余额、签交易、下单都会出现不可预期的问题。

`features` 里关闭 swaps、onramp、email、socials，是为了让钱包弹窗更贴合当前产品。如果产品只需要钱包连接和 SIWE 登录，就不要暴露无关入口，避免用户误操作。

`featuredWalletIds` 用来控制推荐钱包，比如 MetaMask、OKX。对于面向交易用户的产品，这比完全放开钱包列表更可控。

---

## 7. 后端认证服务应该独立封装

前端的 SIWE 配置不应该直接到处写 `fetch('/api/xxx')`。认证相关接口建议统一放到 `auth.ts`。

```ts
export type LoginSession = {
  address: `0x${string}`;
  chain_id: number;
  ip?: string;
  ip_region?: string;
  previous_ip?: string;
  previous_ip_region?: string;
};

export type SignInPayload = {
  message: string;
  signature: string;
  device_uuid: string;
};

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getCsrfToken(address: string): Promise<string> {
  const result = await request<{nonce: string}>(
    `/api/auth/nonce?address=${address}`,
  );
  return result.nonce;
}

export async function signIn(payload: SignInPayload): Promise<LoginSession> {
  return request<LoginSession>('/api/auth/siwe', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getSession(): Promise<LoginSession | null> {
  try {
    return await request<LoginSession>('/api/auth/session');
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  await request('/api/auth/logout', {
    method: 'POST',
  });
}
```

这里的重点不是请求代码本身，而是职责分离。

`siwe.ts` 负责把 AppKit 的 SIWE 生命周期接到项目认证系统；`auth.ts` 负责和后端 API 通信；组件不直接知道接口细节。

这样做的好处是后端接口路径、返回结构、错误格式发生变化时，只需要改 service 层，不需要改钱包配置和页面组件。

---

## 8. 组件只消费结果，不承载登录细节

连接按钮应该非常薄。它只判断当前是否已经登录，如果没登录，就打开 AppKit 弹窗。

```tsx
'use client';

import {useAppKit} from '@reown/appkit/react';
import {Button} from '@/components/ui/button';
import {useClient} from '@/hooks/useClient';

export function ConnectButton({disabled}: {disabled?: boolean}) {
  const {isLogin} = useClient();
  const {open} = useAppKit();

  if (isLogin) {
    return null;
  }

  return (
    <Button variant="outline" disabled={disabled} onClick={() => open()}>
      CONNECT
    </Button>
  );
}
```

这个组件不应该知道 nonce，不应该知道 SIWE message，不应该知道签名怎么提交，也不应该知道后端怎么设置 cookie。

真实项目里，组件越薄，后续越容易维护。比如你要把按钮放在 Header、交易侧栏、账户页、空投页，所有地方都可以复用同一个入口，不会重复实现登录逻辑。

账户页面也是一样。它消费登录后的账户数据，而不是重新处理钱包签名。

```tsx
'use client';

import {useAtomValue} from 'jotai';
import {Auth} from '@/components/Auth';
import {userAccountAtom} from '@/state/atomState';
import {truncateAddress} from '@/lib/wallet';

export function AccountContent() {
  const userAccount = useAtomValue(userAccountAtom);

  return (
    <Auth>
      <section className="px-16 py-12">
        <h1 className="mb-8 text-2xl font-bold">Account</h1>
        <div className="grid grid-cols-3 items-center gap-4">
          <span>Owner Wallet Address</span>
          <div className="col-span-2">
            {truncateAddress(userAccount?.address)}
          </div>

          <span>Current IP Address / Area</span>
          <div className="col-span-2">
            {!userAccount && 'Loading...'}
            <span>{userAccount?.ip}</span>
            <span>{userAccount?.ip_region}</span>
          </div>

          <span>Previous IP Address / Area</span>
          <div className="col-span-2">
            {!userAccount && 'Loading...'}
            <span>{userAccount?.previous_ip}</span>
            <span>{userAccount?.previous_ip_region}</span>
          </div>
        </div>
      </section>
    </Auth>
  );
}
```

这类页面最关心的是业务信息：当前地址、当前 IP、历史 IP、账户归属。它不应该直接调用 `signMessage`。

---

## 9. 真实业务链路：一个交易平台里的 SIWE 是怎么工作的

把 SIWE 放到真实交易平台里，可以按这条链路理解。

用户进入站点，前端初始化 AppKit 和 Wagmi。AppKit 根据配置知道当前支持哪些链，默认链是什么，使用哪些钱包入口，是否启用 SIWE。

用户点击 CONNECT，前端调用 `open()` 打开钱包弹窗。用户选择钱包后，钱包连接成功，AppKit 开始触发 SIWE 流程。

SIWE 流程先调用 `getMessageParams`，拿到 `domain`、`uri`、`chains`、`statement` 等基础参数。然后调用 `getNonce(address)`，向后端申请一次性 nonce。

拿到 nonce 后，前端通过 `formatMessage` 生成标准 SIWE message，并让钱包签名。用户在钱包里确认签名后，前端拿到 signature。

接着 AppKit 调用 `verifyMessage`。前端把 `message`、`signature`、`deviceUuid` 提交给后端。后端解析 SIWE message，校验 domain、uri、chainId、nonce、签名地址，确认通过后写入 session。

登录成功后，前端可以通过 `getSession` 读取后端 session，并同步给 AppKit。此时业务页面可以读取用户账户信息，展示账户页、订单页、资产页。

如果用户切换钱包地址，因为配置了 `signOutOnAccountChange: true`，登录态会被清理。这样可以避免用户看到旧地址的数据。

如果用户切换网络，因为配置了 `signOutOnNetworkChange: true`，登录态也会被清理。这对链强绑定业务更安全。

如果用户断开钱包，因为配置了 `signOutOnDisconnect: false`，后端 session 不一定立即退出。这是一个业务取舍：断开钱包不等于立即注销账户，但后续需要签名或交易时仍然要重新连接钱包。

---

## 10. 错误处理、重试和生命周期

SIWE 登录里最容易被忽略的是错误边界。

`getNonce` 必须处理 address 为空、后端没有返回 nonce、nonce 请求失败。没有 nonce 时不应该继续签名。

```ts
getNonce: async address => {
  if (!address) {
    throw new Error('Address is required');
  }

  const nonce = await getCsrfToken(address);

  if (!nonce) {
    throw new Error('Failed to get nonce');
  }

  return nonce;
};
```

`verifyMessage` 必须返回明确的 boolean。后端校验失败时，不应该假装登录成功。

```ts
verifyMessage: async ({message, signature}) => {
  try {
    const {deviceUuid} = getDeviceInfo();
    const session = await signIn({
      message,
      signature,
      device_uuid: deviceUuid,
    });

    return Boolean(session);
  } catch (error) {
    console.error('SIWE verify failed:', error);
    return false;
  }
};
```

`signOut` 不应该把异常直接抛到 UI 层。退出失败通常可以记录日志，并返回 false，让 AppKit 知道退出没有完成。

```ts
signOut: async () => {
  try {
    await signOut();
    return true;
  } catch (error) {
    console.error('Sign out failed:', error);
    return false;
  }
};
```

`getSession` 需要考虑刷新页面后的状态恢复。很多真实项目会在应用初始化时读取后端 session，然后同步钱包登录状态。如果这里返回结构不稳定，就会导致页面一会儿显示未登录，一会儿又显示已登录。

```ts
getSession: async () => {
  const session = await getSession();

  if (!session?.address || !session?.chain_id) {
    return null;
  }

  return {
    address: session.address,
    chainId: session.chain_id,
  };
};
```

链和地址变化的生命周期也必须提前定义。一个偏交易、安全、资产类的项目，通常建议：

- 地址变化：退出登录。
- 网络变化：退出登录或强制切换回支持链。
- 断开钱包：根据产品策略决定是否退出后端 session。
- session 过期：重新触发 SIWE 登录。
- nonce 过期：重新获取 nonce，不复用旧 message。
- 后端 401：清理前端登录态并引导重新登录。

---

## 11. 一个更完整的 TypeScript 落地示例

下面给一个更完整的组织方式，接近真实项目写法。

先定义认证服务类型和接口。

```ts
// src/lib/services/auth.ts
export type Address = `0x${string}`;

export type AuthSession = {
  address: Address;
  chain_id: number;
  ip?: string;
  ip_region?: string;
  previous_ip?: string;
  previous_ip_region?: string;
};

export type SignInParams = {
  message: string;
  signature: string;
  device_uuid: string;
};

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new HttpError(response.status, await response.text());
  }

  return response.json() as Promise<T>;
}

export async function getCsrfToken(address: string): Promise<string> {
  const result = await request<{nonce: string}>(
    `/api/auth/nonce?address=${encodeURIComponent(address)}`,
  );
  return result.nonce;
}

export async function signIn(params: SignInParams): Promise<AuthSession> {
  return request<AuthSession>('/api/auth/siwe', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    return await request<AuthSession>('/api/auth/session');
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function signOut(): Promise<void> {
  await request('/api/auth/logout', {
    method: 'POST',
  });
}
```

然后封装设备信息。设备 ID 可以来自 `localStorage`、cookie 或后端下发，这里给一个简化版。

```ts
// src/lib/device.ts
const DEVICE_UUID_KEY = 'device_uuid';

function createUuid() {
  return crypto.randomUUID();
}

export function getDeviceInfo() {
  let deviceUuid = window.localStorage.getItem(DEVICE_UUID_KEY);

  if (!deviceUuid) {
    deviceUuid = createUuid();
    window.localStorage.setItem(DEVICE_UUID_KEY, deviceUuid);
  }

  return {
    deviceUuid,
  };
}
```

接着配置 SIWE。

```ts
// src/config/siwe.ts
'use client';

import {createSIWEConfig, formatMessage} from '@reown/appkit-siwe';
import type {
  SIWECreateMessageArgs,
  SIWEVerifyMessageArgs,
} from '@reown/appkit-siwe';
import {chains} from './wallet';
import {getDeviceInfo} from '@/lib/device';
import {
  getCsrfToken,
  getSession as requestSession,
  signIn as requestSignIn,
  signOut as requestSignOut,
} from '@/lib/services/auth';

export const siweConfig = createSIWEConfig({
  signOutOnAccountChange: true,
  signOutOnNetworkChange: true,
  signOutOnDisconnect: false,
  getMessageParams: async () => {
    return {
      domain: window.location.host,
      uri: window.location.origin,
      chains: chains.map(chain => chain.id),
      statement: 'Please sign with your account',
    };
  },
  createMessage: ({address, ...args}: SIWECreateMessageArgs) => {
    return formatMessage(args, address);
  },
  getNonce: async address => {
    if (!address) {
      throw new Error('Cannot create SIWE nonce without wallet address');
    }

    return getCsrfToken(address);
  },
  verifyMessage: async ({message, signature}: SIWEVerifyMessageArgs) => {
    try {
      const {deviceUuid} = getDeviceInfo();
      const session = await requestSignIn({
        message,
        signature,
        device_uuid: deviceUuid,
      });

      return Boolean(session.address);
    } catch (error) {
      console.error('[SIWE] verify message failed:', error);
      return false;
    }
  },
  getSession: async () => {
    try {
      const session = await requestSession();

      if (!session) {
        return null;
      }

      return {
        address: session.address,
        chainId: session.chain_id,
      };
    } catch (error) {
      console.error('[SIWE] get session failed:', error);
      return null;
    }
  },
  signOut: async () => {
    try {
      await requestSignOut();
      return true;
    } catch (error) {
      console.error('[SIWE] sign out failed:', error);
      return false;
    }
  },
  onSignIn: async () => {
    // 可以在这里刷新用户信息、埋点或同步全局状态
  },
});
```

再配置钱包。

```ts
// src/config/wallet.ts
'use client';

import {createAppKit, type Metadata} from '@reown/appkit/react';
import {WagmiAdapter} from '@reown/appkit-adapter-wagmi';
import {
  arbitrum,
  arbitrumSepolia,
  berachainTestnetbArtio,
} from '@reown/appkit/networks';
import type {Config} from '@wagmi/core';
import {siweConfig} from './siwe';

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;
const netType = process.env.NEXT_PUBLIC_APP_NET_TYPE;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is required');
}

export function getChains() {
  if (netType === 'testnet') {
    return [arbitrumSepolia, berachainTestnetbArtio] as const;
  }

  if (netType === 'mainnet') {
    return [arbitrum, berachainTestnetbArtio] as const;
  }

  throw new Error(`Unsupported net type: ${netType}`);
}

export const chains = getChains();

export const metadata: Metadata = {
  name: 'Syrupal Wallet',
  description: 'Option Trade On Chain',
  url: 'https://app.example.com',
  icons: ['/icons/logo.png'],
};

export const wagmiAdapter = new WagmiAdapter({
  ssr: false,
  projectId,
  chains,
  networks: [...chains],
});

export const appKitModal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...chains],
  defaultNetwork: chains[0],
  allowUnsupportedChain: false,
  siweConfig,
  metadata,
  projectId,
  features: {
    swaps: false,
    onramp: false,
    email: false,
    socials: false,
  },
  enableWalletConnect: false,
});

export const config = wagmiAdapter.wagmiConfig as Config<typeof chains>;

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
```

最后，组件层只消费。

```tsx
// src/components/ConnectButton.tsx
'use client';

import {useAppKit} from '@reown/appkit/react';

type ConnectButtonProps = {
  disabled?: boolean;
  isLogin: boolean;
};

export function ConnectButton({disabled, isLogin}: ConnectButtonProps) {
  const {open} = useAppKit();

  if (isLogin) {
    return null;
  }

  return (
    <button disabled={disabled} onClick={() => open()}>
      CONNECT
    </button>
  );
}
```

账户页面通过鉴权组件和全局账户状态消费登录结果。

```tsx
// src/features/account/AccountContent.tsx
'use client';

import {useAtomValue} from 'jotai';
import {Auth} from '@/components/Auth';
import {userAccountAtom} from '@/state/atomState';

function truncateAddress(address?: string) {
  if (!address) return '-';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AccountContent() {
  const account = useAtomValue(userAccountAtom);

  return (
    <Auth>
      <div>
        <h1>Account</h1>
        <p>Wallet: {truncateAddress(account?.address)}</p>
        <p>Current IP: {account?.ip ?? '-'}</p>
        <p>Current Region: {account?.ip_region ?? '-'}</p>
        <p>Previous IP: {account?.previous_ip ?? '-'}</p>
        <p>Previous Region: {account?.previous_ip_region ?? '-'}</p>
      </div>
    </Auth>
  );
}
```

到这里，SIWE 的职责已经被拆清楚了：AppKit 负责钱包交互，SIWE config 负责签名登录流程，auth service 负责后端通信，业务组件只消费登录态。

---

## 12. 工程化注意事项

SIWE 落地时，最容易踩的坑主要集中在几个地方。

第一，nonce 必须由后端生成，并且只能使用一次。前端不要自己生成 nonce，也不要缓存旧 nonce 反复使用。

第二，domain 和 uri 要校验。后端不能只验证签名地址，还要验证 message 里的 domain、uri、chainId、nonce 是否符合当前应用。

第三，签名登录和链上交易签名不要混用。SIWE message 是登录凭证，EIP-712 订单签名是业务授权，链上交易签名是执行交易，三者安全语义不同。

第四，地址变化必须处理。尤其是用户中心、资产面板、订单系统，如果钱包地址变了但 session 没变，会产生严重的数据错配。

第五，网络变化策略要和业务一致。如果项目只支持一条链，可以在网络变化时退出或强制切链。如果项目支持多链，则需要把 `chainId` 纳入用户上下文和接口参数。

第六，组件不要直接处理签名流程。按钮组件里只应该有 `open()`，不要出现获取 nonce、拼 message、提交 signature 这种逻辑。

第七，后端 session 和前端钱包状态要有同步机制。刷新页面、重新打开站点、session 过期、钱包断开，都应该有明确行为。

第八，设备信息、IP 信息、登录记录适合放在后端账户体系中。前端可以展示这些信息，但不要把它们当成认证依据。

第九，生产环境要注意 cookie 策略。涉及跨域时，SameSite、Secure、`credentials: include`、反向代理域名都要配置正确，否则本地能登录，线上 session 丢失。

第十，错误信息要分层。用户拒绝签名、nonce 获取失败、后端验签失败、session 过期、网络错误，应该在交互上区分处理，而不是统一显示“登录失败”。

---

## 13. 总结

SIWE 在前端不是一个简单的“签名按钮”，它是一条完整的认证链路。真正落地时，需要把钱包连接、SIWE message、nonce、防重放、后端 session、链 ID、地址变化、退出策略全部组织清楚。

推荐的实现方式是：钱包配置集中在 `wallet.ts`，SIWE 生命周期集中在 `siwe.ts`，认证接口集中在 `auth.ts`，业务组件只消费登录态和账户数据。这样项目扩展到交易、资产、订单、空投、账户安全等模块时，不需要到处复制登录逻辑。

对于 Web3 前端来说，钱包连接只是入口，SIWE 才是把钱包身份接入业务系统的关键层。把这层封装好，后面的交易签名、账户权限、用户中心、风控审计才有稳定的基础。
