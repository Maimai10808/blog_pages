# 从零实现 React Query 的 useQuery 钩子：深入理解其核心机制

很多人使用 React Query，也就是 TanStack Query 时，会把它理解成“更好用的 `fetch + loading`”。但它真正解决的是工程级问题：多个组件共享同一次请求、缓存一致、状态自动同步、更新时精准触发重渲染，以及数据过期和重新拉取策略。

如果你能用最小代码复刻它的核心骨架，就会更容易理解这些问题：

- 两个组件都使用同一个 `queryKey`，为什么只请求一次？
- 请求完成后，为什么两个组件都会自动刷新？
- 组件卸载再挂载时为什么可能会重新请求？
- `staleTime` 是怎么控制数据过期的？
- React Query 为什么要设计 `QueryClient`、`Query`、`Observer` 这么多层？

本文不追求完整复刻官方库，而是通过一个最小版 `useQuery`，理解 React Query 的核心机制。

---

## 1. 为什么要自己写一遍 useQuery

普通请求代码通常长这样：

```tsx
// src/features/posts/Posts.tsx
useEffect(() => {
  setLoading(true);

  fetchPosts()
    .then(setPosts)
    .catch(setError)
    .finally(() => setLoading(false));
}, []);
```

这段代码在单个组件里能跑，但到了真实项目会出现几个问题：

- 多个组件请求同一份数据时会重复请求。
- 每个组件都有自己的 `loading`、`data`、`error`，状态不一致。
- 组件卸载后还要处理请求结果，避免无意义更新。
- 缓存、过期、重试、后台刷新都要手写。
- 写操作成功后，相关列表和详情缓存很难统一刷新。

React Query 的核心价值不是“帮你发请求”，而是把服务端状态抽象成可复用、可订阅、可缓存的查询对象。

---

## 2. 最终要实现的效果

假设你有两个 `Posts` 组件都调用：

```tsx
// src/features/posts/Posts.tsx
useQuery({
  queryKey: ['posts'],
  queryFn: fetchPosts,
});
```

我们希望实现这些行为：

- 只发生一次真实请求。
- 两个组件读到同一份 `data`、`status`、`error`、`isFetching`。
- 查询状态变化时，所有使用它的组件自动重新渲染。
- 组件卸载时自动取消订阅，不再接收更新。
- `staleTime` 控制数据是否过期，以及挂载时是否需要重新请求。

这就是 React Query 最核心的一套模型。

---

## 3. 整体架构：三层拆开就不晕

可以把 React Query 理解成三个角色协作。

### 3.1 QueryClient：全局查询仓库

`QueryClient` 负责用 `queryKey` 找到或创建对应的 `Query` 对象。

它的作用是：

- 维护所有查询缓存。
- 确保相同 `queryKey` 复用同一个 `Query`。
- 避免多个组件重复创建请求状态。

### 3.2 Query：有生命周期的状态机对象

每个查询都是一个独立实体，内部管理：

- `state`：`status`、`data`、`error`、`isFetching`、`lastUpdated`。
- `fetch`：发起请求、处理成功失败、请求去重。
- `subscribers`：订阅者列表。
- `setState`：统一更新状态，并通知订阅者。

`Query` 是整个实现的核心。

### 3.3 Observer：每个组件一个的观察者

组件不直接操作 `Query`，而是通过 `Observer` 订阅它。

`Observer` 负责：

- 订阅 `Query`。
- 读取 `Query` 的当前状态。
- 在 `Query` 更新时触发当前组件重新渲染。
- 组件卸载时取消订阅。
- 根据 `staleTime` 判断是否需要重新请求。

一句话总结：

> `QueryClient` 负责复用同一个 `Query`，`Query` 负责状态机、去重和通知，`useQuery` 负责给组件创建 `Observer` 并订阅 `Query`。

---

## 4. 第一步：定义基础类型

先定义最小需要的类型。

```ts
// src/lib/simple-query/types.ts
export type QueryKey = readonly unknown[];

export type QueryStatus = 'pending' | 'success' | 'error';

export type QueryOptions<TData = unknown> = {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  staleTime?: number;
};

export type QueryState<TData = unknown> = {
  status: QueryStatus;
  data: TData | undefined;
  error: unknown;
  isFetching: boolean;
  lastUpdated?: number;
};

export type QuerySubscriber = {
  notify: () => void;
};
```

这里的 `QueryState` 对应 `useQuery` 最终返回给组件的核心状态。

`status` 和 `isFetching` 要分开理解：

- `status = 'pending'`：还没有成功数据，通常用于首屏加载。
- `isFetching = true`：正在请求中，包括首屏请求和后台刷新。

---

## 5. 第二步：实现 QueryClient

`QueryClient` 是全局查询注册表。

同一个 `queryKey` 在不同组件里会映射到同一个 `Query` 实例，这样才能共享状态和请求。

```ts
// src/lib/simple-query/QueryClient.ts
import { createQuery, type Query } from './createQuery';
import type { QueryOptions } from './types';

export class QueryClient {
  private queries = new Map<string, Query>();

  getQuery<TData>(options: QueryOptions<TData>) {
    const hash = JSON.stringify(options.queryKey);
    const existingQuery = this.queries.get(hash) as Query<TData> | undefined;

    if (existingQuery) {
      return existingQuery;
    }

    const query = createQuery(options);
    this.queries.set(hash, query);

    return query;
  }
}
```

这里用 `JSON.stringify(queryKey)` 做 hash，是为了方便理解。真实 React Query 的 query key hash 更健壮，会处理更多边界情况。

关键点是：

> 共享的本质不是共享请求函数，而是共享同一个 `Query` 对象。

同一个 `Query` 里包含状态、请求逻辑和订阅者列表，所以多个组件才能自动同步。

---

## 6. 第三步：实现 Query 状态机

`Query` 不是一个普通函数，而是一个有状态、有生命周期的对象。

它要解决三件事：

- 维护查询状态。
- 防止重复请求。
- 状态变化后通知所有订阅者。

```ts
// src/lib/simple-query/createQuery.ts
import type { QueryOptions, QueryState, QuerySubscriber } from './types';

export type Query<TData = unknown> = {
  queryKey: readonly unknown[];
  queryHash: string;
  getState: () => QueryState<TData>;
  fetch: () => Promise<void>;
  subscribe: (subscriber: QuerySubscriber) => () => void;
};

export function createQuery<TData>(
  options: QueryOptions<TData>,
): Query<TData> {
  let state: QueryState<TData> = {
    status: 'pending',
    data: undefined,
    error: undefined,
    isFetching: false,
  };

  let subscribers: QuerySubscriber[] = [];
  let fetchingPromise: Promise<void> | null = null;

  const setState = (
    updater: (oldState: QueryState<TData>) => QueryState<TData>,
  ) => {
    state = updater(state);
    subscribers.forEach((subscriber) => subscriber.notify());
  };

  const fetch = async () => {
    if (!fetchingPromise) {
      fetchingPromise = (async () => {
        setState((oldState) => ({
          ...oldState,
          isFetching: true,
          error: undefined,
        }));

        try {
          const data = await options.queryFn();

          setState((oldState) => ({
            ...oldState,
            status: 'success',
            data,
            error: undefined,
            lastUpdated: Date.now(),
          }));
        } catch (error) {
          setState((oldState) => ({
            ...oldState,
            status: 'error',
            error,
          }));
        } finally {
          setState((oldState) => ({
            ...oldState,
            isFetching: false,
          }));

          fetchingPromise = null;
        }
      })();
    }

    return fetchingPromise;
  };

  const subscribe = (subscriber: QuerySubscriber) => {
    subscribers.push(subscriber);

    return () => {
      subscribers = subscribers.filter((item) => item !== subscriber);
    };
  };

  return {
    queryKey: options.queryKey,
    queryHash: JSON.stringify(options.queryKey),
    getState: () => state,
    fetch,
    subscribe,
  };
}
```

这里有两个核心点。

第一，所有状态更新都必须走 `setState`。

因为 `setState` 不只是改状态，还要通知所有订阅者：

```ts
// src/lib/simple-query/createQuery.ts
state = updater(state);
subscribers.forEach((subscriber) => subscriber.notify());
```

第二，请求去重靠 `fetchingPromise`。

如果多个组件同时调用 `fetch()`，第一个组件会创建请求，后面的组件会复用同一个正在进行的 Promise，不会重复发请求。

---

## 7. 第四步：实现 QueryObserver

`Observer` 是组件侧代理。

每个组件调用一次 `useQuery`，就会创建一个自己的 `Observer`。但这些 `Observer` 可以订阅同一个 `Query`。

```ts
// src/lib/simple-query/createQueryObserver.ts
import type { QueryClient } from './QueryClient';
import type { QueryOptions } from './types';

export function createQueryObserver<TData>(
  client: QueryClient,
  options: QueryOptions<TData>,
) {
  const query = client.getQuery(options);

  const observer = {
    notify: () => {},

    getQueryState: () => {
      return query.getState();
    },

    subscribe: () => {
      const unsubscribe = query.subscribe(observer);

      const { lastUpdated } = query.getState();
      const staleTime = options.staleTime ?? 0;
      const isStale = !lastUpdated || Date.now() - lastUpdated > staleTime;

      if (isStale) {
        query.fetch();
      }

      return unsubscribe;
    },
  };

  return observer;
}
```

`Observer` 本身不保存数据，它只读取 `query.getState()`。

这样做的好处是：

- 数据永远只有一份，存在 `Query` 里。
- 每个组件有自己的订阅关系。
- 组件卸载时只移除自己的 `Observer`。
- 重新挂载时可以根据 `staleTime` 判断要不要重新请求。

---

## 8. 第五步：实现 QueryClientProvider

如果没有 Provider，每个组件都自己创建一个 `QueryClient`，缓存就无法共享。

因此需要通过 React Context 把同一个 `QueryClient` 注入到整棵组件树。

```tsx
// src/lib/simple-query/QueryClientProvider.tsx
import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import { QueryClient } from './QueryClient';

const QueryClientContext = createContext<QueryClient | undefined>(undefined);

type QueryClientProviderProps = {
  client: QueryClient;
  children: ReactNode;
};

export function QueryClientProvider({
  client,
  children,
}: QueryClientProviderProps) {
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  );
}

export function useQueryClient() {
  const client = useContext(QueryClientContext);

  if (!client) {
    throw new Error('useQueryClient must be used within QueryClientProvider');
  }

  return client;
}
```

这就是 TanStack Query 里 `QueryClientProvider` 的核心作用：

> 让全 App 共用同一个查询仓库。

---

## 9. 第六步：实现 useQuery Hook

现在可以把前面的能力组合成 `useQuery`。

`useQuery` 的关键不是直接去 `fetch`，而是把外部 `Query` 状态变化转换成 React 组件重新渲染。

最小策略是：

```ts
// src/lib/simple-query/useQuery.ts
observer.notify = () => rerender({});
```

完整实现如下：

```ts
// src/lib/simple-query/useQuery.ts
import { useEffect, useRef, useState } from 'react';
import { createQueryObserver } from './createQueryObserver';
import { useQueryClient } from './QueryClientProvider';
import type { QueryOptions } from './types';

export function useQuery<TData>(options: QueryOptions<TData>) {
  const client = useQueryClient();
  const [, rerender] = useState({});

  const observerRef = useRef<ReturnType<typeof createQueryObserver<TData>>>();

  if (!observerRef.current) {
    observerRef.current = createQueryObserver(client, options);
  }

  const observer = observerRef.current;

  useEffect(() => {
    observer.notify = () => rerender({});
  });

  useEffect(() => {
    return observer.subscribe();
  }, [observer]);

  return observer.getQueryState();
}
```

这里有一个非常重要的点：

```ts
// src/lib/simple-query/useQuery.ts
const observerRef = useRef<ReturnType<typeof createQueryObserver<TData>>>();
```

每个组件应该只创建一个 `Observer`。如果每次 render 都创建新的 `Observer`，就可能重复订阅、重复请求、重复触发更新。

`useRef` 在这里的作用是保存组件自己的观察者实例，并让它跨渲染保持稳定。

---

## 10. 使用示例

先在应用入口创建并注入 `QueryClient`。

```tsx
// src/App.tsx
import { QueryClient } from './lib/simple-query/QueryClient';
import { QueryClientProvider } from './lib/simple-query/QueryClientProvider';
import { Posts } from './features/posts/Posts';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Posts />
      <Posts />
    </QueryClientProvider>
  );
}
```

再写业务组件：

```tsx
// src/features/posts/Posts.tsx
import { useQuery } from '../../lib/simple-query/useQuery';

type Post = {
  id: number;
  title: string;
  body: string;
};

async function fetchPosts(): Promise<Post[]> {
  const response = await fetch('https://jsonplaceholder.typicode.com/posts');

  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }

  return response.json();
}

export function Posts() {
  const { data, status, error, isFetching } = useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
    staleTime: 5000,
  });

  if (status === 'pending') {
    return <div>加载中...</div>;
  }

  if (status === 'error') {
    return (
      <div>
        错误：
        {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  return (
    <section>
      {isFetching ? <div>重新获取数据中...</div> : null}

      {data?.map((post) => (
        <article key={post.id}>
          <h3>{post.title}</h3>
          <p>{post.body}</p>
        </article>
      ))}
    </section>
  );
}
```

如果页面里渲染两个 `Posts`：

```tsx
// src/App.tsx
<Posts />
<Posts />
```

它们会订阅同一个 `Query`，因此：

- 首次挂载时只发一次请求。
- 两个组件都会显示相同的请求状态。
- 请求成功后两个组件都会拿到同一份数据。
- 卸载其中一个组件不会影响另一个组件继续订阅。

---

## 11. staleTime 是怎么工作的

`staleTime` 控制的是数据在多长时间内被认为是新鲜的。

在我们的简化实现里，逻辑在 `Observer.subscribe()` 中：

```ts
// src/lib/simple-query/createQueryObserver.ts
const { lastUpdated } = query.getState();
const staleTime = options.staleTime ?? 0;
const isStale = !lastUpdated || Date.now() - lastUpdated > staleTime;

if (isStale) {
  query.fetch();
}
```

如果没有 `lastUpdated`，说明从未成功请求过，需要请求。

如果当前时间减去 `lastUpdated` 大于 `staleTime`，说明数据过期，需要重新请求。

如果数据仍然新鲜，就直接复用缓存，不重新请求。

这也是为什么同一个组件卸载再挂载时，有时候会重新请求，有时候不会。

---

## 12. status 和 isFetching 为什么要分开

在真实 UI 里，首次加载和后台刷新不是同一种体验。

首次加载时没有数据，通常展示整块 loading：

```tsx
// src/features/posts/Posts.tsx
if (status === 'pending') {
  return <div>加载中...</div>;
}
```

但后台刷新时已经有旧数据，通常不应该把整个页面清空，而是在旧数据上方显示一个小提示：

```tsx
// src/features/posts/Posts.tsx
{isFetching ? <div>重新获取数据中...</div> : null}
```

这就是 stale-while-revalidate 的思路：

> 旧数据先展示，后台重新请求，新数据回来后再更新 UI。

`status` 表示数据生命周期，`isFetching` 表示当前是否正在请求。它们表达的是两件不同的事。

---

## 13. 为什么这种设计工程上很强

如果只用 `useEffect + fetch`，你很快会遇到这些问题：

- 多组件重复请求。
- 状态不一致。
- 缓存过期策略散落在组件里。
- 写操作后不知道该刷新哪些数据。
- 请求状态和组件生命周期耦合太深。
- 组件卸载后需要手动避免无意义更新。

React Query 把这些问题统一抽象成：

- `QueryClient`：缓存注册表。
- `Query`：服务端状态机。
- `Observer`：组件订阅者。
- `useQuery`：React Hook 入口。

组件只负责声明“我要哪份数据”，数据层负责缓存、请求、状态同步和通知。

这种设计本质上是观察者模式：

```text
Query state changes
        ↓
notify observers
        ↓
React components rerender
```

---

## 14. 这个最小实现没有做什么

我们的实现只抓住了 React Query 的核心骨架。真实 TanStack Query 还包含大量工程细节：

- `cacheTime` / `gcTime`：没人订阅后多久清理缓存。
- 请求取消：通过 `AbortController` 取消过期请求。
- retry / backoff：失败重试和退避策略。
- `refetchOnWindowFocus`：窗口聚焦时重新请求。
- reconnect：网络恢复后重新请求。
- notify batching：合并通知，避免频繁重渲染。
- 更健壮的 query key hash。
- `select`：对结果做派生选择。
- `placeholderData`：首屏占位数据。
- `keepPreviousData`：分页切换时保留旧数据。
- mutation 和 invalidate：写操作后的缓存失效。
- infinite query：无限滚动和分页缓存。

可以简单对比：

| 特性 | 本文实现 | TanStack Query |
| --- | --- | --- |
| 查询去重 | 支持 | 支持 |
| 跨组件共享缓存 | 支持 | 支持 |
| staleTime | 基础支持 | 完整支持 |
| 错误重试 | 不支持 | 支持 |
| 请求取消 | 不支持 | 支持 |
| 后台同步 | 不支持 | 支持 |
| 乐观更新 | 不支持 | 支持 |
| 分页查询 | 不支持 | 支持 |
| 无限滚动 | 不支持 | 支持 |
| 缓存持久化 | 不支持 | 支持 |

理解了这个最小骨架，再去看官方库的高级能力，会清楚很多。

---

## 15. 工程化注意事项

第一，不要在组件内部反复创建 `QueryClient`。

错误示例：

```tsx
// src/App.tsx
export function App() {
  const client = new QueryClient();

  return (
    <QueryClientProvider client={client}>
      <Posts />
    </QueryClientProvider>
  );
}
```

组件每次渲染都会创建新 client，缓存会丢失。应该把 client 放在组件外，或者用稳定初始化方式。

第二，`queryKey` 必须包含影响请求结果的参数。

```tsx
// src/features/posts/UserPosts.tsx
useQuery({
  queryKey: ['posts', userId],
  queryFn: () => fetchPosts(userId),
});
```

如果 `userId` 没进 `queryKey`，不同用户的数据可能共用同一份缓存。

第三，请求函数应该返回 Promise，不要在里面直接改组件状态。

```ts
// src/features/posts/api.ts
export async function fetchPosts(userId: string) {
  const response = await fetch(`/api/users/${userId}/posts`);

  if (!response.ok) {
    throw new Error('Failed to fetch posts');
  }

  return response.json();
}
```

数据获取和 UI 状态要分开，组件只消费 `useQuery` 的结果。

第四，`staleTime` 不是缓存保留时间。

`staleTime` 表示数据多久内算新鲜。缓存什么时候被清理，是 `cacheTime` 或 `gcTime` 解决的问题。

第五，真实项目不要自己重写 React Query。

本文实现只是为了理解原理。生产项目应该直接使用 TanStack Query，它已经处理了大量边界情况。

---

## 16. 总结

React Query 的核心不是“帮你 `fetch`”，而是：

> 用 `QueryClient` 复用 `Query`，用 `Query` 管理状态机并通知订阅者，用 `Observer` 把 React 组件订阅到 `Query` 上，从而实现跨组件共享缓存与自动更新。

通过从零实现一个最小版 `useQuery`，我们可以理解它背后的几个关键机制：

- `queryKey` 通过 hash 映射到唯一 `Query`。
- `Query` 保存服务端状态，并负责请求去重。
- `subscribers` 让多个组件订阅同一份数据。
- `Observer` 把外部状态变化接入 React 重新渲染。
- `staleTime` 控制挂载时是否需要重新请求。
- `Provider` 保证整棵组件树共享同一个 `QueryClient`。

这种观察者模式不仅用于 React Query，也广泛存在于状态管理库和数据同步库中。理解它之后，再使用 TanStack Query 的缓存、失效、重试、分页和 mutation 能力，就会更清楚这些 API 背后的工程模型。
