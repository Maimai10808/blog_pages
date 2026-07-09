# CSS 间距设计：什么时候用 Margin、Padding 和 Gap？

在写 CSS 的时候，`margin`、`padding` 和 `gap` 看起来都在做同一件事：**创造空间**。

但在真实项目中，它们的职责并不一样。之前我提到过一个观点：**不要在可复用组件上随便使用 margin**。有人可能会问：如果不用 margin，那组件之间的空间怎么处理？

这篇文章就来系统梳理一下：在实际开发中，如何判断该使用 `margin`、`padding`，还是 `gap`。

---

## 1. Margin：元素外部的空间

`margin` 是最容易理解的间距属性。

当你给一个元素添加 `margin` 时，浏览器会在这个元素的外部创建空间。

```css
p {
  margin-block-start: 2rem;
}
```

如果页面里只有一个段落，它会被从页面顶部推开。

如果有两个段落，第二个段落会被第一个段落推开。

也就是说，`margin` 处理的是：

> 当前元素和外部环境之间的距离。

它不属于元素本身，而是元素外面的空间。

---

## 2. Padding：元素内部的空间

`padding` 是元素内部的空间。

刚开始看起来，`padding` 和 `margin` 都只是让内容“离远一点”，但如果给元素加上背景色，区别就很明显了。

```css
p {
  padding: 1rem;
  background-color: #eee;
}
```

这时你会发现，文字和背景边缘之间的距离，就是 `padding`。

如果元素有边框：

```css
p {
  padding: 1rem;
  border: 1px solid #ccc;
}
```

那么文字和边框之间的空间，也属于 `padding`。

所以可以简单理解为：

> `padding` 是元素边缘到内容之间的距离。

如果一个元素有背景色、边框，或者你希望扩大它的点击区域，那么 `padding` 通常是更合适的选择。

---

## 3. Gap：Flex 和 Grid 子项之间的空间

`gap` 是专门用来处理 Flexbox 和 Grid 容器内部子元素间距的属性。

比如一个三列布局：

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
```

或者一个横向导航：

```css
.nav-list {
  display: flex;
  gap: 0.75rem;
}
```

`gap` 的好处是非常清晰：

> 它只负责容器内部子项之间的间距。

相比给每个子元素单独写 `margin-right` 或 `margin-bottom`，`gap` 更简洁，也更不容易出现最后一个元素多出间距的问题。

但是，`gap` 并不是所有场景的最佳答案。真实项目中，还需要结合组件结构、语义和可维护性来判断。

---

## 4. 为什么不建议在可复用组件上写 Margin？

这句话的重点不是“永远不要用 margin”，而是：

> 不要让一个可复用组件自己决定它和外部环境之间的距离。

比如一个 `Card` 组件：

```css
.card {
  margin-block-start: 2rem;
}
```

这样写的问题是，`Card` 被放到任何地方都会自带外部间距。

可是组件之间的距离，往往应该由它所在的父级布局决定，而不是组件自己决定。

更合理的方式是：

```css
.card {
  padding: 1rem;
  border: 1px solid #ddd;
}
```

组件内部的空间可以由组件自己控制，比如卡片内容和边框之间的距离。

但组件外部的空间，最好交给父级布局或页面结构处理。

---

## 5. 页面边缘留白：用 Padding

比如页面内容不能紧贴屏幕边缘，我们需要一个全局左右留白。

可以先定义一个语义化变量：

```css
:root {
  --site-gutter: 1.5rem;
}
```

然后应用到页面的主要区域：

```css
.site-header,
.site-main,
.site-footer {
  padding-inline: var(--site-gutter);
}
```

这里使用 `padding-inline` 是合理的，因为我们是在给页面区域内部增加左右空间。

这个空间属于页面容器内部，而不是某一个具体内容元素的外部距离。

---

## 6. Header 和 Footer 的上下留白：用 Padding

如果我们想让 header 和 footer 上下都有空间，也应该使用 `padding`。

```css
.site-header,
.site-footer {
  padding-block: var(--space-4);
}
```

原因很简单：header 和 footer 是容器，它们需要为内部内容提供舒适的空间。

即使以后替换 header 里面的 logo、导航、按钮，这个上下空间依然存在，不会因为某个子元素被删除而消失。

这也是 `padding` 的一个重要优势：

> 它依附于容器，而不是依附于某个具体子元素。

---

## 7. Header、Main、Footer 之间的距离：可以用 Margin

页面大结构之间的距离，比如 header 和 main 之间、main 和 footer 之间，可以使用 `margin`。

```css
.site-main {
  margin-block-start: var(--space-6);
}

.site-footer {
  margin-block-start: var(--space-6);
}
```

这里的关键点是：`site-main` 和 `site-footer` 不是独立复用的小组件，而是整个页面结构的一部分。

它们属于 `site` 这个页面级容器的元素。

所以在这种情况下，用 `margin` 控制大区域之间的关系是可以接受的。

也就是说：

> 不推荐在可复用组件上写 margin，但可以在页面结构元素上使用 margin。

---

## 8. 正文内容的垂直节奏：Margin 比 Gap 更灵活

假设有一段文章内容：

```html
<div class="content-flow">
  <h1>Title</h1>
  <p>Paragraph...</p>
  <h2>Subtitle</h2>
  <p>Paragraph...</p>
</div>
```

有人可能会直接把它变成 grid，然后用 `gap`：

```css
.content-flow {
  display: grid;
  gap: 1rem;
}
```

这样确实可以快速产生间距，但问题是：所有元素之间的空间都一样。

然而在排版中，标题和上一段之间通常应该有更大的距离，而段落之间的距离可以更小。

所以正文排版更适合使用 margin。

一个常见写法是：

```css
.content-flow > * + * {
  margin-block-start: var(--space-1);
}
```

这段选择器的意思是：

> 在 `.content-flow` 里面，只要一个元素前面还有另一个元素，就给它添加顶部 margin。

然后我们可以针对标题覆盖更大的间距：

```css
.content-flow > h2 {
  margin-block-start: var(--space-6);
}
```

这样就可以形成更自然的阅读节奏。

正文排版里，`margin` 的优势是：

1. 保持正常文档流；
2. 可以针对不同元素调整间距；
3. 更适合处理复杂的垂直节奏。

---

## 9. 卡片网格：用 Gap

如果是卡片列表、图片网格、商品列表这类布局，`gap` 通常是最合适的选择。

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: var(--space-4);
}
```

因为这些卡片之间的距离通常是统一的。

这种场景下，`gap` 的语义非常清楚：

> 父容器负责排列子项，也负责子项之间的间距。

这比给每个 `.card` 写 margin 更干净，也更容易维护。

---

## 10. 卡片内部空间：用 Padding

卡片内部的内容不能贴着边缘，所以应该给卡片内容区域添加 `padding`。

```css
.card-content {
  padding: var(--space-2);
}
```

为什么不用给标题、描述、年份分别加 margin 来模拟内部空间？

因为如果以后标题消失了，或者卡片结构改变了，这些空间可能也会一起消失。

而 `padding` 依附于 `.card-content` 这个容器。

只要卡片内容区域还在，内部留白就一直稳定存在。

所以对于卡片、按钮、标签、输入框这类组件来说：

> 内部空间优先考虑 padding。

---

## 11. 卡片内部元素之间：Margin 或 Gap 都可以

卡片内部的标题、作者、年份之间，也需要一点空间。

如果这些元素之间的间距完全一致，可以使用 `gap`：

```css
.card-content {
  display: grid;
  gap: var(--space-1);
}
```

但如果你希望更精细地控制，比如标题和作者之间近一点，作者和年份之间再近一点，那么 `margin` 更灵活。

```css
.card-title {
  margin-block-end: var(--space-1);
}

.card-year {
  margin-block-start: var(--space-05);
}
```

这个选择没有绝对答案，要看组件复杂度和你是否需要更细的视觉控制。

---

## 12. 导航菜单：Padding 和 Gap 可以一起用

导航菜单是一个很典型的场景。

比如：

```html
<nav class="site-nav">
  <ul class="site-nav-list">
    <li><a class="site-nav-link" href="#">Home</a></li>
    <li><a class="site-nav-link" href="#">About</a></li>
    <li><a class="site-nav-link" href="#">Work</a></li>
  </ul>
</nav>
```

我们当然可以给导航列表加 `gap`：

```css
.site-nav-list {
  display: flex;
  gap: var(--space-2);
}
```

但这还不够。

因为导航项是可点击、可聚焦的元素。用户鼠标悬停时会出现 pointer，键盘 tab 选中时会出现 focus outline。

如果链接本身的可点击区域太小，体验就不好。

所以更好的做法是给真正可点击的元素加 `padding`：

```css
.site-nav-link {
  display: inline-block;
  padding: 0.5rem 0.75rem;
}
```

注意，`padding` 应该加在 `a` 标签上，而不是 `li` 上。

因为真正可点击的是链接，不是列表项。

然后父级列表再用 `gap` 控制导航项之间的距离：

```css
.site-nav-list {
  display: flex;
  gap: var(--space-1);
}
```

这样既扩大了点击区域，又保持了项目之间的间距清晰。

---

## 13. 总结：如何选择 Margin、Padding 和 Gap？

可以用下面这套规则判断。

### 使用 Padding 的场景

当你需要控制元素内部空间时，使用 `padding`。

适合场景包括：

- 元素有背景色；
- 元素有边框；
- 元素是按钮、链接、卡片、输入框；
- 你想扩大可点击区域或可聚焦区域；
- 你想让容器内部内容不要贴边。

例如：

```css
.button {
  padding: 0.75rem 1rem;
}
```

---

### 使用 Gap 的场景

当你在 Flexbox 或 Grid 容器里，需要控制子项之间的统一间距时，使用 `gap`。

适合场景包括：

- 卡片网格；
- 图片列表；
- 导航列表；
- 表单字段组；
- 横向或纵向排列的一组元素；
- 子项之间的间距可以保持一致。

例如：

```css
.stack {
  display: grid;
  gap: 1rem;
}
```

---

### 使用 Margin 的场景

当你需要控制元素和外部元素之间的关系，并且需要更灵活的覆盖能力时，使用 `margin`。

适合场景包括：

- 文章内容的垂直节奏；
- 标题和段落之间的不同间距；
- 页面级结构之间的距离；
- 不同元素之间需要非统一间距；
- 需要针对某些元素单独调整空间。

例如：

```css
.content-flow > * + * {
  margin-block-start: 1rem;
}

.content-flow > h2 {
  margin-block-start: 3rem;
}
```

---

## 结语

`margin`、`padding` 和 `gap` 都可以创造空间，但它们解决的问题不同。

`padding` 更适合处理元素内部的空间。

`gap` 更适合处理 Flex/Grid 子项之间统一的空间。

`margin` 更适合处理元素之间更灵活、更有层次的外部空间。

所以真正重要的不是记住“哪个属性更好”，而是理解这个空间到底属于谁：

- 属于元素内部？用 `padding`。
- 属于布局容器里的子项间距？用 `gap`。
- 属于元素和外部环境之间的关系？用 `margin`。

CSS 间距设计的核心，其实就是一句话：

> 先判断空间的归属，再选择对应的属性。
