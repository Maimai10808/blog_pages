# 多链支付前端怎么封装：从钱包适配器到统一 usePay 的工程化落地

在 Web3 项目里，支付看起来只是“点一下按钮，调用钱包转账”。但真实项目里，它很少这么简单。

一个活动平台、Launchpad、Raffle 或交易类产品，往往不只支持一条链，也不只支持一种钱包。比如同一个支付入口，可能要支持 EVM 原生币、EVM ERC20、BTC、BRC20 铭文、SEI、SOL。用户点击“支付”之前，前端需要判断钱包是否连接、链是否正确、余额是否足够、Token 类型是什么、金额单位如何转换、交易成功后如何刷新业务状态。

如果这些逻辑全部写在页面组件里，代码很快会变成一团混合物：UI 组件里既有钱包连接，又有余额检查，又有链切换，又有交易构造，又有弹窗逻辑。功能能跑，但后续维护、扩展新链、新钱包、新 Token 类型都会非常痛苦。

这篇文章结合一个真实项目中的多链支付场景，整理一种更适合落地的封装方式：底层用钱包适配器统一不同 BTC 钱包 API，上层用 `usePay` 统一多链支付流程，页面组件只消费封装后的结果。

---

## 1. 多链支付前端到底解决什么问题

多链支付前端不是简单调用一个 `transfer()`。它至少要处理三类差异。

### 第一类是钱包差异

比如 BTC 生态里，不同钱包的 API 并不一致。Unisat 使用 `window.unisat`，OKX Wallet 使用 `window.okxwallet.bitcoin` 或 `window.okxwallet.bitcoinTestnet`，Xverse 又通过 `sats-connect` 提供回调式 API。它们的连接方法、签名方法、转账方法、事件名都不完全一样。

### 第二类是链差异

EVM 可以用 wagmi / viem 处理 `sendTransaction`、ERC20 `transfer` 和链切换；SEI 需要通过 `signingClient.sendTokens` 发送 `usei`；Solana 需要构造 `SystemProgram.transfer` 交易；BTC 普通转账和 BRC20 铭文发送又是两条完全不同的路径。

### 第三类是业务差异

真实支付流程通常不是“转账成功就结束”。支付前要检查钱包和余额；支付中要处理 pending；支付失败要给出明确错误；支付成功后要刷新订单、余额、报名状态、抽奖状态或活动详情。BRC20 场景还可能不是直接转账，而是打开一个铭文发送弹窗，让用户选择 inscription。

所以多链支付前端真正要解决的是：把不同链、不同钱包、不同 Token 类型的差异收敛到稳定的业务接口里。

业务组件不应该知道 OKX 的主网 provider 叫 `window.okxwallet.bitcoin`，也不应该知道 Xverse 的 `getAddress` 是回调式 API。组件只应该知道：当前要支付，先准备环境，再执行支付。

---

## 2. 最简单的写法是什么

最直接的写法通常是把所有逻辑写在按钮点击事件里。

```tsx
function PayButton({ payAddress, amount }: { payAddress: string; amount: string }) {
  const { sendTransactionAsync } = useSendTransaction()
  const { switchNetworkAsync } = useSwitchNetwork()

  const handlePay = async () => {
    await switchNetworkAsync?.(1)
    await sendTransactionAsync({
      to: payAddress as `0x${string}`,
      value: parseUnits(amount, 18),
    })
  }

  return <button onClick={handlePay}>Pay</button>
}
```

这段代码能跑。对于一个只支持 EVM 原生币转账的小 demo，它甚至够用。

但真实项目里很快会出现问题：如果用户没有连接钱包怎么办？如果当前链不是目标链怎么办？如果 Token 是 ERC20 而不是原生币怎么办？如果是 USDT，ABI 是否和标准 ERC20 完全一致？如果支付的是 BTC 呢？如果是 BRC20 铭文呢？如果是 SOL 呢？如果余额不足，应该等钱包报错，还是前端提前拦截？

于是组件会被越写越复杂。

```ts
const handlePay = async () => {
  if (isEvm) {
    if (!isConnected) {
      openConnectModal()
      return
    }

    if (chain?.id !== targetChainId) {
      await switchNetworkAsync?.(targetChainId)
    }

    if (token?.token_address) {
      await sendErc20({
        args: [payAddress, parseUnits(amount, token.decimals)],
      })
    } else {
      await sendTransactionAsync({
        to: payAddress,
        value: parseUnits(amount, 18),
      })
    }
  }

  if (isBtc) {
    if (!btcWallet) {
      openBtcWalletModal()
      return
    }

    await btcWallet.sendBitcoin(payAddress, Number(amount))
  }

  if (isSol) {
    // 构造 Solana transaction...
  }
}
```

这种写法的问题不是“代码不够优雅”，而是边界错了。

页面组件开始承担支付引擎的职责。后面只要新增一个链、新增一个钱包、新增一个 Token 类型，页面就要改。多个页面都有支付按钮时，这些逻辑还会被复制。

---

## 3. 简单写法在真实项目中的问题

多链支付最容易出现的问题有几个。

### 第一，钱包 API 直接泄漏到业务层

如果页面里直接写 `window.unisat.requestAccounts()`、`window.okxwallet.bitcoin.connect()`、`xverse.getAddress()`，业务组件就被具体钱包绑定死了。后续新增钱包时，要在业务层到处加分支。

### 第二，链类型判断散落

EVM、BTC、SEI、SOL 的支付方式完全不同。如果每个页面都写一遍 `if blockchainInfo.type === NetworkType.EVM`，项目里会出现大量重复判断。后期排查支付 bug 时，很难确认到底哪个页面用的是哪套逻辑。

### 第三，金额单位容易出错

EVM 常见单位是 wei，通常用 `parseUnits`；SEI 使用 `usei`，一般是 6 位 decimals；Solana 使用 lamports；BTC 使用 satoshi。金额换算如果散落在组件里，非常容易混入浮点数、字符串、bigint 的错误。

### 第四，交易前置条件缺失

真实支付前至少要确认：钱包已连接、链正确、余额足够、目标地址有效、Token 信息存在。如果这些检查不统一，就会出现某些入口能提前拦截，某些入口直接让钱包报错。

### 第五，交易后状态同步混乱

支付成功后，通常需要刷新余额、订单、活动状态、用户绑定信息等。如果支付逻辑写在组件里，缓存失效和业务刷新也会散落在组件里，最后形成“这个页面刷新了，另一个页面没刷新”的问题。

### 第六，生命周期和事件监听容易遗漏

钱包账户变化需要监听，也需要取消监听。比如 Unisat 的原生事件是 `accountsChanged`，项目业务侧希望统一成 `accountChanged`。如果没有适配层，每个业务模块都要理解这个差异，而且很容易忘记 `off`。

---

## 4. 推荐的项目落地结构

多链支付适合拆成两层：钱包适配层和业务支付 Hook 层。

一个简化后的目录结构可以这样设计：

```txt
src/
  utils/
    wallet/
      wallet.ts
      adapters/
        unisat.ts
        okx.ts
        xverse.ts
  hooks/
    usePay.ts
  context/
    BtcWalletContext.tsx
    ModalContext.tsx
    SolWalletContext.tsx
  views/
    layout/
      SelectBtcWalletModal.tsx
  views/
    raffle/
      create/
        SendSatsModal.tsx
```

这里的重点不是目录多，而是边界清楚。

`wallet.ts` 定义统一的钱包抽象，例如 `connect`、`getAccount`、`getBalance`、`sendBitcoin`、`signMessage`、`on`、`off`。

`adapters/` 下面放不同钱包的适配器。Unisat、OKX、Xverse 的原始 API 都只在这里出现，业务层不直接接触第三方钱包对象。

`usePay.ts` 负责多链支付编排。它不关心具体页面长什么样，只负责支付前准备、余额检查、转账执行。

`context/` 负责保存当前钱包连接状态、弹窗能力、Solana 钱包上下文等。

`SelectBtcWalletModal` 和 `SendSatsModal` 属于 UI 交互，但由 `usePay` 在合适时机触发。比如 BTC 钱包未连接时打开选择钱包弹窗，BRC20 支付时打开铭文发送弹窗。

这个结构背后的原则是：钱包差异下沉到 adapter，支付流程收敛到 hook，页面组件只负责触发动作和展示状态。

---

## 5. 推荐写法一：先定义统一钱包抽象

如果要支持多个 BTC 钱包，不应该让业务代码直接依赖每个钱包的原始 API。更合理的是先定义一个统一抽象。

```ts
export type WalletName = 'Unisat' | 'Okx' | 'Xverse'

export abstract class Wallet {
  abstract name: WalletName
  address?: string
  publicKey?: string

  abstract connect(): Promise<{ address: string; publicKey: string }>
  abstract getAccount(): Promise<{ address: string; publicKey: string }>
  abstract getBalance(): Promise<{
    confirmed: number
    unconfirmed: number
    total: number
  }>
  abstract sendBitcoin(to: string, amount: number, feeRate?: number): Promise<string>
  abstract signMessage(message: string): Promise<string>
  abstract on(
    eventName: 'accountChanged',
    handler: ({ address, publicKey }: { address: string; publicKey: string }) => void,
  ): void
  abstract off(
    eventName: 'accountChanged',
    handler: ({ address, publicKey }: { address: string; publicKey: string }) => void,
  ): void
}
```

这个抽象的价值在于：业务层只依赖 `Wallet`，不依赖 Unisat、OKX 或 Xverse。

后续业务代码可以这样写：

```ts
await wallet.connect()
await wallet.signMessage(message)
await wallet.sendBitcoin(to, amount)
```

而不是这样写：

```ts
await window.unisat.requestAccounts()
await window.okxwallet.bitcoin.connect()
xverse.getAddress(...)
```

统一接口越早建立，后续接入新钱包的成本越低。

---

## 6. 推荐写法二：用 Adapter 封装第三方钱包差异

以 Unisat 为例，它注入的是 `window.unisat`，账户变化事件叫 `accountsChanged`。但业务侧希望统一监听 `accountChanged`。这里就需要适配。

```ts
import { Wallet, WalletName } from '@/utils/wallet/wallet'

const handlerMap = new Map<Function, Function>()

export class Unisat extends Wallet {
  name: WalletName = 'Unisat'
  provider: any
  publicKey?: string

  constructor() {
    super()
    if (!window.unisat) {
      throw new Error('Unisat not installed')
    }
    this.provider = window.unisat
  }

  async connect() {
    const accounts = await this.provider.requestAccounts()
    if (accounts.length === 0) {
      throw new Error('Connect failed')
    }
    const publicKey = await this.provider.getPublicKey()
    this.address = accounts[0]
    this.publicKey = publicKey
    return {
      address: accounts[0],
      publicKey,
    }
  }

  async signMessage(message: string): Promise<string> {
    return this.provider.signMessage(message)
  }

  async getAccount() {
    const accounts = await this.provider.requestAccounts()
    if (accounts.length === 0) {
      throw new Error('Connect failed')
    }
    const publicKey = await this.provider.getPublicKey()
    return {
      address: accounts[0],
      publicKey,
    }
  }

  async sendBitcoin(to: string, amount: number, feeRate?: number): Promise<string> {
    return this.provider.sendBitcoin(to, amount, feeRate ? { feeRate } : undefined)
  }

  async getBalance() {
    return await this.provider.getBalance()
  }

  on(eventName: 'accountChanged', fn: ({ address, publicKey }: { address: string; publicKey: string }) => void) {
    const handler = async () => {
      const [address] = await this.provider.getAccounts()
      const publicKey = await this.provider.getPublicKey()
      fn({ address, publicKey })
    }

    handlerMap.set(fn, handler)
    this.provider.on('accountsChanged', handler)
  }

  off(eventName: 'accountChanged', fn: ({ address, publicKey }: { address: string; publicKey: string }) => void) {
    const handler = handlerMap.get(fn)
    if (handler) {
      this.provider.off('accountsChanged', handler)
    }
  }
}
```

这里有一个容易忽略的点：`handlerMap` 很重要。

很多钱包 provider 的 `off` 要求传入和 `on` 时完全相同的函数引用。但业务侧传入的是 `fn`，适配器内部实际注册的是包装后的 `handler`。如果不保存映射关系，后续取消监听时就找不到原函数，事件监听会一直残留。

OKX 的适配器也类似，但它要根据网络选择不同 provider。

```ts
import { formatSat } from '@/utils'
import { network } from '@/utils/env'
import { Wallet, WalletName } from '@/utils/wallet/wallet'

const handlerMap = new Map<Function, Function>()

export class Okx extends Wallet {
  provider: any
  name: WalletName = 'Okx'
  address?: string
  publicKey?: string

  constructor() {
    super()
    if (!window.okxwallet) {
      throw new Error('OKX Wallet not installed')
    }
    this.provider = network === 'livenet' ? window.okxwallet.bitcoin : window.okxwallet.bitcoinTestnet
  }

  async connect(): Promise<{ address: string; publicKey: string }> {
    const { address, compressedPublicKey } = await this.provider.connect()
    this.address = address
    this.publicKey = compressedPublicKey
    return {
      address,
      publicKey: compressedPublicKey,
    }
  }

  async getAccount(): Promise<{ address: string; publicKey: string }> {
    return {
      address: this.address || '',
      publicKey: this.publicKey || '',
    }
  }

  async getBalance(): Promise<{ confirmed: number; unconfirmed: number; total: number }> {
    return await this.provider.getBalance()
  }

  on(event: 'accountChanged', handler: ({ address, publicKey }: { address: string; publicKey: string }) => void): void {
    const fn = ({ address, publicKey }: { address: string; publicKey: string }) => {
      handler({ address, publicKey })
    }

    handlerMap.set(handler, fn)
    this.provider.on('accountChanged', fn)
  }

  off(event: 'accountChanged', handler: ({ address, publicKey }: { address: string; publicKey: string }) => void): void {
    const fn = handlerMap.get(handler)
    if (fn) {
      this.provider.off('accountChanged', fn)
    }
  }

  async sendBitcoin(to: string, amount: number, feeSats?: number): Promise<string> {
    const data = await this.provider.send({
      from: this.address,
      to,
      value: formatSat(amount),
      satBytes: feeSats,
    })
    return data.txhash
  }

  async signMessage(message: string): Promise<string> {
    return await this.provider.signMessage(message, {
      from: this.address,
    })
  }
}
```

OKX 这里还体现了另一个适配器职责：单位转换。

业务层传入的是 satoshi，OKX provider 可能需要 BTC 字符串，所以适配器内部通过 `formatSat(amount)` 转换。这样业务层不需要知道 OKX 的金额格式。

Xverse 的差异更明显。它主要通过 `sats-connect` 暴露能力，并且很多 API 是回调形式。适配器应该把它转换成 Promise。

```ts
import * as xverse from 'sats-connect'
import { Address, AddressPurpose, BitcoinNetworkType, sendBtcTransaction, signMessage } from 'sats-connect'
import { network } from '@/utils/env'
import { Wallet, WalletName } from '@/utils/wallet/wallet'

const networkType = network === 'livenet' ? BitcoinNetworkType.Mainnet : BitcoinNetworkType.Testnet

export class Xverse extends Wallet {
  name: WalletName = 'Xverse'
  publicKey?: string
  address?: string
  provider: any

  constructor() {
    super()
    if (!window.BitcoinProvider) {
      throw new Error('Xverse not installed!')
    }
  }

  async connect() {
    const addresses = await new Promise<Address[]>((resolve, reject) => {
      xverse.getAddress({
        payload: {
          purposes: [AddressPurpose.Ordinals],
          message: 'Address for receiving Ordinals and payments',
          network: {
            type: networkType,
          },
        },
        onFinish: response => resolve(response.addresses),
        onCancel: () => reject(new Error('User cancelled')),
      })
    })

    if (addresses.length === 0) {
      throw new Error('Connect failed')
    }

    this.address = addresses[0].address
    this.publicKey = addresses[0].publicKey
    return {
      address: addresses[0].address,
      publicKey: addresses[0].publicKey,
    }
  }

  async signMessage(message: string): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      signMessage({
        payload: {
          network: {
            type: networkType,
          },
          address: this.address || '',
          message,
        },
        onFinish: response => resolve(response),
        onCancel: () => reject(new Error('User cancelled')),
      })
    })
  }

  async getAccount(): Promise<{ address: string; publicKey: string }> {
    return {
      address: this.address || '',
      publicKey: this.publicKey || '',
    }
  }

  async sendBitcoin(to: string, amount: number): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      sendBtcTransaction({
        payload: {
          network: {
            type: networkType,
          },
          recipients: [
            {
              address: to,
              amountSats: BigInt(amount),
            },
          ],
          senderAddress: this.address || '',
        },
        onFinish: response => resolve(response),
        onCancel: () => reject(new Error('User cancelled')),
      })
    })
  }

  on(eventName: 'accountChanged', fn: ({ address, publicKey }: { address: string; publicKey: string }) => void) {
    // Xverse 账户变化监听可在后续根据稳定 API 补充
  }

  off(eventName: 'accountChanged', fn: ({ address, publicKey }: { address: string; publicKey: string }) => void) {
    // 与 on 对应，后续实现时需要移除真实监听函数
  }
}
```

这里的关键不是代码多，而是责任明确：Xverse 的回调式 API 不应该污染业务层。适配器内部把它转成 Promise，业务层就能统一使用 async / await。

---

## 7. 推荐写法三：用 usePay 编排多链支付流程

钱包适配器解决的是“不同钱包怎么统一”。但多链支付还需要解决“不同链怎么统一”。

可以封装一个 `usePay(blockchain, token)`，让它返回三个核心方法：

```ts
return {
  prepareNetwork,
  checkBalance,
  pay,
}
```

这三个方法分别负责：

- `prepareNetwork`：支付前检查钱包是否连接、链是否正确，必要时打开钱包选择弹窗或切换网络。
- `checkBalance`：支付前余额校验，避免用户点到钱包之后才失败。
- `pay`：根据链类型和 Token 类型执行真正支付。

一个简化版结构如下：

```ts
export function usePay(blockchain: Blockchain, token?: TokenItem | null) {
  const blockchainInfo = blockchainMap[blockchain]

  const prepareNetwork = async (evmConnectInfo?: EvmConnectInfo) => {
    // EVM / BTC / SEI / SOL 分别准备钱包和网络
  }

  const checkBalance = async (amount: string) => {
    // 根据 token 类型检查余额
  }

  const pay = async (payAddress: string, payAmount: string) => {
    // 根据链类型执行支付
  }

  return {
    prepareNetwork,
    checkBalance,
    pay,
  }
}
```

这种 API 对组件非常友好。页面不需要理解每条链怎么支付，只需要按流程调用。

```ts
const { prepareNetwork, checkBalance, pay } = usePay(blockchain, token)

const handleSubmit = async () => {
  const ready = await prepareNetwork(evmConnectInfo)
  if (!ready) {
    return
  }

  await checkBalance(amount)
  await pay(payAddress, amount)
}
```

这就是封装的意义：复杂度没有消失，而是被放到了更合适的位置。

---

## 8. usePay 里的支付前准备

支付前准备是多链支付里最容易被忽略的一层。它不发交易，但决定用户体验。

以真实项目里的逻辑为例：

```ts
const prepareNetwork = async (evmConnectInfo?: {
  show?: () => void
  isConnected: boolean
  chain?: {
    id: number
  }
}) => {
  if (blockchainInfo.type === NetworkType.EVM) {
    if (!evmConnectInfo) {
      return
    }

    const { show, isConnected, chain } = evmConnectInfo

    if (isConnected) {
      if (blockchainInfo.chainId !== chain?.id) {
        await switchNetworkAsync?.(blockchainMap[blockchain].chainId)
      }
    } else {
      show?.()
      return
    }
  } else if (blockchainInfo.type === NetworkType.SEI) {
    if (!connectedWallet || !seiAccount) {
      openSeiSelectModal()
      return
    }
  } else if (blockchainInfo.type === NetworkType.SOL) {
    if (!solWallet || !publicKey || !solWallet.connected) {
      if (buttonState === 'no-wallet') {
        setVisible(true)
      } else if (buttonState === 'has-wallet') {
        connectSol?.()
      }
      return
    }
  } else if (blockchainInfo.type === NetworkType.BTC) {
    if (!btcConnected || !btcWallet) {
      await openModal(SelectBtcWalletModal)
      return
    }
  }

  return true
}
```

这里的设计重点是：`prepareNetwork` 不直接支付，只负责让支付环境变得可用。

EVM 场景下，如果已连接但链不对，就切链；如果没连接，就打开连接弹窗。

SEI 场景下，如果没有钱包或账户，就打开 SEI 钱包选择弹窗。

SOL 场景下，要结合 Solana Wallet Adapter 的 `buttonState` 判断是打开钱包选择弹窗，还是直接连接已有钱包。

BTC 场景下，如果没有选择 BTC 钱包，就打开项目自己的 `SelectBtcWalletModal`。

返回 `true` 表示可以继续支付；返回 `undefined` 表示流程被中断，等待用户完成连接或选择。

组件层不需要关心这些分支，只需要判断是否 ready。

---

## 9. usePay 里的余额检查

余额检查最好独立出来，而不是直接写在 `pay` 里。

```ts
const checkBalance = async (amount: string) => {
  if (token?.token_type === TokenType.EVM_ERC20) {
    const value = parseUnits(amount + '', token.decimals)
    const erc20Balance = await refechBalance()

    if (!erc20Balance?.data || value > erc20Balance.data.value) {
      throw new Error('Insufficient balance')
    }
  }
}
```

这里主要处理 EVM ERC20 的余额检查。`parseUnits` 把用户输入金额转换成链上整数单位，然后和 `useBalance` 重新获取到的余额比较。

为什么要单独封装 `checkBalance`？

因为余额检查有时候需要在支付前做，但不一定每次都和支付强绑定。比如某些页面可能在输入金额时就检查余额，某些页面可能在点击确认按钮后检查。把它独立成方法，组件可以更灵活地决定调用时机。

同时，余额检查也方便后续扩展。比如后续可以加：

```ts
if (token?.token_type === TokenType.NATIVE) {
  // 检查 EVM 原生币余额
}

if (blockchainInfo.type === NetworkType.BTC) {
  // 检查 BTC satoshi 余额
}

if (blockchainInfo.type === NetworkType.SOL) {
  // 检查 SOL lamports 余额
}
```

余额检查的原则是：能在前端提前拦截的错误，不要等用户唤起钱包后才失败。

---

## 10. usePay 里的真正支付逻辑

支付逻辑的核心是根据链类型分发。

```ts
const pay = async (_payAddress: string, payAmount: string) => {
  const payAddress = _payAddress as Address
  const isSei = blockchainInfo.type === NetworkType.SEI
  const value = parseUnits(payAmount + '', token?.decimals || (isSei ? 6 : 18))

  if (blockchainInfo.type === NetworkType.SEI) {
    if (!signingClient) {
      throw new Error('no signingClient')
    }

    const fee = calculateFee(100000, '0.1usei')
    const amount = {
      amount: value.toString(10),
      denom: 'usei',
    }
    await signingClient.sendTokens(seiAccount, payAddress, [amount], fee)
  } else if (blockchainInfo.type === NetworkType.BTC) {
    if (token?.token_type === TokenType.BTC_BRC20) {
      await openModal(SendInscriptionModal, {
        amount: payAmount,
        payAddress,
        token: token as TokenItem,
        blockchain,
      })
    } else {
      if (!btcWallet) {
        throw new Error('btc wallet is not ready')
      }
      await btcWallet.sendBitcoin(payAddress, Number(value))
    }
  } else if (blockchainInfo.type === NetworkType.EVM) {
    if (token?.token_address) {
      if (token.name !== 'USDT') {
        await sendErc20({
          args: [payAddress, value],
        })
      } else {
        await sendUSDT({
          args: [payAddress, value],
        })
      }
    } else if (token?.token_type === TokenType.NATIVE) {
      const gasLimit = blockchainInfo.chainId === Blockchain.EVM_ARBITRUM ? BigInt(200_0000) : undefined
      await sendTransactionAsync({
        gas: gasLimit,
        to: payAddress,
        value,
      })
    }
  } else if (blockchainInfo.type === NetworkType.SOL) {
    const transaction = new SolTransaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey as PublicKey,
        toPubkey: new PublicKey(payAddress),
        lamports: value,
      }),
    )
    await solWallet.sendTransaction(transaction, solConnection)
  }
}
```

这段逻辑里有几个关键点。

### 第一，金额统一先转成链上单位

```ts
const value = parseUnits(payAmount + '', token?.decimals || (isSei ? 6 : 18))
```

EVM 默认 18 位，SEI 使用 6 位，Token 有自己的 decimals。支付前统一转换，避免后面每个分支重复处理。

### 第二，BRC20 不是普通 BTC 转账

```ts
if (token?.token_type === TokenType.BTC_BRC20) {
  await openModal(SendInscriptionModal, {
    amount: payAmount,
    payAddress,
    token: token as TokenItem,
    blockchain,
  })
}
```

BRC20 支付往往涉及铭文选择和发送，不适合直接走 `sendBitcoin`。这里打开业务弹窗，把铭文发送流程交给专门的 UI 和逻辑处理。

### 第三，USDT 可以特殊处理

```ts
if (token.name !== 'USDT') {
  await sendErc20(...)
} else {
  await sendUSDT(...)
}
```

很多项目里 USDT 会单独处理，因为不同链上的 USDT ABI、返回值行为或历史兼容性可能和标准 ERC20 存在差异。即使大部分时候可以用标准 ERC20，项目里保留特殊 ABI 也是常见工程选择。

### 第四，Solana 需要显式构造交易

```ts
const transaction = new SolTransaction().add(
  SystemProgram.transfer({
    fromPubkey: publicKey as PublicKey,
    toPubkey: new PublicKey(payAddress),
    lamports: value,
  }),
)
```

Solana 和 EVM 的调用模型不同。这里通过 `SystemProgram.transfer` 构造系统转账交易，再交给钱包发送。

不过这段代码有一个需要注意的点：`parseUnits` 返回的是 `bigint`，而 Solana lamports 在一些类型定义里期望 `number` 或 `bigint`，需要根据当前 `@solana/web3.js` 版本确认类型兼容。金额较大时不要用浮点数转换，避免精度问题。

---

## 11. 组件应该如何消费 usePay

封装之后，组件里不应该再出现大量链判断。

一个比较合理的支付按钮组件可以这样写：

```tsx
type PayButtonProps = {
  blockchain: Blockchain
  token?: TokenItem | null
  payAddress: string
  amount: string
  evmConnectInfo?: {
    show?: () => void
    isConnected: boolean
    chain?: {
      id: number
    }
  }
  onSuccess?: () => void
}

export function PayButton({ blockchain, token, payAddress, amount, evmConnectInfo, onSuccess }: PayButtonProps) {
  const [loading, setLoading] = useState(false)
  const { prepareNetwork, checkBalance, pay } = usePay(blockchain, token)

  const handlePay = async () => {
    try {
      setLoading(true)
      const ready = await prepareNetwork(evmConnectInfo)
      if (!ready) {
        return
      }

      await checkBalance(amount)
      await pay(payAddress, amount)
      onSuccess?.()
    } catch (error) {
      console.error(error)
      // 这里可以接入 toast/message 系统
    } finally {
      setLoading(false)
    }
  }

  return (
    <button disabled={loading} onClick={handlePay}>
      {loading ? 'Paying...' : 'Pay'}
    </button>
  )
}
```

这个组件不关心：

- Unisat 怎么连接。
- OKX 主网和测试网 provider 怎么切。
- SEI 的 fee 怎么算。
- Solana transaction 怎么构造。
- BRC20 为什么要打开铭文弹窗。
- USDT 为什么用特殊 ABI。

它只关心一个业务流程：准备环境、检查余额、执行支付、处理成功和失败。

这就是组件消费封装结果的正确边界。

---

## 12. 错误处理、重试、生命周期、缓存同步怎么处理

支付逻辑不是只有成功路径。真实项目里要明确处理失败和状态同步。

### 钱包未安装

适配器构造函数里可以直接抛错：

```ts
if (!window.unisat) {
  throw new Error('Unisat not installed')
}
```

但业务层不能只打印错误。通常要把错误转换成用户能理解的提示，比如“请先安装 Unisat 钱包”。

### 用户取消操作

Xverse 这类回调 API 里有 `onCancel`：

```ts
onCancel: () => reject(new Error('User cancelled'))
```

用户取消不应该被当成系统异常上报。可以在统一错误处理里区分：

```ts
function getPayErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === 'User cancelled') {
    return '用户已取消操作'
  }
  if (error instanceof Error && error.message.includes('Insufficient balance')) {
    return '余额不足'
  }
  return '支付失败，请稍后重试'
}
```

### 交易 pending 状态

EVM 可以通过 `useWaitForTransaction` 监听交易确认：

```ts
const hash = erc20Data?.hash || sendData?.hash
const { isLoading: waitLoading } = useWaitForTransaction({
  hash,
  chainId: blockchainMap[blockchain].chainId,
})
```

这里要区分“交易已发出”和“交易已确认”。

用户签名完成后，交易可能只是进入 pending。业务上如果要求链上确认后才算支付成功，就不能在 `sendTransactionAsync` 返回后立刻刷新最终状态，而应该等待 confirmation。

### 缓存同步

如果项目使用 React Query，支付成功后应该明确刷新相关 query。

```ts
const queryClient = useQueryClient()

const handleSuccess = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['userBalance'] }),
    queryClient.invalidateQueries({ queryKey: ['orders'] }),
    queryClient.invalidateQueries({ queryKey: ['raffleDetail', raffleId] }),
  ])
}
```

如果支付结果还需要后端确认，可以在支付成功后调用业务接口提交 tx hash，再刷新状态。

```ts
await submitPaymentTx({
  raffleId,
  txHash,
})
await queryClient.invalidateQueries({ queryKey: ['raffleDetail', raffleId] })
```

多链支付尤其要注意：链上交易成功，不一定等于业务订单成功。业务系统可能还需要索引器确认、后端校验、订单状态更新。

### 钱包事件生命周期

适配器提供 `on` 和 `off` 后，业务 Context 可以统一监听账户变化。

```ts
useEffect(() => {
  if (!wallet) {
    return
  }

  const handleAccountChanged = ({ address, publicKey }: { address: string; publicKey: string }) => {
    setAccount({
      address,
      publicKey,
    })
  }

  wallet.on('accountChanged', handleAccountChanged)

  return () => {
    wallet.off('accountChanged', handleAccountChanged)
  }
}, [wallet])
```

这个清理逻辑不能省。钱包账户监听如果不移除，会导致组件卸载后仍然触发回调，严重时会出现重复监听、状态错乱、内存泄漏。

### 重试策略

支付本身一般不适合自动重试。因为重复发交易可能造成重复支付。可以重试的是“读取余额”“刷新订单”“查询交易状态”这类幂等操作。

推荐原则是：

- 读操作可以有限重试。
- 写操作不要自动重试。
- 用户取消不重试。
- 余额不足不重试。
- 链上交易已发出后，不要重新发送交易，而是查询交易状态。

---

## 13. 结合真实业务：Raffle 支付链路如何落地

假设一个 Raffle 平台支持用户用多链资产支付报名费用。活动配置里会告诉前端：当前活动支持哪条链、使用什么 Token、支付地址是多少、金额是多少。

页面拿到活动信息后，不应该直接写支付细节，而是把链和 Token 传给 `usePay`。

```tsx
export function RafflePayPanel({ raffle }: { raffle: RaffleDetail }) {
  const { blockchain, token, payAddress, price } = raffle
  const { prepareNetwork, checkBalance, pay } = usePay(blockchain, token)
  const queryClient = useQueryClient()

  const handleJoin = async () => {
    try {
      const ready = await prepareNetwork({
        show: openEvmConnectModal,
        isConnected,
        chain,
      })

      if (!ready) {
        return
      }

      await checkBalance(price)
      await pay(payAddress, price)
      await queryClient.invalidateQueries({
        queryKey: ['raffleDetail', raffle.id],
      })
      await queryClient.invalidateQueries({
        queryKey: ['userBindingInfo'],
      })
    } catch (error) {
      showError(getPayErrorMessage(error))
    }
  }

  return <button onClick={handleJoin}>Join Raffle</button>
}
```

在这个业务里，组件只负责 Raffle 的业务动作：用户点击 Join，支付成功后刷新活动详情和用户绑定信息。

底层链差异全部由 `usePay` 处理。BTC 钱包选择由 `SelectBtcWalletModal` 处理，BRC20 铭文发送由 `SendInscriptionModal` 处理，EVM 链切换由 wagmi 处理，Solana 连接由 Solana Wallet Adapter 处理。

这就是一个比较稳定的落地方式：页面表达业务，hook 编排流程，adapter 处理第三方差异。

---

## 14. 完整示例：一个简化版多链支付 Hook

下面给出一个更精简的 TypeScript 示例，用于表达核心结构。真实项目可以继续补充更多错误处理、状态暴露和缓存刷新。

```ts
import { calculateFee } from '@cosmjs/stargate'
import { useSelectWallet, useSigningClient, useWallet } from '@sei-js/react'
import { useWalletMultiButton } from '@solana/wallet-adapter-base-ui'
import { useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { PublicKey, SystemProgram, Transaction as SolTransaction } from '@solana/web3.js'
import { parseUnits } from 'viem'
import { Address, erc20ABI, useAccount, useBalance, useContractWrite, useSendTransaction, useSwitchNetwork } from 'wagmi'
import { ABI_USDT } from '@/utils/abis/USDT'
import { blockchainMap } from '@/utils/constant'
import { useBtcWallet } from '@/context/BtcWalletContext'
import { useModal } from '@/context/ModalContext'
import { useSolWallet } from '@/context/SolWalletContext'
import { Blockchain, NetworkType } from '@/utils/types'
import { TokenItem, TokenType } from '@/utils/http/services/raffle'
import { SelectBtcWalletModal } from '@/views/layout/SelectBtcWalletModal'
import { SendInscriptionModal } from '@/views/raffle/create/SendSatsModal'

type EvmConnectInfo = {
  show?: () => void
  isConnected: boolean
  chain?: {
    id: number
  }
}

export function usePay(blockchain: Blockchain, token?: TokenItem | null) {
  const blockchainInfo = blockchainMap[blockchain]
  const { switchNetworkAsync } = useSwitchNetwork()
  const { address: evmAddress } = useAccount()
  const { connectedWallet, accounts } = useWallet()
  const { openModal: openSeiSelectModal } = useSelectWallet()
  const { signingClient } = useSigningClient()
  const { wallet: btcWallet, connected: btcConnected } = useBtcWallet()
  const { openModal } = useModal()
  const seiAccount = accounts?.[0]?.address || ''

  const { writeAsync: sendErc20 } = useContractWrite({
    abi: erc20ABI,
    address: token?.token_address as Address,
    functionName: 'transfer',
    chainId: blockchainInfo.chainId,
  })

  const { writeAsync: sendUSDT } = useContractWrite({
    abi: ABI_USDT,
    address: token?.token_address as Address,
    functionName: 'transfer',
    chainId: blockchainInfo.chainId,
  })

  const { refetch: refetchErc20Balance } = useBalance({
    address: token?.token_type === TokenType.EVM_ERC20 ? evmAddress : undefined,
    chainId: blockchainInfo.chainId,
    token: token?.token_address as `0x${string}`,
  })

  const { sendTransactionAsync } = useSendTransaction({})
  const { buttonState, onConnect: connectSol, publicKey } = useWalletMultiButton({
    onSelectWallet: () => {},
  })
  const solWallet = useSolWallet()
  const { connection: solConnection } = useConnection()
  const { setVisible } = useWalletModal()

  const prepareNetwork = async (evmConnectInfo?: EvmConnectInfo) => {
    if (blockchainInfo.type === NetworkType.EVM) {
      if (!evmConnectInfo) {
        return
      }

      const { show, isConnected, chain } = evmConnectInfo

      if (!isConnected) {
        show?.()
        return
      }

      if (blockchainInfo.chainId !== chain?.id) {
        await switchNetworkAsync?.(blockchainInfo.chainId)
      }
    }

    if (blockchainInfo.type === NetworkType.SEI) {
      if (!connectedWallet || !seiAccount) {
        openSeiSelectModal()
        return
      }
    }

    if (blockchainInfo.type === NetworkType.SOL) {
      if (!solWallet || !publicKey || !solWallet.connected) {
        if (buttonState === 'no-wallet') {
          setVisible(true)
        } else if (buttonState === 'has-wallet') {
          connectSol?.()
        }
        return
      }
    }

    if (blockchainInfo.type === NetworkType.BTC) {
      if (!btcConnected || !btcWallet) {
        await openModal(SelectBtcWalletModal)
        return
      }
    }

    return true
  }

  const checkBalance = async (amount: string) => {
    if (token?.token_type !== TokenType.EVM_ERC20) {
      return
    }

    const value = parseUnits(amount, token.decimals)
    const balanceResult = await refetchErc20Balance()
    if (!balanceResult.data || value > balanceResult.data.value) {
      throw new Error('Insufficient balance')
    }
  }

  const pay = async (_payAddress: string, payAmount: string) => {
    const payAddress = _payAddress as Address
    const isSei = blockchainInfo.type === NetworkType.SEI
    const value = parseUnits(payAmount, token?.decimals || (isSei ? 6 : 18))

    if (blockchainInfo.type === NetworkType.SEI) {
      if (!signingClient) {
        throw new Error('no signingClient')
      }

      await signingClient.sendTokens(
        seiAccount,
        payAddress,
        [
          {
            amount: value.toString(10),
            denom: 'usei',
          },
        ],
        calculateFee(100000, '0.1usei'),
      )
      return
    }

    if (blockchainInfo.type === NetworkType.BTC) {
      if (token?.token_type === TokenType.BTC_BRC20) {
        await openModal(SendInscriptionModal, {
          amount: payAmount,
          payAddress,
          token,
          blockchain,
        })
        return
      }

      if (!btcWallet) {
        throw new Error('btc wallet is not ready')
      }

      await btcWallet.sendBitcoin(payAddress, Number(value))
      return
    }

    if (blockchainInfo.type === NetworkType.EVM) {
      if (token?.token_address) {
        if (token.name === 'USDT') {
          await sendUSDT({
            args: [payAddress, value],
          })
        } else {
          await sendErc20({
            args: [payAddress, value],
          })
        }
        return
      }

      if (token?.token_type === TokenType.NATIVE) {
        await sendTransactionAsync({
          to: payAddress,
          value,
        })
      }
      return
    }

    if (blockchainInfo.type === NetworkType.SOL) {
      const transaction = new SolTransaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey as PublicKey,
          toPubkey: new PublicKey(payAddress),
          lamports: value,
        }),
      )
      await solWallet.sendTransaction(transaction, solConnection)
    }
  }

  return {
    prepareNetwork,
    checkBalance,
    pay,
  }
}
```

这段代码不一定覆盖所有生产细节，但它的边界是清楚的：

- 钱包连接和链切换放在 `prepareNetwork`。
- 余额检查放在 `checkBalance`。
- 实际支付放在 `pay`。
- 组件不直接处理链差异。

---

## 15. 工程化注意事项

多链支付模块里有几个点需要特别注意。

### 第一，钱包适配器不要掺业务逻辑

Adapter 的职责是把第三方钱包 API 转换成项目统一接口。它不应该知道 Raffle、订单、用户等级、活动状态这些业务概念。比如 Unisat 适配器只应该负责连接、签名、转账、监听账户变化，不应该在里面调用活动报名接口。

### 第二，支付 Hook 不要直接依赖页面 UI 结构

`usePay` 可以打开必要的弹窗，比如钱包选择弹窗和 BRC20 发送弹窗。但它不应该知道页面布局、按钮文案、表单结构。页面组件负责 UI，Hook 负责流程。

### 第三，金额单位必须统一

用户输入一般是十进制字符串，链上交易需要整数单位。不要用 JavaScript 浮点数做最终链上金额计算。EVM 用 `parseUnits`，BTC 明确 satoshi，Solana 明确 lamports，SEI 明确 `usei`。

### 第四，交易写操作不要自动重试

余额查询、订单查询可以重试；链上交易发送不应该无脑重试。用户取消、余额不足、钱包拒绝签名都不是适合自动重试的错误。

### 第五，交易成功后要同步业务缓存

链上交易只是支付链路的一部分。项目里还需要刷新用户余额、订单状态、活动详情、绑定信息。React Query 项目里建议通过 `invalidateQueries` 或 `setQueryData` 明确处理。

### 第六，账户变化监听必须清理

`on` 和 `off` 要成对出现。适配器内部如果包装了事件函数，就要用 `handlerMap` 保存原始回调和真实监听函数的映射，否则事件无法正确移除。

### 第七，不要让组件知道太多底层细节

如果一个支付按钮组件里出现大量 `NetworkType.EVM`、`TokenType.BTC_BRC20`、`window.unisat`、`sendBtcTransaction`，说明封装边界已经失效。组件应该表达业务动作，而不是实现支付引擎。

---

## 16. 总结

多链支付前端的复杂度主要来自差异：钱包 API 差异、链模型差异、Token 类型差异、业务确认流程差异。直接把这些差异写进页面组件，短期能跑，长期会拖垮维护。

更适合真实项目的方式是分层处理。

底层用钱包适配器把 Unisat、OKX、Xverse 这类第三方钱包统一成项目内部的 `Wallet` 接口。中间用 `usePay` 编排支付前准备、余额检查和交易发送。上层页面只负责收集业务参数、触发支付、处理成功和失败后的业务刷新。

这种结构的价值不在于代码看起来“架构化”，而在于后续扩展时成本可控。新增一个 BTC 钱包，只需要新增一个 adapter；新增一种支付链路，只需要扩展 `usePay` 的分支；新增一个支付页面，只需要消费已有 Hook。对于多链项目来说，这种边界比一开始少写几行代码重要得多。
