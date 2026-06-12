# JWT 完整入门指南：从原理、结构到 Token 与 Session 的区别

在后端开发和前后端分离项目中，JWT 是一个非常常见的概念。

无论你是在做用户登录、接口鉴权、前后端权限控制，还是在设计微服务之间的身份传递，都很容易遇到 JWT。

很多开发者第一次接触 JWT 时，可能会有一些疑问：

JWT 到底是什么？

它和 Session 有什么区别？

JWT 安全吗？

Token 被别人拿到是不是就完了？

JWT 应该存在哪里？

Access Token 和 Refresh Token 又是什么？

这篇文章会系统整理 JWT 的核心概念、内部结构、工作流程、常见使用方式，以及它和传统 Session 方案之间的区别。

## 一、理解 JWT 前，需要先知道两个概念

在正式讲 JWT 之前，先了解两个基础概念：公钥私钥加密，以及有状态和无状态。

### 1. 公钥与私钥

公钥私钥是一种常见的加密机制。

它通常包含两把钥匙：

公钥；

私钥。

公钥可以公开分发，给别人知道没有问题。私钥必须保存在服务端，不能泄露。

在非对称加密场景中，使用公钥处理过的数据，通常需要对应的私钥才能解密或验证。JWT 中也会涉及类似的安全思想：服务端掌握密钥，客户端只持有 token，不能随意伪造 token。

不过需要注意，JWT 并不一定都使用非对称加密。很多项目中常见的 `HS256` 使用的是对称密钥，也就是签发和验证使用同一个 secret。

### 2. Stateful 与 Stateless

另一个重要概念是 stateful 和 stateless。

Stateful，中文可以理解为“有状态”。意思是服务端需要保存某些状态信息。例如传统 Session 机制中，服务端需要保存用户的 Session 信息。

Stateless，中文可以理解为“无状态”。意思是服务端不需要为每个登录用户额外保存会话状态。只要客户端每次请求都带上有效 token，服务端就可以通过 token 本身判断用户身份。

JWT 的一个重要特点就是无状态。

也就是说，服务端签发 JWT 后，客户端保存这个 token。之后客户端每次请求时带上 token，服务端只需要验证 token 是否有效，就能判断用户身份，而不一定需要每次都查询数据库中的会话记录。

## 二、JWT 是什么

JWT 的全称是 JSON Web Token。

它是一种开放标准，用于在双方之间安全地传递声明信息。这里的“声明”可以理解为：这个 token 里携带了一些关于用户或权限的信息。

在实际开发中，JWT 最常见的使用场景就是用户登录后的身份认证和接口授权。

一个 JWT 通常长这样：

```txt id="4h6lgo"
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOiI2NjYxMjMiLCJuYW1lIjoiMaimaiIiwiaWF0IjoxNzE5OTk5OTk5fQ.
mZqfQJ0YvPXKxRUl8YvD2lF4mL1YzY9b9z9R2K3k9uA
```

看起来是一长串随机字符，但它并不是完全随机的。

JWT 通常由三部分组成，中间用 `.` 分隔：

```txt id="taeag3"
Header.Payload.Signature
```

也就是：

Header，头部；

Payload，载荷；

Signature，签名。

## 三、JWT 的三段结构

### 1. Header：头部

Header 用来描述 token 的类型和签名算法。

例如：

```json id="dgh6fn"
{
  "alg": "HS256",
  "typ": "JWT"
}
```

其中：

`alg` 表示使用的签名算法，例如 `HS256`；

`typ` 表示 token 类型，通常是 `JWT`。

这一部分经过 Base64URL 编码后，就变成 JWT 的第一段。

### 2. Payload：载荷

Payload 是 JWT 中真正存放信息的部分。

例如：

```json id="gxmn07"
{
  "sub": "666123",
  "name": "Maimai",
  "email": "maimai@example.com",
  "iat": 1719999999,
  "exp": 1720003599
}
```

常见字段包括：

`sub`：Subject，通常表示用户 ID；

`name`：用户名；

`email`：邮箱；

`iat`：Issued At，签发时间；

`exp`：Expiration Time，过期时间。

在实际项目中，最常放入 JWT 的是用户 ID。因为只要有用户 ID，服务端就可以在需要时从数据库查询完整用户信息。

虽然 JWT 可以携带一些信息，但不建议把敏感数据放进去，例如密码、身份证号、银行卡号、支付信息等。

原因是：JWT 的 Payload 通常只是编码，不是加密。任何拿到 token 的人，都可以把 Header 和 Payload 解码出来查看。

JWT 真正防止的是篡改，而不是隐藏内容。

### 3. Signature：签名

Signature 是 JWT 最关键的安全部分。

它的作用是验证 token 有没有被篡改。

以 `HS256` 为例，签名生成逻辑大致是：

```txt id="fwp0cf"
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

服务端会使用一个 secret 对 Header 和 Payload 进行签名。

如果有人修改了 Payload 中的内容，例如把用户 ID 从普通用户改成管理员 ID，那么原来的签名就对不上了。服务端验证时会发现 token 无效。

所以 JWT 的安全核心在于：客户端可以看到 token 内容，但不能伪造合法签名。

secret 必须保存在服务端，不能暴露给客户端。

## 四、JWT 是加密了吗

很多人会说 JWT 是“加密 token”，但严格来说，这个说法不完全准确。

普通 JWT 通常是签名的，不是加密的。

也就是说：

JWT 可以防止篡改；

JWT 不一定能隐藏内容。

Header 和 Payload 通常只是 Base64URL 编码，任何人都可以解码查看。Signature 才是验证 token 是否被篡改的关键。

所以不要在 JWT 中存放敏感信息。

如果真的需要加密内容，需要使用 JWE，也就是 JSON Web Encryption，但大多数登录鉴权场景使用的是 JWS，也就是带签名的 JWT。

## 五、认证与授权的区别

在讲 JWT 的使用场景之前，需要区分两个概念：Authentication 和 Authorization。

### 1. Authentication：认证

Authentication 指的是“你是谁”。

例如用户登录时输入邮箱和密码，服务端校验数据库，确认这个账号确实存在，密码也正确。

这个过程就是认证。

认证解决的是身份问题。

### 2. Authorization：授权

Authorization 指的是“你能访问什么”。

例如：

普通用户可以访问用户中心；

管理员可以访问后台管理系统；

VIP 用户可以访问付费内容；

某些用户只能读取数据，不能删除数据。

这些都是授权问题。

JWT 最常见的用途是：用户认证成功后，服务端签发一个 token。之后用户访问接口时带上 token，服务端根据 token 判断用户身份和权限。

## 六、JWT 的基本登录流程

一个典型的 JWT 登录流程如下。

第一步，用户提交登录信息：

```txt id="hd67pq"
email + password
```

第二步，服务端校验用户信息。

服务端会查询数据库，确认用户是否存在、密码是否正确。

第三步，校验通过后，服务端生成 JWT。

例如 token 中包含：

```json id="j8bey2"
{
  "sub": "user_id",
  "iat": 1719999999,
  "exp": 1720003599
}
```

第四步，服务端把 JWT 返回给客户端。

第五步，客户端保存 JWT。

第六步，之后每次请求受保护接口时，客户端都带上 token：

```http id="bb7d9v"
Authorization: Bearer <access_token>
```

第七步，服务端验证 token。

如果 token 合法且未过期，就允许访问资源。

如果 token 无效或过期，就返回未授权错误。

## 七、JWT 的常见使用场景

JWT 常见使用场景包括：

用户登录认证；

接口权限校验；

前后端分离项目鉴权；

移动端 App 登录态维护；

微服务之间传递用户身份；

第三方服务之间交换声明信息；

单点登录系统中的身份传递。

JWT 不只适用于浏览器和服务器之间，也可以用于服务端和服务端之间的通信。只要双方共享验证规则或公私钥，就可以通过 JWT 传递可信声明。

## 八、JWT 应该存在哪里

JWT 签发后，需要保存在客户端。常见保存位置有三种。

### 1. localStorage

很多前端项目会把 JWT 存在 localStorage 中。

优点是：

使用方便；

刷新页面后仍然存在；

前端读取简单。

缺点是：

容易受到 XSS 攻击影响。

如果页面存在跨站脚本攻击漏洞，攻击者注入的 JavaScript 就可能读取 localStorage 中的 token。

所以，如果使用 localStorage，一定要特别注意 XSS 防护。

### 2. sessionStorage

sessionStorage 和 localStorage 类似，但它的生命周期更短。

浏览器标签页关闭后，sessionStorage 中的数据通常会被清除。

优点是：

比 localStorage 生命周期短；

适合短会话场景。

缺点仍然是：

JavaScript 可以访问它，因此也可能受到 XSS 攻击影响。

### 3. Cookie

JWT 也可以存放在 Cookie 中。

更推荐使用带安全属性的 Cookie，例如：

```http id="dsp01b"
HttpOnly
Secure
SameSite
```

`HttpOnly` 可以防止 JavaScript 读取 Cookie，降低 XSS 窃取 token 的风险。

`Secure` 表示 Cookie 只能通过 HTTPS 发送。

`SameSite` 可以降低 CSRF 攻击风险。

示例：

```http id="qkxwyc"
Set-Cookie: accessToken=xxx; HttpOnly; Secure; SameSite=Lax; Path=/;
```

Cookie 方案也不是完全没有问题。它需要处理 CSRF 防护、跨域配置、SameSite 策略等问题。

实际项目中，Web 应用常用 HttpOnly Cookie 存放 token，移动端或纯 API 场景则可能使用 Authorization Header。

## 九、Token 被偷了怎么办

JWT 的一个特点是：谁持有有效 token，谁就可以访问对应资源。

所以如果 token 被攻击者拿到，在 token 过期前，攻击者确实可能冒充用户发起请求。

这也是为什么 JWT 的安全设计通常不会只依赖一个长期有效 token。

常见防护措施包括：

Access Token 设置较短有效期；

使用 Refresh Token 续期；

Refresh Token 存入数据库并可撤销；

使用 HTTPS；

避免在 JWT 中存敏感信息；

防止 XSS；

Cookie 设置 HttpOnly、Secure、SameSite；

重要操作要求二次验证；

退出登录时清除客户端 token，并使 refresh token 失效。

因此，JWT 不是“永远不会被盗”的方案，而是要通过过期时间、刷新机制、存储策略和安全防护一起使用。

## 十、Access Token 和 Refresh Token

在实际项目中，通常不会只使用一个长期有效的 JWT。

更常见的方式是使用两个 token：

Access Token；

Refresh Token。

### 1. Access Token

Access Token 是访问接口时使用的 token。

特点是：

有效期短；

每次请求接口时携带；

用于证明用户身份；

过期后不能继续访问资源。

常见有效期可能是 10 分钟、15 分钟、30 分钟或 1 小时，具体取决于业务需求。

### 2. Refresh Token

Refresh Token 用于刷新 Access Token。

特点是：

有效期更长；

通常存储在数据库中；

可以被撤销；

不应该频繁发送给普通业务接口；

只用于换取新的 Access Token。

一个典型流程如下：

用户登录成功；

服务端返回 Access Token 和 Refresh Token；

Access Token 用于访问接口；

Access Token 过期后，客户端使用 Refresh Token 请求刷新接口；

服务端验证 Refresh Token 是否有效；

如果有效，签发新的 Access Token；

必要时也可以轮换新的 Refresh Token。

## 十一、Refresh Token 的工作流程

假设 Access Token 有效期是 15 分钟。

用户登录后，服务端返回：

```json id="mttgsh"
{
  "accessToken": "aaa.xxx.yyy",
  "refreshToken": "bbb.xxx.yyy"
}
```

客户端之后请求接口时带上 Access Token：

```http id="3rqr06"
Authorization: Bearer aaa.xxx.yyy
```

15 分钟后，Access Token 过期。

服务端返回：

```http id="zr0hc5"
401 Unauthorized
```

客户端检测到 Access Token 过期后，调用刷新接口：

```http id="v3qv71"
POST /auth/refresh-token
```

并携带 Refresh Token。

服务端检查数据库中是否存在这个 Refresh Token，是否过期，是否被撤销。

如果验证通过，服务端返回新的 Access Token：

```json id="mz8otm"
{
  "accessToken": "new.aaa.xxx"
}
```

之后客户端继续使用新的 Access Token 访问接口。

这个机制的好处是：Access Token 即使泄露，攻击窗口也比较短；Refresh Token 因为保存在服务端数据库中，可以被主动撤销。

## 十二、JWT 如何失效

很多人会问：JWT 是无状态的，那怎么让它失效？

常见方式有几种。

### 1. 设置 exp 过期时间

这是最基础的方式。

签发 JWT 时设置：

```json id="xsxk2o"
{
  "exp": 1720003599
}
```

过期后 token 自动无效。

### 2. 使用短期 Access Token

Access Token 只设置较短有效期，例如 15 分钟。

即使 token 泄露，风险时间也有限。

### 3. Refresh Token 存数据库

Refresh Token 可以存入数据库。

退出登录时，从数据库删除 refresh token，或者标记为失效。

### 4. 黑名单机制

如果业务要求立即让某个 Access Token 失效，可以把 token ID 或 token hash 加入黑名单。

服务端每次验证 token 时检查黑名单。

缺点是：这会破坏 JWT 的纯无状态优势，因为每次验证都需要查询存储。

### 5. Token Version 机制

可以在用户表中保存一个 tokenVersion。

JWT 中也放入 tokenVersion。

当用户修改密码、退出所有设备或账号异常时，服务端递增 tokenVersion。旧 token 中的版本号就不再匹配，从而失效。

这种方式适合需要批量失效旧 token 的场景。

## 十三、JWT 与 Session 的区别

JWT 和 Session 都可以实现登录态，但它们的思路不同。

### 1. Session 是有状态的

传统 Session 登录流程通常是：

用户提交账号密码；

服务端验证成功；

服务端创建一条 session 记录；

服务端返回一个 sessionId 给浏览器；

浏览器把 sessionId 存在 Cookie 中；

之后每次请求都带上 sessionId；

服务端根据 sessionId 查询数据库或缓存，判断用户是谁。

Session 的核心是：登录状态保存在服务端。

浏览器只保存一个 sessionId。

### 2. JWT 是无状态的

JWT 登录流程通常是：

用户提交账号密码；

服务端验证成功；

服务端签发 JWT；

客户端保存 JWT；

之后每次请求携带 JWT；

服务端通过密钥验证 JWT；

验证通过后认为用户身份有效。

JWT 的核心是：身份信息和验证信息包含在 token 中。

服务端不一定需要保存登录状态。

## 十四、JWT 和 Session 的流程对比

### Session 流程

```txt id="w6wzds"
用户登录
  ↓
服务端验证账号密码
  ↓
服务端创建 session，并存入数据库或缓存
  ↓
返回 sessionId 给浏览器
  ↓
浏览器后续请求携带 sessionId
  ↓
服务端查询 session 存储
  ↓
确认用户身份
  ↓
返回资源
```

Session 每次验证身份时，通常都需要查询数据库或 Redis。

### JWT 流程

```txt id="x6loz9"
用户登录
  ↓
服务端验证账号密码
  ↓
服务端签发 JWT
  ↓
返回 JWT 给客户端
  ↓
客户端后续请求携带 JWT
  ↓
服务端使用密钥验证 JWT
  ↓
确认用户身份
  ↓
返回资源
```

JWT 验证时通常不需要查询 session 存储，因此更容易横向扩展。

## 十五、JWT 的优点

JWT 的优点包括：

服务端无状态；

适合前后端分离；

适合移动端和 API 鉴权；

容易扩展到多服务；

减少频繁查询 session 存储；

可以携带少量用户信息；

适合分布式系统；

跨域使用相对方便。

对于多服务架构来说，JWT 非常有用。

例如用户登录主站后，需要访问文档服务、课程服务、后台服务等。如果这些服务都能验证同一套 JWT 签名，就不需要每个服务都单独维护一套 session 状态。

## 十六、JWT 的缺点

JWT 也不是完美方案。

它的缺点包括：

一旦签发，在过期前默认很难主动失效；

token 泄露后，在有效期内可能被冒用；

Payload 不适合存敏感信息；

token 太大会增加请求体积；

权限变更后，旧 token 可能仍然携带旧权限；

如果使用黑名单，又会增加服务端状态；

客户端存储方式需要谨慎设计。

因此，不要把 JWT 理解成“比 Session 一定更安全”。它只是另一种登录态设计方式，适合不同场景。

## 十七、Session 的优点和缺点

Session 的优点是：

服务端可控性强；

容易主动失效；

适合传统服务端渲染应用；

权限变更可以及时生效；

用户退出登录后 session 可以立即删除。

缺点是：

服务端需要保存状态；

分布式系统中需要共享 session；

高并发下 session 存储压力较大；

跨域和多端场景处理更复杂；

每次验证通常需要访问数据库或 Redis。

如果是传统单体应用，Session 非常直观、稳定。

如果是前后端分离、多端、多服务系统，JWT 会更灵活。

## 十八、JWT 和 Session 哪个更好

没有绝对答案。

如果你的应用是传统 Web 应用，前后端不分离，服务端渲染页面，用户规模不大，Session 是非常可靠的选择。

如果你的应用是前后端分离、移动端 App、多服务架构、开放 API、跨域接口较多，那么 JWT 通常更方便。

也可以组合使用：

Access Token 使用 JWT；

Refresh Token 存数据库；

Web 端用 HttpOnly Cookie；

服务端保留 refresh token 状态；

需要强控制时增加黑名单或 token version。

实际项目中，纯 JWT 和纯 Session 都不是唯一答案。更常见的是根据业务安全要求和系统架构混合设计。

## 十九、JWT 在 Node.js 中的简单使用

在 Node.js 中，常见库是 `jsonwebtoken`。

安装：

```bash id="bqs3s3"
npm install jsonwebtoken
```

签发 token：

```ts id="hzg3fl"
import jwt from "jsonwebtoken";

const token = jwt.sign(
  {
    sub: user.id,
    email: user.email,
  },
  process.env.JWT_SECRET!,
  {
    expiresIn: "15m",
  },
);
```

验证 token：

```ts id="hhxnmt"
import jwt from "jsonwebtoken";

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET!);

  console.log(decoded);
} catch (error) {
  console.error("Invalid or expired token");
}
```

在 Express 中，可以写一个认证中间件：

```ts id="qxg6io"
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}
```

这样受保护的接口就可以使用该中间件：

```ts id="g9rb8s"
app.get("/api/profile", authMiddleware, (req, res) => {
  res.json({
    message: "This is protected user data",
  });
});
```

## 二十、JWT 的实践建议

在实际项目中，建议遵循以下原则。

第一，JWT Payload 中只放必要信息，例如用户 ID、角色、签发时间和过期时间。

第二，不要存密码、手机号、身份证号、银行卡号等敏感信息。

第三，Access Token 有效期不要太长。

第四，使用 Refresh Token 机制续期。

第五，Refresh Token 建议存数据库，方便撤销。

第六，生产环境必须使用 HTTPS。

第七，Web 端优先考虑 HttpOnly Cookie。

第八，注意 XSS 和 CSRF 防护。

第九，secret 要足够复杂，并放在环境变量中。

第十，不要把 JWT secret 写死在前端或提交到 Git 仓库。

第十一，用户修改密码、退出登录、账号异常时，要有 token 失效机制。

第十二，权限特别敏感的接口不要只依赖旧 token 中的角色信息，可以实时查询数据库确认。

## 二十一、常见误区

### 误区一：JWT 是加密的，所以里面可以放任何信息

不对。

普通 JWT 的 Payload 可以被解码查看。JWT 主要防篡改，不是隐藏信息。

### 误区二：JWT 比 Session 一定更安全

不对。

JWT 和 Session 是不同机制。安全性取决于存储方式、过期时间、传输安全、防攻击策略等。

### 误区三：Token 泄露也没关系

不对。

谁持有有效 token，谁就可能访问资源。因此必须控制 token 生命周期，并做好 XSS、HTTPS、Cookie 安全配置。

### 误区四：JWT 完全不需要数据库

不完全对。

Access Token 可以无状态验证，但 Refresh Token、黑名单、设备管理、退出登录等功能通常仍然需要数据库或缓存。

### 误区五：JWT 越大越方便

不对。

JWT 每次请求都会携带。如果 Payload 过大，会增加网络开销。token 中只应该放必要字段。

## 二十二、总结

JWT 是一种用于在双方之间安全传递声明信息的开放标准。在 Web 开发中，它最常用于用户登录后的身份认证和接口授权。

一个 JWT 通常由三部分组成：

Header；

Payload；

Signature。

Header 描述算法和 token 类型。

Payload 存放声明信息，例如用户 ID、签发时间、过期时间。

Signature 用于验证 token 是否被篡改。

JWT 的核心特点是无状态。服务端签发 token 后，不一定需要保存会话状态。客户端每次请求携带 token，服务端通过密钥验证 token 是否有效。

Session 则是有状态机制。服务端需要保存 session 信息，客户端只保存 sessionId。

JWT 更适合前后端分离、移动端、多服务、分布式系统。Session 更适合传统服务端渲染应用和需要强服务端控制的场景。

实际项目中，常见做法是使用短期 Access Token 加长期 Refresh Token。Access Token 用于访问接口，Refresh Token 用于续期，并存储在数据库中，方便撤销和失效控制。

JWT 并不是绝对安全，也不是 Session 的完全替代品。真正可靠的认证系统，需要结合合理的 token 生命周期、安全存储方式、HTTPS、防 XSS、防 CSRF、刷新机制和失效策略一起设计。

理解 JWT，不只是会调用一个库生成 token，而是要理解它背后的身份认证、授权、状态管理和安全边界。
