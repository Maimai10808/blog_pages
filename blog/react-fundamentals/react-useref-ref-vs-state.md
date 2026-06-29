# 一文讲清 React useRef：什么时候该用 ref，什么时候该用 state？

在 React 中，`useRef` 是一个非常重要的 Hook。

很多人最开始接触 `useRef`，可能只是知道它可以拿到 DOM 元素，比如让输入框自动聚焦。但实际上，`useRef` 不只是用来操作 DOM，它还可以保存一些组件内部需要持久存在、但不需要参与渲染的数据。

一句话理解：

```text
useRef 用来保存“不需要触发页面重新渲染”的值。
```tsx

它和 `useState` 有点像，都能在组件中保存数据。但它们最核心的区别是：

```text
useState 更新后会触发组件重新渲染；
useRef 更新后不会触发组件重新渲染。
```

理解这一点，基本就理解了 `useRef` 的大半。

## 一、useRef 是什么？

`useRef` 可以创建一个 ref 对象。

例如：

```tsx
import { useRef } from "react";

function App() {
  const countRef = useRef(0);

  return <div>Hello</div>;
}
```text

这里的 `countRef` 是一个对象，它的值保存在：

```tsx
countRef.current;
```

也就是说，如果想读取 ref 的值：

```tsx
console.log(countRef.current);
```text

如果想修改 ref 的值：

```tsx
countRef.current++;
```

`useRef(0)` 中的 `0` 是初始值。

所以这段代码的意思是：

```text
创建一个 ref，初始值是 0，后续可以通过 countRef.current 读取和修改。
```tsx

## 二、useRef 和 useState 的区别

为了理解 `useRef`，最好的方式就是把它和 `useState` 对比。

看一个简单例子：

```tsx
import { useRef, useState } from "react";

function Counter() {
  const [stateCount, setStateCount] = useState(0);
  const refCount = useRef(0);

  const handleIncrement = () => {
    setStateCount(stateCount + 1);
    refCount.current++;

    console.log("state:", stateCount);
    console.log("ref:", refCount.current);
  };

  return (
    <div>
      <p>State count: {stateCount}</p>
      <button onClick={handleIncrement}>Increment</button>
    </div>
  );
}
```

点击按钮后，会发生两件事：

```tsx
setStateCount(stateCount + 1);
refCount.current++;
```text

看起来这两行都是把数字加 1，但它们的行为不一样。

`setStateCount` 会告诉 React：状态更新了，需要重新渲染组件。

而：

```tsx
refCount.current++;
```

只是普通地修改了 ref 对象上的值，不会触发重新渲染。

所以第一次点击按钮时，控制台可能会看到：

```text
state: 0
ref: 1
```ts

为什么 state 打印出来还是 0？

因为 state 更新之后，新值要等到下一次 render 才能拿到。当前这次函数执行里，`stateCount` 还是旧值。

而 ref 不一样。

`refCount.current++` 是立即修改对象属性，所以后面立刻打印：

```tsx
console.log(refCount.current);
```

可以马上看到新值。

这就是两者的核心差异：

```text
state 的新值在下一次渲染中生效；
ref 的新值可以立即读取，但不会触发渲染。
```tsx

## 三、为什么 ref 不适合直接用于页面展示？

既然 `ref.current` 可以保存值，那能不能直接把它渲染到页面上？

比如：

```tsx
function Counter() {
  const countRef = useRef(0);

  const handleIncrement = () => {
    countRef.current++;
    console.log(countRef.current);
  };

  return (
    <div>
      <p>Count: {countRef.current}</p>
      <button onClick={handleIncrement}>Increment</button>
    </div>
  );
}
```

这段代码点击按钮后，控制台会正常打印：

```text
1
2
3
```text

但是页面上的 `Count` 可能一直不变。

原因很简单：

```text
修改 ref 不会触发组件重新渲染。
```

React 页面上显示的内容来自 render 结果。只有组件重新渲染后，页面才会更新。

而 `countRef.current++` 不会触发 render，所以页面自然不会刷新。

所以不要把 `ref.current` 当成普通渲染状态来用。

如果某个值需要显示在页面上，并且变化后希望 UI 更新，就应该用：

```tsx
useState;
```tsx

如果某个值只是组件内部需要记录，但不需要显示在页面上，就可以用：

```tsx
useRef;
```

## 四、useRef 适合保存什么？

`useRef` 适合保存那些：

```text
组件需要记住；
变化后不需要重新渲染；
需要跨 render 保持同一个引用。
```text

常见场景包括：

```text
定时器 ID
WebSocket / SSE 连接对象
上一次的值
防抖节流中的状态
队列
DOM 元素引用
第三方库实例
是否正在请求中的标记
requestAnimationFrame ID
```

比如在高频 SSE 场景中，可以用 `useRef` 保存消息队列：

```tsx
const queueRef = useRef<Message[]>([]);
```text

每次消息到达时，先把数据放进队列：

```tsx
queueRef.current.push(message);
```

这样不会因为每条消息都进入 state 而触发 React render。

然后再用固定节奏批量处理队列。

这类场景非常适合 `useRef`。

## 五、什么时候必须用 useState？

如果这个值会影响页面展示，就应该用 `useState`。

比如：

```tsx
const [count, setCount] = useState(0);
```tsx

页面中直接展示：

```tsx
<p>{count}</p>
```

点击按钮后希望页面同步更新：

```tsx
setCount(count + 1);
```text

这就是 state 的典型场景。

可以简单判断：

```text
这个值变了，页面要不要跟着变？
```

如果答案是要，用 `useState`。

如果答案是不需要，只是内部记录，用 `useRef`。

## 六、useRef 访问 DOM 元素

`useRef` 还有一个非常常见的用途：访问 DOM 元素。

比如我们想让输入框在组件加载后自动聚焦。

可以这样写：

```tsx
import { useEffect, useRef } from "react";

function SearchInput() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return <input ref={inputRef} />;
}
```tsx

这里做了几件事：

第一，创建一个 ref：

```tsx
const inputRef = useRef<HTMLInputElement | null>(null);
```

第二，把它传给 input 元素：

```tsx
<input ref={inputRef} />
```text

第三，组件渲染完成后，React 会自动把真实 DOM 元素赋值给：

```tsx
inputRef.current;
```

然后我们就可以调用 DOM 方法：

```tsx
inputRef.current?.focus();
```text

这个例子中，输入框会在组件挂载后自动获得焦点。

需要注意的是，这里在 JSX 中使用的是：

```tsx
ref = { inputRef };
```

而不是：

```tsx
{
  inputRef.current;
}
```tsx

这是合法且常见的用法。

React 会帮我们管理这个 DOM 引用：元素挂载时把 DOM 节点放到 `current` 上，元素卸载时再清空。

## 七、为什么 DOM ref 可以放在 JSX 里？

前面说过，不建议把 `ref.current` 用于渲染：

```tsx
<p>{countRef.current}</p>
```

因为它变化后不会触发页面更新。

但 DOM ref 这样写是可以的：

```tsx
<input ref={inputRef} />
```tsx

这两者不是一回事。

`<input ref={inputRef} />` 的意思不是把 `inputRef.current` 渲染到页面上，而是告诉 React：

```text
这个 input 挂载后，请把它的 DOM 节点保存到 inputRef.current。
```

所以这是 `useRef` 最典型的合法用法之一。

## 八、useRef 和 useEffect 配合使用

访问 DOM 时，通常会配合 `useEffect`。

因为组件第一次执行函数时，DOM 还没有真正挂载完成。

所以这时：

```tsx
inputRef.current;
```tsx

可能还是 `null`。

等组件渲染完成后，`useEffect` 执行，此时 DOM 已经挂载，React 已经把 input 节点放到了 `inputRef.current` 上。

所以通常写成：

```tsx
useEffect(() => {
  inputRef.current?.focus();
}, []);
```

这个问号：

```tsx
?.
```tsx

是为了避免 `current` 为 `null` 时报错。

## 九、useRef 在第三方库中的使用

很多第三方库也会使用 ref。

比如一些组件库、图表库、编辑器库，会让你传入一个 ref，或者暴露一个 ref，让你调用组件内部的方法。

例如：

```tsx
editorRef.current?.focus();
chartRef.current?.resize();
modalRef.current?.open();
```

这种场景下，ref 的作用就是：

```text
拿到某个实例；
调用它暴露的方法；
但不通过 React state 控制渲染。
```tsx

这也是 `useRef` 很重要的应用场景。

## 十、useRef 的几个常见误区

### 1. 把 ref 当 state 用

错误思路：

```tsx
const countRef = useRef(0);

countRef.current++;

return <p>{countRef.current}</p>;
```

如果你希望页面更新，不应该用 ref，而应该用 state。

### 2. 以为 ref 更新会重新渲染

不会。

修改：

```tsx
ref.current = newValue;
```text

不会触发组件重新执行，也不会触发 UI 更新。

### 3. 在 render 里依赖 ref.current 展示关键数据

这很容易导致 UI 和数据不同步。

如果值要展示给用户，就用 state。

### 4. 忘记 current

ref 的值在：

```tsx
ref.current;
```

不是直接在 ref 本身。

读取和修改都要通过 `.current`。

## 十一、useRef 在性能优化中的价值

`useRef` 在性能优化中经常出现。

比如高频事件：

```text
scroll
mousemove
resize
SSE
WebSocket
requestAnimationFrame
```tsx

如果每次事件都更新 state，React 会频繁 render。

这时可以先用 ref 保存中间值：

```tsx
const latestValueRef = useRef(null);
```

事件来了只更新 ref：

```tsx
latestValueRef.current = value;
```tsx

然后在合适的时机，比如下一帧、定时器、用户停止操作后，再统一更新 state。

这样可以减少无意义的渲染。

比如：

```tsx
const queueRef = useRef<Message[]>([]);
const pendingRef = useRef(false);

function handleMessage(message: Message) {
  queueRef.current.push(message);

  if (!pendingRef.current) {
    pendingRef.current = true;

    requestAnimationFrame(() => {
      const batch = queueRef.current;
      queueRef.current = [];
      pendingRef.current = false;

      updateStateByBatch(batch);
    });
  }
}
```

这个模式在实时行情、SSE、WebSocket 推送中非常有用。

核心思想是：

```text
高频数据先进入 ref；
低频、批量地更新 state；
减少 React render 次数。
```tsx

## 十二、面试中怎么回答 useRef？

如果面试官问：`useRef` 是什么？它和 `useState` 有什么区别？

可以这样回答：

> `useRef` 可以保存一个跨 render 持久存在的可变对象，值存在 `.current` 上。它和 `useState` 都能保存组件内部数据，但最大的区别是 state 更新会触发组件重新渲染，而 ref 更新不会。
>
> 所以如果一个值会影响 UI 展示，比如页面上的 count、loading、列表数据，就应该用 state。如果一个值只是组件内部使用，不需要触发渲染，比如定时器 ID、DOM 节点、WebSocket 或 SSE 连接对象、上一次的值、消息队列，就更适合用 ref。
>
> 另外，ref 也常用于访问 DOM 元素，比如 input 自动聚焦。把 ref 传给 JSX 元素后，React 会在元素挂载时把真实 DOM 节点放到 `ref.current` 上，卸载时再清空。
>
> 在性能优化里，ref 常用于高频事件缓冲。比如 SSE 或 WebSocket 高频推送时，不会每条消息都 setState，而是先放到 ref 队列里，再用 requestAnimationFrame 批量 flush，减少 React 重渲染。

## 十三、总结

`useRef` 是 React 中非常实用的 Hook。

它可以用来保存一个不会因为组件重新渲染而丢失的值，并且修改这个值不会触发新的渲染。

它最核心的特点是：

```text
值存在 ref.current 上；
修改 current 不会触发 re-render；
适合保存不参与渲染的数据；
可以用来访问 DOM 元素。
```

可以用一句话判断：

```text
值变化后要更新 UI，用 useState；
值变化后不需要更新 UI，只是组件内部要记住，用 useRef。
```tsx

在真实项目中，`useRef` 常用于 DOM 操作、定时器、第三方库实例、WebSocket/SSE 连接、消息队列、上一次值记录等场景。

尤其是在高频事件和实时数据流场景中，`useRef` 可以作为缓冲层，避免每次数据变化都触发 React 渲染。

一句话总结：

```text
useRef 不是用来驱动 UI 的，而是用来保存那些“组件需要记住，但不需要渲染”的值。
```
