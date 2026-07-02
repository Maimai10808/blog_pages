# CSS Grid 完整入门：从基础网格到响应式布局实战

CSS Grid 是现代 CSS 布局中非常重要的一部分。

如果说 Flexbox 更适合处理一维布局，比如一行按钮、一列菜单、卡片内部的图文排列，那么 Grid 更适合处理二维布局，也就是同时控制行和列。

很多复杂页面，比如电商商品列表、作品集布局、仪表盘、Bento Grid、图片画廊、首页 Hero 区域，都可以用 CSS Grid 更清晰地实现。

本文会从最基础的 Grid 概念讲起，一直到响应式 Grid、隐式网格、Bento Grid、Grid Stacking，以及一个真实的商品列表布局。

---

## 一、Grid 的基本结构

使用 CSS Grid 时，HTML 结构通常由两部分组成：

```text id="fujyge"
父元素：grid container
子元素：grid items
```tsx

例如：

```html id="ydnjq3"
<div class="grid-container">
  <div class="item">1</div>
  <div class="item">2</div>
  <div class="item">3</div>
  <div class="item">4</div>
  <div class="item">5</div>
  <div class="item">6</div>
  <div class="item">7</div>
  <div class="item">8</div>
  <div class="item">9</div>
</div>
```

在 CSS 中，只需要给父元素设置：

```css id="ot4xud"
.grid-container {
  display: grid;
}
```css

这个父元素就变成了 grid container，里面的直接子元素就变成了 grid items。

---

## 二、默认情况下 Grid 会怎么排列？

如果只写：

```css id="bqo022"
.grid-container {
  display: grid;
}
```

但不指定列和行，浏览器会自动生成布局。

通常情况下，元素会变成：

```text id="dvajpr"
1 列，多行
```css

比如 9 个子元素，就会形成 1 列 9 行。

这不是我们最常见的布局，所以通常需要手动声明列。

---

## 三、grid-template-columns：定义列

`grid-template-columns` 用来定义网格有多少列，以及每一列多宽。

例如：

```css id="l0o2y3"
.grid-container {
  display: grid;
  grid-template-columns: 200px 200px 200px;
}
```

这表示创建三列，每列宽度都是 200px。

你可以理解为：

```text id="7e91an"
第一个 200px：第一列
第二个 200px：第二列
第三个 200px：第三列
```css

如果你想让其中一列更宽，也可以这样写：

```css id="vzow25"
.grid-container {
  display: grid;
  grid-template-columns: 200px 400px 200px;
}
```

这表示中间列是 400px，左右两列是 200px。

Grid 的核心就是：

```text id="fgbfr3"
通过定义列和行，控制子元素在二维空间里的排列。
```css

---

## 四、grid-template-rows：定义行

和列类似，行可以通过 `grid-template-rows` 定义。

比如：

```css id="hdr9ci"
.grid-container {
  display: grid;
  grid-template-columns: 200px 200px 200px;
  grid-template-rows: 200px 200px 200px;
}
```

这样就形成了一个类似九宫格的布局：

```text id="th2yr0"
3 列 × 3 行
```css

不过在实际项目里，`grid-template-rows` 不一定经常手动写。

因为很多时候，行的高度可以根据内容自动生成。

我们更常写的是列：

```css id="yt56cn"
grid-template-columns: ...;
```

然后让行自动根据内容排列。

---

## 五、gap：设置行列之间的间距

`gap` 用来设置网格项之间的间距。

```css id="jq7nmp"
.grid-container {
  display: grid;
  grid-template-columns: 200px 200px 200px;
  gap: 16px;
}
```text

这会同时给行和列之间添加 16px 的间距。

如果你想分别控制行间距和列间距，可以写：

```css id="2yhd8g"
.grid-container {
  row-gap: 24px;
  column-gap: 16px;
}
```

但大多数时候，直接使用 `gap` 就足够了。

---

## 六、fr：Grid 中最重要的响应式单位

固定像素虽然直观，但不够响应式。

比如：

```css id="9wfukg"
grid-template-columns: 200px 200px 200px;
```text

在大屏上可能空间浪费，在小屏上可能溢出。

Grid 提供了一个非常重要的单位：

```text id="m7devy"
fr
```

`fr` 是 fraction，表示剩余空间的一份。

比如：

```css id="v8xswl"
.grid-container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}
```text

表示三列平分父容器的可用宽度。

也就是说：

```text id="6dwx8g"
第一列：1 份
第二列：1 份
第三列：1 份
```

如果父容器变宽，三列一起变宽。
如果父容器变窄，三列一起变窄。

---

## 七、fr 可以按比例分配空间

`fr` 可以不只是平均分。

比如：

```css id="7etger"
.grid-container {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
}
```text

这表示：

```text id="5293jl"
第一列占 1 份
第二列占 2 份
第三列占 1 份
```

中间列会比左右两列宽。

注意，这不是固定宽度，而是按可用空间比例分配。

---

## 八、混合使用固定值和 fr

Grid 很适合处理“一个区域固定，一个区域自适应”的布局。

比如常见的侧边栏 + 主内容：

```html id="nw65ga"
<div class="layout">
  <aside>Sidebar</aside>
  <main>Main Content</main>
</div>
```css

CSS：

```css id="26n2c4"
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
}
```

含义是：

```text id="7xwj5e"
侧边栏固定 240px
主内容占据剩余空间
```text

这类布局非常常见：

```text id="40qlqq"
后台管理系统
文档站
仪表盘
个人博客
电商筛选侧栏
```

---

## 九、fr 是相对于 Grid 容器，不是浏览器窗口

有一点要特别注意：

```text id="tmo62u"
fr 是相对于 grid container 的可用空间计算的，不是相对于 viewport。
```css

比如：

```css id="o9x6cc"
.grid-container {
  grid-template-columns: 1fr 1fr 1fr;
}
```

这三列平分的是 `.grid-container` 的宽度，不一定是整个屏幕宽度。

如果你给 grid container 设置了固定宽度，那么 `fr` 就只在这个固定容器内部计算。

---

## 十、Grid 中的对齐：items 和 content 的区别

Grid 里的对齐属性容易混淆。

主要分两组：

```text id="ccu2p0"
justify-items / align-items
justify-content / align-content
```text

它们不是一回事。

---

## 十一、justify-items 和 align-items：控制单元格内的子元素

假设每个 grid cell 是 300px × 300px，但里面的 item 只有 100px × 100px。

这时就会出现一个问题：

```text id="3x2mlx"
item 在自己的 cell 里面放在哪里？
```

这个由：

```css id="pqyv2v"
justify-items
align-items
```text

控制。

### justify-items：控制水平对齐

```css id="0udgmk"
.grid-container {
  justify-items: start;
}
```

表示 item 在自己的 cell 内水平靠左。

```css id="ixl970"
justify-items: center;
```text

表示水平居中。

```css id="zfmv8s"
justify-items: end;
```

表示水平靠右。

---

### align-items：控制垂直对齐

```css id="hhgbm5"
.grid-container {
  align-items: start;
}
```text

表示 item 在自己的 cell 内垂直靠上。

```css id="i9bf87"
align-items: center;
```

表示垂直居中。

```css id="rjw7yr"
align-items: end;
```text

表示垂直靠下。

---

### 单元格内完全居中

```css id="55wtb0"
.grid-container {
  justify-items: center;
  align-items: center;
}
```

或者简写：

```css id="ixcfw8"
.grid-container {
  place-items: center;
}
```text

---

## 十二、justify-content 和 align-content：控制整个 Grid 在容器中的位置

如果 grid 本身没有占满整个容器，那么就需要控制“整个网格”在父容器里的位置。

这时用：

```css id="nmzrv7"
justify-content
align-content
```

### justify-content

控制整个 grid 在容器中的水平位置：

```css id="ulukz1"
.grid-container {
  justify-content: center;
}
```text

### align-content

控制整个 grid 在容器中的垂直位置：

```css id="f8svj4"
.grid-container {
  align-content: center;
}
```

注意：

```text id="wffilb"
justify-items / align-items：控制 item 在 cell 内的位置
justify-content / align-content：控制整个 grid 在 container 内的位置
```text

这是 Grid 对齐中最重要的区别。

---

## 十三、隐式网格：当元素数量不确定时怎么办？

前面我们手动定义了三列三行。

但现实项目中，元素数量往往是不确定的。

比如：

```text id="jsa47y"
搜索结果
商品列表
文章列表
图片列表
数据库返回的数据
```

你不知道会有 5 个、20 个还是 200 个元素。

这时就会出现隐式网格，也就是浏览器自动生成的行或列。

---

## 十四、grid-auto-rows：控制自动生成的行

假设你定义了 3 列，但元素超过了第一屏需要的行数。

多出来的元素会自动进入新行。

可以用：

```css id="dj2esi"
grid-auto-rows: 300px;
```css

控制自动生成的每一行高度。

例如：

```css id="4ka3q5"
.grid-container {
  display: grid;
  grid-template-columns: 300px 300px 300px;
  grid-auto-rows: 300px;
  gap: 16px;
}
```

这样无论数据有多少行，每一行高度都是 300px。

很多情况下，你甚至不需要写 `grid-template-rows`，只需要写：

```css id="wkuvff"
grid-auto-rows: 300px;
```text

让所有行自动生成。

---

## 十五、grid-auto-flow：控制自动填充方向

默认情况下，grid items 会按行排列。

也就是：

```css id="1x4jia"
grid-auto-flow: row;
```

如果你希望新元素按列方向添加，可以写：

```css id="vop8gj"
grid-auto-flow: column;
```text

这时通常配合：

```css id="pn02uf"
grid-auto-columns: 300px;
```

例如：

```css id="9ngg74"
.grid-container {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 300px;
  gap: 16px;
  overflow-x: auto;
}
```text

这很适合横向滚动布局，比如：

```text id="512x7i"
Netflix 风格横向卡片列表
横向图片画廊
横向推荐列表
```

---

## 十六、Bento Grid：跨行跨列的网格布局

CSS Grid 最强大的地方之一，是可以让元素跨越多个行和列。

这种布局常被称为 Bento Grid，因为看起来像日式便当盒。

比如一个布局：

```text id="zjh68x"
box1 占左侧两行
box2 占中间上方两列
box3 占右上
box4 占中下
box5 占右下两列
```tsx

这种布局用 Flexbox 会非常困难，但用 Grid 很自然。

---

## 十七、使用 grid-area 给元素命名

可以先给每个 item 定义一个名字：

```html id="3ijcis"
<div class="box" style="grid-area: box1">1</div>
<div class="box" style="grid-area: box2">2</div>
<div class="box" style="grid-area: box3">3</div>
<div class="box" style="grid-area: box4">4</div>
<div class="box" style="grid-area: box5">5</div>
```

也可以在 CSS 中写：

```css id="pmjyte"
.box1 {
  grid-area: box1;
}
```css

用内联 style 只是为了演示方便。正式项目中，通常建议放在 CSS 或组件 class 中。

---

## 十八、grid-template-areas：用“文字地图”描述布局

`grid-template-areas` 是 Grid 中非常直观的能力。

例如：

```css id="g7ikyk"
.grid-container {
  display: grid;
  grid-template-columns: repeat(4, 200px);
  grid-template-rows: repeat(2, 200px);
  gap: 1rem;

  grid-template-areas:
    "box1 box2 box2 box3"
    "box1 box4 box5 box5";
}
```

这两行字符串代表两行网格。

第一行：

```text id="x3digy"
box1 box2 box2 box3
```text

第二行：

```text id="8reol9"
box1 box4 box5 box5
```

含义是：

```text id="gmvipu"
box1 占第一列两行
box2 占第一行中间两列
box3 在右上角
box4 在第二行第二列
box5 占第二行右侧两列
```css

这就是 Bento Grid 的核心。

---

## 十九、grid-template-areas 为什么适合响应式？

它最强的地方是：你可以在不同屏幕尺寸下重新排列区域。

比如桌面端：

```css id="g79mwy"
.grid-container {
  grid-template-areas:
    "box1 box2 box2 box3"
    "box1 box4 box5 box5";
}
```

平板端改成 3 × 3：

```css id="zfvl98"
@media (max-width: 900px) {
  .grid-container {
    grid-template-columns: repeat(3, 200px);
    grid-template-rows: repeat(3, 200px);

    grid-template-areas:
      "box1 box1 box2"
      "box3 box4 box2"
      "box5 box5 box5";
  }
}
```css

移动端改成 2 列：

```css id="9jibr4"
@media (max-width: 600px) {
  .grid-container {
    grid-template-columns: repeat(2, 1fr);

    grid-template-areas:
      "box1 box1"
      "box2 box3"
      "box4 box5"
      "box5 box5";
  }
}
```

你可以只通过修改“文字地图”，就改变整个页面布局。

这就是 CSS Grid 非常适合复杂响应式布局的原因。

---

## 二十、用隐式网格简化 Bento Grid

如果你不想在每个媒体查询里都写：

```css id="orlxkd"
grid-template-columns
grid-template-rows
```text

也可以使用：

```css id="l625ny"
grid-auto-columns
grid-auto-rows
```

比如：

```css id="5ql2gx"
.grid-container {
  display: grid;
  grid-auto-columns: 200px;
  grid-auto-rows: 200px;
  gap: 1rem;
}
```css

然后只写：

```css id="x7yuz1"
grid-template-areas:
  "box1 box2 box2 box3"
  "box1 box4 box5 box5";
```

Grid 会根据 `grid-template-areas` 自动生成需要的行列。

这种方式更短，但控制力略低。

如果你想完全掌控每一列、每一行的大小，还是显式写 `grid-template-columns` 和 `grid-template-rows` 更稳。

---

## 二十一、Bento Grid 中内容高度怎么处理？

Bento Grid 很适合展示图片、图表、产品特性、可视化模块。

但如果往里面塞大量文字，就容易出问题。

你需要决定：

```text id="rhzx9r"
是让内容溢出隐藏？
还是让 grid 自动被内容撑开？
```text

如果你希望网格保持整齐，可以写：

```css id="ua8qoa"
.box {
  overflow: hidden;
}
```

如果你希望行高根据内容变化，可以使用：

```css id="76t6lb"
grid-auto-rows: auto;
```text

不过 `auto` 会让每一行根据内容高度变化，有时会导致布局不够平衡。

另一种方式是：

```css id="v4afjp"
grid-auto-rows: 1fr;
```

这样行高会更均匀。

一般建议：

```text id="hebi9p"
Bento Grid 更适合图片、图表、短文案和视觉模块，不适合放大量正文。
```text

---

## 二十二、Grid Stacking：用 Grid 实现元素重叠

Grid 不只是用来做卡片排列，也可以用来实现元素叠放。

比如：

```text id="pexwih"
图片上放文字
视频背景上放内容
多个图层叠在一起
图表重叠展示
```

传统做法通常是：

```css id="pjsd31"
.wrapper {
  position: relative;
}

.content {
  position: absolute;
}
```css

这种方式可以用，但有时候内容高度变化会带来 overflow 或定位问题。

Grid Stacking 提供了另一种思路。

---

## 二十三、用 grid-row 和 grid-column 实现重叠

假设父元素是一个 grid：

```css id="udrxsa"
.wrapper {
  display: grid;
}
```

然后让图片和文字占据同一个网格位置：

```css id="p96pjp"
.image {
  grid-row: 1 / 2;
  grid-column: 1 / 2;
}

.content {
  grid-row: 1 / 2;
  grid-column: 1 / 2;
}
```tsx

两个元素占据同一个 cell，就会重叠。

这个效果类似 absolute 定位，但仍然在 Grid 布局体系内。

---

## 二十四、用 grid-area 简化重叠写法

更清晰的写法是使用 `grid-template-areas`。

比如一个视频背景 Header：

```html id="5vumek"
<header class="hero">
  <video class="hero-video" autoplay muted loop playsinline>
    <source src="/hero.mp4" type="video/mp4" />
  </video>

  <div class="hero-content">
    <h1>Build modern layouts</h1>
    <p>CSS Grid makes stacking simple.</p>
  </div>
</header>
```

CSS：

```css id="352q3t"
.hero {
  display: grid;
  grid-template-areas: "stack";
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
}

.hero-video {
  grid-area: stack;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-content {
  grid-area: stack;
  z-index: 1;
  text-align: center;
  color: white;
}
```text

这里：

```text id="v654kb"
video 和 content 都属于 stack 区域
所以它们会叠在一起
```

用 `z-index` 控制谁在上面。

---

## 二十五、Grid Stacking 的好处

相比 absolute 定位，Grid Stacking 的好处是：

```text id="tgkxs4"
写法更语义化
更容易居中
可以直接使用 place-items
内容高度变化时更自然
不用手动 top/left/transform
```text

比如居中内容，只需要：

```css id="djm755"
place-items: center;
```

不用再写：

```css id="z1v8yb"
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
```tsx

---

## 二十六、Grid Wrapping：不用媒体查询的响应式商品列表

现在来看一个最实用的 Grid 场景：电商商品列表。

假设我们有一组商品卡片：

```html id="g1lzml"
<div class="products">
  <div class="product-card">...</div>
  <div class="product-card">...</div>
  <div class="product-card">...</div>
  <div class="product-card">...</div>
</div>
```

最简单的三列布局：

```css id="wd2zp8"
.products {
  display: grid;
  grid-template-columns: 300px 300px 300px;
  gap: 1rem;
}
```text

问题是：

```text id="w4ecol"
屏幕变窄时会溢出。
```

如果用媒体查询当然可以解决，但 Grid 有更优雅的方式。

---

## 二十七、repeat()：重复生成列

`repeat()` 可以简化重复列的写法。

比如：

```css id="n46xyo"
grid-template-columns: 300px 300px 300px;
```css

可以写成：

```css id="k73mva"
grid-template-columns: repeat(3, 300px);
```

含义是：

```text id="dpj0i5"
重复 3 次，每列 300px。
```css

如果改成：

```css id="3nogf9"
grid-template-columns: repeat(4, 300px);
```

就是 4 列，每列 300px。

---

## 二十八、auto-fit：自动计算能放几列

`repeat()` 的第一个参数不一定必须是数字，也可以是：

```text id="vh6hjo"
auto-fit
```css

例如：

```css id="jslgql"
.products {
  display: grid;
  grid-template-columns: repeat(auto-fit, 300px);
  gap: 1rem;
}
```

含义是：

```text id="tdtk9k"
浏览器自动计算当前宽度能放下几个 300px 列。
```css

屏幕宽时，放更多列。
屏幕窄时，减少列。

这样就不需要你手写多个媒体查询。

---

## 二十九、minmax()：设置列宽范围

只用 `auto-fit` 还有一个问题：

如果当前宽度不能再多放一列，右侧可能会有空白。

比如容器宽度是 1000px，每列 300px，那么三列占 900px，还剩 100px 空白。

可以用 `minmax()` 解决：

```css id="36ksmv"
.products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
```

这句话非常重要。

它的意思是：

```text id="psn0po"
自动放入尽可能多的列；
每列最小 300px；
最大可以增长到 1fr；
剩余空间由现有列平均分配。
```css

这样当放不下新列时，已有列会稍微变宽，填满剩余空间。

这是响应式商品列表、卡片列表、图片网格中非常常用的写法。

---

## 三十、最常用的响应式 Grid 模板

可以直接记住这段：

```css id="m80181"
.grid-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
```

或者如果你想卡片更窄一点：

```css id="92qyu6"
.grid-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}
```text

这是一行非常实用的响应式布局代码。

适合：

```text id="8doqw1"
商品列表
博客卡片
图片画廊
作品集
课程列表
团队成员列表
功能特性区块
```

---

## 三十一、Grid 和 Flexbox 的区别

很多人会问：

```text id="ycinul"
什么时候用 Grid，什么时候用 Flexbox？
```text

简单说：

```text id="8t7wr6"
Flexbox：一维布局
Grid：二维布局
```

Flexbox 适合：

```text id="ipec4n"
一行按钮
导航栏
头像 + 文本
卡片内部排列
局部组件布局
```text

Grid 适合：

```text id="scpgi0"
页面整体结构
商品列表
图片画廊
复杂卡片布局
Bento Grid
仪表盘
多行多列布局
```

两者不是互相替代，而是互相配合。

例如商品卡片列表外层用 Grid：

```css id="j6a9xj"
.products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
```css

每个商品卡片内部用 Flexbox：

```css id="7n6y3c"
.product-card {
  display: flex;
  flex-direction: column;
}
```

这就是非常常见的组合。

---

## 三十二、CSS Grid 核心知识总结

### 开启 Grid

```css id="jz9p6a"
display: grid;
```css

### 定义列

```css id="wbmav5"
grid-template-columns: 1fr 1fr 1fr;
```

### 定义行

```css id="6eu5ba"
grid-template-rows: 200px 200px;
```text

### 设置间距

```css id="9p8qci"
gap: 1rem;
```

### 响应式列

```css id="yq5xmh"
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
```text

### 自动行高

```css id="0n21v2"
grid-auto-rows: 300px;
```

### 横向自动列

```css id="3315u8"
grid-auto-flow: column;
grid-auto-columns: 300px;
```text

### 单元格内居中

```css id="pp8fxr"
place-items: center;
```

### 整个 Grid 居中

```css id="4dpm2g"
place-content: center;
```css

### Bento Grid

```css id="sg6fep"
grid-template-areas:
  "box1 box2 box2 box3"
  "box1 box4 box5 box5";
```

### Grid Stacking

```css id="vpt6sz"
.wrapper {
  display: grid;
  grid-template-areas: "stack";
}

.image,
.content {
  grid-area: stack;
}
```text

---

## 总结

CSS Grid 是现代网页布局中非常强大的工具。

它能解决的问题包括：

```text id="kmw1qy"
响应式商品列表
多列文章布局
Bento Grid
图片画廊
页面区域划分
视频背景叠加文字
复杂二维布局
```

学习 Grid 时，最重要的是掌握这些概念：

```text id="5d21xh"
grid container / grid items
grid-template-columns / grid-template-rows
fr 单位
gap
justify-items / align-items
justify-content / align-content
隐式网格
grid-template-areas
repeat(auto-fit, minmax())
grid stacking
```css

如果只记一段最实用的代码，那就是：

```css id="rr2jzi"
display: grid;
grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
gap: 1rem;
```

这段代码就能帮你完成大量真实项目中的响应式卡片布局。

Flexbox 让你更好地控制一维排列，Grid 让你更好地控制二维结构。真正写现代网页时，最好的方式不是二选一，而是：

```text id="a7o3z8"
外层大布局用 Grid，内部小组件用 Flexbox。
```

掌握这一点，你就能写出更清晰、更稳定、更响应式的现代 CSS 布局。
