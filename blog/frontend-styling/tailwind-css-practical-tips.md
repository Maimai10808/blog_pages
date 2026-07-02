# 10 个值得早点掌握的 Tailwind CSS 实用技巧

Tailwind CSS 的优势不只是“把 CSS 写在 className 里”，更重要的是它提供了一整套高效的样式组织方式。

很多人刚开始用 Tailwind，只会写一些基础类名，比如：

```html
<div class="flex items-center justify-center bg-blue-500"></div>
```tsx

但 Tailwind 真正好用的地方，往往藏在一些高级用法里。

本文整理 10 个非常实用的 Tailwind 技巧，包括：

- group / peer 状态联动
- transition 动画
- 移动端优先响应式
- IntelliSense 配置
- 动态 class 的坑
- 在 CSS 中使用 Tailwind
- 自定义工具类
- 自定义插件
- 导入 Tailwind 颜色
- 使用 tailwind-merge 解决 class 冲突

无论你是刚开始学 Tailwind，还是已经在项目里长期使用 Tailwind，这些技巧都能提升你的开发体验。

---

## 1. 使用 group 和 peer 实现状态联动

我们都知道 Tailwind 可以根据元素自身状态改变样式：

```html
<button class="bg-blue-500 hover:bg-blue-600">Button</button>
```

这里的 `hover:bg-blue-600` 表示按钮 hover 时改变背景色。

但有时候，我们想根据**另一个元素的状态**改变当前元素的样式。

比如：

- 父元素 hover 时，子元素变色；
- 输入框 focus 时，旁边的提示文字变色；
- 兄弟元素 checked 时，另一个元素改变样式。

这时就可以使用 `group` 和 `peer`。

---

### group：根据父元素状态控制子元素

如果你想在父元素 hover 时改变子元素样式，可以给父元素加上 `group`：

```html
<div class="group rounded-lg border p-6 hover:bg-gray-100">
  <h3 class="text-gray-900 group-hover:text-red-500">Title</h3>

  <p class="text-gray-500 group-hover:text-blue-500">Description</p>
</div>
```text

当父元素 hover 时：

```text
h3 变成红色
p 变成蓝色
```

核心是：

```html
group group-hover:
```tsx

`group` 放在父元素上，`group-hover:` 放在子元素上。

---

### peer：根据兄弟元素状态控制另一个元素

`peer` 用来处理兄弟元素之间的状态联动。

比如 input focus 时，让提示文字变色：

```html
<div>
  <input class="peer border p-2" placeholder="Email" />

  <p class="mt-2 text-gray-400 peer-focus:text-blue-500">
    Please enter your email
  </p>
</div>
```

当 input 聚焦时，下面的提示文字变成蓝色。

核心是：

```html
peer peer-focus:
```tsx

`peer` 放在触发状态的元素上，`peer-focus:` 放在被影响的兄弟元素上。

---

### 命名 group / peer

如果一个组件中有多个 group 或 peer，可以使用命名方式区分：

```html
<div class="group/card">
  <h3 class="group-hover/card:text-blue-500">Card Title</h3>
</div>
```

这样可以避免多个 group 状态互相干扰。

---

## 2. 使用 transition 快速添加动画过渡

Tailwind 提供了非常方便的动画过渡类。

比如一个 hover 变色按钮：

```html
<button class="bg-blue-500 hover:bg-blue-600">Button</button>
```tsx

如果直接这样写，颜色变化会非常突兀。

可以加上：

```html
<button class="bg-blue-500 transition-colors duration-300 hover:bg-blue-600">
  Button
</button>
```

这里：

```text
transition-colors：只对颜色变化添加过渡
duration-300：动画持续 300ms
```tsx

也可以添加缓动曲线和延迟：

```html
<button
  class="bg-blue-500 transition-colors duration-300 ease-in-out delay-100 hover:bg-blue-600"
>
  Button
</button>
```

常用类包括：

```text
transition
transition-colors
transition-opacity
transition-transform
duration-150
duration-300
duration-500
ease-linear
ease-in
ease-out
ease-in-out
delay-100
```tsx

Tailwind 也提供了一些预设动画：

```html
<div class="animate-pulse">Loading...</div>
<div class="animate-spin">...</div>
<div class="animate-bounce">...</div>
```

适合快速实现 loading、提示、强调效果。

---

## 3. 理解 Tailwind 的移动端优先响应式

Tailwind 是 **mobile-first** 框架。

这句话非常重要。

它的意思是：

**没有前缀的 class 默认作用于所有屏幕尺寸；带断点前缀的 class 会从对应断点开始生效。**

比如：

```html
<div class="grid grid-cols-2 sm:grid-cols-3">...</div>
```text

含义是：

```text
默认：2 列
sm 及以上：3 列
```

不是“小屏幕用 sm”。

很多初学者会误以为：

```html
<div class="grid grid-cols-3 sm:grid-cols-2">...</div>
```text

意思是小屏幕 2 列，大屏幕 3 列。

但实际效果是：

```text
默认所有屏幕：3 列
sm 及以上：2 列
```

这就反了。

---

### 正确写法

如果你希望：

```text
小屏幕：2 列
大屏幕：3 列
```tsx

应该写：

```html
<div class="grid grid-cols-2 sm:grid-cols-3">...</div>
```

这就是 Tailwind 的移动端优先思路：

```text
先写最小屏幕的默认样式
再用 sm / md / lg / xl 向上覆盖
```tsx

---

### 指定某个断点范围

Tailwind 也支持范围控制。

比如只在 `sm` 到 `md` 之间使用三列：

```html
<div class="grid grid-cols-2 sm:max-md:grid-cols-3">...</div>
```

也可以使用任意断点：

```html
<div class="grid grid-cols-2 min-[400px]:grid-cols-3">...</div>
```text

表示屏幕宽度达到 400px 后变成三列。

---

### 自定义断点

还可以在 `tailwind.config.js` 中配置自己的断点：

```js
module.exports = {
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
    },
  },
};
```

然后就可以使用：

```html
<div class="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3">...</div>
```text

---

## 4. 配置 Tailwind IntelliSense，让变量里也有提示

Tailwind CSS IntelliSense 是使用 Tailwind 时非常重要的 VS Code 插件。

它可以提供：

```text
class 自动补全
颜色预览
hover 查看 CSS 详情
错误提示
```

在 JSX 中写 className 时，它很好用：

```tsx
<div className="flex items-center justify-center bg-blue-500" />
```text

但如果你把 class 写到变量里，有时候 IntelliSense 可能就不提示了。

比如：

```tsx
const buttonStyles = "rounded-lg bg-blue-500 px-4 py-2 text-white";
```

如果默认不识别这个变量名，可以在 VS Code 设置中配置。

搜索：

```text
Tailwind CSS: Class Attributes
```text

然后添加你常用的变量名，比如：

```json
["class", "className", "buttonStyles", "containerStyles"]
```

这样你在这些变量中写 Tailwind class 时，也能获得自动补全。

---

### 组件 variants 中也很好用

比如：

```tsx
const buttonVariants = {
  primary: "bg-blue-500 text-white",
  secondary: "bg-gray-100 text-gray-900",
  danger: "bg-red-500 text-white",
};
```tsx

配置好以后，写这些字符串时也能获得 Tailwind IntelliSense 支持。

这对组件库开发非常有用。

---

## 5. 动态 className 的坑：Tailwind 不会识别拼接出来的类名

这是 Tailwind 中非常常见的坑。

比如我们有一个颜色状态：

```tsx
const [color, setColor] = useState("green");
```

然后想动态设置背景：

```tsx
<div className={`bg-${color}-500`}>Content</div>
```tsx

你可能以为当 `color = "green"` 时，它会生成：

```html
<div class="bg-green-500"></div>
```

但通常它不会生效。

原因是：

**Tailwind 会在构建时扫描你的源码，找出实际出现过的 class，然后生成对应 CSS。**

像下面这种字符串拼接：

```tsx
`bg-${color}-500`;
```text

在源码里并没有明确出现：

```text
bg-red-500
bg-green-500
bg-blue-500
```

所以 Tailwind 不会生成这些类，最终样式就失效了。

---

### 正确写法：显式列出所有可能的 class

可以写成映射表：

```tsx
const colorClasses = {
  red: "bg-red-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
};

<div className={colorClasses[color]}>Content</div>;
```text

这样 Tailwind 能扫描到完整类名：

```text
bg-red-500
bg-green-500
bg-blue-500
```

样式就可以正常生效。

---

### 什么时候不要强行用 Tailwind？

如果你需要组合大量颜色、数字、动态值，比如：

```tsx
`bg-${color}-${shade}`;
```tsx

而 `color` 和 `shade` 都是动态的，可能组合非常多。

这时不一定要强行用 Tailwind。

可以考虑：

```tsx
<div style={{ backgroundColor: selectedColor }} />
```

或者使用普通 CSS / CSS variables。

Tailwind 很强，但不是所有动态样式都必须用 Tailwind 解决。

---

## 6. 在 CSS 中使用 Tailwind：@apply 和 theme()

虽然 Tailwind 鼓励直接在 HTML / JSX 中写 class，但实际项目中仍然会遇到必须写 CSS 的情况。

比如你使用了第三方组件库，它内部有固定 class：

```html
<div class="third-party-card"></div>
```text

你想覆盖它的样式，就需要写 CSS。

这时可以使用 Tailwind 的 `@apply`：

```css
.third-party-card {
  @apply rounded-lg bg-white p-4 shadow-md;
}
```

这样你就能在 CSS 文件中复用 Tailwind class。

---

### 使用 theme() 访问 Tailwind 配置

还可以使用 `theme()` 读取 Tailwind 主题变量：

```css
.custom-card {
  box-shadow: 0 0 20px theme("colors.purple.500");
}
```tsx

这样你不需要手写颜色值，而是直接使用 Tailwind 的颜色系统。

---

### 任意值中也可以使用 theme

Tailwind 的 arbitrary value 任意值也很好用。

比如做一个霓虹灯阴影：

```html
<div class="shadow-[0_0_20px_theme(colors.purple.500)]">Neon Box</div>
```

注意在中括号里，空格通常要用下划线 `_` 替代：

```text
0 0 20px
写成
0_0_20px
```tsx

---

## 7. 在 tailwind.config.js 中扩展自定义工具类

如果某个样式会在多个地方重复使用，不建议到处复制一长串 class。

比如霓虹灯阴影：

```html
<div
  class="shadow-[0_0_5px_theme(colors.purple.500),0_0_20px_theme(colors.purple.700)]"
>
  Neon Box
</div>
```

这种写法太长，而且不方便复用。

可以在 `tailwind.config.js` 中扩展：

```js
module.exports = {
  theme: {
    extend: {
      boxShadow: {
        neon: "0 0 5px theme(colors.purple.500), 0 0 20px theme(colors.purple.700)",
      },
    },
  },
};
```tsx

然后就可以直接使用：

```html
<div class="shadow-neon">Neon Box</div>
```

这样更清晰，也更方便维护。

---

### Tailwind 几乎所有主题都能扩展

比如：

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: "#7c3aed",
      },
      spacing: {
        128: "32rem",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
};
```tsx

然后就可以使用：

```html
<div class="bg-brand p-128 rounded-xl2">Content</div>
```

---

## 8. 编写自定义 Tailwind 插件

如果你想实现更灵活的工具类，比如：

```text
neon-red
neon-green
neon-blue
neon-purple
```text

并且希望颜色可以自动来自 Tailwind 主题，就可以写自定义插件。

在 `tailwind.config.js` 中：

```js
const plugin = require("tailwindcss/plugin");

module.exports = {
  plugins: [
    plugin(function ({ addUtilities, theme }) {
      const colors = theme("colors");
      const utilities = {};

      Object.entries(colors).forEach(([name, value]) => {
        if (typeof value === "object" && value[500] && value[700]) {
          utilities[`.neon-${name}`] = {
            boxShadow: `0 0 5px ${value[500]}, 0 0 20px ${value[700]}`,
          };
        }
      });

      addUtilities(utilities);
    }),
  ],
};
```

这样就可以在页面中使用：

```html
<div class="neon-red">Red Neon</div>
<div class="neon-green">Green Neon</div>
<div class="neon-blue">Blue Neon</div>
```text

而且好处是：

```text
可以复用 Tailwind 颜色系统
可以自动生成多个工具类
IntelliSense 也能提示
```

这个技巧相对高级，但在做设计系统或组件库时非常有用。

---

## 9. 在 JavaScript 中导入 Tailwind 颜色

有时候你想在 JS 中使用 Tailwind 的颜色系统。

比如：

- 配置图表颜色；
- 生成主题对象；
- 动态设置 Canvas / SVG 颜色；
- 和第三方组件库主题结合；
- 自定义 design tokens。

可以直接导入 Tailwind 颜色：

```js
import colors from "tailwindcss/colors";
```text

然后定义自己的主题色：

```js
const theme = {
  primary: colors.violet,
};
```

如果你想给 primary 添加默认值：

```js
const theme = {
  primary: {
    DEFAULT: colors.violet[600],
    ...colors.violet,
  },
};
```text

然后在 Tailwind 配置中使用：

```js
import colors from "tailwindcss/colors";

export default {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: colors.violet[600],
          ...colors.violet,
        },
      },
    },
  },
};
```

这样你就可以写：

```html
<div class="bg-primary text-white">Primary</div>

<div class="bg-primary-100 text-primary-700">Primary Light</div>
```tsx

这个技巧非常适合做可切换主题，或者统一项目视觉风格。

---

## 10. 使用 tailwind-merge 解决 className 冲突

在 React 组件中，我们经常会写可复用组件：

```tsx
function Button({ className }: { className?: string }) {
  return (
    <button
      className={`rounded-lg bg-blue-500 px-4 py-2 text-black ${className}`}
    >
      Button
    </button>
  );
}
```

然后使用时传入：

```tsx
<Button className="text-white" />
```text

你可能希望最终文字变成白色。

但由于 class 中同时存在：

```text
text-black
text-white
```

它们是冲突的。最终哪个生效，可能受 class 顺序和 CSS 生成顺序影响。

这时可以使用 `tailwind-merge`。

安装：

```bash
npm install tailwind-merge
```tsx

使用：

```tsx
import { twMerge } from "tailwind-merge";

function Button({ className }: { className?: string }) {
  return (
    <button
      className={twMerge(
        "rounded-lg bg-blue-500 px-4 py-2 text-black",
        className,
      )}
    >
      Button
    </button>
  );
}
```

现在：

```tsx
<Button className="text-white" />
```text

最终会正确合并成：

```text
rounded-lg bg-blue-500 px-4 py-2 text-white
```

`text-white` 会覆盖默认的 `text-black`。

---

### tailwind-merge 特别适合组件 variants

比如：

```tsx
import { twMerge } from "tailwind-merge";

const variants = {
  primary: "bg-blue-500 text-white",
  secondary: "bg-gray-100 text-gray-900",
  danger: "bg-red-500 text-white",
};

function Button({
  variant = "primary",
  className,
}: {
  variant?: keyof typeof variants;
  className?: string;
}) {
  return (
    <button
      className={twMerge(
        "rounded-lg px-4 py-2 transition-colors",
        variants[variant],
        className,
      )}
    >
      Button
    </button>
  );
}
```text

这样组件既有默认样式，又允许外部安全覆盖。

在做 React 组件库、设计系统、业务组件封装时，`tailwind-merge` 几乎是必备工具。

---

## 总结

Tailwind CSS 不只是简单的原子类工具，它还有很多能提升开发效率和工程质量的高级能力。

这 10 个技巧可以总结为：

```text
1. group：父元素状态影响子元素
2. peer：兄弟元素状态联动
3. transition：快速添加动画过渡
4. mobile-first：先写小屏，再向上覆盖
5. IntelliSense：让变量里的 class 也有提示
6. 动态 class：不要拼接 Tailwind 类名，要显式枚举
7. @apply / theme：在 CSS 中复用 Tailwind
8. extend：在配置中添加自定义工具类
9. plugin：批量生成更灵活的自定义工具类
10. tailwind-merge：解决组件 className 冲突
```

其中最容易踩坑的是：

```text
动态 className 拼接
响应式断点理解反了
组件 className 冲突
```

如果你在实际项目中掌握这些技巧，Tailwind 的开发体验会明显提升，尤其是在 React 项目、组件库、响应式页面和设计系统中，会非常实用。
