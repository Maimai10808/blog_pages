# 为什么 React 表单推荐使用 React Hook Form + Zod？

React 在构建 Web 应用时提供了非常优秀的组件化开发方式，也让前端开发的思维方式发生了很大变化。但是，React 并不是所有场景都天然好用。表单就是其中一个典型例子。

如果我们完全用原生 React 来写表单，刚开始看起来并不复杂：定义几个 `useState`，绑定 `value` 和 `onChange`，提交时 `preventDefault()`，再手动校验字段即可。比如一个只有邮箱和密码的登录表单，确实可以很快写出来。

但是问题在于：这种写法不太容易扩展。

当表单字段越来越多时，每增加一个字段，就需要新增一个状态、绑定一个输入框、维护一个错误信息，还要在提交时手动处理校验逻辑。如果再加上异步请求、loading 状态、按钮禁用、后端错误回显，代码就会迅速膨胀。很多时候，我们写表单不是在处理业务本身，而是在重复处理表单状态、错误、校验和提交流程。

这就是 React Hook Form 的价值所在。

## 一、原生 React 表单的问题

假设我们用 React 原生方式写一个简单表单，通常会有这样的逻辑：

```tsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [errors, setErrors] = useState({
  email: "",
  password: "",
});

function handleSubmit(e: React.FormEvent) {
  e.preventDefault();

  setErrors({
    email: "",
    password: "",
  });

  if (!email.includes("@")) {
    setErrors((prev) => ({
      ...prev,
      email: "邮箱必须包含 @ 符号",
    }));
    return;
  }

  console.log("form submitted");
}
```

这种方式在只有两个字段时没有太大问题。但一旦表单变复杂，就会出现几个明显痛点：

第一，每个字段都要手动维护状态。
第二，每个输入框都要写 `value` 和 `onChange`。
第三，错误信息需要自己设计结构和重置逻辑。
第四，校验规则需要自己手写。
第五，异步提交时还要额外维护 loading 状态。
第六，后端返回错误时，还需要想办法把错误放回表单中。

所以，简单表单可以手写，但复杂表单更适合交给表单库管理。

## 二、React Hook Form 的基本用法

React Hook Form 的核心 Hook 是 `useForm`。

一个最基础的写法如下：

```tsx
import { useForm, type SubmitHandler } from "react-hook-form";

type FormFields = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const { register, handleSubmit } = useForm<FormFields>();

  const onSubmit: SubmitHandler<FormFields> = (data) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("email")} />
      <input type="password" {...register("password")} />
      <button type="submit">Submit</button>
    </form>
  );
}
```

这里最关键的是两个东西：

`register` 用来把输入框注册到 React Hook Form 中。
`handleSubmit` 用来接管表单提交行为。

和原生表单相比，我们不再需要手动写 `value` 和 `onChange`。输入框的值会由 React Hook Form 内部管理。提交时，`handleSubmit` 会自动阻止表单默认行为，并把整理好的表单数据传给 `onSubmit`。

也就是说，`onSubmit` 接收到的不是事件对象，而是表单数据对象：

```ts
{
  email: "...",
  password: "..."
}
```

这会让表单提交逻辑变得更加清晰。

## 三、使用 register 做基础校验

React Hook Form 可以直接在 `register` 中添加校验规则。例如：

```tsx
<input
  {...register("email", {
    required: "邮箱不能为空",
    validate: (value) =>
      value.includes("@") || "邮箱必须包含 @ 符号",
  })}
/>

<input
  type="password"
  {...register("password", {
    required: "密码不能为空",
    minLength: {
      value: 8,
      message: "密码至少需要 8 位",
    },
  })}
/>
```

然后可以从 `formState.errors` 中获取错误信息：

```tsx
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<FormFields>();
```

在 JSX 中展示错误：

```tsx
{
  errors.email && <p className="text-red-500">{errors.email.message}</p>;
}

{
  errors.password && <p className="text-red-500">{errors.password.message}</p>;
}
```

这样就不需要自己维护 `errors` 状态了。

React Hook Form 会根据校验规则自动生成错误对象。我们只需要关心错误信息怎么展示。

## 四、异步提交与 isSubmitting

在真实业务中，表单提交通常不是简单地 `console.log`，而是要调用后端接口。

如果用原生 React，我们通常需要自己写：

```tsx
const [isLoading, setIsLoading] = useState(false);
```

然后在请求前设置为 `true`，请求结束后设置为 `false`。

但 React Hook Form 已经内置了这个能力。我们可以直接使用 `isSubmitting`：

```tsx
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<FormFields>();

const onSubmit: SubmitHandler<FormFields> = async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log(data);
};
```

按钮中使用：

```tsx
<button disabled={isSubmitting}>
  {isSubmitting ? "Loading..." : "Submit"}
</button>
```

只要 `onSubmit` 是异步函数，并且里面有 `await`，React Hook Form 就会自动管理提交状态。

这比自己维护 loading 状态更简洁，也更不容易出错。

## 五、处理后端返回的错误

表单校验不只发生在前端。很多错误只有后端才能判断，比如：

邮箱已被注册。
账号或密码错误。
验证码失效。
用户不存在。

React Hook Form 提供了 `setError`，可以把后端错误放回表单里。

例如，把错误绑定到 email 字段：

```tsx
const {
  register,
  handleSubmit,
  setError,
  formState: { errors },
} = useForm<FormFields>();

const onSubmit: SubmitHandler<FormFields> = async (data) => {
  try {
    await submitToServer(data);
  } catch {
    setError("email", {
      message: "这个邮箱已经被注册",
    });
  }
};
```

如果这个错误不属于某个具体字段，而是整个表单的错误，可以使用 `root`：

```tsx
setError("root", {
  message: "登录失败，请检查账号或密码",
});
```

然后在表单底部展示：

```tsx
{
  errors.root && <p className="text-red-500">{errors.root.message}</p>;
}
```

这对于登录、注册、支付、下单这类业务表单非常有用。

## 六、defaultValues：表单默认值

React Hook Form 也支持默认值：

```tsx
const form = useForm<FormFields>({
  defaultValues: {
    email: "test@email.com",
  },
});
```

这在编辑资料、修改地址、更新设置等场景中非常常见。

比如编辑用户信息时，我们通常会先从接口获取已有数据，然后填充到表单里。`defaultValues` 就是专门处理这种场景的。

## 七、推荐方案：React Hook Form + Zod

虽然 React Hook Form 自带校验能力，但在实际项目中，更推荐搭配 Zod 使用。

Zod 是一个 TypeScript 友好的数据校验库。它可以集中定义表单结构和校验规则，同时还能自动推导 TypeScript 类型。

首先定义 schema：

```tsx
import * as z from "zod";

const schema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少需要 8 位"),
});
```

然后通过 `z.infer` 自动生成表单类型：

```tsx
type FormFields = z.infer<typeof schema>;
```

接着使用 `zodResolver` 连接 React Hook Form：

```tsx
import { zodResolver } from "@hookform/resolvers/zod";

const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<FormFields>({
  resolver: zodResolver(schema),
});
```

完整示例：

```tsx
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import * as z from "zod";

const schema = z.object({
  email: z.string().email("请输入有效邮箱"),
  password: z.string().min(8, "密码至少需要 8 位"),
});

type FormFields = z.infer<typeof schema>;

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FormFields> = async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(data);
    } catch {
      setError("root", {
        message: "提交失败，请稍后重试",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div>
        <input type="email" placeholder="Email" {...register("email")} />
        {errors.email && <p>{errors.email.message}</p>}
      </div>

      <div>
        <input
          type="password"
          placeholder="Password"
          {...register("password")}
        />
        {errors.password && <p>{errors.password.message}</p>}
      </div>

      <button disabled={isSubmitting}>
        {isSubmitting ? "Loading..." : "Submit"}
      </button>

      {errors.root && <p>{errors.root.message}</p>}
    </form>
  );
}
```

这种写法的好处是：

表单字段类型来自 Zod，不需要重复定义。
校验规则集中在 schema 中，维护更方便。
React Hook Form 负责表单状态、提交状态和错误管理。
Zod 负责字段校验。
代码结构更清晰，也更适合大型项目。

## 八、什么时候需要 React Hook Form？

并不是所有表单都必须使用 React Hook Form。

如果只是一个非常简单的搜索框，或者只有一两个字段的小表单，用 `useState` 手写完全可以。

但如果你的表单具备以下特征，就很适合使用 React Hook Form：

字段较多。
需要复杂校验。
需要展示错误信息。
需要异步提交。
需要处理后端错误。
需要默认值。
需要较好的 TypeScript 类型支持。
需要较好的性能和可维护性。

例如登录、注册、找回密码、实名认证、资产提现、交易下单、用户设置等场景，都比较适合使用 React Hook Form。

## 九、总结

React 原生写表单并不是不能用，而是不太适合复杂业务场景。随着字段、校验、错误处理和异步提交逻辑增多，原生写法会越来越难维护。

React Hook Form 的价值在于，它把表单状态管理、字段注册、错误处理、提交状态等通用逻辑封装了起来，让我们可以专注于业务本身。

而 Zod 则进一步把校验规则和 TypeScript 类型统一起来，让表单代码更加安全、清晰和可维护。

所以，在真实项目中，比较推荐的组合是：

```txt
React Hook Form 负责表单状态和提交流程
Zod 负责表单结构和字段校验
zodResolver 负责把两者连接起来
```

如果只是简单表单，可以直接用 React 状态管理。
如果是复杂表单，React Hook Form + Zod 会是更稳、更工程化的选择。

```
:::
```
