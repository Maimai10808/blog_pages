# Next.js Intercepting Routes 详解：如何实现“路由变了，但页面以弹窗打开”

在 Next.js App Router 中，有一个很强但讨论不算多的能力：**Intercepting Routes，拦截路由**。

它可以实现一种非常常见、但手写起来并不简单的交互：

用户在当前页面点击某个链接，URL 发生变化，但页面不是完整跳转，而是在当前页面上打开一个弹窗。
如果用户刷新这个 URL，或者把 URL 分享给别人，对方打开的又是一个完整独立页面。

比如：

- 图片列表中点击图片，当前页弹出图片预览 Modal；
- 商品列表中点击详情，当前页弹出详情卡片；
- 页面右上角点击登录，当前页弹出登录弹窗；
- 刷新 `/login` 时，又展示完整登录页。

这类效果如果完全自己处理，需要管理 URL、弹窗状态、返回行为、刷新行为等。
而 Next.js 的 Intercepting Routes 可以让这件事变得更自然。

---

## 一、什么是 Intercepting Routes？

Intercepting Routes 的核心思想是：

**当用户从一个页面跳转到另一个页面时，Next.js 可以拦截这次跳转，并渲染一个不同的内容。**

举个例子。

假设项目中有这些页面：

```txt id="c7x6uw"
app/
  page.tsx
  store/
    page.tsx
  about/
    page.tsx
  login/
    page.tsx
```

正常情况下：

- 访问 `/store`，显示商店页；
- 访问 `/about`，显示关于页；
- 访问 `/login`，显示登录页。

但我们可以定义一个拦截路由，让用户从 `/store` 点击进入 `/about` 时，不显示原本的 about 页面，而显示一个特殊版本的 about 页面。

注意，这种拦截只发生在“客户端路由跳转”过程中。

如果用户直接刷新 `/about`，或者直接在地址栏输入 `/about`，看到的仍然是正常的 about 页面。

---

## 二、最基础的拦截路由示例

假设我们想实现：

从 `/store` 跳转到 `/about` 时，显示一个被拦截后的 About 页面。

目录结构可以这样写：

```txt id="j6pcqx"
app/
  store/
    page.tsx
    (..)about/
      page.tsx
  about/
    page.tsx
```

这里最关键的是：

```txt id="zkcgw3"
(..)about
```

它表示：

从当前 `store` 路由开始，向上返回一级，然后拦截同级的 `about` 路由。

也就是从：

```txt id="h2qwby"
app/store
```

回到：

```txt id="hy1gh1"
app
```

再进入：

```txt id="8s26ci"
app/about
```

所以 `app/store/(..)about/page.tsx` 就是一个专门用于拦截 `/about` 的页面。

示例代码：

```tsx id="8rcnbz"
// app/store/(..)about/page.tsx

export default function InterceptedAboutPage() {
  return (
    <main>
      <h1 className="text-red-500">About Intercepted</h1>
      <p>This is the intercepted about page.</p>
    </main>
  );
}
```

而正常的 `/about` 页面仍然存在：

```tsx id="xgqmf0"
// app/about/page.tsx

export default function AboutPage() {
  return (
    <main>
      <h1>About Page</h1>
      <p>This is the normal about page.</p>
    </main>
  );
}
```

这样，当用户从 `/store` 点击跳转到 `/about` 时，看到的是 `InterceptedAboutPage`。

但如果用户刷新页面，或者直接访问 `/about`，看到的是正常的 `AboutPage`。

---

## 三、拦截路由的路径规则

Intercepting Routes 使用类似文件路径的语法。

常见写法有几种。

### 1. `(.)`：匹配同一级路由

```txt id="pgzce4"
(.)login
```

表示拦截当前层级下的 `login` 路由。

例如：

```txt id="cd6llq"
app/
  @modal/
    (.)login/
      page.tsx
  login/
    page.tsx
```

这里 `(.)login` 表示拦截同一级的 `/login`。

---

### 2. `(..)`：返回上一级

```txt id="9if0k7"
(..)about
```

表示先返回上一级，再匹配 `about`。

例如：

```txt id="7zzrj0"
app/
  store/
    (..)about/
      page.tsx
  about/
    page.tsx
```

从 `store` 返回上一级到 `app`，再拦截 `about`。

---

### 3. `(..)(..)`：返回两级

```txt id="65hwx1"
(..)(..)settings
```

表示返回两级后，再匹配 `settings` 路由。

适合更深层嵌套路由。

---

### 4. `(...)`：返回根目录

```txt id="s97srx"
(...)login
```

表示从当前层级直接回到根路由，再匹配 `login`。

这个写法适合不想逐级计算路径，而是明确从根开始匹配的场景。

---

## 四、Route Groups 不参与 URL 匹配

Next.js 的 Route Group 使用括号命名，例如：

```txt id="fkk1sy"
app/
  (marketing)/
    about/
      page.tsx
```

这里的 `(marketing)` 不会出现在 URL 中。

所以真实路径仍然是：

```txt id="65nq7m"
/about
```

因此在写拦截路由时，不需要把 Route Group 算进 URL 路径。

也就是说，Intercepting Routes 主要匹配的是 URL 结构，而不是完整文件夹结构。

---

## 五、为什么基础拦截路由不一定常用？

单独使用 Intercepting Routes，可以让某个页面在特定跳转来源下显示不同内容。

但实际项目中，我们通常不会频繁需要“从 A 页面进入 B 页面时，完全换一个 B 页面”。

更常见的需求是：

**从当前页面进入某个路由时，不离开当前页面，而是在当前页面上打开一个 Modal。**

比如：

用户在 `/store` 页面点击登录按钮，URL 变成 `/login`，但页面不直接跳到登录页，而是在 `/store` 上方弹出登录框。

如果用户刷新 `/login`，才显示完整登录页面。

这个才是 Intercepting Routes 最经典的真实使用场景。

---

## 六、高级场景：用拦截路由实现登录弹窗

目标效果如下：

用户在任意页面点击 Login：

```txt id="5oc7vc"
/store  → 点击 Login → URL 变成 /login，但展示登录弹窗
```

关闭弹窗后：

```txt id="8kop8r"
URL 回到 /store
```

刷新 `/login` 后：

```txt id="7zc4qp"
显示完整登录页
```

要实现这个效果，需要结合两个能力：

```txt id="x69enl"
Intercepting Routes + Parallel Routes
```

也就是：

- Intercepting Routes：拦截 `/login` 路由；
- Parallel Routes：把拦截出来的内容渲染到一个专门的 `modal` 插槽里。

---

## 七、创建 `@modal` Parallel Route

在 `app` 根目录下创建一个并行路由：

```txt id="of1v2g"
app/
  @modal/
```

`@modal` 不会影响 URL，它只是给 layout 提供一个额外的渲染插槽。

接着在里面创建拦截登录页的路由：

```txt id="lfm65i"
app/
  @modal/
    (.)login/
      page.tsx
```

这里的：

```txt id="n5rzvk"
(.)login
```

表示拦截当前层级下的 `/login`。

因为 `@modal` 和 `login` 都在 `app` 根层级，所以用 `(.)`。

---

## 八、创建被拦截后的登录 Modal

在：

```txt id="3lgw6m"
app/@modal/(.)login/page.tsx
```

中写登录弹窗：

```tsx id="0h58eo"
// app/@modal/(.)login/page.tsx

"use client";

import { useRouter } from "next/navigation";

export default function LoginModalPage() {
  const router = useRouter();

  function closeModal() {
    router.back();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <button onClick={closeModal} className="mb-4 text-sm text-gray-500">
          Close
        </button>

        <h1 className="mb-4 text-xl font-bold">Login</h1>

        <form className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded border px-3 py-2"
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded border px-3 py-2"
          />

          <button
            type="submit"
            className="w-full rounded bg-black px-4 py-2 text-white"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
```

这里关闭弹窗时使用：

```tsx id="n5wx1f"
router.back();
```

因为打开 Modal 时，URL 实际上已经从 `/store` 变成了 `/login`。
关闭时回退浏览器历史，就可以回到原来的 `/store`。

---

## 九、在 Root Layout 中渲染 modal 插槽

创建了 `@modal` 之后，需要在根布局中接收并渲染它。

```tsx id="aa4fmr"
// app/layout.tsx

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        {modal}
      </body>
    </html>
  );
}
```

这里的 `modal` 参数来自文件夹名：

```txt id="2gfdi6"
@modal
```

也就是说，Parallel Route 的名字会变成 layout 的一个 prop。

---

## 十、给 `@modal` 添加默认内容

还差一个重要文件：

```txt id="5gpm1p"
app/@modal/default.tsx
```

它表示当没有任何 Modal 需要渲染时，`@modal` 默认显示什么。

通常我们返回 `null`：

```tsx id="t9b08t"
// app/@modal/default.tsx

export default function DefaultModal() {
  return null;
}
```

这个文件很重要。

如果没有 `default.tsx`，在某些路由状态下，Next.js 不知道 `@modal` 应该渲染什么，可能会导致错误或不符合预期的渲染结果。

---

## 十一、正常登录页仍然存在

拦截路由并不意味着要删除原本的 `/login` 页面。

我们仍然需要保留：

```txt id="wdx3cu"
app/
  login/
    page.tsx
```

例如：

```tsx id="x6cuya"
// app/login/page.tsx

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-2xl font-bold">Login Page</h1>

      <form className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full rounded border px-3 py-2"
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full rounded border px-3 py-2"
        />

        <button
          type="submit"
          className="w-full rounded bg-black px-4 py-2 text-white"
        >
          Login
        </button>
      </form>
    </main>
  );
}
```

这样可以保证：

- 客户端从其他页面跳转到 `/login`：显示 Modal；
- 直接访问 `/login`：显示完整登录页；
- 刷新 `/login`：显示完整登录页；
- 分享 `/login` 链接：别人打开的是完整登录页。

---

## 十二、添加登录入口

在任意页面中添加跳转到 `/login` 的链接：

```tsx id="xiy6ag"
import Link from "next/link";

export function Navbar() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/store">Store</Link>
      <Link href="/about">About</Link>
      <Link href="/login">Login</Link>
    </nav>
  );
}
```

当用户从 `/store`、`/about` 或首页点击 Login 时，Next.js 会拦截这次跳转，并把 `app/@modal/(.)login/page.tsx` 渲染到 `modal` 插槽中。

页面背景仍然是原来的页面，前景出现登录弹窗。

---

## 十三、完整目录结构参考

最终结构大致如下：

```txt id="5yzx76"
app/
  layout.tsx
  page.tsx

  store/
    page.tsx

  about/
    page.tsx

  login/
    page.tsx

  @modal/
    default.tsx
    (.)login/
      page.tsx
```

对应关系如下：

```txt id="j618qh"
app/login/page.tsx
```

负责直接访问 `/login` 时的完整登录页。

```txt id="ru7dwa"
app/@modal/(.)login/page.tsx
```

负责从其他页面客户端跳转到 `/login` 时显示的登录弹窗。

```txt id="ohv1xg"
app/@modal/default.tsx
```

负责没有弹窗时什么都不显示。

```txt id="edknkp"
app/layout.tsx
```

负责同时渲染主页面和 modal 插槽。

---

## 十四、为什么刷新后会变成完整页面？

这是 Intercepting Routes 最关键的特性之一。

拦截只发生在客户端导航过程中。

也就是说：

```txt id="hz22zb"
从 /store 点击 /login
```

这是一次客户端路由跳转，所以可以被拦截，显示 Modal。

但如果你已经在 `/login`，然后刷新页面：

```txt id="cd5l1i"
刷新 /login
```

这不是从 `/store` 到 `/login` 的客户端跳转，而是浏览器直接请求 `/login`。

所以 Next.js 会渲染正常的：

```txt id="31tf3w"
app/login/page.tsx
```

这正是我们想要的行为。

因为这样既能保留弹窗体验，又不会破坏 URL 的可分享性。

---

## 十五、为什么关闭 Modal 用 `router.back()`？

当用户点击 Login 时，URL 已经变成：

```txt id="fx318j"
/login
```

只是内容被拦截后显示成了 Modal。

所以关闭 Modal 的正确行为不是简单地隐藏一个本地状态，而是让路由回到之前的页面。

```tsx id="xm0hxs"
router.back();
```

例如：

```txt id="59g5rr"
/store → /login
```

关闭时回退：

```txt id="m97k1o"
/login → /store
```

这样 URL、页面内容和用户预期是一致的。

---

## 十六、开发时常见问题：拦截路由不生效

在开发环境中，创建新的 Intercepting Route 后，有时你会发现它没有马上生效。

常见处理方式包括：

### 1. 重启开发服务器

```bash id="6g9jsa"
npm run dev
```

或：

```bash id="ll8l9n"
pnpm dev
```

### 2. 浏览器硬刷新

可以尝试清掉浏览器当前页面缓存。

### 3. 删除 `.next` 缓存目录

如果还是不生效，可以删除：

```txt id="b9rfpd"
.next
```

然后重新启动项目。

这种情况通常发生在刚创建新的拦截路由文件夹时。
一旦结构识别成功，后续修改页面内容一般不需要反复清缓存。

---

## 十七、适合使用 Intercepting Routes 的场景

Intercepting Routes 特别适合“既要弹窗体验，又要独立 URL”的场景。

例如：

### 1. 图片预览

列表页点击图片，弹出大图预览。

刷新后进入图片详情页。

```txt id="k13jej"
/photos → 点击某张图片 → /photos/123 以 Modal 打开
刷新 /photos/123 → 完整图片页
```

### 2. 登录弹窗

当前页面点击登录，弹出登录框。

刷新后进入完整登录页。

```txt id="wb9g2o"
/store → 点击 Login → /login 以 Modal 打开
刷新 /login → 完整登录页
```

### 3. 商品快速预览

商品列表中点击商品，弹出商品详情 Modal。

刷新后进入商品详情页。

```txt id="zzcefe"
/products → /products/1 以 Modal 打开
刷新 /products/1 → 商品详情页
```

### 4. 通知详情

通知列表中点击某条通知，弹出详情卡片。

刷新后进入完整通知详情页。

---

## 十八、不适合使用的场景

Intercepting Routes 并不是所有弹窗都需要用。

如果只是一个纯 UI 状态弹窗，例如：

- 确认删除；
- 简单提示；
- Dropdown；
- Tooltip；
- 本页内临时筛选面板；
- 不需要 URL 表达的弹窗。

这些场景直接用组件状态控制即可：

```tsx id="d0q4dc"
const [open, setOpen] = useState(false);
```

不需要引入 Intercepting Routes。

是否使用它，核心判断是：

**这个弹窗状态是否应该拥有独立 URL？**

如果答案是“是”，就很适合 Intercepting Routes。
如果答案是“否”，普通状态管理更简单。

---

## 十九、最佳实践总结

使用 Intercepting Routes 时，可以记住下面几条原则。

### 1. 拦截路由只影响客户端跳转

直接刷新或直接访问目标 URL，会渲染原始页面。

### 2. Modal 场景通常要搭配 Parallel Routes

只用 Intercepting Routes 可以替换页面，但要把内容叠加在当前页面上，通常需要 `@modal` 这种 Parallel Route。

### 3. 保留原始目标页面

不要只写 Modal，不写完整页面。
否则刷新、分享 URL 时体验会不完整。

### 4. 给 Parallel Route 写 `default.tsx`

没有弹窗时返回 `null`。

### 5. 关闭 Modal 时优先使用路由回退

因为打开弹窗本质上也是一次路由跳转。

```tsx id="e4hlo4"
router.back();
```

### 6. 新建拦截路由后如不生效，重启或清 `.next`

这是开发阶段很常见的问题。

---

## 二十、结论

Next.js 的 Intercepting Routes 可以让我们优雅地实现一种高级交互：

**URL 已经变了，但页面不完全跳走，而是在当前上下文中展示新内容。**

它最典型的使用方式是和 Parallel Routes 结合，实现“可分享 URL 的 Modal”。

用户从页面内部点击时，看到的是弹窗。
用户刷新或直接访问 URL 时，看到的是完整页面。

这让我们既能保留单页应用的流畅体验，又能保留 Web 应用最重要的能力：URL 可访问、可刷新、可分享。

一句话总结：

```txt id="nypxwx"
Intercepting Routes 负责拦截跳转；
Parallel Routes 负责把拦截内容渲染到指定插槽；
完整目标页面负责处理刷新和直接访问。
```

如果你的业务中有登录弹窗、图片预览、商品快速详情、列表详情弹窗等需求，Intercepting Routes 是 Next.js App Router 中非常值得掌握的一项能力。
