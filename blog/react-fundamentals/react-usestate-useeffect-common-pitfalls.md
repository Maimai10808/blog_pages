# React 新手最容易踩的 useState 和 useEffect 误区

在 React 里，`useState` 和 `useEffect` 是最常用的两个 Hooks。很多人刚学 React 时，基本都是从它们开始：用 `useState` 管理状态，用 `useEffect` 请求数据、监听事件、同步副作用。

但也正因为它们太常用，很多新手会在这里踩坑。

有些问题表面上看是 React 问题，实际上是 JavaScript 闭包、对象引用、异步更新、状态设计没有理解清楚。本文总结 React 新手在使用 `useState` 和 `useEffect` 时最容易犯的几个错误，并给出更合理的写法。

---

## 一、连续调用 setState，却以为状态会立刻更新

先看一个最常见的计数器：

```tsx
const [count, setCount] = useState(0);

function handleClick() {
  setCount(count + 1);
}
```

点击按钮后，`count` 增加 1，这没有问题。

但如果你这样写：

```tsx
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
}
```

很多人会以为点击一次后，`count` 会增加 4。

但实际结果通常只会增加 1。

原因是：`setCount` 不是立刻修改 `count` 变量，而是“安排一次状态更新”。在当前这次函数执行过程中，`count` 仍然是旧值。

假设当前 `count` 是 0，那么这四行本质上都是：

```tsx
setCount(0 + 1);
setCount(0 + 1);
setCount(0 + 1);
setCount(0 + 1);
```

所以最终只是把 `count` 设置为 1。

正确写法是使用函数式更新：

```tsx
function handleClick() {
  setCount((prev) => prev + 1);
  setCount((prev) => prev + 1);
  setCount((prev) => prev + 1);
  setCount((prev) => prev + 1);
}
```

这样每一次更新都能拿到上一次最新的状态，所以点击一次就会增加 4。

需要注意的是，并不是所有 `setState` 都必须写成函数式更新。只有当新状态依赖旧状态时，才推荐这样写。

例如：

```tsx
setCount((prev) => prev + 1);
setTodos((prev) => [...prev, newTodo]);
setUser((prev) => ({ ...prev, name: newName }));
```

只要你要基于旧值计算新值，就优先使用函数式更新。

---

## 二、在条件判断之后调用 Hooks

React Hooks 有一个非常重要的规则：Hooks 必须在组件顶层调用，不能放在条件语句、循环、嵌套函数之后。

错误示例：

```tsx
function ProductCard({ id }: { id?: string }) {
  if (!id) {
    return <p>No ID provided</p>;
  }

  const [something, setSomething] = useState("");
  useEffect(() => {
    // ...
  }, []);

  return <div>Product Card</div>;
}
```

这段代码的问题是：当 `id` 不存在时，组件提前 return，`useState` 和 `useEffect` 不会执行；当 `id` 存在时，它们又会执行。

React 要求每一次 render 时 Hooks 的调用顺序必须完全一致。否则 React 就无法正确对应每个 Hook 的状态。

正确写法是把 Hooks 放在条件判断之前：

```tsx
function ProductCard({ id }: { id?: string }) {
  const [something, setSomething] = useState("");

  useEffect(() => {
    // ...
  }, []);

  if (!id) {
    return <p>No ID provided</p>;
  }

  return <div>Product Card</div>;
}
```

也可以写成单个 return：

```tsx
function ProductCard({ id }: { id?: string }) {
  const [something, setSomething] = useState("");

  useEffect(() => {
    // ...
  }, []);

  return !id ? <p>No ID provided</p> : <div>Product Card</div>;
}
```

核心原则是：Hooks 永远放在组件函数最上层，不要让它们受到条件分支影响。

---

## 三、错误更新对象状态

React 状态里经常会存对象，比如用户信息：

```tsx
const [user, setUser] = useState({
  name: "",
  city: "Shanghai",
  age: 20,
});
```

如果用户输入 name，新手可能会这样写：

```tsx
user.name = e.target.value;
```

这是错误的。React 状态不能直接修改，需要通过 `setUser` 创建新对象。

但还有一种常见错误：

```tsx
setUser({
  name: e.target.value,
});
```

这样虽然更新了 `name`，但原来的 `city` 和 `age` 会丢失。因为你传进去的是一个全新的对象，里面只有 `name`。

正确写法是先复制旧对象，再覆盖需要修改的字段：

```tsx
setUser({
  ...user,
  name: e.target.value,
});
```

如果新状态依赖旧状态，更推荐函数式更新：

```tsx
setUser((prev) => ({
  ...prev,
  name: e.target.value,
}));
```

这里的 `...prev` 表示保留旧对象里的所有字段，然后用新的 `name` 覆盖旧的 `name`。

对象状态更新的核心原则是：不要直接改旧对象，要创建一个新对象，并保留不变的字段。

---

## 四、复杂表单不要为每个字段都写一个 useState

假设一个表单有很多字段：

```text
firstName
lastName
email
password
address
zipCode
```

新手可能会这样写：

```tsx
const [firstName, setFirstName] = useState("");
const [lastName, setLastName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [address, setAddress] = useState("");
const [zipCode, setZipCode] = useState("");
```

字段少的时候还能接受，但字段一多，代码会变得非常臃肿。

更好的方式是用一个对象统一管理表单状态：

```tsx
const [form, setForm] = useState({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  address: "",
  zipCode: "",
});
```

然后给每个 input 设置 `name`：

```tsx
<input name="firstName" value={form.firstName} onChange={handleChange} />
<input name="lastName" value={form.lastName} onChange={handleChange} />
<input name="email" value={form.email} onChange={handleChange} />
```

统一处理：

```tsx
function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
  setForm((prev) => ({
    ...prev,
    [e.target.name]: e.target.value,
  }));
}
```

这里的关键是：

```tsx
[e.target.name]: e.target.value
```

它会根据当前 input 的 `name` 动态更新对应字段。

比如当前输入框是：

```tsx
<input name="firstName" />
```

那么更新的就是：

```tsx
firstName: e.target.value;
```

如果当前输入框是：

```tsx
<input name="email" />
```

更新的就是：

```tsx
email: e.target.value;
```

这样一个 `handleChange` 就可以处理整个表单。

---

## 五、能从已有状态计算出来的值，不要再单独存 state

假设购物车里有数量和单价：

```tsx
const [quantity, setQuantity] = useState(1);
const pricePerItem = 5;
```

你想显示总价。

新手可能会这样写：

```tsx
const [totalPrice, setTotalPrice] = useState(0);

useEffect(() => {
  setTotalPrice(quantity * pricePerItem);
}, [quantity]);
```

这段代码能工作，但没有必要。

因为 `totalPrice` 可以直接从 `quantity` 和 `pricePerItem` 计算出来：

```tsx
const totalPrice = quantity * pricePerItem;
```

组件每次重新渲染时，这行代码都会重新执行，所以总价会自动保持正确。

类似的还有：

```tsx
const fullName = firstName + " " + lastName;
const completedTodos = todos.filter((todo) => todo.completed);
const completedCount = completedTodos.length;
```

这些都属于派生状态。

原则是：能从已有 state 或 props 计算出来的值，不要再创建新的 state。

否则你会制造多个数据源，后续很容易出现同步问题。

---

## 六、不了解对象和数组的引用特性

React 判断状态是否变化时，会比较新旧状态。

对于数字、字符串、布尔值这种原始类型，比较的是值：

```ts
5 === 5; // true
"test" === "test"; // true
true === true; // true
```

所以如果状态本来就是 0，你再次设置为 0，React 通常不会重新渲染：

```tsx
const [price, setPrice] = useState(0);

setPrice(0);
```

但对象和数组不同。

```ts
{ price: 100 } === { price: 100 }; // false
[1, 2, 3] === [1, 2, 3]; // false
```

因为对象和数组比较的是引用地址，不是内容。

所以即使两个对象内容完全一样，它们也是两个不同对象。

例如：

```tsx
const [price, setPrice] = useState({
  number: 100,
  isTotal: true,
});

setPrice({
  number: 100,
  isTotal: true,
});
```

虽然看起来内容没变，但这是一个新的对象，React 会认为状态变化了，从而重新渲染。

这个问题在 `useEffect` 依赖数组里尤其危险。

不推荐：

```tsx
useEffect(() => {
  // ...
}, [price]);
```

如果 `price` 是对象，它的引用可能经常变化，导致 effect 频繁执行。

更好的做法是依赖对象中的具体原始值：

```tsx
useEffect(() => {
  // ...
}, [price.number]);
```

原则是：useEffect 依赖项尽量使用稳定的原始值，谨慎依赖对象和数组。

---

## 七、异步数据初始值处理不当

假设你要请求一篇文章：

```tsx
const [post, setPost] = useState();

useEffect(() => {
  async function fetchPost() {
    const res = await fetch("/api/post");
    const data = await res.json();
    setPost(data);
  }

  fetchPost();
}, []);

return (
  <>
    <h1>{post.title}</h1>
    <p>{post.body}</p>
  </>
);
```

这段代码会报错。

因为组件第一次渲染时，`post` 还是 `undefined`，而你直接访问了：

```tsx
post.title;
```

相当于：

```tsx
undefined.title;
```

这当然会报错。

可以用可选链：

```tsx
<h1>{post?.title}</h1>
<p>{post?.body}</p>
```

但更清晰的做法是显式使用 `null` 表示初始没有数据，并配合 loading 状态：

```tsx
const [post, setPost] = useState<Post | null>(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function fetchPost() {
    const res = await fetch("/api/post");
    const data = await res.json();

    setPost(data);
    setLoading(false);
  }

  fetchPost();
}, []);

if (loading) {
  return <p>Loading...</p>;
}

return (
  <>
    <h1>{post?.title}</h1>
    <p>{post?.body}</p>
  </>
);
```

这里有一个小细节：如果你明确知道“现在没有值”，用 `null` 通常比 `undefined` 更合适。

`undefined` 更像是“意外没有值”，而 `null` 更像是“我主动声明这里暂时没有值”。

---

## 八、TypeScript 中 useState 类型写错

在 TypeScript 里，`useState` 会根据初始值推断类型。

比如：

```tsx
const [loading, setLoading] = useState(true);
```

TypeScript 会推断 `loading` 是 boolean。

```tsx
setLoading(false); // 正确
setLoading("false"); // 错误
```

数字和字符串也一样：

```tsx
const [count, setCount] = useState(0);
// count 被推断为 number
```

但对象请求数据场景容易出问题。

例如：

```tsx
const [post, setPost] = useState(null);
```

TypeScript 会推断 `post` 的类型就是 `null`。

后面你写：

```tsx
setPost(data);
```

或者：

```tsx
post.title;
```

都会出问题。

正确做法是显式声明类型：

```tsx
type Post = {
  title: string;
  body: string;
  tags?: string[];
};

const [post, setPost] = useState<Post | null>(null);
```

这表示：`post` 初始可以是 `null`，但后面会变成 `Post` 类型。

这样 TypeScript 就知道：

```tsx
post.title;
post.body;
```

这些字段是存在于 `Post` 类型上的。

在 React + TypeScript 中，常见的 `useState` 类型写法包括：

```tsx
const [count, setCount] = useState(0);
const [text, setText] = useState("");
const [loading, setLoading] = useState(false);
const [post, setPost] = useState<Post | null>(null);
const [todos, setTodos] = useState<Todo[]>([]);
```

原始类型通常可以自动推断；对象、数组、异步数据通常建议显式标注。

---

## 九、不敢写自定义 Hook，导致重复代码越来越多

很多新手会觉得自定义 Hook 很高级，其实它本质上就是“带 React Hooks 的工具函数”。

比如多个组件都需要获取窗口宽度，新手可能会在每个组件里复制这段逻辑：

```tsx
const [windowSize, setWindowSize] = useState(window.innerWidth);

useEffect(() => {
  function handleResize() {
    setWindowSize(window.innerWidth);
  }

  window.addEventListener("resize", handleResize);

  return () => {
    window.removeEventListener("resize", handleResize);
  };
}, []);
```

如果很多组件都需要窗口宽度，就会出现大量重复代码。

更好的做法是抽成自定义 Hook：

```tsx
function useWindowSize() {
  const [windowSize, setWindowSize] = useState(window.innerWidth);

  useEffect(() => {
    function handleResize() {
      setWindowSize(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return windowSize;
}
```

组件中使用：

```tsx
function ExampleComponent() {
  const windowSize = useWindowSize();

  return <div>Window size: {windowSize}</div>;
}
```

自定义 Hook 的命名通常以 `use` 开头，比如：

```tsx
useWindowSize;
useLocalStorage;
useDebounce;
useFetch;
useAuth;
```

它的作用是把可复用的状态逻辑抽出去，让组件保持简洁。

简单理解：

```text
复用 JSX：抽组件
复用普通函数逻辑：抽 utils
复用 useState / useEffect 等 Hook 逻辑：抽自定义 Hook
```

---

## 十、在 Next.js Server Component 里使用 useState / useEffect

如果你使用 Next.js App Router，需要理解 Server Component 和 Client Component 的区别。

在 App Router 中，组件默认是 Server Component。

Server Component 不能使用：

```tsx
useState
useEffect
useRef
useReducer
浏览器 API
window
document
localStorage
```

例如：

```tsx
function Page() {
  const [count, setCount] = useState(0);

  return <div>{count}</div>;
}
```

在 Server Component 中会报错。

如果你要使用客户端交互能力，需要在文件顶部加：

```tsx
"use client";
```

完整示例：

```tsx
"use client";

import { useState } from "react";

function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((prev) => prev + 1)}>Count: {count}</button>
  );
}
```

同样，下面这些也只能在客户端使用：

```tsx
window.alert("hello");
localStorage.getItem("token");
document.addEventListener("keydown", handler);
```

需要注意：`'use client'` 是一个边界。一旦某个组件是 Client Component，它 import 的子组件也会进入客户端组件树。

所以不要随便把所有组件都加 `'use client'`。
真正需要交互、状态、浏览器 API 的组件才加。

---

## 十一、setInterval 中遇到闭包陷阱

看一个计数器例子：

```tsx
const [count, setCount] = useState(0);

useEffect(() => {
  setInterval(() => {
    setCount(count + 1);
  }, 1000);
}, []);
```

很多人以为这样每秒都会加 1。

但实际结果可能是：count 只变成 1，然后就不动了。

原因是闭包。

`useEffect` 只在组件挂载时执行一次。当时 `count` 是 0。`setInterval` 里的函数也在那个时候被创建，所以它记住的 `count` 永远是 0。

于是每秒执行的其实都是：

```tsx
setCount(0 + 1);
```

所以永远是 1。

错误修复思路之一是把 `count` 加到依赖数组里：

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);

  return () => {
    clearInterval(id);
  };
}, [count]);
```

这样每次 `count` 变化都会重新创建 interval，并清理上一次 interval。

但这个写法不够简洁。

更推荐的方式是使用函数式更新：

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount((prev) => prev + 1);
  }, 1000);

  return () => {
    clearInterval(id);
  };
}, []);
```

这样 `setCount` 每次都能拿到最新的状态，不需要依赖外部的 `count` 变量。

这个例子也说明：闭包问题不是 React 独有的，本质上是 JavaScript 基础。

---

## 十二、在 useEffect 里手写 fetch，却不处理真实场景问题

很多新手会这样请求数据：

```tsx
useEffect(() => {
  async function fetchPost() {
    const res = await fetch(`/api/posts/${id}`);
    const data = await res.json();
    setText(data.body);
  }

  fetchPost();
}, [id]);
```

这在简单 demo 里没问题，但真实项目里会出现很多边界情况。

比如用户快速点击多个文章：

```text
点击 id = 1
点击 id = 2
点击 id = 3
点击 id = 4
```

这会连续发出多个请求。

如果这些请求返回顺序不一致，可能会出现旧请求覆盖新请求的问题。页面最后显示的不一定是最后一次点击的数据。

这就是常见的 race condition。

可以用 `AbortController` 取消上一次请求：

```tsx
useEffect(() => {
  const controller = new AbortController();

  async function fetchPost() {
    const res = await fetch(`/api/posts/${id}`, {
      signal: controller.signal,
    });

    const data = await res.json();
    setText(data.body);
  }

  fetchPost();

  return () => {
    controller.abort();
  };
}, [id]);
```

这样每次 `id` 变化时，都会清理上一次 effect，也就是取消上一次请求。

但这还只是其中一个问题。

手写 `useEffect + fetch` 还要处理：

```text
loading 状态
error 状态
请求取消
缓存
重复请求
数据重新验证
race condition
组件卸载后的状态更新
分页
乐观更新
```

所以正式项目里，不建议大量手写 `useEffect` 请求数据。

更推荐：

```text
Next.js 项目：优先使用 Server Component / Next.js 数据获取能力
React SPA：优先使用 React Query 或 SWR
简单 demo：useEffect + fetch 可以接受
```

例如 React Query：

```tsx
const { data, isLoading, error } = useQuery({
  queryKey: ["post", id],
  queryFn: () => fetchPost(id),
});
```

它会帮你处理缓存、loading、error、重复请求等问题。

---

## 总结

`useState` 和 `useEffect` 看起来简单，但真正写好并不容易。

新手最容易犯的错误包括：

```text
以为 setState 会立刻更新
连续 setState 不使用函数式更新
在条件语句后调用 Hooks
直接修改对象状态
更新对象时忘记保留旧字段
复杂表单拆成一堆 useState
把派生值也存成 state
不了解对象和数组的引用变化
异步数据初始值处理不当
TypeScript 中 useState 类型声明错误
不敢抽自定义 Hook
在 Server Component 里使用客户端 Hooks
setInterval 中遇到闭包陷阱
useEffect 手写 fetch 却不处理取消、缓存和竞态
```

写 React 时可以记住几个核心原则：

```text
Hooks 必须放在组件顶层
新状态依赖旧状态时，用函数式更新
对象和数组状态要创建新引用，不要直接修改
能计算出来的值，不要单独存 state
重复的 Hook 逻辑，抽成自定义 Hook
useEffect 用来同步外部系统，不要滥用
正式项目的数据请求，优先用成熟方案
```

React 本身并不难，难的是理解它背后的 JavaScript 机制：闭包、引用、异步更新、函数重新执行、状态派生。

当你真正理解这些基础后，`useState` 和 `useEffect` 就不会再只是“会用”，而是能写得稳定、清晰、可维护。
