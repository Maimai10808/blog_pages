# Next.js Server Component 模式：如何隔离 Server-only Code？

在 Next.js App Router 中，我们经常会同时使用 Server Component 和 Client Component。

Server Component 适合处理服务端逻辑，比如读取数据库、访问环境变量、调用内部服务、处理敏感业务逻辑等。Client Component 则适合处理浏览器交互，比如点击事件、状态管理、表单输入、动画等。

但这里有一个很容易被忽略的问题：

**JavaScript 模块可以被 Server Component 和 Client Component 共同 import。**

也就是说，一个原本只应该在服务端运行的函数，如果不小心被 Client Component 引入，就可能被打包进客户端代码里。

这会带来几个严重问题：

```text
1. 客户端 bundle 变大，影响页面加载性能
2. 敏感逻辑可能暴露到浏览器
3. 数据库查询、密钥读取等服务端代码可能在浏览器中报错
4. 业务规则可能被用户直接看到或分析
```text

所以，在 Next.js 项目中，我们需要明确区分：

```text
哪些代码只能在服务端运行
哪些代码可以在客户端运行
```

这就是 Server-only Code 隔离要解决的问题。

---

## 一、什么是 Server-only Code？

Server-only Code 指的是只能在服务端执行的代码。

比如：

```ts
读取环境变量
访问数据库
调用后端内部 API
处理密钥、Token、权限
执行敏感业务计算
使用只支持 Node.js 环境的 npm 包
```text

例如下面这个函数：

```ts
export const serverSideFunction = () => {
  console.log("use server side function");

  return "server result";
};
```

这只是一个简单示例。真实项目中，它可能是：

```ts
export async function getUserFromDatabase(userId: string) {
  return await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
}
```text

或者：

```ts
export async function getSecretData() {
  const apiKey = process.env.SECRET_API_KEY;

  return await fetch("https://internal-api.example.com", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}
```

这些代码都不应该进入客户端 bundle。

---

## 二、Server Component 中使用 Server-only Code

假设我们有一个服务端工具函数文件：

```ts
// src/utils/server-utils.ts

export const serverSideFunction = () => {
  console.log("use server side function");

  return "server result";
};
```tsx

然后在 Server Component 中使用：

```tsx
// app/server-route/page.tsx

import { serverSideFunction } from "@/utils/server-utils";

export default function ServerRoutePage() {
  const result = serverSideFunction();

  return <h1>Server Route: {result}</h1>;
}
```

这个写法是合理的。

因为 `app/server-route/page.tsx` 默认是 Server Component。
它会在服务端执行，所以调用 `serverSideFunction()` 没有问题。

访问页面时，你会看到：

```text
Server Route: server result
```tsx

并且 `console.log` 会出现在终端里，因为这段代码是在服务端执行的。

---

## 三、问题：Client Component 也可能误用这个函数

现在假设我们有一个 Client Component 页面：

```tsx
// app/client-route/page.tsx

"use client";

import { serverSideFunction } from "@/utils/server-utils";

export default function ClientRoutePage() {
  const result = serverSideFunction();

  return <h1>Client Route: {result}</h1>;
}
```

这个页面顶部写了：

```tsx
"use client";
```text

所以它是 Client Component。

问题来了：它也 import 了 `serverSideFunction`。

如果这个函数只是 `console.log`，可能看起来没什么问题。
但如果它内部访问数据库、读取密钥、调用 Node.js API，就会出大问题。

因为 Client Component 会被打包到浏览器端运行。

也就是说，你原本以为只会在服务端执行的代码，可能被带到了客户端。

这就是 Server-only Code 泄露的问题。

---

## 四、为什么这很危险？

假设你的 server function 里有这样的逻辑：

```ts
export async function getAdminData() {
  const secret = process.env.ADMIN_SECRET_KEY;

  const data = await fetch("https://internal.example.com/admin", {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  return data.json();
}
```

如果这个函数被 Client Component 误 import，可能导致几个问题。

第一，代码可能进入客户端 bundle，造成体积变大。

第二，服务端业务逻辑可能暴露给用户。

第三，浏览器环境里没有完整的 Node.js 能力，代码可能直接报错。

第四，虽然 Next.js 通常不会直接暴露非 `NEXT_PUBLIC_` 环境变量的值，但你的业务逻辑、接口路径、权限判断方式仍然可能被打包分析。

所以我们不能只靠“开发者小心一点”。

更好的方式是让工具帮我们自动拦截错误用法。

---

## 五、解决方案：使用 server-only

Next.js 推荐使用一个包：

```bash
npm install server-only
```text

安装后，在只允许服务端使用的模块顶部加上：

```ts
import "server-only";
```

完整示例：

```ts
// src/utils/server-utils.ts

import "server-only";

export const serverSideFunction = () => {
  console.log("use server side function");

  return "server result";
};
```tsx

这行代码的作用是：

**声明当前模块只能被服务端代码 import。**

如果有人在 Client Component 中引入这个模块，构建时就会直接报错。

例如：

```tsx
"use client";

import { serverSideFunction } from "@/utils/server-utils";

export default function ClientRoutePage() {
  const result = serverSideFunction();

  return <h1>{result}</h1>;
}
```

这时 Next.js 会阻止你这样做。

它会告诉你：
这个模块是 server-only，不能被 Client Component 使用。

这样就可以在开发阶段提前发现问题，而不是等到上线后才发现服务端代码被错误打包进客户端。

---

## 六、它的核心价值是什么？

`server-only` 的价值不是让代码“变成服务端代码”。

真正让代码运行在服务端的，是 Next.js 的 Server Component、Route Handler、Server Action 等机制。

`server-only` 的作用更像是一个保护标记：

```text
这个文件只能在服务端用。
如果客户端组件 import 它，就立刻报错。
```text

它相当于给服务端模块加了一个“禁止客户端引入”的安全门。

这样可以防止：

```text
数据库查询函数被客户端组件误引入
读取环境变量的函数被客户端组件误引入
敏感业务逻辑被打包到浏览器
Node.js 专属代码在浏览器中运行时报错
```

---

## 七、什么时候应该用 server-only？

一般来说，只要一个文件中包含下面这些逻辑，就建议加上：

```ts
import "server-only";
```text

适合使用的场景包括：

```text
数据库操作文件
权限校验文件
读取私密环境变量的文件
调用内部服务的文件
服务端数据聚合函数
涉及密钥、Token、Cookie、Session 的工具函数
包含敏感业务规则的模块
```

比如：

```ts
// src/lib/db.ts
import "server-only";

import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
```text

或者：

```ts
// src/services/user-service.ts
import "server-only";

import { prisma } from "@/lib/db";

export async function getUserProfile(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
  });
}
```

再比如：

```ts
// src/lib/auth.ts
import "server-only";

export function getJwtSecret() {
  return process.env.JWT_SECRET;
}
```text

这些文件都不应该被 Client Component 直接 import。

---

## 八、Server Component 和 Server-only Code 的区别

这里有一个容易混淆的点：

**Server Component 不等于所有 import 的代码都天然安全。**

Server Component 本身运行在服务端。
但是你的工具函数文件可能被其他地方复用。

比如：

```text
src/utils/server-utils.ts
```

这个文件没有天然属于服务端。
它只是一个普通 TypeScript 模块。

它可以被 Server Component import，也可以被 Client Component import。

所以我们才需要：

```ts
import "server-only";
```text

明确告诉 Next.js：
这个模块只能服务端使用。

可以这样理解：

```text
Server Component：组件运行位置
server-only：模块使用边界
```

一个是组件层面的概念。
一个是模块层面的保护。

---

## 九、推荐的项目组织方式

在真实项目中，可以把服务端代码集中放在比较明确的位置。

比如：

```text
src/
  lib/
    db.ts
    auth.ts
  services/
    user-service.ts
    order-service.ts
  utils/
    server-utils.ts
```text

这些文件如果只给服务端用，就在顶部写：

```ts
import "server-only";
```

而客户端工具函数可以单独放：

```text
src/
  utils/
    client-utils.ts
```text

如果某个工具函数是纯函数，不依赖服务端，也不依赖浏览器，那么可以放在 shared 类型的文件里。

比如：

```text
src/
  utils/
    format-date.ts
    format-price.ts
```

这种格式化函数既可以服务端用，也可以客户端用。

项目中最好形成这三类代码边界：

```text
server-only：只能服务端用
client-only：只能客户端用
shared：服务端和客户端都能用
```text

这样项目越大，越不容易混乱。

---

## 十、简单总结

在 Next.js App Router 中，Server Component 让我们可以直接在服务端获取数据，但也带来了一个需要注意的问题：

**普通 JavaScript 模块可能被服务端和客户端同时 import。**

如果一个文件里包含数据库访问、环境变量、敏感逻辑、Node.js 专属能力，就应该避免它被 Client Component 引入。

最简单的做法就是安装并使用：

```bash
npm install server-only
```

然后在服务端专用文件顶部写：

```ts
import "server-only";
```

这样一旦有人在 Client Component 中误引入这个文件，构建阶段就会报错。

一句话总结：

**server-only 不是用来运行服务端代码的，而是用来防止服务端代码被客户端错误 import 的。**

它可以帮助我们在 Next.js 项目中更清晰地划分服务端和客户端边界，提升安全性、性能和代码可靠性。
