# Next.js Image 组件入门：为什么一张图片也值得认真优化？

在网页里放一张图片，看起来是一件很简单的事。

传统写法无非是：

```html
<img src="/hero.jpg" alt="Hero" />
```

但真正做项目时，你很快会发现，图片并不只是“显示出来”这么简单。图片可能很大，加载慢；不同设备需要不同尺寸；图片加载完成前可能导致页面抖动；首屏图片和非首屏图片加载策略不一样；外部图片还涉及域名配置；如果接入 CDN 或图片处理服务，还要考虑转换格式、压缩、裁剪和缓存。

这也是为什么 Next.js 提供了 `next/image` 组件。它不是为了替代 `<img>` 这么简单，而是试图帮你处理现代 Web 应用中图片加载、优化和布局稳定性的问题。

这篇文章会从初学者视角讲清楚：Next.js Image 组件解决了什么问题、怎么使用、常见布局怎么写，以及真实业务里如何结合 ImageKit 这类图片服务做更完整的图片优化。

---

## 1. 为什么需要 Next.js Image 组件？

先看一个最常见的问题。

假设页面上有一张 hero 图片，实际展示宽度只有 400px，但原图是几 MB 的高清大图。如果你直接使用原生 `img`：

```html
<img
  src="https://example.com/big-image.jpg"
  alt="Dashboard"
  class="w-[400px] h-auto"
/>
```

CSS 确实会把图片显示成 400px 宽，但浏览器下载的仍然是原始大图。

也就是说，你只是“缩小显示”，并没有“缩小下载”。

这会带来几个问题：

第一，图片体积过大，影响加载速度。

第二，移动端明明只需要小图，却下载了桌面端大图。

第三，图片加载完成前，浏览器不知道它占多少空间，容易导致布局位移。

第四，非首屏图片不应该一开始就加载，否则浪费资源。

第五，高分屏、普通屏、不同 viewport 下，应该加载不同尺寸的图片。

Next.js Image 组件主要就是为了解决这些问题：

- 自动生成不同尺寸的图片。
- 自动生成 `srcset`。
- 支持 `sizes`，让浏览器选择合适图片。
- 默认懒加载非首屏图片。
- 通过 `width / height` 或 `fill` 减少布局偏移。
- 支持 blur placeholder。
- 支持自定义 loader 接入第三方图片服务。

简单理解，`next/image` 的核心价值不是“图片组件”，而是“图片性能优化组件”。

---

## 2. Next.js Image 组件是什么？

Next.js Image 组件来自 `next/image`：

```ts
import Image from "next/image";
```

它最终仍然会渲染成浏览器可以理解的图片元素，但在这个过程中，Next.js 会帮你做一些额外处理。

比如你写：

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={800}
  height={500}
/>
```

Next.js 不只是简单输出一张图片，而是会根据配置生成优化后的图片 URL，并生成类似 `srcset` 的信息，让浏览器根据设备宽度、像素密度、网络情况选择合适的图片版本。

初学者最需要理解几个关键词。

### src

`src` 是图片来源，可以是本地图片，也可以是外部图片。

本地图片可以来自 `public` 目录，也可以通过 import 引入：

```ts
import heroImage from "@/public/hero.jpg";
```

外部图片则通常是 CDN、对象存储、图片服务商的 URL。

### width 和 height

`width / height` 并不主要用来控制图片在页面里显示多大。图片显示大小仍然应该用 CSS 控制。

它们更重要的作用是告诉浏览器图片的宽高比例，从而提前预留空间，减少图片加载后造成的 layout shift。

### fill

如果图片尺寸是流式的，比如宽度随容器变化、高度固定，或者作为背景图填满容器，就可以使用 `fill`。

使用 `fill` 时，图片会采用绝对定位，通常需要外层容器设置 `position: relative`，并由外层容器控制宽高。

### sizes

`sizes` 用来告诉浏览器：在不同 viewport 下，这张图片大概会显示多宽。

它不是控制样式，而是给浏览器一个选择图片资源的提示。

### srcset

`srcset` 是浏览器原生支持的响应式图片机制。Next.js 会根据 `sizes` 自动生成多个图片版本，不需要你手写完整 `srcset`。

### priority

首屏关键图片可以加 `priority`，表示优先加载，不走默认懒加载。

### placeholder="blur"

用于实现图片加载前的模糊占位效果。对本地 import 图片比较方便；外部图片通常需要自己提供 `blurDataURL`。

### loader

自定义图片 URL 生成逻辑。比如接入 ImageKit、Cloudinary、imgix 等第三方图片服务时，可以通过 `loader` 把 Next.js Image 组件和外部图片优化服务连接起来。

---

## 3. 最简单的使用方式

先看一个最基础的例子。

```tsx
import Image from "next/image";

export default function Hero() {
  return (
    <section>
      <Image
        src="/hero.jpg"
        alt="Product dashboard"
        width={800}
        height={500}
        className="w-[400px] h-auto rounded-xl"
      />
    </section>
  );
}
```

这段代码里真正关键的是三点。

第一，`src` 指向图片资源。这里使用的是 `public/hero.jpg`。在 Next.js 中，`public` 目录下的文件可以通过 `/hero.jpg` 访问。

第二，`width={800}` 和 `height={500}` 告诉浏览器图片原始比例。它们不是最终显示尺寸，最终显示尺寸由 `className="w-[400px] h-auto"` 控制。

第三，`alt` 是必须认真写的。它用于图片加载失败时的替代文本，也对屏幕阅读器和无障碍体验有帮助。

这个例子已经比原生 `img` 多做了一些事情：Next.js 会参与图片优化，并帮助浏览器减少布局位移。

但这还不是完整业务写法。真实项目中，你还需要处理响应式尺寸、首屏加载优先级、外部图片域名、`fill` 布局、自定义 `loader` 等问题。

---

## 4. 核心流程：Next.js Image 是怎么跑起来的？

理解 `next/image`，不要只盯着 API，要理解它背后的流程。

大致过程是这样的：

1. 组件渲染时，开发者传入 `src`、`width`、`height`、`sizes` 等信息。
2. Next.js 根据这些信息生成优化后的图片 URL。
3. Next.js 自动生成 `srcset`，提供多个不同宽度的图片候选项。
4. 浏览器拿到 HTML 后，根据 viewport、DPR、`sizes`、网络情况选择最合适的图片。
5. 图片请求会进入 Next.js 图片优化逻辑，或者通过 custom loader 交给第三方图片服务。
6. 图片加载完成后，浏览器按 CSS 样式显示图片。
7. 如果使用了 `priority`，图片会更早加载。
8. 如果使用了 `placeholder="blur"`，加载完成前会先展示模糊占位图。

这里有一个非常容易混淆的点：

`width / height` 是给浏览器预留空间用的，CSS 才是控制最终显示大小的。

比如：

```tsx
<Image
  src="/chart.jpg"
  alt="Chart"
  width={1200}
  height={800}
  className="w-[400px] h-auto"
/>
```

这里图片在页面上显示 400px 宽，但 `width / height` 仍然可以写原始图片比例。浏览器关心的是比例，从而知道应该预留多高的空间。

---

## 5. 常用 API 和核心能力

### 5.1 width / height：防止布局偏移

最普通的图片布局可以这样写：

```tsx
<Image
  src="/stock.jpg"
  alt="Stock dashboard"
  width={1200}
  height={800}
  className="w-[400px] h-auto"
/>
```

如果图片最终通过 CSS 显示为 400px 宽，`height: auto` 会根据宽高比自动计算高度。

这里 `width={1200}` 和 `height={800}` 的作用不是让图片显示成 `1200 × 800`，而是告诉浏览器它的比例是 `3:2`。

浏览器越早知道比例，就越能提前给图片预留空间，减少页面抖动。

### 5.2 className：控制显示尺寸

Next.js Image 组件的显示大小依然主要靠 CSS。

比如 Tailwind 写法：

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={800}
  className="w-[250px] md:w-[400px] h-auto"
/>
```

这表示：

- 小屏幕下宽度 250px。
- `md` 以上宽度 400px。
- 高度自动保持比例。

如果你希望比例更稳定，也可以使用 CSS 的 aspect-ratio：

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={800}
  className="w-[250px] md:w-[400px] aspect-[3/2] object-cover"
/>
```

### 5.3 sizes：告诉浏览器图片会显示多宽

`sizes` 是很多人最容易忽略、也最容易写错的属性。

假设你的图片在移动端显示 250px，桌面端显示 400px：

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={800}
  className="w-[250px] md:w-[400px] h-auto"
  sizes="(max-width: 768px) 250px, 400px"
/>
```

这句话的意思是：

当 viewport 小于等于 768px 时，图片显示宽度大约是 250px；否则是 400px。

浏览器会根据这个信息，从 Next.js 自动生成的 `srcset` 中挑选合适的图片。

如果不写 `sizes`，浏览器可能会选择比实际需要更大的图片，导致浪费带宽。

### 5.4 fill：适合流式布局和容器填充

有些布局无法用固定 `width / height` 表达。

比如一张博客封面图，宽度撑满容器，高度固定 400px：

```tsx
<div className="relative h-[400px] w-full">
  <Image
    src="/cover.jpg"
    alt="Blog cover"
    fill
    className="object-cover"
    sizes="(max-width: 900px) 100vw, 900px"
  />
</div>
```

这里的关键点是：

- 外层 `div` 负责尺寸。
- 外层必须 `relative`。
- `Image` 使用 `fill`。
- 图片本身使用 `object-cover` 保持视觉效果。
- `sizes` 告诉浏览器不同 viewport 下图片显示宽度。

使用 `fill` 后，图片会填满父容器。父容器如果没有明确宽高，图片也就没有可填充的空间。

### 5.5 priority：首屏图片优先加载

如果图片出现在首屏，比如 hero 图、文章头图、产品主图，可以加 `priority`：

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={800}
  className="w-full h-auto"
  priority
/>
```

默认情况下，Next.js 会对图片做懒加载，也就是图片快进入视口时才加载。

但首屏关键图片不应该等，它会影响 LCP 等性能指标。因此首屏大图通常适合加 `priority`。

不要给所有图片都加 `priority`。它适合首屏关键图片，不适合列表里大量图片。

### 5.6 placeholder="blur"：图片加载前的模糊占位

本地 import 图片时，使用 blur placeholder 很方便：

```tsx
import coverImage from "@/public/cover.jpg";
import Image from "next/image";

export default function Cover() {
  return (
    <Image
      src={coverImage}
      alt="Cover"
      placeholder="blur"
      className="w-full h-auto"
    />
  );
}
```

本地图片通过 import 引入时，Next.js 可以知道图片的宽高，并且可以自动生成模糊占位信息。

但如果是外部图片 URL：

```tsx
<Image
  src="https://example.com/cover.jpg"
  alt="Cover"
  width={1200}
  height={800}
  placeholder="blur"
/>
```

通常还需要自己提供 `blurDataURL`，否则 Next.js 不知道模糊占位图该怎么生成。

这也是为什么真实业务里经常会结合 ImageKit、Cloudinary 等图片服务，动态生成低质量占位图。

### 5.7 loader：接入第三方图片服务

默认情况下，Next.js 的图片优化会经过自己的服务器。

但真实业务中，很多团队会把图片交给专门的图片服务，比如 ImageKit。这样可以获得更多能力：

- CDN 分发。
- 自动 WebP / AVIF 转换。
- 图片压缩。
- 宽高裁剪。
- AI 裁剪。
- 水印。
- 背景移除。
- 视频处理。
- 媒体库管理。

Next.js Image 可以通过 custom loader 接入这类服务。

一个简化版 ImageKit loader 可以这样写：

```tsx
import Image, { ImageLoaderProps } from "next/image";

const imageKitLoader = ({ src, width, quality }: ImageLoaderProps) => {
  const params = [`w-${width}`];

  if (quality) {
    params.push(`q-${quality}`);
  }

  return `https://ik.imagekit.io/your_id/${src}?tr=${params.join(",")}`;
};

export function ProductImage() {
  return (
    <Image
      loader={imageKitLoader}
      src="product.jpg"
      alt="Product"
      width={800}
      height={600}
      className="w-full h-auto"
      sizes="(max-width: 768px) 100vw, 600px"
    />
  );
}
```

这里的核心是 `loader` 函数。

Next.js 在生成不同宽度图片 URL 时，会多次调用这个函数。每次传入不同的 `width`，`loader` 根据这个宽度拼出 ImageKit 支持的图片变换 URL。

这样，`srcset` 仍然由 Next.js 生成，但真正的图片裁剪、压缩和 CDN 分发交给 ImageKit。

---

## 6. 常见布局怎么写？

### 6.1 普通固定宽度图片

适合 hero 区域里的插图、卡片旁边的展示图。

```tsx
<Image
  src="/dashboard.jpg"
  alt="Dashboard"
  width={1200}
  height={800}
  className="w-[250px] md:w-[400px] h-auto"
  sizes="(max-width: 768px) 250px, 400px"
  priority
/>
```

这里图片在移动端 250px，桌面端 400px。`sizes` 与 CSS 展示宽度保持一致，浏览器才能选择合适图片。

### 6.2 博客封面图：宽度 100%，高度固定

适合文章头图、详情页 banner。

```tsx
<div className="relative h-[400px] w-full max-w-[900px]">
  <Image
    src="/cover.jpg"
    alt="Article cover"
    fill
    className="object-cover"
    sizes="(max-width: 900px) 100vw, 900px"
  />
</div>
```

这里不用手动写 `width / height`，而是使用 `fill`。

外层容器决定图片大小，图片负责填满容器。`object-cover` 保证图片不被拉伸，只是在必要时裁切。

### 6.3 带 padding 的容器

如果容器有左右 padding，`sizes` 需要更精确一些。

比如外层有 `px-8`，左右各 32px：

```tsx
<div className="px-8">
  <div className="relative h-[400px] w-full">
    <Image
      src="/cover.jpg"
      alt="Cover"
      fill
      className="object-cover"
      sizes="(max-width: 900px) calc(100vw - 64px), 900px"
    />
  </div>
</div>
```

`calc(100vw - 64px)` 的意思是：视口宽度减去左右 padding。

不写也不是完全不能用，但浏览器可能会下载稍微偏大的图片。图片多、流量敏感时，精确的 `sizes` 会更重要。

### 6.4 卡片网格 / 图片列表

比如三列卡片布局，桌面三列、平板两列、移动端一列。

```tsx
<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
  {items.map((item) => (
    <article key={item.id}>
      <div className="relative h-[170px] w-full">
        <Image
          src={item.image}
          alt={item.title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
        />
      </div>
      <h2>{item.title}</h2>
    </article>
  ))}
</div>
```

这里 `sizes` 大概表达了三种状态：

- 小屏幕：单列，图片接近 100vw。
- 中等屏幕：两列，图片接近 50vw。
- 大屏幕：三列，图片接近 33vw。

它不一定要精确到每个像素，但应该和布局逻辑大体一致。

### 6.5 背景图布局

有时候你想做一个全屏背景图，上面覆盖文字。

可以不用 CSS `background-image`，直接用 `Image fill`：

```tsx
<main className="relative min-h-screen overflow-hidden">
  <Image
    src="/background.jpg"
    alt=""
    fill
    className="-z-10 object-cover"
    sizes="100vw"
    priority
  />
  <section className="relative z-10 p-10 text-white">
    <h1>Build modern web apps</h1>
    <p>Fast, responsive and optimized.</p>
  </section>
</main>
```

背景图一般是装饰性的，`alt` 可以为空字符串。

这里 `sizes="100vw"`，因为背景图始终铺满整个 viewport 宽度。

需要注意 `z-index`。图片使用 `fill` 后是绝对定位，如果文字被遮住，需要调整层级。

### 6.6 瀑布流 / 用户上传图片

瀑布流比较特殊，因为用户上传的图片尺寸可能不固定。

如果你知道图片宽高，可以用普通 `width / height` 保持比例：

```tsx
<Image
  src={photo.url}
  alt={photo.alt}
  width={photo.width}
  height={photo.height}
  className="w-full h-auto"
/>
```

这是最稳的方式。

如果不知道图片高度，而是希望容器统一控制宽度，就要通过后端或图片服务获取元数据。比如 ImageKit 这类服务通常可以返回图片宽高，你可以在渲染时使用这些信息。

不建议在完全不知道宽高的情况下强行写固定高度，否则图片容易被裁切或拉伸。

---

## 7. 和 ImageKit 组合使用的真实业务方式

Next.js Image 组件能做基础图片优化，但它默认依赖 Next.js 自己的图片优化能力。

在小项目里，这通常够用。但在真实业务中，图片系统往往更复杂：

- 用户可以上传图片。
- 图片需要 CDN 加速。
- 图片需要自动压缩和格式转换。
- 商品图需要裁剪。
- 内容图需要水印。
- 不同页面需要不同尺寸。
- 图片数量可能非常多。
- 有些图片已经存储在 S3、Google Cloud Storage 或其他对象存储里。

这时更常见的做法是：Next.js Image 负责组件层和响应式图片能力，ImageKit 负责图片存储、变换、压缩和 CDN。

比如：

```tsx
import Image, { ImageLoaderProps } from "next/image";

const imageKitLoader = ({ src, width, quality }: ImageLoaderProps) => {
  const transformations = [`w-${width}`];

  if (quality) {
    transformations.push(`q-${quality}`);
  }

  return `https://ik.imagekit.io/your_id/${src}?tr=${transformations.join(",")}`;
};

type GalleryImageProps = {
  src: string;
  alt: string;
};

export function GalleryImage({ src, alt }: GalleryImageProps) {
  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-xl">
      <Image
        loader={imageKitLoader}
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
      />
    </div>
  );
}
```

这个组件适合用于图片列表、作品集、商品图、博客封面等场景。

它的运行方式是：

1. 组件传入 ImageKit 中的图片路径。
2. Next.js 根据 `sizes` 生成多个候选宽度。
3. 每个候选宽度都会调用 `imageKitLoader`。
4. `loader` 拼出 ImageKit 的变换 URL。
5. 浏览器根据设备情况选择某个 URL。
6. ImageKit 返回对应尺寸、压缩格式和 CDN 缓存后的图片。

这样你既保留了 Next.js Image 的开发体验，又把图片处理压力交给专业图片服务。

---

## 8. 常见误区和使用边界

### 误区一：以为 width / height 是控制显示尺寸的

很多人第一次用 Image 时，会以为：

```tsx
<Image width={400} height={300} />
```

就是把图片显示成 `400 × 300`。

实际上，显示尺寸依然主要由 CSS 决定。`width / height` 更重要的是告诉浏览器图片比例，帮助预留空间。

更合理的写法是：

```tsx
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={800}
  className="w-[400px] h-auto"
/>
```

### 误区二：使用 fill 但父元素没有尺寸

错误写法：

```tsx
<div className="relative">
  <Image src="/cover.jpg" alt="Cover" fill />
</div>
```

如果父元素没有高度，图片没有可填充区域，页面可能显示异常。

正确写法：

```tsx
<div className="relative h-[400px] w-full">
  <Image
    src="/cover.jpg"
    alt="Cover"
    fill
    className="object-cover"
  />
</div>
```

`fill` 的核心规则是：父元素负责尺寸，图片负责填满。

### 误区三：不写 sizes

使用响应式布局时，如果不写 `sizes`，浏览器可能无法准确判断图片展示宽度，从而加载偏大的图片。

尤其是 `fill` 布局，通常应该写 `sizes`：

```tsx
<Image
  src="/cover.jpg"
  alt="Cover"
  fill
  sizes="(max-width: 900px) 100vw, 900px"
/>
```

### 误区四：所有图片都加 priority

`priority` 只适合首屏关键图片。

如果列表里几十张图片都加 `priority`，反而会让浏览器同时抢占资源，影响性能。

适合加 `priority` 的通常是：

- 首页 hero 图。
- 文章首图。
- 商品详情主图。
- 首屏可见的大图。

不适合加的通常是：

- 下方列表图。
- 懒加载区域图片。
- 用户滚动后才看到的图片。

### 误区五：外部图片不配置域名

如果使用外部图片 URL，Next.js 需要知道允许优化哪些远程图片来源。

通常需要在 `next.config.js` 里配置：

```js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
      },
    ],
  },
};
```

这样做是为了避免任何人都能借你的 Next.js 服务器优化任意外部图片。

如果使用 custom loader，配置方式可能会有所不同，但安全边界依然需要考虑。

### 误区六：以为 Next.js Image 可以替代完整图片系统

Next.js Image 很强，但它不是完整媒体资产管理系统。

如果你需要：

- 用户上传。
- 图片审核。
- 媒体库管理。
- CDN 分发。
- 水印。
- AI 裁剪。
- 多格式转换。
- 视频处理。
- 外部对象存储接入。

那就需要 ImageKit、Cloudinary、imgix 或类似服务配合。

Next.js Image 更像是前端图片组件和优化入口，不是完整的图片业务平台。

---

## 9. 一个更完整的 TypeScript 示例

下面写一个稍微完整一点的图片组件，适合真实项目中复用。

它支持：

- 本地或远程图片路径。
- ImageKit loader。
- `fill` 布局。
- 响应式 `sizes`。
- `priority`。
- `className` 扩展。
- TypeScript 类型约束。

```tsx
import Image, { ImageLoaderProps } from "next/image";

const IMAGEKIT_BASE_URL = "https://ik.imagekit.io/your_id";

function imageKitLoader({ src, width, quality }: ImageLoaderProps) {
  const transforms = [`w-${width}`];

  if (quality) {
    transforms.push(`q-${quality}`);
  }

  return `${IMAGEKIT_BASE_URL}/${src}?tr=${transforms.join(",")}`;
}

type OptimizedImageProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function OptimizedImage({
  src,
  alt,
  className,
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
}: OptimizedImageProps) {
  return (
    <div className="relative h-[240px] w-full overflow-hidden rounded-xl">
      <Image
        loader={imageKitLoader}
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={className ?? "object-cover"}
      />
    </div>
  );
}
```

使用方式：

```tsx
export function Gallery() {
  const images = [
    {
      id: "1",
      src: "gallery/mountain.jpg",
      alt: "Mountain landscape",
    },
    {
      id: "2",
      src: "gallery/city.jpg",
      alt: "City skyline",
    },
    {
      id: "3",
      src: "gallery/forest.jpg",
      alt: "Forest road",
    },
  ];

  return (
    <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {images.map((image) => (
        <OptimizedImage
          key={image.id}
          src={image.src}
          alt={image.alt}
        />
      ))}
    </section>
  );
}
```

这个示例里，`OptimizedImage` 组件只负责图片展示和优化逻辑。具体的布局，比如几列网格、间距、页面结构，交给外层组件负责。

这也是比较推荐的组件设计方式：图片组件负责图片本身，页面组件负责布局。

---

## 10. 学习和落地建议

学习 Next.js Image 组件，可以按这个顺序来。

第一步，先掌握 `width / height`。

理解它们主要用于比例和布局稳定，而不是单纯控制显示尺寸。

第二步，掌握 CSS 控制图片显示。

比如 `w-full`、`h-auto`、`object-cover`、`aspect-ratio`。图片最终长什么样，仍然离不开 CSS。

第三步，掌握 `sizes`。

这是响应式图片优化的关键。你需要根据页面布局判断图片在不同屏幕下大概显示多宽。

第四步，掌握 `fill`。

只要遇到容器撑满、固定高度封面图、背景图、卡片图，就很可能用到 `fill`。

第五步，区分首屏图片和非首屏图片。

首屏关键图用 `priority`，其他图片保留默认懒加载。

第六步，理解本地图片和远程图片的差异。

本地 import 图片可以自动获得更多信息；远程图片需要配置域名，blur placeholder 也需要额外处理。

第七步，再学习 custom loader。

当你需要接入 ImageKit、Cloudinary、imgix 这类图片服务时，再去理解 `loader` 如何生成图片 URL。

可以从一个小 demo 开始：做一个博客首页，包含 hero 图、文章封面图、三列图片卡片和背景图。只要这几种布局写顺手，Next.js Image 的大部分实际使用场景就都覆盖了。

---

## 总结

Next.js Image 组件之所以值得学习，是因为图片优化本身并不简单。

一张图片背后涉及加载速度、响应式尺寸、设备像素比、布局稳定、懒加载、首屏优先级、格式转换和 CDN 分发。原生 `img` 可以显示图片，但不会自动帮你处理这些性能细节。

初学者最应该记住三件事。

第一，图片显示大小靠 CSS，`width / height` 主要用于提供比例。

第二，响应式图片一定要理解 `sizes`，否则浏览器可能下载不合适的图片。

第三，复杂业务里，Next.js Image 通常会和 ImageKit 这类图片服务组合使用，由前端组件负责展示，由图片服务负责压缩、转换、裁剪和分发。

如果只是放几张静态图片，Next.js Image 自带能力已经很好用。

如果是图片密集型应用，比如电商、内容平台、图库、SaaS 仪表盘、用户上传系统，就应该认真考虑图片服务、CDN 和自定义 loader 的组合方案。

图片优化不是锦上添花。对真实 Web 应用来说，它往往直接影响首屏速度、用户体验和带宽成本。Next.js Image 组件正是进入这套优化体系的第一步。
