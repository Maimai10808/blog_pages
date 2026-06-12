# 前端媒体资源优化实践：用 ImageKit 优化图片、视频与上传体验

在 Web 开发中，性能优化一直是一个绕不开的话题。很多开发者在谈到优化时，第一反应往往是压缩 JavaScript 体积、减少 CSS 文件大小、优化接口响应时间，或者在 Lighthouse、PageSpeed Insights 中反复检查性能分数。

这些当然重要，但在真实业务中，影响用户体验的往往不只是代码本身，而是页面中的媒体资源，尤其是图片和视频。

对于大多数网站来说，图片和视频通常占据了页面资源体积的大部分。如果媒体资源没有处理好，即使 JavaScript 体积已经被压缩得很小，页面依然可能加载缓慢、首屏体验不佳、滚动时卡顿。因此，前端性能优化不能只盯着代码包体积，还应该把图片和视频优化放在更重要的位置。

## 一、为什么媒体优化比想象中更重要

很多开发者会习惯性地打开控制台，看到某些性能警告，或者在 PageSpeed Insights 中看到不够理想的分数，就认为自己的网站“太慢”或者代码写得不好。

但如果观察一些大型网站，会发现它们的性能评分未必都很高。例如一些社交平台、视频平台、内容社区或在线教育网站，在性能工具中的分数可能并不完美，但它们通常都做对了一件事：媒体资源体验足够好。

从普通用户的角度看，用户并不会特别关心 JavaScript bundle 是 120KB 还是 100KB，也不会精确感知服务器响应时间是 600ms 还是 500ms。用户更直接的感受是：

页面内容能不能尽快出现？

图片和视频能不能及时看到？

滚动时是否顺畅？

资源是否加载失败？

也就是说，只要内容能在合理时间内展示出来，用户通常就不会认为网站体验很差。相反，如果图片迟迟不显示，视频加载很慢，或者页面因为大媒体文件阻塞而卡住，即使代码层面优化得很好，用户体验依然会很差。

## 二、普通 img 和 video 标签的问题

最基础的图片和视频展示方式，是直接使用 HTML 的 `img` 和 `video` 标签：

```html
<img src="/image.jpg" /> <video src="/video.mp4" controls></video>
```

这种写法虽然简单，但有一个明显问题：浏览器会加载原始资源。

假设一张图片接近 8MB，一个视频接近 50MB，即使我们在页面中设置了宽高：

```html
<img src="/image.jpg" width="400" height="300" />
```

文件本身体积依然不会变小。这里改变的只是页面中的显示尺寸，而不是图片或视频的实际大小。

换句话说，用户看到的是一个被缩小显示的图片框，但浏览器下载的仍然是原始大图。

更理想的做法是：针对不同屏幕尺寸、不同设备、不同网络情况，生成不同尺寸和质量的资源版本，然后按需加载最合适的那一个。

但在真实项目中，这件事并不总是容易。尤其是当网站内容是动态的，或者用户可以上传图片和视频时，我们很难手动为每一张图片、每一个视频都提前生成多个版本。

这时候，就需要一个更通用、更自动化的媒体优化方案。

## 三、Next.js Image 组件的优势与限制

如果项目使用的是 Next.js，可以直接使用内置的 `Image` 组件来优化图片：

```tsx
import Image from "next/image";

export default function Page() {
  return <Image src="/image.jpg" width={800} height={600} alt="Demo image" />;
}
```

相比普通的 `img` 标签，Next.js 的 `Image` 组件可以根据给定尺寸对图片进行优化，减少不必要的资源浪费，也能处理懒加载、尺寸适配等问题。

但它也有一些限制：

第一，图片通常会经过 Next.js 服务器处理。如果项目中有大量图片，尤其是用户上传内容较多时，单纯依赖应用服务器处理图片，可能会带来额外压力。

第二，如果使用外部图片源，需要在 `next.config.js` 中配置允许的图片域名。

第三，如果希望使用 CDN 进行图片分发，往往需要额外配置 loader。

第四，Next.js Image 主要解决的是图片问题，对于视频优化并没有提供同等完整的方案。

因此，如果项目中既有图片，又有视频，并且还有上传、裁剪、压缩、懒加载、占位图、CDN 分发等需求，就需要一个更完整的媒体管理方案。

## 四、为什么选择 ImageKit

ImageKit 不只是一个图片存储工具，更像是一个完整的媒体管理与分发平台。它可以帮助我们处理图片和视频的上传、优化、压缩、转换、懒加载、占位图、权限控制以及 CDN 分发等问题。

它比较适合以下场景：

项目中有大量图片或视频；

内容不是静态的，而是经常变化；

用户可以上传图片或视频；

希望自动进行图片压缩和尺寸转换；

希望通过 CDN 分发媒体资源；

希望在 Next.js、React 或其他框架中统一处理媒体资源。

ImageKit 的一个重要优势是，很多转换操作都可以通过 URL 参数完成。比如裁剪、缩放、旋转、压缩、添加文字、添加水印等，都可以通过修改图片 URL 或传入 transformation 参数实现。

这意味着我们不需要自己在服务器端写复杂的图片处理逻辑，也不需要提前生成大量不同尺寸的图片版本。

## 五、在 Next.js 中安装 ImageKit

在 Next.js 项目中，可以先安装官方库：

```bash
npm install imagekitio-next
```

然后在 ImageKit 控制台中获取以下信息：

```env
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
```

其中，`NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT` 和 `NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY` 可以暴露给前端使用，而 `IMAGEKIT_PRIVATE_KEY` 必须保存在服务端，不能暴露到浏览器中。

可以在项目根目录创建 `.env.local` 文件：

```env
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_PRIVATE_KEY=your_private_key
```

如果还使用 Next.js 的图片能力，记得在 `next.config.js` 中配置远程图片域名：

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
      },
    ],
  },
};

module.exports = nextConfig;
```

## 六、封装一个 ImageKit 图片组件

虽然可以在每个页面里直接使用 ImageKit 组件，但如果每次都写 `urlEndpoint` 会比较重复。因此，建议封装一个自己的图片组件。

例如在 `src/components/image.tsx` 中：

```tsx
import { ImageKitProvider, IKImage } from "imagekitio-next";

type ImageProps = {
  path: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
};

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;

export function AppImage({ path, alt, width, height, className }: ImageProps) {
  return (
    <IKImage
      urlEndpoint={urlEndpoint}
      path={path}
      alt={alt}
      width={width}
      height={height}
      className={className}
    />
  );
}
```

使用时：

```tsx
import { AppImage } from "@/components/image";

export default function Page() {
  return (
    <AppImage path="/demo/image.jpg" alt="Demo" width={800} height={600} />
  );
}
```

这样项目中只需要维护一个统一的媒体组件，以后如果要调整默认参数、占位图、图片质量或 CDN 地址，也可以集中处理。

## 七、使用 transformation 优化图片

ImageKit 的核心能力之一是 transformation，也就是图片转换。

比如我们想把图片调整为固定宽高：

```tsx
<IKImage
  urlEndpoint={urlEndpoint}
  path="/demo/image.jpg"
  alt="Demo"
  transformation={[
    {
      width: "800",
      height: "600",
    },
  ]}
/>
```

如果想降低图片质量，可以添加 `quality`：

```tsx
<IKImage
  urlEndpoint={urlEndpoint}
  path="/demo/image.jpg"
  alt="Demo"
  transformation={[
    {
      width: "800",
      height: "600",
      quality: "70",
    },
  ]}
/>
```

这样最终加载的图片体积会更小，适合对首屏性能要求较高的页面。

如果希望裁剪图片，可以使用 `cropMode`：

```tsx
<IKImage
  urlEndpoint={urlEndpoint}
  path="/demo/image.jpg"
  alt="Demo"
  transformation={[
    {
      width: "500",
      height: "500",
      cropMode: "extract",
      x: "50",
      y: "60",
    },
  ]}
/>
```

如果希望旋转图片：

```tsx
<IKImage
  urlEndpoint={urlEndpoint}
  path="/demo/image.jpg"
  alt="Demo"
  transformation={[
    {
      rotation: "90",
    },
  ]}
/>
```

也可以将多个转换步骤拆开：

```tsx
<IKImage
  urlEndpoint={urlEndpoint}
  path="/demo/image.jpg"
  alt="Demo"
  transformation={[
    {
      rotation: "90",
    },
    {
      width: "800",
      height: "600",
    },
  ]}
/>
```

这种写法表示先旋转，再调整尺寸。

## 八、给图片添加文字或水印

ImageKit 还支持图层能力，可以在图片上添加文字、水印图片等内容。

例如添加文字：

```tsx
<IKImage
  urlEndpoint={urlEndpoint}
  path="/demo/image.jpg"
  alt="Demo"
  transformation={[
    {
      raw: "l-text,i-LamaDev,fs-60,lx-150,ly-200,l-end",
    },
  ]}
/>
```

其中：

`l-text` 表示文字图层；

`i-LamaDev` 表示文字内容；

`fs-60` 表示字体大小；

`lx-150`、`ly-200` 表示图层位置；

`l-end` 表示图层结束。

如果要添加图片水印，也可以使用类似的图层方式，只是图层类型从 text 换成 image。

这种能力很适合做用户头像水印、图片版权标识、活动海报动态生成等功能。

## 九、使用懒加载提升页面体验

如果页面中有很多图片，不建议在页面打开时一次性加载所有图片。尤其是图片列表、瀑布流、商品展示、博客封面等场景，更适合使用 lazy loading。

懒加载的核心思想是：用户还没滚动到的图片，不急着加载；只有当图片即将进入视口时，再开始请求资源。

ImageKit 支持懒加载，可以减少首屏请求数量，提高页面打开速度。

除了懒加载，另一个重要体验是低质量图片占位图，也就是 LQIP。

当高清图片还没有加载完成时，先显示一张模糊的低质量预览图。用户不会看到一片空白，而是能提前感知页面结构和图片内容。

示例：

```tsx
<IKImage
  urlEndpoint={urlEndpoint}
  path="/demo/image.jpg"
  alt="Demo"
  loading="lazy"
  lqip={{
    active: true,
    quality: 20,
  }}
  transformation={[
    {
      width: "800",
      height: "600",
    },
  ]}
/>
```

这种方式对图片较多的网站非常重要。比如图片社区、作品集、内容平台、电商网站等，都可以通过 LQIP 提升加载期间的视觉体验。

## 十、优化视频资源

除了图片，ImageKit 也可以处理视频资源。

普通视频文件往往体积很大，如果直接使用原始视频地址：

```html
<video src="/video.mp4" controls></video>
```

会带来较大的加载压力。

使用 ImageKit 的视频组件，可以更方便地通过 CDN 分发和优化视频。

可以封装一个视频组件：

```tsx
import { IKVideo } from "imagekitio-next";

type VideoProps = {
  path: string;
  width?: number;
  height?: number;
  controls?: boolean;
  className?: string;
};

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;

export function AppVideo({
  path,
  width,
  height,
  controls = true,
  className,
}: VideoProps) {
  return (
    <IKVideo
      urlEndpoint={urlEndpoint}
      path={path}
      width={width}
      height={height}
      controls={controls}
      className={className}
    />
  );
}
```

页面中使用：

```tsx
import { AppVideo } from "@/components/video";

export default function Page() {
  return <AppVideo path="/demo/video.mp4" width={800} height={450} controls />;
}
```

这样可以用统一方式管理图片和视频，不需要为视频再单独接入另一套服务。

## 十一、实现图片上传

ImageKit 也支持在应用中上传图片或视频。

不过上传时有一个关键点：上传需要使用私钥进行身份验证，但私钥不能暴露在前端。因此，正确流程应该是：

前端请求自己的后端 API；

后端使用 ImageKit private key 生成认证参数；

前端拿到认证参数；

前端调用 ImageKit 上传组件完成上传。

也就是说，前端不能直接拿 private key 上传文件。

### 1. 创建上传认证 API

在 Next.js App Router 中，可以创建：

```txt
app/api/upload-auth/route.ts
```

示例代码：

```ts
import ImageKit from "imagekit";

const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!,
});

export async function GET() {
  const authenticationParameters = imagekit.getAuthenticationParameters();

  return Response.json(authenticationParameters);
}
```

这个接口会返回：

```ts
{
  token: string;
  expire: number;
  signature: string;
}
```

前端上传时需要用到这些参数。

### 2. 创建上传组件

在客户端组件中使用 ImageKit Upload：

```tsx
"use client";

import { IKUpload } from "imagekitio-next";
import { useRef, useState } from "react";

const publicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY!;
const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT!;

export function UploadImage() {
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState("");

  const authenticator = async () => {
    const res = await fetch("/api/upload-auth");

    if (!res.ok) {
      throw new Error("ImageKit authentication failed");
    }

    const data = await res.json();

    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
    };
  };

  return (
    <div>
      <IKUpload
        ref={uploadRef}
        publicKey={publicKey}
        urlEndpoint={urlEndpoint}
        authenticator={authenticator}
        useUniqueFileName
        style={{ display: "none" }}
        onError={(error) => {
          console.error("Upload error:", error);
        }}
        onSuccess={(res) => {
          setUploadedUrl(res.url);
        }}
        onUploadProgress={(event) => {
          const percent = Math.round((event.loaded / event.total) * 100);
          setProgress(percent);
        }}
      />

      <button type="button" onClick={() => uploadRef.current?.click()}>
        上传图片
      </button>

      <p>上传进度：{progress}%</p>

      {uploadedUrl && (
        <img src={uploadedUrl} alt="Uploaded image" width={300} />
      )}
    </div>
  );
}
```

这里通过 `useRef` 隐藏了原始文件选择框，并用一个自定义按钮触发上传。这样可以让上传按钮样式和项目 UI 保持一致。

上传成功后，可以拿到最终文件地址，然后存入数据库，用于用户头像、文章封面、商品图片或内容附件等场景。

## 十二、实际项目中的建议

在真实项目中，可以按照下面的思路处理媒体资源：

第一，如果是静态图片较少的项目，可以直接使用 Next.js Image。

第二，如果有大量动态图片、用户上传图片、视频资源，建议接入 ImageKit 这类媒体管理平台。

第三，图片展示时尽量使用合适尺寸，不要直接加载原图。

第四，长列表、瀑布流、图片墙一定要使用懒加载。

第五，首屏重要图片可以适当提高优先级，非首屏图片延迟加载。

第六，图片较多时建议使用 LQIP，避免页面加载时出现大面积空白。

第七，上传功能一定要通过服务端生成认证参数，不要把 private key 暴露在客户端。

第八，前端最好封装统一的图片和视频组件，不要在业务页面中到处散落媒体处理逻辑。

## 十三、总结

很多时候，网站性能问题并不完全来自 JavaScript 或 CSS，而是来自未经优化的图片和视频。

对于用户来说，真正影响体验的是内容能不能尽快展示出来。图片是否及时加载、视频是否流畅、滚动是否顺滑、页面是否有占位反馈，这些细节往往比性能测试工具中的某个分数更直接。

ImageKit 提供了一套比较完整的媒体优化方案，可以同时处理图片、视频、上传、压缩、裁剪、懒加载、低质量占位图和 CDN 分发。对于内容型网站、图片较多的应用、用户上传场景以及需要统一管理媒体资源的项目来说，它是一个很实用的选择。

在前端性能优化中，不要只盯着代码体积。真正好的体验，往往来自对内容本身的细致处理。
