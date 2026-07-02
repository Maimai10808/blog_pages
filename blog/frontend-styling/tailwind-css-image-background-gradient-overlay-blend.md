# 用 Tailwind CSS 实现图片背景、渐变遮罩和混合模式效果

在网页设计中，我们经常会遇到这样的需求：

页面顶部有一张大图，图片上方放标题、描述和按钮。为了让文字更清晰，通常还需要在图片上叠加一层渐变遮罩，或者给图片加一点暗色透明层。

传统 CSS 当然可以实现这个效果，但往往需要写一些额外的嵌套结构、绝对定位、伪元素，或者单独维护一段 CSS。使用 Tailwind CSS 后，这类效果可以直接通过 utility class 快速完成。

本文就介绍一种使用 Tailwind 实现图片背景、渐变遮罩和 `mix-blend-mode` 混合效果的方法。

---

## 一、常见场景：图片上放文字

假设我们要做一个 Hero Section：

```text id="b51r2p"
背景是一张图片
上面有标题和描述
文字需要清晰可读
图片最好有一点渐变或暗色遮罩
```

如果直接把白色文字放到一张明亮图片上，文字很可能看不清。

比如：

```html id="fk32va"
<section>
  <img src="/hero.jpg" />
  <h1>Build something beautiful</h1>
  <p>Create modern websites with Tailwind CSS.</p>
</section>
```

如果图片颜色复杂，白色文字会和背景混在一起。

所以我们通常需要：

```text id="tt4r9c"
让图片铺满区域
让图片像 background-size: cover 一样显示
加一层渐变遮罩
让文字浮在最上层
```

---

## 二、为什么不用 background-image？

传统写法可能会直接用：

```css id="o668q5"
.hero {
  background-image: url("/hero.jpg");
  background-size: cover;
  background-position: center;
}
```

这当然可以。

但使用真实的 `<img>` 标签也有一些好处：

```text id="f3hrsf"
可以更容易控制图片加载
可以设置 alt
可以配合图片组件
可以更灵活地做层级和混合模式
可以用 object-cover 模拟背景图效果
```

所以这篇文章采用 `<img>` 标签来实现类似背景图的效果。

---

## 三、基础结构

先准备一个 section：

```jsx id="5acfbx"
export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      <img
        src="https://images.pexels.com/photos/example.jpeg"
        alt="Palm trees"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="relative p-24 text-white">
        <h1 className="text-5xl font-bold">Build something beautiful</h1>

        <p className="mt-4 max-w-xl text-lg">
          Create modern websites with Tailwind CSS.
        </p>
      </div>
    </section>
  );
}
```

这里已经完成了几个关键点：

```text id="de3dgo"
section 设置 relative
img 设置 absolute
img 设置 h-full w-full
img 设置 object-cover
内容区域设置 relative
```

接下来逐个解释。

---

## 四、让图片铺满整个区域

图片标签上使用：

```html id="g1oq4j"
className="h-full w-full"
```

表示图片宽度和高度都占满父元素。

但是如果只写：

```html id="4e3wwg"
<img className="h-full w-full" />
```

图片可能会被强行拉伸变形。

这时候需要加上：

```html id="1vxoi5"
object-cover
```

完整写法：

```html id="cmj99s"
<img className="h-full w-full object-cover" />
```

`object-cover` 对应 CSS 中的：

```css id="mcab8d"
object-fit: cover;
```

它的效果类似：

```css id="ki1nd0"
background-size: cover;
```

也就是说，图片会保持自身比例，同时铺满整个容器，多出来的部分会被裁切。

---

## 五、使用 absolute 让图片变成背景层

为了让图片像背景一样铺在 section 里，可以给图片加：

```html id="a2c3wo"
absolute
```

更完整一点：

```html id="zl0nhx"
absolute inset-0 h-full w-full object-cover
```

其中：

```text id="nvakhs"
absolute：绝对定位
inset-0：top/right/bottom/left 全部为 0
h-full：高度 100%
w-full：宽度 100%
object-cover：保持比例并铺满容器
```

但如果子元素使用 `absolute`，父元素必须有定位上下文。

所以父级 section 要加：

```html id="e5hjbl"
relative
```

完整结构是：

```jsx id="ev5g5i"
<section className="relative min-h-screen overflow-hidden">
  <img
    src="/hero.jpg"
    alt=""
    className="absolute inset-0 h-full w-full object-cover"
  />

  <div className="relative p-24 text-white">...</div>
</section>
```

这里的 `section.relative` 是图片绝对定位的参照物。

---

## 六、为什么文字也要加 relative？

当图片使用 absolute 之后，图片会脱离正常文档流。

如果内容没有设置层级，有时会被图片盖住，导致文字看不见或者无法点击。

所以内容容器建议加：

```html id="gg9d6e"
relative
```

比如：

```jsx id="20md6i"
<div className="relative p-24 text-white">
  <h1>Build something beautiful</h1>
  <p>Create modern websites with Tailwind CSS.</p>
</div>
```

这会让内容浮在图片上方。

如果你有按钮，也建议按钮所在容器保持在图片上方，否则可能出现点击不到按钮、选中文字时选中图片等问题。

更稳一点也可以加 `z-10`：

```jsx id="bxazw2"
<div className="relative z-10 p-24 text-white">...</div>
```

---

## 七、添加渐变遮罩

为了让文字更清晰，可以在图片上方加一层渐变。

Tailwind 中可以这样写：

```html id="bq5zdd"
bg-gradient-to-tr from-purple-600 to-green-900
```

含义是：

```text id="q9vt7h"
bg-gradient-to-tr：渐变方向到右上角
from-purple-600：起始颜色是紫色
to-green-900：结束颜色是绿色
```

通常我们会单独放一个遮罩层：

```jsx id="0wro39"
<div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-green-900 opacity-70" />
```

完整结构：

```jsx id="4iia0p"
<section className="relative min-h-screen overflow-hidden">
  <img
    src="/hero.jpg"
    alt=""
    className="absolute inset-0 h-full w-full object-cover"
  />

  <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-green-900 opacity-70" />

  <div className="relative z-10 p-24 text-white">
    <h1 className="text-5xl font-bold">Build something beautiful</h1>
    <p className="mt-4 max-w-xl text-lg">
      Create modern websites with Tailwind CSS.
    </p>
  </div>
</section>
```

这样图片上方就有一层半透明渐变，文字可读性会明显提升。

---

## 八、使用 mix-blend-mode 做混合效果

除了普通透明遮罩，Tailwind 还支持 CSS 的混合模式。

比如：

```html id="52c9bv"
mix-blend-overlay
```

对应 CSS：

```css id="g8ba0j"
mix-blend-mode: overlay;
```

可以把它加到渐变遮罩上：

```jsx id="4bacd8"
<div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-green-900 mix-blend-overlay" />
```

这时渐变层会和底下的图片产生混合效果，看起来会更有设计感。

不同的混合模式会产生不同效果：

```text id="91gaav"
mix-blend-normal
mix-blend-multiply
mix-blend-screen
mix-blend-overlay
mix-blend-darken
mix-blend-lighten
mix-blend-color-dodge
mix-blend-color-burn
mix-blend-hard-light
mix-blend-soft-light
mix-blend-difference
mix-blend-exclusion
mix-blend-hue
mix-blend-saturation
mix-blend-color
mix-blend-luminosity
```

你可以根据图片和设计风格尝试不同模式。

比如：

```html id="2nyc1k"
mix-blend-multiply
```

会让整体更暗。

```html id="9nfc3t"
mix-blend-screen
```

会让整体更亮。

```html id="es0j5s"
mix-blend-overlay
```

通常会产生比较强烈的视觉融合感。

---

## 九、一个更完整的 Hero 示例

下面是一个较完整的 React + Tailwind 示例：

```jsx id="4yq7eg"
export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      <img
        src="https://images.pexels.com/photos/example.jpeg"
        alt="Palm trees"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-green-900 mix-blend-overlay" />

      <div className="absolute inset-0 bg-black/30" />

      <div className="relative z-10 flex min-h-screen flex-col justify-center p-8 text-white md:p-24">
        <h1 className="max-w-3xl text-4xl font-bold md:text-6xl">
          Build something beautiful
        </h1>

        <p className="mt-6 max-w-xl text-lg text-slate-100">
          Create modern websites with Tailwind CSS and make your hero sections
          feel more dynamic.
        </p>

        <button className="mt-8 w-fit rounded-lg bg-white px-6 py-3 font-medium text-black">
          Get Started
        </button>
      </div>
    </section>
  );
}
```

这里用了三层视觉结构：

```text id="mudnq8"
第一层：图片
第二层：渐变混合层
第三层：黑色半透明遮罩
第四层：文字和按钮内容
```

为什么又加了一层：

```html id="nv0l7c"
bg-black/30
```

因为有时候 `mix-blend-overlay` 的效果比较强烈，文字可读性不一定稳定。额外加一点黑色透明层，可以让白色文字更清楚。

---

## 十、Tailwind 中的透明度写法

Tailwind 支持颜色透明度写法：

```html id="kaaeib"
bg-black/30 text-white/80 border-white/20
```

比如：

```html id="5lyyxa"
<div className="bg-black/40"></div>
```

表示黑色背景，透明度约 40%。

这在做遮罩时非常好用。

比如：

```jsx id="5loasl"
<div className="absolute inset-0 bg-black/50" />
```

就可以快速做一层半透明暗色遮罩。

---

## 十一、为什么有时候文字会出现奇怪的混合效果？

如果你把 `mix-blend-mode` 加在比较大的容器上，文字也可能参与混合，导致文字颜色变得很奇怪，甚至像被背景“吃掉”一样。

比如文字没有单独提升层级：

```jsx id="n6lp7x"
<h1 className="text-slate-400">Build something beautiful</h1>
```

如果它和图片、渐变层处在同一个混合上下文中，就可能产生意想不到的视觉效果。

解决办法是给文字内容加：

```html id="potxtu"
relative z-10
```

例如：

```jsx id="6w0u7a"
<div className="relative z-10 text-white">
  <h1>Build something beautiful</h1>
</div>
```

这样文字会在混合层上方，避免被图片或遮罩影响。

---

## 十二、为什么按钮可能点不到？

当图片或遮罩层使用 absolute 覆盖整个区域时，如果层级没有处理好，可能会挡住按钮。

比如：

```jsx id="pd3v93"
<img className="absolute inset-0 h-full w-full object-cover" />
<div className="absolute inset-0 bg-black/40" />
<button>Click me</button>
```

如果按钮没有足够的层级，它可能会被图片或遮罩挡住。

建议内容层统一写成：

```html id="znq57s"
relative z-10
```

比如：

```jsx id="5keyc3"
<div className="relative z-10">
  <button>Click me</button>
</div>
```

也可以给遮罩层加：

```html id="ra7w1e"
pointer-events-none
```

避免遮罩拦截鼠标事件：

```jsx id="k7e4qu"
<div className="pointer-events-none absolute inset-0 bg-black/40" />
```

这对于有按钮、链接、表单的 Hero Section 很重要。

---

## 十三、React 中为什么用 className？

如果你在 React 中写 Tailwind，需要使用：

```jsx id="4awlxv"
className = "";
```

而不是：

```html id="c69s6p"
class=""
```

比如：

```jsx id="mjdnyy"
<div className="relative min-h-screen">...</div>
```

如果你写普通 HTML，则使用：

```html id="2fzx4t"
<div class="relative min-h-screen">...</div>
```

Tailwind 本身不限制框架。React、Vue、Next.js、普通 HTML 都可以用，只是不同框架的属性写法不同。

---

## 十四、使用 Tailwind 任意值设置背景图

Tailwind 也支持在 class 中写任意值。

比如背景图：

```html id="nbis3v"
<div className="bg-[url('/hero.jpg')]">...</div>
```

也可以写外部图片地址：

```html id="b38b3g"
<div className="bg-[url('https://images.pexels.com/photos/example.jpeg')]">
  ...
</div>
```

不过在复杂 Hero Section 中，我更推荐使用真实 `<img>` 标签加 `absolute + object-cover`。

因为这样更容易处理：

```text id="p4zle6"
图片层级
遮罩层
混合模式
alt 文本
图片组件
响应式裁切
加载优先级
```

---

## 十五、最终推荐结构

如果你要做一个稳定、可点击、可读性强的图片 Hero，可以使用这个模板：

```jsx id="8mqfmd"
export default function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden">
      <img
        src="/hero.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-purple-600 to-green-900 mix-blend-overlay" />

      <div className="pointer-events-none absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex min-h-screen flex-col justify-center px-6 py-24 text-white md:px-16 lg:px-24">
        <h1 className="max-w-3xl text-4xl font-bold md:text-6xl">
          Build something beautiful
        </h1>

        <p className="mt-6 max-w-xl text-lg text-white/80">
          Use Tailwind CSS to create beautiful image backgrounds with gradient
          overlays and blend modes.
        </p>

        <button className="mt-8 w-fit rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-white/90">
          Get Started
        </button>
      </div>
    </section>
  );
}
```

这个模板里最关键的是：

```text id="8eth54"
section: relative overflow-hidden
img: absolute inset-0 h-full w-full object-cover
overlay: absolute inset-0
content: relative z-10
overlay: pointer-events-none
```

---

## 总结

使用 Tailwind CSS 做图片背景和渐变遮罩，其实不需要写复杂 CSS。

核心思路是：

```text id="1f47i6"
用 img 作为真实图片层
用 absolute + inset-0 让图片铺满父容器
用 object-cover 保持图片比例
用 bg-gradient-to-* 创建渐变遮罩
用 mix-blend-* 创建混合效果
用 relative z-10 让文字和按钮浮在最上层
用 pointer-events-none 避免遮罩挡住点击
```

最常用的组合是：

```html id="1qfz4h"
absolute inset-0 h-full w-full object-cover
```

配合：

```html id="rq7din"
absolute inset-0 bg-black/40
```

以及：

```html id="hsxmed"
relative z-10
```

这样就可以快速实现一个可读性好、层级清晰、视觉效果不错的 Hero Section。

Tailwind 的优势就在于：很多原本需要单独写 CSS 的布局技巧，现在可以直接通过 class 组合完成。对于快速搭建落地页、官网 Hero 区域、活动页 Banner 来说，这种写法非常高效。
