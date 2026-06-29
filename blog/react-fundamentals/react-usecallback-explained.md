# React `useCallback` 详解：什么时候用、为什么用、怎么避免踩坑？

在 React 中，`useCallback` 是一个经常被提到，但也经常被误用的 Hook。很多人一听到“性能优化”，就会下意识地把函数全部包一层 `useCallback`，但实际上，这并不是它的正确用法。

`useCallback` 并不是像 `useState`、`useEffect` 那样几乎每个组件都会用到的 Hook。它出现的频率没有那么高，但在某些场景下，它确实能够明显减少不必要的渲染，甚至对大型组件的性能表现产生关键影响。

本文会通过一个简单的搜索列表例子，讲清楚 `useCallback` 的核心作用、使用场景，以及它最容易踩坑的地方。

---

## 一、问题场景：函数作为 props 传给子组件

假设我们有一个用户列表页面，页面中包含三个部分：

一个用户列表；

一个用于打乱用户顺序的 `Shuffle` 按钮；

一个用于搜索用户的输入框组件 `Search`。

父组件中大致有这样一个函数：

```jsx
const handleSearch = (text) => {
  const filteredUsers = allUsers.filter((user) => user.name.includes(text));

  setUsers(filteredUsers);
};
```tsx

然后我们把这个函数作为 props 传给子组件：

```jsx
<Search onChange={handleSearch} />
```

`Search` 组件本身很简单，只负责渲染一个输入框：

```jsx
function Search({ onChange }) {
  console.log("Search rendered");

  return (
    <input
      placeholder="Search user"
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default memo(Search);
```ts

这里有一个关键点：`Search` 组件被 `memo` 包裹了。

`memo` 的作用是：当组件的 props 没有变化时，跳过这次渲染。也就是说，如果 `Search` 接收到的 `onChange` 没变，它理论上就不应该重新渲染。

但实际情况是，当我们点击 `Shuffle` 按钮时，即使搜索框本身没有变化，`Search` 组件依然重新渲染了。

为什么？

---

## 二、React 中函数默认每次渲染都会重新创建

问题的核心在于：

**在 React 函数组件中，组件每次重新渲染，组件内部声明的函数都会被重新创建。**

也就是说，虽然下面这个函数每次看起来代码完全一样：

```jsx
const handleSearch = (text) => {
  const filteredUsers = allUsers.filter((user) => user.name.includes(text));

  setUsers(filteredUsers);
};
```

但是在 React 看来，每次渲染产生的 `handleSearch` 都是一个新的函数引用。

换句话说：

```jsx
previousHandleSearch === currentHandleSearch;
```text

结果是：

```jsx
false;
```

这就导致 `memo(Search)` 判断 props 时发现：

上一次的 `onChange` 和这一次的 `onChange` 不是同一个函数。

于是，`Search` 组件会重新渲染。

即使搜索框没有变化，即使用户只是点击了 `Shuffle` 按钮，`Search` 也会因为函数引用变化而重新渲染。

在这个简单例子里，问题不大，因为 `Search` 组件很小。但如果子组件非常复杂，里面有大量子组件、昂贵计算或复杂 DOM，那么这种不必要的渲染就可能造成性能问题。

这就是 `useCallback` 出场的地方。

---

## 三、`useCallback` 的作用：缓存函数引用

`useCallback` 的核心作用是：

**缓存一个函数，让这个函数在依赖项没有变化时，保持同一个引用。**

写法如下：

```jsx
import { useCallback } from "react";

const handleSearch = useCallback((text) => {
  const filteredUsers = allUsers.filter((user) => user.name.includes(text));

  setUsers(filteredUsers);
}, []);
```tsx

这里的 `useCallback` 接收两个参数：

第一个参数是需要缓存的函数；

第二个参数是依赖数组。

当依赖数组中的值没有变化时，React 会复用上一次的函数引用。这样一来，传给 `Search` 的 `onChange` 就不会每次都变。

于是，`memo(Search)` 再次比较 props 时会发现：

```jsx
previousOnChange === currentOnChange;
```

结果是：

```jsx
true;
```tsx

既然 props 没变，`Search` 就不会重新渲染。

这就是 `useCallback` 最典型的使用场景：

**当一个函数被传递给经过 `memo` 优化的子组件时，可以使用 `useCallback` 来避免函数引用变化导致子组件无意义重渲染。**

---

## 四、`useCallback` 不是让函数“运行更快”

很多人容易误解 `useCallback`，以为它会让函数本身执行得更快。

其实不是。

`useCallback` 优化的不是函数内部逻辑的执行速度，而是函数的引用稳定性。

它解决的问题是：

父组件重新渲染；

父组件内部函数被重新创建；

函数作为 props 传给子组件；

子组件因为 props 引用变化而重新渲染；

使用 `useCallback` 后，函数引用在依赖不变时保持稳定；

子组件可以跳过不必要的渲染。

所以，`useCallback` 通常要和 `memo` 搭配使用才更有意义。

如果子组件没有使用 `memo`，那么父组件重新渲染时，子组件大概率还是会跟着渲染。这时候单独使用 `useCallback`，收益可能并不明显，甚至会让代码更复杂。

---

## 五、最容易踩的坑：闭包里的旧值

`useCallback` 虽然可以缓存函数，但它也带来一个非常常见的问题：闭包中的旧值。

假设我们在 `handleSearch` 里打印当前用户列表的第一个用户：

```jsx
const handleSearch = useCallback((text) => {
  console.log(users[0]);

  const filteredUsers = allUsers.filter((user) => user.name.includes(text));

  setUsers(filteredUsers);
}, []);
```

注意，这里的依赖数组是空数组：

```jsx
[];
```tsx

这意味着这个函数只会在组件第一次渲染时创建一次，之后一直复用最初的那个函数。

问题来了。

如果第一次渲染时，`users[0]` 是 `John`，那么这个函数闭包里保存的 `users` 就是初始状态下的 `users`。

之后即使用户列表已经变化，比如搜索后第一个用户变成了 `Alex`，这个函数里访问到的 `users[0]` 仍然可能是旧的 `John`。

这就是所谓的“闭包陷阱”。

因为 `useCallback` 把函数引用缓存下来了，同时也让函数捕获了当时作用域里的变量。如果依赖数组写错，就会导致函数拿不到最新数据。

---

## 六、正确使用依赖数组

为了解决上面的问题，需要把函数内部用到的外部变量加入依赖数组。

比如函数里用到了 `users`：

```jsx
const handleSearch = useCallback(
  (text) => {
    console.log(users[0]);

    const filteredUsers = allUsers.filter((user) => user.name.includes(text));

    setUsers(filteredUsers);
  },
  [users],
);
```

这样，当 `users` 变化时，React 会重新创建 `handleSearch` 函数。

这时函数就能拿到最新的 `users`。

当然，这也意味着：当 `users` 变化时，传给 `Search` 的 `onChange` 引用也会变化，`Search` 会重新渲染。

看起来好像又回到了原点，但其实不是。

因为现在我们是在有必要的时候才让函数变化。

这也是 `useCallback` 的正确思路：

**不是永远冻结函数，而是在依赖不变时保持函数稳定，在依赖变化时更新函数。**

也就是说，`useCallback` 的目标不是“让函数永远不变”，而是“让函数只在该变的时候变”。

---

## 七、什么时候应该使用 `useCallback`？

一般来说，以下场景比较适合使用 `useCallback`：

### 1. 函数作为 props 传给被 `memo` 包裹的子组件

这是最常见的场景。

```jsx
const handleChange = useCallback((value) => {
  setValue(value);
}, []);

return <Search onChange={handleChange} />;
```tsx

如果 `Search` 使用了 `memo`，那么稳定的函数引用可以避免它因为 props 引用变化而重新渲染。

---

### 2. 函数作为其他 Hook 的依赖项

有时候一个函数会被放进 `useEffect`、`useMemo` 或其他自定义 Hook 的依赖数组中。

如果函数每次渲染都变化，就可能导致副作用重复执行。

例如：

```jsx
const fetchData = useCallback(() => {
  // 请求数据
}, [id]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

这里使用 `useCallback` 可以让 `fetchData` 只在 `id` 变化时更新，从而避免 `useEffect` 不必要地重复执行。

---

### 3. 子组件比较复杂，重渲染成本较高

如果子组件非常简单，比如只是一个普通按钮或输入框，那么使用 `useCallback` 可能没有明显收益。

但如果子组件内部逻辑复杂、渲染成本高，或者包含大量子组件，那么减少不必要渲染就有意义。

---

## 八、什么时候不需要使用 `useCallback`？

并不是所有函数都需要用 `useCallback`。

下面这些情况通常不需要：

函数没有作为 props 传给子组件；

子组件没有使用 `memo`；

组件本身很简单，重渲染成本很低；

使用 `useCallback` 反而让代码更难读；

你只是为了“看起来更性能优化”而使用它。

滥用 `useCallback` 不一定会提升性能。

因为 `useCallback` 本身也有成本：React 需要保存函数、比较依赖项。虽然这个成本通常不大，但如果到处乱用，会让代码可读性下降，也不一定带来实际收益。

---

## 九、`useCallback` 和 `useMemo` 的区别

`useCallback` 和 `useMemo` 很像，但它们缓存的东西不同。

`useCallback` 缓存的是函数：

```jsx
const handleClick = useCallback(() => {
  console.log("click");
}, []);
```tsx

`useMemo` 缓存的是计算结果：

```jsx
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);
```

你可以简单理解为：

`useCallback(fn, deps)` 等价于缓存一个函数；

`useMemo(() => value, deps)` 等价于缓存一个值。

甚至可以说：

```jsx
useCallback(fn, deps);
```tsx

大致类似于：

```jsx
useMemo(() => fn, deps);
```

只是语义上，`useCallback` 专门用于函数缓存。

---

## 十、总结

`useCallback` 的核心作用不是让函数执行更快，而是让函数引用在依赖不变时保持稳定。

它最常见的使用场景，是把函数传给经过 `memo` 优化的子组件，从而避免子组件因为函数引用变化而不必要地重新渲染。

但使用 `useCallback` 时，一定要注意依赖数组。如果函数内部使用了外部变量，就应该把这些变量放进依赖数组。否则，函数可能会一直捕获旧值，导致难以排查的 bug。

正确理解 `useCallback` 的关键是：

不要为了优化而优化；

不要以为所有函数都要包 `useCallback`；

不要把函数永远冻结；

只在函数引用稳定性真的有意义时使用它；

依赖数组一定要写对。

一句话总结：

**`useCallback` 不是万能性能优化工具，它真正解决的是函数引用变化导致的重复渲染问题。**
