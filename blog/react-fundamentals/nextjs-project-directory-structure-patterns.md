# Next.js 项目目录结构怎么设计？从入门到进阶的三种组织方式

Next.js 进入 App Router 时代之后，很多开发者都会遇到一个问题：

**项目目录到底应该怎么组织？**

以前使用 Pages Router 时，`pages` 目录下的文件会直接变成路由。
而在 App Router 中，路由由 `app` 目录中的文件夹和 `page.tsx` 决定。只有当某个目录下存在 `page.tsx` 时，它才会成为一个可访问页面。

这让 Next.js 的目录组织方式变得更灵活，但也让很多人不知道应该把组件、hooks、server actions、数据库配置、第三方服务等代码放在哪里。

需要先明确一点：

**目录结构没有唯一标准。**

好的目录结构不是为了让代码运行得更快，而是为了让项目更清晰、更好维护、更方便团队协作。
所以不要机械复制某一种结构，而应该根据项目规模、团队习惯和业务复杂度来调整。

本文将介绍三种 Next.js 项目目录结构：

- 入门项目结构；
- 中型项目结构；
- 进阶项目结构。

---

## 一、目录结构设计的核心原则

在设计 Next.js 项目结构之前，可以先记住几条原则。

第一，目录结构是为了提高开发效率，而不是为了炫技。
如果项目很小，就没有必要拆出过多层级。

第二，`app` 目录主要承担路由职责。
虽然你可以把很多组件都放进 `app` 中，但随着项目变大，把通用组件、hooks、工具函数拆出去会更清晰。

第三，和某个页面强绑定的内容可以就近放置。
例如某个页面专属的组件、测试文件、样式文件，可以放在对应路由目录下。

第四，跨页面复用的内容应该放到全局目录。
例如通用 Button、Modal、Navbar、全局 hooks、API 封装、数据库配置等。

第五，不要过度抽象。
目录结构应该随着业务增长逐步演进，而不是一开始就搭一个很重的架构。

---

## 二、结构一：适合新手的小型项目结构

对于刚开始使用 Next.js 的项目，最简单的方式是尽量保留 `create-next-app` 默认结构。

示例：

```txt id="riw7jw"
src/
  app/
    layout.tsx
    page.tsx
    globals.css

    home/
      page.tsx

    contact/
      page.tsx

    profile/
      page.tsx

    components/
      Navbar.tsx
      Footer.tsx
      Button.tsx
```

这种结构的特点是：

所有主要代码都放在 `app` 目录下。
页面路由也放在 `app` 目录下。
简单组件也可以先放在 `app/components` 中。

在 App Router 中，路由不是由文件名直接决定的，而是由目录中的 `page.tsx` 决定。

例如：

```txt id="26njht"
app/contact/page.tsx
```

会生成：

```txt id="mny2jc"
/contact
```

而：

```txt id="2zwqjk"
app/components/Button.tsx
```

不会自动变成路由，因为它不是 `page.tsx`。

这比旧版 Pages Router 更灵活，也更不容易误创建路由。

---

## 三、入门结构适合什么项目？

这种结构适合：

- 个人练习项目；
- 小型官网；
- 简单后台；
- Demo 项目；
- 页面数量不多的应用；
- 刚开始学习 Next.js 的开发者。

它的优点是简单直观，不需要一开始就思考太多架构问题。

缺点是当组件、业务逻辑、接口请求越来越多时，`app` 目录会变得越来越拥挤。

例如你可能会慢慢出现：

```txt id="w1p7d6"
app/
  components/
  hooks/
  utils/
  constants/
  services/
  contexts/
```

这时就可以考虑升级到中型项目结构。

---

## 四、关于 Server Components 和 Client Components

Next.js App Router 中，默认组件都是 Server Component。

如果组件需要使用 React hooks、浏览器 API、事件监听、DOM 操作等客户端能力，就需要在文件顶部添加：

```tsx id="xp8i5t"
"use client";
```

例如：

```tsx id="lzbnxq"
"use client";

import { useState } from "react";

export default function Counter() {
  const [count, setCount] = useState(0);

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

在入门项目中，把这些 Client Components 放在 `app/components` 中也可以。

但项目变大后，更推荐把通用组件移到 `src/components` 中，避免 `app` 目录过于混乱。

---

## 五、结构二：适合中型项目的目录结构

当项目开始变复杂时，可以把路由和通用代码分开。

示例：

```txt id="s2td92"
src/
  app/
    layout.tsx
    page.tsx
    globals.css

    api/
      users/
        route.ts
      products/
        route.ts

    (routes)/
      home/
        page.tsx
      about/
        page.tsx
      contact/
        page.tsx
      dashboard/
        page.tsx
      products/
        page.tsx
        [id]/
          page.tsx

    auth/
      login/
        page.tsx
      register/
        page.tsx

  components/
    ui/
      Button.tsx
      Modal.tsx
      Input.tsx
    layout/
      Navbar.tsx
      Sidebar.tsx
      Footer.tsx

  contexts/
    AuthContext.tsx

  hooks/
    useUser.ts
    useDebounce.ts

  lib/
    utils.ts
    constants.ts
```

这种结构相比入门结构，有几个明显变化。

第一，`components` 被移到 `src/components`。
这样可以明确区分“路由页面”和“通用组件”。

第二，新增 `contexts`。
如果项目有登录状态、主题状态、全局弹窗状态等，可以放在这里。

第三，新增 `hooks`。
跨页面复用的 hooks 可以集中管理。

第四，`app/api` 用于 API Route。
如果你仍然使用 Route Handler 处理接口，可以把相关接口放在 `app/api` 下。

第五，可以使用 Route Groups 组织路由。

---

## 六、Route Groups：用来分组，但不影响 URL

Next.js App Router 支持 Route Groups，也就是用括号包裹文件夹名：

```txt id="rda2oj"
app/
  (routes)/
    about/
      page.tsx
```

这里的 `(routes)` 不会出现在 URL 中。

所以最终访问路径仍然是：

```txt id="e1vg3b"
/about
```

Route Groups 的价值是：
它可以帮助你在文件结构中分组，而不改变真实路由路径。

例如：

```txt id="b5mssm"
app/
  (marketing)/
    page.tsx
    about/
      page.tsx
    pricing/
      page.tsx

  (dashboard)/
    dashboard/
      page.tsx
    settings/
      page.tsx
```

这样可以把营销页面和后台页面分开，但 URL 不会带上 `(marketing)` 或 `(dashboard)`。

---

## 七、页面内部的就近组织

对于某个复杂页面，可以把专属代码放在对应页面目录下。

例如产品页：

```txt id="qyc43v"
app/
  (routes)/
    products/
      page.tsx
      loading.tsx
      error.tsx

      _components/
        ProductCard.tsx
        ProductFilters.tsx
        ProductList.tsx

      _hooks/
        useProductFilters.ts

      _tests/
        ProductList.test.tsx

      [id]/
        page.tsx
```

这种方式有一个好处：

只服务于 `products` 页面的一切内容，都放在 `products` 目录附近。

当别人维护产品页时，不需要去全局目录中到处找相关代码。

注意这里使用了 `_components`、`_hooks` 这类私有文件夹写法。
以下划线开头的文件夹可以表达“这不是路由，只是当前模块内部使用的代码”。

---

## 八、结构三：适合大型项目的进阶目录结构

对于业务更复杂的项目，可以进一步拆分 server actions、数据库、第三方服务、配置等。

示例：

```txt id="ouxbgr"
src/
  app/
    layout.tsx
    page.tsx
    globals.css

    (auth)/
      login/
        page.tsx
      register/
        page.tsx

    (dashboard)/
      dashboard/
        page.tsx
      settings/
        page.tsx

    (store)/
      products/
        page.tsx
        [id]/
          page.tsx
      cart/
        page.tsx
      checkout/
        page.tsx

    api/
      webhooks/
        stripe/
          route.ts

  components/
    ui/
      Button.tsx
      Dialog.tsx
      Input.tsx
      Select.tsx
    layout/
      Navbar.tsx
      Sidebar.tsx
    shared/
      EmptyState.tsx
      Pagination.tsx

  server-actions/
    user/
      updateUser.ts
      deleteUser.ts
    products/
      createProduct.ts
      updateProduct.ts
      deleteProduct.ts
    store/
      createOrder.ts
      updateCart.ts

  db/
    index.ts
    schema.ts
    queries/
      user.ts
      product.ts
      order.ts

  vendor/
    stripe/
      client.ts
      webhooks.ts
    github/
      client.ts
    resend/
      client.ts

  hooks/
    useDebounce.ts
    useMediaQuery.ts

  contexts/
    AuthContext.tsx
    ThemeContext.tsx

  config/
    site.ts
    navigation.ts
    env.ts

  lib/
    utils.ts
    validators.ts
    formatters.ts

  types/
    user.ts
    product.ts
    order.ts
```

这种结构适合大型业务系统、SaaS、商城、后台管理系统等。

它的重点是：把不同类型的代码拆开，让每个目录有清晰职责。

---

## 九、`server-actions` 应该放在哪里？

Server Actions 是 Next.js App Router 中非常重要的能力。

你可以把 Server Actions 直接写在组件附近，也可以集中放在一个目录中。

对于小项目，写在页面附近没问题：

```tsx id="f47g04"
async function createPost(formData: FormData) {
  "use server";

  // create post
}
```

但在大型项目中，更推荐集中管理：

```txt id="o5w42p"
server-actions/
  user/
    updateUser.ts
  products/
    createProduct.ts
  store/
    createOrder.ts
```

例如：

```ts id="bry7wl"
// src/server-actions/products/createProduct.ts

"use server";

export async function createProduct(formData: FormData) {
  // validate data
  // write to database
  // revalidate path
}
```

这样可以避免页面组件里混入大量业务逻辑。

页面只负责渲染和调用 action，具体业务放在 `server-actions` 中。

---

## 十、`vendor` 目录放什么？

`vendor` 通常用于存放第三方服务相关代码。

例如：

```txt id="psgjio"
vendor/
  stripe/
    client.ts
    webhooks.ts
  github/
    client.ts
  resend/
    client.ts
  clerk/
    auth.ts
```

适合放：

- Stripe 支付；
- GitHub API；
- 邮件服务；
- 第三方登录；
- 对象存储；
- 数据分析 SDK；
- CRM 或 ERP API。

这样做的好处是，第三方平台的接入逻辑不会散落在项目各处。

例如 Stripe 的初始化可以放在：

```ts id="8b9j46"
// src/vendor/stripe/client.ts

import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

以后如果要调整 Stripe 配置，只需要改这个目录。

---

## 十一、`db` 和 `config` 为什么分开？

在大型项目中，数据库配置和项目配置最好分开。

`db` 更关注数据库本身：

```txt id="8l9qqd"
db/
  index.ts
  schema.ts
  queries/
    user.ts
    product.ts
```

适合放：

- 数据库连接；
- ORM schema；
- 数据库查询函数；
- migration 相关封装；
- repository/query 层。

而 `config` 更关注项目级配置：

```txt id="rnhq12"
config/
  site.ts
  navigation.ts
  env.ts
```

适合放：

- 站点名称；
- 导航菜单；
- 环境变量校验；
- 业务开关；
- 常量配置。

例如：

```ts id="sc0jmw"
// src/config/site.ts

export const siteConfig = {
  name: "My App",
  description: "A modern Next.js application",
  url: "https://example.com",
};
```

两者分开之后，项目职责会更清晰。

---

## 十二、私有文件夹：用 `_` 标记非路由代码

在 App Router 中，你可能希望在某个路由目录下放组件，但又不希望它被误解为路由结构的一部分。

这时可以使用私有文件夹：

```txt id="il965p"
app/
  login/
    page.tsx
    _components/
      LoginForm.tsx
      SocialLogin.tsx
```

`_components` 表示这个目录只是内部组件，不是路由。

类似地，也可以有：

```txt id="gvqc18"
_hooks/
_lib/
_utils/
_tests/
```

这种方式特别适合页面专属代码的就近维护。

---

## 十三、三种结构应该怎么选？

### 1. 新手或小项目

推荐结构：

```txt id="9h6rqx"
src/
  app/
    page.tsx
    layout.tsx
    components/
```

特点是简单直接。

不用一开始拆太多目录，先把项目做出来更重要。

---

### 2. 中型项目

推荐结构：

```txt id="bu9gui"
src/
  app/
  components/
  hooks/
  contexts/
  lib/
```

适合已经有多个页面、多个复用组件和部分全局状态的项目。

这时把通用内容从 `app` 中拆出去，会更清晰。

---

### 3. 大型项目

推荐结构：

```txt id="ps1k7m"
src/
  app/
  components/
  server-actions/
  db/
  vendor/
  hooks/
  contexts/
  config/
  lib/
  types/
```

适合复杂业务系统。

它强调按职责拆分：

- 页面归页面；
- 服务端动作归服务端动作；
- 数据库归数据库；
- 第三方服务归第三方服务；
- 通用 UI 归通用 UI。

---

## 十四、不要为了“高级”而复杂化

目录结构不是越复杂越好。

一个只有 5 个页面的小项目，如果一开始就拆成：

```txt id="tkz3o3"
server-actions/
vendor/
repositories/
services/
features/
entities/
shared/
modules/
```

反而会降低开发效率。

正确做法应该是：

项目小的时候保持简单。
当某类代码变多时，再把它拆出去。

例如：

最开始只有一个按钮组件，可以放在：

```txt id="wmn3p7"
app/components/Button.tsx
```

后来组件越来越多，再迁移到：

```txt id="dpx731"
src/components/ui/Button.tsx
```

再后来业务越来越复杂，再拆出：

```txt id="r30mkd"
components/
  ui/
  layout/
  shared/
```

目录结构应该服务于项目，而不是让项目迁就目录结构。

---

## 十五、推荐实践总结

在 Next.js App Router 项目中，可以遵循下面几条实践。

### 1. `app` 目录优先放路由相关内容

包括：

- `page.tsx`；
- `layout.tsx`；
- `loading.tsx`；
- `error.tsx`；
- `not-found.tsx`；
- Route Handler；
- 路由专属组件。

### 2. 通用组件放在 `src/components`

跨页面复用的组件不要散落在各个页面里。

### 3. 页面专属组件就近放置

复杂页面可以使用：

```txt id="ylvyil"
_components/
_hooks/
_lib/
```

### 4. Server Actions 可以按业务模块拆分

例如：

```txt id="fgl15o"
server-actions/user
server-actions/products
server-actions/orders
```

### 5. 第三方服务统一放到 `vendor`

避免 Stripe、GitHub、邮件服务等代码散落各处。

### 6. 数据库相关内容放到 `db`

包括连接、schema、查询封装等。

### 7. 不要盲目复制别人的结构

根据项目规模和团队习惯调整才是最重要的。

---

## 十六、结论

Next.js App Router 带来了更灵活的目录组织方式。

相比旧版 Pages Router，App Router 不再是“文件即路由”，而是通过 `page.tsx` 明确声明路由页面。
这让我们可以更自由地在路由目录中放置组件、hooks、测试文件和工具函数。

对于小项目，保持简单就好。
对于中型项目，可以把组件、hooks、contexts 等通用内容拆到 `app` 外。
对于大型项目，可以进一步拆分 server actions、数据库、第三方服务、配置和类型定义。

最终目标不是追求某种“标准答案”，而是让项目更容易理解、更容易扩展、更容易维护。

一句话总结：

**小项目少拆分，中型项目按通用能力拆分，大型项目按业务职责和技术职责拆分。**
