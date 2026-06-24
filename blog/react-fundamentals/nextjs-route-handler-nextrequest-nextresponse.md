# Next.js Route Handler 入门：理解 NextRequest 与 NextResponse

在 Next.js App Router 中，我们经常会在 `app/api` 目录下编写接口。

例如：

```text
app/api/users/route.ts
```

或者：

```text
app/api/users/[id]/route.ts
```

在这些接口文件中，我们可以定义 `GET`、`POST`、`PUT`、`DELETE` 等方法，用来处理不同类型的请求。

但在实际开发中，仅仅知道如何写一个接口还不够。我们还需要知道：

```text
如何读取请求体？
如何获取请求头？
如何读取 cookie？
如何获取 query 参数？
如何返回 JSON？
如何设置响应状态码？
如何重定向？
如何设置响应 cookie？
```

这些能力主要依赖两个对象：

```text
NextRequest
NextResponse
```

本文将围绕这两个对象，系统讲解它们在 Next.js API 开发中的作用和常见用法。

---

## 一、什么是 NextRequest？

`NextRequest` 是 Next.js 对原生 Web Request API 的扩展。

在 Route Handler 中，请求函数可以接收一个 `request` 参数：

```ts
export async function POST(request: Request) {
  // 处理请求
}
```

如果使用 Next.js 提供的类型，可以写成：

```ts
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  // 处理请求
}
```

`NextRequest` 可以帮助我们获取请求中的各种信息，例如：

```text
请求体 body
请求头 headers
cookie
请求方法 method
请求 URL
query 参数
formData
text 数据
json 数据
```

简单理解：

> `NextRequest` 代表客户端发来的请求，里面包含了这次请求携带的所有信息。

---

## 二、什么是 NextResponse？

`NextResponse` 是 Next.js 对原生 Web Response API 的扩展。

它主要用于生成响应。

例如返回 JSON：

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Hello Next.js",
  });
}
```

也可以返回重定向：

```ts
return NextResponse.redirect(new URL("/login", request.url));
```

还可以设置 cookie：

```ts
const response = NextResponse.json({
  message: "登录成功",
});

response.cookies.set("token", "abc123");

return response;
```

简单理解：

> `NextResponse` 负责把服务端处理后的结果返回给客户端。

---

## 三、Route Handler 的基本写法

在 App Router 中，一个接口通常写在 `route.ts` 文件中。

例如：

```text
app/api/users/route.ts
```

写一个 GET 接口：

```ts
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "获取用户列表成功",
  });
}
```

写一个 POST 接口：

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  return NextResponse.json({
    message: "创建用户成功",
    data: body,
  });
}
```

这里的核心就是：

```text
request 用来读取客户端传过来的数据
NextResponse 用来返回服务端处理后的结果
```

---

## 四、读取 JSON 请求体

最常见的场景是客户端向接口提交 JSON 数据。

例如前端请求：

```ts
await fetch("/api/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Sachin",
    age: 18,
  }),
});
```

在 Route Handler 中可以这样读取：

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  console.log(body);

  return NextResponse.json({
    message: "数据接收成功",
    data: body,
  });
}
```

`request.json()` 会返回一个 Promise，所以需要使用 `await`。

读取到的结果是一个普通对象：

```ts
{
  name: "Sachin",
  age: 18
}
```

所以你可以直接使用：

```ts
const { name, age } = body;
```

完整示例：

```ts
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, age } = body;

  return NextResponse.json({
    message: "创建用户成功",
    user: {
      name,
      age,
    },
  });
}
```

---

## 五、读取文本请求体

如果客户端发送的不是 JSON，而是普通文本，可以使用：

```ts
await request.text();
```

例如客户端请求：

```ts
await fetch("/api/message", {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
  },
  body: "Hello Next.js",
});
```

服务端读取：

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const text = await request.text();

  return NextResponse.json({
    message: "文本接收成功",
    data: text,
  });
}
```

注意：`request.json()` 和 `request.text()` 都是读取请求体的方法。

请求体通常只能被读取一次。

也就是说，不建议这样写：

```ts
const json = await request.json();
const text = await request.text();
```

因为 body stream 被读取过一次后，再读取可能会出错。

应该根据客户端发送的数据类型选择合适的方法。

---

## 六、读取 FormData

如果客户端提交的是表单数据，可以使用：

```ts
await request.formData();
```

例如：

```ts
const formData = new FormData();

formData.append("username", "sachin");
formData.append("avatar", file);

await fetch("/api/profile", {
  method: "POST",
  body: formData,
});
```

服务端读取：

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const formData = await request.formData();

  const username = formData.get("username");
  const avatar = formData.get("avatar");

  return NextResponse.json({
    username,
    hasAvatar: !!avatar,
  });
}
```

这种方式常用于：

```text
文件上传
头像上传
普通表单提交
multipart/form-data 请求
```

---

## 七、读取请求头 headers

有时候我们需要从请求头中读取信息。

例如：

```text
Authorization
Content-Type
User-Agent
Accept-Language
```

可以这样写：

```ts
export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");

  return NextResponse.json({
    token,
    contentType,
  });
}
```

如果前端传了：

```ts
await fetch("/api/profile", {
  headers: {
    Authorization: "Bearer abc123",
  },
});
```

后端就可以通过：

```ts
request.headers.get("authorization");
```

读取到它。

注意，headers 的 key 不区分大小写，但通常建议统一写成小写或标准形式，方便团队维护。

---

## 八、读取 cookie

`NextRequest` 提供了更方便的 cookie 读取方式：

```ts
request.cookies.get("token");
```

示例：

```ts
export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  return NextResponse.json({
    token,
  });
}
```

如果 cookie 中有：

```text
token=abc123
```

那么 `token` 就会得到：

```text
abc123
```

这在登录鉴权中非常常见。

例如：

```ts
export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value;

  if (!token) {
    return NextResponse.json(
      {
        message: "未登录",
      },
      {
        status: 401,
      },
    );
  }

  return NextResponse.json({
    message: "已登录",
  });
}
```

---

## 九、读取请求方法 method

`request.method` 可以读取当前请求方法。

例如：

```ts
export async function POST(request: NextRequest) {
  console.log(request.method); // POST

  return NextResponse.json({
    method: request.method,
  });
}
```

不过在 Next.js Route Handler 中，通常会直接通过导出函数名区分方法：

```ts
export async function GET() {}

export async function POST() {}

export async function PUT() {}

export async function DELETE() {}
```

所以 `request.method` 更多用于日志、调试或通用处理函数中。

---

## 十、读取 URL 和 query 参数

`NextRequest` 提供了 `nextUrl`，它是 Next.js 扩展过的 URL 对象。

例如请求地址：

```text
/api/users?name=sachin&page=1
```

可以这样读取 query 参数：

```ts
export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name");
  const page = request.nextUrl.searchParams.get("page");

  return NextResponse.json({
    name,
    page,
  });
}
```

也可以读取 pathname：

```ts
const pathname = request.nextUrl.pathname;
```

示例：

```ts
export async function GET(request: NextRequest) {
  return NextResponse.json({
    pathname: request.nextUrl.pathname,
    url: request.nextUrl.toString(),
  });
}
```

`nextUrl` 很适合处理：

```text
搜索参数
分页参数
筛选条件
当前路径判断
重定向目标拼接
```

---

## 十一、动态路由参数怎么获取？

假设你的接口路径是：

```text
app/api/users/[id]/route.ts
```

在 Route Handler 中，可以通过第二个参数获取动态路由参数。

示例：

```ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const { id } = context.params;

  return NextResponse.json({
    message: "获取用户详情成功",
    id,
  });
}
```

如果请求：

```text
/api/users/100
```

那么返回：

```json
{
  "message": "获取用户详情成功",
  "id": "100"
}
```

在较新版本的 Next.js 中，`params` 的类型写法可能会随着版本略有差异，实际项目中以当前项目的 Next.js 类型提示为准。

---

## 十二、使用 NextResponse 返回 JSON

最常见的响应方式是返回 JSON：

```ts
return NextResponse.json({
  message: "success",
});
```

也可以设置状态码：

```ts
return NextResponse.json(
  {
    message: "用户不存在",
  },
  {
    status: 404,
  },
);
```

例如：

```ts
export async function GET() {
  const user = null;

  if (!user) {
    return NextResponse.json(
      {
        message: "用户不存在",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    data: user,
  });
}
```

常见状态码：

```text
200：成功
201：创建成功
400：参数错误
401：未登录
403：无权限
404：资源不存在
500：服务器内部错误
```

---

## 十三、使用 NextResponse 返回文本

虽然 `NextResponse.json()` 最常见，但也可以返回普通文本：

```ts
return new NextResponse("Hello Next.js");
```

或者设置状态码和 header：

```ts
return new NextResponse("Not Found", {
  status: 404,
  headers: {
    "Content-Type": "text/plain",
  },
});
```

如果是普通接口开发，推荐优先返回 JSON，这样前端更容易统一处理。

---

## 十四、使用 NextResponse 设置 cookie

`NextResponse` 可以设置 cookie。

例如登录成功后设置 token：

```ts
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    message: "登录成功",
  });

  response.cookies.set("token", "abc123", {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
```

清除 cookie：

```ts
const response = NextResponse.json({
  message: "退出成功",
});

response.cookies.set("token", "", {
  path: "/",
  maxAge: 0,
});

return response;
```

在登录鉴权中，cookie 很常用。

如果 token 比较敏感，建议设置：

```ts
httpOnly: true;
```

这样前端 JavaScript 无法直接读取该 cookie，可以降低 XSS 窃取 token 的风险。

---

## 十五、使用 NextResponse 重定向

`NextResponse.redirect()` 可以让请求跳转到其他地址。

例如未登录时跳转登录页：

```ts
export async function GET(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.json({
    message: "已登录",
  });
}
```

也可以跳转到外部地址：

```ts
return NextResponse.redirect("https://example.com");
```

不过在实际项目中，如果是 API 接口，通常更推荐返回 `401`，由前端统一处理跳转。

如果是在 middleware 或页面请求阶段，使用 redirect 会更自然。

---

## 十六、NextResponse.next() 是什么？

`NextResponse.next()` 常用于 middleware 或 proxy 中，表示：

```text
当前中间层处理结束，请继续执行后续流程
```

例如：

```ts
import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}
```

它类似于 Express 中的 `next()` 概念：当前中间件不终止请求，而是把请求交给后面的逻辑继续处理。

常见场景：

```text
权限检查通过，继续访问页面
多语言处理完成，继续进入路由
添加 header 后继续请求
API 代理预处理后继续转发
```

示例：

```ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("x-custom-header", "hello");

  return response;
}
```

---

## 十七、一个完整的 POST 示例

下面是一个完整例子：接收 JSON，请求头中读取 token，然后返回处理结果。

```ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization");

  if (!token) {
    return NextResponse.json(
      {
        message: "缺少 Authorization",
      },
      {
        status: 401,
      },
    );
  }

  const body = await request.json();

  return NextResponse.json({
    message: "请求成功",
    token,
    data: body,
  });
}
```

前端请求：

```ts
await fetch("/api/users", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer abc123",
  },
  body: JSON.stringify({
    name: "Sachin",
  }),
});
```

服务端可以同时拿到：

```text
请求头 authorization
请求体 body
请求方法 method
请求 URL 信息
```

---

## 十八、一个完整的 GET 示例

下面是一个读取 query 参数和 cookie 的 GET 示例：

```ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("keyword");
  const page = request.nextUrl.searchParams.get("page");
  const token = request.cookies.get("token")?.value;

  return NextResponse.json({
    keyword,
    page,
    isLogin: !!token,
  });
}
```

请求：

```text
/api/search?keyword=next&page=1
```

返回：

```json
{
  "keyword": "next",
  "page": "1",
  "isLogin": true
}
```

---

## 十九、常见踩坑点

### 1. 忘记给函数加 async

因为 `request.json()`、`request.text()`、`request.formData()` 都返回 Promise，所以需要 `await`。

错误写法：

```ts
export function POST(request: NextRequest) {
  const body = await request.json();
}
```

正确写法：

```ts
export async function POST(request: NextRequest) {
  const body = await request.json();
}
```

---

### 2. 重复读取 body

请求体通常只能读取一次。

不推荐：

```ts
const body1 = await request.json();
const body2 = await request.text();
```

应该根据请求类型选择一种读取方式：

```ts
const body = await request.json();
```

或者：

```ts
const text = await request.text();
```

---

### 3. 请求类型和读取方法不匹配

如果客户端发送的是 JSON：

```ts
headers: {
  "Content-Type": "application/json"
}
```

服务端应该使用：

```ts
await request.json();
```

如果客户端发送的是纯文本：

```ts
headers: {
  "Content-Type": "text/plain"
}
```

服务端应该使用：

```ts
await request.text();
```

如果发送的是表单：

```ts
body: formData;
```

服务端应该使用：

```ts
await request.formData();
```

---

### 4. 在服务端不能使用浏览器对象

Route Handler 运行在服务端环境，不能直接使用：

```text
window
document
localStorage
```

这些是浏览器环境对象。

如果要读取登录态，服务端应该读：

```ts
request.cookies;
```

或者：

```ts
request.headers;
```

---

### 5. redirect 和 JSON 错误响应要区分场景

API 接口中，通常返回：

```ts
return NextResponse.json({ message: "未登录" }, { status: 401 });
```

页面访问或 middleware 中，通常使用：

```ts
return NextResponse.redirect(new URL("/login", request.url));
```

这两种方式不要混用得太随意，否则前端可能不好统一处理错误。

---

## 二十、总结

在 Next.js App Router 的接口开发中，`NextRequest` 和 `NextResponse` 是两个非常重要的对象。

`NextRequest` 负责读取请求信息：

```text
request.json()
request.text()
request.formData()
request.headers
request.cookies
request.method
request.nextUrl
```

`NextResponse` 负责生成响应：

```text
NextResponse.json()
NextResponse.redirect()
NextResponse.next()
response.cookies.set()
new NextResponse()
```

可以简单记忆：

```text
NextRequest：客户端发来了什么
NextResponse：服务端要返回什么
```

在实际项目中，你会经常用它们完成：

```text
接口参数读取
登录鉴权
cookie 管理
表单处理
JSON 响应
错误状态码返回
中间件放行或重定向
```

掌握这两个对象之后，Next.js API 路由开发会清晰很多。

一句话总结：

**NextRequest 用来解析请求，NextResponse 用来构造响应。一个负责“拿数据”，一个负责“回数据”。**
