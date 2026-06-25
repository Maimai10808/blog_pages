# Zustand 入门教程：React 状态管理从本地状态到全局 Store

在 React 项目中，我们经常会遇到状态共享的问题。

一开始，使用 `useState` 就能解决大部分需求：

```tsx
const [count, setCount] = useState(0);
```

但随着项目变复杂，不同组件之间都需要访问同一份状态时，单纯依赖 `useState` 和 props 传递就会变得很麻烦。

这时候，就需要状态管理库。

本文将介绍一个非常轻量、好用、上手快的 React 状态管理库：

```text
Zustand
```

通过本文，你将学会：

```text
1. React 为什么需要状态管理
2. Zustand 是什么
3. 如何创建一个 Zustand Store
4. 如何在组件中读取 Store 状态
5. 如何修改 Store 状态
6. 如何处理异步 action
7. 如何在组件外访问和修改 Store
8. Zustand 的两个重要最佳实践
```

---

## 一、React 中的状态有什么问题？

React 中最基础的状态管理方式是 `useState`。

例如：

```tsx
import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return <div>{count}</div>;
}
```

这个 `count` 状态只属于当前组件。

也就是说，它是一个 **局部状态**。

如果另一个组件也想使用这个 `count`，就必须通过 props 传递。

例如：

```tsx
function App() {
  const [count, setCount] = useState(0);

  return <OtherComponent count={count} />;
}

function OtherComponent({ count }: { count: number }) {
  return <div>{count}</div>;
}
```

这种方式在小项目中没问题。

但如果组件层级变深，就会出现问题。

例如：

```text
App
 └── Layout
      └── Sidebar
           └── UserPanel
                └── UserInfo
```

如果最底层的 `UserInfo` 需要使用最上层的状态，就需要一层层传 props。

这就是常说的：

```text
props drilling
```

也就是 props 层层传递。

---

## 二、Context API 不够吗？

React 自带 Context API，可以解决部分 props drilling 问题。

例如：

```tsx
const CountContext = createContext(0);
```

然后用 Provider 包裹组件树：

```tsx
<CountContext.Provider value={count}>
  <App />
</CountContext.Provider>
```

子组件再通过 `useContext` 读取。

这种方式确实能解决一些全局共享问题。

但 Context 也有一些限制：

```text
需要 Provider 包裹
状态多了以后 Provider 容易嵌套很多层
频繁更新的状态可能导致性能问题
大型项目中维护成本会变高
```

所以当应用变复杂时，我们通常会引入专门的状态管理库。

Zustand 就是一个非常适合 React 项目的轻量状态管理方案。

---

## 三、什么是 Zustand？

Zustand 是一个 React 状态管理库。

它可以让我们在组件外创建一份全局状态，然后在任意组件中读取和修改它。

它的特点是：

```text
API 简单
不需要 Provider
样板代码少
支持 TypeScript
支持同步和异步 action
可以在组件外访问 Store
性能控制比较灵活
```

用一句话理解：

**Zustand 让我们可以把状态放到组件外部，然后让任意组件按需订阅这份状态。**

---

## 四、安装 Zustand

先安装 Zustand：

```bash
npm install zustand
```

或者：

```bash
pnpm add zustand
```

安装完成后，就可以在项目中创建 Store。

---

## 五、创建第一个 Store

我们先创建一个计数器 Store。

在 `src` 目录下新建：

```text
src/store.ts
```

然后写入：

```ts
import { create } from "zustand";

type CounterStore = {
  count: number;
};

export const useCounterStore = create<CounterStore>(() => ({
  count: 0,
}));
```

这就是一个最基础的 Zustand Store。

核心代码是：

```ts
create<CounterStore>(() => ({
  count: 0,
}));
```

它做了几件事：

```text
1. 使用 create 创建 Store
2. 使用 TypeScript 定义 Store 类型
3. 设置初始状态 count: 0
4. 返回一个可以在 React 组件中使用的 Hook
```

注意这里的命名：

```ts
useCounterStore;
```

它以 `use` 开头。

这是因为 Zustand 创建出来的 Store 本质上就是一个自定义 Hook。

所以我们可以直接在 React 组件中使用它。

---

## 六、在组件中读取 Zustand 状态

现在我们可以在组件中读取 `count`。

```tsx
import { useCounterStore } from "./store";

export default function App() {
  const count = useCounterStore((state) => state.count);

  return <div>Count: {count}</div>;
}
```

这里最重要的是：

```tsx
const count = useCounterStore((state) => state.count);
```

`useCounterStore` 接收一个函数。

这个函数叫做 selector。

它的作用是：

```text
从整个 Store 中选择当前组件需要的那一部分状态
```

这里我们只选择了：

```ts
state.count;
```

所以当前组件只关心 `count`。

当 `count` 变化时，组件会重新渲染。

如果 Store 中其他状态变化，而 `count` 没变，当前组件就不会因为那些无关状态而重新渲染。

这是 Zustand 性能优化中很重要的一点。

---

## 七、添加修改状态的方法

目前 Store 只有 `count`，但还不能修改它。

我们可以在 Store 中添加两个 action：

```text
increment
decrement
```

先补充类型：

```ts
type CounterStore = {
  count: number;
  increment: () => void;
  decrement: () => void;
};
```

然后实现 Store：

```ts
import { create } from "zustand";

type CounterStore = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () =>
    set({
      count: 1,
    }),
  decrement: () =>
    set({
      count: -1,
    }),
}));
```

这里的 `set` 是 Zustand 提供的更新状态函数。

我们可以通过它修改 Store 中的状态。

不过上面只是临时写法。

因为它每次都会把 `count` 写死成 `1` 或 `-1`。

真正的计数器应该基于旧状态更新。

---

## 八、基于旧状态更新 Store

Zustand 的 `set` 不仅可以接收对象，也可以接收函数。

函数形式可以拿到旧状态。

```ts
increment: () =>
  set((state) => ({
    count: state.count + 1,
  })),
decrement: () =>
  set((state) => ({
    count: state.count - 1,
  })),
```

完整代码：

```ts
import { create } from "zustand";

type CounterStore = {
  count: number;
  increment: () => void;
  decrement: () => void;
};

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
  decrement: () =>
    set((state) => ({
      count: state.count - 1,
    })),
}));
```

这和 React 的函数式更新类似：

```tsx
setCount((prev) => prev + 1);
```

这样可以保证每次更新都基于最新状态。

---

## 九、在组件中调用 action

现在我们可以在组件中读取 `increment` 和 `decrement`。

```tsx
import { useCounterStore } from "./store";

export default function App() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div>
      <h1>Count: {count}</h1>

      <button onClick={increment}>Increment</button>

      <button onClick={decrement}>Decrement</button>
    </div>
  );
}
```

点击 `Increment`，`count` 加 1。

点击 `Decrement`，`count` 减 1。

这里有一个非常重要的点：

**读取状态和修改状态可以发生在不同组件中。**

例如：

```tsx
function CountDisplay() {
  const count = useCounterStore((state) => state.count);

  return <h1>Count: {count}</h1>;
}

function CountButtons() {
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);

  return (
    <div>
      <button onClick={increment}>Increment</button>
      <button onClick={decrement}>Decrement</button>
    </div>
  );
}
```

`CountDisplay` 负责展示。

`CountButtons` 负责修改。

它们不需要通过 props 传递状态。

只要都使用同一个 Store，就可以保持同步。

这就是 Zustand 解决全局状态共享问题的核心能力。

---

## 十、Zustand 中的异步 action

实际项目中，很多状态更新都不是同步的。

比如：

```text
请求接口
等待后端返回数据
再把数据写入 Store
```

Zustand 对异步 action 支持非常简单。

我们添加一个异步方法：

```ts
incrementAsync: () => Promise<void>;
```

完整类型：

```ts
type CounterStore = {
  count: number;
  increment: () => void;
  decrement: () => void;
  incrementAsync: () => Promise<void>;
};
```

实现：

```ts
export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
  decrement: () =>
    set((state) => ({
      count: state.count - 1,
    })),
  incrementAsync: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    set((state) => ({
      count: state.count + 1,
    }));
  },
}));
```

这里模拟了一个 1 秒延迟。

点击按钮后，等待 1 秒，再把 `count` 加 1。

组件中使用：

```tsx
const incrementAsync = useCounterStore((state) => state.incrementAsync);

<button onClick={incrementAsync}>Increment Async</button>;
```

这说明 Zustand 不需要额外中间件就能处理异步逻辑。

只要你的数据准备好了，调用 `set` 即可。

---

## 十一、真实接口请求中的写法

如果是请求后端接口，可以这样写：

```ts
type UserStore = {
  user: User | null;
  fetchUser: () => Promise<void>;
};

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  fetchUser: async () => {
    const response = await fetch("/api/user");
    const data = await response.json();

    set({
      user: data,
    });
  },
}));
```

Zustand 不关心你是从哪里拿到数据的。

可以是：

```text
fetch
axios
React Query 回调
WebSocket
MQTT
SSE
localStorage
```

只要最终调用 `set`，Store 就会更新，订阅对应状态的组件也会重新渲染。

---

## 十二、在组件外读取 Store

Zustand 还有一个很实用的能力：

**可以在 React 组件外读取 Store。**

因为 `useCounterStore` 不只是 Hook，它也带了一些静态方法。

例如：

```ts
useCounterStore.getState();
```

我们可以写一个普通函数：

```ts
import { useCounterStore } from "./store";

function logCount() {
  const count = useCounterStore.getState().count;

  console.log(count);
}
```

这个函数不是 React 组件，也没有使用 Hook 调用规则。

因为这里不是：

```ts
useCounterStore((state) => state.count);
```

而是：

```ts
useCounterStore.getState();
```

这种写法可以用于：

```text
普通工具函数中读取状态
请求拦截器中读取 token
WebSocket 回调中读取当前用户信息
事件处理模块中读取全局配置
非 React 代码中访问 Store
```

---

## 十三、在组件外修改 Store

不仅可以读取，也可以修改。

使用：

```ts
useCounterStore.setState();
```

例如：

```ts
function setCountToOne() {
  useCounterStore.setState({
    count: 1,
  });
}
```

然后在组件中调用：

```tsx
import { useEffect } from "react";

export default function App() {
  const count = useCounterStore((state) => state.count);

  useEffect(() => {
    setCountToOne();
  }, []);

  return <div>Count: {count}</div>;
}
```

页面挂载后，`setCountToOne` 会把 Store 中的 `count` 改成 `1`。

因为组件订阅了 `count`，所以组件会自动重新渲染。

这说明 Zustand 的 Store 和 React 组件生命周期可以很好地协作。

---

## 十四、组件外操作 Store 的典型场景

在实际项目中，组件外操作 Store 很常见。

例如用户 Store：

```ts
export const useUserStore = create<UserState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));
```

在 fetcher 中读取 token：

```ts
import { useUserStore } from "@/store/userStore";

export async function request(url: string) {
  const token = useUserStore.getState().token;

  return fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });
}
```

在 MQTT 或 WebSocket 回调中写入状态：

```ts
mqttClient.on("message", (payload) => {
  useMarketStore.getState().upsertThumb(payload);
});
```

这种能力非常适合：

```text
请求封装
WebSocket / MQTT
SSE
全局事件总线
工具函数
非 React 生命周期代码
```

---

## 十五、最佳实践一：Selector 要尽量具体

使用 Zustand 时，不推荐这样写：

```tsx
const state = useCounterStore((state) => state);
const { count } = state;
```

虽然这样也能拿到 `count`，但它会让组件订阅整个 Store。

问题是：

```text
只要 Store 中任何字段变化，当前组件都可能重新渲染
```

如果 Store 很大，例如：

```ts
{
  (count, user, token, theme, language, loading, list, modalOpen);
}
```

那么组件只需要 `count`，却可能因为 `theme` 或 `modalOpen` 改变而重新渲染。

更推荐：

```tsx
const count = useCounterStore((state) => state.count);
```

这样组件只订阅 `count`。

只有 `count` 变化时才会重新渲染。

对于 action 也是一样：

```tsx
const increment = useCounterStore((state) => state.increment);
```

而不是一次性取整个 Store。

---

## 十六、为什么 selector 影响性能？

Zustand 会根据 selector 返回值判断组件是否需要更新。

例如：

```tsx
const count = useCounterStore((state) => state.count);
```

这个组件监听的是：

```text
count
```

只有 `count` 变了，它才更新。

但如果写成：

```tsx
const store = useCounterStore((state) => state);
```

这个组件监听的是整个 state 对象。

只要任何状态更新，整个对象引用发生变化，组件就可能重新渲染。

所以在 Zustand 中，selector 写得越精准，组件更新就越可控。

---

## 十七、最佳实践二：按功能拆分 Store

不要把所有状态都放进一个巨大的 Store。

不推荐：

```ts
type AppStore = {
  count: number;
  user: User | null;
  token: string | null;
  theme: string;
  cart: CartItem[];
  products: Product[];
  messages: Message[];
  notifications: Notification[];
};
```

这种 Store 会越来越大，最后变得很难维护。

更推荐按业务功能拆分：

```text
counterStore
authStore
userStore
cartStore
themeStore
marketStore
notificationStore
```

例如：

```ts
// counterStore.ts
export const useCounterStore = create<CounterStore>()(...);

// userStore.ts
export const useUserStore = create<UserStore>()(...);

// marketStore.ts
export const useMarketStore = create<MarketStore>()(...);
```

这样每个 Store 只负责自己的业务领域。

例如：

```text
counterStore：计数器状态
userStore：登录态、用户信息
marketStore：行情数据
themeStore：主题设置
cartStore：购物车数据
```

这样有几个好处：

```text
模块更清晰
文件更容易维护
组件只导入自己需要的 Store
状态边界更明确
降低不必要重渲染风险
团队协作更方便
```

---

## 十八、完整示例：Counter Store

下面是一个完整的 Zustand 计数器 Store：

```ts
import { create } from "zustand";

type CounterStore = {
  count: number;
  increment: () => void;
  decrement: () => void;
  incrementAsync: () => Promise<void>;
};

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
  decrement: () =>
    set((state) => ({
      count: state.count - 1,
    })),
  incrementAsync: async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    set((state) => ({
      count: state.count + 1,
    }));
  },
}));
```

---

## 十九、完整示例：组件中使用 Store

```tsx
import { useCounterStore } from "./store";

export default function App() {
  const count = useCounterStore((state) => state.count);
  const increment = useCounterStore((state) => state.increment);
  const decrement = useCounterStore((state) => state.decrement);
  const incrementAsync = useCounterStore((state) => state.incrementAsync);

  return (
    <main>
      <h1>Count: {count}</h1>

      <button onClick={increment}>Increment</button>

      <button onClick={decrement}>Decrement</button>

      <button onClick={incrementAsync}>Increment Async</button>
    </main>
  );
}
```

这个例子包含了：

```text
读取状态
同步更新状态
异步更新状态
组件订阅 Store
点击按钮触发 action
```

---

## 二十、完整示例：组件外读取和修改 Store

```ts
import { useCounterStore } from "./store";

export function logCount() {
  const count = useCounterStore.getState().count;

  console.log("current count:", count);
}

export function setCountToOne() {
  useCounterStore.setState({
    count: 1,
  });
}
```

在组件中调用：

```tsx
import { useEffect } from "react";
import { useCounterStore } from "./store";
import { logCount, setCountToOne } from "./counterActions";

export default function App() {
  const count = useCounterStore((state) => state.count);

  useEffect(() => {
    logCount();
    setCountToOne();
  }, []);

  return <div>Count: {count}</div>;
}
```

这说明 Zustand 不仅可以在组件里用，也可以和普通 TypeScript 函数配合使用。

---

## 二十一、Zustand 和 useState 的区别

`useState` 适合组件内部状态。

例如：

```text
输入框临时值
弹窗开关
hover 状态
局部 loading
当前组件内部 tab
```

Zustand 适合跨组件共享状态。

例如：

```text
登录用户信息
全局主题
购物车
行情数据
通知消息
多组件共享的筛选条件
WebSocket 推送数据
```

可以这样判断：

```text
只有当前组件用：useState
多个远距离组件共享：Zustand
需要组件外访问：Zustand
需要全局事件或请求模块访问：Zustand
```

---

## 二十二、Zustand 和 Context 的区别

Context 适合低频变化的全局配置。

例如：

```text
主题
语言
依赖注入
权限配置
```

Zustand 更适合频繁变化、结构化的全局状态。

例如：

```text
计数器
购物车
用户状态
交易行情
WebSocket 数据
复杂业务状态
```

Context 通常需要 Provider。

Zustand 不需要 Provider，直接创建 Store 后在组件中使用即可。

---

## 二十三、常见踩坑点

### 1. 把所有状态塞进一个 Store

不推荐创建一个万能 Store。

这样会让状态边界混乱，也会提高维护成本。

更好的方式是按功能拆分。

---

### 2. selector 返回整个 state

不推荐：

```tsx
const state = useStore((state) => state);
```

推荐：

```tsx
const count = useStore((state) => state.count);
```

组件需要什么，就订阅什么。

---

### 3. 忘记基于旧状态更新

不推荐：

```ts
increment: () => set({ count: count + 1 });
```

因为这里的 `count` 可能不是最新值。

推荐：

```ts
increment: () =>
  set((state) => ({
    count: state.count + 1,
  }));
```

---

### 4. 把所有异步逻辑都写在组件里

如果某个异步操作本质上是在更新 Store，可以放到 Store 的 action 中。

例如：

```ts
fetchUser: async () => {
  const res = await fetch("/api/user");
  const data = await res.json();
  set({ user: data });
};
```

这样组件更干净。

---

### 5. 滥用全局状态

不是所有状态都应该放进 Zustand。

例如：

```text
表单单个输入框值
临时展开状态
纯组件内部 UI 状态
```

这些仍然适合放在 `useState` 中。

全局状态不是越多越好。

---

## 二十四、在你的项目中怎么用？

结合你之前做的交易平台项目，可以这样拆 Store：

```text
userStore：token、userInfo、isLogin、pricing
marketStore：thumbMap、plateMap、tradeMap
themeStore：主题配置
orderStore：当前下单面板状态
notificationStore：全局通知消息
```

例如 `userStore` 负责登录态：

```ts
type UserStore = {
  token: string | null;
  isLogin: boolean;
  setToken: (token: string) => void;
  logout: () => void;
};
```

`marketStore` 负责行情：

```ts
type MarketStore = {
  thumbMap: Record<string, MarketThumb>;
  upsertThumb: (thumb: MarketThumb) => void;
};
```

这样拆分后，项目结构会更清晰：

```text
store/
  userStore.ts
  marketStore.ts
  themeStore.ts
  orderStore.ts
```

---

## 二十五、总结

Zustand 是一个轻量但非常实用的 React 状态管理库。

它解决的核心问题是：

```text
多个组件之间共享状态
避免 props drilling
避免复杂 Provider 嵌套
让组件外代码也能访问状态
```

创建 Store 的基本写法：

```ts
import { create } from "zustand";

type CounterStore = {
  count: number;
  increment: () => void;
};

export const useCounterStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () =>
    set((state) => ({
      count: state.count + 1,
    })),
}));
```

组件中使用：

```tsx
const count = useCounterStore((state) => state.count);
const increment = useCounterStore((state) => state.increment);
```

异步 action：

```ts
fetchData: async () => {
  const res = await fetch("/api/data");
  const data = await res.json();

  set({
    data,
  });
};
```

组件外访问：

```ts
useCounterStore.getState();
useCounterStore.setState();
```

最重要的两个最佳实践：

```text
1. selector 要尽量具体，只订阅组件真正需要的状态
2. Store 要按功能拆分，不要做成一个巨大的全局 Store
```

一句话总结：

**Zustand 让 React 全局状态管理变得非常简单：用 create 创建 Store，用 selector 读取状态，用 set 修改状态，并通过按需订阅和模块拆分保持项目可维护。**
