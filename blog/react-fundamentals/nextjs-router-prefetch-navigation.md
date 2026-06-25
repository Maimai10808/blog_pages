# Next.js 路由预加载详解：如何用 `router.prefetch` 提升页面跳转体验

在 Next.js 中，很多人都熟悉 `router.push`、`router.replace`，但很少真正使用过另一个很有价值的 API：

```tsx
router.prefetch();
```

它的作用是：**在用户真正进入某个页面之前，提前在后台预加载这个路由。**

这样当用户点击按钮、提交表单或触发跳转时，页面可以更快进入目标路由，减少等待时间，提升交互体验。

本文将结合 App Router，介绍 Next.js 中路由预加载的基本原理、使用方式，以及动态路由和 `loading.tsx` 场景下的表现。

---

## 一、什么是路由预加载？

路由预加载，简单来说，就是在用户访问某个页面之前，提前把这个页面需要的部分资源加载好。

Next.js 本身已经内置了很多预加载能力。

最常见的是 `<Link />` 组件。

当你使用：

```tsx
import Link from "next/link";

export default function Page() {
  return <Link href="/dashboard">Dashboard</Link>;
}
```

Next.js 会在合适的时机自动预加载这个路由。比如：

- 页面首次加载后；
- 链接进入用户视口时；
- 用户滚动到某个链接附近时。

这也是为什么 Next.js 中使用 `<Link />` 跳转通常会比普通 `<a>` 标签更快。

不过，`<Link />` 主要适合普通链接跳转。

如果你的跳转是通过按钮、表单提交、业务逻辑判断触发的，就不能完全依赖 `<Link />`。这时就可以使用：

```tsx
router.prefetch("/target-route");
```

---

## 二、`router.prefetch` 是什么？

在 Next.js App Router 中，可以通过 `next/navigation` 提供的 `useRouter` 获取路由对象。

常见 API 包括：

```tsx
router.push("/path");
router.replace("/path");
router.refresh();
router.prefetch("/path");
```

其中：

- `router.push()`：跳转页面，并把记录加入浏览器历史；
- `router.replace()`：跳转页面，但不新增历史记录；
- `router.refresh()`：刷新当前路由；
- `router.prefetch()`：提前预加载某个路由。

`router.prefetch` 的意义在于：

当你已经大概率知道用户接下来会进入某个页面时，可以提前加载目标路由，从而让后续跳转变得更快。

---

## 三、基础示例：点击按钮跳转到第二个页面

假设我们有一个 Next.js App Router 项目。

先创建一个 `/second` 页面：

```tsx
// app/second/page.tsx

export const dynamic = "force-dynamic";

export default async function SecondPage() {
  await new Promise((resolve) => setTimeout(resolve, 5000));

  return <div>Component loaded after 5 seconds</div>;
}
```

这里做了两件事。

第一，用 `setTimeout` 模拟了一个 5 秒的数据请求延迟。

第二，设置：

```tsx
export const dynamic = "force-dynamic";
```

这样可以强制这个页面作为动态页面处理，避免生产环境构建时被静态生成。否则 Next.js 可能在构建阶段就把页面生成好，运行时就看不到 5 秒延迟了。

---

## 四、不使用预加载时的跳转体验

首页中写一个按钮：

```tsx
"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  function handleClick() {
    router.push("/second");
  }

  return <button onClick={handleClick}>Take me to Second</button>;
}
```

当用户点击按钮时，页面才开始请求 `/second` 路由。

因为 `/second` 页面有 5 秒延迟，所以用户点击之后需要等待一段时间，才能看到目标页面内容。

也就是说，跳转动作发生后，目标页面才开始加载。

这就是普通跳转的体验。

---

## 五、使用 `router.prefetch` 提前加载页面

现在我们在首页加载时，提前预加载 `/second` 页面：

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.prefetch("/second");
  }, [router]);

  function handleClick() {
    router.push("/second");
  }

  return <button onClick={handleClick}>Take me to Second</button>;
}
```

这样做之后，当首页加载完成，Next.js 就会在后台开始预加载 `/second` 路由。

如果用户等一会儿再点击按钮，目标页面可能已经提前加载好了。
这时点击按钮后，页面跳转会非常快，甚至接近瞬间完成。

这就是 `router.prefetch` 的核心价值：

**把跳转后的等待，提前挪到用户真正跳转之前。**

---

## 六、注意：预加载主要在生产环境中测试

有一个很容易忽略的点：

**Next.js 的路由预加载行为主要应该在生产环境中测试。**

开发环境中，为了方便调试，很多优化行为不会完全按照生产环境执行。

所以测试预加载时，建议使用：

```bash
pnpm build
pnpm start
```

或者：

```bash
npm run build
npm run start
```

不要只依赖：

```bash
pnpm dev
```

否则你可能会误以为 `router.prefetch` 没有效果。

---

## 七、什么时候适合用 `router.prefetch`？

`router.prefetch` 不需要到处乱用。它更适合那些“用户很可能马上进入”的页面。

典型场景包括：

### 1. 表单提交后的结果页

比如用户填写表单后，大概率会跳转到 `/success` 或 `/dashboard`。

在用户填写表单时，就可以提前预加载结果页：

```tsx
useEffect(() => {
  router.prefetch("/success");
}, [router]);
```

这样表单提交完成后，跳转会更快。

### 2. 多步骤流程

例如注册流程：

```txt
/register/step-1
/register/step-2
/register/step-3
```

当用户进入第一步时，可以提前预加载第二步。

```tsx
router.prefetch("/register/step-2");
```

### 3. 弹窗确认后的跳转

例如用户点击“购买”按钮后，会进入订单确认页。

在用户打开购买弹窗时，就可以提前预加载确认页。

### 4. 鼠标悬停时预加载

也可以在用户 hover 某个按钮时再预加载：

```tsx
<button
  onMouseEnter={() => router.prefetch("/second")}
  onClick={() => router.push("/second")}
>
  Go to Second
</button>
```

这种方式比页面一加载就预加载更克制，适合不确定用户是否真的会跳转的场景。

---

## 八、动态路由中的预加载行为

Next.js 对静态路由和动态路由的预加载策略并不完全一样。

对于静态路由，Next.js 可以更完整地预加载页面内容。

对于动态路由，Next.js 通常会采取更保守的策略：
它可能只预加载共享布局，以及到第一个 `loading.tsx` 为止的部分内容。

这是一个很重要的设计。

因为动态页面往往依赖用户输入、请求参数、权限状态或实时数据。如果把整个动态页面都提前加载，可能会造成不必要的请求开销。

所以 Next.js 会尽量只提前准备那些稳定的、共享的部分。

---

## 九、结合 `loading.tsx` 理解部分预加载

假设 `/second` 路由下面有三个文件：

```txt
app/
  second/
    layout.tsx
    loading.tsx
    page.tsx
```

`layout.tsx` 模拟 5 秒延迟：

```tsx
// app/second/layout.tsx

export default async function SecondLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await new Promise((resolve) => setTimeout(resolve, 5000));

  return (
    <section>
      <div>Layout loaded</div>
      {children}
    </section>
  );
}
```

`loading.tsx` 用于显示加载状态：

```tsx
// app/second/loading.tsx

export default function Loading() {
  return <div>Loading...</div>;
}
```

`page.tsx` 模拟更慢的数据加载：

```tsx
// app/second/page.tsx

export const dynamic = "force-dynamic";

export default async function SecondPage() {
  await new Promise((resolve) => setTimeout(resolve, 10000));

  return <div>Page loaded after 10 seconds</div>;
}
```

在这种结构下，Next.js 可以提前预加载一部分路由内容，比如共享布局。

当用户真正点击进入 `/second` 时，已经预加载好的布局可以更快显示，剩下的页面内容则继续通过 `loading.tsx` 展示加载状态。

这可以让用户更早看到反馈，而不是一直面对空白页面。

---

## 十、`prefetch` 的几种策略理解

在 Next.js 的内部行为中，预加载会根据路由类型和配置采取不同策略。

可以大致理解为：

### 1. 自动模式

自动模式会根据路由是静态还是动态来决定预加载程度。

静态页面可以更完整地预加载。
动态页面通常只预加载共享布局和部分可提前加载的内容。

这是最常见、也最推荐的默认行为。

### 2. 完整预加载

完整预加载会尽可能加载整个目标路由。

这种方式适合目标页面比较稳定、数据开销不大，并且用户高度确定会进入的情况。

但如果目标页面依赖大量动态数据，就不一定适合完整预加载。

### 3. 临时预加载

临时预加载可以理解为短时间缓存预加载结果。

它更适合“用户可能马上跳转，但不一定真的跳转”的场景。

例如用户鼠标悬停在按钮上时进行预加载，就属于比较典型的短期预加载场景。

---

## 十一、为什么动态页面不一定要完整预加载？

动态页面往往有几个特点：

- 数据依赖用户输入；
- 数据依赖 URL 参数；
- 数据依赖登录状态；
- 数据变化较快；
- 请求成本较高；
- 页面内容可能因用户而异。

如果提前完整加载这些页面，可能会造成浪费。

例如用户在搜索框输入内容时，每个关键词对应的结果页都不同。
这时只预加载布局或加载状态，可能比完整预加载所有结果内容更合理。

因此，动态页面的最佳实践通常是：

**提前加载稳定部分，把真正动态的内容留到用户进入页面后再加载。**

这也是 `loading.tsx` 和部分预加载配合的价值。

---

## 十二、`router.prefetch` 和 `<Link />` 的区别

两者都能做路由预加载，但使用场景不同。

`<Link />` 适合普通导航：

```tsx
<Link href="/second">Go to Second</Link>
```

它会在链接进入视口时自动预加载，使用简单，适合菜单、列表、文章链接等场景。

`router.prefetch` 适合程序化跳转：

```tsx
router.prefetch("/second");
router.push("/second");
```

它适合按钮、表单、流程跳转、条件跳转等场景。

简单来说：

**能用 `<Link />` 的普通链接，优先用 `<Link />`。
需要代码控制跳转时，再用 `router.prefetch`。**

---

## 十三、推荐实践总结

在实际项目中，可以按下面几条原则使用路由预加载。

### 1. 普通链接优先使用 `<Link />`

Next.js 会自动处理预加载，不需要手动调用 `router.prefetch`。

### 2. 程序化跳转使用 `router.prefetch`

按钮点击、表单提交、业务流程跳转等场景，可以提前预加载目标路由。

### 3. 不要预加载所有页面

预加载不是越多越好。
过度预加载会增加网络请求和服务器压力。

只预加载用户高概率会访问的页面。

### 4. 动态页面不要盲目完整预加载

动态页面可能依赖用户输入或实时数据。
更推荐预加载共享布局，把真正动态的内容交给 `loading.tsx` 和运行时请求处理。

### 5. 在生产环境测试效果

预加载行为在开发环境中不一定明显。
测试时应该使用生产构建。

```bash
pnpm build
pnpm start
```

---

## 十四、结论

`router.prefetch` 是 Next.js 中一个不算显眼，但很实用的性能优化工具。

它不会改变业务逻辑，也不需要复杂架构，却可以在一些关键交互中提升用户体验。

它最适合这些场景：

- 用户即将进入下一步；
- 表单提交后会跳转；
- 按钮触发程序化导航；
- 某个目标页面访问概率很高；
- 目标页面有一定加载成本。

本质上，`router.prefetch` 做的是一件很简单的事：

**在用户真正需要某个页面之前，提前帮用户把它准备好。**

对于追求更顺滑交互体验的 Next.js 应用来说，这是一个值得掌握的小技巧。
