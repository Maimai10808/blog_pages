# Tailwind CSS 完整入门：从工具类到响应式布局、暗黑模式与自定义主题

很多前端开发者学了很久 CSS，还是会反复搜索：“如何让 div 居中？”、“移动端怎么适配？”、“暗黑模式怎么做？”、“Tailwind 这些类名到底怎么记？”

Tailwind CSS 的出现，改变了很多人写样式的方式。它不是传统意义上的 UI 组件库，也不是 Bootstrap 那种给你一套现成按钮、卡片和导航栏的框架。Tailwind 更像是一套“工具箱”，它提供大量细粒度的 utility classes，让你可以直接在 HTML、JSX 或 TSX 中组合出自己想要的样式。

这篇文章会系统梳理 Tailwind CSS 的核心概念，包括 utility-first 思想、JIT 编译、布局、响应式设计、暗黑模式、自定义主题、组件抽象以及一些实用技巧。

---

## 一、Tailwind CSS 是什么

Tailwind CSS 是一个 utility-first 的 CSS 框架。

所谓 utility-first，就是优先使用小而单一的工具类来组合样式。

传统 CSS 中，我们通常这样写：

```html id="pvfa33"
<div class="container">
  <h1 class="container-heading">Hello World</h1>
</div>
```css

然后在 CSS 文件里写：

```css id="w0qd4v"
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.container-heading {
  font-size: 24px;
  color: blue;
}
```

而在 Tailwind 中，你可以直接这样写：

```html id="xkqku2"
<div class="flex justify-center items-center">
  <h1 class="text-lg text-blue-400">Hello World</h1>
</div>
```text

这里的：

```text id="c833gc"
flex
justify-center
items-center
text-lg
text-blue-400
```

都是 Tailwind 提供的工具类。每个类名背后都对应一条具体 CSS 规则。

例如：

```text id="r1bssd"
flex => display: flex;
justify-center => justify-content: center;
items-center => align-items: center;
text-center => text-align: center;
```tsx

这就是 Tailwind 的核心思想：不用先想类名，不用维护巨大 CSS 文件，而是直接用工具类组合样式。

---

## 二、Tailwind 不是 inline style

很多人第一次看到 Tailwind 会觉得：这不就是 inline style 吗？

比如：

```html id="uh4lsa"
<h1 class="text-center text-lg text-blue-400 mt-2">Hello World</h1>
```

看起来确实像把样式都写在标签上。

但 Tailwind 和 inline style 有本质区别。

inline style 是这样：

```html id="v2bxh0"
<h1 style="color: blue; margin-top: 10px;">Hello World</h1>
```text

它有几个明显问题：

```text id="m3p0h6"
不能方便使用伪类，例如 hover、focus、active
不能直接写媒体查询
复用性差
无法统一使用设计系统
样式覆盖和维护比较混乱
```

Tailwind 工具类则不同。它们本质上是预定义的 CSS class，可以复用，也可以配合响应式、伪类、暗黑模式、主题变量使用。

例如：

```html id="66s0vi"
<button class="bg-blue-500 hover:bg-blue-600 md:text-lg dark:bg-slate-800">
  Click me
</button>
```text

这里同时包含：

```text id="98i3hx"
普通样式
hover 状态
响应式样式
暗黑模式样式
```

这是 inline style 很难优雅做到的。

所以 Tailwind 不是 inline style，而是一套高度可组合的 CSS 工具类系统。

---

## 三、Tailwind 的工作原理

Tailwind 的每个工具类最终都会生成对应的 CSS。

例如你写：

```html id="hq1jck"
<h1 class="text-center text-lg text-cyan-400 mt-2">Hello World</h1>
```text

Tailwind 会生成类似这样的 CSS：

```css id="jwvlov"
.text-center {
  text-align: center;
}

.text-lg {
  font-size: 1.125rem;
  line-height: 1.75rem;
}

.text-cyan-400 {
  color: var(--color-cyan-400);
}

.mt-2 {
  margin-top: calc(var(--spacing) * 2);
}
```

Tailwind 并不会把所有可能的类都打包进最终 CSS。它会根据你实际用到的类生成对应样式。

这也是 Tailwind 性能不错的重要原因。

---

## 四、JIT 编译器：Tailwind 的核心能力

Tailwind 的 JIT，也就是 Just-In-Time 编译器，会按需生成样式。

你写了什么类，它就生成什么 CSS。没用到的类，不会出现在最终产物里。

这带来几个好处：

```text id="dbm56j"
最终 CSS 更小
开发时生成速度更快
支持任意值 arbitrary values
开发体验更灵活
```tsx

例如 Tailwind 默认可能没有 `13px` 这个字号工具类，但你可以直接写：

```html id="7wzq55"
<h1 class="text-[13px]">JS Mastery Pro</h1>
```

也可以写：

```html id="lgxujg"
<div class="w-[320px] bg-[#10172a]">Custom Box</div>
```tsx

方括号里的值就是 arbitrary value。

常见写法包括：

```html id="iuqotd"
<div class="text-[30px]"></div>
<div class="bg-[#10172a]"></div>
<div class="w-[420px]"></div>
<div class="p-[18px]"></div>
<div class="grid-cols-[200px_1fr]"></div>
```

这让 Tailwind 在保持设计系统的同时，也允许你在特殊场景下写自定义值。

不过任意值不要滥用。如果某个颜色、字号、间距会被多处复用，更推荐放进主题配置里统一管理。

---

## 五、常见基础工具类

Tailwind 的类名看似很多，但大部分都有规律。

### 1. 宽高

```html id="yv6bth"
<div class="w-full h-10"></div>
```text

含义：

```text id="84znfm"
w-full => width: 100%;
h-10 => height: 2.5rem;
```

### 2. 背景色

```html id="tlq8wy"
<div class="bg-violet-200"></div>
```text

含义：

```text id="n06z4u"
bg-violet-200 => background-color: violet 的 200 色阶
```

### 3. 边框

```html id="lu0rei"
<div class="border-2 border-violet-600 rounded-md"></div>
```text

含义：

```text id="eeeg0r"
border-2 => border-width: 2px
border-violet-600 => border-color
rounded-md => medium border-radius
```

### 4. 外边距和内边距

```html id="e64yx0"
<div class="my-4 p-2"></div>
```text

含义：

```text id="zuxob7"
my-4 => margin-top 和 margin-bottom
p-2 => 四个方向 padding
```

Tailwind 的 spacing 规则很统一：

```text id="5ii0zk"
m => margin
p => padding
t => top
r => right
b => bottom
l => left
x => left + right
y => top + bottom
```tsx

例如：

```html id="1jdml0"
<div class="mt-4"></div>
<div class="mb-6"></div>
<div class="mx-auto"></div>
<div class="px-8"></div>
<div class="py-3"></div>
```

### 5. 字体和文本

```html id="dej19j"
<h1 class="text-center text-lg font-mono font-extrabold text-cyan-400">
  Hello World
</h1>
```text

含义：

```text id="427yx4"
text-center => 文本居中
text-lg => 字号
font-mono => 等宽字体
font-extrabold => 字重
text-cyan-400 => 文本颜色
```

---

## 六、Flexbox 布局

布局是 Tailwind 最常用的场景之一。

Flexbox 写法非常直观：

```html id="wuwk4c"
<div class="flex justify-center items-center">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```css

含义：

```text id="txm85l"
flex => display: flex
justify-center => 主轴居中
items-center => 交叉轴居中
```

如果想让元素横向排列，并且有间距：

```html id="juwzv6"
<div class="flex justify-center items-center space-x-6">
  <div class="h-16 w-16 rounded-full bg-blue-500"></div>
  <div class="h-16 w-16 rounded-full bg-orange-500"></div>
  <div class="h-16 w-16 rounded-full bg-green-500"></div>
</div>
```tsx

如果想改成纵向排列：

```html id="nd0wf1"
<div class="flex flex-col justify-center items-center space-y-6">
  <div class="h-16 w-16 rounded-full bg-blue-500"></div>
  <div class="h-16 w-16 rounded-full bg-orange-500"></div>
  <div class="h-16 w-16 rounded-full bg-green-500"></div>
</div>
```

常用 Flex 类：

```text id="gk2cye"
flex
flex-col
flex-row
justify-start
justify-center
justify-end
justify-between
justify-around
justify-evenly
items-start
items-center
items-end
items-stretch
gap-4
space-x-4
space-y-4
```tsx

如果你经常不知道怎么居中，记住这句：

```html id="7mj3r9"
<div class="flex justify-center items-center">Centered</div>
```

这基本就是 Tailwind 版的“如何居中一个 div”。

---

## 七、Grid 布局

Flexbox 更适合一维布局，Grid 更适合二维布局。

例如创建一个三列网格：

```html id="dgoa6b"
<div class="grid grid-cols-3 gap-2">
  <div class="h-16 bg-blue-500"></div>
  <div class="h-16 bg-orange-500"></div>
  <div class="h-16 bg-green-500"></div>
</div>
```css

含义：

```text id="a1d2du"
grid => display: grid
grid-cols-3 => 三列
gap-2 => 网格间距
```

改成五列：

```html id="a2r6br"
<div class="grid grid-cols-5 gap-2">...</div>
```text

常用 Grid 类：

```text id="f6u9sj"
grid
grid-cols-2
grid-cols-3
grid-cols-4
grid-rows-2
gap-2
gap-4
col-span-2
row-span-2
place-items-center
```

Flexbox 和 Grid 没有谁更高级，关键看场景。

简单判断：

```text id="egji0g"
横向或纵向排列：优先 Flex
复杂二维布局：优先 Grid
卡片列表、多列布局：Grid 很方便
导航栏、按钮组、居中：Flex 很方便
```tsx

---

## 八、响应式设计：Tailwind 的移动优先思想

Tailwind 默认使用 mobile-first，也就是移动优先。

这点非常重要。

Tailwind 的断点不是“只在某个尺寸生效”，而是“从某个尺寸开始往上生效”。

例如：

```html id="nbt4ks"
<p class="text-sm md:text-lg lg:text-2xl">Responsive Text</p>
```

含义是：

```text id="t4f1de"
默认：text-sm，适用于所有屏幕
md:text-lg：屏幕宽度 >= md 时生效
lg:text-2xl：屏幕宽度 >= lg 时生效
```text

不是说 `md:` 只在中等屏幕生效，而是中等屏幕及以上生效。

常见断点：

```text id="y0f9cg"
sm
md
lg
xl
2xl
```

例如：

```html id="or8yur"
<div class="hidden md:block">I appear on screens wider than md.</div>
```text

含义：

```text id="j8uqqr"
默认 hidden
md 及以上变成 block
```

也就是说，小屏隐藏，中屏及以上显示。

如果想做移动端默认垂直、大屏横向：

```html id="3s6cp0"
<div class="flex flex-col md:flex-row gap-4">
  <div>Left</div>
  <div>Right</div>
</div>
```text

含义：

```text id="xzx860"
移动端：flex-col
md 及以上：flex-row
```

这是 Tailwind 响应式最常用的写法。

---

## 九、不要误解 sm 的含义

很多新手会以为：

```html id="m9ltqm"
<p class="sm:text-center">Text</p>
```tsx

表示“在小屏幕居中”。

其实不是。

`sm:text-center` 的意思是：从 sm 断点开始及以上居中。

如果你想让移动端居中，应该直接写未加前缀的类：

```html id="n4mmdw"
<p class="text-center md:text-left">Text</p>
```

含义：

```text id="y0mph9"
移动端默认居中
md 及以上左对齐
```text

Tailwind 文档里也强调：不要把 `sm:` 理解成“手机端”，而要理解成“sm breakpoint and above”。

移动优先的正确思路是：

```text id="mdfzuw"
先写移动端默认样式
再用 sm / md / lg / xl 逐步覆盖大屏样式
```

---

## 十、Max 断点

Tailwind 默认是 min-width 逻辑，但也支持 max 逻辑。

例如：

```html id="c0wiuz"
<div class="max-md:hidden">Hidden below md</div>
```tsx

`max-md:` 表示在 md 以下生效。

一般情况下，建议优先使用移动优先的 min-width 写法。只有当你确实需要针对某个最大宽度以下的设备写特殊样式时，再使用 `max-*`。

---

## 十一、暗黑模式 dark mode

Tailwind 原生支持暗黑模式。

最简单的写法：

```html id="6vh77l"
<div class="bg-white text-black dark:bg-black dark:text-white">
  Dark mode supported
</div>
```

含义：

```text id="b28opk"
默认：白底黑字
dark 模式：黑底白字
```text

如果使用系统偏好，Tailwind 可以根据用户操作系统的 light / dark 设置自动应用。

如果你想手动切换暗黑模式，可以通过给根元素加 `dark` class 的方式实现。

例如：

```js id="yj7w38"
document.documentElement.classList.toggle("dark");
```

然后 Tailwind 中的 `dark:` 类就会生效。

在 React 中可以这样做：

```tsx id="wedrdx"
function ThemeToggle() {
  function toggleDarkMode() {
    document.documentElement.classList.toggle("dark");
  }

  return <button onClick={toggleDarkMode}>Toggle theme</button>;
}
```tsx

配合样式：

```html id="m38fh8"
<div class="bg-white text-black dark:bg-slate-900 dark:text-white">
  Theme Card
</div>
```

暗黑模式的核心是：默认写 light 样式，再用 `dark:` 前缀写 dark 样式。

---

## 十二、自定义颜色和主题

Tailwind 有默认颜色系统，比如：

```html id="ut78rl"
<p class="text-blue-500">Blue Text</p>
<p class="bg-slate-900">Dark Background</p>
```tsx

但真实项目通常会有品牌色。

小范围自定义可以用任意值：

```html id="pxiznm"
<p class="text-[#954535]">Chestnut Text</p>
```

但如果这个颜色会多处使用，更推荐加入主题配置。

在 Tailwind CSS v4 中，很多配置可以直接写在 CSS 里。

例如：

```css id="8xjasf"
@theme {
  --color-chestnut: #954535;
}
```tsx

然后就可以这样使用：

```html id="ey5r3n"
<p class="text-chestnut">Chestnut Text</p>
```

这样做的好处是：如果以后品牌色变了，只需要改主题变量，所有地方都会更新。

类似地，你也可以配置字体、字号、断点、动画、容器等。

例如：

```css id="8r1k1v"
@theme {
  --font-display: "Inter", sans-serif;
  --color-brand: #635bff;
}
```tsx

使用：

```html id="x6yibc"
<h1 class="font-display text-brand">Brand Heading</h1>
```

---

## 十三、什么时候用任意值，什么时候放主题里

Tailwind 支持任意值：

```html id="f4xi80"
<div class="w-[372px] bg-[#10172a] text-[13px]"></div>
```text

但这不代表所有样式都应该这样写。

一个简单判断：

```text id="xlhjux"
只用一次的特殊值：可以用 arbitrary value
多处复用的颜色、字号、间距：放进 theme
属于设计系统的值：放进 theme
临时调试：可以用 arbitrary value
```

不要在项目里到处写：

```html id="5m4ypr"
text-[#954535] bg-[#954535] border-[#954535]
```text

更好的方式是：

```css id="4b4g5z"
@theme {
  --color-chestnut: #954535;
}
```

然后：

```html id="0ifsnu"
text-chestnut bg-chestnut border-chestnut
```tsx

这才是更可维护的写法。

---

## 十四、长 className 怎么办

Tailwind 最大的争议之一就是 className 很长。

例如一个按钮：

```html id="vqz494"
<button
  class="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white shadow-md transition hover:bg-blue-600 active:scale-95"
>
  Click me
</button>
```

如果这个按钮只用一次，问题不大。
但如果十几个地方都要用，就不应该复制粘贴。

有几种解决方式。

### 1. 抽成组件

在 React 中最推荐的方式是抽组件：

```tsx id="sj9olz"
function Button({ children }: { children: React.ReactNode }) {
  return (
    <button className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white shadow-md transition hover:bg-blue-600 active:scale-95">
      {children}
    </button>
  );
}
```tsx

使用时：

```tsx id="q4fctm"
<Button>Click me</Button>
```

这既保留了 Tailwind 的灵活性，又避免页面里到处堆长 className。

### 2. 使用 @apply

Tailwind 也支持 `@apply`，可以把多个工具类合成一个自定义 class。

例如：

```css id="7e7u27"
@layer components {
  .btn-primary {
    @apply rounded-lg bg-blue-500 px-4 py-2 font-semibold text-white shadow-md transition hover:bg-blue-600 active:scale-95;
  }
}
```tsx

使用：

```html id="2xtoyy"
<button class="btn-primary">Click me</button>
```

不过在 React 项目中，如果这个东西本身就是一个 UI 组件，通常直接抽 React 组件更自然。

`@apply` 更适合一些基础样式、组件层样式或你确实想在 CSS 中统一管理的场景。

---

## 十五、Base、Components、Utilities 分层

Tailwind 中可以用不同 layer 来组织样式。

### 1. base

适合定义全局基础元素样式，例如所有 `h1`、`p`、`body` 的默认样式：

```css id="4x1zih"
@layer base {
  h1 {
    @apply text-4xl font-bold;
  }

  p {
    @apply text-slate-600 dark:text-slate-300;
  }
}
```css

这样页面里的 `h1` 默认就会有统一样式。

### 2. components

适合定义可复用组件样式：

```css id="qtfb49"
@layer components {
  .card {
    @apply m-10 rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900;
  }
}
```

使用：

```html id="ph2f1n"
<div class="card">Card content</div>
```text

### 3. utilities

适合定义更原子化的小工具类：

```css id="j33sy3"
@utility flex-center {
  @apply flex items-center justify-center;
}
```

使用：

```html id="1tiipa"
<div class="flex-center">Centered content</div>
```text

例如 `flex-center` 就是非常常见的自定义工具类。它把：

```text id="y9n3hc"
flex
items-center
justify-center
```

合成一个更短的类。

---

## 十六、Tailwind 和组件库

Tailwind 不等于必须所有东西都从零写。

现在有很多基于 Tailwind 的组件库，比如：

```text id="2vyqy3"
Tailwind UI
Headless UI
shadcn/ui
```tsx

其中 shadcn/ui 非常受欢迎。它提供一批基础组件，比如 Button、Dialog、Card、Dropdown、Avatar 等。

它的好处是：组件代码可以直接进入你的项目，而不是像传统组件库那样把样式封死。

例如：

```tsx id="qsni95"
<Button variant="default" className="text-red-500">
  Button
</Button>
```

你仍然可以用 Tailwind 的 className 去定制它。

这也是 Tailwind 生态很强的原因：你既可以快速使用现成组件，又保留了高度自定义能力。

---

## 十七、一些实用 Tailwind 技巧

### 1. accent 修改表单控件颜色

可以修改 checkbox、radio 等默认强调色：

```html id="j8zwf9"
<input type="checkbox" class="accent-pink-500" />
```tsx

这样浏览器默认控件也能和你的主题风格更一致。

### 2. fluid text 流体字体

传统响应式字体可能这样写：

```html id="5xlpq8"
<h1 class="text-3xl md:text-5xl lg:text-7xl">Heading</h1>
```

它会在不同断点跳变。

如果想让字体随屏幕宽度平滑变化，可以使用 CSS 的 `clamp`：

```html id="g5bq43"
<h1 class="text-[clamp(2rem,10vw,70px)]">Fluid Heading</h1>
```text

含义是：

```text id="7vfz90"
最小 2rem
理想值 10vw
最大 70px
```

这样字体大小会随着屏幕宽度平滑变化，而不是只在断点处突然改变。

### 3. file 前缀美化文件上传

文件上传 input 默认样式很难看，Tailwind 提供了 `file:` 前缀：

```html id="16dtyh"
<input
  type="file"
  class="file:rounded-md file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-white"
/>
```tsx

这样可以直接控制文件上传按钮的样式。

### 4. selection 修改文本选中样式

默认选中文本通常是蓝色背景，你可以改成自己的样式：

```html id="otjtdc"
<p class="selection:bg-green-300 selection:text-green-900">Select this text.</p>
```

这比手写 `::selection` 更方便。

### 5. caret 修改输入光标颜色

```html id="rdv9vk"
<input class="caret-pink-500" />
```tsx

输入框中的光标颜色就会变成粉色。

### 6. open 状态减少 JavaScript

HTML 原生的 `details` 和 `summary` 可以配合 Tailwind 的 `open:` 使用：

```html id="bw41qa"
<details class="rounded-lg border p-4 open:bg-slate-100">
  <summary class="cursor-pointer font-semibold">More information</summary>
  <p class="mt-2 text-slate-600">
    This content is visible when details is open.
  </p>
</details>
```

这类交互可以少写很多 JavaScript。

---

## 十八、Tailwind 的伪类和状态

Tailwind 支持大量状态前缀。

常见的有：

```text id="e8y7p0"
hover:
focus:
active:
disabled:
checked:
open:
first:
last:
odd:
even:
dark:
group-hover:
peer-checked:
```tsx

例如：

```html id="oz13th"
<button
  class="bg-blue-500 hover:bg-blue-600 active:scale-95 disabled:opacity-50"
>
  Submit
</button>
```

再比如 group：

```html id="v3zlpk"
<div class="group">
  <h3 class="text-slate-900 group-hover:text-blue-500">Card Title</h3>
</div>
```tsx

当父元素 hover 时，子元素样式变化。

peer 也很有用：

```html id="bmbegn"
<input type="checkbox" class="peer" />
<p class="hidden peer-checked:block">Checkbox is checked.</p>
```

当 input 被选中时，后面的 p 显示。

这些能力可以让你少写很多 JavaScript。

---

## 十九、Tailwind 类名需要死记硬背吗

不需要。

Tailwind 的类名看起来多，但规律很强。

例如：

```text id="hkl3oz"
text-* 控制文本
bg-* 控制背景
border-* 控制边框
rounded-* 控制圆角
p-* 控制 padding
m-* 控制 margin
w-* 控制 width
h-* 控制 height
flex-* 控制 flex
grid-* 控制 grid
```text

写多了以后会形成肌肉记忆。

另外，开发时可以依赖工具：

```text id="51t9rc"
Tailwind CSS IntelliSense 插件
编辑器自动补全
Tailwind 官方文档搜索
hover 查看实际 CSS
```

在 VS Code 或 WebStorm 中安装 Tailwind 官方插件后，写类名会非常快，也能看到颜色预览和实际 CSS 说明。

不用担心一开始记不住。真正重要的是理解命名规律和 CSS 本身。

---

## 二十、Tailwind 的最佳实践总结

Tailwind 很灵活，但也需要一些使用原则。

### 1. 先写移动端，再写大屏

```html id="8e4jwy"
<div class="flex flex-col md:flex-row">...</div>
```tsx

不要一开始就只盯着桌面端。

### 2. 复用 UI 时抽组件

不要到处复制长 className：

```tsx id="3p1ihh"
<Button>Submit</Button>
<Card>...</Card>
<Navbar />
```

### 3. 复用设计值时放 theme

品牌色、字体、断点、字号，不要到处写 arbitrary value。

### 4. 特殊一次性值用方括号

```html id="t3xyzz"
<div class="w-[372px]"></div>
```text

但不要滥用。

### 5. 不要把 Tailwind 当成不会 CSS 的替代品

Tailwind 只是让 CSS 更快、更统一。
你仍然需要理解：

```text id="kg6ngi"
盒模型
Flexbox
Grid
定位
响应式
伪类
层叠和继承
```

Tailwind 越好用，越要求你理解 CSS 基础。

---

## 总结

Tailwind CSS 的核心价值，不是“少写 CSS 文件”，而是提供了一种更直接、更一致、更高效的样式开发方式。

它通过 utility-first 思想，让你可以快速组合样式；通过 JIT 编译器，让最终 CSS 保持精简；通过响应式前缀，让移动优先布局变得直观；通过 `dark:`、`hover:`、`focus:` 等状态前缀，让复杂交互样式变得简单；通过 theme、layer、apply、utility 等机制，又保留了足够的工程化和可维护性。

你可以把 Tailwind 理解成一套现代 CSS 工作流：

```text id="otzy1f"
用工具类快速写样式
用组件抽象复用 UI
用 theme 管理设计系统
用响应式前缀适配设备
用 dark 前缀支持主题
用伪类前缀减少 JavaScript
用 arbitrary value 处理特殊场景
```

真正掌握 Tailwind 后，你会发现它不是让代码变乱，而是让样式逻辑离 UI 更近，让开发过程更快，也让响应式和主题能力更容易落地。

Tailwind 不是替代 CSS 基础，而是建立在 CSS 基础之上的高效工具。
如果你理解 Flexbox、Grid、响应式、盒模型，再配合 Tailwind 的工具类体系，就可以非常快速地构建干净、响应式、可维护的现代 UI。
