# React 开发者必须掌握的 TypeScript 知识

现在如果你想成为 React 开发者，TypeScript 基本已经是绕不开的技能了。

很多 React 项目，尤其是 Next.js 项目，默认都会使用 TypeScript。它可以帮助我们在开发阶段提前发现类型错误，减少运行时 bug，也能提供更好的代码提示和自动补全。

这篇文章会系统整理 React 开发中最常见、最实用的 TypeScript 知识，包括：

```text
1. 基础类型与类型推导
2. 函数参数和返回值类型
3. React 组件 props 类型
4. 可选 props、children、style、事件处理
5. React hooks 中的 TypeScript
6. type vs interface
7. ComponentPropsWithoutRef
8. as const、Omit、unknown、泛型
9. 类型文件与 tsconfig
```

---

## 一、TSX 是什么？

普通 React 组件文件通常是：

```text
Button.jsx
```

如果改成 TypeScript，就会变成：

```text
Button.tsx
```

`.tsx` 表示这个文件既支持 TypeScript，又支持 JSX。

比如：

```tsx
export default function Button() {
  return <button>Click me</button>;
}
```

React 组件里有 JSX，所以不能只用 `.ts`，而要用 `.tsx`。

---

## 二、TypeScript 的基础类型推导

在 TypeScript 中，变量可以显式声明类型：

```ts
const url: string = "https://example.com";
```

这里的 `: string` 就是在告诉 TypeScript：
`url` 是字符串。

如果写错：

```ts
const url: number = "https://example.com";
```

TypeScript 会报错，因为你把字符串赋值给了 `number` 类型。

不过，大多数时候我们不需要手动写类型。

比如：

```ts
const url = "https://example.com";
```

TypeScript 会自动推导出：

```ts
const url: string;
```

这叫类型推导。

所以在变量声明中，如果 TypeScript 能自己推导出来，就不需要重复写类型。

推荐：

```ts
const name = "Kyle";
const age = 30;
const isActive = true;
```

不推荐：

```ts
const name: string = "Kyle";
const age: number = 30;
const isActive: boolean = true;
```

因为这些类型 TypeScript 已经能看出来。

---

## 三、类型的价值：提前发现错误

TypeScript 的价值在于，当你后续写错代码时，它会提前提醒你。

比如：

```ts
let url = "https://example.com";

url = 123;
```

TypeScript 会报错：

```text
Type 'number' is not assignable to type 'string'.
```

因为 `url` 一开始被推导为 `string`，后面不能再赋值成 `number`。

这可以帮助我们在开发阶段就发现很多低级错误。

---

## 四、函数参数要主动写类型

对于普通变量，TypeScript 很多时候能自动推导。

但是函数参数不一样。

比如：

```ts
function convertCurrency(amount, currency) {
  // ...
}
```

这里 `amount` 和 `currency` 没有类型，TypeScript 通常会把它们当成 `any`。

`any` 的意思是：什么都可以。

这会让 TypeScript 失去保护作用。

所以函数参数一般要主动写类型：

```ts
function convertCurrency(amount: number, currency: string) {
  // ...
}
```

这样调用时：

```ts
convertCurrency(100, "USD");
```

是正确的。

但如果写成：

```ts
convertCurrency("100", "USD");
```

TypeScript 会提醒你：第一个参数应该是 `number`，不是 `string`。

---

## 五、函数返回值通常不用写，但可以写

函数返回值也可以写类型：

```ts
function convertCurrency(amount: number, currency: string): string {
  return `${amount} ${currency}`;
}
```

这里的 `: string` 表示这个函数必须返回字符串。

如果你不返回内容，或者返回了数字，TypeScript 会报错。

不过在大多数情况下，函数返回值 TypeScript 可以自动推导：

```ts
function convertCurrency(amount: number, currency: string) {
  return `${amount} ${currency}`;
}
```

它会自己知道返回值是 `string`。

所以推荐习惯是：

```text
函数参数：通常要写类型
函数返回值：一般让 TypeScript 推导，重要场景再显式写
```

---

## 六、React 组件本质上也是函数

React 组件其实也是函数。

比如：

```tsx
export default function Button(props) {
  return <button>Click me</button>;
}
```

组件接收的参数在 React 中叫做 props。

所以 React 组件的 TypeScript 核心就是：

**给 props 写类型。**

通常不需要手动给组件返回值写类型，因为 TypeScript 能推导出 JSX 返回值。

---

## 七、不推荐 React.FC 作为默认写法

以前很多人会这样写组件类型：

```tsx
const Button: React.FC<ButtonProps> = (props) => {
  return <button>Click me</button>;
};
```

这种写法现在已经没那么推荐了。

原因是：

```text
1. React.FC 只能配合函数表达式，不适合 function declaration 写法。
2. 它会带来一些额外约束和历史问题。
3. 现在更推荐直接给 props 标注类型。
```

更推荐：

```tsx
type ButtonProps = {
  backgroundColor: string;
};

export default function Button({ backgroundColor }: ButtonProps) {
  return <button style={{ backgroundColor }}>Click me</button>;
}
```

---

## 八、直接给 props 写对象类型

假设按钮组件接收一个背景色：

```tsx
export default function Button(props: { backgroundColor: string }) {
  return (
    <button style={{ backgroundColor: props.backgroundColor }}>Click me</button>
  );
}
```

这里 props 的类型是一个对象：

```ts
{
  backgroundColor: string;
}
```

表示这个组件必须接收一个 `backgroundColor` 字符串。

使用时：

```tsx
<Button backgroundColor="red" />
```

如果写成：

```tsx
<Button backgroundColor={5} />
```

TypeScript 会报错，因为 `backgroundColor` 需要字符串。

---

## 九、React 中更常见的是解构 props

React 组件中更常见的写法是直接解构 props：

```tsx
export default function Button({
  backgroundColor,
}: {
  backgroundColor: string;
}) {
  return <button style={{ backgroundColor }}>Click me</button>;
}
```

但是当 props 多起来后，这样写会很臃肿：

```tsx
export default function Button({
  backgroundColor,
  fontSize,
  pillShape,
}: {
  backgroundColor: string;
  fontSize: number;
  pillShape: boolean;
}) {
  return <button>Click me</button>;
}
```

所以通常会把 props 类型单独提取出来。

---

## 十、用 type 提取 Props 类型

推荐写法：

```tsx
type ButtonProps = {
  backgroundColor: string;
  fontSize: number;
  pillShape: boolean;
};

export default function Button({
  backgroundColor,
  fontSize,
  pillShape,
}: ButtonProps) {
  return <button style={{ backgroundColor, fontSize }}>Click me</button>;
}
```

这样组件更清爽，类型也更容易复用。

命名习惯通常是：

```text
组件名 + Props
```

比如：

```ts
ButtonProps;
UserCardProps;
ModalProps;
FormInputProps;
```

---

## 十一、可选 props

默认情况下，props 是必填的。

比如：

```ts
type ButtonProps = {
  backgroundColor: string;
  fontSize: number;
  pillShape: boolean;
};
```

使用时必须都传：

```tsx
<Button backgroundColor="red" fontSize={30} pillShape={true} />
```

如果少传一个，TypeScript 会报错。

如果想让某个 prop 可选，可以加 `?`：

```ts
type ButtonProps = {
  backgroundColor: string;
  fontSize: number;
  pillShape?: boolean;
};
```

这样 `pillShape` 就可以不传：

```tsx
<Button backgroundColor="red" fontSize={30} />
```

---

## 十二、常见基础类型

React props 中最常见的基础类型有：

```ts
type ButtonProps = {
  text: string;
  count: number;
  disabled: boolean;
};
```

分别对应：

```text
string：字符串
number：数字
boolean：true / false
```

例如：

```tsx
<Button text="Submit" count={3} disabled={false} />
```

---

## 十三、联合类型：限制固定取值

有时候你不希望 prop 接收任意字符串。

比如按钮颜色只能是：

```text
red / blue / green
```

可以写成联合类型：

```ts
type Color = "red" | "blue" | "green";
```

然后使用：

```ts
type ButtonProps = {
  backgroundColor: Color;
  textColor: Color;
};
```

这样：

```tsx
<Button backgroundColor="red" textColor="blue" />
```

是正确的。

但：

```tsx
<Button backgroundColor="purple" textColor="blue" />
```

会报错，因为 `"purple"` 不在允许范围内。

联合类型在 React 项目里非常常见，比如：

```ts
type ButtonVariant = "primary" | "secondary" | "danger";

type Size = "sm" | "md" | "lg";

type Status = "idle" | "loading" | "success" | "error";
```

---

## 十四、数组类型

如果一个 prop 是数组，可以这样写：

```ts
type ButtonProps = {
  padding: number[];
};
```

表示 `padding` 是数字数组。

使用：

```tsx
<Button padding={[5, 10, 20, 50]} />
```

如果写成字符串数组：

```tsx
<Button padding={["5px", "10px"]} />
```

TypeScript 会报错。

数组类型也可以用于自定义类型：

```ts
type Color = "red" | "blue" | "green";

type ButtonProps = {
  colors: Color[];
};
```

---

## 十五、Tuple：固定长度和顺序的数组

普通数组不能限制长度。

比如：

```ts
type ButtonProps = {
  padding: number[];
};
```

这样可以传任意多个数字：

```tsx
<Button padding={[5, 10, 20, 50, 100]} />
```

如果你想明确规定只能有四个值，可以用 tuple：

```ts
type ButtonProps = {
  padding: [number, number, number, number];
};
```

这样只能传四个数字：

```tsx
<Button padding={[5, 10, 20, 50]} />
```

如果多一个或少一个都会报错。

Tuple 本质上是更精确的数组。

适合场景：

```text
坐标：[number, number]
范围：[min, max]
CSS 四边值：[top, right, bottom, left]
```

---

## 十六、style 类型：React.CSSProperties

如果你想让组件接收一个 style 对象，不需要手写所有 CSS 属性。

可以用 React 提供的类型：

```tsx
type ButtonProps = {
  style: React.CSSProperties;
};

export default function Button({ style }: ButtonProps) {
  return <button style={style}>Click me</button>;
}
```

使用：

```tsx
<Button
  style={{
    backgroundColor: "red",
    color: "white",
    fontSize: 20,
    padding: "10px 20px",
  }}
/>
```

`React.CSSProperties` 会帮你检查 CSS 属性名和值。

比如写错属性：

```tsx
<Button style={{ textColor: "red" }} />
```

会提示错误，因为 CSS 里应该是 `color`，不是 `textColor`。

---

## 十七、Record：描述 key-value 对象

有时你会传一个对象，它的 key 是字符串，value 是数字。

比如：

```tsx
<Button
  borderRadius={{
    topLeft: 5,
    topRight: 5,
    bottomRight: 10,
    bottomLeft: 10,
  }}
/>
```

可以这样写类型：

```ts
type ButtonProps = {
  borderRadius: Record<string, number>;
};
```

`Record<string, number>` 的意思是：

```text
这是一个对象，key 是 string，value 是 number。
```

更严格一点，也可以限制 key：

```ts
type Corner = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

type ButtonProps = {
  borderRadius: Record<Corner, number>;
};
```

这样四个角都必须写，少一个也会报错。

---

## 十八、函数 props

React 中经常把函数作为 prop 传递。

比如：

```tsx
<Button onClick={() => console.log("clicked")} />
```

类型可以这样写：

```ts
type ButtonProps = {
  onClick: () => void;
};
```

表示：

```text
onClick 是一个函数
它不接收参数
它没有返回值
```

如果函数有参数并返回数字：

```ts
type ButtonProps = {
  onClick: (value: string) => number;
};
```

其中：

```text
(value: string) 表示参数
=> number 表示返回值
```

`void` 常用于事件处理函数，因为事件处理函数通常不关心返回值。

---

## 十九、children 类型：React.ReactNode

如果组件需要接收 children：

```tsx
<Button>Click me</Button>
```

那么 `children` 也是一个 prop。

常见写法：

```tsx
type ButtonProps = {
  children: React.ReactNode;
};

export default function Button({ children }: ButtonProps) {
  return <button>{children}</button>;
}
```

`React.ReactNode` 是比较宽泛的类型，允许：

```text
字符串
数字
JSX 元素
数组
null
undefined
boolean
```

大多数情况下，children 用 `React.ReactNode` 就够了。

如果你只允许传 JSX 元素，可以用：

```ts
type ButtonProps = {
  children: JSX.Element;
};
```

但这会更严格。

比如：

```tsx
<Button>Click me</Button>
```

可能会报错，因为文本不是 JSX.Element。

所以日常更推荐：

```ts
children: React.ReactNode;
```

---

## 二十、useState 的类型

`useState` 很多时候不需要手动写类型，因为 TypeScript 可以根据初始值推导。

比如：

```tsx
const [count, setCount] = useState(0);
```

TypeScript 会推导：

```ts
count: number;
```

字符串：

```tsx
const [text, setText] = useState("");
```

推导为：

```ts
text: string;
```

布尔值：

```tsx
const [isOpen, setIsOpen] = useState(false);
```

推导为：

```ts
isOpen: boolean;
```

这些都不需要手动写：

```tsx
useState<number>(0);
```

虽然写了也没错，但通常没必要。

---

## 二十一、useState 初始值为 null 时要手动写类型

如果状态一开始是 `null`，后面才变成对象，就需要手动写类型。

比如：

```tsx
type User = {
  name: string;
  age: number;
};

const [user, setUser] = useState<User | null>(null);
```

这里表示：

```text
user 初始是 null
后面可能是 User 对象
```

如果访问：

```tsx
user.name;
```

TypeScript 会报错，因为 `user` 可能是 `null`。

正确写法：

```tsx
user?.name;
```

或者：

```tsx
if (user) {
  console.log(user.name);
}
```

这就是 TypeScript 在提醒你处理空值情况。

---

## 二十二、传递 setState 函数

有时候父组件会把 `setCount` 传给子组件。

父组件：

```tsx
const [count, setCount] = useState(0);

<Button setCount={setCount} />;
```

子组件 props 类型可以这样写：

```ts
type ButtonProps = {
  setCount: React.Dispatch<React.SetStateAction<number>>;
};
```

完整示例：

```tsx
type ButtonProps = {
  setCount: React.Dispatch<React.SetStateAction<number>>;
};

export default function Button({ setCount }: ButtonProps) {
  return <button onClick={() => setCount((prev) => prev + 1)}>Click me</button>;
}
```

这个类型看起来比较长，不需要死记。

实战中可以先把鼠标悬停在 `setCount` 上，让编辑器显示类型，然后复制过来。

---

## 二十三、useRef 的类型

如果要引用 DOM 元素，比如 button：

```tsx
const buttonRef = useRef<HTMLButtonElement>(null);

return <button ref={buttonRef}>Click me</button>;
```

这里的 `HTMLButtonElement` 表示这个 ref 最终会指向一个按钮元素。

常见 DOM 类型：

```text
HTMLButtonElement
HTMLInputElement
HTMLDivElement
HTMLAnchorElement
HTMLFormElement
HTMLTextAreaElement
```

比如 input：

```tsx
const inputRef = useRef<HTMLInputElement>(null);
```

div：

```tsx
const divRef = useRef<HTMLDivElement>(null);
```

---

## 二十四、事件处理函数类型

如果事件处理函数直接写在 JSX 中，TypeScript 通常可以自动推导：

```tsx
<button
  onClick={(event) => {
    console.log(event.currentTarget);
  }}
>
  Click me
</button>
```

这里的 `event` 类型 TypeScript 可以自动知道。

但是如果你把函数提出来：

```tsx
function handleClick(event) {
  console.log(event.currentTarget);
}

<button onClick={handleClick}>Click me</button>;
```

这时 `event` 可能需要手动写类型。

最简单的方法是：

先写内联版本，悬停 `event`，复制编辑器显示的类型。

比如 button click 通常是：

```tsx
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
  console.log(event.currentTarget);
}
```

input change：

```tsx
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  console.log(event.target.value);
}
```

form submit：

```tsx
function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
}
```

常见事件类型：

```text
React.MouseEvent<HTMLButtonElement>
React.ChangeEvent<HTMLInputElement>
React.FormEvent<HTMLFormElement>
React.KeyboardEvent<HTMLInputElement>
```

---

## 二十五、原生元素 props：ComponentPropsWithoutRef

如果你写了一个自定义 Button，其实它是对原生 `<button>` 的封装。

你可能希望它支持原生 button 的所有属性：

```tsx
<Button type="submit" autoFocus disabled />
```

不应该手动一个个写：

```ts
type ButtonProps = {
  type?: "button" | "submit" | "reset";
  autoFocus?: boolean;
  disabled?: boolean;
  // ...
};
```

因为 button 原生属性很多。

更好的方式是：

```tsx
type ButtonProps = React.ComponentPropsWithoutRef<"button">;

export default function Button({ type, ...rest }: ButtonProps) {
  return <button type={type} {...rest} />;
}
```

这样 `Button` 会自动支持原生 button 的所有 props。

如果你还想加自己的 props，比如 `variant`：

```tsx
type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary";
};

export default function Button({ variant, ...rest }: ButtonProps) {
  return <button data-variant={variant} {...rest} />;
}
```

这里的 `&` 表示交叉类型，也就是把两个类型合并。

如果组件需要转发 ref，则可以使用：

```ts
React.ComponentPropsWithRef<"button">;
```

如果不转发 ref，更推荐明确使用：

```ts
React.ComponentPropsWithoutRef<"button">;
```

---

## 二十六、type 和 interface

React 项目里经常会看到两种写法。

`type`：

```ts
type ButtonProps = {
  text: string;
  count: number;
};
```

`interface`：

```ts
interface ButtonProps {
  text: string;
  count: number;
}
```

对于简单对象，这两种都可以。

但我更推荐默认用 `type`。

原因是 `type` 能表达更多东西：

```ts
type Url = string;

type Color = "red" | "blue" | "green";

type Padding = [number, number, number, number];
```

这些 `interface` 不适合直接表达。

`interface` 更适合描述对象，并且支持声明合并。

如果团队已有规范，可以遵守团队规范。
如果你自己定规范，React 项目里默认用 `type` 会更统一。

---

## 二十七、type 的扩展：交叉类型

如果你有一个基础类型：

```ts
type ButtonProps = {
  color: "red" | "blue" | "green";
};
```

另一个 SuperButton 想复用 ButtonProps，并额外加 size：

```ts
type SuperButtonProps = ButtonProps & {
  size: "sm" | "md" | "lg";
};
```

这里的 `&` 表示：

```text
ButtonProps + size
```

如果用 interface，通常写成：

```ts
interface ButtonProps {
  color: "red" | "blue" | "green";
}

interface SuperButtonProps extends ButtonProps {
  size: "sm" | "md" | "lg";
}
```

简单记：

```text
type 用 &
interface 用 extends
```

---

## 二十八、as const

假设有一个常量数组：

```ts
const buttonTextOptions = [
  "Click me",
  "Click me again",
  "Click me one more time",
];
```

TypeScript 默认会推导成：

```ts
string[]
```

也就是说，它只知道这是字符串数组，不知道里面具体有哪些字符串。

如果加上 `as const`：

```ts
const buttonTextOptions = [
  "Click me",
  "Click me again",
  "Click me one more time",
] as const;
```

TypeScript 会推导得更精确：

```ts
readonly[("Click me", "Click me again", "Click me one more time")];
```

好处是：

```text
1. 数组变成只读
2. 元素不再是普通 string，而是具体字符串字面量
3. 更适合做固定选项、状态、路由、配置
```

比如：

```ts
const COLORS = ["red", "blue", "green"] as const;

type Color = (typeof COLORS)[number];
```

得到：

```ts
type Color = "red" | "blue" | "green";
```

---

## 二十九、Omit：从已有类型中删除字段

假设有一个 User 类型：

```ts
type User = {
  name: string;
  sessionId: string;
};
```

游客 Guest 和 User 很像，但没有 name：

```ts
type Guest = Omit<User, "name">;
```

得到：

```ts
type Guest = {
  sessionId: string;
};
```

`Omit` 的意思是：

```text
从 User 中去掉 name 字段。
```

React 项目中常用于：

```text
创建表单类型
更新类型
组件 props 派生
去掉不需要暴露的字段
```

---

## 三十、localStorage 和类型断言

从 `localStorage` 里取出来的数据，TypeScript 只能知道它是：

```ts
string | null;
```

比如：

```ts
const previousButtonColor = localStorage.getItem("buttonColor");
```

如果你的项目里已经有类型：

```ts
type ButtonColor = "red" | "blue" | "green";
```

你可能会写：

```ts
const previousButtonColor = localStorage.getItem("buttonColor") as ButtonColor;
```

这里的 `as ButtonColor` 是类型断言。

它的意思是：

```text
我告诉 TypeScript，这个值就是 ButtonColor。
```

但要注意：

**类型断言不会做运行时校验。**

如果 localStorage 里实际存的是 `"purple"`，TypeScript 也不会知道。

更安全的方式是做校验：

```ts
const COLORS = ["red", "blue", "green"] as const;

type ButtonColor = (typeof COLORS)[number];

const value = localStorage.getItem("buttonColor");

const previousButtonColor: ButtonColor | null = COLORS.includes(
  value as ButtonColor,
)
  ? (value as ButtonColor)
  : null;
```

---

## 三十一、unknown：外部数据不要轻易相信

从 API 拿到的数据，默认经常会被推导成 `any`：

```ts
const res = await fetch("/api/user");
const data = await res.json();
```

`any` 不安全，因为你可以随便访问：

```ts
data.name.toUpperCase();
```

即使真实数据里没有 `name`，TypeScript 也不会报错。

更安全的做法是：

```ts
const data: unknown = await res.json();
```

`unknown` 的意思是：

```text
我不知道它是什么，使用前必须先检查。
```

你不能直接写：

```ts
data.name;
```

必须先验证它的结构。

真实项目中推荐配合 Zod 这类 schema 校验库：

```ts
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const data: unknown = await res.json();

const user = UserSchema.parse(data);
```

这样只有数据真的符合结构，才会得到可靠的 `user` 类型。

一句话：

```text
any 是放弃检查。
unknown 是要求检查。
```

---

## 三十二、泛型 Generics

泛型是 TypeScript 里比较难但非常重要的概念。

先看一个函数：

```ts
function convertToArray(value) {
  return [value];
}
```

如果不给 `value` 写类型，它就是 `any`，不安全。

你可能写成：

```ts
function convertToArray(value: string): string[] {
  return [value];
}
```

但这样只能处理字符串。

如果希望它既能处理字符串，也能处理数字、布尔值，并且返回对应类型的数组，就可以用泛型：

```ts
function convertToArray<T>(value: T): T[] {
  return [value];
}
```

这里的 `T` 是类型参数。

意思是：

```text
传进来是什么类型，返回的数组就是什么类型。
```

比如：

```ts
const a = convertToArray("hello");
// string[]

const b = convertToArray(5);
// number[]

const c = convertToArray(true);
// boolean[]
```

泛型的核心不是“复杂语法”，而是：

**描述类型之间的关系。**

---

## 三十三、React 组件中的泛型

假设一个组件接收两个 props：

```text
countValue
countHistory
```

要求：

```text
countValue 是什么类型，countHistory 就必须是什么类型的数组。
```

可以用泛型：

```tsx
type ButtonProps<T> = {
  countValue: T;
  countHistory: T[];
};

export default function Button<T>({
  countValue,
  countHistory,
}: ButtonProps<T>) {
  return <button>{String(countValue)}</button>;
}
```

使用：

```tsx
<Button countValue={5} countHistory={[1, 2, 3]} />
```

正确。

```tsx
<Button countValue="5" countHistory={["1", "2", "3"]} />
```

也正确。

但：

```tsx
<Button countValue="5" countHistory={[1, 2, 3]} />
```

会报错，因为 `countValue` 是字符串，`countHistory` 却是数字数组。

泛型在普通业务组件里不算特别常见，但在通用组件、组件库、表格、选择器、表单组件里非常常见。

---

## 三十四、箭头函数泛型在 TSX 里的小坑

如果你在 `.tsx` 里写箭头函数泛型：

```tsx
const convertToArray = <T>(value: T): T[] => {
  return [value];
};
```

可能会和 JSX 语法冲突，因为 `<T>` 看起来像 JSX 标签。

解决方式是加一个逗号：

```tsx
const convertToArray = <T,>(value: T): T[] => {
  return [value];
};
```

不过很多人更喜欢用普通函数写泛型：

```ts
function convertToArray<T>(value: T): T[] {
  return [value];
}
```

这样语法更清楚。

---

## 三十五、可复用类型放到 types.ts

如果某个类型会被多个组件使用，不要一直写在组件文件里。

比如：

```ts
type Color = "red" | "blue" | "green";
```

可以放到：

```text
src/lib/types.ts
```

或者：

```text
src/types.ts
```

然后导出：

```ts
export type Color = "red" | "blue" | "green";
```

使用时导入：

```ts
import type { Color } from "@/lib/types";
```

这里的 `import type` 表示：

```text
我导入的是 TypeScript 类型，不是运行时变量。
```

这样更清晰，也有利于编译优化。

---

## 三十六、不要随便创建 .d.ts 文件

有些人可能会想创建：

```text
index.d.ts
```

然后把项目类型都放进去。

这通常不是推荐做法。

`.d.ts` 是声明文件，主要用于：

```text
给没有类型的第三方库补类型
声明全局类型
提供类型声明
```

普通项目类型用 `.ts` 文件就可以：

```text
types.ts
```

例如：

```ts
export type Color = "red" | "blue" | "green";
```

---

## 三十七、@types 是什么？

在 `node_modules` 里你可能会看到：

```text
@types/react
@types/node
```

这是很多第三方库的类型声明。

有些库本身不是 TypeScript 写的，或者没有内置类型，那么社区会通过 `DefinitelyTyped` 提供类型声明。

比如 React 的一些类型：

```ts
React.ReactNode;
React.CSSProperties;
React.MouseEvent;
```

都来自相关的类型声明文件。

所以你能在 React 项目里获得良好的类型提示，是因为这些类型定义已经帮你准备好了。

---

## 三十八、tsconfig.json

TypeScript 项目通常会有：

```text
tsconfig.json
```

它是 TypeScript 的配置文件。

里面会配置：

```text
如何编译 TypeScript
是否开启严格模式
JSX 如何处理
路径别名
包含哪些文件
排除哪些文件
```

其中比较重要的是：

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

`strict: true` 表示开启严格模式。

比如：

```tsx
const [user, setUser] = useState<User | null>(null);

console.log(user.name);
```

在严格模式下会报错，因为 `user` 可能是 `null`。

正确写法：

```tsx
console.log(user?.name);
```

不建议为了少报错就关闭严格模式。

更推荐保持：

```json
"strict": true
```

这样能提前发现更多潜在问题。

---

## 三十九、Next.js 中的 next-env.d.ts

Next.js 项目中通常会有一个文件：

```text
next-env.d.ts
```

这个文件会引用 Next.js 自己的类型声明。

比如 Next.js 扩展了 `fetch`，允许写：

```ts
await fetch("https://example.com", {
  next: {
    revalidate: 60,
  },
});
```

这里的 `next.revalidate` 是 Next.js 特有的配置。

你能获得这些提示和类型检查，就是因为项目里包含了 Next.js 的类型声明。

这个文件通常不需要手动修改。

---

## 四十、React TypeScript 实战建议

可以按下面这些规则记：

```text
1. 变量类型能推导就不写。
2. 函数参数通常要写类型。
3. React 组件主要写 props 类型。
4. children 大多数时候用 React.ReactNode。
5. style 用 React.CSSProperties。
6. 原生 button / input / a 封装用 ComponentPropsWithoutRef。
7. useState 初始值为 null 时，写成 User | null。
8. useRef DOM 元素时，写 HTMLButtonElement / HTMLInputElement 等。
9. 事件类型不会写时，先写内联函数，悬停 event 复制类型。
10. 外部 API 数据优先当 unknown，再用 schema 校验。
11. 少用 any。
12. 可复用类型放 types.ts，用 import type 导入。
13. tsconfig 保持 strict: true。
```

---

## 四十一、总结

React 中使用 TypeScript，核心不是把所有地方都写满类型，而是知道哪些地方应该写，哪些地方可以让 TypeScript 推导。

最重要的是：

```text
props 要写类型
函数参数要写类型
useState(null) 要写联合类型
useRef DOM 要写元素类型
children 用 React.ReactNode
style 用 React.CSSProperties
事件类型可以从内联函数推导复制
封装原生元素用 ComponentPropsWithoutRef
外部数据用 unknown，不要乱用 any
```

TypeScript 的目的不是增加代码负担，而是让你在写 React 时更早发现错误，获得更好的自动补全，并让组件 API 更清晰。

一句话总结：

**React 开发者学 TypeScript，重点不是死记所有语法，而是学会给 props、状态、事件、外部数据和可复用类型建立清晰的边界。**
