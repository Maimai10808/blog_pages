# setInterval 和 requestAnimationFrame 有什么区别？为什么动画更推荐使用 rAF？

在前端开发中，我们经常会遇到需要“重复执行某段代码”的场景。

比如：

```text
每隔一段时间更新数据
每隔一段时间移动元素
实现页面动画
实现小游戏循环
```text

很多人第一反应会使用：

```js
setInterval();
```

因为它可以按照固定时间间隔重复执行函数。

但是如果是和页面动画、视觉更新、元素移动相关的任务，更推荐使用：

```js
requestAnimationFrame();
```ts

它更适合浏览器渲染节奏，也更加 CPU 友好。

这篇文章就来对比一下 `setInterval` 和 `requestAnimationFrame`。

## 一、setInterval 是什么？

`setInterval` 是 JavaScript 中用于定时重复执行函数的方法。

基本写法如下：

```js
let request;
let i = 0;

const performAnimation = () => {
  console.log(i);
  i++;
};

request = setInterval(performAnimation, 1000);
```

这段代码的意思是：

```text
每隔 1000ms，也就是每隔 1 秒，执行一次 performAnimation。
```text

如果要停止这个定时器，可以使用：

```js
clearInterval(request);
```

比如页面上有两个按钮：

```html
<button id="start">Start</button> <button id="stop">Stop</button>
```ts

可以这样控制开始和停止：

```js
let request;
let i = 0;

const start = document.getElementById("start");
const stop = document.getElementById("stop");

const performAnimation = () => {
  console.log(i);
  i++;
};

start.addEventListener("click", () => {
  request = setInterval(performAnimation, 1000);
});

stop.addEventListener("click", () => {
  clearInterval(request);
});
```

这样点击 Start 后，每秒打印一次数字；点击 Stop 后，停止执行。

## 二、用 setInterval 做动画的问题

如果我们想让动画接近 60 FPS，很多人可能会这样写：

```js
setInterval(performAnimation, 1000 / 60);
```text

`1000 / 60` 大约是 16.7ms。

意思是：

```text
每 16.7ms 执行一次，理论上每秒执行 60 次。
```

这看起来很合理，因为很多屏幕的刷新率是 60Hz，也就是一秒刷新 60 次。

但是问题在于，`setInterval` 只是按照时间间隔尝试执行回调，它并不关心浏览器什么时候真正绘制页面。

浏览器在执行 JavaScript 的同时，还要处理很多事情：

```text
事件回调
样式计算
布局 layout
绘制 paint
合成 composite
其他 JavaScript 任务
```text

如果主线程正忙，`setInterval` 的回调就可能延迟执行。

更麻烦的是，动画更新不一定刚好发生在浏览器绘制前。这样就可能出现：

```text
某一帧没赶上绘制
下一帧又连续执行多次
动画不够平滑
CPU 消耗更高
```

所以，用 `setInterval` 做动画存在几个问题：

```text
不一定和浏览器刷新节奏同步；
页面忙时可能延迟；
可能造成掉帧；
后台页面仍可能继续执行；
CPU 消耗相对更高。
```text

这就是为什么动画场景下不太推荐直接使用 `setInterval`。

## 三、requestAnimationFrame 是什么？

`requestAnimationFrame`，简称 `rAF`，是浏览器专门为动画和视觉更新提供的 API。

它的作用是：

```text
在浏览器下一次重绘之前执行指定回调。
```

基本写法如下：

```js
let request;
let i = 0;

const performAnimation = () => {
  console.log(i);
  i++;

  request = requestAnimationFrame(performAnimation);
};

request = requestAnimationFrame(performAnimation);
```text

如果要停止动画，可以使用：

```js
cancelAnimationFrame(request);
```

完整一点的按钮控制示例：

```js
let request;
let i = 0;

const start = document.getElementById("start");
const stop = document.getElementById("stop");

const performAnimation = () => {
  console.log(i);
  i++;

  request = requestAnimationFrame(performAnimation);
};

start.addEventListener("click", () => {
  request = requestAnimationFrame(performAnimation);
});

stop.addEventListener("click", () => {
  cancelAnimationFrame(request);
});
```text

这里和 `setInterval` 最大的区别是：

```text
requestAnimationFrame 不是按固定毫秒数执行，
而是跟随浏览器的绘制节奏执行。
```

浏览器准备绘制下一帧之前，会调用你传入的回调。

## 四、为什么 requestAnimationFrame 更适合动画？

动画本质上是视觉变化。

浏览器最终是按“一帧一帧”把页面画出来的。用户看到的是每一帧的结果，而不是每一次 JavaScript 执行的结果。

因此，动画代码最理想的执行时机是：

```text
浏览器准备绘制下一帧之前。
```text

而这正是 `requestAnimationFrame` 的工作方式。

相比 `setInterval`，`requestAnimationFrame` 有几个优势。

### 1. 和浏览器刷新节奏同步

`requestAnimationFrame` 会尽量在下一次重绘前执行。

这意味着它更适合做：

```text
元素移动
透明度变化
canvas 绘制
游戏循环
滚动动画
高频 UI 更新
```

因为它的执行节奏和页面绘制节奏更一致。

### 2. 更容易得到平滑动画

使用 `setInterval` 时，即使你写了 `1000 / 60`，也不能保证每次执行都刚好对应一帧。

而 `requestAnimationFrame` 会由浏览器统一调度，更容易实现平滑动画。

### 3. 后台标签页更省资源

当页面不可见时，浏览器通常会降低或暂停 `requestAnimationFrame` 的执行频率。

这意味着如果用户切到其他标签页，动画不会继续高频消耗 CPU。

这也是它比 `setInterval` 更 CPU 友好的原因之一。

### 4. 更适合游戏和复杂动画

如果你在写 JavaScript 小游戏、canvas 动画、粒子动画、拖拽跟随动画等，通常应该优先考虑 `requestAnimationFrame`。

因为这些场景都和视觉帧率强相关。

## 五、用 requestAnimationFrame 实现一个简单动画

假设页面中有一个容器和一个点：

```html
<div id="frame">
  <div class="dot"></div>
</div>

<button id="start">Start</button>
<button id="stop">Stop</button>
```tsx

我们想在点击 Start 后，不断向容器中插入新的 dot，形成一个连续动画效果。

可以这样写：

```js
let request;

const start = document.getElementById("start");
const stop = document.getElementById("stop");
const frame = document.getElementById("frame");

const performAnimation = () => {
  frame.insertAdjacentHTML("beforeend", `<div class="dot"></div>`);

  request = requestAnimationFrame(performAnimation);
};

start.addEventListener("click", () => {
  request = requestAnimationFrame(performAnimation);
});

stop.addEventListener("click", () => {
  cancelAnimationFrame(request);
});
```

这里的核心是：

```js
request = requestAnimationFrame(performAnimation);
```text

每次浏览器准备绘制下一帧时，执行一次 `performAnimation`，然后在函数内部继续注册下一帧。

停止时使用：

```js
cancelAnimationFrame(request);
```

这样就可以停止后续动画。

## 六、setInterval 和 requestAnimationFrame 的区别

可以用一张表总结：

| 对比项         | setInterval        | requestAnimationFrame    |
| -------------- | ------------------ | ------------------------ |
| 执行方式       | 按固定时间间隔执行 | 浏览器下一次重绘前执行   |
| 是否和渲染同步 | 不同步             | 同步浏览器渲染节奏       |
| 动画平滑度     | 容易受主线程影响   | 更适合平滑动画           |
| 后台标签页     | 可能仍执行或被节流 | 通常会暂停或降低频率     |
| CPU 友好程度   | 相对较差           | 更 CPU 友好              |
| 适合场景       | 定时任务、轮询     | 动画、游戏、视觉更新     |
| 停止方式       | clearInterval(id)  | cancelAnimationFrame(id) |

简单来说：

```text
setInterval 适合“按时间重复做事”；
requestAnimationFrame 适合“按浏览器帧率更新画面”。
```text

## 七、什么时候用 setInterval？

`setInterval` 并不是不能用，它适合一些和页面绘制无关的定时任务。

比如：

```text
定时轮询接口；
每隔几秒刷新状态；
倒计时；
心跳检测；
定时日志上报；
非动画类重复任务。
```

例如：

```js
setInterval(() => {
  fetchLatestData();
}, 5000);
```text

这种场景是每 5 秒请求一次数据，不需要跟浏览器绘制节奏同步，用 `setInterval` 就可以。

## 八、什么时候用 requestAnimationFrame？

如果任务和页面视觉更新有关，就更适合用 `requestAnimationFrame`。

比如：

```text
元素动画；
canvas 动画；
游戏循环；
滚动动画；
拖拽位置更新；
高频 UI 批量更新；
SSE / WebSocket 高频消息的渲染 flush。
```

比如在高频行情场景中，服务端可能一秒推送很多条 SSE 消息。

这时不应该每条消息都更新 UI，而是可以先进入队列，再用 `requestAnimationFrame` 批量处理：

```js
const queue = [];
let pending = false;

function handleMessage(message) {
  queue.push(message);

  if (!pending) {
    pending = true;

    requestAnimationFrame(() => {
      const batch = queue.splice(0);
      pending = false;

      updateUI(batch);
    });
  }
}
```text

这段代码的意思是：

```text
消息可以高频进入队列；
但 UI 最多按浏览器帧率批量更新。
```

这比每条消息都 `setState` 更合理。

## 九、为什么不是所有场景都用 requestAnimationFrame？

虽然 `requestAnimationFrame` 很适合动画，但它也不是万能的。

如果你需要严格每隔一段时间执行任务，比如每 5 秒请求一次接口，`requestAnimationFrame` 就不合适。

因为它的执行频率和浏览器绘制有关，不是固定时间间隔。

比如页面隐藏时，`requestAnimationFrame` 可能暂停或降频。如果你希望后台也继续做某些定时任务，就不能完全依赖它。

所以选择标准很简单：

```text
任务和渲染有关，用 requestAnimationFrame；
任务和固定时间有关，用 setInterval 或 setTimeout。
```text

## 十、面试中怎么回答？

如果面试官问：`setInterval` 和 `requestAnimationFrame` 有什么区别？

可以这样回答：

> `setInterval` 是按照固定时间间隔执行回调，比如每 16ms 执行一次。但它不和浏览器的渲染时机对齐，如果主线程比较忙，回调可能延迟，动画就容易掉帧或者不平滑。
>
> `requestAnimationFrame` 是浏览器在下一次重绘之前调用回调，它和浏览器刷新节奏更匹配，所以更适合做动画、canvas、游戏循环和高频 UI 更新。
>
> 另外，页面进入后台时，浏览器通常会降低或暂停 `requestAnimationFrame`，所以它也更节省资源。
>
> 所以我的理解是：如果是普通定时任务，比如轮询接口，可以用 `setInterval`；如果是视觉更新或动画，就优先用 `requestAnimationFrame`。

如果结合你的 SSE 项目，可以继续补一句：

> 在高频 SSE 场景里，我也会用 `requestAnimationFrame` 做批量 flush。消息来了先放进 ref 队列，不直接 setState，然后下一帧统一处理，避免一条消息触发一次 React 渲染。

## 十一、总结

`setInterval` 和 `requestAnimationFrame` 都能重复执行代码，但它们适合的场景不一样。

`setInterval` 更像是一个普通定时器：

```text
每隔指定时间执行一次。
```

`requestAnimationFrame` 更像是一个渲染调度器：

```text
下一次浏览器准备绘制页面之前执行。
```text

所以，如果你要做动画、游戏、canvas、拖拽、滚动视觉效果，或者高频数据的 UI 批量更新，优先使用：

```js
requestAnimationFrame();
```

如果你只是做普通定时任务，比如每隔几秒轮询接口、更新倒计时、发送心跳，则可以使用：

```js
setInterval();
```text

一句话总结：

```text
setInterval 负责“按时间重复执行”；
requestAnimationFrame 负责“按浏览器绘制节奏更新画面”。
```

因此，做动画时，`requestAnimationFrame` 通常比 `setInterval` 更平滑，也更 CPU 友好。
