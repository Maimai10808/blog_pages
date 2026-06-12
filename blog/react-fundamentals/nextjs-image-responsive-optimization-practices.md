# Next.js Image 响应式图片优化实践：别只写四个必填属性

在 Next.js 中，`Image` 组件已经帮我们做了很多图片优化工作。按照官方文档的最低要求，我们只需要提供几个基础属性，就可以正常渲染一张图片：

```tsx
import Image from "next/image";

export default function Page() {
  return <Image src="/demo.jpg" width={650} height={366} alt="Demo image" />;
}
```

从语法上看，这样确实可以运行。但在真实项目中，只提供这些最低限度的属性，并不一定能得到最好的图片优化效果。

尤其是在处理响应式图片、远程图片、博客封面图、内容配图时，我们还需要理解 `width`、`height`、`sizes` 和 `priority` 这些属性背后的真正作用。

这篇文章会围绕 Next.js Image 组件，整理一套更实用的响应式图片优化思路。

## 一、远程图片需要先配置 remotePatterns

如果图片来自外部地址，例如 GitHub、CDN、图片服务商或对象存储平台，Next.js 默认不会直接允许这些远程图片被 `next/image` 优化。

我们需要在 `next.config.js` 中配置允许的远程图片来源：

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/your-name/your-repo/main/images/**",
      },
    ],
  },
};

module.exports = nextConfig;
```

这相当于告诉 Next.js：哪些域名下的图片是可信的，可以交给 `Image` 组件处理。

其中，`pathname` 可以使用通配符，例如：

```js
pathname: "/images/**";
```

表示允许该路径下的所有图片资源。

如果没有配置这一步，远程图片通常会报错，无法正常使用 Next.js 的图片优化能力。

## 二、封装一个自己的图片组件

在实际项目中，我们通常不会在每个页面里都直接写 `Image`，而是封装一个自己的图片组件。这样可以统一处理样式、尺寸、优先级、响应式配置等逻辑。

例如：

```tsx
import Image from "next/image";

type CustomImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
};

export function CustomImage({
  src,
  alt,
  width = 650,
  height = 366,
  priority = false,
  className = "",
}: CustomImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={!!priority}
      className={`w-full h-auto ${className}`}
    />
  );
}
```

封装之后，在 MDX、博客详情页、文章列表、项目展示页中都可以直接复用：

```tsx
<CustomImage
  src="https://raw.githubusercontent.com/your-name/your-repo/main/images/demo.jpg"
  alt="Demo image"
/>
```

这样做的好处是，图片优化策略不会散落在各个业务页面里，后期维护起来更方便。

## 三、width 和 height 不是最终渲染尺寸

很多人第一次使用 `next/image` 时，会误以为 `width` 和 `height` 决定了图片在页面中的最终显示尺寸。

但对于远程图片或响应式图片来说，这个理解并不完全准确。

在 Next.js Image 组件中，`width` 和 `height` 更重要的作用是：帮助浏览器推断图片的宽高比，从而提前预留空间，避免图片加载完成后造成布局偏移。

也就是说，`width` 和 `height` 主要是为了确定图片比例，而不是简单控制页面上的显示大小。

比如：

```tsx
<Image src={src} alt="Demo" width={650} height={366} />
```

这里的 `650 × 366` 接近 16:9 的比例。浏览器可以根据这个比例提前为图片留出空间。图片加载完成后，页面内容就不会突然被向下或向上挤开。

## 四、为什么布局偏移很影响体验

布局偏移，也就是常说的 CLS，指的是页面元素在加载过程中发生位置变化。

最常见的场景是：用户准备点击一个按钮，但图片突然加载完成，把按钮往下推了一点，导致用户点错。

在移动端，这种体验尤其明显。

如果我们给一张 16:9 的图片错误设置成：

```tsx
<Image src={src} alt="Demo" width={650} height={650} />
```

浏览器会以为这是一张正方形图片，于是先预留一个正方形空间。等真实图片加载完成后，发现图片其实是 16:9，多余的高度就会收缩，下面的文字或按钮就可能向上移动。

这就是布局偏移。

所以，`width` 和 `height` 不一定要等于图片原始尺寸，但它们最好要符合图片实际显示时的比例。

## 五、是否一定要填写图片原始尺寸

理论上，我们可以把图片的真实尺寸填进去。

比如原图是：

```txt
2560 × 1440
```

那么可以写：

```tsx
<Image src={src} alt="Demo" width={2560} height={1440} />
```

这能准确表达 16:9 的比例，也能避免布局偏移。

但问题是：如果这张图片在页面中最大只会显示到 650px 宽，那么直接写原始尺寸未必是最优选择。

例如，在一个博客详情页中，正文区域最大宽度只有 650px。此时图片永远不会显示到 2560px 宽。即便原图很大，页面真正需要的也只是一个较小版本。

在这种情况下，可以写成：

```tsx
<Image src={src} alt="Demo" width={650} height={366} />
```

这样仍然保持了接近 16:9 的比例，同时也让 Next.js 更容易生成适合当前显示场景的图片资源。

简单说：
如果你明确知道图片在页面中的最大显示宽度，不一定非要填写原始尺寸，而是可以填写接近实际展示尺寸的宽高。

## 六、可以“适度欺骗” Next.js，但不要破坏比例

在某些场景中，我们可以不填原图真实尺寸，而是填写图片在页面中可能达到的最大显示尺寸。

例如原图是：

```txt
2560 × 1440
```

但页面中最大只显示：

```txt
650 × 366
```

那就可以写：

```tsx
<Image src={src} alt="Demo" width={650} height={366} />
```

这种做法并不是乱写，而是根据实际渲染场景给 Next.js 一个更合理的提示。

需要注意的是：
可以不写原始尺寸，但不要乱写比例。

如果图片是 16:9，就尽量保持 16:9；如果图片是 1:1，就保持正方形；如果是竖图，也应该给出接近竖图的比例。

否则图片加载时仍然可能产生布局偏移。

## 七、最重要的优化：一定要使用 sizes

如果只记住一个重点，那就是：响应式图片一定要设置 `sizes`。

`Image` 组件会自动生成 `srcset`，浏览器会根据 `srcset` 选择合适尺寸的图片下载。而 `sizes` 的作用，就是告诉浏览器：这张图片在不同屏幕宽度下大概会显示多宽。

如果没有 `sizes`，Next.js 可能只会生成比较有限的资源候选项，更适合固定尺寸图片，而不是响应式图片。

对于响应式布局来说，缺少 `sizes` 可能会导致浏览器下载比实际需要更大的图片。

一个常见写法是：

```tsx
<Image
  src={src}
  alt="Demo"
  width={650}
  height={366}
  sizes="(max-width: 768px) 100vw, 650px"
  className="w-full h-auto"
/>
```

这段配置的意思是：

当屏幕宽度小于等于 768px 时，图片宽度大约是视口宽度的 100%；

当屏幕更大时，图片最大宽度约为 650px。

这非常适合博客正文图片、文章封面图、内容详情页配图等场景。

## 八、sizes 会影响 srcset 的生成和选择

`sizes` 有两个关键作用。

第一，它会影响浏览器从 `srcset` 中选择哪个图片版本。

浏览器会结合当前屏幕宽度、设备像素比和 `sizes` 的规则，决定下载哪一个尺寸的图片。

第二，它会影响 Next.js 生成怎样的 `srcset`。

当我们添加 `sizes` 后，Next.js 通常会生成更完整的响应式图片候选集，而不是简单的 `1x`、`2x` 两个版本。

这对于响应式图片非常重要。

如果图片实际显示只有 650px 宽，但浏览器误以为它可能需要很大的尺寸，就可能下载过大的图片，浪费带宽，影响加载速度。

图片宽度增加后，文件体积往往不是线性增加，而是会明显放大。因此，一个错误的 `sizes` 可能会让用户下载数倍于实际需要的图片资源。

## 九、如何写出合适的 sizes

`sizes` 的写法可以根据布局来判断。

### 1. 正文区域最大 650px

适合博客、文档、文章详情页：

```tsx
sizes = "(max-width: 768px) 100vw, 650px";
```

意思是：移动端占满屏幕宽度，桌面端最大 650px。

### 2. 卡片网格布局

例如桌面端三列，平板两列，移动端一列：

```tsx
sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
```

意思是：

移动端：一张图占满一行；

平板：一张图约占半屏；

桌面：一张图约占三分之一屏。

### 3. 全屏 Banner

如果图片始终接近全屏宽度：

```tsx
sizes = "100vw";
```

适合首页大图、头图、横幅图。

### 4. 固定宽度图片

如果图片永远不会超过 400px：

```tsx
sizes = "400px";
```

适合头像、Logo、固定展示图。

## 十、用工具辅助计算 sizes

`sizes` 的确不太好手写，尤其是布局复杂时，很容易估算不准。

可以使用响应式图片 linter 或浏览器工具辅助判断。常见思路是：

先给图片添加一个临时的 `sizes`，让 Next.js 生成完整 `srcset`；

打开页面，使用响应式图片检测工具分析实际渲染尺寸；

根据工具建议修正 `sizes`；

再回到 Chrome DevTools 里检查实际下载的图片大小是否合理。

在调试时，可以打开 Chrome DevTools，查看图片元素生成的 `srcset`。如果没有设置 `sizes`，你可能只会看到较少的候选图片；设置后，候选尺寸通常会更丰富，浏览器也能更精确地选择合适的图片。

## 十一、priority 应该给谁用

`priority` 用来告诉 Next.js：这张图片很重要，需要优先加载。

例如：

```tsx
<Image
  src={src}
  alt="Hero image"
  width={1200}
  height={675}
  sizes="100vw"
  priority
/>
```

当 `priority` 为 `true` 时，Next.js 会认为这张图片是高优先级图片，并提前加载它，同时默认关闭懒加载。

它通常适合用于首屏图片，也就是用户打开页面后不滚动就能看到的图片。

例如：

首页 Hero 图；

文章详情页首图；

商品详情页主图；

落地页顶部大图；

首屏可见的重要封面图。

如果某张图片可能在桌面端首屏可见，但移动端需要滚动后才能看到，也可以考虑设置 `priority`，尤其是它可能影响 LCP 指标时。

但不要给所有图片都加 `priority`。
`priority` 应该只给真正重要的首屏图片，否则会让太多图片抢占网络资源，反而影响性能。

## 十二、不要随便使用 loading="eager"

有些教程会建议给重要图片设置：

```tsx
loading = "eager";
```

但在 Next.js 中，更推荐使用 `priority`。

`loading="eager"` 属于更偏底层的加载控制方式，适合少数高级场景。对于大多数项目来说，如果你想让某张图片优先加载，直接使用：

```tsx
priority;
```

会更符合 Next.js 的优化模型。

简单来说：

首屏关键图：用 `priority`；

非首屏图片：保持默认懒加载；

不要为了“快一点”给大量图片设置 `loading="eager"`。

## 十三、Tailwind 中推荐加 w-full h-auto

在响应式图片中，建议给图片加上：

```tsx
className = "w-full h-auto";
```

完整示例：

```tsx
<Image
  src={src}
  alt={alt}
  width={650}
  height={366}
  sizes="(max-width: 768px) 100vw, 650px"
  className="w-full h-auto"
/>
```

`w-full` 表示图片宽度适应父容器。

`h-auto` 表示高度根据宽高比自动计算。

这样可以避免图片被错误拉伸，也能让图片在不同屏幕下保持自然比例。

## 十四、一个更完整的 CustomImage 组件

可以把上面的策略封装成一个更完整的组件：

```tsx
import Image from "next/image";

type CustomImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

export function CustomImage({
  src,
  alt,
  width = 650,
  height = 366,
  sizes = "(max-width: 768px) 100vw, 650px",
  priority = false,
  className = "",
}: CustomImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      priority={!!priority}
      className={`w-full h-auto ${className}`}
    />
  );
}
```

使用方式：

```tsx
<CustomImage
  src="https://raw.githubusercontent.com/your-name/your-repo/main/images/demo.jpg"
  alt="Demo image"
/>
```

如果是首屏图：

```tsx
<CustomImage
  src="https://raw.githubusercontent.com/your-name/your-repo/main/images/hero.jpg"
  alt="Hero image"
  width={1200}
  height={675}
  sizes="100vw"
  priority
/>
```

如果是卡片图：

```tsx
<CustomImage
  src="https://raw.githubusercontent.com/your-name/your-repo/main/images/card.jpg"
  alt="Card image"
  width={400}
  height={225}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>
```

这样一来，业务页面只需要关注图片本身，不需要每次重复写一堆优化参数。

## 十五、博客场景下可以接受一点点布局偏移吗

这个问题要看具体场景。

如果是博客正文图片，轻微布局偏移有时影响不大。用户通常是在阅读内容，不会频繁点击某个固定按钮。

但如果是 Web App，例如移动端任务按钮、播放列表、签到按钮、商品购买按钮等页面，布局偏移就会非常影响体验。用户刚准备点击，按钮突然移动，会造成明显挫败感。

因此建议：

博客、内容页：可以用默认比例或统一封装处理；

交互型页面：尽量准确传入每张图的宽高比；

首屏关键区域：尽量避免任何明显布局偏移；

按钮附近的图片：一定要提前预留准确空间。

## 十六、实践建议总结

使用 Next.js Image 组件时，不要只满足于四个必填属性。更好的优化策略应该包括：

远程图片先配置 `remotePatterns`；

`width` 和 `height` 主要用于确定宽高比，避免布局偏移；

不一定非要填写原图真实尺寸，可以根据最大显示尺寸填写更合适的值；

响应式图片一定要设置 `sizes`；

用 `sizes` 帮助浏览器选择正确的图片资源；

首屏关键图片使用 `priority`；

不要滥用 `loading="eager"`；

样式上建议配合 `w-full h-auto`；

最好封装统一的图片组件，减少重复配置。

## 十七、结语

Next.js 的 `Image` 组件已经内置了很多优化能力，但如果只是提供最低限度的属性，往往还不能发挥它的最佳效果。

真正影响图片性能的，不只是图片是否被压缩，还包括浏览器是否下载了合适尺寸的图片、图片是否会造成布局偏移、首屏图片是否被优先加载、非首屏图片是否保持懒加载。

对于响应式图片来说，`sizes` 是最容易被忽视、但又非常重要的属性。只要合理使用 `width`、`height`、`sizes` 和 `priority`，就能在不增加太多复杂度的情况下，让 Next.js 图片优化效果明显提升。

持续优化不一定要一步到位。每天改进一点点，项目体验就会越来越好。
