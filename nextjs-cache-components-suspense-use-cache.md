# Next.js 16 Cache Components 完整代码示例：讲清 Suspense、`use cache` 和 `cacheLife`

在 Next.js 16 中，一个很重要的新能力是 Cache Components。它让我们可以在同一个页面里，更细粒度地处理三类内容：

- 静态内容。
- 实时动态内容。
- 可缓存但不是完全静态的内容。

简单说就是：

> 该实时的实时，该缓存的缓存，该先显示的先显示。

这篇文章不做抽象说明，而是直接用一个完整小例子串起来。做完之后，你会理解：

- 为什么要开启 `cacheComponents: true`。
- 为什么动态数据要放进 `Suspense`。
- `"use cache"` 到底缓存了什么。
- `cacheLife` 怎么控制缓存时间。
- 一个页面里如何同时混合动态数据和缓存数据。

---

## 1. 要做一个什么页面

假设我们有一个首页，页面里有三部分：

- **固定内容**：标题、简介、页脚。
- **动态内容**：分类列表，接口故意延迟 2 秒。
- **缓存内容**：GitHub Stars，1 天更新一次就够。

最终希望页面达到的效果是：

- 页面外壳立刻显示。
- 分类列表单独 loading，不阻塞整页。
- GitHub Stars 尽量命中缓存，快速显示。

这正是 Cache Components 适合的场景：

> 在同一路由中混合静态、动态和缓存内容。

---

## 2. 初始化项目

先创建一个 Next.js 16 项目：

```bash
npx create-next-app@latest next16-cache-demo
cd next16-cache-demo
npm run dev
```

确保项目使用 App Router，也就是有 `app/` 目录。

---

## 3. 开启 Cache Components

在 `next.config.ts` 中开启 `cacheComponents`。

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

`cacheComponents` 是用来开启 Cache Components 的配置项。开启后，Next.js 会更明确地区分动态内容、缓存内容和静态内容。

---

## 4. 项目目录结构

这个示例保持最小但完整：

```text
app/
  page.tsx
  components/
    Categories.tsx
    CategoriesSkeleton.tsx
    StarsCount.tsx
lib/
  data.ts
next.config.ts
```

其中：

- `Categories.tsx`：模拟动态数据组件。
- `CategoriesSkeleton.tsx`：动态数据 loading 占位。
- `StarsCount.tsx`：可缓存数据组件。
- `lib/data.ts`：模拟数据源。

---

## 5. 准备数据源

为了方便演示，我们在 `lib/data.ts` 里模拟两个数据源：

- 分类数据：延迟 2 秒，模拟实时动态数据。
- GitHub Stars：延迟 800ms，模拟低频更新数据。

```ts
// lib/data.ts
export type Category = {
  id: number;
  name: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCategories(): Promise<Category[]> {
  await sleep(2000);

  return [
    { id: 1, name: 'Frontend' },
    { id: 2, name: 'Backend' },
    { id: 3, name: 'DevOps' },
    { id: 4, name: 'AI' },
    { id: 5, name: 'Mobile' },
  ];
}

export async function getGithubStars(): Promise<number> {
  await sleep(800);

  return 1123;
}
```

真实项目里，`getGithubStars()` 可能会请求 GitHub API，这里为了聚焦缓存机制，用固定数据模拟。

---

## 6. 实现动态数据组件

分类列表属于动态数据。它不使用缓存，而是放进 `Suspense` 边界里。

```tsx
// app/components/Categories.tsx
import { getCategories } from '@/lib/data';

export default async function Categories() {
  const categories = await getCategories();

  return (
    <section>
      <h2>Categories</h2>

      <ul
        style={{
          display: 'flex',
          gap: 12,
          paddingLeft: 0,
          listStyle: 'none',
        }}
      >
        {categories.map((category) => (
          <li
            key={category.id}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 8,
            }}
          >
            {category.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

这个组件会等待 `getCategories()` 完成。因为它有 2 秒延迟，如果直接让它阻塞整个页面，用户体验会很差。

所以它后面要放进 `Suspense`。

---

## 7. 给动态数据准备 Skeleton

当 `Categories` 还在等待接口时，我们希望页面其他部分先显示，分类区域展示一个 loading 占位。

```tsx
// app/components/CategoriesSkeleton.tsx
export default function CategoriesSkeleton() {
  return (
    <section>
      <h2>Categories</h2>

      <div style={{ display: 'flex', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            style={{
              width: 100,
              height: 40,
              background: '#eee',
              borderRadius: 8,
            }}
          />
        ))}
      </div>
    </section>
  );
}
```

这个组件不做数据请求，只负责 fallback UI。

---

## 8. 实现缓存数据组件

GitHub Stars 不需要每次请求都获取最新值。一天更新一次就够，所以它适合使用 `"use cache"`。

```tsx
// app/components/StarsCount.tsx
import { cacheLife } from 'next/cache';
import { getGithubStars } from '@/lib/data';

export default async function StarsCount() {
  'use cache';

  cacheLife('days');

  const stars = await getGithubStars();

  return <span>⭐ {stars}</span>;
}
```

这里有两个重点。

第一，`"use cache"` 表示这个组件的结果可以被缓存。

第二，`cacheLife('days')` 表示按“天”这个级别配置缓存生命周期。

`cacheLife` 需要和 `"use cache"` 一起使用，用来表达缓存的新鲜度和生命周期语义。

---

## 9. 在首页组合页面

现在回到页面入口。

首页会做三件事：

- 标题和说明文字直接静态显示。
- 用 `Suspense` 包住 `Categories`。
- 让 `StarsCount` 作为缓存组件渲染。

```tsx
// app/page.tsx
import { Suspense } from 'react';
import Categories from './components/Categories';
import CategoriesSkeleton from './components/CategoriesSkeleton';
import StarsCount from './components/StarsCount';

export default function Page() {
  return (
    <main
      style={{
        maxWidth: 800,
        margin: '40px auto',
        fontFamily: 'sans-serif',
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <h1>Next.js 16 Cache Components Demo</h1>
        <p>
          This page demonstrates dynamic data with Suspense and cached data with
          use cache + cacheLife.
        </p>
      </header>

      <nav
        style={{
          marginBottom: 24,
          padding: '12px 16px',
          border: '1px solid #ddd',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>My Navbar</span>
        <StarsCount />
      </nav>

      <section style={{ marginBottom: 32 }}>
        <h2>Hero Section</h2>
        <p>This part is static and can render immediately.</p>
      </section>

      <Suspense fallback={<CategoriesSkeleton />}>
        <Categories />
      </Suspense>

      <footer
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: '1px solid #ddd',
        }}
      >
        Footer content
      </footer>
    </main>
  );
}
```

这个页面里，三类内容有各自的处理方式：

- 静态外壳直接显示。
- 动态分类用 `Suspense` 单独等待。
- 低频 Stars 使用 `"use cache"` 和 `cacheLife`。

---

## 10. 运行后会看到什么

启动项目：

```bash
npm run dev
```

刷新页面时，你会看到：

- Navbar 立刻显示。
- Hero Section 立刻显示。
- Footer 立刻显示。
- Categories 先显示 skeleton，大约 2 秒后显示真实内容。
- StarsCount 作为缓存数据出现，后续刷新不需要每次都等待完整请求。

这就是 Cache Components 的核心价值：

> 整页不再因为一块动态数据而整体阻塞。

---

## 11. 为什么动态数据要放进 Suspense

开启 Cache Components 后，如果访问的是未缓存的动态数据，Next.js 希望你明确把这块内容放到 `Suspense` 下。

原因是：

> 未缓存数据如果在 `Suspense` 外访问，会让整条路由被阻塞。

`Suspense` 在这里不是可选的视觉优化，而是在告诉框架：

> 这块内容是动态的，可以单独等待，不要拖住整个页面。

可以记住这条规则：

- 动态数据：放进 `Suspense`。
- 可缓存数据：使用 `"use cache"`。

---

## 12. 为什么 StarsCount 不一定需要 Suspense

严格来说，`StarsCount` 也可以包在 `Suspense` 里。

但在这个示例中，它用了 `"use cache"`，缓存生命周期比较长，大部分时候能命中缓存并快速渲染。

它和分类列表的差异在于：

- 分类列表是运行时动态数据，每次都要等。
- Stars 是低频变化数据，可以缓存。

所以它们适合不同处理方式。

---

## 13. `use cache` 可以放在哪里

`"use cache"` 不只能放在组件里，也可以放在函数里，甚至放在文件顶部。

### 13.1 缓存函数

可以把缓存逻辑放到函数里。

```ts
// lib/stars.ts
import { cacheLife } from 'next/cache';
import { getGithubStars } from '@/lib/data';

export async function getCachedStars() {
  'use cache';

  cacheLife('days');

  return getGithubStars();
}
```

然后组件中调用：

```tsx
// app/components/StarsCount.tsx
import { getCachedStars } from '@/lib/stars';

export default async function StarsCount() {
  const stars = await getCachedStars();

  return <span>⭐ {stars}</span>;
}
```

这种方式更适合把缓存策略放在数据层，而不是组件里。

### 13.2 放在文件顶部

也可以放在文件顶部。

```tsx
// app/components/StarsCount.tsx
'use cache';

import { cacheLife } from 'next/cache';
import { getGithubStars } from '@/lib/data';

cacheLife('days');

export default async function StarsCount() {
  const stars = await getGithubStars();

  return <span>⭐ {stars}</span>;
}
```

这种写法表示这个文件里的导出内容使用缓存语义处理。

实际项目中更推荐按边界选择：

- 缓存某个数据获取函数：放在函数里。
- 缓存某个组件输出：放在组件里。
- 整个文件导出都统一缓存：放在文件顶部。

---

## 14. 和旧的 `fetch + revalidate` 有什么区别

过去在 Next.js 里，很多人会这样写：

```ts
// lib/fetch-stars.ts
export async function getStars() {
  const response = await fetch('https://api.example.com/stars', {
    next: {
      revalidate: 86400,
    },
  });

  return response.json();
}
```

这仍然是一种可用方式。

但 Cache Components 提供了另一种更组件化、更语义化的表达：

- `Suspense` 管动态块。
- `"use cache"` 管缓存块。
- `cacheLife` 管缓存生命周期。

新的思路更偏向：

> 按组件或函数语义组织缓存，而不只是按 fetch 配置组织缓存。

这让页面中不同区域可以拥有更清晰的渲染和缓存策略。

---

## 15. 完整代码汇总

下面把所有文件集中放一次，方便复制。

### 15.1 next.config.ts

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

### 15.2 lib/data.ts

```ts
// lib/data.ts
export type Category = {
  id: number;
  name: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCategories(): Promise<Category[]> {
  await sleep(2000);

  return [
    { id: 1, name: 'Frontend' },
    { id: 2, name: 'Backend' },
    { id: 3, name: 'DevOps' },
    { id: 4, name: 'AI' },
    { id: 5, name: 'Mobile' },
  ];
}

export async function getGithubStars(): Promise<number> {
  await sleep(800);
  return 1123;
}
```

### 15.3 app/components/Categories.tsx

```tsx
// app/components/Categories.tsx
import { getCategories } from '@/lib/data';

export default async function Categories() {
  const categories = await getCategories();

  return (
    <section>
      <h2>Categories</h2>

      <ul
        style={{
          display: 'flex',
          gap: 12,
          paddingLeft: 0,
          listStyle: 'none',
        }}
      >
        {categories.map((category) => (
          <li
            key={category.id}
            style={{
              padding: '8px 12px',
              border: '1px solid #ddd',
              borderRadius: 8,
            }}
          >
            {category.name}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

### 15.4 app/components/CategoriesSkeleton.tsx

```tsx
// app/components/CategoriesSkeleton.tsx
export default function CategoriesSkeleton() {
  return (
    <section>
      <h2>Categories</h2>

      <div style={{ display: 'flex', gap: 12 }}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            style={{
              width: 100,
              height: 40,
              background: '#eee',
              borderRadius: 8,
            }}
          />
        ))}
      </div>
    </section>
  );
}
```

### 15.5 app/components/StarsCount.tsx

```tsx
// app/components/StarsCount.tsx
import { cacheLife } from 'next/cache';
import { getGithubStars } from '@/lib/data';

export default async function StarsCount() {
  'use cache';

  cacheLife('days');

  const stars = await getGithubStars();

  return <span>⭐ {stars}</span>;
}
```

### 15.6 app/page.tsx

```tsx
// app/page.tsx
import { Suspense } from 'react';
import Categories from './components/Categories';
import CategoriesSkeleton from './components/CategoriesSkeleton';
import StarsCount from './components/StarsCount';

export default function Page() {
  return (
    <main
      style={{
        maxWidth: 800,
        margin: '40px auto',
        fontFamily: 'sans-serif',
      }}
    >
      <header style={{ marginBottom: 32 }}>
        <h1>Next.js 16 Cache Components Demo</h1>
        <p>
          This page demonstrates dynamic data with Suspense and cached data with
          use cache + cacheLife.
        </p>
      </header>

      <nav
        style={{
          marginBottom: 24,
          padding: '12px 16px',
          border: '1px solid #ddd',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>My Navbar</span>
        <StarsCount />
      </nav>

      <section style={{ marginBottom: 32 }}>
        <h2>Hero Section</h2>
        <p>This part is static and can render immediately.</p>
      </section>

      <Suspense fallback={<CategoriesSkeleton />}>
        <Categories />
      </Suspense>

      <footer
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: '1px solid #ddd',
        }}
      >
        Footer content
      </footer>
    </main>
  );
}
```

---

## 16. 总结

这个例子里，其实只做了一件事：

> 把不同性质的数据，交给不同机制处理。

具体来说：

- 分类列表是实时动态数据，所以用 `Suspense`。
- GitHub Stars 是低频变化数据，所以用 `"use cache"` 和 `cacheLife`。
- 页面外壳和静态内容直接先渲染。

这正是 Next.js Cache Components 的核心思想：

> 不要用一种方式处理整页内容，而要让页面里的不同部分，使用最合适的渲染和缓存策略。

在真实项目里，可以按这个思路拆页面：

- 首屏框架、标题、静态说明：直接渲染。
- 用户相关、实时变化、慢接口：放进 `Suspense`。
- 低频变化、可复用、可延迟更新的数据：使用 `"use cache"`。
- 缓存时长和新鲜度：交给 `cacheLife` 表达。

这样页面不会因为某一块动态数据拖慢整条路由，也不会让所有数据都无脑实时请求。渲染边界和缓存边界清楚后，Next.js 页面会更容易维护，也更容易优化。
