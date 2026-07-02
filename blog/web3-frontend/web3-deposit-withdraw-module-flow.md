# 前端如何落地 Web3 出入金模块：以 Deposit / Withdraw 核心链路为例

在 Web3 交易类产品中，出入金模块通常不是一个简单的“表单提交”功能。它同时涉及钱包连接、余额校验、链上授权、签名确认、后端提交、交易状态反馈以及用户资产刷新。前端在其中承担的不只是页面展示，而是要把链上交互、业务规则和用户体验串成一条稳定、清晰、可回溯的流程。

本文以一个 USDC 出入金模块为例，梳理前端如何落地 Deposit 与 Withdraw 两条核心链路。

## 一、出入金模块的核心特点

相比普通业务表单，出入金模块有几个明显特点。

第一，它依赖钱包状态。用户必须先连接钱包，前端才能获取地址、余额，并继续执行授权或签名。

第二，它包含链上动作。Deposit 过程中通常需要先对 USDC 合约执行 `approve`，允许业务合约或协议合约使用用户指定数量的 USDC。

第三，它包含链下业务提交。用户完成链上授权或钱包签名后，前端还需要把编码后的操作数据提交给后端，由后端完成后续业务处理。

第四，它对状态反馈要求很高。用户需要清楚知道当前处于输入金额、授权中、签名中、提交中、成功或失败哪个阶段，否则很容易产生“钱是不是没了”“交易是不是卡住了”的焦虑。

因此，前端落地出入金模块时，重点不是写一个弹窗，而是设计一条完整的状态流。

## 二、Deposit 入金链路设计

Deposit 的核心链路如下：

```text
用户点击 Deposit
→ useDeposit.handleDeposit
→ 未连接钱包则打开 AppKit
→ 已连接钱包则打开 DepositDialog
→ 输入 USDC 金额
→ Zod 校验 min / max / balance
→ useWriteUsdcApprove 调 USDC approve
→ approve 返回 tx hash
→ encodeDepositData
→ 构造 Operation
→ 写入 depositInfoAtom
→ 打开 DepositSignDialog
→ 钱包 useSignTypedData 签名
→ encodeOperation
→ useApplyDeposit 提交后端
→ 后端返回 tx_hash / 业务状态
→ 弹 DepositSuccess / DepositFailed
→ invalidate ['user', 'account']
```

从前端角度看，这条链路可以拆成五个阶段：入口判断、金额输入、链上授权、签名确认、后端提交与结果反馈。

## 三、入口层：先判断钱包连接状态

用户点击 Deposit 按钮后，不应该直接打开入金弹窗，而是先判断当前钱包是否已连接。

如果未连接钱包，则打开 AppKit，引导用户连接钱包；如果已经连接钱包，再打开 `DepositDialog`。

这个设计的好处是：
用户不会在没有钱包地址的情况下进入无效表单，后续余额读取、approve、签名等动作也都有了前置条件。

前端可以把这部分逻辑封装到 `useDeposit` 中，例如：

```ts
const handleDeposit = () => {
  if (!isConnected) {
    openAppKit();
    return;
  }

  openDepositDialog();
};
```

`useDeposit` 的职责不是处理所有业务细节，而是作为 Deposit 的入口控制器，负责决定用户下一步应该进入哪个状态。

## 四、表单层：金额输入与 Zod 校验

进入 `DepositDialog` 后，用户输入 USDC 金额。这里的校验不能只依赖后端，因为出入金是高敏感操作，前端必须尽早拦截明显错误。

常见校验包括：

```text
金额不能为空
金额必须大于最小入金金额 min
金额不能超过最大入金金额 max
金额不能超过用户 USDC balance
```

这部分可以使用 Zod 定义 schema，将业务规则集中管理。

```ts
const depositSchema = z.object({
  amount: z
    .number()
    .min(minDepositAmount, "Amount is below the minimum deposit limit")
    .max(maxDepositAmount, "Amount exceeds the maximum deposit limit")
    .refine((value) => value <= usdcBalance, {
      message: "Insufficient USDC balance",
    }),
});
```

前端这里要注意一点：金额展示和链上精度不是一回事。用户输入的是普通数字，例如 `100` USDC，但链上交互通常需要转换成最小单位，例如 `parseUnits(amount, 6)`。因此，表单层负责展示和校验，链上调用前再统一做精度转换。

## 五、授权层：调用 USDC approve

Deposit 和 Withdraw 最大的区别之一是，Deposit 通常需要先执行 USDC `approve`。

用户输入金额并通过校验后，前端调用 `useWriteUsdcApprove` 发起授权交易。这个阶段的目标是让 USDC 合约允许指定合约使用用户的 USDC。

```ts
const { writeContractAsync: approveUsdc } = useWriteUsdcApprove();

const approveHash = await approveUsdc({
  amount: parseUnits(amount, USDC_DECIMALS),
});
```

这里有几个前端要处理好的点。

第一，按钮状态要明确。授权过程中按钮应该进入 loading 状态，避免用户重复点击。

第二，错误要能被捕获。用户可能在钱包中拒绝交易，也可能因为 Gas、网络、RPC 等原因失败。前端不能只显示一个模糊的 error，而要尽量区分“用户取消”和“交易失败”。

第三，approve 返回 tx hash 后，不代表整个入金已经完成。它只代表授权交易已经发出，后面还需要进行业务操作签名和后端提交。

## 六、业务数据层：encodeDepositData 与 Operation 构造

approve 成功后，前端开始构造业务操作数据。

这一步的核心是把 Deposit 行为编码成后端和合约都能识别的数据结构。通常包括：

```text
操作类型：Deposit
用户地址
资产类型：USDC
金额
链 ID
approve tx hash
时间戳或 nonce
```

前端通过 `encodeDepositData` 生成业务数据，再构造统一的 `Operation`。

```ts
const depositData = encodeDepositData({
  amount: parseUnits(amount, USDC_DECIMALS),
  token: USDC_ADDRESS,
  approveHash,
});

const operation = {
  action: "DEPOSIT",
  data: depositData,
  account: address,
  chainId,
};
```

这里建议前端把 `Operation` 设计成统一结构。这样 Deposit、Withdraw、Order、Transfer 等不同业务都可以复用同一套签名和提交流程。

## 七、跨弹窗状态管理：写入 depositInfoAtom

Deposit 不是一个单弹窗流程。用户先在 `DepositDialog` 输入金额，再进入 `DepositSignDialog` 进行签名确认。两个弹窗之间需要共享刚刚构造好的入金信息。

这类中间状态可以放到 Jotai atom 中，例如 `depositInfoAtom`。

```ts
setDepositInfo({
  amount,
  approveHash,
  operation,
});

openDepositSignDialog();
```

这样做的好处是，表单弹窗和签名弹窗解耦。
`DepositDialog` 只负责输入、校验和授权；`DepositSignDialog` 只负责展示待签名信息、调用钱包签名并提交后端。

这比把所有逻辑堆在一个组件里更清晰，也更方便排查问题。

## 八、签名层：useSignTypedData 完成钱包签名

进入 `DepositSignDialog` 后，前端会展示本次入金的关键信息，例如金额、资产、钱包地址等，然后调用 `useSignTypedData` 让用户在钱包中签名。

这里通常使用 EIP-712 typed data 签名。它的好处是用户在钱包里看到的不是一串不可读的 hash，而是结构化的业务信息。

```ts
const signature = await signTypedDataAsync({
  domain,
  types,
  primaryType: "Operation",
  message: operation,
});
```

签名本身不是链上交易，不会直接消耗 Gas。它的作用是证明：这次 Deposit 操作确实由当前钱包地址确认。

前端需要注意，签名弹窗也可能被用户拒绝。因此签名阶段同样需要处理 rejected、failed、loading 等状态。

## 九、提交层：encodeOperation 与 useApplyDeposit

拿到用户签名后，前端会将 operation 和 signature 组合起来，生成最终提交给后端的数据。

```ts
const encodedOperation = encodeOperation({
  operation,
  signature,
});

await applyDeposit({
  operation: encodedOperation,
});
```

这里的 `useApplyDeposit` 本质上是一个业务 mutation。它负责把前端签名后的 Deposit 请求提交到后端。

后端可能返回：

```text
tx_hash
业务状态
错误信息
```

前端拿到返回结果后，再根据状态弹出 `DepositSuccess` 或 `DepositFailed`。

这里要注意，后端返回 tx_hash 不一定等于业务完全完成。不同系统可能存在 pending、processing、success、failed 等状态。前端应该根据后端实际返回的业务状态进行展示，而不是简单地认为有 tx_hash 就一定成功。

## 十、成功与失败反馈：让用户知道发生了什么

出入金模块的用户体验很大程度上取决于结果反馈。

Deposit 成功时，可以展示：

```text
入金金额
资产类型
tx hash
当前状态
查看交易链接
```

Deposit 失败时，需要尽量告诉用户失败原因：

```text
钱包拒绝签名
approve 失败
余额不足
后端提交失败
网络异常
业务状态失败
```

这类反馈不只是 UI 细节，而是降低用户焦虑的关键。

## 十一、资产刷新：invalidate ['user', 'account']

当 Deposit 成功或失败状态确定后，前端需要刷新用户资产数据。

```ts
queryClient.invalidateQueries({
  queryKey: ["user", "account"],
});
```

这一步非常重要。因为出入金完成后，用户最关心的是账户余额有没有变化。如果页面还显示旧数据，用户会误以为操作没有生效。

通常可以在 Deposit 成功后刷新账户信息，也可以在失败后刷新一次，避免因为部分状态变化导致页面数据滞后。

## 十二、Withdraw 提现链路设计

Withdraw 的链路相对 Deposit 少了 approve 阶段，但仍然需要签名和后端提交。

完整流程如下：

```text
用户点击 Withdraw
→ WithdrawDialog
→ 输入金额
→ 校验 availableBalance / min / max
→ encodeWithdrawData
→ 构造 Operation
→ 写入 withdrawalInfoAtom
→ 打开 WithdrawSignDialog
→ 钱包 useSignTypedData 签名
→ encodeOperation
→ useApplyWithdraw 提交后端
→ 弹 WithdrawSuccess / WithdrawFailed
→ invalidate ['user', 'account']
```

Withdraw 的重点在于校验可提现余额，而不是链上 USDC balance。

Deposit 校验的是用户钱包里的 USDC 余额；Withdraw 校验的是用户平台账户里的 `availableBalance`。这两个余额来源不同，不能混用。

## 十三、Withdraw 表单校验

提现时，常见校验包括：

```text
金额不能为空
金额不能小于最小提现金额 min
金额不能大于最大提现金额 max
金额不能超过 availableBalance
```

示例：

```ts
const withdrawSchema = z.object({
  amount: z
    .number()
    .min(minWithdrawAmount, "Amount is below the minimum withdrawal limit")
    .max(maxWithdrawAmount, "Amount exceeds the maximum withdrawal limit")
    .refine((value) => value <= availableBalance, {
      message: "Insufficient available balance",
    }),
});
```

这里要强调 `availableBalance`。
如果用户账户中有一部分资产被订单占用、冻结或正在结算中，这部分资金不能被提现。前端展示时最好区分：

```text
Total Balance
Available Balance
Frozen Balance
```

否则用户会疑惑为什么明明账户里有钱，却不能提现全部金额。

## 十四、Withdraw 的 Operation 构造

Withdraw 不需要 approve，但需要编码提现数据。

```ts
const withdrawData = encodeWithdrawData({
  amount: parseUnits(amount, USDC_DECIMALS),
  token: USDC_ADDRESS,
  receiver: address,
});

const operation = {
  action: "WITHDRAW",
  data: withdrawData,
  account: address,
  chainId,
};
```

随后写入 `withdrawalInfoAtom`，打开 `WithdrawSignDialog`。

```ts
setWithdrawalInfo({
  amount,
  operation,
});

openWithdrawSignDialog();
```

从架构上看，Withdraw 和 Deposit 的后半段非常相似：都是构造 Operation、签名、编码、提交后端、展示结果、刷新账户。

因此前端可以抽象出通用逻辑，例如：

```text
useOperationSign
useEncodeOperation
useApplyOperation
OperationSignDialog
```

但在业务层仍然保留 Deposit 和 Withdraw 各自的校验与数据编码逻辑。

## 十五、为什么要把 Deposit 和 Withdraw 拆成多个 Dialog

很多前端初学者会倾向于把所有逻辑写进一个弹窗里：输入金额、授权、签名、提交、结果展示全部放在一个组件中。

这样短期能跑，但后期很难维护。

更合理的拆法是：

```text
DepositDialog：负责输入金额、校验、approve
DepositSignDialog：负责展示签名信息、钱包签名、提交后端
DepositSuccess：负责成功结果展示
DepositFailed：负责失败结果展示

WithdrawDialog：负责输入金额、校验
WithdrawSignDialog：负责展示签名信息、钱包签名、提交后端
WithdrawSuccess：负责成功结果展示
WithdrawFailed：负责失败结果展示
```

这样每个组件的职责都很明确。
出问题时，也能快速定位是表单校验问题、approve 问题、签名问题，还是后端提交问题。

## 十六、Hook 层如何组织

一个比较清晰的前端结构可以是：

```text
hooks/
  useDeposit.ts
  useWithdraw.ts
  useWriteUsdcApprove.ts
  useApplyDeposit.ts
  useApplyWithdraw.ts

atoms/
  depositInfoAtom.ts
  withdrawalInfoAtom.ts

utils/
  encodeDepositData.ts
  encodeWithdrawData.ts
  encodeOperation.ts

components/
  DepositDialog.tsx
  DepositSignDialog.tsx
  DepositSuccess.tsx
  DepositFailed.tsx
  WithdrawDialog.tsx
  WithdrawSignDialog.tsx
  WithdrawSuccess.tsx
  WithdrawFailed.tsx
```

其中：

```text
useDeposit：控制 Deposit 入口流程
useWithdraw：控制 Withdraw 入口流程
useWriteUsdcApprove：封装 USDC approve
useApplyDeposit：封装入金后端提交
useApplyWithdraw：封装提现后端提交
depositInfoAtom：保存入金过程中的中间状态
withdrawalInfoAtom：保存提现过程中的中间状态
encodeDepositData：编码入金业务数据
encodeWithdrawData：编码提现业务数据
encodeOperation：编码签名后的完整操作
```

这种结构的好处是业务链路清楚，组件不会过重，链上逻辑、表单逻辑和接口逻辑也不会混在一起。

## 十七、前端异常处理要覆盖完整链路

出入金模块最容易出问题的地方，往往不是主流程，而是异常流程。

Deposit 至少要处理：

```text
钱包未连接
USDC 余额不足
输入金额不合法
approve 被用户拒绝
approve 链上失败
签名被用户拒绝
后端提交失败
后端返回业务失败
账户刷新失败
```

Withdraw 至少要处理：

```text
availableBalance 不足
输入金额不合法
签名被用户拒绝
后端提交失败
提现业务失败
账户刷新失败
```

前端不能只写 happy path。
尤其是 Web3 钱包交互中，用户取消、网络错误、链 ID 不匹配、RPC 超时都是非常常见的情况。

## 十八、前端落地的关键总结

出入金模块的前端落地，本质上是在做一套状态机。

Deposit 的关键是：

```text
连接钱包
输入金额
校验 USDC balance
链上 approve
构造 Operation
签名
提交后端
展示结果
刷新账户
```

Withdraw 的关键是：

```text
输入金额
校验 availableBalance
构造 Operation
签名
提交后端
展示结果
刷新账户
```

两者最大的区别是：Deposit 多了 USDC approve，Withdraw 更关注平台账户可提现余额。

从工程实现上，建议把出入金模块拆成四层：

```text
组件层：Dialog / Success / Failed
状态层：depositInfoAtom / withdrawalInfoAtom
业务 Hook 层：useDeposit / useWithdraw / useApplyDeposit / useApplyWithdraw
工具层：encodeDepositData / encodeWithdrawData / encodeOperation
```

这样既能保证业务流程清晰，也方便后续扩展更多资产、更多链或更多出入金方式。

一个成熟的出入金模块，不只是“能提交成功”，而是要让用户在每一步都知道自己正在做什么、为什么需要签名、失败在哪里、成功后资产何时刷新。前端真正要做的，就是把复杂的链上链下流程，包装成用户可以理解、可以信任、可以顺利完成的产品体验。
