# React Hooks 底层原理深度解析：从数组到链表的魔法

你是否好奇过，为什么 React Hooks 只能在函数组件顶层调用？为什么不能在条件语句、循环或嵌套函数里调用？

这不是 React 团队随便定下的风格规则，而是 Hooks 的底层存储模型决定的。Hooks 的核心机制可以先简单理解为：

> React 按照 Hook 的调用顺序，把状态记录存到组件外部的持久化结构里。下一次渲染时，再按照相同顺序把它们读出来。

这篇文章会从一个最小版 `useState` 开始，用数组模拟 Hooks，再讲为什么调用顺序必须稳定，最后过渡到真实 React 中基于 Fiber 的 Hook 链表和 Dispatcher 机制。

---

## 1. Hooks 的核心规则：为什么顺序如此重要

React Hooks 有一个最基础的规则：

> Hooks 必须在函数组件或自定义 Hook 的顶层调用。

正确写法：

```tsx
function GoodComponent() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('Tom');

  useEffect(() => {
    // ...
  }, []);

  return <div>{count}</div>;
}
```

错误写法：

```tsx
function BadComponent() {
  if (condition) {
    const [count, setCount] = useState(0);
  }

  for (let i = 0; i < 10; i++) {
    const [item, setItem] = useState(i);
  }
}
```

对开发者来说，这表现为两条规则：

- Hooks 必须在函数组件或自定义 Hook 顶层调用。
- 不能在条件分支、循环、嵌套函数中调用，因为这会改变调用序列。

这个规则背后隐藏着 Hooks 的核心机制。要理解它，我们先自己实现一个简化版 `useState`。

---

## 2. 从零实现 useState：数组版本

### 2.1 第一版：只支持一个状态

如果 state 定义在 `useState` 内部，那么每次调用 `useState` 都会重新创建新的 state，状态无法跨渲染持久化。

所以最小模型应该把状态放在“组件函数之外的某个持久化结构”里。

先写一个只支持一个状态的版本：

```ts
let state: unknown;

function useStatex<T>(initialValue: T) {
  if (state === undefined) {
    state = initialValue;
  }

  const setState = (newValue: T) => {
    state = newValue;
    // 真实 React 中这里会触发重新渲染
  };

  return [state as T, setState] as const;
}

function Component() {
  const [count, setCount] = useStatex(1);
  console.log(count);

  setCount(2);
}
```

这个模型能解释一个关键事实：

> Hook 的状态不在组件函数内部，也不在局部变量里，而在 React 管理的外部结构里。

但这个版本有一个致命问题：一个组件只能有一个状态。真实组件显然不止一个 state。

---

### 2.2 第二版：支持多个状态

真实应用里一个组件不止一个 state，因此需要多个槽位。最直观的做法是用数组保存状态，并用索引指向当前 Hook。

```ts
let hooks: unknown[] = [];
let currentHookIndex = 0;

function useStatex<T>(initialValue: T) {
  const hookIndex = currentHookIndex;

  if (hooks[hookIndex] === undefined) {
    hooks[hookIndex] = initialValue;
  }

  const setState = (newValue: T) => {
    hooks[hookIndex] = newValue;
    // 真实 React 中这里会触发重新渲染
  };

  currentHookIndex++;

  return [hooks[hookIndex] as T, setState] as const;
}

function resetIndex() {
  currentHookIndex = 0;
}

function Component() {
  resetIndex();

  const [count, setCount] = useStatex(1);
  const [name, setName] = useStatex('Tom');

  console.log(count, name);

  setCount(2);
  setName('Jerry');

  resetIndex();

  const [newCount] = useStatex(1);
  const [newName] = useStatex('Tom');

  console.log(newCount, newName);
}
```

这个版本里有两个非常关键的点：

- 每次渲染前要 `resetIndex()`。
- `setState` 里必须使用闭包捕获的 `hookIndex`，不能直接用全局的 `currentHookIndex`。

---

## 3. 为什么每次渲染要 resetIndex

这里的多个 state 指的不是“同一个变量在不同时间的状态”，而是“同一个组件里第 1 次、第 2 次、第 3 次调用 Hook API 时产生的状态槽位”。

比如：

```tsx
const [count, setCount] = useStatex(1);
const [name, setName] = useStatex('Tom');
```

这里有两个 Hook 调用：

- 第一个 `useStatex` 对应 `hooks[0]`。
- 第二个 `useStatex` 对应 `hooks[1]`。

你可以把 hooks 数组理解成一个抽屉柜：

```txt
hooks[0] -> count
hooks[1] -> name
hooks[2] -> other state
```

函数组件每次渲染都会从函数顶部重新执行一遍。React 并不会记住你上次执行到哪一行了。

所以每次渲染开始时，读写指针必须回到 0：

```txt
第 1 个 Hook 调用 -> hooks[0]
第 2 个 Hook 调用 -> hooks[1]
第 3 个 Hook 调用 -> hooks[2]
```

如果不 `resetIndex()`，会发生什么？

第一次渲染：

```txt
useStatex(count) -> hooks[0]
useStatex(name)  -> hooks[1]
渲染结束 currentHookIndex = 2
```

第二次渲染如果不重置：

```txt
useStatex(count) 本应读 hooks[0]，但会读 hooks[2]
useStatex(name)  本应读 hooks[1]，但会读 hooks[3]
```

结果就是状态错位。

所以 `resetIndex()` 的本质是：

> 每一轮渲染都从第一个 Hook 开始重新对齐。

真实 React 不是重置一个全局数字，而是把“当前正在处理的 Hook 指针”重置为该 Fiber 上 Hook 链表的头节点。本质是同一个动作：每次渲染从第一个 Hook 开始对齐。

---

## 4. 为什么 setState 必须捕获 hookIndex

`setState` 并不是在 `useStatex` 调用时立刻执行完就结束。它通常会在之后某个时间点执行，比如点击事件、定时器、Promise 回调。

如果 setter 里直接使用全局的 `currentHookIndex`，就会写错槽位。

错误写法：

```ts
function useStatex<T>(initialValue: T) {
  if (hooks[currentHookIndex] === undefined) {
    hooks[currentHookIndex] = initialValue;
  }

  const setState = (newValue: T) => {
    hooks[currentHookIndex] = newValue;
  };

  currentHookIndex++;

  return [hooks[currentHookIndex - 1] as T, setState] as const;
}
```

发生什么？

```txt
第一次 useStatex(count) 结束后 currentHookIndex = 1
第二次 useStatex(name) 结束后 currentHookIndex = 2
此时触发 setCount(2)
setter 看到 currentHookIndex = 2
于是写入 hooks[2]，而不是 hooks[0]
```

正确做法是：在创建 setter 的那一刻，把这个 Hook 的槽位编号保存到局部变量里。

```ts
const hookIndex = currentHookIndex;

const setState = (newValue: T) => {
  hooks[hookIndex] = newValue;
};
```

一句话概括：

- `resetIndex`：保证本次渲染第 i 个 Hook 调用对齐到 `hooks[i]`。
- `hookIndex`：保证这个 setter 永远写回它出生时对应的槽位。

---

## 5. 一个直观类比

把 `hooks` 数组看成“抽屉柜”，`currentHookIndex` 是你现在指到第几个抽屉。

每次渲染就像“从抽屉柜第一格开始依次取东西”，所以必须把手指回到 0。

setter 像“给某个抽屉贴了一个回访地址”。你必须把抽屉编号写在纸条上，也就是 `hookIndex`。否则你回来的时候，手指可能已经指到别的抽屉了。

---

## 6. 实现 useEffect：依赖追踪的艺术

理解了 `useState` 后，可以用类似方式实现一个简化版 `useEffect`。

`useEffect` 的核心是依赖数组比较。它需要记住上一次 deps，并在本次渲染时比较差异。

```ts
let hooks: unknown[] = [];
let currentHookIndex = 0;

function useEffectx(callback: () => void, dependencies?: unknown[]) {
  const hookIndex = currentHookIndex;

  const oldDependencies = hooks[hookIndex] as unknown[] | undefined;

  let hasChanged = true;

  if (oldDependencies && dependencies) {
    hasChanged = dependencies.some((dep, index) => {
      return !Object.is(dep, oldDependencies[index]);
    });
  }

  if (hasChanged) {
    callback();
  }

  hooks[hookIndex] = dependencies;

  currentHookIndex++;
}

function resetIndex() {
  currentHookIndex = 0;
}
```

这个实现展示了 `useEffect` 的核心机制：

```txt
读取旧 deps
  -> 比较新 deps
  -> 如果变化，执行 callback
  -> 保存当前 deps
```

注意：这个示例为了讲原理，把 callback 直接在渲染时执行了。真实 React 不会在 render phase 执行 effect，而是在 commit 之后统一执行。

更准确地说：

- `useEffect` 在浏览器 paint 之后的 effect 阶段执行。
- `useLayoutEffect` 在 paint 之前的 layout 阶段执行。

但是“deps 比较 + 存储 oldDeps”的思想是一样的。

---

## 7. 为什么不能在条件或循环中调用 Hooks

现在可以回答核心问题了。

看下面这个例子：

```tsx
function Bad({ shouldUseHook }: { shouldUseHook: boolean }) {
  resetIndex();

  if (shouldUseHook) {
    useStatex(0);
  }

  const [name] = useStatex('Tom');

  return name;
}
```

第一次渲染，`shouldUseHook = true`：

```txt
useStatex(0)     -> hooks[0]
useStatex('Tom') -> hooks[1]
```

第二次渲染，`shouldUseHook = false`：

```txt
跳过第一个 useStatex
useStatex('Tom') -> hooks[0]
```

于是 `name` 读到的是上次 count 的值。

这不是“可能出错”，而是必然错位。

所以 Hooks 规则不是风格建议，而是 React 底层存储模型决定的必然约束。

根本原因是：

> React 使用调用顺序来追踪每个 Hook 的状态。如果顺序改变，React 无法知道哪个状态对应哪个 Hook。

---

## 8. 真实 React 的实现：Fiber 上的 Hook 链表

上面的数组实现适合理解“按顺序对齐”，但真实 React 不使用全局数组。

真实 React 大致是：

- 每个 Fiber 对应一个组件实例。
- 每个 Fiber 上挂一条 Hook 链表。
- 每次渲染通过指针遍历 Hook 链表。
- Hook 节点里存 `memoizedState`、`queue`、`next` 等信息。

简化的 Hook 节点结构：

```ts
type Hook = {
  memoizedState: unknown;
  queue: UpdateQueue<unknown> | null;
  next: Hook | null;
};
```

组件对应的 Hook 链表可以理解成：

```txt
Hook1 -> Hook2 -> Hook3 -> null
```

数组和链表的差异主要在工程实现与扩展性，比如更新队列管理、节点复用、与 Fiber 架构配合等。

但根约束完全一样：

> 链表也是按调用顺序依次创建和读取节点。

---

## 9. 为什么真实 React 使用链表而不是数组

链表相比数组有几个优势：

- 动态性更好，更适合逐个创建 Hook 节点。
- 不需要预分配空间。
- 更容易和 Fiber 的链式结构协作。
- 方便在渲染过程中通过指针推进当前 Hook。
- 更适合管理每个 Hook 自己的更新队列。

一个非常简化的渲染过程可以理解为：

```ts
function renderWithHooks(Component, props) {
  currentlyRenderingFiber.memoizedState = null;

  const children = Component(props);

  return children;
}
```

首次渲染时，React 创建 Hook 链表。

后续渲染时，React 按相同顺序遍历旧 Hook 链表，计算新状态，并构建 work-in-progress Hook 链表。

---

## 10. Hook 的设计原则

React 团队在设计 Hooks 时遵循两个核心原则。

### 10.1 组合性

Hooks 不应该相互干扰。一个 Hook 不应该阻止另一个 Hook 正常工作。

比如假设存在一个 `useBailout`：

```tsx
function useBailout(shouldRender: () => boolean) {
  if (!shouldRender()) {
    bailout();
  }
}

function Component({ color, count }) {
  useBailout(() => color !== 'red');
  useBailout(() => count < 10);

  return null;
}
```

这个 Hook 会有问题：一个 bailout 可能阻止另一个 bailout 正常工作。

这违反了组合性。

### 10.2 可调试性

当出现 bug 时，应该容易定位问题。

Hooks 如果允许随意改变执行顺序，状态错位会非常难排查。固定调用顺序虽然看起来限制多，但它让 React 的状态模型更可预测。

---

## 11. Hook 与渲染器的协作

一个有趣的问题是：为什么我们从 `react` 包导入 `useState`，但真正更新 DOM 的能力却来自 `react-dom`？

原因是：

> `useState` 更像一个统一入口，真正干活的是当前渲染器提供的 Dispatcher。

概念上，`react` 包里的 `useState` 类似这样：

```ts
function useState(initialState) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
```

而 `react-dom` 会在渲染函数组件之前，设置当前 Dispatcher。

概念上：

```ts
const ReactDOMSharedInternals = {
  H: {
    useState(initialState) {
      return [state, dispatchAction];
    },
    useEffect(callback, deps) {
      // ...
    },
  },
};
```

这就是为什么你从 `react` 导入 `useState`，但它能触发 DOM 更新。

因为渲染时 `react-dom` 把具体实现临时注入进来了，`react` 的 `useState` 只是一个入口壳。

---

## 12. 为什么 React 要分 react 和 renderer

React 生态里有多个目标平台：

- Web 使用 `react-dom` 把结果变成 DOM。
- Native 使用 `react-native` 把结果变成原生 UI。
- 还有各种自定义 renderer。

所以 React 拆成两层：

- `react`：提供统一 API 和规则，比如 `useState`、`useEffect`。
- renderer：负责具体平台的渲染、调度、提交更新，比如 DOM 操作、native bridge。

如果 `react` 自己写死 DOM 逻辑，就没法同时支持 React Native。

---

## 13. Dispatcher 是什么

Dispatcher 可以理解成：

> 当前这一轮渲染中，Hooks 该走哪套真实实现的指挥台。

它概念上像一个对象：

```ts
const dispatcher = {
  useState,
  useEffect,
  useMemo,
  useRef,
};
```

`react` 包里的 `useState` 并不直接做状态管理，它只是：

1. 读取当前 Dispatcher。
2. 调用 `dispatcher.useState(...)`。

为什么需要“当前”？

因为 Hook 在不同阶段实现不同：

- 首次渲染 mount：要创建 Hook 节点、初始化 state、建立队列。
- 更新渲染 update：要读取旧 Hook、合并更新、算出新 state。

所以渲染器在调用你的组件函数前，会把当前 Dispatcher 指向 mount dispatcher 或 update dispatcher。

渲染结束后，再把它清空，防止你在组件外乱用 Hooks。

---

## 14. 从 createRoot 到 useState 的流程

流程可以简化理解成这样：

```txt
createRoot(...).render(<App />)
  -> react-dom 启动渲染
  -> 准备执行函数组件 App
  -> 设置 ReactCurrentDispatcher.current
  -> 执行 App()
  -> App 内部调用 useState(0)
  -> react 的 useState 读取当前 dispatcher
  -> 转发给 react-dom 提供的真实实现
  -> 创建或读取 Hook 节点
  -> 返回 state 和 dispatch
  -> 后续 dispatch 触发更新调度
```

所以你感觉 `useState` 是从 `react` 导入的，却能更新 DOM，本质原因是：

> 渲染器在渲染前设置了 Dispatcher，react 只是把 Hook 调用转发给当前渲染器。

---

## 15. 一个类比

可以这样类比：

- `react` 是插座标准：规定接口长什么样，用电规则是什么。
- `react-dom` 是发电站和线路：真正供电、调度、更新 DOM。
- Dispatcher 是当前插座背后的接线：这一刻到底连到哪套供电系统。

你调用 `useState` 能触发页面更新，不是因为 `react` 自己会操作 DOM，而是因为背后的 `react-dom` 在工作。

同一套 Hooks API：

- 在 Web 上最终更新 DOM。
- 在 React Native 上最终更新原生控件。
- 在自定义 renderer 上执行对应平台的更新。

这就是“Hooks 属于 React 抽象层，但最终行为由渲染器决定”。

---

## 16. 总结：Hooks 的设计哲学

Hooks 的本质是：

> React 在渲染组件时，按固定调用顺序把 Hook 数据存入 React 管理的持久化结构，并在下次渲染按相同顺序取出。

通过简化实现，我们可以理解 React Hooks 的核心机制：

- **状态存储**：Hooks 状态不在函数局部变量里，而在组件外部的 Fiber 节点中。
- **顺序依赖**：React 通过调用顺序来追踪状态。
- **闭包捕获**：setter 需要捕获自己的 Hook 槽位或节点。
- **依赖比较**：`useEffect` 通过保存旧 deps 并比较新 deps 决定是否执行。
- **链表结构**：真实 React 使用 Fiber 上的 Hook 链表，而不是全局数组。
- **Dispatcher 转发**：`react` 提供 Hook API，具体实现由当前 renderer 注入。
- **设计原则**：组合性和可调试性指导了 Hook 的 API 设计。

因此：

- 调用顺序必须稳定。
- Hooks 不能写在条件、循环、嵌套函数里。
- `useState` 和 `useEffect` 之所以像魔法，是因为 React 在函数外维护了持久化结构和调度系统。
- Dispatcher 让同一套 Hooks API 可以跨渲染器复用。

React Hooks 的设计体现了 React 的核心取舍：提供强大的抽象，同时保持规则简单、行为可预测。理解这些底层原理后，再看 Hooks 的使用规则，就不会觉得它们是限制，而是 React 正确对齐状态的必要条件。
