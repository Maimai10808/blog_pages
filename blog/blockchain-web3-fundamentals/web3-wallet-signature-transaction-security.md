# Web3 钱包安全指南：签名消息和发送交易时，钱包到底应该展示什么

在使用硬件钱包或浏览器钱包时，我们经常会遇到两类操作：

签名消息；

发送交易。

这两件事看起来都只是“点一下确认”，但它们的安全含义完全不同。

签名消息通常不会直接上链，也不会直接消耗 Gas，但它可能授权某个操作、确认某个多签交易、允许某个应用代表你执行后续行为。

发送交易则会真正向区块链提交操作，可能转账、授权、调用合约、执行多签交易，甚至改变链上资产状态。

因此，一个合格的钱包，尤其是硬件钱包，不应该只告诉你“是否确认”，而应该尽可能清楚地展示：你到底在签什么、你到底要发送什么交易。

这篇文章会从 Web3 安全角度，整理钱包在签名消息和发送交易时应该展示的最低信息，以及更理想的展示方式。

## 一、为什么钱包展示信息很重要

Web3 钱包的核心价值之一，是让私钥不直接暴露给网页或应用。

理论上，DApp 不能直接拿到你的私钥，只能请求钱包帮你签名或发送交易。你在钱包里确认后，钱包才会完成操作。

但问题是：如果钱包只显示一个模糊的“是否确认”，用户根本不知道自己签了什么。

恶意网站可能伪装成正常交互，让你签署一段看似普通但实际危险的数据。钱包如果没有把关键内容展示清楚，你就无法判断这个操作是否安全。

所以，钱包安全不仅取决于私钥是否离线保存，也取决于签名和交易确认界面是否足够透明。

一个好的钱包，应该帮助用户回答两个问题：

我现在签名的内容是什么？

我现在发送的交易会做什么？

## 二、签名消息和发送交易的区别

### 1. 签名消息

签名消息通常是钱包用私钥对某段数据进行签名。

它不一定会上链，也不一定消耗 Gas。

常见场景包括：

登录 DApp；

签署 EIP-712 typed data；

签署 Safe 多签交易；

签署 Permit 授权；

签署订单；

签署链下授权消息。

例如连接 Safe 多签时，点击确认某个交易，钱包弹出的可能不是“发送交易”，而是“签名请求”。

这类签名虽然不上链，但签名结果可能之后被提交到链上执行，因此同样需要认真检查。

### 2. 发送交易

发送交易是向区块链广播一笔真实交易。

它通常包含：

目标地址；

链 ID / 网络；

value，也就是转出的原生币数量；

gas 相关参数；

calldata，也就是合约调用数据；

nonce 等交易字段。

发送交易会改变链上状态，可能导致资产转移、授权变更或合约状态变化。

所以，交易确认界面必须展示足够的信息，让用户知道自己到底在调用什么。

## 三、EIP-712 签名是什么

现在很多 Web3 应用使用的是 EIP-712 签名。

EIP-712 是一种结构化数据签名标准。它让用户签名的内容不再是一串完全不可读的十六进制，而是可以被组织成更清晰的数据结构。

一个 EIP-712 签名通常包含三部分：

domain；

types；

message。

### 1. Domain

Domain 可以理解为这次签名所属的上下文。

它通常包含：

name；

version；

chainId；

verifyingContract。

例如：

```ts id="uj15jy"
const domain = {
  name: "Safe",
  version: "1.3.0",
  chainId: 1,
  verifyingContract: "0xSafeAddress",
};
```

Domain 的作用是把签名绑定到特定链和特定合约上，避免签名被拿到其他链或其他合约中重放。

### 2. Types

Types 定义 message 的结构。

例如：

```ts id="8n8lyf"
const types = {
  SafeTx: [
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "data", type: "bytes" },
    { name: "operation", type: "uint8" },
    { name: "safeTxGas", type: "uint256" },
    { name: "baseGas", type: "uint256" },
    { name: "gasPrice", type: "uint256" },
    { name: "gasToken", type: "address" },
    { name: "refundReceiver", type: "address" },
    { name: "nonce", type: "uint256" },
  ],
};
```

它告诉钱包：用户即将签署的数据长什么样，每个字段是什么类型。

### 3. Message

Message 是真正的数据内容。

例如：

```ts id="ksahbm"
const message = {
  to: "0xRecipient",
  value: "0",
  data: "0xa9059cbb...",
  operation: 0,
  safeTxGas: 0,
  baseGas: 0,
  gasPrice: 0,
  gasToken: "0x0000000000000000000000000000000000000000",
  refundReceiver: "0x0000000000000000000000000000000000000000",
  nonce: 12,
};
```

Types 定义结构，Message 提供具体值。

如果 types 中某个字段叫 `to`，类型是 `address`，那么 message 中就应该有一个 `to` 字段，并且它应该是一个地址。

## 四、签名时真正被签的是什么

用户并不是直接签整个 JSON 文本。

在 EIP-712 中，钱包会把 domain、types 和 message 按照标准规则编码和哈希，最终得到一个 digest。

这个 digest 才是真正被私钥签名的数据。

可以简单理解为：

```txt id="ws6ekz"
domain + types + message
        ↓
   EIP-712 hash
        ↓
     final digest
        ↓
      signature
```

对于 Safe 多签来说，最终会得到一个 Safe Transaction Hash，也就是 Safe TX Hash。

签名者真正签署的是这个最终 hash。

因此，签名确认界面至少应该帮助用户确认：

domain 是否正确；

types 是否正确；

message 是否正确；

最终 digest / Safe TX Hash 是否正确。

## 五、钱包签名界面至少应该展示什么

对于 EIP-712 签名来说，钱包至少应该展示以下三类信息中的一种。

### 1. 完整结构化数据

也就是展示完整的：

domain；

types；

message。

这种方式信息最完整，理论上用户可以自己检查所有字段。

优点是透明。

缺点是内容太多，不适合普通用户快速核对，尤其是 Safe 多签或复杂合约调用时，字段会非常长。

### 2. Domain Hash + Message Hash

钱包也可以展示：

domain hash；

message hash。

这比展示完整结构更简洁。

用户可以用独立工具重新计算 hash，然后核对钱包显示的 hash 是否一致。

### 3. Final Digest / Safe TX Hash

最理想的方式是直接展示最终要签的 hash。

对于 Safe 多签来说，就是 Safe TX Hash。

这是最容易核对的一种方式。

用户只需要在 Safe UI、独立脚本或可信工具中计算出同一个 hash，然后对比钱包屏幕上显示的 hash 是否一致。

如果一致，说明钱包即将签署的内容确实是你预期的内容。

## 六、为什么最终 Hash 最容易验证

完整的 EIP-712 结构可能非常长。

它可能包含：

多个嵌套类型；

多个地址；

多个金额；

bytes calldata；

nonce；

gas 参数；

合约地址；

链 ID。

逐个字段检查非常困难。

而最终 hash 是所有关键信息组合后的结果。只要任意一个字段被篡改，最终 hash 都会变。

因此，核对最终 hash 是一种更高效的方式。

例如你在 Safe UI 中看到：

```txt id="6zaymd"
Safe TX Hash:
0xabc123...
```

钱包上也显示：

```txt id="c3focx"
Safe TX Hash:
0xabc123...
```

那么你就可以比较确定，钱包签署的确实是这个 Safe 交易。

这比在钱包小屏幕上一行一行看完整 JSON 更现实。

## 七、钱包做得不够好的情况

有些钱包会展示完整的 EIP-712 struct。

这已经比完全不展示要好，因为它至少提供了验证所需的数据。

但如果它不展示最终 hash，用户就需要自己检查大量字段，或者自己重新计算 digest。

这对普通用户很难，对安全研究员也不够方便。

更糟糕的是，有些钱包只显示：

```txt id="0jx9jj"
Signature request
Do you want to sign?
```

却不展示 domain、message、hash 或关键字段。

这种体验在安全上是不可接受的。用户无法知道自己到底签了什么。

## 八、比较理想的签名展示方式

一个更理想的钱包签名界面应该支持：

显示完整 domain；

显示完整 message；

以可读方式展示关键字段；

显示 domain hash；

显示 message hash；

显示最终 digest 或 Safe TX Hash；

允许用户展开高级详情；

在小屏硬件钱包上支持分页查看；

明确显示 chainId 和 verifyingContract。

对于技术用户来说，最终 hash 非常重要。

对于普通用户来说，人类可读的字段也非常重要。

所以最好的方式不是二选一，而是同时提供：

普通模式：展示可读摘要；

高级模式：展示完整数据和 hash。

## 九、发送交易时，钱包应该展示什么

签名消息之外，另一类重要操作是发送交易。

一笔链上交易通常包含：

to 地址；

value；

network；

gas fee；

nonce；

calldata。

其中最容易被忽视、但最重要的是 calldata。

因为 calldata 才是真正告诉合约“要执行什么操作”的指令。

例如，一笔 ERC20 转账的 calldata 可能是：

```txt id="gm9c9i"
0xa9059cbb000000000000000000000000...
```

这串十六进制看起来不可读，但它实际代表：

```txt id="3kxj3n"
调用 transfer(address,uint256)
to = 0x...
amount = 1000
```

如果钱包不显示 calldata，用户就无法确认这笔交易到底调用了哪个函数、传入了什么参数。

## 十、为什么 calldata 很重要

在智能合约交易中，`to` 地址只是交易发往哪个合约。

但真正的操作由 calldata 决定。

同一个合约地址可能支持很多函数：

```solidity id="l7tjyq"
transfer(...)
approve(...)
swap(...)
deposit(...)
withdraw(...)
execute(...)
upgradeTo(...)
```

如果你只看到合约地址，却看不到 calldata，你无法判断这笔交易是转账、授权、兑换、升级合约，还是执行多签操作。

恶意 DApp 可能伪装成普通操作，但 calldata 实际上是在执行危险函数。

因此，钱包必须展示 calldata，至少应该允许用户查看 raw calldata。

## 十一、calldata 解码是什么

Raw calldata 是十六进制数据，不适合普通用户阅读。

所以理想的钱包应该尝试解码 calldata。

例如 raw calldata：

```txt id="v5qhhu"
0xa9059cbb000000000000000000000000111111111111111111111111111111111111111100000000000000000000000000000000000000000000000000000000000003e8
```

可以解码为：

```txt id="03i5ej"
Function: transfer(address to, uint256 amount)

to:
0x1111111111111111111111111111111111111111

amount:
1000
```

这样用户就更容易理解自己要做什么。

不过 calldata 解码也可能出错。钱包需要依赖 ABI、函数选择器数据库或合约验证信息。如果解码错误，用户可能被误导。

因此，对安全要求高的用户来说，钱包最好同时提供两种视图：

decoded calldata；

raw calldata。

普通用户看 decoded 信息，技术用户可以核对 raw calldata。

## 十二、发送交易时的最低展示标准

一个钱包在发送交易时，至少应该展示：

目标地址，也就是 `to`；

网络，例如 Ethereum、Arbitrum、Base；

交易费用或 gas 信息；

转出的原生币数量，也就是 value；

raw calldata。

其中 raw calldata 是非常关键的安全信息。

如果一个钱包完全不显示 calldata，那么用户只能看到“发往某地址的一笔交易”，却不知道这笔交易调用了什么函数。

从安全角度看，这种钱包不适合用于复杂合约交互，尤其不适合多签、DeFi、DAO、合约管理等高风险操作。

## 十三、理想的钱包交易展示方式

更理想的钱包应该展示：

to 地址；

to 地址对应的 ENS 或合约名称；

chainId / network；

value；

gas fee；

nonce；

raw calldata；

decoded calldata；

函数名；

参数列表；

授权额度；

接收地址；

风险提示；

是否为代理合约；

是否涉及 delegatecall；

是否涉及合约升级；

是否涉及无限授权。

对于普通转账来说，展示收款地址和金额可能够用。

但对于合约交互，必须展示 calldata 或解码后的调用详情。

## 十四、多签场景为什么更需要 hash 验证

Safe 多签中，用户经常不是直接发送交易，而是签署一笔 Safe Transaction。

这类签名会被收集起来，达到阈值后再执行。

因此，签名者必须确认自己签的是哪一笔 Safe 交易。

在这种场景中，Safe TX Hash 非常重要。

如果钱包能展示 Safe TX Hash，用户就可以和 Safe UI、独立脚本或团队共享的交易详情进行核对。

如果钱包只显示一大堆结构化数据，理论上可以验证，但实际操作成本很高。

如果钱包什么都不显示，只显示“签名请求”，那就非常危险。

## 十五、如何验证自己要签的内容

技术用户可以用脚本根据 domain、types 和 message 自己计算 digest。

大致流程是：

```txt id="ouzz18"
读取 domain
读取 types
读取 message
按照 EIP-712 编码
计算 hash
得到 final digest / Safe TX Hash
和钱包显示内容对比
```

如果是 Safe 多签，也可以使用 Safe 官方工具、社区工具或独立脚本计算 Safe TX Hash。

非技术用户则可以使用可信的可视化工具辅助检查。

核心原则是：

不要盲签；

不要只相信网页显示；

钱包屏幕上的内容才是最终确认依据；

如果钱包显示内容不足，宁愿拒绝签名。

## 十六、盲签的风险

盲签指的是用户在不知道具体内容的情况下确认签名或交易。

例如钱包只显示：

```txt id="z5fahp"
Sign message?
```

或者：

```txt id="bdmzmy"
Confirm transaction?
```

却没有展示具体数据。

盲签的风险包括：

签署恶意授权；

执行伪装交易；

批准代币无限授权；

签署错误的 Safe 交易；

将资产转给攻击者；

允许合约代表你操作资产；

执行错误的链或错误的合约地址。

硬件钱包的意义是把签名确认从电脑屏幕转移到独立设备屏幕上。

如果硬件钱包本身不展示关键信息，用户仍然可能被电脑上的恶意网页欺骗。

## 十七、评价一个钱包安全展示能力的标准

评价一个钱包，尤其是硬件钱包，不应该只看：

是否离线保存私钥；

是否支持多链；

外观是否好看；

交互是否流畅。

还要看它在签名和交易时展示了什么。

### 签名时

至少应该展示：

domain、types、message；

或 domain hash + message hash；

或 final digest / Safe TX Hash。

最好能同时展示人类可读信息和最终 hash。

### 交易时

至少应该展示：

to 地址；

network；

gas fee；

value；

raw calldata。

最好能展示：

decoded calldata；

函数名；

参数；

合约名称；

风险提示。

如果一个钱包不展示 calldata，也不展示签名 hash，那么它在复杂 Web3 操作中就很难被认为是安全可靠的。

## 十八、实际使用建议

在日常使用中，可以遵循以下原则。

第一，普通转账也要检查链、地址和金额。

第二，合约交互必须检查 calldata 或解码结果。

第三，签署 Safe 多签时优先核对 Safe TX Hash。

第四，遇到 EIP-712 签名，至少确认 domain 和 message 是否合理。

第五，尽量避免在不展示详细信息的钱包上签署复杂交易。

第六，不要只相信网页 UI，网页可能被攻击或被替换。

第七，高价值操作尽量使用能展示 hash 和 calldata 的硬件钱包。

第八，如果钱包支持 raw calldata 和 decoded calldata，最好两个都看。

第九，对于无限授权、合约升级、delegatecall、多签执行等操作要特别谨慎。

第十，不理解的签名不要签。

## 十九、总结

Web3 钱包的安全不只是“私钥有没有离线保存”，还包括“签名和交易时是否给用户足够的信息”。

对于 EIP-712 签名，钱包至少应该展示完整结构化数据，或者展示 domain hash、message hash，最好直接展示最终 digest 或 Safe TX Hash。

对于发送交易，钱包至少应该展示目标地址、网络、费用、value 和 raw calldata。更理想的情况是，它还能解码 calldata，让用户看到具体函数和参数。

签名消息时，我们关心的是：我到底签了什么 hash？

发送交易时，我们关心的是：我到底向链上发送了什么指令？

如果钱包不能回答这两个问题，就很难支撑高价值、高风险的 Web3 操作。

在多签、DeFi、DAO、合约管理和大额资产场景中，拒绝盲签、核对 hash、查看 calldata，是最基本的安全习惯。
