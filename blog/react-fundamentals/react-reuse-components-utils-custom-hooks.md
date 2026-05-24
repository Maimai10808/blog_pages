# React 复用思维入门：什么时候写组件，什么时候写工具函数，什么时候写自定义 Hook？

很多人写 React 写到一定阶段后，都会遇到一个问题：代码能跑，但越来越乱。

一开始只是几个组件、几个状态、几段事件处理逻辑；后来项目稍微复杂一点，就会出现重复 JSX、重复字符串处理、重复 `useEffect`、重复本地缓存逻辑。代码不是不能用，但每次改功能都要在多个地方找相似代码，越改越没信心。

React 里做复用，其实可以先记住一个非常实用的判断方式：

> 复用 JSX / 结构，就写组件；复用普通 JavaScript 逻辑，就写工具函数；复用带 React Hook 的逻辑，就写自定义 Hook。

这句话看起来很简单，但它能帮你判断很多代码应该放在哪里，也能让组件更干净、逻辑更清楚、项目更容易维护。

---

## 1. React 复用到底解决什么问题？

React 本身是组件化框架，所以很多初学者会自然地认为：只要有重复代码，就抽组件。

但实际开发里，重复代码不一定都是组件问题。

比如：

```tsx
{item[0].toUpperCase() + item.slice(1)}
```

这是一段字符串处理逻辑，它不是 UI 结构，不应该为了它创建组件。

再比如：

```ts
useEffect(() => {
  localStorage.setItem(key, JSON.stringify(value));
}, [key, value]);
```

这段逻辑用到了 `useEffect`，它和 React 生命周期、组件渲染有关，也不应该只是普通工具函数。

所以 React 复用真正要解决的问题，不只是“减少重复代码”，而是让不同类型的代码回到合适的位置：

- UI 结构放到组件里。
- 普通业务计算放到工具函数里。
- 和 React 状态、生命周期、Hook 相关的逻辑放到自定义 Hook 里。

如果不区分这些类型，项目很容易出现两类问题。

一种是组件过大。一个组件里既有 JSX，又有字符串处理，又有 `localStorage`，又有事件监听，读起来很累。

另一种是抽象混乱。明明是普通函数，却写成 Hook；明明是 Hook 逻辑，却封装成普通 utils；明明只是局部 UI，却被做成过度通用的复杂组件。

所以这篇文章要讲的不是某个新库，而是一种 React 工程化思维：把可复用代码按性质放到正确的位置。

---

## 2. 三种复用方式：组件、工具函数、自定义 Hook

在 React 里，常见复用方式可以分成三类。

### 2.1 组件：复用 JSX 和 UI 结构

组件适合复用界面结构。

比如按钮、弹窗、列表项、卡片、表单输入框、页面头部，这些都有明显的 JSX 结构和样式。

简单理解：只要你想复用的是“长什么样”和“怎么渲染”，优先考虑组件。

比如：

```tsx
function ResetButton() {
  return (
    <button className="rounded bg-red-500 px-4 py-2 text-white">
      Reset to default
    </button>
  );
}
```

这个组件复用的是按钮的 JSX 和样式。

### 2.2 工具函数：复用普通 JavaScript 逻辑

工具函数适合复用不依赖 React 的纯逻辑。

比如：

- 格式化日期。
- 格式化金额。
- 首字母大写。
- 过滤数组。
- 计算百分比。
- 拼接 `className`。
- 校验手机号或邮箱。

简单理解：如果这段逻辑离开 React 也能运行，它通常应该是工具函数。

比如：

```ts
export function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

这个函数不需要 `useState`、不需要 `useEffect`、不需要组件上下文，所以它就是普通工具函数。

### 2.3 自定义 Hook：复用带 Hook 的 React 逻辑

自定义 Hook 适合复用内部使用了 React Hook 的逻辑。

比如：

- `localStorage` 状态同步。
- 防抖值。
- 点击外部关闭弹窗。
- 窗口尺寸监听。
- 数据请求封装。
- Context 消费封装。
- 表单状态逻辑。
- 订阅和取消订阅逻辑。

简单理解：如果这段逻辑里用到了 `useState`、`useEffect`、`useMemo`、`useRef`、`useContext` 等 Hook，它就应该封装成自定义 Hook，而不是普通工具函数。

比如：

```ts
function useLocalStorage(key: string, initialValue: string) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

这个函数名字以 `use` 开头，内部使用了 React Hook，因此它是自定义 Hook。

---

## 3. 最简单的例子：从重复按钮开始

假设页面里有两个地方都需要一个“重置”按钮。

一开始你可能会这样写：

```tsx
function ThemePanel() {
  return (
    <button className="rounded bg-red-500 px-4 py-2 text-white">
      Reset to default
    </button>
  );
}

function ItemList() {
  return (
    <button className="rounded bg-red-500 px-4 py-2 text-white">
      Reset to default
    </button>
  );
}
```

这两个按钮的 JSX 和样式完全一样。后续如果要改颜色、圆角、间距，就要改两处。

这时适合抽成组件：

```tsx
function ResetButton() {
  return (
    <button className="rounded bg-red-500 px-4 py-2 text-white">
      Reset to default
    </button>
  );
}

function ThemePanel() {
  return <ResetButton />;
}

function ItemList() {
  return <ResetButton />;
}
```

这就是组件复用最基本的价值：把重复的 JSX 和样式集中到一个地方。

不过真实项目里按钮通常不会永远写死。不同场景可能有不同文案、不同点击行为，所以可以进一步使用 `children` 和 `onClick`：

```tsx
type ResetButtonProps = {
  children: React.ReactNode;
  onClick: () => void;
};

function ResetButton({ children, onClick }: ResetButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded bg-red-500 px-4 py-2 text-white"
    >
      {children}
    </button>
  );
}
```

使用时：

```tsx
<ResetButton onClick={resetTheme}>Reset theme</ResetButton>
<ResetButton onClick={resetItems}>Reset items</ResetButton>
```

这样组件复用的不只是 JSX，还保留了每个场景自己的行为。

这里的关键点是：组件不应该知道“重置主题”或“重置列表”的具体业务。它只暴露一个 `onClick`，让使用者决定点击后发生什么。

---

## 4. 第二种复用：把普通逻辑抽成工具函数

再看另一个例子。

假设有一个旅行清单列表：

```ts
const items = ["passport", "phone charger", "good mood"];
```

渲染时，希望每一项首字母大写：

```tsx
function ItemList() {
  return (
    <ul>
      {items.map((item) => (
        <li key={item}>
          {item.charAt(0).toUpperCase() + item.slice(1)}
        </li>
      ))}
    </ul>
  );
}
```

这段代码能跑，但 JSX 里混入了一段字符串处理逻辑，可读性一般。

如果另一个地方也要显示当前主题：

```ts
const theme = "dark";
```

你可能又写一遍：

```tsx
<p>{theme.charAt(0).toUpperCase() + theme.slice(1)}</p>
```

这就出现了重复的 JavaScript 逻辑。

更好的做法是抽成工具函数：

```ts
// lib/utils.ts
export function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

然后在组件里使用：

```tsx
import { capitalize } from "./lib/utils";

function ItemList() {
  const items = ["passport", "phone charger", "good mood"];

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{capitalize(item)}</li>
      ))}
    </ul>
  );
}
```

显示主题时也可以复用：

```tsx
<p>Current theme: {capitalize(theme)}</p>
```

这类函数的特点是：它不关心 React，不关心组件，不关心状态，只关心输入和输出。

这也是工具函数最适合做的事。

---

## 5. 第三种复用：把带 Hook 的逻辑抽成自定义 Hook

接下来进入更典型的 React 复用场景。

假设你有一个清单状态：

```ts
const [items, setItems] = useState<string[]>([]);
```

你希望用户刷新页面后，清单仍然存在，所以要把它保存到 `localStorage`。

最直接的写法是：

```ts
const [items, setItems] = useState<string[]>(() => {
  const storedItems = localStorage.getItem("items");
  return storedItems ? JSON.parse(storedItems) : [];
});

useEffect(() => {
  localStorage.setItem("items", JSON.stringify(items));
}, [items]);
```

这段代码做了两件事：

第一，初始化状态时，从 `localStorage` 读取数据。

第二，状态变化时，把新数据写回 `localStorage`。

如果只有一个地方用，这样写问题不大。

但真实项目里，你可能还想保存主题：

```ts
const [theme, setTheme] = useState<"light" | "dark">(() => {
  const storedTheme = localStorage.getItem("theme");
  return storedTheme ? JSON.parse(storedTheme) : "light";
});

useEffect(() => {
  localStorage.setItem("theme", JSON.stringify(theme));
}, [theme]);
```

你会发现逻辑重复了：都是从 `localStorage` 读，状态变化后再写回去。

这段逻辑内部用了 `useState` 和 `useEffect`，所以不应该抽成普通工具函数，而应该抽成自定义 Hook。

---

## 6. 一个最小版 useLocalStorage

先写一个简单版本：

```ts
import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      return initialValue;
    }

    return JSON.parse(storedValue) as T;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

使用方式：

```tsx
function ItemList() {
  const [items, setItems] = useLocalStorage<string[]>("items", []);

  return (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
```

主题也可以用同一个 Hook：

```tsx
function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<"light" | "dark">(
    "theme",
    "light",
  );

  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      Current theme: {theme}
    </button>
  );
}
```

这个 Hook 的价值有两层。

第一，它复用了 `localStorage` 同步逻辑。

第二，它让组件更干净。组件不再关心 `JSON.stringify`、`JSON.parse`、`useEffect` 什么时候执行，只关心“我有一个可以持久化的状态”。

这就是自定义 Hook 很重要的地方：它不仅是复用工具，也是给复杂逻辑起一个清楚的名字。

---

## 7. 自定义 Hook 的核心规则

自定义 Hook 本质上还是函数，但它不是普通函数。

只要一个函数内部使用了 React Hook，它就要遵守 Hook 规则：

- 函数名必须以 `use` 开头。
- 只能在 React 组件或其他 Hook 中调用。
- 不能在条件语句里调用。
- 不能在循环里调用。
- 不能在普通事件函数里临时调用。
- 调用顺序必须在每次渲染时保持一致。

比如下面这种写法是错误的：

```tsx
function Component({ enabled }: { enabled: boolean }) {
  if (enabled) {
    const [value, setValue] = useLocalStorage("key", "");
  }

  return null;
}
```

因为 Hook 被放在了条件语句里。

正确做法是始终在组件顶层调用：

```tsx
function Component({ enabled }: { enabled: boolean }) {
  const [value, setValue] = useLocalStorage("key", "");

  if (!enabled) {
    return null;
  }

  return <div>{value}</div>;
}
```

自定义 Hook 可以把逻辑移出去，但它没有改变 Hook 的运行规则。你可以理解为：把 `useState` 和 `useEffect` 从组件里搬到了另一个函数里，但它们仍然属于 React 的渲染流程。

---

## 8. 返回数组还是对象？

自定义 Hook 常见的返回方式有两种：数组和对象。

### 8.1 返回数组

类似 `useState`：

```ts
return [value, setValue] as const;
```

使用时：

```ts
const [theme, setTheme] = useLocalStorage("theme", "light");
const [items, setItems] = useLocalStorage<string[]>("items", []);
```

好处是可以在解构时直接命名。

`useLocalStorage` 返回的是 `[value, setValue]`，但你可以命名成 `[theme, setTheme]`，也可以命名成 `[items, setItems]`。

缺点是顺序必须记对。如果写成：

```ts
const [setTheme, theme] = useLocalStorage("theme", "light");
```

TypeScript 会尽量帮你发现问题，但运行逻辑上顺序确实是固定的。

### 8.2 返回对象

比如：

```ts
return { value, setValue };
```

使用时：

```ts
const { value: theme, setValue: setTheme } = useLocalStorage(
  "theme",
  "light",
);
```

好处是顺序不重要。

缺点是重命名稍微麻烦。

通常可以这样判断：

如果 Hook 很像 `useState`，只返回一个值和一个更新函数，返回数组比较自然。

如果 Hook 返回多个字段，比如 `data`、`error`、`loading`、`refetch`，返回对象更清晰。

比如数据请求 Hook 更适合返回对象：

```ts
const { data, loading, error, refetch } = useUser();
```

---

## 9. TypeScript 泛型在自定义 Hook 里的作用

在 `useLocalStorage` 里，有一个很关键的问题：不同地方存的数据类型不同。

主题可能是字符串：

```ts
const [theme, setTheme] = useLocalStorage("theme", "light");
```

清单可能是字符串数组：

```ts
const [items, setItems] = useLocalStorage<string[]>("items", []);
```

用户信息可能是对象：

```ts
const [user, setUser] = useLocalStorage<User | null>("user", null);
```

如果直接把类型写成 `any`，虽然省事，但使用时就失去了类型提示。

更好的方式是使用泛型：

```ts
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      return initialValue;
    }

    return JSON.parse(storedValue) as T;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

这里的 `T` 表示：调用者传进来的初始值是什么类型，Hook 返回的 `value` 和 `setValue` 就应该保持同样的类型。

比如：

```ts
const [theme, setTheme] = useLocalStorage("theme", "light");
```

TypeScript 会推断 `theme` 是 `string`。

而：

```ts
const [items, setItems] = useLocalStorage<string[]>("items", []);
```

TypeScript 会知道 `items` 是 `string[]`，`setItems` 也只能接收字符串数组或对应的更新函数。

泛型的核心价值，是表达“输入类型”和“输出类型”之间的关系。

---

## 10. 更完整一点的 useLocalStorage 示例

上面的版本已经能说明思路，但真实项目里还要考虑一些边界。

比如：

- `localStorage` 里可能没有值。
- `JSON.parse` 可能失败。
- 服务端渲染环境没有 `window`。
- 初始值可能是函数。
- 存储失败时不能让整个组件崩掉。

下面是一个更稳一点的 TypeScript 版本：

```ts
import { Dispatch, SetStateAction, useEffect, useState } from "react";

type UseLocalStorageReturn<T> = readonly [
  T,
  Dispatch<SetStateAction<T>>,
];

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): UseLocalStorageReturn<T> {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return initialValue;
    }

    try {
      const storedValue = window.localStorage.getItem(key);

      if (storedValue === null) {
        return initialValue;
      }

      return JSON.parse(storedValue) as T;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 可以在这里上报错误，或者静默失败
    }
  }, [key, value]);

  return [value, setValue] as const;
}
```

使用它：

```tsx
type Theme = "light" | "dark";

function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<Theme>("theme", "light");

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light",
    );
  };

  return <button onClick={toggleTheme}>Current theme: {theme}</button>;
}
```

再看清单列表：

```tsx
function PackingList() {
  const [items, setItems] = useLocalStorage<string[]>("items", []);

  const addItem = (item: string) => {
    setItems((currentItems) => [...currentItems, item]);
  };

  const removeItem = (item: string) => {
    setItems((currentItems) =>
      currentItems.filter((currentItem) => currentItem !== item),
    );
  };

  return (
    <section>
      <button onClick={() => addItem("passport")}>Add passport</button>
      <ul>
        {items.map((item) => (
          <li key={item}>
            {item}
            <button onClick={() => removeItem(item)}>Remove</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

这个例子里，组件只关心业务动作：添加、删除、展示。至于数据怎么从 `localStorage` 读取、怎么写回去，都被 `useLocalStorage` 隐藏了。

这就是自定义 Hook 的意义：不是为了炫技，而是为了把重复的 React 逻辑封装成可理解、可复用的接口。

---

## 11. 真实业务里怎么组合使用？

在真实项目里，这三种复用方式通常会一起出现。

比如做一个旅行清单应用。

### 组件负责 UI

```tsx
function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded bg-red-500 px-4 py-2 text-white"
    >
      Reset
    </button>
  );
}
```

组件关心的是按钮长什么样、如何响应点击。

### 工具函数负责普通逻辑

```ts
export function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

工具函数关心的是字符串如何转换。

### 自定义 Hook 负责 React 逻辑

```ts
const [items, setItems] = useLocalStorage<string[]>("items", []);
```

自定义 Hook 关心的是状态如何初始化、如何持久化、如何随组件更新同步。

最终组件可以写得比较清楚：

```tsx
function PackingList() {
  const [items, setItems] = useLocalStorage<string[]>("items", []);

  const resetItems = () => {
    setItems([]);
  };

  return (
    <section>
      <ResetButton onClick={resetItems} />
      <ul>
        {items.map((item) => (
          <li key={item}>{capitalize(item)}</li>
        ))}
      </ul>
    </section>
  );
}
```

这一小段代码里，其实已经同时用了三种复用：

- `ResetButton` 复用 JSX。
- `capitalize` 复用普通 JS 逻辑。
- `useLocalStorage` 复用带 Hook 的状态逻辑。

这就是比较理想的状态：组件读起来像业务描述，而不是各种细节堆在一起。

---

## 12. 常见误区和边界

### 误区一：所有重复代码都抽组件

重复 JSX 适合抽组件，但重复逻辑不一定适合抽组件。

比如：

```tsx
{value.charAt(0).toUpperCase() + value.slice(1)}
```

这应该是工具函数，而不是组件。

不要为了复用一个字符串处理逻辑写成：

```tsx
<CapitalizedText value={value} />
```

除非你真的要复用的是一段 UI 表现，比如带样式、带标签、带交互的文本组件。

### 误区二：普通逻辑也写成自定义 Hook

如果函数里没有用 React Hook，就不要强行命名成 `useXxx`。

比如：

```ts
function useCapitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

这个名字会误导别人，以为它是 Hook，但它内部没有用任何 React Hook，也没有必要受到 Hook 规则约束。

更合理的写法是：

```ts
function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

### 误区三：自定义 Hook 可以随便调用

自定义 Hook 不是普通函数，不能在条件、循环、事件回调里随便调用。

错误写法：

```tsx
function Component() {
  const handleClick = () => {
    const [value, setValue] = useLocalStorage("key", "");
  };

  return <button onClick={handleClick}>Click</button>;
}
```

Hook 必须在组件顶层调用。

正确写法是：

```tsx
function Component() {
  const [value, setValue] = useLocalStorage("key", "");

  const handleClick = () => {
    setValue("new value");
  };

  return <button onClick={handleClick}>Click</button>;
}
```

### 误区四：自定义 Hook 只是为了减少代码行数

自定义 Hook 的价值不只是让组件少几行代码。

更重要的是，它给逻辑起了名字。

当你看到：

```ts
const [items, setItems] = useLocalStorage("items", []);
```

你马上知道：这是一个会同步到 `localStorage` 的状态。

如果把所有 `useState`、`useEffect`、`localStorage.setItem` 都写在组件里，读者需要自己分析这段逻辑到底在干什么。

好的抽象，不只是少写代码，而是降低理解成本。

### 误区五：工具函数里偷偷使用 Hook

不要在普通工具函数里写 Hook。

错误示例：

```ts
export function getTheme() {
  const [theme] = useLocalStorage("theme", "light");
  return theme;
}
```

这违反 Hook 规则，也会让函数语义混乱。

如果用到了 Hook，就让它成为自定义 Hook：

```ts
export function useTheme() {
  return useLocalStorage<"light" | "dark">("theme", "light");
}
```

---

## 13. 如何判断应该抽成什么？

可以用下面这个判断顺序。

第一，问自己：我要复用的是 JSX、样式、结构吗？

是的话，写组件。

第二，问自己：我要复用的是普通 JavaScript 计算吗？

比如字符串、数组、日期、数字处理。是的话，写工具函数。

第三，问自己：这段逻辑里有没有 React Hook？

如果有 `useState`、`useEffect`、`useRef`、`useMemo`、`useContext` 等，就写自定义 Hook。

第四，问自己：它是否真的需要复用？

有时只是单个组件内部的一点逻辑，不一定马上抽出去。抽象过早也会让项目变复杂。

一个简单经验是：当你第二次复制粘贴类似代码时，就可以考虑抽象；当你第三次复制粘贴时，基本就应该抽象了。

---

## 14. 学习和落地建议

学习 React 复用，不建议一上来就研究复杂架构。可以按这个顺序练习。

先练组件复用。

从按钮、卡片、列表项、弹窗开始，理解 props、`children`、`onClick` 这些最基本的组合方式。

再练工具函数。

把组件里那些和 JSX 无关的逻辑移出去，比如 `capitalize`、`formatDate`、`formatPrice`、`getCompletedPercentage`。

然后练自定义 Hook。

先写几个常见 Hook，比如：

- `useLocalStorage`
- `useDebounce`
- `useWindowSize`
- `useOnClickOutside`
- `usePrevious`
- `useToggle`

接着再学习 TypeScript 泛型。

尤其是自定义 Hook，很多时候需要表达“传入什么类型，返回什么类型”。这时泛型非常有用。

最后再把这些思想放进真实项目里。

你可以做一个简单清单应用：列表用组件，字符串处理用 utils，本地持久化用自定义 Hook。这个练习虽然小，但能覆盖 React 复用思维的核心。

---

## 总结

React 里的复用不只是“把代码抽出去”。

更重要的是判断：这段代码到底是什么类型的代码？

如果它是 UI 结构，用组件。

如果它是普通 JavaScript 逻辑，用工具函数。

如果它是带 React Hook 的逻辑，用自定义 Hook。

这三个边界一旦清楚，很多代码组织问题都会变简单。

组件会更专注于渲染，工具函数会更专注于计算，自定义 Hook 会更专注于状态和副作用。项目规模变大时，这种分工会明显降低维护成本。

写 React 想更进一步，不一定是先学更复杂的库，而是先把这些基本抽象用对。因为很多高级工程能力，本质上都是从“把代码放在正确的位置”开始的。
