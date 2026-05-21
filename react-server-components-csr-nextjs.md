# React Server Components 是什么：讲清 CSR、Server Components 与 Next.js 客户端/服务端组件

在学习 React 的过程中，我们通常会先接触“组件”“状态”“事件”“Hooks”这些概念。随着项目变大，对性能和 SEO 的要求越来越高，一个绕不开的问题就出现了：

> React 组件到底是在浏览器渲染，还是在服务器渲染？

这篇文章围绕这个问题，系统梳理几个核心概念：

- 什么是客户端渲染，也就是 CSR。
- 传统 React CSR 的问题在哪里。
- 什么是 React Server Components。
- 为什么不能直接在原生 React 项目里随便使用 Server Components。
- Next.js 中默认的 Server Component 和 `"use client"` 到底是什么意思。
- 预渲染和 Hydration 分别解决什么问题。

如果你刚开始接触 Next.js，或者最近听到了 React 19、Server Components、App Router、Hydration 这些概念，但还没有完全理清，这篇文章可以帮你建立一个整体认识。

---

## 1. 传统 React 是如何渲染页面的

我们通常说 React 是一个用于构建用户界面的 JavaScript 库。更具体一点，在传统使用方式下，React 主要运行在浏览器端。

一个普通 React 应用的大致流程是：

1. 开发者编写 React 代码。
2. 使用 webpack、Vite 等构建工具打包项目。
3. 把打包后的 HTML、CSS、JavaScript 部署到服务器。
4. 用户访问网站时，服务器返回一个基础 HTML 文件。
5. 浏览器下载并执行 JavaScript bundle。
6. React 在浏览器中运行，挂载组件并渲染页面内容。

传统 React 应用最开始拿到的 HTML 往往非常简单：

```html
<!-- public/index.html -->
<div id="root"></div>
<script src="/bundle.js"></script>
```

也就是说，浏览器最开始拿到的 HTML 几乎是空的。真正的页面内容并不在初始 HTML 中，而是在 JavaScript 下载、解析、执行之后，由 React 在浏览器里动态生成。

这个过程就是客户端渲染，也就是 CSR。

---

## 2. 什么是客户端渲染 CSR

CSR 的全称是 Client Side Rendering。

它的本质是：

> 页面内容不是服务器直接返回好的，而是浏览器拿到基础 HTML 后，再通过 JavaScript 动态生成页面内容。

从开发体验看，CSR 非常灵活：

- 页面交互强。
- 前端路由切换流畅。
- 组件状态都在浏览器里管理。
- 可以构建复杂单页应用。

React 的流行，很大程度上也来自这种开发模式。

但 CSR 不是没有代价。随着项目复杂度增加，它的两个问题会越来越明显：SEO 和性能。

---

## 3. CSR 的问题一：初始 HTML 内容太少，不利于 SEO

CSR 最大的问题之一，是首屏 HTML 往往过于空洞。

对于用户来说，这可能导致页面在 JavaScript 加载完成前出现短暂空白。

对于搜索引擎来说，问题更明显。爬虫访问页面时，最先看到的是服务器返回的初始 HTML。如果这个 HTML 只有：

```html
<!-- public/index.html -->
<div id="root"></div>
<script src="/bundle.js"></script>
```

那么爬虫很难准确理解页面内容。

例如一个商品列表页，用户最终能看到：

- 商品标题。
- 商品列表。
- 商品价格。
- 商品描述。

但在初始 HTML 里，这些内容可能根本不存在。搜索引擎看到的只是一个空壳页面，这显然不利于 SEO 和自然流量获取。

---

## 4. CSR 的问题二：JavaScript Bundle 过大

另一个问题是性能。

随着 React 应用越来越复杂，客户端 bundle 往往会越来越大。用户访问页面时，不仅要下载 JavaScript，还要解析、执行，然后 React 才能把页面渲染出来。

这在桌面设备上有时不明显，但在移动端、弱网环境或低性能设备上会带来明显影响：

- 首屏显示慢。
- 页面可交互时间变晚。
- JavaScript 执行阻塞主线程。
- 用户感觉页面加载出来很慢。

所以传统 CSR 虽然开发方便，但在 SEO 和首屏性能方面存在天然短板。

---

## 5. React Server Components 是什么

为了解决这些问题，React 引入了一个重要能力：Server Components。

它的核心思想是：

> 不是所有 React 组件都必须在浏览器里执行。某些组件可以在服务器上运行，并把结果发送给浏览器。

Server Component 可以在服务器端完成：

- 获取数据。
- 执行组件逻辑。
- 预渲染内容。
- 生成可发送给浏览器的结果。

它和传统 CSR 的根本区别是：

- CSR：先给浏览器空 HTML，再靠 JavaScript 动态生成 UI。
- Server Components：服务器先准备内容，再把结果发给浏览器。

这意味着，部分组件逻辑不需要进入客户端 bundle，浏览器也不需要执行这些组件的所有代码。

---

## 6. Server Components 能解决什么问题

### 6.1 改善 SEO

因为页面内容可以在服务器上提前准备，搜索引擎爬虫访问页面时，拿到的就不再只是空壳。

对于内容页、商品页、文档页、博客页来说，这对 SEO 很重要。

### 6.2 减少客户端 JavaScript

如果一个组件完全在服务器端执行，那么它的很多逻辑代码不需要发送到浏览器。

这意味着：

- 客户端 JavaScript 更少。
- 下载体积更小。
- 浏览器解析和执行压力更低。
- 首屏和交互体验更好。

Server Components 的价值不只是“服务端渲染”四个字，而是从架构层面减少客户端负担。

---

## 7. React 有 Server Components，为什么还要 Next.js

这是很多初学者最容易混淆的点。

Server Components 是 React 的能力，但 React 本身不是一个完整的服务端运行框架。

传统意义上的 React 更像是一个专注于 UI 的库。它没有帮你完整搭好：

- 服务端路由。
- 服务端渲染环境。
- 数据获取约定。
- 构建和部署流程。
- Server Components 的运行和传输机制。

简单说：

> React 提供 Server Components 这种能力，但你还需要一个能让这些组件在服务器运行起来的框架。

Next.js 就是最典型的选择之一。

Next.js 构建在 React 之上，不只是一个前端路由工具，而是一个 React 全栈框架。它能：

- 在服务器运行 React 组件。
- 处理服务端渲染。
- 支持 App Router。
- 默认支持 Server Components。
- 管理服务端和客户端组件边界。

所以，当你真正想在项目中落地 React Server Components 时，最常见的方式就是使用 Next.js。

---

## 8. Next.js 中组件默认就是 Server Component

在 Next.js App Router 中，一个非常重要的默认规则是：

> app 目录下的组件默认都是 Server Components。

也就是说，如果你写一个普通组件，没有使用客户端专属能力，它默认会被当作服务端组件处理。

例如：

```tsx
// app/products/page.tsx
async function getProducts() {
  const response = await fetch('https://example.com/api/products');

  if (!response.ok) {
    throw new Error('Failed to fetch products');
  }

  return response.json();
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      <h1>Product List</h1>
      <ul>
        {products.map((product: { id: string; name: string }) => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </main>
  );
}
```

这个页面默认就是 Server Component。它可以在服务器上获取数据并渲染内容。

这种默认行为，是 Next.js App Router 和传统 React SPA 的重要区别。

---

## 9. 什么时候需要 Client Component

Server Components 很强，但不是所有组件都适合放在服务端。

如果一个组件需要这些能力，就必须是 Client Component：

- `useState`
- `useEffect`
- `useRef`
- 浏览器事件处理，例如 `onClick`
- 浏览器 API，例如 `window`、`document`、`localStorage`
- 依赖浏览器运行环境的第三方库

这些能力本质上需要在浏览器里执行，服务器无法替浏览器完成。

---

## 10. 怎么把组件变成 Client Component

方法非常简单：在文件顶部加上 `"use client"`。

```tsx
// app/components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <section>
      <p>count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
    </section>
  );
}
```

`"use client"` 是一条特殊指令。它告诉 Next.js：

> 这个文件以及它导入的客户端组件边界，需要在浏览器里运行。

如果没有 `"use client"`，上面的组件会报错，因为 `useState` 只能在 Client Component 中使用。

---

## 11. Server Component 和 Client Component 的区别

可以这样对比：

| 类型 | 运行位置 | 适合做什么 | 不能做什么 |
| --- | --- | --- | --- |
| Server Component | 服务器 | 数据获取、内容渲染、减少客户端 JS | 不能使用 `useState`、`useEffect`、浏览器事件和浏览器 API |
| Client Component | 浏览器 | 交互、状态、事件、浏览器 API | 不适合承载大量纯服务端数据逻辑 |

在 Next.js 中，通常不是“全是服务端组件”或“全是客户端组件”，而是两者结合。

典型结构是：

- 页面主体、列表展示、数据获取：Server Components。
- 按钮点击、表单状态、弹窗、交互控件：Client Components。

---

## 12. 一个典型的 Server + Client 组合

页面负责在服务器拿数据：

```tsx
// app/products/page.tsx
import { AddToCartButton } from './AddToCartButton';

async function getProducts() {
  return [
    { id: '1', name: 'iPhone' },
    { id: '2', name: 'MacBook' },
  ];
}

export default async function ProductsPage() {
  const products = await getProducts();

  return (
    <main>
      <h1>Product List</h1>

      {products.map((product) => (
        <article key={product.id}>
          <h2>{product.name}</h2>
          <AddToCartButton productId={product.id} />
        </article>
      ))}
    </main>
  );
}
```

按钮负责浏览器交互：

```tsx
// app/products/AddToCartButton.tsx
'use client';

import { useState } from 'react';

type AddToCartButtonProps = {
  productId: string;
};

export function AddToCartButton({ productId }: AddToCartButtonProps) {
  const [isAdded, setIsAdded] = useState(false);

  return (
    <button
      onClick={() => {
        setIsAdded(true);
        console.log('add to cart', productId);
      }}
    >
      {isAdded ? 'Added' : 'Add to cart'}
    </button>
  );
}
```

这样拆分后：

- 商品数据获取和页面内容输出在服务器完成。
- 点击按钮和本地状态在浏览器完成。
- 客户端只需要为真正交互的部分加载 JavaScript。

---

## 13. 为什么说 Next.js 是 Server Components 的最佳实践场景

Next.js 帮你做了很多底层工作：

- 建立服务端运行环境。
- 区分 Server Component 和 Client Component。
- 管理 App Router。
- 处理预渲染和数据获取。
- 处理服务端和客户端边界。
- 优化客户端 bundle。

使用 App Router 后，你可以更自然地思考：

- 哪些内容可以在服务器完成？
- 哪些交互必须留给浏览器？
- 哪些代码没有必要进入客户端 bundle？

这种“拆分渲染责任”的能力，就是 Server Components 带来的真正价值。

---

## 14. 一个简单的理解方式

如果这些概念有点绕，可以先记住一句话：

> 能在服务器提前准备好的内容，尽量交给 Server Component；必须依赖浏览器交互的部分，再交给 Client Component。

再压缩一点：

- 页面上的内容，更适合 Server Components。
- 页面上的交互，更适合 Client Components。

---

## 15. 什么是预渲染 Pre-rendering

预渲染，简单说就是：

> 在用户打开页面之前，先把页面 HTML 内容准备好。

关键点是：

> 用户一打开页面，浏览器拿到的 HTML 不是空壳，而是已经有页面结构和内容。

例如一个商品列表页，如果做了预渲染，服务器返回的 HTML 可能一开始就像这样：

```html
<!-- server-rendered-html.html -->
<h1>Product List</h1>
<ul>
  <li>iPhone</li>
  <li>MacBook</li>
  <li>AirPods</li>
</ul>
```

这样用户和搜索引擎一开始都能看到内容。

预渲染的本质不是“让页面能点击”，而是：

> 先把页面内容准备出来。

它主要解决：

- 首屏显示。
- SEO。
- 页面初始可见性。

---

## 16. 预渲染和 CSR 的区别

CSR 下，服务器最开始返回的 HTML 常常很空：

```html
<!-- public/index.html -->
<div id="root"></div>
<script src="/bundle.js"></script>
```

浏览器拿到后，需要：

1. 下载 JavaScript。
2. 执行 JavaScript。
3. React 运行。
4. 创建组件树。
5. 渲染页面内容。

也就是说：

> CSR 的内容是浏览器自己算出来的。

预渲染下，服务器会先把页面 HTML 准备好，再发给浏览器。标题、列表、文本、图片结构等内容，一开始就在 HTML 里。

也就是说：

> 预渲染的内容是服务器先生成好的。

一句话区分：

- CSR：先空壳，后靠 JavaScript 出内容。
- 预渲染：先有内容，再考虑交互。

---

## 17. 什么是 Hydration

Hydration 直译叫“水合”，但在 React 里可以理解为：

> 浏览器接管服务器提前渲染好的 HTML，并给它绑定 React 的事件和状态逻辑。

服务器已经把页面“画出来了”，但这时候页面还只是静态长相。

浏览器接下来下载 React 的 JavaScript，然后 React 会检查：

> 这份 HTML 是不是和组件渲染出来的一致？

如果一致，React 不会从零重画页面，而是直接：

- 绑定事件。
- 接上状态系统。
- 让组件变得可交互。

这个过程就是 Hydration。

所以：

> Hydration 不是重新生成 HTML，而是让已有 HTML 变成由 React 控制、可交互的页面。

---

## 18. 为什么需要 Hydration

服务器可以提前生成 HTML，但服务器不能替浏览器完成所有前端交互。

例如这些事情，最终还是要在浏览器里发生：

- 按钮点击。
- 输入框输入。
- 状态变化。
- 弹窗开关。
- 本地交互。
- 浏览器事件监听。

服务器只能先告诉浏览器“页面长什么样”。浏览器还要负责让页面“动起来”。

Hydration 的作用就是：

> 把已经显示出来的静态页面，升级成真正能交互的 React 页面。

---

## 19. 一个 Hydration 例子

假设有一个计数器组件：

```tsx
// app/components/Counter.tsx
'use client';

import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  );
}
```

如果服务器先预渲染，它可能输出：

```html
<!-- server-rendered-counter.html -->
<button>Count: 0</button>
```

用户打开页面时，已经能看见按钮。

但如果 JavaScript 还没加载完，这个按钮还不能真正响应 React 状态逻辑。

等浏览器下载并执行 React 代码后，React 会接管这个按钮：

- 绑定 `onClick`。
- 建立 `count` 状态。
- 让点击后变成 `Count: 1`。

这个接管过程就是 Hydration。

注意：

> Hydration 发生时，HTML 已经在页面上了。它不是生成 HTML，而是让 HTML 活起来。

---

## 20. 预渲染和 Hydration 的关系

可以把它们理解成两步。

第一步：预渲染。

- 服务器先生成 HTML。
- 浏览器拿到后立刻能显示内容。

第二步：Hydration。

- 浏览器下载 React 的 JavaScript。
- React 接管这份 HTML。
- 页面获得交互能力。

所以：

- 预渲染解决“先看到”。
- Hydration 解决“再能点”。

这两个动作经常一起出现，但它们不是同一件事。

---

## 21. 为什么页面已经出来了，但还不能点

这其实就是预渲染和 Hydration 之间的时间差。

一个页面可能已经把 HTML 发出来了，所以用户肉眼能看到内容。

但如果 JavaScript 还没下载完，或者 Hydration 还没完成，那么某些交互还没准备好。

于是就会出现：

- 页面已经显示。
- 按钮点击没反应。
- 表单交互有短暂延迟。

这说明：

> HTML 已经预渲染完成，但 Hydration 还没彻底结束。

---

## 22. Server Components 和 Hydration 的关系

这里是 Next.js 里最容易混的点。

不是所有服务端出来的内容都需要完整 Hydration。

传统 SSR + 客户端 React 中，如果页面是服务端先渲染 HTML，再由 React 在客户端接管，通常会有 Hydration 过程。

React Server Components 更进一步，它的目标之一是：

> 尽量减少需要发到客户端的 JavaScript。

有些组件纯粹在服务器运行，只负责产出内容，本身不会在浏览器里变成一个完整的可交互 React 组件。

这种情况下，Hydration 的重点主要落在真正的 Client Components 上。

可以这样理解：

- Server Component 更像纯内容输出。
- Client Component 更像需要在浏览器里活起来的部分。

所以在 Next.js 里：

- 纯 Server Component 不强调浏览器交互。
- 带 `"use client"` 的组件才直接参与客户端状态、事件和 Hydration。

---

## 23. 最容易混淆的几个概念

### 23.1 预渲染等于服务端渲染吗

不完全等于，但关系很近。

预渲染强调的是：

> HTML 在用户打开前就已经准备好。

这个 HTML 可能来自：

- 服务端实时渲染。
- 构建时静态生成。
- 某种服务器端预生成机制。

所以预渲染是一个更大的概念。

### 23.2 Hydration 等于重新渲染一次吗

不准确。

Hydration 不是从零重新生成 HTML，而是在已经存在的 HTML 上补上 React 的运行能力。

更像“接管”和“激活”，不是单纯“重画”。

### 23.3 CSR 有 Hydration 吗

通常我们谈严格意义上的 Hydration，更多是指：

> 页面已经有服务端或预生成 HTML，然后 React 在客户端接管。

纯 CSR 一开始几乎没有内容，所以更准确地说，它是客户端首次渲染，而不是对现有 HTML 的水合。

---

## 24. 工程化拆分建议

在 Next.js App Router 项目里，可以按这个原则拆组件。

适合 Server Component 的内容：

- 页面主体结构。
- 文章详情。
- 商品详情。
- 商品列表。
- 服务端数据获取。
- 不需要浏览器交互的展示组件。

适合 Client Component 的内容：

- 表单输入。
- 按钮点击。
- 弹窗开关。
- 本地状态。
- 浏览器 API。
- 第三方客户端 SDK。

常见页面结构：

```text
app/products/page.tsx              Server Component
  ├─ ProductList                   Server Component
  ├─ ProductCard                   Server Component
  └─ AddToCartButton               Client Component
```

这种结构能让大部分内容在服务器输出，只有真正需要交互的部分进入客户端 bundle。

---

## 25. 总结

React、Next.js、Server Components、预渲染和 Hydration 这些概念，初看容易混在一起。但只要抓住两个核心问题，就会清楚很多：

- 内容什么时候出来？
- 页面什么时候能交互？

传统 React 大多数场景采用 CSR。在 CSR 中，服务器最开始返回的 HTML 往往只是一个空壳，真正页面内容要等浏览器下载并执行 JavaScript 后，React 才能渲染出来。这种方式开发灵活，但初始 HTML 内容少，不利于 SEO；客户端 JavaScript 也容易越来越重，影响首屏和交互性能。

React Server Components 的核心价值是：让一部分组件可以直接在服务器执行，提前生成内容，再把结果发给浏览器。这样搜索引擎更容易抓取页面内容，客户端也不必承担所有组件逻辑的执行成本。

不过 React 本身不是完整服务端框架，所以实际项目里通常借助 Next.js 落地。在 Next.js App Router 中，组件默认是 Server Component；只有当组件需要 `useState`、`useEffect`、事件处理、浏览器 API 等客户端能力时，才需要通过 `"use client"` 显式声明为 Client Component。

同时，理解预渲染和 Hydration 也很重要：

- 预渲染负责先让页面看得见。
- Hydration 负责再让页面能交互。

整篇文章最核心的结论是：

> 现代 React / Next.js 的关键，不只是学会写组件，而是学会合理拆分：哪些内容应该在服务器提前完成，哪些交互必须留给浏览器处理。

可以用这组概念收尾：

- CSR：内容主要靠浏览器执行 JavaScript 后生成。
- 预渲染：服务器提前把页面内容准备好。
- Hydration：浏览器接管 HTML，让页面具备交互能力。
- Server Component：适合做服务端内容输出。
- Client Component：适合做浏览器交互和状态管理。

理解这些之后，再学习 Next.js App Router、数据获取、页面性能优化和组件拆分策略，就会顺畅很多。
