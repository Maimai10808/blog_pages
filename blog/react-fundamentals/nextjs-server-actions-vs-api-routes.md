# Next.js Server Actions：它真的会替代 API Routes 吗？

在过去的 React 或 Next.js 项目中，如果我们想要提交一个表单，比如新增一条 Todo，通常需要经历一整套前后端交互流程：

前端监听表单提交事件，阻止默认行为，获取输入框内容，然后通过 `fetch` 或 `axios` 请求 `/api/todos`。后端再创建一个 API Route 或 Route Handler，接收请求参数，调用数据库方法，最后返回结果。前端拿到结果后，还要重新请求数据，或者手动更新本地状态。

这套流程并不复杂，但确实比较繁琐。尤其是在 Next.js App Router 出现之后，Server Components 已经允许我们直接在组件里异步获取数据，而 Server Actions 又进一步把“数据修改”这件事也放到了服务端组件体系中。

简单来说，Server Actions 让我们可以直接在服务端定义一个函数，并把它绑定到表单的 `action` 属性上。用户提交表单时，这个函数会在服务端执行，不需要我们手动创建 API Route。

---

## 一、Server Components 已经可以直接获取数据

在 Next.js App Router 中，页面组件默认可以是 Server Component。Server Component 可以写成 `async` 函数，并且可以直接在组件内部等待数据库查询结果。

例如一个 Todo 页面：

```tsx
const todos = await prisma.todo.findMany();
```tsx

拿到数据之后，可以直接在 JSX 中渲染：

```tsx
<ul>
  {todos.map((todo) => (
    <li key={todo.id}>{todo.content}</li>
  ))}
</ul>
```

这意味着，我们不再需要在客户端通过 `useEffect` 请求数据，也不需要先渲染空状态，再等待接口返回。页面在服务端就可以完成数据获取，然后把结果渲染出来。

这已经是 App Router 相比传统 React 写法的一个重要变化。

---

## 二、传统表单提交方式的问题

如果没有 Server Actions，新增 Todo 通常要这样写：

```tsx
function handleSubmit(event) {
  event.preventDefault();

  fetch("/api/todos", {
    method: "POST",
    body: JSON.stringify({
      content: inputValue,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
```text

然后后端还要创建对应的 API Route：

```tsx
export async function POST(request: Request) {
  const body = await request.json();

  await prisma.todo.create({
    data: {
      content: body.content,
    },
  });

  return Response.json({ success: true });
}
```

这套写法有几个问题：

第一，前端要写提交逻辑。

第二，后端要单独创建 API Route。

第三，数据修改完成后，前端通常还要再次请求最新数据，或者手动维护本地状态。

第四，如果这个页面本身是 Server Component，就不能直接绑定 `onSubmit` 这类事件处理函数，因为 Server Component 默认不能处理浏览器交互事件。

所以，如果只是一个简单的表单提交，传统写法显得有些“绕”。

---

## 三、Server Actions 的基本写法

Server Actions 的核心思想是：把服务端要执行的逻辑写成一个函数，然后直接绑定到表单上。

例如：

```tsx
async function addTodo(formData: FormData) {
  "use server";

  const content = formData.get("content") as string;

  await prisma.todo.create({
    data: {
      content,
    },
  });
}
```tsx

然后在表单中使用：

```tsx
<form action={addTodo}>
  <input name="content" required />
  <button type="submit">Add</button>
</form>
```

这里最关键的是两个点：

第一，`addTodo` 函数中写了 `"use server"`，说明这个函数只会在服务端执行。

第二，表单的 `action` 属性直接接收这个函数，而不是传统 HTML 里的 URL。

当用户提交表单时，Next.js 会自动把表单数据发送到服务端，并执行对应的 Server Action。我们不需要手动写 `/api/todos`，也不需要自己组织 `fetch` 请求。

---

## 四、如何获取表单数据？

Server Action 接收到的是一个 `FormData` 对象。

如果输入框是这样写的：

```tsx
<input name="content" required />
```text

那么在 Server Action 中就可以这样取值：

```tsx
const content = formData.get("content") as string;
```

这里的 `name="content"` 非常重要。表单提交时，浏览器会根据每个表单控件的 `name` 属性收集数据。

由于 `formData.get()` 的返回值可能是 `string | File | null`，所以在 TypeScript 中通常需要做类型断言：

```tsx
const content = formData.get("content") as string;
```text

即使前端写了 `required`，TypeScript 也不会自动知道这个值一定存在，所以这里需要我们自己处理类型。

---

## 五、为什么提交后页面没有立即更新？

Server Action 执行成功后，数据库确实已经更新了。但是页面上原来渲染出来的数据，还是之前查询出来的旧数据。

也就是说，数据库更新了，但 UI 没有自动刷新。

这时候需要使用 Next.js 提供的缓存刷新能力：

```tsx
import { revalidatePath } from "next/cache";

async function addTodo(formData: FormData) {
  "use server";

  const content = formData.get("content") as string;

  await prisma.todo.create({
    data: {
      content,
    },
  });

  revalidatePath("/todos");
}
```

`revalidatePath("/todos")` 的意思是告诉 Next.js：`/todos` 这个路径的数据已经失效了，需要重新获取。

这样用户提交 Todo 后，数据库先更新，然后页面数据重新验证，最终 UI 也会显示最新的 Todo 列表。

---

## 六、Server Actions 背后其实仍然有网络请求

Server Actions 看起来像是“前端直接调用服务端函数”，但它并不是魔法。

当用户提交表单时，浏览器和服务器之间仍然会发生网络请求。只不过这个请求不再由我们手动写 `fetch("/api/todos")`，而是由 Next.js 自动处理。

在浏览器 DevTools 的 Network 面板中，可以看到提交表单时确实产生了请求。请求 payload 中会包含表单字段，比如：

```text
content: test
```text

同时还会包含 Next.js 内部生成的一些 action 标识，用来匹配当前表单对应的 Server Action。

所以 Server Actions 并不是取消了客户端和服务端通信，而是把这层通信封装到了框架内部。

---

## 七、Server Actions 的优点

Server Actions 最大的好处是减少样板代码。

以前你需要：

```text
表单提交事件
→ 获取输入值
→ fetch 请求 API
→ API Route 接收请求
→ 调用数据库
→ 返回响应
→ 前端重新请求数据
```

现在可以变成：

```text
表单 action
→ Server Action
→ 调用数据库
→ revalidatePath 刷新页面数据
```text

代码明显更集中，数据获取和数据修改都可以围绕服务端逻辑展开。

另外，如果 Server Action 直接绑定在表单的 `action` 属性上，它还具备渐进增强能力。也就是说，即使客户端 JavaScript 没有加载完成，或者用户禁用了 JavaScript，表单依然可以提交。

这也是 Server Actions 很重要的一个优势。

---

## 八、在 Client Component 中使用 Server Actions

现实项目中，表单通常不只是提交数据这么简单。

我们可能还需要：

```text
提交前校验
提交时显示 loading 状态
提交后清空输入框
出错时提示用户
乐观更新 UI
```

这些都属于客户端交互逻辑，所以表单经常会被拆成 Client Component。

但是要注意，在 Client Component 里不能直接定义带有 `"use server"` 的函数。正确做法是把 Server Action 单独放到一个文件里。

例如创建 `actions.ts`：

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addTodo(formData: FormData) {
  const content = formData.get("content") as string;

  await prisma.todo.create({
    data: {
      content,
    },
  });

  revalidatePath("/todos");
}
```tsx

然后在 Client Component 中导入：

```tsx
"use client";

import { addTodo } from "@/actions";

export function TodoForm() {
  return (
    <form action={addTodo}>
      <input name="content" required />
      <button type="submit">Add</button>
    </form>
  );
}
```

这里的规则是：

如果 Server Action 写在 Server Component 内部，可以在函数里单独写 `"use server"`。

如果 Server Action 要被 Client Component 调用，通常应该放到单独文件中，并在文件顶部写 `"use server"`。

这样这个文件导出的函数都会被视为 Server Actions。

---

## 九、清空表单：使用 useRef

如果想在提交后清空表单，可以在 Client Component 中使用 `useRef`。

```tsx
"use client";

import { useRef } from "react";
import { addTodo } from "@/actions";

export function TodoForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    formRef.current?.reset();
    await addTodo(formData);
  }

  return (
    <form ref={formRef} action={action}>
      <input name="content" required />
      <button type="submit">Add</button>
    </form>
  );
}
```text

这里表单的 `action` 不再直接绑定 `addTodo`，而是先执行客户端函数：

```tsx
async function action(formData: FormData) {
  formRef.current?.reset();
  await addTodo(formData);
}
```

这样可以先清空表单，再调用真正的 Server Action。

不过这种写法会损失一部分渐进增强能力，因为它依赖客户端 JavaScript。

---

## 十、提交状态：useFormStatus

提交表单时，我们通常希望按钮显示“正在提交”，或者禁用按钮，避免重复提交。

React 提供了 `useFormStatus`，可以获取当前表单的提交状态。

一般会把按钮拆成一个单独组件：

```tsx
"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Adding todo..." : "Add"}
    </button>
  );
}
```tsx

然后在表单里使用：

```tsx
<form action={action}>
  <input name="content" required />
  <SubmitButton />
</form>
```

需要注意的是，`useFormStatus` 必须用在表单的子组件中。它依赖最近的父级 `<form>` 来获取提交状态。

如果按钮组件不在表单内部，或者表单不是它的祖先组件，就拿不到正确的状态。

---

## 十一、错误处理

Server Action 本质上还是一个函数，所以也可以使用 `try...catch` 处理错误。

例如：

```tsx
export async function addTodo(formData: FormData) {
  try {
    const content = formData.get("content") as string;

    await prisma.todo.create({
      data: {
        content,
      },
    });

    revalidatePath("/todos");

    return { success: true };
  } catch (error) {
    return {
      error: "Failed to add todo",
    };
  }
}
```text

在客户端调用时，可以接收返回值：

```tsx
async function action(formData: FormData) {
  const result = await addTodo(formData);

  if (result?.error) {
    alert(result.error);
  }
}
```

这样 Server Action 中发生的错误，就可以反馈给客户端，最终展示给用户。

在真实项目中，错误提示一般不会用 `alert`，而是使用 toast 组件或者表单错误提示。

---

## 十二、乐观更新：useOptimistic

Server Action 虽然可以自动刷新数据，但数据库写入和页面重新验证通常需要一点时间。

比如用户点击 Add 后，可能要等一两秒，新的 Todo 才会出现在列表中。

为了让交互更顺滑，可以使用乐观更新，也就是先假设提交会成功，立即把新 Todo 显示在页面上。如果服务端失败，再回滚。

React 提供了 `useOptimistic` 来处理这种场景。

基本思路是：

```tsx
const [optimisticTodos, addOptimisticTodo] = useOptimistic(
  todos,
  (state, newTodo) => [...state, newTodo],
);
```tsx

渲染列表时，不再使用原始的 `todos`，而是使用 `optimisticTodos`：

```tsx
<ul>
  {optimisticTodos.map((todo) => (
    <li key={todo.id}>{todo.content}</li>
  ))}
</ul>
```

提交时，先添加一个临时 Todo：

```tsx
async function action(formData: FormData) {
  const content = formData.get("content") as string;

  addOptimisticTodo({
    id: Math.random(),
    content,
  });

  formRef.current?.reset();

  await addTodo(formData);
}
```tsx

这样用户一点击提交，新的 Todo 会立刻显示出来。服务端完成数据库写入后，再通过 `revalidatePath` 同步真实数据。

如果服务端失败，React 会自动回退到之前的状态。

这种 UI 模式非常适合 Todo、评论、点赞、收藏等高成功率操作，可以让用户感觉应用非常流畅。

---

## 十三、Server Actions 不只适用于 form action

最常见的用法是：

```tsx
<form action={serverAction}>
```

但 Server Actions 也可以用于按钮或输入框的 `formAction`。

例如一个表单里有两个按钮，分别执行不同操作：

```tsx
<button formAction={saveDraft}>Save Draft</button>
<button formAction={publishPost}>Publish</button>
```text

这样就可以让同一个表单根据不同按钮触发不同的 Server Action。

Server Actions 也可以在表单之外调用，但这种用法通常需要配合 `useTransition`，并且会失去表单原生提交带来的渐进增强能力。

所以在大多数场景下，优先把 Server Actions 用在表单提交中，是更自然也更稳定的方式。

---

## 十四、Server Actions 会完全替代 API Routes 吗？

Server Actions 确实可以替代很多传统 API Routes，尤其是表单提交、数据库增删改、后台操作这类和页面强绑定的逻辑。

比如：

```text
新增 Todo
提交评论
更新用户资料
删除文章
上传表单数据
提交订单
```

这些操作都很适合用 Server Actions。

但是 API Routes 并不会完全消失。

如果你的接口需要被第三方系统调用，或者需要提供公共 HTTP API，或者要处理 webhook、移动端请求、外部服务回调，那么 API Routes 仍然很有必要。

可以这样理解：

Server Actions 更适合“当前 Next.js 应用内部使用的服务端操作”。

API Routes 更适合“对外暴露的 HTTP 接口”。

所以 Server Actions 不是简单地消灭 API Routes，而是让很多原本没必要写成 API 的内部操作，可以直接以函数形式完成。

---

## 十五、总结

Server Actions 是 Next.js App Router 中非常重要的一部分。它把数据修改逻辑从传统的 API Route 中抽离出来，让我们可以直接在服务端定义函数，并通过表单提交调用它。

它带来的主要变化有：

```text
不需要手写 fetch 请求
不需要为简单表单创建 API Route
可以直接访问数据库
可以配合 revalidatePath 刷新页面数据
可以保留表单的渐进增强能力
可以配合 useFormStatus 显示提交状态
可以配合 useOptimistic 实现乐观更新
```

不过在真实项目中，Server Actions 并不是万能替代品。它非常适合应用内部的数据修改逻辑，但如果你需要开放接口给外部系统，API Routes 仍然是更合适的选择。

总体来看，Server Actions 让 Next.js 的全栈开发体验更接近“直接调用服务端函数”。对于表单提交、数据库写入和页面数据刷新这类高频场景，它确实能大幅减少代码量，也让代码组织更加集中。

未来写 Next.js 项目时，一个很自然的选择会是：

页面读取数据，用 Server Component。

页面修改数据，用 Server Action。

需要对外暴露接口，再使用 API Routes。
