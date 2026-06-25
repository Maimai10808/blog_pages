# Next.js 16 中 middleware.ts 改为 proxy.ts：认证逻辑到底应该放在哪里？

Next.js 16 中有一个很重要的变化：原来的 `middleware.ts` 文件名被标记为 deprecated，现在推荐改成 `proxy.ts`。

这并不是简单的文件改名。更准确地说，这是 Next.js 官方在提醒开发者：以前大家理解的 “middleware”，并不完全等同于 Express、NestJS 或其他后端框架中的 middleware。

在 Next.js 中，这个文件更适合做轻量级的请求代理、重写、重定向和路由预处理，而不是承载复杂业务逻辑。

尤其是认证逻辑，很多人习惯放在 middleware 里。但在 Next.js 16 之后，我们更应该重新思考：

**认证到底应该放在 proxy.ts 里，还是应该放在数据访问层？**

---

## 一、middleware.ts 为什么改成 proxy.ts？

在旧版本 Next.js 中，我们经常会创建：

```ts
middleware.ts;
```

然后导出：

```ts
export function middleware(request: NextRequest) {
  // ...
}
```

但在 Next.js 16 中，文件名推荐改为：

```ts
proxy.ts;
```

同时导出的函数也要改成：

```ts
export function proxy(request: NextRequest) {
  // ...
}
```

原来的写法可能会出现类似警告：

```text
The middleware file convention is deprecated. Please use proxy.
```

这次改名的核心目的，是让开发者意识到：

```text
Next.js 的 middleware / proxy 不应该被当成传统后端中间件随意使用
```

它更像是一个运行在渲染逻辑之前的轻量请求处理层，适合快速完成 redirect、rewrite、URL 修改等任务。

---

## 二、proxy.ts 适合做什么？

`proxy.ts` 更适合处理轻量、快速、边缘化的任务。

例如：

```text
URL 重写
页面重定向
多语言路由处理
A/B 测试分流
多租户路由识别
根据路径快速判断跳转
给请求添加或删除 header
```

比如多语言场景：

```text
用户访问 /posts
根据地区重写为 /en/posts 或 /zh/posts
```

再比如 A/B 测试：

```text
50% 用户进入 /landing-a
50% 用户进入 /landing-b
```

再比如多租户系统：

```text
acme.example.com/dashboard
根据 acme 识别 tenant，然后 rewrite 到内部路径
```

这些逻辑都有一个共同点：

```text
快
轻
不依赖复杂 IO
不做大量计算
不直接访问数据库
```

这正是 `proxy.ts` 最适合的使用场景。

---

## 三、proxy.ts 不适合做什么？

通常不建议在 `proxy.ts` 中做重型逻辑。

例如：

```text
复杂业务计算
数据库查询
第三方接口请求
耗时 IO 操作
复杂权限判断
大规模数据处理
```

尤其是数据库请求。

如果你在 proxy 中做数据库查询，例如：

```ts
export async function proxy(request: NextRequest) {
  const session = await db.session.findUnique({
    where: {
      token: "...",
    },
  });

  // ...
}
```

这就不太理想。

因为 proxy 可能运行在更靠近边缘网络的位置，也可能被设计为轻量快速执行。把数据库访问、网络请求这类重操作放进去，容易带来性能问题，也会让请求链路变复杂。

---

## 四、认证可以放在 proxy.ts 里吗？

这是最容易产生争议的问题。

很多人会问：

> 如果不在 proxy.ts 里做认证，那我怎么保护页面？

过去常见做法是，在 middleware 中判断用户是否登录。

例如：

```ts
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
```

看起来很合理。

用户没登录，就跳转登录页。

用户登录了，就放行。

但这种做法有一个非常容易被忽略的问题：**你保护的是页面路径，不一定保护了真正的数据访问。**

---

## 五、真正需要保护的是数据，不只是页面

假设我们有一个首页：

```tsx
export default async function HomePage() {
  const posts = await db.post.findMany();

  return (
    <main>
      {posts.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </main>
  );
}
```

我们只希望登录用户才能查看这些文章。

于是我们在 `proxy.ts` 中保护首页：

```ts
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const pathname = request.nextUrl.pathname;

  if (pathname === "/" && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
```

现在访问首页时，确实会被保护。

但问题来了。

在 React / Next.js 项目中，我们经常会把页面拆成组件。

例如把文章列表拆出去：

```tsx
async function PostList() {
  const posts = await db.post.findMany();

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  );
}
```

首页只负责使用它：

```tsx
export default function HomePage() {
  return <PostList />;
}
```

到目前为止还没问题。

因为 `PostList` 仍然只出现在首页，而首页已经被 `proxy.ts` 保护了。

但是，随着项目变大，某个开发者可能会在另一个页面复用它：

```tsx
export default function OtherPage() {
  return <PostList />;
}
```

路径是：

```text
/other
```

如果 `proxy.ts` 只保护了 `/`，没有保护 `/other`，那么用户即使没有登录，也可以通过 `/other` 看到文章数据。

这就是问题所在。

---

## 六、proxy 认证的核心风险：matcher 可能和数据访问位置不同步

如果你依赖 `proxy.ts` 的 `matcher` 或路径判断来保护数据，你就必须始终确保：

```text
所有会访问敏感数据的页面，都被正确加入 matcher 或路径判断
```

这在小项目中也许还好。

但在大型项目中，非常容易出错。

原因包括：

```text
组件会被复用
数据请求可能被移动到子组件
页面越来越多
团队成员可能不了解某个组件内部会请求敏感数据
新增页面时忘记同步更新 proxy matcher
重构后数据访问位置变化，但权限判断没有跟着变化
```

所以问题不是 `proxy.ts` 不能跳转。

问题是：

```text
proxy.ts 保护的是路径，而敏感数据可能随着组件复用出现在其他路径中
```

这会导致认证边界和数据访问边界不一致。

而安全认证最怕的就是这种不一致。

---

## 七、把认证放在页面组件里可以吗？

有人可能会说：

> 那我不放在 proxy.ts 里，我直接在页面组件里判断登录不就行了吗？

例如：

```tsx
import { redirect } from "next/navigation";

export default async function HomePage() {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return <PostList />;
}
```

这比 proxy 更靠近页面，看起来也合理。

但它仍然有类似问题。

如果真正获取数据的是 `PostList`，而 `PostList` 被复用到别的页面，别的页面忘记加认证判断，数据仍然可能泄露。

也就是说，页面级认证仍然依赖开发者记得在每个页面加判断。

它保护的是页面入口，而不是数据访问本身。

---

## 八、更稳健的方案：Data Access Layer

更推荐的方式，是建立一个 **Data Access Layer**，简称 DAL，中文可以理解为 **数据访问层**。

它的核心思想是：

```text
应用中所有访问数据库的逻辑，都集中放在一个专门的地方
认证和授权检查，直接和数据访问函数绑定在一起
```

例如创建：

```text
src/data-access/posts.ts
```

然后定义：

```ts
export async function getAllPosts() {
  const isAuthenticated = await checkAuth();

  if (!isAuthenticated) {
    redirect("/login");
  }

  return db.post.findMany();
}
```

之后在组件中不再直接写：

```ts
db.post.findMany();
```

而是统一写：

```tsx
import { getAllPosts } from "@/data-access/posts";

async function PostList() {
  const posts = await getAllPosts();

  return (
    <div>
      {posts.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  );
}
```

这样，无论 `PostList` 被放到首页，还是 `/other` 页面，只要它调用的是 `getAllPosts()`，认证检查就一定会执行。

---

## 九、为什么 DAL 更安全？

DAL 的关键优势是：**认证检查跟数据访问绑定在一起。**

也就是说，安全边界不是页面路径，而是数据函数。

例如：

```ts
export async function getAllPosts() {
  await requireUser();

  return db.post.findMany();
}
```

这意味着：

```text
任何地方想拿 posts，都必须经过 getAllPosts
任何调用 getAllPosts 的地方，都会自动执行 requireUser
组件被复用到哪里都没关系
页面路径怎么变化也没关系
proxy matcher 忘记更新也不影响这层数据保护
```

这比在 proxy 中维护一堆路径更稳健。

---

## 十、一个更完整的 DAL 示例

可以把认证逻辑抽成一个工具函数：

```ts
import { redirect } from "next/navigation";

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
```

然后在数据访问层中使用：

```ts
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function getAllPosts() {
  await requireUser();

  return db.post.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getPostById(id: string) {
  await requireUser();

  return db.post.findUnique({
    where: {
      id,
    },
  });
}

export async function createPost(input: CreatePostInput) {
  const user = await requireUser();

  return db.post.create({
    data: {
      ...input,
      authorId: user.id,
    },
  });
}
```

这样每个敏感数据操作都自带认证逻辑：

```text
获取文章列表：需要登录
获取文章详情：需要登录
创建文章：需要登录
删除文章：需要登录
```

后续页面只管调用函数：

```tsx
const posts = await getAllPosts();
```

不需要每个页面都重复写：

```tsx
const user = await checkAuth();
if (!user) redirect("/login");
```

---

## 十一、认证和授权都应该靠近数据访问

认证是判断：

```text
你是谁？
你是否登录？
```

授权是判断：

```text
你有没有权限做这件事？
你能不能访问这条数据？
```

DAL 不仅适合做认证，也适合做授权。

例如删除文章：

```ts
export async function deletePost(postId: string) {
  const user = await requireUser();

  const post = await db.post.findUnique({
    where: {
      id: postId,
    },
  });

  if (!post) {
    throw new Error("文章不存在");
  }

  if (post.authorId !== user.id && user.role !== "admin") {
    throw new Error("无权限删除该文章");
  }

  return db.post.delete({
    where: {
      id: postId,
    },
  });
}
```

这样权限判断和数据操作绑定在一起。

比在页面里散落一堆判断更可靠。

---

## 十二、proxy.ts 是否完全不能做认证？

不是。

`proxy.ts` 仍然可以做一些轻量的认证相关逻辑。

但它不应该成为唯一的安全边界。

比较合理的定位是：

```text
DAL：核心认证和授权
proxy.ts：轻量预检查和用户体验优化
```

例如：

```ts
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
```

这种做法可以用于：

```text
未登录时提前跳转，减少页面加载
管理员路径做粗粒度拦截
根据 cookie 快速判断是否需要重定向
优化用户体验
```

但真正的数据访问函数里仍然应该有：

```ts
await requireUser();
```

也就是说：

```text
proxy 可以做第一层门卫
DAL 才是最终门锁
```

---

## 十三、proxy.ts 中使用 JWT 判断可以吗？

如果你使用的是 JWT，理论上 token 中已经包含了一些用户信息或权限信息，不一定需要查数据库。

于是有人会认为：

```text
既然不用数据库请求，那在 proxy.ts 中验证 JWT 应该可以吧？
```

确实，相比数据库 session，JWT 在 proxy 中验证会更轻量。

但是仍然不建议把核心认证完全放在 proxy 中。

原因还是一样：

```text
proxy 保护的是路径
数据访问可能出现在未被 matcher 覆盖的路径
组件复用可能造成数据泄露
```

所以即使是 JWT，也更推荐：

```text
proxy 做轻量跳转
数据访问层做最终认证
```

---

## 十四、例外场景一：想保留静态渲染

DAL 方案有一个需要注意的点。

如果你在 Server Component 或数据访问函数中读取 cookies、headers，或者调用认证 SDK 的 server session，页面通常会变成动态渲染。

例如：

```ts
import { cookies } from "next/headers";

export async function requireUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token");

  // ...
}
```

这会让页面依赖每个请求的用户信息，因此很可能无法静态生成。

对于很多登录后数据，这其实没问题。

因为用户数据通常本来就是个性化的，静态渲染意义不大。

但有些场景比较特殊。

例如：

```text
博客文章内容本身是静态的
但你只想让登录用户访问
又希望页面仍然可以在构建时静态生成并放到 CDN
```

这种情况下，把认证前置到 `proxy.ts` 中，可能有助于保留页面静态渲染。

也就是说：

```text
proxy.ts 负责拦截未登录用户
页面本身不读取 cookies / headers
页面可以保持静态渲染
```

但这种做法要非常小心。

因为你又回到了 matcher 维护的问题。

必须确保所有访问这些静态受保护内容的路径，都被正确纳入 proxy 判断。

所以这是一个例外场景，不是默认推荐方案。

---

## 十五、例外场景二：乐观式认证检查

另一个合理用法是，在 `proxy.ts` 里做一层“乐观式检查”。

例如：

```text
如果没有 token，直接跳转登录页
如果有 token，先放行
真正权限仍然在数据访问层判断
```

这样做的好处是：

```text
未登录用户可以更早被重定向
减少页面和数据请求开销
用户体验更好
```

但它不是最终安全保障。

最终保障仍然应该在 DAL 中。

例如：

```ts
export async function getAdminData() {
  const user = await requireUser();

  if (user.role !== "admin") {
    throw new Error("无管理员权限");
  }

  return db.adminData.findMany();
}
```

同时 proxy 里可以做：

```ts
export function proxy(request: NextRequest) {
  const token = request.cookies.get("token")?.value;

  if (request.nextUrl.pathname.startsWith("/admin") && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}
```

这两者并不冲突。

---

## 十六、推荐的项目结构

一个比较稳健的 Next.js 项目，可以这样组织：

```text
src/
  app/
    page.tsx
    other/page.tsx
    dashboard/page.tsx
  data-access/
    posts.ts
    users.ts
    orders.ts
  lib/
    auth.ts
    db.ts
  proxy.ts
```

其中：

```text
data-access/posts.ts：所有文章相关数据库访问
data-access/users.ts：所有用户相关数据库访问
data-access/orders.ts：所有订单相关数据库访问
lib/auth.ts：认证工具函数，比如 requireUser、getCurrentUser
proxy.ts：轻量路由重定向和 rewrite
```

页面组件中不要直接访问数据库：

```tsx
// 不推荐
const posts = await db.post.findMany();
```

而是通过 DAL：

```tsx
// 推荐
const posts = await getAllPosts();
```

这样更容易保证权限逻辑不会漏掉。

---

## 十七、如何避免团队成员绕过 DAL？

在真实团队项目中，仅靠约定还不够。

可以用一些工程手段强化规则。

例如：

```text
只允许 data-access 目录 import db / prisma
其他目录直接 import db 时触发 lint warning
Code Review 中检查数据库访问是否经过 DAL
把所有敏感操作封装成明确的业务函数
不要把 ORM 实例随意暴露给页面组件
```

比如：

```text
getAllPosts()
getPostById()
createPost()
deletePost()
getUserOrders()
getCurrentUserAssets()
```

这些函数应该天然包含对应的认证和授权逻辑。

---

## 十八、proxy.ts、页面认证、DAL 对比

### 1. proxy.ts 认证

优点：

```text
可以提前重定向
适合轻量判断
可能保留页面静态渲染
对用户体验友好
```

缺点：

```text
依赖路径 matcher
容易漏掉复用组件所在页面
不适合重型数据库认证
不应该作为唯一安全边界
```

### 2. 页面组件认证

优点：

```text
逻辑直观
页面入口清晰
容易理解
```

缺点：

```text
每个页面都要记得写
组件复用后可能绕过
权限逻辑容易散落
```

### 3. Data Access Layer 认证

优点：

```text
认证靠近数据访问
组件复用不容易绕过
权限逻辑集中
更适合大型项目
更容易维护和测试
```

缺点：

```text
需要团队遵守结构约定
可能导致页面动态渲染
需要额外设计数据访问层
```

默认推荐：

```text
核心认证和授权：放在 Data Access Layer
轻量跳转和用户体验优化：放在 proxy.ts
```

---

## 十九、最终建议

在 Next.js 16 中，`middleware.ts` 改名为 `proxy.ts`，传递出的信号非常明确：

```text
不要把它当成传统后端 middleware 使用
不要在里面塞复杂业务逻辑
不要把数据库认证、重型 IO、复杂权限判断都放进去
```

`proxy.ts` 更适合：

```text
redirect
rewrite
localization
A/B testing
multi-tenancy routing
轻量 token 存在性判断
```

而真正的认证和授权，更推荐放在：

```text
Data Access Layer
```

也就是所有访问敏感数据的函数内部。

可以简单总结为：

```text
proxy.ts 负责“用户能不能先进入这个入口”
DAL 负责“用户能不能真正拿到这些数据”
```

如果只靠 proxy 做认证，你保护的是路径；
如果把认证放进 DAL，你保护的是数据。

而在大多数应用里，真正需要保护的不是页面路径，而是数据本身。

---

## 二十、总结

Next.js 16 的 `middleware.ts → proxy.ts` 改名，看似只是文件名变化，实际是在提醒我们重新理解这个机制的职责边界。

不要把 `proxy.ts` 当成万能中间件。

它适合做轻量级请求处理，例如重定向、重写、多语言、多租户和粗粒度访问控制。

但认证和授权，尤其是涉及数据库数据访问的认证和授权，更应该放在数据访问层。

最稳健的架构是：

```text
页面组件调用 data-access 函数
data-access 函数内部执行认证 / 授权
认证通过后才访问数据库
proxy.ts 只做轻量跳转和体验优化
```

一句话总结：

**Next.js 中真正应该被保护的是数据，而不是某个页面路径；因此核心认证逻辑应该靠近数据访问，而不是只依赖 proxy.ts 的 matcher。**
