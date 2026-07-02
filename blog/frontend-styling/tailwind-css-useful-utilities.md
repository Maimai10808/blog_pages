# 10 个我希望早点知道的 Tailwind CSS 实用工具类

Tailwind CSS 最大的优点之一，是它非常容易上手。大多数 Tailwind class 都能和 CSS 属性一一对应，比如：

```html id="xnbh0o"
<div class="flex items-center justify-center">Hello</div>
```css

基本上就是：

```css id="arx3a2"
display: flex;
align-items: center;
justify-content: center;
```

但 Tailwind 并不只是“把 CSS 属性变成 class”。它还内置了很多非常实用的高级工具类，有些工具类背后不止是一行 CSS，而是封装了一组常见的样式需求。

这篇文章总结 10 个非常值得掌握的 Tailwind 工具类，包括容器、尺寸、分隔线、文本截断、渐变、ring、动画、无障碍和 typography 插件等。

---

## 一、container：响应式容器

`container` 是 Tailwind 里非常常用但容易被低估的工具类。

它的作用是创建一个响应式容器，容器宽度会根据屏幕尺寸自动变化。

```html id="45g1wg"
<div class="container">Content</div>
```tsx

不过需要注意，Tailwind 默认的 `container` 并不会自动居中，也不会自带左右 padding。

所以实际项目中，你经常会这样写：

```html id="1fdmfh"
<div class="container mx-auto px-4">Content</div>
```

含义是：

```text id="6r6zfo"
container：响应式最大宽度
mx-auto：左右自动 margin，实现居中
px-4：左右内边距
```text

如果你希望项目里所有 container 默认都居中，并且自带 padding，可以在 Tailwind 配置里统一设置：

```js id="qfw5a5"
export default {
  theme: {
    container: {
      center: true,
      padding: "2rem",
    },
  },
};
```

这样你以后只需要写：

```html id="15u5ji"
<div class="container">Content</div>
```text

就可以自动拥有居中和左右 padding。

`container` 特别适合页面整体布局，比如：

```text id="6zlwvk"
首页主体内容
文章详情页
商品详情页
后台页面内容区
Landing Page 各个 section
```

---

## 二、size：同时设置宽高

很多时候我们需要一个正方形，比如头像、图标容器、圆形按钮。

以前可能会这样写：

```html id="rwq4ro"
<div class="w-48 h-48"></div>
```tsx

Tailwind 提供了更简洁的写法：

```html id="ifzdk6"
<div class="size-48"></div>
```

`size-48` 等价于同时设置：

```css id="71b42s"
width: 12rem;
height: 12rem;
```tsx

如果要做圆形：

```html id="1nuj5x"
<div class="size-24 rounded-full bg-blue-500"></div>
```

非常适合这些场景：

```text id="hn9m1v"
头像
icon button
圆形装饰元素
加载动画容器
固定尺寸卡片
```tsx

相比 `w-* h-*` 分开写，`size-*` 更短，也更不容易写错。

---

## 三、divide：给子元素之间添加分隔线

假设你有一个列表：

```html id="iiktt6"
<div>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

如果你想在每个 item 之间加分隔线，很多人会给每一项加 `border-b`，然后还要记得最后一项不能加。

这样很麻烦：

```html id="hhjm0q"
<div>
  <div class="border-b">Item 1</div>
  <div class="border-b">Item 2</div>
  <div>Item 3</div>
</div>
```tsx

更好的方式是使用 `divide-y`：

```html id="fpa8fv"
<div class="divide-y">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

它会自动在子元素之间添加分隔线，不会给最后一个元素多加边框。

你也可以控制分隔线粗细和颜色：

```html id="aky9br"
<div class="divide-y-2 divide-red-500">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```tsx

如果是横向布局，可以用：

```html id="bic5o2"
<div class="flex divide-x divide-slate-300">
  <div class="px-4">Tab 1</div>
  <div class="px-4">Tab 2</div>
  <div class="px-4">Tab 3</div>
</div>
```

`divide` 非常适合：

```text id="i5ge03"
菜单列表
卡片列表
表格-like 布局
设置项列表
移动端选项列表
Tab 区域
```tsx

---

## 四、space：非 flex / grid 场景下添加间距

如果你使用 flex 或 grid，可以直接用 `gap`：

```html id="8xxuwb"
<div class="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

但如果你不是 flex，也不是 grid，只是普通块级元素排列，`gap` 不会生效。

这时可以使用 `space-y-*` 或 `space-x-*`。

例如纵向列表：

```html id="bzssy5"
<div class="space-y-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```tsx

它会在子元素之间添加垂直间距。

横向排列可以用：

```html id="hio4x8"
<div class="space-x-4">
  <span>React</span>
  <span>Vue</span>
  <span>Svelte</span>
</div>
```

`space` 的好处是：你不用给每个子元素单独加 margin，也不用处理最后一个元素的特殊情况。

适合这些场景：

```text id="wzoyyc"
普通列表
表单字段
文章段落
按钮组
侧边栏菜单
```tsx

不过如果你已经用了 flex 或 grid，优先考虑 `gap`，语义更直接。

---

## 五、line-clamp：限制多行文本

在卡片、文章摘要、商品描述里，经常需要限制文本显示几行，超出部分用省略号。

Tailwind 提供了 `line-clamp-*`：

```html id="c43609"
<p class="line-clamp-3">This is a very long paragraph...</p>
```

这表示最多显示 3 行，超过后自动省略。

也可以改成 2 行或 5 行：

```html id="deeo57"
<p class="line-clamp-2">...</p>
<p class="line-clamp-5">...</p>
```text

如果文本本身没有超过指定行数，就会正常显示，不会强行加省略号。

这个工具类非常实用，因为手写 CSS 通常需要一堆 webkit 相关属性：

```css id="tlqu2c"
display: -webkit-box;
-webkit-line-clamp: 3;
-webkit-box-orient: vertical;
overflow: hidden;
```

Tailwind 用一个 class 就封装好了。

适合场景：

```text id="ohv5e0"
文章摘要
商品描述
评论内容
通知列表
卡片标题和简介
```tsx

---

## 六、truncate：限制单行文本

`line-clamp` 适合多行省略，`truncate` 则适合单行省略。

```html id="l21ys0"
<p class="truncate">
  This is a very very very long text that should only stay on one line.
</p>
```

它会让文本保持一行，超出容器后显示省略号。

背后大概等价于：

```css id="1xwo3d"
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```text

非常适合：

```text id="9ht1jo"
文件名
用户名
表格单元格
导航标题
消息列表
订单编号
钱包地址
```

比如钱包地址展示：

```html id="na6u6r"
<p class="max-w-40 truncate">0x1234567890abcdef1234567890abcdef</p>
```tsx

注意，`truncate` 通常需要配合一个明确宽度或最大宽度，否则它不知道什么时候算“超出”。

---

## 七、gradient：渐变工具类

Tailwind 写渐变非常方便。

例如创建一个从橙色到黑色的渐变：

```html id="9sn25k"
<div class="h-48 w-full bg-gradient-to-r from-orange-500 to-black"></div>
```

含义：

```text id="7iz85d"
bg-gradient-to-r：渐变方向，从左到右
from-orange-500：起始颜色
to-black：结束颜色
```tsx

如果想加中间色，可以用 `via-*`：

```html id="jx0gns"
<div
  class="h-48 w-full bg-gradient-to-r from-orange-500 via-white to-black"
></div>
```

还可以控制颜色节点的位置：

```html id="9unqcx"
<div
  class="h-48 w-full bg-gradient-to-r from-orange-500 from-20% via-white via-70% to-black to-90%"
></div>
```text

这表示：

```text id="q3fr4x"
橙色从 20% 开始过渡
白色在 70% 位置
黑色在 90% 位置
```

渐变方向也可以调整：

```html id="d1wrpm"
<div class="bg-gradient-to-r"></div>
<div class="bg-gradient-to-l"></div>
<div class="bg-gradient-to-t"></div>
<div class="bg-gradient-to-b"></div>
<div class="bg-gradient-to-br"></div>
```text

适合场景：

```text id="xoe67q"
Hero 背景
按钮背景
卡片装饰
骨架屏
品牌视觉
统计卡片
```

---

## 八、ring：不影响 border 的外圈效果

`ring` 是 Tailwind 里非常好用的一个工具类。

它可以给元素添加类似 outline 的外圈效果，但它不是 border，也不是 outline，而是基于 box-shadow 实现。

例如：

```html id="ycoj58"
<button class="h-12 w-24 bg-blue-500 text-white ring-4 ring-red-500">
  Button
</button>
```tsx

这会给按钮加一个红色外圈。

你可以控制 ring 的宽度：

```html id="qixczg"
<button class="ring-1">Button</button>
<button class="ring-2">Button</button>
<button class="ring-4">Button</button>
```

也可以控制颜色：

```html id="fzr18t"
<button class="ring-4 ring-black">Button</button>
<button class="ring-4 ring-blue-500">Button</button>
<button class="ring-4 ring-red-500">Button</button>
```tsx

`ring` 的好处是它不会影响元素本身的 border，也不会和 outline 混在一起。

它非常适合做 focus 状态：

```html id="j6lpi2"
<button
  class="rounded-md bg-blue-600 px-4 py-2 text-white focus:ring-4 focus:ring-blue-300"
>
  Submit
</button>
```

也适合卡片选中态：

```html id="pdp9z3"
<div class="rounded-xl border p-4 ring-2 ring-blue-500">Selected Card</div>
```text

常见场景：

```text id="pjj9sp"
按钮 focus 状态
输入框 focus 状态
选中卡片
头像外圈
高亮提示
错误状态
```

---

## 九、animate：内置动画

Tailwind 内置了一些常用动画。

例如旋转：

```html id="42vakr"
<div
  class="size-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-500"
></div>
```tsx

常用于 loading spinner。

其他常见动画：

```html id="32tw47"
<div class="animate-ping"></div>
<div class="animate-pulse"></div>
<div class="animate-bounce"></div>
```

含义：

```text id="18jh74"
animate-spin：旋转
animate-ping：扩散闪烁
animate-pulse：淡入淡出，常用于骨架屏
animate-bounce：上下弹跳
```tsx

例如骨架屏：

```html id="dvpkol"
<div class="animate-pulse space-y-4">
  <div class="h-4 w-3/4 rounded bg-slate-300"></div>
  <div class="h-4 w-1/2 rounded bg-slate-300"></div>
</div>
```

这些动画虽然简单，但非常常用。

适合：

```text id="lvcdsl"
加载中
骨架屏
通知提示
状态点
按钮反馈
空状态插画
```tsx

如果内置动画不够，也可以在 Tailwind 配置中自定义动画。

---

## 十、sr-only：只给屏幕阅读器看的内容

`sr-only` 是一个和无障碍相关的工具类。

它会让内容在视觉上隐藏，但仍然能被屏幕阅读器读取。

例如：

```html id="cr6pqy"
<span class="sr-only">Close menu</span>
```

视觉上用户看不到这段文字，但使用屏幕阅读器的用户可以听到它。

这在只有图标、没有文字的按钮里特别重要：

```html id="t3zft7"
<button>
  <XIcon />
  <span class="sr-only">Close</span>
</button>
```text

如果没有 `sr-only`，屏幕阅读器用户可能只知道这里有个按钮，但不知道按钮是做什么的。

常见场景：

```text id="bj5i3s"
图标按钮
关闭按钮
搜索按钮
菜单按钮
只用视觉表达状态的元素
表单隐藏 label
```

还有一个对应类是：

```html id="ld883q"
<span class="not-sr-only">Visible again</span>
```tsx

它可以把之前隐藏给屏幕阅读器的内容重新显示出来。

例如：

```html id="2btb9o"
<span class="sr-only lg:not-sr-only"> Dashboard </span>
```

含义是：小屏只给屏幕阅读器读，大屏正常显示。

---

## 十一、bonus：@tailwindcss/typography 和 prose

最后一个是我最推荐用于博客、文档、Markdown 内容的工具：`@tailwindcss/typography` 插件。

这个插件提供了一个非常强大的类：

```html id="y46eyh"
<article class="prose">...</article>
```tsx

只要加上 `prose`，里面的普通 HTML 内容就会自动拥有非常漂亮的排版样式。

比如：

```html id="e0qf3d"
<article class="prose">
  <h1>Article Title</h1>
  <p>This is a paragraph.</p>
  <h2>Section Title</h2>
  <blockquote>This is a quote.</blockquote>
  <ul>
    <li>First item</li>
    <li>Second item</li>
  </ul>
</article>
```

如果没有 typography 插件，Tailwind 默认会清除很多浏览器自带样式，导致 Markdown 渲染出来的文章看起来非常朴素。

`prose` 会帮你处理：

```text id="rce6ha"
标题
段落
列表
引用
代码块
表格
链接
图片
分割线
```text

非常适合：

```text id="9brkmk"
博客文章
Markdown 文档
CMS 内容
帮助中心
产品文档
技术文档
用户协议
```

还可以配合暗黑模式：

```html id="7n50rj"
<article class="prose dark:prose-invert">...</article>
```text

`dark:prose-invert` 会让文章在暗黑模式下自动适配颜色。

如果你在做博客、文档站、内容型页面，`prose` 基本是必备工具。

---

## 总结

Tailwind CSS 不只是把 CSS 属性改写成 class。它还内置了很多能明显提升开发效率的工具类。

这篇文章提到的 10 个工具类和 1 个插件分别是：

```text id="rjsytz"
container：响应式容器
size：同时设置宽高
divide：子元素之间添加分隔线
space：非 flex / grid 场景下添加间距
line-clamp：多行文本省略
truncate：单行文本省略
gradient：快速创建渐变
ring：不影响 border 的外圈样式
animate：内置动画
sr-only：无障碍隐藏文本
prose：文章和 Markdown 内容排版
```

如果你刚开始学 Tailwind，可能会觉得它只是很多类名的集合。
但真正用熟之后你会发现，Tailwind 的价值在于它把很多高频 CSS 场景都抽象成了简单、可组合、可复用的工具。

掌握这些工具类后，你写 UI 会更快，也更容易保持代码整洁。
