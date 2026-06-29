# Cookie 详解：创建方式、属性、类型与安全风险

Cookie 是浏览器中非常重要的一种数据存储机制。它看起来只是一个很小的 key-value 数据，但在 Web 应用中却承担着很多关键功能。

比如：

用户登录后，为什么下次访问网站不需要重新输入账号密码？

网站为什么能记住你的语言偏好？

广告平台为什么能在不同网站之间识别用户行为？

这些场景背后，都可能和 Cookie 有关。

Cookie 本质上是存储在浏览器中的一小段数据，并且在符合条件时，会随着 HTTP 请求一起发送给服务器。正因为它会自动随请求发送，所以 Cookie 经常被用于登录态管理、用户个性化和行为追踪。

本文会从四个方面系统讲清 Cookie：

Cookie 如何创建；

Cookie 常见属性；

Cookie 的常见类型；

Cookie 的安全风险与防护。

---

## 一、Cookie 是什么？

Cookie 是浏览器保存的一小段数据，通常由一个名称和值组成。

例如：

```text
userId=123
theme=dark
sessionId=abc123
```text

Cookie 的特点是：

它存储在浏览器中；

它通常和某个域名绑定；

它可以设置过期时间；

它可以设置路径、域名、安全属性；

它会在符合条件时自动随请求发送给服务器。

这一点是 Cookie 和 LocalStorage、SessionStorage 最大的区别。

LocalStorage 和 SessionStorage 只是保存在浏览器本地，不会自动发送到服务器。而 Cookie 会随着请求一起发送，所以它非常适合保存服务端需要识别的状态信息。

比如登录状态。

当用户登录后，服务器可以返回一个 Cookie：

```text
Set-Cookie: sessionId=abc123
```

浏览器保存这个 Cookie。之后用户再访问同一个网站时，浏览器会自动带上：

```text
Cookie: sessionId=abc123
```text

服务器看到这个 sessionId，就知道当前请求来自哪个用户。

---

## 二、Cookie 的主要用途

Cookie 常见用途主要有三类。

### 1. 会话管理

这是 Cookie 最典型的用途。

HTTP 协议本身是无状态的。也就是说，服务器默认不会记得上一次请求是谁发来的。

Cookie 可以弥补这一点。

例如用户登录网站后，服务器通过 Cookie 保存一个 sessionId。之后浏览器每次请求都带上这个 sessionId，服务器就能识别用户身份。

这就是为什么你登录 Facebook、淘宝、后台系统之后，不需要每次刷新页面都重新输入账号密码。

---

### 2. 用户个性化

Cookie 也可以保存一些用户偏好。

例如：

语言偏好；

主题模式；

字体大小；

游戏中的少量进度；

用户曾经关闭过某个弹窗。

比如：

```text
language=zh-CN
theme=dark
```

当用户下次访问网站时，服务器或前端可以读取这些 Cookie，然后恢复用户之前的设置。

---

### 3. 广告追踪

Cookie 也经常用于广告和行为追踪。

广告平台可能通过第三方 Cookie 或其他跟踪机制识别用户在多个网站上的访问行为，从而进行广告推荐。

这也是为什么很多网站都会提示“我们使用 Cookie 改善体验”或者“是否接受 Cookie”。

不过，随着隐私保护要求提高，现代浏览器对第三方 Cookie 的限制越来越严格。很多传统追踪方式正在被削弱或替代。

---

## 三、创建 Cookie 的两种方式

Cookie 可以通过两种主要方式创建：

客户端 JavaScript 创建；

服务器通过响应头创建。

---

## 四、通过 JavaScript 创建 Cookie

在浏览器中，可以通过 `document.cookie` 创建 Cookie。

例如：

```js
document.cookie = "name=Hussein";
```text

这行代码会在当前网站下创建一个名为 `name`、值为 `Hussein` 的 Cookie。

Cookie 可以理解成一种 key-value 数据：

```text
name=Hussein
```

创建之后，可以在 Chrome DevTools 中查看。

打开开发者工具后，进入：

```text
Application -> Cookies
```ts

就可以看到当前站点下保存的 Cookie。

不过，`document.cookie` 的原生 API 并不好用。它不像 LocalStorage 那样有 `setItem`、`getItem`、`removeItem` 这些清晰的方法，而是通过字符串来读写。

例如：

```js
console.log(document.cookie);
```

输出结果可能是：

```text
name=Hussein; theme=dark
```text

如果想读取某一个具体 Cookie，需要自己解析字符串，或者使用 Cookie 工具库。

---

## 五、通过服务器创建 Cookie

除了客户端 JavaScript，服务器也可以创建 Cookie。

服务器通过响应头告诉浏览器设置 Cookie。

这个响应头叫：

```http
Set-Cookie
```

例如：

```http
Set-Cookie: sessionId=abc123
```text

当浏览器收到这个响应头后，会自动保存这个 Cookie。

之后浏览器再次访问同一个域名时，就会自动带上：

```http
Cookie: sessionId=abc123
```

这种方式在登录系统中非常常见。

比如用户提交账号密码后，服务器验证成功，然后返回：

```http
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax
```text

浏览器保存之后，后续请求都会自动携带这个 Cookie。

这也是服务端管理登录态的常见方式。

---

## 六、Cookie 会随着请求自动发送

Cookie 最重要的特点之一是：

**Cookie 会在符合条件时，自动随着 HTTP 请求发送给服务器。**

无论请求的是：

HTML 页面；

CSS 文件；

JavaScript 文件；

图片；

接口数据。

只要 Cookie 的域名、路径、安全策略等条件匹配，它就可能被发送。

这也是为什么 Cookie 不能存太大的数据。

如果一个网站设置了很多很大的 Cookie，那么每一次请求都会携带这些 Cookie，导致请求变大，浪费带宽，影响性能。

所以 Cookie 适合保存小数据，不适合保存大量信息。

---

## 七、Cookie 的作用域：Domain

Cookie 不是对所有网站都可见的。

它有作用域。

其中一个重要作用域属性是：

```text
Domain
```

默认情况下，通过 JavaScript 设置的 Cookie 只属于当前域名。

例如你在：

```text
example.com
```text

设置了一个 Cookie。

这个 Cookie 默认只属于 `example.com`。

如果你访问：

```text
www.example.com
```

它不一定能看到 `example.com` 下的 Cookie。

因为从浏览器角度看：

```text
example.com
www.example.com
```text

属于不同的主机名。

不过，可以通过设置 Domain，让 Cookie 对子域名也可用。

例如：

```js
document.cookie = "token=123; domain=.example.com";
```

这样设置后，这个 Cookie 可以在 `example.com` 以及它的子域名下使用，例如：

```text
www.example.com
mail.example.com
dev.example.com
```text

需要注意的是，Domain 设置得越宽，Cookie 暴露范围就越大，安全风险也越高。

所以实际开发中，Domain 应该尽量设置得精确。

---

## 八、Cookie 的作用域：Path

除了 Domain，Cookie 还有另一个作用域属性：

```text
Path
```

Path 用来限制 Cookie 只在某些路径下发送。

例如：

```js
document.cookie = "loginToken=abc; path=/login";
```text

这个 Cookie 只会在访问 `/login` 及其子路径时发送。

再比如：

```js
document.cookie = "adminToken=abc; path=/admin";
```

这个 Cookie 只会在访问 `/admin` 相关路径时发送。

Path 的作用是减少不必要的 Cookie 发送。

如果某个 Cookie 只和某个接口或某个页面路径有关，就没有必要让它随着整个网站的所有请求发送。

这样可以减少带宽浪费，也能缩小 Cookie 的暴露范围。

---

## 九、Expires 和 Max-Age

Cookie 可以设置生命周期。

常见方式有两个：

```text
Expires
Max-Age
```text

如果没有设置 Expires 或 Max-Age，这个 Cookie 通常是会话 Cookie。

也就是说，它会在浏览器会话结束后被清除。

---

### 1. Expires

Expires 用来设置 Cookie 的具体过期时间。

例如：

```js
document.cookie = "name=Hussein; expires=Wed, 01 Jan 2030 00:00:00 GMT";
```

这个 Cookie 会在指定时间后过期。

---

### 2. Max-Age

Max-Age 用来设置 Cookie 还能存活多少秒。

例如：

```js
document.cookie = "temp=1; max-age=180";
```text

这表示 Cookie 会在 180 秒后过期。

也就是 3 分钟。

相比 Expires，Max-Age 通常更直观，因为它是相对时间。

---

## 十、Session Cookie 和 Persistent Cookie

根据生命周期，Cookie 可以分成两类。

### 1. Session Cookie

Session Cookie 是没有设置 Expires 或 Max-Age 的 Cookie。

它通常只在当前浏览器会话中存在。

浏览器关闭后，这类 Cookie 会被删除。

不过，不同浏览器对“恢复上次会话”的处理可能有差异，所以实际表现可能会受到浏览器设置影响。

---

### 2. Persistent Cookie

Persistent Cookie 是设置了 Expires 或 Max-Age 的 Cookie。

它有明确的过期时间。

即使用户关闭浏览器，只要还没到过期时间，这个 Cookie 仍然可以保留。

虽然名字叫 Persistent Cookie，有时也被称为“永久 Cookie”，但它并不是真的永久。它仍然会在过期、用户清理浏览器数据、代码删除时消失。

---

## 十一、SameSite：限制跨站请求携带 Cookie

SameSite 是 Cookie 安全中非常重要的属性。

它用于控制 Cookie 是否会在跨站请求中发送。

它主要用来缓解 CSRF 攻击。

---

## 十二、什么是 CSRF？

CSRF 的全称是 Cross-Site Request Forgery，中文叫跨站请求伪造。

它的基本思想是：

用户已经登录了某个网站，比如银行网站；

浏览器里保存着银行网站的登录 Cookie；

用户访问了一个恶意网站；

恶意网站诱导用户点击一个链接，或者自动发起某些请求；

浏览器可能会带上银行网站的 Cookie；

银行服务器误以为这是用户本人发出的请求。

举一个简化例子。

假设某银行有一个非常不安全的转账接口：

```text
https://bank.example.com/transfer?to=attacker&amount=10000
```

如果用户已经登录银行网站，那么浏览器里有银行 Cookie。

这时用户在恶意网站点击了一个链接，跳转到这个转账地址。

如果银行后端没有足够的防护，就可能错误地执行转账操作。

这就是 CSRF 的危险之处。

现实中，正规系统不会用 GET 请求做转账这种危险操作，也会有 CSRF Token、二次验证、SameSite Cookie 等多重防护。

但这个例子可以帮助理解风险。

---

## 十三、SameSite 的三个常见值

SameSite 常见有三个值：

```text
Strict
Lax
None
```text

---

### 1. SameSite=Strict

Strict 是最严格的策略。

```http
Set-Cookie: sessionId=abc; SameSite=Strict
```

设置为 Strict 后，Cookie 只会在同站请求中发送。

如果用户从其他网站点击链接跳转过来，这个 Cookie 也不会被发送。

安全性高，但可能影响用户体验。

例如用户从邮件、搜索结果或外部链接打开你的网站时，可能不会自动带上登录态 Cookie。

---

### 2. SameSite=Lax

Lax 是更平衡的策略。

```http
Set-Cookie: sessionId=abc; SameSite=Lax
```text

它会允许一些安全性较高的跨站导航请求携带 Cookie，比如用户点击链接进入网站。

但它会限制很多跨站子请求或危险请求。

现代浏览器通常倾向于将没有明确声明 SameSite 的 Cookie 按 Lax 处理。

对于大多数普通登录场景，SameSite=Lax 是比较常用的选择。

---

### 3. SameSite=None

None 表示允许跨站发送 Cookie。

```http
Set-Cookie: sessionId=abc; SameSite=None; Secure
```

但现代浏览器要求：

```text
SameSite=None 必须同时设置 Secure
```text

也就是说，这类 Cookie 只能通过 HTTPS 发送。

SameSite=None 常用于确实需要跨站 Cookie 的场景，比如第三方登录、嵌入式服务、跨站 iframe 等。

但它的安全风险更高，需要谨慎使用。

---

## 十四、HttpOnly：禁止 JavaScript 读取 Cookie

HttpOnly 是 Cookie 中非常重要的安全属性。

设置 HttpOnly 后，Cookie 仍然会随着 HTTP 请求发送给服务器，但前端 JavaScript 无法通过 `document.cookie` 读取它。

例如：

```http
Set-Cookie: sessionId=abc123; HttpOnly
```

这意味着：

浏览器请求服务器时会带上它；

JavaScript 不能读取它；

`document.cookie` 中看不到它。

HttpOnly 的主要作用是降低 XSS 攻击带来的 Cookie 泄露风险。

如果网站存在 XSS 漏洞，攻击者可以执行恶意 JavaScript。如果 sessionId 存在普通 Cookie 中，攻击者就可能通过 `document.cookie` 读取它。

但如果 sessionId 设置了 HttpOnly，恶意脚本就无法直接读取这个 Cookie。

所以，认证相关 Cookie 通常应该设置 HttpOnly。

---

## 十五、Secure：只允许 HTTPS 发送

Secure 也是 Cookie 中常见的安全属性。

设置 Secure 后，Cookie 只会通过 HTTPS 请求发送。

例如：

```http
Set-Cookie: sessionId=abc123; Secure
```text

如果用户通过 HTTP 访问网站，这个 Cookie 不会被发送。

Secure 可以防止 Cookie 在明文 HTTP 连接中被窃听。

在生产环境中，涉及认证和敏感信息的 Cookie 都应该设置 Secure。

通常认证 Cookie 推荐这样设置：

```http
Set-Cookie: sessionId=abc123; HttpOnly; Secure; SameSite=Lax
```

---

## 十六、第三方 Cookie

第三方 Cookie 是广告追踪中常见的概念。

假设你访问一个网站：

```text
blog.example.com
```text

这个网站页面中嵌入了广告平台的资源：

```text
ads.example.net
```

广告平台的脚本、图片或 iframe 可能会向 `ads.example.net` 发起请求，并由 `ads.example.net` 设置自己的 Cookie。

这个 Cookie 不属于你正在访问的主站 `blog.example.com`，而属于第三方域名 `ads.example.net`。

这类 Cookie 就是第三方 Cookie。

广告平台可以通过这种方式在不同网站之间识别用户，从而进行跨站追踪。

不过，现在主流浏览器对第三方 Cookie 的限制越来越多。隐私保护已经成为现代浏览器的重要方向。

---

## 十七、Zombie Cookie：删除后又“复活”的 Cookie

Zombie Cookie，中文可以叫“僵尸 Cookie”。

它指的是一种特殊追踪方式：

用户删除 Cookie 后，网站又通过其他存储机制重新生成相同或类似的 Cookie。

也就是说，Cookie 看起来被删掉了，但很快又“复活”。

它可能依赖其他浏览器存储或缓存机制，例如：

ETag；

IndexedDB；

LocalStorage；

缓存标识；

设备指纹；

服务端保存的追踪标识。

例如，某些网站可能通过 ETag 识别用户。

ETag 本来是 HTTP 缓存机制，用于判断资源有没有变化。浏览器请求资源后，服务器返回一个 ETag。下次浏览器再次请求时，会带上这个 ETag，服务器根据它判断资源是否变化。

但如果网站滥用 ETag，把它当作用户追踪标识，那么即使用户清除了 Cookie，服务器仍然可能通过 ETag 识别用户，并重新设置 Cookie。

这就是 Zombie Cookie 的基本思路。

这种做法具有明显的隐私争议，在现代 Web 中并不推荐。

---

## 十八、Cookie 的安全风险

Cookie 虽然很有用，但也存在不少安全风险。

常见风险包括：

XSS 窃取 Cookie；

CSRF 利用 Cookie 自动发送；

中间人攻击窃听 Cookie；

第三方 Cookie 追踪；

Cookie 作用域设置过宽；

敏感信息直接存入 Cookie。

---

## 十九、XSS 与 Cookie 泄露

XSS，也就是跨站脚本攻击，指攻击者把恶意 JavaScript 注入到目标网站中执行。

如果网站存在 XSS 漏洞，而 Cookie 又没有设置 HttpOnly，那么恶意脚本就可能读取 Cookie。

风险点在于：

```js
document.cookie;
```text

普通 Cookie 可以通过它读取。

所以认证 Cookie 不应该暴露给 JavaScript。

防护方式包括：

认证 Cookie 设置 HttpOnly；

对用户输入进行严格转义和过滤；

避免直接使用不可信 HTML；

设置内容安全策略 CSP；

减少第三方脚本风险。

---

## 二十、CSRF 与 Cookie 自动发送

CSRF 的风险来自 Cookie 的自动发送机制。

浏览器会自动携带目标网站的 Cookie，即使请求是从另一个网站触发的。

防护 CSRF 的常见方法包括：

设置 SameSite=Lax 或 SameSite=Strict；

重要操作使用 POST、PUT、DELETE 等合适方法，不要用 GET 修改数据；

服务端校验 CSRF Token；

校验 Origin / Referer；

敏感操作加入二次验证；

认证 Cookie 配合 Secure、HttpOnly 使用。

尤其要记住：

**GET 请求应该只用于读取数据，不应该修改服务器状态。**

比如删除账户、转账、修改密码、提交订单，都不应该通过 GET 请求完成。

因为链接跳转、本地图片加载、iframe 加载等行为都可能触发 GET 请求。

---

## 二十一、Cookie 最佳实践

实际开发中，可以遵循这些建议。

### 1. Cookie 尽量小

Cookie 会随请求发送，所以不要存大量数据。

不要把完整用户信息、权限列表、大对象 JSON 都塞进 Cookie。

### 2. 认证 Cookie 设置 HttpOnly

登录态、sessionId、refresh token 等敏感 Cookie 应该设置 HttpOnly，避免被 JavaScript 读取。

### 3. 生产环境设置 Secure

涉及认证的 Cookie 应该只通过 HTTPS 发送。

### 4. 设置合适的 SameSite

普通登录场景可以考虑：

```http
SameSite=Lax
```

更严格的安全场景可以考虑：

```http
SameSite=Strict
```text

确实需要跨站发送时，才使用：

```http
SameSite=None; Secure
```

### 5. 合理设置 Domain 和 Path

Domain 不要设置得过宽。

Path 尽量限制在需要的路径范围内。

### 6. 不要在 Cookie 中保存敏感明文信息

不要把密码、身份证号、银行卡号等敏感信息直接放进 Cookie。

### 7. 不要用 GET 请求修改数据

GET 应该是安全、幂等、只读的。

修改服务端状态应该使用 POST、PUT、PATCH、DELETE，并配合 CSRF 防护。

---

## 二十二、总结

Cookie 是浏览器中一种非常重要的数据存储和状态传递机制。

它不仅可以存储少量数据，还会在符合条件时自动随请求发送给服务器，所以非常适合用于登录态管理、用户个性化和部分服务端状态识别。

Cookie 可以通过 JavaScript 创建，也可以由服务器通过 `Set-Cookie` 响应头创建。

它有很多重要属性，包括：

```text
Domain
Path
Expires
Max-Age
SameSite
HttpOnly
Secure
```text

这些属性决定了 Cookie 的作用域、生命周期、发送条件和安全级别。

从类型上看，Cookie 可以分为 Session Cookie、Persistent Cookie、HttpOnly Cookie、Secure Cookie、第三方 Cookie，甚至还有带有隐私争议的 Zombie Cookie。

在安全方面，Cookie 最大的问题主要来自 XSS 和 CSRF。

所以，实际开发中应该尽量做到：

```text
认证 Cookie 设置 HttpOnly
生产环境使用 Secure
合理配置 SameSite
限制 Domain 和 Path
不要存储敏感明文信息
不要使用 GET 修改服务端数据
```

一句话总结：

**Cookie 很小，但它连接了浏览器状态、服务器认证和 Web 安全，是前端与后端都必须理解的核心机制。**
