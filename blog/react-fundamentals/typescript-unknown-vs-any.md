# TypeScript 中的 unknown：为什么它比 any 更安全？

在 TypeScript 项目中，你会越来越频繁地遇到 `unknown` 类型。

它经常出现在两个地方：

```text
1. 从 API 获取数据时
2. try...catch 捕获错误时
```

很多初学者看到 `unknown` 会觉得麻烦，因为它不像 `any` 那样“想怎么用就怎么用”。

但这正是 `unknown` 的价值。

**unknown 代表：我现在还不知道这个值是什么类型，所以在使用之前必须先做类型检查。**

它比 `any` 更安全，也更符合真实项目中的不确定性。

---

## 一、为什么 fetch 得到的数据不应该直接相信？

假设我们从一个 API 获取数据：

```ts
const res = await fetch("https://example.com/api/user");

const data = await res.json();
```

默认情况下，TypeScript 通常会把 `data` 推导成 `any`。

也就是说，你可以随便访问：

```ts
data.name;
data.age;
data.profile.avatar;
```

TypeScript 不会拦你。

但问题是：你真的知道这个 API 一定返回这些字段吗？

不一定。

即使你看过接口文档，也可能出现这些情况：

```text
接口返回结构变了
后端临时返回错误数据
第三方 API 出现异常
网络代理返回了非预期内容
某个字段为空或缺失
```

所以从严格意义上讲，`res.json()` 得到的数据应该是未知的。

更安全的写法是：

```ts
const data: unknown = await res.json();
```

这样 TypeScript 会提醒你：

**在使用 data 之前，你必须先确认它到底是什么类型。**

---

## 二、any 的问题：它会绕过类型检查

`any` 最大的问题是：它会关闭 TypeScript 的保护。

例如：

```ts
const data: any = await res.json();

console.log(data.user.profile.avatar.url);
```

即使 `data.user` 根本不存在，TypeScript 也不会报错。

代码只有运行时才会炸。

这就等于你主动告诉 TypeScript：

```text
别管了，我自己知道。
```

但在真实项目中，很多 bug 就是这样来的。

相比之下，`unknown` 更谨慎：

```ts
const data: unknown = await res.json();

console.log(data.user);
```

这时 TypeScript 会报错。

因为它不知道 `data` 是不是对象，更不知道它有没有 `user` 属性。

这不是 TypeScript 在为难你，而是在保护你。

---

## 三、unknown 的核心规则

`unknown` 的核心规则很简单：

```text
unknown 类型的值，不能直接使用。
必须先缩小类型，才能访问属性或调用方法。
```

例如：

```ts
const value: unknown = "hello";
```

你不能直接写：

```ts
value.toUpperCase();
```

因为 TypeScript 不知道 `value` 是不是字符串。

正确写法是：

```ts
if (typeof value === "string") {
  console.log(value.toUpperCase());
}
```

当你写了：

```ts
typeof value === "string";
```

TypeScript 就知道在这个 if 代码块里，`value` 是字符串。

这叫做类型收窄，英文叫 type narrowing。

---

## 四、try...catch 中的 error 为什么是 unknown？

另一个非常常见的 `unknown` 来源是错误处理。

比如：

```ts
try {
  await sendEmail();
} catch (error) {
  console.log(error.message);
}
```

你可能会发现 TypeScript 报错：

```text
'error' is of type 'unknown'.
```

原因是：JavaScript 里可以 throw 任何东西。

不仅可以 throw 一个 Error 对象：

```ts
throw new Error("Something went wrong");
```

也可以 throw 字符串：

```ts
throw "Something went wrong";
```

也可以 throw 数字：

```ts
throw 500;
```

甚至可以 throw 一个普通对象：

```ts
throw {
  statusCode: 404,
  message: "Not found",
};
```

所以 TypeScript 不能默认认为 `error` 一定有 `message` 属性。

这就是为什么 catch 里的 `error` 是 `unknown`。

---

## 五、为什么不能直接 error.message？

假设你这样写：

```ts
try {
  await sendEmail();
} catch (error) {
  console.log(error.message);
}
```

问题在于，`error` 可能是数字：

```ts
throw 5;
```

那你访问的就是：

```ts
5.message;
```

这当然不合理。

它也可能是字符串：

```ts
throw "Some problem";
```

那你访问的就是：

```ts
"Some problem".message;
```

这也不是你真正想要的。

它也可能是普通对象：

```ts
throw {
  statusCode: 404,
};
```

这个对象没有 `message` 属性。

所以 TypeScript 阻止你直接访问 `error.message` 是合理的。

---

## 六、最常见情况：error 是 Error 实例

在大多数规范代码中，错误通常会这样抛出：

```ts
throw new Error("Something went wrong");
```

`new Error()` 会创建一个 Error 实例，它通常包含 `message` 属性。

所以我们可以先判断：

```ts
if (error instanceof Error) {
  console.log(error.message);
}
```

完整示例：

```ts
try {
  await sendEmail();
} catch (error) {
  if (error instanceof Error) {
    console.log(error.message);
  }
}
```

这里 TypeScript 能理解：

```text
如果 error 是 Error 的实例，那么它一定有 message 属性。
```

所以在这个 if 代码块里，访问 `error.message` 是安全的。

---

## 七、普通对象错误怎么处理？

有些库不一定会抛出 `new Error()`。

它可能会抛出普通对象：

```ts
throw {
  statusCode: 404,
  message: "Not found",
};
```

这个对象不是 `Error` 的实例，但它确实有 `message` 属性。

所以我们可以再加一层判断：

```ts
if (error && typeof error === "object" && "message" in error) {
  console.log(String(error.message));
}
```

这里有三个判断。

第一：

```ts
error;
```

用于排除 `null`。

因为在 JavaScript 中：

```ts
typeof null;
```

结果是：

```text
object
```

这是 JavaScript 的历史遗留问题。

所以如果你只判断：

```ts
typeof error === "object";
```

还不够，因为 `error` 可能是 `null`。

第二：

```ts
typeof error === "object";
```

确认它是对象。

第三：

```ts
"message" in error;
```

确认这个对象里有 `message` 属性。

最后用：

```ts
String(error.message);
```

是因为即使对象里有 `message`，它也不一定是字符串。

比如：

```ts
throw {
  message: 500,
};
```

所以用 `String()` 可以把它安全转成字符串。

---

## 八、字符串错误怎么处理？

有些代码可能直接抛出字符串：

```ts
throw "Some problem";
```

这种情况下，错误本身就是消息。

可以这样处理：

```ts
if (typeof error === "string") {
  console.log(error);
}
```

---

## 九、兜底错误信息

如果以上情况都不满足，最好返回一个默认错误信息。

比如：

```ts
const message = "Something went wrong. Please try again.";
```

因为你不能保证所有错误都能解析出有意义的信息。

兜底信息可以避免用户看到空白提示，也可以避免前端因为错误结构异常再次报错。

---

## 十、封装一个 getErrorMessage 工具函数

在真实项目中，我们不应该每次 catch 都重复写一堆判断。

可以封装一个通用函数：

```ts
export function getErrorMessage(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    message = String(error.message);
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "Something went wrong. Please try again.";
  }

  return message;
}
```

这个函数的参数是：

```ts
error: unknown;
```

这很重要。

因为它表示：
这个函数可以接收任何未知错误，但内部会负责把它转换成安全的字符串。

返回值写成：

```ts
: string
```

也很重要。

因为我们希望这个函数无论遇到什么错误，最终都一定返回一个字符串。

---

## 十一、为什么要写 String(error.message)？

这里有一个细节：

```ts
message = String(error.message);
```

为什么不是：

```ts
message = error.message;
```

因为即使我们确认了：

```ts
"message" in error;
```

也只能说明这个对象有 `message` 属性。

但不能说明 `message` 一定是字符串。

比如：

```ts
const error = {
  message: 404,
};
```

它满足：

```ts
"message" in error;
```

但 `error.message` 是数字。

如果我们的函数返回值要求是 `string`，就需要把它转成字符串。

所以：

```ts
String(error.message);
```

更稳妥。

---

## 十二、在 Server Action 中使用

这个工具函数在 Next.js Server Actions 里非常常见。

比如一个发送邮件的 Server Action：

```ts
"use server";

import { getErrorMessage } from "@/utils/get-error-message";

export async function sendContactEmail(formData: FormData) {
  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: "user@example.com",
      subject: "New contact message",
      text: String(formData.get("message")),
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      message: getErrorMessage(error),
    };
  }
}
```

这样做的好处是：

```text
服务端捕获错误
安全提取错误消息
把可展示的信息返回给客户端
客户端根据返回值显示 toast 或表单错误提示
```

客户端可以这样处理：

```ts
const result = await sendContactEmail(formData);

if (result?.message) {
  toast.error(result.message);
}
```

这样用户不会看到一堆技术细节，而是看到一个可理解的错误提示。

---

## 十三、为什么这个函数适合放到 utils 里？

因为错误处理不是某个页面独有的。

你可能在很多地方都需要：

```text
Server Action
Route Handler
API 请求
数据库操作
邮件发送
支付接口
第三方服务调用
```

每个地方都可能 catch 到 `unknown` 类型的错误。

所以可以把它放到：

```text
src/utils/get-error-message.ts
```

或者：

```text
src/lib/get-error-message.ts
```

然后复用：

```ts
import { getErrorMessage } from "@/utils/get-error-message";
```

这样项目里的错误处理逻辑会更统一。

---

## 十四、unknown 和 any 的区别总结

`any` 和 `unknown` 都可以表示“不确定的类型”。

但它们的态度完全不同。

### any

```ts
const value: any = getValue();

value.foo.bar.baz();
```

`any` 的意思是：

```text
随便用，TypeScript 不检查。
```

它会绕过类型系统。

### unknown

```ts
const value: unknown = getValue();

value.foo;
```

TypeScript 会报错。

`unknown` 的意思是：

```text
我不知道它是什么，所以你必须先检查。
```

也就是说：

```text
any 是放弃检查。
unknown 是要求检查。
```

所以在不确定数据类型时，优先使用 `unknown`。

---

## 十五、什么时候应该用 unknown？

推荐在这些场景使用 `unknown`：

```text
fetch().json() 返回的数据
第三方 API 返回的数据
用户上传或输入的复杂数据
JSON.parse() 的结果
catch(error) 中的 error
localStorage 里取出来再 parse 的数据
WebSocket 收到的数据
postMessage 收到的数据
```

这些数据都有一个共同点：

**它们来自类型系统之外。**

TypeScript 没办法保证它们一定符合你的预期。

所以你应该先把它们当成 `unknown`，然后再通过类型检查、schema 校验或类型守卫来收窄类型。

---

## 十六、如果是 API 数据，最好配合校验库

对于简单错误消息，我们可以手写类型判断。

但对于复杂 API 数据，更推荐配合 schema 校验库，比如 Zod。

例如：

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
});

const data: unknown = await res.json();

const user = UserSchema.parse(data);
```

这样 `data` 一开始是 `unknown`。

只有通过 Zod 校验后，才得到真正可信的 `user`。

这比直接写：

```ts
const user = (await res.json()) as User;
```

更安全。

因为 `as User` 只是类型断言，不会真的检查运行时数据。

---

## 十七、总结

`unknown` 是 TypeScript 中非常重要的安全类型。

它通常出现在：

```text
外部 API 数据
JSON 解析结果
try...catch 的错误对象
第三方库返回值
```

和 `any` 相比，`unknown` 不允许你直接使用它。

你必须先通过：

```text
typeof
instanceof
in
自定义类型守卫
schema 校验库
```

把它收窄成明确类型，才能访问属性或调用方法。

在错误处理中，我们可以封装一个通用函数：

```ts
export function getErrorMessage(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    message = String(error.message);
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "Something went wrong. Please try again.";
  }

  return message;
}
```

一句话总结：

**any 是“别检查了，我随便用”；unknown 是“我还不知道是什么，先检查再用”。**

在专业 TypeScript 项目中，面对不确定的数据，优先使用 `unknown`，再通过类型收窄把它变成安全、可靠的类型。
