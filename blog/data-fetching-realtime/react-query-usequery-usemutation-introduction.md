# React Query 入门教程：从 useQuery 到 useMutation，彻底理解服务端状态管理

在 React 项目中，只要涉及接口请求，我们就会遇到这些问题：

```text
什么时候显示 loading？
请求失败怎么处理？
接口数据怎么缓存？
新增数据后怎么刷新列表？
多个组件请求同一份数据时，能不能复用缓存？
切换页面再回来，为什么有时不用重新 loading？
搜索参数变化后，如何触发重新请求？
```

如果完全手写这些逻辑，会很繁琐。

这就是 React Query 的价值。

现在它更准确的名字是：

```text
TanStack Query
```

因为它不仅支持 React，也支持 Vue、Svelte、Solid 等框架。

不过在 React 项目里，大家仍然习惯叫它 React Query。

本文将通过一个 Todo 示例，系统讲清楚 React Query 的核心用法：

```text
1. QueryClient 和 QueryClientProvider
2. useQuery 获取列表数据
3. loading 状态处理
4. useMutation 新增数据
5. mutation 成功后 invalidateQueries 刷新列表
6. queryKey 为什么重要
7. 带参数请求时 queryKey 怎么写
8. React Query 默认缓存机制
9. staleTime 和 cacheTime / gcTime 的作用
```

---

## 一、React Query 是什么？

很多人把 React Query 理解成“请求库”。

这只说对了一半。

React Query 确实能帮我们发请求，但它真正强大的地方是：

```text
管理服务端状态
```

所谓服务端状态，就是数据源头在后端的数据。

例如：

```text
Todo 列表
用户信息
订单列表
商品详情
公告内容
资产数据
评论列表
```

这些数据不是前端自己创造的，而是从后端接口获取的。

React Query 可以帮我们管理这类数据的完整生命周期：

```text
请求中 loading
请求失败 error
请求成功 data
缓存 cache
重新请求 refetch
数据失效 invalidate
后台刷新 background refetch
请求去重
```

也就是说，React Query 不是简单的 `fetch` 替代品，而是一个服务端状态管理工具。

---

## 二、安装 React Query

先安装：

```bash
npm install @tanstack/react-query
```

或者：

```bash
pnpm add @tanstack/react-query
```

安装后，就可以在 React 项目中使用。

---

## 三、创建 QueryClient

使用 React Query 的第一步，是创建一个 `QueryClient`。

它可以理解为 React Query 的全局客户端实例，负责管理所有 query、mutation、缓存和配置。

通常在应用入口处创建：

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

export function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
```

这里有两个关键点：

```text
QueryClient：React Query 的核心客户端实例
QueryClientProvider：通过 React Context 把 queryClient 提供给整个应用
```

只要应用被 `QueryClientProvider` 包裹，内部组件就可以使用：

```text
useQuery
useMutation
useQueryClient
```

这些 React Query 提供的 Hook。

---

## 四、准备一个模拟 API

假设我们有一个 Todo API 文件。

```ts
export type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

let todos: Todo[] = [
  {
    id: 1,
    title: "Learn React Query",
    completed: false,
  },
  {
    id: 2,
    title: "Build a Todo App",
    completed: true,
  },
];

export async function fetchTodos(query = ""): Promise<Todo[]> {
  console.log("fetch todos");

  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (!query) return todos;

  return todos.filter((todo) =>
    todo.title.toLowerCase().includes(query.toLowerCase()),
  );
}

export async function addTodo(input: { title: string }): Promise<Todo> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const todo: Todo = {
    id: Date.now(),
    title: input.title,
    completed: false,
  };

  todos = [...todos, todo];

  return todo;
}
```

这个文件模拟了两个接口：

```text
fetchTodos：获取 Todo 列表
addTodo：新增 Todo
```

真实项目中，这里可能会换成：

```ts
fetch("/api/todos");
```

或者：

```ts
axios.get("/api/todos");
```

---

## 五、使用 useQuery 获取数据

React Query 中最常用的 Hook 是：

```ts
useQuery;
```

它用于获取数据。

示例：

```tsx
import { useQuery } from "@tanstack/react-query";
import { fetchTodos } from "./api";

export function TodoList() {
  const { data: todos, isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: () => fetchTodos(),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {todos?.map((todo) => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

这里最核心的是：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(),
});
```

`useQuery` 至少需要两个重要配置：

```text
queryKey：当前请求的唯一标识
queryFn：真正执行请求的函数
```

---

## 六、queryFn 是什么？

`queryFn` 就是请求函数。

例如：

```tsx
queryFn: () => fetchTodos();
```

React Query 会调用这个函数，并把返回结果保存到 `data` 中。

如果请求还没完成：

```text
isLoading = true
data = undefined
```

请求成功后：

```text
isLoading = false
data = 接口返回的数据
```

所以渲染列表时通常要注意 `data` 可能一开始是 `undefined`。

可以写：

```tsx
todos?.map(...)
```

或者给默认值：

```tsx
const { data: todos = [] } = useQuery(...)
```

---

## 七、queryKey 是什么？

`queryKey` 是 React Query 的核心概念。

它是当前 query 的身份标识。

例如：

```tsx
queryKey: ["todos"];
```

表示这次请求是 Todo 列表请求。

React Query 会用这个 key 来做缓存。

也就是说，这个请求返回的数据，会被缓存到：

```text
["todos"]
```

这个 key 下面。

以后其他组件也使用相同的 queryKey：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(),
});
```

React Query 就知道它们是同一个 query，可以复用缓存。

---

## 八、为什么 queryKey 很重要？

React Query 的很多能力都依赖 queryKey。

例如：

```text
缓存数据
判断是否是同一个请求
重新请求
请求去重
invalidateQueries
分页和搜索参数缓存
```

如果 queryKey 设计不好，就可能出现缓存混乱。

例如搜索 Todo 时，如果请求函数依赖 `search`：

```tsx
queryFn: () => fetchTodos(search);
```

那 queryKey 也必须包含 `search`：

```tsx
queryKey: ["todos", { search }];
```

原因是：

```text
不同 search 参数，对应不同请求结果
```

比如：

```text
["todos", { search: "" }]
["todos", { search: "react" }]
["todos", { search: "query" }]
```

它们应该是不同缓存。

---

## 九、处理 loading 状态

React Query 会自动给我们提供 loading 状态：

```tsx
const { data, isLoading } = useQuery(...)
```

可以这样写：

```tsx
if (isLoading) {
  return <div>Loading...</div>;
}
```

完整示例：

```tsx
export function TodoList() {
  const { data: todos, isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: () => fetchTodos(),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {todos?.map((todo) => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </div>
  );
}
```

这样就不需要自己写：

```tsx
const [loading, setLoading] = useState(false);
const [data, setData] = useState([]);
```

React Query 已经帮我们管理好了。

---

## 十、使用 useMutation 新增数据

查询数据用 `useQuery`。

修改数据用 `useMutation`。

常见的 mutation 包括：

```text
新增
编辑
删除
提交表单
点赞
取消收藏
上传文件
```

新增 Todo 可以这样写：

```tsx
import { useMutation } from "@tanstack/react-query";
import { addTodo } from "./api";

export function AddTodoForm() {
  const { mutateAsync: addTodoMutation } = useMutation({
    mutationFn: addTodo,
  });

  return (
    <button
      onClick={async () => {
        await addTodoMutation({
          title: "New Todo",
        });
      }}
    >
      Add Todo
    </button>
  );
}
```

这里的核心是：

```tsx
useMutation({
  mutationFn: addTodo,
});
```

`mutationFn` 就是真正执行新增操作的函数。

---

## 十一、mutate 和 mutateAsync 的区别

`useMutation` 会返回两个常用方法：

```text
mutate
mutateAsync
```

它们都能触发 mutation。

区别是：

```text
mutate：回调风格，不需要 await
mutateAsync：Promise 风格，可以 await
```

例如：

```tsx
const { mutate } = useMutation({
  mutationFn: addTodo,
});

mutate({ title: "New Todo" });
```

或者：

```tsx
const { mutateAsync } = useMutation({
  mutationFn: addTodo,
});

await mutateAsync({ title: "New Todo" });
```

如果你喜欢 `async / await` 写法，可以使用 `mutateAsync`。

---

## 十二、完整新增 Todo 表单

下面是一个更完整的例子。

```tsx
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { addTodo } from "./api";

export function AddTodoForm() {
  const [title, setTitle] = useState("");

  const { mutateAsync: addTodoMutation } = useMutation({
    mutationFn: addTodo,
  });

  return (
    <div>
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="请输入 Todo 标题"
      />

      <button
        onClick={async () => {
          try {
            await addTodoMutation({
              title,
            });

            setTitle("");
          } catch (error) {
            console.error(error);
          }
        }}
      >
        Add Todo
      </button>
    </div>
  );
}
```

这里做了几件事：

```text
1. 用 useState 管理输入框 title
2. 点击按钮时调用 addTodoMutation
3. 新增成功后清空输入框
4. 失败时打印错误
```

但是这段代码还有一个问题：

**新增成功后，列表不会自动刷新。**

---

## 十三、为什么新增成功后列表没更新？

我们新增 Todo 后，接口数据已经变了。

但 React Query 并不知道：

```text
addTodo 这个 mutation 会影响 ["todos"] 这个 query
```

也就是说：

```text
useQuery 获取 Todo 列表
useMutation 新增 Todo
```

它们默认没有自动关联。

所以新增成功后，我们需要告诉 React Query：

```text
Todo 列表数据已经失效，请重新请求
```

这就需要用到：

```ts
invalidateQueries;
```

---

## 十四、使用 useQueryClient 获取 queryClient

要手动让某个 query 失效，需要先拿到 queryClient。

```tsx
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();
```

然后在 mutation 成功后调用：

```tsx
queryClient.invalidateQueries({
  queryKey: ["todos"],
});
```

完整写法：

```tsx
const queryClient = useQueryClient();

const { mutateAsync: addTodoMutation } = useMutation({
  mutationFn: addTodo,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["todos"],
    });
  },
});
```

这样新增成功后，React Query 会把 `["todos"]` 对应的 query 标记为失效，并重新请求列表。

---

## 十五、完整示例：新增后自动刷新列表

```tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addTodo, fetchTodos } from "./api";

export function TodoApp() {
  const [title, setTitle] = useState("");
  const queryClient = useQueryClient();

  const { data: todos, isLoading } = useQuery({
    queryKey: ["todos"],
    queryFn: () => fetchTodos(),
  });

  const { mutateAsync: addTodoMutation } = useMutation({
    mutationFn: addTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["todos"],
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      <div>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="请输入 Todo 标题"
        />

        <button
          onClick={async () => {
            try {
              await addTodoMutation({
                title,
              });

              setTitle("");
            } catch (error) {
              console.error(error);
            }
          }}
        >
          Add Todo
        </button>
      </div>

      {todos?.map((todo) => (
        <div key={todo.id}>{todo.title}</div>
      ))}
    </main>
  );
}
```

现在流程是：

```text
点击 Add Todo
调用 addTodo mutation
新增成功
onSuccess 执行
invalidateQueries(["todos"])
React Query 重新请求 Todo 列表
页面展示最新数据
```

---

## 十六、带搜索参数的 queryKey

假设我们要做搜索。

先加一个状态：

```tsx
const [search, setSearch] = useState("");
```

然后请求时传给接口：

```tsx
const { data: todos } = useQuery({
  queryKey: ["todos", { search }],
  queryFn: () => fetchTodos(search),
});
```

注意：

```tsx
queryKey: ["todos", { search }];
```

非常重要。

因为 `fetchTodos` 依赖 `search`，所以 queryKey 也要包含 `search`。

---

## 十七、为什么请求参数必须放进 queryKey？

假设你写成这样：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(search),
});
```

当 `search` 从空字符串变成 `"react"` 时，React Query 看到的 queryKey 还是：

```text
["todos"]
```

它可能认为这是同一个请求。

这样缓存就不准确。

正确写法是：

```tsx
useQuery({
  queryKey: ["todos", { search }],
  queryFn: () => fetchTodos(search),
});
```

这样不同搜索条件会对应不同缓存：

```text
["todos", { search: "" }]
["todos", { search: "react" }]
["todos", { search: "zustand" }]
```

可以记住一条规则：

**queryFn 依赖什么参数，queryKey 就应该包含什么参数。**

---

## 十八、invalidateQueries 的部分匹配

如果 queryKey 是：

```tsx
["todos", { search }];
```

那么 mutation 成功后怎么刷新所有 Todo 查询？

可以这样写：

```tsx
queryClient.invalidateQueries({
  queryKey: ["todos"],
});
```

这里不需要写：

```tsx
queryKey: ["todos", { search }];
```

因为 `invalidateQueries` 支持按前缀部分匹配。

也就是说：

```tsx
queryClient.invalidateQueries({
  queryKey: ["todos"],
});
```

可以让这些 query 都失效：

```text
["todos"]
["todos", { search: "" }]
["todos", { search: "react" }]
["todos", { search: "query" }]
```

这很适合 mutation 成功后刷新同一类列表数据。

---

## 十九、React Query 的默认缓存行为

React Query 的缓存机制非常重要。

假设你第一次进入页面：

```text
组件挂载
useQuery 执行
显示 Loading
请求 fetchTodos
请求成功后显示 todos
数据进入缓存
```

接着你让组件卸载，再重新挂载。

例如通过按钮控制：

```tsx
{
  showDemo && <TodoApp />;
}
```

再次显示组件时，你可能会发现：

```text
页面马上显示旧数据
没有明显 Loading
但后台仍然重新请求了一次
```

这是 React Query 默认行为。

它会：

```text
先展示缓存数据
同时在后台重新请求
请求完成后更新缓存和 UI
```

这样用户体验很好，因为不用每次都看到 loading。

---

## 二十、为什么重新挂载后还能马上显示数据？

因为 React Query 会根据 queryKey 缓存数据。

只要缓存还在，再次使用同一个 queryKey：

```tsx
queryKey: ["todos"];
```

React Query 就可以立即拿出缓存数据给组件使用。

这就是为什么重新挂载后可以马上看到 Todo 列表。

---

## 二十一、为什么有缓存还会后台请求？

因为 React Query 默认会认为缓存数据很快会变“旧”。

这种状态叫：

```text
stale
```

也就是“过期、不新鲜”。

默认情况下，数据请求成功后很快会被认为是 stale。

当组件重新挂载、窗口重新聚焦等场景发生时，React Query 可能会进行后台重新请求。

这就是为什么你看到页面立即显示缓存，但控制台仍然打印了新的请求日志。

---

## 二十二、staleTime 是什么？

`staleTime` 用来控制数据多久之内被认为是“新鲜的”。

例如：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(),
  staleTime: 1000 * 60,
});
```

表示 1 分钟内，数据都被认为是新鲜的。

在这 1 分钟内：

```text
重新挂载组件时，直接用缓存
不会因为数据 stale 而自动后台重新请求
```

如果设置为：

```tsx
staleTime: Infinity;
```

表示：

```text
永远认为数据是新鲜的
除非你手动 invalidate
否则不会因为 stale 自动重新请求
```

适合一些很少变化的数据。

例如：

```text
国家列表
币种静态配置
系统常量
低频变化的字典数据
```

---

## 二十三、cacheTime / gcTime 是什么？

视频里提到了 `cacheTime`。

在 TanStack Query v5 中，这个配置更名为：

```text
gcTime
```

旧版本常见写法：

```tsx
cacheTime: 0;
```

新版本对应：

```tsx
gcTime: 0;
```

它控制的是：

```text
没有组件使用这份 query 后，缓存数据多久会被垃圾回收
```

例如：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(),
  gcTime: 0,
});
```

表示：

```text
组件一旦不再使用这个 query，缓存立即被清除
```

这样再次挂载时，就会重新 loading、重新请求。

如果设置更长：

```tsx
gcTime: 1000 * 60 * 5;
```

表示缓存可以在无人使用后保留 5 分钟。

---

## 二十四、staleTime 和 gcTime 的区别

这两个配置很容易混淆。

可以这样理解：

```text
staleTime：数据多久内算新鲜
gcTime：没人使用后缓存保留多久
```

举例：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(),
  staleTime: 60 * 1000,
  gcTime: 5 * 60 * 1000,
});
```

含义是：

```text
1 分钟内数据是新鲜的，不会因为 stale 自动重新请求
组件卸载后，缓存最多保留 5 分钟
5 分钟内重新挂载，可以先读到缓存
超过 5 分钟缓存被回收，再挂载就要重新请求
```

简单记忆：

```text
staleTime 管“新不新”
gcTime 管“留多久”
```

---

## 二十五、关闭后台重新请求

如果你不想重新挂载后后台自动请求，可以设置：

```tsx
staleTime: Infinity;
```

示例：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(),
  staleTime: Infinity,
});
```

这样 React Query 会认为缓存永远新鲜。

不过要注意：

```text
数据可能变旧
需要你主动 invalidate 或 refetch
```

例如 mutation 成功后仍然可以：

```tsx
queryClient.invalidateQueries({
  queryKey: ["todos"],
});
```

手动让数据失效。

---

## 二十六、禁用缓存

如果你希望组件每次挂载都重新请求，不保留缓存，可以设置：

```tsx
gcTime: 0;
```

在旧版本中可能是：

```tsx
cacheTime: 0;
```

示例：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(),
  gcTime: 0,
});
```

这样组件卸载后缓存会立刻被清理。

再次挂载时，就会重新进入 loading 状态并重新请求。

---

## 二十七、全局默认配置

如果你希望所有 query 使用同一套默认配置，可以在创建 QueryClient 时设置：

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
```

这样可以统一项目行为。

常见配置：

```text
staleTime：多久内数据算新鲜
gcTime：缓存保留多久
refetchOnWindowFocus：窗口重新聚焦时是否自动请求
refetchOnMount：组件挂载时是否自动请求
refetchInterval：定时轮询
retry：失败后重试次数
```

实际项目中，建议根据业务数据变化频率配置。

例如：

```text
字典配置：staleTime 可以很长
用户资产：staleTime 不宜太长
订单列表：根据业务可短一些
行情数据：可能不适合普通 useQuery，需要 WebSocket / MQTT
```

---

## 二十八、完整示例：Todo App

下面是一个完整示例，包含：

```text
useQuery
useMutation
invalidateQueries
搜索参数 queryKey
loading 状态
```

```tsx
import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

let todos: Todo[] = [
  {
    id: 1,
    title: "Learn React Query",
    completed: false,
  },
];

async function fetchTodos(search = ""): Promise<Todo[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  if (!search) return todos;

  return todos.filter((todo) =>
    todo.title.toLowerCase().includes(search.toLowerCase()),
  );
}

async function addTodo(input: { title: string }) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const todo: Todo = {
    id: Date.now(),
    title: input.title,
    completed: false,
  };

  todos = [...todos, todo];

  return todo;
}

const queryClient = new QueryClient();

export function Root() {
  return (
    <QueryClientProvider client={queryClient}>
      <TodoApp />
    </QueryClientProvider>
  );
}

function TodoApp() {
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: todos, isLoading } = useQuery({
    queryKey: ["todos", { search }],
    queryFn: () => fetchTodos(search),
  });

  const { mutateAsync: addTodoMutation } = useMutation({
    mutationFn: addTodo,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["todos"],
      });
    },
  });

  return (
    <main>
      <h1>React Query Todo Demo</h1>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="搜索 Todo"
      />

      <div>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="新增 Todo"
        />

        <button
          onClick={async () => {
            try {
              await addTodoMutation({
                title,
              });

              setTitle("");
            } catch (error) {
              console.error(error);
            }
          }}
        >
          Add Todo
        </button>
      </div>

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        todos?.map((todo) => <div key={todo.id}>{todo.title}</div>)
      )}
    </main>
  );
}
```

---

## 二十九、什么时候适合用 React Query？

React Query 适合这些场景：

```text
普通 React / Vite 项目
React Native 项目
需要客户端请求接口的页面
需要缓存接口数据
需要手动新增、删除、编辑后刷新列表
需要分页、筛选、搜索
需要处理 loading / error / retry
```

在 Next.js App Router + Server Components 中，有些数据可以直接在服务端组件中请求。

但只要你有客户端请求、交互式筛选、客户端 mutation、React Native 等场景，React Query 依然非常有价值。

---

## 三十、常见踩坑总结

### 1. queryKey 没有包含请求参数

错误：

```tsx
useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(search),
});
```

正确：

```tsx
useQuery({
  queryKey: ["todos", { search }],
  queryFn: () => fetchTodos(search),
});
```

---

### 2. mutation 成功后忘记 invalidate

新增、编辑、删除成功后，如果列表依赖旧缓存，需要手动失效：

```tsx
queryClient.invalidateQueries({
  queryKey: ["todos"],
});
```

---

### 3. 不理解默认缓存行为

React Query 默认可能会：

```text
先显示缓存
后台重新请求
窗口聚焦时重新请求
重新挂载时重新请求
```

这不是 bug，而是默认策略。

可以通过 `staleTime`、`gcTime`、`refetchOnWindowFocus` 等配置调整。

---

### 4. 把 React Query 当普通 fetch 用

如果只写请求，不理解缓存和 queryKey，就很难发挥 React Query 的价值。

React Query 的重点不是“帮你 fetch”，而是“帮你管理服务端状态”。

---

## 三十一、总结

React Query / TanStack Query 是一个非常强大的服务端状态管理库。

它可以用很少的代码完成：

```text
请求数据
显示 loading
缓存结果
执行 mutation
新增成功后刷新列表
按 queryKey 管理缓存
根据参数区分不同请求
后台重新请求
控制 staleTime 和 gcTime
```

最基础查询：

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["todos"],
  queryFn: () => fetchTodos(),
});
```

最基础修改：

```tsx
const { mutateAsync } = useMutation({
  mutationFn: addTodo,
});
```

修改成功后刷新列表：

```tsx
const queryClient = useQueryClient();

const { mutateAsync } = useMutation({
  mutationFn: addTodo,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["todos"],
    });
  },
});
```

带参数请求时：

```tsx
useQuery({
  queryKey: ["todos", { search }],
  queryFn: () => fetchTodos(search),
});
```

核心记忆：

```text
queryFn 负责怎么请求
queryKey 负责怎么缓存
useQuery 负责读服务端数据
useMutation 负责改服务端数据
invalidateQueries 负责让旧缓存失效并重新请求
staleTime 管数据多久算新鲜
gcTime 管缓存无人使用后保留多久
```

一句话总结：

**React Query 不只是请求库，而是服务端状态管理库；理解 queryKey、mutation、invalidate 和缓存策略，才算真正入门 React Query。**
