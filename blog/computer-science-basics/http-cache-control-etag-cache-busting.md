# HTTP 缓存机制详解：从 Cache-Control 到 ETag 与 Cache Busting

在 Web 开发中，HTTP 缓存是一个非常重要但也容易被忽视的性能优化点。

很多时候，我们会花大量时间优化 JavaScript 包体积、减少接口请求、压缩图片资源，但如果没有正确使用缓存，用户仍然可能在每次刷新页面时重复下载相同的静态资源。

HTTP 缓存的意义主要体现在两个方面。

第一，它能让网站或 Web 应用加载得更快。浏览器不需要每次都向服务器请求同一个资源，而是可以直接从本地缓存中读取。

第二，它能减少用户的流量消耗。很多用户使用移动数据访问网站，如果每次刷新页面都要重新下载一张 200KB 的图片、一个几百 KB 的脚本文件，长期来看就是不必要的流量浪费。

因此，理解 HTTP 缓存，不只是后端或运维的事情，也是前端开发者必须掌握的基础能力。

## 一、HTTP 缓存中的几个角色

在讨论缓存前，需要先明确几个角色。

最常见的关系是：浏览器向服务器请求资源，服务器返回 HTML、CSS、JavaScript、图片、视频等文件。

这里的“客户端”通常指浏览器，但严格来说，客户端不一定非得是浏览器。某些嵌入式设备、客户端应用也可能直接发送 HTTP 请求，并拥有自己的缓存机制。

为了方便理解，本文主要以浏览器作为客户端来说明。

除了浏览器和源服务器，中间还可能存在一些代理层，例如：

反向代理；

CDN；

网关；

边缘服务器。

其中最常见的是 CDN，也就是 Content Delivery Network，内容分发网络。

CDN 通常部署在全球多个地区。当用户请求静态资源时，不一定要访问遥远的源服务器，而是可以从离自己更近的 CDN 节点获取资源。这样既能减少延迟，也能降低源服务器压力。

## 二、缓存命中与缓存未命中

理解 HTTP 缓存，首先要理解两个概念：命中和未命中。

### 1. Cache Hit：缓存命中

假设浏览器解析 HTML 时发现页面中需要加载一张图片。

浏览器会先检查自己的缓存中是否已经有这张图片。如果缓存中存在，并且这张图片仍然是新鲜的，没有过期，那么浏览器就可以直接从缓存中读取它，而不需要再次请求服务器。

这就是缓存命中，也就是 Cache Hit。

缓存命中的好处很明显：

速度更快；

不消耗额外网络流量；

减少服务器压力；

用户体验更好。

### 2. Cache Miss：缓存未命中

如果浏览器检查缓存时发现：

缓存中没有这个资源；

资源曾经存在，但已经过期；

缓存被清理了；

缓存规则要求必须重新验证；

那么浏览器就需要重新向服务器请求资源。

这就是缓存未命中，也就是 Cache Miss。

当服务器返回资源后，浏览器是否会把它存入缓存，取决于服务器返回的响应头，尤其是 `Cache-Control`。

## 三、前端代码不能直接控制浏览器 HTTP 缓存

很多前端开发者容易误解，以为可以直接在 JavaScript 中控制浏览器 HTTP 缓存。

实际上，对于普通 HTTP 资源缓存来说，前端代码并没有直接操作浏览器缓存的标准 API。

浏览器是否缓存资源、缓存多久、是否允许复用缓存，主要由服务器响应头决定。

例如服务器返回：

```http id="zjx0cp"
Cache-Control: public, max-age=14400
```

浏览器就会根据这个响应头来决定如何处理缓存。

用户可以手动清理浏览器缓存，开发者也可以通过 DevTools 禁用缓存进行调试，但应用中的普通 JavaScript 代码不能随意清除或修改浏览器的 HTTP 缓存。

因此，缓存策略通常需要前端、后端和部署平台共同配合。

## 四、Cache-Control 是最核心的缓存响应头

HTTP 缓存中最常见、最重要的响应头是 `Cache-Control`。

它用于告诉浏览器、CDN 或其他中间缓存层：这个资源是否可以被缓存、可以缓存多久、是否必须重新验证、是否允许公共缓存等。

常见写法如下：

```http id="h7j89v"
Cache-Control: public, max-age=14400
```

这里包含两个指令：

```http id="6bz26w"
public
max-age=14400
```

`public` 表示该资源可以被浏览器、CDN、代理服务器等公共缓存存储。

`max-age=14400` 表示该资源最多可以缓存 14400 秒，也就是 4 小时。

接下来我们逐个解释常见指令。

## 五、max-age：资源可以缓存多久

`max-age` 表示资源在缓存中可以被认为是“新鲜”的最长时间，单位是秒。

例如：

```http id="j41t8a"
Cache-Control: max-age=3600
```

表示该资源可以缓存 3600 秒，也就是 1 小时。

在这 1 小时内，如果浏览器再次请求同一个资源，可以直接使用缓存，不需要访问服务器。

如果超过 1 小时，缓存就变成过期资源。此时浏览器需要重新向服务器确认资源是否仍然可用，或者重新下载资源。

可以把 `max-age` 理解成资源的保质期。就像牛奶有过期时间一样，资源也有一个缓存有效期。

## 六、no-store：完全不要缓存

`no-store` 是最严格的缓存控制指令。

```http id="hr57o1"
Cache-Control: no-store
```

它表示：不要把这个响应存入任何缓存。

浏览器不能缓存，CDN 也不能缓存，中间代理也不应该缓存。

适合使用 `no-store` 的场景包括：

银行账户余额；

支付页面；

用户隐私信息；

后台敏感数据；

一次性验证码；

强动态 HTML 页面。

例如银行系统中的账户余额，不应该被浏览器缓存。否则用户看到的可能是过期金额，甚至可能在共享设备上泄露敏感信息。

另外，HTML 文件通常也不建议长期缓存。因为 HTML 是应用入口，它里面引用了 CSS、JavaScript、图片等资源。如果 HTML 被长期缓存，用户可能拿不到最新版本的页面入口，从而导致资源引用混乱。

对于 HTML 页面，常见策略是：

```http id="4ykoe9"
Cache-Control: no-store
```

或者使用更细粒度的重新验证策略。

## 七、no-cache：可以缓存，但使用前必须验证

`no-cache` 这个名字很容易误导人。它并不是“不缓存”。

```http id="wjbe8p"
Cache-Control: no-cache
```

它真正的含义是：资源可以被缓存，但每次使用缓存前，都必须先向服务器验证资源是否仍然有效。

也就是说，浏览器可以把资源存起来，但不能直接拿来用。下一次请求时，浏览器需要先问服务器：我这里有一个旧版本，它还能不能用？

如果服务器确认资源没变，可以返回 `304 Not Modified`，浏览器继续使用本地缓存。

如果服务器确认资源变了，就返回新资源。

所以：

`no-store` 是完全不存；

`no-cache` 是可以存，但每次用之前要验证。

这两个指令含义不同，不能混用。

## 八、must-revalidate：过期后必须重新验证

`must-revalidate` 表示资源一旦过期，就必须向服务器重新验证，不能在过期后继续使用旧缓存。

常见写法：

```http id="fzuck0"
Cache-Control: max-age=3600, must-revalidate
```

它通常和 `max-age` 一起使用。

意思是：资源在 3600 秒内可以直接使用缓存；但超过 3600 秒后，必须重新向服务器验证。

这个指令可以防止浏览器或中间缓存层在某些特殊情况下返回过期资源。

如果你希望用户绝对不要看到过期数据，可以考虑使用 `must-revalidate`。

## 九、public 和 private：谁可以缓存

### 1. public

```http id="bhsdfw"
Cache-Control: public, max-age=86400
```

`public` 表示该资源可以被任何缓存存储，包括：

浏览器缓存；

CDN；

代理服务器；

共享缓存。

适合公共静态资源，例如：

图片；

字体；

CSS；

JavaScript；

公开下载文件。

### 2. private

```http id="joabwx"
Cache-Control: private, max-age=600
```

`private` 表示该资源只能被用户自己的浏览器缓存，不能被 CDN 或共享代理缓存。

适合和具体用户相关但不特别敏感的内容，例如：

用户个人配置；

个性化页面片段；

用户专属接口响应。

需要注意，CDN 通常是公共缓存。如果资源中包含用户隐私或账号相关数据，不应该使用 `public` 缓存。

## 十、immutable：资源内容不会变化

`immutable` 表示资源在缓存有效期内不会发生变化。

```http id="f3attv"
Cache-Control: public, max-age=31536000, immutable
```

这里的 `31536000` 是一年。

这种策略适合带 hash 文件名的静态资源，例如：

```txt id="72yikm"
main.a8f3c1.js
styles.9d21ef.css
logo.22ab31.png
```

因为文件名中包含内容 hash，只要文件内容变化，文件名就会变化。因此旧文件可以放心长期缓存。

但不要对普通固定文件名的资源随便使用 `immutable`。

例如：

```txt id="j5drf6"
main.js
style.css
```

如果文件名不变，但内容更新了，用户可能长时间拿不到新版本。

## 十一、stale-while-revalidate：先用旧缓存，再后台更新

`stale-while-revalidate` 是一种兼顾速度和新鲜度的策略。

示例：

```http id="9n9p0y"
Cache-Control: max-age=60, stale-while-revalidate=300
```

意思是：

资源在 60 秒内是新鲜的，可以直接使用；

超过 60 秒后，在接下来的 300 秒内，可以先返回旧缓存；

同时浏览器或 CDN 在后台重新向服务器请求新版本。

这种方式的优点是用户可以很快看到内容，不需要等待服务器响应。后台更新完成后，下一次请求就能拿到更新后的缓存。

它适合对实时性要求不那么高、但对速度要求较高的资源。

例如：

新闻列表缓存；

推荐内容；

非关键配置；

部分公共接口数据。

## 十二、stale-if-error：服务器出错时使用旧缓存

`stale-if-error` 表示：如果服务器请求失败，可以使用过期缓存作为兜底。

示例：

```http id="p08fil"
Cache-Control: max-age=60, stale-if-error=86400
```

意思是：资源正常情况下缓存 60 秒；如果之后请求服务器出错，可以在 86400 秒内继续使用旧缓存。

这是一种容错策略。

它适合一些允许短时间不更新、但不能完全不可用的资源。

例如：

静态配置；

非核心内容；

降级页面；

公共数据接口。

当服务器暂时不可用时，用户至少还能看到旧版本内容，而不是直接看到错误页面。

## 十三、Pragma 和 Expires：旧时代的缓存头

除了 `Cache-Control`，还有两个历史较久的缓存相关头：

```http id="xvyg35"
Pragma: no-cache
```

和：

```http id="tfm4u4"
Expires: Wed, 21 Oct 2026 07:28:00 GMT
```

`Pragma` 主要用于兼容非常老的 HTTP/1.0 缓存行为。

`Expires` 通过指定一个绝对过期时间来控制缓存。

但在现代 Web 开发中，更推荐使用：

```http id="i16305"
Cache-Control: max-age=...
```

因为 `max-age` 是相对时间，不容易受到客户端时间不准、时区问题等影响。

如果不需要兼容非常老的系统，通常只需要重点关注 `Cache-Control`。

## 十四、Vary：根据请求头区分缓存版本

`Vary` 用来告诉缓存系统：同一个 URL 的响应，可能会因为某些请求头不同而不同。

例如：

```http id="otqoeo"
Vary: Accept-Encoding
```

表示服务器可能根据浏览器支持的压缩格式，返回 gzip、br 等不同版本。

再比如：

```http id="q6f1kp"
Vary: Accept-Language
```

表示服务器可能根据用户语言返回不同内容。

CDN 和浏览器看到 `Vary` 后，会把这些请求头纳入缓存判断。

如果没有正确设置 `Vary`，可能会出现缓存错乱。例如中文用户拿到了英文用户的缓存内容，或者不支持某种压缩格式的浏览器拿到了无法识别的压缩响应。

常见的 `Vary` 值包括：

```http id="conrns"
Vary: Accept-Encoding
Vary: Accept-Language
Vary: User-Agent
```

不过 `Vary: User-Agent` 要谨慎使用，因为 User-Agent 种类非常多，容易导致缓存命中率下降。

## 十五、没有 Cache-Control 时，浏览器也可能缓存

如果服务器没有返回 `Cache-Control`，是不是就完全不会缓存？

并不是。

现代浏览器可能会使用启发式缓存，也就是 heuristic caching。

它会根据其他响应头推测资源可以缓存多久，例如：

```http id="598tb8"
Last-Modified: Wed, 01 Jun 2025 10:00:00 GMT
Date: Wed, 01 Jun 2026 10:00:00 GMT
```

浏览器可能会计算当前响应时间和最后修改时间之间的差值，然后取其中一部分作为缓存时间。

例如，资源已经一年没有修改，浏览器可能会认为它相对稳定，于是缓存一段时间。

但是启发式缓存不可控，不同浏览器行为也可能不同。因此，生产环境中不建议依赖浏览器猜测，而应该显式设置 `Cache-Control`。

## 十六、协商缓存：If-Modified-Since 和 Last-Modified

缓存并不总是简单地“直接使用”或“重新下载”。

还有一种方式叫协商缓存。

浏览器本地有缓存，但不确定它是否仍然有效，于是向服务器发送请求进行验证。

第一种常见方式是 `Last-Modified` 和 `If-Modified-Since`。

服务器第一次响应资源时，返回：

```http id="yknf5h"
Last-Modified: Wed, 01 Jun 2026 10:00:00 GMT
```

浏览器下次请求时，会带上：

```http id="y1grv1"
If-Modified-Since: Wed, 01 Jun 2026 10:00:00 GMT
```

服务器收到后会判断：资源在这个时间之后有没有修改？

如果没有修改，服务器返回：

```http id="268w8f"
304 Not Modified
```

浏览器继续使用本地缓存。

如果已经修改，服务器返回新的资源内容。

这种方式的好处是，即使需要访问服务器，也不一定要重新下载完整资源。

但它也有缺点：时间判断可能受精度、时区、服务器时间同步等因素影响。

## 十七、协商缓存：ETag 和 If-None-Match

相比 `Last-Modified`，更常见也更可靠的协商缓存方式是 `ETag`。

服务器第一次返回资源时，带上：

```http id="ff2f45"
ETag: "a1b2c3d4"
```

浏览器下次请求时，会发送：

```http id="hn1iih"
If-None-Match: "a1b2c3d4"
```

服务器拿当前资源的 ETag 和浏览器传来的 ETag 比较。

如果一致，说明资源没变，返回：

```http id="kz11pz"
304 Not Modified
```

如果不一致，说明资源内容发生变化，服务器返回新资源和新的 ETag。

ETag 可以理解成资源内容的版本标识。常见实现方式是根据文件内容生成 hash，只要文件内容变化，ETag 就变化。

在 Node.js 生态中，也有专门生成 ETag 的包。很多 Web 服务器、框架和 CDN 也会自动处理 ETag。

对于开发者来说，理解它的作用比手动实现更重要。

## 十八、强缓存与协商缓存的区别

可以简单这样理解：

强缓存：浏览器判断缓存还没过期，直接使用本地缓存，不请求服务器。

协商缓存：浏览器需要问服务器资源有没有变化，如果没变，服务器返回 304。

强缓存依赖：

```http id="b71crz"
Cache-Control: max-age=...
Expires: ...
```

协商缓存依赖：

```http id="4ksfgg"
ETag / If-None-Match
Last-Modified / If-Modified-Since
```

两者通常会结合使用。

例如：

```http id="rqyxb9"
Cache-Control: public, max-age=3600
ETag: "a1b2c3d4"
```

在 3600 秒内，浏览器直接使用缓存。超过 3600 秒后，浏览器用 ETag 向服务器验证资源是否变化。

## 十九、Cache Busting：通过文件名更新缓存

前端项目打包后，经常会看到这样的文件名：

```txt id="vcy0wl"
main.a8f3c1.js
app.92bf11.css
vendor.4ad821.js
```

中间那段看起来随机的字符串，就是内容 hash。

它的作用是：只要文件内容发生变化，hash 就会变化，文件名也会变化。

这就是 Cache Busting，缓存破坏。

假设旧版本文件是：

```txt id="5x64ny"
main.a8f3c1.js
```

新版本构建后变成：

```txt id="6gnjsd"
main.b72e91.js
```

对于浏览器和 CDN 来说，这是两个完全不同的 URL。因此即使旧文件被长期缓存，新版本也能被正常请求到。

这种方式非常适合静态资源：

JavaScript；

CSS；

字体；

图片；

构建产物。

配合它，我们可以大胆给静态资源设置长缓存：

```http id="y5rnx0"
Cache-Control: public, max-age=31536000, immutable
```

因为只要内容变化，文件名就会变化，用户不会拿到旧内容。

## 二十、HTML 和静态资源应该使用不同缓存策略

一个常见的最佳实践是：

HTML 不长期缓存；

带 hash 的静态资源长期缓存。

例如 HTML：

```http id="pbvwht"
Cache-Control: no-cache
```

或者：

```http id="njjm4m"
Cache-Control: no-store
```

静态资源：

```http id="xi5jao"
Cache-Control: public, max-age=31536000, immutable
```

原因是 HTML 是入口文件，它引用了最新的 JS 和 CSS 文件。如果 HTML 被长期缓存，用户可能一直拿着旧 HTML，自然也就加载不到最新静态资源。

而 JS、CSS 文件带 hash，可以放心长期缓存。

这也是现代 React、Vue、Angular、Next.js 等项目常见的构建和部署策略。

## 二十一、CDN 在缓存中的作用

CDN 可以看作离用户更近的一层缓存。

假设源服务器在北美，用户在亚洲。如果每次请求都访问北美服务器，延迟会比较高。

CDN 会在全球多个地区部署边缘节点。当亚洲用户请求资源时，可能会命中亚洲附近的 CDN 节点，而不是直接访问北美源站。

CDN 的优势包括：

降低访问延迟；

减少源服务器压力；

提高缓存命中率；

加速静态资源分发；

提升跨地区访问体验。

不过，CDN 是公共缓存。不要把包含用户隐私、账号信息、支付信息的内容缓存到公共 CDN 上。

如果资源是用户相关的，应使用：

```http id="j53sqo"
Cache-Control: private
```

如果资源是公开静态资源，可以使用：

```http id="uh8ctm"
Cache-Control: public
```

## 二十二、常见缓存策略示例

### 1. HTML 页面

```http id="e01bs4"
Cache-Control: no-cache
```

或：

```http id="h6oisn"
Cache-Control: no-store
```

适合应用入口页面，避免用户长期拿到旧 HTML。

### 2. 带 hash 的 JS / CSS

```http id="ae9p4m"
Cache-Control: public, max-age=31536000, immutable
```

适合文件名带内容 hash 的构建产物。

### 3. 普通图片

```http id="hw2avc"
Cache-Control: public, max-age=86400
```

适合普通公开图片，缓存 1 天。

### 4. 用户隐私数据接口

```http id="q6bdpt"
Cache-Control: no-store
```

适合账户信息、订单详情、余额等敏感数据。

### 5. 可短暂过期的公共接口

```http id="5dyc3i"
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

适合新闻列表、推荐内容、公共配置等。

### 6. 用户个性化内容

```http id="iysd1x"
Cache-Control: private, max-age=300
```

适合只允许用户浏览器缓存、不允许 CDN 缓存的内容。

## 二十三、前端开发者应该关注什么

虽然很多缓存策略需要后端或部署平台配置，但前端开发者仍然需要理解它。

因为前端经常需要判断：

为什么我更新了代码，用户还是看到旧页面？

为什么 JS 文件加了 hash？

为什么 CDN 上的图片没有更新？

为什么接口返回 304？

为什么 DevTools 显示 from disk cache 或 from memory cache？

为什么某个资源每次刷新都重新下载？

为什么部署后需要清 CDN 缓存？

理解 HTTP 缓存后，这些问题就会更容易定位。

在 Chrome DevTools 的 Network 面板中，可以查看：

响应状态码；

请求头；

响应头；

Cache-Control；

ETag；

Last-Modified；

Size 是否显示 from memory cache / from disk cache；

资源是否返回 304。

调试缓存问题时，也可以勾选 Disable cache，但要注意它只在 DevTools 打开时生效。

## 二十四、总结

HTTP 缓存的核心目标，是减少不必要的网络请求，让资源尽可能快地被复用。

缓存命中时，浏览器可以直接使用本地资源，不再请求服务器。

缓存未命中时，浏览器才需要重新下载或重新验证资源。

`Cache-Control` 是现代 HTTP 缓存中最重要的响应头。

`max-age` 控制缓存时间。

`no-store` 表示完全不缓存。

`no-cache` 表示可以缓存，但使用前必须验证。

`must-revalidate` 表示过期后必须重新验证。

`public` 允许浏览器和 CDN 缓存。

`private` 只允许用户浏览器缓存。

`stale-while-revalidate` 可以先用旧缓存，再后台更新。

`stale-if-error` 可以在服务器出错时使用旧缓存兜底。

`ETag` 和 `Last-Modified` 用于协商缓存。

`Cache Busting` 通过文件名 hash 解决静态资源更新问题。

在实际项目中，推荐的基本策略是：

HTML 保持短缓存或不缓存；

带 hash 的 JS、CSS、图片等静态资源长期缓存；

敏感数据接口使用 `no-store`；

公共静态资源可以交给 CDN 缓存；

动态内容根据实时性选择合适的缓存策略。

缓存不是单纯的性能优化技巧，它直接关系到用户体验、流量成本、服务器压力和部署稳定性。理解 HTTP 缓存机制，是前端开发者从“会写页面”走向“能做工程化优化”的重要一步。
