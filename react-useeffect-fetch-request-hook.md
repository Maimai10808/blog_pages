# React 数据请求不要只会 useEffect：从 loading、error 到竞态处理的工程化封装

在 React 项目里，请求数据看起来很简单：组件挂载后 `fetch` 一下，拿到结果后 `setState`。很多初学者第一次写接口请求，基本都是这个思路。

这当然能跑。但真实项目里的数据请求远不止“把接口数据展示出来”这么简单。一个合格的数据请求逻辑，至少要考虑 `loading`、`error`、请求取消、竞态问题、组件卸载后的状态更新、参数变化后的重新请求，以及后续如何迁移到 React Query 这类更成熟的异步状态管理方案。

这篇文章不只是讲 `fetch` 怎么用，而是从最基础的 `useEffect + fetch` 开始，把 React 数据请求中必须理解的几个核心问题讲清楚：为什么需要 `loading`，为什么要处理错误，为什么会出现 race condition，以及在真实项目里应该如何把请求逻辑封装成一个可维护的 hook。

---

## 1. React 数据请求解决什么问题

前端应用大部分页面都离不开数据请求。

比如普通后台系统里有用户列表、订单列表、商品列表；Web3 交易平台里有账户余额、挂单、持仓、行情、订单簿、近期成交；电商系统里有商品详情、购物车、支付状态、物流信息。

这些数据通常来自服务端，而不是浏览器本地。

所以 React 数据请求本质上是在处理一种异步状态：

```txt
组件渲染
  -> 发起请求
  -> 等待服务端响应
  -> 请求成功，展示数据
  -> 请求失败，展示错误
  -> 参数变化，重新请求
  -> 旧请求取消，避免脏数据覆盖新数据
```

这里最容易被忽略的是：数据请求不是一个单纯的 `fetch()` 调用，而是一套状态机。

一个请求至少包含这些状态：

```ts
type RequestState<T> = {
  data: T | null;
  loading: boolean;
  error: unknown;
};
```

真实项目中，请求还可能包含：

- `idle`
- `pending`
- `success`
- `error`
- `refetching`
- `cancelled`
- `stale`

这也是为什么 React Query、SWR 这类库会存在。它们不是简单帮你少写几行 `fetch`，而是在管理异步状态、缓存、请求去重、重试、失效刷新、竞态处理和后台同步。

不过在直接使用 React Query 之前，先理解 `useEffect + fetch` 背后的问题非常重要。否则你只会调用 API，但不知道这些库为什么要这样设计。

---

## 2. 最简单的写法是什么

最基础的 React 请求写法一般是这样：

```tsx
import {useEffect, useState} from 'react';

interface Post {
  id: number;
  title: string;
}

const BASE_URL = 'https://jsonplaceholder.typicode.com';

export function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    async function fetchPosts() {
      const response = await fetch(`${BASE_URL}/posts`);
      const posts = (await response.json()) as Post[];

      setPosts(posts);
    }

    fetchPosts();
  }, []);

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

这段代码能跑。

它做了三件事：

```txt
组件挂载
  -> useEffect 执行
  -> fetch 请求接口
  -> response.json() 转成数据
  -> setPosts 更新组件状态
  -> 页面重新渲染
```

对于 demo 来说，这已经够了。

但在真实项目里，这个写法有明显问题。

用户不知道请求是否正在加载；请求失败后页面没有错误反馈；如果请求参数变化，旧请求可能覆盖新请求；如果组件卸载后请求才返回，还可能出现状态更新风险。

所以这段代码只是“能跑”，不是“可维护”。

---

## 3. 简单写法的问题

最基础的 `useEffect + fetch + setState` 写法主要有几个问题。

第一，没有 `loading` 状态。接口请求期间页面可能是空白的，用户不知道是数据为空，还是页面卡住，还是请求失败。网络慢一点时，这个问题会非常明显。

第二，没有 `error` 状态。接口失败、网络断开、服务端异常时，用户只能看到空页面，开发者可能只能在 console 里看到错误。

第三，没有请求状态收口。请求前、请求成功、请求失败、请求结束都散落在同一个函数里，后续加重试、toast、埋点、错误上报会很乱。

第四，没有处理竞态问题。比如用户快速切换分页、筛选条件、订单状态时，多个请求会同时存在。如果旧请求比新请求更晚返回，就可能用旧数据覆盖新数据。

第五，组件承担了太多职责。组件既负责渲染 UI，又负责请求接口，又负责 `loading`，又负责 `error`，又负责取消请求。组件会越来越胖。

第六，在复杂项目里无法复用。比如订单列表、用户列表、资产列表都需要相似的请求状态管理，如果每个组件都手写一遍，维护成本会很高。

在 Web3 前端里，这些问题会更明显。比如用户切换交易对时，如果旧的订单簿请求晚于新的交易对请求返回，就可能在 BTC 页面里展示 ETH 的订单簿数据；用户切换钱包地址后，如果旧地址资产请求覆盖新地址资产，页面就会展示错误资产。这类问题在交易场景里不是 UI 小瑕疵，而是业务风险。

---

## 4. 推荐的项目落地结构

如果项目还没有引入 React Query，或者你想先理解原生请求封装，可以按下面的结构组织：

```txt
src/
  features/
    posts/
      api.ts
      types.ts
      hooks/
        usePosts.ts
      components/
        PostList.tsx
        PostFilter.tsx
```

每个文件的职责应该清楚。

`api.ts` 只负责请求接口，不关心 React：

```txt
api.ts
  -> getPosts()
  -> getPostById()
  -> createPost()
```

`types.ts` 只负责类型：

```txt
types.ts
  -> Post
  -> GetPostsParams
  -> GetPostsResponse
```

`usePosts.ts` 负责把请求逻辑封装成 hook：

```txt
usePosts.ts
  -> loading
  -> error
  -> data
  -> refetch
  -> abort
  -> 参数变化重新请求
```

`PostList.tsx` 只负责消费 hook 的结果并渲染：

```txt
PostList.tsx
  -> const {data, loading, error} = usePosts(params)
  -> render loading / error / list
```

这个拆分的核心是：请求函数、请求状态、UI 渲染不要混在一起。

---

## 5. 推荐写法一：先把 API 请求函数抽离出来

不要把 `fetch` 直接写在组件里。先抽成独立的 API function。

```ts
// features/posts/types.ts
export interface Post {
  id: number;
  userId: number;
  title: string;
  body: string;
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
}

export type GetPostsResponse = Post[];
```

然后写请求函数：

```ts
// features/posts/api.ts
import type {GetPostsParams, GetPostsResponse} from './types';

const BASE_URL = 'https://jsonplaceholder.typicode.com';

function buildPostsUrl(params?: GetPostsParams) {
  const url = new URL(`${BASE_URL}/posts`);

  if (params?.page !== undefined) {
    url.searchParams.set('page', String(params.page));
  }

  if (params?.limit !== undefined) {
    url.searchParams.set('limit', String(params.limit));
  }

  return url.toString();
}

export async function getPosts(
  params?: GetPostsParams,
  options?: {
    signal?: AbortSignal;
  },
): Promise<GetPostsResponse> {
  const response = await fetch(buildPostsUrl(params), {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch posts: ${response.status}`);
  }

  return response.json() as Promise<GetPostsResponse>;
}
```

这里有几个关键点。

第一，API function 不依赖 React。它只是一个普通 TypeScript 函数，所以可以被组件、hook、React Query、测试用例复用。

第二，传入了 `signal`。这是后面处理请求取消和竞态问题的关键。

第三，显式判断 `response.ok`。`fetch` 和 axios 不同，HTTP 500、404 这类状态不会自动 throw。你必须自己判断状态码。

---

## 6. 推荐写法二：封装 usePosts，而不是在组件里堆逻辑

接下来把 `loading`、`error`、`data`、`AbortController` 都封装到 hook 里。

```ts
// features/posts/hooks/usePosts.ts
import {useCallback, useEffect, useRef, useState} from 'react';
import {getPosts} from '../api';
import type {GetPostsParams, Post} from '../types';

interface UsePostsResult {
  posts: Post[];
  loading: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

export function usePosts(params?: GetPostsParams): UsePostsResult {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPosts = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await getPosts(params, {
        signal: controller.signal,
      });

      setPosts(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      setError(err);
    } finally {
      setLoading(false);
    }
  }, [params?.page, params?.limit]);

  useEffect(() => {
    fetchPosts();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    refetch: fetchPosts,
  };
}
```

这段代码是一个比较接近真实项目的基础封装。

它解决了几个问题。

请求前设置 `loading = true`，请求结束后在 `finally` 里设置 `loading = false`。这样无论成功还是失败，`loading` 都能被正确关闭。

请求失败时进入 `catch`，把错误放进 `error` 状态。组件可以根据 `error` 渲染错误提示。

每次新请求开始前，先执行：

```ts
abortControllerRef.current?.abort();
```

这会取消上一次还没结束的请求。这样可以避免旧请求晚返回后覆盖新请求。

组件卸载时也会取消请求：

```ts
return () => {
  abortControllerRef.current?.abort();
};
```

这可以避免组件已经卸载，但请求回来后还尝试更新状态。

这里的关键点是：`AbortController` 不能复用。每次发起新请求都要创建新的 controller。

```ts
const controller = new AbortController();
abortControllerRef.current = controller;
```

一旦一个 controller 被 abort，它就不能再用于新的请求。

---

## 7. 推荐写法三：组件只消费结果，不承载复杂业务

有了 `usePosts` 之后，组件就不需要知道底层请求细节。

```tsx
// features/posts/components/PostList.tsx
import {useState} from 'react';
import {usePosts} from '../hooks/usePosts';

export function PostList() {
  const [page, setPage] = useState(1);

  const {posts, loading, error, refetch} = usePosts({
    page,
    limit: 10,
  });

  return (
    <section>
      <header>
        <h2>Posts</h2>
        <button onClick={() => setPage(page + 1)}>Next Page</button>
        <button onClick={refetch}>Refresh</button>
      </header>

      {loading && <div>Loading posts...</div>}

      {error && (
        <div>
          Something went wrong.
          <button onClick={refetch}>Try again</button>
        </div>
      )}

      {!loading && !error && (
        <ul>
          {posts.map(post => (
            <li key={post.id}>{post.title}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

现在组件只做三件事：

1. 保存当前页码。
2. 调用 `usePosts` 获取数据状态。
3. 根据 `loading`、`error`、`posts` 渲染 UI。

组件不需要知道：

- `fetch` 怎么写。
- `response.ok` 怎么判断。
- 错误怎么捕获。
- 请求怎么取消。
- 参数变化后怎么重新请求。
- 组件卸载后怎么清理。

这就是封装的价值。

---

## 8. 为什么必须处理竞态问题

很多初学者会觉得 `AbortController` 是可选项。实际上，只要你的请求会因为参数变化而重复触发，就应该考虑竞态问题。

比如分页：

```ts
const [page, setPage] = useState(1);

useEffect(() => {
  fetchPosts(page);
}, [page]);
```

假设发生下面的顺序：

```txt
请求 A：page = 1，网络很慢，5 秒后返回
请求 B：page = 2，网络很快，1 秒后返回
```

用户先点到 page 2，请求 B 先返回，页面展示 page 2 数据。

但 4 秒之后，请求 A 才返回，它又执行了一次 `setPosts(page1Data)`。

最终页面会回退成 page 1 数据。

这就是 race condition。

它的危险点在于：不一定每次都出现。只有在网络延迟、用户快速操作、服务端响应顺序变化时才会触发。所以它很难稳定复现，也很难 debug。

在真实业务里，下面这些场景都容易出现竞态问题：

- 分页列表快速切换 page。
- 筛选器快速切换 status / category。
- 搜索框输入关键词触发请求。
- Web3 钱包地址切换。
- 交易对切换。
- 订单簿 stream 切换。
- 用户切换 chainId。

所以更稳妥的方式是：新请求发起前取消旧请求。

```ts
abortControllerRef.current?.abort();

const controller = new AbortController();
abortControllerRef.current = controller;
```

然后把 `signal` 传给 `fetch`：

```ts
await fetch(url, {
  signal: controller.signal,
});
```

如果请求被取消，会抛出一个 `AbortError`。这个错误不应该展示给用户，因为它不是业务失败，而是我们主动取消了旧请求。

```ts
catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    return;
  }

  setError(err);
}
```

这个判断很重要。否则用户快速切换分页时，页面可能不断显示错误提示。

---

## 9. 结合真实项目举例：Web3 交易平台的数据请求

把这个模式放到 Web3 前端里，会更容易理解它的价值。

比如一个交易页面可能有这些数据：

- 当前账户信息 `account`。
- 当前钱包余额 `balances`。
- 当前挂单 `open orders`。
- 历史订单 `order history`。
- 当前持仓 `positions`。
- 市场行情 `instruments`。
- 订单簿 `orderbook`。
- 近期成交 `recent trades`。

这些数据大多来自服务端或者链上 RPC，本质上都是异步数据。

以“当前挂单列表”为例，用户可能切换：

- 交易对 `instrument`。
- 订单方向 `side`。
- 订单状态 `status`。
- 分页 `page`。
- 钱包地址 `address`。
- 链 ID `chainId`。

如果直接在组件里写请求，很容易变成这样：

```tsx
useEffect(() => {
  async function fetchOrders() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/orders?instrument=${instrument}&page=${page}&address=${address}`,
      );
      const data = await res.json();

      setOrders(data);
    } finally {
      setLoading(false);
    }
  }

  fetchOrders();
}, [instrument, page, address]);
```

这段代码的问题是：当用户快速切换交易对或钱包时，旧请求可能覆盖新请求。

更合理的方式是抽成 hook：

```ts
// features/orders/hooks/useOpenOrders.ts
import {useCallback, useEffect, useRef, useState} from 'react';

export interface Order {
  id: string;
  instrument: string;
  side: 'buy' | 'sell';
  price: string;
  amount: string;
  status: 'open' | 'filled' | 'cancelled';
}

export interface UseOpenOrdersParams {
  address?: string;
  chainId?: number;
  instrument?: string;
  page: number;
  pageSize: number;
}

async function getOpenOrders(
  params: UseOpenOrdersParams,
  options?: {
    signal?: AbortSignal;
  },
): Promise<Order[]> {
  const url = new URL('/api/orders/open', window.location.origin);

  if (params.address) {
    url.searchParams.set('address', params.address);
  }

  if (params.chainId) {
    url.searchParams.set('chainId', String(params.chainId));
  }

  if (params.instrument) {
    url.searchParams.set('instrument', params.instrument);
  }

  url.searchParams.set('page', String(params.page));
  url.searchParams.set('pageSize', String(params.pageSize));

  const response = await fetch(url.toString(), {
    signal: options?.signal,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch open orders: ${response.status}`);
  }

  return response.json() as Promise<Order[]>;
}

export function useOpenOrders(params: UseOpenOrdersParams) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!params.address || !params.chainId || !params.instrument) {
      setOrders([]);
      return;
    }

    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const data = await getOpenOrders(params, {
        signal: controller.signal,
      });

      setOrders(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    params.address,
    params.chainId,
    params.instrument,
    params.page,
    params.pageSize,
  ]);

  useEffect(() => {
    fetchOrders();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
  };
}
```

然后交易页面只消费结果：

```tsx
export function OpenOrdersPanel(props: {
  address?: string;
  chainId?: number;
  instrument?: string;
}) {
  const [page, setPage] = useState(1);

  const {orders, loading, error, refetch} = useOpenOrders({
    address: props.address,
    chainId: props.chainId,
    instrument: props.instrument,
    page,
    pageSize: 20,
  });

  if (!props.address) {
    return <div>Please connect wallet first.</div>;
  }

  if (!props.instrument) {
    return <div>Please select an instrument.</div>;
  }

  return (
    <section>
      <header>
        <h3>Open Orders</h3>
        <button onClick={refetch}>Refresh</button>
      </header>

      {loading && <div>Loading orders...</div>}

      {error && (
        <div>
          Failed to load orders.
          <button onClick={refetch}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <ul>
          {orders.map(order => (
            <li key={order.id}>
              {order.side} {order.amount} @ {order.price}
            </li>
          ))}
        </ul>
      )}

      <footer>
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>
        <span>Page {page}</span>
        <button onClick={() => setPage(page + 1)}>Next</button>
      </footer>
    </section>
  );
}
```

这里有一个很重要的设计点：钱包地址、链 ID、交易对、分页参数都会影响请求结果，所以它们都应该进入请求依赖。

在 React Query 里，这些参数应该进入 `queryKey`；在手写 hook 里，它们应该进入 `useCallback` / `useEffect` 依赖。

---

## 10. 什么时候应该使用 React Query

手写 `useEffect + fetch + loading + error + AbortController` 的价值在于理解原理。

但在真实中大型项目里，我通常不建议到处手写这套逻辑。因为你会反复处理这些问题：

- `loading`
- `error`
- `retry`
- `cache`
- `dedupe`
- `refetch`
- `pagination`
- `stale data`
- `background refresh`
- `mutation invalidate`
- `prefetch`
- `race condition`

这正是 React Query 擅长的地方。

用 React Query 之后，上面的请求可以变成：

```ts
import {useQuery} from '@tanstack/react-query';

export function useOpenOrdersQuery(params: UseOpenOrdersParams) {
  return useQuery({
    queryKey: ['trade', 'orders', 'open', params],
    queryFn: ({signal}) =>
      getOpenOrders(params, {
        signal,
      }),
    enabled: Boolean(params.address && params.chainId && params.instrument),
    staleTime: 1000 * 10,
  });
}
```

组件里：

```tsx
export function OpenOrdersPanel(props: {
  address?: string;
  chainId?: number;
  instrument?: string;
}) {
  const [page, setPage] = useState(1);

  const {
    data: orders = [],
    isPending,
    error,
    refetch,
  } = useOpenOrdersQuery({
    address: props.address,
    chainId: props.chainId,
    instrument: props.instrument,
    page,
    pageSize: 20,
  });

  if (isPending) {
    return <div>Loading orders...</div>;
  }

  if (error) {
    return (
      <div>
        Failed to load orders.
        <button onClick={() => refetch()}>Retry</button>
      </div>
    );
  }

  return (
    <section>
      <ul>
        {orders.map(order => (
          <li key={order.id}>
            {order.side} {order.amount} @ {order.price}
          </li>
        ))}
      </ul>

      <button onClick={() => setPage(page + 1)}>Next</button>
    </section>
  );
}
```

React Query 会帮你处理很多底层细节。

但前提是你要理解这些底层细节为什么存在。否则你很容易把 React Query 当成“更高级的 `fetch`”，而不是异步状态管理工具。

---

## 11. 一个完整的手写 useRequest 示例

如果项目比较轻量，还不想引入 React Query，可以先封装一个通用 `useRequest`。

这个 hook 接收一个异步函数，并统一处理 `loading`、`error`、`data`、`abort`。

```ts
// shared/hooks/useRequest.ts
import {useCallback, useEffect, useRef, useState} from 'react';

interface UseRequestOptions<TParams> {
  params?: TParams;
  immediate?: boolean;
}

interface UseRequestResult<TData, TParams> {
  data: TData | null;
  loading: boolean;
  error: unknown;
  run: (params?: TParams) => Promise<TData | null>;
  abort: () => void;
}

export function useRequest<TData, TParams = void>(
  requestFn: (
    params: TParams,
    options: {
      signal: AbortSignal;
    },
  ) => Promise<TData>,
  options?: UseRequestOptions<TParams>,
): UseRequestResult<TData, TParams> {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const run = useCallback(
    async (overrideParams?: TParams) => {
      abortControllerRef.current?.abort();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const finalParams = overrideParams ?? options?.params;

      setLoading(true);
      setError(null);

      try {
        const result = await requestFn(finalParams as TParams, {
          signal: controller.signal,
        });

        setData(result);
        return result;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return null;
        }

        setError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [requestFn, options?.params],
  );

  useEffect(() => {
    if (!options?.immediate) return;

    run();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [options?.immediate, run]);

  return {
    data,
    loading,
    error,
    run,
    abort,
  };
}
```

然后业务 hook 可以基于它再封一层：

```ts
// features/posts/hooks/usePosts.ts
import {useRequest} from '@/shared/hooks/useRequest';
import {getPosts} from '../api';
import type {GetPostsParams, Post} from '../types';

export function usePosts(params: GetPostsParams) {
  const request = useRequest<Post[], GetPostsParams>(getPosts, {
    params,
    immediate: true,
  });

  return {
    posts: request.data ?? [],
    loading: request.loading,
    error: request.error,
    refetch: request.run,
    abort: request.abort,
  };
}
```

组件还是保持干净：

```tsx
export function PostList() {
  const [page, setPage] = useState(1);

  const {posts, loading, error, refetch} = usePosts({
    page,
    limit: 10,
  });

  return (
    <section>
      <button onClick={() => setPage(page + 1)}>Next Page</button>

      {loading && <div>Loading...</div>}

      {error && <button onClick={() => refetch()}>Retry</button>}

      <ul>
        {posts.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </section>
  );
}
```

这个封装不如 React Query 完整，但它已经比每个组件里手写 `useEffect + fetch` 稳定很多。

---

## 12. 工程化注意事项

第一，`fetch` 不会因为 HTTP 状态码自动抛错。你必须自己判断 `response.ok`。

```ts
if (!response.ok) {
  throw new Error(`Request failed: ${response.status}`);
}
```

第二，`loading` 最好在 `finally` 里关闭。否则请求失败时容易忘记关闭 `loading`。

```ts
try {
  // request
} catch (err) {
  // handle error
} finally {
  setLoading(false);
}
```

第三，请求取消产生的 `AbortError` 不应该当成业务错误展示给用户。它通常只是用户切换参数、页面卸载或新请求覆盖旧请求导致的正常行为。

第四，每次请求都要创建新的 `AbortController`。已经 abort 的 controller 不能复用。

第五，如果请求结果受参数影响，那么参数必须进入依赖。手写 hook 时进入 `useEffect` / `useCallback` dependency；React Query 中进入 `queryKey`。

第六，不要让组件承担所有请求逻辑。组件应该消费结果，而不是管理完整请求生命周期。

第七，复杂项目优先考虑 React Query。手写请求适合学习原理、轻量页面、特殊场景；但涉及缓存、分页、预取、mutation、SSE 同步、后台刷新时，React Query 会更稳定。

第八，Web3 前端尤其要注意竞态问题。钱包地址、`chainId`、`token`、`instrument`、交易对变化后，旧请求必须避免覆盖新状态。

第九，请求逻辑要和 UI 解耦。API function、hook、组件分别负责不同层级，不要在 JSX 里直接堆异步逻辑。

---

## 13. 总结

这篇文章的核心不是讲 `fetch` 的语法，而是讲 React 数据请求在真实项目中应该如何组织。

最简单的写法是：

```ts
useEffect(() => {
  fetch(...).then(...).then(setState);
}, []);
```

但真实项目不能只停留在这里。

一个可维护的数据请求实现，至少应该具备这些特点：

- 有 `loading` 状态。
- 有 `error` 状态。
- 请求失败能反馈。
- 请求结束能正确关闭 `loading`。
- 参数变化能重新请求。
- 旧请求能被取消。
- 组件卸载能清理请求。
- 组件只消费结果，不承载复杂请求逻辑。
- 请求函数和 React 组件解耦。

对于小项目，可以先封装 `useRequest` 或业务 hook。对于中大型项目，建议使用 React Query 这类成熟方案，把请求、缓存、失效、重试、预取、竞态处理交给专门工具。

技术本身通常不难。真正难的是把它放进真实项目后，仍然保持边界清晰、状态一致、方便扩展。数据请求就是典型例子：`fetch` 一行能写完，但工程化的数据请求，必须把状态、错误、生命周期和竞态全部考虑进去。
