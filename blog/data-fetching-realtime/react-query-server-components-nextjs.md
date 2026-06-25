# React Query 与 Server Components：在 Next.js 中到底该怎么配合使用？

在 React 进入 Server Components 时代之后，很多人都会遇到一个问题：

**既然现在可以在服务器组件里直接获取数据，那 React Query 还有没有必要用？**

这个问题并不是简单的“用”或“不用”。React Query 本质上仍然是一个偏客户端的数据获取与异步状态管理库，而 Server Components 则提供了在服务端直接获取数据、渲染 HTML 的能力。二者并不冲突，但也不是所有场景都需要强行结合。

本文将结合 Next.js 中的 Server Components，梳理 React Query 在服务端渲染场景下的正确使用方式，以及什么时候应该用、什么时候不该用。

---

## 一、React Query 在 Next.js 中的基础配置

在 Next.js App Router 中，默认所有组件都是 Server Component。
但 React Query 的 `QueryClientProvider` 必须运行在客户端，所以我们通常会封装一个 `Providers` 组件：

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

然后在根布局 `layout.tsx` 中包裹整个应用：

```tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

这一步的目的很简单：
让整个应用都可以访问 React Query 的缓存、查询状态和相关能力。

---

## 二、为什么 QueryClient 要区分服务端和客户端？

React Query 的关键在于 `QueryClient`。在传统客户端 React 应用中，我们通常只需要创建一个 QueryClient 实例即可。

但在 Next.js 的 Server Components 场景下，情况会复杂一些。

一个常见写法如下：

```tsx
import { QueryClient, isServer } from "@tanstack/react-query";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }

  return browserQueryClient;
}
```

这里有两个重点。

### 1. 服务端每次都创建新的 QueryClient

在服务端，每一次请求都应该创建一个新的 QueryClient。

原因是：服务端可能同时处理多个用户的请求，如果多个请求共用同一个 QueryClient，就可能导致缓存数据混杂。这样不仅会造成不必要的数据传输，严重时还可能出现用户之间的数据污染。

所以在服务端一定要保持 QueryClient 的“干净”和“隔离”。

### 2. 客户端复用同一个 QueryClient

在浏览器端，我们希望 QueryClient 能够被复用。

因为客户端需要维护 React Query 的缓存状态。如果每次组件重新渲染或重新挂载时都创建一个新的 QueryClient，那么之前缓存的数据就会丢失。

尤其是在 Next.js 中，布局和组件可能会被 Suspense 边界影响。如果 QueryClient 只存在于某个 React 组件内部，当组件被挂起、卸载、再挂载时，就可能生成新的 QueryClient 实例，导致缓存丢失。

因此，客户端通常会把 QueryClient 存在 React 组件外部的变量中，保证它在浏览器运行期间尽量保持稳定。

---

## 三、React Query 在 Server Component 中应该做什么？

在 Server Component 中，React Query 最推荐的用法是：

**只做预取，不直接消费数据。**

例如有一个 `posts/page.tsx`：

```tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient } from "@/lib/get-query-client";
import { getPosts } from "@/lib/api";
import { Posts } from "./posts";

export default async function PostsPage() {
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["posts"],
    queryFn: getPosts,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Posts />
    </HydrationBoundary>
  );
}
```

这里发生了几件事：

首先，`PostsPage` 是一个 Server Component，所以它可以直接使用 `async/await` 在服务端获取数据。

其次，我们调用了：

```tsx
await queryClient.prefetchQuery(...)
```

这一步会把 `posts` 数据提前放进 QueryClient 的缓存里。

然后通过：

```tsx
dehydrate(queryClient);
```

把服务端 QueryClient 中的数据序列化。

最后使用：

```tsx
<HydrationBoundary state={...}>
```

把这些数据传递给客户端，让客户端的 React Query 能直接使用这份已经预取好的数据。

---

## 四、客户端组件仍然正常使用 useQuery

客户端组件可以像普通 React Query 用法一样写：

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { getPosts } from "@/lib/api";

export function Posts() {
  const {
    data: posts,
    isPending,
    error,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: getPosts,
  });

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Something went wrong.</div>;

  return (
    <ul>
      {posts?.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

从这个客户端组件的角度看，它并不知道数据是在服务端预取的。
它只知道自己使用了 `useQuery`，并且可以从 React Query 缓存中拿到数据。

这正是 React Query 与 Server Components 配合的核心价值：

服务端提前获取数据，客户端继续享受 React Query 的缓存、状态管理、重新请求、失效更新等能力。

---

## 五、为什么要设置 staleTime？

在前面的 QueryClient 配置中，我们设置了：

```tsx
staleTime: 60 * 1000;
```

这是因为 React Query 默认会认为数据很快过期。

如果我们刚刚已经在服务端预取过数据，客户端一挂载就立刻重新请求一次，很多时候是没有必要的。

设置 `staleTime` 可以告诉 React Query：

这份数据在一段时间内仍然是新鲜的，不要马上重新请求。

这样可以避免服务端刚预取完，客户端又重复请求一次的情况。

---

## 六、不要在 Server Component 中用 fetchQuery 消费数据

React Query 除了 `prefetchQuery`，还有一个 `fetchQuery`。

比如你可能会这样写：

```tsx
const posts = await queryClient.fetchQuery({
  queryKey: ["posts"],
  queryFn: getPosts,
});

const firstPostId = posts[0].id;
```

这在语法上是可以的，但通常不推荐。

原因是 Server Component 没有客户端组件那种持续重新渲染的状态同步机制。

假设你在 Server Component 中拿到了 `posts[0].id`，同时客户端组件也用 `useQuery` 使用同一份 posts 数据。之后如果用户在客户端新增、删除或修改了 posts，并触发了 React Query 的缓存失效和重新请求，那么客户端数据会更新，但 Server Component 中曾经读取的数据不会同步变化。

这样就会导致 UI 中一部分数据来自旧的服务端结果，另一部分来自新的客户端缓存，最终出现状态不一致。

所以，如果你要结合 Server Components 和 React Query，推荐原则是：

**Server Component 只负责 prefetch，Client Component 才负责真正使用 useQuery 消费数据。**

---

## 七、那为什么不直接用 Server Component 获取数据？

既然 Server Component 可以直接获取数据，我们完全可以这样写：

```tsx
export default async function PostsPage() {
  const posts = await getPosts();

  return <Posts posts={posts} />;
}
```

然后 `Posts` 也可以是一个 Server Component：

```tsx
export function Posts({ posts }) {
  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

这样做有什么好处？

它更简单。

不需要 `QueryClientProvider`，不需要 `HydrationBoundary`，不需要 `dehydrate`，也不需要客户端 JavaScript 来完成基础渲染。

数据在服务端获取，HTML 直接发送给用户。
对于很多只展示数据的页面来说，这其实是更好的方案。

---

## 八、什么时候才应该使用 React Query？

React Query 不是一定要和 Server Components 绑定使用。

如果你的页面只是服务端获取数据，然后展示出来，那么直接使用 Server Component 往往更合适。

React Query 更适合那些需要客户端交互能力的场景，比如：

```tsx
useInfiniteQuery();
```

例如无限滚动、分页加载、用户滚动时加载更多内容，这些都是明显的客户端交互场景。

再比如：

- 客户端筛选；
- 用户操作后立即刷新数据；
- mutation 后自动失效缓存；
- 乐观更新；
- 后台自动 refetch；
- 多组件共享异步状态；
- 页面不刷新时保持缓存。

这些场景才是 React Query 的优势所在。

如果你的功能需要这些客户端能力，那么可以在 Server Component 中提前 `prefetchQuery` 或 `prefetchInfiniteQuery`，再在客户端组件中使用 `useQuery` 或 `useInfiniteQuery`。

---

## 九、推荐实践总结

在 Next.js App Router 中使用 React Query，可以遵循下面几条原则：

### 1. 服务端每次创建新的 QueryClient

避免跨请求、跨用户共享缓存。

### 2. 客户端复用同一个 QueryClient

避免组件重新挂载后缓存丢失。

### 3. Server Component 中只做 prefetch

不要在服务端组件里依赖 `fetchQuery` 读取出来的数据做复杂 UI 逻辑。

### 4. 使用 HydrationBoundary 把缓存传给客户端

服务端预取的数据需要通过 `dehydrate` 和 `HydrationBoundary` 传递给客户端 React Query。

### 5. 设置合理的 staleTime

避免客户端刚挂载就重复请求服务端已经预取过的数据。

### 6. 不要为了用 React Query 而用 React Query

如果页面只是静态展示服务端数据，直接用 Server Components 获取数据就可以。

---

## 十、结论

React Query 在 Server Components 时代并没有失去价值，但它的定位需要重新理解。

它不再是所有数据获取的默认答案。

在 Next.js App Router 中，如果一个页面只需要服务端获取数据并渲染，那么直接使用 Server Component 通常更简单、更高效。

但如果你需要客户端异步状态管理，比如无限滚动、缓存失效、mutation、乐观更新、自动重新请求等能力，那么 React Query 仍然非常有价值。

所以，React Query 与 Server Components 的最佳关系不是互相替代，而是各司其职：

**Server Components 负责更早、更快地获取首屏数据；React Query 负责客户端后续的数据状态管理。**

真正好的实践不是“所有地方都用 React Query”，也不是“完全不用 React Query”，而是根据业务场景判断：

**展示型数据优先 Server Component；交互型数据再引入 React Query。**
