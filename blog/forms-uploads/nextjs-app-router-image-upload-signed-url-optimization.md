# Next.js App Router 图片上传入门：从 file input、API Route 到签名 URL 和图片优化

很多人第一次在前端项目里做“图片上传”，会觉得这只是一个很小的功能：页面上放一个按钮，用户选一张图，上传成功后展示出来。

但真正做起来会发现，它并不只是一个 `input type="file"` 的问题。你还需要考虑文件怎么从浏览器传到服务器、服务器怎么转发到存储服务、图片上传成功后怎么返回 URL、用户是否有权限访问图片、图片是否需要压缩、是否要转换成 WebP、Next.js 的 `Image` 组件怎么配合远程图片使用。

尤其在 Next.js App Router 里，服务端组件、客户端组件、Route Handler、环境变量、`server-only`、`next/image` 这些概念会同时出现。理解这些概念之后，图片上传就不再是“能跑就行”的功能，而是一个很典型的前端工程化能力。

---

## 1. 图片上传解决了什么问题

图片上传本质上解决的是：用户本地文件如何安全、稳定、可控地进入你的应用系统，并最终被展示或管理。

没有专门的上传方案时，开发者通常会这么做：

1. 用 `<input type="file" />` 让用户选择文件。
2. 在浏览器里拿到 `File` 对象。
3. 通过 `fetch` 把文件传给后端。
4. 后端把文件保存到本地磁盘或云存储。
5. 数据库里保存文件地址。
6. 前端再用这个地址展示图片。

这个流程看起来简单，但真实项目里会遇到很多问题。

比如，文件不能一直放在应用服务器本地磁盘里。因为线上部署环境可能是无状态的，服务重启、容器销毁、横向扩容都会导致本地文件不可控。更常见的方式是把文件上传到专门的对象存储或文件服务。

再比如，图片原图可能很大。用户上传一张手机照片，可能有几 MB，甚至十几 MB。如果页面只展示一个 300px 宽的小缩略图，却下载了原图，就会浪费带宽，影响页面性能。

还有权限问题。不是所有图片都应该是永久公开链接。比如付费内容、用户私密资料、课程素材、会员图片，都可能需要“用户有权限时才能访问”。这时就需要签名 URL 这类机制。

所以图片上传解决的并不只是 UI 问题，而是一个完整链路问题：

- 浏览器如何选择文件。
- 文件如何传输。
- 服务端如何接收。
- 存储服务如何保存。
- 图片如何生成访问 URL。
- 图片如何做访问控制。
- 图片如何优化展示。
- 前端如何管理上传状态。

它适合这些场景：

- 用户头像上传。
- 图片画廊。
- 内容管理系统。
- 博客封面图。
- NFT metadata 或资源上传。
- 课程图片、付费媒体。
- 评论区图片。
- 商品图片。
- 后台文件管理。

不适合简单处理的场景是：文件涉及强合规、安全审计、复杂病毒扫描、大文件分片上传、企业级权限审计、多区域容灾等。这类需求需要更完整的后端文件系统设计。

---

## 2. 它是什么：基本概念介绍

图片上传不是一个单独技术，而是一组前后端协作流程。

在 Next.js App Router 中，一个典型图片上传功能通常由这些部分组成。

### file input

浏览器原生提供了文件选择能力：

```tsx
<input type="file" />
```

用户点击后，会打开操作系统级别的文件选择器。Mac、Windows、Linux 上的样式都不一样，因为这是浏览器调用系统能力。

这个元素负责让用户选择本地文件。

### File 对象

用户选中文件后，前端会拿到一个 `File` 对象。

它里面包含：

- 文件名。
- 文件大小。
- MIME 类型。
- 最后修改时间。
- 文件内容。

比如图片可能是：

```txt
name: "forest.jpg"
type: "image/jpeg"
size: 421312
```

### FormData

浏览器上传文件时，常用 `FormData`。

它可以把文件包装成表单数据，然后通过 `fetch` 发送：

```ts
const formData = new FormData();
formData.append("file", file);
```

### Route Handler

在 Next.js App Router 中，API 接口通常用 Route Handler 实现。

比如：

```txt
app/api/files/route.ts
```

这个文件对应的接口就是：

```txt
POST /api/files
```

前端可以把文件传给这个接口。

### 存储服务

应用服务器通常不直接长期保存文件，而是把文件转发到专门的存储服务。

比如：

- S3。
- Cloudflare R2。
- 阿里云 OSS。
- 腾讯云 COS。
- Pinata。
- 其他对象存储或 CDN 文件服务。

Pinata 过去在 Web3 和 NFT 场景里比较常见，因为很多 NFT 资源会涉及 IPFS 和 metadata 管理。现在它也可以用于更普通的图片和文件存储场景。

### 签名 URL

签名 URL 是一种带权限和有效期的访问链接。

简单理解，它不是一个永久公开链接，而是一个带签名参数的临时访问地址。

比如你可以让图片 URL 只在 1 小时内有效。过期之后，用户需要重新向服务器请求新的签名 URL。

它常用于：

- 付费内容。
- 私密图片。
- 会员资源。
- 限时访问。
- 防止链接长期外泄。

### 图片优化

图片优化包括：

- 改变图片尺寸。
- 转换格式，比如 WebP。
- 压缩体积。
- 使用 CDN。
- 根据设备宽度返回不同尺寸。
- 避免布局偏移。

Next.js 的 `Image` 组件和第三方图片服务都可以做一部分优化。

---

## 3. 最简单的使用方式

先看最小版本：用户选择一张图片，然后把它上传到 `/api/files`。

```tsx
"use client";

import { useRef, useState } from "react";

export function ImageUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);

    try {
      await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? "Uploading..." : "Upload Image"}
      </button>
    </div>
  );
}
```

这段代码里最关键的是三部分。

第一，`input type="file"` 才是真正打开系统文件选择器的元素。按钮只是为了更好看。按钮点击时，通过 `inputRef.current?.click()` 模拟点击文件输入框。

第二，`event.target.files?.[0]` 可以拿到用户选择的第一个文件。

第三，`FormData` 用来包装文件，并通过 `fetch` 发送给服务端。

这个例子能说明上传的前端基本原理，但还不是完整项目写法。真实项目里还要做文件类型校验、大小限制、错误提示、上传成功后的图片展示、服务端存储、签名 URL 等。

---

## 4. 核心流程是怎么跑起来的

一个完整图片上传流程，大致是这样：

1. 用户点击“上传图片”按钮。
2. 前端触发隐藏的 `<input type="file" />`。
3. 浏览器打开系统文件选择器。
4. 用户选择图片。
5. 前端从 `event.target.files` 中拿到 `File`。
6. 前端用 `FormData` 包装文件。
7. 前端通过 `fetch` 把文件发送到 Next.js Route Handler。
8. Route Handler 从 `request.formData()` 中取出文件。
9. 服务端调用存储服务 SDK，把文件上传到 CDN / 对象存储。
10. 存储服务返回文件标识。
11. 服务端生成访问 URL，最好是签名 URL。
12. 服务端把 URL 返回给前端。
13. 前端把 URL 放入 state。
14. 页面重新渲染并展示图片。

这个流程的关键点是：浏览器不要直接暴露敏感 API Key。

如果你使用存储服务，比如 Pinata、S3、R2，通常会有 API Key 或 JWT。这些密钥不能放到客户端组件里，否则用户可以在浏览器里看到它们。

所以更安全的方式是：

```txt
浏览器
  -> Next.js Route Handler
  -> 存储服务
```

而不是：

```txt
浏览器
  -> 直接带密钥上传到存储服务
```

当然，有些存储服务也支持预签名上传 URL，那是另一种常见方案。但不管哪种方式，核心原则都是：不要把长期有效的敏感密钥暴露给浏览器。

---

## 5. 常用 API / 核心能力介绍

### 5.1 `<input type="file" />`：让用户选择文件

最基础的文件选择方式是：

```tsx
<input type="file" />
```

如果只允许图片，可以加上：

```tsx
<input type="file" accept="image/*" />
```

如果允许多选：

```tsx
<input type="file" accept="image/*" multiple />
```

需要注意，`accept` 只是浏览器层面的提示和过滤，并不是安全校验。用户依然可能绕过它，所以服务端必须再次校验文件类型和大小。

### 5.2 useRef：用自定义按钮触发文件选择

原生 file input 很难完全自定义样式。常见做法是隐藏 input，然后用自己的按钮触发它。

```tsx
const inputRef = useRef<HTMLInputElement | null>(null);

<button onClick={() => inputRef.current?.click()}>
  Upload Image
</button>
<input ref={inputRef} type="file" className="sr-only" />
```

这里的 `button` 负责展示，`input` 负责真实文件选择。

这样既可以保留浏览器原生文件能力，又可以控制 UI 样式。

### 5.3 FormData：把文件发送给服务端

上传文件时，不要把文件手动转成 JSON。

应该使用 `FormData`：

```ts
const formData = new FormData();
formData.append("file", file);

await fetch("/api/files", {
  method: "POST",
  body: formData,
});
```

`fetch` 发送 `FormData` 时，浏览器会自动处理 `multipart/form-data` 相关内容。

通常不需要手动写：

```ts
headers: {
  "Content-Type": "multipart/form-data";
}
```

因为浏览器需要自动生成 boundary。你手动写反而可能出问题。

### 5.4 Route Handler：在服务端接收文件

App Router 中可以这样创建接口：

```ts
// app/api/files/route.ts
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return Response.json(
      { error: "File is required" },
      { status: 400 },
    );
  }

  return Response.json({ ok: true });
}
```

这里的 `request.formData()` 会解析前端传来的表单数据。

`formData.get("file")` 对应前端的：

```ts
formData.append("file", file);
```

### 5.5 server-only：避免服务端代码被客户端误用

如果某个文件里包含服务端密钥或服务端 SDK，最好加上：

```ts
import "server-only";
```

比如：

```ts
// src/lib/pinata.ts
import "server-only";
import { PinataSDK } from "pinata";

export const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL!,
});
```

这样如果你不小心在客户端组件里导入这个文件，Next.js 会报错。

这是一个很实用的保护手段，尤其适合存放数据库连接、存储服务 SDK、服务端 API Key 等。

### 5.6 签名 URL：控制图片访问权限

上传成功后，服务端可以返回签名 URL。

示意代码：

```ts
const signedUrl = await pinata.gateways.createSignedURL({
  cid: upload.cid,
  expires: 3600,
});
```

这里的 `expires: 3600` 表示 URL 有效期为 3600 秒，也就是 1 小时。

签名 URL 的意义是：你不一定要让文件永久公开访问。

比如用户访问付费图片时，你可以：

1. 检查用户是否登录。
2. 检查用户订阅是否有效。
3. 如果有效，生成一个短期签名 URL。
4. 返回给前端展示。
5. 过期后必须重新申请。

这比直接暴露永久公开链接更适合真实业务。

### 5.7 图片优化：尺寸、格式和 CDN

图片上传后，展示时还要考虑优化。

比如原图是 3000px 宽，但页面只展示 400px 宽，就没必要下载原图。

图片优化通常包括：

```txt
width=400
format=webp
quality=80
```

如果使用支持图片优化的服务，可以在生成 URL 时指定宽度和格式。

示意：

```ts
const url = await pinata.gateways
  .createSignedURL({
    cid: upload.cid,
    expires: 3600,
  })
  .optimizeImage({
    width: 600,
    format: "webp",
  });
```

这样前端拿到的就是更适合展示的图片地址。

### 5.8 next/image：Next.js 图片组件

Next.js 提供了 `Image` 组件：

```tsx
import Image from "next/image";

<Image
  src={url}
  alt="Uploaded image"
  width={600}
  height={400}
/>;
```

它可以帮助处理：

- 图片尺寸。
- layout shift。
- responsive srcSet。
- lazy loading。
- 格式优化。
- 远程图片加载控制。

如果使用远程图片，需要在 `next.config.js` 或 `next.config.ts` 中配置允许的图片域名。

例如：

```ts
// next.config.ts
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "your-gateway-domain.com",
      },
    ],
  },
};

export default nextConfig;
```

否则 Next.js 默认不允许加载任意远程图片。

---

## 6. 在真实业务里一般怎么组合使用

图片上传在真实业务中通常不会单独存在，它会和很多模块一起组合。

一个比较常见的组合是：

```txt
UI 组件
  -> file input
  -> 上传状态
  -> fetch API Route
  -> 服务端校验
  -> 存储服务 SDK
  -> 签名 URL
  -> 数据库记录
  -> 前端展示
  -> Next Image 优化
```

比如做一个图片画廊应用，流程可能是：

1. 用户点击上传。
2. 选择图片。
3. 前端检查文件大小和类型。
4. 上传按钮进入 loading。
5. 文件发送到 `/api/files`。
6. Route Handler 检查用户登录态。
7. 服务端检查文件大小和 MIME 类型。
8. 上传到 Pinata 或对象存储。
9. 数据库保存文件 ID、用户 ID、原始文件名、创建时间。
10. 服务端返回签名 URL。
11. 前端把图片插入列表。
12. 展示时使用 `next/image`。
13. 过期后重新请求新的签名 URL。

一个稍微完整的前端交互可能是：

```ts
const [imageUrls, setImageUrls] = useState<string[]>([]);
const [isUploading, setIsUploading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

这三个状态分别控制：

- 已上传图片列表。
- 当前是否上传中。
- 是否有错误提示。

真实项目里，还可能继续加：

- 上传进度。
- 取消上传。
- 重试。
- toast。
- 空状态。
- 删除图片。
- 批量上传。
- 图片裁剪。
- 压缩预处理。
- 用户权限校验。
- 数据库存储。
- CDN 缓存策略。

但入门时不要一上来做太复杂。先把“选文件 -> 上传 -> 返回 URL -> 展示”这条主链路跑通。

---

## 7. 常见误区和使用边界

### 误区一：把 API Key 放到客户端

这是文件上传里非常常见的错误。

比如在客户端组件里直接写：

```ts
const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
});
```

这是危险的。

因为客户端代码会被打包到浏览器，用户可能看到你的密钥。

更合理的做法是：把敏感 SDK 放在服务端文件中，并使用 Route Handler 调用。

### 误区二：只在前端校验文件类型

前端可以写：

```tsx
<input type="file" accept="image/*" />
```

但这不是安全校验。

用户可以绕过浏览器限制，直接构造请求上传其他文件。

所以服务端仍然应该检查：

- 是否真的有文件。
- 文件大小是否超限。
- MIME 类型是否合法。
- 文件扩展名是否符合预期。
- 是否需要进一步安全扫描。

### 误区三：上传成功但不返回可展示 URL

很多初学者只做到“文件上传成功”，但前端不知道上传后的文件在哪里。

更好的方式是服务端上传成功后，返回必要信息：

```json
{
  "url": "https://...",
  "id": "file-id",
  "name": "forest.jpg"
}
```

这样前端才能立即更新 UI，用户也能看到上传结果。

### 误区四：直接用原图展示

用户上传的原图可能很大。

如果直接展示原图，会带来：

- 首屏加载慢。
- 流量浪费。
- 移动端体验差。
- 图片布局抖动。
- CDN 成本上升。

更合理的做法是展示优化后的图片，比如缩放到合适宽度，并转换成 WebP。

### 误区五：以为签名 URL 等于永久权限系统

签名 URL 可以限制访问时间，但它不是完整权限系统。

真正的权限判断应该发生在服务端。

比如：

1. 用户请求图片访问地址。
2. 服务端检查用户身份。
3. 服务端检查用户是否有权限。
4. 通过后生成签名 URL。
5. 返回给用户。

不要只是生成一个长期有效签名 URL，然后认为安全问题解决了。

### 误区六：不处理上传状态

上传文件通常不是瞬间完成的。

如果没有 loading 状态，用户可能会连续点击按钮，导致重复上传。

至少应该处理：

```tsx
disabled={isUploading}
```

并展示：

```txt
Uploading...
```

真实项目里还应该处理错误提示和重试。

### 误区七：把整个页面都变成 Client Component

在 Next.js App Router 中，只要用了 `useState`、`useRef`、`onClick`、`onChange`，组件就需要 `"use client"`。

但这不代表你应该把整个页面都写成客户端组件。

更合理的方式是：

```txt
page.tsx                Server Component
components/uploader.tsx Client Component
```

页面保持服务端组件，只有上传交互部分变成客户端组件。

这样更符合 App Router 的设计思路。

---

## 8. 一个更完整的 TypeScript 示例

下面给一个简化但相对完整的 Next.js App Router 图片上传示例。

它包含：

- 客户端上传组件。
- Route Handler。
- Pinata 服务端初始化。
- 上传后返回签名 URL。
- 前端展示图片。
- 基础错误处理。

### 8.1 服务端初始化 Pinata

先创建服务端 SDK 文件。

```ts
// src/lib/pinata.ts
import "server-only";
import { PinataSDK } from "pinata";

export const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.NEXT_PUBLIC_PINATA_GATEWAY_URL!,
});
```

这里有两个环境变量：

```txt
PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY_URL=https://your-gateway-domain.com
```

`PINATA_JWT` 是敏感信息，只能在服务端使用。

`NEXT_PUBLIC_PINATA_GATEWAY_URL` 可以暴露给客户端，因为它只是公开网关地址。

`import "server-only"` 的作用是防止这个文件被客户端组件误导入。

### 8.2 创建上传接口

```ts
// app/api/files/route.ts
import { pinata } from "@/lib/pinata";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json(
        { error: "请上传文件" },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return Response.json(
        { error: "只允许上传图片" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "图片不能超过 5MB" },
        { status: 400 },
      );
    }

    const upload = await pinata.upload.file(file);

    const url = await pinata.gateways
      .createSignedURL({
        cid: upload.cid,
        expires: 60 * 60,
      })
      .optimizeImage({
        width: 800,
        format: "webp",
      });

    return Response.json({
      url,
      cid: upload.cid,
      name: file.name,
    });
  } catch {
    return Response.json(
      { error: "上传失败，请稍后重试" },
      { status: 500 },
    );
  }
}
```

这段代码做了几件事：

1. 从请求中读取 `formData`。
2. 取出 `file`。
3. 校验是否是图片。
4. 校验文件大小。
5. 上传到 Pinata。
6. 生成 1 小时有效的签名 URL。
7. 顺便做图片优化。
8. 把 URL 返回给前端。

这里的服务端校验非常重要。前端校验只是体验优化，不能替代服务端校验。

### 8.3 客户端上传组件

```tsx
// components/image-uploader.tsx
"use client";

import Image from "next/image";
import { useRef, useState } from "react";

type UploadResponse = {
  url: string;
  cid: string;
  name: string;
};

export function ImageUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("请选择图片文件");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "上传失败");
      }

      const data = result as UploadResponse;
      setImageUrls((prev) => [data.url, ...prev]);
      event.target.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {imageUrls.map((url) => (
          <div
            key={url}
            className="relative aspect-square overflow-hidden rounded-xl border bg-muted"
          >
            <Image
              src={url}
              alt="Uploaded image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </div>
        ))}
      </div>

      {imageUrls.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          还没有图片，上传一张开始创建你的画廊。
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={isUploading}
        onChange={handleFileChange}
      />
      <button
        type="button"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
        className="rounded-lg bg-black px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUploading ? "Uploading..." : "Upload Image"}
      </button>
    </section>
  );
}
```

这个组件里有几个真实项目常见细节。

第一，使用隐藏的 file input，让按钮样式更可控。

第二，上传时禁用按钮，避免重复上传。

第三，上传成功后，把服务端返回的 URL 放进 `imageUrls`，页面立即展示。

第四，使用 `next/image` 的 `fill` 和 `sizes`，让图片在响应式布局里更合理。

第五，上传后设置：

```ts
event.target.value = "";
```

这样用户可以连续选择同一个文件再次上传，否则某些浏览器不会触发 `onChange`。

### 8.4 配置 Next.js 远程图片域名

如果使用 `next/image` 加载远程图片，需要配置允许的域名。

```ts
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "your-gateway-domain.com",
      },
    ],
  },
};

export default nextConfig;
```

否则你会遇到类似 “remote image host not configured” 的错误。

---

## 9. 学习和落地建议

学习图片上传，建议按这个顺序来。

第一步，先掌握原生 file input。

你需要知道：

- `type="file"`。
- `accept`。
- `multiple`。
- `event.target.files`。
- `File` 对象。

不要一开始就上复杂上传库。

第二步，掌握 `FormData`。

文件上传和普通 JSON 请求不一样。先把：

```ts
const formData = new FormData();
formData.append("file", file);
```

这个流程搞清楚。

第三步，掌握 Next.js Route Handler。

知道如何在：

```txt
app/api/files/route.ts
```

里处理 POST 请求。

第四步，理解服务端和客户端边界。

尤其是：

- `"use client"`。
- `server-only`。
- 环境变量。
- API Key 不能进浏览器。

第五步，接入一个存储服务。

可以用 Pinata、S3、R2、OSS 等。先不要纠结哪个最好，先理解“应用服务器不适合长期保存文件”这个思路。

第六步，返回图片 URL 并展示。

上传成功后，前端应该立即拿到 URL，并更新 UI。

第七步，学习签名 URL。

如果业务涉及权限控制，一定要理解签名 URL 的价值。

第八步，学习图片优化。

包括：

- 宽度。
- 格式。
- WebP。
- CDN。
- `next/image`。
- `sizes`。
- `remotePatterns`。

第九步，再考虑进阶能力。

比如：

- 多图上传。
- 上传进度。
- 取消上传。
- 失败重试。
- 拖拽上传。
- 图片裁剪。
- 上传前压缩。
- 数据库存储。
- 删除文件。
- 权限系统。
- 文件分组。
- 大文件分片。

一个很适合练习的小 demo 是：做一个 Image Gallery Lab。

功能可以包括：

- 上传图片。
- 展示图片。
- loading 状态。
- 错误提示。
- 限制图片大小。
- 签名 URL。
- WebP 优化。
- Next Image 展示。
- 删除图片。

这个 demo 做完，你对真实项目里的文件上传会清楚很多。

---

## 10. 总结

Next.js App Router 中的图片上传，不只是一个按钮和一个接口。

它背后涉及一整条链路：

```txt
用户选择文件
  -> 浏览器拿到 File
  -> FormData 发送
  -> Route Handler 接收
  -> 服务端上传到存储服务
  -> 返回签名 URL
  -> 前端展示图片
  -> CDN 和图片优化
  -> Next Image 响应式加载
```

初学者最应该记住的是：文件上传是客户端和服务端共同完成的功能。客户端负责交互和状态，服务端负责安全、校验、密钥和存储。

如果只是做一个练习项目，可以先跑通最小链路。但如果进入真实业务，就要认真考虑文件类型、大小限制、访问权限、签名 URL、图片优化、CDN、错误处理和密钥安全。

掌握这个能力之后，你会发现很多业务功能都能复用同一套思路：头像上传、图片画廊、商品图管理、课程资源、NFT metadata、后台文件管理，本质上都是在解决“文件如何进入系统，并被安全高效地使用”这个问题。
