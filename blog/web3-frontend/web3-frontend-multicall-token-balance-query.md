# 前端开发如何用 Multicall 优化链上数据读取：以 Next.js 批量查询 Token 余额为例

在区块链应用开发中，前端页面经常需要读取链上数据。

比如一个钱包页面，需要展示用户持有的 ETH、USDC、USDT、DAI、LINK 等资产余额；一个 DeFi 页面，需要展示多个资金池的 TVL、APR、用户存款数量、可领取奖励；一个 NFT 页面，也可能需要读取多个合约的 owner、metadata 或授权状态。

这些操作本质上都需要向区块链节点发起请求。节点可以是自己运行的，也可以是第三方服务，比如 Alchemy、Infura、QuickNode 等。

如果是自己运行节点，请求次数相对自由；但大多数前端项目会使用第三方 RPC 服务，这时就会遇到几个问题：

1. 请求次数太多，容易触发 rate limit；
2. 页面加载速度慢，用户等待时间长；
3. 多个请求并发时，前端状态管理变复杂；
4. 某些 RPC 服务对批量请求支持不稳定；
5. 页面首屏需要等很多链上请求返回，体验不好。

假设我们要在 Next.js 页面中展示用户的 10 个 ERC20 Token 余额。最直接的写法是分别调用 10 次 `balanceOf`。

```ts
const usdcBalance = await usdcContract.read.balanceOf([address]);
const usdtBalance = await usdtContract.read.balanceOf([address]);
const daiBalance = await daiContract.read.balanceOf([address]);
const linkBalance = await linkContract.read.balanceOf([address]);
```text

如果 Token 更多，请求数量就会继续增加。

这时，Multicall 就非常适合前端场景。

## 一、什么是 Multicall？

Multicall 可以理解为一种“链上批量读取工具”。

普通读取方式是：

```text
前端请求 1 → 读取 USDC 余额
前端请求 2 → 读取 USDT 余额
前端请求 3 → 读取 DAI 余额
前端请求 4 → 读取 LINK 余额
```

而 Multicall 的方式是：

```text
前端一次请求 → Multicall 聚合读取多个合约数据 → 一次性返回所有结果
```text

也就是说，前端不需要为每个合约调用都单独发一次 RPC 请求，而是把多个只读调用打包起来，通过 Multicall 一次性拿到结果。

它特别适合读取 Solidity 合约里的 `view` 或 `pure` 函数，例如：

```solidity
balanceOf(address)
decimals()
symbol()
name()
allowance(address,address)
getReserves()
totalSupply()
```

这些函数不会修改链上状态，不需要用户签名，也不消耗 gas，只是读取链上数据。

## 二、为什么前端更需要 Multicall？

后端脚本慢一点可能还能接受，但前端页面不一样。

用户打开页面时，首屏加载速度非常重要。如果页面要等十几个链上请求全部返回，加载过程就会显得很慢。尤其是在钱包连接后，前端通常会立刻读取：

- 用户多个 Token 余额；
- Token 的 symbol；
- Token 的 decimals；
- 某个合约的 allowance；
- 用户在协议里的存款数量；
- 用户待领取奖励；
- 多个池子的基础信息。

如果这些数据全部分开请求，页面会变得很重。

Multicall 的价值就在于：
**把多个链上读取操作合并成一次请求，减少 RPC 调用次数，提高页面加载速度。**

对于 Next.js、React、wagmi、viem 这类前端技术栈来说，Multicall 已经是非常常见的优化手段。

## 三、示例场景：Next.js 钱包页面批量读取 Token 余额

假设我们正在开发一个 Next.js 钱包页面。

需求是：用户连接钱包后，页面展示他在 Ethereum 主网上几个常见 ERC20 Token 的余额。

我们要读取的 Token 包括：

```ts
const tokens = [
  {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
  },
  {
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
  },
  {
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
  },
  {
    symbol: "LINK",
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
  },
];
```ts

每个 ERC20 Token 都有一个标准方法：

```solidity
function balanceOf(address account) external view returns (uint256);
```

如果不用 Multicall，我们需要分别读取每个合约的 `balanceOf`。

这不是不能做，但当 Token 数量变多时，请求数量会越来越多。

## 四、使用 viem 的 multicall

在 Next.js 前端项目里，可以使用 `viem` 来读取链上数据。`viem` 提供了 `multicall` 方法，非常适合这个场景。

先安装依赖：

```bash
pnpm add viem
```text

或者：

```bash
npm install viem
```

然后创建一个公共客户端：

```ts
// lib/viem.ts
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});
```ts

这里的 `NEXT_PUBLIC_RPC_URL` 可以使用 Alchemy、Infura 或其他 RPC 服务提供的地址。

接着定义 ERC20 ABI。这里只需要 `balanceOf`，所以不必引入完整 ABI。

```ts
// lib/abi.ts
export const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      {
        name: "account",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
] as const;
```

然后封装一个批量读取 Token 余额的方法：

```ts
// lib/getTokenBalances.ts
import { formatUnits, type Address } from "viem";
import { publicClient } from "./viem";
import { erc20Abi } from "./abi";

const tokens = [
  {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
  },
  {
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
  },
  {
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    decimals: 18,
  },
  {
    symbol: "LINK",
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
  },
] as const;

export async function getTokenBalances(userAddress: Address) {
  const contracts = tokens.map((token) => ({
    address: token.address as Address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  }));

  const results = await publicClient.multicall({
    contracts,
  });

  return results.map((result, index) => {
    const token = tokens[index];

    if (result.status === "failure") {
      return {
        symbol: token.symbol,
        address: token.address,
        balance: "0",
        rawBalance: 0n,
        error: result.error,
      };
    }

    return {
      symbol: token.symbol,
      address: token.address,
      balance: formatUnits(result.result, token.decimals),
      rawBalance: result.result,
    };
  });
}
```ts

这段代码的核心是：

```ts
const results = await publicClient.multicall({
  contracts,
});
```

我们把多个 Token 的 `balanceOf` 调用组装成一个 `contracts` 数组，然后交给 `multicall` 一次性读取。

这样前端只需要一次聚合请求，就能拿到多个 Token 的余额。

## 五、在 Next.js 页面中使用

如果使用 Next.js App Router，可以在服务端组件中直接读取数据，也可以在客户端组件中配合钱包连接状态读取。

例如我们写一个简单的服务端页面：

```tsx
// app/balances/page.tsx
import { getTokenBalances } from "@/lib/getTokenBalances";

export default async function BalancesPage() {
  const userAddress = "0x0000000000000000000000000000000000000000";

  const balances = await getTokenBalances(userAddress);

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Token Balances</h1>

      <div className="space-y-3">
        {balances.map((item) => (
          <div
            key={item.address}
            className="flex items-center justify-between rounded-lg border p-4"
          >
            <span className="font-medium">{item.symbol}</span>
            <span>{item.balance}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
```tsx

真实项目中，`userAddress` 通常来自钱包连接，例如 wagmi 的 `useAccount()`。

如果是客户端组件，可以这样写：

```tsx
"use client";

import { useEffect, useState } from "react";
import { type Address } from "viem";
import { getTokenBalances } from "@/lib/getTokenBalances";

type TokenBalance = {
  symbol: string;
  address: string;
  balance: string;
  rawBalance: bigint;
};

export function TokenBalanceList({ address }: { address: Address }) {
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchBalances() {
      setLoading(true);

      try {
        const data = await getTokenBalances(address);
        setBalances(data);
      } finally {
        setLoading(false);
      }
    }

    fetchBalances();
  }, [address]);

  if (loading) {
    return <div>Loading balances...</div>;
  }

  return (
    <div className="space-y-3">
      {balances.map((item) => (
        <div
          key={item.address}
          className="flex items-center justify-between rounded-lg border p-4"
        >
          <span>{item.symbol}</span>
          <span>{item.balance}</span>
        </div>
      ))}
    </div>
  );
}
```

这样就可以在用户连接钱包后，一次性读取多个 Token 余额。

## 六、如果不用 Multicall，会有什么问题？

不用 Multicall 时，我们可能会这样写：

```ts
const balances = await Promise.all(
  tokens.map(async (token) => {
    const balance = await publicClient.readContract({
      address: token.address as Address,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [userAddress],
    });

    return {
      symbol: token.symbol,
      balance: formatUnits(balance, token.decimals),
    };
  }),
);
```text

这段代码看起来也没问题，而且用了 `Promise.all`，可以并发请求。

但是问题在于：
它仍然会产生多次 RPC 请求。

Token 少的时候还好；如果你要读取 20 个、50 个甚至更多合约数据，就容易变慢，也更容易触发 RPC 服务限制。

而 Multicall 的优势是：
**不是简单地在前端并发请求，而是在链上调用层面把多个读取操作聚合起来。**

这对钱包、DeFi 面板、链上数据看板非常重要。

## 七、Multicall 适合前端哪些功能？

在 Next.js 项目中，Multicall 可以用在很多地方。

比如钱包页面：

```text
一次性读取多个 ERC20 Token 余额
```

比如 Swap 页面：

```text
读取用户余额、allowance、交易池储备量、报价相关参数
```text

比如 DeFi Dashboard：

```text
读取用户存款、借款、可领取奖励、池子 APY、TVL
```

比如 NFT 页面：

```text
批量读取 ownerOf、tokenURI、isApprovedForAll
```text

比如治理页面：

```text
读取投票权重、提案状态、用户投票记录
```

只要页面需要同时读取多个合约的只读数据，就可以考虑使用 Multicall。

## 八、Multicall 使用时需要注意什么？

第一，Multicall 主要用于读取数据，不适合替代交易。

也就是说，它适合调用 `balanceOf`、`allowance`、`symbol`、`decimals` 这类 `view` 函数，但不适合执行 `transfer`、`approve`、`swap` 这类会修改链上状态的函数。

第二，不要一次塞入过多调用。

虽然 Multicall 可以减少请求次数，但并不是无限制的。如果一次聚合几百个调用，可能会导致返回数据过大、RPC 超时，或者超过节点限制。

第三，要处理失败结果。

有些合约可能不标准，有些调用可能失败。使用 `viem` 的 `multicall` 时，应该检查每个结果的 `status`，不要默认所有调用都一定成功。

第四，要注意 Token 的 decimals。

链上返回的是整数，比如 USDC 的余额可能是 `1000000`，但因为 USDC 是 6 位 decimals，所以展示时应该是 `1.0 USDC`。前端展示前需要用 `formatUnits` 进行格式化。

第五，不同链要配置不同的 chain 和 RPC。

如果你的项目支持 Ethereum、Arbitrum、Base、Polygon、BSC 等多链，就需要根据当前链动态创建 public client，并读取对应链上的 Token 地址。

## 九、和 React Query / wagmi 搭配使用

在真实前端项目中，Multicall 通常不会单独使用，而是和 React Query 或 wagmi 搭配。

比如：

```text
钱包地址变化 → 触发 query
链 ID 变化 → 触发 query
余额读取成功 → 缓存结果
用户切换账户 → 自动重新请求
```text

如果项目已经使用 wagmi，也可以直接使用 wagmi 提供的批量读取能力。其底层思路同样是把多个合约读取请求聚合起来，减少重复请求。

在 Next.js 中，比较推荐的组织方式是：

```text
lib/viem.ts                  创建 publicClient
lib/abi.ts                   管理常用 ABI
lib/getTokenBalances.ts      封装 multicall 读取逻辑
components/TokenBalanceList  展示数据
```

这样业务组件不会塞满链上读取细节，代码会更清晰，也更容易维护。

## 十、总结

对于前端开发者来说，链上数据读取是 Web3 页面性能优化中非常重要的一环。

如果只是读取一个合约数据，普通的 `readContract` 就够了。

但如果一个页面需要同时读取多个 Token 余额、多个池子状态、多个 NFT 信息，继续使用大量单独请求就会带来性能问题。

Multicall 的作用就是：

```text
把多个链上只读调用合并成一次聚合请求
```text

在 Next.js 项目中，可以使用 `viem` 的 `publicClient.multicall` 快速实现这一点。

它能带来的好处包括：

1. 减少 RPC 请求次数；
2. 降低触发 rate limit 的概率；
3. 提升页面加载速度；
4. 简化前端异步请求管理；
5. 更适合钱包、DeFi、NFT、Dashboard 等复杂页面。

一句话总结：

```text
前端页面只读一个数据，用 readContract；
前端页面批量读取多个链上数据，用 multicall。
```

对于 Next.js 前端开发者来说，Multicall 不是一个很复杂的概念，但它是 Web3 项目里非常实用的性能优化工具。掌握它之后，你写的钱包页面、DeFi 页面和链上数据面板都会更加稳定、快速、清晰。
