# 从能写 React 到写好 React：提升前端工程性的 17 个实践

很多人学 React 时，最开始关注的是“组件怎么写”“useState 怎么用”“事件怎么绑定”。这些当然重要，但只会这些还不够。

真正做项目时，你会发现 React 代码最容易出问题的地方，往往不是某个 API 不会用，而是代码越来越难维护：组件越来越大，props 传来传去，状态设计混乱，重复代码到处都是，useEffect 里什么逻辑都塞，某个按钮组件一改样式全站都崩。

这也是初级 React 开发者和更成熟的 React 开发者之间的差距。前者关注“能不能实现”，后者会继续追问：“这个实现以后好不好改？能不能复用？状态是否可靠？组件是否足够简单？团队其他人能不能快速看懂？”

这篇文章不讲复杂架构，也不堆高级概念，而是从实际 React 项目中最常见的问题出发，整理一套能让 React 代码更上一层楼的工程实践。

---

## 1. 不要把业务值硬编码在组件里

React 项目里很常见的一类问题是：魔法数字、魔法字符串散落在组件内部。

比如一个 Todo 应用里，免费用户最多只能创建 3 个任务：

```ts
if (todos.length >= 3 && !isAuthenticated) {
  alert("请登录后再添加更多任务");
  return;
}
```

这段代码能跑，但 `3` 的含义并不明显。以后产品说免费用户可以创建 10 个任务，你就要去组件里搜索这个数字。更麻烦的是，如果这个值在多个地方都写了一遍，就很容易漏改。

更好的方式是抽成常量：

```ts
// lib/constants.ts
export const MAX_FREE_TODOS = 3;
```

然后在组件里使用：

```ts
import { MAX_FREE_TODOS } from "@/lib/constants";

if (todos.length >= MAX_FREE_TODOS && !isAuthenticated) {
  alert(`请登录后再添加超过 ${MAX_FREE_TODOS} 个任务`);
  return;
}
```

这种写法的好处不是“少写几行代码”，而是把业务规则集中管理了。

类似的例子还有敏感词列表：

```ts
// lib/constants.ts
export const SENSITIVE_WORDS = ["password", "credit card"];
```

使用时：

```ts
const hasSensitiveWord = SENSITIVE_WORDS.some((word) =>
  content.toLowerCase().includes(word),
);
```

只要一个值有明确业务含义，并且未来可能调整，就不应该随手写在组件深处。常量文件看起来是小事，但它能明显提升项目的可维护性。

---

## 2. 目录结构不需要神化，但要保持一致

很多初学者很纠结 React 项目到底应该怎么分目录。其实没有一种目录结构适合所有项目。比起追求“标准答案”，更重要的是保持一致，并且让新加入项目的人能快速理解。

一个比较容易上手的结构可以是：

```txt
src/
  components/
    header/
    sidebar/
    todo-list/
    ui/
  context/
  hooks/
  lib/
    constants.ts
    utils.ts
  types/
    todo.ts
```

这里可以简单理解为：

- `components` 放 UI 组件。
- `context` 放 React Context 相关逻辑。
- `hooks` 放自定义 hook。
- `lib` 放常量、工具函数、通用逻辑。
- `types` 放复用的 TypeScript 类型。

如果项目使用 Zustand 或 Redux，也可以把 `context` 换成 `stores`。

目录结构的核心不是名字，而是语义清楚。组件和状态管理不混在一起，工具函数和 UI 组件不混在一起，类型定义也不要到处散落。项目越大，这种边界越重要。

---

## 3. 组件不只是为了复用，也是为了组织代码

很多人会以为：只有会被复用的 UI 才值得抽成组件。

这其实是一个误解。

React 组件有两个重要价值。

第一是复用，比如多个地方都用同一个按钮：

```tsx
<Button>添加任务</Button>
<Button variant="secondary">登录</Button>
<Button variant="secondary">注册</Button>
```

第二是组织结构。即使一个组件只用一次，也可能值得拆出来。

比如：

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

这里的 `Header`、`Sidebar`、`Footer` 可能永远只用一次，但拆出来之后，`App` 的结构会非常清楚。

如果不拆组件，主文件里就会塞满大量 JSX。你看到的是一堆 `div`、`h1`、`button`，却很难一眼看出页面结构。

组件的命名本身就是一种说明。`<BackgroundHeading />` 比一个孤零零的 `<h1>` 更能表达意图。

所以判断是否拆组件，可以问两个问题：

- 这个 UI 会不会复用？
- 即使不复用，拆出来会不会让当前文件更清楚？

只要答案有一个是肯定的，就可以考虑拆组件。

---

## 4. 避免不必要的 div，用 Fragment 保持 DOM 干净

初学 React 时，很多人会习惯性给组件包一层 `div`：

```tsx
function Button() {
  return (
    <div>
      <button>Click</button>
    </div>
  );
}
```

但如果这个 `div` 没有语义，也没有布局作用，它就是多余的。

更好的写法是：

```tsx
function Button() {
  return <button>Click</button>;
}
```

另一个常见场景是条件渲染多个元素：

```tsx
return isAuthenticated ? (
  <Button>退出登录</Button>
) : (
  <div>
    <Button>登录</Button>
    <Button>注册</Button>
  </div>
);
```

这里加 `div` 只是为了满足 JSX 必须返回一个整体的要求。但这个额外的 `div` 可能会破坏父级布局，比如 `flex`、`grid`、`space-y-*` 这类样式。

更合适的是使用 Fragment：

```tsx
return isAuthenticated ? (
  <Button>退出登录</Button>
) : (
  <>
    <Button>登录</Button>
    <Button>注册</Button>
  </>
);
```

Fragment 不会生成真实 DOM 节点，因此不会干扰布局，也不会让浏览器 DevTools 里的 DOM 树变得臃肿。

当然，不是所有 `div` 都不该存在。如果你确实需要一个容器来做布局、加样式、控制间距，那就应该用 `div`。关键是不要为了“包一下”而包一下。

---

## 5. 不要把布局样式写进可复用组件

这是 React 组件设计里非常重要的一点。

假设你写了一个通用标题组件：

```tsx
function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="text-4xl font-bold">{children}</h1>;
}
```

它在首页用起来很好：

```tsx
<H1>Welcome</H1>
```

后来你在列表页也使用它：

```tsx
<H1>Events in Austin</H1>
<EventList />
```

你发现标题和列表之间太挤，于是直接给 `H1` 加了 margin：

```tsx
function H1({ children }: { children: React.ReactNode }) {
  return <h1 className="mb-10 text-4xl font-bold">{children}</h1>;
}
```

这看似解决了列表页问题，但它会影响所有使用 `H1` 的地方。首页可能并不需要这个 `mb-10`，结果布局被一起改坏。

所以，可复用组件里应该尽量放“自身样式”，不要放“它和外部元素之间的布局关系”。

布局样式应该交给使用它的地方。

一种方式是外层包一次性容器：

```tsx
<div className="mb-10">
  <H1>Events in Austin</H1>
</div>
```

更灵活的方式是让组件支持 `className`：

```tsx
import { cn } from "@/lib/utils";

type H1Props = {
  children: React.ReactNode;
  className?: string;
};

export function H1({ children, className }: H1Props) {
  return <h1 className={cn("text-4xl font-bold", className)}>{children}</h1>;
}
```

使用时：

```tsx
<H1 className="mb-10">Events in Austin</H1>
```

这样既保留了组件的通用基础样式，又允许某个具体场景做局部调整。

简单说：可复用组件负责自己长什么样，页面布局负责它放在哪里、和谁保持多少距离。

---

## 6. TypeScript 不是装饰品，它能约束组件接口

React 项目里使用 TypeScript 的一个核心价值，就是让组件 props 变得清楚。

比如一个按钮组件：

```tsx
type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
};

export function Button({
  children,
  variant = "primary",
  onClick,
}: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}
```

这里的 `variant` 不是任意字符串，只能是：

```ts
"primary" | "secondary";
```

如果你写错：

```tsx
<Button variant="second">登录</Button>
```

TypeScript 会直接提示错误。

这比运行时才发现样式不对要好得多。

TypeScript 对 React 的帮助主要体现在几个地方：

- 约束组件 props。
- 约束事件函数参数。
- 约束 state 的数据结构。
- 约束状态枚举值。
- 给编辑器提供智能提示。
- 避免错误字段名、错误类型、漏传必填属性。

你不需要一开始就成为 TypeScript 高手，但至少应该能熟练写组件 props 类型。

---

## 7. 让组件保持简单，不要让它知道太多

一个组件越靠近底层、越可复用，就越应该简单。

比如一个进度条组件，不应该直接依赖 `todos`：

```tsx
function StatusBar({ todos }: { todos: Todo[] }) {
  const percentage =
    (todos.filter((todo) => todo.completed).length / todos.length) * 100;

  return (
    <div className="h-2 bg-gray-200">
      <div style={{ width: `${percentage}%` }} />
    </div>
  );
}
```

这段代码的问题是：`StatusBar` 被绑定到了 Todo 场景。

如果以后你想用它展示文件上传进度、页面加载进度、任务执行进度，就不方便了。

更好的设计是让它只接收进度值：

```tsx
type StatusBarProps = {
  value: number;
};

function StatusBar({ value }: StatusBarProps) {
  return (
    <div className="h-2 bg-gray-200">
      <div className="h-full bg-black" style={{ width: `${value}%` }} />
    </div>
  );
}
```

Todo 的完成比例应该在更上层计算：

```tsx
const completedPercentage =
  todos.length === 0
    ? 0
    : (todos.filter((todo) => todo.completed).length / todos.length) * 100;

<StatusBar value={completedPercentage} />;
```

这样 `StatusBar` 就从“Todo 专用组件”变成了“通用进度条组件”。

这就是“让组件变笨”的意思。不是说组件不好，而是让它少知道业务细节，只接收最小必要数据。组件越简单，复用能力越强。

---

## 8. 不要把 useState 的 setter 一路传下去

很多 React 初学者会这样传状态更新函数：

```tsx
function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  return <Sidebar setTodos={setTodos} />;
}
```

然后：

```tsx
function Sidebar({ setTodos }) {
  return <AddTodoForm setTodos={setTodos} />;
}
```

最后在表单组件里直接调用：

```ts
setTodos((prev) => [...prev, newTodo]);
```

这会带来几个问题。

第一，中间组件只是为了转发 `setTodos`，但它本身不需要这个 prop。

第二，表单组件知道了太多状态细节。

第三，如果添加 todo 时还要弹窗、埋点、校验、触发提示，就会继续把更多状态和 setter 传进去，组件会越来越复杂。

更好的方式是在状态所在的上层组件中定义事件处理函数：

```tsx
function App() {
  const [todos, setTodos] = useState<Todo[]>([]);

  function handleAddTodo(content: string) {
    setTodos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        content,
        completed: false,
      },
    ]);

    // 这里还可以统一处理弹窗、埋点、权限提示等逻辑
  }

  return <AddTodoForm onAddTodo={handleAddTodo} />;
}
```

表单组件只负责触发事件：

```tsx
type AddTodoFormProps = {
  onAddTodo: (content: string) => void;
};

function AddTodoForm({ onAddTodo }: AddTodoFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const content = String(formData.get("content") ?? "").trim();
    if (!content) return;

    onAddTodo(content);
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="content" />
      <button type="submit">Add</button>
    </form>
  );
}
```

这个结构更稳定。

`AddTodoForm` 不知道 `todos` 怎么存，也不知道添加后还要做什么。它只知道一件事：用户提交表单时，调用 `onAddTodo`。

---

## 9. 函数 props 的命名尽量贴近事件语义

组件暴露函数 props 时，命名也很重要。

原生 HTML 里有这样的命名：

```tsx
<button onClick={handleClick}>Click</button>
<input onChange={handleChange} />
```

自定义组件也可以延续这个思路。

比如表单组件可以暴露：

```tsx
<AddTodoForm onAddTodo={handleAddTodo} />
```

而不是：

```tsx
<AddTodoForm handleAddTodo={handleAddTodo} />
```

这里的区别是：

- `onAddTodo` 更像组件对外暴露的事件。
- `handleAddTodo` 更像使用者内部的处理函数。

组件内部可以这样调用：

```tsx
type AddTodoFormProps = {
  onAddTodo: (content: string) => void;
};

function AddTodoForm({ onAddTodo }: AddTodoFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAddTodo("Learn React");
  }

  return <form onSubmit={handleSubmit}>...</form>;
}
```

这种命名方式能让组件 API 更接近原生 JSX 习惯，也更容易被其他开发者理解。

---

## 10. 新 state 依赖旧 state 时，使用 updater function

`useState` 更新状态有两种常见写法。

第一种：

```ts
setCount(count + 1);
```

第二种：

```ts
setCount((prev) => prev + 1);
```

当新状态依赖旧状态时，更推荐第二种。

比如添加 todo：

```ts
setTodos((prev) => [
  ...prev,
  {
    id: crypto.randomUUID(),
    content,
    completed: false,
  },
]);
```

这样写的好处是，你不需要依赖外部闭包里的 `todos` 变量。

在计数器、数组追加、数组删除、对象合并等场景里，updater function 都更稳。

尤其是当你在异步逻辑、定时器、连续多次更新中依赖旧值时，直接使用外部变量很容易遇到“旧状态”问题。

---

## 11. 用单个状态表达状态机，而不是多个 boolean

很多人写异步状态时，会这样写：

```ts
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
```

看起来没问题，但很容易出现矛盾状态。

比如：

```txt
isLoading === true
isError === true
```

到底是加载中，还是失败了？

更好的方式是用一个状态表示当前阶段：

```ts
type Status = "idle" | "loading" | "success" | "error";
const [status, setStatus] = useState<Status>("idle");
```

使用时：

```ts
setStatus("loading");

try {
  await fetchData();
  setStatus("success");
} catch {
  setStatus("error");
}
```

这种写法更接近状态机。当前只能处于一种明确状态，逻辑会清楚很多。

---

## 12. 选中项只存 id，不要存整个对象

列表场景里经常有“当前选中项”或“当前激活项”。

错误写法是直接存整个对象：

```ts
const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
```

当用户点击某个 todo 时：

```ts
setSelectedTodo(todo);
```

这样会产生一个问题：`selectedTodo` 和 `todos` 里对应的对象变成了两份数据。

如果你之后修改了 `todos` 里的内容，比如把标题从 Learn React 改成 Learn TypeScript，`selectedTodo` 不会自动同步。这样就出现了多个数据源。

更好的方式是只存 id：

```ts
const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
```

需要完整对象时再推导：

```ts
const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);
```

这样 `todos` 始终是唯一数据源。选中状态只是指向某个 id，不复制整份对象。

这条原则非常重要：能用 id 引用，就不要复制对象。

---

## 13. 筛选、分页、选项类状态，优先考虑放 URL

不是所有状态都适合放在 `useState` 里。

比如电商页面中的颜色、尺码、排序、分页：

```txt
/products?color=black&size=m&page=2
```

这类状态放在 URL 里更合适。

原因很简单：URL 是可分享、可刷新、可收藏的。

如果用户选中了黑色 T 恤、M 码，然后复制链接发给朋友，对方打开后应该看到同样的页面状态。这个能力用 `useState` 很难自然实现，但用 URL 参数就很合适。

适合放 URL 的状态通常有：

- 搜索关键词。
- 筛选条件。
- 排序方式。
- 当前页码。
- 当前 tab。
- 当前选中的分类。
- 商品颜色、尺码等可分享选项。

不适合放 URL 的状态通常有：

- 输入框临时输入。
- 弹窗是否打开。
- hover 状态。
- 本地 UI 展开收起。
- 不需要分享和持久化的瞬时状态。

判断标准可以很简单：这个状态刷新页面后是否应该保留？是否值得复制链接分享？如果是，就考虑放 URL。

---

## 14. useEffect 保持单一职责

`useEffect` 最容易被滥用。

它适合用来同步 React 外部的东西，比如：

- `localStorage`。
- DOM 事件。
- 浏览器 API。
- 定时器。
- 第三方库。
- 某些外部订阅。

比如把 `todos` 同步到 `localStorage`：

```ts
useEffect(() => {
  localStorage.setItem("todos", JSON.stringify(todos));
}, [todos]);
```

再比如监听键盘事件：

```ts
useEffect(() => {
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      console.log("Escape pressed");
    }
  }

  document.addEventListener("keydown", handleKeyDown);

  return () => {
    document.removeEventListener("keydown", handleKeyDown);
  };
}, []);
```

不要把两件不相关的事塞到同一个 `useEffect` 里：

```ts
useEffect(() => {
  localStorage.setItem("todos", JSON.stringify(todos));
  document.addEventListener("keydown", handleKeyDown);
}, [todos]);
```

这样会导致 `todos` 每次变化时，都重新添加一次键盘监听。逻辑上不相关，生命周期也不一样，就应该拆开。

一个简单原则：一个 `useEffect` 只处理一类副作用。

---

## 15. 数据请求不要默认都写在 useEffect 里

刚学 React 时，很多人会用 `useEffect + fetch` 请求数据：

```ts
useEffect(() => {
  async function fetchJob() {
    setStatus("loading");
    const res = await fetch(`/api/jobs/${activeId}`);
    const data = await res.json();
    setJob(data);
    setStatus("success");
  }

  fetchJob();
}, [activeId]);
```

这能跑，但手写数据请求会很快遇到一堆问题：

- 没有缓存。
- 重复点击会重复请求。
- `loading`、`error`、`success` 状态要自己维护。
- 请求竞态要自己处理。
- 重新聚焦、重新连接、失效刷新都要自己处理。
- 多组件共享同一份远程数据很麻烦。

比如用户点击职位列表：

1. 点击第一个职位，请求一次。
2. 点击第二个职位，请求一次。
3. 再点击第一个职位，又请求一次。

但第一个职位刚刚已经请求过了，完全可以复用缓存。

所以在纯 React 应用中，服务端状态更推荐用 React Query 或 SWR 这类库管理。

React Query 示例：

```ts
import { useQuery } from "@tanstack/react-query";

function useJob(jobId: string | null) {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch job");
      }
      return res.json();
    },
    enabled: Boolean(jobId),
  });
}
```

使用时：

```tsx
function JobDetail({ jobId }: { jobId: string | null }) {
  const { data, isLoading, isError } = useJob(jobId);

  if (isLoading) return <p>加载中...</p>;
  if (isError) return <p>加载失败</p>;
  if (!data) return <p>请选择一个职位</p>;

  return <h2>{data.title}</h2>;
}
```

这里的重点是：React Query 不是简单封装 `fetch`，它解决的是“服务端状态管理”。缓存、重复请求、加载状态、错误状态、失效刷新，都是它的核心价值。

如果你使用 Next.js，也可以结合 Next.js 自身的数据获取和缓存机制。总之，不要把所有数据请求都机械地塞进 `useEffect`。

---

## 16. 性能优化不要滥用，但要知道用在哪里

React 中常见的性能优化工具有三个：

- `useMemo`
- `useCallback`
- `React.memo`

它们不是越多越好，而是应该在合适的地方使用。

### useMemo：缓存计算结果

如果一个计算比较贵，并且不是每次渲染都需要重新计算，可以使用 `useMemo`。

```ts
const completedPercentage = useMemo(() => {
  if (todos.length === 0) return 0;
  return (
    (todos.filter((todo) => todo.completed).length / todos.length) * 100
  );
}, [todos]);
```

当 `todos` 不变时，这个计算结果可以复用。

适合 `useMemo` 的场景：

- 较重的计算。
- 过滤、排序、分组大量数据。
- 生成对象或数组，并作为 props 传给 memo 组件。
- derived state 计算成本较高。

### useCallback：缓存函数引用

组件每次渲染时，函数都会重新创建。

```ts
function handleAddTodo(content: string) {
  // ...
}
```

如果这个函数会作为 props 传给被 memo 包裹的子组件，可以考虑使用 `useCallback`：

```ts
const handleAddTodo = useCallback((content: string) => {
  setTodos((prev) => [
    ...prev,
    {
      id: crypto.randomUUID(),
      content,
      completed: false,
    },
  ]);
}, []);
```

### React.memo：避免 props 不变时重复渲染

```tsx
const AddTodoForm = memo(function AddTodoForm({
  onAddTodo,
}: AddTodoFormProps) {
  // ...
});
```

如果 `onAddTodo` 每次都是新函数，`memo` 效果就会打折扣。所以 `React.memo` 往往需要和 `useCallback` 或 `useMemo` 配合。

但要注意，不要为了“看起来高级”到处 `memo`。很多普通组件重新渲染成本很低，过度优化反而增加复杂度。

更合理的顺序是：

1. 先写清楚结构。
2. 再用 React DevTools 或实际性能问题判断是否需要优化。
3. 最后只优化真正有成本的部分。

---

## 17. 复用逻辑时，区分组件、工具函数和自定义 Hook

当组件变大时，应该思考怎么拆。

但拆分不是只有“抽组件”这一种方式。

可以按内容类型来判断。

如果要复用的是 JSX 和样式，抽组件。

```tsx
function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="删除">
      删除
    </button>
  );
}
```

如果要复用的是普通 JavaScript 逻辑，抽工具函数。

```ts
export function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

使用时：

```tsx
<span>{capitalizeFirstLetter(todo.content)}</span>
```

如果要复用的是包含 React hooks 的逻辑，抽自定义 hook。

比如将数据同步到 `localStorage`：

```ts
import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

使用时：

```ts
const [todos, setTodos] = useLocalStorage<Todo[]>("todos", []);
```

这样组件里就不用同时出现 `useState`、`useEffect`、`localStorage` 细节。组件只需要知道：我有一份可以持久化的 `todos` 状态。

这是提升 React 工程性的一个关键思路：

- 复用 UI：抽组件。
- 复用纯逻辑：抽工具函数。
- 复用 hook 逻辑：抽自定义 hook。

---

## 18. 一个更完整的 TypeScript Todo 示例

下面用一个简化版 Todo 应用，把前面提到的一些实践串起来。

先定义类型和常量：

```ts
// types/todo.ts
export type Todo = {
  id: string;
  content: string;
  completed: boolean;
};

// lib/constants.ts
export const MAX_FREE_TODOS = 3;
```

再定义工具函数：

```ts
// lib/utils.ts
export function capitalizeFirstLetter(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

通用按钮组件：

```tsx
// components/ui/button.tsx
type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  type?: "button" | "submit";
};

export function Button({
  children,
  variant = "primary",
  onClick,
  type = "button",
}: ButtonProps) {
  const className =
    variant === "primary"
      ? "rounded bg-black px-4 py-2 text-white"
      : "rounded border px-4 py-2 text-black";

  return (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
```

添加表单组件：

```tsx
// components/add-todo-form.tsx
import { Button } from "./ui/button";

type AddTodoFormProps = {
  onAddTodo: (content: string) => void;
};

export function AddTodoForm({ onAddTodo }: AddTodoFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const content = String(formData.get("content") ?? "").trim();
    if (!content) return;

    onAddTodo(content);
    event.currentTarget.reset();
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="content" placeholder="Add a todo" />
      <Button type="submit">Add</Button>
    </form>
  );
}
```

Todo 项组件：

```tsx
// components/todo-item.tsx
import { Todo } from "@/types/todo";
import { capitalizeFirstLetter } from "@/lib/utils";

type TodoItemProps = {
  todo: Todo;
  onToggleTodo: (id: string) => void;
  onDeleteTodo: (id: string) => void;
};

export function TodoItem({
  todo,
  onToggleTodo,
  onDeleteTodo,
}: TodoItemProps) {
  return (
    <li>
      <button onClick={() => onToggleTodo(todo.id)}>
        {todo.completed ? "✅" : "⬜"}
      </button>
      <span>{capitalizeFirstLetter(todo.content)}</span>
      <button onClick={() => onDeleteTodo(todo.id)}>删除</button>
    </li>
  );
}
```

主组件：

```tsx
// app.tsx
import { useMemo, useState } from "react";
import { AddTodoForm } from "./components/add-todo-form";
import { TodoItem } from "./components/todo-item";
import { MAX_FREE_TODOS } from "./lib/constants";
import { Todo } from "./types/todo";

export function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isAuthenticated] = useState(false);
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);

  const completedPercentage = useMemo(() => {
    if (todos.length === 0) return 0;
    return (
      (todos.filter((todo) => todo.completed).length / todos.length) * 100
    );
  }, [todos]);

  const selectedTodo = todos.find((todo) => todo.id === selectedTodoId);

  function handleAddTodo(content: string) {
    if (todos.length >= MAX_FREE_TODOS && !isAuthenticated) {
      alert(`免费用户最多只能添加 ${MAX_FREE_TODOS} 个任务`);
      return;
    }

    setTodos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        content,
        completed: false,
      },
    ]);
  }

  function handleToggleTodo(id: string) {
    setTodos((prev) =>
      prev.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  }

  function handleDeleteTodo(id: string) {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));

    if (selectedTodoId === id) {
      setSelectedTodoId(null);
    }
  }

  return (
    <main>
      <h1>Todo App</h1>
      <p>完成进度：{completedPercentage.toFixed(0)}%</p>
      <AddTodoForm onAddTodo={handleAddTodo} />

      {todos.length === 0 && <p>还没有任务，先添加一个吧。</p>}

      <ul>
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
        ))}
      </ul>

      {selectedTodo && <aside>当前选中：{selectedTodo.content}</aside>}
    </main>
  );
}
```

这个示例不复杂，但它体现了不少关键点：

- 业务常量抽离。
- Todo 类型独立定义。
- 组件 props 使用 TypeScript。
- 不把 `setTodos` 直接传给子组件。
- 添加、删除、切换都用 handler 函数。
- 新 state 依赖旧 state 时使用 updater function。
- 选中项只保存 id。
- 完成进度使用 derived state。
- 列表项拆成独立组件。
- 纯逻辑抽成 utility function。

这就是 React 工程性的基本样子：不是把代码写得更花，而是让每段代码都有清楚的责任。

---

## 19. 常见误区和边界

### 误区一：组件越少越简单

很多大组件看起来文件少，但维护很痛苦。一个组件里同时有状态、请求、副作用、表单、列表、按钮、弹窗，很快就会失控。

更合理的做法是适度拆分组件，让每个组件承担清楚的职责。

### 误区二：所有东西都要抽组件

组件也不是越多越好。如果拆得太碎，反而会让阅读代码时频繁跳转。

判断标准不是“能不能抽”，而是“抽出来是否更清楚”。

### 误区三：useEffect 可以放任何逻辑

`useEffect` 不是普通逻辑容器。它适合处理 React 外部系统的同步。普通计算、事件处理、状态推导，不应该随便塞进 `useEffect`。

### 误区四：所有状态都用 useState

有些状态应该从已有数据推导，有些状态应该放 URL，有些远程状态应该交给 React Query 或 Next.js 数据层。`useState` 很基础，但不是所有数据的最佳归宿。

### 误区五：性能优化就是到处 useMemo

`useMemo`、`useCallback`、`memo` 都有成本。没有性能问题时，优先写清楚结构。真的遇到昂贵计算或无意义重渲染时，再针对性优化。

### 误区六：传 setter 很方便，所以一直传

直接传 `setState` 会让子组件知道太多实现细节。更好的方式是传语义化事件函数，比如 `onAddTodo`、`onDeleteTodo`、`onSubmit`。

---

## 20. 学习和落地建议

学习 React 最佳实践，可以按这个顺序来。

第一步，先练组件拆分。

拿一个页面，尝试把 `Header`、`Sidebar`、`List`、`Item`、`Button` 拆出来。不要追求复杂，只关注结构是否更清楚。

第二步，练 props 设计。

不要只会传数据，还要学会设计事件 props，比如 `onAddTodo`、`onSelectItem`、`onClose`。这会让组件更像一个独立模块。

第三步，练状态设计。

重点理解哪些状态应该存，哪些状态可以推导，哪些状态应该放 URL，哪些状态只应该存 id。

第四步，练 useEffect 的边界。

只在同步外部系统时使用它，并坚持一个 effect 只做一件事。

第五步，练抽象能力。

重复 JSX 抽组件，重复普通逻辑抽工具函数，重复 hook 逻辑抽自定义 hook。

第六步，再考虑性能优化。

理解 `useMemo`、`useCallback`、`memo` 的关系，但不要过早滥用。先让代码结构正确，再优化性能。

可以用一个小 Todo 应用练习这些点。Todo 虽然简单，但它包含表单、列表、删除、选中、状态更新、本地存储、筛选等典型场景，非常适合训练 React 工程思维。

---

## 总结

React 最佳实践的核心，不是背一堆规则，而是建立一种工程判断力。

写 React 时，不要只问“这样能不能实现”，还要问：

- 这个值以后好不好改？
- 这个组件是否知道太多？
- 这个状态是不是重复了？
- 这个 `useEffect` 是否做了太多事？
- 这个逻辑是否应该抽出来？
- 这个 UI 是否适合复用？
- 这个 URL 是否应该承载页面状态？

当你开始习惯用这些问题审视代码，React 水平就会明显提升。

真正成熟的 React 代码通常不是最炫的，而是职责清楚、状态可靠、组件简单、逻辑可复用。这样的代码短期看不一定最省事，但长期维护时会非常舒服。
