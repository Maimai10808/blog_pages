# Zustand 项目落地：从全局状态、Store 拆分到真实业务封装

在 React 项目里，很多状态一开始都可以用 `useState` 解决。一个组件里定义状态，一个按钮修改状态，页面能正常更新，看起来没有问题。

但项目一复杂，问题就会出现：某个状态不只一个组件要用，A 组件修改，B 组件展示，C 组件还要根据它计算派生结果。如果继续靠 props 一层层传递，组件树会越来越难维护；如果把所有状态都塞进 Context，又容易出现 Provider 嵌套、无关组件重复渲染、状态边界不清的问题。

Zustand 解决的是这类“客户端状态共享”的问题。它的优势不是“能写一个计数器”，而是用很低的样板代码，把全局状态、更新函数、派生选择器和业务组件解耦开。

---

## 1. Zustand 解决什么问题

Zustand 是一个轻量级 React 状态管理库。它的核心概念是 store：store 里保存状态，也保存修改状态的方法。组件通过 hook 读取 store 中的某一部分状态，或者调用 store 中的方法完成更新。

它适合管理这些客户端状态：

- 用户选择的筛选条件。
- 当前 tab。
- 弹窗开关。
- 侧边栏展开状态。
- 购物车本地状态。
- 复杂表单流程状态。
- 多步骤操作状态。
- 播放器状态。
- 临时草稿状态。

这些状态有一个共同点：它们主要由前端交互驱动，不一定直接等同于后端接口返回的数据。

它不适合无脑管理所有接口数据。比如用户列表、订单列表、文章详情、交易历史这类服务端数据，更适合交给 React Query、SWR 或框架自己的数据层来处理。否则很容易出现两份数据源：一份在请求缓存里，一份在 Zustand store 里，最后缓存失效、刷新、重试、同步都会变复杂。

可以简单理解：

```ts
// 适合放 Zustand
{
  keyword: '',
  selectedStatus: 'pending',
  currentStep: 2,
  cartDraft: {},
  modalOpen: false,
}
```

```ts
// 不建议直接放 Zustand，除非有明确理由
{
  users: [],
  orders: [],
  productDetail: {},
  transactionHistory: [],
}
```

Zustand 的价值在于：当状态需要跨组件共享，并且它属于前端交互状态时，可以避免 props drilling，也不需要像 Redux 那样写较多模板代码。

---

## 2. 最简单的写法是什么

最小版本的 Zustand store 非常简单。

```ts
// src/store/counterStore.ts
import { create } from "zustand";

type CounterStore = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => {
    set((state) => ({
      count: state.count + 1,
    }));
  },
  decrement: () => {
    set((state) => ({
      count: state.count - 1,
    }));
  },
}));
```

组件里直接使用：

```tsx
// src/components/CounterPanel.tsx
import { useCounterStore } from "../store/counterStore";

export function CounterPanel() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={increment}>+</button>
      <button onClick={decrement}>-</button>
    </div>
  );
}
```

这段代码可以正常运行。它展示了 Zustand 的几个核心特点：

第一，store 定义在组件外部。

第二，`useCounterStore` 本身就是一个 hook。

第三，组件可以通过 selector 读取 store 中的某个字段。

第四，更新函数可以直接放在 store 里。

第五，不需要额外写 Provider。

这也是很多人第一次接触 Zustand 时最容易喜欢它的地方：代码少，接入快，心智负担低。

但真实项目不能只停留在这个写法。

---

## 3. 简单写法在真实项目中的问题

计数器示例太干净了。真实业务里的 Zustand store 往往不是一个 `count`，而是一组互相关联的状态。

比如一个购物车模块，可能有商品行、优惠券、选中项、提交状态、错误信息、派生金额、库存校验、清空购物车、批量选中、修改数量等逻辑。如果仍然随手写一个大 store，很快会出现这些问题。

第一个问题是 store 变成“全局垃圾桶”。所有状态都往一个 store 里塞，购物车、用户、弹窗、筛选器、主题配置混在一起。组件想读一个字段，却被整个大 store 的结构绑死。

第二个问题是组件直接理解 store 结构。比如组件里到处写：

```ts
const total = useCartStore((state) =>
  state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
);
```

短期能跑，长期会让派生逻辑散落在组件里。以后价格规则变了、优惠券规则变了、是否计算选中商品变了，需要全项目搜索修改。

第三个问题是 selector 写得不够精确。有些人会这样写：

```ts
const { count, increment } = useCounterStore();
```

这会让组件订阅整个 store。只要 store 里任意字段变化，这个组件就可能重新渲染。小项目不明显，大项目里会变成性能隐患。

第四个问题是把异步请求也粗暴塞进 Zustand。比如：

```ts
type UserStore = {
  users: User[];
  fetchUsers: () => Promise<void>;
};
```

这不是绝对错误，但如果项目已经使用 React Query，再把接口返回数据复制到 Zustand，就会制造两份状态源。列表刷新、错误重试、缓存失效、分页参数同步都会更难处理。

第五个问题是错误状态和提交状态没有标准化。异步 action 里只写 `await fetch()` 和 `set()`，没有处理 loading、error、并发点击、重复提交、失败恢复。真实项目里，按钮状态、错误提示、重试逻辑都需要明确设计。

---

## 4. 推荐的项目落地结构

以 Zustand 最典型的使用场景“购物车客户端状态”为例，不需要设计一套大而全的目录。重点是把 store、selector、组件边界分清楚。

```txt
src/
  features/
    cart/
      cartStore.ts
      selectors.ts
      types.ts
      components/
        CartPanel.tsx
        CartItemRow.tsx
        CartSummary.tsx
        CheckoutButton.tsx
```

这里的结构不复杂，但边界很明确。

`types.ts` 只放购物车相关类型，比如商品行、优惠券、提交状态。

`cartStore.ts` 保存购物车状态和修改状态的方法，比如添加商品、删除商品、修改数量、选择商品、清空购物车、提交前状态切换。

`selectors.ts` 放派生计算，比如总数量、总价、是否可以结算、是否存在无效商品。组件不应该重复写这些计算。

`components/` 只消费 store 和 selector，不直接处理复杂状态规则。比如 CartSummary 只展示总价，CheckoutButton 只根据 `canCheckout` 和 `submitStatus` 决定按钮状态。

这个结构的目标不是显得“架构很完整”，而是让读者一眼看出：状态在哪里，派生逻辑在哪里，组件在哪里，业务规则在哪里。

---

## 5. 推荐写法一：抽离 Store、Action 和 Selector

先定义类型。

```ts
// src/features/cart/types.ts
export type CartItem = {
  id: string;
  title: string;
  price: number;
  quantity: number;
  checked: boolean;
  stock: number;
};

export type SubmitStatus = "idle" | "submitting" | "success" | "failed";

export type CartState = {
  items: CartItem[];
  couponCode: string;
  submitStatus: SubmitStatus;
  errorMessage: string | null;
};

export type CartActions = {
  addItem: (item: Omit<CartItem, "quantity" | "checked">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleChecked: (id: string) => void;
  setCouponCode: (code: string) => void;
  clearCart: () => void;
  submitOrder: () => Promise<void>;
};

export type CartStore = CartState & CartActions;
```

这里把 state 和 actions 分开，是为了让 store 的职责更清楚。状态描述“现在是什么”，action 描述“可以怎么改”。

接着写 store。

```ts
// src/features/cart/cartStore.ts
import { create } from "zustand";
import type { CartItem, CartStore } from "./types";

const initialState = {
  items: [],
  couponCode: "",
  submitStatus: "idle" as const,
  errorMessage: null,
};

function normalizeQuantity(quantity: number, stock: number) {
  if (quantity < 1) return 1;
  if (quantity > stock) return stock;
  return quantity;
}

export const useCartStore = create<CartStore>((set, get) => ({
  ...initialState,
  addItem: (item) => {
    set((state) => {
      const existed = state.items.find((current) => current.id === item.id);

      if (existed) {
        return {
          items: state.items.map((current) =>
            current.id === item.id
              ? {
                  ...current,
                  quantity: normalizeQuantity(
                    current.quantity + 1,
                    current.stock,
                  ),
                }
              : current,
          ),
        };
      }

      const nextItem: CartItem = {
        ...item,
        quantity: 1,
        checked: true,
      };

      return {
        items: [...state.items, nextItem],
      };
    });
  },
  removeItem: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },
  updateQuantity: (id, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: normalizeQuantity(quantity, item.stock),
            }
          : item,
      ),
    }));
  },
  toggleChecked: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id
          ? {
              ...item,
              checked: !item.checked,
            }
          : item,
      ),
    }));
  },
  setCouponCode: (code) => {
    set({
      couponCode: code.trim(),
    });
  },
  clearCart: () => {
    set(initialState);
  },
  submitOrder: async () => {
    const { items, submitStatus } = get();

    if (submitStatus === "submitting") {
      return;
    }

    const checkedItems = items.filter((item) => item.checked);

    if (checkedItems.length === 0) {
      set({
        submitStatus: "failed",
        errorMessage: "请选择至少一个商品",
      });
      return;
    }

    const hasInvalidStock = checkedItems.some(
      (item) => item.quantity > item.stock,
    );

    if (hasInvalidStock) {
      set({
        submitStatus: "failed",
        errorMessage: "购物车中存在库存不足的商品",
      });
      return;
    }

    try {
      set({
        submitStatus: "submitting",
        errorMessage: null,
      });

      await new Promise((resolve) => setTimeout(resolve, 800));

      set({
        submitStatus: "success",
        items: items.filter((item) => !item.checked),
      });
    } catch {
      set({
        submitStatus: "failed",
        errorMessage: "提交订单失败，请稍后重试",
      });
    }
  },
}));
```

这里有几个关键点。

第一，更新状态优先使用 `set((state) => nextState)`，这样可以基于前一个状态安全计算下一个状态。

第二，异步 action 可以直接写在 store 里。Zustand 不要求你额外引入 thunk 或 saga。什么时候数据准备好了，什么时候调用 `set` 即可。

第三，`get()` 可以在 action 内部读取当前 store 状态。比如提交订单前，需要读取当前购物车商品和提交状态。

第四，异步 action 里要处理重复提交、业务校验、错误状态，而不是只写一个 `await request()`。

接着把派生逻辑放到 selectors。

```ts
// src/features/cart/selectors.ts
import type { CartStore } from "./types";

export const selectCartItems = (state: CartStore) => state.items;

export const selectCheckedItems = (state: CartStore) =>
  state.items.filter((item) => item.checked);

export const selectCartCount = (state: CartStore) =>
  state.items.reduce((sum, item) => sum + item.quantity, 0);

export const selectCheckedCount = (state: CartStore) =>
  state.items
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + item.quantity, 0);

export const selectSubtotal = (state: CartStore) =>
  state.items
    .filter((item) => item.checked)
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

export const selectCanCheckout = (state: CartStore) => {
  const checkedItems = state.items.filter((item) => item.checked);

  if (checkedItems.length === 0) {
    return false;
  }

  return checkedItems.every((item) => item.quantity <= item.stock);
};

export const selectSubmitStatus = (state: CartStore) => state.submitStatus;

export const selectCartErrorMessage = (state: CartStore) => state.errorMessage;
```

selector 的价值是把“如何从状态中计算结果”集中起来。组件只关心 `subtotal`、`canCheckout`，不需要知道它们具体怎么计算。

---

## 6. 推荐写法二：组件只消费结果，不承载复杂业务

组件应该尽量薄。它可以渲染，可以触发 action，但不要把业务规则写散。

比如购物车面板：

```tsx
// src/features/cart/components/CartPanel.tsx
import { useCartStore } from "../cartStore";
import { selectCartItems } from "../selectors";
import { CartItemRow } from "./CartItemRow";
import { CartSummary } from "./CartSummary";
import { CheckoutButton } from "./CheckoutButton";

export function CartPanel() {
  const items = useCartStore(selectCartItems);

  if (items.length === 0) {
    return <div>购物车为空</div>;
  }

  return (
    <section>
      {items.map((item) => (
        <CartItemRow key={item.id} item={item} />
      ))}
      <CartSummary />
      <CheckoutButton />
    </section>
  );
}
```

单行商品组件只处理当前行相关交互。

```tsx
// src/features/cart/components/CartItemRow.tsx
import type { CartItem } from "../types";
import { useCartStore } from "../cartStore";

type CartItemRowProps = {
  item: CartItem;
};

export function CartItemRow({ item }: CartItemRowProps) {
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const toggleChecked = useCartStore((state) => state.toggleChecked);
  const removeItem = useCartStore((state) => state.removeItem);

  return (
    <div>
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => toggleChecked(item.id)}
      />
      <span>{item.title}</span>
      <span>¥{item.price}</span>
      <button
        onClick={() => updateQuantity(item.id, item.quantity - 1)}
        disabled={item.quantity <= 1}
      >
        -
      </button>
      <span>{item.quantity}</span>
      <button
        onClick={() => updateQuantity(item.id, item.quantity + 1)}
        disabled={item.quantity >= item.stock}
      >
        +
      </button>
      <button onClick={() => removeItem(item.id)}>删除</button>
    </div>
  );
}
```

汇总组件消费派生 selector。

```tsx
// src/features/cart/components/CartSummary.tsx
import { useCartStore } from "../cartStore";
import {
  selectCartErrorMessage,
  selectCheckedCount,
  selectSubtotal,
} from "../selectors";

export function CartSummary() {
  const checkedCount = useCartStore(selectCheckedCount);
  const subtotal = useCartStore(selectSubtotal);
  const errorMessage = useCartStore(selectCartErrorMessage);

  return (
    <footer>
      <div>已选商品：{checkedCount}</div>
      <div>小计：¥{subtotal}</div>
      {errorMessage ? <p>{errorMessage}</p> : null}
    </footer>
  );
}
```

提交按钮也不需要知道库存校验、重复提交、错误处理怎么做。它只消费状态并触发 action。

```tsx
// src/features/cart/components/CheckoutButton.tsx
import { useCartStore } from "../cartStore";
import { selectCanCheckout, selectSubmitStatus } from "../selectors";

export function CheckoutButton() {
  const canCheckout = useCartStore(selectCanCheckout);
  const submitStatus = useCartStore(selectSubmitStatus);
  const submitOrder = useCartStore((state) => state.submitOrder);
  const isSubmitting = submitStatus === "submitting";

  return (
    <button
      disabled={!canCheckout || isSubmitting}
      onClick={() => {
        void submitOrder();
      }}
    >
      {isSubmitting ? "提交中..." : "提交订单"}
    </button>
  );
}
```

这里的关键点是：组件不直接操作复杂状态结构，不重复写派生逻辑，不关心提交流程的内部细节。组件只消费状态、展示状态、触发动作。

---

## 7. 错误处理、异步状态和生命周期怎么处理

Zustand 的异步 action 很自由，但自由也意味着需要自己建立规范。

比如提交订单这个 action，至少要处理几个边界：

- 重复点击时不能重复提交。
- 没有选中商品时要阻止提交。
- 库存不足时要给出业务错误。
- 请求开始时设置 `submitting`。
- 请求失败时设置 `failed` 和错误信息。
- 请求成功后清理已提交商品。

也就是：

```ts
submitOrder: async () => {
  const { items, submitStatus } = get();

  if (submitStatus === "submitting") return;

  try {
    set({ submitStatus: "submitting", errorMessage: null });

    // await request
    await new Promise((resolve) => setTimeout(resolve, 800));

    set({ submitStatus: "success" });
  } catch {
    set({
      submitStatus: "failed",
      errorMessage: "提交失败",
    });
  }
};
```

如果 action 会调用真实接口，需要注意不要把 Zustand 当成请求缓存工具。比如订单列表这种服务端数据，推荐用 React Query 管理；Zustand 可以只保存筛选条件和当前选中项。

```ts
// Zustand 管客户端筛选条件
type OrderFilterStore = {
  keyword: string;
  status: "all" | "pending" | "paid" | "closed";
  page: number;
  setKeyword: (keyword: string) => void;
  setStatus: (status: OrderFilterStore["status"]) => void;
  setPage: (page: number) => void;
};
```

然后 React Query 根据这些 filter 请求数据：

```ts
const keyword = useOrderFilterStore((state) => state.keyword);
const status = useOrderFilterStore((state) => state.status);
const page = useOrderFilterStore((state) => state.page);

const ordersQuery = useQuery({
  queryKey: ["orders", { keyword, status, page }],
  queryFn: () => getOrders({ keyword, status, page }),
});
```

这种组合里，Zustand 只负责“用户当前怎么看数据”，React Query 负责“数据怎么请求、缓存、刷新、重试”。边界清楚，后期维护成本会低很多。

另外，Zustand 的 store 可以在组件外访问：

```ts
import { useCartStore } from "./cartStore";

export function clearCartAfterLogout() {
  useCartStore.getState().clearCart();
}
```

也可以直接设置状态：

```ts
useCartStore.setState({
  couponCode: "",
});
```

这在事件总线、登出清理、路由守卫、非 React 环境逻辑里很有用。但不要滥用。组件内优先使用 hook + selector，组件外才使用 `getState()` 或 `setState()`。

---

## 8. 结合真实业务：Zustand 更适合放什么

以后台订单系统为例，页面上通常有这些状态：

- 搜索关键词。
- 订单状态筛选。
- 分页页码。
- 当前选中的订单。
- 详情弹窗是否打开。
- 批量操作选中的订单 ID。
- 订单列表数据。
- 订单详情数据。

这里不要全部塞进 Zustand。

更合理的拆分是：

- Zustand 保存搜索词、筛选状态、页码、弹窗状态、选中订单 ID。
- React Query 保存订单列表、订单详情、提交操作后的缓存刷新。

因为搜索词、页码、弹窗状态是典型 client state；订单列表和详情是 server state。

比如：

```ts
// src/features/orders/orderUiStore.ts
import { create } from "zustand";

type OrderStatus = "all" | "pending" | "paid" | "closed";

type OrderUiStore = {
  keyword: string;
  status: OrderStatus;
  page: number;
  selectedOrderId: string | null;
  detailOpen: boolean;
  setKeyword: (keyword: string) => void;
  setStatus: (status: OrderStatus) => void;
  setPage: (page: number) => void;
  openDetail: (orderId: string) => void;
  closeDetail: () => void;
};

export const useOrderUiStore = create<OrderUiStore>((set) => ({
  keyword: "",
  status: "all",
  page: 1,
  selectedOrderId: null,
  detailOpen: false,
  setKeyword: (keyword) => {
    set({
      keyword,
      page: 1,
    });
  },
  setStatus: (status) => {
    set({
      status,
      page: 1,
    });
  },
  setPage: (page) => {
    set({ page });
  },
  openDetail: (orderId) => {
    set({
      selectedOrderId: orderId,
      detailOpen: true,
    });
  },
  closeDetail: () => {
    set({
      selectedOrderId: null,
      detailOpen: false,
    });
  },
}));
```

这就是 Zustand 在真实项目里很舒服的位置：它不抢服务端缓存的工作，只管理前端交互状态。

---

## 9. 一个更完整的 TypeScript 示例

下面用“订单筛选 + 详情弹窗”的场景，把 Zustand 的落地方式串起来。

先定义 UI store。

```ts
// src/features/orders/orderUiStore.ts
import { create } from "zustand";

export type OrderStatus = "all" | "pending" | "paid" | "closed";

type OrderUiStore = {
  keyword: string;
  status: OrderStatus;
  page: number;
  pageSize: number;
  selectedOrderId: string | null;
  detailOpen: boolean;
  setKeyword: (keyword: string) => void;
  setStatus: (status: OrderStatus) => void;
  setPage: (page: number) => void;
  openDetail: (orderId: string) => void;
  closeDetail: () => void;
  resetFilters: () => void;
};

const initialState = {
  keyword: "",
  status: "all" as OrderStatus,
  page: 1,
  pageSize: 20,
  selectedOrderId: null,
  detailOpen: false,
};

export const useOrderUiStore = create<OrderUiStore>((set) => ({
  ...initialState,
  setKeyword: (keyword) => {
    set({
      keyword,
      page: 1,
    });
  },
  setStatus: (status) => {
    set({
      status,
      page: 1,
    });
  },
  setPage: (page) => {
    set({ page });
  },
  openDetail: (orderId) => {
    set({
      selectedOrderId: orderId,
      detailOpen: true,
    });
  },
  closeDetail: () => {
    set({
      selectedOrderId: null,
      detailOpen: false,
    });
  },
  resetFilters: () => {
    set({
      keyword: "",
      status: "all",
      page: 1,
    });
  },
}));
```

再定义 selector，避免组件直接拼装 filter。

```ts
// src/features/orders/selectors.ts
import type { OrderStatus } from "./orderUiStore";

export type OrderListParams = {
  keyword: string;
  status: OrderStatus;
  page: number;
  pageSize: number;
};

type OrderUiReadableState = {
  keyword: string;
  status: OrderStatus;
  page: number;
  pageSize: number;
  selectedOrderId: string | null;
  detailOpen: boolean;
};

export const selectOrderListParams = (
  state: OrderUiReadableState,
): OrderListParams => ({
  keyword: state.keyword,
  status: state.status,
  page: state.page,
  pageSize: state.pageSize,
});

export const selectOrderDetailState = (state: OrderUiReadableState) => ({
  selectedOrderId: state.selectedOrderId,
  detailOpen: state.detailOpen,
});
```

筛选组件只改 UI state。

```tsx
// src/features/orders/components/OrderFilters.tsx
import { useOrderUiStore } from "../orderUiStore";

export function OrderFilters() {
  const keyword = useOrderUiStore((state) => state.keyword);
  const status = useOrderUiStore((state) => state.status);
  const setKeyword = useOrderUiStore((state) => state.setKeyword);
  const setStatus = useOrderUiStore((state) => state.setStatus);
  const resetFilters = useOrderUiStore((state) => state.resetFilters);

  return (
    <div>
      <input
        value={keyword}
        placeholder="搜索订单"
        onChange={(event) => setKeyword(event.target.value)}
      />
      <select
        value={status}
        onChange={(event) => setStatus(event.target.value as any)}
      >
        <option value="all">全部</option>
        <option value="pending">待支付</option>
        <option value="paid">已支付</option>
        <option value="closed">已关闭</option>
      </select>
      <button onClick={resetFilters}>重置</button>
    </div>
  );
}
```

列表组件根据 UI state 读取参数。这里假设订单数据由外部数据请求层处理，Zustand 不保存订单列表。

```tsx
// src/features/orders/components/OrderList.tsx
import { useOrderUiStore } from "../orderUiStore";
import { selectOrderListParams } from "../selectors";

type Order = {
  id: string;
  title: string;
  amount: number;
  status: string;
};

async function getOrders(params: {
  keyword: string;
  status: string;
  page: number;
  pageSize: number;
}): Promise<Order[]> {
  const search = new URLSearchParams({
    keyword: params.keyword,
    status: params.status,
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  const response = await fetch(`/api/orders?${search}`);

  if (!response.ok) {
    throw new Error("获取订单列表失败");
  }

  return response.json();
}

export function OrderList() {
  const params = useOrderUiStore(selectOrderListParams);
  const openDetail = useOrderUiStore((state) => state.openDetail);

  // 这里为了突出 Zustand，示例没有展开 React Query。
  // 真实项目里建议使用 useQuery，并把 params 放进 queryKey。
  const orders: Order[] = [];

  return (
    <div>
      <pre>{JSON.stringify(params, null, 2)}</pre>
      {orders.map((order) => (
        <button key={order.id} onClick={() => openDetail(order.id)}>
          {order.title} - ¥{order.amount}
        </button>
      ))}
    </div>
  );
}
```

如果结合 React Query，应该是这种方式，而不是把 orders 放回 Zustand：

```tsx
import { useQuery } from "@tanstack/react-query";
import { useOrderUiStore } from "../orderUiStore";
import { selectOrderListParams } from "../selectors";

export function OrderTableWithQuery() {
  const params = useOrderUiStore(selectOrderListParams);
  const { data, isPending, error } = useQuery({
    queryKey: ["orders", params],
    queryFn: () => getOrders(params),
  });

  if (isPending) return <div>加载中...</div>;
  if (error) return <div>加载失败</div>;

  return (
    <div>
      {data.map((order) => (
        <div key={order.id}>{order.title}</div>
      ))}
    </div>
  );
}
```

这里的关键设计是：Zustand 影响查询参数，React Query 根据参数获取服务端数据。Zustand 不接管服务端数据缓存。

---

## 10. 工程化注意事项

使用 Zustand 时，最容易踩的坑不是 API 写错，而是边界设计不清。

第一，selector 要尽量精确。不要随手 `useStore()` 读取整个 store。组件需要什么，就订阅什么。

```ts
// 不推荐
const state = useCartStore();

// 推荐
const count = useCartStore((state) => state.items.length);
```

第二，不要把所有业务放进一个巨大 store。按业务模块拆 store，比如 `cartStore`、`orderUiStore`、`authUiStore`、`playerStore`。一个 store 应该围绕一个清晰的业务领域。

第三，组件不要直接写复杂派生计算。总价、是否可提交、选中数量、按钮状态这类逻辑，优先放到 selector 或业务 hook 中。

第四，异步 action 要有状态设计。至少要考虑 `idle`、`loading/submitting`、`success`、`failed`，并处理重复提交。

第五，Zustand 可以在组件外通过 `getState()` 和 `setState()` 使用，但不要把它当成随处可写的全局变量。组件内仍然优先使用 hook，组件外只在登出清理、外部事件回调、非 React 逻辑中谨慎使用。

第六，不要把服务端状态无脑复制进 Zustand。如果项目已经使用 React Query，接口数据优先放在 query cache 中。Zustand 更适合保存筛选条件、弹窗状态、当前选中项、临时草稿这类 client state。

第七，TypeScript 类型要先设计清楚。一个 store 同时包含 state 和 actions，建议把它们分开定义，再组合成最终 store 类型，后期会更容易维护。

---

## 11. 总结

Zustand 的使用门槛很低，一个 `create` 就能创建 store，一个 selector 就能在组件里读取状态。但在项目里，真正需要关注的是它的使用边界。

比较稳妥的方式是：把 Zustand 放在客户端状态管理的位置上，用它处理跨组件共享的交互状态；把派生逻辑从组件中抽出来；按业务模块拆 store；异步 action 明确 loading、error 和重复提交；如果涉及服务端数据，则让 React Query 这类工具负责缓存和刷新。

这样写出来的 Zustand 代码不会变成另一个“全局变量仓库”，而是一个围绕业务模块组织的状态层。它的轻量优势也只有在边界清楚时才成立。
