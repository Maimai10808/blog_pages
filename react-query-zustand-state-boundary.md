# React Query + Zustand 正确结合方式：不要把接口数据复制进 Store

在很多 React 项目里，React Query 和 Zustand 都非常常见。

React Query 负责请求数据、缓存数据、处理异步状态。Zustand 负责全局状态管理、跨组件共享状态。因为它们都和“状态”有关，所以很多人会很自然地把它们组合起来。

但是问题也出在这里。

很多项目会写出这样的代码：React Query 请求接口，拿到 `data` 之后，再通过 `useEffect` 把 `data` 塞进 Zustand。然后组件不再直接消费 React Query 的 `data`，而是消费 Zustand 里的 `users`、`orders`、`positions`。

这段代码能跑，但在真实项目里，这是非常典型的错误组合方式。

这篇文章主要讲清楚一个核心原则：

> React Query 管 server state，Zustand 管 client state。

不要把接口返回的数据再复制一份到 Zustand。真正合理的做法是：接口数据留在 React Query cache 里，筛选条件、分页参数、弹窗状态、当前选中项这类客户端状态放到 Zustand 里。

---

## 1. React Query 和 Zustand 分别解决什么问题

先明确两类状态。

第一类是 server state，也就是服务端状态。

比如：

- 用户列表
- 当前用户信息
- 订单列表
- 持仓数据
- 账户余额
- 市场行情
- Token 列表
- 历史成交记录

这些数据的源头在服务端。前端只是通过 HTTP、SSE、WebSocket、RPC 去读取它们。它们可能会过期，可能需要重新请求，可能需要缓存，也可能被其他用户、其他系统、链上事件改变。

React Query 最适合管理这类状态。

它不是简单替代 `useEffect` 的请求库，而是一个异步状态管理工具。它负责：

- 请求数据
- 缓存数据
- 根据 `queryKey` 复用缓存
- 请求去重
- 后台刷新
- `staleTime / gcTime` 管理
- mutation 后缓存失效
- 预取数据
- 处理 loading / error / success 状态

第二类是 client state，也就是客户端状态。

比如：

- 当前页码 `page`
- 每页数量 `limit`
- 搜索关键词 `keyword`
- 筛选条件 `filters`
- 当前选中的 tab
- 弹窗是否打开
- 表单临时输入值
- 侧边栏展开状态
- 当前选中的 token
- 用户在页面上的临时排序方式

这些状态的源头在浏览器。它们不一定来自服务端，而是由用户交互产生。Zustand 最适合管理这类状态。

所以 React Query 和 Zustand 不是互相替代关系，而是分工关系：

- React Query：管理服务端异步数据。
- Zustand：管理客户端交互状态。

一旦这个边界混乱，项目就会变得很难维护。

---

## 2. 最简单的 React Query 写法

假设我们有一个用户列表接口。

```ts
// features/user/api.ts
export interface User {
  id: string;
  name: string;
}

export interface GetUsersFilters {
  page?: number;
  limit?: number;
}

export async function getUsers(filters?: GetUsersFilters): Promise<User[]> {
  const searchParams = new URLSearchParams();

  if (filters?.page) {
    searchParams.set('page', String(filters.page));
  }

  if (filters?.limit) {
    searchParams.set('limit', String(filters.limit));
  }

  const res = await fetch(`/api/users?${searchParams.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }

  return res.json();
}
```

最简单的组件写法是这样：

```tsx
// App.tsx
import {useQuery} from '@tanstack/react-query';
import {getUsers} from './features/user/api';

export function App() {
  const {data: users, isPending, error} = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Something went wrong</div>;
  }

  return (
    <main>
      {users?.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </main>
  );
}
```

这段代码没问题，也能正常工作。

React Query 会请求 `/api/users`，并把结果放进 query cache。下一次其他组件使用同一个 `queryKey` 时，React Query 可以直接从缓存里读取数据。

但是接下来很多人会开始思考：既然项目里也用了 Zustand，那要不要把 `users` 放进 Zustand？

于是错误写法就出现了。

---

## 3. 错误写法：把 React Query 的 data 同步进 Zustand

很多人会这样写一个 store：

```ts
// features/user/store.ts
import {create} from 'zustand';
import type {User} from './api';

interface UserStore {
  users: User[];
  setUsers: (users: User[]) => void;
}

export const useUserStore = create<UserStore>(set => ({
  users: [],
  setUsers: users => set({users}),
}));
```

然后在组件里用 `useEffect` 把 React Query 的 `data` 同步进去：

```tsx
// App.tsx
import {useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import {getUsers} from './features/user/api';
import {useUserStore} from './features/user/store';

export function App() {
  const {data} = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  });

  const users = useUserStore(state => state.users);
  const setUsers = useUserStore(state => state.setUsers);

  useEffect(() => {
    if (data) {
      setUsers(data);
    }
  }, [data, setUsers]);

  return (
    <main>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </main>
  );
}
```

这段代码也能跑。

但它的问题很明显：同一份 `users` 被保存了两次。

第一份在 React Query cache 里。

第二份在 Zustand store 里。

这就产生了重复数据源。

真实项目里，重复数据源是很危险的。因为你必须回答一堆额外问题：

- 到底哪一份数据是准的？
- React Query 的 `data` 更新了，Zustand 没更新怎么办？
- Zustand 被其他地方修改了，React Query cache 怎么办？
- mutation 成功后，是 invalidate query，还是 setStore？
- 分页、筛选、排序变化后，store 里旧数据怎么清理？
- 多个组件同时操作时，谁负责同步？

这不是在增强架构，而是在制造额外复杂度。

React Query 本身已经是 server state 的缓存层。你把它的 `data` 再复制到 Zustand，本质上是在重复实现一个不完整的缓存系统。

所以这类写法要避免：

```tsx
useEffect(() => {
  if (data) {
    setUsers(data);
  }
}, [data]);
```

尤其是下面这些服务端数据，不建议无脑同步进 Zustand：

- `users`
- `orders`
- `positions`
- `account`
- `balances`
- `transactions`
- `orderBook`
- `recentTrades`
- `tokenList`
- `nftList`

它们应该优先留在 React Query cache 里。

---

## 4. 正确边界：React Query 管 server state，Zustand 管 client state

用户列表里的 `users` 是服务端数据。

但是用户列表的 `page`、`limit`、`keyword`、`sort`、`selectedTab` 是客户端状态。

所以正确做法不是把 `users` 放进 Zustand，而是把 `filters` 放进 Zustand。

React Query 根据 `filters` 去请求数据。

也就是说，数据流应该是这样：

```text
Zustand 保存 filters
  -> React Query 读取 filters
  -> filters 进入 queryKey
  -> queryFn 根据 filters 请求接口
  -> 接口返回的 users 留在 React Query cache
  -> 组件消费 React Query 的 users 和 Zustand 的 filters
```

这样两边职责就清楚了。

---

## 5. 推荐的项目落地结构

真实项目里可以按 feature 组织代码：

```text
src/
  features/
    user/
      api.ts
      query-keys.ts
      query-options.ts
      store.ts
      components/
        UserList.tsx
        UserFilters.tsx
```

每个文件的职责如下：

- `api.ts` 只放请求函数和接口类型。
- `query-keys.ts` 统一管理 queryKey，避免字符串散落。
- `query-options.ts` 封装 React Query 的 queryOptions。
- `store.ts` 放 Zustand store，但只保存客户端状态，比如 filters、page、limit。
- `components/` 只负责消费数据和渲染 UI。

这个结构的核心是单一职责。请求、缓存 key、查询配置、客户端状态、组件渲染分别放在不同位置。

---

## 6. 推荐写法一：抽离 api、queryKey、queryOptions

先定义 API：

```ts
// features/user/api.ts
export interface User {
  id: string;
  name: string;
}

export interface GetUsersFilters {
  page?: number;
  limit?: number;
  keyword?: string;
}

export async function getUsers(filters?: GetUsersFilters): Promise<User[]> {
  const searchParams = new URLSearchParams();

  if (filters?.page) {
    searchParams.set('page', String(filters.page));
  }

  if (filters?.limit) {
    searchParams.set('limit', String(filters.limit));
  }

  if (filters?.keyword) {
    searchParams.set('keyword', filters.keyword);
  }

  const res = await fetch(`/api/users?${searchParams.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }

  return res.json();
}
```

然后集中管理 queryKey：

```ts
// features/user/query-keys.ts
import type {GetUsersFilters} from './api';

export const userQueryKeys = {
  all: ['user'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (filters?: GetUsersFilters) =>
    [...userQueryKeys.lists(), filters ?? {}] as const,
};
```

这里的关键点是：影响请求结果的参数必须进入 `queryKey`。

如果 `page`、`limit`、`keyword` 会影响用户列表，那么它们就必须进入 `queryKey`。否则 React Query 无法区分不同筛选条件下的缓存。

接着封装 `queryOptions`：

```ts
// features/user/query-options.ts
import {queryOptions} from '@tanstack/react-query';
import {getUsers, type GetUsersFilters} from './api';
import {userQueryKeys} from './query-keys';

export function usersQueryOptions(filters?: GetUsersFilters) {
  return queryOptions({
    queryKey: userQueryKeys.list(filters),
    queryFn: () => getUsers(filters),
    staleTime: 1000 * 30,
  });
}
```

这样做比直接封装 `useUsers()` 更灵活。

因为 `usersQueryOptions(filters)` 可以用于：

```ts
useQuery(usersQueryOptions(filters));
useSuspenseQuery(usersQueryOptions(filters));
queryClient.prefetchQuery(usersQueryOptions(filters));
queryClient.ensureQueryData(usersQueryOptions(filters));
queryClient.invalidateQueries({
  queryKey: userQueryKeys.lists(),
});
```

可复用的核心不是 hook，而是 query 配置本身。

---

## 7. 推荐写法二：Zustand 只保存客户端 filters

现在定义 Zustand store。

注意，这里不保存 `users`，只保存 `filters`。

```ts
// features/user/store.ts
import {create} from 'zustand';
import type {GetUsersFilters} from './api';

interface UserFilterStore {
  filters: GetUsersFilters;
  setFilters: (filters: Partial<GetUsersFilters>) => void;
  resetFilters: () => void;
}

const initialFilters: GetUsersFilters = {
  page: 1,
  limit: 20,
  keyword: '',
};

export const useUserFilterStore = create<UserFilterStore>(set => ({
  filters: initialFilters,
  setFilters: nextFilters =>
    set(state => ({
      filters: {
        ...state.filters,
        ...nextFilters,
      },
    })),
  resetFilters: () =>
    set({
      filters: initialFilters,
    }),
}));
```

这才是 Zustand 在这个场景里的职责。

它不关心 `users` 是什么，也不负责保存接口返回值。它只关心用户在浏览器里的交互状态：当前第几页、每页多少条、搜索关键词是什么。

---

## 8. 推荐写法三：组件只消费结果，不复制数据

列表组件可以这样写：

```tsx
// features/user/components/UserList.tsx
import {useQuery} from '@tanstack/react-query';
import {usersQueryOptions} from '../query-options';
import {useUserFilterStore} from '../store';

export function UserList() {
  const filters = useUserFilterStore(state => state.filters);
  const {
    data: users,
    isPending,
    error,
  } = useQuery(usersQueryOptions(filters));

  if (isPending) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Failed to load users</div>;
  }

  return (
    <section>
      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}
    </section>
  );
}
```

这里没有 `useEffect`，也没有 `setUsers(data)`。

组件只是从 Zustand 读取 `filters`，然后把 `filters` 交给 React Query。

React Query 根据 `queryKey` 判断是否有缓存、是否需要重新请求、是否复用已有数据。

筛选组件可以独立消费 Zustand：

```tsx
// features/user/components/UserFilters.tsx
import {useUserFilterStore} from '../store';

export function UserFilters() {
  const filters = useUserFilterStore(state => state.filters);
  const setFilters = useUserFilterStore(state => state.setFilters);
  const resetFilters = useUserFilterStore(state => state.resetFilters);

  return (
    <section>
      <input
        value={filters.keyword ?? ''}
        placeholder="Search user"
        onChange={event => {
          setFilters({
            keyword: event.target.value,
            page: 1,
          });
        }}
      />

      <select
        value={filters.limit ?? 20}
        onChange={event => {
          setFilters({
            limit: Number(event.target.value),
            page: 1,
          });
        }}
      >
        <option value={10}>10 / page</option>
        <option value={20}>20 / page</option>
        <option value={50}>50 / page</option>
      </select>

      <button onClick={resetFilters}>Reset</button>
    </section>
  );
}
```

页面组合：

```tsx
// features/user/components/UserPage.tsx
import {UserFilters} from './UserFilters';
import {UserList} from './UserList';

export function UserPage() {
  return (
    <main>
      <h1>User Management</h1>
      <UserFilters />
      <UserList />
    </main>
  );
}
```

这个结构很清楚：

- `UserFilters` 负责改 client state。
- `UserList` 负责根据 client state 请求 server state。
- Zustand 不保存接口数据。
- React Query 不管理输入框和筛选器状态。

---

## 9. mutation 成功后如何处理缓存

如果有新增用户、更新用户、删除用户，就应该通过 React Query 的 invalidate 机制刷新服务端数据。

例如更新用户：

```ts
// features/user/api.ts
export async function updateUser(input: {
  id: string;
  name: string;
}): Promise<User> {
  const res = await fetch(`/api/users/${input.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: input.name,
    }),
  });

  if (!res.ok) {
    throw new Error('Failed to update user');
  }

  return res.json();
}
```

mutation：

```tsx
// features/user/components/UpdateUserButton.tsx
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {updateUser} from '../api';
import {userQueryKeys} from '../query-keys';

export function UpdateUserButton(props: {
  userId: string;
  currentName: string;
}) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.lists(),
      });
    },
  });

  return (
    <button
      disabled={updateMutation.isPending}
      onClick={() => {
        updateMutation.mutate({
          id: props.userId,
          name: props.currentName + ' updated',
        });
      }}
    >
      Update
    </button>
  );
}
```

这里也不需要手动操作 Zustand。

因为用户列表是 server state。更新成功后，正确动作是让 React Query 对相关 query 失效，然后重新获取。

不要这样做：

```ts
// 不推荐
setUsers(users.map(user => (user.id === id ? nextUser : user)));
```

这种写法看起来即时，但它绕过了服务端状态管理。真实项目里，如果服务端返回字段、权限、排序、分页、统计数据发生变化，本地手动改 store 很容易和服务端不一致。

可以做 optimistic update，但那应该通过 React Query 的 `onMutate / onError / onSettled` 机制完成，而不是把所有接口数据搬进 Zustand。

---

## 10. 结合真实业务：Web3 交易平台里怎么用

在 Web3 前端里，这个边界更重要。

比如一个交易平台可能有这些数据：

- 账户信息 `account`
- 当前持仓 `positions`
- 当前挂单 `open orders`
- 历史订单 `order history`
- 市场行情 `instruments`
- 订单簿 `orderbook`
- 近期成交 `recent trades`
- 当前选择的交易对 `selectedInstrument`
- 当前选择的 tab
- 当前筛选条件 `filters`
- 下单弹窗状态
- 风险提示弹窗状态

其中：

- `account`、`positions`、`open orders`、`history`、`instruments`、`orderbook`、`recent trades` 更偏 server state。
- `selectedInstrument`、`filters`、`selectedTab`、`modalOpen`、`formDraft` 更偏 client state。

所以可以这样拆。

订单查询：

```ts
// features/order/query-keys.ts
export interface OrderFilters {
  page: number;
  pageSize: number;
  side?: 'buy' | 'sell';
  status?: 'open' | 'filled' | 'cancelled';
}

export const orderQueryKeys = {
  all: ['trade', 'order'] as const,
  open: () => [...orderQueryKeys.all, 'open'] as const,
  history: (filters: OrderFilters) =>
    [...orderQueryKeys.all, 'history', filters] as const,
};
```

订单筛选条件放 Zustand：

```ts
// features/order/store.ts
import {create} from 'zustand';
import type {OrderFilters} from './query-keys';

interface OrderUiStore {
  historyFilters: OrderFilters;
  setHistoryFilters: (filters: Partial<OrderFilters>) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (orderId: string | null) => void;
}

export const useOrderUiStore = create<OrderUiStore>(set => ({
  historyFilters: {
    page: 1,
    pageSize: 20,
  },
  setHistoryFilters: filters =>
    set(state => ({
      historyFilters: {
        ...state.historyFilters,
        ...filters,
      },
    })),
  selectedOrderId: null,
  setSelectedOrderId: selectedOrderId => set({selectedOrderId}),
}));
```

订单数据用 React Query：

```ts
// features/order/api.ts
import type {OrderFilters} from './query-keys';

export interface Order {
  id: string;
  instrument: string;
  side: 'buy' | 'sell';
  price: string;
  amount: string;
  status: string;
}

export async function getOrderHistory(filters: OrderFilters): Promise<Order[]> {
  const res = await fetch('/api/trade/orders/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(filters),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch order history');
  }

  return res.json();
}
```

```ts
// features/order/query-options.ts
import {queryOptions} from '@tanstack/react-query';
import {getOrderHistory} from './api';
import {orderQueryKeys, type OrderFilters} from './query-keys';

export function orderHistoryQueryOptions(filters: OrderFilters) {
  return queryOptions({
    queryKey: orderQueryKeys.history(filters),
    queryFn: () => getOrderHistory(filters),
    staleTime: 1000 * 10,
  });
}
```

组件消费：

```tsx
// features/order/components/OrderHistory.tsx
import {useQuery} from '@tanstack/react-query';
import {orderHistoryQueryOptions} from '../query-options';
import {useOrderUiStore} from '../store';

export function OrderHistory() {
  const filters = useOrderUiStore(state => state.historyFilters);
  const setSelectedOrderId = useOrderUiStore(state => state.setSelectedOrderId);
  const {data: orders = [], isPending} = useQuery(
    orderHistoryQueryOptions(filters),
  );

  if (isPending) {
    return <div>Loading orders...</div>;
  }

  return (
    <section>
      {orders.map(order => (
        <button key={order.id} onClick={() => setSelectedOrderId(order.id)}>
          {order.instrument} - {order.side} - {order.status}
        </button>
      ))}
    </section>
  );
}
```

这里 Zustand 保存的是：

- 当前筛选条件
- 当前选中的订单 ID

React Query 保存的是：

- 订单列表数据

这就是更合理的组合方式。

---

## 11. 结合 SSE：收到推送后应该更新谁

在交易系统里，经常会有 SSE 或 WebSocket 推送。

比如收到订单更新：

```json
{
  "type": "open_order",
  "data": {
    "id": "order_1",
    "status": "filled"
  }
}
```

这时候应该怎么处理？

如果订单列表主要由 React Query 管理，可以直接 invalidate：

```ts
queryClient.invalidateQueries({
  queryKey: orderQueryKeys.open(),
});

queryClient.invalidateQueries({
  queryKey: orderQueryKeys.all,
});
```

如果页面里有一个为了高频渲染优化而设计的本地 map，比如 Jotai / Zustand / reducer，也可以做即时更新。但要注意，这种状态更像 UI 层缓存或实时展示层，不应该取代 React Query 作为服务端数据来源。

简化写法：

```ts
function handleOrderSSE(event: MessageEvent, queryClient: QueryClient) {
  const message = JSON.parse(event.data);

  if (message.type === 'open_order') {
    queryClient.invalidateQueries({
      queryKey: orderQueryKeys.open(),
    });

    queryClient.invalidateQueries({
      queryKey: orderQueryKeys.all,
    });
  }
}
```

更完整一点，可以结合本地即时更新：

```ts
function handleOrderSSE(
  event: MessageEvent,
  options: {
    queryClient: QueryClient;
    updateOrderMap: (order: Order) => void;
  },
) {
  const message = JSON.parse(event.data);

  if (message.type !== 'open_order') {
    return;
  }

  options.updateOrderMap(message.data);

  options.queryClient.invalidateQueries({
    queryKey: orderQueryKeys.open(),
  });

  options.queryClient.invalidateQueries({
    queryKey: orderQueryKeys.all,
  });
}
```

这里的原则是：

- 实时推送可以让 UI 更快更新。
- React Query invalidate 可以保证最终和服务端一致。
- 不要因为用了 SSE，就把所有服务端数据都搬进 Zustand。

---

## 12. 一个完整的小示例

下面给一个更完整的用户列表例子。这个例子展示 React Query 和 Zustand 的正确边界。

目录：

```text
features/user/
  api.ts
  query-keys.ts
  query-options.ts
  store.ts
  components/
    UserFilters.tsx
    UserList.tsx
    UserPage.tsx
```

`api.ts`：

```ts
// features/user/api.ts
export interface User {
  id: string;
  name: string;
}

export interface GetUsersFilters {
  page: number;
  limit: number;
  keyword?: string;
}

export async function getUsers(filters: GetUsersFilters): Promise<User[]> {
  const searchParams = new URLSearchParams();
  searchParams.set('page', String(filters.page));
  searchParams.set('limit', String(filters.limit));

  if (filters.keyword) {
    searchParams.set('keyword', filters.keyword);
  }

  const res = await fetch(`/api/users?${searchParams.toString()}`);

  if (!res.ok) {
    throw new Error('Failed to fetch users');
  }

  return res.json();
}
```

`query-keys.ts`：

```ts
// features/user/query-keys.ts
import type {GetUsersFilters} from './api';

export const userQueryKeys = {
  all: ['user'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (filters: GetUsersFilters) =>
    [...userQueryKeys.lists(), filters] as const,
};
```

`query-options.ts`：

```ts
// features/user/query-options.ts
import {queryOptions} from '@tanstack/react-query';
import {getUsers, type GetUsersFilters} from './api';
import {userQueryKeys} from './query-keys';

export function usersQueryOptions(filters: GetUsersFilters) {
  return queryOptions({
    queryKey: userQueryKeys.list(filters),
    queryFn: () => getUsers(filters),
    staleTime: 1000 * 30,
  });
}
```

`store.ts`：

```ts
// features/user/store.ts
import {create} from 'zustand';
import type {GetUsersFilters} from './api';

interface UserFilterStore {
  filters: GetUsersFilters;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setKeyword: (keyword: string) => void;
  reset: () => void;
}

const initialFilters: GetUsersFilters = {
  page: 1,
  limit: 20,
  keyword: '',
};

export const useUserFilterStore = create<UserFilterStore>(set => ({
  filters: initialFilters,
  setPage: page =>
    set(state => ({
      filters: {
        ...state.filters,
        page,
      },
    })),
  setLimit: limit =>
    set(state => ({
      filters: {
        ...state.filters,
        limit,
        page: 1,
      },
    })),
  setKeyword: keyword =>
    set(state => ({
      filters: {
        ...state.filters,
        keyword,
        page: 1,
      },
    })),
  reset: () =>
    set({
      filters: initialFilters,
    }),
}));
```

`UserFilters.tsx`：

```tsx
// features/user/components/UserFilters.tsx
import {useUserFilterStore} from '../store';

export function UserFilters() {
  const filters = useUserFilterStore(state => state.filters);
  const setKeyword = useUserFilterStore(state => state.setKeyword);
  const setLimit = useUserFilterStore(state => state.setLimit);
  const reset = useUserFilterStore(state => state.reset);

  return (
    <section>
      <input
        value={filters.keyword ?? ''}
        placeholder="Search users"
        onChange={event => setKeyword(event.target.value)}
      />

      <select
        value={filters.limit}
        onChange={event => setLimit(Number(event.target.value))}
      >
        <option value={10}>10 / page</option>
        <option value={20}>20 / page</option>
        <option value={50}>50 / page</option>
      </select>

      <button onClick={reset}>Reset</button>
    </section>
  );
}
```

`UserList.tsx`：

```tsx
// features/user/components/UserList.tsx
import {useQuery} from '@tanstack/react-query';
import {usersQueryOptions} from '../query-options';
import {useUserFilterStore} from '../store';

export function UserList() {
  const filters = useUserFilterStore(state => state.filters);
  const setPage = useUserFilterStore(state => state.setPage);
  const {
    data: users = [],
    isPending,
    error,
    isFetching,
  } = useQuery(usersQueryOptions(filters));

  if (isPending) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Failed to load users</div>;
  }

  return (
    <section>
      {isFetching && <div>Refreshing...</div>}

      {users.map(user => (
        <div key={user.id}>{user.name}</div>
      ))}

      <button
        disabled={filters.page <= 1}
        onClick={() => setPage(filters.page - 1)}
      >
        Prev
      </button>

      <button onClick={() => setPage(filters.page + 1)}>Next</button>
    </section>
  );
}
```

`UserPage.tsx`：

```tsx
// features/user/components/UserPage.tsx
import {UserFilters} from './UserFilters';
import {UserList} from './UserList';

export function UserPage() {
  return (
    <main>
      <h1>User List</h1>
      <UserFilters />
      <UserList />
    </main>
  );
}
```

这个例子的核心不是用户列表，而是状态边界：

- `filters` 在 Zustand。
- `users` 在 React Query。
- `filters` 变化后，`queryKey` 变化。
- `queryKey` 变化后，React Query 自动请求新数据。
- 组件没有 `useEffect(data => setUsers(data))`。

这就是更稳的组织方式。

---

## 13. 工程化注意事项

第一，不要把 React Query 的返回数据复制进 Zustand。

这类代码应该尽量避免：

```tsx
useEffect(() => {
  if (data) {
    setStoreData(data);
  }
}, [data]);
```

除非你非常明确地知道自己在做 UI 层派生缓存，并且有完整的同步策略。否则它通常只是重复状态源。

第二，Zustand 适合保存客户端状态。

例如：

- `filters`
- `page`
- `limit`
- `keyword`
- `selectedId`
- `selectedTab`
- `modalOpen`
- `formDraft`
- `sort`
- `layout preference`

这些状态本来就属于浏览器，放 Zustand 是合理的。

第三，React Query 适合保存服务端状态。

例如：

- `users`
- `orders`
- `positions`
- `balances`
- `account`
- `history`
- `tokenList`
- `market data`

这些数据应该优先通过 `queryKey` 进入 React Query cache。

第四，影响请求结果的参数必须进入 `queryKey`。

错误示例：

```ts
useQuery({
  queryKey: ['users'],
  queryFn: () => getUsers(filters),
});
```

这里 `filters` 改了，但 `queryKey` 没变，缓存语义就不清晰。

推荐写法：

```ts
useQuery({
  queryKey: ['users', filters],
  queryFn: () => getUsers(filters),
});
```

更推荐集中封装：

```ts
useQuery(usersQueryOptions(filters));
```

第五，mutation 成功后应该 invalidate 对应 `queryKey`。

不要到处手写字符串 key：

```ts
queryClient.invalidateQueries({
  queryKey: ['users'],
});
```

更推荐：

```ts
queryClient.invalidateQueries({
  queryKey: userQueryKeys.lists(),
});
```

第六，不要把 Zustand 当成所有状态的垃圾桶。

Zustand 很灵活，但灵活不等于所有状态都应该放进去。全局 store 一旦膨胀，后期会变成另一个维护负担。

第七，在 Web3 项目里尤其要注意数据来源。

链上余额、订单状态、持仓、交易记录，本质上都不是纯客户端状态。它们可能来自 RPC、后端索引器、SSE、WebSocket、合约事件。前端应该有明确的数据同步策略，而不是简单塞进 store。

---

## 14. 总结

React Query 和 Zustand 可以一起使用，但不能混用职责。

这篇文章的核心不是某个 API 怎么调用，而是项目里应该如何划分状态边界。

一个可维护的组合方式通常是：

- React Query 管 server state。
- Zustand 管 client state。
- 接口返回数据不要再复制一份到 Zustand。
- 筛选条件、分页、选中项、弹窗状态可以放到 Zustand。
- `queryKey` 必须包含影响请求结果的参数。
- mutation 成功后通过统一 `queryKey` 做 invalidate。
- 组件只消费封装后的结果，不负责同步两套状态。

技术本身不复杂，真正容易出问题的是边界不清。React Query 已经提供了服务端异步状态管理能力，Zustand 也已经提供了轻量客户端状态管理能力。把它们放在各自擅长的位置，项目结构会更简单，数据流也会更可控。
