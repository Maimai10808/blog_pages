# Web3 前端交易系统如何落地：从下单 UI 到 Operation 编码、签名与实时状态更新

很多人刚开始做 Web3 前端时，会把交易系统理解得很简单：

用户点击按钮，钱包弹窗，确认签名，调用合约，等待交易上链。

如果只是做一个 Mint 页面、简单转账页面，或者单次 Swap 交互，这种理解没有太大问题。但如果我们做的是一个更接近真实交易平台的产品，比如期权交易、订单簿交易、撮合交易或高频挂单系统，那么前端要处理的事情就远不止“调一个合约方法”这么简单。

在这类场景中，交易系统往往包含用户输入、表单校验、交易参数计算、业务数据编码、结构化签名、订单提交、撮合处理、订单状态回推、持仓更新等一整套链路。前端并不是单纯的合约调用入口，而是交易流程的组织者和状态协调者。

这篇文章想结合一个 Web3 期权交易前端项目，聊一聊：一个相对完整的 Web3 前端交易系统，应该如何从 UI 层一路落地到 Operation 编码、签名提交和实时状态更新。

---

## 一、为什么 Web3 交易系统不只是调用合约

在很多入门项目中，交易链路通常是这样的：

```text
用户点击按钮
→ 钱包弹窗
→ 用户确认
→ 调用合约
→ 等待链上交易确认
```

这个模型很直观，也很适合教学。但在真实交易产品中，尤其是期权、永续、订单簿、撮合交易这类场景，问题会复杂很多。

一次下单不仅仅包含“买”或“卖”，它还可能涉及：

- 标的资产；
- 期权到期时间；
- 行权价格；
- 买卖方向；
- 限价价格；
- 数量；
- 手续费；
- 保证金；
- 订单类型；
- 有效期策略；
- 撮合状态；
- 部分成交；
- 持仓变化；
- 账户风险变化。

如果每一次用户下单都直接发起链上交易，不仅交互成本高，确认速度慢，也很难支持更复杂的订单状态流转。

因此，真实交易系统里更常见的方式是：

```text
前端构造业务交易指令
→ 编码为统一 Operation
→ 对 Operation 进行结构化签名
→ 提交给后端或撮合系统
→ 服务端处理订单
→ 实时事件回推订单、持仓和账户变化
```

这时，前端的职责就发生了变化。

它不是简单地把按钮和合约方法绑定起来，而是要完成一整套交易意图的表达、校验、编码、签名和状态同步。

在代码层面，最直观的区别是：简单交易可能只是一个合约写入 Hook，而复杂交易系统通常会有更完整的交易服务层。

```ts
// 简单交互：按钮直接触发合约写入
await writeContract({
  address: tokenAddress,
  abi: tokenAbi,
  functionName: "mint",
  args: [amount],
});
```

但真实交易系统里，前端通常不会直接把表单字段塞进合约方法，而是先构造业务对象，再编码、签名、提交。

```ts
const draft = createOrderDraft(formValues);

const tradeData = encodeTradeData({
  asset: draft.asset,
  subId: draft.optionId,
  limitPrice: draft.limitPrice,
  desiredAmount: draft.amount,
  recipientId: draft.accountId,
  isBid: draft.side === "buy",
});

const operation = buildOperation({
  account: draft.accountId,
  owner: userAddress,
  signer: smartAccountAddress,
  module: tradeModuleAddress,
  data: tradeData,
});

const signature = await requestTradeSignature(operation);

await placeOrder({
  operation,
  signature,
});
```

这段代码不一定对应某个具体项目源码，但它能体现真实交易前端的核心思想：**用户点击按钮只是交易链路的开始，而不是全部。**

---

## 二、一个完整的交易链路长什么样

在这个项目中，一次标准的下单流程大致可以拆成下面这条主链路：

```text
用户表单输入
→ 前端交易状态
→ 编码交易数据
→ 构造 Operation
→ 生成 EIP-712 Typed Data
→ 获取交易签名
→ 提交订单请求
→ 服务端 / 撮合系统处理
→ SSE 回推订单和持仓变化
→ Jotai 即时更新
→ React Query 刷新服务端数据
```

这条链路的核心在于：交易不是从 UI 直接跳到合约，而是经过了多个层次的转换。

可以把它理解成三层数据：

```text
第一层：用户表单数据
例如价格、数量、买卖方向、订单类型。

第二层：业务交易数据
例如资产地址、期权 ID、限价价格、订单数量、接收账户、是否买单。

第三层：协议 Operation
例如账户 ID、owner、signer、module、nonce、deadline、data。
```

这三层数据看起来都和“下单”有关，但职责完全不同。

表单数据面向用户交互，业务交易数据面向交易模块，Operation 则面向协议和签名验证。把它们分开，是整个交易系统可维护的前提。

可以先用几个基础类型把这三层关系表达出来：

```ts
type OrderSide = "buy" | "sell";
type OrderType = "limit" | "market";

interface OrderFormValues {
  side: OrderSide;
  orderType: OrderType;
  price: string;
  amount: string;
  optionId: string;
}

interface TradeDataInput {
  asset: `0x${string}`;
  subId: bigint;
  limitPrice: bigint;
  desiredAmount: bigint;
  recipientId: bigint;
  isBid: boolean;
}

interface Operation {
  account: bigint;
  owner: `0x${string}`;
  signer: `0x${string}`;
  module: `0x${string}`;
  nonce: bigint;
  deadline: bigint;
  data: `0x${string}`;
}
```

这几个类型的价值不只是“类型提示”，更重要的是把交易链路拆清楚。

`OrderFormValues` 是 UI 表单层的数据，`TradeDataInput` 是业务交易层的数据，`Operation` 是协议授权层的数据。当前端项目越来越复杂时，这种边界会直接影响代码是否容易维护。

---

## 三、从下单 UI 开始：用户输入并不等于立即提交

交易系统的第一步，通常发生在下单表单中。

用户会输入价格、数量，选择买入或卖出，也可能选择订单类型、有效期策略等。前端需要在这里完成大量即时计算，比如：

- 当前价格是否合法；
- 数量是否超过最大可交易数量；
- 保证金是否足够；
- 手续费大概是多少；
- 下单成本是否可接受；
- 当前期权是否已经过期；
- 用户账户是否具备交易条件。

这一层看似只是表单，其实已经承担了一部分交易风控和用户体验优化。

但需要注意的是，用户点击提交表单，并不一定意味着订单立刻发送到后端。

更合理的做法是：先生成一个订单草稿，进入二次确认弹窗，让用户确认交易方向、价格、数量、手续费和成本之后，再进入真正的签名与提交阶段。

也就是说，下单可以拆成两个阶段：

```text
填写订单
→ 确认订单
→ 签名并提交
```

这样做的好处是，交易系统不会过早触发签名或提交，也能给用户一个明确的最终确认机会。

在 React 组件中，这个过程可以写成下面这种形式：

```tsx
function OrderForm() {
  const [confirmingOrder, setConfirmingOrder] = useState<OrderDraft | null>(
    null,
  );

  const onSubmit = (values: OrderFormValues) => {
    const draft = createOrderDraft(values);

    if (!draft.isValid) {
      return;
    }

    setConfirmingOrder(draft);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <PriceInput name="price" />
        <AmountInput name="amount" />
        <SideTabs name="side" />

        <button type="submit">确认下单</button>
      </form>

      {confirmingOrder && (
        <OrderConfirmDialog
          order={confirmingOrder}
          onCancel={() => setConfirmingOrder(null)}
          onConfirm={() => submitOrder(confirmingOrder)}
        />
      )}
    </>
  );
}
```

这里有一个关键点：`onSubmit` 并没有直接请求后端，也没有直接签名，而是先生成 `OrderDraft`。这能让交易流程更可控。

比如订单草稿可以包含用户最终需要确认的信息：

```ts
interface OrderDraft {
  side: OrderSide;
  optionId: string;
  price: string;
  amount: string;
  estimatedFee: string;
  estimatedCost: string;
  isValid: boolean;
}
```

这样一来，确认弹窗里展示的就不是零散表单字段，而是一份已经经过计算和校验的订单草稿。

---

## 四、交易数据编码：把用户意图变成协议能理解的数据

当用户确认下单后，前端要做的第一件事不是直接提交请求，而是把用户输入转成交易模块能理解的数据。

比如用户在 UI 中看到的是：

```text
买入 1 张某个期权
限价 100 USDC
```

但协议或服务端需要的可能是：

```text
asset: 期权资产合约地址
subId: 具体期权标识
limitPrice: 18 位精度价格
desiredAmount: 18 位精度数量
recipientId: 协议内部账户 ID
isBid: 是否为买单
```

这一步本质上是一个转换过程：

```text
前端表单对象
→ 业务交易对象
→ ABI 编码后的交易数据
```

这里通常会有一个类似 `encodeTradeData` 的函数，专门负责把交易业务字段编码成底层可以识别的 Hex 数据。

它的价值在于隔离 UI 和协议。

UI 不需要知道底层如何解码，协议也不应该直接依赖前端表单字段。中间通过一层稳定的交易数据编码，可以让系统更清晰：

```text
UI 负责表达用户意图
编码函数负责转换协议数据
交易模块负责执行或校验
```

这也是 Web3 前端工程里很重要的一点：不要把表单字段直接当成协议参数使用。

示意代码如下：

```ts
import { encodeAbiParameters, parseUnits } from "viem";

function toTradeDataInput(draft: OrderDraft): TradeDataInput {
  return {
    asset: draft.assetAddress,
    subId: BigInt(draft.optionId),
    limitPrice: parseUnits(draft.price, 18),
    desiredAmount: parseUnits(draft.amount, 18),
    recipientId: BigInt(draft.accountId),
    isBid: draft.side === "buy",
  };
}

function encodeTradeData(input: TradeDataInput): `0x${string}` {
  return encodeAbiParameters(
    [
      { name: "asset", type: "address" },
      { name: "subId", type: "uint256" },
      { name: "limitPrice", type: "uint256" },
      { name: "desiredAmount", type: "uint256" },
      { name: "recipientId", type: "uint256" },
      { name: "isBid", type: "bool" },
    ],
    [
      input.asset,
      input.subId,
      input.limitPrice,
      input.desiredAmount,
      input.recipientId,
      input.isBid,
    ],
  );
}
```

这里尤其要注意精度转换。

用户输入的 `100`、`1.5` 是十进制字符串，但底层协议通常使用整数表示。前端必须在编码前完成精度转换，而不是把字符串直接传给协议层。

```ts
const limitPrice = parseUnits("100", 18);
const desiredAmount = parseUnits("1", 18);
```

这类转换最好封装在交易服务层里，而不是散落在组件里。否则后续一旦出现价格精度、资产精度、数量精度不一致的问题，会很难排查。

---

## 五、为什么需要 Operation 抽象

完成交易数据编码后，系统还会继续构造一个更外层的对象，也就是 Operation。

Operation 可以理解为一份完整的业务操作指令。它不只是交易参数，而是告诉系统：

- 哪个账户要执行这次操作；
- 这个操作属于哪个用户；
- 谁是 owner；
- 谁是 signer；
- 由哪个模块处理；
- 这次操作什么时候过期；
- 如何防止重放攻击；
- 真正的业务数据是什么。

一个简化后的 Operation 可以理解为：

```ts
{
  account: userAccountId,
  owner: userAddress,
  signer: smartAccount,
  module: tradeModuleAddress,
  nonce: randomNonce,
  deadline: expiredAt,
  data: encodedTradeData
}
```

这里最关键的是：Operation 把“业务操作”抽象成了统一格式。

也就是说，交易只是 Operation 的一种。未来如果系统还要支持充值、提现、转账、授权、撤单等操作，也可以复用同一套外层结构，只需要替换不同的 `module` 和 `data`。

这就是 Operation 抽象的意义。

它让系统从“一个接口对应一种业务”变成了：

```text
统一 Operation 外壳
+ 不同业务模块
+ 不同 data 编码
```

这种设计对复杂交易系统非常有价值，因为它可以降低协议扩展和前端接入的成本。

在代码中，可以把 Operation 构造逻辑单独封装出来：

```ts
function createNonce() {
  return (
    BigInt(Date.now()) * 1000000n + BigInt(Math.floor(Math.random() * 1000000))
  );
}

function getDeadline(minutes = 5) {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
}

function buildOperation(params: {
  account: bigint;
  owner: `0x${string}`;
  signer: `0x${string}`;
  module: `0x${string}`;
  data: `0x${string}`;
}): Operation {
  return {
    account: params.account,
    owner: params.owner,
    signer: params.signer,
    module: params.module,
    nonce: createNonce(),
    deadline: getDeadline(5),
    data: params.data,
  };
}
```

这样一来，下单、撤单、提现等操作都可以复用 `buildOperation`，差异只体现在 `module` 和 `data` 上。

例如撤单可以是另一种 data：

```ts
function encodeCancelOrderData(orderId: bigint): `0x${string}` {
  return encodeAbiParameters([{ name: "orderId", type: "uint256" }], [orderId]);
}
```

最终仍然可以放进同一个 Operation 结构里：

```ts
const cancelOperation = buildOperation({
  account: userAccountId,
  owner: userAddress,
  signer: smartAccountAddress,
  module: cancelOrderModuleAddress,
  data: encodeCancelOrderData(orderId),
});
```

这就是 Operation 抽象带来的工程价值：业务可以变化，但外层授权模型保持稳定。

---

## 六、结构化签名：为什么使用 EIP-712

构造好 Operation 后，下一步就是签名。

很多人对签名的第一反应是“钱包弹窗签名”。但在复杂交易系统里，签名并不一定每次都由用户钱包本地完成。

无论签名发生在哪里，关键是签名内容必须是清晰、结构化、可验证的。

这也是 EIP-712 的价值所在。

相比直接签一段字符串或一串 Hex，EIP-712 Typed Data 可以明确告诉签名方和验证方：

```text
签名属于哪个应用；
签名发生在哪条链；
签名绑定哪个 verifying contract；
签名的主类型是什么；
每个字段的名称和类型是什么；
message 中具体签了哪些内容。
```

对于一个 Operation 来说，它可能包含：

```text
account
nonce
module
data
deadline
owner
signer
```

这些字段共同构成了一份可验证的交易授权。

使用 EIP-712 的好处包括：

- 签名字段结构明确；
- 可以绑定 chainId，避免跨链重放；
- 可以绑定 verifyingContract，避免签名被其他合约复用；
- nonce 可以防止重复提交；
- deadline 可以限制签名有效期；
- 服务端或合约可以复现签名哈希并验证内容是否被篡改。

简单来说，EIP-712 让签名从“看不懂的一串字符”，变成“有结构、有边界、有验证语义的授权数据”。

在前端中，可以把 Typed Data 的生成单独封装：

```ts
function createOperationTypedData(params: {
  chainId: number;
  verifyingContract: `0x${string}`;
  operation: Operation;
}) {
  return {
    domain: {
      name: "OptionTradingProtocol",
      version: "1",
      chainId: params.chainId,
      verifyingContract: params.verifyingContract,
    },
    types: {
      Operation: [
        { name: "account", type: "uint256" },
        { name: "owner", type: "address" },
        { name: "signer", type: "address" },
        { name: "module", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "data", type: "bytes" },
      ],
    },
    primaryType: "Operation" as const,
    message: params.operation,
  };
}
```

如果是钱包本地签名，前端可以使用类似下面的方式：

```ts
const typedData = createOperationTypedData({
  chainId,
  verifyingContract,
  operation,
});

const signature = await signTypedDataAsync(typedData);
```

这里的重点不是具体使用哪个库，而是签名内容必须严格来自 Operation，不能在签名前后被随意修改。

---

## 七、为什么交易签名不一定是钱包本地签

在这个项目中，交易签名并不是普通的钱包本地签名。

更准确地说，用户登录和交易授权是两条不同的链路。

登录签名通常用来证明：

```text
这个用户确实控制某个钱包地址。
```

而交易签名要证明的是：

```text
这条具体的交易 Operation 被系统认可的 signer 授权。
```

二者解决的问题不同。

登录签名更像身份认证，常见做法是 SIWE：

```text
后端生成 nonce
→ 前端构造登录消息
→ 用户钱包签名
→ 后端验签
→ 建立登录态
```

交易签名则更像业务授权：

```text
前端构造 Operation
→ 生成 EIP-712 Typed Data
→ 获取交易签名
→ 提交订单系统
```

对于高频交易或订单簿交易，如果每下一单都让钱包弹一次签名，用户体验会非常差。尤其是在挂单、撤单、调整价格这类操作中，频繁钱包确认会严重打断交易流程。

因此，一些交易系统会采用 session key、smart account、服务端 signer 或授权 signer 的设计，让用户在完成身份认证或授权后，后续交易由特定 signer 完成签名。

这样做可以大幅降低交互摩擦，但同时也带来了更高的安全要求：系统必须严格验证 signer 的权限边界，确保它只能签署被授权范围内的操作。

如果交易签名由服务端或授权 signer 完成，前端代码可能不是直接调用钱包签名，而是请求一个签名接口：

```ts
async function requestTradeSignature(operation: Operation) {
  const response = await fetch("/api/trade/signature", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ operation }),
  });

  if (!response.ok) {
    throw new Error("Failed to request trade signature");
  }

  return response.json() as Promise<{
    signature: `0x${string}`;
    signer: `0x${string}`;
  }>;
}
```

这个函数的命名也很重要。

如果它实际请求的是服务端签名，就不应该叫 `walletSign` 或 `signByUser`。类似 `requestTradeSignature` 这样的名字会更准确，因为它告诉维护者：这里是在请求交易授权签名，而不是一定由用户钱包本地签名。

---

## 八、smartAccount 在交易签名中的角色

在 Operation 中，通常会同时出现 `owner` 和 `signer`。

这两个字段很容易混淆，但它们的含义不同。

```text
owner：交易归属的用户地址
signer：负责为这次 Operation 提供有效签名的地址
```

也就是说，owner 表示“这是谁的交易”，signer 表示“谁来授权这笔交易”。

在 smart account 或 session key 体系下，signer 可能不是用户的钱包地址，而是某个被授权的智能账户、会话密钥或服务端签名地址。

这样的设计可以支持更顺滑的交易体验：

```text
用户完成登录或授权
→ 系统建立交易 signer 权限
→ 后续交易由 signer 对 Operation 签名
→ 撮合系统或协议验证 owner 与 signer 的授权关系
```

这类设计的关键不在于“让服务端替用户签名”本身，而在于权限边界是否清晰。

一个更稳妥的系统需要保证：

- signer 的地址和配置一致；
- signer 确实被 owner 授权；
- 签名只对特定 Operation 有效；
- Operation 中包含 nonce 和 deadline；
- 服务端不能随意修改用户交易意图；
- 撮合或协议侧能够验证签名合法性。

所以，smartAccount 或 session signer 的本质，是在安全边界内改善高频交易体验。

前端在构造 Operation 时，也应该显式地区分 owner 和 signer：

```ts
const operation = buildOperation({
  account: userAccountId,
  owner: userAddress,
  signer: smartAccountAddress,
  module: tradeModuleAddress,
  data: encodedTradeData,
});
```

不要为了方便，把 `owner` 和 `signer` 默认写成同一个地址。因为在真实系统中，它们很可能不是同一个主体。

在提交前，也可以做一层基本检查：

```ts
function validateOperationBeforeSubmit(operation: Operation) {
  if (!operation.owner) {
    throw new Error("Missing operation owner");
  }

  if (!operation.signer) {
    throw new Error("Missing operation signer");
  }

  if (operation.deadline <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error("Operation has expired");
  }

  if (operation.data === "0x") {
    throw new Error("Missing operation data");
  }
}
```

这类校验不能替代服务端或合约校验，但可以减少明显错误，提升前端可维护性。

---

## 九、提交订单：请求成功不等于交易完成

拿到 Operation 和 signature 后，前端会把订单提交给后端或撮合服务。

很多前端容易在这里产生误解：接口返回成功，就认为交易已经完成。

但在交易系统中，这两个概念必须分开。

一次 `placeOrder` 请求成功，通常只能说明：

```text
订单请求已经被服务端接收。
```

它不代表订单已经成交，也不代表持仓已经变化。

订单后续可能进入很多状态：

```text
Open
PartiallyFilled
Filled
Cancelled
Rejected
Expired
```

尤其是限价单和订单簿交易，订单提交成功后可能只是挂在订单簿里，等待后续撮合。它可能立刻成交，也可能部分成交，也可能一直未成交，甚至被取消或过期。

因此，交易前端不能只依赖 mutation 的返回值来判断最终状态。

更合理的方式是：

```text
mutation 负责提交请求
实时事件负责接收真实状态
Query 负责刷新最终数据
```

这也是为什么交易系统里经常需要 SSE、WebSocket 或其他实时推送机制。

提交订单的 API 可以单独封装：

```ts
interface PlaceOrderRequest {
  operation: Operation;
  signature: `0x${string}`;
}

interface PlaceOrderResponse {
  orderId: string;
  status: "received" | "rejected";
  reason?: string;
}

async function placeOrder(
  payload: PlaceOrderRequest,
): Promise<PlaceOrderResponse> {
  const response = await fetch("/api/orders/place", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to place order");
  }

  return response.json();
}
```

在 React Query 中，`mutation` 更适合表达“提交请求”这件事，而不是表达“订单最终完成”。

```ts
function usePlaceOrder() {
  return useMutation({
    mutationFn: placeOrder,
    onSuccess: (result) => {
      // 这里最多只能说明请求已被接收
      // 不应该直接把订单标记为 Filled
      console.log("Order request accepted:", result.orderId);
    },
  });
}
```

页面上也应该避免把接口成功文案写成“订单已成交”。更准确的提示应该是：

```text
订单请求已提交，等待撮合结果。
```

这能减少用户对交易状态的误解。

---

## 十、SSE：让订单和持仓跟随真实状态变化

在这个项目中，订单和持仓状态主要依赖 SSE 回推。

SSE 可以理解为服务端向前端持续推送事件的一种机制。用户登录后，前端建立一条用户级实时连接，服务端可以通过这条连接推送：

- 账户余额变化；
- 保证金变化；
- 订单状态变化；
- 持仓变化；
- 用户相关资产变化。

当前端收到订单更新事件时，可以做两件事：

第一，更新本地状态，让 UI 立刻响应。

第二，让 React Query 对相关接口缓存失效，重新拉取服务端数据，保证最终一致性。

也就是说，系统里存在两层状态：

```text
Jotai / 本地 Map：负责即时更新
React Query：负责服务端缓存和最终一致性
```

这是一种很常见也很实用的组合。

Jotai 适合保存订单 Map、持仓 Map 这类需要快速按 ID 更新的数据；React Query 适合管理分页列表、历史订单、持仓接口等服务端数据。

二者配合起来，可以避免两个问题：

- 只靠 Query，实时性不够；
- 只靠本地状态，容易和服务端不一致。

所以在交易系统里，状态更新不应该只发生在“提交按钮成功回调”里，而应该由服务端真实事件驱动。

可以先定义订单状态和事件类型：

```ts
type OrderStatus =
  | "Open"
  | "PartiallyFilled"
  | "Filled"
  | "Cancelled"
  | "Rejected"
  | "Expired";

interface OrderUpdateEvent {
  type: "order.updated";
  payload: {
    orderId: string;
    status: OrderStatus;
    filledAmount: string;
    remainingAmount: string;
    updatedAt: number;
  };
}

interface PositionUpdateEvent {
  type: "position.updated";
  payload: {
    positionId: string;
    optionId: string;
    size: string;
    averagePrice: string;
    updatedAt: number;
  };
}

type TradingEvent = OrderUpdateEvent | PositionUpdateEvent;
```

Jotai 可以负责保存本地实时状态：

```ts
import { atom } from "jotai";

export const orderMapAtom = atom<Record<string, OrderUpdateEvent["payload"]>>(
  {},
);
export const positionMapAtom = atom<
  Record<string, PositionUpdateEvent["payload"]>
>({});
```

然后用一个 Hook 建立 SSE 连接：

```ts
function useTradingEvents(userId: string) {
  const queryClient = useQueryClient();
  const setOrderMap = useSetAtom(orderMapAtom);
  const setPositionMap = useSetAtom(positionMapAtom);

  useEffect(() => {
    if (!userId) return;

    const eventSource = new EventSource(`/api/events/trading?userId=${userId}`);

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data) as TradingEvent;

      if (message.type === "order.updated") {
        setOrderMap((prev) => ({
          ...prev,
          [message.payload.orderId]: message.payload,
        }));

        queryClient.invalidateQueries({ queryKey: ["orders"] });
      }

      if (message.type === "position.updated") {
        setPositionMap((prev) => ({
          ...prev,
          [message.payload.positionId]: message.payload,
        }));

        queryClient.invalidateQueries({ queryKey: ["positions"] });
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [userId, queryClient, setOrderMap, setPositionMap]);
}
```

这个 Hook 体现了两个动作：

```text
收到实时事件
→ 先更新 Jotai 本地状态
→ 再让 React Query 重新拉取服务端数据
```

这样 UI 能第一时间变化，同时又不会完全依赖本地状态。

---

## 十一、登录签名和交易签名一定要分清楚

Web3 项目里经常会出现多个签名场景。最容易混淆的，就是登录签名和交易签名。

登录签名解决的是身份问题：

```text
我是否控制这个钱包？
```

交易签名解决的是授权问题：

```text
这条具体的交易指令是否被授权？
```

它们的链路不同，安全语义也不同。

登录签名通常发生在用户进入系统时，用于建立 session。它不应该被当成后续所有交易的授权凭证。

交易签名则必须绑定具体的交易内容，比如 Operation 中的 account、module、data、nonce、deadline 等字段。

可以这样理解：

```text
登录签名：证明我是谁
交易签名：证明我同意这条交易指令
```

如果一个系统把这两类签名混在一起，就很容易出现安全边界不清晰的问题。

一个更清晰的设计应该是：

- 登录签名只用于身份认证；
- 交易签名只用于业务授权；
- 每次交易签名都绑定具体 Operation；
- Operation 中包含防重放和有效期字段；
- 后端或协议侧负责校验 signer 权限。

代码上也可以明显分开：

```ts
async function loginWithWallet(address: `0x${string}`) {
  const nonce = await requestLoginNonce(address);

  const message = `Sign in to Option Trading\n\nNonce: ${nonce}`;

  const signature = await signMessageAsync({ message });

  return verifyLoginSignature({
    address,
    message,
    signature,
  });
}
```

登录签名只处理身份认证，而不是交易授权。

交易签名则应该围绕 Operation 展开：

```ts
async function signTradeOperation(operation: Operation) {
  const typedData = createOperationTypedData({
    chainId,
    verifyingContract,
    operation,
  });

  return signTypedDataAsync(typedData);
}
```

这两个函数的职责必须分开。不要在登录成功后，把登录签名当成后续交易的通用授权凭证。

---

## 十二、这套交易系统的工程价值

从前端工程角度看，这套交易系统最值得学习的地方，不是某一个 Hook，也不是某一个接口，而是它把交易链路拆得比较清楚。

它没有把所有逻辑都塞进点击按钮的回调里，而是拆成了几个阶段：

```text
用户输入
→ 表单校验
→ 交易计算
→ 业务数据编码
→ Operation 构造
→ Typed Data 生成
→ 签名
→ 提交
→ 实时状态同步
```

这种分层带来的好处很明显。

第一，UI 和协议解耦。

表单怎么展示、用户怎么输入，并不会直接影响底层交易协议。中间有交易数据编码层做转换。

第二，业务操作统一抽象。

通过 Operation，可以把交易、撤单、提现等行为放进同一套授权模型里，而不是每个功能单独设计一套签名逻辑。

第三，请求提交和最终状态分离。

前端不会把接口成功等同于交易完成，而是依赖 SSE 和 Query 接收真实订单状态。

第四，本地即时状态和服务端最终状态分离。

Jotai 负责快速响应，React Query 负责重新拉取和最终一致性，这比把所有东西都塞到一个全局 Store 里更清晰。

第五，登录签名和交易签名分离。

身份认证和交易授权属于不同安全语义，分开处理可以减少后续维护和安全风险。

如果把前面的逻辑串起来，一个完整的提交流程大致可以写成这样：

```ts
async function submitOrder(draft: OrderDraft) {
  const tradeDataInput = toTradeDataInput(draft);
  const encodedTradeData = encodeTradeData(tradeDataInput);

  const operation = buildOperation({
    account: BigInt(draft.accountId),
    owner: draft.owner,
    signer: draft.signer,
    module: draft.tradeModule,
    data: encodedTradeData,
  });

  validateOperationBeforeSubmit(operation);

  const { signature } = await requestTradeSignature(operation);

  const result = await placeOrder({
    operation,
    signature,
  });

  return result;
}
```

这段代码看起来并不复杂，但它背后把几个关键环节都分开了：

```text
toTradeDataInput：表单数据 → 业务交易数据
encodeTradeData：业务交易数据 → Hex data
buildOperation：业务 data → 统一 Operation
requestTradeSignature：获取交易签名
placeOrder：提交订单请求
```

这种组织方式比把所有逻辑都写在一个按钮回调里更清楚，也更适合后续维护。

---

## 十三、可以继续优化的方向

当然，这类系统也有继续优化的空间。

比如，签名相关的函数命名应该尽量准确。如果一个函数实际请求的是服务端签名，就不应该让维护者误以为它是钱包本地签名。类似 `requestTradeSignature` 这样的名字，会比简单的 `sign` 更清晰。

再比如，服务端签名接口应该严格校验 signer 身份，确保私钥对应地址和 Operation 中声明的 signer 一致。否则，一旦配置或实现出现偏差，就可能造成授权边界不明确。

此外，Operation 的校验也不应该只停留在字段类型层面，还应该校验：

- module 是否在白名单内；
- deadline 是否合理；
- chainId 是否匹配；
- signer 是否有权限；
- nonce 是否已经使用；
- data 是否符合对应模块格式。

对于订单提交后的 UI 反馈，也可以更精细一些。比如把“订单请求已提交”和“订单已成交”区分开，不要让用户误以为提交成功就代表交易完成。

这些优化不一定影响主链路，但会影响系统的可维护性、安全性和用户理解成本。

可以把 Operation 校验拆成一个更明确的前端辅助函数：

```ts
function checkOperation(
  operation: Operation,
  config: {
    allowedModules: `0x${string}`[];
    chainId: number;
  },
) {
  if (!config.allowedModules.includes(operation.module)) {
    throw new Error("Unsupported operation module");
  }

  const now = BigInt(Math.floor(Date.now() / 1000));

  if (operation.deadline <= now) {
    throw new Error("Operation deadline is invalid");
  }

  if (operation.nonce <= 0n) {
    throw new Error("Operation nonce is invalid");
  }

  if (!operation.data || operation.data === "0x") {
    throw new Error("Operation data is empty");
  }
}
```

需要注意的是，前端校验只能提升体验，不能替代服务端或合约校验。真正的权限验证、nonce 消费、deadline 判断、signer 授权关系，仍然必须由服务端或协议侧完成。

---

## 十四、总结：Web3 前端交易系统的落地范式

一个真正可用的 Web3 交易前端，不能只停留在“调用合约”的层面。

它需要处理的是完整交易链路：

```text
用户输入交易意图
→ 前端校验和计算
→ 编码交易模块数据
→ 构造统一 Operation
→ 生成 EIP-712 Typed Data
→ 获取交易签名
→ 提交订单到撮合系统
→ 实时事件推送真实状态
→ 本地状态即时更新
→ 服务端数据最终一致
```

这套链路里，前端要明确区分几件事：

```text
用户输入 ≠ 协议数据
登录签名 ≠ 交易签名
请求成功 ≠ 订单成交
本地状态 ≠ 服务端最终状态
调用接口 ≠ 完整交易系统
```

这也是我认为 Web3 前端真正有挑战的地方。

它既要懂钱包、签名、EIP-712、smart account，也要懂表单、状态管理、数据请求、实时推送和用户体验。

Web3 前端不是把合约 ABI 接到按钮上那么简单。真正的工程能力，体现在如何把用户意图、安全授权、协议数据和实时状态组织成一条稳定、清晰、可维护的交易链路。

最后，如果用一段最小化的伪代码概括这套范式，可以是这样：

```ts
async function handleConfirmOrder(formValues: OrderFormValues) {
  // 1. 表单数据变成订单草稿
  const draft = createOrderDraft(formValues);

  // 2. 订单草稿变成协议交易数据
  const tradeData = encodeTradeData(toTradeDataInput(draft));

  // 3. 交易数据放进统一 Operation
  const operation = buildOperation({
    account: draft.accountId,
    owner: draft.owner,
    signer: draft.signer,
    module: draft.tradeModule,
    data: tradeData,
  });

  // 4. 获取结构化交易签名
  const signature = await requestTradeSignature(operation);

  // 5. 提交订单请求
  await placeOrder({
    operation,
    signature,
  });

  // 6. 后续状态不在这里直接假定完成
  // 等待 SSE / WebSocket 推送真实订单状态
}
```

这段代码之所以重要，不是因为它覆盖了所有业务细节，而是因为它表达了复杂 Web3 交易前端最核心的一条工程原则：

```text
前端不是简单触发交易，而是在组织一条完整、可验证、可追踪的交易链路。
```

---

## 项目介绍精简版

本项目实现了一套 Web3 期权交易前端链路：前端将用户订单转换为统一 Operation，通过 EIP-712 结构化签名提交至撮合系统，并结合 SSE、Jotai 与 React Query 实时同步订单、持仓和账户状态，明确区分订单提交、撮合处理与最终成交状态。
