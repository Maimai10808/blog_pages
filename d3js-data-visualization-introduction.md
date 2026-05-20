# D3.js 入门：它不只是画图，更是把数据映射成可视化图形的工具

很多前端开发者第一次接触 D3.js，通常会有一个误解：D3 是不是和 ECharts、Chart.js 一样，就是一个“图表库”？

这个理解不算完全错，但不够准确。ECharts 更像是“给你一套现成图表配置”，你传入 option，它帮你画折线图、柱状图、饼图。而 D3.js 更底层，它提供的是一套“数据驱动图形生成”的能力。你需要自己决定 SVG 怎么画、坐标怎么映射、线条怎么生成、柱子怎么布局、鼠标交互怎么处理。

也正因为如此，D3.js 初看会比普通图表库难一些。但一旦理解它的核心思路，就会发现它非常适合做高度定制化的数据可视化组件，比如金融行情图、期权收益曲线、地图、网络关系图、复杂仪表盘、自定义交互图表等。

---

## 1. D3.js 解决了什么问题

在没有 D3.js 之前，前端要做数据可视化大致有几种方式。

最简单的是直接用现成图表库，比如 ECharts、Chart.js、Recharts。它们的优点是上手快，配置简单，适合常规业务图表。比如后台管理里的折线图、柱状图、饼图，用这些库基本够用。

但问题是，一旦需求变复杂，普通图表库就会开始受限。比如：

- 你想画一条根据盈亏正负自动变色的 PnL 曲线。
- 你想在某个价格点上显示动态 tooltip。
- 你想让坐标轴、刻度、网格线、标记线全部按业务规则自定义。
- 你想把鼠标移动的位置映射回真实价格，并计算对应收益。
- 你想做一个不规则的 SVG 可视化组件，而不是标准图表。

这类需求的核心不只是“画图”，而是把一组数据映射成屏幕上的图形元素。D3.js 解决的正是这个问题。

简单理解，D3.js 的核心价值是：

> 把数据转换成可视化图形。

这里的“转换”包括很多步骤：计算最大值最小值、定义坐标比例尺、生成 SVG path、创建坐标轴、绑定鼠标事件、处理 tooltip、根据数据变化重新计算图形等。

所以 D3.js 适合这些场景：

- 高度定制化图表。
- 金融、交易、行情、风控类可视化。
- 复杂 SVG 图形。
- 数据驱动动画。
- 地图、关系网络、层级结构图。
- 普通图表库很难满足的交互需求。

但它不适合所有场景。如果只是普通的后台柱状图、折线图、环形图，直接用 ECharts 或 Recharts 会更快。D3.js 的优势在于自由度，不在于“少写代码”。

---

## 2. D3.js 是什么：基本概念介绍

D3.js 的全称是 Data-Driven Documents，意思是“数据驱动文档”。

这里的 document 可以理解为浏览器里的 DOM、SVG、Canvas 等可视化载体。D3 可以操作 DOM，也可以生成 SVG 路径、坐标轴、比例尺、颜色映射等。

初学 D3，先理解几个核心概念就够了。

### 2.1 data：要展示的数据

比如一组折线图数据：

```ts
const data = [
  { label: 0, value: 3 },
  { label: 1, value: 6 },
  { label: 2, value: 10 },
];
```

### 2.2 scale：比例尺

浏览器画图用的是像素坐标，但业务数据不是像素。比如价格可能是 `60000`，收益可能是 `-200`，时间可能是 `2026-05-20`。D3 的 scale 负责把这些真实数据映射成屏幕坐标。

```ts
const xScale = d3.scaleLinear()
  .domain([0, 20])
  .range([0, 400]);
```

这段代码的意思是：把真实数据 `0` 到 `20` 映射到屏幕上的 `0` 到 `400` 像素。

### 2.3 axis：坐标轴

比例尺只是数据到像素的映射，axis 才是把这个比例尺画成可见的坐标轴。

```ts
const xAxis = d3.axisBottom(xScale);
```

### 2.4 shape：图形生成器

D3 可以根据数据生成 SVG path。折线图常用的是 `d3.line()`：

```ts
const line = d3.line<{ label: number; value: number }>()
  .x(d => xScale(d.label))
  .y(d => yScale(d.value));
```

### 2.5 selection：选择 DOM 元素

很多 D3 教程会写：

```ts
d3.select('#container')
  .append('svg');
```

这表示选中某个 DOM 节点，然后往里面插入 SVG。

不过在 React 项目里，这一点要特别注意。因为 React 自己也负责 DOM 渲染，如果再让 D3 大量直接操作 DOM，二者职责会混在一起。更推荐的方式是：让 D3 负责计算，让 React 负责渲染。

---

## 3. 最简单的使用方式

先看一个最小的 D3 折线图例子。这个例子不是最佳工程写法，只是为了理解 D3 的基本流程。

```tsx
import * as d3 from 'd3';
import { useMemo } from 'react';

type Point = {
  x: number;
  y: number;
};

const data: Point[] = [
  { x: 0, y: 10 },
  { x: 1, y: 30 },
  { x: 2, y: 20 },
  { x: 3, y: 50 },
];

export function SimpleLineChart() {
  const width = 400;
  const height = 240;

  const path = useMemo(() => {
    const xScale = d3.scaleLinear()
      .domain([0, 3])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([0, 50])
      .range([height, 0]);

    const line = d3.line<Point>()
      .x(d => xScale(d.x))
      .y(d => yScale(d.y));

    return line(data);
  }, []);

  return (
    <svg width={width} height={height}>
      <path
        d={path ?? ''}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
    </svg>
  );
}
```

这段代码里真正关键的是三件事。

第一，`scaleLinear` 把业务数据映射成像素坐标。

第二，`d3.line()` 根据每个数据点的 x、y 坐标生成 SVG path。

第三，React 最终只负责渲染 `<svg>` 和 `<path>`。

这就是在 React 中使用 D3 的一个重要思路：不要一上来就让 D3 接管 DOM。D3 更适合负责计算图形所需的数据，React 负责把计算结果声明式渲染出来。

---

## 4. D3.js 的核心流程是怎么跑起来的

D3 图表的运行链路可以拆成六步。

### 第一步，准备数据

数据可以来自本地数组，也可以来自接口、CSV、JSON 文件。比如折线图需要一组点，柱状图需要分类和数值，时间序列图需要日期和价格。

### 第二步，定义图表尺寸和边距

SVG 有自己的坐标系统，如果不设置 margin，坐标轴文字、刻度、tooltip 很容易被裁剪掉。

```ts
const margin = { top: 20, right: 20, bottom: 30, left: 40 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;
```

### 第三步，定义 scale

scale 是 D3 的核心。它决定真实数据如何映射成屏幕坐标。

```ts
const xScale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, innerWidth]);

const yScale = d3.scaleLinear()
  .domain([-500, 500])
  .range([innerHeight, 0]);
```

注意 y 轴的 range 通常是 `[height, 0]`，因为 SVG 坐标系的 y 轴是从上往下增加的。

### 第四步，生成图形

折线图用 `d3.line()`，面积图用 `d3.area()`，饼图用 `d3.pie()` 和 `d3.arc()`，柱状图通常自己渲染 `rect`。

```ts
const linePath = d3.line<Point>()
  .x(d => xScale(d.price))
  .y(d => yScale(d.pnl))(data);
```

### 第五步，渲染 SVG

可以用 D3 操作 DOM，也可以用 React 渲染 SVG。React 项目里，更推荐后者。

### 第六步，处理交互

比如鼠标移动时，需要根据鼠标 x 坐标反推出对应的业务数据点：

```ts
const x0 = xScale.invert(mouseX);
```

然后通过 bisector 找到最近的数据点，再更新 tooltip。

---

## 5. 常用 API 和核心能力介绍

### 5.1 scaleLinear：处理连续数值映射

`scaleLinear` 是最常用的比例尺，适合价格、数量、收益、百分比等连续数值。

```ts
const xScale = d3.scaleLinear()
  .domain([minPrice, maxPrice])
  .range([0, width]);
```

`domain` 是真实数据范围，`range` 是屏幕像素范围。

比如价格从 `50000` 到 `70000`，图表宽度是 `400`，那么 D3 会把 `50000` 映射到 `0`，把 `70000` 映射到 `400`，中间价格自动按比例映射。

### 5.2 scaleTime：处理时间序列

如果 x 轴是日期，应该使用 `scaleTime`。

```ts
const xScale = d3.scaleTime()
  .domain(d3.extent(data, d => d.date) as [Date, Date])
  .range([0, width]);
```

它适合行情图、访问量趋势、订单量变化、价格历史走势等时间序列场景。

### 5.3 scaleBand：处理分类数据

柱状图经常用分类数据，比如不同州、不同商品、不同频道。

```ts
const xScale = d3.scaleBand()
  .domain(data.map(d => d.state))
  .range([0, width])
  .padding(0.2);
```

`scaleBand` 会把每个分类分配到一个固定宽度的区间里，适合画柱状图。

### 5.4 d3.line：生成折线 path

折线图的本质是 SVG path。`d3.line()` 会根据数据点生成 path 的 `d` 属性。

```ts
const linePath = d3.line<Point>()
  .x(d => xScale(d.price))
  .y(d => yScale(d.pnl))(data);
```

生成之后可以直接渲染：

```tsx
<path d={linePath ?? ''} fill="none" stroke="currentColor" />
```

### 5.5 d3.axisBottom / d3.axisLeft：生成坐标轴

如果用纯 React 渲染 SVG，也可以自己渲染 tick。但很多场景下，使用 D3 的 axis 更方便。

```ts
const xTicks = xScale.ticks(6);
const yTicks = yScale.ticks(5);
```

在 React 里可以不直接调用 `d3.axisBottom` 操作 DOM，而是用 `ticks()` 拿到刻度数组，然后自己渲染 `<line>` 和 `<text>`。

### 5.6 d3.bisector：查找最近数据点

做 tooltip 时，经常需要根据鼠标位置找到最近的数据点。

```ts
const bisect = d3.bisector<Point, number>(d => d.price).left;
const index = bisect(data, currentPrice);
```

这在金融图表里很常见。鼠标移动到某个价格区域时，需要显示对应价格下的收益、成交量、波动率等信息。

---

## 6. 在真实业务里一般怎么组合使用

D3.js 在真实项目里通常不会单独存在。它经常和 React、SVG、业务计算函数、响应式尺寸测量、tooltip 状态组合使用。

以一个期权 PnL 曲线为例，图表不是简单展示接口返回值，而是要先根据期权腿计算收益数据。

大致流程是：

1. 业务层提供期权 legs。
2. 计算函数根据不同价格点计算 PnL。
3. D3 根据价格范围生成 `xScale`。
4. D3 根据收益范围生成 `yScale`。
5. D3 生成 line path。
6. React 渲染 SVG。
7. 鼠标移动时根据 x 坐标反推价格。
8. 再根据价格计算当前 PnL。
9. tooltip 展示当前价格和收益。

简化代码如下：

```tsx
import * as d3 from 'd3';
import { useMemo, useState } from 'react';

type PnLPoint = {
  price: number;
  pnl: number;
};

type Tooltip = {
  x: number;
  y: number;
  price: number;
  pnl: number;
} | null;

type Props = {
  data: PnLPoint[];
  width: number;
  height: number;
};

export function PnLChart({ data, width, height }: Props) {
  const [tooltip, setTooltip] = useState<Tooltip>(null);

  const { xScale, yScale, linePath } = useMemo(() => {
    const priceExtent = d3.extent(data, d => d.price) as [number, number];
    const pnlExtent = d3.extent(data, d => d.pnl) as [number, number];

    const xScale = d3.scaleLinear()
      .domain(priceExtent)
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(pnlExtent)
      .range([height, 0]);

    const linePath = d3.line<PnLPoint>()
      .x(d => xScale(d.price))
      .y(d => yScale(d.pnl))(data);

    return { xScale, yScale, linePath };
  }, [data, width, height]);

  function handleMouseMove(event: React.MouseEvent<SVGRectElement>) {
    const [mouseX] = d3.pointer(event);
    const price = xScale.invert(mouseX);
    const bisect = d3.bisector<PnLPoint, number>(d => d.price).left;
    const index = bisect(data, price, 1);
    const left = data[index - 1];
    const right = data[index];
    const point =
      !right || price - left.price < right.price - price
        ? left
        : right;

    setTooltip({
      x: xScale(point.price),
      y: yScale(point.pnl),
      price: point.price,
      pnl: point.pnl,
    });
  }

  return (
    <svg width={width} height={height}>
      <path
        d={linePath ?? ''}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />

      {tooltip && (
        <g transform={`translate(${tooltip.x}, ${tooltip.y})`}>
          <circle r={4} fill="currentColor" />
          <text x={8} y={-8} fontSize={12}>
            Price: {tooltip.price.toFixed(2)}, PnL: {tooltip.pnl.toFixed(2)}
          </text>
        </g>
      )}

      <rect
        width={width}
        height={height}
        fill="transparent"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
    </svg>
  );
}
```

这个示例已经接近真实业务里的 D3 使用方式。D3 不负责整个组件，它只负责关键计算：scale、path、pointer、bisector。React 负责状态、渲染和生命周期。

---

## 7. 常见误区和使用边界

### 第一个误区是把 D3 当成普通图表库

D3 不是“传一个配置就出图”的库。它更像是一组数据可视化工具函数。你需要自己组织数据、计算坐标、渲染图形。它的自由度很高，但代码量也会更多。

### 第二个误区是在 React 中大量使用 D3 直接操作 DOM

很多传统 D3 教程会写：

```ts
d3.select('#chart')
  .append('svg')
  .append('path');
```

这在纯 D3 项目里没问题。但在 React 里，如果大量使用 D3 操作 DOM，就容易和 React 的渲染机制冲突。比如组件重新渲染后，D3 append 的元素可能重复出现；组件卸载后，事件监听和 DOM 清理也容易变乱。

更稳的方式是：D3 负责计算，React 负责渲染。

### 第三个误区是忽略 domain 和 range

D3 图表里很多问题都来自 scale 配错了。比如 y 轴上下颠倒、线条不显示、图形被裁剪，通常都和 domain、range、margin 有关。

### 第四个误区是每次 render 都做大量计算

复杂图表可能要生成几百甚至几千个点。如果每次组件 render 都重新计算 scale、path、ticks，会带来不必要的性能压力。React 项目里应该用 `useMemo` 缓存这些计算。

### 第五个误区是用随机 ID 生成 SVG gradient 或 clipPath

很多图表会用到 `linearGradient`、`clipPath`。如果每次 render 都生成随机 id，可能导致重渲染不稳定。更合理的方式是使用 React 的 `useId()` 或者从业务维度生成稳定 id。

---

## 8. 一个更完整的 TypeScript 示例

下面给一个稍微完整的 D3 + React 折线图示例。它包含：

- 数据输入。
- scale 计算。
- path 生成。
- 坐标 tick。
- tooltip。
- 鼠标事件。
- 空数据处理。

```tsx
'use client';

import * as d3 from 'd3';
import { useMemo, useState } from 'react';

type ChartPoint = {
  price: number;
  value: number;
};

type TooltipState = {
  x: number;
  y: number;
  price: number;
  value: number;
} | null;

type LineChartProps = {
  data: ChartPoint[];
  width: number;
  height: number;
};

export function D3LineChart({ data, width, height }: LineChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const margin = {
    top: 24,
    right: 16,
    bottom: 32,
    left: 48,
  };

  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const chart = useMemo(() => {
    if (!data.length) {
      return null;
    }

    const priceDomain = d3.extent(data, d => d.price) as [number, number];
    const valueDomain = d3.extent(data, d => d.value) as [number, number];

    const xScale = d3.scaleLinear()
      .domain(priceDomain)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain(valueDomain)
      .nice()
      .range([innerHeight, 0]);

    const linePath = d3.line<ChartPoint>()
      .x(d => xScale(d.price))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX)(data);

    return {
      xScale,
      yScale,
      linePath,
      xTicks: xScale.ticks(6),
      yTicks: yScale.ticks(5),
    };
  }, [data, innerWidth, innerHeight]);

  function handleMouseMove(event: React.MouseEvent<SVGRectElement>) {
    if (!chart || !data.length) return;

    const [mouseX] = d3.pointer(event);
    const price = chart.xScale.invert(mouseX);
    const bisect = d3.bisector<ChartPoint, number>(d => d.price).left;
    const index = bisect(data, price, 1);
    const left = data[index - 1];
    const right = data[index];
    const point =
      !right || price - left.price < right.price - price
        ? left
        : right;

    setTooltip({
      x: chart.xScale(point.price),
      y: chart.yScale(point.value),
      price: point.price,
      value: point.value,
    });
  }

  if (!chart) {
    return (
      <div style={{ width, height }}>
        No data
      </div>
    );
  }

  return (
    <svg width={width} height={height}>
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {chart.yTicks.map(tick => (
          <g key={tick}>
            <line
              x1={0}
              x2={innerWidth}
              y1={chart.yScale(tick)}
              y2={chart.yScale(tick)}
              stroke="currentColor"
              opacity={0.12}
            />
            <text
              x={-8}
              y={chart.yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={12}
              fill="currentColor"
            >
              {tick}
            </text>
          </g>
        ))}

        {chart.xTicks.map(tick => (
          <g key={tick} transform={`translate(${chart.xScale(tick)}, ${innerHeight})`}>
            <line y2={6} stroke="currentColor" opacity={0.5} />
            <text
              y={20}
              textAnchor="middle"
              fontSize={12}
              fill="currentColor"
            >
              {tick}
            </text>
          </g>
        ))}

        <path
          d={chart.linePath ?? ''}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        />

        {tooltip && (
          <g style={{ pointerEvents: 'none' }}>
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={0}
              y2={innerHeight}
              stroke="currentColor"
              strokeDasharray="4 4"
              opacity={0.4}
            />
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={4}
              fill="currentColor"
            />
            <foreignObject
              x={Math.min(tooltip.x + 12, innerWidth - 160)}
              y={Math.max(tooltip.y - 36, 0)}
              width={150}
              height={32}
            >
              <div
                style={{
                  fontSize: 12,
                  background: '#111',
                  color: '#fff',
                  padding: '6px 8px',
                  borderRadius: 6,
                }}
              >
                <div>Price: {tooltip.price.toFixed(2)}</div>
                <div>Value: {tooltip.value.toFixed(2)}</div>
              </div>
            </foreignObject>
          </g>
        )}

        <rect
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        />
      </g>
    </svg>
  );
}
```

这段代码的重点不是 UI，而是职责分配。

`useMemo` 里集中处理 D3 计算，包括 scale、path、ticks。

组件返回 JSX，React 负责渲染 SVG。

鼠标事件只负责根据当前位置找到最近数据点，并更新 tooltip。

空数据单独处理，避免 `extent` 返回异常值。

这种写法比直接在 `useEffect` 里不断 append svg 更适合 React 项目。

---

## 9. 学习和落地建议

学习 D3.js 不建议一上来就看复杂案例，比如地图、力导向图、桑基图。更合理的顺序是从数据映射开始。

### 第一步，先理解 SVG

至少要知道 `<svg>`、`<g>`、`<path>`、`<line>`、`<rect>`、`<circle>`、`<text>` 是什么。D3 很多图表最终都是在生成这些 SVG 元素。

### 第二步，理解 scale

这是 D3 的核心。重点掌握 `scaleLinear`、`scaleTime`、`scaleBand`。能理解 domain 和 range，很多图表问题就已经解决了一半。

### 第三步，学习 line、area、axis

先做折线图，再做面积图，再做柱状图。不要急着做复杂交互。

### 第四步，把 D3 放进 React

这里要刻意练习“D3 负责计算，React 负责渲染”的写法。不要一开始就照搬传统 D3 教程里的 DOM append 方式。

### 第五步，加入交互

比如 tooltip、hover line、选中状态、缩放、拖拽。交互才是 D3 真正强大的地方，但也最容易写乱，所以要等基础图形稳定后再加。

### 第六步，做一个真实小 demo

比如：

- 股票价格走势图。
- 接口响应耗时柱状图。
- 任务进度时间线。
- 期权 PnL 曲线。
- 订单成交量分布图。
- 用户增长趋势图。

这些 demo 比单纯照抄教程更有效，因为你会遇到真实的数据清洗、坐标范围、tooltip 边界、响应式宽度等问题。

---

## 10. 总结

D3.js 的重点不是“快速画一个图”，而是让你可以精确控制数据如何变成图形。

如果只是普通图表，ECharts、Chart.js、Recharts 往往更省事。但如果业务需要高度定制，比如金融收益曲线、复杂交互图表、特殊 SVG 可视化、自定义坐标和 tooltip，D3.js 的价值就非常明显。

初学 D3，最应该记住三句话：

- 数据本身不能直接显示，必须先经过 scale 映射成屏幕坐标。
- D3 的强项是计算和生成图形，不一定要让它接管 React 的 DOM。
- 复杂图表不是一次写出来的，而是从数据、scale、shape、axis、interaction 一层一层搭起来的。

掌握这些基本思路之后，再看 D3 的各种 API，会比一开始直接背方法名清楚很多。D3 的学习曲线确实更陡，但它给前端开发者提供的是更底层、更自由的数据可视化能力。
