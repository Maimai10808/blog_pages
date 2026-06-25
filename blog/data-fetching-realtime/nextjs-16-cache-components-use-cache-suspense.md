# Next.js 16 Cache Components 入门：如何用 `use cache` 和 Suspense 优化页面性能

Next.js 16 引入了新的 **Cache Components** 机制，让我们可以更清晰地处理页面中的动态数据、缓存数据和流式渲染。

在过去，我们经常通过 `fetch` 的 `revalidate` 参数控制缓存时间，例如一天重新验证一次：

```tsx
await fetch(url, {
  next: {
    revalidate: 86400,
  },
});
```

而在 Next.js 16 中，我们可以使用新的 `cacheComponents`、`use cache` 和 `cacheLife` 来更明确地表达数据缓存策略。

本文将通过一个简单的页面示例，介绍 Next.js 16 Cache Components 的核心使用方式。

---

## 一、为什么需要 Cache Components？

假设我们有一个 Next.js 页面，页面中包含几个部分：

- Navbar；
- 页面主体内容；
- 分类列表；
- Footer；
- GitHub Stars 数量。

其中，分类列表来自 API 请求，并且这个接口模拟了 2 秒延迟。

如果没有做任何特殊处理，页面访问时会出现这样的情况：

用户打开页面后，需要等待分类接口请求完成，整个页面才会显示出来。

也就是说，虽然 Navbar、Footer 等内容并不依赖分类数据，但它们也被迫一起等待。

这显然不是理想体验。

因为用户真正需要等待的，只有分类列表那一小块内容。其他不依赖接口数据的 UI，应该可以先渲染出来。

---

## 二、开启 Cache Components

要使用 Next.js 16 的 Cache Components，首先需要在 `next.config.ts` 中开启配置：

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

开启之后，如果页面中有未缓存的数据请求，并且它没有放在 `Suspense` 边界内，Next.js 会给出类似警告：

```txt
Uncached data was accessed outside of <Suspense>
```

这个提示的意思是：

页面中存在运行时动态数据，但它没有被 Suspense 包裹。这样会导致整个页面等待这部分数据完成后才返回。

Next.js 希望我们把动态数据拆分出来，并用 `Suspense` 包裹，让页面可以先渲染静态部分，再等待动态部分完成。

---

## 三、处理动态数据：使用 Suspense

假设首页中原本直接请求分类数据：

```tsx
export default async function HomePage() {
  const categories = await getCategories();

  return (
    <main>
      <Hero />
      <Gallery categories={categories} />
      <Footer />
    </main>
  );
}
```

这里的问题是：`getCategories()` 有 2 秒延迟，所以整个页面都会被阻塞。

更好的做法是把分类部分拆成一个单独组件：

```tsx
async function Categories() {
  const categories = await getCategories();

  return <Gallery categories={categories} />;
}
```

然后在页面中使用 `Suspense` 包裹它：

```tsx
import { Suspense } from "react";

export default function HomePage() {
  return (
    <main>
      <Hero />

      <Suspense fallback={<GallerySkeleton />}>
        <Categories />
      </Suspense>

      <Footer />
    </main>
  );
}
```

这样做之后，页面表现会发生明显变化：

用户访问页面时，Navbar、Hero、Footer 等部分会立即显示出来。
只有分类列表区域会先展示骨架屏，等接口请求完成后再替换成真实内容。

这就是 Cache Components 结合 Suspense 的典型用法。

---

## 四、哪些数据适合用 Suspense？

`Suspense` 更适合处理 **运行时动态数据**。

比如：

- 每次访问都需要获取最新结果的数据；
- 更新频率很高的数据；
- 不能长时间缓存的数据；
- 用户每次请求都可能不同的数据；
- 需要在服务端运行时重新获取的数据。

例如商品库存、实时状态、搜索结果、动态分类、个性化内容等，都比较适合放在 Suspense 边界中。

核心思路是：

不要让一小块慢数据阻塞整个页面。
让页面先展示能展示的部分，再异步流式渲染慢数据区域。

---

## 五、处理不常变化的数据：使用 `use cache`

除了动态数据，页面中也常常存在一些“不需要每次都重新请求”的数据。

比如 GitHub Stars 数量。

这个数据虽然会变化，但不需要每个用户每次访问页面时都重新请求。
一天更新一次通常就足够了。

过去我们可能会这样写：

```tsx
async function StarsCount() {
  const res = await fetch("https://api.github.com/repos/xxx/xxx", {
    next: {
      revalidate: 86400,
    },
  });

  const data = await res.json();

  return <span>{data.stargazers_count} stars</span>;
}
```

在 Next.js 16 的 Cache Components 中，可以改成使用 `use cache`：

```tsx
async function StarsCount() {
  "use cache";

  const res = await fetch("https://api.github.com/repos/xxx/xxx");
  const data = await res.json();

  return <span>{data.stargazers_count} stars</span>;
}
```

加上 `"use cache"` 后，这个组件的结果会被缓存起来。

再次刷新页面时，Stars 数量可以直接作为预渲染内容出现，而不是每次都重新进入加载状态。

---

## 六、使用 `cacheLife` 设置缓存生命周期

如果只写 `"use cache"`，Next.js 会使用默认缓存生命周期。

如果我们希望更明确地控制缓存时间，可以使用 `cacheLife`。

例如，希望 GitHub Stars 缓存一天：

```tsx
import { cacheLife } from "next/cache";

async function StarsCount() {
  "use cache";

  cacheLife("days");

  const res = await fetch("https://api.github.com/repos/xxx/xxx");
  const data = await res.json();

  return <span>{data.stargazers_count} stars</span>;
}
```

`cacheLife` 可以使用不同级别的缓存时间，例如：

```tsx
cacheLife("seconds");
cacheLife("minutes");
cacheLife("hours");
cacheLife("days");
cacheLife("weeks");
cacheLife("max");
```

不同数据可以选择不同缓存策略。

例如：

- 秒级缓存：适合变化较快但仍可短暂缓存的数据；
- 分钟级缓存：适合一般列表、统计信息；
- 小时级缓存：适合不太频繁变化的接口；
- 天级缓存：适合 GitHub Stars、博客统计、公共配置等；
- 更长缓存：适合几乎不变化的内容。

---

## 七、`use cache` 可以写在哪里？

`use cache` 不只可以写在组件内部，也可以写在文件级别或函数级别。

### 1. 组件级缓存

```tsx
async function StarsCount() {
  "use cache";

  cacheLife("days");

  const stars = await getStars();

  return <span>{stars} stars</span>;
}
```

这种写法只缓存当前组件。

### 2. 文件级缓存

```tsx
"use cache";

export async function StarsCount() {
  const stars = await getStars();

  return <span>{stars} stars</span>;
}

export async function AnotherComponent() {
  const data = await getData();

  return <div>{data}</div>;
}
```

如果写在文件顶部，那么这个文件中的相关内容都会受到缓存影响。

### 3. 函数级缓存

```tsx
async function getExpensiveData() {
  "use cache";

  cacheLife("hours");

  return await doSomeHeavyWork();
}
```

这种方式适合缓存一些耗时计算或不常变化的数据处理结果。

所以，`use cache` 不只是用来缓存 UI 组件，也可以用来缓存某个具体的数据函数。

---

## 八、Suspense 和 `use cache` 的区别

很多人刚接触 Cache Components 时，会分不清什么时候用 Suspense，什么时候用 `use cache`。

可以这样理解：

### Suspense 适合动态数据

如果数据每次都应该重新获取，或者不能长期缓存，就用 Suspense。

它解决的问题是：

这部分数据慢，但不要阻塞整个页面。

### `use cache` 适合稳定数据

如果数据可以复用，不需要每次都重新请求，就用 `use cache`。

它解决的问题是：

这部分数据可以缓存，不要每次都重新计算或重新请求。

举个例子：

分类列表如果每次访问都要拿最新数据，可以放进 Suspense。
GitHub Stars 如果一天更新一次就够了，就可以用 `use cache` 和 `cacheLife("days")`。

---

## 九、最终页面效果

经过改造后，页面会变得更加流畅。

当用户刷新页面时：

- Navbar 立即显示；
- Footer 立即显示；
- GitHub Stars 作为缓存数据直接显示；
- 分类列表区域先显示 Skeleton；
- 分类接口请求完成后，再渲染真实分类内容。

这样用户不会面对一个空白页面等待 2 秒，而是能立即看到页面结构和大部分内容。

这就是 Next.js 16 Cache Components 想解决的问题：

让页面中不同类型的数据使用不同策略渲染。

---

## 十、推荐实践总结

在 Next.js 16 中使用 Cache Components，可以遵循下面几条原则。

### 1. 开启 `cacheComponents`

```ts
const nextConfig = {
  cacheComponents: true,
};
```

这是使用新缓存组件能力的前提。

### 2. 动态数据放进 Suspense

如果数据需要运行时获取，并且可能比较慢，就把它拆成独立组件，用 `Suspense` 包裹。

```tsx
<Suspense fallback={<Skeleton />}>
  <DynamicData />
</Suspense>
```

### 3. 稳定数据使用 `use cache`

如果数据不需要每次都重新请求，可以使用：

```tsx
"use cache";
```

### 4. 用 `cacheLife` 控制缓存时间

根据业务数据的变化频率，选择合适的缓存生命周期。

```tsx
cacheLife("hours");
cacheLife("days");
```

### 5. 不要让慢接口阻塞整个页面

页面中只有真正依赖慢数据的区域需要等待。
其他区域应该尽早渲染出来。

---

## 十一、结论

Next.js 16 的 Cache Components 让缓存策略变得更加清晰。

以前我们更多是在 `fetch` 层面配置 `revalidate`，而现在可以在组件或函数层面明确声明：

这块内容是否需要缓存，缓存多久，以及是否应该通过 Suspense 进行流式渲染。

简单来说：

**动态数据用 Suspense，稳定数据用 `use cache`。**

对于经常变化的数据，让它在 Suspense 中独立加载，不阻塞整个页面。
对于不常变化的数据，用 `use cache` 缓存起来，让它尽可能快地展示。

这套机制能够让 Next.js 页面既保持数据新鲜度，又拥有更好的首屏体验和用户感知速度。
