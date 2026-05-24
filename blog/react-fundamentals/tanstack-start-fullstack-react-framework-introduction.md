# TanStack Start 入门：一个基于 TanStack Router 的全栈 React 框架到底解决了什么问题？

很多 React 开发者第一次听到 TanStack Start，第一反应通常是：这是不是又一个 Next.js？它和 TanStack Query、TanStack Router 是什么关系？如果我已经会 Next.js，还有必要了解它吗？

这些问题很正常。因为现在前端框架已经不只是“写页面”的工具了，它们同时要处理路由、数据加载、服务端渲染、表单提交、服务端函数、API 接口、预渲染、缓存更新等一整套应用开发问题。

TanStack Start 就是在这个背景下出现的。它不是一个单纯的路由库，也不是一个简单的 Vite 模板，而是 TanStack 生态里面向全栈 React 应用的框架。它默认基于 TanStack Router，使用 Vite 构建，并提供了文件路由、loader、server function、SSR、API route 等能力。

这篇文章不做复杂项目复盘，只从初学者角度讲清楚：TanStack Start 是什么、它解决什么问题、最简单怎么用、核心流程怎么跑起来，以及它和 Next.js 的一些关键区别。

---

## 1. TanStack Start 解决了什么问题

如果只是写一个普通 React 单页应用，Vite + React 已经足够：

```bash
npm create vite@latest
```

然后自己装路由、自己请求数据、自己写接口调用、自己处理服务端渲染需求。

但真实应用通常不止这些。一个稍微完整的内容站、后台系统、博客系统、SaaS 应用，都会遇到这些问题：

- 页面路由怎么组织。
- 动态路由参数怎么拿。
- 页面数据加载放在哪里。
- 服务端数据库查询如何保证不跑到浏览器。
- 表单提交如何调用服务端逻辑。
- 数据提交后页面如何刷新。
- 首屏是否需要 SSR。
- 某些页面是否需要静态预渲染。
- API endpoint 怎么写。
- 中间件和鉴权逻辑怎么接入。

以前如果你用纯 React，这些事情大多要自己组合：

```txt
React
+ React Router
+ React Query
+ API Server
+ SSR Framework
+ 自己约定数据加载方式
```

Next.js 把这些问题打包成了一个框架：文件路由、Server Component、Server Action、Route Handler、SSR、SSG 等都在里面。

TanStack Start 做的事情也类似：它希望给 React 应用提供一个全栈框架体验。但它的设计思路更贴近 TanStack 生态，尤其是 TanStack Router。

简单理解：

```txt
TanStack Router 负责路由
TanStack Start 在 Router 之上提供全栈应用能力
Vite 负责构建
server function 负责跨越客户端和服务端边界
loader 负责路由级数据加载
```

它适合你想写一个 React 全栈应用，又希望路由、数据加载和服务端函数都有比较强类型体验的场景。

它不太适合什么场景？

如果你只是写一个非常简单的静态页面，普通 Vite 就够了。如果你的团队已经深度绑定 Next.js 的 App Router、Server Component、Vercel 部署生态，也不一定需要马上切换。如果你需要大量成熟生态模板，Next.js 目前仍然更主流。

TanStack Start 更适合愿意探索 TanStack 生态、想要类型安全路由和全栈能力的 React 开发者。

---

## 2. 它是什么：基本概念介绍

TanStack Start 可以理解为一个基于 TanStack Router 的全栈 React 框架。

它不是 TanStack Query，也不是 TanStack Table。TanStack 是一组工具生态，里面有：

- TanStack Query：服务端状态管理。
- TanStack Router：类型安全路由。
- TanStack Table：表格状态模型。
- TanStack Virtual：虚拟滚动。
- TanStack Start：全栈 React 框架。

TanStack Start 默认使用 TanStack Router 来管理路由，同时提供一些框架能力。

初学者需要先理解几个关键词。

### 文件路由

TanStack Start 支持基于文件的路由。

比如：

```txt
src/routes/index.tsx
src/routes/posts.index.tsx
src/routes/posts.$id.tsx
src/routes/most-viewed.tsx
```

它们分别可以对应：

```txt
/
/posts
/posts/:id
/most-viewed
```

这里的 `$id` 表示动态路由参数。

### createFileRoute

每个路由文件里通常会使用 `createFileRoute` 定义路由。

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/posts")({
  component: PostsPage,
})

function PostsPage() {
  return <div>Posts</div>
}
```

它的作用是把当前文件和路由系统关联起来。

### loader

`loader` 用来在路由渲染前加载数据。

这和 Next.js Server Component 里的直接请求数据不一样。TanStack Start 没有 React Server Component，所以通常通过 route loader 加载页面数据。

```tsx
export const Route = createFileRoute("/posts")({
  loader: async () => {
    return {
      posts: await listPosts(),
    }
  },
  component: PostsPage,
})
```

组件里可以通过 `Route.useLoaderData()` 拿到数据。

### server function

`server function` 用来声明“只在服务端执行”的函数。

这是 TanStack Start 里非常重要的概念。

因为 loader 既可能在服务端执行，也可能在客户端导航时执行。如果你在 loader 里直接调用 Prisma、数据库 SDK、文件系统 API，就可能在客户端导航时出错。

所以涉及数据库、密钥、服务端资源的逻辑，应该放进 server function。

### SSR

TanStack Start 默认可以服务端渲染。用户第一次访问页面时，服务端生成 HTML，然后浏览器接收并 hydration。

但客户端内跳转时，部分逻辑可能在浏览器执行。这也是为什么需要理解 execution model。

### API Route

TanStack Start 也可以创建 API endpoint。比如 `/api/ping`，用于 webhook、外部系统调用或普通接口。

---

## 3. 最简单的使用方式

创建一个 TanStack Start 项目通常可以用：

```bash
npm create tanstack@latest
```

具体脚手架命令可能会随版本变化，但核心思想是创建一个 TanStack Start 应用。

项目结构大概会长这样：

```txt
src/
  routes/
    index.tsx
  router.tsx
  styles.css
```

一个最简单的首页路由可以这样写：

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({
  component: HomePage,
})

function HomePage() {
  return (
    <main>
      <h1>Hello TanStack Start</h1>
      <p>This is the home page.</p>
    </main>
  )
}
```

这里最关键的是：

```tsx
createFileRoute("/")
```

它声明当前文件对应 `/` 这个路由。

再比如创建一个 `/posts` 页面：

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/posts")({
  component: PostsPage,
})

function PostsPage() {
  return <h1>Posts Page</h1>
}
```

如果用文件路由，通常对应的文件会是：

```txt
src/routes/posts.index.tsx
```

这个例子只说明了最核心的路由写法。真实项目里还会加入 loader、server function、表单提交、错误处理等能力。

---

## 4. 核心流程是怎么跑起来的

先看一个普通页面访问流程。

用户访问 `/posts` 时，大致发生这些事：

1. 浏览器请求 `/posts`。
2. TanStack Start 匹配到对应的 route 文件。
3. 如果路由定义了 loader，先执行 loader。
4. loader 返回数据。
5. 页面组件拿到 loader data。
6. 服务端生成 HTML 返回给浏览器。
7. 浏览器 hydration 后页面变成可交互。
8. 用户在站内导航时，路由系统继续匹配新页面并加载数据。

这里有一个很重要的点：

```txt
TanStack Start 的 loader 不是永远只在服务端执行。
```

第一次访问页面时，它可能在服务端跑。但用户从首页点击链接跳转到 `/posts` 时，loader 可能在客户端导航流程里执行。

所以如果你在 loader 里直接写：

```tsx
const posts = await prisma.post.findMany()
```

就有可能在客户端导航时报错，因为 Prisma 不能运行在浏览器里。

正确做法是把数据库查询放进 server function。

流程就变成：

1. route loader 被触发。
2. loader 调用 server function。
3. server function 在服务端执行数据库查询。
4. 查询结果返回给 loader。
5. 页面组件通过 loader data 渲染。

这样就把“可能在客户端触发”和“必须在服务端执行”的逻辑分开了。

---

## 5. 常用 API 和核心能力介绍

### 5.1 createFileRoute：定义文件路由

`createFileRoute` 是 TanStack Router 的核心 API。

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/posts")({
  component: PostsPage,
})

function PostsPage() {
  return <div>Posts</div>
}
```

它用于把当前组件注册成一个路由页面。

如果是动态路由：

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/posts/$id")({
  component: PostDetailPage,
})

function PostDetailPage() {
  const params = Route.useParams()

  return <div>Post ID: {params.id}</div>
}
```

这里的 `$id` 类似 Next.js 里的 `[id]`。

### 5.2 Link：页面跳转

TanStack Router 提供 `Link` 组件。

```tsx
import { Link } from "@tanstack/react-router"

export function Header() {
  return (
    <nav>
      <Link to="/">Home</Link>
      <Link to="/posts">Posts</Link>
    </nav>
  )
}
```

它类似 Next.js 的 `Link`，用于客户端导航，避免整页刷新。

### 5.3 loader：路由级数据加载

页面需要数据时，可以定义 loader。

```tsx
import { createFileRoute } from "@tanstack/react-router"

const posts = [
  { id: 1, title: "First Post" },
  { id: 2, title: "Second Post" },
]

export const Route = createFileRoute("/posts")({
  loader: async () => {
    return { posts }
  },
  component: PostsPage,
})

function PostsPage() {
  const { posts } = Route.useLoaderData()

  return (
    <ul>
      {posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

这里的关键是：

```tsx
Route.useLoaderData()
```

它可以拿到 loader 返回的数据。

loader 适合做路由级别的数据准备，比如列表页数据、详情页数据、页面初始状态等。

### 5.4 createServerFn：只在服务端执行逻辑

涉及数据库查询、密钥、后端资源的逻辑，应该放到 server function。

示例：

```tsx
import { createServerFn } from "@tanstack/start"

export const listPosts = createServerFn().handler(async () => {
  // 这里可以放数据库查询
  return [
    { id: 1, title: "First Post" },
    { id: 2, title: "Second Post" },
  ]
})
```

然后在 loader 里调用：

```tsx
export const Route = createFileRoute("/posts")({
  loader: async () => {
    const posts = await listPosts()
    return { posts }
  },
  component: PostsPage,
})
```

这样即使 loader 在客户端导航时被触发，真正的数据库逻辑仍然会被框架转发到服务端执行。

可以简单理解成：

```txt
loader 负责页面数据入口
server function 负责服务端安全逻辑
```

### 5.5 server function 做 mutation

server function 不只能读取数据，也能处理写操作。

比如创建文章：

```tsx
import { createServerFn } from "@tanstack/start"
import { z } from "zod"

const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
})

export const createPost = createServerFn({ method: "POST" })
  .validator((data: unknown) => createPostSchema.parse(data))
  .handler(async ({ data }) => {
    // 这里可以写入数据库
    return {
      id: Date.now(),
      title: data.title,
      content: data.content,
    }
  })
```

这里有两个重点：

第一，`method: "POST"` 表示这是一个写操作。

第二，`validator` 用来校验从客户端传来的数据。

服务端函数收到的输入永远不能直接信任。哪怕它来自你自己的前端页面，也应该校验。

### 5.6 router.invalidate：数据更新后刷新路由数据

创建数据后，页面列表通常要更新。

TanStack Router 里可以通过 `router.invalidate()` 让相关路由数据重新加载。

```tsx
import { useRouter } from "@tanstack/react-router"

function AddPostForm() {
  const router = useRouter()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await createPost({
      data: {
        title: "New Post",
        content: "Hello",
      },
    })

    await router.invalidate()
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

这有点类似 Next.js 里的 `router.refresh()` 或服务端的 `revalidatePath()`，都是为了让 UI 在数据变更后重新拿最新数据。

### 5.7 API Route：创建普通接口

TanStack Start 也可以创建普通 API endpoint。

例如：

```tsx
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/api/ping")({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          message: "pong",
        })
      },
    },
  },
})
```

访问：

```txt
/api/ping
```

会返回：

```json
{
  "message": "pong"
}
```

API route 适合 webhook、外部服务回调、第三方系统调用这类场景。

---

## 6. 在真实业务里一般怎么组合使用

TanStack Start 在真实业务里通常不会单独存在，它会和这些东西组合：

- 数据库 ORM，比如 Prisma、Drizzle。
- schema 校验库，比如 Zod。
- TanStack Query，用于更复杂的客户端缓存。
- TanStack Router，用于路由和 loader。
- 后端服务或工作流系统，用于后台任务。
- WebSocket / SSE / stream，用于实时状态。
- cron job，用于定时计算。
- 认证中间件，用于登录态和权限控制。

比如一个博客系统，可能会有这些流程：

```txt
文章列表

/posts
  -> route loader
  -> listPosts server function
  -> 查询数据库
  -> 返回 posts
  -> 页面渲染

文章详情

/posts/:id
  -> 从 params 获取 id
  -> getPostById server function
  -> 找不到则返回 not found
  -> 找到则渲染详情

创建文章

用户填写表单
  -> client submit
  -> createPost server function
  -> Zod 校验输入
  -> 写入数据库
  -> router.invalidate
  -> 列表刷新
```

### 后台任务

有些事情不适合放在请求响应周期里。

比如：

- 生成 SEO metadata。
- 生成 Open Graph 图片。
- 调用 AI 服务总结文章。
- 建立搜索索引。
- 计算文章热度排名。
- 发送通知。
- 处理评论流。

这些任务可能耗时几秒甚至更久，通常更适合交给单独的后端工作流、队列或任务系统。

TanStack Start 可以作为前端全栈应用框架，而后台任务可以交给独立后端服务处理。页面通过 server function 调用后端服务，再通过 stream、WebSocket 或轮询把状态展示给用户。

也就是说，TanStack Start 可以负责：

```txt
页面
路由
表单提交
服务端函数
SSR
API endpoint
```

更复杂的后台异步任务，则可以交给更合适的后端工具。

---

## 7. 常见误区和使用边界

### 误区一：以为 loader 一定只在服务端执行

这是初学 TanStack Start 很容易踩的坑。

loader 在首次请求时可能在服务端执行，但客户端导航时也可能在浏览器侧触发。

所以不要在 loader 里直接写只能服务端运行的代码，比如：

```tsx
await prisma.post.findMany()
```

更合理的做法是放进 server function：

```tsx
const posts = await listPosts()
```

server function 内部再访问数据库。

### 误区二：把 TanStack Start 当成 Next.js 的完全替代品

TanStack Start 和 Next.js 有相似目标，但模型不同。

Next.js App Router 有 Server Component，可以在服务端组件里直接请求数据。

TanStack Start 没有 React Server Component，更多依赖：

- route loader。
- server function。
- SSR。
- API route。

所以不要照搬 Next.js 的 mental model。

在 Next.js 里你可能写：

```tsx
export default async function Page() {
  const posts = await prisma.post.findMany()
  return <PostList posts={posts} />
}
```

在 TanStack Start 里，通常要通过 loader + server function 完成。

### 误区三：写操作后忘记刷新路由数据

创建文章后，如果不刷新数据，列表可能不会更新。

```tsx
await createPost({ data })
```

还不够。

通常还要：

```tsx
await router.invalidate()
```

这样路由 loader 才会重新执行，页面才能拿到最新数据。

### 误区四：信任客户端传来的数据

server function 虽然写起来像本地函数调用，但本质上仍然跨越了客户端和服务端边界。

客户端传来的数据都不可信。

所以写操作应该加校验：

```tsx
.validator(data => schema.parse(data))
```

尤其是：

- 创建文章。
- 修改用户信息。
- 提交订单。
- 权限操作。
- 上传配置。
- 后台管理操作。

### 误区五：把长耗时任务塞进请求响应周期

比如生成 OG 图片、调用 AI、建立搜索索引，这些任务可能耗时较长。

如果直接塞进 server function 里等待完成，用户会一直卡在请求中。

更合理的方式是：

```txt
server function 触发任务
后台系统异步执行
前端展示任务状态
任务完成后更新 UI
```

TanStack Start 负责触发和展示，不一定负责所有后台任务。

### 误区六：不理解 SSR 和客户端导航差异

TanStack Start 默认支持服务端渲染，但页面在客户端 hydration 后，站内跳转不等于重新请求完整 HTML。

这意味着有些代码可能在不同环境下执行。

涉及浏览器 API 或服务端 API 时，要清楚：

```txt
window / localStorage 只能在浏览器
Prisma / 文件系统 / 密钥 只能在服务端
普通纯函数两边都能跑
```

这个边界非常重要。

---

## 8. 一个更完整的 TypeScript 示例

下面用一个“文章列表 + 创建文章”的例子，展示 TanStack Start 的基本组合方式。

这个示例不追求完整项目结构，只保留核心逻辑。

### 8.1 定义服务端函数

先定义文章类型和 server function。

```ts
// src/server/posts.ts
import { createServerFn } from "@tanstack/start"
import { z } from "zod"

type Post = {
  id: number
  title: string
  content: string
}

const posts: Post[] = [
  {
    id: 1,
    title: "First Post",
    content: "Hello TanStack Start",
  },
]

export const listPosts = createServerFn().handler(async () => {
  return posts
})

const createPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
})

export const createPost = createServerFn({ method: "POST" })
  .validator((data: unknown) => createPostSchema.parse(data))
  .handler(async ({ data }) => {
    const post: Post = {
      id: Date.now(),
      title: data.title,
      content: data.content,
    }

    posts.push(post)
    return post
  })
```

这里的重点：

- `listPosts` 用于查询数据。
- `createPost` 用于创建数据。
- `createPost` 使用 Zod 校验输入。
- 真实项目里 `posts` 通常会换成数据库。

### 8.2 在路由 loader 中加载数据

```tsx
// src/routes/posts.index.tsx
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { createPost, listPosts } from "../server/posts"

export const Route = createFileRoute("/posts/")({
  loader: async () => {
    const posts = await listPosts()
    return { posts }
  },
  component: PostsPage,
})
```

这里 loader 会在页面渲染前准备数据。真正查询逻辑在 `listPosts` 这个 server function 里。

### 8.3 组件消费 loader data

```tsx
function PostsPage() {
  const { posts } = Route.useLoaderData()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      setError(null)
      await createPost({
        data: {
          title,
          content,
        },
      })
      setTitle("")
      setContent("")
      await router.invalidate()
    } catch {
      setError("Create post failed")
    }
  }

  return (
    <main>
      <h1>Posts</h1>
      <form onSubmit={handleSubmit}>
        <input
          value={title}
          onChange={event => setTitle(event.target.value)}
          placeholder="Title"
        />
        <textarea
          value={content}
          onChange={event => setContent(event.target.value)}
          placeholder="Content"
        />
        <button type="submit">Add Post</button>
        {error ? <p>{error}</p> : null}
      </form>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <Link to="/posts/$id" params={{ id: String(post.id) }}>
              {post.title}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

这里体现了一个完整的基础流程：

1. 页面通过 loader 加载 posts。
2. 表单提交时调用 `createPost`。
3. 创建成功后清空表单。
4. 调用 `router.invalidate()`。
5. loader 重新执行。
6. 页面列表显示最新数据。

### 8.4 动态详情页

再写一个详情页：

```ts
// src/server/posts.ts
export const getPostById = createServerFn()
  .validator((data: unknown) =>
    z
      .object({
        id: z.number(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    return posts.find(post => post.id === data.id) ?? null
  })
```

路由文件：

```tsx
// src/routes/posts.$id.tsx
import { createFileRoute, notFound } from "@tanstack/react-router"
import { getPostById } from "../server/posts"

export const Route = createFileRoute("/posts/$id")({
  loader: async ({ params }) => {
    const id = Number(params.id)
    const post = await getPostById({
      data: { id },
    })
    if (!post) {
      throw notFound()
    }
    return { post }
  },
  component: PostDetailPage,
})

function PostDetailPage() {
  const { post } = Route.useLoaderData()

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  )
}
```

这里的重点：

- 通过 `params.id` 获取动态路由参数。
- 转成数字后传给 server function。
- 找不到数据时抛出 `notFound()`。
- 组件只负责渲染 loader 返回的数据。

这就是 TanStack Start 里很典型的读取数据流程。

---

## 9. 学习和落地建议

学习 TanStack Start，不建议一上来就研究复杂的后台任务、流式状态、cron job。可以按这个顺序来。

第一步，先理解 TanStack Router。

重点掌握：

```txt
createFileRoute
Link
动态路由
Route.useParams
Route.useLoaderData
```

因为 TanStack Start 的路由能力建立在 TanStack Router 之上。

第二步，写一个最简单的多页面应用。

比如：

```txt
/
/posts
/posts/:id
/about
```

先把文件路由、动态参数、页面跳转搞清楚。

第三步，学习 loader。

做一个文章列表：

```txt
/posts
  -> loader
  -> 返回 posts
  -> 页面渲染
```

理解路由级数据加载。

第四步，学习 server function。

重点理解：

```txt
哪些代码可以两边跑
哪些代码只能服务端跑
为什么数据库查询要放进 server function
```

第五步，学习 mutation。

做一个新增文章表单：

```txt
表单提交
-> createPost server function
-> validator 校验
-> 写入数据
-> router.invalidate
```

第六步，再看 SSR、pre-render、middleware、API route。

这些属于框架进阶能力，不需要一开始全部掌握。

第七步，再考虑真实业务组合。

比如：

- 登录鉴权。
- 数据库 ORM。
- 表单校验。
- 评论系统。
- 后台任务。
- 实时状态。
- 定时任务。
- webhook。

可以做一个小 demo：

```txt
Mini Blog Demo
功能：
1. 首页
2. 文章列表
3. 文章详情
4. 创建文章
5. 找不到文章显示 not found
6. API ping endpoint
```

这个 demo 做完，你基本就能理解 TanStack Start 的核心工作方式了。

---

## 10. 总结

TanStack Start 的核心价值，是把 TanStack Router 的类型安全路由能力扩展成一个全栈 React 应用框架。

它帮你处理的不只是页面跳转，还包括路由级数据加载、服务端函数、SSR、API endpoint、数据变更后的路由刷新等问题。

初学者最应该先记住三件事：

第一，TanStack Start 没有 Next.js 那种 React Server Component 模型，所以数据加载通常依赖 loader。

第二，loader 不一定永远只在服务端执行。涉及数据库、密钥、文件系统这类服务端资源时，要放进 server function。

第三，写操作完成后，通常需要通过 `router.invalidate()` 让路由数据重新加载，否则 UI 不一定会自动变成最新。

它适合那些希望使用 React、Vite、TanStack Router，并且想获得全栈框架能力的项目。对于已经熟悉 TanStack 生态的人来说，TanStack Start 会比较自然；对于 Next.js 用户来说，它也值得了解，因为它提供了另一种组织全栈 React 应用的思路。

真正开始学习时，不要一上来追求复杂架构。先写几个页面，理解路由；再写 loader，理解数据加载；再写 server function，理解服务端边界；最后再看 mutation、SSR、API route 和后台任务。这样学下来，TanStack Start 的设计思路会清晰很多。
