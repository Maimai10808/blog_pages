# React Query 不只是 useQuery：前端项目中更可维护的数据请求组织方式

在很多 React 项目里，React Query 已经变成了事实上的异步状态管理方案。它解决了 `useEffect + useState` 手写请求的问题，也提供了缓存、重试、失效、预取、后台刷新等能力。

但是，React Query 用起来很简单，不代表用好也很简单。

很多项目里会直接在组件里写：

```ts
const {data, isPending, error} = useQuery({
  queryKey: ['current-user'],
  queryFn: getCurrentUser,
});
```

这当然能跑，但当项目变大之后，会出现几个典型问题。

第一，queryKey 到处散落，后续做缓存失效时很容易写错。

第二，query options 无法复用。比如 `staleTime`、`gcTime`、`queryFn`、`queryKey` 都写在组件里，另一个组件要用同一份请求时只能复制。

第三，组件承担了太多职责。它既要发请求，又要处理 loading，又要处理 error，还要渲染 UI。

第四，如果多个组件都需要同一份数据，容易陷入“到底是 props 传下去，还是每个组件自己 useQuery”的纠结。

这篇文章主要总结一种更适合真实项目的 React Query 落地方式：把 queryKey、queryOptions、loader / prefetch、组件消费、mutation invalidate 这些职责拆开。

---

## 1. 最常见的写法：直接在组件里 useQuery

最基础的写法一般是这样：

```tsx
import {useQuery} from '@tanstack/react-query';

async function getCurrentUser() {
  const res = await fetch('/api/current-user');

  if (!res.ok) {
    throw new Error('Failed to fetch current user');
  }

  return res.json();
}

export function DashboardPage() {
  const {
    data: user,
    isPending,
    error,
  } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
  });

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Something went wrong</div>;
  }

  if (!user) {
    return <div>Please login first</div>;
  }

  return (
    <main>
      <h1>Welcome, {user.name}</h1>
    </main>
  );
}
```

这段代码没有语法问题，也不是错误代码。React Query 官方文档里也经常用类似写法演示。

但是如果放到业务项目里，它的问题会逐渐暴露出来。

组件里混合了四类职责：

```txt
组件职责：
1. 定义请求 key
2. 定义请求函数
3. 处理 loading / error / empty
4. 渲染 UI
```

也就是说，这个组件不只是 UI 组件，它还变成了数据请求配置中心。项目小的时候没问题，项目一大就会难维护。

---

## 2. 第一层优化：抽成 custom hook

很多人第一反应是封装一个 hook：

```ts
import {useQuery} from '@tanstack/react-query';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser,
    staleTime: 1000 * 60,
  });
}
```

组件里就可以这样写：

```tsx
export function DashboardPage() {
  const {
    data: user,
    isPending,
    error,
  } = useCurrentUser();

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Something went wrong</div>;
  }

  return <div>{user?.name}</div>;
}
```

这个写法比直接写在组件里好。

它解决了 query options 复制的问题。只要多个地方都调用 `useCurrentUser()`，它们就共享同一套 queryKey、queryFn、staleTime。

但是这个写法仍然有一个限制：它把这套请求配置和 `useQuery` 这个 hook 绑定死了。

也就是说，你只能在 React 组件或 React hook 里用它。

但是实际项目里，我们可能还需要在这些地方使用同一套 query options：

1. `useQuery`
2. `useSuspenseQuery`
3. `queryClient.prefetchQuery`
4. `queryClient.ensureQueryData`
5. router loader
6. mutation 成功后 `invalidateQueries`

custom hook 只能解决组件内复用，不能很好地解决组件外复用。

所以更推荐的方式是：不要优先封装 `useCurrentUser`，而是优先封装 `currentUserQueryOptions`。

---

## 3. 推荐写法：抽离 query options，而不是只抽 hook

React Query 提供了一个很关键的工具：`queryOptions`。

它的作用是把一组 query 配置变成一个可复用对象。

```ts
import {queryOptions} from '@tanstack/react-query';

export const authQueryKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authQueryKeys.all, 'current-user'] as const,
};

export async function getCurrentUser() {
  const res = await fetch('/api/current-user');

  if (!res.ok) {
    throw new Error('Failed to fetch current user');
  }

  return res.json() as Promise<{
    id: string;
    name: string;
    email: string;
  } | null>;
}

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: authQueryKeys.currentUser(),
    queryFn: getCurrentUser,
    staleTime: 1000 * 60,
  });
}
```

然后组件里使用：

```tsx
import {useQuery} from '@tanstack/react-query';
import {currentUserQueryOptions} from './query-options';

export function DashboardPage() {
  const {
    data: user,
    isPending,
    error,
  } = useQuery(currentUserQueryOptions());

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Something went wrong</div>;
  }

  return <div>{user?.name}</div>;
}
```

这样做的关键价值是：可复用的不是 hook，而是 query 的配置本身。

这套配置可以传给任何 React Query API。

例如：

```ts
useQuery(currentUserQueryOptions());
```

也可以：

```ts
useSuspenseQuery(currentUserQueryOptions());
```

也可以在组件外：

```ts
await queryClient.ensureQueryData(currentUserQueryOptions());
```

这就是它比 custom hook 更灵活的地方。

---

## 4. queryKey 必须集中管理

很多项目里最容易乱的地方就是 queryKey。

比如有的地方写：

```ts
['current-user'];
```

另一个地方写：

```ts
['auth', 'current-user'];
```

mutation 成功后又写：

```ts
queryClient.invalidateQueries({
  queryKey: ['user'],
});
```

这些 key 不统一，就会导致缓存失效不准确。

所以建议把 queryKey 单独放在一个 constants 文件里：

```ts
export const authQueryKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authQueryKeys.all, 'current-user'] as const,
  userById: (userId: string) => [...authQueryKeys.all, 'user', userId] as const,
};
```

这样 query options 里用它：

```ts
export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: authQueryKeys.currentUser(),
    queryFn: getCurrentUser,
  });
}
```

mutation 里也用它：

```ts
await queryClient.invalidateQueries({
  queryKey: authQueryKeys.currentUser(),
});
```

这样 queryKey 就不会散落在项目各处。

---

## 5. 带参数的 query options 怎么写

实际项目里，不可能所有请求都像 current user 一样没有参数。

比如根据用户 ID 请求用户详情：

```ts
export async function getUserById(userId: string) {
  const res = await fetch(`/api/users/${userId}`);

  if (!res.ok) {
    throw new Error('Failed to fetch user');
  }

  return res.json() as Promise<{
    id: string;
    name: string;
    email: string;
  }>;
}
```

queryKey：

```ts
export const userQueryKeys = {
  all: ['user'] as const,
  detail: (userId: string) => [...userQueryKeys.all, 'detail', userId] as const,
};
```

query options：

```ts
import {queryOptions} from '@tanstack/react-query';

export function userDetailQueryOptions(userId: string) {
  return queryOptions({
    queryKey: userQueryKeys.detail(userId),
    queryFn: () => getUserById(userId),
    enabled: Boolean(userId),
    staleTime: 1000 * 60,
  });
}
```

组件里：

```tsx
export function UserDetail({userId}: {userId: string}) {
  const {data: user, isPending} = useQuery(userDetailQueryOptions(userId));

  if (isPending) {
    return <div>Loading...</div>;
  }

  return <div>{user.name}</div>;
}
```

这样每个用户详情都会有自己的缓存 key：

```txt
['user', 'detail', '1']
['user', 'detail', '2']
['user', 'detail', '3']
```

缓存边界非常清晰。

---

## 6. 更进一步：把数据请求前置到路由层

前面这种写法已经比直接在组件里写 `useQuery` 好很多。

但如果想进一步优化，可以把数据请求前置到路由层，也就是在页面组件渲染之前，先把数据预取好。

在 TanStack Router / TanStack Start 里，可以通过 loader 做这件事。

伪代码如下：

```ts
import {createFileRoute, redirect} from '@tanstack/react-router';
import {currentUserQueryOptions} from '@/features/auth/query-options';

export const Route = createFileRoute('/dashboard')({
  loader: async ({context}) => {
    const user = await context.queryClient.ensureQueryData(currentUserQueryOptions());

    if (!user) {
      throw redirect({
        to: '/',
      });
    }

    return {user};
  },
  component: DashboardPage,
});
```

然后组件里可以使用 `useSuspenseQuery`：

```tsx
import {useSuspenseQuery} from '@tanstack/react-query';
import {currentUserQueryOptions} from '@/features/auth/query-options';

function DashboardPage() {
  const {data: user} = useSuspenseQuery(currentUserQueryOptions());

  return (
    <main>
      <h1>Welcome, {user.name}</h1>
    </main>
  );
}
```

这里的变化很关键。

之前组件需要处理：

- loading
- error
- empty user
- redirect
- UI rendering

现在 loader 负责：

- 请求数据
- 判断是否登录
- 未登录重定向

组件只负责：

- 渲染 UI

这更符合前端工程里的职责拆分。

---

## 7. 为什么不建议所有数据都在 client component 里 fetch

在传统 React 项目里，在组件里用 `useQuery` 请求数据很常见。

但它有一个天然问题：组件必须先渲染一次，然后才会触发异步请求。

也就是说，组件一般会经历至少两次渲染：

```txt
第一次渲染：data 是 undefined，isPending 是 true
第二次渲染：data 有值，isPending 是 false
```

如果一个页面里有多个 query，并且 query 之间还有依赖关系，那么渲染次数会更多。

比如：

```txt
第一次 render：请求 current user
第二次 render：拿到 user，再请求 user projects
第三次 render：拿到 projects，再请求 project detail
第四次 render：数据终于齐了
```

这会让组件逻辑变复杂，也容易出现 loading 状态嵌套。

如果路由层支持 loader，或者框架支持 server component，那么更好的方式是尽量把关键数据请求前置：

```txt
路由 loader / server component
  -> 预取关键数据
  -> 页面组件拿到已存在的数据
  -> 页面组件专注渲染
```

在 Next.js App Router 中，类似思想是：尽量在 Server Component 中请求首屏关键数据，然后把必要数据传给 Client Component。

React Query 仍然适合管理客户端交互数据、分页数据、mutation 后缓存同步、后台刷新等场景。

---

## 8. 多组件读取同一个 query，不一定要 props drilling

很多人会纠结一个问题：

如果 Dashboard 页面已经请求了 current user，那么子组件 UserForm 还要不要再调用一次 `useQuery(currentUserQueryOptions())`？

例如：

```tsx
function DashboardPage() {
  const {data: user} = useSuspenseQuery(currentUserQueryOptions());

  return (
    <main>
      <h1>Welcome, {user.name}</h1>
      <UserForm />
    </main>
  );
}
```

子组件：

```tsx
function UserForm() {
  const {data: user} = useSuspenseQuery(currentUserQueryOptions());

  return (
    <form>
      <input defaultValue={user.name} />
    </form>
  );
}
```

这不是重复请求。

React Query 的核心就是缓存。只要 queryKey 相同，多个组件读取的是同一份缓存数据。

你可以把它理解成：

```txt
QueryClient = 全局异步数据缓存
useQuery / useSuspenseQuery = 读取缓存的 hook
queryKey = 缓存地址
```

所以多个组件都调用：

```ts
useSuspenseQuery(currentUserQueryOptions());
```

并不代表它们都会重新打接口。React Query 会根据 queryKey 复用缓存。

这比层层 props 传递更适合复杂页面。

当然，如果数据只在父子两层之间使用，props 也没问题。但在真实业务系统里，用户信息、权限信息、订单信息、账户信息这类数据通常被很多组件消费，这时候直接读取同一个 query cache 更清晰。

---

## 9. mutation 成功后如何正确刷新缓存

React Query 的另一个核心场景是 mutation。

比如更新当前用户信息：

```ts
async function updateCurrentUser(input: {
  name: string;
  email: string;
}) {
  const res = await fetch('/api/current-user', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error('Failed to update user');
  }

  return res.json();
}
```

mutation 写法：

```tsx
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {authQueryKeys} from './query-keys';

export function UserForm() {
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: authQueryKeys.currentUser(),
      });
    },
  });

  return (
    <button
      onClick={() => {
        updateUserMutation.mutate({
          name: 'new name',
          email: 'new@example.com',
        });
      }}
    >
      Save
    </button>
  );
}
```

这里的重点是：不要手写散落的 queryKey。

不要这样：

```ts
queryClient.invalidateQueries({
  queryKey: ['current-user'],
});
```

而是这样：

```ts
queryClient.invalidateQueries({
  queryKey: authQueryKeys.currentUser(),
});
```

这样即使以后 queryKey 结构变化，也只需要改 constants 文件。

---

## 10. 一个推荐的目录结构

在真实项目中，可以按 feature 组织 React Query 相关代码。

例如认证模块：

```txt
src/
  features/
    auth/
      api.ts
      query-keys.ts
      query-options.ts
      mutations.ts
      components/
        UserForm.tsx
```

其中：

- `api.ts` 只放请求函数，例如 `getCurrentUser`、`updateCurrentUser`。
- `query-keys.ts` 只放 queryKey 工厂函数。
- `query-options.ts` 只放 queryOptions 封装。
- `mutations.ts` 放 mutationFn 或 `useMutation` 相关封装。
- `components/` 放使用这些数据的 UI 组件。

示例：

```ts
// features/auth/api.ts
export async function getCurrentUser() {
  const res = await fetch('/api/current-user');

  if (!res.ok) {
    throw new Error('Failed to fetch current user');
  }

  return res.json();
}

export async function updateCurrentUser(input: {
  name: string;
  email: string;
}) {
  const res = await fetch('/api/current-user', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error('Failed to update current user');
  }

  return res.json();
}
```

```ts
// features/auth/query-keys.ts
export const authQueryKeys = {
  all: ['auth'] as const,
  currentUser: () => [...authQueryKeys.all, 'current-user'] as const,
};
```

```ts
// features/auth/query-options.ts
import {queryOptions} from '@tanstack/react-query';
import {getCurrentUser} from './api';
import {authQueryKeys} from './query-keys';

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: authQueryKeys.currentUser(),
    queryFn: getCurrentUser,
    staleTime: 1000 * 60,
  });
}
```

```tsx
// features/auth/components/UserProfile.tsx
import {useSuspenseQuery} from '@tanstack/react-query';
import {currentUserQueryOptions} from '../query-options';

export function UserProfile() {
  const {data: user} = useSuspenseQuery(currentUserQueryOptions());

  return (
    <section>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </section>
  );
}
```

这个结构的好处是：

- 请求函数可测试。
- queryKey 可复用。
- queryOptions 可复用。
- 组件更干净。
- mutation invalidate 更稳定。

---

## 11. 在 Web3 前端里的落地思路

如果放到 Web3 前端里，这种组织方式更有价值。

比如交易平台里可能有这些数据：

- 账户信息 account。
- 当前持仓 positions。
- 当前挂单 open orders。
- 历史订单 order history。
- 市场行情 instruments。
- 订单簿 orderbook。
- 近期成交 recent trades。

它们的特点是：

1. 多组件共享。
2. 需要缓存。
3. mutation 后需要刷新。
4. 可能和 SSE / WebSocket 实时更新结合。
5. queryKey 层级比较复杂。

例如订单模块可以这样设计：

```ts
export const orderQueryKeys = {
  all: ['trade', 'order'] as const,
  open: () => [...orderQueryKeys.all, 'open'] as const,
  history: (params: {page: number; pageSize: number}) => [...orderQueryKeys.all, 'history', params] as const,
};
```

query options：

```ts
import {queryOptions} from '@tanstack/react-query';

export function openOrdersQueryOptions() {
  return queryOptions({
    queryKey: orderQueryKeys.open(),
    queryFn: getOpenOrders,
    staleTime: 1000 * 10,
  });
}

export function orderHistoryQueryOptions(params: {
  page: number;
  pageSize: number;
}) {
  return queryOptions({
    queryKey: orderQueryKeys.history(params),
    queryFn: () => getOrderHistory(params),
    staleTime: 1000 * 30,
  });
}
```

下单成功后：

```ts
const createOrderMutation = useMutation({
  mutationFn: createOrder,
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.open(),
      }),
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.all,
      }),
    ]);
  },
});
```

如果再结合 SSE，比如收到 open_order 事件，就可以一边更新本地状态，一边失效相关 query：

```ts
onmessage(event) {
  const {type, data} = JSON.parse(event.data);

  if (type === 'open_order') {
    setOrdersMap(data);
    queryClient.invalidateQueries({
      queryKey: orderQueryKeys.open(),
    });
    queryClient.invalidateQueries({
      queryKey: orderQueryKeys.all,
    });
  }
}
```

这就是 React Query 和实时数据流结合的一个典型方式。

React Query 负责：

- 请求。
- 缓存。
- 失效。
- 重新获取。
- 分页数据管理。

SSE / WebSocket 负责：

- 服务端主动推送变化。
- 驱动本地状态即时更新。
- 触发缓存失效。

两者不是互斥关系，而是互补关系。

---

## 12. 一个完整的小示例

下面给一个完整的用户模块示例。

目录：

```txt
features/user/
  api.ts
  query-keys.ts
  query-options.ts
  UserProfile.tsx
  UserForm.tsx
```

`api.ts`：

```ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export async function getCurrentUser(): Promise<User | null> {
  const res = await fetch('/api/current-user');

  if (!res.ok) {
    throw new Error('Failed to fetch current user');
  }

  return res.json();
}

export async function updateCurrentUser(input: {
  name: string;
  email: string;
}): Promise<User> {
  const res = await fetch('/api/current-user', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error('Failed to update current user');
  }

  return res.json();
}
```

`query-keys.ts`：

```ts
export const userQueryKeys = {
  all: ['user'] as const,
  current: () => [...userQueryKeys.all, 'current'] as const,
};
```

`query-options.ts`：

```ts
import {queryOptions} from '@tanstack/react-query';
import {getCurrentUser} from './api';
import {userQueryKeys} from './query-keys';

export function currentUserQueryOptions() {
  return queryOptions({
    queryKey: userQueryKeys.current(),
    queryFn: getCurrentUser,
    staleTime: 1000 * 60,
  });
}
```

`UserProfile.tsx`：

```tsx
import {useSuspenseQuery} from '@tanstack/react-query';
import {currentUserQueryOptions} from './query-options';

export function UserProfile() {
  const {data: user} = useSuspenseQuery(currentUserQueryOptions());

  if (!user) {
    return <div>Not logged in</div>;
  }

  return (
    <section>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </section>
  );
}
```

`UserForm.tsx`：

```tsx
import {useMutation, useQueryClient, useSuspenseQuery} from '@tanstack/react-query';
import {updateCurrentUser} from './api';
import {currentUserQueryOptions} from './query-options';
import {userQueryKeys} from './query-keys';

export function UserForm() {
  const queryClient = useQueryClient();
  const {data: user} = useSuspenseQuery(currentUserQueryOptions());

  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.current(),
      });
    },
  });

  if (!user) {
    return null;
  }

  return (
    <button
      disabled={updateMutation.isPending}
      onClick={() => {
        updateMutation.mutate({
          name: user.name + ' updated',
          email: user.email,
        });
      }}
    >
      Update User
    </button>
  );
}
```

这个例子体现了几个关键点：

1. queryKey 不散落。
2. queryOptions 可复用。
3. 多组件可以读取同一个 query cache。
4. mutation 成功后通过统一 queryKey 失效缓存。
5. 组件不用关心底层请求细节。

---

## 13. 总结

React Query 的核心不只是 `useQuery`。

真正适合项目落地的方式，是把请求相关逻辑拆成几个稳定的小单元：

```txt
api function
  负责真正的 HTTP 请求

query keys
  负责统一缓存地址

query options
  负责复用 query 配置

useQuery / useSuspenseQuery
  负责在组件里消费缓存

loader / prefetch
  负责在路由层提前准备数据

mutation
  负责写操作和缓存失效
```

不要把所有东西都写进组件。

也不要只满足于封装一个 `useCurrentUser` 这样的 custom hook。custom hook 可以用，但更底层、更通用的复用单元应该是 `queryOptions` 和 `queryKey`。

一个好的 React Query 项目结构，应该让你在任何地方都能复用同一套请求配置：

```ts
useQuery(currentUserQueryOptions());
useSuspenseQuery(currentUserQueryOptions());
queryClient.ensureQueryData(currentUserQueryOptions());
queryClient.prefetchQuery(currentUserQueryOptions());
queryClient.invalidateQueries({
  queryKey: userQueryKeys.current(),
});
```

这样写的好处不是代码更“花”，而是项目变大之后依然可控。

对于 Web3 交易前端、电商后台、管理系统、数据看板这类复杂业务来说，这种组织方式会明显降低后期维护成本。数据请求、缓存失效、实时推送、页面渲染都能各自保持清晰边界。
