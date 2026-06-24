# Next.js 找回密码模块怎么落地：React Hook Form + Zod + API 完整链路

在真实项目里，找回密码页面不是简单地写一个“输入邮箱”和“重置密码”的按钮。

一个完整的找回密码模块，至少要包含下面这条链路：

```txt
选择找回方式：邮箱 / 手机号
  ↓
输入账号
  ↓
发送验证码并启动倒计时
  ↓
输入验证码、新密码、确认新密码
  ↓
React Hook Form 收集表单数据
  ↓
Zod 校验字段是否合法
  ↓
调用 resetPassword API
  ↓
Toast 提示重置成功
  ↓
跳转登录页
```

这篇文章就用一个 Next.js 找回密码页面为例，讲清楚这个模块是怎么一步步落地的。

## 一、找回密码模块整体做了什么？

这个页面支持两种找回方式：

```txt
邮箱找回
手机号找回
```

邮箱找回需要用户输入：

```txt
邮箱
验证码
新密码
确认新密码
```

手机号找回需要用户输入：

```txt
手机号
验证码
新密码
确认新密码
```

这两种表单结构很像，只是账号字段不同：邮箱找回用 `email`，手机找回用 `mobile`。

不过在当前实现里，手机找回只是预留了 UI，真正可用的是邮箱找回。也就是说，用户切换到手机找回时可以看到表单，但点击获取验证码会提示：

```txt
手机找回暂不可用
```

这是一种常见的项目开发方式：先把页面结构和表单逻辑预留好，后续接口准备好后再接入完整功能。

## 二、第一步：选择找回方式

页面通过 Tabs 切换找回方式：

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="email">邮箱找回</TabsTrigger>
    <TabsTrigger value="mobile">手机找回</TabsTrigger>
  </TabsList>
</Tabs>
```

这里的 `activeTab` 用来表示当前用户选择的是哪一种找回方式。

```tsx
const [activeTab, setActiveTab] = useState("email");
```

如果 `activeTab` 是 `"email"`，说明当前是邮箱找回。
如果 `activeTab` 是 `"mobile"`，说明当前是手机找回。

这个状态后面会影响两个地方：

```txt
发送验证码时，判断读取邮箱还是手机号
提交重置密码时，判断 mode 是邮箱还是手机
```

## 三、第二步：用 Zod 定义表单校验规则

找回密码页面里，最重要的校验有四类：

```txt
账号是否合法
验证码长度是否正确
新密码长度是否符合要求
两次密码是否一致
```

所以这里使用 Zod 定义表单规则。

邮箱找回的规则如下：

```tsx
const emailSchema = z
  .object({
    email: z.string().email({ message: "请输入有效的邮箱地址" }),
    code: z.string().min(4, { message: "验证码位数不正确" }),
    newPassword: z.string().min(6, { message: "密码长度不能少于 6 位" }),
    confirmPassword: z.string().min(6, { message: "请确认密码" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });
```

这段代码做了几件事：

`email` 必须是合法邮箱格式。
`code` 至少 4 位。
`newPassword` 至少 6 位。
`confirmPassword` 至少 6 位。
`newPassword` 和 `confirmPassword` 必须一致。

其中最关键的是 `.refine()`：

```tsx
.refine((data) => data.newPassword === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});
```

普通字段校验只能检查单个字段，比如邮箱格式、密码长度。但“两次密码是否一致”需要同时比较两个字段，所以要用 `.refine()` 做跨字段校验。

`path: ["confirmPassword"]` 表示如果两次密码不一致，错误提示显示在“确认新密码”下面。

手机号找回的 schema 也类似，只是把 `email` 换成 `mobile`：

```tsx
const mobileSchema = z
  .object({
    mobile: z.string().min(8, { message: "请输入有效的手机号" }),
    code: z.string().min(4, { message: "验证码位数不正确" }),
    newPassword: z.string().min(6, { message: "密码长度不能少于 6 位" }),
    confirmPassword: z.string().min(6, { message: "请确认密码" }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });
```

## 四、第三步：用 React Hook Form 管理表单

Zod 负责“规则”，React Hook Form 负责“表单”。

邮箱找回表单这样创建：

```tsx
type EmailFormValues = z.infer<typeof emailSchema>;

const {
  register: registerEmail,
  handleSubmit: handleEmailSubmit,
  watch: watchEmail,
  formState: { errors: emailErrors },
} = useForm<EmailFormValues>({
  resolver: zodResolver(emailSchema),
});
```

这里有几个关键字段。

`registerEmail`：把输入框注册进 React Hook Form。
`handleEmailSubmit`：提交表单前先执行 Zod 校验。
`watchEmail`：实时读取邮箱输入框的值。
`emailErrors`：保存邮箱表单的错误信息。

`resolver: zodResolver(emailSchema)` 的作用是把 Zod 和 React Hook Form 连接起来。

也就是说，用户点击提交时，React Hook Form 会先把数据交给 Zod 检查。只有校验通过，才会执行真正的提交逻辑。

手机号表单同理：

```tsx
type MobileFormValues = z.infer<typeof mobileSchema>;

const {
  register: registerMobile,
  handleSubmit: handleMobileSubmit,
  watch: watchMobile,
  formState: { errors: mobileErrors },
} = useForm<MobileFormValues>({
  resolver: zodResolver(mobileSchema),
});
```

## 五、第四步：把输入框交给 React Hook Form

以邮箱找回为例，邮箱输入框这样写：

```tsx
<Input
  id="email"
  type="email"
  placeholder="your@email.com"
  {...registerEmail("email")}
/>
```

验证码输入框：

```tsx
<Input id="code-email" placeholder="验证码" {...registerEmail("code")} />
```

新密码输入框：

```tsx
<Input
  id="new-password-email"
  type="password"
  placeholder="••••••••"
  {...registerEmail("newPassword")}
/>
```

确认新密码输入框：

```tsx
<Input
  id="confirm-email"
  type="password"
  placeholder="••••••••"
  {...registerEmail("confirmPassword")}
/>
```

这里最重要的是：

```tsx
{...registerEmail("email")}
```

这表示把这个输入框交给 React Hook Form 管理。

这样我们就不需要手动写：

```tsx
const [email, setEmail] = useState("");
```

也不需要给每个输入框手动写 `value` 和 `onChange`。

React Hook Form 会自动收集这些字段的值。

## 六、第五步：展示错误信息

如果用户输入不合法，错误信息会出现在 `formState.errors` 里。

例如邮箱错误：

```tsx
{
  emailErrors.email && (
    <p className="text-xs text-red-500">{emailErrors.email.message}</p>
  );
}
```

验证码错误：

```tsx
{
  emailErrors.code && (
    <p className="text-xs text-red-500">{emailErrors.code.message}</p>
  );
}
```

确认密码错误：

```tsx
{
  emailErrors.confirmPassword && (
    <p className="text-xs text-red-500">
      {emailErrors.confirmPassword.message}
    </p>
  );
}
```

所以这个页面不需要自己维护一个 `errors` 状态。只要 Zod 校验失败，React Hook Form 就会自动把错误信息放到对应字段下面。

## 七、第六步：发送验证码并启动倒计时

找回密码模块最重要的交互之一就是发送验证码。

验证码发送逻辑集中在 `onSendCode` 里：

```tsx
const onSendCode = async () => {
  if (countdown > 0 || isSending) return;

  const account =
    activeTab === "email" ? watchEmail("email") : watchMobile("mobile");

  if (!account) {
    toast.error(activeTab === "email" ? "请输入邮箱地址" : "请输入手机号码");
    return;
  }

  setIsSending(true);

  try {
    if (activeTab !== "email") {
      toast.error("手机找回暂不可用");
      setIsSending(false);
      return;
    }

    const result = await sendResetEmailCode({
      email: account,
    });

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

这段逻辑可以拆成几个步骤。

第一，防止重复点击：

```tsx
if (countdown > 0 || isSending) return;
```

如果正在倒计时，或者正在发送请求，就不允许再次点击。

第二，读取当前账号：

```tsx
const account =
  activeTab === "email" ? watchEmail("email") : watchMobile("mobile");
```

这里用到了 React Hook Form 的 `watch`。

因为发送验证码不需要提交整个表单，只需要读取当前输入框里的邮箱或手机号，所以用 `watch` 很合适。

第三，判断账号是否为空：

```tsx
if (!account) {
  toast.error(activeTab === "email" ? "请输入邮箱地址" : "请输入手机号码");
  return;
}
```

第四，调用验证码接口：

```tsx
const result = await sendResetEmailCode({
  email: account,
});
```

第五，成功后启动倒计时：

```tsx
toast.success("验证码已发送");
setCountdown(60);
```

## 八、第七步：倒计时怎么实现

倒计时通过 `countdown` 状态控制：

```tsx
const [countdown, setCountdown] = useState(0);
```

发送验证码成功后，把它设置成 60：

```tsx
setCountdown(60);
```

然后用 `useEffect` 每秒减一：

```tsx
useEffect(() => {
  let timer: NodeJS.Timeout;

  if (countdown > 0) {
    timer = setTimeout(() => setCountdown(countdown - 1), 1000);
  }

  return () => clearTimeout(timer);
}, [countdown]);
```

按钮根据倒计时显示不同文字：

```tsx
<Button
  type="button"
  onClick={onSendCode}
  disabled={countdown > 0 || isSending}
>
  {countdown > 0 ? `${countdown}s` : "获取验证码"}
</Button>
```

这样用户点击一次验证码后，按钮会变成：

```txt
60s
59s
58s
...
```

直到倒计时结束，才可以再次发送验证码。

## 九、第八步：提交重置密码表单

表单提交时，要用 `handleSubmit` 包一层：

```tsx
<form onSubmit={handleEmailSubmit(onSubmit)}>...</form>
```

这一步很重要。

`handleEmailSubmit` 会先执行 Zod 校验。如果校验失败，就显示错误信息，不会调用 `onSubmit`。

只有当邮箱、验证码、新密码、确认密码都合法时，才会真正执行提交函数。

## 十、第九步：组装 resetPassword API 参数

提交函数里会把表单数据转换成后端需要的 payload：

```tsx
const payload = {
  account: "email" in values ? values.email : values.mobile,
  password: values.newPassword,
  mode: "email" in values ? "0" : "1",
  code: values.code,
};
```

这几个字段分别表示：

```txt
account：账号，可能是邮箱，也可能是手机号
password：新密码
mode：找回方式，0 表示邮箱，1 表示手机
code：验证码
```

这里同样用了：

```tsx
"email" in values;
```

如果 values 里有 `email`，说明当前是邮箱找回。
否则就是手机找回。

所以前端可以用两套表单，但提交给后端时统一成一个 payload。

## 十一、第十步：调用 resetPassword API

参数准备好后，调用重置密码接口：

```tsx
const result = await resetPassword(payload);
```

如果后端返回失败：

```tsx
if (result?.code && String(result.code) !== "0") {
  toast.error(result.message || "重置失败");
  return;
}
```

这里把 `result.code` 转成字符串判断，是为了兼容后端可能返回数字 `0` 或字符串 `"0"` 的情况。

如果成功：

```tsx
toast.success("密码重置成功");
router.push("/login?message=reset_success");
```

也就是说，密码重置成功后，页面会跳转到登录页，让用户用新密码重新登录。

## 十二、这个模块里 Toast 的作用

这个页面使用 Sonner Toast 给用户反馈。

比如账号没填：

```tsx
toast.error("请输入邮箱地址");
```

验证码发送成功：

```tsx
toast.success("验证码已发送");
```

密码重置成功：

```tsx
toast.success("密码重置成功");
```

接口失败：

```tsx
toast.error(result.message || "重置失败");
```

Toast 很适合这种轻量提示，因为找回密码流程中有很多即时反馈，但不需要弹窗打断用户操作。

## 十三、这个模块的技术分工

这个找回密码模块里，每个技术栈都有明确职责：

```txt
Next.js Client Component
让页面支持输入、点击、切换 Tab、提交表单等客户端交互。

Tabs
负责切换邮箱找回和手机找回。

React Hook Form
负责收集表单字段，处理提交，管理错误状态。

Zod
负责校验邮箱/手机号、验证码、新密码和确认密码。

zodResolver
负责把 Zod 校验接入 React Hook Form。

watch
负责读取当前账号，用于发送验证码。

sendResetEmailCode
负责发送邮箱重置验证码。

resetPassword
负责提交账号、验证码、新密码和找回方式。

Sonner Toast
负责展示成功或失败提示。

Next Router
负责重置成功后跳转登录页。
```

## 十四、完整链路总结

这个找回密码模块可以总结成这条链路：

```txt
选择找回方式：邮箱 / 手机号
  ↓
输入账号
  ↓
发送验证码并启动倒计时
  ↓
输入验证码、新密码、确认新密码
  ↓
React Hook Form 收集表单数据
  ↓
Zod 校验字段是否合法
  ↓
调用 resetPassword API
  ↓
Toast 提示重置成功
  ↓
跳转登录页
```

更直白一点说：

> 用户先选择邮箱或手机号找回方式，然后输入账号并获取验证码。验证码发送成功后，按钮进入 60 秒倒计时。接着用户输入验证码、新密码和确认新密码。React Hook Form 负责收集这些表单数据，Zod 负责检查邮箱/手机号、验证码、密码长度以及两次密码是否一致。校验通过后，前端把账号、新密码、验证码和找回方式组装成 payload，调用 resetPassword API。接口成功后，用 Toast 提示密码重置成功，并跳转回登录页。

对于前端小白来说，可以重点记住一句话：

> 找回密码模块的本质，是用验证码确认用户身份，再用表单提交新密码；React Hook Form 负责表单流程，Zod 负责校验规则，API 负责和后端交互，Toast 和 Router 负责用户反馈与页面跳转。
