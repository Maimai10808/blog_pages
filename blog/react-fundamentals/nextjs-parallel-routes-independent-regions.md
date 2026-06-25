# Next.js Parallel Routes 详解：如何让一个页面同时渲染多个独立区域

在 Next.js App Router 中，Parallel Routes，也就是**并行路由**，是一个非常重要但容易被忽略的能力。

它可以让我们在同一个页面中，同时渲染多个相互独立的路由区域。每个区域都可以拥有自己的：

- `page.tsx`
- `loading.tsx`
- `error.tsx`
- 子路由
- 默认渲染内容
- 独立加载状态
- 独立错误边界

这让复杂页面的组织方式变得更清晰，也让页面可以更好地进行并行加载和流式渲染。

典型场景包括：

- Dashboard 中同时渲染用户数据、文章数据、统计数据；
- 根据登录状态渲染不同区域；
- 在同一个页面中嵌入多个独立模块；
- 和 Intercepting Routes 配合实现 Modal；
- 多个区域拥有各自的 loading 和 error 状态。

---

## 一、为什么需要 Parallel Routes？

假设我们有一个 Dashboard 页面，页面里有三个部分：

- 主 Dashboard 内容；
- Users 区域；
- Articles 区域。

每个区域都需要异步加载数据：

```txt
Dashboard 内容：2 秒
Users 区域：3 秒
Articles 区域：5 秒
```

如果直接在一个页面或一个 layout 中写：

```tsx
export default function DashboardLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}
      <Suspense fallback={<h2>Loading users...</h2>}>
        <Users />
      </Suspense>
      <Suspense fallback={<h2>Loading articles...</h2>}>
        <Articles />
      </Suspense>
    </>
  );
}
```

这样当然可以工作。

但是随着页面复杂度增加，问题会逐渐出现：

- layout 文件会越来越臃肿；
- 每个模块的 loading、error、page 逻辑混在一起；
- 用户模块和文章模块没有清晰边界；
- 后续扩展子路由会比较麻烦。

Parallel Routes 的价值就在这里。

它可以把这些区域拆成独立的“插槽”，每个插槽像一个小路由一样独立组织。

---

## 二、Parallel Routes 的基本语法

Parallel Routes 使用 `@` 开头的文件夹来定义。

例如：

```txt
app/
  dashboard/
    layout.tsx
    page.tsx

    @users/
      page.tsx
      loading.tsx
      error.tsx

    @articles/
      page.tsx
      loading.tsx
      error.tsx
```

这里的：

```txt
@users
@articles
```

就是两个并行路由插槽。

它们不会出现在 URL 中。

也就是说：

```txt
app/dashboard/@users/page.tsx
```

不会生成：

```txt
/dashboard/@users
```

它只是 `dashboard/layout.tsx` 中的一个渲染区域。

---

## 三、创建第一个 Parallel Route

假设我们在 `dashboard` 下创建一个 `@users`：

```txt
app/
  dashboard/
    @users/
      page.tsx
```

`@users/page.tsx` 可以像普通页面一样写：

```tsx
// app/dashboard/@users/page.tsx

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function UsersPage() {
  await wait(3000);

  return <h2>Users</h2>;
}
```

再创建 `@articles`：

```txt
app/
  dashboard/
    @articles/
      page.tsx
```

```tsx
// app/dashboard/@articles/page.tsx

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function ArticlesPage() {
  await wait(5000);

  return <h2>Articles</h2>;
}
```

现在，我们有两个独立区域：用户区域和文章区域。

---

## 四、在 layout 中接收并渲染并行路由

定义了 `@users` 和 `@articles` 后，Next.js 会把它们作为 props 传给同级的 `layout.tsx`。

例如：

```tsx
// app/dashboard/layout.tsx

export default function DashboardLayout({
  children,
  users,
  articles,
}: {
  children: React.ReactNode;
  users: React.ReactNode;
  articles: React.ReactNode;
}) {
  return (
    <main>
      <nav>Dashboard Nav</nav>

      <section>{children}</section>

      <section>{users}</section>

      <section>{articles}</section>
    </main>
  );
}
```

这里的 prop 名称来自文件夹名：

```txt
@users    → users
@articles → articles
```

所以只要你创建了一个 `@xxx` 文件夹，就可以在同级 layout 中通过 `xxx` prop 接收它。

---

## 五、每个 Parallel Route 可以拥有自己的 loading

Parallel Routes 的一个重要优点是：每个插槽都可以有自己的 `loading.tsx`。

例如：

```txt
app/
  dashboard/
    @users/
      page.tsx
      loading.tsx

    @articles/
      page.tsx
      loading.tsx
```

`@users/loading.tsx`：

```tsx
// app/dashboard/@users/loading.tsx

export default function LoadingUsers() {
  return <h2>Loading users...</h2>;
}
```

`@articles/loading.tsx`：

```tsx
// app/dashboard/@articles/loading.tsx

export default function LoadingArticles() {
  return <h2>Loading articles...</h2>;
}
```

这样，当页面刷新时：

- Dashboard 主内容可以先加载；
- Users 区域显示自己的 loading；
- Articles 区域显示自己的 loading；
- 每个区域完成后独立替换成真实内容。

这比把所有异步组件都塞到一个 layout 中手写 Suspense 更清晰。

---

## 六、每个 Parallel Route 也可以拥有自己的 error

除了 loading，每个并行路由也可以有自己的错误边界。

例如：

```txt
app/
  dashboard/
    @articles/
      page.tsx
      error.tsx
```

`error.tsx` 必须是 Client Component：

```tsx
// app/dashboard/@articles/error.tsx

"use client";

export default function ArticlesError() {
  return <h2>Articles error</h2>;
}
```

如果 `@articles/page.tsx` 中抛出错误：

```tsx
// app/dashboard/@articles/page.tsx

export default async function ArticlesPage() {
  await new Promise((resolve) => setTimeout(resolve, 5000));

  throw new Error("Failed to load articles");

  return <h2>Articles</h2>;
}
```

那么错误只会影响 Articles 区域，不会把整个 Dashboard 页面都打崩。

这就是 Parallel Routes 在复杂页面中的价值：

**每个区域可以独立加载、独立失败、独立恢复。**

---

## 七、Parallel Routes 让 layout 更干净

使用 Parallel Routes 前，layout 可能是这样：

```tsx
export default function DashboardLayout({ children }) {
  return (
    <>
      <Navbar />
      {children}

      <Suspense fallback={<h2>Loading users...</h2>}>
        <Users />
      </Suspense>

      <Suspense fallback={<h2>Loading articles...</h2>}>
        <Articles />
      </Suspense>
    </>
  );
}
```

使用 Parallel Routes 后：

```tsx
export default function DashboardLayout({
  children,
  users,
  articles,
}: {
  children: React.ReactNode;
  users: React.ReactNode;
  articles: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
      {users}
      {articles}
    </>
  );
}
```

Users 的逻辑在 `@users` 中。
Articles 的逻辑在 `@articles` 中。
Dashboard 主内容在 `page.tsx` 中。

结构更清晰，也更适合长期维护。

---

## 八、条件渲染：根据状态决定显示哪个插槽

Parallel Routes 还可以配合条件判断使用。

例如，我们只想在某些情况下渲染 Articles：

```tsx
export default function DashboardLayout({
  children,
  users,
  articles,
}: {
  children: React.ReactNode;
  users: React.ReactNode;
  articles: React.ReactNode;
}) {
  const renderArticles = false;

  return (
    <>
      {children}
      {users}
      {renderArticles ? articles : null}
    </>
  );
}
```

当 `renderArticles` 为 `false` 时，Articles 区域就不会显示。

这在权限控制、功能开关、A/B 测试中都很有用。

---

## 九、登录状态判断：未登录显示登录页，已登录显示 Dashboard

Parallel Routes 另一个常见用法是条件渲染认证页面。

假设我们创建一个 `@login` 插槽：

```txt
app/
  dashboard/
    layout.tsx
    page.tsx

    @login/
      page.tsx

    @users/
      page.tsx

    @articles/
      page.tsx
```

`@login/page.tsx`：

```tsx
// app/dashboard/@login/page.tsx

export default function LoginPage() {
  return <h2>Login Page</h2>;
}
```

然后在 layout 中根据登录状态渲染：

```tsx
// app/dashboard/layout.tsx

export default function DashboardLayout({
  children,
  users,
  articles,
  login,
}: {
  children: React.ReactNode;
  users: React.ReactNode;
  articles: React.ReactNode;
  login: React.ReactNode;
}) {
  const isLoggedIn = false;

  if (!isLoggedIn) {
    return login;
  }

  return (
    <>
      {children}
      {users}
      {articles}
    </>
  );
}
```

如果未登录，就显示登录插槽。
如果已登录，就显示 Dashboard 主内容、Users 和 Articles。

真实项目中，`isLoggedIn` 通常来自 cookies、session、数据库或认证服务。

---

## 十、Parallel Routes 中的子路由

Parallel Routes 不只是能渲染一个页面，它也可以拥有自己的子路由。

假设我们有：

```txt
app/
  dashboard/
    page.tsx
    layout.tsx

    settings/
      page.tsx

    @users/
      page.tsx

    @articles/
      page.tsx
```

现在访问：

```txt
/dashboard/settings
```

很多人会以为只要创建：

```txt
dashboard/settings/page.tsx
```

就可以了。

但在 Parallel Routes 中，Next.js 不只会寻找主路由的 `settings/page.tsx`，也会尝试在每个并行插槽中寻找对应的 `settings/page.tsx`。

也就是说，它会尝试匹配：

```txt
dashboard/settings/page.tsx
dashboard/@users/settings/page.tsx
dashboard/@articles/settings/page.tsx
```

如果某个并行插槽没有对应的 `settings` 页面，就可能出现 404，或者需要通过默认页面处理。

---

## 十一、给每个插槽创建 settings 页面

完整结构可以这样写：

```txt
app/
  dashboard/
    page.tsx
    settings/
      page.tsx

    @users/
      page.tsx
      settings/
        page.tsx

    @articles/
      page.tsx
      settings/
        page.tsx
```

主 Dashboard settings：

```tsx
// app/dashboard/settings/page.tsx

export default function DashboardSettingsPage() {
  return <h2>Dashboard Settings</h2>;
}
```

Users settings：

```tsx
// app/dashboard/@users/settings/page.tsx

export default function UsersSettingsPage() {
  return <h2>Users Settings</h2>;
}
```

Articles settings：

```tsx
// app/dashboard/@articles/settings/page.tsx

export default function ArticlesSettingsPage() {
  return <h2>Articles Settings</h2>;
}
```

这样访问 `/dashboard/settings` 时，三个区域都能渲染各自的 settings 内容。

---

## 十二、如果某个插槽没有对应路由怎么办？

假设 `@articles` 没有 settings 页面：

```txt
app/
  dashboard/
    settings/
      page.tsx

    @users/
      settings/
        page.tsx

    @articles/
      page.tsx
```

这时访问 `/dashboard/settings`，`@articles` 插槽找不到对应的 settings 页面。

为了解决这个问题，可以给 `@articles` 添加：

```txt
default.tsx
```

结构：

```txt
app/
  dashboard/
    @articles/
      page.tsx
      default.tsx
```

代码：

```tsx
// app/dashboard/@articles/default.tsx

export default function ArticlesDefaultPage() {
  return <h2>Articles default</h2>;
}
```

当直接访问 `/dashboard/settings`，并且 `@articles` 找不到对应页面时，就可以渲染 `default.tsx`。

---

## 十三、`default.tsx` 的行为需要特别注意

`default.tsx` 的行为有一个容易混淆的地方。

如果你是**直接访问**某个 URL，例如刷新页面或在地址栏输入：

```txt
/dashboard/settings
```

某个并行插槽找不到匹配页面时，会使用 `default.tsx`。

但是，如果你是通过 Next.js 的客户端导航从：

```txt
/dashboard
```

跳转到：

```txt
/dashboard/settings
```

并且某个插槽没有对应的 settings 页面，那么 Next.js 可能会保留该插槽之前的内容。

例如：

- `/dashboard` 时，`@articles` 显示 Articles；
- 点击进入 `/dashboard/settings`；
- `@articles/settings/page.tsx` 不存在；
- Next.js 可能继续显示之前的 Articles 内容，而不是 default。

这个行为的原因是：客户端导航时，Next.js 会尽量保留当前并行路由状态。

如果你不想保留旧内容，而是想每次都显示一个固定兜底页面，可以使用 catch-all 路由。

---

## 十四、使用 catch-all 作为更强的兜底

在 `@articles` 中创建 catch-all 路由：

```txt
app/
  dashboard/
    @articles/
      [...catchAll]/
        page.tsx
```

注意这里是三个点：

```txt
[...catchAll]
```

代码：

```tsx
// app/dashboard/@articles/[...catchAll]/page.tsx

export default function ArticlesCatchAllPage() {
  return <h2>Articles catch all</h2>;
}
```

这样无论你访问：

```txt
/dashboard/settings
/dashboard/anything
/dashboard/a/b/c
```

只要 `@articles` 没有更具体的匹配页面，就会进入这个 catch-all 页面。

相比 `default.tsx`，catch-all 的行为更稳定：

- 直接访问会显示 catch-all；
- 客户端导航也会显示 catch-all；
- 不会继续保留旧页面内容。

---

## 十五、`default.tsx` 和 catch-all 的区别

可以简单这样理解：

### `default.tsx`

适合处理“直接访问时找不到当前插槽状态”的兜底。

它常用于并行路由中没有激活内容时，提供默认 UI。

例如：

```tsx
export default function DefaultPage() {
  return null;
}
```

或者：

```tsx
export default function DefaultPage() {
  return <h2>Default content</h2>;
}
```

### `[...catchAll]/page.tsx`

适合处理“任何未匹配路径都显示一个固定页面”。

它比 `default.tsx` 更主动，会接住未匹配的路径。

如果你希望某个并行插槽在没有对应子路由时总是显示固定兜底内容，使用 catch-all 更合适。

---

## 十六、开发环境中的常见问题

Parallel Routes 在开发环境中有时会出现一些缓存或热更新不及时的问题。

例如：

- 新建 `@users` 后 layout 没有识别；
- 新增子路由后页面显示异常；
- 本地 dev 模式和生产模式行为不完全一致；
- 需要刷新或重启服务才正常。

常见解决方式：

```bash
npm run dev
```

重启开发服务器。

或者测试生产构建：

```bash
npm run build
npm run start
```

如果行为在开发环境异常，但生产环境正常，有可能是 Next.js 开发模式下的缓存或 HMR 问题。

尤其是 Parallel Routes、Intercepting Routes 这类较复杂的 App Router 特性，开发阶段遇到缓存问题并不少见。

---

## 十七、Parallel Routes 适合什么场景？

Parallel Routes 适合那些“一个页面中有多个独立区域”的场景。

### 1. Dashboard

例如：

```txt
主内容区域
用户统计区域
文章统计区域
订单统计区域
```

每个区域可以独立加载、独立报错、独立维护。

### 2. 认证布局

未登录时显示登录区域，已登录时显示应用区域。

### 3. 复杂管理后台

一个后台页面中可能同时显示：

- 列表；
- 详情；
- 统计；
- 筛选；
- 通知；
- 活动记录。

这些区域都可以拆成独立插槽。

### 4. Modal 场景

Parallel Routes 经常和 Intercepting Routes 一起使用。

例如：

```txt
@modal
```

专门作为弹窗插槽。

### 5. 多区域设置页

例如 `/dashboard/settings` 中，不同区域都有自己的设置面板。

---

## 十八、不适合使用 Parallel Routes 的场景

如果页面结构很简单，没必要强行使用 Parallel Routes。

例如：

- 一个普通详情页；
- 一个简单表单页；
- 一个只有少量组件的页面；
- 没有独立 loading/error 需求；
- 不需要条件渲染多个路由区域。

这些场景直接用普通组件和 Suspense 就足够了。

Parallel Routes 适合复杂页面。
简单页面强行使用，反而会增加理解成本。

---

## 十九、最佳实践总结

使用 Parallel Routes 时，可以遵循下面几条原则。

### 1. 用 `@slot` 定义并行插槽

例如：

```txt
@users
@articles
@modal
@login
```

### 2. 在同级 layout 中接收插槽

```tsx
export default function Layout({
  children,
  users,
  articles,
}: {
  children: React.ReactNode;
  users: React.ReactNode;
  articles: React.ReactNode;
}) {
  return (
    <>
      {children}
      {users}
      {articles}
    </>
  );
}
```

### 3. 每个插槽可以有自己的 `page.tsx`

这让每个区域可以像独立页面一样组织。

### 4. 复杂区域添加自己的 `loading.tsx` 和 `error.tsx`

这样可以做到局部加载和局部错误处理。

### 5. 子路由要考虑每个插槽是否都有匹配页面

访问 `/dashboard/settings` 时，不只是主路由需要 settings，相关并行插槽也可能需要 settings。

### 6. 没有匹配页面时使用 `default.tsx`

适合提供默认内容或返回 `null`。

### 7. 想稳定兜底所有未匹配路径时使用 catch-all

例如：

```txt
[...catchAll]/page.tsx
```

### 8. 新建并行路由后如不生效，重启开发服务器

这是开发阶段常见问题。

---

## 二十、结论

Parallel Routes 是 Next.js App Router 中非常强大的高级能力。

它让一个页面不再只能有一个主内容区域，而是可以同时拥有多个独立的路由插槽。每个插槽都可以独立加载、独立报错、独立定义子路由。

它最适合复杂页面，比如 Dashboard、管理后台、认证布局、Modal 插槽、多区域设置页等。

可以把它理解成：

```txt
普通路由：一个 URL 对应一个页面主体
Parallel Routes：一个 URL 可以同时驱动多个独立页面区域
```

一句话总结：

**Parallel Routes 让复杂页面拆分得更清楚，也让多个区域可以真正并行渲染和独立维护。**
