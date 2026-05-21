# React useCallback 的理解与应用：不是加速函数，而是稳定函数引用

很多人第一次听 `useCallback`，会以为它是“让函数跑得更快”。

但它真正解决的问题是：让函数在多次渲染之间保持同一个引用，也就是 referential equality，从而避免 `useEffect` 乱触发、`React.memo` 失效、事件监听重复注册等问题。

一句话理解：

> `useCallback` 缓存的是函数引用，不是函数执行结果。

---

## 1. 一句话定义 useCallback

```tsx
const fn = useCallback(callback, deps);
```

`useCallback(fn, deps)` 的含义是：

> 缓存函数本身，只在 `deps` 变化时才生成新的函数引用。

它缓存的是“函数引用”，不是函数执行结果。

比如：

```tsx
const fetchUsers = useCallback(() => {
  return fetch(`/api/users?keyword=${keyword}`);
}, [keyword]);
```

当 `keyword` 不变时，`fetchUsers` 会复用上一次的函数引用。

当 `keyword` 变化时，React 才会创建一个新的 `fetchUsers`。

---

## 2. 为什么不用 useCallback 会出问题

在 React 中，组件每次 render，组件内部定义的函数都会重新创建。

比如：

```tsx
const fetchUsers = () => {
  // ...
};
```

在每次 render 时，它都会变成一个“新函数对象”。

即使函数逻辑完全一样，它也不是同一个引用：

```ts
prevFetchUsers !== nextFetchUsers;
```

这就是很多 `useEffect` 乱触发、`React.memo` 失效、事件监听重复注册的根源。

---

## 3. 一个直观例子：搜索用户 + 切主题

场景如下：

- 输入框控制 `keyword`。
- 按钮切换 `dark`。
- `UserList` 在 `keyword` 变化时请求数据。
- 切主题不应该触发重新请求，因为搜索词没变。

### 不用 useCallback：切主题也会重新请求

```tsx
function App() {
  const [keyword, setKeyword] = useState('');
  const [dark, setDark] = useState(false);

  const fetchUsers = () => {
    console.log('requesting users...');
    return fetch(`/api/users?keyword=${keyword}`);
  };

  return (
    <>
      <input
        value={keyword}
        onChange={event => setKeyword(event.target.value)}
      />
      <button onClick={() => setDark(value => !value)}>
        toggle theme
      </button>
      <UserList fetchUsers={fetchUsers} dark={dark} />
    </>
  );
}

function UserList({
  fetchUsers,
  dark,
}: {
  fetchUsers: () => Promise<Response>;
  dark: boolean;
}) {
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return <div>{dark ? 'dark' : 'light'}</div>;
}
```

发生了什么？

1. 你点击 `toggle theme`。
2. `dark` 变了，`App` 重新 render。
3. render 时 `fetchUsers` 被重新创建，引用变了。
4. `UserList` 依赖 `[fetchUsers]` 发生变化。
5. `useEffect` 触发，因此又请求了一次。

你会看到控制台再次打印：

```txt
requesting users...
```

这很不合理，因为 `keyword` 并没有变。

### 用 useCallback：切主题不会请求

```tsx
function App() {
  const [keyword, setKeyword] = useState('');
  const [dark, setDark] = useState(false);

  const fetchUsers = useCallback(() => {
    console.log('requesting users...');
    return fetch(`/api/users?keyword=${keyword}`);
  }, [keyword]);

  return (
    <>
      <input
        value={keyword}
        onChange={event => setKeyword(event.target.value)}
      />
      <button onClick={() => setDark(value => !value)}>
        toggle theme
      </button>
      <UserList fetchUsers={fetchUsers} dark={dark} />
    </>
  );
}
```

结果是：

- 切主题：`dark` 变，`App` render，但 `keyword` 没变，`fetchUsers` 引用不变，effect 不触发。
- 改输入：`keyword` 变，`fetchUsers` 引用变化，effect 触发。

直观总结：

> 不用 `useCallback`：每次 render 都给子组件一个“新遥控器”，子组件以为你换了遥控器，就重新执行 effect。

> 用 `useCallback`：只要 deps 没变，你就一直用同一个遥控器，子组件不会误触发。

---

## 4. 为什么会导致 useEffect 乱触发

比如你在组件里写了一个 `getItems`：

```tsx
function getItems() {
  return [number, number + 1, number + 2];
}
```

然后在 effect 里依赖它：

```tsx
useEffect(() => {
  setItems(getItems());
  console.log('updating items');
}, [getItems]);
```

当你点击 `toggle theme` 的时候，`dark` 变了，组件重新 render，`getItems` 也被重新创建。

即使 `number` 没变，`getItems` 的引用也变了。

因为 `useEffect` 的依赖比较的是引用：

```tsx
useEffect(() => {
  setItems(getItems());
}, [getItems]);
```

它关心的是：`getItems` 还是不是之前那个函数对象。

如果父组件每次 render 都创建一个新的 `getItems`，那么它每次都“变了”。

---

## 5. useCallback 如何修复

```tsx
const getItems = useCallback(() => {
  return [number, number + 1, number + 2];
}, [number]);
```

现在只有当 `number` 变化时，`getItems` 才会生成新的引用。

切主题、切语言、打开弹窗这些 UI 状态变化，都不会影响它。

这样 effect 就只会在真正需要的时候触发。

---

## 6. useCallback vs useMemo：到底差在哪

下面两句基本等价：

```tsx
const fn = useCallback(() => doSomething(x), [x]);

const fn2 = useMemo(() => () => doSomething(x), [x]);
```

所以可以这样理解：

> `useCallback` 是 `useMemo` 的函数专用写法。

区别是：

- `useMemo`：缓存一个值或计算结果。
- `useCallback`：缓存一个函数引用。

`useCallback(fn, deps)` 可以理解成：

```tsx
useMemo(() => fn, deps);
```

---

## 7. 实战场景

### 例 1：请求函数作为依赖

比如切主题不应该重拉数据。

```tsx
const fetchBalance = useCallback(async () => {
  return publicClient.readContract({
    // ...
  });
}, [publicClient, address, token]);

useEffect(() => {
  fetchBalance();
}, [fetchBalance]);
```

没有 `useCallback` 时，每次 render 都会产生新函数，effect 容易乱触发。

有 `useCallback` 后，只有 `publicClient`、`address` 或 `token` 变化时才重跑。

如果 effect 只在当前组件里使用这个函数，也可以直接把逻辑写进 effect，并依赖基础值：

```tsx
useEffect(() => {
  publicClient.readContract({
    // ...
  });
}, [publicClient, address, token]);
```

这通常比为了依赖一个函数而额外创建函数更直接。

---

### 例 2：把 handler 传给 React.memo 子组件

```tsx
const sendTx = useCallback(async () => {
  // sign + send
}, [address, chainId, amount]);

return <TxButton onSend={sendTx} />;
```

如果 `TxButton` 使用了 `React.memo`，但父组件每次 render 都传一个新的函数引用，那么 memo 也会失效，子组件仍然会重渲染。

`useCallback` 可以让 `onSend` 在依赖不变时保持稳定。

---

### 例 3：订阅 / 事件监听回调

```tsx
const onLogs = useCallback((logs) => {
  // update UI
}, [dispatch]);

useEffect(() => {
  const unwatch = watchContractEvent({ onLogs });
  return () => unwatch();
}, [onLogs]);
```

如果 `onLogs` 不稳定，每次 render 都会导致：

```txt
cleanup old listener
  -> register new listener
```

这会浪费性能，严重时还可能丢事件。

`useCallback` 可以保证监听回调只在依赖变化时更新。

---

### 例 4：避免闭包拿到旧 state

很多时候，比 `useCallback` 更重要的是函数式更新。

推荐写法：

```tsx
const addTx = useCallback((newTx) => {
  setTxs(prev => [...prev, newTx]);
}, []);
```

这种写法不会依赖外层 `txs`，因此不容易拿到旧值。

不稳定写法：

```tsx
setTxs([...txs, newTx]);
```

如果回调在异步场景或事件监听里执行，就可能拿到旧的 `txs`。

---

## 8. 什么时候应该用 useCallback

典型需要 `useCallback` 的场景：

- 你把函数放进 `useEffect` / `useMemo` / `useCallback` 的 deps。
- 你把函数传给 `React.memo` 子组件，希望避免子组件无意义重渲。
- 你用它作为订阅或事件监听回调，避免重复注册。
- 你把它传进第三方 hooks / SDK，并且对方依赖引用稳定。

一句话：

> 只有“引用稳定”真的会影响行为或性能时，再用 `useCallback`。

---

## 9. 什么时候不要用 useCallback

`useCallback` 不是默认必用。

不需要用的场景：

- 函数只在当前组件内部用，不进 deps，也不传给子组件。
- 没有性能问题，也没有乱触发行为。
- 只是为了“看起来专业”到处包 `useCallback`。

过度使用 `useCallback` 会增加心智负担：

- 你要维护 deps。
- deps 写错会产生闭包问题。
- 代码会变得更绕。
- React 也要维护缓存和比较依赖。

所以不要默认给所有函数加 `useCallback`。

---

## 10. 一个更完整的示例

下面用 `getItems` 演示主题切换和依赖稳定。

```tsx
import { useCallback, useEffect, useState } from 'react';

function List({ getItems }: { getItems: () => number[] }) {
  const [items, setItems] = useState<number[]>([]);

  useEffect(() => {
    setItems(getItems());
    console.log('updating items');
  }, [getItems]);

  return (
    <ul>
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function App() {
  const [number, setNumber] = useState(1);
  const [dark, setDark] = useState(false);

  const getItems = useCallback(() => {
    return [number, number + 1, number + 2];
  }, [number]);

  return (
    <div
      style={{
        background: dark ? '#111' : '#fff',
        color: dark ? '#fff' : '#111',
      }}
    >
      <input
        type="number"
        value={number}
        onChange={event => setNumber(Number(event.target.value))}
      />

      <button onClick={() => setDark(value => !value)}>
        toggle theme
      </button>

      <List getItems={getItems} />
    </div>
  );
}
```

这个例子里：

- 改 `number`：`getItems` 变化，`List` 重新计算。
- 切 `dark`：`getItems` 不变，`List` 的 effect 不会误触发。

---

## 11. 总结

`useCallback` 的核心作用不是“加速函数执行”，而是让函数引用稳定。

最核心的规则是：

```txt
deps 不变，复用同一个函数引用
deps 变化，创建新的函数引用
```

更通俗地说：

> `useCallback` 像一个教官：只有依赖变了，才允许换一套新动作；否则一直用同一套动作。

示例：

```tsx
const fetchUsers = useCallback(() => {
  return fetch(`/api/users?keyword=${keyword}`);
}, [keyword]);
```

这里 `keyword` 就是教官盯着的依赖。

当 `keyword` 不变时，`fetchUsers` 引用不变。

当 `keyword` 变了，`fetchUsers` 才变。

如果一个函数不会进入 deps、不会传给 memo 子组件、不会作为订阅回调，也没有引用稳定需求，就不需要 `useCallback`。它应该用在确实需要稳定函数引用的地方，而不是作为每个函数的默认包装。
