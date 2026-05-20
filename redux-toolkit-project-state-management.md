# Redux Toolkit 项目落地：从 slice、thunk 到可维护的前端状态管理

在 React 项目里，状态管理很容易被低估。很多时候，一个 `useState`、一个 `useContext`，甚至把状态往父组件提一层，就能把功能做出来。但当项目进入真实业务阶段，问题会逐渐暴露：多个页面要共享状态、多个组件要触发同一类行为、异步流程需要统一管理、状态变化需要可追踪、调试时要知道“是谁改了状态”。

Redux 过去给人的印象是“模板代码多、学习成本高、写起来啰嗦”。但现代 Redux 已经不是早期那套手写 action type、action creator、switch reducer 的模式了。Redux Toolkit 把 store 配置、slice 创建、action 生成、不可变更新、异步 thunk 都做了封装，让 Redux 更适合在中大型 React 项目里落地。

这篇文章不只讲 Redux Toolkit 怎么写一个 counter，而是从项目工程角度讲：Redux Toolkit 适合解决什么问题，简单写法有什么隐患，真实项目里应该如何拆 slice、封装 selector、处理异步状态，以及组件应该如何消费 Redux 状态。

---

## 1. Redux Toolkit 解决什么问题

Redux 解决的是跨组件共享的客户端状态管理问题。

这里要强调两个关键词：跨组件、客户端状态。

跨组件，指的是状态不只属于某个局部组件，而是多个页面、多个业务模块、多个组件层级都需要访问或修改。比如购物车、结算流程、全局弹窗、用户偏好、复杂筛选器、编辑器状态、多步骤表单状态等。

客户端状态，指的是前端自己维护的交互状态和业务流程状态。它和服务端数据不是一回事。比如订单列表、用户详情、商品详情这类来自接口的数据，通常更适合交给 React Query、SWR 或 RTK Query 管理。Redux 可以管理它们，但不应该无脑把所有接口返回数据都塞进 Redux store。

Redux Toolkit 主要解决这些问题：

- 状态集中管理。多个组件不用通过 props 一层层传递状态，也不用到处创建 context。
- 状态修改路径清晰。组件通过 dispatch action 表达“我要做什么”，slice 内部 reducer 决定“状态如何变化”。
- 状态可调试。配合 Redux DevTools，可以看到每一次 action、payload、state diff，适合复杂交互流程排查问题。
- 减少传统 Redux 模板代码。`createSlice` 会自动生成 action 和 reducer，内部通过 Immer 支持类似“直接修改”的写法，但实际仍然保持不可变更新。

Redux Toolkit 适合这些场景：

- 复杂客户端状态，例如购物车、工作台布局、结算流程、多步骤表单、编辑器状态。
- 多组件共享且修改频繁的状态，例如筛选条件、当前选中的实体、批量操作状态、全局 UI 状态。
- 需要强调状态流可追踪的业务，例如交易流程、审批流程、任务编排、复杂后台管理操作。

它不适合这些场景：

- 只在单个组件内部使用的临时状态，直接 `useState` 即可。
- 简单父子组件共享状态，提升 state 或 context 可能就够了。
- 主要来自接口的数据缓存、请求去重、失效刷新，优先考虑 React Query、SWR 或 RTK Query。

Redux Toolkit 的关键不是“全局状态都放 Redux”，而是把确实需要集中管理、可追踪、可复用的客户端状态放进去。

---

## 2. 最简单的写法是什么

先看一个最小 Redux Toolkit counter 示例。它可以跑，也能说明 Redux Toolkit 的基本组成：store、slice、action、reducer、selector、dispatch。

```ts
// src/app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "@/features/counter/counterSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

`configureStore` 用来创建 Redux store。这里的 `counter` 是 store 里的一个 slice，它对应 `counterReducer`。

```ts
// src/features/counter/counterSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface CounterState {
  value: number;
}

const initialState: CounterState = {
  value: 0,
};

const counterSlice = createSlice({
  name: "counter",
  initialState,
  reducers: {
    increment(state) {
      state.value += 1;
    },
    decrement(state) {
      state.value -= 1;
    },
    incrementByAmount(state, action: PayloadAction<number>) {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;
export default counterSlice.reducer;
```

注意这里的 `state.value += 1` 看起来像是在直接修改 state。传统 Redux 里不能这么写，但 Redux Toolkit 的 `createSlice` 内部使用 Immer，它允许你写“看起来可变”的代码，最终会生成不可变更新结果。

然后在 React 入口处挂载 Provider：

```tsx
// src/app/providers.tsx
import { Provider } from "react-redux";
import { store } from "./store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

组件中消费 Redux 状态：

```tsx
// src/features/counter/components/CounterPanel.tsx
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "@/app/store";
import { decrement, increment, incrementByAmount } from "../counterSlice";

export function CounterPanel() {
  const count = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <div>
      <h2>Count: {count}</h2>
      <button onClick={() => dispatch(increment())}>+1</button>
      <button onClick={() => dispatch(decrement())}>-1</button>
      <button onClick={() => dispatch(incrementByAmount(10))}>+10</button>
    </div>
  );
}
```

这就是 Redux Toolkit 的最小可用写法。

它能跑，也比传统 Redux 简洁很多。但在真实项目里，直接这么写还不够。问题不在 counter，而在当业务复杂之后，slice、selector、异步逻辑、错误状态、组件依赖关系都会迅速膨胀。

---

## 3. 简单写法在真实项目中的问题

最小示例的问题不明显，因为 counter 只有一个数字。但真实项目里的 Redux state 通常不是一个 `value`，而是一组业务状态。

比如购物车可能有：

```ts
interface CartState {
  items: CartItem[];
  selectedItemIds: string[];
  couponCode: string | null;
  checkoutStep: "cart" | "address" | "payment" | "confirm";
  submitStatus: "idle" | "pending" | "success" | "failed";
  errorMessage: string | null;
}
```

如果仍然按照 demo 的方式写，很容易出现几个问题。

第一，所有 selector 写在组件里。组件直接写：

```ts
const total = useSelector((state: RootState) =>
  state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
);
```

短期看没问题，但一旦多个组件都需要 `total`、`selectedItems`、`canCheckout`，这些派生逻辑就会到处复制。后续 state 结构调整时，组件会被大面积影响。

第二，slice 变成大杂烩。很多团队会把购物车、结算、优惠券、地址、支付状态全部塞进一个巨大 slice。结果是 reducer 越写越长，action 命名越来越混乱，一个 slice 同时承担多个业务边界。

第三，异步状态没有标准化。比如提交订单、拉取优惠券、校验库存、创建支付单，都是异步流程。如果每个 thunk 都随便处理 `pending`、`fulfilled`、`rejected`，组件层就很难统一展示 loading 和 error。

第四，组件直接依赖 state 结构。比如组件到处写 `state.checkout.payment.form.status`，这会让 UI 和 store 内部结构强绑定。store 一调整，组件全要改。

第五，把服务端数据全部塞 Redux。比如订单列表、商品列表、用户详情，本来可以由 React Query 管缓存、重试、失效刷新，却被复制进 Redux。这样会产生两类问题：一是你要自己写缓存失效；二是多个数据源之间可能不一致。

所以 Redux Toolkit 的项目落地重点，不是会不会写 `createSlice`，而是能不能设计清楚状态边界。

---

## 4. 推荐的项目落地结构

真实项目里更推荐按照业务模块组织，而不是把所有 slice 都丢进一个 `state/` 文件夹。一个可维护的结构可以这样设计：

```txt
src/
  app/
    store.ts
    providers.tsx
    hooks.ts
  shared/
    utils/
      format.ts
      error.ts
    ui/
      Button.tsx
      Modal.tsx
  features/
    cart/
      cartSlice.ts
      selectors.ts
      thunks.ts
      types.ts
      components/
        CartPanel.tsx
        CartSummary.tsx
    checkout/
      checkoutSlice.ts
      selectors.ts
      thunks.ts
      types.ts
      components/
        CheckoutSteps.tsx
        SubmitOrderButton.tsx
    user/
      userSlice.ts
      selectors.ts
      thunks.ts
      types.ts
      components/
        UserMenu.tsx
```

这里的核心原则是单一职责。

`app/store.ts` 只负责创建 store，组合各业务 reducer，并导出 `RootState`、`AppDispatch`。

`app/hooks.ts` 只负责封装 typed hooks，例如 `useAppDispatch`、`useAppSelector`，避免每个组件重复写类型。

`features/cart/cartSlice.ts` 只放 cart 的状态定义、同步 reducer、`extraReducers`。

`features/cart/thunks.ts` 放异步逻辑，比如提交购物车、校验库存、同步本地购物车到服务端。

`features/cart/selectors.ts` 放派生状态，比如购物车总价、是否可结算、选中商品列表。

`features/cart/components/` 放业务组件。组件只消费 selector 和 dispatch action，不直接知道 store 内部复杂结构。

这种结构的好处是：每个业务模块可以独立演进。购物车逻辑复杂了，就在 cart feature 内部拆分；结算流程复杂了，就在 checkout feature 内部拆分。组件、状态、异步逻辑、类型定义都围绕业务聚合，而不是按“技术类型”散落在全局目录里。

---

## 5. 推荐写法一：抽离核心配置和业务状态逻辑

先写 typed hooks。Redux 官方示例里也推荐这么做，因为 `useDispatch` 默认类型并不知道你的 thunk 类型。

```ts
// src/app/hooks.ts
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

这样组件里不需要反复写：

```ts
useSelector((state: RootState) => ...);
useDispatch<AppDispatch>();
```

然后设计一个更接近真实业务的 cart slice。

```ts
// src/features/cart/types.ts
export interface CartItem {
  id: string;
  skuId: string;
  title: string;
  price: number;
  quantity: number;
  checked: boolean;
}

export type CartStatus =
  | "idle"
  | "syncing"
  | "submitting"
  | "success"
  | "failed";

export interface CartState {
  items: CartItem[];
  status: CartStatus;
  errorMessage: string | null;
}
```

异步 thunk 放到单独文件。这里模拟一个“提交购物车”的业务，它会调用 API，成功后返回订单 ID。

```ts
// src/features/cart/thunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { CartItem } from "./types";

interface SubmitCartPayload {
  items: CartItem[];
  addressId: string;
}

interface SubmitCartResult {
  orderId: string;
}

interface ApiError {
  message: string;
}

async function submitCartApi(
  payload: SubmitCartPayload,
): Promise<SubmitCartResult> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(error?.message ?? "提交订单失败");
  }

  return response.json() as Promise<SubmitCartResult>;
}

export const submitCart = createAsyncThunk<
  SubmitCartResult,
  SubmitCartPayload,
  {
    rejectValue: ApiError;
  }
>("cart/submitCart", async (payload, { rejectWithValue }) => {
  try {
    return await submitCartApi(payload);
  } catch (error) {
    return rejectWithValue({
      message: error instanceof Error ? error.message : "未知错误",
    });
  }
});
```

这里有几个关键点。

`createAsyncThunk` 的第一个泛型是成功返回值，第二个泛型是入参，第三个泛型可以定义 `rejectValue`。这样 `rejected` 分支可以拿到标准化错误结构，而不是到处判断 unknown error。

接着写 slice：

```ts
// src/features/cart/cartSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { submitCart } from "./thunks";
import type { CartItem, CartState } from "./types";

const initialState: CartState = {
  items: [],
  status: "idle",
  errorMessage: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(
        (item) => item.skuId === action.payload.skuId,
      );

      if (existing) {
        existing.quantity += action.payload.quantity;
        return;
      }

      state.items.push(action.payload);
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateQuantity(
      state,
      action: PayloadAction<{
        id: string;
        quantity: number;
      }>,
    ) {
      const item = state.items.find((item) => item.id === action.payload.id);

      if (!item) return;

      item.quantity = Math.max(1, action.payload.quantity);
    },
    toggleItemChecked(state, action: PayloadAction<string>) {
      const item = state.items.find((item) => item.id === action.payload);

      if (!item) return;

      item.checked = !item.checked;
    },
    clearCart(state) {
      state.items = [];
      state.status = "idle";
      state.errorMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitCart.pending, (state) => {
        state.status = "submitting";
        state.errorMessage = null;
      })
      .addCase(submitCart.fulfilled, (state) => {
        state.status = "success";
        state.items = [];
      })
      .addCase(submitCart.rejected, (state, action) => {
        state.status = "failed";
        state.errorMessage =
          action.payload?.message ?? action.error.message ?? "提交订单失败";
      });
  },
});

export const {
  addItem,
  removeItem,
  updateQuantity,
  toggleItemChecked,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
```

同步 reducer 处理前端本地状态变化，例如添加商品、删除商品、修改数量。

异步 thunk 的生命周期放在 `extraReducers` 里处理，分别对应 `pending`、`fulfilled`、`rejected`。组件不用自己维护提交状态，只需要读 `state.cart.status`。

再把 reducer 接进 store：

```ts
// src/app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "@/features/cart/cartSlice";

export const store = configureStore({
  reducer: {
    cart: cartReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

这里已经形成了比较清晰的状态流：

```txt
组件触发 action 或 thunk
  -> slice 负责修改状态
  -> selector 负责派生状态
  -> 组件只消费最终结果
```

---

## 6. 推荐写法二：组件只消费结果，不承载复杂业务

不要让组件直接依赖复杂 state 结构，也不要把派生计算写在组件里。推荐把 selector 单独封装。

```ts
// src/features/cart/selectors.ts
import type { RootState } from "@/app/store";

export const selectCartItems = (state: RootState) => state.cart.items;

export const selectCheckedCartItems = (state: RootState) =>
  state.cart.items.filter((item) => item.checked);

export const selectCartStatus = (state: RootState) => state.cart.status;

export const selectCartErrorMessage = (state: RootState) =>
  state.cart.errorMessage;

export const selectCartTotalPrice = (state: RootState) =>
  state.cart.items
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

export const selectCanSubmitCart = (state: RootState) => {
  const checkedItems = selectCheckedCartItems(state);
  return checkedItems.length > 0 && state.cart.status !== "submitting";
};
```

组件里只消费 selector 和 action：

```tsx
// src/features/cart/components/CartPanel.tsx
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { removeItem, toggleItemChecked, updateQuantity } from "../cartSlice";
import {
  selectCartErrorMessage,
  selectCartItems,
  selectCartStatus,
  selectCartTotalPrice,
} from "../selectors";

export function CartPanel() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const totalPrice = useAppSelector(selectCartTotalPrice);
  const status = useAppSelector(selectCartStatus);
  const errorMessage = useAppSelector(selectCartErrorMessage);

  return (
    <section>
      <h2>购物车</h2>

      {items.map((item) => (
        <div key={item.id}>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => dispatch(toggleItemChecked(item.id))}
          />
          <span>{item.title}</span>
          <input
            type="number"
            value={item.quantity}
            min={1}
            onChange={(event) =>
              dispatch(
                updateQuantity({
                  id: item.id,
                  quantity: Number(event.target.value),
                }),
              )
            }
          />
          <button onClick={() => dispatch(removeItem(item.id))}>删除</button>
        </div>
      ))}

      <div>合计：{totalPrice}</div>
      {status === "failed" && <p>{errorMessage}</p>}
    </section>
  );
}
```

这个组件不知道 Redux 内部如何组织，也不知道总价如何计算。它只关心“拿到 items、拿到 totalPrice、dispatch 用户动作”。

提交订单按钮也可以单独封装：

```tsx
// src/features/cart/components/SubmitCartButton.tsx
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import {
  selectCanSubmitCart,
  selectCheckedCartItems,
  selectCartStatus,
} from "../selectors";
import { submitCart } from "../thunks";

interface SubmitCartButtonProps {
  addressId: string | null;
}

export function SubmitCartButton({ addressId }: SubmitCartButtonProps) {
  const dispatch = useAppDispatch();
  const checkedItems = useAppSelector(selectCheckedCartItems);
  const canSubmit = useAppSelector(selectCanSubmitCart);
  const status = useAppSelector(selectCartStatus);

  const handleSubmit = () => {
    if (!addressId) {
      return;
    }

    dispatch(
      submitCart({
        items: checkedItems,
        addressId,
      }),
    );
  };

  return (
    <button disabled={!canSubmit || !addressId} onClick={handleSubmit}>
      {status === "submitting" ? "提交中..." : "提交订单"}
    </button>
  );
}
```

这里的关键点是：组件可以触发动作，但不应该承载状态变化规则。比如“提交中不允许再次提交”“提交失败如何写入错误信息”“提交成功是否清空购物车”，这些都应该在 slice/thunk 层处理。

---

## 7. 推荐写法三：错误处理、异步状态和调试

Redux Toolkit 里异步逻辑通常用 `createAsyncThunk`，它会自动生成三类 action：

- `pending`：异步任务开始。
- `fulfilled`：异步任务成功。
- `rejected`：异步任务失败。

真实项目中，不建议只处理 `fulfilled`。否则组件很难知道当前是否提交中，也无法展示明确错误。

比较完整的处理方式是：

```ts
extraReducers: (builder) => {
  builder
    .addCase(submitCart.pending, (state) => {
      state.status = "submitting";
      state.errorMessage = null;
    })
    .addCase(submitCart.fulfilled, (state) => {
      state.status = "success";
      state.items = [];
    })
    .addCase(submitCart.rejected, (state, action) => {
      state.status = "failed";
      state.errorMessage =
        action.payload?.message ??
        action.error.message ??
        "提交订单失败，请稍后重试";
    });
};
```

这里不只是为了 UI 展示 loading，而是为了让业务状态可追踪。提交中的按钮禁用、失败后的重试、成功后的跳转或提示，都依赖这些状态。

如果需要在组件中等待 thunk 执行结果，可以使用 `unwrap()`：

```ts
import { submitCart } from "../thunks";

async function handleSubmit() {
  if (!addressId) return;

  try {
    const result = await dispatch(
      submitCart({
        items: checkedItems,
        addressId,
      }),
    ).unwrap();

    console.log("订单创建成功:", result.orderId);
  } catch (error) {
    console.error("订单创建失败:", error);
  }
}
```

`unwrap()` 的作用是把 thunk action 转成正常的 Promise 语义：成功返回 payload，失败抛出错误。适合组件里做跳转、toast、埋点这类 UI 侧副作用。

但要注意，reducer 里不要写副作用。不要在 reducer 里写：

```ts
localStorage.setItem(...);
window.location.href = ...;
fetch(...);
setTimeout(...);
```

reducer 应该只负责根据 action 计算新 state。请求、跳转、`localStorage`、toast 这些副作用应该放在 thunk、组件事件处理、listener middleware 或其他副作用层里。

另外，Redux DevTools 是 Redux 项目里非常重要的调试工具。你可以看到：

- 每次 dispatch 的 action type。
- action payload。
- state 前后变化。
- 异步 thunk 的 `pending` / `fulfilled` / `rejected`。
- 某次状态变化具体由哪个 action 造成。

比如 `submitCart` 会在 DevTools 中显示类似：

```txt
cart/submitCart/pending
cart/submitCart/fulfilled
```

如果提交失败，则是：

```txt
cart/submitCart/pending
cart/submitCart/rejected
```

这比在组件里到处 `console.log` 更适合排查复杂业务流程。

---

## 8. 结合真实业务：购物车和结算流程如何拆 Redux 状态

用购物车举例，是因为它很适合说明 Redux Toolkit 的价值。

一个购物车模块通常不只是 “items 数组”。它会包含商品数量、选中状态、优惠券、库存校验、结算步骤、提交订单、错误提示等逻辑。

推荐拆法是：

```txt
features/
  cart/
    cartSlice.ts
    selectors.ts
    thunks.ts
    types.ts
  checkout/
    checkoutSlice.ts
    selectors.ts
    thunks.ts
    types.ts
```

`cart` 管购物车本身，例如商品项、数量、选中、删除、清空。

`checkout` 管结算流程，例如当前步骤、地址 ID、支付方式、提交状态。

不要把它们全塞进一个巨大 slice。否则后续优惠券、发票、地址、支付渠道、风控提示都加进去之后，slice 会越来越难维护。

例如 checkout slice 可以这样写：

```ts
// src/features/checkout/checkoutSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

type CheckoutStep = "cart" | "address" | "payment" | "confirm";

interface CheckoutState {
  step: CheckoutStep;
  addressId: string | null;
  paymentMethod: "wechat" | "alipay" | "card" | null;
}

const initialState: CheckoutState = {
  step: "cart",
  addressId: null,
  paymentMethod: null,
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setStep(state, action: PayloadAction<CheckoutStep>) {
      state.step = action.payload;
    },
    setAddressId(state, action: PayloadAction<string>) {
      state.addressId = action.payload;
    },
    setPaymentMethod(
      state,
      action: PayloadAction<CheckoutState["paymentMethod"]>,
    ) {
      state.paymentMethod = action.payload;
    },
    resetCheckout(state) {
      state.step = "cart";
      state.addressId = null;
      state.paymentMethod = null;
    },
  },
});

export const { setStep, setAddressId, setPaymentMethod, resetCheckout } =
  checkoutSlice.actions;

export default checkoutSlice.reducer;
```

然后在 store 里组合：

```ts
// src/app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "@/features/cart/cartSlice";
import checkoutReducer from "@/features/checkout/checkoutSlice";

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    checkout: checkoutReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

这样 cart 和 checkout 边界清晰：购物车负责商品状态，结算负责流程状态。提交订单时，thunk 可以组合两边状态，也可以由组件传入必要参数。

```ts
// src/features/checkout/selectors.ts
import type { RootState } from "@/app/store";

export const selectCheckoutStep = (state: RootState) => state.checkout.step;
export const selectAddressId = (state: RootState) => state.checkout.addressId;
export const selectPaymentMethod = (state: RootState) =>
  state.checkout.paymentMethod;
export const selectCanGoPayment = (state: RootState) =>
  Boolean(state.checkout.addressId);
export const selectCanConfirmOrder = (state: RootState) =>
  Boolean(state.checkout.addressId && state.checkout.paymentMethod);
```

这种方式比把所有逻辑写在一个页面组件里更稳定。页面只是组合模块，业务规则留在各自 feature 内部。

---

## 9. 一个较完整的 TypeScript 示例

下面给一个相对完整的 Redux Toolkit 业务模块示例：购物车 + 提交订单。代码不追求覆盖所有业务细节，但结构接近真实项目。

首先是 store 和 typed hooks。

```ts
// src/app/store.ts
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "@/features/cart/cartSlice";
import checkoutReducer from "@/features/checkout/checkoutSlice";

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    checkout: checkoutReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```ts
// src/app/hooks.ts
import {
  useDispatch,
  useSelector,
  type TypedUseSelectorHook,
} from "react-redux";
import type { AppDispatch, RootState } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

Provider 放在应用入口：

```tsx
// src/app/providers.tsx
import { Provider } from "react-redux";
import { store } from "./store";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

购物车类型定义：

```ts
// src/features/cart/types.ts
export interface CartItem {
  id: string;
  skuId: string;
  title: string;
  price: number;
  quantity: number;
  checked: boolean;
}

export type CartStatus = "idle" | "submitting" | "success" | "failed";

export interface CartState {
  items: CartItem[];
  status: CartStatus;
  errorMessage: string | null;
}

export interface SubmitCartPayload {
  items: CartItem[];
  addressId: string;
  paymentMethod: string;
}

export interface SubmitCartResult {
  orderId: string;
}
```

异步 thunk：

```ts
// src/features/cart/thunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import type { SubmitCartPayload, SubmitCartResult } from "./types";

interface RejectValue {
  message: string;
}

async function createOrder(
  payload: SubmitCartPayload,
): Promise<SubmitCartResult> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: payload.items.map((item) => ({
        skuId: item.skuId,
        quantity: item.quantity,
      })),
      addressId: payload.addressId,
      paymentMethod: payload.paymentMethod,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "创建订单失败");
  }

  return response.json() as Promise<SubmitCartResult>;
}

export const submitCart = createAsyncThunk<
  SubmitCartResult,
  SubmitCartPayload,
  {
    rejectValue: RejectValue;
  }
>("cart/submitCart", async (payload, { rejectWithValue }) => {
  try {
    return await createOrder(payload);
  } catch (error) {
    return rejectWithValue({
      message: error instanceof Error ? error.message : "创建订单失败",
    });
  }
});
```

购物车 slice：

```ts
// src/features/cart/cartSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { submitCart } from "./thunks";
import type { CartItem, CartState } from "./types";

const initialState: CartState = {
  items: [],
  status: "idle",
  errorMessage: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(
        (item) => item.skuId === action.payload.skuId,
      );

      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }

      state.errorMessage = null;
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateQuantity(
      state,
      action: PayloadAction<{
        id: string;
        quantity: number;
      }>,
    ) {
      const item = state.items.find((item) => item.id === action.payload.id);

      if (!item) return;

      item.quantity = Math.max(1, action.payload.quantity);
    },
    toggleChecked(state, action: PayloadAction<string>) {
      const item = state.items.find((item) => item.id === action.payload);

      if (!item) return;

      item.checked = !item.checked;
    },
    clearCart(state) {
      state.items = [];
      state.status = "idle";
      state.errorMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(submitCart.pending, (state) => {
        state.status = "submitting";
        state.errorMessage = null;
      })
      .addCase(submitCart.fulfilled, (state) => {
        state.status = "success";
        state.items = [];
      })
      .addCase(submitCart.rejected, (state, action) => {
        state.status = "failed";
        state.errorMessage =
          action.payload?.message ?? action.error.message ?? "提交订单失败";
      });
  },
});

export const { addItem, removeItem, updateQuantity, toggleChecked, clearCart } =
  cartSlice.actions;

export default cartSlice.reducer;
```

selector：

```ts
// src/features/cart/selectors.ts
import type { RootState } from "@/app/store";

export const selectCartItems = (state: RootState) => state.cart.items;

export const selectCheckedCartItems = (state: RootState) =>
  state.cart.items.filter((item) => item.checked);

export const selectCartStatus = (state: RootState) => state.cart.status;

export const selectCartErrorMessage = (state: RootState) =>
  state.cart.errorMessage;

export const selectCartTotalPrice = (state: RootState) =>
  state.cart.items
    .filter((item) => item.checked)
    .reduce((total, item) => total + item.price * item.quantity, 0);

export const selectHasCheckedItems = (state: RootState) =>
  state.cart.items.some((item) => item.checked);
```

结算 slice：

```ts
// src/features/checkout/checkoutSlice.ts
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

interface CheckoutState {
  addressId: string | null;
  paymentMethod: "wechat" | "alipay" | "card" | null;
}

const initialState: CheckoutState = {
  addressId: null,
  paymentMethod: null,
};

const checkoutSlice = createSlice({
  name: "checkout",
  initialState,
  reducers: {
    setAddressId(state, action: PayloadAction<string>) {
      state.addressId = action.payload;
    },
    setPaymentMethod(
      state,
      action: PayloadAction<CheckoutState["paymentMethod"]>,
    ) {
      state.paymentMethod = action.payload;
    },
    resetCheckout(state) {
      state.addressId = null;
      state.paymentMethod = null;
    },
  },
});

export const { setAddressId, setPaymentMethod, resetCheckout } =
  checkoutSlice.actions;

export default checkoutSlice.reducer;
```

结算 selector：

```ts
// src/features/checkout/selectors.ts
import type { RootState } from "@/app/store";

export const selectAddressId = (state: RootState) => state.checkout.addressId;

export const selectPaymentMethod = (state: RootState) =>
  state.checkout.paymentMethod;

export const selectCheckoutReady = (state: RootState) =>
  Boolean(state.checkout.addressId && state.checkout.paymentMethod);
```

最后是组件。组件不直接计算复杂规则，只组合 selector 和 dispatch。

```tsx
// src/features/cart/components/CartPage.tsx
import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { removeItem, toggleChecked, updateQuantity } from "../cartSlice";
import {
  selectCartErrorMessage,
  selectCartItems,
  selectCartStatus,
  selectCartTotalPrice,
  selectCheckedCartItems,
} from "../selectors";
import {
  selectAddressId,
  selectCheckoutReady,
  selectPaymentMethod,
} from "@/features/checkout/selectors";
import { submitCart } from "../thunks";

export function CartPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectCartItems);
  const checkedItems = useAppSelector(selectCheckedCartItems);
  const totalPrice = useAppSelector(selectCartTotalPrice);
  const status = useAppSelector(selectCartStatus);
  const errorMessage = useAppSelector(selectCartErrorMessage);
  const addressId = useAppSelector(selectAddressId);
  const paymentMethod = useAppSelector(selectPaymentMethod);
  const checkoutReady = useAppSelector(selectCheckoutReady);
  const isSubmitting = status === "submitting";

  const handleSubmit = async () => {
    if (!addressId || !paymentMethod || checkedItems.length === 0) {
      return;
    }

    try {
      const result = await dispatch(
        submitCart({
          items: checkedItems,
          addressId,
          paymentMethod,
        }),
      ).unwrap();

      console.log("订单创建成功:", result.orderId);
    } catch (error) {
      console.error("订单创建失败:", error);
    }
  };

  return (
    <main>
      <h1>购物车</h1>

      {items.map((item) => (
        <div key={item.id}>
          <input
            type="checkbox"
            checked={item.checked}
            onChange={() => dispatch(toggleChecked(item.id))}
          />
          <span>{item.title}</span>
          <span>单价：{item.price}</span>
          <input
            type="number"
            min={1}
            value={item.quantity}
            onChange={(event) =>
              dispatch(
                updateQuantity({
                  id: item.id,
                  quantity: Number(event.target.value),
                }),
              )
            }
          />
          <button onClick={() => dispatch(removeItem(item.id))}>删除</button>
        </div>
      ))}

      <footer>
        <div>合计：{totalPrice}</div>
        {errorMessage && <p>{errorMessage}</p>}
        <button
          disabled={!checkoutReady || checkedItems.length === 0 || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "提交中..." : "提交订单"}
        </button>
      </footer>
    </main>
  );
}
```

这个示例里，Redux Toolkit 的职责比较清楚：

- cart slice 管购物车状态。
- checkout slice 管结算配置。
- thunk 管异步提交。
- selector 管派生数据。
- 组件负责渲染和触发动作。

这比把所有逻辑写在一个页面组件里更适合长期维护。

---

## 10. 工程化注意事项

Redux Toolkit 项目里，最容易踩的坑不是语法，而是边界设计。

第一，slice 应该按业务领域拆分。不要创建一个 `appSlice` 管所有东西，也不要把毫不相关的状态塞进同一个 slice。购物车、结算、用户偏好、全局弹窗，应该按业务归属拆开。

第二，reducer 里不要写副作用。reducer 只负责纯状态更新。请求、跳转、计时器、`localStorage`、toast、埋点，都不应该写在 reducer 里。

第三，异步状态要标准化。只写 `fulfilled` 不够，`pending` 和 `rejected` 同样重要。真实项目里的按钮禁用、错误提示、重试入口、流程推进，都依赖这些状态。

第四，selector 要封装。组件不应该到处写 `state.xxx.yyy.zzz`，更不应该在组件里重复计算复杂派生状态。selector 是 store 和 UI 之间的重要边界。

第五，不要把所有服务端数据都塞进 Redux。比如商品列表、订单详情、用户列表这类数据，如果涉及缓存、重新请求、失效刷新、分页、筛选，通常 React Query、SWR 或 RTK Query 更合适。Redux 更适合客户端交互状态和业务流程状态。

第六，使用 typed hooks。`useAppDispatch` 和 `useAppSelector` 可以减少类型重复，也能正确支持 thunk dispatch。

第七，善用 Redux DevTools。复杂状态流里，DevTools 能直接告诉你：发生了哪个 action，payload 是什么，state 变化了什么。它是 Redux 相比很多轻量状态库的重要优势之一。

第八，不要过度使用 Redux。局部表单输入、hover 状态、展开折叠状态，如果只属于当前组件，放在局部 `useState` 就可以。全局状态不是越集中越好，集中管理也意味着更高的设计成本。

---

## 11. 总结

Redux Toolkit 的价值不在于让 counter 加一减一，而在于给复杂前端状态提供一套稳定的组织方式。

在真实项目里，Redux Toolkit 更适合管理那些需要跨组件共享、需要明确状态流、需要调试追踪、需要承载业务流程的客户端状态。它不应该变成所有数据的垃圾桶，也不应该替代 React Query 这类 server state 工具。

比较推荐的实践是：按业务模块拆 slice，把异步逻辑放到 thunk，把派生状态放到 selector，把类型和组件放在 feature 内部聚合。组件层只负责消费状态和触发动作，不直接承载复杂状态规则。

这样写的 Redux 项目，后期加业务、拆模块、排查问题都会更稳定。Redux Toolkit 已经把很多底层模板代码简化掉了，剩下真正需要开发者做好的，是状态边界和业务模块设计。
