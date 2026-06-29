# 高频 SSE 场景下，前端如何优化渲染性能？

在实时行情、期权报价、订单状态、持仓变化这类前端系统中，SSE 是一种很常见的实时推送方案。

SSE，全称是 **Server-Sent Events**，它允许服务端通过一条 HTTP 长连接持续向浏览器推送数据。浏览器端通常通过 `EventSource` 建立连接：

```ts
const source = new EventSource(
  `${SSE_URL}/event/market?stream=${underlyingIndex}`,
);
```text

相比普通轮询，SSE 的优势是服务端可以主动推送数据，不需要前端不断发请求。

但是在高频行情场景中，真正的问题往往不是“怎么建立 SSE 连接”，而是：

```text
服务端消息来了以后，前端怎么处理，才不会把页面渲染拖死？
```

如果一秒钟有几百条、几千条行情数据推过来，前端每收到一条消息就解析、更新 store、触发组件 render，那么页面很容易卡顿。

所以 SSE 优化的核心不是 `EventSource` 本身，而是：

```text
把数据接收和 UI 渲染解耦。
```text

## 一、项目中的 SSE 场景

在这个项目里，全局 SSE 主要由 `useGlobalSSE` 负责管理。

它同时启动两类实时数据流：

```text
1. 用户私有 SSE
2. 公共市场 SSE
```

用户私有 SSE 通过 `useUserSSE()` 启动，主要负责账户、订单、持仓等和当前登录用户相关的数据。

公共市场 SSE 根据当前选中的 `underlying_index` 建立连接：

```ts
new EventSource(`${SSE_URL}/event/market?stream=${newIndex}`);
```text

它接收公开市场数据，包括：

```text
instrument：期权合约基础数据
Underlying：标的资产 / underlying 市场数据
instrument_greek：期权希腊值
instrument_quote：期权报价
```

整个数据流大概是：

```text
currentUnderlyingIndexAtom
  -> currentUnderlyingIndex.underlying_index
  -> EventSource 建立市场 SSE 连接
  -> 接收市场消息
  -> 推入 marketUpdateQueue
  -> requestAnimationFrame 批量处理
  -> 更新本地 option 状态 / 失效 React Query 缓存
```ts

这个设计的关键点在于：**SSE 消息不会直接更新 UI，而是先进入队列，再批量处理。**

## 二、高频 SSE 为什么会导致卡顿？

很多人会以为 SSE 卡顿是因为 SSE 协议不行，其实大多数时候不是。

真正容易造成卡顿的是前端处理方式。

假设服务端一秒推送 3000 条消息，如果前端这样处理：

```ts
source.onmessage = (event) => {
  const data = JSON.parse(event.data);
  setState(data);
};
```

问题会非常明显。

每条消息都会经过：

```text
onmessage 回调
JSON.parse
状态更新
组件重新渲染
DOM diff
layout / paint
```text

如果每条消息都触发一次状态更新，那么 React 会被迫频繁工作。尤其是行情表格、期权链、报价单元格这类页面，本身字段多、组件多、更新频率高，更容易出现主线程阻塞。

所以高频 SSE 卡顿的根因通常是：

```text
消息频率太高
状态写入太频繁
React render 太频繁
表格或单元格重绘太频繁
```

不是每一条消息都值得立刻渲染。

比如一秒内某个报价变化了很多次，但用户屏幕刷新通常也就是 60Hz。也就是说，UI 最多每 16ms 左右更新一次就够了。超过这个频率的更新，很多对用户来说是无感的，但对浏览器来说却是实打实的负担。

## 三、优化原则：消息可以高频，渲染不能高频

在高频 SSE 场景下，一个非常重要的原则是：

```text
数据接收可以高频，但 UI 渲染必须降频。
```text

也就是说，前端可以持续接收服务端消息，但不要每收到一条消息就立刻更新 React 状态。

更合理的流程应该是：

```text
消息到达
  -> 放入内存队列
  -> 合并同一帧内的更新
  -> 批量写入 store
  -> 触发一次 UI 更新
```

而不是：

```text
消息到达
  -> 立即 setState
  -> 立即 render
```tsx

你项目里的 `useGlobalSSE` 就是这个思路。

## 四、使用 useRef 保存连接对象，避免无意义渲染

在项目代码中，公共市场 SSE 连接对象是用 `useRef` 保存的：

```ts
const ssePublic = useRef<EventSource>();
```

这是一个正确的选择。

因为 `EventSource` 是连接对象，它本身不参与页面展示。如果用 `useState` 保存连接对象，每次连接变化都有可能触发组件重新渲染。

而用 `useRef` 可以做到：

```text
保存连接实例
不触发 React render
跨 render 周期保持同一个引用
方便在卸载或切换 stream 时关闭连接
```tsx

同样，市场更新队列也是用 `useRef` 保存：

```ts
const marketUpdateQueue = useRef<MarketUpdate[]>([]);
```

这说明消息来了之后，先写入内存队列，而不是直接进入 React 响应式状态。

这个点很关键。

`useRef` 在这里的作用不是“让 SSE 更快”，而是：

```text
让高频消息进入非响应式数据容器，避免每条消息都触发 React 更新。
```tsx

## 五、用队列承接高频消息

项目里定义了一个统一的市场更新队列：

```ts
interface MarketUpdate {
  type: "instrument" | "underlying" | "instrumentGreek" | "instrumentQuote";
  data: SSEInstrument | SSEUnderlying | SSEInstrumentGreek | SSEInstrumentQuote;
}

const marketUpdateQueue = useRef<MarketUpdate[]>([]);
```

当 SSE 消息到达时，代码不会直接更新状态，而是先解析消息类型，再推入队列：

```ts
const handleMessage = (event: MessageEvent) => {
  const { data, type }: SSEMarket = JSON.parse(event.data);

  const updateType =
    type === "instrument"
      ? "instrument"
      : type === "Underlying"
        ? "underlying"
        : type === "instrument_greek"
          ? "instrumentGreek"
          : type === "instrument_quote"
            ? "instrumentQuote"
            : null;

  if (!updateType) return;

  marketUpdateQueue.current.push({
    type: updateType,
    data,
  });

  scheduleMarketUpdate();
};
```text

这里做了两件事：

第一，把后端事件类型归一化成本地更好处理的类型。

比如：

```text
instrument_greek -> instrumentGreek
instrument_quote -> instrumentQuote
Underlying -> underlying
```

第二，把消息放进队列，不直接更新 UI。

这就相当于在 SSE 和 React 渲染之间加了一个缓冲层。

## 六、用 requestAnimationFrame 批量 flush

项目里最关键的优化点是 `requestAnimationFrame`。

代码中有一个标记：

```ts
const pendingMarketUpdateRef = useRef(false);
```tsx

它用于判断当前是否已经安排了一次批处理。

调度函数是：

```ts
const scheduleMarketUpdate = useCallback(() => {
  if (!pendingMarketUpdateRef.current) {
    pendingMarketUpdateRef.current = true;
    requestAnimationFrame(batchMarketUpdate);
  }
}, [batchMarketUpdate]);
```

这个设计非常重要。

如果同一帧内来了 100 条 SSE 消息，第一次消息会安排一次 `requestAnimationFrame`，后面的 99 条消息只会继续入队，不会重复安排 99 个任务。

也就是说：

```text
多条消息 -> 同一帧只触发一次批处理
```tsx

这就避免了“消息多少次，渲染多少次”的问题。

`requestAnimationFrame` 的好处是它和浏览器渲染节奏对齐。浏览器下一帧要绘制之前，统一处理这一批数据。

这比每条消息都 `setState` 更合理。

## 七、批量消费队列，合并状态更新

真正处理队列的是 `batchMarketUpdate`：

```ts
const batchMarketUpdate = useCallback(() => {
  if (!pendingMarketUpdateRef.current) return;

  let shouldInvalidateUnderlying = false;

  while (marketUpdateQueue.current.length > 0) {
    const update = marketUpdateQueue.current.shift();
    if (!update) continue;

    switch (update.type) {
      case "instrument":
        setOptionsMap(update.data as SSEInstrument);
        break;

      case "underlying":
        shouldInvalidateUnderlying = true;
        break;

      case "instrumentGreek":
        setOptionsMapByGreek(update.data as SSEInstrumentGreek);
        break;

      case "instrumentQuote":
        setOptionsMapByQuote(update.data as SSEInstrumentQuote);
        break;
    }
  }

  if (shouldInvalidateUnderlying) {
    queryClient.invalidateQueries({
      queryKey: ["market", "underlying"],
      exact: true,
    });
  }

  pendingMarketUpdateRef.current = false;
}, [setOptionsMap, setOptionsMapByGreek, setOptionsMapByQuote, queryClient]);
```

这里有两个优化点。

第一个是：`instrument`、`instrumentGreek`、`instrumentQuote` 按队列逐条写入本地 option 状态。

这些数据通常是期权链表格里的核心更新数据，例如合约信息、希腊值、报价。

第二个是：`underlying` 不会每条都立刻 invalidate，而是用一个布尔值合并：

```ts
let shouldInvalidateUnderlying = false;
```text

只要这一帧里出现过 underlying 更新，就记录为 true。

最后统一执行一次：

```ts
queryClient.invalidateQueries({
  queryKey: ["market", "underlying"],
  exact: true,
});
```

这个设计避免了同一帧内多条 underlying 消息触发多次 React Query refetch。

这就是典型的：

```text
高频事件合并为低频状态更新。
```text

## 八、渲染层优化的核心：不要让整张表重渲染

SSE 优化不能只停留在“消息入队”和“批量 flush”。

如果队列批处理之后，每次仍然更新一个巨大的对象，导致整张期权表格全部重渲染，那页面还是会卡。

所以渲染层还要继续优化状态粒度。

在行情类页面里，常见问题是：

```text
一个大 optionsMap 变化
  -> 整个表格组件重新 render
  -> 每一行重新 render
  -> 每个单元格重新 render
```

但真实情况可能只是某一个 instrument 的 quote 变了，或者某一个希腊值变了。

因此更好的设计是：

```text
状态按 instrument 拆分
组件按行或单元格订阅
只更新变化的那一小块 UI
```text

也就是说，不能让所有组件都依赖一个大对象。

更理想的结构是：

```text
InstrumentRow 只订阅当前 instrumentId 的数据
GreekCell 只订阅当前 instrumentId 的 Greek 数据
QuoteCell 只订阅当前 instrumentId 的 Quote 数据
```

这样某个 quote 更新时，只让对应的报价单元格更新，而不是整张表格更新。

这才是渲染层优化的关键。

## 九、memo、selector 和结构共享

在 React 渲染层，常见的优化手段包括：

```text
React.memo
useMemo
useCallback
selector
结构共享
细粒度 store
```tsx

但是这些工具不能乱用。

对于高频行情表格来说，更重要的是状态结构和订阅粒度。

比如父组件传给子组件一个大对象：

```tsx
<OptionTable optionsMap={optionsMap} />
```

只要 `optionsMap` 引用变化，`OptionTable` 以及它下面的子组件就可能重新渲染。

更好的方式是让子组件自己通过 selector 获取自己需要的数据：

```tsx
const quote = useQuoteByInstrumentId(instrumentId);
```tsx

然后配合 `React.memo`，让组件只在自己关心的数据变化时更新。

核心思路是：

```text
不是阻止所有更新，而是让更新发生在正确的最小范围内。
```

如果只是简单地到处包 `useMemo`、`useCallback`，但状态粒度仍然很粗，收益会很有限。

## 十、为什么虚拟滚动不一定能解决高频行情卡顿？

很多人看到表格卡顿，第一反应是加虚拟滚动。

但虚拟滚动解决的是：

```text
DOM 节点太多
```text

如果一个页面有几千行、几万行列表，虚拟滚动非常有效。

但如果你的期权表格只有几十行，真正的问题是每个单元格都在高频变化，那么虚拟滚动的收益就有限。

这种情况下，瓶颈不是节点数量，而是：

```text
状态更新太频繁
组件重渲染范围太大
单元格频繁 paint
```

所以在高频行情场景下，优化优先级通常是：

```text
先降低更新频率
再缩小渲染范围
最后再考虑虚拟滚动
```text

如果列表规模确实很大，虚拟滚动当然可以做。但它不是所有 SSE 卡顿问题的第一解法。

## 十一、requestIdleCallback 为什么不适合主链路？

`requestIdleCallback` 看起来也能做异步调度，但它不适合作为高频行情的主链路。

因为 `requestIdleCallback` 的执行依赖浏览器空闲时间。

如果页面一直很忙，idle 时间可能很少。这样会导致行情消息不断堆积，UI 更新延迟越来越高。

所以它更适合做低优先级任务，比如：

```text
日志上报
非关键指标计算
后台清理
次要字段补算
```

而实时行情、报价、订单状态这种用户正在看的核心数据，更适合用固定节奏 flush，例如：

```text
requestAnimationFrame
16ms / 33ms 定时批处理
```text

也就是说：

```text
实时数据主链路追求稳定刷新节奏，不适合完全依赖浏览器 idle 时间。
```

## 十二、什么时候考虑 Web Worker？

如果已经做了队列、批处理、状态粒度优化，但页面仍然卡，就可以考虑 Web Worker。

Web Worker 适合把一些重计算从主线程挪出去，比如：

```text
大量 JSON 解析
行情聚合
排序
过滤
盘口合并
指标计算
```text

架构可以变成：

```text
Worker:
接收或处理 SSE 消息
解析数据
聚合变化
生成批量快照

Main Thread:
接收快照
更新 store
渲染 UI
```

这样主线程就少做很多数据处理工作，可以把更多时间留给用户交互和页面绘制。

不过 Worker 也有代价：

```text
架构更复杂
调试更麻烦
主线程和 Worker 之间通信有序列化成本
数据同步逻辑更复杂
```tsx

所以它更适合中后期优化。

对于你的当前项目来说，已经先做了 `useRef` 队列和 `requestAnimationFrame` 批处理，这是更轻量、更直接的第一阶段优化。等后续消息量进一步上来，再考虑 Worker 会更合理。

## 十三、SSE 生命周期也会影响性能和稳定性

除了渲染优化，SSE 生命周期管理也很重要。

你的项目里根据 `underlying_index` 管理 SSE 连接：

```ts
const shouldConnect =
  !ssePublic.current ||
  lastUnderlyingIndex.current !== newIndex ||
  ssePublic.current.readyState === EventSource.CLOSED;
```

这个判断可以避免重复创建同一个市场流连接。

当 `underlying_index` 变化时，会关闭旧连接：

```ts
ssePublic.current.close();
ssePublic.current = undefined;
marketUpdateQueue.current = [];
pendingMarketUpdateRef.current = false;
```ts

组件卸载时也会清理连接和队列：

```ts
return () => {
  if (ssePublic.current) {
    ssePublic.current.close();
    ssePublic.current = undefined;
  }

  pendingMarketUpdateRef.current = false;
  lastUnderlyingIndex.current = "";
  marketUpdateQueue.current = [];
};
```

这可以避免两个问题：

```text
旧 stream 的数据污染新页面
旧 EventSource 没关闭导致重复推送
```text

高频数据系统里，这类清理非常重要。

否则用户切换标的资产时，旧连接还在推数据，新连接也在推数据，前端压力会越来越大，数据还可能错乱。

## 十四、页面可见性与降频策略

生产环境中，SSE 还可以结合页面可见性进一步优化。

比如用户把页面切到后台时，行情页面并不需要保持和前台一样的刷新频率。

可以监听：

```ts
document.visibilityState;
```

当页面隐藏时：

```text
降低 flush 频率
暂停非关键数据更新
只保留必要连接
延迟处理非核心消息
```text

当页面重新可见时：

```text
恢复正常 flush
重新拉取一次关键快照
补齐可能漏掉的数据
```

这样可以减少后台页面对 CPU 和内存的占用，也能提升整体体验。

不过这个策略要看业务要求。如果是交易系统，有些数据可能不能完全暂停，只能降频或补偿。

## 十五、从后端减少事件数量

前端优化很重要，但如果服务端推送过于碎，前端会天然承压。

比如服务端每个字段变化都推一条消息，前端就会收到大量事件。

更好的方式是后端按时间窗口聚合：

```text
5ms 一批
10ms 一批
16ms 一批
```text

或者按业务维度聚合：

```text
按 instrument 聚合
按 quote 聚合
按 greek 聚合
按用户订阅范围聚合
```

这样前端收到的事件数量会明显减少。

对于高频行情系统来说，后端聚合往往是性价比非常高的优化，因为它从源头减少了事件调度、JSON 解析和前端队列压力。

## 十六、这个项目里的 SSE 优化可以怎么总结？

结合你的项目，SSE 优化可以总结成几层。

第一层是连接管理：

```text
根据 underlying_index 建立市场 SSE
切换 stream 时关闭旧连接
组件卸载时清理连接和队列
避免重复连接
```tsx

第二层是接入层缓冲：

```text
用 useRef 保存 EventSource
用 useRef 保存市场消息队列
onmessage 中只做解析、归一化和入队
不直接 setState
```

第三层是批量调度：

```text
用 pendingMarketUpdateRef 避免重复安排任务
用 requestAnimationFrame 对齐浏览器渲染节奏
同一帧内多条消息合并处理
```text

第四层是状态更新合并：

```text
instrument / greek / quote 批量写入本地状态
underlying 多条消息合并为一次 query invalidate
减少重复 refetch
```

第五层是渲染范围控制：

```text
状态按 instrument 拆分
组件按行或单元格订阅
避免整张表格因为一个字段变化而重渲染
必要时配合 React.memo、selector、结构共享
```text

这套思路的核心就是：

```text
SSE 高频接收，UI 低频刷新；
数据可以很多，但渲染必须克制。
```

## 十七、面试中可以怎么讲？

如果面试官问：“你做过 SSE 或实时行情性能优化吗？”

可以这样回答：

> 在项目里我们有一个全局 SSE Hook，用来同时管理用户私有数据流和公共市场行情流。公共市场流会根据当前选中的 underlying index 建立 EventSource 连接，接收 instrument、underlying、Greek、quote 等实时数据。
>
> 高频 SSE 最大的问题不是连接本身，而是如果每条消息都 JSON.parse 后直接 setState，会导致 store 高频写入和 React 频繁 render，尤其是期权链、报价表这种表格型页面，很容易造成主线程卡顿。
>
> 所以我在接入层做了一个缓冲：EventSource 实例和消息队列都用 useRef 保存，消息来了之后先归一化类型，然后推入队列，不直接更新 UI。接着用 requestAnimationFrame 做批量 flush，同一帧内收到多条消息，只安排一次批处理。
>
> 在批处理里，instrument、Greek、quote 会批量写入本地 option 状态，而 underlying 事件不会每条都 invalidate query，而是合并成一次 React Query 的 invalidate，避免同一帧内重复 refetch。
>
> 渲染层我会继续关注状态订阅粒度，避免一个 quote 变化导致整张表格重渲染。更理想的方式是按 instrument 或 cell 做细粒度订阅，再配合 memo 和 selector，让变化只影响对应行或单元格。
>
> 所以整体思路是：SSE 可以高频接收，但 UI 不能高频重渲染。要通过队列、批处理、状态合并和细粒度订阅，把数据流和渲染流解耦。

## 十八、总结

SSE 本身只是一个服务端向浏览器推送数据的通道。

在普通业务里，直接 `onmessage -> setState` 可能没什么问题。但在实时行情、期权报价、订单流、盘口数据这种高频场景里，这种写法很容易让页面卡顿。

真正有效的优化思路是：

```text
不要让每条消息都触发 UI 更新。
```tsx

可以分成几步做：

```text
1. 用 useRef 保存连接和队列，避免高频消息进入 React 响应式状态；
2. onmessage 只做轻量处理，把消息推入队列；
3. 用 requestAnimationFrame 或固定时间窗口批量 flush；
4. 合并同类更新，减少 store 写入和 query invalidate；
5. 缩小组件订阅粒度，避免整表重渲染；
6. 必要时再考虑 Web Worker、后端聚合和页面可见性降频。
```

在你的项目中，`useGlobalSSE` 已经体现了这套思路：通过 `marketUpdateQueue` 缓冲高频市场消息，再用 `requestAnimationFrame` 批量处理，并且把 underlying 的多次更新合并成一次 React Query 缓存失效。

一句话总结：

```text
高频 SSE 优化的重点，不是“怎么收到消息”，而是“收到消息后，怎么少渲染、准渲染、批量渲染”。
```

对于实时行情类前端项目来说，这比单纯建立一个 EventSource 连接重要得多。
