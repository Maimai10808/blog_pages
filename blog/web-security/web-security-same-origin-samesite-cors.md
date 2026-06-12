# Web 安全基础：同源策略、SameSite Cookie 与 CORS 详解

在 Web 安全中，同源策略是一个非常核心的概念。

很多前端开发者在调用接口时都遇到过类似问题：

为什么浏览器提示跨域？

为什么图片可以跨域加载，但 fetch 请求不行？

为什么请求明明发出去了，却读不到响应？

为什么设置了 Cookie，却没有随请求发送？

为什么后端加了 CORS 响应头之后，前端才可以访问接口？

这些问题背后都和浏览器的安全模型有关，其中最重要的几个概念就是：

同源策略；

Origin；

Site；

SameSite Cookie；

CORS。

这篇文章会系统梳理这些概念，帮助你理解浏览器到底是如何处理跨源请求、Cookie 发送和跨域资源共享的。

## 一、为什么需要同源策略

Web 的基本特征是资源之间可以互相引用。

一个网页可以引用图片、视频、CSS、JavaScript，也可以嵌入 iframe。比如你的网站可以加载另一个网站上的图片，也可以引用 CDN 上的样式文件或脚本文件。

这让 Web 变成了一张真正的“网”：不同网站之间可以互相连接、引用和组合资源。

但这也带来了安全问题。

假设用户已经登录了银行网站，浏览器中保存了银行网站的 Cookie。此时用户访问了一个恶意网站。如果浏览器毫无限制地允许恶意网站向银行网站发请求，并且自动带上用户的 Cookie，那么恶意网站就可能冒充用户执行敏感操作。

因此，浏览器必须在“开放互联”和“用户安全”之间取得平衡。

同源策略就是浏览器用来限制不同来源资源互相访问的一套基础安全规则。

## 二、什么是 Origin

Origin，中文通常翻译为“源”。

一个 Origin 由三部分组成：

协议；

主机名；

端口。

也就是：

```txt id="h55sf4"
scheme + host + port
```

例如：

```txt id="f7qmar"
http://example.com
```

它的 Origin 实际上是：

```txt id="tdrxlf"
http://example.com:80
```

因为 HTTP 默认端口是 80。

再看几个例子。

```txt id="m6gg5a"
http://example.com/cat.gif
```

和：

```txt id="vhlp35"
http://example.com/dog.png
```

它们是同源的，因为协议、主机名和端口都一样。

路径不同不影响 Origin。

但下面这些就不是同源：

```txt id="crrl3w"
https://example.com
```

和：

```txt id="dmygb3"
http://example.com
```

协议不同，一个是 HTTPS，一个是 HTTP。

```txt id="tnf3cf"
http://cats.example.com
```

和：

```txt id="upas2j"
http://example.com
```

主机名不同。即使 `cats.example.com` 是 `example.com` 的子域名，也不是同一个 Origin。

```txt id="25d7qw"
http://example.com:8080
```

和：

```txt id="mruj94"
http://example.com:80
```

端口不同，所以也不是同源。

简单来说，只要协议、主机名、端口中任意一个不同，就是不同源。

## 三、同源策略限制的是什么

同源策略主要限制的是：一个源中的脚本能否读取另一个源中的资源响应。

如果是同源请求，通常没有问题。页面中的 JavaScript 可以请求同源接口，并读取响应数据。

但如果是跨源请求，浏览器就会开始限制。

需要注意的是，同源策略不是简单地禁止所有跨源请求。

事实上，很多跨源资源是允许加载的，例如：

图片；

视频；

音频；

CSS；

script 脚本；

iframe；

object / embed。

例如：

```html id="edb2cl"
<img src="https://cdn.example.com/logo.png" />
```

这类请求可以发出，浏览器也可以把图片渲染到页面上。

但问题是，页面中的 JavaScript 通常不能直接读取这个跨源响应的原始内容。

比如你可以在页面中显示一张跨源图片，但不能随便用 JavaScript 读取这张图片背后的字节数据。

这就是浏览器的安全边界。

## 四、跨源请求：能不能发出，和能不能读取响应是两回事

理解同源策略时，一个非常关键的点是：

请求能不能发出；

响应能不能被 JavaScript 读取；

这是两个不同问题。

有些跨源请求可以发出，但响应不能被读取。

例如 HTML 中的图片请求可以发出，浏览器可以显示图片，但你的 JavaScript 不能随意读取它的响应内容。

再比如，某些简单的跨源请求可以由浏览器发出，但如果目标服务器没有明确允许 CORS，前端 JavaScript 依然读不到响应。

所以很多时候你在 Network 面板里能看到请求已经成功返回了，但控制台仍然报 CORS 错误。

这是因为服务器响应到达了浏览器，但浏览器基于安全策略，不允许你的 JavaScript 读取这个响应。

## 五、什么是简单请求

在跨源场景下，浏览器允许发送一些“简单请求”。

简单请求通常满足以下条件。

请求方法只能是：

```txt id="klshaz"
GET
HEAD
POST
```

允许手动设置的请求头也很有限，例如：

```txt id="v1qlzq"
Accept
Accept-Language
Content-Language
Content-Type
Range
```

其中 `Content-Type` 也有限制，只能是以下几种：

```txt id="q5iprq"
application/x-www-form-urlencoded
multipart/form-data
text/plain
```

这意味着，如果你发送的是：

```http id="0i5mme"
Content-Type: application/json
```

通常就不再是简单请求。

例如：

```ts id="lsybph"
fetch("https://api.example.com/user", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ name: "Maimai" }),
});
```

这个请求会触发 CORS 预检，因为它不是简单请求。

简单请求可以直接发送，但能否读取响应仍然取决于服务端是否返回了正确的 CORS 响应头。

## 六、什么是 Site

除了 Origin，还有一个容易混淆的概念：Site。

Site 和 Origin 不一样。

Origin 看的是：

协议；

完整主机名；

端口。

而 Site 看的是：

有效顶级域名加左侧一个标签。

这个定义听起来有点绕，需要先理解几个概念。

### 1. 顶级域名

例如：

```txt id="1lx9cy"
.com
.uk
.io
.edu
```

这些都是顶级域名。

### 2. 有效顶级域名

有效顶级域名由 Public Suffix List 定义。

例如：

```txt id="e80f8a"
.com
.co.uk
.github.io
```

都可以被视为有效顶级域名。

为什么需要这个概念？

因为 `co.uk` 下面可以注册很多网站，例如：

```txt id="blj8oi"
google.co.uk
bbc.co.uk
```

如果只把 `.uk` 当成站点边界，就太粗了。

再比如 GitHub Pages 中：

```txt id="wx7a8o"
alice.github.io
bob.github.io
```

它们应该被视为不同站点，而不是都算作同一个 `github.io` 站点。

因此，浏览器需要借助 Public Suffix List 判断什么是有效顶级域名。

### 3. Site 的定义

Site 等于：

```txt id="ypdm4x"
有效顶级域名 + 左侧一个标签
```

例如：

```txt id="u3czex"
example.com
google.com
google.co.uk
alice.github.io
```

这些都是 Site。

再看一个重要例子：

```txt id="27r7is"
example.com
api.example.com
static.example.com
```

它们是不同 Origin，但通常属于同一个 Site。

因为它们的 Site 都是：

```txt id="s24to4"
example.com
```

这就是 Origin 和 Site 的区别。

## 七、Same-Origin 和 Same-Site 的区别

Same-Origin 更严格。

只要协议、主机名、端口有一个不同，就是不同源。

Same-Site 更宽松。

同一个主站点下的不同子域名，通常属于 same-site。

例如：

```txt id="8omibm"
https://example.com
https://api.example.com
```

它们通常是 same-site，但不是 same-origin。

这个区别非常重要，因为 CORS 主要围绕 Origin，而 Cookie 的 `SameSite` 属性主要围绕 Site。

## 八、Cookie 的 SameSite 属性

Cookie 有一个非常重要的属性叫 `SameSite`。

它用来控制 Cookie 是否会在跨站请求中被发送。

常见取值包括：

```txt id="73eq4a"
SameSite=None
SameSite=Lax
SameSite=Strict
```

### 1. SameSite=None

```http id="3v9dg1"
Set-Cookie: session=abc; SameSite=None; Secure
```

`SameSite=None` 表示这个 Cookie 可以在跨站请求中发送。

例如 A 网站让浏览器请求 B 网站，如果 B 网站的 Cookie 设置了 `SameSite=None`，浏览器就可能在这个跨站请求中带上 B 的 Cookie。

这适合一些确实需要第三方上下文的场景，比如第三方登录、嵌入式服务、跨站 iframe 等。

但由于安全风险较高，现代浏览器通常要求：

```txt id="wmyd34"
SameSite=None 必须搭配 Secure
```

也就是只能通过 HTTPS 发送。

### 2. SameSite=Lax

```http id="mt7ouv"
Set-Cookie: session=abc; SameSite=Lax
```

`SameSite=Lax` 是现在很多浏览器的默认策略。

它表示 Cookie 在大多数跨站子请求中不会发送，例如图片、iframe、fetch 等。

但在跨站顶层导航的安全请求中会发送。

例如用户在 A 网站点击链接跳转到 B 网站，这是一次顶层导航 GET 请求，B 网站的 `SameSite=Lax` Cookie 可以被发送。

这是一种折中策略：

既能保证用户从外部链接进入网站时仍然保持登录态；

又能减少很多 CSRF 攻击风险。

### 3. SameSite=Strict

```http id="ch81nj"
Set-Cookie: session=abc; SameSite=Strict
```

`SameSite=Strict` 是最严格的模式。

它表示 Cookie 不会在跨站请求中发送。

即使用户从别的网站点击链接跳转到你的网站，Cookie 也不会随第一次请求发送。

这适合安全要求很高的场景，例如银行、支付、后台管理系统中的敏感 Cookie。

缺点是用户体验可能变差。比如用户明明刚登录过网站，但从外部链接重新进入时，可能看起来像未登录。

## 九、Cookie 的 Domain 属性

Cookie 还有一个 `Domain` 属性，用来控制 Cookie 可以发送给哪些域名。

默认情况下，如果没有设置 `Domain`，Cookie 只会发送给设置它的主机，不包括子域名。

例如 `example.com` 设置了一个 Cookie，默认情况下它不会自动发送给：

```txt id="krhd62"
api.example.com
```

如果希望 Cookie 能在子域名之间共享，可以设置：

```http id="oelxln"
Set-Cookie: session=abc; Domain=example.com
```

这样 Cookie 会发送给：

```txt id="7v31wo"
example.com
api.example.com
static.example.com
```

需要注意，`Domain` 并不是让 Cookie 更严格，而是让它的适用范围更宽。

因此，不要随便把敏感 Cookie 设置成整个父域共享。

## 十、Cookie 的 Path 属性

`Path` 用来限制 Cookie 只在特定路径下发送。

例如：

```http id="qtg31s"
Set-Cookie: docsToken=abc; Path=/docs
```

这个 Cookie 会在访问以下路径时发送：

```txt id="x951zu"
/docs
/docs/a.pdf
/docs/tutorial/page
```

但不会在访问：

```txt id="abq7ce"
/admin
/profile
```

时发送。

`Path` 可以帮助我们把 Cookie 限制在某个应用路径下，不过它不是强安全边界，更多是请求范围控制。

## 十一、为什么需要 CORS

同源策略默认限制 JavaScript 读取跨源响应。

但现实中有很多合法需求：

前端应用部署在 `https://app.example.com`；

API 服务部署在 `https://api.example.com`；

第三方网站需要访问公共 API；

开放平台允许其他网站读取数据；

多个前端项目共享一个后端服务。

如果所有跨源读取都被禁止，很多现代 Web 应用就无法工作。

所以浏览器提供了一种机制，让服务器可以主动声明：我允许某些 Origin 访问我的资源。

这就是 CORS，全称是 Cross-Origin Resource Sharing，跨源资源共享。

CORS 不是绕过安全机制，而是服务器显式放宽同源策略的一种标准方式。

## 十二、CORS 的核心思想

CORS 的核心问题是：

目标服务器是否允许当前 Origin 读取响应？

例如：

```txt id="tk3gz4"
https://app.example.com
```

想请求：

```txt id="qhl0z7"
https://api.example.com/user
```

浏览器会问 API 服务器：

```txt id="xpragf"
你允许 https://app.example.com 读取你的响应吗？
```

如果服务器响应头中明确允许：

```http id="zn4x6f"
Access-Control-Allow-Origin: https://app.example.com
```

浏览器就允许前端 JavaScript 读取响应。

如果服务器没有返回这个头，或者返回的值不匹配，浏览器就会拦截响应，不让 JavaScript 读取。

## 十三、CORS 简单请求

对于简单请求，浏览器不会先发预检请求，而是直接发送实际请求。

例如：

```ts id="ajlhdi"
fetch("https://api.example.com/posts");
```

如果这是一个简单 GET 请求，浏览器会直接请求服务器。

服务器如果希望前端能读取响应，需要返回：

```http id="x1e49f"
Access-Control-Allow-Origin: https://app.example.com
```

或者如果是公开资源：

```http id="b513fs"
Access-Control-Allow-Origin: *
```

如果没有这个响应头，请求可能已经成功到达服务器，响应也可能已经返回浏览器，但 JavaScript 仍然读不到。

## 十四、CORS 预检请求

对于非简单请求，浏览器会先发送一个预检请求。

预检请求使用 HTTP `OPTIONS` 方法。

例如前端想发送：

```ts id="neyr3v"
fetch("https://api.example.com/user", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "X-Custom-Token": "abc",
  },
  body: JSON.stringify({ name: "Maimai" }),
});
```

因为它使用了 `PUT` 方法、自定义请求头和 `application/json`，所以不是简单请求。

浏览器会先自动发送：

```http id="a04rke"
OPTIONS /user HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: PUT
Access-Control-Request-Headers: Content-Type, X-Custom-Token
```

这个请求不是业务请求，而是浏览器在问服务器：

```txt id="txxnra"
我来自 https://app.example.com。
我接下来想发一个 PUT 请求。
我还想带 Content-Type 和 X-Custom-Token 请求头。
你允许吗？
```

服务器如果允许，需要返回类似响应：

```http id="pf6mcw"
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT
Access-Control-Allow-Headers: Content-Type, X-Custom-Token
```

浏览器看到允许后，才会继续发送真正的 PUT 请求。

如果预检失败，真正的请求就不会发送。

## 十五、CORS 常见响应头

### 1. Access-Control-Allow-Origin

```http id="ppzvub"
Access-Control-Allow-Origin: https://app.example.com
```

表示允许指定 Origin 读取响应。

也可以写：

```http id="tqm78j"
Access-Control-Allow-Origin: *
```

表示允许任意 Origin 读取。

但如果涉及 Cookie 等凭证请求，不能使用 `*`，必须指定具体 Origin。

### 2. Access-Control-Allow-Methods

```http id="nwvfrc"
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
```

表示允许哪些 HTTP 方法。

### 3. Access-Control-Allow-Headers

```http id="yo3e9j"
Access-Control-Allow-Headers: Content-Type, Authorization
```

表示允许前端请求中携带哪些自定义请求头。

例如如果前端要带：

```http id="95jskg"
Authorization: Bearer token
```

服务端就需要允许 `Authorization` 这个请求头。

### 4. Access-Control-Allow-Credentials

```http id="nps3oq"
Access-Control-Allow-Credentials: true
```

表示是否允许浏览器在跨源请求中携带凭证，例如 Cookie。

前端也需要配合设置：

```ts id="39ha1n"
fetch("https://api.example.com/user", {
  credentials: "include",
});
```

如果使用 axios，则是：

```ts id="krlq1t"
axios.get("https://api.example.com/user", {
  withCredentials: true,
});
```

需要注意：如果 `Access-Control-Allow-Credentials: true`，那么 `Access-Control-Allow-Origin` 不能是 `*`，必须是具体 Origin。

### 5. Access-Control-Expose-Headers

默认情况下，前端 JavaScript 只能读取一部分安全响应头。

如果希望前端读取自定义响应头，需要设置：

```http id="qb0vvp"
Access-Control-Expose-Headers: X-Total-Count, X-Request-Id
```

这样前端才能通过 JavaScript 读取这些响应头。

## 十六、SameSite 和 CORS 的关系

SameSite 和 CORS 经常一起出现，但它们解决的是不同问题。

SameSite 决定 Cookie 是否会在跨站请求中被发送。

CORS 决定 JavaScript 是否可以读取跨源响应，以及是否允许某些非简单请求。

例如一个跨源请求想带 Cookie 并读取响应，需要同时满足：

Cookie 的 SameSite 策略允许发送；

前端请求设置 `credentials: "include"`；

服务器返回 `Access-Control-Allow-Credentials: true`；

服务器返回具体的 `Access-Control-Allow-Origin`；

服务器允许相关方法和请求头。

只配置其中一个通常是不够的。

## 十七、跨源、跨站、Cookie、CORS 的判断流程

可以简单理解为几层判断。

第一层：这是同源请求还是跨源请求？

如果是同源，JavaScript 通常可以正常读取响应。

如果是跨源，进入同源策略和 CORS 判断。

第二层：这个请求是不是简单请求？

如果是简单请求，可以直接发出。

如果不是简单请求，浏览器先发 OPTIONS 预检请求。

第三层：服务器是否通过 CORS 允许？

如果允许，浏览器放行响应读取。

如果不允许，JavaScript 读不到响应。

第四层：Cookie 是否会被发送？

这取决于 Cookie 的 SameSite、Domain、Path、Secure 等属性，以及前端是否设置 credentials。

第五层：带 Cookie 的响应能否被读取？

这取决于 CORS 中的 `Access-Control-Allow-Credentials` 和 `Access-Control-Allow-Origin`。

## 十八、一个常见的跨域登录场景

假设前端部署在：

```txt id="a7ce7z"
https://app.example.com
```

后端 API 在：

```txt id="rib22s"
https://api.example.com
```

用户登录后，后端希望设置 Cookie。

服务端响应：

```http id="koilkt"
Set-Cookie: session=abc; HttpOnly; Secure; SameSite=None; Domain=example.com; Path=/
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

前端请求：

```ts id="hrl525"
fetch("https://api.example.com/login", {
  method: "POST",
  credentials: "include",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    email: "test@example.com",
    password: "123456",
  }),
});
```

这样才有可能实现跨源 Cookie 登录。

注意这里的几个关键点：

Cookie 要允许跨站发送时需要 `SameSite=None; Secure`；

前端要设置 `credentials: "include"`；

后端要设置 `Access-Control-Allow-Credentials: true`；

`Access-Control-Allow-Origin` 不能是 `*`；

如果使用 JSON 请求，会触发预检，后端还要正确响应 OPTIONS 请求。

## 十九、常见错误

### 1. 以为请求失败了，其实只是响应被浏览器拦截

Network 面板里能看到请求成功，但控制台报 CORS 错误。

这通常说明服务器有返回，但浏览器不允许 JavaScript 读取响应。

### 2. Access-Control-Allow-Origin 写成星号，但还想带 Cookie

如果要带 Cookie，不能写：

```http id="1h0rk1"
Access-Control-Allow-Origin: *
```

必须写具体 Origin：

```http id="663fk2"
Access-Control-Allow-Origin: https://app.example.com
```

并且加：

```http id="g0ueck"
Access-Control-Allow-Credentials: true
```

### 3. 忘记处理 OPTIONS 请求

非简单请求会先发 OPTIONS 预检。

如果后端没有处理 OPTIONS，浏览器会认为预检失败，真正的请求不会发出。

### 4. SameSite 设置不对，Cookie 没有发送

即使 CORS 配好了，如果 Cookie 是：

```http id="xwuq9t"
SameSite=Strict
```

或某些跨站场景下是 `Lax`，Cookie 也可能不会发送。

### 5. 混淆 Origin 和 Site

`api.example.com` 和 `app.example.com` 是不同 Origin，但通常是同一个 Site。

CORS 看 Origin，SameSite 看 Site。

这两个概念不能混为一谈。

## 二十、实践建议

对于普通前后端分离项目，建议：

明确前端 Origin 和后端 Origin；

后端只允许可信前端 Origin；

不要在生产环境随便使用 `Access-Control-Allow-Origin: *`；

需要 Cookie 时，必须配置 `Access-Control-Allow-Credentials: true`；

前端请求要设置 `credentials: "include"`；

后端正确处理 OPTIONS 预检请求；

敏感 Cookie 使用 `HttpOnly`、`Secure`、`SameSite`；

理解 SameSite=Lax、Strict、None 的区别；

避免把重要操作设计成简单 GET 请求；

对涉及资金、权限、账号安全的操作增加 CSRF 防护和二次验证。

## 二十一、总结

同源策略是浏览器 Web 安全模型的基础。

Origin 由协议、主机名和端口组成。只有这三者完全一致，才算同源。

同源策略限制跨源脚本读取响应，但并不禁止所有跨源资源加载。

图片、视频、CSS、script、iframe 等资源可以跨源加载，但 JavaScript 是否能读取响应受到严格限制。

Site 是另一个概念，它由有效顶级域名加左侧一个标签组成。SameSite Cookie 基于 Site 判断 Cookie 是否能在跨站请求中发送。

Cookie 的 `SameSite=None` 允许跨站发送，`Lax` 允许部分顶层导航场景，`Strict` 最严格，几乎不允许跨站携带。

CORS 是服务器显式放宽同源策略的机制。它通过一系列 `Access-Control-*` 响应头告诉浏览器：哪些 Origin、哪些方法、哪些请求头、是否允许 Cookie、哪些响应头可以被前端读取。

如果是非简单请求，浏览器会先发送 OPTIONS 预检请求，确认安全后才发送真实请求。

理解同源策略、SameSite 和 CORS，不只是为了修复“跨域报错”，更是理解浏览器安全边界、认证机制和前后端通信安全的基础。
