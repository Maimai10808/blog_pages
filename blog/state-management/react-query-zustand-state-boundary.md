# React Query 和 Zustand 如何正确组合：别再把服务端数据重复塞进 Store 了

在 React 项目中，`React Query` 和 `Zustand` 都是非常流行的状态管理工具。

很多开发者会问：

```text
React Query 和 Zustand 能不能一起用？
如果能一起用，应该怎么组合？
React Query 请求回来的数据，要不要同步到 Zustand？
```

答案是：

**可以一起用，但一定要分清它们各自负责什么。**

最重要的一句话是：

```text
React Query 负责服务端状态。
Zustand 负责客户端状态。
```

如果不理解这一点，很容易写出一种看似能运行、但实际上重复存储数据、增加复杂度、后期非常容易出 bug 的代码。

本文就来系统讲清楚：**React Query 和 Zustand 的正确组合方式。**

---

## 一、先准备一个简单接口

假设我们有一个模拟后端接口：

```ts
export type User = {
  id: number;
  name: string;
};

export type GetUsersFilters = {
  limit?: number;
  page?: number;
};

export async function getUsers(filters?: GetUsersFilters): Promise<User[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      id: 1,
      name: "Darius",
    },
  ];
}
```

这个接口做了几件事：

```text
1. 接收可选 filters 参数
2. 模拟 1 秒网络延迟
3. 返回一个用户数组
```

虽然这里没有真正连接数据库，但我们可以把它理解成真实项目里的后端接口。

---

## 二、先只用 React Query 请求数据

在组件中，我们可以使用 `useQuery` 请求用户列表：

```tsx
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "./api/user";

export default function App() {
  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  return (
    <div>
      {data?.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

这里的逻辑很简单：

```text
useQuery 调用 getUsers
请求成功后 data 里拿到用户列表
组件 map 渲染用户
```

第一次渲染时，`data` 可能是 `undefined`，因为接口还没返回。

所以这里使用：

```tsx
data?.map(...)
```

避免接口未完成时出现报错。

---

## 三、错误做法：把 React Query 的 data 再同步到 Zustand

很多人会这样想：

> 既然 Zustand 是全局 Store，那我把 React Query 请求回来的 users 存进 Zustand，不就可以全局用了？

于是创建一个 `userStore.ts`：

```ts
import { create } from "zustand";
import type { User } from "./api/user";

type UserStore = {
  users: User[];
  setUsers: (users: User[]) => void;
};

export const useUserStore = create<UserStore>((set) => ({
  users: [],
  setUsers: (users) => set({ users }),
}));
```

然后在组件中这样写：

```tsx
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "./api/user";
import { useUserStore } from "./state/userStore";

export default function App() {
  const users = useUserStore((state) => state.users);
  const setUsers = useUserStore((state) => state.setUsers);

  const { data } = useQuery({
    queryKey: ["users"],
    queryFn: () => getUsers(),
  });

  useEffect(() => {
    if (data) {
      setUsers(data);
    }
  }, [data, setUsers]);

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

这段代码可以运行。

页面也能正常显示用户。

但它是错误的组合方式。

---

## 四、为什么这种写法是错的？

问题在于：**同一份 users 数据被存了两份。**

第一份在 React Query 里：

```tsx
const { data } = useQuery(...)
```

第二份在 Zustand 里：

```ts
users: User[]
```

也就是说，同一份服务端数据同时存在于：

```text
React Query Cache
Zustand Store
```

这会带来几个问题。

### 1. 数据重复存储

React Query 本身已经有缓存。

当 `queryFn` 返回数据后，React Query 会把数据放进自己的 cache 中。

这个 cache 本身就是一种异步状态管理。

所以你再把它塞进 Zustand，本质上就是重复存储。

---

### 2. 数据同步复杂

如果 React Query 的数据更新了，Zustand 也要同步更新。

如果忘记同步，就会出现：

```text
React Query 里是新数据
Zustand 里还是旧数据
页面渲染用了 Zustand，所以显示旧数据
```

这类 bug 非常隐蔽。

---

### 3. 额外增加 useEffect

原本只需要：

```tsx
const { data } = useQuery(...)
```

现在多了：

```tsx
useEffect(() => {
  if (data) {
    setUsers(data);
  }
}, [data, setUsers]);
```

这其实是把一个已经存在的状态，又复制到另一个状态中。

代码更复杂了，但价值不大。

---

### 4. React Query 的缓存优势被削弱

React Query 很强的地方在于：

```text
缓存
请求去重
后台刷新
staleTime
invalidateQueries
分页缓存
错误重试
请求状态管理
```

如果你把服务端数据同步到 Zustand 后再渲染，后续很容易绕开 React Query 的缓存模型。

这样反而降低了 React Query 的价值。

---

## 五、核心概念：服务端状态和客户端状态

要正确组合 React Query 和 Zustand，必须理解两个概念：

```text
Server State：服务端状态
Client State：客户端状态
```

---

## 六、什么是服务端状态？

服务端状态指的是：**数据源头在服务端，客户端只是请求和展示。**

例如：

```text
用户列表
商品列表
订单详情
文章内容
资产数据
行情历史数据
后端分页结果
数据库中的用户资料
```

这些数据的真正所有权在服务端。

前端只是通过 API 获取它。

例如：

```ts
const users = await getUsers();
```

这里的 `users` 就是服务端状态。

因为它来自后端接口。

服务端状态应该交给：

```text
React Query
```

---

## 七、React Query 本质上是异步状态管理库

很多人把 React Query 简单理解为“请求库”。

但更准确地说：

**React Query 是服务端状态管理库。**

它不仅帮你发请求，还会帮你管理：

```text
loading 状态
error 状态
data 状态
缓存
重新请求
请求去重
数据失效
后台更新
分页和无限滚动
```

所以 React Query 本身已经在管理状态了。

只不过它管理的是：

```text
异步服务端状态
```

因此，服务端返回的 `users` 不需要再塞进 Zustand。

---

## 八、什么是客户端状态？

客户端状态指的是：**状态源头在浏览器端，主要由用户交互产生。**

例如：

```text
当前页码
每页条数
搜索关键词
筛选条件
排序方式
弹窗是否打开
当前选中的 tab
主题模式
侧边栏是否折叠
```

这些状态不是后端原始拥有的。

它们是用户在页面上的交互状态。

例如用户点击分页按钮后，当前页码从 `1` 变成 `2`。

这个 `page` 就是客户端状态。

客户端状态适合交给：

```text
Zustand
```

---

## 九、正确思路：Zustand 存 filters，React Query 存 users

回到前面的接口：

```ts
export type GetUsersFilters = {
  limit?: number;
  page?: number;
};

export async function getUsers(filters?: GetUsersFilters): Promise<User[]> {
  // ...
}
```

这里有两类数据：

```text
users：服务端返回的数据，属于服务端状态
filters：用户在浏览器里选择的筛选条件，属于客户端状态
```

所以正确分工是：

```text
users → React Query
filters → Zustand
```

也就是说：

```text
Zustand 管理 page、limit
React Query 根据 page、limit 请求 users
```

---

## 十、改造 Zustand Store：只保存 filters

我们不再在 Zustand 中保存 `users`。

而是保存筛选条件：

```ts
import { create } from "zustand";
import type { GetUsersFilters } from "../api/user";

type UserStore = {
  filters?: GetUsersFilters;
  setFilters: (filters?: GetUsersFilters) => void;
};

export const useUserStore = create<UserStore>((set) => ({
  filters: undefined,
  setFilters: (filters) => set({ filters }),
}));
```

现在这个 Store 只负责客户端状态。

它保存的是：

```text
当前页码
每页条数
```

也就是用户操作产生的筛选条件。

---

## 十一、React Query 使用 filters 请求数据

组件中读取 Zustand 的 filters，然后传给 React Query：

```tsx
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "./api/user";
import { useUserStore } from "./state/userStore";

export default function App() {
  const filters = useUserStore((state) => state.filters);

  const { data } = useQuery({
    queryKey: ["users", filters],
    queryFn: () => getUsers(filters),
  });

  return (
    <div>
      {data?.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

这里有一个关键点：

```tsx
queryKey: ["users", filters];
```

为什么要把 `filters` 放进 `queryKey`？

因为不同 filters 对应不同请求结果。

例如：

```text
["users", { page: 1, limit: 10 }]
["users", { page: 2, limit: 10 }]
["users", { page: 1, limit: 20 }]
```

这些应该是不同缓存。

当 filters 改变时，queryKey 改变，React Query 会重新请求数据。

---

## 十二、为什么 filters 要放进 queryKey？

React Query 的缓存是通过 `queryKey` 区分的。

如果你只写：

```tsx
queryKey: ["users"];
```

即使 filters 变了，React Query 也可能认为还是同一个查询。

这样缓存就不够准确。

正确写法：

```tsx
queryKey: ["users", filters];
```

这样 React Query 知道：

```text
page=1 的 users 是一份缓存
page=2 的 users 是另一份缓存
limit=10 的 users 和 limit=20 的 users 也是不同缓存
```

这才符合服务端状态缓存逻辑。

---

## 十三、创建一个 Filters 组件

现在我们可以创建一个组件专门修改 filters。

```tsx
import { useUserStore } from "./state/userStore";

function Filters() {
  const setFilters = useUserStore((state) => state.setFilters);

  return (
    <div>
      <button
        onClick={() =>
          setFilters({
            page: 1,
            limit: 10,
          })
        }
      >
        Page 1
      </button>

      <button
        onClick={() =>
          setFilters({
            page: 2,
            limit: 10,
          })
        }
      >
        Page 2
      </button>

      <button onClick={() => setFilters(undefined)}>Clear Filters</button>
    </div>
  );
}
```

这个组件只做一件事：

```text
修改客户端筛选条件
```

它不关心 users 数据怎么请求。

---

## 十四、组合完整 App

完整组件可以这样写：

```tsx
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "./api/user";
import { useUserStore } from "./state/userStore";

function Filters() {
  const setFilters = useUserStore((state) => state.setFilters);

  return (
    <div>
      <button
        onClick={() =>
          setFilters({
            page: 1,
            limit: 10,
          })
        }
      >
        Page 1
      </button>

      <button
        onClick={() =>
          setFilters({
            page: 2,
            limit: 10,
          })
        }
      >
        Page 2
      </button>

      <button onClick={() => setFilters(undefined)}>Clear Filters</button>
    </div>
  );
}

export default function App() {
  const filters = useUserStore((state) => state.filters);

  const { data, isLoading } = useQuery({
    queryKey: ["users", filters],
    queryFn: () => getUsers(filters),
  });

  return (
    <main>
      <Filters />

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        data?.map((user) => <div key={user.id}>{user.name}</div>)
      )}
    </main>
  );
}
```

这个结构就很清晰：

```text
Filters 组件：负责修改 Zustand 中的客户端状态
App 组件：读取 filters，并交给 React Query 请求服务端数据
React Query：负责缓存和管理 users
Zustand：负责保存用户当前选择的 filters
```

---

## 十五、正确组合后的数据流

正确的数据流应该是：

```text
用户点击筛选按钮
↓
Zustand 更新 filters
↓
组件读取新的 filters
↓
React Query 的 queryKey 变化
↓
React Query 调用 getUsers(filters)
↓
后端返回 users
↓
React Query 缓存 users
↓
组件渲染 data
```

这是一条非常清晰的链路。

每个工具各司其职：

```text
Zustand：保存用户交互产生的本地状态
React Query：根据本地状态请求和缓存服务端数据
```

---

## 十六、不要把服务端状态放进 Zustand

不推荐：

```tsx
const { data } = useQuery(...);

useEffect(() => {
  if (data) {
    setUsers(data);
  }
}, [data]);
```

除非你有非常特殊的需求，否则不要这样做。

因为：

```text
React Query 已经保存了 data
Zustand 再保存一份会重复
两份数据需要同步
容易出现状态不一致
增加 useEffect 复杂度
降低缓存模型清晰度
```

尤其是在大型项目中，如果每个请求都这样写：

```text
接口数据 → React Query → useEffect → Zustand → 页面渲染
```

代码会很快变得混乱。

---

## 十七、什么时候可以把 React Query 数据写进 Zustand？

一般不推荐。

但确实存在少数特殊情况。

例如：

```text
你只想从接口初始化一次本地草稿，之后完全由客户端编辑
你要把某份服务端数据复制成一个本地可编辑副本
你需要做复杂的离线编辑状态
你明确知道后续不再希望它跟 React Query cache 保持同步
```

比如表单编辑：

```text
React Query 获取用户资料
初始化表单草稿
用户在本地编辑草稿
提交前不影响原始服务端数据
```

这种情况下，你存进 Zustand 的不再是“服务端状态本身”，而是：

```text
基于服务端数据初始化出来的客户端草稿状态
```

这两者要区分清楚。

---

## 十八、实际项目中的例子

比如交易平台中，有很多状态：

### 1. 服务端状态

适合 React Query：

```text
用户资产列表
订单列表
充值记录
公告详情
币种列表
交易对配置
历史 K 线
用户信息接口返回值
```

这些状态来自后端接口，应该交给 React Query 管理缓存、loading、error 和重新请求。

---

### 2. 客户端状态

适合 Zustand：

```text
当前选择的交易对
当前下单价格
当前下单数量
当前报价币种 tab
搜索关键词
用户选择的计价货币
弹窗打开状态
侧边栏折叠状态
WebSocket 当前连接状态
```

这些状态是用户在页面上的选择或浏览器端运行时状态，适合放在 Zustand。

---

### 3. 高频实时状态

比如：

```text
盘口
最新成交
实时行情 thumb
```

这类数据虽然来自服务端推送，但它不是普通 HTTP 请求缓存。

如果使用 MQTT / WebSocket / SSE 持续推送，可以放进专门的 Zustand Store 中。

但这属于实时客户端运行态，不是通过 React Query 管理的普通 server state。

所以要看数据来源和更新方式。

---

## 十九、React Query 和 Zustand 的职责边界

可以这样理解：

```text
React Query 关心：服务端有什么数据？
Zustand 关心：当前客户端处于什么状态？
```

React Query 适合：

```text
接口请求
缓存接口返回值
处理 loading / error
数据失效刷新
分页请求
后台更新
```

Zustand 适合：

```text
用户交互状态
全局 UI 状态
本地偏好
跨组件共享的客户端状态
WebSocket / MQTT 推送运行态
非 React 代码访问状态
```

不要让它们互相抢工作。

---

## 二十、一个推荐的项目结构

可以这样组织：

```text
src/
  api/
    user.ts
  state/
    userStore.ts
  components/
    Filters.tsx
  App.tsx
```

`api/user.ts`：

```ts
export type User = {
  id: number;
  name: string;
};

export type GetUsersFilters = {
  page?: number;
  limit?: number;
};

export async function getUsers(filters?: GetUsersFilters): Promise<User[]> {
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    {
      id: 1,
      name: "Darius",
    },
  ];
}
```

`state/userStore.ts`：

```ts
import { create } from "zustand";
import type { GetUsersFilters } from "../api/user";

type UserStore = {
  filters?: GetUsersFilters;
  setFilters: (filters?: GetUsersFilters) => void;
};

export const useUserStore = create<UserStore>((set) => ({
  filters: undefined,
  setFilters: (filters) => set({ filters }),
}));
```

`components/Filters.tsx`：

```tsx
import { useUserStore } from "../state/userStore";

export function Filters() {
  const setFilters = useUserStore((state) => state.setFilters);

  return (
    <div>
      <button onClick={() => setFilters({ page: 1, limit: 10 })}>Page 1</button>

      <button onClick={() => setFilters({ page: 2, limit: 10 })}>Page 2</button>

      <button onClick={() => setFilters(undefined)}>Clear</button>
    </div>
  );
}
```

`App.tsx`：

```tsx
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "./api/user";
import { Filters } from "./components/Filters";
import { useUserStore } from "./state/userStore";

export default function App() {
  const filters = useUserStore((state) => state.filters);

  const { data, isLoading } = useQuery({
    queryKey: ["users", filters],
    queryFn: () => getUsers(filters),
  });

  return (
    <main>
      <Filters />

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        data?.map((user) => <div key={user.id}>{user.name}</div>)
      )}
    </main>
  );
}
```

这就是一种比较干净的组合方式。

---

## 二十一、团队协作中的约定

如果你在团队项目中引入 React Query 和 Zustand，建议提前建立规则。

可以约定：

```text
接口返回数据默认不进 Zustand
React Query data 默认直接用于渲染
Zustand 只存客户端状态
filters / tab / sort / modal / selectedId 可以进 Zustand
users / orders / products 这类接口结果不要重复进 Zustand
queryKey 必须包含影响请求结果的 filters
```

这样团队成员不会每个人写一套风格。

否则很容易出现：

```text
A 页面直接用 React Query data
B 页面把 data 同步到 Zustand
C 页面又从 Zustand 改 data
D 页面 invalidate query 后 Zustand 没更新
```

最后数据流会变得非常难维护。

---

## 二十二、常见错误写法总结

### 错误一：把所有接口数据都同步到 Zustand

不推荐：

```tsx
const { data } = useQuery(...);

useEffect(() => {
  if (data) {
    setData(data);
  }
}, [data]);
```

这会制造双份状态。

---

### 错误二：queryKey 不包含 filters

不推荐：

```tsx
useQuery({
  queryKey: ["users"],
  queryFn: () => getUsers(filters),
});
```

如果 filters 变了，缓存 key 没变，React Query 无法准确区分不同请求。

推荐：

```tsx
useQuery({
  queryKey: ["users", filters],
  queryFn: () => getUsers(filters),
});
```

---

### 错误三：把 Zustand 当接口缓存用

Zustand 不是接口缓存库。

它不会自动帮你处理：

```text
staleTime
cacheTime / gcTime
请求重试
后台刷新
请求去重
invalidate
分页缓存
```

这些是 React Query 的强项。

---

### 错误四：把 React Query 当 UI 状态管理用

React Query 也不适合管理所有客户端 UI 状态。

例如：

```text
弹窗是否打开
当前 tab
侧边栏折叠
临时筛选条件
本地表单草稿
```

这些更适合 Zustand 或组件局部状态。

---

## 二十三、判断一个状态该放哪里

可以用下面这套判断方式。

### 1. 数据来自后端接口吗？

是：

```text
放 React Query
```

例如：

```text
用户列表
商品详情
订单记录
资产数据
公告详情
```

---

### 2. 数据是用户在页面上的选择吗？

是：

```text
放 Zustand 或 useState
```

例如：

```text
当前页码
搜索关键词
当前 tab
筛选条件
弹窗开关
```

---

### 3. 多个远距离组件都要用吗？

是：

```text
放 Zustand
```

如果只有当前组件使用，可以用 `useState`。

---

### 4. 它是否需要 React Query 的缓存、重试、失效机制？

是：

```text
放 React Query
```

---

### 5. 它是否是服务端数据的本地草稿副本？

是：

```text
可以从 React Query 初始化，然后放 Zustand / useState
但要明确它已经是客户端草稿，不再是原始 server state
```

---

## 二十四、最终推荐模式

推荐模式是：

```text
Zustand 保存 client state
React Query 根据 client state 获取 server state
```

也就是：

```text
filters in Zustand
↓
queryKey includes filters
↓
queryFn sends filters to API
↓
data stays in React Query
↓
UI renders from React Query data
```

这就是最清晰、最容易维护的组合方式。

---

## 二十五、总结

React Query 和 Zustand 都很强，但它们强在不同地方。

React Query 是：

```text
服务端状态管理工具
```

它负责：

```text
请求接口
缓存接口结果
处理 loading / error
数据失效与重新请求
```

Zustand 是：

```text
客户端状态管理工具
```

它负责：

```text
用户交互状态
全局 UI 状态
本地偏好
跨组件共享的浏览器端状态
```

错误方式是：

```text
React Query 请求 users
useEffect 把 users 存进 Zustand
组件再从 Zustand 渲染 users
```

正确方式是：

```text
Zustand 存 filters
React Query 用 filters 请求 users
users 留在 React Query cache 中
组件直接渲染 React Query 的 data
```

一句话总结：

**不要把 React Query 已经管理好的服务端数据再复制进 Zustand；Zustand 应该管理客户端状态，React Query 应该管理服务端状态。**
