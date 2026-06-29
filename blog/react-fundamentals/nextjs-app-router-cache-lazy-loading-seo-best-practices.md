# Next.js 最佳实践总结：从 App Router 到缓存、懒加载与 SEO 优化

Next.js 是目前 React 生态中非常流行的全栈框架。它不仅可以用来写前端页面，还可以处理服务端渲染、路由、缓存、图片优化、字体优化、SEO、API 等能力。

不过，Next.js 的功能很多，很多开发者在使用时只用了最基础的一部分，却忽略了一些真正能提升项目质量和性能的实践。

本文总结几个 Next.js 开发中非常值得注意的最佳实践：

```text id="s6jelt"
使用 App Router
优先使用 TypeScript
不要滥用 use client
善用 Next.js 内置能力
理解缓存机制
使用 Tailwind CSS
合理使用懒加载
做好 SEO 和 Metadata 优化
```text

这些实践不一定适用于所有项目，但对于大多数现代 Next.js 应用来说，都非常有参考价值。

---

## 一、优先使用 App Router

如果你现在开始学习或开发 Next.js，建议优先使用 App Router。

Next.js 以前主要使用 Pages Router，也就是 `pages` 目录。但现在新的项目更推荐使用 `app` 目录，也就是 App Router。

一个 App Router 项目通常会有这样的目录结构：

```text id="4fis10"
app/
  layout.tsx
  page.tsx
```

而 Pages Router 项目通常是：

```text id="8dwct3"
pages/
  index.tsx
  about.tsx
```text

Pages Router 仍然可以使用，也仍然被支持，并不是完全不能用。但如果你是新项目，或者正在系统学习 Next.js，App Router 更值得优先掌握。

原因包括：

```text id="gskf5h"
更符合 Next.js 现在的发展方向；
官方文档重点围绕 App Router；
支持 Server Components；
支持更灵活的布局系统；
支持 streaming；
和现代 React 能力结合更紧密。
```

所以，如果不是维护老项目，建议直接使用 App Router。

---

## 二、优先使用 TypeScript

Next.js 项目中，强烈建议使用 TypeScript。

虽然 JavaScript 写起来更快，尤其是小 demo、小工具项目中，JavaScript 确实很方便。但在真实项目里，TypeScript 的价值会越来越明显。

TypeScript 可以带来：

```text id="l1hf1m"
更好的类型提示；
更少的运行时错误；
更强的代码可维护性；
更适合团队协作；
更容易重构；
更容易理解复杂数据结构。
```text

比如一个 Next.js + TypeScript 项目中，你通常会看到：

```text id="t09u4z"
.ts
.tsx
tsconfig.json
```

对于团队项目、长期维护项目、业务复杂项目，TypeScript 基本已经是默认选择。

当然，如果只是写一个非常简单的页面，或者为了快速验证想法，用 JavaScript 也可以。但大多数情况下，Next.js + TypeScript 会更稳。

一句话建议：

**简单 demo 可以用 JavaScript，正式项目尽量用 TypeScript。**

---

## 三、不要滥用 `use client`

App Router 中一个非常重要的概念是：

```text id="09455d"
Server Component
Client Component
```text

默认情况下，`app` 目录下的组件是 Server Component。

如果你在文件顶部写了：

```tsx id="u7txtf"
"use client";
```

这个组件就会变成 Client Component。

Client Component 可以使用浏览器交互能力，比如：

```text id="7mq2s4"
useState
useEffect
onClick
useFormStatus
浏览器 API
```tsx

但问题是，很多人会为了一个按钮、一个点击事件，就把整个大组件都标记成 `use client`。

这通常不是最佳实践。

---

## 四、把需要交互的小组件单独拆出去

假设页面中只有一个按钮需要点击事件。

错误思路是：

```tsx id="b2vkt4"
"use client";

export default function Page() {
  return (
    <main>
      <h1>Article Detail</h1>
      <p>这里是大量服务端渲染内容...</p>

      <button onClick={() => alert("delete")}>Delete</button>
    </main>
  );
}
```

这样会导致整个 `Page` 都变成 Client Component。

更好的做法是，把按钮单独拆成一个 Client Component。

例如：

```tsx id="a7fxgh"
// DeleteButton.tsx

"use client";

export function DeleteButton() {
  return <button onClick={() => alert("delete")}>Delete</button>;
}
```tsx

然后在 Server Component 中使用它：

```tsx id="tj2r2l"
// page.tsx

import { DeleteButton } from "./DeleteButton";

export default function Page() {
  return (
    <main>
      <h1>Article Detail</h1>
      <p>这里是大量服务端渲染内容...</p>

      <DeleteButton />
    </main>
  );
}
```

这样做的好处是：

```text id="3rccmb"
页面主体仍然保持 Server Component；
只有真正需要交互的按钮运行在客户端；
减少发送到浏览器的 JavaScript；
更有利于性能和 SEO。
```ts

所以，不是不能用 `use client`，而是要用得精准。

一句话总结：

**哪里需要交互，哪里才使用 `use client`，不要因为一个按钮让整个页面都变成客户端组件。**

---

## 五、善用 Next.js 提供的内置能力

Next.js 提供了很多内置优化能力，不要把它当成普通 React 项目来写。

比如，Next.js 提供了：

```text id="kw8spy"
next/image
next/link
next/font
metadata API
dynamic import
caching
```

这些能力不是摆设，而是 Next.js 的核心优势。

---

## 六、使用 `next/image` 优化图片

普通 HTML 中我们写图片可能会这样：

```tsx id="hfsg7j"
<img src="/hero.png" alt="Hero" />
```tsx

在 Next.js 中，更推荐使用：

```tsx id="8t614y"
import Image from "next/image";

export function Hero() {
  return <Image src="/hero.png" alt="Hero" width={1200} height={600} />;
}
```

`next/image` 可以帮助你做很多优化，比如：

```text id="ek8y8l"
图片尺寸优化；
懒加载；
防止布局偏移；
按需加载合适尺寸；
提升页面性能。
```tsx

当然，不是所有场景都必须用 `next/image`，但对于大多数本地图片、远程图片、页面核心图片，它都比普通 `img` 更适合。

---

## 七、使用 `next/link` 做页面跳转

普通 HTML 中跳转链接是：

```tsx id="yf9j0d"
<a href="/about">About</a>
```

Next.js 中更推荐：

```tsx id="l8i353"
import Link from "next/link";

export function Nav() {
  return <Link href="/about">About</Link>;
}
```text

`next/link` 的优势是：

```text id="pnd29k"
不会像普通 a 标签那样整页刷新；
支持客户端导航；
体验更接近 SPA；
可以利用 Next.js 的预取和缓存能力。
```

所以内部页面跳转，优先使用 `Link`。

外部链接才更常用普通 `a` 标签。

---

## 八、使用 `next/font` 管理字体

Next.js 还提供了字体优化能力。

例如使用 Google Font：

```tsx id="2fm82z"
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```text

使用 `next/font` 的好处是：

```text id="w31idh"
自动优化字体加载；
减少布局偏移；
避免手动写复杂 font-face；
可以更好地集成到 Next.js 构建流程中。
```

对于需要使用 Google Fonts 的项目，`next/font` 比直接在 HTML 里引入外部字体链接更推荐。

---

## 九、理解 Next.js 缓存机制

Next.js 的缓存机制是一个很重要但也比较容易让人困惑的部分。

在 App Router 中，缓存不只是一个简单的浏览器缓存问题，它涉及服务端和客户端多个层面。

常见可以理解为几类：

```text id="20eg55"
Request Memoization
Data Cache
Full Route Cache
Router Cache
```text

其中前三类主要发生在服务端，Router Cache 主要发生在客户端。

---

## 十、Router Cache：让页面导航更快

Router Cache 可以简单理解为：

**用户在页面之间导航时，Next.js 会尽量复用已经获取过的路由数据，从而减少不必要的服务器请求。**

这会让页面切换更快，用户体验更接近原生应用。

比如用户从首页进入详情页，再返回首页，如果缓存仍然有效，就不需要完全重新请求和渲染。

---

## 十一、服务端缓存：减少重复计算和请求

服务端缓存可以帮助我们减少重复请求、重复渲染和重复计算。

例如某些数据不需要每次请求都重新计算：

```text id="9qhykc"
网站配置；
分类列表；
文章详情；
商品详情；
不频繁变化的接口数据。
```

合理使用缓存可以带来明显好处：

```text id="g81gp4"
页面响应更快；
服务器压力更小；
数据库请求更少；
用户体验更好；
部署成本更低。
```tsx

不过缓存也有风险。

缓存用错了，可能导致用户看到旧数据，甚至在权限场景中出现数据泄露。

所以缓存要结合业务数据的变化频率来设计。

一句话总结：

**缓存可以让应用更快，但你必须知道哪些数据可以缓存，哪些数据不能缓存。**

---

## 十二、使用 Tailwind CSS 提高开发效率

在 Next.js 项目中，Tailwind CSS 是非常常见的样式方案。

它和 Next.js 集成方便，开发效率高，也适合组件化开发。

比如一个按钮：

```tsx id="a3g3c7"
export function SubmitButton() {
  return (
    <button className="mt-5 rounded bg-black px-4 py-2 text-white">
      Submit
    </button>
  );
}
```

Tailwind 的好处是：

```text id="kqc3sb"
不用频繁切换 CSS 文件；
样式和组件结构在一起；
类名有统一设计规范；
开发速度快；
适合构建设计系统。
```tsx

当然，也有人不喜欢 Tailwind，觉得它会让 JSX 变长。

这个问题确实存在。

如果 className 写得很乱，组件会变得难读。但如果你合理拆组件、抽公共样式、保持类名有序，Tailwind 反而可以让样式更清晰。

比如复杂组件可以拆成：

```tsx id="bqry6k"
const buttonClassName =
  "mt-5 rounded bg-black px-4 py-2 text-white hover:bg-gray-800";

export function SubmitButton() {
  return <button className={buttonClassName}>Submit</button>;
}
```

Tailwind 不是唯一选择，但在 Next.js 生态中，它确实是非常高效的方案。

---

## 十三、合理使用 Lazy Loading

Lazy Loading，也就是懒加载，是 Next.js 性能优化中非常实用的手段。

它的核心思想是：

```text id="lacgkz"
首屏不需要的组件，不要一开始就加载；
等用户真正需要时，再加载。
```tsx

例如一个 Modal 组件，用户不点击按钮时根本看不到它。

这种组件就很适合懒加载。

---

## 十四、使用 `next/dynamic` 懒加载组件

Next.js 中可以使用 `next/dynamic` 做动态导入。

例如：

```tsx id="g5wqli"
import dynamic from "next/dynamic";

const Modal = dynamic(() => import("./Modal"));

export default function Page() {
  return (
    <main>
      <h1>Home Page</h1>
      <Modal />
    </main>
  );
}
```

更常见的是配合状态按需渲染：

```tsx id="gnyglm"
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const Modal = dynamic(() => import("./Modal"));

export default function Page() {
  const [open, setOpen] = useState(false);

  return (
    <main>
      <button onClick={() => setOpen(true)}>Open Modal</button>

      {open && <Modal />}
    </main>
  );
}
```text

这样 Modal 对应的 JavaScript chunk 不会在首屏立刻加载，而是在用户点击按钮后再加载。

适合懒加载的组件包括：

```text id="mpesq6"
弹窗；
抽屉；
图表；
地图；
富文本编辑器；
复杂表格；
代码编辑器；
只在特定交互后出现的模块。
```

不过同样要注意：

**不要为了懒加载而懒加载。**

如果一个组件很小，或者首屏立刻就要显示，就没有必要动态导入。

---

## 十五、做好 SEO 和 Metadata 优化

Next.js 很适合做 SEO，因为它支持服务端渲染、静态生成、Metadata API、Open Graph 等能力。

在 App Router 中，可以通过导出 `metadata` 来配置页面元信息。

例如：

```tsx id="kmxvdt"
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "My Next.js App",
  description: "A modern web application built with Next.js",
};
```text

页面的 title 和 description 会影响搜索引擎展示，也会影响用户在搜索结果中是否愿意点击。

---

## 十六、使用 Open Graph 优化链接分享

当你把一个网站链接发到社交平台、聊天软件或其他地方时，平台通常会读取 Open Graph 信息。

如果配置得好，链接会展示：

```text id="u1qgus"
标题；
描述；
封面图；
站点名称。
```

例如：

```tsx id="lrf01t"
export const metadata = {
  title: "My App",
  description: "A useful Next.js application",
  openGraph: {
    title: "My App",
    description: "A useful Next.js application",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "My App",
    description: "A useful Next.js application",
    images: ["/og-image.png"],
  },
};
```ts

这样，当用户分享链接时，不只是显示一个冷冰冰的 URL，而是有标题、描述和图片。

这会明显提升点击率和品牌观感。

---

## 十七、PWA 与移动端体验

Next.js 的 Metadata 还可以用于增强移动端体验，比如支持 PWA、Apple Web App、图标、启动图等。

例如：

```tsx id="7cf4h0"
export const metadata = {
  title: "My App",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "My App",
    statusBarStyle: "default",
  },
};
```

这类配置可以让网站更接近原生应用体验。

比如用户把网站添加到手机桌面后，可以看到更合适的图标、启动体验和状态栏样式。

---

## 十八、Next.js 最佳实践总结

可以把上面的建议总结成一张表：

| 实践                       | 作用                                                                 |
| -------------------------- | -------------------------------------------------------------------- |
| 使用 App Router            | 更符合 Next.js 当前主流方向，支持 Server Components、布局、streaming |
| 使用 TypeScript            | 提高可靠性、可维护性和团队协作效率                                   |
| 少用全局 `use client`      | 减少客户端 JS，保留服务端渲染优势                                    |
| 使用 `next/image`          | 图片优化、懒加载、防止布局偏移                                       |
| 使用 `next/link`           | 更好的客户端导航和缓存体验                                           |
| 使用 `next/font`           | 优化字体加载，减少布局问题                                           |
| 学习缓存机制               | 提升速度，减少服务器和数据库压力                                     |
| 使用 Tailwind CSS          | 提高样式开发效率，适合组件化                                         |
| 使用 Lazy Loading          | 延迟加载非首屏重型组件                                               |
| 配置 Metadata / Open Graph | 提升 SEO 和链接分享效果                                              |

---

## 十九、实际开发中的优先级

如果你刚开始写 Next.js 项目，可以按这个优先级来做：

```text id="uuq141"
1. 使用 App Router
2. 使用 TypeScript
3. 默认写 Server Component
4. 只有需要交互时才拆 Client Component
5. 内部跳转用 next/link
6. 图片用 next/image
7. 字体用 next/font
8. 大组件用 next/dynamic 懒加载
9. 配置 metadata 和 Open Graph
10. 项目变复杂后认真学习缓存
```text

对于新手来说，不需要一开始就把缓存、PWA、SEO 全部做到极致。

但至少要知道这些能力存在，并在合适的时候使用它们。

---

## 二十、总结

Next.js 不只是一个 React 路由框架，它提供了很多能提升性能、SEO 和开发体验的能力。

想写好 Next.js 项目，不能只会写组件，还需要理解它提供的框架能力。

比较推荐的实践是：

```text id="7mno1m"
新项目优先使用 App Router；
正式项目优先使用 TypeScript；
不要滥用 use client；
善用 next/image、next/link、next/font；
理解缓存机制；
合理使用 Tailwind；
用 next/dynamic 懒加载重型组件；
认真配置 metadata、Open Graph 和 SEO 信息。
```

一句话总结：

**Next.js 的优势不只是“能写 React 页面”，而是它已经帮你准备好了性能、路由、缓存、图片、字体和 SEO 的一整套工程化能力；真正的最佳实践，就是在合适的地方用好这些能力。**
