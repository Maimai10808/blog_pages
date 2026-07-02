# Telegram Mini App 静态壳与 CSR 交互：为什么 Next.js 要用 output export？

你可以先抓住一句话：

Telegram Mini App 不是传统意义上的 Bot 页面，它本质上是一个被 Telegram 打开的 H5 / Web App。

只不过这个 H5 不是普通浏览器打开，而是运行在 Telegram App 内置的 WebView 容器 里。

所以所谓：

静态壳 + CSR 交互

意思是：

页面最开始只是一个静态 HTML/CSS/JS 外壳，真正的用户信息、Telegram 环境能力、钱包连接、业务状态，都在浏览器端运行时再初始化。

---

1. 先解释 output: 'export' 是什么意思

Next.js 默认可以做 SSR，也就是服务端渲染。

比如用户访问：

/order/123

服务端可以先拿数据、渲染 HTML，再把完整页面返回给浏览器。

但如果配置了：

output: 'export'

意思就是：

Next.js 会把项目导出成纯静态文件。

大概类似：

out/
index.html
about.html
\_next/static/xxx.js
\_next/static/xxx.css

它不再依赖 Next.js Node 服务端运行时。

也就是说，它更像一个普通静态网站，可以部署到 CDN、对象存储、Nginx、静态托管平台。

所以这个项目不是：

用户请求页面
→ Next.js 服务端执行代码
→ 服务端读取用户信息
→ 服务端渲染 HTML
→ 返回页面

而是：

Telegram 打开 Mini App URL
→ 加载静态 HTML / JS / CSS
→ JS 在 Telegram WebView 里运行
→ 客户端读取 Telegram 注入的参数
→ 初始化 Telegram SDK
→ 初始化钱包 / 用户状态 / 页面业务

这就是“静态壳 + CSR”。

---

2. 什么叫“静态壳”？

“壳”就是页面最开始加载出来的基础结构。

比如：

<div id="root"></div>
<script src="/_next/static/chunks/app.js"></script>

或者 Next.js App Router 导出的静态页面。

它一开始不知道当前 Telegram 用户是谁，也不知道钱包有没有连接，也不知道 Telegram 传进来的 initData 是什么。

它只是一个空壳：

页面框架
基础样式
JS bundle
入口组件

等 JS 真正在 Telegram 容器里跑起来之后，才开始做真正的事情。

所以叫：

静态壳。

---

3. 什么叫“CSR 交互”？

CSR 是 Client Side Rendering，客户端渲染。

意思是很多关键逻辑不是在服务器上完成，而是在用户手机里的 WebView 中完成。

比如 Telegram Mini App 里常见的逻辑：

读取 Telegram launchParams
读取 initData
判断当前是否在 Telegram 环境
设置 Telegram header color
挂载 BackButton
挂载 themeParams
控制 viewport
初始化 TON Connect
连接钱包
读取钱包地址
发起链上交易
请求后端接口
切换页面
处理排行榜 / 邀请积分

这些事情大多数都必须在客户端做。

因为它们依赖：

window.Telegram.WebApp
Telegram WebView 注入对象
用户当前客户端环境
钱包插件 / TON Connect
移动端容器高度
Telegram 返回按钮
Telegram 主题色

这些东西服务端是拿不到的。

服务端没有 window，也没有 Telegram 容器。

所以你不能在 SSR 里直接做：

window.Telegram.WebApp

因为服务端执行时会直接报错：

window is not defined

---

4. 它“都是客户端吗”？

不完全是。

更准确地说：

Telegram Mini App 的前端运行时强依赖客户端，但业务数据和安全校验仍然可以有后端。

比如：

前端客户端负责：

Telegram SDK 初始化
读取 initData
控制 Telegram 返回按钮
控制主题色
适配 viewport
连接 TON 钱包
展示页面
发起用户操作

后端负责：

校验 Telegram initData 是否真实
保存用户信息
保存订单
计算排行榜
处理邀请积分
校验交易结果
返回业务数据
防作弊

所以不是说“Telegram Mini App 就没有后端”。

而是说：

它的页面壳可以是静态的，但业务系统不一定是纯前端。

你可以理解成：

前端：静态部署 + 客户端初始化
后端：API 服务 + 身份校验 + 业务数据

---

5. 普通 Next.js 页面和 Telegram Mini App 的区别

你之前做普通 Next.js 页面，可能是这样：

用户打开浏览器
→ 访问你的域名
→ Next.js 决定 SSR / SSG / CSR
→ 页面展示

但是 Telegram Mini App 是这样：

用户在 Telegram 点开 Bot / Mini App
→ Telegram 内部 WebView 打开你的 URL
→ Telegram 注入运行时对象和参数
→ 你的前端 JS 读取这些参数
→ 初始化 Telegram SDK
→ 再渲染真正业务页面

区别就在于：

普通网页的宿主是浏览器；Telegram Mini App 的宿主是 Telegram 容器。

这个“宿主环境”变了，所以你要处理很多普通网页不用管的东西。

---

6. 实际开发中到底有什么不一样？

你可能现在感觉不出来，是因为页面写起来仍然是 React / Next.js。

但真正开发时，差异主要在这些地方。

第一，初始化不能太早

普通 Next.js 页面里，你可以很自然地写：

const user = await getUser()

但 Telegram Mini App 里，你经常要等客户端加载完，才能拿到 Telegram 环境。

比如：

useEffect(() => {
// 这里只能在客户端执行
const tg = window.Telegram.WebApp;
tg.ready();
}, []);

如果你在服务端组件或构建阶段读 window.Telegram，就会炸。

所以很多 Telegram 相关代码必须放在：

'use client'
useEffect
客户端组件
运行时初始化函数

---

第二，用户身份不是普通登录态

普通网站一般是：

Cookie
Session
JWT
OAuth

Telegram Mini App 常见是：

initData
initDataUnsafe
start_param
Telegram user

Telegram 打开 Mini App 时，会给前端注入一段 initData。

前端可以把 initData 发给后端，后端用 Bot Token 校验签名，确认：

这个用户真的是 Telegram 用户
这个数据没有被伪造
这个 user id 是可信的

所以面试里如果问：

Telegram Mini App 怎么做登录？

不能只说“前端拿 user id”。

更严谨的说法是：

前端从 Telegram SDK 读取 initData，
传给后端，
后端根据 Telegram 官方规则校验 hash，
校验通过后再建立自己的登录态。

如果你的项目没有做后端校验，那就要诚实说：

当前项目主要做了前端运行时接入和容器能力集成，没有完整实现 Telegram initData 服务端校验。

---

第三，页面环境不是普通浏览器

Telegram 容器里会有一些特殊问题：

viewport 高度不准
移动端键盘弹起影响布局
iOS / Android 表现不一样
Telegram 顶部栏占空间
返回按钮不是浏览器返回按钮
下拉关闭手势可能影响页面
主题色要跟 Telegram 适配
桌面端和手机端 WebView 表现不同

普通 Next.js 页面可能只需要考虑：

Chrome
Safari
移动端响应式

但 Telegram Mini App 要考虑：

Telegram Desktop
Telegram iOS
Telegram Android
Telegram WebView
外部浏览器 fallback

所以会多出一层“容器适配”。

---

第四，返回按钮不是普通路由返回

普通网页返回：

router.back()

或者浏览器左上角返回。

但 Telegram Mini App 里，用户看到的可能是 Telegram 顶部的 BackButton。

你需要把 Telegram BackButton 和前端路由联动起来。

比如逻辑是：

当前是首页
→ 隐藏 Telegram BackButton
当前是二级页面
→ 显示 Telegram BackButton
用户点击 Telegram BackButton
→ 调用 router.back()

这就是 Telegram Mini App 特有的交互。

---

第五，TON Connect 也必须在客户端处理

钱包连接一定是客户端行为。

比如：

用户点击连接钱包
→ 打开 TON 钱包
→ 用户授权
→ 返回 Mini App
→ 前端拿到钱包地址
→ 发起交易

这些都依赖用户设备和钱包环境。

所以 TON Connect Provider、钱包状态、交易按钮，一般都要放在客户端组件里。

这就是为什么这种项目往往更偏：

静态页面 + 客户端交互

而不是传统 SSR。

---

7. 为什么说“适合 Telegram 容器中依赖客户端 SDK 的场景”？

因为 Telegram SDK 不是你服务器上的 SDK。

它不是这样用的：

服务端调用 Telegram SDK 渲染页面

而是这样：

页面在 Telegram WebView 中打开
→ Telegram 给 window 注入能力
→ 前端 SDK 读取这些能力
→ 前端控制 Telegram 容器行为

比如：

设置 header color
读取 themeParams
控制 BackButton
读取 viewport
调用 haptic feedback
读取 launchParams

这些都是客户端运行时能力。

所以你的项目用 output: 'export'，可以理解为：

我不依赖 Next.js 服务端来生成动态页面，我先把页面静态导出。等它进入 Telegram 容器后，再由客户端 SDK 接管运行时逻辑。

这就是那句话的意思。

---

8. 举一个非常具体的例子

假设你要显示一句：

Hello, Telegram User

传统 SSR 思路可能是：

服务端读取 cookie
→ 知道用户是谁
→ 渲染 HTML：Hello, Lee
→ 返回浏览器

Telegram Mini App 思路是：

先加载静态页面：Loading...
→ 客户端 JS 启动
→ 读取 Telegram initDataUnsafe.user
→ 拿到 user.first_name
→ 页面更新：Hello, Lee

也就是说，用户信息不是页面构建时知道的，也不是 Next 服务端天然知道的，而是：

页面进入 Telegram 容器之后，客户端运行时才知道的。

所以它更像 CSR。

---

9. 这句话你面试时怎么讲？

你可以这样说：

这个项目的 Mini App 前端采用的是静态导出加客户端运行时初始化的方式。因为 Telegram Mini App 的很多能力，比如 launchParams、initData、themeParams、BackButton、viewport，以及 TON Connect 钱包连接，都依赖 Telegram WebView 容器和用户客户端环境，服务端渲染阶段是拿不到这些信息的。
所以项目不是强依赖 SSR，而是先提供一个静态页面壳，等页面在 Telegram 容器中真正运行后，再初始化 Telegram SDK、读取运行时参数、挂载容器能力，并完成钱包连接和业务交互。

这段就比较稳。

---

10. 你不要这样讲

不要说：

Telegram Mini App 都是客户端，所以不需要后端。

这个不严谨。

也不要说：

用了 output export 就说明性能更好。

这也不准确。

更不要说：

Telegram Mini App 不能用 SSR。

这个也太绝对。

准确说法是：

Telegram Mini App 可以使用 Next.js，但 Telegram 容器相关能力必须在客户端运行时处理。对于这个项目来说，使用静态导出更符合它作为 WebView 内嵌应用的部署方式，核心交互通过 CSR 完成。

---

11. 最后给你一个直观对比

普通 Next.js SSR 页面

服务端先知道一部分数据
→ 服务端渲染 HTML
→ 浏览器接收页面
→ React hydrate

Telegram Mini App 静态壳 + CSR

静态 HTML/JS/CSS 先加载
→ 页面进入 Telegram WebView
→ 客户端读取 Telegram 注入参数
→ 初始化 SDK
→ 初始化钱包
→ 请求业务接口
→ 渲染真实交互页面

所以你可以把它理解成：

它写起来像 Next.js 页面，但运行起来更像一个放在 Telegram 里的移动端单页应用。

这就是你之前感受不到区别的原因：
代码层还是 React，区别主要发生在运行环境、初始化流程、身份来源、容器适配和调试方式上。
