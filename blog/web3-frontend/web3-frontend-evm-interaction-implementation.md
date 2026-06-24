# Web3 前端 EVM 交互如何落地：从切链、签名到 ERC20 支付与合约领奖

在很多 Web3 前端项目里，EVM 交互很容易被简化理解成一句话：用 wagmi 调一个合约方法。

但真正做过业务之后会发现，EVM 交互并不是“点一下按钮，调一下合约”这么简单。用户在页面上点击支付、创建、Mint 或领取奖励之前，前端需要先确认钱包是否连接、当前地址是谁、钱包所在网络是否正确、用户是否具备业务资格。交易发出之后，还要处理交易 hash、等待链上确认，并把支付、领奖或订单状态同步给后端。

所以，一个完整的 EVM 前端交互，往往不是单点调用，而是一条完整链路：

```text
链配置
→ 钱包连接状态
→ chainId 校验与切链
→ 签名或获取业务参数
→ ABI / 合约地址
→ 发起交易
→ 获取交易 hash
→ 等待链上确认
→ 同步后端状态
→ 刷新 UI
```

这篇文章就从真实项目经验出发，聊一聊 EVM 前端交互到底应该如何组织，尤其是切链、签名、Native 支付、ERC20 支付和业务合约调用这几个高频场景。

---

## 1. EVM 交互不只是调用合约

刚接触 Web3 前端时，很多人会把 EVM 交互理解为：

```ts
await contract.write();
```

或者：

```ts
await writeContract(...)
```

但在实际业务里，这只是最后一步。

一次完整的 EVM 操作，通常要包含以下环节：

```text
判断钱包是否连接
判断当前钱包地址
判断当前 chainId
必要时请求用户切链
准备合约地址和 ABI
准备业务参数
发起签名或交易
等待交易结果
刷新链上或链下状态
```

例如用户点击“支付”按钮时，前端不能直接把交易发出去。它至少要先确认：

当前钱包连上了吗？
用户是不是在目标链上？
支付资产是原生币还是 ERC20？
用户余额够不够？
金额有没有转换成最小单位？
交易发出后，后端订单状态怎么更新？

再比如用户点击“领取奖励”，前端也不能简单调用 `claim()`。通常还需要先从后端拿到资格参数，比如 nonce、amount、signature，然后带着这些参数去调用链上合约。

所以 EVM 前端交互更准确的理解是：

> 前端在钱包、合约和后端业务系统之间做协调，完成一次可验证、可追踪的链上业务操作。

这也是为什么 Web3 前端不只是会调 SDK，而要理解业务链路。

---

## 2. 一条典型的 EVM 业务链路

在真实项目中，我比较推荐把 EVM 交互拆成下面几层：

```text
链配置层
→ 钱包状态层
→ 网络检查层
→ 合约调用层
→ 交易确认层
→ 业务同步层
```

展开来看，大概是这样：

```text
chainId / RPC / contract address
→ address / isConnected
→ switchChain
→ writeContract / sendTransaction
→ waitForTransactionReceipt
→ notify backend / refetch UI
```

这条链路可以套到很多场景里。

支付场景中，它表现为：

```text
选择链和 Token
→ 检查钱包连接
→ 检查 chainId
→ 检查余额
→ Native 或 ERC20 支付
→ 返回 txHash
→ 更新订单状态
```

Mint 场景中，它表现为：

```text
登录或签名
→ 获取 mint 参数
→ 调用 mint 合约
→ 等待交易确认
→ 刷新 NFT 或用户状态
```

领奖场景中，它表现为：

```text
获取领奖资格参数
→ 调用 claim 合约
→ 等待交易结果
→ 回标后端领奖状态
→ 刷新奖励列表
```

从这里也能看出，EVM 交互不是一个 Hook 能解决的事情，而是一组模块协作：钱包连接、链配置、ABI、合约地址、交易 Hook、后端接口和 UI 状态都要串起来。

---

## 3. 切链：交易前最容易被忽略的一步

在 EVM 多链项目里，切链是非常关键的一步。

用户钱包连接成功，只能说明前端拿到了一个地址，并不代表这个地址当前处于正确网络。比如用户的钱包地址是同一个，但它可能当前停留在 Ethereum，也可能停留在 BNB Chain、Polygon、Arbitrum 或 Base。

而不同网络之间：

```text
chainId 不同
RPC 不同
资产余额不同
合约地址不同
交易状态不同
```

如果用户当前链不对，轻则交易失败，重则交易被发到错误网络。

所以在发起交易之前，前端应该先检查当前 `chainId` 是否符合业务要求。如果不一致，就请求用户切换网络：

```ts
if (currentChainId !== targetChainId) {
  await switchChain({ chainId: targetChainId });
}
```

这一步看起来只是一个交互细节，但实际上是交易安全的一部分。

尤其在多链活动、跨链支付、链上领奖这类业务里，合约地址和资产往往只在指定链上有效。比如某个活动的支付合约部署在 BNB Chain，用户如果停留在 Ethereum 主网，就不应该继续发交易。

因此，切链最好不要散落在每个按钮点击事件里，而应该放在统一的业务 Hook 中，比如：

```ts
const { prepareNetwork, pay } = usePay();

await prepareNetwork();
await pay();
```

这样页面层只负责描述“我要支付”，而网络检查、钱包连接、切链这些前置工作由 Hook 统一处理。

---

## 4. 签名：证明身份，不一定发交易

EVM 里还有一个很容易和交易混在一起的概念：签名。

签名和交易不同。交易会改变链上状态，通常需要 Gas；签名一般不会上链，也不需要 Gas，它的核心作用是证明用户控制某个钱包地址。

常见场景包括：

```text
钱包登录
绑定钱包
确认操作意愿
生成领奖资格
```

比如钱包登录时，前端可以让用户签一段消息：

```ts
const signature = await signMessageAsync({
  message: "Login to this application",
});
```

后端拿到地址和签名后，可以验证这段签名是否确实由该地址生成。这样就不需要传统的用户名密码，也能证明用户身份。

更严谨一些的场景会使用 EIP-712 Typed Data。它的好处是签名内容结构化，用户在钱包里看到的信息更清晰，也更适合登录、授权、绑定钱包这类业务。

简化之后大概是这样：

```ts
const signature = await signTypedDataAsync({
  domain,
  types,
  primaryType: "Login",
  message: {
    account: address,
    nonce,
  },
});
```

这里的 `nonce` 很重要，它可以降低签名被重复使用的风险。

不过在领奖场景里，还会出现另一类签名：后端资格签名。

这类签名不是用户用钱包签出来的，而是后端根据业务规则生成的。例如用户中奖了，后端判断他具备领取资格，然后生成一组参数：

```text
amount
nonce
signature
```

前端再带着这些参数去调用合约：

```ts
await writeContract({
  address: raffleContract,
  abi: raffleAbi,
  functionName: "claim",
  args: [amount, nonce, signature],
});
```

合约内部会校验签名是否合法，防止用户随便构造参数领取奖励。

所以这里要区分两件事：

```text
用户钱包签名：证明“我是这个地址的控制者”
后端资格签名：证明“这个地址有资格执行某个业务”
```

很多 EVM 业务都会同时用到这两类签名。

---

## 5. Native 支付：最直接的 EVM 转账

EVM 里的 Native Token 指链原生资产，比如 ETH、BNB、MATIC。

这类资产不是 ERC20 合约里的余额，而是账户本身的原生余额。因此，Native 支付可以直接通过 `sendTransaction` 完成。

简化代码如下：

```ts
await sendTransaction({
  to: receiver,
  value: parseEther(amount),
});
```

如果使用 wagmi，常见写法类似：

```ts
const { sendTransactionAsync } = useSendTransaction();

const tx = await sendTransactionAsync({
  to: receiver,
  value: parseUnits(amount, decimals),
});
```

这里有两个点很重要。

第一，金额不能直接用用户输入的字符串或小数。
链上识别的是最小单位，比如 ETH 的最小单位是 wei，1 ETH 等于 10 的 18 次方 wei。所以前端必须用 `parseEther` 或 `parseUnits` 转换。

第二，拿到交易 hash 不等于业务完成。
`sendTransaction` 返回 hash，只能说明交易已经广播。交易是否打包成功、是否被 revert，还要看后续 receipt。

更稳妥的流程应该是：

```text
sendTransaction
→ 获取 txHash
→ waitForTransactionReceipt
→ 确认 success
→ 通知后端
→ 刷新 UI
```

如果只是拿到 hash 就立刻标记支付成功，可能会出现链上失败但后端已标记成功的问题。当然，有些项目会让后端自己监听链上交易，这种情况下前端可以先回传 hash，再由后端最终确认。

---

## 6. ERC20 支付：本质是调用 Token 合约

ERC20 支付和 Native 支付最大的区别是：ERC20 不是直接转原生币，而是调用 Token 合约。

比如用户支付 USDT，本质上不是给某个地址发送 ETH，而是调用 USDT 合约的 `transfer` 方法：

```ts
await writeContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: "transfer",
  args: [receiver, parseUnits(amount, decimals)],
});
```

这里必须准备三类信息：

```text
tokenAddress：Token 合约地址
erc20Abi：Token 合约 ABI
decimals：Token 精度
```

很多新人容易忽略 `decimals`。不同 Token 的精度不一定一样。ETH 常用 18 位，很多 ERC20 也是 18 位，但 USDT 这类稳定币经常是 6 位。如果写死 18 位，金额就会错得很离谱。

所以比较稳妥的写法是：

```ts
const value = parseUnits(amount, token.decimals);
```

另外，ERC20 支付之前通常还需要检查余额：

```ts
const balance = await readContract({
  address: tokenAddress,
  abi: erc20Abi,
  functionName: "balanceOf",
  args: [address],
});
```

在实际项目里，支付 Hook 往往会把 Native 和 ERC20 分成两条路径：

```ts
if (token.isNative) {
  return sendNativeToken();
}

return transferErc20Token();
```

这样页面层不需要关心当前支付资产到底是 ETH、BNB 还是 USDT，只需要传入 token 信息，底层根据类型分发。

---

## 7. 业务合约调用：mint、create、claim

除了支付，EVM 项目里更多的是业务合约调用，比如：

```text
mint
create
claim
withdraw
settle
stake
unstake
```

这些操作都需要 ABI、合约地址、方法名和业务参数。

一个简化后的业务合约调用可能是：

```ts
await writeContract({
  address: contractAddress,
  abi: businessAbi,
  functionName: "mint",
  args: [tokenId, amount, signature],
});
```

这类调用和 ERC20 `transfer` 的形式相似，但业务复杂度更高。因为参数往往不是前端自己随便生成的，而是来自后端、页面表单或合约读取结果。

以 Mint 为例，常见流程可能是：

```text
用户登录
→ 后端判断是否有 mint 资格
→ 后端返回 tokenId、amount、signature
→ 前端调用 mint
→ 等待交易确认
→ 刷新用户资产
```

以 Claim 为例，流程可能是：

```text
前端请求领奖信息
→ 后端返回 amount、nonce、signature
→ 前端调用 claim
→ 合约校验签名
→ 链上发放奖励
→ 前端通知后端已领取
```

这里的关键点是：前端不是业务规则的最终裁判。前端负责发起交易和组织流程，但资格校验、参数签发、状态记录往往需要后端和合约共同完成。

这也是 Web3 业务和纯前端业务很不一样的地方。

---

## 8. 交易生命周期：不要把 hash 当成成功

很多 Web3 前端 bug 都来自一个误区：拿到交易 hash 就认为成功。

实际上，交易生命周期大概是这样的：

```text
用户在钱包确认
→ 交易被广播到网络
→ 前端拿到 txHash
→ 交易被矿工/验证者打包
→ EVM 执行交易
→ 成功或 revert
→ 生成 receipt
```

所以 hash 只是“交易已提交”的标识，不是“交易已成功”的证明。

更合理的状态设计应该至少区分：

```text
pending：等待用户确认
submitted：交易已广播
confirming：等待链上确认
success：链上执行成功
failed：交易失败或被 revert
```

在代码中可以这样组织：

```ts
const hash = await writeContractAsync(params);

const receipt = await waitForTransactionReceipt({
  hash,
});

if (receipt.status === "success") {
  await notifyBackend(hash);
  await refetch();
}
```

当然，有些业务会把确认逻辑放到后端，由后端监听链上事件或查询交易状态。即便如此，前端也应该在状态命名上保持清晰，不要把 submitted 和 confirmed 混在一起。

---

## 9. 为什么链上成功后还要同步后端

很多 Web3 项目并不是纯链上应用。它们通常同时存在两套状态：

```text
链上状态：合约、资产、交易、事件
链下状态：订单、用户、活动、奖励、积分
```

比如用户支付成功，链上只是发生了一笔转账，但后端还需要知道：

```text
哪个用户支付了
支付的是哪个订单
交易 hash 是多少
是否已经确认
活动状态是否可以进入下一步
```

再比如用户领取奖励，链上可能已经执行了 claim，但后端还需要把领奖记录标记为已领取，避免页面重复展示可领取状态。

因此，EVM 交易成功之后，前端经常还要调用后端接口：

```text
markPaid
markClaimed
updateOrder
refreshUserInfo
```

可以把这个过程理解为：

```text
链上完成资产或合约状态变更
链下完成业务状态变更
前端负责串联和反馈
```

这也是为什么一个成熟的 EVM 交互流程，一般不会只停留在合约调用本身。

---

## 10. EVM 和其他链的边界

如果项目是多链的，还要理解 EVM 和其他链的边界。

EVM 的核心特征是：

```text
chainId
ABI
contract address
sendTransaction
writeContract
receipt
```

Solana 则是另一套模型：

```text
PublicKey
Connection
Transaction
Instruction
wallet-adapter
```

BTC 又完全不同，它基于 UTXO，钱包 API 也更依赖具体插件，比如 Unisat、OKX、Xverse。

所以在多链项目里，不建议把所有链的底层操作都硬塞进一套统一接口。更好的方式是：

```text
EVM 交互保持 EVM 的模型
Solana 交互保持 Solana 的模型
BTC 交互保持 BTC 的模型
业务层再做统一分发
```

这和多链钱包适配的思路是一致的：底层不要抹平差异，业务层统一动作。

---

## 11. 我比较推荐的 EVM 前端组织方式

如果要从零设计一个 EVM 交互模块，我会按下面方式拆分：

```text
config/
  chains.ts
  contracts.ts
  tokens.ts

hooks/
  usePrepareNetwork.ts
  useEvmPayment.ts
  useErc20Transfer.ts
  useContractClaim.ts
  useTransactionStatus.ts

services/
  order.ts
  reward.ts

abis/
  erc20.ts
  raffle.ts
  factory.ts
```

每一层职责尽量清楚。

`chains.ts` 负责链配置，比如 chainId、RPC、区块浏览器。
`contracts.ts` 负责合约地址。
`tokens.ts` 负责 Token 地址、symbol、decimals。
`usePrepareNetwork` 负责钱包连接和切链。
`useEvmPayment` 负责 Native / ERC20 支付分发。
`useContractClaim` 负责合约领奖。
`services` 负责后端接口。
`abis` 只维护 ABI。

页面最终只调用比较语义化的方法：

```ts
await prepareNetwork();
const hash = await pay();
await confirmTransaction(hash);
await markOrderPaid(hash);
```

这样页面就不会被 `chainId`、`parseUnits`、`writeContract`、`receipt` 等细节淹没。

---

## 12. 面试时可以怎么讲

如果面试中被问到：“你在项目里是怎么处理 EVM 交互的？”

可以这样回答：

> EVM 这边我主要用 wagmi 管理钱包连接、地址、chainId、切链、签名和合约写入。交易前会先检查钱包是否连接以及当前网络是否正确。如果是 Native Token 支付，就走 `sendTransaction`；如果是 ERC20 或 USDT 支付，就调用 Token 合约的 `transfer`，并根据 decimals 做金额转换。像 mint、create、claim 这种业务操作，则通过业务合约 ABI 和合约地址调用对应方法。登录和钱包绑定会使用用户签名证明地址所有权，领奖这类场景通常会先从后端拿资格签名，再提交到合约。交易成功后，还要处理 receipt、回标后端状态并刷新 UI，因为链上交易和业务系统状态是两套东西。

如果面试官追问：“为什么不直接拿到 hash 就认为成功？”

可以回答：

> hash 只能说明交易已经广播，不代表链上执行成功。交易还可能失败、revert 或长时间未确认。所以更稳妥的做法是等待 receipt，确认状态成功后再更新业务状态。如果业务由后端监听链上交易，也要区分 submitted 和 confirmed，不应该把交易提交和交易成功混为一谈。

如果面试官追问：“Native 支付和 ERC20 支付有什么区别？”

可以回答：

> Native Token 是链原生资产，比如 ETH、BNB，可以直接通过 `sendTransaction({ to, value })` 转账。ERC20 是合约资产，支付时其实是调用 Token 合约的 `transfer` 方法，所以需要 Token 地址、ERC20 ABI 和 decimals。金额也不能直接用小数，要用 `parseUnits` 转成链上整数。

---

## 13. 总结

EVM 前端交互的核心，不是会不会调用 `writeContract`，而是能不能把一整条业务链路组织清楚。

一套比较完整的 EVM 交互应该包括：

```text
连接钱包
→ 检查 chainId
→ 必要时切链
→ 准备签名或业务参数
→ 区分 Native / ERC20 / 业务合约
→ 发起交易
→ 等待确认
→ 同步后端
→ 刷新 UI
```

其中最容易被低估的有三点。

第一，切链是交易前置条件，不是 UI 小功能。
第二，签名不等于交易，它更多用于身份确认和资格授权。
第三，交易 hash 不等于业务成功，链上确认和后端状态同步都很重要。

当你能把这些讲清楚，就说明你理解的已经不是“怎么调一个合约”，而是 EVM 前端交互在真实业务中的完整落地方式。
