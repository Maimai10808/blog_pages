# Vite 入门指南：更快启动、更快更新的现代前端构建工具

在现代前端开发中，构建工具已经成为项目不可缺少的一部分。无论你使用 React、Vue、Svelte，还是原生 JavaScript，都需要一个工具来帮你启动开发服务器、处理模块、加载静态资源、读取环境变量、支持 TypeScript，并最终打包生产环境代码。

过去很多项目依赖 Webpack，但随着项目变大，开发服务器启动慢、热更新慢的问题会越来越明显。Vite 正是为了解决这些问题而出现的。

Vite 是一个下一代前端构建工具，它最大的特点就是快。它可以做到几乎瞬间启动项目，并在你修改代码后快速更新页面，大幅提升开发体验。

---

## 一、Vite 是什么

Vite 是一个现代前端构建工具，名字来自法语，意思是“快速”。

它由 Vue.js 作者尤雨溪创建，最初是为了改善传统构建工具在开发阶段的性能问题。

Vite 的目标很明确：

```text
快速启动开发服务器
快速响应代码更新
减少不必要的打包工作
提供现代化的开发体验
支持多种前端框架
```

Vite 并不只适用于 Vue。它是框架无关的，可以用于：

```text
React
Vue
Svelte
Preact
Lit
Vanilla JavaScript
```

这也是它现在被广泛使用的重要原因。

---

## 二、为什么 Vite 比传统工具快

传统构建工具，比如 Webpack，在开发服务器启动时，通常需要先扫描整个项目，把所有模块打包好，然后再提供给浏览器。

项目越大，启动越慢。

Vite 的思路不同。

它会把项目里的模块分成两类：

```text
依赖代码：node_modules 里的第三方库
源码代码：你自己写的业务代码
```

对于依赖代码，Vite 使用非常快的 esbuild 进行预构建。

对于源码代码，Vite 使用浏览器原生 ES Modules 能力，不会一开始就把整个项目完整打包。

这意味着：Vite 不需要在启动时做大量工作，所以开发服务器可以非常快地启动。

当你修改代码时，Vite 也不会重新打包整个应用，而是只替换发生变化的模块。这就是 HMR，也就是 Hot Module Replacement，热模块替换。

---

## 三、创建一个 Vite React 项目

使用 Vite 创建项目非常简单。

首先需要安装 Node.js。当前 Vite 通常要求 Node.js 18+ 或 20+。

可以先检查版本：

```bash
node --version
```

再检查 npm 版本：

```bash
npm --version
```

然后创建项目：

```bash
npm create vite@latest
```

Vite 会提示你输入项目名称。如果想在当前目录创建，可以输入：

```bash
.
```

接着选择框架：

```text
React
```

再选择语言：

```text
JavaScript
```

创建完成后，安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

默认情况下，Vite 会把项目运行在：

```text
http://localhost:5173
```

此时你就能看到 Vite 创建好的 React 初始页面。

---

## 四、Vite 项目结构

一个典型的 Vite React 项目大致是这样的：

```text
project/
  index.html
  public/
    vite.svg
  src/
    assets/
      react.svg
    App.jsx
    main.jsx
  package.json
  vite.config.js
```

几个关键文件和目录：

```text
index.html：项目入口 HTML
src：源码目录
src/assets：需要被构建工具处理和优化的静态资源
public：不需要优化、直接原样复制的静态资源
package.json：依赖和 npm scripts
vite.config.js：Vite 配置文件
```

和很多传统前端项目不同，Vite 的 `index.html` 是一个非常重要的入口文件。Vite 会从这里开始加载你的应用代码。

---

## 五、Vite 的开发体验：HMR 热更新

Vite 最大的优势之一是开发体验非常快。

例如你在 React 项目中新增一个 Header 组件：

```jsx
export default function Header() {
  return (
    <header>
      <h1>Hello Vite</h1>
    </header>
  );
}
```

然后在 `App.jsx` 中引入：

```jsx
import Header from "./components/Header";

function App() {
  return (
    <>
      <Header />
      {/* other content */}
    </>
  );
}

export default App;
```

保存文件后，页面几乎会立刻更新。

更重要的是，Vite 的 HMR 不会轻易丢失应用状态。

例如页面上有一个计数器，当前 count 是 3。你修改组件代码后，页面更新了，但 count 仍然保持 3，而不是整个页面刷新回初始状态。

这就是 HMR 的价值：
只替换变化的模块，而不是重新加载整个应用。

---

## 六、Vite 如何处理静态资源

在 Vite 中，静态资源主要有两种处理方式。

第一种：放在 `src/assets` 中，通过 import 引入。

第二种：放在 `public` 中，通过绝对路径访问。

### 1. 放在 src/assets 中

例如：

```text
src/assets/react.svg
src/assets/logo.png
```

在代码中引入：

```jsx
import logo from "./assets/logo.png";

function App() {
  return <img src={logo} alt="Logo" />;
}
```

这种方式下，Vite 会在构建时优化资源。

常见优化包括：

```text
给文件名添加 hash，方便缓存
小于一定大小的资源可能会被转成 base64 内联
可以通过插件进一步优化
```

构建后，文件名可能变成：

```text
logo-Dkfj391a.png
```

这个 hash 有利于浏览器缓存。文件内容改变后，hash 也会变，浏览器就能重新加载新文件。

### 2. 放在 public 中

例如：

```text
public/vite.svg
public/robots.txt
```

使用时：

```jsx
<img src="/vite.svg" alt="Vite Logo" />
```

`public` 目录中的文件不会被 Vite 优化，而是会原样复制到最终构建目录。

适合放在 `public` 的资源包括：

```text
robots.txt
favicon.ico
manifest.json
不需要 hash 的静态文件
需要固定路径访问的资源
```

简单判断：

```text
需要优化、hash、import 的资源：放 src/assets
需要原样复制、固定路径访问的资源：放 public
```

---

## 七、Vite 中使用环境变量

Vite 提供了环境变量能力。

在 Vite 中，可以通过：

```js
import.meta.env;
```

访问环境信息。

Vite 内置了一些变量：

```text
import.meta.env.BASE_URL：应用基础路径
import.meta.env.MODE：当前模式，例如 development 或 production
import.meta.env.DEV：是否是开发环境
import.meta.env.PROD：是否是生产环境
import.meta.env.SSR：是否是服务端渲染环境
```

例如：

```js
console.log(import.meta.env.MODE);
console.log(import.meta.env.DEV);
```

### 自定义环境变量

在项目根目录创建 `.env` 文件：

```env
VITE_GREETING=Howdy
```

在代码中读取：

```jsx
const greeting = import.meta.env.VITE_GREETING;

function App() {
  return <h2>{greeting}</h2>;
}
```

注意，Vite 中暴露给客户端的环境变量必须以：

```text
VITE_
```

开头。

如果你写：

```env
API_KEY=abc123
```

客户端代码中无法直接通过 `import.meta.env.API_KEY` 读取。

如果你写：

```env
VITE_API_URL=https://api.example.com
```

就可以这样读取：

```js
const apiUrl = import.meta.env.VITE_API_URL;
```

### 重要提醒

Vite 的环境变量会进入前端代码，所以不要把真正敏感的密钥放到 `VITE_` 变量里。

错误示例：

```env
VITE_SECRET_KEY=super_secret
```

只要加了 `VITE_` 并在前端使用，最终用户就有可能看到它。

适合放在 Vite 客户端环境变量里的内容包括：

```text
公开 API 地址
Google Analytics ID
公开项目 ID
站点名称
非敏感配置
```

不适合放：

```text
数据库密码
服务端 API Secret
JWT Secret
支付平台 Secret Key
私有 Token
```

如果你需要保护敏感信息，应该放到服务端，由服务端接口转发请求。

---

## 八、Vite 与 TypeScript

Vite 对 TypeScript 支持非常友好。

如果你创建项目时选择 TypeScript，Vite 会自动生成相关配置，包括：

```text
tsconfig.json
vite-env.d.ts
TypeScript 相关依赖
```

如果你一开始选的是 JavaScript，也可以逐步迁移。

例如把：

```text
main.jsx
```

改成：

```text
main.tsx
```

同时记得修改 `index.html` 中的入口路径：

```html
<script type="module" src="/src/main.tsx"></script>
```

不过需要注意，Vite 默认负责 TypeScript 的转译，也就是把 TypeScript 转成浏览器能运行的 JavaScript。

类型检查通常交给 IDE 和 TypeScript 编译器完成。

如果你想在构建时做类型检查，可以在 `package.json` 中配置：

```json
{
  "scripts": {
    "build": "tsc && vite build"
  }
}
```

这样构建时会先执行 TypeScript 类型检查，再执行 Vite 生产构建。

如果是从 JavaScript 项目迁移到 TypeScript，推荐做法是：

```text
先创建一个新的 Vite TypeScript 项目作为参考
复制 tsconfig.json 和 vite-env.d.ts
安装 TypeScript 相关依赖
逐步把 .js / .jsx 改成 .ts / .tsx
逐步补类型，不要一次性全部重构
```

---

## 九、构建生产环境代码

开发时使用：

```bash
npm run dev
```

生产构建使用：

```bash
npm run build
```

在 `package.json` 中通常是：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

运行：

```bash
npm run build
```

Vite 会生成生产环境文件，默认输出到：

```text
dist/
```

构建完成后，你可以本地预览：

```bash
npm run preview
```

它会启动一个静态服务器，默认地址通常是：

```text
http://localhost:4173
```

需要注意：

```text
npm run dev：开发服务器，不等于生产环境
npm run build：生成生产环境静态文件
npm run preview：本地预览生产构建结果
```

部署时，一般部署的是 `dist` 目录中的文件。

---

## 十、配置 Vite

Vite 默认配置已经很好用，但它也很灵活。

配置文件是：

```text
vite.config.js
```

一个典型的 React 配置：

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});
```

### 修改开发服务器端口

默认端口是 5173。如果想改成 3000：

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
});
```

然后运行：

```bash
npm run dev
```

应用就会运行在：

```text
http://localhost:3000
```

### 修改构建输出目录

默认输出目录是 `dist`。

如果你想改成 `out`：

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "out",
  },
});
```

然后执行：

```bash
npm run build
```

构建结果会输出到：

```text
out/
```

Vite 可以配置的内容很多，比如：

```text
server
build
preview
plugins
resolve alias
base
css
env
assets
```

日常开发中最常见的是端口、输出目录、路径别名和插件配置。

---

## 十一、使用 Vite 插件扩展能力

Vite 的核心理念是：核心保持精简，通过插件扩展能力。

Vite 插件基于 Rollup 插件机制，因此它既能使用 Vite 插件生态，也能受益于 Rollup 丰富的插件生态。

使用插件一般有三步：

```text
安装插件
在 vite.config.js 中 import
添加到 plugins 数组
```

### 示例：添加二维码插件

假设你想在本机开发时用手机访问项目，可以使用二维码插件。

安装：

```bash
npm install -D vite-plugin-qrcode
```

配置：

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { qrcode } from "vite-plugin-qrcode";

export default defineConfig({
  plugins: [react(), qrcode()],
});
```

如果需要让局域网设备访问，还可以在启动命令中添加：

```bash
vite --host
```

这样启动后，终端会显示二维码。你可以用手机扫码，在手机上测试页面。

### 示例：把 SVG 当成 React 组件

常用插件是：

```text
vite-plugin-svgr
```

安装：

```bash
npm install -D vite-plugin-svgr
```

配置：

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";

export default defineConfig({
  plugins: [react(), svgr()],
});
```

使用：

```jsx
import ReactLogo from "./assets/react.svg?react";

function App() {
  return <ReactLogo className="h-24 w-24" />;
}
```

这样 SVG 就可以像 React 组件一样使用。

插件是 Vite 非常重要的一部分。遇到需求时，建议先看文档和插件生态，而不是自己硬写复杂配置。

---

## 十二、Vite 为什么开发阶段这么快

Vite 快的原因主要来自几个方面。

### 1. 开发阶段不完整打包源码

传统工具在启动时需要先打包整个应用。

Vite 则利用浏览器原生 ESM，让浏览器按需请求模块。

所以项目越大，Vite 的启动优势越明显。

### 2. 依赖预构建使用 esbuild

Vite 使用 esbuild 预构建依赖。

esbuild 使用 Go 编写，速度非常快，通常比传统 JavaScript 打包工具快很多。

### 3. HMR 基于原生 ESM

代码更新时，Vite 只替换变化的模块，而不是重新构建整个应用。

所以修改组件、样式、模块时，反馈速度非常快。

### 4. 生产构建使用 Rollup

开发阶段追求快速反馈，生产阶段追求优化结果。

Vite 在生产构建中使用 Rollup，可以获得成熟的打包优化能力。

---

## 十三、Vite 背后的工具：esbuild、Rollup、SWC 与 Rolldown

Vite 本身并不是孤立工作的，它站在多个优秀工具之上。

### esbuild

Vite 在开发阶段使用 esbuild 做依赖预构建。

特点是非常快。

### Rollup

Vite 在生产构建中使用 Rollup。

Rollup 有成熟的 tree-shaking、打包优化和插件生态。

### SWC

在某些场景中，Vite 也可以使用基于 Rust 的 SWC 来提升转译速度。

### Rolldown

由于 Vite 依赖多个工具，也会带来一些一致性、维护成本和性能方面的问题。

为了解决这些问题，Vite 生态正在推进 Rolldown。它是一个基于 Rust 的打包工具，目标是融合 esbuild、Rollup、SWC 等工具的能力，为 Vite 提供更统一、更快的底层能力。

简单理解：

```text
现在的 Vite：esbuild + Rollup + 可选 SWC
未来方向：更统一、更快的 Rolldown
```

这也说明 Vite 并不是停滞的工具，它仍然在持续演进。

---

## 十四、Vite 常用命令总结

日常开发中最常用的是这几个命令：

```bash
npm create vite@latest
```

创建项目。

```bash
npm install
```

安装依赖。

```bash
npm run dev
```

启动开发服务器。

```bash
npm run build
```

构建生产环境代码。

```bash
npm run preview
```

本地预览生产构建结果。

如果使用 TypeScript，并希望构建前检查类型：

```json
{
  "scripts": {
    "build": "tsc && vite build"
  }
}
```

---

## 十五、Vite 项目开发建议

使用 Vite 时，可以遵循这些实践：

```text
静态资源需要优化时放 src/assets
需要原样输出的文件放 public
客户端环境变量必须以 VITE_ 开头
不要把敏感密钥放进 VITE_ 环境变量
新项目如果确定用 TypeScript，创建时直接选择 TypeScript
生产前使用 npm run build
上线前用 npm run preview 检查构建结果
需要特殊能力优先查 Vite 插件生态
配置尽量保持简单，不要过度工程化
```

Vite 的理念就是简单、快速、够用。不要一开始就把配置写得很复杂。

---

## 总结

Vite 是一个面向现代前端开发的构建工具。它的核心优势是快，尤其是在开发阶段。

它解决的问题包括：

```text
项目启动慢
代码更新慢
构建配置复杂
静态资源处理麻烦
环境变量管理不清晰
TypeScript 接入繁琐
插件扩展不方便
```

通过 Vite，你可以快速创建 React、Vue、Svelte 等项目，享受即时启动、快速热更新、简单配置、灵活插件和优化后的生产构建。

如果用一句话总结 Vite：

```text
Vite 让开发阶段尽可能快，让生产构建尽可能稳。
```

对于现代前端开发来说，Vite 已经成为非常值得掌握的基础工具。无论你是刚开始学习 React，还是准备搭建正式项目，都应该熟悉它的项目结构、静态资源处理、环境变量、TypeScript、生产构建、配置和插件机制。

掌握 Vite，不只是学会一个构建工具，而是理解现代前端开发工作流的一部分。
