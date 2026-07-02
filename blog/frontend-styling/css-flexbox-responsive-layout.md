# CSS Flexbox 完整入门：从居中一个 div 到响应式布局

如果你曾经在 CSS 中遇到过这些问题：

```text id="su4ncr"
元素溢出
布局错位
窗口缩小时内容挤在一起
不知道怎么水平垂直居中
响应式布局写得很痛苦
```text

那 Flexbox 是你必须掌握的核心布局技术之一。

Flexbox 的强大之处在于，它可以让我们用非常少的 CSS 代码，完成元素对齐、居中、换行、自动伸缩和响应式布局。

很多人刚开始学 CSS 时，会用 `margin`、`padding`、`position` 去硬调布局。但理解 Flexbox 之后，你会发现很多布局问题其实可以变得非常简单。

---

## 一、Flexbox 是什么？

Flexbox，全称是 Flexible Box Layout，也就是弹性盒布局。

它的核心作用是：

```text id="m0e8w4"
在一个父容器中，灵活地排列、对齐、分布和缩放子元素。
```

要使用 Flexbox，首先要找到一个父元素，然后给它设置：

```css id="mv4gao"
display: flex;
```tsx

这个父元素就变成了 flex container，也就是弹性容器。

它里面的直接子元素就变成了 flex items，也就是弹性项目。

例如：

```html id="ktycms"
<body>
  <div class="box">1</div>
  <div class="box">2</div>
  <div class="box">3</div>
  <div class="box">4</div>
  <div class="box">5</div>
</body>
```

如果给 `body` 设置：

```css id="5ngs0z"
body {
  display: flex;
}
```css

原本从上到下排列的 div，会变成从左到右排列。

因为 Flexbox 默认主轴方向是横向。

---

## 二、为什么 display: flex 会改变元素排列？

在普通 HTML 中，很多元素默认是 `display: block`。

块级元素有一个特点：

```text id="u4abnl"
默认占满整行宽度，后面的元素会换到下一行。
```

所以多个 div 默认会一个接一个向下排列。

而一旦父元素设置了：

```css id="ljeczc"
display: flex;
```text

它的子元素就进入 Flexbox 布局系统。此时它们默认会沿着主轴排列，也就是从左到右排成一行。

---

## 三、Flexbox 最重要的概念：主轴和交叉轴

学习 Flexbox，必须理解两个轴：

```text id="o8sith"
主轴 main axis
交叉轴 cross axis
```

默认情况下：

```text id="z075mr"
主轴：从左到右
交叉轴：从上到下
```text

也就是说，默认 `flex-direction: row` 时：

```text id="rzfi36"
justify-content 控制水平方向
align-items 控制垂直方向
```

这是 Flexbox 的核心。

---

## 四、justify-content：控制主轴对齐

`justify-content` 用来控制元素在主轴上的位置。

默认主轴是横向，所以它默认控制水平排列。

常见值有：

```text id="a51dzf"
flex-start
center
flex-end
space-between
space-around
space-evenly
```css

---

### flex-start

```css id="wru80y"
body {
  display: flex;
  justify-content: flex-start;
}
```

元素会排列在主轴起点，也就是左侧。

这也是默认值。

---

### flex-end

```css id="0d7ief"
body {
  display: flex;
  justify-content: flex-end;
}
```css

元素会排列在主轴终点，也就是右侧。

---

### center

```css id="2c6xnn"
body {
  display: flex;
  justify-content: center;
}
```

元素会在主轴方向居中。

在默认情况下，也就是水平居中。

---

## 五、align-items：控制交叉轴对齐

`align-items` 用来控制元素在交叉轴上的位置。

默认交叉轴是纵向，所以它默认控制垂直方向。

为了看出效果，我们可以给父容器一个高度：

```css id="l8yt4c"
body {
  min-height: 800px;
  display: flex;
}
```text

然后使用：

```css id="d762yp"
align-items: flex-start;
```

元素会在交叉轴起点，也就是顶部。

```css id="0z7j6k"
align-items: flex-end;
```text

元素会在交叉轴终点，也就是底部。

```css id="833soi"
align-items: center;
```

元素会在交叉轴方向居中。

---

## 六、如何用 Flexbox 居中一个 div？

经典问题来了：

```text id="ly88r0"
如何水平垂直居中一个 div？
```css

用 Flexbox，只需要三行核心代码：

```css id="2dfi3o"
body {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

如果你想让它在整个视口里居中，可以加上：

```css id="60x9h0"
min-height: 100vh;
```css

完整写法：

```css id="jn5oa5"
body {
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}
```

这就是最经典的 Flexbox 居中方案。

它的优点是：

```text id="28z2kh"
代码少
可读性强
响应式自然
父容器大小变化后仍然保持居中
```text

---

## 七、space-between、space-around、space-evenly 的区别

除了 `flex-start`、`center`、`flex-end`，`justify-content` 还有几个常用值。

---

### space-between

```css id="7920v9"
justify-content: space-between;
```

效果是：

```text id="mewsm6"
第一个元素贴左边
最后一个元素贴右边
中间元素平均分布
```text

适合导航栏等布局。

---

### space-around

```css id="fv7al7"
justify-content: space-around;
```

每个元素左右都有空间。

但因为相邻元素的空间会叠加，所以元素之间的间距会比两端间距更大。

简单理解：

```text id="svriii"
两端空间较小
元素之间空间较大
```text

---

### space-evenly

```css id="2rsi1x"
justify-content: space-evenly;
```

所有间距完全相等。

包括：

```text id="mf7w7c"
左边缘到第一个元素
元素与元素之间
最后一个元素到右边缘
```text

如果你想要视觉上完全均匀的间距，`space-evenly` 通常更舒服。

---

## 八、flex-direction：改变主轴方向

默认情况下，Flexbox 的主轴是横向：

```css id="4q8rej"
flex-direction: row;
```

也就是从左到右。

你也可以改成：

```css id="9cuzcj"
flex-direction: row-reverse;
```text

这样主轴从右到左，元素顺序也会反过来。

还可以改成纵向：

```css id="zt0y27"
flex-direction: column;
```

此时元素会从上到下排列。

---

## 九、flex-direction 会影响 justify-content 和 align-items

这是很多新手最容易混乱的地方。

当：

```css id="gojga9"
flex-direction: row;
```text

主轴是横向：

```text id="gp413q"
justify-content 控制水平
align-items 控制垂直
```

但当：

```css id="7fxp4q"
flex-direction: column;
```text

主轴变成纵向：

```text id="a33ahw"
justify-content 控制垂直
align-items 控制水平
```

所以，`justify-content` 并不永远等于“水平居中”。

它永远控制的是：

```text id="nl2ds9"
主轴方向
```text

`align-items` 也不永远等于“垂直居中”。

它永远控制的是：

```text id="fpgp9g"
交叉轴方向
```

理解这一点，Flexbox 就不会乱。

---

## 十、一个常见页面布局：纵向排列，水平居中

很多网站页面整体是从上到下排列的，但内容需要水平居中。

可以这样写：

```css id="41bn17"
body {
  display: flex;
  flex-direction: column;
  align-items: center;
}
```text

解释一下：

```text id="3fi6wa"
flex-direction: column：元素从上到下排列
align-items: center：在交叉轴上居中，也就是水平居中
```

这就是很多页面布局的基础结构。

---

## 十一、gap：控制元素之间的间距

以前我们经常用 margin 控制子元素之间的间距。

在 Flexbox 里，更推荐用：

```css id="51f8j5"
gap: 20px;
```css

例如：

```css id="ihdl69"
.container {
  display: flex;
  gap: 20px;
}
```

这样每个 flex item 之间都会有 20px 的间距。

相比给每个子元素写 margin，`gap` 更清晰，也更不容易出现首尾多余间距。

---

## 十二、flex-wrap：让元素自动换行

默认情况下，Flexbox 不会自动换行。

如果空间不够，子元素可能会被压缩，甚至溢出。

可以使用：

```css id="g1y5iy"
flex-wrap: wrap;
```css

这样当一行放不下时，元素会自动换到下一行。

示例：

```css id="ne8q1f"
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
```

这对响应式布局非常有用。

比如卡片列表、小标签列表、按钮组等，都很适合用 `flex-wrap`。

---

## 十三、align-content：控制多行整体对齐

当 flex item 换成多行之后，就会出现一个新问题：

```text id="nrz9th"
每一行内部怎么对齐？
所有行整体又怎么对齐？
```text

这时候要区分两个属性：

```text id="lo09re"
align-items：控制每一行内部，在交叉轴上的对齐
align-content：控制多行整体，在交叉轴上的分布
```

如果只有一行，`align-content` 基本没什么明显作用。

只有当：

```css id="0282b9"
flex-wrap: wrap;
```css

并且出现多行时，`align-content` 才有意义。

比如：

```css id="ket2r9"
.container {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
}
```

这样多行内容会整体居中。

---

## 十四、align-items 和 align-content 的区别

可以这样记：

```text id="fskkus"
align-items：管每一行里的项目
align-content：管多行整体
```text

比如有三行卡片：

```text id="at0hcm"
第一行：1 2 3
第二行：4 5 6
第三行：7 8 9
```

`align-items` 负责每一行里的元素在交叉轴上怎么对齐。

`align-content` 负责这三行整体在父容器里怎么分布。

如果要做一个多行都居中的布局，可能会用到：

```css id="6n4uo8"
.container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
}
```text

---

## 十五、row-gap 和 column-gap

`gap` 会同时控制行间距和列间距。

如果你想分别控制，可以使用：

```css id="nkhjmq"
row-gap: 20px;
column-gap: 10px;
```

例如：

```css id="515rum"
.container {
  display: flex;
  flex-wrap: wrap;
  row-gap: 20px;
  column-gap: 10px;
}
```text

这表示：

```text id="jwxwcz"
行与行之间 20px
列与列之间 10px
```

不过在大多数 Flexbox 场景中，直接使用 `gap` 就够了。

---

## 十六、Flexbox 不只可以用在 body 上

前面的例子经常把 Flexbox 写在 `body` 上，但实际上任何 HTML 元素都可以成为 flex container。

比如我们有一个 box，里面有数字：

```html id="yq6tg0"
<div class="box">1</div>
```css

如果想让数字在 box 内部水平垂直居中，可以给 `.box` 自己设置 flex：

```css id="v4rp8e"
.box {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

也就是说：

```text id="pzii5k"
一个元素可以是父级 flex container
它自己也可以是另一个 flex container 里的 flex item
```text

Flexbox 可以层层嵌套使用。

---

## 十七、flex-shrink：控制元素是否允许缩小

Flexbox 不只可以对齐元素，还可以控制元素如何伸缩。

默认情况下，flex item 是允许缩小的。

也就是：

```css id="26xjvi"
flex-shrink: 1;
```

当容器空间不够时，子元素会自动变窄。

如果你不希望某个元素被压缩，可以设置：

```css id="k28wxw"
flex-shrink: 0;
```text

例如：

```css id="sqriw0"
.icon {
  flex-shrink: 0;
}
```

这在图标、头像、固定按钮等场景中很常见。

因为你通常不希望图标被压扁。

---

## 十八、flex-shrink 的实际场景

比如一个待办事项：

```text id="4evxhv"
[checkbox]  Todo text goes here...  [delete button]
```text

你希望：

```text id="h644xn"
checkbox 不缩小
delete button 不缩小
中间文本可以缩小或换行
```

可以这样写：

```css id="eipqoh"
.checkbox,
.delete-button {
  flex-shrink: 0;
}

.todo-text {
  flex-shrink: 1;
}
```text

这样窗口变窄时，被压缩的是文本区域，而不是图标或按钮。

---

## 十九、flex-grow：控制元素是否填满剩余空间

`flex-grow` 控制元素是否可以增长，占据剩余空间。

默认值是：

```css id="flm89v"
flex-grow: 0;
```

也就是不主动增长。

如果设置：

```css id="8o1s1s"
flex-grow: 1;
```text

元素就会尝试占据父容器中剩余的空间。

例如：

```css id="k4yu93"
.todo-text {
  flex-grow: 1;
}
```

这样待办文本会尽可能占满中间区域，而左边 checkbox 和右边按钮保持原有大小。

这是非常常见的布局技巧。

---

## 二十、flex-grow 可以设置不同权重

`flex-grow` 不只是开关，也可以是比例。

比如：

```css id="dnhr6j"
.box {
  flex-grow: 1;
}

.box-1 {
  flex-grow: 5;
}
```text

这表示当有剩余空间时，`.box-1` 会比其他元素获得更多空间。

注意，这不是说 `.box-1` 永远是其他元素的 5 倍宽。

更准确地说：

```text id="ab8a4t"
当父容器有剩余空间时，box-1 分配剩余空间的速度/比例更高。
```

实际项目中，大多数时候只需要用 `0` 和 `1`，也就是允许增长或不允许增长。

---

## 二十一、flex-shrink 也可以设置不同权重

同样，`flex-shrink` 也可以设置权重。

比如：

```css id="ffzk14"
.box {
  flex-shrink: 1;
}

.box-1 {
  flex-shrink: 5;
}
```text

表示空间不足时，`.box-1` 会比其他元素缩得更快。

不过实际项目中，大多数情况下也只是用：

```text id="uqrvm6"
flex-shrink: 0
flex-shrink: 1
```

比如：

```css id="p9a0k9"
.avatar {
  flex-shrink: 0;
}
```text

防止头像被压缩。

---

## 二十二、配合 min-width 和 max-width 控制伸缩边界

Flexbox 的伸缩能力配合 `min-width` 和 `max-width` 会更实用。

比如你希望卡片可以增长，但不要超过 300px：

```css id="tn2fri"
.card {
  flex-grow: 1;
  max-width: 300px;
}
```

这表示：

```text id="z5vbc4"
有空间时卡片可以变大
但最大不能超过 300px
```text

如果你希望卡片可以缩小，但不能小于 100px：

```css id="l3d37r"
.card {
  flex-shrink: 1;
  min-width: 100px;
}
```

这表示：

```text id="sp9jrn"
空间不够时卡片可以缩小
但最小不能小于 100px
```css

如果小于这个宽度会影响内容可读性，就应该设置最小宽度。

---

## 二十三、flex-wrap + min-width 是响应式布局常用组合

一个很常见的响应式卡片布局可以这样写：

```css id="4ej7bp"
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.card {
  flex-grow: 1;
  min-width: 240px;
}
```

这段代码的效果是：

```text id="ik8yab"
空间足够时，卡片并排显示
空间变窄时，卡片缩小
缩小到 240px 后，不再继续压缩
如果一行放不下，就自动换行
```text

这就是 Flexbox 做响应式布局非常经典的方式。

---

## 二十四、align-self：单独控制某一个元素的交叉轴对齐

前面讲的 `align-items` 是作用在父容器上的，它会影响所有子元素。

如果你只想让某一个子元素单独改变交叉轴对齐方式，可以用：

```css id="vd6w4f"
align-self: center;
```

比如：

```css id="kfln1s"
.container {
  display: flex;
  align-items: flex-start;
}

.box-1 {
  align-self: flex-end;
}
```text

这样其他元素仍然在顶部，但 `.box-1` 会单独移动到底部。

常见值有：

```text id="e46c3r"
flex-start
center
flex-end
stretch
```

---

## 二十五、为什么没有 justify-self？

在 Flexbox 中，很多人会自然想到：

```css id="jrqclw"
justify-self: flex-start;
```text

但在 Flexbox 里，`justify-self` 基本不起作用。

因为 Flexbox 是一维布局系统，主轴上的空间分配是由整个 flex line 统一决定的，不是每个元素单独决定的。

如果你想让某个元素在主轴上“推开”其他元素，常用技巧是 margin auto。

---

## 二十六、margin-right: auto 的经典用法

比如导航栏中：

```text id="5zy3l8"
左边是 logo
右边是导航链接和按钮
```

HTML：

```html id="lkh2jg"
<nav class="nav">
  <div class="logo">Logo</div>
  <a href="#">Home</a>
  <a href="#">About</a>
  <button>Login</button>
</nav>
```css

CSS：

```css id="bsfp55"
.nav {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  margin-right: auto;
}
```

`margin-right: auto` 会把 logo 后面的剩余空间全部吃掉，从而把右侧导航推到最右边。

这在导航栏布局里非常常用。

---

## 二十七、Flexbox 适合解决什么问题？

Flexbox 最适合解决一维布局问题。

所谓一维，就是主要处理：

```text id="diwyu4"
一行
一列
横向排列
纵向排列
局部组件内部布局
```text

常见场景包括：

```text id="7vjz0v"
按钮组
导航栏
卡片内部布局
头像 + 文本
表单项
标签列表
工具栏
弹窗底部按钮
居中布局
简单响应式卡片列表
```

如果你的布局主要是横向或纵向排列，Flexbox 通常非常合适。

---

## 二十八、Flexbox 和 Grid 怎么选？

Flexbox 很强，但不是所有布局都应该用 Flexbox。

简单区分：

```text id="xef7gn"
Flexbox：更适合一维布局
Grid：更适合二维布局
```text

Flexbox 适合：

```text id="bmxraf"
一行或一列的排列
元素根据内容自动伸缩
局部组件内部布局
```

Grid 适合：

```text id="40nr2q"
复杂页面布局
同时控制行和列
规则网格
仪表盘布局
图片区块
多区域页面结构
```css

比如居中一个 div，Flexbox 写法是：

```css id="d2enjg"
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

Grid 写法可以更短：

```css id="w4y3s8"
.container {
  display: grid;
  place-content: center;
}
```css

不过这不代表 Grid 一定更好。实际项目里，Flexbox 和 Grid 经常搭配使用。

---

## 二十九、Flexbox 核心知识总结

Flexbox 可以总结成几组核心概念。

### 开启 Flexbox

```css id="5qayhw"
display: flex;
```

### 改变主轴方向

```css id="73y1et"
flex-direction: row;
flex-direction: column;
```text

### 主轴对齐

```css id="uao3x1"
justify-content: flex-start;
justify-content: center;
justify-content: flex-end;
justify-content: space-between;
justify-content: space-around;
justify-content: space-evenly;
```

### 交叉轴对齐

```css id="wvzlx0"
align-items: flex-start;
align-items: center;
align-items: flex-end;
```text

### 多行整体对齐

```css id="si2g4v"
align-content: center;
```

### 自动换行

```css id="iej9ms"
flex-wrap: wrap;
```text

### 元素间距

```css id="vzkcx6"
gap: 20px;
```

### 子元素增长

```css id="ph5bto"
flex-grow: 1;
```text

### 子元素缩小

```css id="gr427b"
flex-shrink: 0;
```

### 单独控制某个子元素

```css id="u4l4tw"
align-self: center;
```text

### 主轴推开元素

```css id="twokmh"
margin-right: auto;
```

---

## 三十、最常用的 Flexbox 模板

### 水平垂直居中

```css id="cz60hs"
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}
```css

---

### 纵向布局，水平居中

```css id="n0karc"
.page {
  display: flex;
  flex-direction: column;
  align-items: center;
}
```

---

### 导航栏布局

```css id="awvm8q"
.nav {
  display: flex;
  align-items: center;
  gap: 20px;
}

.logo {
  margin-right: auto;
}
```css

---

### 响应式卡片列表

```css id="9ek5kw"
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.card {
  flex-grow: 1;
  min-width: 240px;
  max-width: 320px;
}
```

---

### 左图标 + 右文本

```css id="gszxbq"
.item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon {
  flex-shrink: 0;
}
```text

---

## 总结

Flexbox 是现代 CSS 布局中最重要的基础之一。

它解决的核心问题是：

```text id="7go4ui"
如何在一个容器里灵活排列、对齐、分布和缩放子元素。
```

掌握 Flexbox 后，你会更容易处理：

```text id="hngxm2"
水平垂直居中
导航栏
按钮组
卡片布局
响应式换行
元素溢出
局部组件排版
```text

学习 Flexbox 最重要的是理解：

```text id="0rwi1f"
主轴和交叉轴
```

然后记住：

```text id="e7d7tv"
justify-content 控制主轴
align-items 控制交叉轴
flex-direction 会改变主轴方向
flex-wrap 负责换行
gap 负责间距
flex-grow 负责增长
flex-shrink 负责缩小
```

如果你能熟练使用这些属性，再配合 `min-width`、`max-width` 和媒体查询，就已经可以完成大多数响应式布局。

Flexbox 不是 CSS 的全部，但它是你真正理解现代 CSS 布局的第一步。
