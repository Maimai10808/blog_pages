# Next.js Image 组件实战：5 种常见图片布局与优化方案

在页面中添加一张图片，看起来似乎是一件非常简单的事。写一个 `img` 标签，传入图片地址，再加一点 CSS，好像就完成了。

但在真实的 Next.js 项目中，图片处理并没有这么简单。

Next.js 提供了非常强大的 `Image` 组件，它可以帮助我们解决很多常见问题，例如：

减少布局偏移；

自动生成不同尺寸的图片；

按需懒加载图片；

优化图片格式和体积；

实现 blur-up 模糊占位效果；

配合 `sizes` 和 `srcset` 提升响应式图片性能。

不过，正因为它能力很多，很多开发者在实际使用时反而容易困惑：什么时候用 `width` 和 `height`？什么时候用 `fill`？`sizes` 到底怎么写？远程图片怎么配置？图片作为背景图时该怎么处理？用户上传的图片尺寸不固定又该怎么办？

这篇文章会结合 5 种常见图片布局，系统整理 Next.js Image 组件的使用方式，并说明如何结合 ImageKit 做更进一步的图片优化。

## 一、为什么不要直接使用原生 img 标签

在 HTML 或 JSX 中，我们当然可以直接写：

```tsx id="f8n7ik"
<img src="https://example.com/image.jpg" alt="Demo" />
```

然后通过 CSS 控制图片显示尺寸：

```tsx id="9b5tbn"
<img
  src="https://example.com/image.jpg"
  alt="Demo"
  className="w-[400px] h-auto"
/>
```

这样页面上确实只显示了一张 400px 宽的图片，但问题是：浏览器下载的仍然是原始大图。

假设原图有 2.5MB，哪怕我们只把它显示成一个很小的尺寸，浏览器依然需要下载完整的 2.5MB 文件。这会造成明显的性能浪费。

更合理的方式是：页面显示多大，浏览器就尽量下载接近这个显示尺寸的图片。

这正是 Next.js Image 组件可以帮助我们做的事情。

## 二、远程图片需要配置 next.config.js

如果使用远程图片，Next.js 默认不会允许任意外部域名的图片被优化。我们需要在 `next.config.js` 中配置允许的图片来源。

例如：

```js id="k6xkce"
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "example.com",
        pathname: "/images/**",
      },
    ],
  },
};

module.exports = nextConfig;
```

这相当于给图片来源设置一个白名单，避免别人滥用你的 Next.js 服务器来优化任意图片。

如果图片来自 GitHub、CDN、ImageKit、S3 公开地址等，都需要配置对应的域名。

## 三、理解 width 和 height：它们主要用于防止布局偏移

很多人会误以为 `width` 和 `height` 决定图片最终在页面上的显示尺寸。

实际上，在 Next.js Image 组件中，图片最终显示多大，主要还是由 CSS 决定。`width` 和 `height` 更重要的作用是告诉浏览器图片的宽高比例，让浏览器提前预留空间，从而避免图片加载后把页面内容挤开。

例如：

```tsx id="uzk8ug"
import Image from "next/image";

export default function HeroImage() {
  return (
    <Image
      src="https://example.com/images/hero.jpg"
      alt="Hero image"
      width={400}
      height={266}
      className="w-[400px] h-auto"
    />
  );
}
```

这里的 `width={400}` 和 `height={266}` 主要表达的是图片比例，大约是 3:2。浏览器在图片真正加载完成前，就能知道应该为它预留多高的空间。

如果比例写错，例如图片实际是 16:9，但你写成了 1:1：

```tsx id="fz1ae7"
<Image
  src="https://example.com/images/hero.jpg"
  alt="Hero image"
  width={400}
  height={400}
  className="w-[400px] h-auto"
/>
```

浏览器会先给它预留一个正方形区域。等真实图片加载完成后，高度发生变化，下面的文字、按钮或卡片就可能突然移动，这就是布局偏移。

所以，`width` 和 `height` 不一定要等于原图真实尺寸，但最好保持正确的宽高比。

## 四、布局一：Hero 区域右侧图片

第一种常见场景是落地页 Hero 区域：左边是标题、描述和按钮，右边是一张图片。

例如桌面端图片宽度是 400px，移动端图片宽度是 250px。

```tsx id="iwkyg7"
import Image from "next/image";

export function HeroSection() {
  return (
    <section className="flex flex-col items-center gap-8 md:flex-row">
      <div>
        <h1 className="text-4xl font-bold">Optimize your images</h1>
        <p className="mt-4 text-gray-600">
          Learn how to use Next.js Image correctly.
        </p>
        <button className="mt-6 rounded bg-black px-4 py-2 text-white">
          Get Started
        </button>
      </div>

      <Image
        src="https://example.com/images/hero.jpg"
        alt="Dashboard preview"
        width={400}
        height={266}
        sizes="(max-width: 768px) 250px, 400px"
        className="w-[250px] h-auto md:w-[400px]"
        priority
      />
    </section>
  );
}
```

这里有几个关键点。

首先，图片显示尺寸由 CSS 控制：

```tsx id="t7ldnw"
className = "w-[250px] h-auto md:w-[400px]";
```

移动端是 250px，桌面端是 400px。

其次，`width` 和 `height` 用来提供比例：

```tsx id="g2fzhs"
width={400}
height={266}
```

只要移动端和桌面端保持同样比例，就不需要根据断点动态修改 `width` 和 `height`。

最后，`sizes` 告诉浏览器这张图片在不同视口下大概会显示多宽：

```tsx id="d8e3tr"
sizes = "(max-width: 768px) 250px, 400px";
```

当视口小于 768px 时，图片宽度约为 250px；否则约为 400px。浏览器会根据这个信息，从 Next.js 自动生成的 `srcset` 中选择更合适的图片版本。

如果这张图在首屏可见，可以加上：

```tsx id="b19nql"
priority;
```

这样它会被优先加载，不再懒加载。

## 五、srcset 和 sizes 到底是什么

要理解 Next.js Image，必须理解 `srcset` 和 `sizes`。

`srcset` 是一组图片候选资源。它告诉浏览器：同一张图片有多个尺寸版本可以选择。

例如：

```html id="egd3do"
<img srcset="/image?w=256 256w, /image?w=640 640w, /image?w=1200 1200w" />
```

浏览器会根据屏幕大小、设备像素比、网络情况等因素选择其中一个下载。

而 `sizes` 是告诉浏览器：这张图片在当前布局里会显示多宽。

例如：

```tsx id="tw8x8y"
sizes = "(max-width: 768px) 250px, 400px";
```

意思是：

视口小于 768px 时，图片显示 250px 宽；

其他情况下，图片显示 400px 宽。

浏览器收到 HTML 时，还没有完整加载 CSS，所以它无法立刻知道图片最终显示多大。`sizes` 就是在 HTML 阶段给浏览器一个提前判断的依据。

Next.js Image 会自动帮我们生成 `srcset`，但我们需要通过 `sizes` 告诉浏览器如何选择。

如果不写 `sizes`，浏览器可能会下载比实际需要更大的图片，造成性能浪费。

## 六、设备像素比 DPR 对图片选择的影响

调试图片时，还有一个容易被忽视的因素：设备像素比，也就是 DPR。

例如在普通屏幕上，CSS 中的 400px 可能就对应 400 个物理像素。但在 MacBook 这类 Retina 屏幕上，DPR 可能是 2。也就是说，屏幕实际可用像素更多。

所以一张 CSS 宽度为 400px 的图片，在 DPR 为 2 的屏幕上，浏览器可能会选择接近 800px 宽的图片版本，以保证图片看起来更清晰。

这也是为什么你在 DevTools 中看到浏览器下载的图片尺寸，有时会比 CSS 显示尺寸大。

调试时可以在 Chrome DevTools 中修改 DPR，也建议禁用缓存。否则如果浏览器之前已经下载过大图，它可能会直接复用缓存，不再重新下载较小版本。

## 七、布局二：容器内全宽图片

第二种常见布局是文章头图、详情页横幅图、内容区大图。图片会占满父容器宽度，高度固定。

例如：

```tsx id="ic4ik5"
import Image from "next/image";

export function FullWidthImage() {
  return (
    <div className="relative h-[400px] w-full max-w-[900px]">
      <Image
        src="https://example.com/images/banner.jpg"
        alt="Banner image"
        fill
        sizes="(max-width: 900px) 100vw, 900px"
        className="object-cover"
      />
    </div>
  );
}
```

这里使用了 `fill`。

当使用 `fill` 时，不再需要给 `Image` 传 `width` 和 `height`。Next.js 会让图片绝对定位，并填满父容器。

所以父容器必须满足两个条件：

第一，父容器要有明确尺寸：

```tsx id="m31d35"
className = "h-[400px] w-full max-w-[900px]";
```

第二，父容器要设置相对定位：

```tsx id="yhfzfa"
className = "relative";
```

因为 `fill` 会让图片变成绝对定位，父容器需要作为定位上下文。

同时，为了避免图片被拉伸变形，一般会加：

```tsx id="eu6ezb"
className = "object-cover";
```

这样图片会保持比例，必要时裁剪多余部分。

`sizes` 的写法是：

```tsx id="2k4rwm"
sizes = "(max-width: 900px) 100vw, 900px";
```

意思是：当视口宽度小于 900px 时，图片宽度大约等于视口宽度；当视口超过 900px 时，图片最大宽度是 900px。

## 八、如果父容器有 padding，sizes 要更精确

如果父容器左右有 padding，例如：

```tsx id="x1swv7"
<div className="px-8">
  <div className="relative h-[400px] w-full max-w-[900px]">
    <Image ... />
  </div>
</div>
```

此时图片宽度就不是严格的 `100vw` 了，因为左右各有 `32px` 的 padding。

如果希望更精确，可以使用 `calc`：

```tsx id="kkuccy"
sizes = "(max-width: 900px) calc(100vw - 64px), 900px";
```

这里的 `64px` 是左右 padding 总和。

当然，如果只是普通页面，误差不大时也可以写成 `100vw`，只是可能会下载略大一点的图片。

## 九、布局三：卡片网格图片

第三种场景是卡片列表、商品列表、图片画廊等。桌面端三列，平板两列，移动端一列。

布局大概是这样：

```tsx id="vsw27j"
export function CardGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      <Card image="product-1.jpg" title="Product 1" />
      <Card image="product-2.jpg" title="Product 2" />
      <Card image="product-3.jpg" title="Product 3" />
    </div>
  );
}
```

卡片组件可以这样写：

```tsx id="u4knsq"
import Image from "next/image";

type CardProps = {
  image: string;
  title: string;
};

export function Card({ image, title }: CardProps) {
  return (
    <article className="overflow-hidden rounded-lg border">
      <div className="relative h-[170px] w-full">
        <Image
          src={`https://example.com/images/${image}`}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
          className="object-cover"
        />
      </div>

      <div className="p-4">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">
          This is a card description.
        </p>
      </div>
    </article>
  );
}
```

这里仍然使用 `fill`，因为卡片图片的宽度会随着网格布局变化。

父容器负责尺寸：

```tsx id="5l3ui1"
<div className="relative h-[170px] w-full">
```

图片负责填满父容器：

```tsx id="e301o7"
<Image fill className="object-cover" />
```

`sizes` 写法：

```tsx id="zplsk4"
sizes = "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw";
```

意思是：

移动端一列，图片接近 100vw；

中等屏幕两列，图片接近 50vw；

大屏三列，图片接近 33vw。

如果页面中有 gap、padding 或 max-width，可以用 `calc()` 再进一步修正。但大多数卡片网格场景中，这样的近似已经比较实用。

## 十、布局四：背景图效果

第四种场景是背景图。例如页面顶部有一张铺满整个视口的背景图，上面覆盖标题和按钮。

虽然可以用 CSS 的 `background-image`，但如果希望继续使用 Next.js Image 的优化能力，也可以用 `Image` + `fill` 实现。

```tsx id="gomghq"
import Image from "next/image";

export function BackgroundHero() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <Image
        src="https://example.com/images/background.jpg"
        alt="Background"
        fill
        sizes="100vw"
        priority
        className="-z-10 object-cover"
      />

      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center text-white">
        <h1 className="text-5xl font-bold">Build Better Interfaces</h1>
        <p className="mt-4 max-w-xl text-center">
          Use Next.js Image to optimize your visual experience.
        </p>
      </section>
    </main>
  );
}
```

这里的关键是：

父元素设置：

```tsx id="u2x6mo"
className = "relative min-h-screen overflow-hidden";
```

图片使用：

```tsx id="kyquf0"
fill;
sizes = "100vw";
className = "-z-10 object-cover";
```

文字内容设置：

```tsx id="dixf07"
className = "relative z-10";
```

需要注意，如果父元素本身有背景色，`-z-10` 可能会让图片被背景色盖住。这时可以不用负数 z-index，而是给图片设置较低的正 z-index，再给内容设置更高的 z-index。

## 十一、布局五：用户上传图片瀑布流

第五种场景更复杂：用户可以上传图片，而这些图片尺寸不固定。

例如图片有横图、竖图、正方形图。如果我们强行设置固定高度，就会裁剪图片；如果设置 `object-cover`，有些内容可能被切掉。

对于瀑布流或图片社区类场景，通常希望图片宽度一致，高度根据图片真实比例自动变化。

如果你知道图片的宽高，可以直接使用：

```tsx id="32wvm6"
<Image
  src={src}
  alt={alt}
  width={imageWidth}
  height={imageHeight}
  sizes="(max-width: 768px) 100vw, 300px"
  className="h-auto w-full"
/>
```

这通常是最理想的方式。

但如果用户上传时你不知道宽高，可以在上传后保存图片元数据。像 ImageKit 这类服务通常会提供图片的宽度、高度、文件大小、格式等信息。你可以把这些信息存到数据库里，展示时再传给 `Image`。

例如：

```tsx id="9l0go0"
type GalleryImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export function GalleryItem({ src, alt, width, height }: GalleryImage) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes="(max-width: 768px) 100vw, 300px"
      className="h-auto w-full rounded-lg"
    />
  );
}
```

对于瀑布流场景，不建议完全不知道图片比例就盲目使用 `fill`。因为 `fill` 需要父容器提前知道高度，而瀑布流图片的高度恰恰依赖图片本身比例。

因此，更推荐在上传阶段拿到图片宽高，并在展示时传给 `Image`。

## 十二、本地图片和远程图片的区别

Next.js 对本地图片和远程图片的处理略有不同。

如果图片放在 `public` 目录中，可以这样引用：

```tsx id="2dshgc"
<Image src="/stock-prices.jpg" alt="Stock prices" width={650} height={366} />
```

这种方式可以正常显示，但如果希望 Next.js 自动获取更多图片信息，例如自动生成 blur 占位图，更推荐使用 import：

```tsx id="m23fuj"
import stockImage from "@/public/stock-prices.jpg";

export function LocalImage() {
  return (
    <Image
      src={stockImage}
      alt="Stock prices"
      placeholder="blur"
      className="h-auto w-full"
    />
  );
}
```

使用本地 import 的好处是：

不需要手动传 `width` 和 `height`；

Next.js 可以知道图片元数据；

可以自动生成 `blurDataURL`；

使用 `placeholder="blur"` 更方便。

但是，本地图片只适合项目构建时已经存在的静态资源。用户运行时上传的图片不能直接放进 `public` 文件夹再让 Next.js 自动识别。对于用户上传场景，更适合使用对象存储、CDN 或 ImageKit 这类媒体服务。

## 十三、blur-up 模糊占位效果

图片加载时，如果直接显示空白，会让用户感觉页面不稳定。更好的方式是先显示一张低质量模糊图，等高清图加载完成后再替换。

本地图片可以非常简单地写：

```tsx id="6no7oz"
import stockImage from "@/public/stock-prices.jpg";

<Image src={stockImage} alt="Stock prices" placeholder="blur" />;
```

但如果是远程图片，Next.js 不会自动知道低质量占位图地址。这时需要你自己提供 `blurDataURL`：

```tsx id="nze2xf"
<Image
  src="https://example.com/images/hero.jpg"
  alt="Hero"
  width={650}
  height={366}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

手动生成 `blurDataURL` 比较麻烦。ImageKit 这类服务可以通过 URL transformation 很方便地生成低宽度、模糊版本的图片，再转换成 base64 后作为 `blurDataURL` 使用。

## 十四、为什么需要 ImageKit 这类第三方服务

Next.js Image 组件本身已经能做很多基础优化，比如生成不同宽度的图片、转成更适合的格式、懒加载等。

但默认情况下，这些优化工作是由你的 Next.js 服务器处理的。也就是说，图片衍生版本、缓存和转换逻辑都和你的应用服务器有关。

在真实项目中，如果图片数量很多，或者需要更复杂的处理，就可能需要第三方媒体服务，例如 ImageKit。

ImageKit 可以帮助我们：

自动压缩图片；

自动转换为 WebP 等优化格式；

通过 CDN 分发资源；

对图片做实时 transformation；

支持 AI 裁剪、背景移除、水印、模糊等高级能力；

支持视频优化和 HLS / DASH 流媒体；

支持上传和媒体库管理；

支持接入已有存储，例如 S3 或 Google Cloud Storage。

这样，Next.js 负责组件层面的响应式加载体验，ImageKit 负责图片处理、格式转换、CDN 分发和高级媒体能力，两者结合会更适合生产环境。

## 十五、使用 ImageKit 自定义 loader

Next.js Image 支持自定义 loader。我们可以通过 loader 把图片地址转换成 ImageKit 的优化 URL。

例如：

```tsx id="n3g0ig"
import Image, { ImageLoaderProps } from "next/image";

const imageKitLoader = ({ src, width, quality }: ImageLoaderProps) => {
  const params = [`w-${width}`];

  if (quality) {
    params.push(`q-${quality}`);
  }

  const transformation = params.join(",");

  return `https://ik.imagekit.io/your_imagekit_id/tr:${transformation}/${src}`;
};
```

然后在 `Image` 中使用：

```tsx id="juw1nm"
<Image
  loader={imageKitLoader}
  src="stock-prices.jpg"
  alt="Stock prices"
  fill
  sizes="(max-width: 900px) 100vw, 900px"
  className="object-cover"
/>
```

这样，Next.js 仍然会生成 `srcset`，但每一个候选图片地址都会通过 `imageKitLoader` 转换成 ImageKit URL。

也就是说，图片衍生尺寸不再由你的 Next.js 服务器生成，而是交给 ImageKit 处理和分发。

## 十六、ImageKit loader 示例组件

可以把 ImageKit loader 封装起来：

```tsx id="lg1xap"
"use client";

import Image, { ImageLoaderProps } from "next/image";

const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/your_imagekit_id";

const imageKitLoader = ({ src, width, quality }: ImageLoaderProps) => {
  const transformations = [`w-${width}`];

  if (quality) {
    transformations.push(`q-${quality}`);
  }

  return `${IMAGEKIT_URL_ENDPOINT}/tr:${transformations.join(",")}/${src}`;
};

type ImageKitImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

export function ImageKitImage({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
}: ImageKitImageProps) {
  return (
    <Image
      loader={imageKitLoader}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
```

使用时：

```tsx id="g7bm4e"
<div className="relative h-[400px] w-full max-w-[900px]">
  <ImageKitImage
    src="stock-prices.jpg"
    alt="Stock prices"
    sizes="(max-width: 900px) 100vw, 900px"
    className="object-cover"
    priority
  />
</div>
```

这样可以把 Next.js 的响应式图片能力和 ImageKit 的媒体处理能力结合起来。

## 十七、不同场景下的选择建议

如果是简单静态图片，放在 `public` 目录并用本地 import，体验最好，配置也最少。

如果是固定比例的远程图片，可以使用 `width`、`height` 和 `sizes`。

如果图片宽高随容器变化明显，例如 Banner、卡片图、背景图，可以使用 `fill`，并让父容器负责尺寸。

如果是首屏图片，应该使用 `priority`。

如果是非首屏图片，默认懒加载即可。

如果用户可以上传图片，最好在上传时保存图片元数据，包括宽度和高度。

如果图片量很大，或者需要 CDN、压缩、WebP、裁剪、水印、上传管理、视频处理，可以考虑接入 ImageKit 这类媒体服务。

## 十八、常见布局速查

### Hero 右侧图片

```tsx id="sb9viy"
<Image
  src={src}
  alt={alt}
  width={400}
  height={266}
  sizes="(max-width: 768px) 250px, 400px"
  className="w-[250px] h-auto md:w-[400px]"
  priority
/>
```

### 容器全宽图

```tsx id="h9ky7a"
<div className="relative h-[400px] w-full max-w-[900px]">
  <Image
    src={src}
    alt={alt}
    fill
    sizes="(max-width: 900px) 100vw, 900px"
    className="object-cover"
  />
</div>
```

### 三列卡片图

```tsx id="lf11tf"
<div className="relative h-[170px] w-full">
  <Image
    src={src}
    alt={alt}
    fill
    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
    className="object-cover"
  />
</div>
```

### 背景图

```tsx id="xfkx3h"
<main className="relative min-h-screen overflow-hidden">
  <Image
    src={src}
    alt={alt}
    fill
    sizes="100vw"
    priority
    className="-z-10 object-cover"
  />
</main>
```

### 用户上传瀑布流图片

```tsx id="44k3o9"
<Image
  src={src}
  alt={alt}
  width={imageWidth}
  height={imageHeight}
  sizes="(max-width: 768px) 100vw, 300px"
  className="h-auto w-full"
/>
```

## 十九、总结

Next.js Image 组件很强大，但要用好它，关键不是只记住几个必填属性，而是理解它和浏览器之间的协作方式。

`width` 和 `height` 主要用于提供宽高比，减少布局偏移。

`fill` 适合图片尺寸由父容器决定的场景。

`sizes` 用来告诉浏览器图片实际会显示多宽，是响应式图片优化的关键。

`srcset` 由 Next.js 自动生成，浏览器会结合 `sizes`、DPR、网络状况等因素选择合适的图片版本。

`priority` 适合首屏关键图片，不要滥用。

本地图片可以获得更好的自动元数据支持，远程图片则需要配置来源。

如果项目图片量大、需要复杂 transformation、上传管理、CDN 分发或视频优化，可以结合 ImageKit 等第三方服务。

图片优化看似只是页面里的一个细节，但它直接影响加载速度、视觉稳定性和用户体验。理解这些常见布局下的写法，能让我们在 Next.js 项目中更稳定、更高效地处理图片。
