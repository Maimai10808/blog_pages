# Next.js 性能优化实战：7 个常见瓶颈与解决方案

很多时候，一个 Web 应用功能已经做完了，页面也很好看，但一跑性能测试就发现：页面加载慢、导航卡顿、图片巨大、首屏阻塞、静态页面被意外动态渲染。

Next.js 本身已经提供了很多性能优化能力，比如 Server Components、Image Optimization、Streaming、Middleware、Static Rendering、React cache 等。但这些能力不是自动帮你解决一切，项目里只要几个地方写错，就可能让页面变慢很多。

本文围绕一个慢速 Next.js 网站，总结 7 个常见性能瓶颈，以及对应的优化方法。

---

## 一、不要随便给页面加 `use client`

在 Next.js App Router 中，组件默认是 Server Component。

Server Component 的优势是：

```text id="x3btir"
不会把组件代码打包到浏览器
不需要 hydration
可以直接在服务端获取数据
可以减少客户端 JavaScript 体积
```

但是如果你在页面文件顶部写了：

```tsx id="ik7n0u"
"use client";
```

那么这个页面就会变成 Client Component。
这意味着页面相关的 JavaScript 会被发送到浏览器，并且需要在客户端 hydration。

对于一个纯静态 landing page 来说，这就是浪费。

错误示例：

```tsx id="hnm9h7"
"use client";

export default function HomePage() {
  return (
    <main>
      <h1>Beautiful Landing Page</h1>
      <p>This page does not need interactivity.</p>
    </main>
  );
}
```

如果这个页面没有 `useState`、`useEffect`、`onClick`、浏览器 API，就不应该加 `use client`。

正确写法：

```tsx id="wk8cxb"
export default function HomePage() {
  return (
    <main>
      <h1>Beautiful Landing Page</h1>
      <p>This page does not need interactivity.</p>
    </main>
  );
}
```

如果页面中只有某一个按钮需要交互，应该把按钮拆成单独的 Client Component：

```tsx id="hlhmu8"
"use client";

export function CTAButton() {
  return <button onClick={() => console.log("clicked")}>Get Started</button>;
}
```

然后在 Server Component 页面里使用：

```tsx id="0xpwo5"
export default function HomePage() {
  return (
    <main>
      <h1>Beautiful Landing Page</h1>
      <CTAButton />
    </main>
  );
}
```

核心原则：

```text id="8iihhy"
页面默认保持 Server Component。
只有真正需要交互的小组件才加 use client。
```

这可以减少客户端 bundle，也可以减少 hydration 成本。

---

## 二、图片不要直接用原生 `<img>`

很多慢页面的最大问题不是 React，也不是数据库，而是图片。

比如一个页面加载了 5MB 的图片，网络瀑布图里图片下载时间非常长，首屏自然会变慢。

错误写法：

```tsx id="ye0wsl"
<img src="https://example.com/large-image.jpg" alt="Blog cover" />
```

在 Next.js 中，更推荐使用 `next/image`：

```tsx id="dq4jwe"
import Image from "next/image";

export function BlogCard() {
  return (
    <Image
      src="https://example.com/large-image.jpg"
      alt="Blog cover"
      width={500}
      height={500}
    />
  );
}
```

`next/image` 的优势包括：

```text id="dw2gjb"
自动图片压缩
自动选择合适尺寸
支持懒加载
减少 layout shift
优化加载性能
```

`width` 和 `height` 不是随便填的，它们用于推断图片比例，避免图片加载前后页面布局跳动。

如果图片来自远程域名，还需要在 `next.config` 中配置允许的 host：

```ts id="npdh9a"
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
      },
    ],
  },
};

export default nextConfig;
```

这样 Next.js 才会对这个远程图片做优化。

实际效果通常非常明显。
一个几 MB 的图片，经过优化后可能只剩几十 KB。

核心原则：

```text id="wsthbs"
能用 next/image，就不要直接用 img。
尤其是首屏图片、列表图片、封面图片。
```

---

## 三、避免引入过大的工具库

性能优化不只是减少客户端代码，也包括减少服务端 bundle。

例如很多项目只是为了格式化日期，就引入 `moment`：

```tsx id="jivgpj"
import moment from "moment";

moment(date).format("YYYY-MM-DD");
```

`moment` 体积较大，如果只是简单日期格式化，完全可以使用原生 `Intl.DateTimeFormat`：

```tsx id="2t6v5d"
const formatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const formattedDate = formatter.format(new Date(createdAt));
```

这样可以直接省掉一个依赖。

在 Next.js 项目中，尤其是部署到 serverless 平台时，bundle size 会影响冷启动和函数执行性能。
服务端 bundle 越小，加载越快，冷启动压力也越小。

常见需要谨慎引入的库包括：

```text id="1y7u2f"
moment
lodash 全量引入
大型 chart 库
大型富文本编辑器
无必要的 polyfill
AI 自动安装的重复工具库
```

如果只是简单功能，优先考虑：

```text id="3sgviu"
原生 JavaScript API
按需引入
更轻量的替代库
动态加载
```

尤其是使用 AI 辅助写代码时，要注意它可能会为了一个简单格式化功能安装大型依赖。
这些依赖如果不清理，项目会越来越重。

---

## 四、慢数据不要阻塞整个页面，用 Streaming

有些页面本身结构是静态的，但某一块数据需要等待接口返回。

比如博客列表页：

```tsx id="a6ehj2"
export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <main>
      <h1>Blog</h1>
      <p>Latest articles</p>

      <div>
        {posts.map((post) => (
          <BlogCard key={post.id} post={post} />
        ))}
      </div>
    </main>
  );
}
```

如果 `getBlogPosts()` 慢 1 秒，那么整个页面都会被阻塞。
用户连标题和导航都要等。

更好的做法是把慢数据区域拆出去，用 `Suspense` 做 streaming：

```tsx id="yijcem"
import { Suspense } from "react";

export default function BlogPage() {
  return (
    <main>
      <h1>Blog</h1>
      <p>Latest articles</p>

      <Suspense fallback={<BlogListSkeleton />}>
        <BlogList />
      </Suspense>
    </main>
  );
}

async function BlogList() {
  const posts = await getBlogPosts();

  return (
    <div>
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  );
}
```

这样页面可以分两步返回：

```text id="064fdo"
导航、标题、静态内容先显示
博客列表等待数据完成后再流式插入
```

这就是 Streaming 的价值。

它不是让接口本身变快，而是让用户更早看到可用内容。

适合用 Suspense / Streaming 的场景：

```text id="j959l7"
列表数据较慢
统计卡片较慢
评论区较慢
推荐内容较慢
图表数据较慢
非首要内容但需要服务端获取
```

核心原则：

```text id="fx3rpd"
不要让一个慢接口阻塞整个页面。
哪里慢，就把 Suspense 边界包在哪里。
```

---

## 五、不要在全局 layout 里服务端获取用户 session

这是很多 Next.js 项目都会踩的性能坑。

假设你在 navbar 中需要显示用户信息：

```tsx id="vmx64s"
export async function Navbar() {
  const user = await getUserSession();

  return <nav>{user ? <UserDropdown user={user} /> : <LoginButtons />}</nav>;
}
```

然后这个 Navbar 被放进根 layout：

```tsx id="3v82t4"
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
```

问题是：
`getUserSession()` 需要读取请求相关信息，比如 cookies / headers。
一旦 layout 中服务端读取 session，下面所有 children 都可能被迫进入动态渲染。

结果就是：本来首页可以静态预渲染，现在也变成了每次请求都动态渲染。

可以通过构建命令查看：

```bash id="ivq4oi"
pnpm run build
```

Next.js 会输出哪些路由是 static，哪些是 dynamic。

如果首页明明没有数据请求，却显示成 dynamic，通常就要检查：

```text id="kcbzuf"
layout 是否读取了 cookies / headers
navbar 是否服务端获取 session
全局组件是否使用了认证库的服务端函数
```

对于全局导航栏中的用户信息，可以考虑在客户端获取：

```tsx id="zeuj6w"
"use client";

import { useKindeBrowserClient } from "@kinde-oss/kinde-auth-nextjs";

export function Navbar() {
  const { user, isLoading } = useKindeBrowserClient();

  if (isLoading) {
    return null;
  }

  return <nav>{user ? <UserDropdown user={user} /> : <AuthLinks />}</nav>;
}
```

这样首页仍然可以保持静态渲染。
用户信息在客户端加载完成后再显示。

这种方式会带来一个小延迟，但它换来的是整站静态渲染能力。

核心原则：

```text id="z05k3n"
全局 layout 尽量不要服务端读取用户 session。
否则容易让本来可以静态渲染的页面变成动态渲染。
```

---

## 六、保护路由优先用 Middleware，而不是 layout 里查 session

有些页面确实需要登录才能访问，比如 dashboard。

一种常见写法是在 dashboard layout 中检查用户：

```tsx id="8jhgr3"
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return <>{children}</>;
}
```

这能保护页面，但也会让整个 dashboard layout 下的页面都在服务端动态读取 session。

更合适的方式是使用 Middleware。

Middleware 会在请求进入页面之前执行，可以根据用户 session 判断是否允许访问：

```ts id="9ex8ha"
import { withAuth } from "@kinde-oss/kinde-auth-nextjs/middleware";

export default withAuth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

或者根据认证库提供的方式配置 public paths：

```ts id="4sv1zi"
export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
```

Middleware 的作用是：

```text id="m34nqv"
请求进入页面前拦截
检查是否登录
未登录就 redirect
已登录才放行
```

这样不需要每个 layout 都手动 `await requireUser()`。

更重要的是：Middleware 可以保护路由，同时尽量减少对页面静态渲染的破坏。

适合 Middleware 的场景：

```text id="71bfgt"
保护 dashboard
保护 settings
保护 billing
保护 admin
统一处理登录跳转
统一处理区域权限
```

核心原则：

```text id="h431u2"
路由级认证优先交给 Middleware。
页面内部再做具体业务数据权限判断。
```

---

## 七、同一次渲染中重复获取 session，用 React cache

在 dashboard 页面中，很多数据访问函数都需要确认用户身份：

```ts id="5928db"
export async function getTotalRevenue() {
  const user = await requireUser();
  // fetch revenue
}

export async function getCustomers() {
  const user = await requireUser();
  // fetch customers
}

export async function getActiveAccounts() {
  const user = await requireUser();
  // fetch active accounts
}
```

如果 dashboard 一次渲染中调用了 6 个数据函数，那么 `requireUser()` 可能会被调用 6 次。

这很浪费。

因为在同一次 render pass 中，用户 session 的结果应该是一样的。
只需要获取一次，然后复用结果。

React 提供了 `cache` 函数，可以缓存一次渲染过程中的函数结果：

```ts id="dxiojb"
import { cache } from "react";

export const requireUser = cache(async () => {
  const user = await getUserSession();

  if (!user) {
    redirect("/login");
  }

  return user;
});
```

这样在同一次 render pass 里，多次调用：

```ts id="jbzxtl"
await requireUser();
await requireUser();
await requireUser();
```

实际只会执行一次，后续复用缓存结果。

这非常适合：

```text id="k7zbls"
requireUser
getCurrentUser
getOrganization
getPermissions
getWorkspace
读取当前请求上下文的函数
```

注意：`cache` 的缓存范围不是永久缓存。
它主要是在一次服务端渲染请求中复用结果。

核心原则：

```text id="guu74d"
同一次服务端渲染中会重复调用的用户/session/权限函数，可以用 React cache 包起来。
```

---

## 八、推荐的 Next.js 性能优化检查清单

可以用下面这个清单检查项目性能。

### 1. 检查 `use client`

```text id="6wn62z"
page.tsx 是否不必要地加了 use client
layout.tsx 是否不必要地加了 use client
大组件是否因为小交互变成 Client Component
能否把按钮、弹窗、输入框拆出去
```

### 2. 检查图片

```text id="2ghako"
是否还在直接使用 img
是否使用 next/image
远程图片是否配置 remotePatterns
是否给 Image 配置 width / height
首屏图片是否过大
```

### 3. 检查依赖体积

```text id="6546yd"
是否为了简单日期格式化引入 moment
是否全量引入 lodash
是否有重复工具库
AI 生成代码是否自动安装了不必要依赖
是否可以用原生 Intl API 替代
```

### 4. 检查慢数据

```text id="4pt2wr"
是否因为一个慢接口阻塞整页
是否可以用 Suspense 拆分
是否有 loading skeleton
是否能让静态内容先渲染
```

### 5. 检查 layout

```text id="r6jki8"
layout 是否服务端读取 session
layout 是否调用 cookies / headers
全局 Header 是否导致整站动态渲染
认证信息是否可以客户端获取
```

### 6. 检查路由保护

```text id="vnjz2j"
是否在每个 layout 里 requireUser
是否可以改用 Middleware
protected routes 是否有统一 matcher
public paths 是否清晰
```

### 7. 检查重复请求

```text id="ouhu86"
requireUser 是否在一个页面中被调用多次
权限函数是否重复读取 session
多个数据函数是否重复获取同一上下文
是否可以用 React cache 包装
```

---

## 九、面试中怎么讲 Next.js 性能优化

如果面试官问：你在 Next.js 项目里怎么做性能优化？

可以这样回答：

```text id="6vav6f"
我会先从组件边界和渲染模式入手。

在 App Router 中，默认组件是 Server Component，所以我不会随便在 page 或 layout 上加 use client。只有真正需要交互的按钮、输入框、弹窗才拆成小的 Client Component，这样可以减少客户端 JavaScript 和 hydration 成本。

图片方面，我会优先使用 next/image，而不是原生 img。这样可以自动压缩、按需加载、避免 layout shift。远程图片会配置 remotePatterns，避免图片优化被滥用。

对于慢数据，我不会让整个页面 await 一个慢接口，而是把慢数据区域拆成独立 Server Component，用 Suspense 包起来，让导航、标题、静态内容先渲染，列表或图表后续 streaming 进来。

另外我会特别注意 layout 中不要服务端读取 session，因为这可能导致所有 children 都被 opt into dynamic rendering。本来可以静态预渲染的首页，如果因为 navbar 读取 session 变成动态渲染，性能会差很多。全局 navbar 的用户信息可以在客户端获取，路由保护则放到 middleware 里处理。

最后，如果同一次服务端渲染中多个数据函数都需要 requireUser，我会用 React cache 包装 requireUser，让它在一次 render pass 中只执行一次，避免重复读取 session。
```

这段回答比较完整，因为它覆盖了：

```text id="96h0ma"
Server / Client Component 边界
图片优化
依赖体积
Suspense / Streaming
Static / Dynamic Rendering
Middleware
React cache
```

---

## 十、总结

Next.js 性能优化不是只靠一个技巧，而是要理解 App Router 的运行模型。

这 7 个优化点可以总结为：

```text id="7uyij2"
不要把不需要交互的页面变成 Client Component
图片使用 next/image，而不是直接 img
简单日期格式化优先用 Intl，避免大型依赖
慢数据区域用 Suspense + Streaming，不要阻塞整页
不要在全局 layout 服务端读取 session
路由保护优先用 Middleware
重复的 requireUser / session 函数用 React cache
```

最重要的是：经常运行生产构建检查渲染模式。

```bash id="2qxaq5"
pnpm run build
```

观察哪些页面是 static，哪些页面是 dynamic。
如果一个本该静态的页面变成动态渲染，通常说明项目里某个 layout、header、auth 函数或动态 API 使用位置不合理。

一句话总结：

```text id="rlzxdz"
Next.js 性能优化的核心，是让能静态的页面保持静态，让必须动态的部分局部动态，让真正需要交互的部分才进入客户端。
```
