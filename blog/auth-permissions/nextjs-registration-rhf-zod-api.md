# Next.js 注册模块怎么落地：React Hook Form + Zod + API 的完整链路

在一个真实项目里，注册页面并不是简单写几个输入框就结束了。一个完整的注册模块，通常要处理这些事情：

```txt
读取 URL 预填账号
  ↓
判断默认注册方式：邮箱 / 手机号
  ↓
填写账号、验证码、密码、确认密码
  ↓
发送验证码并启动倒计时
  ↓
React Hook Form 收集表单数据
  ↓
Zod 校验字段合法性
  ↓
调用邮箱注册或手机号注册 API
  ↓
注册成功后 Toast 提示
  ↓
跳转到登录页
```

这篇文章就以一个 Next.js 注册页为例，讲清楚这个注册模块是如何一步步落地的。

## 一、注册模块整体做了什么？

这个注册页面支持两种方式：

```txt
邮箱注册
手机号注册
```

用户可以在页面上切换 Tab，选择用邮箱注册或者手机号注册。两种注册方式的表单结构基本一致，都是：

```txt
账号
验证码
密码
确认密码
```

不同点在于：

```txt
邮箱注册提交 email
手机号注册提交 phone
```

页面提交时，会根据当前表单类型调用不同 API：

```ts
registerByEmail(...)
registerByPhone(...)
```

所以这个注册模块的核心不是 UI，而是把“用户输入 → 表单校验 → 验证码 → 注册接口 → 成功跳转”串成一个完整流程。

## 二、第一步：读取 URL 预填账号

很多平台首页会有一个注册引导输入框，比如用户先在首页输入邮箱，然后点击“立即注册”。

这时可以跳转到：

```txt
/register?account=test@example.com
```

注册页通过 `useSearchParams` 读取 URL 参数：

```ts
const searchParams = useSearchParams();

const prefillAccount = searchParams.get("account") || "";
const isEmailFormat = prefillAccount.includes("@");
```

这里做了两件事：

第一，读取 `account` 参数。
第二，判断它像不像邮箱。

如果包含 `@`，就认为它是邮箱；否则如果有值，就先当作手机号处理。

## 三、第二步：判断默认注册方式

注册页有邮箱和手机号两个 Tab。默认打开哪个 Tab，可以根据 URL 中的账号自动判断：

```ts
const [activeTab, setActiveTab] = useState(
  isEmailFormat ? "email" : prefillAccount ? "mobile" : "email",
);
```

这段逻辑的意思是：

```txt
如果 account 是邮箱格式，默认打开邮箱注册
如果 account 有值但不是邮箱，默认打开手机号注册
如果 account 为空，默认打开邮箱注册
```

这样用户从首页带着邮箱进入注册页时，页面会自动停留在“邮箱注册”，并且邮箱输入框已经填好了。

这是一个很常见的注册体验优化。

## 四、第三步：用 Zod 定义表单规则

注册表单不能让用户乱填。比如邮箱必须是邮箱格式，密码不能太短，两次密码必须一致。

这个项目使用 Zod 来定义校验规则。

邮箱注册的校验规则大概是这样：

```ts
const emailSchema = z
  .object({
    email: z.string().email({ message: "请输入有效邮箱" }),
    code: z.string().min(4, { message: "验证码位数不正确" }),
    password: z.string().min(6, { message: "密码长度不能少于 6 位" }),
    confirmPassword: z.string().min(6, { message: "请确认密码" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });
```

手机号注册也类似，只是把 `email` 换成 `mobile`：

```ts
const mobileSchema = z
  .object({
    mobile: z.string().min(8, { message: "请输入有效手机号" }),
    code: z.string().min(4, { message: "验证码位数不正确" }),
    password: z.string().min(6, { message: "密码长度不能少于 6 位" }),
    confirmPassword: z.string().min(6, { message: "请确认密码" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "两次密码不一致",
    path: ["confirmPassword"],
  });
```

这里最重要的是 `.refine()`。

普通字段校验只能检查单个字段，比如邮箱格式、密码长度。而确认密码要和密码做比较，这是两个字段之间的关系，所以需要用 `.refine()` 做跨字段校验。

```ts
.refine((data) => data.password === data.confirmPassword, {
  message: "两次密码不一致",
  path: ["confirmPassword"],
});
```

`path: ["confirmPassword"]` 表示错误信息显示在“确认密码”下面。

## 五、第四步：用 React Hook Form 管理表单

Zod 只负责校验规则，真正管理表单输入、提交和错误状态的是 React Hook Form。

邮箱表单这样写：

```ts
type EmailFormValues = z.infer<typeof emailSchema>;

const {
  register: registerEmail,
  handleSubmit: handleEmailSubmit,
  watch: watchEmail,
  formState: { errors: emailErrors },
} = useForm<EmailFormValues>({
  resolver: zodResolver(emailSchema),
  defaultValues: {
    email: isEmailFormat ? prefillAccount : "",
  },
});
```

这里有几个关键点。

`z.infer<typeof emailSchema>` 是从 Zod schema 自动推导 TypeScript 类型。这样就不用自己重复写一遍表单类型。

`resolver: zodResolver(emailSchema)` 是把 Zod 校验接入 React Hook Form。表单提交时，会先走 Zod 校验，校验通过才会真正执行提交函数。

`defaultValues` 用来做默认值。比如 URL 中已经带了邮箱，就自动填到邮箱输入框里。

`watchEmail` 用来读取当前表单里的邮箱值。发送验证码时，不一定要等用户提交表单，而是直接读取当前输入的账号。

手机号表单同理：

```ts
type MobileFormValues = z.infer<typeof mobileSchema>;

const {
  register: registerMobile,
  handleSubmit: handleMobileSubmit,
  watch: watchMobile,
  formState: { errors: mobileErrors },
} = useForm<MobileFormValues>({
  resolver: zodResolver(mobileSchema),
  defaultValues: {
    mobile: !isEmailFormat && prefillAccount ? prefillAccount : "",
  },
});
```

## 六、第五步：把输入框注册到表单里

React Hook Form 的核心是 `register`。

比如邮箱输入框：

```tsx
<Input
  id="email"
  type="email"
  placeholder="请输入邮箱"
  {...registerEmail("email")}
/>
```

验证码输入框：

```tsx
<Input id="code-email" placeholder="请输入验证码" {...registerEmail("code")} />
```

密码输入框：

```tsx
<Input
  id="password-email"
  type="password"
  placeholder="请输入密码"
  {...registerEmail("password")}
/>
```

确认密码输入框：

```tsx
<Input
  id="confirm-email"
  type="password"
  placeholder="请确认密码"
  {...registerEmail("confirmPassword")}
/>
```

这一步的作用是把输入框和 React Hook Form 绑定起来。绑定之后，React Hook Form 会自动管理这些字段的值和错误。

错误信息可以这样展示：

```tsx
{
  emailErrors.email && (
    <p className="text-xs text-red-500">{emailErrors.email.message}</p>
  );
}
```

也就是说，页面不需要自己维护一个 `errors` 状态。只要 Zod 校验失败，React Hook Form 就会把错误信息放到 `formState.errors` 里。

## 七、第六步：发送验证码并启动倒计时

注册模块通常都需要验证码。这个项目把邮箱验证码和手机验证码统一放到一个函数里处理：

```ts
const onSendCode = async () => {
  if (countdown > 0 || isSending) return;

  const account =
    activeTab === "email" ? watchEmail("email") : watchMobile("mobile");

  if (!account) {
    toast.error(activeTab === "email" ? "请输入邮箱" : "请输入手机号");
    return;
  }

  setIsSending(true);

  try {
    const result = await (activeTab === "email"
      ? sendEmailCode({ email: account })
      : sendPhoneCode({ phone: account }));

    if (result?.code && result.code !== 0 && result.code !== "0") {
      toast.error(result.message || "发送失败");
      return;
    }

    toast.success("验证码已发送");
    setCountdown(60);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "发送失败");
  } finally {
    setIsSending(false);
  }
};
```

这个函数做了几件事：

```txt
如果正在倒计时，禁止重复发送
如果正在发送请求，禁止重复点击
根据当前 Tab 读取邮箱或手机号
如果账号为空，提示用户先输入
调用对应验证码接口
成功后提示“验证码已发送”
启动 60 秒倒计时
失败后提示错误
```

倒计时通过 `useEffect` 实现：

```ts
useEffect(() => {
  if (countdown <= 0) return;

  const timer = setTimeout(() => {
    setCountdown((c) => c - 1);
  }, 1000);

  return () => clearTimeout(timer);
}, [countdown]);
```

验证码按钮根据倒计时显示不同内容：

```tsx
<Button
  type="button"
  onClick={onSendCode}
  disabled={countdown > 0 || isSending}
>
  {countdown > 0 ? `${countdown}s` : "发送验证码"}
</Button>
```

这个设计可以防止用户疯狂点击“发送验证码”，避免给后端造成压力。

## 八、第七步：提交注册表单

React Hook Form 提交表单时，不是直接把函数传给 `onSubmit`，而是用 `handleSubmit` 包一层。

邮箱注册表单：

```tsx
<form onSubmit={handleEmailSubmit(onSubmit)}>...</form>
```

手机号注册表单：

```tsx
<form onSubmit={handleMobileSubmit(onSubmit)}>...</form>
```

`handleSubmit` 会先执行 Zod 校验。如果校验失败，就显示错误；如果校验成功，才会调用真正的 `onSubmit`。

提交函数这样写：

```ts
const onSubmit = async (values: EmailFormValues | MobileFormValues) => {
  setIsLoading(true);

  try {
    const result = await ("email" in values
      ? registerByEmail({
          email: values.email,
          password: values.password,
          code: values.code,
          username: `u${values.email}`,
        })
      : registerByPhone({
          phone: values.mobile,
          password: values.password,
          code: values.code,
          username: `u${values.mobile}`,
        }));

    if (result?.code && result.code !== 0 && result.code !== "0") {
      toast.error(result.message || "注册失败");
      return;
    }

    toast.success("注册成功");
    router.push("/login?message=registration_success");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "注册失败");
  } finally {
    setIsLoading(false);
  }
};
```

这里有一个比较实用的 TypeScript 判断：

```ts
"email" in values;
```

因为邮箱表单的数据里有 `email` 字段，手机号表单的数据里有 `mobile` 字段。所以可以通过这个判断当前是哪种注册方式。

如果是邮箱注册，调用：

```ts
registerByEmail(...)
```

如果是手机号注册，调用：

```ts
registerByPhone(...)
```

## 九、第八步：注册 API 参数怎么组织

邮箱注册提交的数据是：

```ts
{
  email: values.email,
  password: values.password,
  code: values.code,
  username: `u${values.email}`,
}
```

手机号注册提交的数据是：

```ts
{
  phone: values.mobile,
  password: values.password,
  code: values.code,
  username: `u${values.mobile}`,
}
```

其中 `username` 不是用户手动输入的，而是前端根据账号自动拼出来的。

为什么要这样做？

因为有些后端注册接口要求 `username` 必填，甚至要求唯一。这个项目里用 `u + 邮箱/手机号` 的方式生成 username，既能保证字段不为空，也比较容易避免重复。

## 十、第九步：注册成功后 Toast 提示并跳转

接口成功后，页面会先显示提示：

```ts
toast.success("注册成功");
```

然后跳转登录页：

```ts
router.push("/login?message=registration_success");
```

这里不是跳转到普通 `/login`，而是带了一个参数：

```txt
/login?message=registration_success
```

这样登录页后续可以根据这个参数显示提示，例如：

```txt
注册成功，请登录
```

这是常见的认证流程设计。注册只是创建账号，真正进入系统还需要登录。

## 十、为什么外层要用 Suspense？

注册页面里用了：

```ts
useSearchParams();
```

在 Next.js App Router 中，`useSearchParams` 是客户端路由相关 Hook。为了更稳地处理客户端参数读取，外层页面使用了 `Suspense` 包裹真正的注册内容：

```tsx
export default function RegisterPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <RegisterContent />
    </Suspense>
  );
}
```

所以组件结构是：

```txt
RegisterPage
  ↓
Suspense
  ↓
RegisterContent
```

`RegisterPage` 负责外层加载状态，`RegisterContent` 负责真正的注册表单逻辑。

## 十一、这个注册模块的技术栈分工

这个模块每个技术栈都有明确职责：

```txt
Next.js Client Component
负责页面交互能力，比如表单输入、点击按钮、读取 URL 参数。

useSearchParams
负责读取 URL 上的 account 参数，实现账号预填。

React Hook Form
负责管理表单字段、提交、错误状态。

Zod
负责定义邮箱、手机号、验证码、密码、确认密码的校验规则。

zodResolver
负责把 Zod 校验规则接入 React Hook Form。

Sonner Toast
负责展示验证码发送成功、注册成功、注册失败等提示。

Next Router
负责注册成功后跳转到登录页。

API 层
负责真正和后端交互，比如发送验证码、邮箱注册、手机号注册。
```

这就是一个比较完整的注册模块落地方式。

## 十二、总结

这个注册模块的核心流程可以再概括一次：

```txt
读取 URL 预填账号
  ↓
判断默认注册方式
  ↓
填写账号、验证码、密码、确认密码
  ↓
发送验证码并启动倒计时
  ↓
React Hook Form 收集表单数据
  ↓
Zod 校验字段合法性
  ↓
调用邮箱注册或手机号注册 API
  ↓
注册成功后 Toast 提示
  ↓
跳转到登录页
```

对于前端小白来说，可以重点记住一句话：

> 注册模块不是简单提交表单，而是由“表单管理、字段校验、验证码请求、注册 API、用户反馈、页面跳转”组成的一条完整业务链路。

这个项目的写法比较适合真实业务：表单状态交给 React Hook Form，校验规则交给 Zod，接口请求交给 API 层，成功失败交给 Toast，流程跳转交给 Router。这样每一层职责都很清楚，后续维护和扩展也会更加方便。
