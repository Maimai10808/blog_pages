# Next.js 环境变量使用指南：不要再把 API Key 写死在代码里

在前端项目中，如果你需要使用 API Key、数据库地址、第三方服务密钥等敏感信息，最糟糕的做法就是直接把它们写成字符串放进项目代码里。

比如：

```ts id="0g5o41"
const API_KEY = "abc123";
```

这种写法非常危险。因为一旦代码被提交到 GitHub，或者被打包到客户端，敏感信息就可能被别人看到。

正确做法是使用环境变量。

在 Next.js 项目里，环境变量是管理敏感配置的标准方式。它可以让你把不同环境下的配置和代码分离，同时避免把敏感信息暴露给客户端。

---

## 一、什么是环境变量

环境变量可以理解为项目运行时读取的一组配置。

它通常是 key-value 形式：

```env id="lq23q4"
API_KEY=abc123
DATABASE_URL=postgresql://example
JWT_SECRET=my_secret
```

左边是变量名，右边是变量值。

环境变量常用于保存：

```text id="yalksd"
API Key
数据库连接地址
JWT Secret
OAuth Client Secret
第三方服务 Token
不同环境下的接口地址
站点配置
```

它的核心价值是：配置和代码分离。

代码里不直接写死敏感信息，而是在运行时从环境变量中读取。

---

## 二、创建 .env.local 文件

在 Next.js 项目根目录下，可以创建一个文件：

```text id="yucy90"
.env.local
```

然后写入环境变量：

```env id="ak0fzg"
API_KEY=abc123
```

注意，环境变量通常不需要加引号。

如果值里有空格或特殊字符，可以按实际情况加引号，但大多数 API Key 直接写即可。

---

## 三、修改环境变量后要重启服务

环境变量不是热更新的。

如果你新增或修改了 `.env.local`，需要重启开发服务器：

```bash id="t6ocuo"
npm run dev
```

或者：

```bash id="2lpq6i"
pnpm dev
```

如果是在生产环境修改环境变量，通常需要重新部署项目。

这是很多人刚开始使用环境变量时容易忽略的点。

---

## 四、在服务端读取环境变量

在 Next.js 中，可以通过 `process.env` 读取环境变量。

例如：

```ts id="ssufez"
process.env.API_KEY;
```

在服务端代码中可以这样使用：

```ts id="k37tt8"
console.log(process.env.API_KEY);
```

例如 API Route：

```ts id="r2i8o7"
export async function GET() {
  const apiKey = process.env.API_KEY;

  return Response.json({
    hasApiKey: Boolean(apiKey),
  });
}
```

也可以在服务端函数中使用，例如请求第三方接口：

```ts id="r1e2da"
export async function getData() {
  const res = await fetch("https://api.example.com/data", {
    headers: {
      Authorization: `Bearer ${process.env.API_KEY}`,
    },
  });

  return res.json();
}
```

服务端环境变量适合保存真正敏感的信息，比如：

```text id="2c6x20"
API_KEY
DATABASE_URL
JWT_SECRET
STRIPE_SECRET_KEY
GITHUB_CLIENT_SECRET
```

这些变量不应该暴露给浏览器。

---

## 五、为什么普通环境变量不能在客户端读取

如果你在客户端组件里这样写：

```tsx id="dn2j3q"
console.log(process.env.API_KEY);
```

你通常会得到：

```text id="sd695l"
undefined
```

这是 Next.js 的保护机制。

因为客户端代码最终会运行在用户浏览器中。只要运行在浏览器里，用户就有办法通过 DevTools、源码、网络请求等方式查看相关内容。

所以 Next.js 默认不会把普通环境变量暴露给客户端。

这是一件好事。

如果普通的 `API_KEY` 能在客户端读取，那么用户也能看到它，环境变量就失去了保护敏感信息的意义。

---

## 六、客户端环境变量必须使用 NEXT*PUBLIC* 前缀

有些变量不是敏感信息，但你又不想硬编码在代码里。例如：

```text id="67b36q"
Google Analytics ID
公开的站点 URL
公开的第三方项目 ID
前端可见的 API Base URL
```

这些变量可以暴露给客户端。

在 Next.js 中，如果你想让环境变量能在浏览器端访问，必须加上：

```text id="jxbftb"
NEXT_PUBLIC_
```

例如在 `.env.local` 中写：

```env id="aa9axi"
NEXT_PUBLIC_ANALYTICS_ID=G-XXXXXXX
NEXT_PUBLIC_SITE_URL=https://example.com
```

然后在客户端代码中读取：

```tsx id="tbqisr"
console.log(process.env.NEXT_PUBLIC_ANALYTICS_ID);
```

这时浏览器端可以拿到值。

但要记住：只要加了 `NEXT_PUBLIC_`，这个变量就会被暴露给客户端。

所以不要这样写：

```env id="qz4tke"
NEXT_PUBLIC_SECRET_KEY=super_secret
NEXT_PUBLIC_STRIPE_SECRET_KEY=sk_live_xxx
```

这是错误的。

`NEXT_PUBLIC_` 只适合放公开信息，不适合放密钥。

---

## 七、服务端变量和客户端变量的区别

可以简单理解为：

```text id="c386c4"
API_KEY：只给服务端用，客户端拿不到
NEXT_PUBLIC_API_KEY：客户端可以拿到，不适合敏感信息
```

对比一下：

```env id="9gkbnv"
API_KEY=abc123
NEXT_PUBLIC_PUBLIC_KEY=public_abc123
```

服务端代码：

```ts id="m1x3v4"
console.log(process.env.API_KEY);
console.log(process.env.NEXT_PUBLIC_PUBLIC_KEY);
```

客户端代码：

```tsx id="4dbpi2"
console.log(process.env.API_KEY); // undefined
console.log(process.env.NEXT_PUBLIC_PUBLIC_KEY); // public_abc123
```

核心规则是：

```text id="pphm1f"
敏感信息：不要加 NEXT_PUBLIC_
公开配置：可以加 NEXT_PUBLIC_
```

---

## 八、不要把 .env.local 提交到 GitHub

`.env.local` 通常应该加入 `.gitignore`。

Next.js 创建项目时一般已经默认忽略了 `.env*.local`，但你还是应该检查一下：

```gitignore id="reqvyv"
.env*.local
```

原因很简单：`.env.local` 里通常包含敏感信息。

如果你把它提交到 GitHub，即使后面删除，也可能已经被记录在 Git 历史里，存在泄露风险。

正确做法是：

```text id="8u0stg"
本地开发：使用 .env.local
线上部署：在部署平台配置环境变量
团队协作：提供 .env.example 作为模板
```

可以创建一个 `.env.example`：

```env id="xuclcd"
API_KEY=
DATABASE_URL=
NEXT_PUBLIC_SITE_URL=
```

这个文件可以提交到仓库，告诉团队成员需要配置哪些变量，但不要写真实值。

---

## 九、在部署平台配置环境变量

本地的 `.env.local` 只存在于你的电脑上。

当项目部署到 Vercel、Netlify、Railway、Render 或其他平台时，线上环境无法读取你本地的 `.env.local`。

所以你需要在部署平台中单独配置环境变量。

以 Vercel 为例，一般路径是：

```text id="ltj5fb"
Project Settings
→ Environment Variables
→ Add New
```

然后填写：

```text id="5smcmv"
Name: API_KEY
Value: abc123
Environment: Production / Preview / Development
```

配置完成后，通常需要重新部署项目。

这样线上项目才能通过：

```ts id="uuf4a5"
process.env.API_KEY;
```

读取到对应值。

---

## 十、不同环境可以配置不同变量

环境变量的另一个好处是，你可以为不同环境设置不同值。

例如：

```env id="b77qpi"
API_BASE_URL=http://localhost:3000/api
```

生产环境：

```env id="oggmfw"
API_BASE_URL=https://api.example.com
```

这样代码里只写：

```ts id="t1atd6"
const apiBaseUrl = process.env.API_BASE_URL;
```

不需要在代码里判断当前是开发环境还是生产环境。

部署平台通常也会区分：

```text id="sv98r3"
Development
Preview
Production
```

你可以为不同环境配置不同的 API 地址、第三方服务 Key 或数据库地址。

---

## 十一、NODE_ENV：内置环境变量

在 Node.js 项目中，常见的内置环境变量是：

```ts id="imionu"
process.env.NODE_ENV;
```

它通常有这些值：

```text id="x73zqj"
development
production
test
```

本地开发时通常是：

```text id="0whlzp"
development
```

生产构建时通常是：

```text id="57siws"
production
```

你可以用它做环境判断：

```ts id="m1jr3v"
if (process.env.NODE_ENV === "development") {
  console.log("Development mode");
} else {
  console.log("Production mode");
}
```

不过不要滥用 `NODE_ENV` 写大量分支逻辑。
很多配置更适合直接通过环境变量区分，而不是在代码里写复杂判断。

例如，不推荐：

```ts id="e3unsz"
const apiUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:3000/api"
    : "https://api.example.com";
```

更推荐：

```ts id="zlu3gq"
const apiUrl = process.env.API_BASE_URL;
```

然后在不同环境里配置不同的 `API_BASE_URL`。

---

## 十二、React 项目也能用环境变量吗

可以，但不同构建工具的规则不同。

例如 Vite 中，客户端环境变量通常需要：

```env id="8c6x3a"
VITE_API_URL=https://api.example.com
```

代码里读取：

```ts id="5bxxd7"
import.meta.env.VITE_API_URL;
```

Create React App 中通常需要：

```env id="cw1058"
REACT_APP_API_URL=https://api.example.com
```

代码里读取：

```ts id="7grkwu"
process.env.REACT_APP_API_URL;
```

Next.js 中则是：

```env id="axgwvg"
NEXT_PUBLIC_API_URL=https://api.example.com
```

代码里读取：

```ts id="idzv3j"
process.env.NEXT_PUBLIC_API_URL;
```

但是有一点必须明确：普通 React SPA 没有真正的服务端保护层。只要变量被打包到前端，用户就能看到。

所以在纯前端 React 项目里，不能把真正的敏感密钥放进环境变量后再在浏览器里使用。

如果你需要使用真正敏感的 API Key，应该通过服务端接口代理，或者使用 Next.js API Route / Server Action / Route Handler 等服务端能力。

---

## 十三、常见错误写法

### 错误一：把敏感信息写死在代码里

```ts id="uvphnd"
const API_KEY = "abc123";
```

风险很高，不推荐。

### 错误二：把 .env.local 提交到仓库

```text id="3xlqz5"
.env.local 被 push 到 GitHub
```

这可能导致密钥泄露。

### 错误三：把敏感信息加 NEXT*PUBLIC*

```env id="i7kb62"
NEXT_PUBLIC_API_SECRET=super_secret
```

加了 `NEXT_PUBLIC_` 就意味着客户端能看到。

### 错误四：修改环境变量后不重启服务

```text id="8dn8p4"
改了 .env.local，但页面一直读不到新值
```

通常需要重启 dev server。

### 错误五：以为环境变量能让纯前端密钥变安全

如果变量最终进入浏览器，它就不是秘密。

---

## 十四、推荐实践

在 Next.js 项目中，建议这样管理环境变量：

```text id="eleiby"
.env.local 用于本地开发，不提交 Git
.env.example 用于说明需要哪些变量，可以提交 Git
敏感变量只在服务端使用
客户端变量必须以 NEXT_PUBLIC_ 开头
部署平台单独配置环境变量
修改环境变量后重启服务或重新部署
不同环境使用不同变量值
```

示例：

```env id="m9o4bt"
# Server only
API_KEY=abc123
DATABASE_URL=postgresql://example
JWT_SECRET=my_secret

# Public
NEXT_PUBLIC_SITE_URL=https://example.com
NEXT_PUBLIC_ANALYTICS_ID=G-XXXXXXX
```

服务端使用：

```ts id="vshouw"
const apiKey = process.env.API_KEY;
```

客户端使用：

```tsx id="8qjbd4"
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
```

---

## 总结

环境变量是 Next.js 项目中管理敏感信息和环境配置的基础能力。

它解决的问题很明确：

```text id="8aub2i"
不把 API Key 写死在代码里
不把敏感信息暴露给客户端
不同环境使用不同配置
部署时可以灵活修改配置
团队协作时避免泄露真实密钥
```

最重要的规则只有两个：

```text id="6m4i63"
真正敏感的信息，只能放在服务端环境变量里
凡是加了 NEXT_PUBLIC_ 的变量，都默认会被用户看到
```

所以，当你下次需要使用 API Key、Secret、数据库地址或第三方服务配置时，不要再直接写进代码里。
把它们放进 `.env.local`，在服务端通过 `process.env` 读取，并在部署平台中单独配置。

这才是更安全、更专业的做法。
