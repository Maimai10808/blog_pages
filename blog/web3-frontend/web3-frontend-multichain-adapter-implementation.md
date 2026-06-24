# Web3 前端多链适配如何落地：从钱包连接到签名、支付与交易分发

在 Web3 前端项目里，钱包连接经常被理解成一个很简单的动作：用户点击按钮，浏览器弹出钱包，授权之后拿到地址。

但在真实业务中，钱包连接只是整个链上交互流程的起点。尤其当一个产品同时涉及 EVM、Solana、BTC、SEI 等多条链时，前端要处理的就不只是“连上钱包”，而是要回答一组更复杂的问题：

当前用户连的是哪条链？
当前地址属于哪种地址体系？
这个钱包是否支持消息签名？
当前业务是绑定地址、支付、发交易，还是领奖？
如果链不对，是否需要切链？
如果用户余额不足，要如何提前拦截？
不同链的签名和交易结构完全不同，前端又该如何封装？

所以，多链适配的核心并不是“页面上展示多个链的 Logo”，而是要在工程层面把不同链的钱包连接、签名方式、支付流程和业务动作组织起来，让上层业务能够以相对统一的方式调用。

本文结合实际 Web3 前端项目中的多链设计经验，聊一聊多链钱包连接和多链业务适配应该如何落地。

---

## 1. 钱包连接不是“弹个钱包框”

很多人第一次接 Web3 钱包时，会把钱包连接理解成下面这几步：

```text
点击连接钱包
→ 弹出 MetaMask / Phantom / OKX
→ 用户授权
→ 前端拿到 address
```

这当然是钱包连接的一部分，但还远远不够。

在真实业务中，钱包连接状态往往会被多个模块复用。例如：

- 登录时需要用钱包签名证明身份；
- 绑定账号时需要把钱包地址和平台账号绑定；
- 支付时需要检查余额、构造交易并发送；
- 合约交互时需要判断当前链是否正确；
- 领奖时可能需要调用合约，也可能需要发起 BTC 或 Solana 转账；
- 多链活动中还要根据用户选择的链分发到不同钱包体系。

也就是说，钱包连接不是一个孤立的 UI 组件，而是后续签名、支付、交易和账号体系的基础能力。

更准确地说，一个成熟的钱包连接模块至少要维护这些信息：

```text
当前链类型
当前 chainId
当前钱包地址
当前连接状态
当前钱包是否支持签名
当前钱包是否支持发交易
当前业务是否需要切链
```

在 EVM 单链项目中，这些问题相对简单，因为 Ethereum、BNB Chain、Polygon、Arbitrum 等链虽然网络不同，但它们共享相似的账户模型、签名方式和交易结构。前端可以通过 wagmi、RainbowKit 或 ConnectKit 统一处理。

但一旦项目同时支持 Solana、BTC、SEI，问题就会明显复杂起来。Solana 使用 PublicKey 和 Transaction Instruction，BTC 基于 UTXO 模型，SEI 又有自己的钱包连接和签名客户端。此时再试图用一套完全统一的底层钱包 Provider 管理所有链，往往会让抽象变得非常别扭。

---

## 2. 多链钱包接入的基本思路

一个比较实用的多链前端设计思路是：

```text
底层钱包按链独立封装
业务层通过统一 Hook 分发能力
```

也就是说，不同链的钱包连接不要在底层强行统一。

EVM 就交给 wagmi / RainbowKit / ConnectKit；
Solana 就交给 wallet-adapter；
BTC 可以通过自定义 Context 和钱包适配器封装；
SEI 则使用对应生态的 SDK 或 Provider。

底层保留各链自己的连接模型和交易能力，上层业务再通过统一的业务 Hook 去分发，例如：

```text
useBindWallet
usePay
useClaimReward
useWalletAddress
```

这样做的好处是：页面组件不需要直接关心底层 SDK 的差异，只需要表达“我要绑定钱包”“我要支付”“我要领奖”。真正的链差异则被收敛在业务 Hook 内部。

可以把整体结构理解为：

```text
全局 Provider 层
→ EVM / Solana / BTC / SEI 钱包 Provider

链配置层
→ chainId / RPC / chain type / token info

钱包能力层
→ connect / disconnect / sign / send transaction

业务 Hook 层
→ bind wallet / pay / claim / switch network

页面业务层
→ 绑定账号 / 创建活动 / 支付 / 交易 / 领奖
```

这种结构不是为了“看起来高级”，而是为了解决真实多链业务中的复杂性。

---

## 3. EVM：适合用 wagmi 管理多条兼容链

EVM 是多链适配里相对好处理的一类。Ethereum、BNB Chain、Polygon、Arbitrum、Optimism、Base 等网络虽然 chainId 不同，RPC 不同，但它们共享相似的钱包连接方式。

在前端工程中，EVM 通常可以通过 wagmi 配合 RainbowKit 或 ConnectKit 管理。

一个简化后的配置大概是这样：

```ts
import { createConfig, http } from "wagmi";
import { mainnet, bsc, polygon, arbitrum } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [mainnet, bsc, polygon, arbitrum],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
  },
});
```

在页面中，业务可以通过 wagmi Hooks 获取连接状态：

```ts
const { address, isConnected } = useAccount();
const { switchChain } = useSwitchChain();
const { sendTransaction } = useSendTransaction();
```

如果是登录或绑定账号，还可能会用到签名：

```ts
const { signMessageAsync } = useSignMessage();

await signMessageAsync({
  message: "Bind wallet to current account",
});
```

如果业务涉及更严格的结构化签名，也可以使用 EIP-712 Typed Data。

EVM 的优势在于：多条 EVM 链可以共享一套连接和签名模型。所以在多链前端中，EVM 内部可以统一，但它不应该代表所有链。

换句话说：

```text
Ethereum / BNB Chain / Polygon 可以放在一个 EVM Provider 里；
但 Solana / BTC / SEI 不应该强行塞进 EVM Provider。
```

---

## 4. Solana：不能直接复用 EVM 的钱包逻辑

Solana 和 EVM 的差异非常明显。

EVM 钱包的核心通常是 address、chainId、signMessage、sendTransaction；而 Solana 使用的是 PublicKey、Connection、Transaction、Instruction，以及另一套钱包适配器生态。

Solana 前端通常会使用 `@solana/wallet-adapter-react` 和相关钱包适配器，例如 Phantom、Solflare、TokenPocket 等。

一个常见的 Provider 结构类似这样：

```tsx
<ConnectionProvider endpoint={endpoint}>
  <WalletProvider wallets={wallets} autoConnect>
    <WalletModalProvider>{children}</WalletModalProvider>
  </WalletProvider>
</ConnectionProvider>
```

业务中获取钱包状态时，也不是 `address`，而是 `publicKey`：

```ts
const { publicKey, signMessage, sendTransaction } = useWallet();
```

支付时，Solana 通常需要构造 Transaction，并加入对应 Instruction。例如原生 SOL 转账：

```ts
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: receiverPublicKey,
    lamports,
  }),
);

const signature = await sendTransaction(transaction, connection);
```

这和 EVM 的 `to + value + data` 模型完全不是一回事。

所以，Solana 不适合被包进 EVM 的抽象里。更合理的方式是单独使用 Solana Provider 和 wallet-adapter 管理连接，然后在业务 Hook 中把它包装成“支付”“签名”“绑定”等动作。

---

## 5. BTC：更适合自定义钱包适配器

BTC 的前端钱包接入通常更复杂。

一方面，BTC 本身不是账户余额模型，而是 UTXO 模型；另一方面，不同浏览器钱包的 API 差异也比较大。比如 Unisat、OKX、Xverse 等钱包，在连接方式、签名方式、地址类型、转账参数上并不完全一致。

因此，BTC 钱包比较适合做一层自定义适配器。

可以先定义一个统一接口：

```ts
export interface BitcoinWalletAdapter {
  connect: () => Promise<void>;
  getAccount: () => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  sendBitcoin: (to: string, amount: number) => Promise<string>;
  getBalance: () => Promise<number>;
}
```

然后不同钱包分别实现这套接口：

```ts
class UnisatWalletAdapter implements BitcoinWalletAdapter {
  async connect() {
    await window.unisat.requestAccounts();
  }

  async getAccount() {
    const accounts = await window.unisat.getAccounts();
    return accounts[0];
  }

  async signMessage(message: string) {
    return window.unisat.signMessage(message);
  }

  async sendBitcoin(to: string, amount: number) {
    return window.unisat.sendBitcoin(to, amount);
  }

  async getBalance() {
    const balance = await window.unisat.getBalance();
    return balance.total;
  }
}
```

这样做的好处是，业务层不需要关心用户连的是 Unisat、OKX 还是 Xverse。业务只需要调用：

```ts
wallet.signMessage(message);
wallet.sendBitcoin(to, amount);
```

至于不同钱包底层 API 怎么调，由适配器内部处理。

BTC 这部分特别能体现多链适配的一个核心原则：

```text
统一的不是底层 SDK，而是业务动作。
```

也就是说，不要强行把 BTC 改造成 EVM 的样子，而是把“连接、签名、转账”这些能力包装成业务可理解的接口。

---

## 6. SEI：独立生态也应独立封装

SEI 这类链也不适合强行放进 EVM 或 Solana 的 Provider 中。

它可能有自己的钱包 Provider、chainId、RPC、REST 地址、签名方法和交易客户端。比如绑定钱包时使用特定的 arbitrary signing，支付时通过 signing client 发送 token。

这种情况下，比较好的方式依然是：

```text
SEI Provider 单独挂载
SEI 网络配置集中管理
业务 Hook 中按链类型调用 SEI 的签名和支付逻辑
```

不要为了表面统一，把所有链都塞进一个大而全的 WalletProvider。那样最后得到的很可能是一个充满判断和可选方法的“万能对象”：

```ts
wallet.signTypedData?.();
wallet.signArbitrary?.();
wallet.sendBitcoin?.();
wallet.sendSolanaTransaction?.();
wallet.switchChain?.();
```

这种设计看似统一，实际上会让调用方越来越痛苦。因为每次调用之前都要判断当前链是否支持这个方法，一旦业务变复杂，类型安全和可维护性都会下降。

---

## 7. 多链适配的关键：链类型映射

多链业务最重要的一层，往往不是钱包 Provider，而是链类型映射。

因为前端业务通常拿到的是某个业务链，比如：

```text
Ethereum
BNB Chain
Solana
Bitcoin
SEI
```

但业务真正关心的是：这条链应该走哪套钱包能力。

因此可以设计一个链映射表：

```ts
enum NetworkType {
  EVM = "EVM",
  SOL = "SOL",
  BTC = "BTC",
  SEI = "SEI",
}

const blockchainMap = {
  ethereum: {
    name: "Ethereum",
    type: NetworkType.EVM,
    chainId: 1,
  },
  bsc: {
    name: "BNB Chain",
    type: NetworkType.EVM,
    chainId: 56,
  },
  solana: {
    name: "Solana",
    type: NetworkType.SOL,
  },
  bitcoin: {
    name: "Bitcoin",
    type: NetworkType.BTC,
  },
  sei: {
    name: "SEI",
    type: NetworkType.SEI,
  },
};
```

这里最关键的字段不是 `name`，也不是 `icon`，而是 `type`。

因为 `type` 决定后续业务应该走哪个分支：

```text
NetworkType.EVM → wagmi
NetworkType.SOL → Solana wallet-adapter
NetworkType.BTC → BTC wallet adapter
NetworkType.SEI → SEI wallet provider
```

很多多链项目做得混乱，就是因为它们只在 UI 层展示了多个链，但没有在逻辑层建立清晰的链类型分发机制。结果就是页面里到处都是：

```ts
if (chain === "solana") {
}
if (chain === "bitcoin") {
}
if (chainId === 1 || chainId === 56) {
}
```

短期能跑，长期会越来越难维护。

更好的方式是：先把链元信息集中管理，再由业务 Hook 基于链类型进行分发。

---

## 8. 业务 Hook：把链差异收敛起来

多链适配最终不是为了让 Provider 好看，而是为了让业务好写。

假设有一个“绑定钱包”的业务。不同链的签名方式可能是：

| 链类型 | 绑定方式                |
| ------ | ----------------------- |
| EVM    | EIP-712 或 signMessage  |
| Solana | signMessage 后转 base58 |
| BTC    | 钱包插件 signMessage    |
| SEI    | signArbitrary           |

如果页面直接处理这些逻辑，就会变成这样：

```ts
if (type === "EVM") {
  // EVM 签名
} else if (type === "SOL") {
  // Solana 签名
} else if (type === "BTC") {
  // BTC 签名
} else if (type === "SEI") {
  // SEI 签名
}
```

如果多个页面都需要绑定钱包，这些判断就会到处重复。

更合理的方式是封装一个 `useBindWallet`：

```ts
const { bindWallet } = useBindWallet();

await bindWallet({
  blockchain: "solana",
  message,
});
```

内部再根据链类型分发：

```ts
async function bindWallet(params) {
  const chain = blockchainMap[params.blockchain];

  switch (chain.type) {
    case NetworkType.EVM:
      return bindEvmWallet(params);
    case NetworkType.SOL:
      return bindSolanaWallet(params);
    case NetworkType.BTC:
      return bindBtcWallet(params);
    case NetworkType.SEI:
      return bindSeiWallet(params);
  }
}
```

支付逻辑也是一样。

可以抽象成一个 `usePay`：

```ts
const { prepareNetwork, checkBalance, pay } = usePay({
  blockchain,
  token,
  amount,
});
```

它对外提供统一动作：

```text
prepareNetwork：准备网络，例如 EVM 切链
checkBalance：检查余额
pay：执行支付
```

内部则根据链类型处理：

```text
EVM 原生币 → sendTransaction
EVM Token → contract write
Solana → SystemProgram.transfer 或合约交易
BTC → sendBitcoin
SEI → signingClient.sendTokens
```

这样页面业务就会清爽很多。页面不需要直接知道 Phantom 怎么签名、Unisat 怎么转账、SEI 怎么发 token，它只需要调用业务 Hook。

---

## 9. 为什么不建议做一个完全统一的钱包 Provider

多链项目中经常会出现一个问题：既然都是钱包，为什么不做成一套统一 Provider？

比如设计一个：

```ts
const wallet = useUniversalWallet();
```

然后里面包含所有能力：

```ts
wallet.connect();
wallet.signMessage();
wallet.sendTransaction();
wallet.switchChain();
wallet.sendBitcoin();
wallet.sendSolanaTransaction();
```

这个想法看起来很优雅，但真实工程里很容易变成“抽象过度”。

原因很简单：不同链之间差异太大。

EVM 的交易结构是：

```ts
{
  to,
  value,
  data,
}
```

Solana 的交易是：

```ts
Transaction + Instruction;
```

BTC 的交易依赖 UTXO，钱包还可能暴露不同的转账 API。

EVM 可以切链，Solana 通常是切 RPC endpoint 或集群环境；BTC 钱包又有主网、测试网、地址类型等差异。

如果强行统一，最后往往会出现两种结果：

第一种是接口变得非常抽象，失去具体链能力；
第二种是接口越来越臃肿，到处都是可选方法和类型判断。

所以我更推荐：

```text
底层不要强行统一；
业务动作可以统一。
```

也就是说：

- EVM Provider 管 EVM；
- Solana Provider 管 Solana；
- BTC Context 管 BTC；
- SEI Provider 管 SEI；
- 业务层通过 `useBindWallet`、`usePay`、`useClaim` 做统一入口。

这是一种更符合多链项目复杂度的设计。

---

## 10. 一个更清晰的多链前端分层模型

我比较推荐把多链适配拆成五层来看：

```text
第一层：全局 Provider 层
负责挂载各链钱包 SDK

第二层：链配置层
负责维护 chainId、RPC、链类型、币种信息

第三层：钱包能力层
负责连接、断开、签名、发交易

第四层：业务 Hook 层
负责绑定、支付、领奖、交易分发

第五层：页面业务层
负责组织用户流程和 UI 展示
```

展开之后大概是：

```text
App Providers
├─ EVM Provider
├─ Solana Provider
├─ BTC Wallet Context
└─ SEI Provider

Chain Config
├─ blockchainMap
├─ NetworkType
├─ RPC config
└─ Token config

Business Hooks
├─ useBindWallet
├─ usePay
├─ useWalletAddress
└─ useClaimReward

Pages
├─ Connect Wallet
├─ Bind Account
├─ Create Activity
├─ Pay
└─ Claim
```

这种分层的好处是，每一层职责都比较清楚。

Provider 层不掺杂业务；
配置层不直接发交易；
业务 Hook 层负责消化链差异；
页面层只关注用户流程。

当你后续要新增一条链时，也可以按照这个结构扩展：

```text
新增链配置
→ 新增钱包 Provider 或适配器
→ 在业务 Hook 中增加分支
→ 页面复用原有入口
```

如果项目一开始就是这种结构，后期扩展成本会低很多。

---

## 11. 多链适配中容易踩的坑

### 11.1 只做 UI 多链，没有做逻辑多链

有些项目页面上展示了很多链，但实际业务只支持其中一条。这样很容易给用户造成误解。

如果某条链只是预留状态，最好在 UI 或代码层明确区分：

```text
已支持
开发中
仅展示
暂不可用
```

不要把“配置了 Provider”等同于“完整支持了该链业务”。

### 11.2 页面直接调用底层 SDK

如果每个页面都直接调用 MetaMask、Phantom、Unisat，短期看起来简单，长期会非常难维护。

更好的方式是：页面只调用业务 Hook，底层 SDK 差异由 Hook 消化。

### 11.3 把 chainId 当成唯一判断依据

chainId 主要适用于 EVM 体系。Solana、BTC、SEI 等链并不一定能用同一套 chainId 逻辑描述。

所以多链项目里最好引入 `NetworkType` 或类似概念，而不是只靠 chainId。

### 11.4 强行设计一个万能 Wallet 对象

万能对象看起来统一，实际上常常意味着职责不清。

如果某个方法只有 BTC 支持，另一个方法只有 EVM 支持，那么它们就不应该被放在同一层底层抽象里。可以在业务层统一动作，但不要在底层抹平差异。

---

## 12. 面试时可以怎么讲

如果在面试中被问到“你们项目里的多链钱包是怎么做的”，可以这样回答：

> 这个项目的钱包接入是按链拆分的。EVM 使用 wagmi 配合 RainbowKit 或 ConnectKit 管理多条 EVM 网络；Solana 使用 wallet-adapter；BTC 因为不同钱包插件 API 差异比较大，所以通过自定义 Context 和适配器封装；SEI 则使用对应生态的 Provider。底层不会强行把所有链统一成一个 Provider，而是在业务层通过链类型和 Hook 做统一分发，比如绑定钱包、支付、领奖这些动作。这样页面不用直接关心不同链 SDK 的差异，只需要调用业务 Hook，底层再根据链类型走 EVM、Solana、BTC 或 SEI 分支。

如果面试官继续追问：

> 为什么不做成一套统一 Provider？

可以回答：

> 不是不能统一，而是不适合在底层强行统一。因为 EVM、Solana、BTC、SEI 的地址格式、签名方式、交易结构和钱包 SDK 生命周期都不同。强行统一会让 Provider 变成一个充满可选方法和链类型判断的万能对象，反而不利于维护。更合理的方式是底层按链独立封装，保留各链自己的能力；业务层再统一“绑定、支付、交易”这些动作。

这个回答的重点是：你不是只会调钱包 SDK，而是理解多链工程设计里的抽象边界。

---

## 13. 总结

多链前端适配真正难的地方，不是接入几个钱包按钮，也不是展示几个链图标，而是如何把不同链的钱包连接、签名、支付和交易能力组织成一个可维护的工程结构。

比较推荐的设计方式是：

```text
分链 Provider
+ 集中链配置
+ 业务 Hook 分发
+ 页面统一调用
```

底层允许不同链保持差异，业务层再做统一入口。

这样既不会牺牲各链自己的能力，也能避免页面被多链判断淹没。

对于 Web3 前端来说，这类能力其实非常重要。因为多链项目越来越多，前端工程师不能只停留在“会连钱包”的阶段，而是要理解：

- 钱包连接状态如何被业务复用；
- 不同链的签名方式为什么不同；
- 支付和交易为什么要按链分发；
- 哪些逻辑应该放在 Provider，哪些应该放在业务 Hook；
- 什么地方该统一，什么地方不该统一。

当你能把这些讲清楚，说明你理解的就不只是钱包连接，而是 Web3 多链前端架构本身。
