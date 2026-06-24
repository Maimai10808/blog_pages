# Next.js 性能优化实战：用 dynamic 懒加载降低首屏 JavaScript 体积

在 Next.js 项目中，首屏性能往往直接影响用户体验。尤其是官网首页、产品落地页、营销页这类页面，用户第一眼看到页面的速度非常重要。

但是在真实项目里，我们经常会不小心把一些“很重”的依赖直接打进首屏包里，比如图表库、地图组件、富文本编辑器、代码高亮库、3D 渲染库等。它们本身功能很强，但如果用户首屏根本看不到这些内容，却仍然要先下载它们对应的 JavaScript，就会造成不必要的性能浪费。

Next.js 提供的 `dynamic` API，正是解决这类问题的重要工具。它可以帮助我们按需加载组件，把重型依赖从首屏 JavaScript 中拆出去，从而减少初始加载体积，让页面更快可用。

## 一、问题：首屏加载了太多不必要的资源

假设我们有一个产品 Landing Page，它包含这些常见模块：

- 首屏文案和产品介绍；
- 数据统计图表；
- 产品功能说明；
- Demo 展示；
- 第三方集成列表；
- 用户评价；
- 地图展示区域。

从页面结构上看，这很正常。但问题在于，图表和地图往往依赖很重。

图表模块可能会引入完整的 charting library，地图模块可能会引入地图 SDK，并且在加载后还会继续请求地图瓦片、脚本和相关资源。

如果这些模块在页面首次渲染时就全部加载，即使用户还没有滚动到图表或地图区域，浏览器也需要提前下载和解析它们。这会导致：

- 首屏 JavaScript bundle 变大；
- 页面首次加载请求数量增加；
- 用户看到可交互页面的时间变长；
- 移动端和弱网环境下体验明显下降。

在示例项目中，未优化前，页面首屏 JavaScript 加载体积约为 **232KB**。对于一个 Landing Page 来说，这已经偏重了。更糟糕的是，地图组件加载后还会继续请求地图瓦片，使实际网络开销进一步增加。

## 二、思路：不是所有组件都应该首屏加载

前端性能优化的一个核心原则是：**用户当前看不到、当前用不到的内容，不应该阻塞首屏。**

对于 Landing Page 来说，首屏最重要的是文案、标题、核心 CTA 和基本视觉内容。图表、地图、复杂 Demo 这类模块虽然重要，但通常不一定需要在第一时间加载。

因此，我们可以把页面中的重型模块分为两类：

第一类是“首屏附近但依赖较重”的组件，比如数据图表。它可能在页面较靠上的位置，用户很快就会看到，但不一定需要进入首屏 bundle。

第二类是“页面底部且用户不一定会看到”的组件，比如地图。用户只有滚动到对应区域时才需要加载它。

针对这两类模块，可以使用不同程度的懒加载策略。

## 三、使用 dynamic 懒加载图表组件

Next.js 的 `dynamic` 可以让组件变成按需加载。比如我们有一个月活用户图表组件：

```tsx
import dynamic from "next/dynamic";

const MonthlyActiveUsersChart = dynamic(
  () => import("./MonthlyActiveUsersChart"),
  {
    loading: () => <ChartSkeleton />,
  },
);
```

这样处理后，图表组件不会直接进入页面的初始 JavaScript bundle，而是在客户端按需加载。

在组件加载完成之前，页面会先展示一个 `ChartSkeleton` 骨架屏。这样用户不会看到空白区域，也不会因为图表加载较慢而觉得页面卡住。

```tsx
export function ChartSection() {
  return (
    <section>
      <h2>Product Growth</h2>
      <MonthlyActiveUsersChart />
    </section>
  );
}
```

这种方式适合处理图表库、编辑器、复杂表格、代码渲染器等依赖较大的组件。

它的好处是：

- 首屏 bundle 体积减少；
- 重型依赖被拆成独立 chunk；
- 页面先展示基础结构，再加载复杂组件；
- 用户体验通过 skeleton 得到兜底。

不过，图表一般仍然属于页面比较重要的内容，所以我们只是把它从首屏包里拆出去，并没有完全等用户滚动到它附近才加载。

## 四、地图组件：进一步结合 Intersection Observer

地图组件比图表更特殊。它通常位于页面较靠下的位置，而且非常重。除了 JavaScript SDK，地图还会请求大量瓦片资源。

如果用户根本没有滚动到底部，那么加载地图就是浪费。

因此，对地图组件可以采用更进一步的策略：**只有当用户快要滚动到地图区域时，才真正渲染地图组件。**

这可以通过 `IntersectionObserver` 实现。

```tsx
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const MapExample = dynamic(() => import("./MapExample"), {
  loading: () => <MapSkeleton />,
});

export function LazyMapSection() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRenderMap, setShouldRenderMap] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldRenderMap(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "200px",
      },
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={containerRef}>
      <h2>Global Usage Map</h2>
      {shouldRenderMap ? <MapExample /> : <MapSkeleton />}
    </section>
  );
}
```

这里的关键是 `rootMargin: "200px"`。

它的意思是：当用户距离地图容器还有 200px 左右时，就提前触发加载。这样用户真正滚动到地图区域时，组件可能已经开始加载，体验会更顺滑。

这比单纯的 dynamic 更进一步，因为 dynamic 只是把组件拆包，而 Intersection Observer 控制的是“什么时候真正渲染这个组件”。

也就是说：

```txt
dynamic 解决的是：不要把重型组件打进首屏包。
Intersection Observer 解决的是：用户快看到时再加载。
```

二者结合，特别适合地图、视频播放器、3D 模型、复杂可视化大屏等模块。

## 五、优化效果：首屏 JS 明显下降

经过两步优化后：

第一步，图表组件使用 `dynamic` 懒加载。

第二步，地图组件使用 `dynamic + IntersectionObserver`，等用户快滚动到地图区域时再渲染。

最终构建结果中，首屏 JavaScript 从原来的约 **232KB** 降低到约 **113KB**。

这几乎是接近一半的优化。

更重要的是，地图相关资源不会在页面一打开时就请求，而是等用户真正接近地图区域时才开始加载。对于 Landing Page 来说，这种优化非常有价值，因为很多用户可能只浏览首屏或前几个模块，并不会看到底部地图。

## 六、什么时候适合使用 dynamic？

并不是所有组件都需要 dynamic。滥用 dynamic 也可能让代码变复杂，甚至带来更多加载状态。

一般来说，以下组件比较适合使用 dynamic：

- 图表组件；
- 地图组件；
- 富文本编辑器；
- Markdown / 代码高亮组件；
- 视频播放器；
- 3D / Canvas / WebGL 组件；
- 大型弹窗或复杂表单；
- 登录后才需要的功能模块；
- 首屏不可见的重型业务组件。

而对于普通按钮、卡片、标题、简单列表等轻量组件，没有必要为了懒加载而懒加载。它们本身不重，拆出去反而可能增加额外请求和维护成本。

## 七、工程实践建议

在实际项目里，可以按照这个思路排查：

首先，运行构建命令，观察首屏 JavaScript 大小。

```bash
pnpm build
```

然后检查页面中是否存在明显的重型依赖，例如 chart、map、editor、player、three、monaco 等。

接着判断这些模块是否首屏必须出现。

如果不是首屏必须出现，就可以考虑使用 `next/dynamic` 拆包。

如果模块在页面底部，或者用户不一定会看到，就可以进一步结合 `IntersectionObserver`，等用户快滚动到对应区域时再渲染。

最后，为动态加载组件提供 skeleton 或 fallback，避免页面出现明显空白。

## 八、总结

Next.js 的 `dynamic` 不是一个复杂 API，但在性能优化中非常实用。

它的核心价值不是“让组件晚一点加载”这么简单，而是帮助我们重新思考页面资源的加载顺序：

- 首屏需要什么？
- 用户当前能看到什么？
- 哪些重型依赖可以延后？
- 哪些模块只有用户滚动到附近才需要加载？

对于图表、地图这类重型组件，合理使用 `dynamic` 可以显著减少首屏 JavaScript 体积。再结合 `IntersectionObserver`，还能进一步避免加载用户根本不会看到的资源。

在性能优化里，不是所有东西都要一开始加载。真正好的页面体验，是让用户先看到最重要的内容，再按需加载后续功能。

这就是 `dynamic` 在 Next.js 项目中的价值。
