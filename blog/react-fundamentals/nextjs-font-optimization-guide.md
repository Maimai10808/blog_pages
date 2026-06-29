# Next.js 字体优化指南：next/font、Google Fonts、本地字体与 Tailwind CSS

在 Next.js 项目中，字体加载看起来只是一个小问题，但它会直接影响页面性能、用户体验和布局稳定性。

很多人在使用 Google Fonts 时，习惯直接复制 Google Fonts 提供的 `<link>` 标签，然后放到页面的 `<head>` 中。这样虽然能用，但在 Next.js 项目中并不是推荐方式。

Next.js 提供了 `next/font`，可以帮助我们更高效、更稳定地加载字体。

本文主要讲四件事：

1. Next.js 中不推荐怎样使用字体；
2. `next/font` 如何提升性能和开发体验；
3. 如何使用 Google Fonts 和本地字体；
4. 如何结合 Tailwind CSS 使用字体类。

---

## 一、不要直接复制 Google Fonts 的 link 标签

在传统前端项目中，我们可能会这样使用 Google Fonts。

先去 Google Fonts 官网选择字体，然后复制嵌入代码：

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap"
  rel="stylesheet"
/>
```text

然后在 CSS 中使用：

```css
body {
  font-family: "Inter", sans-serif;
}
```

这种方式在普通 HTML、React、Vue 项目中都很常见，但在 Next.js 中不太推荐。

原因是：浏览器访问页面时，需要额外向 Google Fonts 的 CDN 发起请求，先加载字体 CSS，再加载字体文件。

如果用户网络较慢，就可能出现这样的过程：

```text
页面先使用 fallback font 渲染；
Google 字体加载完成；
页面再切换成真正的字体。
```tsx

这会导致字体闪烁，也可能造成页面布局偏移。

用户会看到文字突然变样，甚至页面内容轻微抖动。这种体验并不好。

所以，在 Next.js 中，不建议直接把 Google Fonts 的 `<link>` 标签塞进 `<head>`。

更推荐的方式是使用：

```ts
next / font;
```

---

## 二、next/font 的优势

`next/font` 是 Next.js 提供的字体优化方案。

它可以自动优化字体，包括 Google Fonts 和本地字体。

它的核心优势是：

```text
自动优化字体加载；
自动 self-host 字体文件；
减少外部网络请求；
减少布局偏移；
提升隐私；
提升性能；
开发体验更好。
```text

所谓 self-host，可以理解为：

**字体文件会在构建阶段被下载下来，然后和你的 Next.js 静态资源一起部署。**

也就是说，用户打开页面时，浏览器不会再直接请求 Google Fonts。

传统方式是：

```text
浏览器 -> 请求 Google Fonts CSS
浏览器 -> 请求 Google 字体文件
```

`next/font` 的方式是：

```text
构建时下载字体
部署时字体成为项目静态资源
浏览器从当前站点加载字体
```tsx

这样可以减少外部请求，也能减少字体切换造成的布局变化。

---

## 三、使用 next/font/google 加载 Google Fonts

假设我们想在 Next.js 页面中使用 Google Font，比如 `Bokor`。

可以这样写：

```tsx
import { Bokor } from "next/font/google";

const bokor = Bokor({
  subsets: ["latin"],
  weight: "400",
});

export default function FontExamplePage() {
  return (
    <main className="p-6">
      <div className="m-6">
        <h2 className="text-xl font-bold">Bokor Font</h2>

        <p className={bokor.className}>
          This paragraph uses the Bokor font from next/font/google.
        </p>
      </div>
    </main>
  );
}
```

这里的关键有两步。

第一步，从 `next/font/google` 导入字体：

```tsx
import { Bokor } from "next/font/google";
```ts

第二步，初始化字体：

```tsx
const bokor = Bokor({
  subsets: ["latin"],
  weight: "400",
});
```

然后通过：

```tsx
bokor.className;
```tsx

把字体应用到元素上。

例如：

```tsx
<p className={bokor.className}>This paragraph uses Bokor.</p>
```

这样写之后，字体就会应用到这个段落上。

而且这个字体不是在浏览器运行时从 Google 请求的，而是在构建时被 Next.js 处理并自托管。

---

## 四、使用 next/font/local 加载本地字体

除了 Google Fonts，Next.js 也支持本地字体。

假设项目里有一个字体文件：

```text
app/fonts/GeistMono.woff
```tsx

可以使用 `next/font/local`：

```tsx
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../fonts/GeistMono.woff",
});

export default function FontExamplePage() {
  return (
    <main className="p-6">
      <div className="m-6">
        <h2 className="text-xl font-bold">Geist Mono Font</h2>

        <p className={geistMono.className}>This paragraph uses a local font.</p>
      </div>
    </main>
  );
}
```

核心代码是：

```tsx
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../fonts/GeistMono.woff",
});
```text

这里的 `src` 是字体文件路径。

注意：这个路径是相对于当前文件的路径。

如果路径写错，Next.js 会报类似无法解析字体文件的错误。

所以本地字体最容易出错的地方就是：

```text
字体文件名写错；
路径层级写错；
字体文件不在指定目录；
扩展名写错。
```

---

## 五、className 的用法

前面 Google Font 和本地字体都用了：

```tsx
font.className;
```tsx

比如：

```tsx
<p className={bokor.className}>Hello</p>
```

这种方式最简单，适合直接把某个字体应用到某个元素或某个区域。

例如：

```tsx
<div className={bokor.className}>
  <h1>Title</h1>
  <p>Paragraph</p>
</div>
```tsx

这样这个 `div` 里面的内容都会使用 `bokor` 字体。

如果只是局部使用字体，这种方式很方便。

---

## 六、用 Tailwind CSS 类名使用 next/font

有时候，我们不想每次都写：

```tsx
className={bokor.className}
```

而是希望像普通 Tailwind 类一样使用：

```tsx
className = "font-bokor";
```ts

这时就需要使用 `variable`。

---

## 七、给字体定义 CSS 变量

初始化字体时，添加 `variable`：

```tsx
import { Bokor } from "next/font/google";

const bokor = Bokor({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bokor",
});
```

这里的：

```tsx
variable: "--font-bokor";
```text

表示生成一个 CSS 变量。

注意：

```text
className 用来直接应用字体；
variable 用来生成 CSS 变量，方便 Tailwind 或 CSS 使用。
```

---

## 八、在 Tailwind 配置中注册字体

打开 `tailwind.config.ts`，在 `theme.extend.fontFamily` 中添加配置：

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        bokor: ["var(--font-bokor)"],
      },
    },
  },
  plugins: [],
};

export default config;
```text

这里配置了：

```ts
fontFamily: {
  bokor: ['var(--font-bokor)'],
}
```

于是 Tailwind 就会生成一个类名：

```text
font-bokor
```tsx

之后就可以这样使用：

```tsx
<p className="font-bokor">This paragraph uses Bokor through Tailwind CSS.</p>
```

---

## 九、把字体变量挂到父级元素上

只在 Tailwind 配置里写 `font-bokor` 还不够。

你还需要把字体变量挂到父级元素上。

最推荐的位置是 `app/layout.tsx`。

例如：

```tsx
import { Bokor } from "next/font/google";
import "./globals.css";

const bokor = Bokor({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bokor",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={bokor.variable}>
      <body>{children}</body>
    </html>
  );
}
```tsx

这样整个应用都可以使用：

```tsx
<p className="font-bokor">Hello Next.js</p>
```

也可以只在某个局部容器里挂变量：

```tsx
<div className={bokor.variable}>
  <p className="font-bokor">This text uses Bokor only inside this section.</p>
</div>
```ts

但如果这个字体是全局使用，放在 `layout.tsx` 更合适。

---

## 十、本地字体也可以配合 Tailwind CSS

本地字体同样可以用 `variable`。

例如：

```tsx
import localFont from "next/font/local";

const geistMono = localFont({
  src: "./fonts/GeistMono.woff",
  variable: "--font-geist-mono",
});
```

然后在 `layout.tsx` 中挂载：

```tsx
<html lang="en" className={geistMono.variable}>
  <body>{children}</body>
</html>
```text

Tailwind 配置：

```ts
theme: {
  extend: {
    fontFamily: {
      geist: ['var(--font-geist-mono)'],
    },
  },
}
```

使用：

```tsx
<p className="font-geist">This text uses a local font through Tailwind CSS.</p>
```tsx

---

## 十一、推荐的全局字体写法

真实项目中，通常会在 `app/layout.tsx` 中统一管理字体。

例如：

```tsx
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const geistMono = localFont({
  src: "./fonts/GeistMono.woff",
  variable: "--font-geist-mono",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

然后在 `tailwind.config.ts` 中：

```ts
theme: {
  extend: {
    fontFamily: {
      sans: ['var(--font-inter)'],
      mono: ['var(--font-geist-mono)'],
    },
  },
}
```tsx

之后项目里就可以直接使用：

```tsx
<p className="font-sans">Normal text</p>

<code className="font-mono">
  const framework = 'Next.js'
</code>
```

这种写法非常适合长期维护的项目。

---

## 十二、className 和 variable 怎么选？

可以简单这样记：

| 用法             | 适合场景                          |
| ---------------- | --------------------------------- |
| `font.className` | 直接把字体应用到某个元素或区域    |
| `font.variable`  | 配合 Tailwind CSS 或 CSS 变量使用 |

例如局部页面临时使用：

```tsx
<p className={bokor.className}>Hello</p>
```tsx

全局项目统一管理：

```tsx
<html className={inter.variable}>
```

然后用：

```tsx
<p className="font-sans">Hello</p>
```tsx

---

## 十三、常见错误

### 1. 继续使用 Google Fonts link 标签

不推荐：

```html
<link href="https://fonts.googleapis.com/..." rel="stylesheet" />
```

推荐：

```tsx
import { Inter } from "next/font/google";
```text

---

### 2. 本地字体路径写错

例如当前文件在：

```text
app/font-example/page.tsx
```

字体在：

```text
app/fonts/GeistMono.woff
```text

那么路径可能是：

```tsx
src: "../fonts/GeistMono.woff";
```

路径要根据实际文件位置调整。

---

### 3. Tailwind 配置了 fontFamily，但没挂 variable

错误情况：

```ts
fontFamily: {
  bokor: ['var(--font-bokor)'],
}
```tsx

但页面或 layout 中没有：

```tsx
className={bokor.variable}
```

这样 `font-bokor` 可能不会生效。

---

### 4. 把 className 和 variable 混用

直接应用字体用：

```tsx
bokor.className;
```text

Tailwind 变量用：

```tsx
bokor.variable;
```

不要混淆。

---

## 十四、字体优化和图片优化一样重要吗？

字体优化是性能优化的一个重要部分。

它可以减少字体闪烁、减少布局偏移、减少外部请求。

不过，在很多应用中，真正造成最大性能瓶颈的往往是图片。

Next.js 也提供了：

```tsx
next / image;
```text

用于图片优化。

所以一个比较完整的性能优化思路是：

```text
字体用 next/font；
图片用 next/image；
非首屏重型组件用 next/dynamic；
页面数据合理使用缓存。
```

这样才能系统性提升 Next.js 应用的加载性能和用户体验。

---

## 十五、总结

在 Next.js 中，不推荐直接复制 Google Fonts 的 `<link>` 标签到页面中。

更推荐使用 `next/font`。

使用 Google Fonts：

```tsx
import { Bokor } from "next/font/google";

const bokor = Bokor({
  subsets: ["latin"],
  weight: "400",
});
```ts

使用本地字体：

```tsx
import localFont from "next/font/local";

const geistMono = localFont({
  src: "../fonts/GeistMono.woff",
});
```

直接应用字体：

```tsx
<p className={bokor.className}>Hello</p>
```ts

配合 Tailwind CSS：

```tsx
const bokor = Bokor({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bokor",
});
```

```ts
fontFamily: {
  bokor: ['var(--font-bokor)'],
}
```tsx

```tsx
<p className="font-bokor">Hello</p>
```

一句话总结：

**Next.js 中字体不要当普通外链资源来加载；用 `next/font` 可以让字体自托管、减少外部请求、降低布局偏移，并且能很好地配合 Tailwind CSS 使用。**
