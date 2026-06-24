# Next.js 登录模块怎么落地：React Hook Form + Zod + Zustand + API 完整链路

在真实项目里，登录页面不是简单写两个输入框，然后点击按钮提交就结束了。

一个完整的登录模块，至少要处理这些事情：

```txt
选择登录方式：邮箱 / 手机号
  ↓
输入账号和密码
  ↓
React Hook Form 收集表单数据
  ↓
Zod 校验字段是否合法
  ↓
调用 login API
  ↓
解析 token / salt / 用户信息
  ↓
写入 Zustand 和 localStorage
  ↓
Toast 提示登录成功
  ↓
跳转首页或 redirect 指定页面
```

这篇文章就用一个 Next.js 登录页为例，讲清楚登录模块是怎么一步步落地的。

## 一、登录模块整体做了什么？

这个登录页面支持两种方式：

```txt
邮箱登录
手机号登录
```

邮箱登录需要填写：

```txt
email
password
```

手机号登录需要填写：

```txt
mobile
password
```

虽然页面上分成了邮箱和手机号两个 Tab，但是最终调用的是同一个登录接口。也就是说，前端展示上区分两种登录方式，但提交给后端时会统一转换成：

```ts
{
  username: "邮箱或手机号",
  password: "用户密码"
}
```

这样做的好处是：前端用户体验更灵活，后端接口也可以保持统一。

## 二、第一步：选择登录方式

页面通过 Tabs 区分邮箱登录和手机号登录：

```tsx
<Tabs defaultValue="email">
  <TabsList>
    <TabsTrigger value="email">邮箱</TabsTrigger>
    <TabsTrigger value="mobile">手机号</TabsTrigger>
  </TabsList>
</Tabs>
```

这里的思路很简单：

```txt
用户点邮箱 Tab，就展示邮箱登录表单
用户点手机号 Tab，就展示手机号登录表单
```

两个表单看起来类似，但字段名不同：

```txt
邮箱表单：email + password
手机表单：mobile + password
```

后面提交时，就通过字段名判断当前是哪种登录方式。

## 三、第二步：用 Zod 定义登录校验规则

登录之前，前端需要先做基础校验。比如：

邮箱格式必须正确。
手机号不能太短。
密码不能少于 6 位。

这个项目使用 Zod 来定义校验规则。

```tsx
const { emailSchema, mobileSchema } = useMemo(
  () => ({
    emailSchema: z.object({
      email: z.string().email({ message: "请输入有效邮箱" }),
      password: z.string().min(6, { message: "密码长度不能少于 6 位" }),
    }),
    mobileSchema: z.object({
      mobile: z.string().min(8, { message: "请输入有效手机号" }),
      password: z.string().min(6, { message: "密码长度不能少于 6 位" }),
    }),
  }),
  [],
);
```

这里定义了两套规则：

邮箱登录用 `emailSchema`。
手机号登录用 `mobileSchema`。

Zod 的作用就是：**在真正调用登录接口之前，先判断用户输入是否符合规则。**

比如邮箱格式不对，就不会继续调用接口，而是直接在表单下方展示错误信息。

## 四、第三步：用 React Hook Form 管理表单

Zod 负责校验规则，但表单字段的收集、提交、错误状态管理，则交给 React Hook Form。

邮箱登录表单：

```tsx
type EmailFormValues = z.infer<typeof emailSchema>;

const {
  register: registerEmail,
  handleSubmit: handleEmailSubmit,
  formState: { errors: emailErrors },
} = useForm<EmailFormValues>({
  resolver: zodResolver(emailSchema),
});
```

手机号登录表单：

```tsx
type MobileFormValues = z.infer<typeof mobileSchema>;

const {
  register: registerMobile,
  handleSubmit: handleMobileSubmit,
  formState: { errors: mobileErrors },
} = useForm<MobileFormValues>({
  resolver: zodResolver(mobileSchema),
});
```

这里有几个关键点。

`z.infer<typeof emailSchema>` 表示从 Zod schema 自动推导 TypeScript 类型。这样不用重复写表单字段类型。

`resolver: zodResolver(emailSchema)` 表示把 Zod 校验规则接入 React Hook Form。

`registerEmail` 用来绑定输入框。

`handleEmailSubmit` 用来处理表单提交。

`emailErrors` 用来显示错误信息。

## 五、第四步：把输入框交给 React Hook Form 管理

邮箱输入框这样写：

```tsx
<Input
  id="email"
  type="email"
  placeholder="请输入邮箱"
  {...registerEmail("email")}
/>
```

密码输入框这样写：

```tsx
<Input
  id="password-email"
  type="password"
  placeholder="请输入密码"
  {...registerEmail("password")}
/>
```

这里的重点是：

```tsx
{...registerEmail("email")}
```

它的作用是把这个输入框注册到 React Hook Form 里。注册之后，React Hook Form 会自动收集这个字段的值。

也就是说，我们不需要自己写：

```tsx
const [email, setEmail] = useState("");
```

也不需要手动写：

```tsx
onChange={(e) => setEmail(e.target.value)}
```

表单数据由 React Hook Form 统一管理，代码会更干净。

## 六、第五步：展示表单错误信息

当 Zod 校验失败时，错误信息会进入 `formState.errors`。

比如邮箱错误：

```tsx
{
  emailErrors.email && (
    <p className="text-xs text-red-500">{emailErrors.email.message}</p>
  );
}
```

密码错误：

```tsx
{
  emailErrors.password && (
    <p className="text-xs text-red-500">{emailErrors.password.message}</p>
  );
}
```

这样用户点击登录时，如果邮箱格式不对，页面会直接提示：

```txt
请输入有效邮箱
```

如果密码太短，会提示：

```txt
密码长度不能少于 6 位
```

这就是 React Hook Form + Zod 的好处：**校验规则集中写，错误展示统一取。**

## 七、第六步：提交登录表单

表单提交不是直接写：

```tsx
<form onSubmit={onSubmit}>
```

而是要用 React Hook Form 的 `handleSubmit` 包一层：

```tsx
<form onSubmit={handleEmailSubmit(onSubmit)}>...</form>
```

手机号登录也是一样：

```tsx
<form onSubmit={handleMobileSubmit(onSubmit)}>...</form>
```

`handleSubmit` 会先执行 Zod 校验。

如果校验失败，就不会执行 `onSubmit`。
如果校验成功，才会把表单数据传给 `onSubmit`。

这可以避免无效数据直接提交给后端。

## 八、第七步：把邮箱/手机号统一转换成 username

登录提交函数接收到的数据可能有两种形态。

邮箱登录：

```ts
{
  email: "test@example.com",
  password: "123456"
}
```

手机号登录：

```ts
{
  mobile: "13800138000",
  password: "123456"
}
```

但是后端登录接口需要的是：

```ts
{
  username: "test@example.com 或 13800138000",
  password: "123456"
}
```

所以前端需要做一层转换：

```tsx
const payload = {
  username: "email" in values ? values.email : values.mobile,
  password: values.password,
};
```

这里用了一个很实用的判断：

```ts
"email" in values;
```

如果 `values` 里有 `email`，说明当前是邮箱登录。
否则就是手机号登录。

这样就能把两种表单统一成后端需要的参数格式。

## 九、第八步：调用 login API

参数准备好后，就可以调用登录接口：

```tsx
const response = await login(payload);
```

一般来说，登录接口会返回：

```txt
token
salt
用户信息
```

也可能返回错误信息，比如账号密码错误。

所以前端需要先判断是否失败：

```tsx
if (response?.code && response.code !== 0 && response.code !== "0") {
  toast.error(response.message || "登录失败");
  return;
}
```

这里同时兼容了数字 `0` 和字符串 `"0"`，因为有些后端返回的 `code` 类型可能不统一。

## 十、第九步：解析 token、salt 和用户信息

登录成功后，前端最重要的是拿到用户身份凭证。

这个项目里主要解析三个东西：

```txt
token：用户登录凭证
salt：后续请求签名或加密可能会用到
userInfo：用户基础信息，比如 id、username、avatar
```

由于接口返回结构可能不稳定，所以代码做了一层兼容：

```tsx
const data = response?.data ?? response;
const token = data?.token;
const salt = data?.salt;
```

这段代码可以同时兼容：

```txt
response.token
response.data.token
```

这种写法在老项目迁移或接口结构还没完全稳定时很常见。

## 十一、第十步：写入 Zustand 和 localStorage

拿到 token 后，需要保存登录状态。

这个项目把 token 写入 Zustand：

```tsx
setToken(token);
```

Zustand 是一个状态管理库。把 token 放到 store 里后，其他页面就可以知道用户已经登录了。

如果接口返回了 salt，就写入 localStorage：

```tsx
if (salt) {
  localStorage.setItem("salt", salt);
}
```

然后保存用户基础信息：

```tsx
setUserInfo({
  id: Number(data?.id) || 0,
  username: String(data?.username || data?.email || ""),
  avatar: String(data?.avatar || ""),
});
```

这一段就是登录模块真正“落地”的地方。

用户输入账号密码只是开始，只有 token 和用户信息被保存下来，前端才真正进入登录态。

可以理解为：

```txt
login API 认证成功
  ↓
token 保存到 Zustand
  ↓
salt 保存到 localStorage
  ↓
userInfo 保存到 Zustand
  ↓
整个应用知道用户已经登录
```

## 十二、第十一步：Toast 提示登录成功

保存完登录态后，页面会提示用户登录成功：

```tsx
toast.success("登录成功");
```

这个项目使用的是 Sonner Toast。它适合展示这种轻量级反馈，比如：

```txt
登录成功
登录失败
请求失败
账号或密码错误
```

失败时也会用：

```tsx
toast.error("登录失败");
```

Toast 的作用不是处理业务逻辑，而是给用户一个清晰反馈。

## 十三、第十二步：跳转首页或 redirect 页面

登录成功后，用户应该去哪里？

最简单的做法是直接跳首页：

```tsx
router.push("/");
```

但真实项目里经常有这样的场景：

用户访问资产页 `/assets`，发现没登录，于是被跳转到：

```txt
/login?redirect=/assets
```

登录成功后，用户应该回到原本想去的 `/assets`，而不是首页。

所以这个项目会读取 `redirect` 参数：

```tsx
const searchParams = new URLSearchParams(window.location.search);
const redirect = searchParams.get("redirect");

router.push(redirect || "/");
```

这段逻辑的意思是：

```txt
如果 URL 里有 redirect，就跳到 redirect 指定页面
如果没有 redirect，就跳到首页
```

这就是比较完整的登录跳转体验。

## 十四、这个登录模块的技术栈分工

对前端小白来说，可以这样理解每个工具的职责：

```txt
Next.js Client Component
让页面具备点击、输入、提交等客户端交互能力。

Tabs
负责切换邮箱登录和手机号登录。

React Hook Form
负责收集表单数据、提交表单、管理错误状态。

Zod
负责校验邮箱、手机号和密码是否合法。

zodResolver
负责把 Zod 校验接入 React Hook Form。

login API
负责把账号密码发给后端，换取 token 和用户信息。

Zustand
负责保存 token 和用户信息，让全局都能读取登录态。

localStorage
负责保存 salt，让刷新页面后仍能读取这个本地数据。

Sonner Toast
负责显示登录成功或失败提示。

Next Router
负责登录成功后跳转页面。
```

## 十五、完整链路总结

这个登录模块可以总结成一条完整链路：

```txt
选择登录方式：邮箱 / 手机号
  ↓
输入账号和密码
  ↓
React Hook Form 收集表单数据
  ↓
Zod 校验字段是否合法
  ↓
调用 login API
  ↓
解析 token / salt / 用户信息
  ↓
写入 Zustand 和 localStorage
  ↓
Toast 提示登录成功
  ↓
跳转首页或 redirect 指定页面
```

更直白一点说：

> 用户在页面上输入邮箱或手机号和密码，React Hook Form 负责把这些数据收集起来，Zod 负责检查输入是否合法。校验通过后，前端调用 login API，把账号密码交给后端验证。后端验证成功后返回 token、salt 和用户信息，前端把 token 和用户信息写入 Zustand，把 salt 写入 localStorage，然后提示用户登录成功，并跳转到首页或原本想访问的页面。

这就是一个登录模块从表单输入到登录态保存，再到页面跳转的完整落地过程。
