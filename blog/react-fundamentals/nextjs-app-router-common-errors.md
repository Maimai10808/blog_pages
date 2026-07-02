# Next.js App Router 常见错误总结：Server Components、Server Actions、缓存与渲染模式

Next.js App Router 引入了很多新的概念，例如 Server Components、Client Components、Server Actions、Suspense、Streaming、静态渲染、动态渲染、Route Handlers、Search Params 等。

这些能力很强，但也很容易让人踩坑。尤其是从传统 React 或 Pages Router 迁移过来的开发者，很容易把以前的思维直接套到 App Router 里，结果导致组件边界混乱、数据请求重复、缓存不更新、Hydration Error、服务端数据泄露、页面被意外动态渲染等问题。

本文围绕 Next.js App Router 中最常见的工程错误，总结它们背后的原理和正确写法。

---

## 一、不要把 `use client` 放得太高

在 App Router 中，组件默认都是 Server Component。

只有当组件需要浏览器交互能力时，才需要加：

```tsx
"use client";
```

比如：

```tsx
"use client";

import { useState } from "react";

export function FavoriteButton() {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <button onClick={() => setIsFavorite(!isFavorite)}>
      {isFavorite ? "已收藏" : "收藏"}
    </button>
  );
}
```

因为这里使用了：

```text
useState
onClick
```

这些都只能在客户端运行，所以这个组件必须是 Client Component。

但是一个常见错误是：看到某个小按钮需要交互，就直接在 `page.tsx` 顶部加 `use client`。

```tsx
"use client";

export default function Page() {
  return (
    <>
      <Product />
      <FavoriteButton />
    </>
  );
}
```

这样做的问题是：**整个 page 文件以及它 import 的组件都会变成 Client Component。**

也就是说，如果 `Product` 原本是一个 Server Component：

```tsx
export async function Product() {
  const res = await fetch("https://example.com/api/product");
  const product = await res.json();

  return <div>{product.title}</div>;
}
```

它也会因为被 Client Component import 而变成 Client Component。
这会导致服务端能力失效，比如不能在组件体内直接 `await fetch`，也会让更多代码被打包发送到浏览器。

正确做法是：

```text
谁需要交互，谁加 use client。
```

也就是说，把 `use client` 放在组件树的叶子节点，而不是根节点。

推荐结构：

```tsx
export default function Page() {
  return (
    <>
      <Product />
      <FavoriteButton />
    </>
  );
}
```

```tsx
"use client";

export function FavoriteButton() {
  // 只有这个按钮是 Client Component
}
```

这样 `Product` 仍然可以保持 Server Component，`FavoriteButton` 才是 Client Component。

一句话总结：

```text
use client 是边界，不是开关。不要为了一个按钮，把整棵组件树都变成客户端组件。
```

---

## 二、需要交互时，应该拆出 Client Component

有时候交互元素直接写在 `page.tsx` 里，比如：

```tsx
export default function Page() {
  return (
    <main>
      <h1>My Store</h1>
      <button onClick={() => console.log("upvote")}>Upvote</button>
      <Product />
    </main>
  );
}
```

这里会报错，因为 `onClick` 只能在 Client Component 中使用。

错误做法是给整个 `page.tsx` 加 `use client`。

正确做法是拆出一个独立组件：

```tsx
"use client";

export function UpvoteButton() {
  return <button onClick={() => console.log("upvote")}>Upvote</button>;
}
```

然后在 Server Component 中使用：

```tsx
export default function Page() {
  return (
    <main>
      <h1>My Store</h1>
      <UpvoteButton />
      <Product />
    </main>
  );
}
```

这样页面主体仍然是 Server Component，只有按钮这一小块是 Client Component。

这个思路在实际项目里非常重要：

```text
页面布局、数据展示、服务端请求：Server Component
按钮、输入框、弹窗、表单交互：Client Component
```

---

## 三、没有 `use client` 不代表一定是 Server Component

很多人判断一个组件是不是 Client Component，会直接打开文件看顶部有没有：

```tsx
"use client";
```

如果没有，就以为它一定是 Server Component。

这不一定对。

因为 `use client` 的边界是基于 import 传播的。

例如：

```tsx
"use client";

import { FavoriteButton } from "./FavoriteButton";

export function Sidebar() {
  return <FavoriteButton />;
}
```

即使 `FavoriteButton.tsx` 文件顶部没有 `use client`，只要它被一个 Client Component import，它最终也会进入客户端组件树。

不过如果一个组件本身永远需要交互，比如内部用了 `useState`、`useEffect`、`onClick`，最好还是在它自己的文件顶部明确写上：

```tsx
"use client";
```

这样它无论被谁引用，都能稳定工作。

---

## 四、Client Component 包住 Server Component，不一定会把它变成客户端组件

这是 App Router 中非常容易混淆的一点。

如果一个 Client Component 通过 `children` 包裹 Server Component，Server Component 仍然可以保持服务端组件。

例如一个 Provider：

```tsx
"use client";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

然后：

```tsx
export default function Page() {
  return (
    <ThemeProvider>
      <Product />
    </ThemeProvider>
  );
}
```

这里 `ThemeProvider` 是 Client Component，但 `Product` 仍然可以是 Server Component。

关键区别在于：

```text
如果 Client Component import 了 Server Component，Server Component 会变成客户端边界的一部分。
如果 Client Component 只是通过 children 接收它，Server Component 可以保持服务端组件。
```

所以，下面这种方式不好：

```tsx
"use client";

import { Product } from "./Product";

export function ThemeProvider() {
  return <Product />;
}
```

因为 `Product` 被 Client Component import 了。

而这种方式可以：

```tsx
<ThemeProvider>
  <Product />
</ThemeProvider>
```

这就是所谓的 Server Components 和 Client Components 可以 interleave，也就是交错组合。

---

## 五、状态管理只能放在客户端

Context、Zustand、Jotai、Redux 等状态管理，本质上都是为了在浏览器运行期间保存用户交互状态。

它们不能直接用于 Server Component。

例如：

```tsx
import { createContext } from "react";

export const ThemeContext = createContext("light");
```

如果要用 Context Provider，一般需要：

```tsx
"use client";

import { createContext, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState("light");

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

原因是 Server Component 的运行模式是 request-response。

服务器处理一次请求，生成响应，然后就结束了。
它不会像浏览器一样在用户整个访问期间持续保存 UI 状态。

所以：

```text
服务端适合获取数据、生成 HTML、访问数据库和 secret。
客户端适合状态管理、用户交互和浏览器 API。
```

---

## 六、不要用 `use server` 来声明 Server Component

很多人以为：

```tsx
"use client";
```

是声明 Client Component。

所以：

```tsx
"use server";
```

就是声明 Server Component。

这是错误的。

在 App Router 中，组件默认就是 Server Component，不需要加 `use server`。

`use server` 的作用是声明 **Server Action**。

例如：

```ts
"use server";

export async function addProduct(formData: FormData) {
  // 这里是 Server Action
}
```

Server Action 本质上会暴露一个服务端 POST 调用入口。
如果你只是想让某个组件或工具函数只能在服务端使用，不应该乱加 `use server`。

正确做法是使用 `server-only`：

```ts
import "server-only";

export async function getProduct() {
  // 只能在服务端使用
}
```

这样如果它被 Client Component import，Next.js 会直接报错，避免误用。

---

## 七、不要把敏感数据传给 Client Component

Server Component 可以访问数据库、secret、用户敏感信息。
但是一旦把数据作为 props 传给 Client Component，这些数据就会跨过服务端和客户端边界，出现在浏览器里。

错误例子：

```tsx
export async function Page() {
  const user = await db.user.findUnique({
    where: { id: "1" },
  });

  return <UserCard user={user} />;
}
```

如果 `UserCard` 是 Client Component：

```tsx
"use client";

export function UserCard({ user }: { user: any }) {
  console.log(user);

  return <div>{user.name}</div>;
}
```

那么 `user` 中的所有字段都会被发送到客户端。
如果里面包含 password、token、secret，就会泄露。

正确做法是：

```tsx
const safeUser = {
  id: user.id,
  name: user.name,
  avatar: user.avatar,
};

return <UserCard user={safeUser} />;
```

也就是说：

```text
Server Component 可以拿到敏感数据，但传给 Client Component 之前必须脱敏。
```

更稳的做法是在数据访问层就不要查询敏感字段。

---

## 八、Client Component 也会在服务端预渲染一次

很多人以为 Client Component 只在浏览器运行。
其实不是。

在 Next.js 中，Client Component 会参与服务端预渲染。
也就是说，它的组件函数体可能会先在服务端运行一次，用来生成初始 HTML，然后再在浏览器中 hydrate。

所以：

```tsx
"use client";

export function FavoriteButton() {
  console.log("hello from client component");

  return <button>Favorite</button>;
}
```

这段 `console.log` 可能会在两个地方出现：

```text
服务端 terminal
浏览器 console
```

它在服务端运行一次，是为了生成预渲染 HTML。
之后在浏览器 hydration 后，交互和状态更新会在客户端继续运行。

所以更准确的说法是：

```text
Server Component 只在服务端运行。
Client Component 会在服务端预渲染一次，也会在客户端运行。
```

这会影响很多浏览器 API 的使用。

---

## 九、不要直接在组件体内使用 `window`、`localStorage`

因为 Client Component 也会在服务端预渲染一次，所以这段代码会报错：

```tsx
"use client";

export function FavoriteButton() {
  const value = localStorage.getItem("isFavorite");

  return <button>{value}</button>;
}
```

报错原因是：

```text
localStorage is not defined
```

因为服务端没有 `window`，也没有 `localStorage`。

常见解决方案有三种。

### 1. 判断 window 是否存在

```tsx
const value =
  typeof window !== "undefined" ? localStorage.getItem("isFavorite") : null;
```

### 2. 放到 useEffect 里

```tsx
"use client";

import { useEffect, useState } from "react";

export function FavoriteButton() {
  const [value, setValue] = useState<string | null>(null);

  useEffect(() => {
    setValue(localStorage.getItem("isFavorite"));
  }, []);

  return <button>{value}</button>;
}
```

`useEffect` 不会在服务端执行，所以可以安全访问浏览器 API。

### 3. 使用 dynamic import 禁用 SSR

```tsx
import dynamic from "next/dynamic";

const FavoriteButton = dynamic(() => import("./FavoriteButton"), {
  ssr: false,
});
```

这表示该组件只在浏览器加载，不参与服务端预渲染。

---

## 十、Hydration Error 的原因

Hydration Error 通常来自：

```text
服务端生成的 HTML
和
客户端首次渲染的 HTML
不一致
```

例如：

```tsx
"use client";

export function FavoriteButton() {
  const hasFavorited =
    typeof window !== "undefined" ? localStorage.getItem("isFavorite") : false;

  return <div>{hasFavorited ? "yes" : "no"}</div>;
}
```

服务端没有 localStorage，所以渲染出：

```html
<div>no</div>
```

客户端有 localStorage，可能渲染出：

```html
<div>yes</div>
```

这就会导致 hydration mismatch。

常见解决方式：

```text
用 useEffect 等客户端挂载后再读取浏览器状态
用 suppressHydrationWarning 只压制明确可接受的不一致
避免在首屏渲染中直接使用 Date、Math.random、localStorage 等不稳定值
修复错误 HTML 结构，例如 p 标签里不能放 div
```

`suppressHydrationWarning` 不是万能解法，只有在你明确知道不一致是可接受的时候才用。

---

## 十一、第三方组件要正确包一层

有些第三方 React 组件内部用了 hooks、事件、window 或 localStorage，但它的包里没有写 `use client`。

如果直接在 Server Component 中使用，可能报错。

解决方案是自己包一层：

```tsx
"use client";

export { default } from "react-amazing-carousel";
```

然后项目里不要直接 import 第三方包，而是 import 这个 wrapper。

如果第三方组件用了浏览器 API，并且不能参与服务端预渲染，则需要 dynamic import：

```tsx
import dynamic from "next/dynamic";

const Carousel = dynamic(() => import("./Carousel"), {
  ssr: false,
});
```

可以简单记：

```text
组件内部用了 hook / event：包一层 use client。
组件内部用了 window / localStorage：可能还需要 ssr: false。
```

---

## 十二、获取数据不要绕一层 Route Handler

传统 React 项目里，经常是：

```text
前端组件
→ fetch /api/products
→ API Route
→ 数据库
```

但在 App Router 中，Server Component 本来就在服务端运行。
所以很多时候可以直接在 Server Component 中访问数据库：

```tsx
export default async function Page() {
  const products = await prisma.product.findMany();

  return <ProductList products={products} />;
}
```

不需要自己再创建：

```ts
app / api / products / route.ts;
```

然后在 Server Component 里 fetch 它。

Route Handler 更适合：

```text
Webhook
第三方回调
开放 API
移动端或外部系统调用的接口
特殊 HTTP 处理
```

普通页面数据获取，优先放在 Server Component 或数据访问函数中。

---

## 十三、相同 fetch 请求不一定会重复请求

在 Server Component 中，如果多个组件请求相同数据：

```tsx
async function ProductTitle() {
  const product = await getProduct();
  return <h1>{product.title}</h1>;
}

async function ProductPrice() {
  const product = await getProduct();
  return <p>{product.price}</p>;
}
```

很多人会担心重复请求。

如果底层使用的是 `fetch`，React / Next.js 会对相同 fetch 做缓存和去重。
也就是说，在同一次 render pass 中，相同请求不会重复执行。

所以可以更靠近使用位置 fetch 数据，而不是为了“看起来只请求一次”把所有请求都提升到 page 层，造成大量 props drilling。

不过如果你用的是 ORM，比如 Prisma，React 不会自动帮你缓存 ORM 调用。
可以使用：

```ts
import { cache } from "react";

export const getProduct = cache(async (id: string) => {
  return prisma.product.findUnique({ where: { id } });
});
```

如果需要 Next.js 更持久的数据缓存，可以关注 `unstable_cache`。

---

## 十四、避免数据请求瀑布流

瀑布流指的是多个请求串行执行：

```tsx
const product = await getProduct();
const ratings = await getRatings();
const comments = await getComments();
```

如果它们彼此不依赖，这样会浪费时间。

假设每个请求 2 秒：

```text
串行：2 + 2 + 2 = 6 秒
并行：max(2, 2, 2) = 2 秒
```

正确写法：

```tsx
const [product, ratings, comments] = await Promise.all([
  getProduct(),
  getRatings(),
  getComments(),
]);
```

如果希望一个请求失败不影响其他请求，可以用：

```tsx
const results = await Promise.allSettled([
  getProduct(),
  getRatings(),
  getComments(),
]);
```

还有一种隐性瀑布流：

```tsx
async function Product() {
  const product = await getProduct();

  return <Ratings />;
}

async function Ratings() {
  const ratings = await getRatings();

  return <div>{ratings.length}</div>;
}
```

因为 `Ratings` 嵌套在 `Product` 里，可能导致 `getRatings` 需要等 `getProduct` 完成后才开始。

如果它们独立，可以考虑把请求触发位置上移，或者用 Suspense 拆分并行渲染。

---

## 十五、数据修改优先使用 Server Actions

传统做法是提交表单时 fetch API Route：

```tsx
async function onSubmit() {
  await fetch("/api/products", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
```

在 App Router 中，很多数据修改可以用 Server Actions。

```ts
"use server";

export async function addProduct(formData: FormData) {
  const title = formData.get("title") as string;

  await prisma.product.create({
    data: { title },
  });
}
```

页面中：

```tsx
<form action={addProduct}>
  <input name="title" />
  <button type="submit">Add Product</button>
</form>
```

这比自己写 API Route 更直接。

Server Action 适合：

```text
创建数据
更新数据
删除数据
表单提交
调用数据库
调用服务端逻辑
```

而且表单 action 有 progressive enhancement，某些场景下即使没有 JavaScript 也可以工作。

---

## 十六、Mutation 后记得 revalidate

Server Action 修改数据库后，页面不一定立刻更新，因为 Next.js 有多层缓存。

例如添加产品后，数据库已经变了，但页面列表仍然显示旧数据。

解决方法是在 Server Action 中调用：

```ts
import { revalidatePath } from "next/cache";

("use server");

export async function addProduct(formData: FormData) {
  const title = formData.get("title") as string;

  await prisma.product.create({
    data: { title },
  });

  revalidatePath("/products");
}
```

注意不要随便：

```ts
revalidatePath("/");
```

这样可能会让整个应用的大量缓存失效。

应该尽量精确：

```text
哪个页面依赖这份数据，就 revalidate 哪个 path。
```

---

## 十七、Server Actions 也可以在 Client Component 中调用

Server Action 不只能用于 Server Component 的表单。

Client Component 中也可以调用：

```tsx
"use client";

import { useTransition } from "react";
import { addProduct } from "@/actions/product";

export function AddButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          addProduct("test product");
        });
      }}
    >
      Add
    </button>
  );
}
```

也就是说：

```text
Server Action 是运行在服务端的函数。
它可以被表单 action 调用，也可以被客户端交互触发。
```

不过一旦暴露为 Server Action，就要把它当成服务端接口对待。

---

## 十八、Server Actions 必须校验和鉴权

Server Action 看起来像普通函数，但它本质上会暴露一个 POST 调用入口。

所以不能信任传进来的参数。

错误写法：

```ts
"use server";

export async function addProduct(formData: FormData) {
  const title = formData.get("title") as string;

  await prisma.product.create({
    data: { title },
  });
}
```

更好的做法是：

```ts
"use server";

import { z } from "zod";

const AddProductSchema = z.object({
  title: z.string().min(1).max(100),
});

export async function addProduct(input: unknown) {
  const parsed = AddProductSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid input");
  }

  // 检查登录状态 / 权限
  // const user = await getCurrentUser();
  // if (!user) redirect('/login');

  await prisma.product.create({
    data: {
      title: parsed.data.title,
    },
  });
}
```

Server Action 中要做：

```text
参数校验
身份认证
权限判断
错误处理
缓存刷新
```

不要因为它写起来像普通函数，就忘记它是服务端入口。

---

## 十九、不要用 `use server` 保护普通工具函数

如果你有一个工具函数：

```ts
export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } });
}
```

不要为了“让它只在服务端运行”而加：

```ts
"use server";
```

因为这会把它变成 Server Action。

正确做法是：

```ts
import "server-only";

export async function getProduct(id: string) {
  return prisma.product.findUnique({ where: { id } });
}
```

并且可以把文件命名得更清楚：

```text
server-utils.ts
product.server.ts
data-access.ts
```

这样团队成员也更容易知道这些函数只能用于服务端。

---

## 二十、理解 params 和 searchParams

动态路由：

```text
/products/[id]
```

页面组件可以接收：

```tsx
export default function ProductPage({ params }: { params: { id: string } }) {
  return <div>{params.id}</div>;
}
```

如果 URL 是：

```text
/products/123
```

那么：

```text
params.id = "123"
```

Search Params 是问号后面的参数：

```text
/products/123?color=green&sort=price
```

页面组件可以接收：

```tsx
export default function ProductPage({
  searchParams,
}: {
  searchParams: { color?: string; sort?: string };
}) {
  return <div>{searchParams.color}</div>;
}
```

区别是：

```text
params 来自文件系统动态路由。
searchParams 来自 URL query string。
```

注意：普通 Server Component 不会自动拿到 `params` 和 `searchParams`，通常是 page 组件拿到后再传下去。

---

## 二十一、读取 searchParams 有两种方式

### 1. 在 Page 中读取 searchParams prop

```tsx
export default function Page({
  searchParams,
}: {
  searchParams: { color?: string };
}) {
  return <div>{searchParams.color}</div>;
}
```

这种方式发生在服务端。
当 URL query 变化时，Next.js 需要向服务端请求新的 RSC payload。

优点是可以在服务端根据参数请求数据。
缺点是会有一次网络往返。

### 2. 在 Client Component 中用 useSearchParams

```tsx
"use client";

import { useSearchParams } from "next/navigation";

export function ColorFilter() {
  const searchParams = useSearchParams();
  const color = searchParams.get("color");

  return <div>{color}</div>;
}
```

这种方式在客户端读取 URL，不需要每次都请求服务端。
适合纯 UI 状态、筛选按钮高亮、客户端交互等场景。

选择原则：

```text
参数影响服务端数据请求：用 page searchParams。
参数只影响客户端 UI：用 useSearchParams。
```

---

## 二十二、不要忘记 Loading 状态

本地开发时，一切都很快。
但线上真实环境中，Server Component 可能会等待数据请求、数据库查询、网络响应。

Next.js 提供了特殊文件：

```text
loading.tsx
```

例如：

```tsx
export default function Loading() {
  return <div>Loading...</div>;
}
```

如果它和 `page.tsx` 在同一层级，Next.js 会自动为这个 route segment 创建 Suspense 边界。
当页面等待数据时，会先显示 loading UI。

```text
page.tsx 正在等待数据
→ loading.tsx 先显示
→ 数据完成后页面内容 streaming 进来
```

这就是 Next.js 中 Suspense 和 Streaming 的基础体验。

---

## 二十三、Suspense 边界要尽量细

如果使用 `loading.tsx`，它通常会包住整个 page segment。

有时候这会导致整个页面都在 loading，即使只有某一个组件在等数据。

更好的方式是把等待数据的组件单独包起来：

```tsx
import { Suspense } from "react";

export default function ProductPage() {
  return (
    <>
      <h1>Product Page</h1>
      <FavoriteButton />
      <Suspense fallback={<div>Loading product...</div>}>
        <Product />
      </Suspense>
    </>
  );
}
```

这样用户可以先看到页面标题和按钮，只让真正慢的区域显示 loading。

原则是：

```text
哪里慢，Suspense 就包哪里。
不要让一个慢组件阻塞整页。
```

---

## 二十四、Suspense 要放在 await 的上层

这个写法无效：

```tsx
async function Product() {
  const product = await getProduct();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <div>{product.title}</div>
    </Suspense>
  );
}
```

因为 `await getProduct()` 已经发生在 Suspense 里面内容渲染之前。

正确写法：

```tsx
<Suspense fallback={<div>Loading...</div>}>
  <Product />
</Suspense>
```

也就是说：

```text
Suspense 必须包住会 suspend 的组件。
不能放在 await 之后。
```

---

## 二十五、需要重新触发 Suspense 时，记得 key

如果 Suspense 内部组件依赖 searchParams，比如：

```tsx
<Suspense fallback={<div>Loading...</div>}>
  <Product id={searchParams.id} />
</Suspense>
```

当 `id` 从 3 变成 4 时，可能不会重新显示 loading。

这时需要加 key：

```tsx
<Suspense key={searchParams.id} fallback={<div>Loading...</div>}>
  <Product id={searchParams.id} />
</Suspense>
```

React 看到 key 变化，会把它当成新的内容，从而重新触发 Suspense。

适合场景：

```text
searchParams 改变
动态 id 改变
tab 切换后需要重新 loading
筛选条件变化后需要重新触发异步内容
```

---

## 二十六、不要意外把页面变成动态渲染

Next.js 默认会尽可能静态渲染页面。
如果页面可以在 build 时生成 HTML，就会被静态预渲染，后续可以直接从 CDN 返回，非常快。

但某些 API 会让 route 变成动态渲染：

```text
cookies()
headers()
searchParams prop
依赖请求时信息的认证函数
```

例如：

```tsx
import { cookies } from "next/headers";

export default function Page() {
  const cookieStore = cookies();

  return <div>Product</div>;
}
```

这个页面无法在 build 时静态生成，因为 cookies 只有请求进来时才知道。

更隐蔽的是在全局 Header 中使用认证信息：

```tsx
export async function Header() {
  const user = await getCurrentUser();

  return <div>{user?.email}</div>;
}
```

如果 `Header` 放在 root layout 中，那么整个应用可能都变成动态渲染。

建议开发时经常运行：

```bash
npm run build
```

看 Next.js 输出，确认哪些 route 是 static，哪些是 dynamic。

---

## 二十七、Secret 不要硬编码在组件文件里

错误写法：

```tsx
const SECRET_API_KEY = "super-secret-key";

export async function Price() {
  const res = await fetch(`https://api.com?key=${SECRET_API_KEY}`);

  return <div>Price</div>;
}
```

短期看它在 Server Component 中似乎不会泄露。
但如果这个组件或文件被误 import 到 Client Component，secret 就可能进入客户端 bundle。

正确做法是放到环境变量：

```env
SECRET_API_KEY=super-secret-key
```

使用：

```ts
const key = process.env.SECRET_API_KEY;
```

Next.js 默认不会把普通环境变量发送到客户端。

如果你明确要暴露给客户端，必须加：

```env
NEXT_PUBLIC_API_URL=https://example.com
```

原则：

```text
普通 env 默认只在服务端。
NEXT_PUBLIC_ 开头才会进入客户端 bundle。
```

注意：即使用环境变量，如果你把它 render 到页面中，仍然会显示给用户。

---

## 二十八、区分 client utils 和 server utils

有些工具函数只能在服务端使用，比如：

```ts
export async function getData() {
  return fetch(`https://api.com?key=${process.env.SECRET_API_KEY}`);
}
```

如果它被 Client Component 调用，环境变量不会被带到客户端，可能导致逻辑错误。

应该加：

```ts
import "server-only";

export async function getData() {
  return fetch(`https://api.com?key=${process.env.SECRET_API_KEY}`);
}
```

并且文件命名可以更明确：

```text
server-utils.ts
product.server.ts
data-access.server.ts
```

对应地，客户端工具函数也可以放在：

```text
client-utils.ts
```

这样大型项目中更不容易误用。

---

## 二十九、redirect 不要放在 try/catch 里

Next.js 的 `redirect()` 本质上是通过 throw 一个特殊错误来中断执行。

错误写法：

```tsx
import { redirect } from "next/navigation";

export default async function Page() {
  try {
    const product = await getProduct();

    if (!product) {
      redirect("/create-product");
    }

    return <div>{product.title}</div>;
  } catch (error) {
    console.error(error);
  }
}
```

这里 `redirect()` 抛出的特殊错误会被 catch 捕获，导致跳转失效。

正确写法：

```tsx
import { redirect } from "next/navigation";

export default async function Page() {
  let product;

  try {
    product = await getProduct();
  } catch (error) {
    console.error(error);
  }

  if (!product) {
    redirect("/create-product");
  }

  return <div>{product.title}</div>;
}
```

同理，如果第三方认证库内部使用 redirect，也要注意不要把它包进会吞掉错误的 try/catch。

---

## 总结

Next.js App Router 的核心变化是：前端项目不再只有浏览器一侧，而是同时有服务端组件、客户端组件、服务端函数、缓存和渲染策略。

可以用几句话记住重点：

```text
Server Component 默认存在，适合数据获取、访问数据库、使用 secret。
Client Component 只在需要交互、hook、浏览器 API 时使用。
use client 尽量放在组件树叶子节点。
use server 是 Server Action，不是 Server Component。
Route Handler 不再是普通页面数据获取的默认选择。
Server Action 适合 mutation，但必须校验和鉴权。
fetch 可以自动去重和缓存，ORM 需要自己用 cache 或 unstable_cache。
Suspense 要放在 await 的上层，并且边界尽量细。
cookies、headers、searchParams prop 可能让页面动态渲染。
secret 放环境变量，服务端工具函数用 server-only 保护。
redirect 不要被 try/catch 吞掉。
```

真正理解 App Router，不是记住几个 API，而是理解这些边界：

```text
服务端和客户端的边界
静态渲染和动态渲染的边界
数据获取和数据修改的边界
缓存命中和缓存失效的边界
安全数据和可暴露数据的边界
```

只要这些边界清楚，Next.js 的 Server Components、Server Actions、Suspense、Streaming 和缓存机制就会变得好理解很多。
