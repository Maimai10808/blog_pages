# Next.js proxy.ts 入门：从 middleware.ts 迁移到 proxy.ts，并实现重定向、matcher 与 Cookie 操作

在 Next.js 新版本中，原来的 `middleware.ts` 文件名已经逐渐被弃用，新的推荐写法是使用：

```ts
proxy.ts;
```

如果你之前写过 Next.js 的 middleware，那么 `proxy.ts` 可以理解为它的新命名方式。

也就是说，过去我们可能会在项目根目录或 `src` 目录下创建：

```text
middleware.ts
```

现在推荐改成：

```text
proxy.ts
```

同时，导出的函数也从：

```ts
export function middleware() {}
```

改成：

```ts
export function proxy() {}
```

本文将通过几个简单例子，讲清楚 `proxy.ts` 的基本使用方式，包括：

```text
1. proxy.ts 的执行时机
2. NextResponse.next() 的作用
3. 如何通过 matcher 指定生效页面
4. 如何在 proxy.ts 中做重定向
5. 如何设置和读取 Cookie
```

---

## 一、middleware.ts 已被替换为 proxy.ts

在旧版本 Next.js 中，我们通常使用：

```text
middleware.ts
```

来做一些请求进入页面前的处理逻辑。

例如：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}
```

但在新版本中，启动项目时可能会看到类似提示：

```text
The middleware file convention is deprecated. Please use proxy instead.
```

意思是：

```text
middleware.ts 文件约定已经被弃用，请改用 proxy.ts。
```

因此，新的写法应该是：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.next();
}
```

文件名也需要改成：

```text
proxy.ts
```

如果项目有 `src` 目录，一般放在：

```text
src/proxy.ts
```

如果项目没有 `src` 目录，一般放在项目根目录：

```text
proxy.ts
```

它通常和 `app` 目录同级，而不是放在 `app` 目录里面。

---

## 二、proxy.ts 的执行时机

`proxy.ts` 会在页面正式加载前先执行。

也就是说，当用户访问某个页面时，请求流程大致是：

```text
用户访问页面
先经过 proxy.ts
proxy.ts 执行逻辑
决定继续访问页面、重定向，或直接返回响应
页面正式渲染
```

所以 `proxy.ts` 可以用来做一些页面加载前的判断。

例如：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  console.log("proxy running");

  return NextResponse.next();
}
```

当你访问页面时，终端中就会打印：

```text
proxy running
```

这说明请求在进入页面前，先经过了 `proxy.ts`。

---

## 三、直接返回响应会阻止页面继续加载

如果你在 `proxy.ts` 中直接返回一个 JSON 响应：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.json({
    data: "hello proxy",
  });
}
```

这时访问页面时，页面不会继续渲染，而是直接返回：

```json
{
  "data": "hello proxy"
}
```

原因是：

```text
proxy.ts 先执行
它已经返回了响应
请求链路到这里就结束了
后面的页面不会再继续加载
```

这说明 `proxy.ts` 有能力提前终止请求。

但在大多数场景中，我们并不是要直接返回 JSON，而是希望执行一些逻辑后继续访问原页面。

这时就需要使用 `NextResponse.next()`。

---

## 四、NextResponse.next() 的作用

`NextResponse.next()` 表示：

```text
当前 proxy 逻辑处理完了，请继续往后执行，让用户访问原本要访问的页面。
```

示例：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  console.log("proxy running");

  return NextResponse.next();
}
```

这样用户访问 `/about`，最终仍然会看到 `/about` 页面。

用户访问 `/contact`，最终仍然会看到 `/contact` 页面。

区别只是页面加载前，`proxy.ts` 先执行了一次。

可以简单理解为：

```text
NextResponse.json()：直接返回响应，页面不再继续加载
NextResponse.redirect()：重定向到其他页面
NextResponse.next()：继续访问原页面
```

---

## 五、使用 matcher 指定 proxy 生效范围

默认情况下，`proxy.ts` 可能会对很多路径生效。

但实际项目中，我们通常不希望所有页面都执行同一套逻辑。

例如，我们只希望访问 `/about` 页面时执行 proxy 逻辑，访问 `/contact` 时不执行。

这时可以使用 `config.matcher`。

示例：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  console.log("only about page proxy");

  return NextResponse.next();
}

export const config = {
  matcher: ["/about/:path*"],
};
```

这里的：

```ts
matcher: ["/about/:path*"];
```

表示：

```text
/about
/about/xxx
/about/xxx/yyy
```

这些路径都会触发 `proxy.ts`。

但下面这些路径不会触发：

```text
/
/contact
/login
/register
```

所以 matcher 的作用就是控制：

```text
哪些路径会经过 proxy.ts
哪些路径不会经过 proxy.ts
```

---

## 六、matcher 中的 :path\* 是什么意思？

在：

```ts
matcher: ["/about/:path*"];
```

里面，`:path*` 表示匹配 `/about` 后面的任意子路径。

例如：

```text
/about
/about/team
/about/company
/about/company/history
```

都能匹配。

如果只写：

```ts
matcher: ["/about"];
```

那么它通常只匹配 `/about` 本身，不一定覆盖所有子路径。

所以在实际项目中，如果要保护某个页面模块及其子页面，常用写法是：

```ts
matcher: ["/dashboard/:path*"];
```

表示：

```text
/dashboard
/dashboard/settings
/dashboard/orders
/dashboard/profile
```

都会触发 proxy。

---

## 七、在 proxy.ts 中实现重定向

`proxy.ts` 也可以用来做重定向。

比如用户访问 `/about` 时，自动跳转到首页 `/`。

示例：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/about/:path*"],
};
```

当访问：

```text
/about
```

时，会自动跳转到：

```text
/
```

这里的核心代码是：

```ts
NextResponse.redirect(new URL("/", request.url));
```

`new URL("/", request.url)` 的意思是：

```text
基于当前请求地址，构造一个新的跳转地址 /
```

不要直接写普通字符串：

```ts
NextResponse.redirect("/");
```

更推荐写成：

```ts
NextResponse.redirect(new URL("/", request.url));
```

这样 Next.js 可以更准确地知道完整跳转地址。

---

## 八、用 proxy.ts 做登录拦截

重定向最常见的使用场景就是登录拦截。

比如：

```text
用户访问 /dashboard
如果没有登录，跳转到 /login
如果已经登录，继续访问 /dashboard
```

可以这样写：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

逻辑非常清晰：

```text
读取 cookie 中的 token
没有 token，说明未登录
未登录就跳转登录页
有 token 就继续访问原页面
```

不过需要注意：

```text
proxy.ts 更适合做轻量级登录预检查
真正的数据权限判断，仍然建议放在服务端数据访问层
```

也就是说，proxy 可以拦页面入口，但不要只依赖它保护所有敏感数据。

---

## 九、在 proxy.ts 中设置 Cookie

`proxy.ts` 中也可以设置 Cookie。

不过设置 Cookie 时，通常需要先创建一个 response：

```ts
const response = NextResponse.next();
```

然后在这个 response 上设置 cookie：

```ts
response.cookies.set("framework", "nextjs", {
  path: "/",
});
```

完整示例：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.cookies.set("framework", "nextjs", {
    path: "/",
  });

  return response;
}
```

这里设置了一个 Cookie：

```text
framework=nextjs
```

其中：

```ts
path: "/";
```

表示这个 cookie 对整个站点路径都可用。

也就是说，不只是首页可以读取，其他路径也可以读取。

---

## 十、在 proxy.ts 中读取 Cookie

读取 Cookie 可以通过 `request.cookies.get()`。

示例：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const framework = request.cookies.get("framework");

  console.log(framework);

  return NextResponse.next();
}
```

如果之前已经设置了：

```text
framework=nextjs
```

那么打印结果大致是：

```ts
{
  name: "framework",
  value: "nextjs"
}
```

如果只想拿到值，可以写：

```ts
const framework = request.cookies.get("framework")?.value;
```

如果想读取所有 Cookie，可以使用：

```ts
request.cookies.getAll();
```

但一般不建议调试时直接打印所有 Cookie，因为内容可能很多，而且可能包含敏感信息。

---

## 十一、设置 Cookie 后为什么第一次读取可能拿不到？

有一个细节需要理解：

```ts
const response = NextResponse.next();

response.cookies.set("framework", "nextjs", {
  path: "/",
});

const framework = request.cookies.get("framework");
```

这里你在当前响应中设置了 Cookie，但 `request.cookies` 代表的是“这次请求进来时浏览器携带的 Cookie”。

所以这次刚设置的 Cookie，通常要等浏览器收到响应、保存 Cookie 后，下一次请求才会带上来。

也就是说：

```text
第一次请求：服务端设置 Cookie
浏览器收到响应并保存 Cookie
第二次请求：浏览器带着 Cookie 访问，服务端才能从 request.cookies 读取到
```

这是 Cookie 的正常工作机制。

---

## 十二、删除 Cookie

如果要删除 Cookie，可以设置 `maxAge: 0`：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.cookies.set("framework", "", {
    path: "/",
    maxAge: 0,
  });

  return response;
}
```

这通常用于退出登录时清除 token。

不过退出登录一般会写在 API Route 或 Server Action 中，而不是长期放在 proxy 中。

---

## 十三、一个完整示例：只在 /about 下执行 proxy

下面是一个完整示例：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  console.log("about proxy running");

  const response = NextResponse.next();

  response.cookies.set("framework", "nextjs", {
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/about/:path*"],
};
```

效果是：

```text
访问 /about：执行 proxy，并设置 cookie
访问 /about/team：执行 proxy，并设置 cookie
访问 /contact：不执行 proxy
访问 /：不执行 proxy
```

这说明 matcher 已经成功限制了 `proxy.ts` 的作用范围。

---

## 十四、一个完整示例：访问 /about 自动跳转首页

如果要访问 `/about` 时自动跳转到首页，可以写：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url));
}

export const config = {
  matcher: ["/about/:path*"],
};
```

效果：

```text
访问 /about
自动跳转 /
```

但访问 `/contact` 不受影响。

---

## 十五、一个完整示例：保护后台页面

下面是一个更接近真实业务的例子：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/user/:path*", "/orders/:path*"],
};
```

这个例子做了几件事：

```text
1. 只拦截 /dashboard、/user、/orders 相关页面
2. 从 Cookie 中读取 auth-token
3. 没有 token 时跳转 /login
4. 把原本想访问的路径放进 redirect 参数
5. 登录后可以根据 redirect 参数跳回原页面
```

访问：

```text
/dashboard/settings
```

未登录时会跳转到：

```text
/login?redirect=/dashboard/settings
```

这就是很多后台系统常见的登录拦截方式。

---

## 十六、proxy.ts 常见使用场景

`proxy.ts` 适合做这些事情：

```text
页面访问前的轻量判断
根据登录态做提前跳转
根据地区或语言做路由重写
A/B 测试分流
多租户路由处理
设置或读取 Cookie
给请求或响应加 header
阻止某些路径访问
```

不太适合做这些事情：

```text
复杂数据库查询
耗时网络请求
大规模计算
完整业务逻辑处理
复杂权限系统
高频写数据库
```

简单来说：

```text
proxy.ts 适合做快而轻的事情
复杂业务应该放到 API Route、Server Action 或数据访问层
```

---

## 十七、proxy.ts 和页面组件的关系

需要记住一个请求流程：

```text
用户请求页面
proxy.ts 先执行
如果返回 redirect，则页面不会加载
如果返回 json，则页面不会加载
如果返回 NextResponse.next()，页面继续加载
```

所以：

```ts
return NextResponse.next();
```

很重要。

如果你忘记返回它，而是直接返回了其他响应，页面可能就不会正常显示。

---

## 十八、proxy.ts 的基本模板

以后你可以用下面这个模板快速开始：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("current pathname:", pathname);

  return NextResponse.next();
}

export const config = {
  matcher: ["/about/:path*"],
};
```

如果要保护登录页：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

如果要设置 Cookie：

```ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  response.cookies.set("framework", "nextjs", {
    path: "/",
  });

  return response;
}
```

---

## 十九、总结

Next.js 新版本中，`middleware.ts` 已经逐渐被 `proxy.ts` 替代。

它的核心作用是：

```text
在请求进入页面之前，先执行一段轻量逻辑
```

你可以在里面：

```text
放行请求：NextResponse.next()
直接返回 JSON：NextResponse.json()
重定向页面：NextResponse.redirect()
设置 Cookie：response.cookies.set()
读取 Cookie：request.cookies.get()
限制生效范围：config.matcher
```

最重要的几个点：

```text
1. 文件名使用 proxy.ts
2. 导出函数名使用 proxy
3. 页面要继续加载时，必须 return NextResponse.next()
4. matcher 可以限制 proxy 只在指定路径生效
5. redirect 可以在页面加载前把用户送到其他页面
6. cookies 可以在 request 中读取，也可以在 response 中设置
```

一句话总结：

**proxy.ts 是 Next.js 中页面加载前的轻量请求处理入口，它适合做重定向、路径匹配、Cookie 处理和简单访问控制；复杂业务逻辑不要堆在这里。**
