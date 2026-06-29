# 浏览器中的三种数据存储方式：LocalStorage、SessionStorage 和 Cookie 详解

在前端开发中，我们经常需要把一些数据临时或长期保存在用户浏览器中。比如保存用户偏好设置、主题模式、登录状态、表单草稿、购物车信息等。

浏览器中常见的数据存储方式主要有三种：

```text
LocalStorage
SessionStorage
Cookie
```text

这三者都可以把数据存储在用户的浏览器中，但它们的生命周期、容量、作用范围、是否会发送到服务器等方面都有明显区别。

本文将系统讲清楚它们的相同点、不同点，以及在 JavaScript 中如何使用它们。

---

## 一、三者的共同点

LocalStorage、SessionStorage 和 Cookie 都有一个共同点：

**它们都存储在用户当前使用的浏览器中。**

也就是说，如果用户在 Chrome 浏览器中访问你的网站，并保存了一些 LocalStorage 或 Cookie，那么这些数据只存在于 Chrome 中。

如果同一个用户换成 Firefox 浏览器访问同一个网站，之前保存在 Chrome 里的数据不会自动出现在 Firefox 里。

所以，这些数据是：

```text
浏览器级别隔离的
```

它们不是跟着用户账号自动同步的，也不是保存在服务器上的。

另外，不同用户之间也不会共享这些数据。某个用户浏览器中的 LocalStorage、SessionStorage 或 Cookie，不会被其他用户直接看到。

因此，这三种方式更适合存储与“单个用户当前浏览器”相关的数据。

例如：

用户界面主题；

语言偏好；

搜索历史；

临时表单内容；

购物车草稿；

某些登录凭证或身份标识。

不过需要注意的是，这些数据都不应该被当作绝对可靠的数据来源。因为用户随时可以清除浏览器数据，包括 Cookie、LocalStorage 和 SessionStorage。

---

## 二、LocalStorage、SessionStorage 和 Cookie 的核心区别

虽然这三者都可以存储浏览器数据，但它们的设计目标并不完全一样。

可以大致分成两类：

```text
LocalStorage 和 SessionStorage 比较相似；
Cookie 和前两者差别更大。
```text

Cookie 出现得更早，最初主要是为了解决 HTTP 无状态的问题，让浏览器能够在请求中携带一些状态信息给服务器。

而 LocalStorage 和 SessionStorage 是 Web Storage API 的一部分，主要用于在浏览器本地保存数据，不会自动随着请求发送给服务器。

---

## 三、存储容量区别

三者的存储容量不同。

一般来说：

```text
Cookie：约 4KB
SessionStorage：约 5MB
LocalStorage：约 5MB 到 10MB，具体取决于浏览器
```

Cookie 的容量最小，通常只有几 KB。这是因为 Cookie 会随着每次 HTTP 请求一起发送到服务器，如果 Cookie 太大，就会增加请求体积，影响性能。

LocalStorage 和 SessionStorage 的容量更大，更适合保存相对较多的前端数据。

例如，如果只是保存一个身份标识，Cookie 可以胜任；但如果要保存用户偏好配置、页面缓存、草稿内容等，LocalStorage 或 SessionStorage 通常更合适。

---

## 四、生命周期区别

三者最大的区别之一，就是生命周期不同。

### 1. LocalStorage：长期存在

LocalStorage 中的数据会长期保存在浏览器中。

只要用户不主动清除浏览器数据，或者代码不主动删除，它就会一直存在。

例如：

```js
localStorage.setItem("theme", "dark");
```text

即使用户关闭浏览器，第二天重新打开网站，这个数据仍然存在。

所以 LocalStorage 适合保存长期有效的数据，比如：

主题模式；

语言设置；

用户偏好；

某些不敏感的本地缓存。

---

### 2. SessionStorage：当前标签页会话有效

SessionStorage 的生命周期是当前页面会话。

简单来说：

**只要当前标签页还开着，SessionStorage 就存在；标签页关闭后，SessionStorage 就会被清除。**

例如：

```js
sessionStorage.setItem("step", "2");
```

这个数据只在当前标签页中有效。

如果用户打开同一个网站的新标签页，新标签页通常无法共享旧标签页中的 SessionStorage。

所以 SessionStorage 适合保存短期临时数据，比如：

多步骤表单当前步骤；

临时筛选条件；

一次性页面状态；

当前标签页中的操作缓存。

---

### 3. Cookie：可以手动设置过期时间

Cookie 的生命周期由过期时间决定。

创建 Cookie 时，可以设置它什么时候过期。

例如，可以让它一天后过期，也可以让它一年后过期，甚至设置一个非常遥远的时间，让它看起来像“长期有效”。

如果没有设置合适的过期时间，Cookie 可能会变成会话 Cookie，浏览器关闭后就失效。

Cookie 的过期时间需要通过字符串形式设置，例如：

```js
document.cookie = `name=Kyle; expires=${new Date(9999, 0, 1).toUTCString()}`;
```text

---

## 五、作用范围区别

LocalStorage 和 Cookie 通常可以在同一个网站的多个标签页中访问。

例如用户在 Chrome 中打开了你网站的两个标签页：

```text
Tab 1: https://example.com
Tab 2: https://example.com
```

如果在 Tab 1 中设置了 LocalStorage，Tab 2 通常也可以读取到。

Cookie 也是类似的，只要符合同源、路径、域名等规则，就可以在对应请求中携带。

但是 SessionStorage 不一样。

SessionStorage 是标签页级别的。它只存在于当前标签页的会话中。另一个新打开的标签页通常无法直接共享它。

---

## 六、是否会发送到服务器

这是 Cookie 和 LocalStorage、SessionStorage 最关键的区别之一。

### LocalStorage 和 SessionStorage 不会自动发送到服务器

LocalStorage 和 SessionStorage 只是保存在浏览器本地。

浏览器发送 HTTP 请求时，不会自动把它们带给服务器。

例如：

```js
localStorage.setItem("name", "Bob");
sessionStorage.setItem("name", "John");
```text

这些数据只存在于浏览器端。除非你自己通过 JavaScript 把它们放进请求里，否则服务器不会自动收到这些数据。

---

### Cookie 会随着请求自动发送到服务器

Cookie 不一样。

只要符合 Cookie 的作用域规则，浏览器向服务器发送请求时，会自动带上对应 Cookie。

不管请求的是：

HTML 页面；

CSS 文件；

JavaScript 文件；

图片；

接口数据。

Cookie 都可能随着请求发送给服务器。

这也是为什么 Cookie 很适合用来做某些身份认证相关的事情。

例如，用户登录后，服务器可以设置一个认证 Cookie。之后用户访问同一个网站时，浏览器会自动带上这个 Cookie，服务器就能识别用户身份。

但是这也意味着 Cookie 不应该存储太大的数据。

因为 Cookie 会增加每次请求的体积。如果 Cookie 太多、太大，就会拖慢请求速度。

---

## 七、什么时候使用 LocalStorage？

LocalStorage 适合保存长期存在、只需要前端使用的数据。

例如：

```text
主题设置
语言偏好
用户界面配置
本地草稿
搜索历史
不敏感的缓存数据
```

基本原则是：

**如果数据不需要自动发送给服务器，并且希望关闭浏览器后仍然保留，可以考虑使用 LocalStorage。**

例如保存主题模式：

```js
localStorage.setItem("theme", "dark");

const theme = localStorage.getItem("theme");

console.log(theme);
```text

---

## 八、什么时候使用 SessionStorage？

SessionStorage 适合保存当前标签页中的临时数据。

例如：

```text
当前页面的临时状态
表单填写进度
多步骤流程的当前步骤
一次性筛选条件
临时 token 或临时标记
```

基本原则是：

**如果数据只在当前标签页有效，关闭标签页后就不需要了，可以使用 SessionStorage。**

例如：

```js
sessionStorage.setItem("currentStep", "2");

const step = sessionStorage.getItem("currentStep");

console.log(step);
```text

---

## 九、什么时候使用 Cookie？

Cookie 适合保存需要被服务器读取的数据。

例如：

```text
登录状态
身份认证信息
服务端会话标识
某些需要随请求发送的标记
```

基本原则是：

**只有当数据需要随着请求发送到服务器时，才优先考虑使用 Cookie。**

因为 Cookie 的容量小，而且会自动附加到请求上，所以不适合保存大量数据。

另外，涉及登录认证时，Cookie 的安全配置非常重要，比如：

```text
HttpOnly
Secure
SameSite
Expires / Max-Age
Path
Domain
```text

尤其是认证 Cookie，通常应该由服务端设置，并尽量使用 `HttpOnly`，避免被前端 JavaScript 直接读取，从而降低 XSS 风险。

---

## 十、LocalStorage 的基本用法

LocalStorage 的 API 很简单，常用方法有三个：

```js
localStorage.setItem(key, value);
localStorage.getItem(key);
localStorage.removeItem(key);
```

### 1. 设置数据

```js
localStorage.setItem("name", "Bob");
```ts

这里 `"name"` 是 key，`"Bob"` 是 value。

需要注意的是：

**LocalStorage 中的 key 和 value 都是字符串。**

如果你想保存对象，需要先把对象转换成 JSON 字符串。

例如：

```js
const user = {
  name: "Bob",
  age: 20,
};

localStorage.setItem("user", JSON.stringify(user));
```

---

### 2. 读取数据

```js
const name = localStorage.getItem("name");

console.log(name);
```text

如果 key 存在，会返回对应的字符串值。

如果 key 不存在，会返回：

```js
null;
```

---

### 3. 删除数据

```js
localStorage.removeItem("name");
```text

这会删除 key 为 `"name"` 的数据。

---

### 4. 更新数据

LocalStorage 没有单独的 update 方法。

如果想更新某个 key 的值，直接再次调用 `setItem` 即可。

```js
localStorage.setItem("name", "Bob");
localStorage.setItem("name", "Alice");
```

后一次会覆盖前一次。

---

## 十一、SessionStorage 的基本用法

SessionStorage 的 API 和 LocalStorage 几乎完全一样。

常用方法也是：

```js
sessionStorage.setItem(key, value);
sessionStorage.getItem(key);
sessionStorage.removeItem(key);
```text

### 1. 设置数据

```js
sessionStorage.setItem("name", "John");
```

### 2. 读取数据

```js
const name = sessionStorage.getItem("name");

console.log(name);
```text

### 3. 删除数据

```js
sessionStorage.removeItem("name");
```

### 4. 更新数据

```js
sessionStorage.setItem("name", "John");
sessionStorage.setItem("name", "Bob");
```text

同样，后一次设置会覆盖前一次。

---

## 十二、Cookie 的基本用法

相比 LocalStorage 和 SessionStorage，Cookie 的操作方式要麻烦很多。

浏览器提供的原生方式是通过：

```js
document.cookie;
```

来读写 Cookie。

---

### 1. 设置 Cookie

例如设置一个名为 `name` 的 Cookie：

```js
document.cookie = "name=Kyle";
```text

这会添加一个 Cookie：

```text
name=Kyle
```

但是，如果不设置过期时间，这个 Cookie 的生命周期可能不是你想要的效果。

---

### 2. 设置 Cookie 过期时间

可以通过 `expires` 设置过期时间：

```js
document.cookie = `name=Kyle; expires=${new Date(2027, 0, 1).toUTCString()}`;
```text

这里的日期表示 2027 年 1 月 1 日。

需要注意，JavaScript 中 `Date` 的月份是从 0 开始的：

```text
0 表示 1 月
1 表示 2 月
2 表示 3 月
```

所以：

```js
new Date(2027, 0, 1);
```text

表示 2027 年 1 月 1 日。

如果想设置一个非常久以后才过期的 Cookie，也可以写成：

```js
document.cookie = `name=Kyle; expires=${new Date(9999, 0, 1).toUTCString()}`;
```

---

### 3. 设置多个 Cookie

多次给 `document.cookie` 赋值，并不会直接覆盖所有 Cookie，而是添加或更新对应名称的 Cookie。

例如：

```js
document.cookie = `name=Kyle; expires=${new Date(9999, 0, 1).toUTCString()}`;
document.cookie = `lastName=Smith; expires=${new Date(9999, 0, 1).toUTCString()}`;
```text

这样会得到两个 Cookie：

```text
name=Kyle
lastName=Smith
```

如果 Cookie 名称相同，则会更新对应 Cookie。

---

### 4. 读取 Cookie

读取 Cookie 时，可以直接打印：

```js
console.log(document.cookie);
```text

输出结果通常是一个字符串：

```text
name=Kyle; lastName=Smith
```

这也是 Cookie 原生操作比较麻烦的地方。

它不像 LocalStorage 那样可以直接通过 `getItem("name")` 获取某一个值。

如果你想读取某个指定 Cookie，需要自己解析字符串，或者使用第三方 Cookie 工具库。

---

## 十三、Cookie 为什么更麻烦？

Cookie 的原生 API 比较老，使用起来没有 LocalStorage 和 SessionStorage 直观。

LocalStorage 和 SessionStorage 更像一个简单的 key-value 数据库：

```js
localStorage.setItem("name", "Bob");
localStorage.getItem("name");
```text

而 Cookie 更像是在操作一段特殊格式的字符串：

```js
document.cookie = "name=Kyle; expires=...";
```

读取时也是一整个字符串：

```text
name=Kyle; lastName=Smith
```text

你需要自己拆分、解析、匹配 key。

所以在实际开发中，如果确实需要频繁操作 Cookie，通常会使用小型工具库来简化操作。

---

## 十四、三者对比表

| 对比项               | LocalStorage           | SessionStorage                   | Cookie                   |
| -------------------- | ---------------------- | -------------------------------- | ------------------------ |
| 存储位置             | 浏览器                 | 浏览器                           | 浏览器                   |
| 生命周期             | 长期保存，除非手动删除 | 当前标签页会话，关闭标签页后清除 | 可设置过期时间           |
| 容量                 | 较大，约 5MB–10MB      | 较大，约 5MB                     | 很小，约 4KB             |
| 是否自动发送到服务器 | 否                     | 否                               | 是                       |
| 多标签页共享         | 同源下通常共享         | 通常不共享                       | 同源和路径规则下共享     |
| API 易用性           | 简单                   | 简单                             | 较麻烦                   |
| 典型用途             | 主题、偏好、本地缓存   | 临时页面状态                     | 登录认证、服务端会话标识 |

---

## 十五、使用建议

大多数情况下，如果你只是想在浏览器中保存一些前端使用的数据，优先考虑：

```text
LocalStorage 或 SessionStorage
```

如果数据需要长期保存，就用 LocalStorage。

如果数据只在当前标签页的当前会话中有效，就用 SessionStorage。

只有当你需要让数据随着请求发送给服务器时，才考虑使用 Cookie。

可以简单记成：

```text
长期本地保存：LocalStorage
当前标签页临时保存：SessionStorage
需要发给服务器：Cookie
```text

---

## 十六、安全注意事项

无论使用哪一种方式，都不要随便存储敏感信息。

尤其是：

```text
密码
银行卡信息
身份证信息
高权限 token
敏感隐私数据
```

LocalStorage 和 SessionStorage 都可以被页面中的 JavaScript 读取。如果页面存在 XSS 漏洞，攻击者就可能读取其中的数据。

Cookie 虽然也有风险，但可以通过 `HttpOnly` 限制 JavaScript 读取，适合由服务端管理认证信息。

所以，涉及登录认证时，不要简单地把所有 token 都放进 LocalStorage。更安全的做法通常要结合具体业务、后端认证方案、Cookie 安全属性和 CSRF 防护一起设计。

---

## 十七、总结

浏览器中常见的数据存储方式主要有三种：LocalStorage、SessionStorage 和 Cookie。

LocalStorage 适合保存长期存在的本地数据；SessionStorage 适合保存当前标签页中的临时数据；Cookie 适合保存需要随请求发送到服务器的数据。

三者最大的区别在于：

```text
LocalStorage：长期保存，不自动发送服务器；
SessionStorage：标签页会话级保存，不自动发送服务器；
Cookie：容量小，但会自动随请求发送服务器。
```

在实际开发中，优先考虑 LocalStorage 和 SessionStorage，只有在需要服务端读取数据时再使用 Cookie。

一句话总结：

**前端本地状态用 Storage，服务端需要识别状态时用 Cookie。**
