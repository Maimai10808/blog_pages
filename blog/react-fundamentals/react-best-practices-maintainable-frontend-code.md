# React 最佳实践：从“能写组件”到“写出可维护的前端代码”

现在学习 React，已经不只是会写 `useState`、会拆组件、会调接口就够了。真正的 React 开发能力，更多体现在你是否能写出结构清晰、可复用、可维护、可扩展的代码。

很多时候，初级开发和高级开发的区别，不在于会不会写某个 API，而在于面对一个业务模块时，能不能判断：

哪些逻辑应该抽出去？
哪些组件应该保持简单？
哪些状态应该放在组件里？
哪些数据应该放在 URL 里？
哪些地方不该写死？
哪些地方不该过度封装？

这篇文章结合一个 Todo App 示例，总结 React 项目中比较重要的一些最佳实践。

---

## 一、不要把业务值硬编码在组件里

很多 React 项目一开始都很简单，比如一个 Todo App，用户可以添加、删除、完成待办事项。

假设产品规定：未登录用户最多只能添加 3 条 Todo。

很多人可能会直接这样写：

```tsx
if (todos.length >= 3 && !isAuthenticated) {
  alert("You need to sign in to add more than 3 todos");
  return;
}
```

这段代码能跑，但问题是 `3` 被硬编码在组件内部了。

这种数字通常被称为 magic number，也就是“魔法数字”。它的问题在于：短期看没什么，长期维护会很麻烦。

如果以后产品说：“免费用户可以添加 10 条了”，你就要去组件里到处找这个 `3`。如果多个地方都写了 `3`，还可能漏改。

更好的做法是把这些业务常量抽出来：

```ts
export const MAX_FREE_TODOS = 3;
```

然后在组件中使用：

```tsx
if (todos.length >= MAX_FREE_TODOS && !isAuthenticated) {
  alert(`You need to sign in to add more than ${MAX_FREE_TODOS} todos`);
  return;
}
```

这样做有两个好处。

第一，业务规则集中管理。
第二，后续修改时只需要改一个地方。

类似的还有敏感词列表、分页数量、默认配置、最小金额、最大金额等，都不建议散落在组件内部。

例如：

```ts
export const SENSITIVE_WORDS = ["password", "credit card"];
```

然后组件里只负责使用：

```tsx
const hasSensitiveWord = SENSITIVE_WORDS.some((word) => content.includes(word));
```

组件应该关注 UI 和交互，而不是堆满各种散乱的业务常量。

---

## 二、常量、工具函数、类型要有固定位置

一个 React 项目常见的目录结构可以这样组织：

```text
src/
  components/
    Header/
    Sidebar/
    TodoList/
    Button.tsx

  contexts/
    TodoContext.tsx

  lib/
    constants.ts
    utils.ts
    hooks.ts
    types.ts
```

其中：

```text
constants.ts：放固定业务常量
utils.ts：放普通工具函数
hooks.ts：放自定义 Hooks
types.ts：放 TypeScript 类型
components：放组件
contexts / stores：放状态管理相关代码
```

目录结构没有唯一标准，不同团队可以有不同习惯。

真正重要的是两点：

第一，结构要一致。
第二，新人一看能大概知道东西应该放在哪里。

如果是小项目，可以简单一点；如果项目变大，可以再按功能继续拆分。

例如：

```text
components/
  Header/
    Header.tsx
    Logo.tsx

  Auth/
    LoginButton.tsx
    RegisterButton.tsx

  Todo/
    TodoList.tsx
    TodoItem.tsx
    AddTodoForm.tsx
```

不要为了“高级”而过度设计目录结构。目录结构的本质是服务维护，而不是制造复杂度。

---

## 三、该拆组件就拆组件，不要害怕组件多

React 的核心思想就是组件化。

组件并不一定非要复用才值得拆。有些组件只使用一次，也依然值得拆，因为它可以让代码更清晰。

例如 App 组件里原本可能有一大段背景标题：

```tsx
<h1 className="...">Todo App</h1>
```

你可以把它拆成：

```tsx
<BackgroundHeading />
```

虽然这个组件只用了一次，但它让 App 的结构变得更清楚：

```tsx
function App() {
  return (
    <>
      <BackgroundHeading />
      <Header />
      <main>
        <TodoList />
        <Sidebar />
      </main>
      <Footer />
    </>
  );
}
```

这样一眼就能看出页面由哪些部分组成。

组件拆分通常有两个理由：

第一，为了复用。
比如 Button、Input、Modal、Card 这类组件。

第二，为了组织代码。
比如 Header、Sidebar、Footer、TodoList 这类组件，即使只用一次，也能提升可读性。

好的组件拆分，会让父组件更像一个页面结构说明，而不是一堆混乱的 JSX。

---

## 四、避免不必要的 div

很多人在写组件时习惯性包一层 `div`：

```tsx
function Button() {
  return (
    <div>
      <button>Click me</button>
    </div>
  );
}
```

如果这层 `div` 没有实际意义，就应该删掉：

```tsx
function Button() {
  return <button>Click me</button>;
}
```

React 组件不要求必须返回 `div`，它可以直接返回任意合法元素。

还有一种常见情况是条件渲染时需要返回多个元素：

```tsx
{
  isAuthenticated ? (
    <Button>Logout</Button>
  ) : (
    <div>
      <Button>Login</Button>
      <Button>Register</Button>
    </div>
  );
}
```

这时如果只是为了包住多个元素，不需要真实 DOM 节点，可以用 Fragment：

```tsx
{
  isAuthenticated ? (
    <Button>Logout</Button>
  ) : (
    <>
      <Button>Login</Button>
      <Button>Register</Button>
    </>
  );
}
```

不必要的 `div` 会带来两个问题。

第一，会污染 DOM 结构。
第二，可能破坏布局。

特别是当父元素使用 flex、grid、gap、space-y 等布局样式时，多加一层 `div` 很容易导致样式失效。

需要真实布局容器时可以用 `div`，不需要时优先用 Fragment。

---

## 五、不要把布局样式写进可复用组件里

这是 React 项目中非常常见的坑。

假设你有一个可复用的标题组件：

```tsx
function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-4xl font-bold">{children}</h1>;
}
```

然后你在某个页面发现标题下面距离太近，于是在 H1 组件里加了 margin：

```tsx
function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-4xl font-bold mb-28">{children}</h1>;
}
```

这样当前页面看起来好了，但其他所有使用 H1 的地方都会受到影响。

这就是把布局样式写进了可复用组件。

可复用组件应该关注自身样式，比如字体、颜色、圆角、边框、尺寸等；而外部间距、位置关系、布局方式，应该由使用它的地方决定。

更好的做法是让组件支持 `className`：

```tsx
function H1({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <h1 className={cn("text-4xl font-bold", className)}>{children}</h1>;
}
```

使用时按需添加：

```tsx
<H1 className="mb-28">Events in Austin</H1>
```

这样只影响当前实例，不影响其他地方。

如果不用 `className`，也可以加一层一次性布局容器：

```tsx
<div className="mb-28">
  <H1>Events in Austin</H1>
</div>
```

原则是：可复用组件不要擅自决定自己和外部元素之间的距离。

---

## 六、建议使用 TypeScript

在现代 React 项目里，TypeScript 基本已经成为默认选择。

它的价值不只是“类型安全”，更重要的是能让组件使用方式更清晰。

例如一个 Button 组件：

```tsx
type ButtonProps = {
  buttonType?: "primary" | "secondary";
  onClick: () => void;
  children: React.ReactNode;
};

function Button({ buttonType = "primary", onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}
```

这里 `buttonType` 只能是 `'primary'` 或 `'secondary'`。

如果你写错：

```tsx
<Button buttonType="second">Login</Button>
```

TypeScript 会直接提示错误。

这对团队协作非常重要。因为其他人使用你的组件时，不需要去组件内部猜它支持哪些 props，编辑器会直接提示。

在 React 项目中，TypeScript 最常用的地方包括：

```text
组件 Props
useState 状态类型
接口返回数据类型
工具函数参数和返回值
Context / Store 类型
```

不一定要一开始就成为 TypeScript 高手，但至少应该掌握组件 props、状态、接口数据这些常见类型写法。

---

## 七、让组件保持“傻”，不要让它知道太多业务

所谓“傻组件”，不是贬义，而是指组件应该尽量简单、通用、少知道业务细节。

例如你有一个进度条组件，用来显示 Todo 完成进度。

不推荐这样写：

```tsx
function StatusBar({ todos }: { todos: Todo[] }) {
  const width =
    (todos.filter((todo) => todo.isCompleted).length / todos.length) * 100;

  return <div style={{ width: `${width}%` }} />;
}
```

这个组件现在强依赖 `todos`。它只能用于 Todo 完成进度，不能用于加载进度、页面切换进度或其他进度场景。

更好的做法是让它只接收一个通用的百分比：

```tsx
function StatusBar({ progress }: { progress: number }) {
  return <div style={{ width: `${progress}%` }} />;
}
```

至于 Todo 完成百分比，应该在更上层计算：

```tsx
const completedPercentage =
  (todos.filter((todo) => todo.isCompleted).length / todos.length) * 100;

<StatusBar progress={completedPercentage} />;
```

这样 StatusBar 就变成了一个更通用的组件。

原则是：
越底层、越可复用的组件，越应该简单。
具体业务逻辑应该放在更靠近业务状态的位置。

---

## 八、避免无意义的 Prop Drilling

Prop Drilling 指的是一个 prop 从父组件传给子组件，再传给孙组件，中间组件自己并不使用，只是负责转交。

例如：

```tsx
<App>
  <Sidebar setTodos={setTodos} />
</App>
```

然后 Sidebar 再传给 AddTodoForm：

```tsx
function Sidebar({ setTodos }) {
  return <AddTodoForm setTodos={setTodos} />;
}
```

Sidebar 自己并不需要 `setTodos`，它只是中转。这会让组件变复杂，也让结构变脆弱。

一种解决办法是使用 Context、Zustand、Redux 等状态管理方案。

但小型场景下，也可以使用 children pattern。

例如：

```tsx
<Sidebar>
  <AddTodoForm onAddTodo={handleAddTodo} />
  <Button>Login</Button>
  <Button>Register</Button>
</Sidebar>
```

Sidebar 只负责布局：

```tsx
function Sidebar({ children }: { children: React.ReactNode }) {
  return <aside>{children}</aside>;
}
```

这样 `AddTodoForm` 可以直接拿到它真正需要的 prop，不需要 Sidebar 做中转。

这种方式可以减少无意义的 prop 传递，也能让布局组件更纯粹。

---

## 九、不要直接把 setState 传来传去

很多初学者会直接把 `setTodos` 传给子组件：

```tsx
<AddTodoForm setTodos={setTodos} />
```

然后在子组件里写具体更新逻辑：

```tsx
setTodos((prev) => [
  ...prev,
  {
    id: prev.length + 1,
    content,
    isCompleted: false,
  },
]);
```

这能跑，但不是一个很好的结构。

因为添加 Todo 可能不只是更新列表，还可能包括：

```text
校验内容
弹出提示
关闭弹窗
记录埋点
触发 Toast
更新其他状态
```

如果这些逻辑都放在 AddTodoForm 里，这个表单组件就会知道太多业务细节。

更好的做法是在父组件中定义一个业务 handler：

```tsx
function handleAddTodo(content: string) {
  setTodos((prev) => [
    ...prev,
    {
      id: prev.length + 1,
      content,
      isCompleted: false,
    },
  ]);

  // 其他业务逻辑也可以放在这里
}
```

然后传给子组件：

```tsx
<AddTodoForm onAddTodo={handleAddTodo} />
```

子组件只负责在表单提交时通知外部：

```tsx
function AddTodoForm({ onAddTodo }: { onAddTodo: (content: string) => void }) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onAddTodo(content);
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

这样 AddTodoForm 不需要知道 Todo 是怎么被添加的，也不需要知道父组件有哪些状态。

它只暴露一个事件：`onAddTodo`。

这和原生元素的设计类似：

```tsx
<button onClick={handleClick}>Click</button>
<input onChange={handleChange} />
```

自定义组件也可以遵循这种命名习惯：

```tsx
<AddTodoForm onAddTodo={handleAddTodo} />
<Button onClick={handleLogin}>Login</Button>
```

组件内部触发事件，外部决定具体做什么。

---

## 十、更新状态依赖旧状态时，使用函数式更新

React 的 `setState` 有两种常见写法。

第一种：

```tsx
setCount(count + 1);
```

第二种：

```tsx
setCount((prev) => prev + 1);
```

当新状态依赖旧状态时，推荐使用第二种。

例如添加 Todo：

```tsx
setTodos((prev) => [
  ...prev,
  {
    id: prev.length + 1,
    content,
    isCompleted: false,
  },
]);
```

这样不需要依赖外部的 `todos` 变量，也可以避免闭包、批量更新等场景下的潜在问题。

尤其在这些场景中更应该用函数式更新：

```text
计数器 +1 / -1
数组新增 / 删除 / 修改
对象基于旧值更新
setTimeout / setInterval 中更新状态
连续多次 setState
```

记住一个原则：
只要新状态需要用到旧状态，就优先写成函数式更新。

---

## 十一、复杂状态不要拆成一堆 boolean

比如请求数据时，很多人会写：

```tsx
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
```

这很容易出现矛盾状态。

例如 `isLoading` 和 `isSuccess` 同时为 true，逻辑就混乱了。

更好的方式是用一个状态表示当前阶段：

```tsx
type Status = "idle" | "loading" | "error" | "success";

const [status, setStatus] = useState<Status>("idle");
```

使用时：

```tsx
setStatus("loading");
setStatus("success");
setStatus("error");
```

这样状态之间是互斥的，更符合真实业务流程。

很多场景都适合这种写法：

```text
请求状态
表单提交状态
弹窗流程
订单状态
出入金流程
异步任务状态
```

状态越复杂，越不应该用一堆 boolean 拼出来。

---

## 十二、列表选中项不要存整个对象，存 ID

假设你有一个 Todo 列表，并且用户可以选中某一条 Todo。

不推荐这样做：

```tsx
const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
```

然后把整个对象存进去：

```tsx
setSelectedTodo(todo);
```

问题是，如果原列表中的 todo 被修改了，`selectedTodo` 不会自动同步。

这就产生了两个数据源：

```text
todos 里的 todo
selectedTodo 里的 todo
```

一旦其中一个更新，另一个可能变旧。

更好的做法是只存 ID：

```tsx
const [selectedTodoId, setSelectedTodoId] = useState<number | null>(null);
```

需要完整对象时再派生出来：

```tsx
const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);
```

这样 `todos` 始终是唯一数据源，选中状态只是指向某个 ID。

原则是：
能存 ID，就不要复制整份对象。
能派生，就不要重复存。

---

## 十三、有些状态应该放到 URL，而不是 useState

不是所有状态都应该放在 `useState` 里。

例如电商页面中的颜色、尺码、筛选条件、排序方式、分页页码，这些信息更适合放到 URL query 参数里。

例如：

```text
/product/123?color=black&size=m
```

这样做有明显好处：

第一，用户可以复制链接分享给别人。
第二，用户可以收藏当前状态。
第三，刷新页面后状态不会丢失。
第四，前进后退按钮能正常工作。

如果你用 `useState` 存颜色：

```tsx
const [selectedColor, setSelectedColor] = useState("black");
```

刷新页面后这个状态可能丢失，别人也无法通过链接看到相同选择。

适合放 URL 的状态包括：

```text
搜索关键词
筛选条件
排序方式
分页页码
Tab 选中项
商品颜色 / 尺码
当前选中的资源 ID
```

适合放 useState 的状态通常是局部临时状态，例如：

```text
输入框内容
弹窗开关
hover 状态
临时表单值
组件内部交互状态
```

一个简单判断标准是：
这个状态是否值得分享、收藏、刷新后保留？

如果值得，就优先考虑 URL。

---

## 十四、useEffect 只做一件事

`useEffect` 的核心用途，是让 React 和外部系统同步。

这里的外部系统包括：

```text
localStorage
DOM / window 事件
服务器接口
第三方 SDK
WebSocket
浏览器 API
```

例如把 todos 同步到 localStorage：

```tsx
useEffect(() => {
  localStorage.setItem("todos", JSON.stringify(todos));
}, [todos]);
```

这没问题，因为 localStorage 是 React 外部的东西。

但是不要把无关逻辑塞进同一个 useEffect。

不推荐：

```tsx
useEffect(() => {
  localStorage.setItem("todos", JSON.stringify(todos));

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      // do something
    }
  }

  document.addEventListener("keydown", handleKeyDown);
}, [todos]);
```

这里有两个完全不同的事情：

```text
同步 localStorage
监听键盘事件
```

而且因为依赖了 `todos`，每次 todos 变化都会重新添加事件监听，这明显不合理。

应该拆开：

```tsx
useEffect(() => {
  localStorage.setItem("todos", JSON.stringify(todos));
}, [todos]);
```

```tsx
useEffect(() => {
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      // do something
    }
  }

  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}, []);
```

一个 useEffect 最好只负责一个同步任务。

---

## 十五、不要总是用 useEffect 手写请求

初学 React 时，很多人都会用 `useEffect + fetch` 请求数据：

```tsx
useEffect(() => {
  async function fetchData() {
    setIsLoading(true);

    const res = await fetch("/api/jobs/1");
    const data = await res.json();

    setData(data);
    setIsLoading(false);
  }

  fetchData();
}, []);
```

这可以用，但不一定是最佳实践。

手写请求会遇到很多问题：

```text
缓存
重复请求
loading 状态
error 状态
请求取消
数据重新验证
分页
乐观更新
窗口聚焦后刷新
```

比如用户点击某个列表项，请求详情；再点击另一个；再点回第一个。

如果你手写 useEffect，每次都可能重新请求一次，即使刚刚已经请求过。

更好的方式是使用 React Query 或 SWR 这类数据请求库。

例如 React Query：

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["job", jobId],
  queryFn: () => fetchJob(jobId),
});
```

它会自动帮你处理缓存。
同一个 `queryKey` 的数据请求过后，再次访问可以直接复用缓存，而不是重复请求。

如果使用 Next.js，也可以利用 Next.js 自带的数据获取和缓存机制。

简单来说：

```text
普通 React SPA：优先考虑 React Query / SWR
Next.js 项目：优先理解 Next.js 自身的数据获取与缓存机制
小型练习项目：useEffect + fetch 可以接受
正式项目：不建议大量手写 useEffect 请求
```

---

## 十六、合理使用 useMemo、useCallback 和 React.memo

React 组件重新渲染时，组件函数体会重新执行。

这意味着：

```tsx
const completedPercentage =
  (todos.filter((todo) => todo.isCompleted).length / todos.length) * 100;
```

这类计算会在每次 render 时重新执行。

如果计算很轻，不需要优化。
但如果计算很重，可以使用 `useMemo`：

```tsx
const completedPercentage = useMemo(() => {
  return (todos.filter((todo) => todo.isCompleted).length / todos.length) * 100;
}, [todos]);
```

`useMemo` 适合缓存：

```text
昂贵计算结果
派生状态
对象
数组
```

`useCallback` 用来缓存函数：

```tsx
const handleAddTodo = useCallback((content: string) => {
  setTodos((prev) => [
    ...prev,
    {
      id: prev.length + 1,
      content,
      isCompleted: false,
    },
  ]);
}, []);
```

`React.memo` 用来避免组件在 props 没变时重复渲染：

```tsx
const AddTodoForm = memo(function AddTodoForm({ onAddTodo }: Props) {
  // ...
});
```

但要注意，`React.memo` 通常需要和 `useCallback` / `useMemo` 配合。

如果你传给子组件的是一个每次 render 都重新创建的函数或对象，那么即使用了 `React.memo`，props 也还是变了，组件仍然会重新渲染。

不过也不要过度优化。

对于大多数普通组件，不需要一上来就写满 `useMemo` 和 `useCallback`。
它们适合用于：

```text
计算确实昂贵
组件渲染确实重
子组件被 React.memo 包裹
函数或对象作为依赖导致 useEffect 频繁触发
性能分析后发现瓶颈
```

先写清晰，再针对瓶颈优化。

---

## 十七、复用 JSX 用组件，复用逻辑用函数，复用 Hook 逻辑用自定义 Hook

这是一个非常实用的判断规则。

如果你想复用一段 JSX / UI 结构，创建组件。

例如：

```tsx
function Button({ children, onClick }: Props) {
  return <button onClick={onClick}>{children}</button>;
}
```

如果你想复用普通 JavaScript 逻辑，创建工具函数。

例如首字母大写：

```ts
export function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

使用时：

```tsx
<span>{capitalizeFirstLetter(todo.content)}</span>
```

如果你想复用带 React Hook 的逻辑，创建自定义 Hook。

例如把状态同步到 localStorage：

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

使用时：

```tsx
const [todos, setTodos] = useLocalStorage<Todo[]>("todos", []);
```

这样原来组件里的 `useState + useEffect + localStorage` 逻辑，就变成了一行代码。

总结一下：

```text
复用 UI：组件
复用普通逻辑：utils / helper function
复用 Hook 逻辑：custom hook
```

这是 React 代码变清爽的关键。

---

## 十八、看到大组件，要有重构意识

如果一个组件越来越长，里面混着：

```text
大量 JSX
多个 useState
多个 useEffect
复杂计算
条件渲染
数组 map
按钮事件
接口请求
工具逻辑
```

那通常就是代码异味。

你可以从几个方向重构：

第一，拆 JSX。
把独立 UI 片段拆成组件。

第二，抽工具函数。
把复杂字符串处理、数组处理、格式化逻辑抽出去。

第三，抽自定义 Hook。
把可复用的状态逻辑、effect 逻辑抽出去。

第四，提升业务 handler。
不要让子组件知道太多父组件状态。

第五，检查状态是否重复。
能从已有状态派生的，就不要再单独存。

例如一个 TodoList 组件里有一大段空状态 JSX：

```tsx
{
  todos.length === 0 && <p className="...">Start by adding your first todo.</p>;
}
```

可以拆成：

```tsx
<StartScreen />
```

列表项很长，可以拆成：

```tsx
<TodoItem todo={todo} />
```

删除按钮重复，可以拆成：

```tsx
<DeleteButton id={todo.id} />
```

复杂字符串处理，可以抽成：

```tsx
capitalizeFirstLetter(todo.content);
```

本地存储逻辑，可以抽成：

```tsx
useLocalStorage("todos", []);
```

重构之后，组件会从“什么都做”变成“清楚表达结构”。

---

## 总结

React 最佳实践并不是为了写得“高级”，而是为了让项目长期可维护。

这篇文章总结的核心原则包括：

```text
不要把业务常量硬编码在组件里
目录结构保持一致、语义清晰
该拆组件就拆组件
避免不必要的 div
不要把布局样式写进可复用组件
使用 TypeScript 约束 props 和状态
让底层组件保持简单
减少无意义的 prop drilling
不要直接到处传 setState
依赖旧状态时使用函数式更新
复杂状态用 union type，不要一堆 boolean
列表选中项存 ID，不要存整个对象
适合分享和刷新保留的状态放 URL
useEffect 一个实例只做一件事
正式项目不要大量手写 useEffect 请求
合理使用 useMemo、useCallback、React.memo
复用 UI 用组件，复用逻辑用工具函数，复用 Hook 逻辑用自定义 Hook
看到大组件要主动拆分和重构
```

真正成熟的 React 代码，不只是能实现功能，而是能让后续维护者快速理解：

这个组件负责什么？
这个状态从哪里来？
这个逻辑为什么放这里？
这个组件能不能复用？
这个状态有没有重复来源？

当你开始从结构、复用、状态、职责边界这些角度思考 React 代码时，你就已经不只是“会写 React”，而是在用工程化思维写 React。
