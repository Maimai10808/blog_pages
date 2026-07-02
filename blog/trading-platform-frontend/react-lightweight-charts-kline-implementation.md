# React 项目中如何落地自研 K 线图表：以 lightweight-charts 分时线为例

在交易类项目中，K 线图表通常是非常核心的模块。很多项目会直接接入 TradingView Widget，把历史 K 线、实时行情、指标、缩放交互全部交给第三方处理。这种方式集成快、功能完整，但可控性相对较弱。

另一种方式是使用 `lightweight-charts` 自研图表展示层。它不是完整的 TradingView 终端，而是一个轻量、可定制、性能较好的图表渲染库。前端需要自己处理数据来源、数据合并、缓存、增量更新、状态管理和图表生命周期。

本文结合一个 Telegram Mini App 中的实际实现，梳理如何在 React 项目中落地一个自研行情图表模块。

需要先说明：这个项目里的图表严格来说不是标准 OHLC K 线，而是基于 `timestamp + spot_price` 的实时分时线 / area chart。它展示的是价格随时间变化的走势，没有 `open / high / low / close / volume` 字段。

数据结构如下：

```ts
export type KlineData = {
  spot_price: string[];
  timestamp: number[];
};
```text

所以更准确的说法是：**这是一个自研实时分时线图表模块，而不是完整蜡烛图 K 线模块。**

不过它的落地思路和自研 K 线图表是相通的：

```text
行情数据源
→ 前端状态管理
→ 数据合并与清洗
→ 图表数据格式转换
→ lightweight-charts 渲染
→ 实时增量 update
→ 生命周期清理与性能优化
```

---

## 一、为什么要自研图表，而不是直接用 TradingView Widget

TradingView Widget 的好处是开箱即用，历史 K 线、实时更新、指标、交互都比较完整。对于主站级交易页，如果只需要快速接入成熟图表，这是很好的选择。

但在 Mini App、移动端、轻量交易页或定制化行情模块中，自研图表更有价值。

主要原因有几个。

第一，页面体积更可控。
Mini App 对加载速度、包体积和交互流畅度要求更高，完整 TradingView Widget 可能过重，而 `lightweight-charts` 更适合轻量场景。

第二，样式更可控。
自研图表可以完全控制背景色、线条颜色、价格轴、时间轴、水印、tooltip、crosshair、显示范围等细节，更容易融入业务 UI。

第三，数据链路更可控。
项目可以直接使用自己的 SSE / WebSocket 行情流，而不是依赖 TradingView 内部的数据协议。

第四，状态管理更灵活。
前端可以把行情数据和 React / Jotai / Zustand 状态系统打通，和交易对切换、行情列表、下单模块、价格展示联动。

第五，适合做业务定制。
比如固定展示最近 300 个点、按标的控制价格精度、切换标的清空缓存、只保留最近行情、移动端简化交互，这些都适合自研实现。

所以，自研图表不是为了替代完整 TradingView，而是为了在特定业务场景下获得更高的控制权。

---

## 二、项目中的整体数据流

这个 Mini App 的实时图表链路可以概括为：

```text
usePublicSSE 建立公共行情 SSE 连接
→ 后端推送 ticker / tsline 数据
→ 收到 channel = tsline 的数据
→ useSetTsLineMap 合并分时线数据
→ 写入 tsLineMapAtom
→ 页面根据当前标的读取 KlineData
→ ProChart 接收 data
→ lightweight-charts setData 初始化
→ 后续数据变化时 series.update 最新点
```text

也就是说，图表组件本身不直接连接 SSE。
它只负责接收已经整理好的 `KlineData`，然后渲染图表。

这是一种比较好的分层方式：

```text
SSE Hook：负责连接和接收数据
数据状态层：负责缓存、合并、去重、截断
图表组件：负责渲染和增量更新
页面组件：负责把当前标的数据传给图表
```

这样做的好处是图表组件不会和具体数据源强绑定。以后数据源从 SSE 换成 WebSocket，或者从实时流换成 REST + WebSocket 混合，图表组件也不需要大改。

---

## 三、数据结构设计：为什么是 timestamp + spot_price

项目里的图表数据结构是：

```ts
export type KlineData = {
  spot_price: string[];
  timestamp: number[];
};
```text

它的含义是：

```text
timestamp[index] 对应 spot_price[index]
```

例如：

```ts
{
  timestamp: [1710000000, 1710000001, 1710000002],
  spot_price: ['65000.1', '65001.2', '65003.8']
}
```text

这类结构更像后端为了节省传输体积而设计的并行数组格式。相比对象数组：

```ts
[
  { time: 1710000000, price: "65000.1" },
  { time: 1710000001, price: "65001.2" },
];
```

并行数组在传输时可能更紧凑，但前端处理时有一个明显风险：**两个数组必须严格保持长度一致、顺序一致。**

否则就会出现：

```text
某个时间点对应错价格
图表点位错乱
去重后价格和时间不匹配
```tsx

因此在前端落地时，需要特别注意数据合并逻辑。

---

## 四、用 Jotai 管理不同标的的图表数据

项目里使用了 Jotai 和 immutable Map 管理分时线数据：

```ts
export const tsLineMapAtom = atom(IMap<UnderlyingE, KlineData>());
```

这里的 key 是 `UnderlyingE`，也就是当前交易标的，比如 BTC、ETH 等。
value 是这个标的对应的图表数据。

结构可以理解为：

```text
tsLineMapAtom
  ├─ BTC → { timestamp: [...], spot_price: [...] }
  ├─ ETH → { timestamp: [...], spot_price: [...] }
  └─ SOL → { timestamp: [...], spot_price: [...] }
```text

这样做的好处是：**不同标的的数据互相隔离，不会因为切换交易对而覆盖。**

在交易类页面中，这是非常重要的。
如果所有行情数据都放在一个普通数组里，用户快速切换标的时，很容易出现 BTC 图表短暂显示 ETH 数据、旧请求覆盖新状态、推送数据串台等问题。

按标的建 map，可以让状态边界更清楚：

```text
收到 BTC tsline → 只更新 BTC 对应数据
收到 ETH tsline → 只更新 ETH 对应数据
当前页面展示哪个标的 → 从 map 中取哪个标的
```

---

## 五、SSE 增量数据如何合并

核心合并逻辑在 `useSetTsLineMap` 中。

它接收 SSE 推送来的数据：

```ts
export type TsLineChannelItem = {
  channel: Channel.tsline;
  currency: UnderlyingE;
  spot_price: Array<string>;
  timestamp: Array<number>;
};
```text

每次收到新数据后，不是直接覆盖旧数据，而是执行：

```text
读取当前标的已有数据
→ 合并旧 timestamp 和新 timestamp
→ 合并旧 price 和新 price
→ 转成 time-price pair
→ 按 timestamp 去重
→ 按时间升序排序
→ 只保留最新 300 个点
→ 写回 tsLineMapAtom
```

关键代码逻辑：

```ts
const combinedTimestamps = [...existingData.timestamp, ...item.timestamp];
const combinedPrices = [...existingData.spot_price, ...item.spot_price];

const pairs = combinedTimestamps.map((time, index) => ({
  time,
  price: combinedPrices[index],
}));
```text

这里先把并行数组转成 pair：

```ts
{
  time: number;
  price: string;
}
```

这样后面就可以按 `time` 做去重和排序。

---

## 六、为什么要按 timestamp 去重

实时行情流里，同一个时间点可能被多次推送。

比如某一秒内价格被修正，或者服务端重复推送了同一个 timestamp 的数据。
如果前端不去重，图表里可能出现多个相同时间点，导致显示异常或 update 行为不稳定。

项目里使用 Map 做去重：

```ts
const uniquePairsMap = new Map();

pairs.forEach((pair) => {
  uniquePairsMap.set(pair.time, pair);
});
```text

Map 的特点是：同一个 key 后写入的值会覆盖先写入的值。

所以这里的逻辑是：

```text
同一个 timestamp
→ 保留最后一次收到的价格
```

这适合实时行情场景，因为后来的数据通常更接近最新状态，也可能是对前面数据的修正。

去重后再排序：

```ts
const sortedPairs = Array.from(uniquePairsMap.values()).sort(
  (a, b) => a.time - b.time,
);
```text

图表数据需要按时间升序排列，否则 lightweight-charts 可能无法正确渲染。

---

## 七、为什么只保留最新 300 个点

项目里每个标的只保留最新 300 个点：

```ts
const slicedPairs = sortedPairs.slice(-300);
```

这是一个很重要的性能设计。

实时行情是持续推送的，如果前端一直累积所有点，运行时间越长，数据越大：

```text
1 分钟 300 点
10 分钟 3000 点
1 小时 18000 点
```text

长期运行后，会带来几个问题：

```text
内存持续增长
排序成本变高
setData / update 成本变高
React 状态变大
图表渲染压力增加
移动端更容易卡顿
```

所以在分时线场景中，固定展示最近 N 个点是合理的。

这个项目选择 300 个点，相当于一个固定窗口：

```text
只关心最近行情
不做长周期历史回放
保证图表轻量稳定
```text

如果后续要支持 1m、5m、15m、1h 这种标准 K 线周期，就可以把 300 抽成配置：

```ts
const MAX_POINTS = 300;
```

甚至根据周期动态调整：

```text
1s 分时线：保留 300 点
1m K线：保留 500 根
5m K线：保留 1000 根
```text

---

## 八、图表组件如何渲染数据

图表渲染由 `ProChart` 组件完成。

它使用了 `lightweight-charts`：

```ts
createChart(...)
addAreaSeries(...)
seriesRef.current.setData(sortedData)
seriesRef.current.update(...)
```

组件接收的数据是：

```ts
interface LightweightChartProps {
  data: KlineData;
  height?: number;
  trend?: "Up" | "Down" | "Equal";
}
```text

初始化图表时，需要把项目里的 `KlineData` 转成 lightweight-charts 的 AreaSeries 数据格式：

```ts
const sortedData = data.timestamp
  .map((time, index) => ({
    time: time as UTCTimestamp,
    value: parseFloat(data.spot_price[index]),
  }))
  .sort((a, b) => a.time - b.time);
```

AreaSeries 需要的数据格式是：

```ts
{
  time: UTCTimestamp;
  value: number;
}
```text

所以这里做了两件事：

```text
timestamp + spot_price 并行数组
→ 转成 { time, value } 对象数组
→ 按 time 升序排序
```

然后初始化写入：

```ts
seriesRef.current.setData(sortedData);
```text

这一步适合首次加载，也适合整段数据重新初始化。

---

## 九、为什么初始化用 setData，实时更新用 update

在 lightweight-charts 中，`setData` 和 `update` 的职责不同。

```text
setData：写入一整段数据
update：更新或追加最新一个点
```

项目中初始化时使用：

```ts
seriesRef.current.setData(sortedData);
```text

后续实时更新时使用：

```ts
seriesRef.current.update({
  time: lastPoint.time as UTCTimestamp,
  value: lastPoint.value,
});
```

这是非常关键的性能点。

如果每次 SSE 推送都调用 `setData`，就相当于每次都把最近 300 个点重新塞给图表。虽然 300 个点不算特别多，但在高频行情和移动端场景下，仍然没有必要。

更合理的方式是：

```text
第一次：setData 初始化完整数据
后续：update 最新点
```tsx

这也是自研实时行情图表里最重要的优化之一。

---

## 十、如何判断是否需要 update

项目里用 `lastTimeRef` 记录当前图表最后一个点的时间：

```ts
const lastTimeRef = useRef<number>(0);
```

每次 data 更新后，取排序后的最新点：

```ts
const lastPoint = sortedData[sortedData.length - 1];
```text

然后判断：

```ts
if (lastPoint.time > lastTimeRef.current) {
  seriesRef.current.update({
    time: lastPoint.time as UTCTimestamp,
    value: lastPoint.value,
  });

  lastTimeRef.current = lastPoint.time;
}
```

这段逻辑的含义是：

```text
只有出现更晚的 timestamp
才追加新的图表点
```text

这样可以避免同一个时间点被重复 update。

不过这里也有一个需要注意的地方：
如果后端会对同一个 timestamp 的价格做修正，那么 `lastPoint.time === lastTimeRef.current` 时，其实也可能需要更新 value。

也就是说，当前策略适合：

```text
只追加新点
不处理同一时间点价格修正
```

如果业务需要修正当前点，可以改成：

```text
time > lastTime：追加新点
time === lastTime 且 value 变化：更新当前点
```tsx

这在标准 OHLC K 线里尤其常见。
例如一分钟 K 线在这一分钟内会不断变化，但 timestamp 不变，open/high/low/close 会更新。此时不能只判断 `time > lastTime`，否则当前蜡烛不会实时变化。

---

## 十一、React 中为什么要用 useRef 保存图表实例

`ProChart` 中有几个重要 ref：

```ts
const chartContainerRef = useRef<HTMLDivElement>(null);
const chartRef = useRef<IChartApi | null>(null);
const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
const lastTimeRef = useRef<number>(0);
const hoveredPointIndexRef = useRef<number | null>(null);
```

这些状态都不适合放在 `useState` 里。

原因是：

```text
chart 实例变化不需要触发 React 重新渲染
series 实例是第三方库对象，不是页面展示状态
lastTime 只是跨 render 记住上一次时间点
hoveredPointIndex 是交互临时状态
```tsx

如果把这些放进 `useState`，每次变化都会触发 React render，反而增加性能成本。

在图表类组件中，一个常见原则是：

```text
React 负责组件生命周期
lightweight-charts 负责图表内部渲染
第三方实例用 useRef 持有
不要把高频图表细节全部交给 React state
```

这是交易图表性能优化的基础思路。

---

## 十二、图表生命周期如何管理

由于 lightweight-charts 依赖真实 DOM，所以组件必须是 Client Component：

```ts
"use client";
```tsx

初始化图表放在 `useEffect` 中：

```ts
useEffect(() => {
  if (!chartContainerRef.current) return;

  chartRef.current = createChart(chartContainerRef.current, options);
  seriesRef.current = chartRef.current.addAreaSeries(seriesOptions);

  return () => {
    if (chartRef.current) {
      chartRef.current.remove();
    }
  };
}, []);
```

这里有两个重点。

第一，不能在服务端创建图表。
因为服务端没有真实 DOM，`createChart` 必须等浏览器环境下 ref 挂载完成后才能执行。

第二，卸载时必须 `chart.remove()`。
否则 lightweight-charts 内部创建的 DOM、事件监听、canvas 资源可能残留，造成内存泄漏。

项目中还监听了 resize：

```ts
window.addEventListener("resize", handleResize);
```text

所以清理时也要：

```ts
window.removeEventListener("resize", handleResize);
```

完整生命周期是：

```text
组件挂载
→ 获取 div DOM
→ createChart
→ addAreaSeries
→ setData
→ 监听 resize / crosshair
→ 数据更新 update
→ 组件卸载 remove chart + remove listener
```text

这就是 React 中落地第三方图表库的标准方式。

---

## 十三、价格精度如何根据交易标的动态控制

项目里会根据当前标的控制价格展示精度：

```ts
priceFormat: {
  type: 'price',
  precision: currentUnderlyingIndex === UnderlyingE.BTC ? 2 : 4,
  minMove: currentUnderlyingIndex === UnderlyingE.BTC ? 0.01 : 0.0001,
}
```

这也是交易类项目里的常见需求。

不同资产价格精度不同：

```text
BTC：价格较高，通常展示 2 位小数
ETH：可以展示 2 或 4 位
小币种：可能需要 4、6、8 位
期权价格 / 波动率：可能有自己的精度规则
```text

所以图表组件不能把价格精度写死。
更好的方式是根据 symbol / underlying / instrument 配置动态生成。

在当前项目里，精度只判断 BTC 和非 BTC。
如果后续标的更多，可以抽成配置表：

```ts
const PRICE_FORMAT_MAP = {
  BTC: { precision: 2, minMove: 0.01 },
  ETH: { precision: 4, minMove: 0.0001 },
  SOL: { precision: 4, minMove: 0.0001 },
};
```

这样扩展性会更好。

---

## 十四、resize 如何处理

lightweight-charts 不会自动感知外层容器宽度变化，所以项目里手动监听窗口 resize：

```ts
const handleResize = () => {
  if (chartContainerRef.current && chartRef.current) {
    chartRef.current.applyOptions({
      width: chartContainerRef.current.clientWidth,
    });

    chartRef.current.timeScale().setVisibleLogicalRange({
      from: 0,
      to: 300,
    });
  }
};
```text

这段逻辑负责：

```text
读取当前容器宽度
→ 更新 chart width
→ 重新设置可见范围
```

在真实项目中，还可以进一步优化：

```text
用 ResizeObserver 监听容器尺寸，而不是只监听 window resize
对 resize 做 debounce
页面隐藏时暂停不必要更新
移动端横竖屏切换时重新 fitContent
```text

如果图表容器宽度变化不是由浏览器窗口变化引起，而是由侧边栏展开、tab 切换、父容器布局变化引起，那么 `ResizeObserver` 会比 `window.resize` 更准确。

---

## 十五、crosshair 交互如何维护

项目里监听了 crosshair 移动：

```ts
chartRef.current.subscribeCrosshairMove((param) => {
  if (param.time) {
    const sortedData = data.timestamp
      .map((time, index) => ({
        time: time as UTCTimestamp,
        value: parseFloat(data.spot_price[index]),
        index,
      }))
      .sort((a, b) => a.time - b.time);

    const hoveredPointIndex = sortedData.findIndex(
      (point) => point.time === (param.time as number),
    );

    if (hoveredPointIndex !== -1) {
      hoveredPointIndexRef.current = hoveredPointIndex;
    }
  }
});
```

它的作用是记录用户当前 hover 的点。

后续如果实时数据追加了新点，会尝试把 crosshair 移动到下一个点：

```ts
chartRef.current.setCrosshairPosition(
  sortedData[nextIndex].value,
  sortedData[nextIndex].time as UTCTimestamp,
  seriesRef.current,
);
```text

这个逻辑是为了提升实时图表的交互体验。

如果用户正在查看某个位置，图表一直更新，crosshair 可能会丢失或停留在旧位置。
通过记录当前 hover index，可以在数据追加时尽量维持交互连续性。

不过这类逻辑也需要谨慎。
如果用户希望停留查看历史某一点，自动移动 crosshair 可能反而干扰用户。真实产品中可以根据需求决定：

```text
用户 hover 历史点时不自动移动
用户 hover 最新点时才跟随
鼠标离开图表后恢复自动跟随
```

---

## 十六、这个实现和标准 OHLC K 线有什么区别

当前 Mini App 的实现是分时线，不是标准 K 线。

当前数据：

```ts
{
  timestamp: number[];
  spot_price: string[];
}
```text

lightweight-charts 使用的是：

```ts
addAreaSeries();
```

转换后数据是：

```ts
{
  time: UTCTimestamp;
  value: number;
}
```text

标准 OHLC K 线则需要：

```ts
{
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
}
```

并且图表需要使用：

```ts
addCandlestickSeries();
```text

两者区别可以总结为：

| 对比项   | 当前分时线                  | 标准 K 线                       |
| -------- | --------------------------- | ------------------------------- |
| 数据字段 | time + price                | time + open/high/low/close      |
| 图表类型 | AreaSeries                  | CandlestickSeries               |
| 展示内容 | 价格走势                    | 每个周期内的开高低收            |
| 实时更新 | 追加最新价格点              | 更新当前 candle 或追加新 candle |
| 适合场景 | Mini App 简洁行情、价格走势 | 专业交易页、技术分析            |

如果后续要从分时线升级成标准 K 线，需要后端或前端聚合出 OHLC 数据。

例如从 tick 数据聚合 1 分钟 K 线：

```text
某一分钟内：
open = 第一笔价格
high = 最高价格
low = 最低价格
close = 最后一笔价格
volume = 成交量累加
```

前端更新时也要改成：

```text
如果新 candle.time === lastCandle.time
→ update 当前 candle

如果新 candle.time > lastCandle.time
→ push 新 candle
```text

这和当前只追加 `time + value` 的分时线逻辑不同。

---

## 十七、真实项目中的推荐模块拆分

如果要在 React 项目里比较工程化地落地自研 K 线 / 分时线，可以拆成下面几个模块。

### 1. 行情连接层

负责连接 SSE 或 WebSocket。

```text
usePublicSSE
useMarketWebSocket
useKlineStream
```

职责：

```text
建立连接
订阅 symbol / channel
解析服务端消息
断线重连
页面卸载时关闭连接
```text

### 2. 数据状态层

负责保存和合并数据。

```text
useSetTsLineMap
tsLineMapAtom
klineMapAtom
```

职责：

```text
按 symbol 隔离数据
合并历史和增量
去重排序
截断最大长度
清空缓存
```text

### 3. 数据转换层

负责把业务数据转成图表格式。

```text
timestamp + spot_price
→ { time, value }

OHLC
→ { time, open, high, low, close }
```

这一层最好抽成纯函数，方便测试。

### 4. 图表渲染层

负责 createChart、addSeries、setData、update。

```text
ProChart
KlineChart
AreaChart
CandlestickChart
```text

职责：

```text
创建图表实例
创建 series
设置样式
初始化数据
增量更新
处理 resize
清理资源
```

### 5. 页面组合层

负责把当前交易对、图表数据和 UI 组合起来。

```text
ChartContainer
TradingPage
MarketDetailPage
```text

职责：

```text
读取当前 symbol
从 atom / store 中取当前 symbol 数据
传给图表组件
处理 loading / empty
切换交易对时重置或切换数据
```

完整结构可以是：

```text
hooks/sse/usePublicSSE.ts
hooks/useSetTsLineMap.ts
components/Charts/ProChart.tsx
components/Charts/ChartContainer.tsx
pages/TradingPage.tsx
```text

---

## 十八、自研图表落地时容易踩的坑

### 1. 把高频数据直接放 React state

高频行情如果每条都 `setState`，会导致组件频繁 render。

更好的方式是：

```text
行情数据进入 atom / store
图表实例用 ref 更新
必要时批处理或节流
```

### 2. 每次更新都 setData

实时行情应该优先 `update`，不是每次都 `setData`。

```text
初始化：setData
实时：update
```tsx

### 3. 没有按 symbol 隔离状态

交易页切换标的时，如果没有 symbol 维度，很容易数据串台。

正确做法：

```text
Map<symbol, klineData>
queryKey 带 symbol
SSE payload 校验 symbol
```

### 4. 没有清理 chart 实例

组件卸载时不 `chart.remove()`，可能导致内存泄漏。

### 5. 没有处理数组长度不一致

当前 `timestamp` 和 `spot_price` 是并行数组，必须保证长度一致。
如果后端异常，前端最好做兜底。

### 6. 没有处理同一时间点更新

对于标准 K 线，当前 candle 会持续变化。
如果只处理 `time > lastTime`，当前 candle 就不会实时更新。

### 7. 依赖数组导致图表频繁重建

如果初始化 effect 依赖 `data.timestamp` 和 `data.spot_price`，而父组件每次都传新数组引用，就可能频繁重建图表。

更稳的方式是：

```text
初始化 effect 只负责建图
数据 effect 单独负责 setData / update
必要时用 memo 稳定数据引用
```tsx

---

## 十九、面试中可以怎么讲这个模块

如果面试官问：你们项目里的 K 线图表是怎么做的？

可以这样回答：

```text
我们 Mini App 里没有直接使用完整 TradingView Widget，而是用 lightweight-charts 自研了一个轻量实时分时线图表。

数据来源是公共行情 SSE。SSE 会推送 tsline 数据，数据结构主要是 timestamp 数组和 spot_price 数组。前端收到数据后，不是直接渲染，而是先进入 Jotai 状态层。

我们用一个 Map 按交易标的维护分时线数据，比如 BTC、ETH 各自一份。每次收到新的 tsline 数据，会先和已有数据合并，然后按 timestamp 去重、排序，并且只保留最近 300 个点，避免长时间运行导致内存和渲染压力变大。

图表层使用 lightweight-charts 的 createChart 和 addAreaSeries。初始化时把 timestamp + spot_price 转成 { time, value }，通过 setData 写入完整数据。后续实时更新时，只取最新点调用 series.update，避免每次都整段 setData。

在 React 生命周期上，chart 和 series 实例都用 useRef 保存，初始化和销毁放在 useEffect 里，组件卸载时会 remove chart，同时清理 resize 监听，避免内存泄漏。

所以这个模块的核心不是单纯画图，而是把 SSE 实时数据、前端状态管理、图表数据清洗和 lightweight-charts 增量渲染串起来。
```

这个回答比较稳，因为它同时讲了：

```text
数据来源
状态管理
数据处理
图表库
实时更新
性能优化
生命周期
```tsx

比只说“我们用了 lightweight-charts”强很多。

---

## 二十、总结

在 React 项目中落地自研 K 线 / 分时线图表，核心不是会调用几个 API，而是要把完整数据链路设计清楚。

这个 Mini App 的实现可以总结成：

```text
SSE 提供实时 tsline 数据
→ Jotai atom 按标的缓存数据
→ useSetTsLineMap 合并、去重、排序、截断
→ ProChart 使用 lightweight-charts 渲染 AreaSeries
→ 初始化用 setData
→ 实时更新用 update
→ useRef 管理 chart / series 实例
→ useEffect 负责生命周期和清理
```

这种方案的优势是轻量、可控、适合移动端和 Mini App 场景。
它不依赖完整 TradingView Widget，而是把行情数据和图表展示掌握在前端自己手里。

不过也要明确边界：当前实现不是标准 OHLC K 线，而是 `time + price` 的分时线。如果要升级为真正的蜡烛图 K 线，需要数据层支持 open/high/low/close，并且图表层从 `AreaSeries` 切换到 `CandlestickSeries`，实时更新逻辑也要支持“更新当前 candle”和“追加新 candle”两种情况。

真正工程化的自研图表模块，应该拆成：

```text
行情连接层
数据状态层
数据清洗层
图表渲染层
页面组合层
```

只要这条链路设计清楚，后续无论是接入分时线、蜡烛图、指标线、买卖点 marker，还是做多周期 K 线，都可以在同一套架构上继续扩展。
