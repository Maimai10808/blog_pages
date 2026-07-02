# 使用 TradingView Lightweight Charts 实现技术指标：从 SMA 到实时 ZigZag

在交易类前端项目中，行情图表是非常核心的模块。无论是交易所、期权平台、DeFi 看板，还是普通的行情详情页，只要涉及价格走势展示，基本都会遇到一个问题：如何在图表上叠加各种技术指标？

TradingView 的 Lightweight Charts 是一个非常适合前端项目使用的轻量图表库。它体积小、性能好、TypeScript 类型完善，适合用来渲染 K 线、面积图、折线图、柱状图，以及各种自定义指标。

本文会围绕 Lightweight Charts 的 TypeScript API，总结如何实现常见技术指标，包括：

- SMA 这类叠加在主图上的线性指标；
- RSI 这类显示在副图 pane 中的指标；
- ZigZag 这类带有 marker 标记的指标；
- SuperTrend 这类存在断点的分段指标；
- MACD 这类 histogram 柱状指标；
- 实时 WebSocket 数据下的图表增量更新。

核心思想其实很简单：

**Lightweight Charts 不关心你计算的指标叫什么，它只关心你传进去的数据是什么形状，以及你用什么 series 渲染。**

---

## 一、Lightweight Charts 的基础结构

使用 Lightweight Charts 时，最基本的结构是：

```text
HTML 容器 div
  ↓
createChart 创建 chart 实例
  ↓
addSeries 添加图表序列
  ↓
setData 写入历史数据
  ↓
update 增量更新实时数据
```tsx

也就是说，图表本身需要挂载到一个真实的 DOM 容器上。无论项目是 React、Vue、Next.js 还是原生 TypeScript，本质上都需要先准备一个 div：

```html
<div id="chart"></div>
```

然后在 TypeScript 中创建 chart：

```ts
import { createChart } from "lightweight-charts";

const container = document.getElementById("chart")!;

const chart = createChart(container, {
  width: container.clientWidth,
  height: 400,
});
```text

`createChart` 的第一个参数是图表挂载容器，第二个参数是配置项，主要用于控制样式、时间轴、价格轴、背景颜色、网格线、crosshair 等。

Lightweight Charts 的 TypeScript 类型非常完善。实际开发时，如果不知道某个配置项有哪些选项，可以直接在 VS Code 中通过 “Go to Definition” 查看类型定义。这一点对前端开发非常友好，也很适合借助 AI 辅助阅读配置类型。

---

## 二、Chart 和 Series 的关系

Lightweight Charts 中有两个很重要的概念：

```text
chart：整张图表实例
series：图表上的某一种数据序列
```

一张 chart 上可以添加多个 series。

例如一个最常见的 SMA 图表，通常会包含：

```text
CandlestickSeries：展示 K 线
LineSeries：展示 SMA 均线
```text

示例：

```ts
const candleSeries = chart.addCandlestickSeries();
const smaSeries = chart.addLineSeries({
  color: "blue",
  lineWidth: 2,
});
```

这里需要理解一点：

**SMA 本身不是 Lightweight Charts 内置的特殊指标。**

对 Lightweight Charts 来说，它只是一个 LineSeries。
至于 SMA 的值怎么计算，是你自己的业务逻辑。图表库只负责把 `{ time, value }` 这样的数据画成一条线。

---

## 三、历史数据：setData

如果我们有一段固定的历史数据，比如从 Binance 下载的 CSV，里面包含 open、high、low、close，就可以用 `setData` 一次性写入图表。

K 线数据格式通常是：

```ts
const candleData = [
  {
    time: 1710000000,
    open: 50000,
    high: 50500,
    low: 49800,
    close: 50200,
  },
];
```text

然后：

```ts
candleSeries.setData(candleData);
```

对于 LineSeries，例如 SMA，它的数据格式更简单：

```ts
const smaData = [
  {
    time: 1710000000,
    value: 50100,
  },
];
```text

然后：

```ts
smaSeries.setData(smaData);
```

所以，不同 series 对数据格式的要求不同：

```text
CandlestickSeries:
time + open + high + low + close

LineSeries:
time + value

HistogramSeries:
time + value + color
```text

这是学习 Lightweight Charts 最关键的点之一：
**先确定你要画什么类型的图，再准备它要求的数据结构。**

---

## 四、实现 SMA：主图叠加线

SMA 是最简单的一类指标，因为它就是一条线。

实现流程：

```text
加载 K 线数据
  ↓
candleSeries.setData(candleData)
  ↓
根据 candleData 计算 SMA
  ↓
smaSeries.setData(smaData)
```

示例：

```ts
function calculateSMA(data: CandlestickData[], period: number) {
  const result = [];

  for (let i = period - 1; i < data.length; i++) {
    const slice = data.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, item) => acc + item.close, 0);

    result.push({
      time: data[i].time,
      value: sum / period,
    });
  }

  return result;
}
```text

然后：

```ts
const smaData = calculateSMA(candleData, 20);
smaSeries.setData(smaData);
```

这个模式可以扩展到很多指标：

- MA；
- EMA；
- Bollinger Bands；
- VWAP；
- 自定义趋势线。

只要最终能转成 `{ time, value }`，就可以用 LineSeries 画出来。

---

## 五、实现 RSI：副图 Pane

有些指标不适合叠加在价格主图上，比如 RSI、MACD、KDJ 等。
它们有自己的数值范围和 Y 轴，所以更适合放在副图中。

Lightweight Charts 支持 pane，也就是一张 chart 中的多个垂直区域。

创建副图的关键在于添加 series 时指定 pane index：

```ts
const candleSeries = chart.addCandlestickSeries();

const rsiSeries = chart.addLineSeries(
  {
    color: "purple",
    lineWidth: 2,
  },
  1,
);
```text

默认主图 pane index 是 `0`。
如果把 RSI 放到 `1`，Lightweight Charts 会自动创建一个新的副图区域。

结构可以理解为：

```text
chart
  ├─ pane 0：K 线主图
  └─ pane 1：RSI 副图
```

RSI 仍然是 LineSeries，只是它被放到了另一个 pane。

RSI 数据格式依然是：

```ts
[
  {
    time: 1710000000,
    value: 65.3,
  },
];
```text

---

## 六、添加 Price Line：超买超卖线

RSI 常见的辅助线包括：

```text
70：超买线
30：超卖线
```

这类线可以通过 `createPriceLine` 添加：

```ts
rsiSeries.createPriceLine({
  price: 70,
  color: "red",
  lineWidth: 1,
  lineStyle: 2,
  axisLabelVisible: true,
  title: "Overbought",
});

rsiSeries.createPriceLine({
  price: 30,
  color: "green",
  lineWidth: 1,
  lineStyle: 2,
  axisLabelVisible: true,
  title: "Oversold",
});
```text

虽然方法名叫 `createPriceLine`，但这里的 `price` 并不一定是真正的价格。
对于 RSI 来说，它就是 RSI 数值。

Price Line 不只适合 RSI，也可以用于：

- 支撑位；
- 阻力位；
- 止盈线；
- 止损线；
- 强平线；
- ZigZag 确认线。

---

## 七、实现 ZigZag：Markers 标记点

ZigZag 指标通常需要在图表上标记高点和低点。
这类视觉效果可以用 series markers 实现。

Marker 数据通常包含：

```ts
{
  time: 1710000000,
  position: 'aboveBar',
  color: 'red',
  shape: 'arrowDown',
  text: 'High',
}
```

添加 markers：

```ts
const markers = pivots.map((pivot) => ({
  time: pivot.time,
  position: pivot.type === "high" ? "aboveBar" : "belowBar",
  color: pivot.type === "high" ? "red" : "green",
  shape: pivot.type === "high" ? "arrowDown" : "arrowUp",
  text: pivot.type === "high" ? "H" : "L",
}));

createSeriesMarkers(candleSeries, markers);
```text

Markers 可以用于很多场景：

- ZigZag 高低点；
- 买入点；
- 卖出点；
- 回测系统中的入场/离场；
- 止损触发点；
- 策略信号提示。

需要注意的是，marker 只是图表标记，不参与指标计算。
高点、低点、买卖点的判断逻辑，需要你自己实现。

---

## 八、实现 SuperTrend：分段线的处理

SuperTrend 这类指标有一个特殊点：它可能是不连续的。

例如上涨趋势画绿色线，下跌趋势画红色线，中间可能存在断点。
但 Lightweight Charts 默认的 LineSeries 会把点连接起来，如果直接传入不连续数据，可能会把不该连接的地方连上。

一种常见处理方式是：

```text
把连续的趋势段拆成多个小 LineSeries
每一段单独 setData
```

比如：

```ts
segments.forEach((segment) => {
  const series = chart.addLineSeries({
    color: segment.trend === "up" ? "green" : "red",
    lineWidth: 2,
  });

  series.setData(segment.data);
});
```text

这种方式看起来有点绕，但在需要绘制“不连续线段”的场景下很实用。

适用场景包括：

- SuperTrend；
- 分段趋势线；
- 特定条件触发后的区间线；
- 策略状态切换线；
- 多段支撑阻力线。

缺点是 series 数量可能变多，需要注意性能和资源清理。

---

## 九、实现 MACD：HistogramSeries

MACD 通常由三部分组成：

```text
DIF 线
DEA 线
MACD 柱状图
```

其中柱状图可以用 HistogramSeries 渲染。

```ts
const histogramSeries = chart.addHistogramSeries(
  {
    priceFormat: {
      type: "price",
      precision: 4,
      minMove: 0.0001,
    },
  },
  1,
);
```text

Histogram 数据格式通常是：

```ts
[
  {
    time: 1710000000,
    value: 0.0032,
    color: "green",
  },
  {
    time: 1710000060,
    value: -0.0018,
    color: "red",
  },
];
```

和 LineSeries 很像，都是 `time + value`。
区别是 HistogramSeries 可以给每个柱子单独设置 color。

```ts
histogramSeries.setData(macdHistogramData);
```text

MACD 的两个线也可以继续用 LineSeries：

```ts
const difSeries = chart.addLineSeries({}, 1);
const deaSeries = chart.addLineSeries({}, 1);
```

这样就能在同一个副图 pane 中同时展示 MACD 柱状图和两条指标线。

---

## 十、实时数据：update 而不是 setData

历史图表通常使用 `setData`。
实时图表则应该优先使用 `update`。

区别是：

```text
setData：一次性替换整段数据
update：只更新最新一个点
```text

如果每次 WebSocket 推送都调用 `setData`，图表会不断重绘整段数据，性能很差。

实时行情更推荐：

```ts
candleSeries.update(candle);
smaSeries.update(smaPoint);
```

完整流程通常是：

```text
先请求历史 K 线
  ↓
setData 初始化 candleSeries
  ↓
根据历史数据计算指标
  ↓
setData 初始化指标线
  ↓
连接 WebSocket
  ↓
收到新 candle
  ↓
更新本地 candleData 数组
  ↓
candleSeries.update(candle)
  ↓
重新计算最新指标点
  ↓
indicatorSeries.update(indicatorPoint)
```text

---

## 十一、实时 K 线的更新逻辑

实时 K 线推送时，需要判断当前推送属于：

```text
更新当前这根 K 线
还是追加一根新 K 线
```

常见逻辑是：

```ts
const lastCandle = candles[candles.length - 1];

if (newCandle.time === lastCandle.time) {
  candles[candles.length - 1] = newCandle;
} else {
  candles.push(newCandle);
}

candleSeries.update(newCandle);
```text

这一步不仅是为了图表更新，也是为了后续指标计算。

例如 SMA 需要最近 N 根 K 线，如果本地 candles 数组没有同步维护，就无法正确计算最新 SMA。

对于 SMA 的实时更新：

```ts
const latestSMA = calculateLatestSMA(candles, 20);

smaSeries.update({
  time: newCandle.time,
  value: latestSMA,
});
```

这就是从历史指标变成实时指标的关键。

---

## 十二、实时更新 Markers

历史 ZigZag 可以一次性创建 markers。
但实时 ZigZag 会不断产生新的高低点，因此 markers 也要更新。

常见做法是保存 marker API 实例：

```ts
const markerApi = createSeriesMarkers(candleSeries, initialMarkers);
```text

后续更新时：

```ts
markerApi.setMarkers(newMarkers);
```

需要注意：

**通常不是追加单个 marker，而是重新设置完整 markers 数组。**

也就是说，你需要自己维护当前完整的 marker 列表：

```ts
markers.push(newMarker);
markerApi.setMarkers(markers);
```text

这种方式更可控，也更适合复杂指标，比如 ZigZag、策略信号、回测标记等。

---

## 十三、实时更新 Price Line

对于 ZigZag 这类指标，可能会有一条“确认线”。
当价格穿过某个阈值时，前一个高点或低点才被确认。

这类线可以通过保存 price line 实例来动态更新：

```ts
const confirmationLine = series.createPriceLine({
  price: initialPrice,
  color: "orange",
  lineWidth: 1,
});
```

后续只需要：

```ts
confirmationLine.applyOptions({
  price: nextConfirmationPrice,
});
```text

这类用法适合：

- ZigZag 确认线；
- 止盈止损线；
- 强平线；
- 动态支撑阻力；
- 策略阈值线。

---

## 十四、如何理解 Lightweight Charts 的扩展能力

实现各种指标时，可以把 Lightweight Charts 看成一个“渲染层”。

它不负责：

```text
计算 SMA
计算 RSI
计算 MACD
计算 ZigZag
判断买卖信号
判断趋势状态
```

它负责：

```text
把 CandlestickData 画成 K 线
把 LineData 画成线
把 HistogramData 画成柱状图
把 Marker 画成图表标记
把 PriceLine 画成水平线
```text

所以技术指标实现可以拆成两层：

```text
指标计算层：
负责把原始行情数据转成指标数据

图表渲染层：
负责用合适的 series 把指标数据画出来
```

这种拆分在真实项目中非常重要。

例如：

```text
行情数据来自 WebSocket / SSE / REST
  ↓
前端维护 candleData / tickData
  ↓
指标函数 calculateSMA / calculateRSI / calculateMACD
  ↓
转换成 Lightweight Charts 需要的数据格式
  ↓
series.setData / series.update
```text

---

## 十五、在 React / Next.js 中落地时要注意什么

在 React 或 Next.js 中使用 Lightweight Charts，需要特别注意生命周期。

因为 Lightweight Charts 依赖 DOM，所以在 Next.js App Router 中必须使用 Client Component：

```ts
"use client";
```

组件中通常会用：

```ts
const containerRef = useRef<HTMLDivElement>(null);
const chartRef = useRef<IChartApi | null>(null);
const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
```tsx

初始化图表：

```ts
useEffect(() => {
  if (!containerRef.current) return;

  const chart = createChart(containerRef.current);
  chartRef.current = chart;

  const series = chart.addLineSeries();
  seriesRef.current = series;

  return () => {
    chart.remove();
  };
}, []);
```

实时更新：

```ts
useEffect(() => {
  if (!seriesRef.current || !latestPoint) return;

  seriesRef.current.update(latestPoint);
}, [latestPoint]);
```tsx

关键点是：

```text
图表实例不要放 useState
chart / series 实例用 useRef 保存
初始化和销毁放 useEffect
组件卸载时 chart.remove()
实时数据尽量 update，不要频繁 setData
```

---

## 十六、总结

Lightweight Charts 实现技术指标的核心并不复杂。

可以总结成几句话：

第一，图表库只负责渲染，不负责计算指标。
第二，主图指标通常用 LineSeries 叠加在 CandlestickSeries 上。
第三，RSI、MACD 这类指标可以通过 pane index 放到副图。
第四，买卖点、高低点、策略信号可以用 markers。
第五，支撑阻力、超买超卖、确认线可以用 price line。
第六，实时行情初始化用 setData，后续增量更新用 update。
第七，不连续指标可以拆成多个小 series 分段绘制。

如果掌握了这些基础能力，基本上大多数交易指标都可以实现出来：

```text
SMA / EMA / Bollinger Bands
RSI / MACD / KDJ
ZigZag / SuperTrend
支撑阻力
买卖点信号
回测入场离场标记
实时策略提示
```text

对于前端开发来说，真正重要的不是记住每个指标公式，而是理解：

```text
原始行情数据如何维护
指标数据如何计算
数据如何转换成 series 需要的格式
历史数据如何 setData
实时数据如何 update
图表实例如何在 React 生命周期中正确创建和销毁
```

只要这条链路打通，Lightweight Charts 就可以成为一个非常灵活的交易图表渲染工具。
