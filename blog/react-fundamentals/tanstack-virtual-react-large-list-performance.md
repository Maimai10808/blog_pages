# 使用 TanStack Virtual 优化 React 大列表性能：5000 条数据也能丝滑滚动

在前端开发中，我们经常会遇到大列表渲染问题。

比如一个页面需要渲染 5000 条数据，每一条数据都是一个复杂卡片组件，里面可能包含图片、按钮、状态计算、交互逻辑，甚至还有一些 CPU 密集型操作。如果直接使用普通的 `map` 把 5000 个组件全部渲染出来，页面很容易出现明显卡顿、输入延迟、滚动掉帧，严重时甚至会直接崩溃。

但如果使用虚拟列表技术，同样是 5000 条数据，页面却可以做到非常流畅。

原因很简单：**虚拟列表不会一次性渲染所有数据，而是只渲染当前屏幕中用户真正能看到的那一小部分。**

本文将介绍如何使用 **TanStack Virtual** 在 React 项目中实现虚拟列表，并解决大数据量列表渲染时的性能问题。

---

## 一、为什么大列表会卡？

假设我们有一个数组，里面有 5000 条数据：

```tsx
const cardData = new Array(5000).fill(null).map((_, index) => ({
  id: index,
  title: `Card ${index}`,
}));
```

最直接的写法是：

```tsx
{
  cardData.map((card) => <Card key={card.id} card={card} />);
}
```

这种写法的问题在于：

**React 会一次性渲染 5000 个 Card 组件。**

即使屏幕上用户只能看到 8 到 10 个卡片，剩下几千个卡片依然会被创建、渲染并挂载到 DOM 中。

如果每个卡片都比较复杂，问题就会更加明显：

- 首屏加载变慢；
- 页面滚动卡顿；
- 输入框响应延迟；
- 浏览器内存占用升高；
- 复杂情况下页面可能直接崩溃。

这时候就需要使用虚拟列表。

---

## 二、什么是虚拟列表？

虚拟列表，也叫 virtualization，核心思想是：

**只渲染当前屏幕可见区域附近的元素，不渲染整个列表。**

比如列表一共有 5000 条数据，但当前屏幕只能显示 10 条，那么虚拟列表可能只渲染 10 到 20 条左右的数据。

当用户向下滚动时，顶部已经离开可视区域的元素会从 DOM 中卸载，底部即将进入可视区域的元素会被重新挂载。

这个过程发生得非常快，用户几乎感知不到组件被卸载和重新渲染，只会感觉列表滚动非常流畅。

简单来说：

普通列表：

```text
一次性渲染 5000 个 DOM 节点
```

虚拟列表：

```text
只渲染当前屏幕附近的十几个 DOM 节点
```

这就是性能差异的根本原因。

---

## 三、安装 TanStack Virtual

TanStack Virtual 是 TanStack 团队推出的虚拟化库。TanStack 团队更出名的项目是 TanStack Query，也就是以前的 React Query。

安装命令如下：

```bash
npm install @tanstack/react-virtual
```

如果你使用 pnpm：

```bash
pnpm add @tanstack/react-virtual
```

如果你使用 yarn：

```bash
yarn add @tanstack/react-virtual
```

安装完成后，就可以在 React 项目中使用它。

---

## 四、基础页面：普通渲染 5000 条数据

假设我们现在有一个普通的卡片列表：

```tsx
function App() {
  return (
    <div>
      {cardData.map((card) => (
        <Card key={card.id} card={card} />
      ))}
    </div>
  );
}
```

如果数据量较小，这种写法没什么问题。

但如果 `cardData` 有 5000 条，甚至更多，并且 `Card` 组件本身比较复杂，就非常适合使用虚拟列表进行优化。

---

## 五、创建 virtualizer 对象

TanStack Virtual 的核心是 `virtualizer` 对象。

在 React 中，我们可以使用 `useVirtualizer`：

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";
```

然后在组件中创建 virtualizer：

```tsx
const virtualizer = useVirtualizer({
  count: cardData.length,
  estimateSize: () => 100,
  getScrollElement: () => scrollRef.current,
});
```

这里有三个非常关键的配置。

---

## 六、count：告诉虚拟列表一共有多少条数据

`count` 表示需要虚拟化的总数据数量。

通常情况下，它应该等于你要遍历的数组长度：

```tsx
count: cardData.length;
```

如果数组里有 5000 条数据，那么 `count` 就是 5000。

这个配置告诉 TanStack Virtual：虽然页面上不会真的渲染 5000 个组件，但整体列表逻辑上有 5000 条数据。

---

## 七、estimateSize：估算每一项的高度

`estimateSize` 表示每一项大概多高，单位是像素。

比如每个卡片大概 100px 高：

```tsx
estimateSize: () => 100;
```

如果你的卡片高度是固定的，这个值可以直接写得比较准确。

如果估算值太小，列表项可能会挤在一起；如果估算值太大，列表项之间可能会出现过大的空隙。

比如：

```tsx
estimateSize: () => 80;
```

如果实际卡片高度接近 100px，那么 80 就偏小，可能导致卡片重叠。

可以改成：

```tsx
estimateSize: () => 100;
```

后面我们还会讲动态高度场景，也就是每个卡片高度不固定时该怎么处理。

---

## 八、getScrollElement：指定滚动容器

虚拟列表必须知道哪个元素是滚动容器。

通常我们会使用 `useRef` 获取滚动容器 DOM：

```tsx
import { useRef } from "react";

const scrollRef = useRef<HTMLDivElement | null>(null);
```

然后传给 `getScrollElement`：

```tsx
getScrollElement: () => scrollRef.current;
```

接着把这个 ref 绑定到真正滚动的 div 上：

```tsx
<div ref={scrollRef}>...</div>
```

这样 virtualizer 才知道用户滚动的是哪个区域，并根据滚动位置计算当前应该渲染哪些列表项。

---

## 九、虚拟列表需要的三个关键容器

使用 TanStack Virtual 时，通常需要三层结构：

```text
滚动容器
→ 总高度容器
→ 每个虚拟项的定位容器
```

这三个容器各自有不同的职责。

---

## 十、第一层：滚动容器

第一层是实际出现滚动条的容器。

它需要满足两个条件：

1. 有固定高度；
2. 设置 `overflow: auto` 或 `overflow: scroll`。

示例：

```tsx
<div ref={scrollRef} className="h-[90dvh] w-full overflow-auto">
  ...
</div>
```

为什么必须有固定高度？

因为如果容器高度无限增长，它本身就不会滚动。虚拟列表需要根据滚动位置计算可见元素，所以必须有一个明确的滚动容器。

---

## 十一、第二层：总高度容器

第二层容器用于撑开整个滚动区域的高度。

虽然虚拟列表不会真的渲染 5000 个元素，但滚动条仍然需要表现得像有 5000 个元素一样。

这就需要一个总高度容器。

```tsx
<div
  className="relative"
  style={{
    height: `${virtualizer.getTotalSize()}px`,
  }}
>
  ...
</div>
```

这里的关键是：

```tsx
virtualizer.getTotalSize();
```

它会返回整个虚拟列表的总高度。

比如每个元素估算 100px，一共有 5000 条数据，那么总高度大约就是：

```text
100 × 5000 = 500000px
```

这个高度不是为了真正渲染 5000 个组件，而是为了让滚动条表现正常。

同时，这个容器需要设置：

```css
position: relative;
```

因为下一层的每个虚拟项会使用 `position: absolute` 进行定位，需要一个相对定位的父级。

---

## 十二、第三层：虚拟项定位容器

第三层是每一个虚拟项对应的容器。

我们不是遍历原始的 `cardData`，而是遍历 virtualizer 提供的虚拟项：

```tsx
const virtualItems = virtualizer.getVirtualItems();
```

然后：

```tsx
{
  virtualItems.map((virtualItem) => {
    const card = cardData[virtualItem.index];

    return (
      <div
        key={virtualItem.key}
        data-index={virtualItem.index}
        className="absolute left-0 top-0 w-full"
        style={{
          height: `${virtualItem.size}px`,
          transform: `translateY(${virtualItem.start}px)`,
        }}
      >
        <Card card={card} />
      </div>
    );
  });
}
```

这里有几个重点。

`virtualItem.index` 表示当前虚拟项对应原始数组中的哪一项。

所以我们可以通过：

```tsx
const card = cardData[virtualItem.index];
```

拿到真正要渲染的数据。

`virtualItem.start` 表示这个元素应该距离顶部多少像素。

所以我们用：

```tsx
transform: `translateY(${virtualItem.start}px)`;
```

把它移动到正确的位置。

---

## 十三、完整的基础虚拟列表示例

下面是一个基础版本：

```tsx
import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

function VirtualList({ cardData }: { cardData: CardData[] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: cardData.length,
    estimateSize: () => 100,
    getScrollElement: () => scrollRef.current,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={scrollRef} className="h-[90dvh] w-full overflow-auto">
      <div
        className="relative"
        style={{
          height: `${virtualizer.getTotalSize()}px`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const card = cardData[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              className="absolute left-0 top-0 w-full"
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <Card card={card} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

这个结构看起来比普通 `map` 复杂很多，但它带来的性能提升非常明显。

普通 `map` 是直接渲染全部数据：

```tsx
cardData.map(...)
```

虚拟列表是只渲染当前可见区域：

```tsx
virtualizer.getVirtualItems().map(...)
```

这是核心区别。

---

## 十四、为什么需要 absolute + translateY？

虚拟列表的定位逻辑可以这样理解：

假设每个卡片高度是 100px。

那么：

```text
第 1 个卡片：start = 0
第 2 个卡片：start = 100
第 3 个卡片：start = 200
第 4 个卡片：start = 300
```

virtualizer 会告诉我们每个虚拟项应该出现在什么位置。

我们通过：

```tsx
position: absolute;
transform: translateY(...)
```

把每个卡片手动放到正确位置。

外层容器设置 `relative`，是为了让内部的 `absolute` 元素以它为定位参照。

所以这三层结构可以理解为：

```text
滚动容器：负责滚动
relative 容器：撑开总高度，作为定位上下文
absolute 子项：根据 virtualizer 计算的位置渲染真实内容
```

---

## 十五、如何验证虚拟列表真的生效？

可以打开浏览器 DevTools，观察 DOM 节点。

如果是普通列表，DOM 中会一次性出现 5000 个卡片节点。

如果是虚拟列表，DOM 中只会出现十几个节点。

当你向下滚动时，前面的节点会被卸载，后面的节点会被挂载。

比如一开始可能看到：

```text
data-index="0"
data-index="1"
data-index="2"
...
data-index="10"
```

滚动一段距离后，可能变成：

```text
data-index="462"
data-index="463"
data-index="464"
...
```

这说明索引靠前的节点已经不在 DOM 里了，页面只保留当前可见区域附近的节点。

---

## 十六、横向虚拟列表怎么做？

默认情况下，虚拟列表是纵向滚动。

如果你想做横向虚拟列表，比如横向卡片列表或 Carousel，可以设置：

```tsx
const virtualizer = useVirtualizer({
  horizontal: true,
  count: cardData.length,
  estimateSize: () => 200,
  getScrollElement: () => scrollRef.current,
});
```

然后定位时不要使用 `translateY`，而是使用 `translateX`：

```tsx
style={{
  width: `${virtualItem.size}px`,
  transform: `translateX(${virtualItem.start}px)`,
}}
```

横向虚拟列表的核心变化是：

```text
vertical: translateY
horizontal: translateX
```

同时滚动容器需要有固定宽度，并设置横向溢出滚动。

---

## 十七、整个窗口虚拟化：useWindowVirtualizer

前面的例子是把列表限制在一个固定高度的 div 中滚动。

但有时候我们希望整个页面都参与滚动，也就是用户滚动的是浏览器窗口，而不是某个内部容器。

这种情况下可以使用：

```tsx
import { useWindowVirtualizer } from "@tanstack/react-virtual";
```

示例：

```tsx
const virtualizer = useWindowVirtualizer({
  count: cardData.length,
  estimateSize: () => 100,
});
```

使用 `useWindowVirtualizer` 时，不需要再提供：

```tsx
getScrollElement;
```

因为它默认使用整个 window 作为滚动容器。

简单总结：

```text
useVirtualizer：适合某个 div 内部滚动
useWindowVirtualizer：适合整个页面窗口滚动
```

如果你的列表在一个固定区域内，比如弹窗、表格容器、侧边栏，用 `useVirtualizer`。

如果你的列表就是页面主体内容，跟随浏览器整体滚动，用 `useWindowVirtualizer`。

---

## 十八、固定高度列表的问题

前面的例子中，我们假设每个卡片高度都是固定的，比如 100px。

但真实业务中，经常会遇到动态高度：

- 有的卡片标题很长，会换行；
- 有的卡片展开后会显示更多信息；
- 有的卡片包含异步加载图片；
- 响应式布局下，不同屏幕宽度会导致高度变化；
- 用户点击某个卡片后，它会展开或收起。

如果还是只写：

```tsx
estimateSize: () => 100;
```

就可能出现问题。

比如卡片展开后高度变大，但 virtualizer 仍然认为它只有 100px，那么后面的卡片就可能重叠上来，导致页面显示错乱。

---

## 十九、动态高度列表怎么处理？

TanStack Virtual 提供了 `measureElement`，可以让 virtualizer 实时测量元素真实高度。

动态高度场景下，结构会稍微调整。

核心思想是：

**不要完全依赖 estimateSize，而是让 virtualizer 直接测量真实 DOM 高度。**

示例：

```tsx
<div
  key={virtualItem.key}
  data-index={virtualItem.index}
  ref={virtualizer.measureElement}
>
  <Card card={card} />
</div>
```

这里有两个关键点：

```tsx
ref={virtualizer.measureElement}
```

用于测量当前元素的真实尺寸。

```tsx
data-index={virtualItem.index}
```

用于告诉 virtualizer 当前测量的是哪一个数据项。

这两个通常要一起使用。

---

## 二十、动态高度虚拟列表的结构调整

动态高度时，可以把外层 absolute 定位容器移动到 map 外面，用它统一控制整体偏移。

核心写法大致如下：

```tsx
const virtualItems = virtualizer.getVirtualItems();

return (
  <div ref={scrollRef} className="h-[90dvh] overflow-auto">
    <div
      className="relative"
      style={{
        height: `${virtualizer.getTotalSize()}px`,
      }}
    >
      <div
        className="absolute left-0 top-0 w-full"
        style={{
          transform: `translateY(${virtualItems[0]?.start ?? 0}px)`,
        }}
      >
        {virtualItems.map((virtualItem) => {
          const card = cardData[virtualItem.index];

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="my-6"
            >
              <Card card={card} />
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
```

这段代码的重点是：

```tsx
transform: `translateY(${virtualItems[0]?.start ?? 0}px)`;
```

外层 absolute 容器移动到当前第一个虚拟项应该出现的位置。

然后每个子项通过：

```tsx
ref={virtualizer.measureElement}
```

让 virtualizer 测量真实高度。

当某个卡片展开，高度变大时，virtualizer 会重新计算后续元素的位置，避免卡片重叠。

---

## 二十一、measureElement 的作用

`measureElement` 可以理解为告诉 TanStack Virtual：

```text
这个 DOM 元素的真实高度可能不是 estimateSize 里写的值，你帮我测一下。
```

当元素高度变化时，virtualizer 会更新内部缓存，并重新计算滚动区域、可见项和偏移位置。

这对于以下场景非常有用：

- 展开/收起卡片；
- 动态内容；
- 图片加载后撑高容器；
- 响应式布局；
- 不同数据项高度不一致；
- 富文本列表；
- 评论列表；
- 聊天记录；
- 表格行高度不固定。

---

## 二十二、什么时候应该使用虚拟列表？

不是所有列表都需要虚拟化。

如果你的列表只有几十条数据，普通 `map` 就足够了。

虚拟列表更适合这些场景：

- 数据量超过几百条；
- 单个列表项组件比较复杂；
- 滚动时出现明显卡顿；
- 页面首屏渲染过慢；
- 浏览器 DOM 节点数量过多；
- 表格、日志、消息流、评论区、文件列表等大数据场景；
- 每一行有复杂计算、图表、图片或交互。

简单判断标准：

```text
数据少 + 组件简单：普通 map
数据多 + 组件复杂：虚拟列表
```

---

## 二十三、虚拟列表的注意事项

使用虚拟列表时，需要注意几个问题。

第一，估算高度要尽量接近真实高度。

如果 `estimateSize` 和真实高度差距太大，滚动条和元素位置可能会不自然。

第二，动态高度要使用 `measureElement`。

如果列表项高度会变化，只依赖固定估算值容易导致重叠。

第三，滚动容器必须明确。

使用 `useVirtualizer` 时，要确保 `getScrollElement` 返回的是正确的滚动容器。

第四，外层容器要有固定高度。

没有固定高度，容器就不会形成内部滚动，虚拟列表也就无法正常计算。

第五，不要继续 map 原始数组。

虚拟化后应该 map：

```tsx
virtualizer.getVirtualItems();
```

而不是：

```tsx
cardData.map(...)
```

否则还是会渲染所有数据，虚拟化就失去了意义。

---

## 二十四、TanStack Virtual 的核心心智模型

使用 TanStack Virtual 时，可以记住这个模型：

```text
我有 5000 条数据
但我不渲染 5000 个组件
我只渲染当前屏幕附近的虚拟项
每个虚拟项通过 index 找到真实数据
再通过 start 和 size 放到正确位置
```

也就是说：

- `count` 告诉它总共有多少项；
- `estimateSize` 告诉它每一项大概多大；
- `getScrollElement` 告诉它监听哪个滚动容器；
- `getTotalSize` 用来撑开总高度；
- `getVirtualItems` 返回当前应该渲染的项；
- `virtualItem.index` 用来访问真实数据；
- `virtualItem.start` 用来定位；
- `measureElement` 用来处理动态高度。

---

## 总结

当 React 页面需要渲染几千条甚至上万条数据时，直接使用 `map` 渲染所有组件往往会带来明显的性能问题。

虚拟列表的核心价值在于：

**让页面只渲染用户当前能看到的内容。**

TanStack Virtual 提供了一套非常灵活的虚拟化方案，可以支持：

- 固定高度列表；
- 动态高度列表；
- 横向虚拟列表；
- 容器内部滚动；
- 整个窗口滚动；
- 响应式内容；
- 展开/收起等动态尺寸变化。

虽然第一次使用时，三层 div、absolute 定位、translateY、getTotalSize、getVirtualItems 这些概念可能有点绕，但理解之后，它的结构其实非常稳定：

```text
滚动容器
→ 总高度容器
→ 虚拟项定位容器
→ 真实业务组件
```

如果你的项目中有大表格、大列表、日志流、评论流、消息流、数据分析面板等场景，TanStack Virtual 是一个非常值得掌握的性能优化工具。
