# React 18 Suspense SSR：HTML Streaming 与 Selective Hydration 解决了什么问题？

在理解 React Server Components 之前，我们需要先理解 React 18 对传统 SSR 做了哪些改进。

传统 SSR，也就是 Server Side Rendering，解决了客户端白屏时间过长的问题。服务器会先生成 HTML，再把 HTML 返回给浏览器。用户可以更早看到页面内容，而不是等客户端 JavaScript 下载、执行完成之后才看到页面。

但是，传统 SSR 并不完美。

它有三个明显问题：

```text
1. 服务端必须等所有数据都获取完成，才能开始生成 HTML。
2. 客户端必须等所有 JavaScript 都加载完成，才能开始 hydration。
3. 页面必须整体 hydration 完成，用户才能真正交互。
```

这三个问题会形成一种 “All or Nothing” 的瀑布效应。

也就是说，整个页面的渲染、加载和交互都容易被最慢的部分拖住。哪怕只是页面中某一个区域数据慢、代码大，也可能影响整个页面的展示和可交互时间。

React 18 引入的 Suspense SSR 架构，就是为了解决传统 SSR 的这些性能问题。

它主要带来了两个核心能力：

```text
1. 服务端 HTML Streaming
2. 客户端 Selective Hydration
```

---

## 一、传统 SSR 的问题：必须等全部准备好

在传统 SSR 中，流程大致是这样的：

```text
服务端获取所有数据
→ 服务端生成完整 HTML
→ 浏览器接收 HTML
→ 浏览器下载完整 JavaScript
→ React 对整个页面进行 hydration
→ 页面变得可交互
```

这个流程最大的问题是：每一步都在等前一步。

如果页面中有一个很慢的组件，比如主内容区需要请求复杂数据，那么整个 HTML 输出都要等它。

如果页面中有一个很大的组件，比如图表、编辑器、评论区，那么客户端 hydration 也可能被它拖慢。

结果就是：

```text
慢数据会阻塞 HTML 返回。
大 JS 会阻塞 hydration。
某个组件没准备好，其他组件也可能不能交互。
```

这就是传统 SSR 的 “All or Nothing” 问题。

---

## 二、React 18 的改进：Suspense SSR

React 18 引入了新的 Suspense SSR 架构。

它允许我们用 `<Suspense>` 把页面中的某一部分包起来：

```tsx
<Suspense fallback={<Loading />}>
  <MainContent />
</Suspense>
```

这段代码的意思是：

**如果 `MainContent` 暂时还没准备好，不要阻塞整个页面，先显示 fallback，同时继续渲染和发送页面其他部分。**

这就带来了第一个重要能力：HTML Streaming。

---

## 三、什么是 HTML Streaming？

HTML Streaming 可以理解为：

**服务端不需要一次性生成完整 HTML，而是可以边生成、边发送。**

传统 SSR 是：

```text
等整个页面 HTML 都生成完
→ 一次性发送给浏览器
```

React 18 Suspense SSR 是：

```text
先发送已经准备好的 HTML
→ 慢的部分先显示 fallback
→ 等慢的部分准备好后，再把对应 HTML 继续发送过去
```

比如一个页面有 Header、Sidebar 和 MainContent。

其中 Header 和 Sidebar 很快，MainContent 要请求慢接口。

传统 SSR 中，服务器必须等 MainContent 数据也准备好，才能返回整个页面。

但使用 Suspense 后：

```tsx
<header>Header</header>

<aside>Sidebar</aside>

<Suspense fallback={<div>Loading main content...</div>}>
  <MainContent />
</Suspense>
```

React 可以先把 Header、Sidebar 和 Loading 状态发送给浏览器。

等 MainContent 的数据准备好之后，React 会继续通过同一个 HTML stream 把 MainContent 的 HTML 发送过去，并用一小段 JavaScript 把它放到正确的位置。

这意味着用户可以更早看到页面，而不是盯着空白屏幕等待所有数据完成。

---

## 四、HTML Streaming 解决了什么问题？

HTML Streaming 主要解决的是传统 SSR 的第一个问题：

```text
必须等所有数据获取完成，才能开始返回 HTML。
```

有了 Streaming 之后，变成：

```text
快的部分先返回。
慢的部分后补上。
```

这对真实项目非常重要。

因为一个页面里的不同区域通常速度不同：

```text
导航栏可能很快
用户信息可能稍慢
推荐列表可能更慢
评论区可能最慢
```

如果每个区域都要等最慢的那个区域一起返回，用户体验就会很差。

Suspense SSR 允许我们把慢的区域隔离出来，让页面其他部分先展示。

一句话总结：

**HTML Streaming 让页面不再因为某个慢组件而整体阻塞。**

---

## 五、但是只解决 HTML 还不够

虽然 HTML Streaming 可以让用户更早看到内容，但页面要真正可交互，还需要 hydration。

hydration 指的是：

**浏览器拿到服务端生成的 HTML 后，React 在客户端接管这些 HTML，并绑定事件、状态和交互逻辑。**

比如服务端返回了一个按钮：

```html
<button>Click me</button>
```

用户虽然能看到按钮，但它还不能真正响应 React 的点击事件。

只有等客户端 JavaScript 加载完成，并且 React 完成 hydration 后，这个按钮才是可交互的。

传统 SSR 的问题是：

```text
必须等所有 JavaScript 都加载完成，才能开始整体 hydration。
```

如果页面里某个组件的 JavaScript 很大，它就会拖慢整个页面的可交互时间。

---

## 六、代码分割：React.lazy 的作用

为了避免一个大组件阻塞所有 JavaScript 加载，我们可以使用代码分割。

例如：

```tsx
const MainContent = React.lazy(() => import("./MainContent"));
```

这样 MainContent 的代码会被拆成单独的 JS chunk。

浏览器可以先下载 React 核心代码和页面其他部分的代码，不必一开始就等 MainContent 这个大组件的代码。

当 `React.lazy` 和 `Suspense` 配合使用时，React 就知道：

```text
MainContent 这部分可以晚点加载。
页面其他部分可以先处理。
```

这为 Selective Hydration 提供了基础。

---

## 七、什么是 Selective Hydration？

Selective Hydration 可以理解为：

**React 不需要一次性 hydration 整个页面，而是可以优先 hydration 已经准备好的部分。**

传统 hydration 是：

```text
整个页面的 JS 都加载好
→ 整个页面一起 hydration
→ 页面整体变得可交互
```

Selective Hydration 是：

```text
哪个部分准备好了，就先 hydration 哪个部分。
哪个部分用户想交互，就优先 hydration 哪个部分。
```

比如页面中 Header 和 Sidebar 的代码已经加载好了，但 MainContent 的代码还在下载。

传统 SSR 可能会等 MainContent 也准备好后，再统一 hydration。

但 React 18 可以先 hydration Header 和 Sidebar。

这样用户可以先点击导航、打开菜单、使用顶部搜索，而不用等主内容区的大块 JavaScript 完全加载。

---

## 八、Selective Hydration 解决了什么问题？

Selective Hydration 主要解决传统 SSR 的第二和第三个问题：

```text
必须等所有 JavaScript 加载完成，才能开始 hydration。
必须等所有组件 hydration 完成，才能进行交互。
```

有了 Selective Hydration 之后，页面可以变成：

```text
部分 JavaScript 加载完成
→ 对应区域先 hydration
→ 对应区域先变得可交互
```

这意味着，一个很重的组件不会拖住整个页面。

比如：

```text
Header 已经可以点击
Sidebar 已经可以展开
搜索框已经可以输入
主内容区还在加载或等待 hydration
```

用户体验会明显更好。

---

## 九、React 还会根据用户交互调整 hydration 优先级

Selective Hydration 还有一个很聪明的点：

**React 会根据用户正在尝试交互的区域，动态调整 hydration 优先级。**

比如 React 原本准备先 hydration Sidebar。

但是这时候用户点击了 MainContent 里的某个按钮。

React 会意识到：用户现在想操作 MainContent。

于是它会优先 hydration 用户点击的这个区域，让它尽快响应用户操作。

这个过程发生在事件捕获阶段。

也就是说，当用户点击某个尚未 hydration 的区域时，React 会尽量先把这个区域 hydration 好，再处理对应交互。

这让页面不只是“按顺序 hydration”，而是能够根据用户行为调整优先级。

这也是 React 18 SSR 架构中非常重要的优化。

---

## 十、Suspense SSR 解决了传统 SSR 的三个问题

我们可以重新对照一下传统 SSR 的三个问题。

### 问题一：必须等所有数据都获取完成，才能开始渲染 HTML

React 18 通过 HTML Streaming 解决。

慢组件可以被 Suspense 包起来，先显示 fallback。页面其他部分可以先流式发送给浏览器。

---

### 问题二：必须等所有 JavaScript 都加载完成，才能开始 hydration

React 18 通过代码分割和 Suspense 配合解决。

某些大组件的代码可以拆出去，页面其他部分的代码可以先加载并 hydration。

---

### 问题三：必须整个页面 hydration 完成，用户才能交互

React 18 通过 Selective Hydration 解决。

React 可以优先 hydration 已经准备好的区域，也可以根据用户交互优先 hydration 用户正在点击的区域。

---

## 十一、Suspense SSR 的意义

React 18 Suspense SSR 的核心意义是：

**把传统 SSR 的整体阻塞模式，改成分块、流式、可优先级调度的模式。**

传统 SSR 更像这样：

```text
全部准备好
→ 全部发送
→ 全部加载
→ 全部 hydration
→ 全部可交互
```

React 18 Suspense SSR 更像这样：

```text
准备好一部分
→ 先发送一部分
→ 先 hydration 一部分
→ 先交互一部分
→ 慢的部分后续补上
```

这让 React 应用的加载体验更加细腻。

用户不需要等整个页面完全准备好，才能看到内容或开始操作。

---

## 十二、但是 Suspense SSR 仍然没有解决所有问题

虽然 React 18 Suspense SSR 已经比传统 SSR 好很多，但它仍然存在一些问题。

第一个问题是：用户最终还是要下载整个页面需要的 JavaScript。

即使我们把 JavaScript 拆成多个 chunk，分批加载，但如果页面上的组件最终都需要客户端运行，用户还是要下载大量 JS。

随着项目功能越来越多，客户端 bundle 仍然会越来越大。

这就引出一个问题：

```text
用户真的需要下载这么多 JavaScript 吗？
```

---

第二个问题是：所有 React 组件最终仍然需要在客户端 hydration。

有些组件其实只是静态内容，比如文章标题、产品介绍、页脚、说明文字。

这些组件没有点击事件，没有状态，也不需要浏览器交互。

但在传统 SSR 和 Suspense SSR 模式下，它们仍然可能会参与 hydration。

这会浪费客户端资源。

于是又有一个问题：

```text
所有组件都需要 hydration 吗？
```

---

第三个问题是：大量 JavaScript 工作仍然交给用户设备完成。

服务器通常比用户的手机、低端电脑更强。

但传统 React 应用中，很多组件逻辑、渲染逻辑和 hydration 工作最终还是要在用户设备上执行。

对于性能较弱的设备，这会明显影响页面响应速度。

于是还有一个问题：

```text
我们是不是应该让服务器承担更多工作？
```

---

## 十三、这些问题指向 React Server Components

Suspense SSR 解决的是传统 SSR 的性能瀑布问题。

它让 HTML 可以流式返回，让 hydration 可以选择性进行，让页面不同区域可以更早展示、更早交互。

但是它没有从根本上减少所有客户端 JavaScript。

因为页面中的 React 组件最终大多还是要发到浏览器，并在浏览器中 hydration。

这正是 React Server Components 想进一步解决的问题。

React Server Components 的思路是：

```text
不需要交互的组件，就只在服务端运行。
不需要发给浏览器的代码，就不要发给浏览器。
不需要 hydration 的组件，就不要 hydration。
```

这样可以进一步减少客户端 JavaScript，降低 hydration 成本，并让服务器承担更多适合服务端完成的工作。

所以可以这样理解它们之间的关系：

```text
传统 SSR：解决首屏 HTML 问题
Suspense SSR：解决 SSR 的阻塞和 hydration 瀑布问题
React Server Components：进一步减少客户端 JavaScript 和不必要 hydration
```

---

## 十四、总结

React 18 的 Suspense SSR 架构，是传统 SSR 的一次重要升级。

它通过 Suspense 带来了两个核心能力：

```text
1. HTML Streaming
2. Selective Hydration
```

HTML Streaming 让服务端可以边生成 HTML、边发送 HTML。慢组件不再阻塞整个页面返回。

Selective Hydration 让客户端可以优先 hydration 已经准备好的区域，也可以根据用户交互动态调整 hydration 优先级。

它解决了传统 SSR 的三个主要问题：

```text
不用等所有数据准备好才返回 HTML。
不用等所有 JavaScript 加载完才开始 hydration。
不用等整个页面 hydration 完成，用户才能交互。
```

但是 Suspense SSR 仍然没有完全解决客户端 JavaScript 过多的问题。

即使页面可以流式渲染、选择性 hydration，用户最终仍然可能下载大量 JS，很多静态组件仍然会被 hydration，用户设备仍然要承担大量客户端执行成本。

这些问题最终引出了 React Server Components。

一句话总结：

**Suspense SSR 让 SSR 从“整体阻塞”变成“分块流式渲染 + 选择性 hydration”，而 React Server Components 则进一步思考：哪些组件根本不需要发到客户端。**
