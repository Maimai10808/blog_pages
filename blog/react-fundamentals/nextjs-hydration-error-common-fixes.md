# Next.js Hydration Error 详解：为什么会出现，以及 3 种常见修复方式

在 Next.js 项目中，很多人都会遇到一个很典型的报错：

```text
Hydration failed because the server rendered HTML did not match the client.
```

这个错误看起来很复杂，但它的本质其实只有一句话：

```text
服务端生成的 HTML 和客户端第一次渲染出来的 HTML 不一致。
```

只要理解这一点，Hydration Error 就没有那么难了。

本文会从 Hydration Error 的出现原因讲起，再结合 `window`、`Math.random()`、`Date.now()`、浏览器插件等典型场景，最后总结 3 种常见修复方式。

---

## 一、什么是 Hydration

在 Next.js 中，页面通常会先在服务端生成 HTML。

浏览器收到 HTML 后，会先把页面展示出来。
然后客户端 JavaScript 加载并执行，React 会接管这些静态 HTML，让页面变得可交互。

这个过程就叫：

```text
Hydration
```

可以简单理解为：

```text
服务端先生成静态 HTML
→ 浏览器先展示 HTML
→ 客户端 JS 加载
→ React 重新运行组件逻辑
→ 给 HTML 绑定事件和状态
→ 页面变成可交互状态
```

所以，Hydration 的核心要求是：

```text
服务端第一次渲染出来的内容
必须和客户端第一次渲染出来的内容一致。
```

如果不一致，就会出现 Hydration Error。

---

## 二、为什么会出现 Hydration Error

Hydration Error 的根本原因是：

```text
Server HTML !== Client HTML
```

也就是说，服务端生成的 HTML 和客户端 React 第一次渲染的结果不一样。

例如：

```tsx
"use client";

export default function Comments() {
  if (typeof window === "undefined") {
    return <div>500 comments server</div>;
  }

  return <div>500 comments client</div>;
}
```

这段代码在服务端运行时：

```text
typeof window === 'undefined'
```

结果为 `true`，所以服务端生成：

```html
<div>500 comments server</div>
```

但是在浏览器里，`window` 是存在的，所以客户端第一次渲染会生成：

```html
<div>500 comments client</div>
```

这就产生了 mismatch。

React 会发现：

```text
服务端给我的 HTML 是 server
客户端第一次渲染出来的是 client
这两个不一致
```

于是就会报 Hydration Error。

---

## 三、Hydration Error 为什么开发环境更明显

在开发环境中，Next.js 会直接把 Hydration Error 显示出来，方便开发者发现问题。

但是在生产环境中，用户通常不会看到一个完整的错误弹窗。
页面可能仍然可以继续使用。

这并不代表问题不存在。

生产环境里虽然不会像开发环境一样明显报错，但用户可能会看到页面内容突然变化。

例如服务端先渲染：

```text
500 comments server
```

客户端 hydration 后变成：

```text
500 comments client
```

用户看到的就是：

```text
页面先显示一个内容
随后突然变成另一个内容
```

这会造成很差的体验，甚至引起布局跳动，也就是 CLS 问题。

所以不要因为生产环境没有明显报错，就忽略 Hydration Error。

它的本质是：

```text
用户看到的首屏内容不稳定。
```

---

## 四、浏览器插件也可能导致 Hydration Error

有些 Hydration Error 并不是你的代码导致的，而是浏览器插件修改了 DOM。

例如某些翻译插件、广告拦截插件、密码管理插件、样式增强插件，可能会在 React hydration 之前修改页面结构。

这时服务端 HTML 是一份结构，浏览器插件修改后变成另一份结构，React 再 hydration 时就发现不一致。

表现是：

```text
所有页面都报 Hydration Error
但换成无痕模式或者关闭插件后就正常
```

这种情况可以这样排查：

```text
用无痕模式打开页面
关闭会修改页面 DOM 的插件
换一个干净浏览器测试
运行 production build 再验证
```

如果只在某个装了插件的浏览器开发环境出现，而干净环境没有出现，问题很可能来自插件。

---

## 五、常见导致 Hydration Error 的代码

### 1. 在 JSX 中直接使用 `typeof window`

错误示例：

```tsx
"use client";

export default function Component() {
  return <div>{typeof window === "undefined" ? "server" : "client"}</div>;
}
```

服务端渲染 `server`，客户端渲染 `client`，必然不一致。

---

### 2. 直接渲染 `Math.random()`

错误示例：

```tsx
"use client";

export default function RandomNumber() {
  return <div>{Math.random()}</div>;
}
```

服务端执行一次 `Math.random()`，客户端 hydration 时又执行一次。

两次随机数不可能完全一样，所以会报 Hydration Error。

---

### 3. 直接渲染 `Date.now()`

错误示例：

```tsx
"use client";

export default function Time() {
  return <div>{Date.now()}</div>;
}
```

服务端生成 HTML 时是一个时间戳。
客户端 hydration 时已经过了几毫秒甚至几秒，时间戳变了。

结果就是服务端和客户端内容不一致。

---

### 4. 直接读取 `localStorage`

错误示例：

```tsx
"use client";

export default function Theme() {
  const theme = localStorage.getItem("theme");

  return <div>{theme}</div>;
}
```

服务端没有 `localStorage`。
如果直接读，可能报 `localStorage is not defined`。

即使用 `typeof window` 做判断，也可能出现服务端和客户端渲染内容不同的问题。

---

### 5. 错误 HTML 结构

例如：

```tsx
<p>
  <div>错误结构</div>
</p>
```

浏览器可能会自动修正 HTML 结构。
服务端输出和浏览器实际 DOM 不一致，也可能导致 Hydration Error。

---

## 六、Hydration Error 的核心判断标准

判断一段代码是否可能导致 Hydration Error，可以问自己一个问题：

```text
这段 JSX 在服务端第一次渲染和客户端第一次渲染时，输出是否完全一致？
```

如果答案是否定的，就有风险。

例如：

```tsx
<div>{Math.random()}</div>
```

服务端和客户端不一致，有风险。

```tsx
<div>{Date.now()}</div>
```

服务端和客户端不一致，有风险。

```tsx
<div>{typeof window === "undefined" ? "server" : "client"}</div>
```

服务端和客户端不一致，有风险。

但是：

```tsx
<div>{Date.now() ? 5 : 6}</div>
```

虽然用了 `Date.now()`，但如果最终服务端和客户端都渲染 `5`，就不会出现 Hydration Error。

关键不是你有没有调用某个 API，而是：

```text
最终渲染出来的 HTML 是否一致。
```

---

## 七、修复方式一：用 `useEffect` 把客户端差异放到 hydration 之后

如果某个值只能在客户端生成，比如随机数、浏览器状态、localStorage 数据，可以先让服务端和客户端第一次渲染保持一致，然后在 `useEffect` 中更新。

错误写法：

```tsx
"use client";

export default function RandomCounter() {
  const [counter] = useState(Math.random());

  return <div>{counter}</div>;
}
```

这里 `useState(Math.random())` 会导致服务端和客户端初始值不一致。

正确写法：

```tsx
"use client";

import { useEffect, useState } from "react";

export default function RandomCounter() {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    setCounter(Math.random());
  }, []);

  return <div>{counter}</div>;
}
```

这样第一次渲染时：

```text
服务端：0
客户端第一次渲染：0
```

两边一致，不会 Hydration Error。

然后 hydration 完成后，`useEffect` 执行，再把值更新为随机数。

适合场景：

```text
Math.random()
Date.now()
localStorage
window
document
浏览器尺寸
用户主题
客户端临时状态
```

核心思路是：

```text
首屏保持一致，客户端挂载后再更新。
```

---

## 八、修复方式二：先显示 Loading，客户端加载完成后再显示真实内容

有些组件很复杂，里面可能有很多客户端逻辑，不方便逐个修改。

这时可以用一个 `isLoaded` 状态，让组件第一次渲染时先显示统一的 loading。

示例：

```tsx
"use client";

import { useEffect, useState } from "react";

export default function ClientOnlyComponent() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [counter] = useState(Math.random());

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return <div>{counter}</div>;
}
```

第一次渲染时：

```text
服务端：Loading...
客户端第一次渲染：Loading...
```

两边一致。

等客户端挂载完成后：

```text
isLoaded = true
显示真实内容
```

这种方式适合：

```text
复杂客户端组件
第三方组件
依赖浏览器 API 的组件
无法轻易改内部逻辑的组件
页面中某块必须等客户端加载后再显示的内容
```

缺点是用户会先看到 loading。
但这通常比 Hydration Error 和页面闪烁更好。

可以进一步把 loading 做成 skeleton 或 spinner，提升体验。

---

## 九、修复方式三：使用 `dynamic` 禁用 SSR

如果某个组件完全不适合在服务端渲染，可以使用 Next.js 的 `dynamic` import，并关闭 SSR。

例如：

```tsx
import dynamic from "next/dynamic";

const ClientOnlyChart = dynamic(() => import("./ClientOnlyChart"), {
  ssr: false,
  loading: () => <div>Loading chart...</div>,
});

export default function Page() {
  return <ClientOnlyChart />;
}
```

这里的意思是：

```text
这个组件不要在服务端渲染。
只在客户端加载并渲染。
```

既然服务端根本不生成这个组件的 HTML，就不存在服务端 HTML 和客户端 HTML 不一致的问题。

适合场景：

```text
图表库
地图组件
富文本编辑器
依赖 window 的第三方库
动画库
复杂客户端-only 组件
不适合 SSR 的组件
```

例如：

```tsx
const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div>Loading map...</div>,
});
```

这种方式非常实用，尤其是第三方库内部使用了 `window`、`document` 或随机值，而你又无法修改它的源码时。

---

## 十、三种修复方式怎么选

可以按下面的思路选择。

### 小问题：用 `useEffect`

如果只是某个值需要客户端生成，比如随机数、时间戳、localStorage：

```text
优先用 useEffect
```

示例：

```tsx
const [value, setValue] = useState("");

useEffect(() => {
  setValue(localStorage.getItem("key") ?? "");
}, []);
```

---

### 复杂组件：用 `isLoaded`

如果组件比较长，里面有很多客户端差异：

```text
可以先用 isLoaded 控制首屏一致
```

示例：

```tsx
if (!isLoaded) return <Loading />;
return <RealComponent />;
```

---

### 第三方库或完全客户端组件：用 `dynamic ssr:false`

如果组件根本不应该在服务端渲染：

```text
用 dynamic import 禁用 SSR
```

示例：

```tsx
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
});
```

---

## 十一、不要把所有 Hydration Error 都粗暴用 `ssr: false`

`ssr: false` 很方便，但不要滥用。

因为禁用 SSR 后，这个组件不会参与服务端 HTML 生成。

这意味着：

```text
首屏内容减少
SEO 可能受影响
用户需要等 JS 加载后才看到组件
可能降低首屏体验
```

所以选择顺序最好是：

```text
能保证服务端和客户端首屏一致，就不要禁用 SSR。
小范围差异用 useEffect。
复杂客户端逻辑用 isLoaded。
确实不适合 SSR 的组件再用 dynamic ssr:false。
```

---

## 十二、Hydration Error 和 CLS 的关系

Hydration Error 本身是开发提示，但它背后反映的是用户体验问题。

如果服务端先显示：

```text
Server Content
```

客户端 hydration 后变成：

```text
Client Content
```

用户会看到内容闪烁。

如果内容高度不同，还会造成布局移动，也就是 CLS。

例如服务端渲染了一大段内容，客户端变成一小段内容，页面会跳动。
在慢网速下，这种现象更明显。

所以 Hydration Error 的意义是提醒你：

```text
你的首屏 HTML 不稳定。
用户可能会看到页面变化。
这会影响体验和性能指标。
```

---

## 十三、开发环境排查 Hydration Error 的步骤

遇到 Hydration Error，可以按下面流程排查。

### 1. 先确认是不是浏览器插件导致

```text
无痕模式打开
关闭翻译插件、广告插件、密码插件
换干净浏览器测试
```

如果无痕模式正常，可能是插件修改 DOM。

---

### 2. 查看报错提示中的 server/client 差异

Next.js 通常会提示类似：

```text
Server: "xxx"
Client: "yyy"
```

这能直接告诉你哪里不一致。

---

### 3. 搜索不稳定渲染代码

重点检查：

```text
Math.random()
Date.now()
new Date()
typeof window
localStorage
sessionStorage
window.innerWidth
document
navigator
Intl 时区格式化
根据浏览器环境分支渲染
```

---

### 4. 检查 HTML 结构

比如：

```text
p 标签里放 div
table 结构不完整
ul 下面不是 li
浏览器自动修正 DOM
```

错误 HTML 结构也可能导致 hydration mismatch。

---

### 5. 根据场景选择修复方案

```text
客户端值：useEffect
复杂组件：isLoaded
第三方客户端库：dynamic ssr:false
插件导致：换干净环境验证
```

---

## 十四、面试中怎么解释 Hydration Error

如果面试官问：Next.js 中 Hydration Error 是什么？为什么会出现？怎么解决？

可以这样回答：

```text
Hydration Error 的本质是服务端渲染出来的 HTML 和客户端第一次渲染出来的 HTML 不一致。

在 Next.js 中，服务端会先生成 HTML 发送给浏览器，浏览器先展示这个 HTML，然后客户端 JavaScript 加载后，React 会重新运行组件并绑定事件，这个过程叫 hydration。如果客户端第一次渲染的结果和服务端 HTML 不一样，React 就会提示 Hydration Error。

常见原因包括在 JSX 中直接使用 Math.random、Date.now、typeof window、localStorage，或者浏览器插件修改 DOM，也可能是错误 HTML 结构导致浏览器自动修正。

解决方式要看场景。如果是客户端才有的值，可以先用固定初始值，等 useEffect 执行后再更新；如果组件很复杂，可以用 isLoaded 先显示 loading，客户端挂载后再显示真实内容；如果是第三方库或完全依赖 window 的组件，可以用 next/dynamic 并设置 ssr:false，让它只在客户端渲染。

核心原则是：服务端首屏 HTML 和客户端第一次 render 必须一致。
```

---

## 十五、总结

Hydration Error 并不是 Next.js 的神秘问题。
它的核心原因只有一个：

```text
服务端 HTML 和客户端第一次渲染结果不一致。
```

常见触发方式：

```text
Math.random()
Date.now()
new Date()
typeof window 分支
localStorage
浏览器插件修改 DOM
错误 HTML 结构
客户端和服务端使用了不同数据
```

常见修复方式：

```text
useEffect：客户端挂载后再更新不稳定值
isLoaded：先显示统一 loading，再显示客户端内容
dynamic ssr:false：完全禁用某个组件的服务端渲染
```

可以记住这句话：

```text
Hydration 的第一原则是：第一次渲染要一致，客户端差异放到 hydration 之后处理。
```

只要保证这一点，大多数 Hydration Error 都能快速定位和修复。
