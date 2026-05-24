# 从 JSX 到 TSX：React 开发者必须掌握的 TypeScript 基础

现在写 React，TypeScript 基本已经绕不开了。

很多项目一开始可能还能用 JSX 写得很顺，但随着组件变多、props 变复杂、状态结构变复杂，纯 JavaScript 的问题会慢慢暴露出来：传错 prop 不报错，函数参数类型不清楚，接口返回数据随便用，组件封装后不知道还能传哪些原生属性，某个状态可能是 `null` 却直接访问字段，最后只能等运行时报错。

TypeScript 的价值不是让代码看起来更复杂，而是把很多本来要到运行时才发现的问题，提前放到开发阶段暴露出来。

对 React 开发者来说，学习 TypeScript 不需要一上来就钻很深的类型体操。真正常用的内容其实很集中：变量、函数、组件 props、children、事件、`useState`、`useRef`、React 内置类型、泛型、类型文件组织、`unknown`、`as const`、`tsconfig` 等。

这篇文章就按照一个 React 开发者从 JSX 过渡到 TSX 的路径，把最常用、最应该先掌握的 TypeScript 知识梳理一遍。

---

## 1. 从 JSX 到 TSX，到底变了什么？

在 React 里，`.jsx` 文件表示你可以写 JSX 语法：

```jsx
function Button() {
  return <button>Click me</button>;
}
```

当文件改成 `.tsx` 后，代码本身仍然是 React 组件，但 TypeScript 会开始参与类型检查。

比如：

```ts
const url = "https://example.com";
```

即使你没有显式写类型，TypeScript 也会自动推断：

```ts
const url: string;
```

如果你之后写：

```ts
url = 123;
```

TypeScript 就会提示错误，因为 `url` 最开始被推断为字符串，不能再赋值成数字。

这就是 TypeScript 最基础的价值：它会根据代码推断类型，并在你做出明显不合理的操作时提前提醒你。

当然，你也可以手动标注类型：

```ts
const url: string = "https://example.com";
```

但在很多简单场景里，没有必要手写。TypeScript 能推断出来的，就交给它推断。

一个很重要的习惯是：

> 不要为了写 TypeScript 而到处手动标注类型。能自动推断的地方，让 TypeScript 推断；推断不出来或推断不准确时，再手动标注。

---

## 2. 变量类型：先理解类型推断

最简单的变量：

```ts
const name = "Tom";
const age = 18;
const isActive = true;
```

TypeScript 会分别推断为：

```ts
const name: string;
const age: number;
const isActive: boolean;
```

所以通常不需要这样写：

```ts
const name: string = "Tom";
const age: number = 18;
const isActive: boolean = true;
```

这不是错，只是很多时候没必要。

不过，如果变量一开始没有明确值，或者后续可能有多种类型，就需要你主动说明。

比如：

```ts
let currentUser = null;
```

这时 TypeScript 可能会认为 `currentUser` 就是 `null`。如果后面你想把它设置成用户对象，就需要提前声明：

```ts
type User = {
  name: string;
  age: number;
};

let currentUser: User | null = null;
```

这里的 `User | null` 表示：这个变量要么是一个用户对象，要么是 `null`。

这类写法在 React 状态里非常常见，后面讲 `useState` 时还会遇到。

---

## 3. 函数类型：重点是参数类型

JavaScript 里函数可以这样写：

```ts
function convertCurrency(amount, currency) {
  // ...
}
```

但在 TypeScript 里，如果不开启宽松配置，这里的 `amount` 和 `currency` 会被认为是隐式的 `any`。

`any` 的意思是：什么都可以。

这会让 TypeScript 失去意义。因为你可以对 `any` 做任何操作，即使这个操作运行时可能会崩。

更合理的做法是给函数参数加类型：

```ts
function convertCurrency(amount: number, currency: string) {
  return `${amount} ${currency}`;
}
```

调用时：

```ts
convertCurrency(100, "USD");
```

如果写错：

```ts
convertCurrency("100", "USD");
```

TypeScript 会提示：第一个参数应该是 `number`，不是 `string`。

函数返回值通常可以不写，因为 TypeScript 能根据 `return` 推断：

```ts
function convertCurrency(amount: number, currency: string) {
  return `${amount} ${currency}`;
}
```

它会推断返回值是 `string`。

如果你希望明确约束返回值，也可以写：

```ts
function convertCurrency(amount: number, currency: string): string {
  return `${amount} ${currency}`;
}
```

在 React 项目里，一个实用原则是：

> 函数参数通常要写类型；函数返回值多数时候可以交给 TypeScript 推断。

---

## 4. React 组件类型：核心是 props

React 组件本质上也是函数。

```tsx
function Button() {
  return <button>Click me</button>;
}
```

如果组件需要接收 props，比如背景颜色：

```tsx
<Button backgroundColor="red" />
```

那组件内部也要接收：

```tsx
function Button({ backgroundColor }) {
  return <button style={{ backgroundColor }}>Click me</button>;
}
```

在 TSX 里，这里的 `backgroundColor` 需要类型。

可以直接写在参数后面：

```tsx
function Button({
  backgroundColor,
}: {
  backgroundColor: string;
}) {
  return <button style={{ backgroundColor }}>Click me</button>;
}
```

这能工作，但 props 多了以后会很难看：

```tsx
function Button({
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

更常见的写法是把 props 类型抽出来：

```tsx
type ButtonProps = {
  backgroundColor: string;
  fontSize: number;
  pillShape: boolean;
};

function Button({ backgroundColor, fontSize, pillShape }: ButtonProps) {
  return (
    <button
      style={{
        backgroundColor,
        fontSize,
        borderRadius: pillShape ? 999 : 4,
      }}
    >
      Click me
    </button>
  );
}
```

这样组件签名会更清楚。

如果某个 prop 不是必传，可以加 `?`：

```ts
type ButtonProps = {
  backgroundColor: string;
  fontSize?: number;
  pillShape?: boolean;
};
```

使用时：

```tsx
<Button backgroundColor="red" />
```

不会报错，因为 `fontSize` 和 `pillShape` 是可选的。

---

## 5. 不推荐再用 React.FC 作为默认写法

早期很多 React + TypeScript 项目会这样写组件：

```tsx
const Button: React.FC<ButtonProps> = (props) => {
  return <button>Click me</button>;
};
```

这种写法现在已经不太推荐作为默认选择。

原因主要有几个：

第一，它要求你用箭头函数形式，不够灵活。

第二，它会引入一些额外的类型行为，尤其是早期版本里和 `children` 有关的问题，容易让初学者困惑。

第三，普通函数组件完全可以直接给 props 标注类型，不需要 `React.FC`。

更直接的写法是：

```tsx
type ButtonProps = {
  children: React.ReactNode;
};

function Button({ children }: ButtonProps) {
  return <button>{children}</button>;
}
```

这也是现在很多 React 项目更常见的方式。

---

## 6. 联合类型：让 prop 更精确

有些 prop 不应该接受任意字符串。

比如按钮颜色只允许三种：

```ts
type Color = "red" | "blue" | "green";
```

这叫联合类型。

使用在 props 中：

```tsx
type ButtonProps = {
  backgroundColor: Color;
  textColor: Color;
};

function Button({ backgroundColor, textColor }: ButtonProps) {
  return (
    <button
      style={{
        backgroundColor,
        color: textColor,
      }}
    >
      Click me
    </button>
  );
}
```

使用时：

```tsx
<Button backgroundColor="red" textColor="blue" />
```

如果写：

```tsx
<Button backgroundColor="purple" textColor="blue" />
```

TypeScript 会报错，因为 `"purple"` 不在允许范围内。

这比简单写 `string` 更安全。

```ts
backgroundColor: string;
```

虽然灵活，但也意味着任何字符串都可以传进去。对于设计系统、组件库、业务枚举来说，联合类型通常更合适。

---

## 7. 数组和元组：什么时候用 number[]，什么时候用 tuple

普通数组可以这样写：

```ts
type ButtonProps = {
  padding: number[];
};
```

使用时：

```tsx
<Button padding={[8, 12, 8, 12]} />
```

但问题是，`number[]` 不限制长度。

下面这样也能通过：

```tsx
<Button padding={[8, 12, 8, 12, 20, 30]} />
```

如果你明确需要四个值，比如上、右、下、左，就可以用元组：

```ts
type Padding = [number, number, number, number];

type ButtonProps = {
  padding: Padding;
};
```

这样只能传四个数字：

```tsx
<Button padding={[8, 12, 8, 12]} />
```

多一个或少一个都会报错。

简单理解：

- `number[]` 表示任意长度的数字数组。
- `[number, number, number, number]` 表示固定长度、固定顺序的数组。

元组在 React 里不算特别高频，但在描述固定结构时很有用。

---

## 8. React.CSSProperties：给 style 对象加类型

React 组件里经常会传 `style`：

```tsx
<Button
  style={{
    backgroundColor: "red",
    color: "white",
    fontSize: 16,
  }}
/>
```

如果自己一个一个写 CSS 属性类型，会非常麻烦：

```ts
type ButtonProps = {
  style: {
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
  };
};
```

因为 CSS 属性太多了。

React 已经提供了内置类型：

```tsx
type ButtonProps = {
  style?: React.CSSProperties;
};

function Button({ style }: ButtonProps) {
  return <button style={style}>Click me</button>;
}
```

这样就可以直接支持合法的 CSS 属性：

```tsx
<Button
  style={{
    backgroundColor: "red",
    color: "white",
    borderRadius: 8,
  }}
/>
```

如果写错属性或传错类型，TypeScript 会提醒你。

比如：

```tsx
<Button
  style={{
    borderColor: 123,
  }}
/>
```

会报错，因为 `borderColor` 应该是字符串或符合 CSS 类型的值。

---

## 9. Record：描述键值结构

有时候你需要一个对象，它的 key 是字符串，value 是数字。

比如：

```tsx
<Button
  borderRadius={{
    topLeft: 4,
    topRight: 8,
    bottomRight: 8,
    bottomLeft: 4,
  }}
/>
```

可以这样定义：

```ts
type ButtonProps = {
  borderRadius: Record<string, number>;
};
```

`Record<string, number>` 的意思是：

- key 是字符串。
- value 是数字。

如果你想让 key 更严格，也可以结合联合类型：

```ts
type Corner = "topLeft" | "topRight" | "bottomRight" | "bottomLeft";

type ButtonProps = {
  borderRadius: Record<Corner, number>;
};
```

这样就只能传这四个 key。

```tsx
<Button
  borderRadius={{
    topLeft: 4,
    topRight: 8,
    bottomRight: 8,
    bottomLeft: 4,
  }}
/>
```

如果少一个，或者多写一个不存在的 key，都会被提示。

---

## 10. 函数 props：不要只写 Function

React 里经常把函数作为 props 传给子组件。

比如：

```tsx
<Button onClick={() => console.log("clicked")}>Click me</Button>
```

props 类型可以这样写：

```tsx
type ButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
};

function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}
```

这里：

```ts
onClick: () => void;
```

表示这个函数不接收参数，也不关心返回值。

如果函数接收参数：

```ts
type ButtonProps = {
  onChange: (value: string) => void;
};
```

如果函数返回数字：

```ts
type ButtonProps = {
  getCount: () => number;
};
```

不要写成：

```ts
onClick: Function;
```

这太宽泛了。`Function` 只表示它是个函数，但不说明参数和返回值。这样 TypeScript 很难帮你检查调用是否正确。

---

## 11. children：多数情况用 React.ReactNode

当你这样使用组件：

```tsx
<Button>Click me</Button>
```

中间的 `Click me` 会作为 `children` 传给组件。

类型一般写成：

```tsx
type ButtonProps = {
  children: React.ReactNode;
};

function Button({ children }: ButtonProps) {
  return <button>{children}</button>;
}
```

`React.ReactNode` 很宽泛，它可以表示：

- 字符串。
- 数字。
- JSX 元素。
- 数组。
- `null`。
- `undefined`。
- 布尔值。

所以它很适合 `children`。

有时候你只允许传 JSX 元素，可以写：

```ts
type IconButtonProps = {
  icon: React.JSX.Element;
};
```

例如：

```tsx
<IconButton icon={<SearchIcon />} />
```

`React.JSX.Element` 比 `React.ReactNode` 更严格，它不接受普通字符串。

多数情况下：

- `children` 用 `React.ReactNode`。
- 明确要求传一个 JSX 元素时，用 `React.JSX.Element`。

---

## 12. 包装原生元素时，用 ComponentPropsWithoutRef

如果你封装一个按钮组件，通常希望它支持原生 `button` 的属性。

比如：

```tsx
<Button type="submit" autoFocus disabled>
  Submit
</Button>
```

如果手动写：

```ts
type ButtonProps = {
  type?: "button" | "submit" | "reset";
  autoFocus?: boolean;
  disabled?: boolean;
};
```

会很麻烦，因为原生 `button` 支持的属性很多。

React 提供了一个实用类型：

```ts
type ButtonProps = React.ComponentPropsWithoutRef<"button">;
```

这样你的自定义 `Button` 就能接收原生 `button` 的大部分属性。

```tsx
type ButtonProps = React.ComponentPropsWithoutRef<"button">;

function Button({ children, ...rest }: ButtonProps) {
  return <button {...rest}>{children}</button>;
}
```

如果你还想加自己的业务 prop，比如 `variant`：

```tsx
type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary";
};

function Button({ variant = "primary", children, ...rest }: ButtonProps) {
  return (
    <button data-variant={variant} {...rest}>
      {children}
    </button>
  );
}
```

这里用了交叉类型 `&`：

```ts
React.ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary";
};
```

意思是：既支持原生 `button` 属性，也支持自定义 `variant`。

如果组件需要转发 ref，可以用：

```ts
React.ComponentPropsWithRef<"button">;
```

如果不处理 ref，就用：

```ts
React.ComponentPropsWithoutRef<"button">;
```

---

## 13. rest 和 spread：把剩余 props 传给原生元素

配合 `ComponentPropsWithoutRef`，通常会使用 rest 和 spread：

```tsx
type ButtonProps = React.ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary";
};

function Button({ variant = "primary", children, ...rest }: ButtonProps) {
  return (
    <button className={`btn btn-${variant}`} {...rest}>
      {children}
    </button>
  );
}
```

这里：

```ts
{ variant, children, ...rest }
```

表示把 `variant` 和 `children` 拿出来，其他 props 都收集到 `rest` 里。

然后：

```tsx
<button {...rest}>
```

把剩余属性传给原生 `button`。

这样外部就可以写：

```tsx
<Button type="submit" disabled onClick={() => console.log("submit")}>
  Submit
</Button>
```

组件既有自己的封装能力，又不丢失原生元素能力。

---

## 14. 事件类型：能内联就让 TypeScript 推断

事件处理函数写在 JSX 里时，TypeScript 可以根据上下文自动推断事件类型。

```tsx
<button
  onClick={(event) => {
    console.log(event.currentTarget);
  }}
>
  Click
</button>
```

这里的 `event` 会被推断成 React 的鼠标事件。

但如果你把函数提出来：

```tsx
function handleClick(event) {
  console.log(event.currentTarget);
}

<button onClick={handleClick}>Click</button>;
```

这时 TypeScript 可能无法推断 `event`，需要手动写类型。

可以这样写：

```ts
function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
  console.log(event.currentTarget);
}
```

表单提交：

```ts
function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
}
```

输入框变化：

```ts
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  console.log(event.target.value);
}
```

实用技巧是：如果不知道事件类型，可以先写成内联函数，把鼠标放到 `event` 上，看 TypeScript 推断出的类型，再复制出来。

---

## 15. useState：简单值可以推断，对象和 null 要手动标注

简单状态不需要手动写类型：

```ts
const [count, setCount] = useState(0);
const [text, setText] = useState("");
const [isOpen, setIsOpen] = useState(false);
```

TypeScript 会推断：

```txt
count: number
text: string
isOpen: boolean
```

但如果状态初始值是 `null`，就要手动指定。

比如用户信息一开始还没请求回来：

```ts
type User = {
  name: string;
  email: string;
};

const [user, setUser] = useState<User | null>(null);
```

使用时要注意可能为 `null`：

```tsx
<p>{user?.name}</p>
```

或者先判断：

```tsx
if (!user) {
  return <p>Loading...</p>;
}

return <p>{user.name}</p>;
```

如果不写 `User | null`，TypeScript 可能会认为 `user` 永远是 `null`，后续设置对象时会报错。

所以 `useState` 的判断方式可以很简单：

- 初始值是数字、字符串、布尔值，通常不用写类型。
- 初始值是空数组、`null`、复杂对象，通常需要写类型。
- 状态可能有多种形态时，用联合类型。

---

## 16. useRef：DOM ref 要写具体元素类型

如果你要拿到一个按钮 DOM：

```tsx
const buttonRef = useRef(null);

return <button ref={buttonRef}>Click</button>;
```

更好的写法是：

```ts
const buttonRef = useRef<HTMLButtonElement>(null);
```

这样之后访问：

```ts
buttonRef.current?.focus();
```

TypeScript 就知道 `current` 最终会是一个 `HTMLButtonElement`。

常见 DOM 类型还有：

```txt
HTMLInputElement
HTMLDivElement
HTMLFormElement
HTMLTextAreaElement
HTMLAnchorElement
HTMLImageElement
```

比如输入框：

```tsx
const inputRef = useRef<HTMLInputElement>(null);

function focusInput() {
  inputRef.current?.focus();
}

return <input ref={inputRef} />;
```

`useRef` 的核心是：你要告诉 TypeScript，这个 ref 最终会指向哪种 DOM 元素。

---

## 17. as const：让常量数组变得更精确

假设有一个按钮文案数组：

```ts
const buttonTextOptions = ["Click me", "Click again", "Click one more time"];
```

TypeScript 会推断为：

```ts
string[];
```

这没有错，但不够精确。

如果你希望它被推断成固定值，可以加 `as const`：

```ts
const buttonTextOptions = [
  "Click me",
  "Click again",
  "Click one more time",
] as const;
```

这时它会变成只读元组，里面的每一项都是具体字面量，而不是普通 `string`。

这在定义常量选项时很有用：

```ts
const colors = ["red", "blue", "green"] as const;
type Color = (typeof colors)[number];
```

此时 `Color` 等价于：

```ts
type Color = "red" | "blue" | "green";
```

这种写法适合主题色、状态、菜单 key、路由 key、选项列表等场景。

---

## 18. Omit：从已有类型里移除字段

假设有用户类型：

```ts
type User = {
  name: string;
  sessionId: string;
};
```

游客没有 `name`，但有 `sessionId`。

你可以复用 `User`，移除 `name`：

```ts
type Guest = Omit<User, "name">;
```

此时 `Guest` 等价于：

```ts
type Guest = {
  sessionId: string;
};
```

这比重新写一遍更好，因为如果以后 `User` 里的公共字段变化，`Guest` 可以自动跟着变化。

类似的工具类型还有：

```txt
Pick<User, "name">
Partial<User>
Required<User>
Readonly<User>
```

这些工具类型是 TypeScript 在真实项目里非常常用的部分。

---

## 19. as 类型断言：告诉 TypeScript 你知道更多信息

有时候 TypeScript 不知道某个值的具体类型，但你知道。

比如从 `localStorage` 里取按钮颜色：

```ts
const buttonColor = localStorage.getItem("buttonColor");
```

TypeScript 会认为它是：

```ts
string | null;
```

但你项目里可能已经定义了颜色类型：

```ts
type ButtonColor = "red" | "blue" | "green";
```

你可以断言：

```ts
const buttonColor = localStorage.getItem("buttonColor") as ButtonColor | null;
```

`as` 的意思是：告诉 TypeScript，把这个值当作某个类型看待。

但要注意，`as` 不会做运行时校验。

也就是说，即使 `localStorage` 里存的是 `"purple"`，TypeScript 也不会知道它不合法。

所以 `as` 要谨慎使用。它适合你确实能保证数据来源可靠的地方，不适合随便用来“压住报错”。

---

## 20. 泛型：用来表达类型之间的关系

很多人觉得泛型很难，其实可以先从一个简单函数理解。

比如把任意值转成数组：

```ts
function convertToArray<T>(value: T): T[] {
  return [value];
}
```

调用：

```ts
const numbers = convertToArray(5);
// number[]

const strings = convertToArray("hello");
// string[]
```

这里的 `T` 是一个类型参数。

它表达的是一种关系：

> 输入是什么类型，返回的数组元素就是什么类型。

如果不用泛型，你可能会写成：

```ts
function convertToArray(value: any): any[] {
  return [value];
}
```

这就失去了类型保护。

泛型在 React 里也会出现。比如两个 props 之间有关系：

```tsx
type HistoryProps<T> = {
  value: T;
  history: T[];
};

function History<T>({ value, history }: HistoryProps<T>) {
  return (
    <div>
      <p>Current: {String(value)}</p>
      <p>History count: {history.length}</p>
    </div>
  );
}
```

使用时：

```tsx
<History value={5} history={[1, 2, 3]} />
```

这里 `T` 是 `number`。

如果写：

```tsx
<History value={5} history={["1", "2"]} />
```

就会报错，因为 `value` 是数字，但 `history` 是字符串数组，二者不一致。

泛型不是为了让代码变高级，而是为了表达类型之间的关系。

---

## 21. 类型文件：不要随便用 index.d.ts

当某个类型多个文件都要用时，可以抽到单独文件。

比如：

```ts
// lib/types.ts
export type Color = "red" | "blue" | "green";
```

使用时：

```ts
import type { Color } from "@/lib/types";

type ButtonProps = {
  color: Color;
};
```

这里推荐使用：

```ts
import type { Color } from "@/lib/types";
```

`import type` 表示这是一个类型导入，不是运行时变量导入。

这样可读性更好，也能帮助构建工具更准确处理类型。

不要随便创建：

```txt
index.d.ts
```

`.d.ts` 是声明文件，主要用于给没有类型的第三方库补充类型，或者声明全局类型。普通业务项目里定义类型，直接用 `.ts` 文件即可。

比如：

```txt
types.ts
user.types.ts
api.types.ts
```

都可以。

---

## 22. unknown：比 any 更安全

接口返回值经常被 TypeScript 推断成 `any`。

比如：

```ts
const res = await fetch("/api/user");
const data = await res.json();
```

很多时候 `data` 是 `any`。

问题是，你可以随便写：

```ts
data.name.toUpperCase();
```

即使接口返回的不是这个结构，TypeScript 也不会提醒你。

更安全的做法是把外部数据看成 `unknown`：

```ts
const data: unknown = await res.json();
```

`unknown` 的意思是：我现在不知道它是什么。

你不能直接用：

```ts
data.name;
```

必须先校验。

真实项目里通常会结合 Zod 这类 schema 校验库：

```ts
import { z } from "zod";

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

const rawData: unknown = await res.json();
const user = UserSchema.parse(rawData);

console.log(user.name);
```

这样 TypeScript 和运行时校验就结合起来了。

- TypeScript 负责开发阶段类型检查。
- Zod 负责运行时数据校验。

外部接口、`localStorage`、URL 参数、第三方数据，都不能完全信任。能用 `unknown` 的地方，不要直接用 `any`。

---

## 23. 第三方类型：@types 和 DefinitelyTyped

在 React 项目里，你会用到很多来自第三方库的类型。

比如：

```txt
React.ReactNode
React.CSSProperties
React.MouseEvent
```

这些类型通常来自包本身，或者来自 `@types`。

在 `node_modules` 里经常可以看到：

```txt
@types/react
@types/react-dom
@types/node
```

这些类型定义很多来自 DefinitelyTyped，它是一个社区维护的类型定义集合。

为什么需要它？

因为很多早期 JavaScript 库不是用 TypeScript 写的，本身不带类型。为了让 TypeScript 项目也能舒服使用这些库，社区会为它们提供类型定义。

所以有时候安装某个库后，还需要安装类型包：

```bash
npm install -D @types/lodash
```

不过现在越来越多库已经自带 TypeScript 类型，不一定都需要单独安装 `@types`。

---

## 24. tsconfig.json：建议开启 strict

TypeScript 项目里通常会有：

```txt
tsconfig.json
```

它控制 TypeScript 的编译和检查行为。

其中一个很重要的配置是：

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

`strict: true` 会让 TypeScript 更严格。

比如：

```ts
type User = {
  name: string;
};

const [user, setUser] = useState<User | null>(null);
console.log(user.name);
```

在严格模式下会报错，因为 `user` 可能是 `null`。

你需要写：

```ts
console.log(user?.name);
```

或者：

```ts
if (user) {
  console.log(user.name);
}
```

严格模式一开始可能会让你觉得麻烦，但它能帮你避免大量空值错误。

在 Next.js 这类框架里，通常默认已经配置好了 TypeScript。一般不建议随便关闭 `strict`，除非你非常清楚自己在做什么。

---

## 25. Next.js 里的 next-env.d.ts 是做什么的？

如果你用 Next.js，经常会看到：

```txt
next-env.d.ts
```

这个文件一般不要手动改。

它的作用是引入 Next.js 相关类型，让 TypeScript 知道 Next.js 扩展了哪些能力。

比如 Next.js 扩展了 `fetch`：

```ts
await fetch("https://example.com/api", {
  next: {
    revalidate: 60,
  },
});
```

这里的 `next.revalidate` 是 Next.js 提供的能力，不是浏览器原生 `fetch` 的标准字段。

之所以 TypeScript 能识别它，就是因为项目里引入了 Next.js 的类型声明。

所以看到 `next-env.d.ts` 不需要紧张，它属于框架自动生成或维护的类型声明文件。

---

## 26. 一个更完整的 TSX Button 示例

下面用一个 `Button` 组件把前面提到的内容串起来。

```tsx
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  children,
  className,
  ...rest
}: ButtonProps) {
  const variantClassName = {
    primary: "bg-black text-white",
    secondary: "border text-black",
    danger: "bg-red-600 text-white",
  }[variant];

  return (
    <button
      className={`rounded px-4 py-2 ${variantClassName} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </button>
  );
}
```

使用：

```tsx
<Button type="submit" variant="primary">
  Submit
</Button>

<Button
  type="button"
  variant="danger"
  onClick={() => {
    console.log("delete");
  }}
>
  Delete
</Button>
```

这个组件里体现了几个常用实践：

- 用联合类型限制 `variant`。
- 用 `ComponentPropsWithoutRef<"button">` 继承原生 `button` 属性。
- 用 `ReactNode` 描述 `children`。
- 用 rest/spread 透传原生属性。
- 给 `variant` 设置默认值。
- 用 `import type` 导入类型。

这类写法在真实 React 项目里非常常见。

---

## 27. 学习 React + TypeScript 的建议

React 开发者学习 TypeScript，可以按这个顺序来。

第一步，先掌握基础类型。

包括：

```txt
string
number
boolean
null
undefined
数组
对象
联合类型
```

第二步，掌握函数和组件 props。

重点练习：

```ts
type Props = {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
};
```

第三步，掌握 React 常用内置类型。

比如：

```txt
React.ReactNode
React.JSX.Element
React.CSSProperties
React.ComponentPropsWithoutRef<"button">
React.MouseEvent<HTMLButtonElement>
React.FormEvent<HTMLFormElement>
```

第四步，掌握 hooks 的类型。

尤其是：

```ts
useState<User | null>(null);
useState<Todo[]>([]);
useRef<HTMLInputElement>(null);
```

第五步，学习工具类型。

先掌握：

```txt
Pick
Omit
Partial
Record
ReturnType
Parameters
```

第六步，再学习泛型。

不要一开始就钻复杂泛型。先理解一句话：

> 泛型用于表达类型之间的关系。

例如输入什么类型，返回什么类型；一个 prop 是什么类型，另一个 prop 就必须是什么类型。

第七步，学习外部数据校验。

TypeScript 只在开发阶段工作。接口返回的数据、`localStorage`、URL 参数，都需要运行时校验。可以配合 Zod 这类工具。

---

## 总结

从 JSX 到 TSX，不只是把文件后缀改一下，而是开始用类型系统约束 React 代码。

对 React 开发者来说，TypeScript 最重要的价值主要体现在几个地方：

- props 更清楚。
- 函数参数更可靠。
- 状态结构更明确。
- 事件类型更安全。
- 原生元素封装更完整。
- 外部数据使用更谨慎。
- 组件 API 更容易被团队理解。

刚开始写 TSX 时，不需要一次性掌握所有高级类型。先把最常用的场景写对：props、children、事件、`useState`、`useRef`、联合类型、工具类型、React 内置类型。

真正成熟的 TypeScript 代码，不是到处写复杂类型，而是在该明确的地方明确，在能推断的地方交给 TypeScript 推断，在外部数据不可信的地方保持谨慎。

这才是 React 项目里使用 TypeScript 最实际的方式。
