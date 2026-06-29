# Web 开发者必须理解的 HTTP：请求、响应、状态码与 Express 示例

## 1. 为什么 Web 开发者必须理解 HTTP？

无论是前端、后端，还是全栈开发，HTTP 都是每天都会接触的基础协议。

当我们在浏览器中打开一个页面、提交一个表单、调用一个接口、上传一张图片，背后其实都在发生 HTTP 请求和响应。

很多框架会把 HTTP 的细节封装起来。比如前端用 Axios 或 Fetch，后端用 Spring Boot、Django、Laravel、NestJS 等框架时，我们可能只是在写函数、控制器或接口。但是框架底层仍然是在处理 HTTP 请求和 HTTP 响应。

所以，理解 HTTP 的请求响应周期，有助于我们更好地理解：

- 浏览器如何访问网页；
- 前端如何调用后端接口；
- 后端如何返回数据；
- 为什么会出现 404、401、500 等错误；
- 请求头、响应头、请求体、响应体分别是什么；
- Postman、浏览器 Network 面板如何调试接口；
- Express 这类框架是如何处理请求的。

HTTP 是 Web 开发的底层基础。理解它，很多接口调试和前后端联调问题都会清楚很多。

## 2. HTTP 是什么？

HTTP，全称是 **HyperText Transfer Protocol，超文本传输协议**。

它主要负责 Web 客户端和 Web 服务器之间的通信。

简单来说，HTTP 的工作方式是：

```text id="p1f8ev"
客户端发送请求
       ↓
服务器处理请求
       ↓
服务器返回响应
```text

这就是常说的 **Request / Response Cycle，请求响应周期**。

例如你在浏览器中访问一个网页：

```text id="qgcc2x"
https://example.com
```

浏览器会向服务器发送 HTTP 请求。服务器收到请求后，返回 HTML 页面、CSS 文件、JavaScript 文件、图片或 JSON 数据。

前端开发中常见的 Fetch 请求，本质上也是 HTTP 请求：

```javascript id="clw9k2"
fetch("/api/users")
  .then((res) => res.json())
  .then((data) => console.log(data));
```text

这段代码就是向服务器请求 `/api/users` 这个接口，然后把服务器返回的数据解析为 JSON。

## 3. HTTP 是无状态的

HTTP 有一个非常重要的特点：**无状态**。

所谓无状态，就是每一次 HTTP 请求都是独立的。服务器不会天然记住上一次请求发生了什么。

比如你第一次访问网站首页，第二次访问用户中心，从 HTTP 协议本身来看，这两次请求是彼此独立的。HTTP 不会自动记住“这个用户刚才访问过首页”或“这个用户已经登录”。

可以把每一次请求理解成一次独立交易：

```text id="q6t9pe"
请求 A：客户端请求首页
响应 A：服务器返回首页

请求 B：客户端请求用户中心
响应 B：服务器返回用户中心
```

请求 A 和请求 B 在 HTTP 层面没有天然关联。

那为什么网站可以记住登录状态呢？

这是因为我们会额外使用一些机制，例如：

- Cookie；
- Session；
- Token；
- JWT；
- LocalStorage；
- 服务端会话存储。

这些机制不是 HTTP 自动记住状态，而是开发者在 HTTP 之上设计出来的状态管理方式。

所以要记住一句话：

> HTTP 本身是无状态的，登录状态、用户身份和会话信息需要通过 Cookie、Session、Token 等机制实现。

## 4. HTTPS 是什么？

HTTPS，全称是 **HyperText Transfer Protocol Secure**，可以理解为安全版 HTTP。

普通 HTTP 是明文传输，数据在网络中传输时可能被窃听或篡改。HTTPS 则会通过 SSL/TLS 对通信内容进行加密。

当网站涉及敏感信息时，必须使用 HTTPS，例如：

- 登录密码；
- 支付信息；
- 身份证号；
- 手机号；
- 邮箱；
- 联系表单；
- 用户隐私数据。

现在很多网站已经默认全站使用 HTTPS。即使只是普通页面，也推荐开启 HTTPS，因为它可以提升安全性，也符合现代浏览器和搜索引擎的要求。

部署 HTTPS 通常需要在服务器或云平台上配置 SSL/TLS 证书。

## 5. HTTP 请求方法

每个 HTTP 请求都有一个请求方法。请求方法表示客户端想对服务器资源执行什么操作。

常见方法包括 GET、POST、PUT、DELETE。

## 5.1 GET：获取数据

GET 用于从服务器获取数据。

常见场景包括：

- 打开网页；
- 加载图片；
- 加载 CSS；
- 加载 JavaScript；
- 请求列表数据；
- 查询搜索结果。

例如：

```http id="obpafd"
GET /api/users HTTP/1.1
```text

表示客户端想获取用户列表。

浏览器访问网页时，通常也是发送 GET 请求。

GET 请求一般不会把数据放在请求体中，而是通过 URL 查询参数传递，例如：

```text id="butxc3"
https://example.com/search?keyword=http
```

这种方式适合搜索、筛选、分页等场景。

## 5.2 POST：提交数据

POST 通常用于向服务器提交数据或创建新资源。

常见场景包括：

- 提交联系表单；
- 用户注册；
- 用户登录；
- 创建文章；
- 上传文件；
- 添加评论。

例如：

```http id="4s5oe3"
POST /api/posts HTTP/1.1
Content-Type: application/json

{
  "title": "HTTP 学习笔记",
  "content": "这是一篇文章"
}
```http

POST 请求通常会带请求体。请求体中可以放表单数据、JSON 数据或文件数据。

## 5.3 PUT：更新数据

PUT 通常用于更新服务器上已经存在的资源。

例如修改一篇文章：

```http id="fswu2r"
PUT /api/posts/99 HTTP/1.1
Content-Type: application/json

{
  "title": "修改后的标题"
}
```

这里的 `/api/posts/99` 表示要更新 ID 为 99 的文章。

## 5.4 DELETE：删除数据

DELETE 用于删除服务器上的资源。

例如：

```http id="63fu38"
DELETE /api/posts/99 HTTP/1.1
```http

表示删除 ID 为 99 的文章。

## 6. HTTP 请求和响应的组成

一次 HTTP 通信包括请求和响应。请求和响应中都包含 Header 和 Body。

## 6.1 请求的组成

一个 HTTP 请求通常包括：

- 请求方法；
- 请求 URL；
- 请求头；
- 请求体。

例如：

```http id="4d9w3s"
POST /contact HTTP/1.1
Host: localhost:5000
Content-Type: application/json
User-Agent: Chrome

{
  "name": "Brad",
  "email": "brad@example.com"
}
```

其中：

- `POST` 是请求方法；
- `/contact` 是请求路径；
- `Host`、`Content-Type`、`User-Agent` 是请求头；
- JSON 部分是请求体。

## 6.2 响应的组成

一个 HTTP 响应通常包括：

- 状态码；
- 响应头；
- 响应体。

例如：

```http id="qw71ob"
HTTP/1.1 201 Created
Content-Type: application/json

{
  "message": "created successfully"
}
```text

其中：

- `201 Created` 表示资源创建成功；
- `Content-Type` 表示响应内容类型；
- JSON 部分是响应体。

## 7. 常见 Header 字段

Header 可以理解为请求或响应的元信息。

它不是主要业务数据，但会告诉对方如何理解这次通信。

## 7.1 常见请求头

常见请求头包括：

| 请求头        | 作用                             |
| ------------- | -------------------------------- |
| Host          | 请求的主机名                     |
| User-Agent    | 客户端信息，例如浏览器、操作系统 |
| Accept        | 客户端可以接受的数据类型         |
| Content-Type  | 请求体的数据类型                 |
| Cookie        | 客户端携带的 Cookie              |
| Authorization | 认证信息，例如 Token             |
| Referer       | 请求来源页面                     |

例如：

```http id="i4rm8t"
Content-Type: application/json
Authorization: Bearer xxxxx
User-Agent: Chrome
```

如果前端发送 JSON 数据给后端，通常需要设置：

```http id="z3xi8l"
Content-Type: application/json
```text

如果接口需要登录认证，前端可能会在请求头中携带 Token：

```http id="vgic91"
Authorization: Bearer token_value
```

或者某些项目会使用自定义请求头：

```http id="bkuhb0"
x-auth-token: token_value
```text

## 7.2 常见响应头

常见响应头包括：

| 响应头         | 作用              |
| -------------- | ----------------- |
| Content-Type   | 响应体的数据类型  |
| Content-Length | 响应体大小        |
| Set-Cookie     | 服务器设置 Cookie |
| Cache-Control  | 缓存控制          |
| Server         | 服务器软件信息    |
| Date           | 响应时间          |

例如：

```http id="stvbqs"
Content-Type: application/json
Set-Cookie: sessionId=xxx
Cache-Control: max-age=3600
```

其中 `Content-Type` 非常重要，它告诉客户端如何解析响应体。

常见 Content-Type 包括：

| Content-Type                      | 含义            |
| --------------------------------- | --------------- |
| text/html                         | HTML 页面       |
| text/css                          | CSS 文件        |
| application/javascript            | JavaScript 文件 |
| application/json                  | JSON 数据       |
| image/png                         | PNG 图片        |
| image/jpeg                        | JPEG 图片       |
| application/x-www-form-urlencoded | 表单数据        |
| multipart/form-data               | 文件上传表单    |

## 8. HTTP 状态码

HTTP 状态码用于表示请求处理结果。

状态码通常分为五类：

| 范围 | 类型       | 含义                 |
| ---- | ---------- | -------------------- |
| 1xx  | 信息响应   | 请求已收到，继续处理 |
| 2xx  | 成功       | 请求成功             |
| 3xx  | 重定向     | 需要进一步操作       |
| 4xx  | 客户端错误 | 请求有问题           |
| 5xx  | 服务器错误 | 服务器处理失败       |

## 8.1 常见状态码

| 状态码 | 含义                  | 场景                   |
| ------ | --------------------- | ---------------------- |
| 200    | OK                    | 请求成功               |
| 201    | Created               | 创建资源成功           |
| 301    | Moved Permanently     | 永久重定向             |
| 304    | Not Modified          | 资源未修改，可使用缓存 |
| 400    | Bad Request           | 请求参数错误           |
| 401    | Unauthorized          | 未认证或 Token 无效    |
| 403    | Forbidden             | 无权限访问             |
| 404    | Not Found             | 资源不存在             |
| 500    | Internal Server Error | 服务器内部错误         |

例如：

- 请求成功返回 200；
- 创建文章成功返回 201；
- 没有传必填字段返回 400；
- 没有登录或 Token 错误返回 401；
- 请求不存在的接口返回 404；
- 后端代码报错返回 500。

状态码非常重要，因为它是前后端判断请求结果的基础。

## 9. 使用浏览器 Network 面板观察 HTTP

浏览器开发者工具中的 Network 面板是理解 HTTP 最好的工具之一。

在 Chrome 中可以这样查看：

1. 打开网页；
2. 右键选择“检查”；
3. 点击 Network；
4. 刷新页面；
5. 点击某个请求查看详情。

在 Network 面板中可以看到：

- 请求 URL；
- 请求方法；
- 状态码；
- 请求头；
- 响应头；
- 响应体；
- 资源类型；
- 加载时间；
- 文件大小。

例如打开一个网页时，你可能会看到：

- document：HTML 页面；
- stylesheet：CSS 文件；
- script：JavaScript 文件；
- img：图片；
- xhr / fetch：接口请求。

对于前端开发来说，Network 面板非常重要。接口没有返回、请求参数不对、Token 没带上、状态码异常、响应格式错误，都可以通过 Network 面板排查。

## 10. 使用 Postman 测试 HTTP 请求

Postman 是一个常用的 HTTP 客户端工具，特别适合测试 API。

它可以方便地发送：

- GET 请求；
- POST 请求；
- PUT 请求；
- DELETE 请求；
- 自定义 Header；
- JSON 请求体；
- 表单请求体；
- Token 认证信息。

例如测试一个 GET 请求：

```text id="27fvlb"
GET http://localhost:5000
```text

测试一个 POST 请求：

```text id="jpkdlp"
POST http://localhost:5000/contact
Content-Type: application/json

{
  "name": "John"
}
```

Postman 会显示服务器返回的状态码、响应头、响应体和响应时间，非常适合接口开发和调试。

## 11. 使用 Express 理解 HTTP

Express 是 Node.js 生态中非常常见的 Web 框架。它比较轻量，能直接接触到请求对象 `req` 和响应对象 `res`，非常适合学习 HTTP。

## 11.1 创建一个最简单的 Express 服务

```javascript id="hbv8b1"
const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from Express");
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});
```text

启动后访问：

```text id="ux1cyf"
http://localhost:5000
```

服务器会返回：

```text id="f5itqq"
Hello from Express
```ts

这里发生的事情是：

- 客户端发送 GET 请求；
- Express 匹配 `/` 路由；
- 服务器通过 `res.send()` 返回响应；
- 浏览器或 Postman 显示响应内容。

## 11.2 返回 JSON 数据

如果要返回 JSON，推荐使用 `res.json()`：

```javascript id="ens5no"
app.get("/api/message", (req, res) => {
  res.json({
    message: "Hello",
  });
});
```

响应内容是：

```json id="fb4ga7"
{
  "message": "Hello"
}
```ts

Express 会自动设置合适的 `Content-Type`。

## 11.3 读取请求头

可以通过 `req.header()` 获取请求头字段：

```javascript id="fs2zv2"
app.get("/headers", (req, res) => {
  const userAgent = req.header("user-agent");
  const host = req.header("host");

  res.json({
    host,
    userAgent,
  });
});
```

如果用 Postman 请求，`user-agent` 可能显示 Postman 的信息；如果用 Chrome 请求，则会显示 Chrome 浏览器和操作系统相关信息。

## 11.4 读取请求体

如果要读取 JSON 或表单数据，需要先添加中间件：

```javascript id="mjzxm6"
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
```ts

然后可以通过 `req.body` 读取请求体。

例如：

```javascript id="dctigo"
app.post("/contact", (req, res) => {
  res.json(req.body);
});
```

如果 Postman 发送：

```json id="blkkw7"
{
  "name": "John",
  "email": "john@example.com"
}
```ts

服务器就可以通过 `req.body.name` 和 `req.body.email` 获取数据。

## 11.5 根据请求参数返回状态码

实际接口开发中，服务器需要根据请求是否合法返回不同状态码。

例如联系表单要求必须传 `name`：

```javascript id="6rlu9l"
app.post("/contact", (req, res) => {
  if (!req.body.name) {
    return res.status(400).send("Name is required");
  }

  res.status(201).send(`Thank you ${req.body.name}`);
});
```

这里的逻辑是：

- 如果没有传 name，返回 400；
- 如果传了 name，返回 201；
- `return` 用于避免后续代码继续执行，导致重复发送响应。

## 11.6 通过 Header 传递 Token

在前后端分离项目中，Token 经常通过请求头传递。

例如：

```http id="zluz1d"
x-auth-token: 123456
```ts

Express 中可以这样读取：

```javascript id="z7gqgp"
app.post("/login", (req, res) => {
  const token = req.header("x-auth-token");

  if (!token) {
    return res.status(400).send("No token");
  }

  if (token !== "123456") {
    return res.status(401).send("Not authorized");
  }

  res.send("Logged in");
});
```

这里模拟了一个简单认证流程：

- 没有 Token，返回 400；
- Token 错误，返回 401；
- Token 正确，返回登录成功。

真实项目中不会直接写死 Token，而是会使用 JWT 或 Session 等方式进行认证。

## 11.7 PUT 请求：更新资源

例如更新一篇文章：

```javascript id="akb6iv"
app.put("/posts/:id", (req, res) => {
  res.json({
    id: req.params.id,
    title: req.body.title,
  });
});
```http

请求示例：

```http id="j7lntf"
PUT /posts/99 HTTP/1.1
Content-Type: application/json

{
  "title": "My Blog Post"
}
```

这里：

- `req.params.id` 获取 URL 中的 `99`；
- `req.body.title` 获取请求体中的标题。

实际项目中，通常会根据 ID 查询数据库，然后更新对应记录。

## 11.8 DELETE 请求：删除资源

例如删除一篇文章：

```javascript id="uvb2ll"
app.delete("/posts/:id", (req, res) => {
  res.json({
    message: `Post ${req.params.id} deleted`,
  });
});
```http

请求示例：

```http id="sbbxju"
DELETE /posts/99 HTTP/1.1
```

实际项目中，服务器会根据 ID 删除数据库中的对应记录。

## 12. Express 中托管静态文件

如果项目中有 HTML、CSS、JavaScript、图片等静态资源，可以使用 Express 的静态目录功能。

例如：

```javascript id="axh8ag"
app.use(express.static("public"));
```text

假设目录结构如下：

```text id="n5iye3"
project
├── app.js
└── public
    ├── index.html
    ├── css
    │   └── style.css
    └── js
        └── main.js
```

当访问：

```text id="4ykjjt"
http://localhost:5000
```text

Express 会自动返回 `public/index.html`。

浏览器解析 HTML 后，会继续请求：

```text id="nhtc62"
/css/style.css
/js/main.js
```

在 Network 面板中可以看到这些请求，以及它们的 Content-Type：

- HTML：`text/html`；
- CSS：`text/css`；
- JavaScript：`application/javascript`。

这也说明了一个网页通常不是一次请求完成的，而是由多个资源请求共同组成的。

## 13. HTTP/2 简要说明

HTTP/1.1 使用了很多年，但它在性能上存在一些限制。HTTP/2 的出现主要是为了提升传输效率。

HTTP/2 的主要改进包括：

- 多路复用；
- 头部压缩；
- 更高效的二进制传输；
- 降低延迟。

多路复用意味着多个请求和响应可以在同一个连接中并行传输，不必像 HTTP/1.1 那样一个资源一个资源地等待。

不过，对开发者来说，HTTP/2 的很多变化都在底层。我们写接口时，GET、POST、PUT、DELETE、状态码、Header、Body 这些概念依然存在。

也就是说：

> HTTP/2 更快、更高效，但 HTTP 的基本语义没有变。

## 14. 总结

HTTP 是 Web 开发的核心基础。理解 HTTP，不只是知道 GET 和 POST 的区别，而是要理解完整的请求响应周期。

一名 Web 开发者至少应该掌握以下内容：

- HTTP 是客户端和服务器之间的通信协议；
- HTTP 是无状态的；
- HTTPS 在 HTTP 基础上增加了加密；
- GET 用于获取资源；
- POST 用于提交或创建资源；
- PUT 用于更新资源；
- DELETE 用于删除资源；
- 请求和响应都有 Header 和 Body；
- Content-Type 决定数据如何被解析；
- 状态码用于表示请求结果；
- 2xx 表示成功，3xx 表示重定向，4xx 表示客户端错误，5xx 表示服务器错误；
- 浏览器 Network 面板可以观察真实 HTTP 请求；
- Postman 可以方便地测试 API；
- Express 能帮助我们直观理解请求对象和响应对象。

无论使用什么框架，HTTP 的基本模型都不会改变。框架只是帮我们封装了细节，但请求、响应、状态码、Header、Body 这些概念始终存在。

掌握 HTTP，才能更好地理解前后端通信、接口设计、错误排查和 Web 应用运行机制。
