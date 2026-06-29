# Next.js 懒加载详解：用 `next/dynamic` 优化首屏加载性能

在前端应用中，浏览器一开始需要下载、解析和执行 JavaScript。一般来说，**发送到浏览器的 JavaScript 越少，页面初始加载速度就越快**。

这对用户体验非常重要。

如果一个网站首屏加载很慢，用户很可能在几秒内就关闭页面，转去其他网站。尤其是现在用户注意力越来越短，页面初始加载时间直接影响用户是否愿意继续使用你的应用。

因此，在 React 和 Next.js 项目中，合理减少首屏 JavaScript 体积是一件非常重要的事情。

其中一种常见优化策略就是：

```text
Lazy Loading
```ts

也就是懒加载。

本文主要讲 Next.js 中的懒加载，包括：

什么是懒加载；

为什么懒加载可以提升性能；

Next.js 中如何使用 `next/dynamic`；

如何按用户行为动态加载组件；

如何关闭服务端预渲染；

如何添加自定义 loading；

如何动态导入第三方库；

如何懒加载 named export。

---

## 一、什么是懒加载？

懒加载的核心思想是：

**暂时不加载当前不需要的代码，等真正需要的时候再加载。**

比如页面中有一个很复杂的图表组件，但用户刚进入页面时并不会马上看到它，而是点击按钮之后才会打开。

这时候就没必要在首屏阶段把图表组件相关代码全部发给浏览器。

可以等用户点击按钮时，再去加载这个组件。

这样做的好处是：

```text
减少首屏 JavaScript 体积；
加快页面初始加载速度；
降低浏览器解析和执行 JS 的压力；
让用户更快看到页面内容。
```

Next.js 官方对 lazy loading 的核心解释也是：通过减少渲染某个 route 初始所需的 JavaScript 数量，来改善应用的初始加载性能。

---

## 二、Next.js 中懒加载主要针对什么？

在 Next.js App Router 中，需要注意一个点：

**懒加载主要应用在 Client Components 上。**

Server Components 默认会自动 code split。服务端组件本身主要在服务端执行，不会像客户端组件那样完整发送到浏览器执行。

因此，当我们讨论 Next.js 中通过 `next/dynamic` 进行懒加载时，主要是在说：

```text
延迟加载 Client Component
延迟加载客户端依赖库
延迟加载某些交互功能
```tsx

比如：

弹窗组件；

图表组件；

富文本编辑器；

地图组件；

搜索库；

大型动画组件；

只有用户点击后才显示的 UI。

---

## 三、Next.js 中实现懒加载的两种方式

Next.js 中常见的懒加载方式有两类：

```text
next/dynamic
React.lazy + Suspense
```

不过在 Next.js 项目中，更常见、更推荐的方式是使用：

```tsx
import dynamic from "next/dynamic";
```tsx

`next/dynamic` 可以理解为 Next.js 对 React lazy loading 能力的封装。

它在 App Router 和 Pages Router 中都可以使用。

---

## 四、普通导入的问题

假设我们有一个很慢、很重的组件：

```tsx
// SlowComponent.tsx

export default function SlowComponent() {
  const result = expensiveCalculation();

  return <div>Result: {result}</div>;
}

function expensiveCalculation() {
  let total = 0;

  for (let i = 0; i < 100000000; i++) {
    total += i;
  }

  return total;
}
```

然后在页面中直接导入：

```tsx
import SlowComponent from "./SlowComponent";

export default function Page() {
  return (
    <main>
      <h1>Home Page</h1>
      <SlowComponent />
    </main>
  );
}
```text

这种写法的问题是：

```text
SlowComponent 会被打包进当前页面需要加载的 JavaScript 中。
```

即使这个组件很重，用户也必须在首屏阶段加载它。

如果组件内部还引入了大型第三方库，比如图表库、地图库、富文本编辑器库，那么首屏 JS 体积就会明显变大。

---

## 五、使用 `next/dynamic` 懒加载组件

可以把普通导入改成动态导入：

```tsx
import dynamic from "next/dynamic";

const SlowComponent = dynamic(() => import("./SlowComponent"));

export default function Page() {
  return (
    <main>
      <h1>Home Page</h1>
      <SlowComponent />
    </main>
  );
}
```ts

这里的核心是：

```tsx
const SlowComponent = dynamic(() => import("./SlowComponent"));
```

它表示：

```text
不要一开始就把 SlowComponent 打进主 bundle；
把它单独拆成一个 chunk；
需要渲染它的时候，再加载这个 chunk。
```text

在浏览器 DevTools 的 Network 面板中，你通常可以看到一个新的 JS chunk。

这个 chunk 里就包含被懒加载的组件代码。

这说明组件已经被成功拆分出来了。

---

## 六、懒加载不是默认全部都要用

看到这里，很多人可能会想：

既然懒加载可以减少首屏代码，那是不是所有组件都应该用 `dynamic`？

不是。

懒加载不是越多越好。

因为动态导入本身也有成本：

代码更复杂；

组件加载时可能出现等待；

过度拆分会增加网络请求数量；

开发和维护成本变高；

不一定真的带来性能收益。

所以更合理的做法是：

**不要默认所有组件都懒加载，而是针对具体性能问题使用懒加载。**

比较适合懒加载的组件通常有这些特点：

```text
组件很大；
组件不是首屏必需；
组件依赖大型第三方库；
组件只在用户交互后出现；
组件渲染成本明显较高。
```

例如：

弹窗；

图表；

地图；

代码编辑器；

富文本编辑器；

文件上传组件；

复杂数据表格。

这些组件很适合按需加载。

---

## 七、根据用户行为按需加载组件

懒加载最常见的场景之一是：

**用户点击按钮后，才加载某个组件。**

例如：

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const SlowComponent = dynamic(() => import("./SlowComponent"));

export default function Page() {
  const [show, setShow] = useState(false);

  return (
    <main>
      <h1>Home Page</h1>

      <button onClick={() => setShow((value) => !value)}>Show</button>

      {show && <SlowComponent />}
    </main>
  );
}
```ts

这里一开始 `show` 是 `false`，所以 `SlowComponent` 不会渲染，也不会立刻加载对应 chunk。

当用户点击按钮后：

```tsx
setShow((value) => !value);
```

`show` 变成 `true`，组件开始渲染。

这时候浏览器才会去请求 `SlowComponent` 对应的 JS chunk。

这就是典型的按需加载。

第一次点击时会加载 chunk，之后再次显示组件时，通常会从缓存中读取，不会重复下载同一个 chunk。

---

## 八、适合按需加载的用户行为

除了点击按钮，也可以基于其他用户行为触发懒加载。

例如：

用户 hover 某个区域；

用户滚动到某个位置；

用户打开弹窗；

用户开始输入搜索词；

用户进入某个 tab；

用户点击“高级设置”；

用户展开某个复杂面板。

这些都可以作为触发点。

核心原则是：

```text
用户没用到，就先不加载；
用户快要用到或已经用到时，再加载。
```tsx

---

## 九、添加自定义 loading 状态

动态组件加载需要时间。

如果组件比较大，或者网络比较慢，用户可能会看到短暂空白。

这时候可以给 `dynamic` 添加 loading 组件。

写法如下：

```tsx
import dynamic from "next/dynamic";

const SlowComponent = dynamic(() => import("./SlowComponent"), {
  loading: () => <h3>Loading slow component...</h3>,
});
```

完整例子：

```tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const SlowComponent = dynamic(() => import("./SlowComponent"), {
  loading: () => <h3>Loading slow component...</h3>,
});

export default function Page() {
  const [show, setShow] = useState(false);

  return (
    <main>
      <h1>Home Page</h1>

      <button onClick={() => setShow((value) => !value)}>Show</button>

      {show && <SlowComponent />}
    </main>
  );
}
```text

这样，当组件 chunk 还没加载完成时，页面会先显示：

```text
Loading slow component...
```

等组件加载完成后，再替换成真正的组件内容。

---

## 十、关闭服务端预渲染：`ssr: false`

默认情况下，通过 `next/dynamic` 导入的 Client Component 仍然可能参与服务端预渲染。

有时候你不希望某个组件在服务端渲染。

例如：

组件强依赖 `window`；

组件强依赖 `document`；

组件只能在浏览器环境运行；

第三方库不支持 SSR；

组件内容只应该在客户端生成。

这时可以设置：

```tsx
const SlowComponent = dynamic(() => import("./SlowComponent"), {
  ssr: false,
});
```ts

完整示例：

```tsx
import dynamic from "next/dynamic";

const ClientOnlyComponent = dynamic(() => import("./ClientOnlyComponent"), {
  ssr: false,
});
```

这表示：

```text
不要在服务端预渲染这个组件；
只在客户端加载和渲染它。
```text

这个配置在处理浏览器专属库时非常常见。

例如某些图表库、地图库、编辑器库，在服务端没有 `window` 对象时可能会报错。此时可以考虑 `ssr: false`。

不过也不要滥用它。

关闭 SSR 意味着这部分内容不能在服务端提前生成，可能会影响首屏内容和 SEO。

---

## 十一、懒加载 Server Component 时要注意什么？

Next.js 中有一个容易混淆的地方：

**Server Component 本身不会因为 `dynamic` 就像 Client Component 那样被懒加载。**

Server Components 默认已经会自动 code split，并且它们主要运行在服务端。

如果你对一个 Server Component 使用 `dynamic`，真正被懒加载的通常是它里面的 Client Components。

换句话说：

```text
懒加载 Server Component 本身不是重点；
重点是它内部引用的 Client Components 可以被拆分成独立 chunk。
```

有时你可能有一个 Server Component，里面包含多个比较重的 Client Components。

这种情况下，你可以通过懒加载这个 Server Component，让其中的 Client Components 被单独拆分出来。

但要记住：

```text
被发送到浏览器、影响客户端 bundle 的主要是 Client Component。
```tsx

---

## 十二、动态加载第三方库

懒加载不仅可以用于组件，也可以用于第三方库。

比如你有一个搜索框，需要用 `fuse.js` 做模糊搜索。

如果用户根本没有输入搜索内容，就没必要一开始加载 `fuse.js`。

可以在事件中动态导入：

```tsx
"use client";

import { useState } from "react";

const names = ["Alice", "Bob", "Charlie", "David"];

export default function SearchBox() {
  const [results, setResults] = useState<string[]>([]);

  async function handleChange(value: string) {
    if (!value) {
      setResults([]);
      return;
    }

    const Fuse = (await import("fuse.js")).default;

    const fuse = new Fuse(names);
    const searchResults = fuse.search(value).map((result) => result.item);

    setResults(searchResults);
  }

  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(event) => handleChange(event.target.value)}
      />

      <ul>
        {results.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```

这里的关键是：

```tsx
const Fuse = (await import("fuse.js")).default;
```text

它表示：

```text
只有当用户开始输入时，才加载 fuse.js。
```

这对于大型第三方库非常有用。

比如：

搜索库；

图表库；

地图库；

Markdown 编辑器；

PDF 预览库；

代码高亮库。

这些库如果不是首屏必须使用，就可以按需导入。

---

## 十三、默认导出组件的懒加载

如果组件是 default export，懒加载最简单。

组件文件：

```tsx
// SlowComponent.tsx

export default function SlowComponent() {
  return <div>Slow Component</div>;
}
```ts

页面中：

```tsx
import dynamic from "next/dynamic";

const SlowComponent = dynamic(() => import("./SlowComponent"));
```

这种写法最常见，也最直观。

---

## 十四、Named Export 如何懒加载？

如果组件不是 default export，而是 named export，例如：

```tsx
// SlowComponent.tsx

export function SlowComponent() {
  return <div>Slow Component</div>;
}
```ts

这时不能直接写：

```tsx
const SlowComponent = dynamic(() => import("./SlowComponent"));
```

因为 `dynamic` 默认期望拿到的是一个可以渲染的组件。

而 `import('./SlowComponent')` 返回的是整个模块对象：

```ts
{
  SlowComponent: function SlowComponent() {}
}
```ts

所以需要用 `.then()` 取出具体的 named export：

```tsx
import dynamic from "next/dynamic";

const SlowComponent = dynamic(() =>
  import("./SlowComponent").then((mod) => mod.SlowComponent),
);
```

如果 named export 叫 `Slow`：

```tsx
// SlowComponent.tsx

export function Slow() {
  return <div>Slow Component</div>;
}
```ts

那就要这样写：

```tsx
const Slow = dynamic(() => import("./SlowComponent").then((mod) => mod.Slow));
```

核心是：

```tsx
.then((mod) => mod.你的组件名)
```ts

---

## 十五、错误示例：直接懒加载 named export

错误写法：

```tsx
const SlowComponent = dynamic(() => import("./SlowComponent"));
```

但文件中只有：

```tsx
export function SlowComponent() {
  return <div>Slow Component</div>;
}
```text

这时可能会报类似错误：

```text
Element type is invalid.
Received a promise that resolves to object module.
Lazy element must resolve to a class or function.
```

原因是：

```text
dynamic 需要的是组件函数；
但 import 返回的是模块对象。
```ts

所以必须手动取出模块对象里的组件。

正确写法：

```tsx
const SlowComponent = dynamic(() =>
  import("./SlowComponent").then((mod) => mod.SlowComponent),
);
```

---

## 十六、如何判断是否真的懒加载成功？

可以通过浏览器 DevTools 检查。

步骤：

```text
1. 打开浏览器 DevTools
2. 进入 Network 面板
3. 刷新页面
4. 查看是否出现单独的 JS chunk
5. 触发懒加载行为，比如点击按钮
6. 观察是否在点击后才加载新的 chunk
```text

如果组件被正确拆分，你通常会看到一个单独的 chunk 文件。

当组件尚未渲染时，这个 chunk 不会加载。

当用户点击按钮、打开弹窗、触发搜索等行为发生时，浏览器才请求这个 chunk。

这说明懒加载生效了。

---

## 十七、懒加载适合解决什么问题？

懒加载适合解决的是：

```text
某个组件或库不是首屏必须；
它体积较大；
它影响了初始加载性能；
它只在特定用户行为后才需要。
```

例如：

一个富文本编辑器只在用户点击“编辑”后出现；

一个图表库只在用户打开数据分析面板时使用；

一个模糊搜索库只在用户输入搜索词时加载；

一个弹窗只在用户点击按钮时显示；

一个地图组件只在用户打开地址选择器时加载。

这些场景都很适合懒加载。

---

## 十八、懒加载不适合什么？

不建议对所有组件都使用懒加载。

以下场景通常不适合：

```text
首屏必须显示的核心内容；
非常小的组件；
频繁立即使用的组件；
SEO 重要内容；
拆分后反而增加请求复杂度的组件。
```ts

例如页面标题、导航栏、主要内容区，如果它们是首屏核心内容，就不应该为了“懒加载”而强行拆分。

否则用户可能反而看到更多 loading，体验变差。

---

## 十九、实践建议

实际项目中，可以按这个思路来判断：

### 1. 首屏必须内容不要懒加载

用户一打开页面就必须看到的内容，优先保证直接渲染。

### 2. 大型组件优先考虑懒加载

图表、地图、编辑器、复杂表格，这些可以优先检查是否适合拆分。

### 3. 用户交互后才出现的组件适合懒加载

比如弹窗、抽屉、设置面板、高级筛选。

### 4. 第三方重型库适合动态 import

例如 `fuse.js`、图表库、Markdown 编辑器、PDF 组件等。

### 5. 用 DevTools 验证，而不是凭感觉

懒加载有没有成功，要看 Network 里是否出现按需加载的 chunk。

---

## 二十、总结

Next.js 中的 lazy loading 主要用于减少页面初始加载所需的 JavaScript。

它可以帮助我们把不必要的组件或库延迟到真正需要时再加载，从而改善首屏性能。

Next.js 中常用的方式是：

```tsx
import dynamic from "next/dynamic";
```

默认导出组件可以这样加载：

```tsx
const Component = dynamic(() => import("./Component"));
```ts

named export 组件需要这样加载：

```tsx
const Component = dynamic(() =>
  import("./Component").then((mod) => mod.Component),
);
```

按用户行为加载组件：

```tsx
{
  show && <Component />;
}
```tsx

添加 loading：

```tsx
const Component = dynamic(() => import("./Component"), {
  loading: () => <p>Loading...</p>,
});
```

关闭 SSR：

```tsx
const Component = dynamic(() => import("./Component"), {
  ssr: false,
});
```ts

动态加载第三方库：

```tsx
const Fuse = (await import("fuse.js")).default;
```

一句话总结：

**Next.js 懒加载的核心不是“所有组件都动态导入”，而是把那些不影响首屏、体积较大、只有用户需要时才出现的组件和库，延迟到真正使用时再加载。**
