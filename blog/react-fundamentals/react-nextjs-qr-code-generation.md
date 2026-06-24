# React / Next.js 中生成二维码的三种方式：客户端生成、服务端生成与外部 API 方案

二维码在 Web 项目中非常常见。

比如：

```text
用户个人主页二维码
邀请注册链接二维码
支付二维码
活动报名二维码
网站访问二维码
App 下载二维码
后台管理系统中的分享二维码
```

在 React 或 Next.js 项目中，生成二维码其实并不复杂。根据业务场景不同，我们可以选择不同的实现方式。

本文将介绍三种生成二维码的方案：

```text
1. 使用 npm 包在客户端生成二维码
2. 在 Next.js 服务端生成二维码图片
3. 直接使用第三方二维码 API 生成图片地址
```

其中前两种更适合项目内可控场景，第三种最简单，但依赖外部服务。

---

## 一、准备一个基础页面

假设我们有一个 Next.js 页面，页面中有一个输入框和一个按钮。

用户输入 GitHub 用户名后，点击按钮，就生成一个指向该 GitHub 主页的二维码。

基础代码如下：

```tsx
"use client";

import { useState } from "react";

export default function QRCodePage() {
  const [username, setUsername] = useState("");
  const [source, setSource] = useState("");

  function generate() {
    // 后面在这里生成二维码
  }

  return (
    <main>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="请输入 GitHub 用户名"
      />

      <button type="button" onClick={generate}>
        Generate
      </button>

      {source && <img src={source} alt="QR Code" />}
    </main>
  );
}
```

这里有两个状态：

```tsx
const [username, setUsername] = useState("");
const [source, setSource] = useState("");
```

`username` 用来保存输入框中的内容。

`source` 用来保存二维码图片的地址，最终作为 `img` 标签的 `src`。

页面逻辑非常简单：

```text
用户输入 username
点击 Generate
生成二维码图片地址
把二维码地址设置到 source
页面渲染 img
```

---

## 二、方案一：使用 npm 包 qrcode 在客户端生成

第一种方案是使用 npm 包生成二维码。

常用的包是：

```bash
npm install qrcode
```

如果你的项目使用 TypeScript，还可能需要安装类型声明：

```bash
npm install -D @types/qrcode
```

安装完成后，可以在组件中引入：

```tsx
import QRCode from "qrcode";
```

然后使用 `QRCode.toDataURL()` 生成二维码。

完整示例：

```tsx
"use client";

import { useState } from "react";
import QRCode from "qrcode";

export default function QRCodePage() {
  const [username, setUsername] = useState("");
  const [source, setSource] = useState("");

  function generate() {
    QRCode.toDataURL(`https://github.com/${username}`).then(setSource);
  }

  return (
    <main>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="请输入 GitHub 用户名"
      />

      <button type="button" onClick={generate}>
        Generate
      </button>

      {source && <img src={source} alt="QR Code" />}
    </main>
  );
}
```

这里的核心代码是：

```tsx
QRCode.toDataURL(`https://github.com/${username}`).then(setSource);
```

`QRCode.toDataURL()` 会把目标链接转换成一个 base64 格式的图片地址。

生成结果大概类似：

```text
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

这个字符串可以直接作为图片的 `src` 使用。

---

## 三、为什么可以直接 then(setSource)？

很多人可能会写成：

```tsx
QRCode.toDataURL(`https://github.com/${username}`).then((value) => {
  setSource(value);
});
```

这当然是可以的。

但因为 `then` 回调函数的第一个参数就是生成出来的二维码字符串，而 `setSource` 本身也正好接收一个字符串，所以可以简写成：

```tsx
QRCode.toDataURL(`https://github.com/${username}`).then(setSource);
```

这两种写法效果是一样的。

---

## 四、方案一的优缺点

使用 `qrcode` 这个 npm 包的优点是：

```text
生成过程完全在项目内完成
不依赖外部二维码服务
可控性更强
适合正式项目
可以生成 DataURL、Canvas、String、文件等多种形式
```

缺点是：

```text
需要额外安装依赖
前端 bundle 体积会增加一点
客户端需要执行二维码生成逻辑
```

如果项目对稳定性要求较高，不希望依赖外部 API，那么这种方案更推荐。

---

## 五、方案二：在 Next.js 服务端生成二维码图片

第二种方案是：在 Next.js 服务端生成图片，再返回给前端使用。

视频中的做法是通过 Next.js API Route 返回一张图片，并在图片中嵌入二维码。

服务端可以通过某个接口来生成二维码图片地址，例如：

```text
https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=目标链接
```

这个接口会根据 `data` 参数生成二维码图片。

例如：

```text
https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com/example
```

这本身就是一张图片地址，可以直接放到 `img` 的 `src` 中。

在 Next.js 中，如果你要通过服务端 API 包一层，可以写一个 API Route。

例如在 App Router 中：

```tsx
// app/api/qr/route.ts

import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username") || "";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    `https://github.com/${username}`,
  )}`;

  return Response.redirect(qrUrl);
}
```

然后前端使用：

```tsx
const imageUrl = `/api/qr?username=${username}`;
```

完整前端示例：

```tsx
"use client";

import { useState } from "react";

export default function QRCodePage() {
  const [username, setUsername] = useState("");
  const [source, setSource] = useState("");

  function generate() {
    const imageUrl = `/api/qr?username=${encodeURIComponent(username)}`;
    setSource(imageUrl);
  }

  return (
    <main>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="请输入 GitHub 用户名"
      />

      <button type="button" onClick={generate}>
        Generate
      </button>

      {source && <img src={source} alt="QR Code" />}
    </main>
  );
}
```

这样前端访问的是自己的 API：

```text
/api/qr?username=xxx
```

再由服务端转发或生成二维码。

---

## 六、服务端生成方案适合什么场景？

如果只是简单地显示一个二维码，其实没有必要绕到服务端。

但服务端生成二维码在一些场景中是有价值的：

```text
需要隐藏真实生成逻辑
需要统一处理二维码参数
需要给二维码图片加水印、背景图或样式
需要生成 Open Graph 图片
需要动态生成分享海报
需要控制缓存策略
需要记录二维码生成日志
```

比如你要生成一张分享海报，里面既有用户头像、用户名，也有二维码，这种时候服务端生成会更合适。

如果只是单纯生成一个链接二维码，客户端生成就足够了。

---

## 七、方案三：客户端直接使用第三方二维码 API

第三种方式最简单：不安装 npm 包，也不写服务端接口，直接在前端拼接二维码图片地址。

核心地址是：

```text
https://api.qrserver.com/v1/create-qr-code/
```

可以通过 query 参数指定二维码尺寸和内容：

```text
https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://github.com/example
```

前端代码如下：

```tsx
"use client";

import { useState } from "react";

export default function QRCodePage() {
  const [username, setUsername] = useState("");
  const [source, setSource] = useState("");

  function generate() {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      `https://github.com/${username}`,
    )}`;

    setSource(url);
  }

  return (
    <main>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="请输入 GitHub 用户名"
      />

      <button type="button" onClick={generate}>
        Generate
      </button>

      {source && <img src={source} alt="QR Code" />}
    </main>
  );
}
```

这种方式不需要 `fetch`。

因为我们不是要请求 JSON，也不是要手动下载图片数据。

我们只是需要一张图片，而这个 URL 本身就会返回图片。

所以直接把它赋值给 `img src` 就可以了。

---

## 八、为什么不需要 fetch？

很多初学者会下意识地这样写：

```tsx
async function generate() {
  const res = await fetch(qrApiUrl);
  const data = await res.blob();
}
```

但在这个场景中完全没必要。

因为浏览器的 `img` 标签本身就可以加载远程图片。

你只需要：

```tsx
<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=xxx" />
```

浏览器会自动请求这张图片并显示出来。

所以生成逻辑可以非常简单：

```tsx
function generate() {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
    targetUrl,
  )}`;

  setSource(url);
}
```

这比手动 `fetch` 更直接，也更符合这个场景。

---

## 九、三种方案对比

### 方案一：npm 包 qrcode

```text
实现方式：项目内生成二维码 DataURL
是否需要依赖：需要 qrcode 包
是否依赖外部服务：不依赖
适合场景：正式项目、稳定性要求高、希望生成逻辑可控
```

优点：

```text
稳定可控
不依赖第三方在线接口
功能丰富
可以生成多种格式
```

缺点：

```text
需要安装依赖
客户端会多一些代码体积
```

---

### 方案二：Next.js 服务端生成

```text
实现方式：通过 API Route 或服务端逻辑生成二维码
是否需要依赖：看具体实现
是否依赖外部服务：可依赖，也可不依赖
适合场景：动态海报、OG 图片、服务端统一处理、需要隐藏生成逻辑
```

优点：

```text
适合复杂图片生成
可以统一控制缓存和权限
可以结合用户信息生成动态图片
前端逻辑更轻
```

缺点：

```text
实现复杂度更高
简单二维码场景下有点重
```

---

### 方案三：第三方二维码 API

```text
实现方式：前端直接拼接二维码图片 URL
是否需要依赖：不需要
是否依赖外部服务：依赖
适合场景：Demo、小工具、低风险功能、快速开发
```

优点：

```text
最简单
不需要安装依赖
不需要写后端接口
直接设置 img src 即可
```

缺点：

```text
依赖第三方服务可用性
外部接口不可控
重要项目中稳定性不如本地生成
可能存在隐私和安全考虑
```

---

## 十、实际项目中推荐怎么选？

如果只是做一个学习 Demo，或者临时项目，可以直接使用第三种方式：

```tsx
const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
  targetUrl,
)}`;
```

它最简单，几行代码就能实现。

如果是正式项目，更推荐使用第一种方式：

```tsx
QRCode.toDataURL(targetUrl).then(setSource);
```

因为它不依赖第三方在线服务，稳定性更好，也更可控。

如果你的业务不只是生成二维码，而是生成一张完整图片，比如邀请海报、活动分享图、Open Graph 图片，那么可以考虑第二种服务端生成方案。

可以简单记成：

```text
学习 Demo：用第三方 API
正式二维码功能：用 qrcode npm 包
复杂动态图片：用 Next.js 服务端生成
```

---

## 十一、注意事项

### 1. 记得 encodeURIComponent

生成二维码时，目标链接中可能包含特殊字符，例如：

```text
?、&、=、中文、空格
```

所以拼接到 URL 参数中时，一定要使用：

```tsx
encodeURIComponent(targetUrl);
```

例如：

```tsx
const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
  `https://github.com/${username}`,
)}`;
```

否则可能导致二维码内容不完整或链接解析错误。

---

### 2. 输入值需要校验

如果用户输入的是 GitHub 用户名，建议做简单校验：

```tsx
if (!username.trim()) {
  return;
}
```

也可以限制字符：

```tsx
const value = username.trim();
```

避免生成空二维码或无效链接。

---

### 3. 图片需要 alt

二维码图片也应该加上 `alt`：

```tsx
<img src={source} alt="Generated QR Code" />
```

这有利于可访问性，也符合更好的 HTML 习惯。

---

### 4. 不要把敏感信息直接放进二维码

二维码本质上就是把一段文本编码成图片。

任何人扫描二维码，都可以看到里面的内容。

所以不要直接把这些信息放进二维码：

```text
token
密码
用户隐私数据
后台接口密钥
一次性敏感凭证
```

如果必须生成和用户身份相关的二维码，最好使用后端生成的短链接或一次性 ID，再由服务端做权限校验。

---

## 十二、完整示例：推荐的 npm 包方案

下面是一个比较适合正式项目的完整示例：

```tsx
"use client";

import { useState } from "react";
import QRCode from "qrcode";

export default function QRCodePage() {
  const [username, setUsername] = useState("");
  const [source, setSource] = useState("");

  async function generate() {
    const value = username.trim();

    if (!value) {
      setSource("");
      return;
    }

    const targetUrl = `https://github.com/${value}`;
    const qrCodeUrl = await QRCode.toDataURL(targetUrl);

    setSource(qrCodeUrl);
  }

  return (
    <main>
      <div>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="请输入 GitHub 用户名"
        />

        <button type="button" onClick={generate}>
          Generate
        </button>
      </div>

      {source && (
        <div>
          <img src={source} alt="Generated QR Code" />
        </div>
      )}
    </main>
  );
}
```

这个版本具备几个优点：

```text
不依赖第三方在线二维码 API
对空输入做了处理
二维码内容清晰可控
适合 React 和 Next.js 客户端组件
```

---

## 十三、完整示例：最简单的第三方 API 方案

如果你不想安装任何依赖，可以使用下面这个版本：

```tsx
"use client";

import { useState } from "react";

export default function QRCodePage() {
  const [username, setUsername] = useState("");
  const [source, setSource] = useState("");

  function generate() {
    const value = username.trim();

    if (!value) {
      setSource("");
      return;
    }

    const targetUrl = `https://github.com/${value}`;

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      targetUrl,
    )}`;

    setSource(qrCodeUrl);
  }

  return (
    <main>
      <div>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="请输入 GitHub 用户名"
        />

        <button type="button" onClick={generate}>
          Generate
        </button>
      </div>

      {source && (
        <div>
          <img src={source} alt="Generated QR Code" />
        </div>
      )}
    </main>
  );
}
```

这个版本的特点是：

```text
无需安装依赖
无需写 API Route
无需 fetch
直接设置 img src
```

但它依赖外部服务，不建议用于特别重要的核心业务。

---

## 十四、总结

在 React 或 Next.js 中生成二维码，常见方案有三种：

```text
1. 使用 qrcode npm 包，在客户端生成 DataURL
2. 使用 Next.js API Route，在服务端生成或封装二维码图片
3. 直接使用第三方二维码 API，把图片地址设置给 img src
```

如果你想快速实现，第三方 API 最简单。

如果你想用于正式项目，`qrcode` npm 包更稳妥。

如果你要生成动态海报、分享图、OG 图片，可以考虑服务端生成。

最终可以这样选择：

```text
简单 Demo：第三方 API
正式项目：qrcode npm 包
复杂图片：Next.js 服务端生成
```

一句话总结：

**二维码本质上就是把一段文本或链接编码成图片。在 React / Next.js 中，你可以选择客户端生成，也可以选择服务端生成；关键是根据项目稳定性、依赖控制和业务复杂度选择合适方案。**
