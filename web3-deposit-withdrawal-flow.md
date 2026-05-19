# Web3 前端如何落地充值与提现模块：以 Next.js + 钱包签名 + 后端执行为例

在 Web3 应用里，充值和提现并不是简单的“点一下按钮，然后调一个接口”。

尤其是在交易平台、账户系统、期权平台、合约账户系统这类产品里，前端通常不只是负责 UI，而是要同时协调三件事：

1. 用户钱包里的资产。
2. 协议内部的账户系统。
3. 后端或者 relayer 对链上操作的执行。

所以充值和提现模块真正复杂的地方，不在于弹窗怎么画，也不在于表单怎么写，而在于前端如何把“用户意图”“链上授权”“签名确认”“后端提交”“合约执行”这几层串起来。

这篇文章主要结合一个实际的 Next.js Web3 项目，聊一下前端如何落地充值和提现模块。

项目里的核心链路可以简化成四个函数：

```ts
prepareDeposit();
submitDepositSignature();
prepareWithdraw();
submitWithdrawSignature();
```

这四个函数对应的不是 UI 层，而是业务流程层。

---

## 一、为什么充值和提现不能直接调后端接口？

在传统 Web2 系统里，充值和提现通常是：

```txt
用户输入金额 -> 调用后端接口 -> 后端处理
```

但在 Web3 系统里，这样是不够的。

因为用户的资金可能在钱包里，也可能已经进入协议账户系统。不同阶段对应的权限完全不同。

以 USDC 充值为例，用户的钱一开始在自己的钱包里。后端或者合约不能直接拿走用户钱包里的 USDC，必须先经过用户授权。

也就是说，充值至少需要几步：

```txt
用户授权 deposit module 使用 USDC
  -> 用户签名确认充值意图
  -> 后端校验签名
  -> 后端或 relayer 调用链上模块完成充值
```

提现则不一样。提现的资金已经在协议账户系统里，不需要再让用户对 ERC20 做 approve。前端只需要让用户签名确认“我要从协议里提走多少钱”，然后把这个签名提交给后端。

所以充值和提现虽然 UI 上很像，都是输入金额、点击确认、等待处理，但底层链路是不一样的。

---

## 二、充值模块的核心链路

充值可以拆成两个阶段。

第一阶段是 `prepareDeposit`，负责链上授权和构造 operation。

第二阶段是 `submitDepositSignature`，负责钱包签名和提交后端。

整体流程如下：

```txt
Deposit:
输入金额
  -> 校验钱包余额和配置
  -> USDC approve
  -> encodeDepositData
  -> 构造 operation
  -> 钱包签名
  -> 提交后端
  -> 后端校验并执行链上 deposit
```

### 1. Deposit Step 1：先 approve，再构造充值操作

充值的第一步不是直接签名，也不是直接调后端，而是先对 USDC 合约发起 approve。

原因很简单：用户的 USDC 还在钱包里，deposit module 想要执行后续转账，必须先获得用户授权。

核心代码可以简化成这样：

```ts
/**
 * Deposit Step 1
 *
 * 用户输入充值金额后，前端先发起 USDC approve，
 * 授权 deposit module 可以代扣用户钱包里的 USDC。
 *
 * approve 成功后，前端再构造 deposit operation，
 * 并把它交给下一步签名流程。
 */
async function prepareDeposit(amount: string) {
  const parsedAmount = parseUnits(amount, 6);

  // 1. 先授权 deposit module 使用用户的 USDC
  const approveHash = await writeUsdcApprove({
    spender: networkConfig.matching.deposit,
    amount: parsedAmount,
  });

  if (!approveHash) return;

  // 2. 编码 deposit module 需要执行的 calldata
  const operationData = encodeDepositData(
    parsedAmount,
    networkConfig.core.usdx,
    networkConfig.core.positionManager,
  );

  // 3. 构造待签名的 operation
  const operation = {
    amount,
    account: BigInt(userAccount.account_id),
    owner: userAccount.address,
    signer: userAccount.address,
    module: networkConfig.matching.deposit,
    deadline: BigInt(getUnixTimeByNextDay()),
    nonce: BigInt(genRandNum()),
    data: operationData,
  };

  // 4. 存入临时状态，进入签名弹窗
  setDepositInfo(operation);
  openDepositSignDialog();
}
```

这里有几个关键点。

第一，`parseUnits(amount, 6)` 很重要。USDC 通常是 6 位精度，前端表单里用户输入的是字符串，比如 `"100.25"`，但合约需要的是最小单位整数。所以在任何链上交互之前，都应该先把 UI 金额转换成合约金额。

第二，approve 的对象不是后端地址，而是 `networkConfig.matching.deposit`，也就是实际执行充值逻辑的 deposit module 地址。前端必须明确知道当前网络下的合约地址配置，不能把地址散落写死在组件里。

第三，`encodeDepositData` 的作用是把后续 deposit module 需要执行的数据提前编码好。这样前端不是只提交一个金额，而是提交一份结构化的、可被后端和合约识别的操作数据。

第四，operation 里不仅有 amount，还有 `account`、`owner`、`signer`、`module`、`deadline`、`nonce` 和 `data`。这些字段是安全边界。

它们解决的是几个问题：

- `account` 表示这笔充值归属到哪个协议账户。
- `owner` 和 `signer` 表示这笔操作是谁发起、由谁签名。
- `module` 表示这笔操作最终要调用哪个模块。
- `deadline` 防止签名长期有效。
- `nonce` 防止同一份签名被重复使用。
- `data` 表示真正要执行的模块调用内容。

这一步完成后，充值还没有真正完成。前端只是完成了链上授权，并准备好了下一步要签名的 operation。

### 2. Deposit Step 2：签名 operation，再提交后端

第二步是用户对 operation 签名。

这一步的意义不是转账，而是确认用户意图。也就是说，用户通过钱包签名表达：

> 我同意对这个账户、这个模块、这个金额、这份 calldata 执行充值操作。

核心代码可以简化成这样：

```ts
/**
 * Deposit Step 2
 *
 * 钱包对 deposit operation 签名。
 * 前端把签名、operation、operation_data 一起提交给后端。
 *
 * 后端校验签名后，再由 relayer 或后端服务调用链上 deposit module，
 * 执行真正的资金入账。
 */
async function submitDepositSignature(depositInfo: DepositOperation) {
  // 1. 去掉 amount 等 UI 字段，得到真正参与签名的 action
  const {amount, ...action} = depositInfo;

  // 2. 运行时校验，避免脏数据进入签名流程
  const verifiedAction = actionSchema.parse(action);

  // 3. 请求钱包签名
  const signature = await signOperation(verifiedAction);

  // 4. 编码 operation
  const encodedOperation = encodeOperation(verifiedAction);

  // 5. 提交后端
  await applyDeposit({
    amount,
    operation_data: depositInfo.data,
    operation: encodedOperation,
    chain_id: chainId,
    signature,
    account_id: depositInfo.account.toString(),
  });
}
```

这里的设计重点是：前端不要把“展示字段”和“签名字段”混在一起。

例如 amount 对 UI 和接口很有用，但它不一定是最终参与 EIP-712 签名的字段。真正参与签名的应该是 action，也就是经过结构化处理后的 operation 数据。

所以代码里先做了：

```ts
const {amount, ...action} = depositInfo;
```

然后用：

```ts
const verifiedAction = actionSchema.parse(action);
```

这一层非常关键。Web3 前端不能完全相信自己内存里的数据。因为 operation 可能来自状态管理，也可能经过多个页面、弹窗、异步流程传递，中间很容易出现空值、类型错误、字段缺失或者脏数据。

用 Zod 做运行时校验，可以在签名前拦截错误数据，避免用户对错误 payload 签名。

签名完成后，前端提交给后端的不是单纯的金额，而是一组完整数据：

```ts
{
  amount,
  operation_data,
  operation,
  chain_id,
  signature,
  account_id,
}
```

这组数据给后端提供了完整上下文。

后端可以校验：

- 这是不是当前用户签的。
- 签名有没有过期。
- nonce 有没有被用过。
- operation 里的 module 是否允许。
- operation_data 是否和业务参数一致。
- chain_id 是否匹配当前环境。
- 账户余额、额度、风控限制是否满足。

校验通过后，后端或者 relayer 再去调用链上 deposit module，执行真正的资金入账。

---

## 三、提现模块的核心链路

提现和充值看起来很像，但有一个核心区别：

```txt
提现不需要 approve。
```

因为充值时，资金在用户钱包里，所以合约需要用户授权。

提现时，资金已经在协议账户系统中，用户要做的是证明“我本人确认要提现”。所以前端只需要构造提现 operation，然后让用户签名。

整体流程如下：

```txt
Withdraw:
输入金额
  -> 校验账户可提现余额
  -> encodeWithdrawData
  -> 构造 operation
  -> 钱包签名
  -> 提交后端
  -> 后端校验并执行链上 withdrawal
```

### 1. Withdraw Step 1：构造提现 operation

提现第一步只需要准备 operation，不需要发起 ERC20 approve。

```ts
/**
 * Withdraw Step 1
 *
 * 提现不需要 approve。
 * 因为用户要提走的资金已经在协议账户系统中，
 * 前端只需要构造 withdrawal operation，
 * 然后让用户签名确认提现意图。
 */
async function prepareWithdraw(amount: string) {
  const parsedAmount = parseUnits(amount, 6);

  // 1. 编码 withdraw module 需要执行的 calldata
  const operationData = encodeWithdrawData(parsedAmount, networkConfig.core.usdx);

  // 2. 构造待签名的 withdrawal operation
  const operation = {
    amount,
    account: BigInt(userAccount.account_id),
    owner: userAccount.address,
    signer: userAccount.address,
    module: networkConfig.matching.withdrawal,
    deadline: BigInt(getUnixTimeByNextDay()),
    nonce: BigInt(genRandNum()),
    data: operationData,
  };

  // 3. 存入临时状态，进入签名弹窗
  setWithdrawInfo(operation);
  openWithdrawSignDialog();
}
```

这里的结构和充值类似，但少了 approve。

前端需要先校验用户的可提现余额。这个余额通常不是钱包余额，而是协议账户里的余额。比如在交易平台里，用户账户可能有：

- 可用余额。
- 冻结保证金。
- 未结算盈亏。
- 手续费。
- 风控限制。

所以提现金额不能只看钱包余额，而应该看协议账户系统给出的可提现金额。

在这个项目里，可以理解为：

```ts
availableBalance = cash - frozen_margin;
```

这代表用户账户里的现金余额减去被冻结的保证金。

这也是 Web3 交易类产品和普通钱包类 DApp 很不一样的地方。它不是简单读 ERC20 `balanceOf` 就能判断用户能不能提现，而是要结合后端账户系统、交易状态和风险控制规则。

### 2. Withdraw Step 2：签名并提交提现请求

提现签名和充值签名的结构基本一致。

```ts
/**
 * Withdraw Step 2
 *
 * 钱包对 withdrawal operation 签名。
 * 前端把签名后的提现请求提交给后端。
 *
 * 后端校验签名、账户余额、nonce、deadline 等字段后，
 * 再执行真正的提现逻辑。
 */
async function submitWithdrawSignature(withdrawInfo: WithdrawOperation) {
  // 1. 去掉 amount 等 UI 字段，得到真正参与签名的 action
  const {amount, ...action} = withdrawInfo;

  // 2. 运行时校验 operation
  const verifiedAction = actionSchema.parse(action);

  // 3. 请求钱包签名
  const signature = await signOperation(verifiedAction);

  // 4. 编码 operation
  const encodedOperation = encodeOperation(verifiedAction);

  // 5. 提交后端
  await applyWithdraw({
    amount,
    operation_data: withdrawInfo.data,
    operation: encodedOperation,
    chain_id: chainId,
    signature,
    account_id: withdrawInfo.account.toString(),
  });
}
```

这一步里，前端的职责是把用户签名和提现 operation 绑定起来，然后交给后端。

真正的提现执行不应该只依赖前端判断。前端可以做体验层校验，比如金额格式、最小提现金额、最大提现金额、可提现余额提示。但最终安全校验必须在后端和合约层完成。

也就是说，前端校验是为了减少错误操作，后端和合约校验才是安全边界。

---

## 四、为什么要设计 operation 这一层？

在这个充值和提现链路里，有一个很核心的设计：前端不是直接把表单数据提交给后端，而是先构造 operation。

这个 operation 可以理解为一份“用户要执行的结构化指令”。

它大概包含这些字段：

```ts
{
  account,
  owner,
  signer,
  module,
  deadline,
  nonce,
  data,
}
```

这个设计的好处主要有四个。

第一，用户签名的不是一句模糊的消息，而是一份结构化操作。后端可以明确知道用户签的到底是什么。

第二，operation 可以绑定具体模块。比如 deposit 只能走 deposit module，withdraw 只能走 withdrawal module，避免签名被挪用到其他模块。

第三，operation 可以绑定过期时间和 nonce。这样即使签名泄露，也不会长期有效，也不能被重复提交。

第四，operation 可以被编码后提交给后端和合约，方便后端做统一校验和统一执行。

这也是很多 Web3 产品会采用“前端构造 operation + 钱包签名 + 后端 relayer 执行”的原因。它把用户授权、业务校验和链上执行拆开了。

---

## 五、为什么充值需要 approve，而提现不需要？

这是这个模块里最容易被误解的点。

充值时，资金在用户钱包中。

USDC 是 ERC20 资产。任何合约想要从用户钱包转走 USDC，都必须先获得用户授权。所以前端需要先调用：

```ts
approve(spender, amount);
```

其中 spender 是 deposit module。

只有 approve 成功后，deposit module 后续才有能力通过 `transferFrom` 之类的方式完成资金划转。

提现时，资金已经在协议账户系统中。

用户不是授权某个合约花自己钱包里的 USDC，而是签名确认一笔提现请求。后端校验签名和账户余额后，再执行提现流程。

所以提现不需要 approve。

这两个流程看起来都是“用户输入金额”，但资产所在位置不一样，导致前端链路完全不同。

---

## 六、前端在这个模块里真正负责什么？

很多人会把 Web3 前端理解成“连接钱包 + 调合约”。这个理解太窄了。

在充值和提现这种模块里，前端真正负责的是流程编排。

具体来说，前端要负责这些事情：

1. 读取当前链、当前账户、网络配置和合约地址。
2. 校验用户输入金额，包括格式、小数位、最小金额、最大金额、余额是否足够。
3. 判断当前操作需要走链上交易还是只需要签名。
4. 调用合约方法，比如充值前的 USDC approve。
5. 编码模块 calldata，比如 `encodeDepositData` 和 `encodeWithdrawData`。
6. 构造统一的 operation 数据结构。
7. 请求用户钱包签名。
8. 把签名、operation、operation_data 和 account_id 提交给后端。
9. 根据用户拒签、交易 pending、后端处理结果更新交互状态。

所以，Web3 前端不是单纯的页面开发，而是在用户、钱包、后端、合约之间做一层可信流程协调。

---

## 七、为什么要把 UI 和业务链路拆开？

在实际项目里，充值和提现通常会被包装成弹窗、表单、loading 状态、成功失败提示等 UI。

但从工程角度看，最好不要让 UI 组件直接承载所有业务逻辑。

更合理的拆法是：

```txt
Dialog / Form
  -> 只负责展示和收集输入
prepareDeposit / prepareWithdraw
  -> 负责准备 operation
submitDepositSignature / submitWithdrawSignature
  -> 负责签名和提交
useDeposit / useWithdrawal
  -> 负责封装具体业务 mutation、签名方法、网络配置
```

这样做的好处是，UI 可以替换，但链路不容易乱。

比如以后充值入口不一定只在弹窗里，也可能在账户页面、移动端页面、Telegram Mini App 页面里。如果核心链路都写死在弹窗组件里，后面复用会很痛苦。

但如果把核心流程抽成函数或 hook，那么不同 UI 只需要调用同一套业务流程。

---

## 八、落地时需要注意的几个安全点

### 1. 不要只依赖前端校验

前端校验只能改善用户体验，不能作为最终安全判断。金额、余额、nonce、deadline、module、chainId、签名归属，都必须由后端和合约重新校验。

### 2. 签名前要做运行时校验

TypeScript 只能保证开发阶段的类型，不能保证运行时数据一定正确。operation 这种直接进入签名流程的数据，最好用 Zod 之类的 schema 做一次运行时校验。

### 3. 签名必须绑定 chainId

如果签名没有绑定链 ID，可能出现跨链重放风险。前端提交给后端时要带上 `chain_id`，后端校验签名时也应该基于对应链环境处理。

### 4. 签名必须有 nonce 和 deadline

nonce 用来防重放，deadline 用来限制签名有效期。没有这两个字段，签名会变得非常危险。

### 5. approve 的 spender 必须是明确的合约模块地址

不要让前端随意传 spender，更不要从用户输入或不可信来源读取 spender。spender 应该来自当前网络的可信配置。

### 6. approve 成功不等于充值成功

approve 只是授权成功，不代表资金已经进入协议。真正的充值要等后续签名提交、后端校验、链上 deposit 执行完成。

这个状态必须在 UI 上表达清楚，否则用户会以为看到 approve hash 就已经充值完成。

---

## 九、总结

Web3 前端落地充值和提现模块，重点不是 UI，而是链路设计。

充值的核心是：

```txt
先 approve
  -> 再签名
  -> 再提交后端
  -> 再由后端或 relayer 执行链上 deposit
```

提现的核心是：

```txt
不需要 approve
  -> 直接构造 withdrawal operation
  -> 让用户签名后提交后端执行
```

在这个过程中，前端要做的不是简单调接口，而是把钱包、合约、后端账户系统和用户操作串成一个安全可控的流程。

一个比较好的实现方式是：

- 用 Next.js 承载页面和交互。
- 用 wagmi / viem 处理链上读写和金额编码。
- 用 Zod 做 operation 运行时校验。
- 用统一的 operation 结构承载用户意图。
- 用钱包签名确认用户操作。
- 用后端或 relayer 负责最终校验和链上执行。

这样拆分之后，充值和提现模块会更清晰，也更接近真实 Web3 交易产品里的工程落地方式。
