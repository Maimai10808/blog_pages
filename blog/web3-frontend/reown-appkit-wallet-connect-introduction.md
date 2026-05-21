# Reown AppKit 入门：前端如何快速接入 Web3 钱包连接能力

很多前端开发者第一次做 Web3 应用时，最先遇到的问题往往不是合约调用，而是：

> 怎么让用户把钱包连上来？

如果只支持 MetaMask，好像可以直接用 `window.ethereum`。但真实情况很快会变复杂：用户可能用移动端钱包，可能想用 WalletConnect，可能需要切换链，可能希望用邮箱或社交账号登录，甚至还希望在同一个弹窗里完成换链、Swap、买币、查看交易活动等操作。

如果每个能力都自己从零封装，前端代码会迅速变成一堆钱包适配、连接状态、链切换、Provider 管理和 UI 弹窗逻辑。

Reown AppKit 解决的就是这个问题：它把 Web3 应用里常见的钱包连接和账户交互能力封装成一套前端 SDK，让开发者可以更快地把“连接钱包”这条链路跑起来。

---

## 1. Reown AppKit 解决了什么问题

在 Web3 前端里，钱包连接通常不是一个按钮那么简单。一个比较完整的钱包接入链路至少包含这些事情：

1. 用户点击连接钱包。
2. 前端弹出钱包选择弹窗。
3. 用户选择 MetaMask、WalletConnect 或其他钱包。
4. 钱包返回账户地址。
5. 应用保存连接状态。
6. 前端识别当前链。
7. 用户可以切换网络。
8. 后续交易、签名、读合约都基于这个钱包连接状态继续执行。

如果不用成熟的钱包连接方案，开发者通常会直接写类似这样的代码：

```ts
// src/lib/wallet/connectInjectedWallet.ts
const accounts = await window.ethereum.request({
  method: 'eth_requestAccounts',
});

const address = accounts[0];
```

这段代码能连接 MetaMask，但问题很明显：

- 只照顾了注入式钱包。
- 没有统一的钱包选择弹窗。
- 没有移动端 WalletConnect 体验。
- 没有处理链切换。
- 没有统一的连接状态管理。
- 没有内置邮箱登录、社交登录、钱包活动、买币、Swap 等能力。

AppKit 的价值就在这里。它不是帮你写某一次 `requestAccounts`，而是提供一套 Web3 应用入口层能力。

简单理解：

> AppKit 把钱包连接、账户展示、网络切换、钱包弹窗和部分钱包内操作能力整合成一个可以直接接入前端项目的 SDK。

它适合这些场景：

- 构建 EVM dApp。
- 需要支持多钱包连接。
- 需要支持多链切换。
- 希望快速接入 WalletConnect 生态。
- 希望提供邮箱、社交账号等更低门槛的登录体验。
- 希望减少自定义钱包连接 UI 的开发成本。

它不适合的场景也很明确：

- 项目完全不涉及区块链账户、签名、交易、钱包连接。
- 你要做的是一个完整钱包客户端，而不是 dApp 前端。这时更相关的是 WalletKit，而不是 AppKit。

---

## 2. Reown、AppKit、WalletKit 的基本概念

Reown 是 WalletConnect 背后的团队和产品体系。过去很多人更熟悉 WalletConnect 这个名字，现在 Reown 下面主要有两类产品能力：

- AppKit
- WalletKit

### 2.1 AppKit

AppKit 面向 dApp 开发者。

如果你在开发一个 Web3 网站，比如 DeFi、NFT、链游、DAO 工具、链上数据看板，需要让用户在网页里连接钱包，那么你主要接触的是 AppKit。

### 2.2 WalletKit

WalletKit 面向钱包开发者。

如果你在做一个钱包应用，需要让钱包和各种 dApp 通信，处理签名请求、交易请求、通知和安全能力，那么 WalletKit 更相关。

本文重点看 AppKit。

---

## 3. AppKit 里的几个关键词

在前端项目里理解 AppKit，需要先理解几个关键词。

### 3.1 projectId

`projectId` 是 Reown Cloud 给你的项目标识。

AppKit 依赖这个 ID 接入 Reown 的基础设施，例如 WalletConnect 网络、项目配置、分析数据等。

没有 `projectId`，SDK 无法正常初始化。

### 3.2 adapter

AppKit 本身负责连接弹窗和钱包体验，但具体要和哪套链交互库配合，需要通过 adapter 连接。

比如本文示例使用的是：

```text
@reown/appkit-adapter-wagmi
```

它的作用是把 AppKit 和 wagmi 组合起来。

### 3.3 networks

`networks` 表示你的 dApp 支持哪些链。

比如：

- Ethereum Mainnet
- Arbitrum
- Polygon
- Base
- Sepolia

AppKit 的网络切换按钮和连接状态都依赖这个配置。

### 3.4 metadata

`metadata` 是你的应用信息，包括名称、描述、URL、图标。

钱包在展示连接请求时通常会使用这些信息。真实项目里这里应该填写正式域名和应用图标，不要长期使用示例 URL。

### 3.5 WagmiProvider 和 QueryClientProvider

如果使用 wagmi，那么钱包连接状态、链信息、账户信息通常由 wagmi hooks 消费。

而 wagmi 内部和许多 Web3 前端数据流也会依赖 TanStack Query 管理请求缓存和异步状态。

所以 AppKit 通常不是孤立存在的。它经常和这些工具一起使用：

- Next.js
- wagmi
- viem
- TanStack Query

---

## 4. 安装依赖

假设你已经创建了一个 Next.js 项目，可以先安装依赖：

```bash
npm install @reown/appkit @reown/appkit-adapter-wagmi wagmi @tanstack/react-query
```

然后在环境变量里配置项目 ID：

```env
# .env.local
NEXT_PUBLIC_PROJECT_ID=your_project_id
```

这个 `projectId` 需要在 Reown Cloud 创建项目后获得。因为它会暴露在前端，所以一般使用 `NEXT_PUBLIC_` 前缀。

---

## 5. 创建 AppKit 配置

先创建配置文件：

```ts
// src/config/web3.ts
import { cookieStorage, createStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { arbitrum, mainnet } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not defined');
}

export const networks = [mainnet, arbitrum];

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  networks,
  projectId,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
```

这里真正关键的是三件事：

- `projectId` 告诉 AppKit 当前应用是谁。
- `networks` 告诉 AppKit 这个应用支持哪些链。
- `WagmiAdapter` 把 AppKit 和 wagmi 连接起来。

---

## 6. 在客户端 Provider 里初始化 AppKit

接下来在客户端 Provider 中初始化 AppKit：

```tsx
// src/app/providers.tsx
'use client';

import { createAppKit } from '@reown/appkit/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import type { ReactNode } from 'react';
import { networks, projectId, wagmiAdapter, wagmiConfig } from '../config/web3';

const queryClient = new QueryClient();

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: networks[0],
  metadata: {
    name: 'AppKit Example',
    description: 'AppKit EVM Example',
    url: 'https://example.com',
    icons: ['https://example.com/icon.png'],
  },
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'x', 'github', 'discord'],
    emailShowWallets: true,
  },
  themeMode: 'light',
});

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

这里有两个重点：

- `createAppKit()` 要在客户端环境中执行，所以文件顶部需要 `'use client'`。
- `WagmiProvider` 和 `QueryClientProvider` 要包住应用，后续页面里使用 `useAccount`、`useBalance`、`useReadContract` 等 hooks 都依赖这个 Provider 环境。

---

## 7. 在 layout 中接入 Provider

```tsx
// src/app/layout.tsx
import type { ReactNode } from 'react';
import { Web3Provider } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
```

这样整棵应用树都能访问 AppKit 和 wagmi 的上下文。

---

## 8. 在页面里使用连接按钮

页面里可以直接使用 AppKit 提供的 Web Component：

```tsx
// src/app/page.tsx
'use client';

import { useAccount } from 'wagmi';

export default function HomePage() {
  const { address, isConnected } = useAccount();

  return (
    <main>
      <w3m-button />
      <w3m-network-button />

      {isConnected ? <p>Connected: {address}</p> : null}
    </main>
  );
}
```

`<w3m-button />` 会渲染连接钱包按钮。用户点击后，会打开 AppKit 的连接弹窗。

`<w3m-network-button />` 用于展示和切换网络。

`useAccount()` 来自 wagmi，用于在 React 组件里读取当前钱包连接状态。

这个例子已经能帮你理解 AppKit 的基本用法：

1. 初始化 AppKit。
2. 包裹 Provider。
3. 在页面里放连接按钮。
4. 用 wagmi hooks 读取连接状态。

---

## 9. AppKit 核心流程是怎么跑起来的

AppKit 的运行链路可以拆成几个步骤。

第一步，开发者在 Reown Cloud 创建项目，拿到 `projectId`。

第二步，前端创建 wagmi adapter。这里会配置支持的网络、存储方式、SSR 支持和项目 ID。

第三步，前端调用 `createAppKit()` 初始化 AppKit。这里会传入 adapter、networks、defaultNetwork、metadata、features、themeMode 等配置。

第四步，页面渲染 `<w3m-button />`。用户点击后，AppKit 打开连接弹窗，展示可用钱包、邮箱登录、社交登录等入口。

第五步，用户选择钱包并授权连接。连接完成后，wagmi 的连接状态会更新。此时 `useAccount()` 可以拿到 `address`、`isConnected` 等信息。

第六步，如果用户点击网络按钮，AppKit 会根据你配置的 `networks` 展示可切换的链。切换链后，wagmi 的 `chainId` 等状态也会随之变化。

第七步，后续业务逻辑基于 wagmi / viem 继续执行。比如读取余额、读取合约、发送交易、签名消息等。

所以 AppKit 主要解决的是入口层和连接体验，真正的链上读写通常还是通过 wagmi、viem 或 ethers 完成。

---

## 10. createAppKit：初始化 AppKit

`createAppKit` 是 AppKit 接入的核心函数。它负责创建 AppKit 实例，并注册钱包连接、网络、主题、功能开关等配置。

```ts
// src/app/providers.tsx
createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: networks[0],
});
```

最少需要理解这几个参数：

- `adapters`：接入的链交互适配器。EVM 项目里常见的是 wagmi adapter。
- `projectId`：Reown Cloud 项目 ID。
- `networks`：应用支持的链列表。
- `defaultNetwork`：默认链。

真实项目里还应该配置 `metadata`：

```ts
// src/app/providers.tsx
metadata: {
  name: 'My DApp',
  description: 'A Web3 application',
  url: 'https://my-dapp.com',
  icons: ['https://my-dapp.com/logo.png'],
}
```

这里不要随便填。钱包展示的应用信息会影响用户信任。如果正式项目还显示 `example.com`，体验和安全感都会很差。

---

## 11. WagmiAdapter：连接 AppKit 和 wagmi

如果项目使用 wagmi，需要配置 `WagmiAdapter`：

```ts
// src/config/web3.ts
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  networks,
  projectId,
});
```

这里的 `ssr: true` 对 Next.js 项目比较重要。

Next.js App Router 有服务端渲染和客户端水合过程，如果钱包连接状态的初始值处理不好，容易出现 hydration mismatch 或连接状态闪烁。

`cookieStorage` 的作用是把连接状态相关信息放到 cookie 存储中，方便 SSR 场景下初始化状态。

---

## 12. w3m-button：连接钱包按钮

最直观的 UI 入口是：

```tsx
// src/app/page.tsx
<w3m-button />
```

它会自动处理连接、断开、账户展示等交互。

对于入门项目来说，这比自己写一套连接按钮简单很多。

真实项目里，可以先用 `<w3m-button />` 快速跑通链路。等业务成熟后，再根据 AppKit 提供的能力做更自定义的 UI。

---

## 13. w3m-network-button：网络切换按钮

网络切换是 Web3 前端里很常见的需求。

比如应用支持 Ethereum 和 Arbitrum，用户当前钱包在错误网络上，就需要引导用户切换。

```tsx
// src/app/page.tsx
<w3m-network-button />
```

它展示的网络来自 `createAppKit` 和 adapter 中配置的 `networks`。

如果只配置了 `mainnet` 和 `arbitrum`，用户就只能在这些网络中切换。

想支持更多网络，需要 import 对应网络并加入配置：

```ts
// src/config/web3.ts
import { arbitrum, base, mainnet, polygon } from '@reown/appkit/networks';

export const networks = [mainnet, arbitrum, base, polygon];
```

---

## 14. useAccount：读取连接状态

AppKit 负责连接入口，但组件里读取账户状态通常还是用 wagmi：

```tsx
// src/components/WalletStatus.tsx
import { useAccount } from 'wagmi';

export function WalletStatus() {
  const { address, isConnected, chainId } = useAccount();

  if (!isConnected) {
    return <p>Please connect your wallet</p>;
  }

  return (
    <div>
      <p>Your address: {address}</p>
      <p>Chain ID: {chainId}</p>
    </div>
  );
}
```

这里要注意：

> 连接钱包不等于完成业务登录。

如果应用需要后端身份系统，还需要进一步做签名登录，例如 SIWE。AppKit 解决钱包连接，但不会自动替你完成后端 session 认证。

---

## 15. 真实业务中一般怎么组合使用

在真实项目里，AppKit 很少单独存在。它通常位于 Web3 前端的最外层入口，负责连接钱包和网络状态。

业务层再基于 wagmi / viem 做：

- 合约读取。
- 签名。
- 交易发送。
- 等待交易确认。
- 余额刷新。
- 订单状态同步。

一个典型组合是：

- AppKit：连接弹窗和网络选择。
- wagmi：账户状态、链状态、合约 hooks。
- viem：底层编码、交易、签名、格式化。
- TanStack Query：异步状态和缓存。
- 后端接口：用户资料、订单、权限、活动记录等服务端数据。

---

## 16. 简单钱包面板示例

```tsx
// src/components/WalletPanel.tsx
'use client';

import { useAccount, useBalance } from 'wagmi';

export function WalletPanel() {
  const { address, isConnected } = useAccount();
  const { data: balance, isLoading } = useBalance({
    address,
    query: {
      enabled: Boolean(address),
    },
  });

  return (
    <section>
      <w3m-button />
      <w3m-network-button />

      {!isConnected ? <p>Connect wallet to continue.</p> : null}

      {isConnected ? (
        <div>
          <p>Address: {address}</p>
          <p>
            Balance:{' '}
            {isLoading
              ? 'Loading...'
              : `${balance?.formatted} ${balance?.symbol}`}
          </p>
        </div>
      ) : null}
    </section>
  );
}
```

这个例子里：

- AppKit 负责连接入口。
- `useAccount` 判断当前是否连接。
- `useBalance` 根据地址读取余额。
- `enabled: Boolean(address)` 防止地址不存在时发起无意义请求。

---

## 17. 更完整的 TypeScript 示例

下面给一个稍微完整但不复杂的 Next.js + AppKit + wagmi 示例。

### 17.1 配置文件

```ts
// src/config/web3.ts
import { cookieStorage, createStorage } from 'wagmi';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { arbitrum, mainnet, sepolia } from '@reown/appkit/networks';

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

if (!projectId) {
  throw new Error('NEXT_PUBLIC_PROJECT_ID is not defined');
}

export const networks = [mainnet, arbitrum, sepolia];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
```

这个文件只做一件事：准备 Web3 连接配置。

这里把网络列表单独导出，是为了让 AppKit 初始化和 wagmi adapter 使用同一份网络配置，减少配置不一致的问题。

### 17.2 Provider

```tsx
// src/app/providers.tsx
'use client';

import { createAppKit } from '@reown/appkit/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import type { ReactNode } from 'react';
import { networks, projectId, wagmiAdapter, wagmiConfig } from '../config/web3';

const queryClient = new QueryClient();

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks,
  defaultNetwork: networks[0],
  metadata: {
    name: 'Demo DApp',
    description: 'A simple AppKit demo',
    url: 'https://demo-dapp.example',
    icons: ['https://demo-dapp.example/icon.png'],
  },
  features: {
    analytics: true,
    email: true,
    socials: ['google', 'x', 'github'],
    emailShowWallets: true,
  },
  themeMode: 'light',
});

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### 17.3 Layout

```tsx
// src/app/layout.tsx
import type { ReactNode } from 'react';
import { Providers } from './providers';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 17.4 页面

```tsx
// src/app/page.tsx
'use client';

import { useAccount, useBalance, useDisconnect } from 'wagmi';

export default function HomePage() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();

  const {
    data: balance,
    isLoading,
    isError,
  } = useBalance({
    address,
    query: {
      enabled: Boolean(address),
    },
  });

  return (
    <main
      style={{
        maxWidth: 640,
        margin: '40px auto',
        fontFamily: 'sans-serif',
      }}
    >
      <h1>Reown AppKit Demo</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <w3m-button />
        <w3m-network-button />
      </div>

      {!isConnected ? <p>请先连接钱包。</p> : null}

      {isConnected ? (
        <section>
          <p>
            <strong>Address:</strong> {address}
          </p>
          <p>
            <strong>Chain ID:</strong> {chainId}
          </p>
          <p>
            <strong>Balance:</strong>{' '}
            {isLoading ? 'Loading...' : null}
            {isError ? 'Failed to load balance' : null}
            {balance ? `${balance.formatted} ${balance.symbol}` : null}
          </p>
          <button onClick={() => disconnect()}>Disconnect</button>
        </section>
      ) : null}
    </main>
  );
}
```

这个页面展示了一个更接近真实使用的流程：

- 连接钱包后读取地址。
- 根据地址读取余额。
- 未连接时不请求余额。
- 出错时展示错误状态。
- 用户可以断开连接。

---

## 18. 常见误区和使用边界

### 18.1 误区一：AppKit 等于完整 Web3 业务框架

AppKit 解决的是钱包连接、网络选择和部分钱包体验能力。

它不是合约 SDK，不会自动知道你的业务合约怎么调用，也不会替你处理订单、资产、数据库、权限这些业务问题。

### 18.2 误区二：连接钱包等于登录

连接钱包只是拿到用户地址。

地址只能说明用户当前连接了某个钱包，但不等于你的后端已经认可他的身份。

如果要建立登录态，通常还需要签名登录，例如 SIWE。后端校验签名后，再写入 session 或 token。

### 18.3 误区三：随便配置 metadata

钱包连接时，用户会看到应用名称、域名和图标。

`metadata` 填错会影响用户判断连接对象。正式环境应该使用真实域名和可信图标。

### 18.4 误区四：networks 配置不一致

如果使用 AppKit + wagmi，网络配置通常需要保持一致。

AppKit 里展示哪些网络，wagmi adapter 里也要知道这些网络。否则可能出现 UI 允许切换但业务 hooks 不匹配的问题。

### 18.5 误区五：忽略 SSR

Next.js App Router 项目里，很多钱包状态只在浏览器环境可用。

如果 Provider、storage、cookie initial state 没处理好，就可能出现首屏状态闪烁或 hydration 问题。

入门时可以先跑通客户端能力，但真实项目要认真处理 SSR 场景。

### 18.6 误区六：把所有链上交互都绑定到连接按钮附近

连接按钮只是入口。

合约读取、交易提交、签名认证应该放到各自业务模块里。否则钱包入口组件会越来越臃肿，最后变成一个混合了 UI、认证、交易、网络判断的复杂组件。

---

## 19. 学习和落地建议

学习 AppKit 可以按这个顺序来。

第一步，先理解钱包连接本身。

你需要知道什么是钱包地址，什么是 EVM chain，什么是 `chainId`，为什么用户需要授权连接，为什么连接钱包后前端才能读取账户地址。

第二步，跑通最小 AppKit 示例。

只做三件事：配置 `projectId`，初始化 `createAppKit`，页面里放 `<w3m-button />`。不要一开始就加合约、签名、后端登录，否则很容易分不清问题出在哪里。

第三步，理解 wagmi 在里面的角色。

AppKit 负责连接体验，wagmi 负责 React hooks 层的账户、网络、余额、合约读写等能力。

第四步，增加网络配置。

先支持一个测试网，比如 Sepolia。再增加 Mainnet、Arbitrum、Base 等网络。每加一条链，都要确认 AppKit 展示、wagmi 配置和业务合约地址是否一致。

第五步，加入真实业务动作。

比如读取余额、读取合约数据、发送一笔测试交易。这个阶段要开始重视 `loading`、`error`、`pending`、`success`、`failed` 等状态。

第六步，如果应用需要后端登录，再学习 SIWE。

不要把“连接钱包”和“登录系统”混在一起。钱包连接只是拿到地址，SIWE 才是用签名向后端证明“我控制这个地址”。

第七步，最后再处理产品体验。

比如自定义主题、开启社交登录、配置邮箱登录、处理移动端钱包连接、优化错误提示、监听账号切换和链切换等。

一个适合练手的小 demo 是：

> Next.js + AppKit + wagmi 做一个钱包面板，支持连接钱包、切换网络、展示地址、展示余额、断开连接。

这个 demo 做完后，再接一个简单的 ERC20 合约读取余额，会比一开始就做复杂 dApp 稳得多。

---

## 20. 总结

Reown AppKit 的核心价值，是把 Web3 应用里最常见的钱包连接入口标准化。

它让开发者不用从 `window.ethereum`、WalletConnect、钱包弹窗、网络切换这些底层细节开始重复造轮子，而是可以更快地进入业务开发。

初学者需要记住一个边界：

- AppKit 主要负责钱包连接和用户入口体验。
- wagmi / viem 负责链上交互。
- 后端认证、业务数据、订单系统、交易记录仍然需要你自己设计。

如果只是做一个简单的 EVM dApp，AppKit 可以让你用很少的代码跑通连接钱包、多链切换、账户展示这些能力。

如果要进入真实项目，就需要继续处理：

- SSR。
- 网络配置一致性。
- 钱包切换。
- 签名登录。
- 交易状态。
- 错误提示。

把这条边界理解清楚，AppKit 就不是一个“神秘的钱包按钮库”，而是 Web3 前端应用里非常实用的连接层工具。
