# Next.js Link 组件详解：什么时候应该关闭 `prefetch`？

在 Next.js 项目中，页面跳转通常会使用官方提供的 `<Link />` 组件。

大多数情况下，这是正确选择。

相比普通的 `<a>` 标签，`next/link` 可以避免整页刷新，保留客户端状态，并且配合 Next.js 的路由系统、代码分割和预加载能力，让页面跳转更快。

但是，`<Link />` 并不是所有场景都应该无脑使用默认配置。

尤其是当页面中存在大量链接时，默认的预加载行为可能会带来额外请求，甚至增加服务器成本。

本文就来系统梳理 Next.js `<Link />` 组件的几个关键能力，重点讲清楚一个容易被忽略的问题：

**什么时候应该把 `prefetch` 设置为 `false`。**

---

## 一、一个很常见的问题：列表中有大量 Link

假设我们有一个列表页面，里面有很多条数据。

每条数据都可以点击进入详情页，于是我们很自然地这样写：

```tsx id="r7ow8d"
import Link from "next/link";

export default function EntriesList({ entries }) {
  return (
    <div>
      {entries.map((entry) => (
        <Link key={entry.id} href={`/entries/${entry.id}`}>
          {entry.title}
        </Link>
      ))}
    </div>
  );
}
```

这是非常常见的写法。

比如：

- 商品列表；
- 文章列表；
- 用户列表；
- 订单列表；
- 日志列表；
- 搜索结果页；
- 后台管理表格。

从功能上看，这样写没有问题。

但如果这个列表很长，比如 200 条、2000 条，甚至更多，就可能出现性能和成本问题。

---

## 二、为什么大量 Link 会有问题？

Next.js 的 `<Link />` 组件默认具有预加载能力。

当链接进入用户视口时，Next.js 会尝试在后台预加载对应路由，让用户点击时可以更快跳转。

这在导航栏、首页入口、少量链接场景中非常有用。

但是在长列表中就不一定合适。

假设页面中有 500 条记录，每条记录都是一个 `<Link />`。当用户不断向下滚动时，越来越多的链接进入视口。Next.js 可能会不断触发预加载请求。

结果就是：

```txt id="lnqx9d"
用户只是滚动列表
      ↓
大量 Link 进入视口
      ↓
Next.js 自动 prefetch
      ↓
网络请求增加
      ↓
服务端和带宽成本上升
```

如果这些详情页还涉及动态数据、权限判断、数据库查询或接口请求，那么这种预加载就可能变成不必要的资源消耗。

用户并不会点击所有链接，但系统却可能提前为很多链接做了准备。

这就是问题所在。

---

## 三、生产环境才能明显看到 prefetch 行为

有一点需要特别注意：

Next.js 的链接预加载行为主要在生产构建中体现。

开发环境下，很多优化行为不会完整启用，所以你在本地 `next dev` 中可能看不到明显效果。

测试时建议使用：

```bash id="zln2a6"
npm run build
npm run start
```

或者：

```bash id="wlna7t"
pnpm build
pnpm start
```

然后打开浏览器开发者工具的 Network 面板，滚动列表页面。

如果列表中的 `<Link />` 使用默认预加载行为，你可能会看到随着滚动不断出现新的预加载请求。

---

## 四、解决方案：给大量列表链接设置 `prefetch={false}`

对于大量列表项，推荐关闭自动预加载：

```tsx id="l6nahh"
import Link from "next/link";

export default function EntriesList({ entries }) {
  return (
    <div>
      {entries.map((entry) => (
        <Link key={entry.id} href={`/entries/${entry.id}`} prefetch={false}>
          {entry.title}
        </Link>
      ))}
    </div>
  );
}
```

这样，当用户滚动页面时，Next.js 不会因为这些链接进入视口就自动预加载详情页。

用户真正点击某一条记录时，再正常跳转即可。

这可以减少不必要请求，尤其适合大型列表、搜索结果页和后台数据表格。

---

## 五、什么时候应该关闭 prefetch？

一般来说，下面这些场景建议设置：

```tsx id="3xudcx"
prefetch={false}
```

### 1. 页面中链接数量很多

例如列表中有几十、几百甚至更多链接。

这类页面如果默认预加载，很容易产生大量请求。

### 2. 用户点击概率很低

比如一个搜索结果页有 100 条结果，但用户通常只会点其中 1 条。

这时预加载所有进入视口的结果详情页，就不太划算。

### 3. 目标页面请求成本较高

如果详情页会触发数据库查询、复杂计算、权限校验或第三方 API 请求，就更应该谨慎预加载。

### 4. 无限滚动列表

无限滚动会不断加载新数据，也会不断出现新的链接。

如果每批新链接都触发预加载，开销会持续放大。

### 5. 后台管理系统表格

后台列表页通常数据量大、链接多，而且详情页可能包含复杂业务数据。

这类场景更适合关闭自动预加载。

---

## 六、什么时候保留默认 prefetch？

并不是说 `prefetch` 一定要关闭。

在很多场景中，默认预加载是有价值的。

例如：

- 顶部导航栏；
- 底部导航；
- 首页核心入口；
- 用户很可能点击的 CTA；
- 少量重要链接；
- 下一步流程页面；
- 详情页相关推荐中的少量链接。

这些链接数量少，点击概率高，预加载可以明显提升跳转体验。

例如：

```tsx id="mlx6qc"
<Link href="/dashboard">Dashboard</Link>
```

这类主导航入口通常可以保留默认行为。

---

## 七、`prefetch={null}`、`prefetch={true}` 和 `prefetch={false}` 的区别

Next.js `<Link />` 的 `prefetch` 有几个状态，容易混淆。

### 1. 默认值：`null`

在默认情况下，`prefetch` 不是简单等同于完全预加载所有内容。

它会根据路由类型采用不同策略。

对于静态路由，Next.js 可以更完整地预加载。
对于动态路由，Next.js 通常只会预加载到最近的 `loading.js` 或共享布局边界。

也就是说，默认行为是相对智能和克制的。

### 2. `prefetch={true}`

如果显式设置为 `true`，则会更积极地预加载完整路由。

```tsx id="764n3k"
<Link href="/about" prefetch={true}>
  About
</Link>
```

这适合目标页面非常重要、用户大概率会访问、并且预加载成本不高的场景。

但对于动态详情页、大型列表页中的链接，不建议随便设置为 `true`。

### 3. `prefetch={false}`

关闭自动预加载。

```tsx id="0imjdd"
<Link href={`/entries/${entry.id}`} prefetch={false}>
  {entry.title}
</Link>
```

这适合大量链接、低点击概率、高请求成本的场景。

---

## 八、为什么不要直接用 `<a>` 替代 Link？

有些人可能会想：

既然 `<Link />` 会自动预加载，那我直接用 `<a>` 不就好了？

不推荐这样做。

普通 `<a>` 标签会触发浏览器的完整页面刷新。

例如：

```tsx id="mcmhtu"
<a href="/about">About</a>
```

这种跳转会导致整个页面重新加载，客户端状态也可能丢失。

而 Next.js 的 `<Link />` 本质上虽然最终渲染为 `<a>`，但它额外集成了 Next.js 的客户端路由能力。

它的优势包括：

- 避免整页刷新；
- 保留客户端状态；
- 使用 Next.js 路由系统；
- 支持代码分割；
- 支持智能预加载；
- 页面跳转体验更顺滑。

所以正确做法不是放弃 `<Link />`，而是根据场景配置好它。

对于长列表，应该这样：

```tsx id="zpge2a"
<Link href={`/entries/${entry.id}`} prefetch={false}>
  {entry.title}
</Link>
```

而不是退回到：

```tsx id="eo5cn7"
<a href={`/entries/${entry.id}`}>{entry.title}</a>
```

---

## 九、Link 仍然支持普通 a 标签的属性

`next/link` 最终会渲染成一个 `<a>` 元素，所以我们也可以给它添加常见的链接属性。

例如添加 className：

```tsx id="xz5ojz"
<Link href="/about" className="text-blue-500">
  About
</Link>
```

新标签页打开：

```tsx id="85n5zg"
<Link href="https://example.com" target="_blank">
  External Site
</Link>
```

也可以配合 `rel` 使用：

```tsx id="xc58yv"
<Link href="https://example.com" target="_blank" rel="noopener noreferrer">
  External Site
</Link>
```

这些属性会传递到底层的 `<a>` 元素上。

---

## 十、Link 的动态路由写法

对于动态路由，可以直接使用模板字符串：

```tsx id="m1892f"
<Link href={`/posts/${post.id}`}>{post.title}</Link>
```

也可以使用对象形式：

```tsx id="5mn8ve"
<Link
  href={{
    pathname: "/posts/[id]",
    query: { id: post.id },
  }}
>
  {post.title}
</Link>
```

对象形式适合路径参数、查询参数较多的情况。

例如带查询参数：

```tsx id="5dl6vh"
<Link
  href={{
    pathname: "/search",
    query: {
      keyword: "nextjs",
      page: 1,
    },
  }}
>
  Search
</Link>
```

最终会跳转到类似：

```txt id="dqyju0"
/search?keyword=nextjs&page=1
```

---

## 十一、`scroll` 属性：控制跳转后是否滚动到顶部

`Link` 还有一个常用但容易被忽略的属性：

```tsx id="1httf0"
scroll;
```

默认情况下，页面跳转后会滚动到顶部。

也就是：

```tsx id="kxpfjg"
<Link href="/contact">Contact</Link>
```

等价于：

```tsx id="q8qgdk"
<Link href="/contact" scroll={true}>
  Contact
</Link>
```

如果你不希望跳转后自动滚动到顶部，可以设置：

```tsx id="pelwkd"
<Link href="/contact" scroll={false}>
  Contact
</Link>
```

这个属性适合一些特殊场景，比如：

- 页面内切换筛选条件；
- 保留用户当前滚动位置；
- 列表页修改查询参数；
- 弹窗或局部导航场景。

例如：

```tsx id="589cqq"
<Link
  href={{
    pathname: "/products",
    query: { category: "shoes" },
  }}
  scroll={false}
>
  Shoes
</Link>
```

这样用户切换分类时，不一定会被强制带回页面顶部。

---

## 十二、`replace` 属性：替换浏览器历史记录

另一个重要属性是：

```tsx id="c9qe6o"
replace;
```

默认情况下，`Link` 跳转会新增一条浏览器历史记录。

例如：

```tsx id="ckukqb"
<Link href="/home">Home</Link>
```

用户从 `/contact` 跳到 `/home` 后，可以点击浏览器返回按钮回到 `/contact`。

但如果设置：

```tsx id="panzan"
<Link href="/home" replace>
  Home
</Link>
```

这次跳转会替换当前历史记录。

也就是说，用户跳转到 `/home` 后，点击返回按钮不会再回到刚才那个页面。

这适合一些不希望用户返回的场景，比如：

- 登录成功后跳转到首页；
- 表单提交成功后跳转到结果页；
- 旧路径重定向到新路径；
- 临时中间页跳转；
- 操作完成后的确认页。

---

## 十三、实际项目中的推荐写法

### 普通导航

```tsx id="rq89u9"
<Link href="/dashboard">Dashboard</Link>
```

保留默认预加载即可。

### 长列表详情链接

```tsx id="survv8"
<Link href={`/entries/${entry.id}`} prefetch={false}>
  {entry.title}
</Link>
```

建议关闭预加载。

### 外部链接

```tsx id="x40x0g"
<Link href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
</Link>
```

### 查询参数链接

```tsx id="54h6mh"
<Link
  href={{
    pathname: "/products",
    query: { category: "books" },
  }}
  scroll={false}
>
  Books
</Link>
```

### 不保留历史记录的跳转

```tsx id="5fz2a3"
<Link href="/success" replace>
  Success
</Link>
```

---

## 十四、最佳实践总结

在 Next.js 中使用 `<Link />`，可以遵循下面几条原则：

### 1. 不要用 `<a>` 做内部跳转

内部路由跳转优先使用 `next/link`，避免整页刷新。

### 2. 不要在大量列表中无脑开启预加载

列表链接很多时，建议设置：

```tsx id="0utdnm"
prefetch={false}
```

### 3. 少量高价值入口保留默认预加载

导航栏、首页 CTA、重要入口可以保留默认行为。

### 4. 动态详情页谨慎使用 `prefetch={true}`

如果详情页请求成本高，不要强制完整预加载。

### 5. 需要保留滚动位置时使用 `scroll={false}`

适合筛选、查询参数切换、局部导航等场景。

### 6. 不希望用户返回上一页时使用 `replace`

适合登录后、提交成功后、重定向等场景。

---

## 十五、结论

Next.js 的 `<Link />` 组件不只是一个简单的跳转组件。

它背后包含了客户端路由、代码分割、状态保留、滚动控制、历史记录控制和路由预加载等能力。

但也正因为它很强大，我们更需要理解它的默认行为。

对于少量重要链接，默认预加载可以提升跳转体验。
对于大量列表链接，默认预加载可能带来不必要的网络请求和服务端开销。

所以，真正的最佳实践不是“所有地方都默认使用 Link”，也不是“避免使用 Link”，而是：

**内部跳转继续使用 Link，但在大量列表场景中关闭自动预加载。**

一句话总结：

```tsx id="sehd4z"
<Link href="/important-page">
  重要入口保留默认预加载
</Link>

<Link href={`/entries/${id}`} prefetch={false}>
  大量列表项关闭预加载
</Link>
```

理解并正确配置 `<Link />`，可以让 Next.js 应用既保持良好的跳转体验，又避免不必要的性能和成本浪费。
