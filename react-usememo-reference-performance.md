# React useMemo 怎么理解：缓存计算结果和稳定引用的工程化场景

`useMemo` 可以先简单理解成一句话：

> 缓存一个计算结果，或者缓存一个引用，只有依赖变了才重新算。

它解决两类最常见问题：

- 性能问题：避免每次渲染都重复执行很慢的计算。
- 引用变化问题：避免对象、数组每次渲染都变成新引用，导致 `useEffect`、子组件或第三方 hook 被重复触发。

---

## 1. useMemo 到底做了什么

先看最基本的写法：

```tsx
const value = useMemo(() => computeExpensive(x), [x]);
```

React 会先算一次 `computeExpensive(x)`，然后把结果记住。

之后组件每次重新渲染时：

- 如果 `x` 没变：直接用旧结果，不重新算。
- 如果 `x` 变了：重新算一次，并更新缓存。

一句话：

> 依赖不变，复用旧结果；依赖变化，重新计算。

---

## 2. 用途 A：优化很慢的计算

```tsx
const doubled = useMemo(() => slowDouble(number), [number]);
```

效果是：

- 改 `number`：需要重新算，这是合理的。
- 切换主题 `dark`：不用重新算，省掉不必要的卡顿。

什么时候值得用？

- 计算真的慢，比如大循环、复杂过滤排序、图表数据处理、加密 / 哈希、复杂格式化。
- 计算量随数据规模变大明显增加，比如 1 万条列表的 `filter + sort`。

如果只是 `a + b`、拼字符串、简单判断，就没有必要为了“看起来优化”而使用 `useMemo`。

---

## 3. 用途 B：解决引用每次变导致 useEffect 乱触发

JavaScript 里对象、数组比较的是引用地址，不是内容。

### 问题例子

```tsx
const themeStyle = { color: dark ? 'white' : 'black' };

useEffect(() => {
  console.log('theme changed');
}, [themeStyle]);
```

每次渲染都会创建一个新对象 `{ ... }`，引用永远不一样，所以 effect 每次都会触发。

### 用 useMemo 修

```tsx
const themeStyle = useMemo(
  () => ({ color: dark ? 'white' : 'black' }),
  [dark]
);
```

这样只有 `dark` 变，`themeStyle` 的引用才变，effect 才会触发。

这里真正要理解的是：`useEffect` 的依赖比较方式。

React 判断依赖变没变，不是看“内容一样不一样”，而是看是不是同一个引用，也就是同一个内存地址。

---

## 4. 没有 useMemo：为什么会乱触发

```tsx
const config = { chainId, address };

useEffect(() => {
  console.log('run');
}, [config]);
```

关键点是：

```tsx
const config = { chainId, address };
```

这一行每次渲染都会创建一个全新的对象。

即使 `chainId` 和 `address` 都没变，`config` 也是“新对象”。

你可以想象成这样：

```txt
第 1 次渲染：config 指向 0xAAA
第 2 次渲染：又 new 了一个对象，config 指向 0xBBB
第 3 次渲染：又 new 了一个对象，config 指向 0xCCC
```

React 看依赖 `[config]`：

```txt
引用从 0xAAA 变成 0xBBB
  -> 依赖变了
  -> effect 执行
```

所以你会看到：只要组件重新渲染一次，哪怕是因为主题、输入框、弹窗或别的 state，effect 也会跑一次。

---

## 5. 有 useMemo：为什么就不乱触发

```tsx
const config = useMemo(() => ({ chainId, address }), [chainId, address]);

useEffect(() => {
  console.log('run only when chainId/address changes');
}, [config]);
```

`useMemo` 做的事是：缓存上一次创建的对象。

- 如果 `chainId/address` 没变：`useMemo` 直接把上一次那个对象返回给你，引用不变。
- 如果 `chainId/address` 变了：`useMemo` 才会创建新对象，引用改变。

于是变成：

```txt
第 1 次渲染：config 指向 0xAAA
第 2 次渲染：theme 变了，但 chainId/address 没变，useMemo 返回旧的 0xAAA
第 3 次渲染：别的 state 变了，还是 0xAAA
直到某次 chainId/address 变了：才生成 0xBBB
```

React 看依赖 `[config]`：

```txt
引用没变
  -> 依赖没变
  -> effect 不执行
```

---

## 6. 一句话总结差别

没有 `useMemo`：

```txt
每次渲染都 new 一个 config
  -> useEffect 觉得依赖变了
  -> 每次都跑
```

有 `useMemo`：

```txt
只有 chainId/address 变时才 new config
  -> useEffect 只在真正变化时跑
```

---

## 7. 那为什么不直接写 [chainId, address]

很多时候，最简单的写法就是这样：

```tsx
useEffect(() => {
  console.log('run only when chainId/address changes');
}, [chainId, address]);
```

这个问题问得很对。能直接依赖基础值时，就不要绕一层对象。

那为什么还要 `config + useMemo`？

常见原因有几个：

- 下游需要一个 `config` 对象传给别的 hook 或子组件，比如 wagmi / viem。
- 依赖项很多，希望统一打包成一个对象，方便维护。
- 子组件用了 `React.memo`，需要保证 props 引用稳定。
- 第三方 SDK 或图表库依赖 options/config 引用变化来判断是否重建实例。

---

## 8. 一个直观类比

没有 `useMemo`：

> 每次渲染都重新打印一张身份证，身份证编号当然变。系统认为换人了，于是 effect 触发。

有 `useMemo`：

> 只要信息没变，就一直用同一张身份证。系统认为还是同一个人，于是 effect 不触发。

---

## 9. useMemo vs useCallback：别混

`useMemo` 缓存的是值：

```tsx
const value = useMemo(() => computeValue(a, b), [a, b]);
```

`useCallback` 缓存的是函数：

```tsx
const handleClick = useCallback(() => {
  submit(id);
}, [id]);
```

其实你可以这样理解：

```tsx
useCallback(fn, deps) === useMemo(() => fn, deps);
```

一个缓存结果，一个缓存函数引用。

---

## 10. 实战场景

下面介绍 6 个真实项目里最常见，而且“用不用 `useMemo` 差别明显”的例子。

---

### 例子 1：对象作为 useEffect 依赖导致重复请求

比如拉余额、交易记录、用户资产。

不用 `useMemo`：

```tsx
const params = { address, chainId };

useEffect(() => {
  fetchBalance(params);
}, [params]);
```

只要组件因为别的 state 改了，比如主题、输入框、弹窗，`params` 就是新对象，effect 又跑，又请求。

用 `useMemo`：

```tsx
const params = useMemo(() => ({ address, chainId }), [address, chainId]);

useEffect(() => {
  fetchBalance(params);
}, [params]);
```

这样只有 `address` 或 `chainId` 变化时才请求。

不过如果 effect 里不需要对象，直接写下面这样更简单：

```tsx
useEffect(() => {
  fetchBalance({ address, chainId });
}, [address, chainId]);
```

---

### 例子 2：给 wagmi / viem 传 config，避免重复执行或重复订阅

很多 Web3 hook 内部会看 config 是否变化来重建 watcher。

不用 `useMemo`：

```tsx
const config = {
  address,
  abi,
  functionName: 'balanceOf',
  args: [user],
};

useReadContract(config);
```

每次 render 都会创建新 config，内部可能反复重建 watcher 或重跑逻辑。

用 `useMemo`：

```tsx
const config = useMemo(
  () => ({
    address,
    abi,
    functionName: 'balanceOf',
    args: [user],
  }),
  [address, abi, user]
);

useReadContract(config);
```

这样 config 引用稳定，只有关键参数变化时才重建。

如果 `args` 本身也被其他地方单独依赖，也可以单独 memo：

```tsx
const args = useMemo(() => [user], [user]);
```

---

### 例子 3：大列表过滤 / 排序导致 UI 卡顿

比如交易列表、NFT 列表、日志列表。

不用 `useMemo`：

```tsx
const visibleTxs = txs
  .filter(tx => tx.chainId === chainId)
  .sort((a, b) => b.time - a.time);
```

你一切换 theme、打开弹窗、输入搜索框，都会重新跑这套逻辑。数据量大时会明显卡顿。

用 `useMemo`：

```tsx
const visibleTxs = useMemo(() => {
  return txs
    .filter(tx => tx.chainId === chainId)
    .sort((a, b) => b.time - a.time);
}, [txs, chainId]);
```

这样只有 `txs` 或 `chainId` 变时才重算。

如果不想改变原数组顺序，更稳一点可以先复制：

```tsx
const visibleTxs = useMemo(() => {
  return txs
    .filter(tx => tx.chainId === chainId)
    .toSorted((a, b) => b.time - a.time);
}, [txs, chainId]);
```

---

### 例子 4：派生数据传给 React.memo 子组件

不用 `useMemo`：

```tsx
const columns = [
  { key: 'hash', title: 'Hash' },
  { key: 'status', title: 'Status' },
];

return <Table columns={columns} />;
```

即使 `Table` 用了 `React.memo`，也会因为 `columns` 每次都是新数组而重渲染。

用 `useMemo`：

```tsx
const columns = useMemo(
  () => [
    { key: 'hash', title: 'Hash' },
    { key: 'status', title: 'Status' },
  ],
  []
);

return <Table columns={columns} />;
```

这样 `columns` 引用稳定，`Table` 不会因为无关渲染而重复渲染。

---

### 例子 5：options 对象导致图表 / 编辑器 / SDK 重复初始化

比如初始化 chart、播放器、WebSocket SDK、编辑器实例。

不用 `useMemo`：

```tsx
const options = {
  theme: dark ? 'dark' : 'light',
  locale,
};

useEffect(() => {
  const chart = createChart(options);
  return () => chart.destroy();
}, [options]);
```

每次 render 都会生成新 `options`，effect 每次都会 cleanup + init。

用 `useMemo`：

```tsx
const options = useMemo(
  () => ({
    theme: dark ? 'dark' : 'light',
    locale,
  }),
  [dark, locale]
);

useEffect(() => {
  const chart = createChart(options);
  return () => chart.destroy();
}, [options]);
```

这样只有 `dark` 或 `locale` 真变时才重建 chart。

---

### 例子 6：数组 args 不稳定导致 effect / hook 频繁触发

不用 `useMemo`：

```tsx
const args = [spender, amount];

useEffect(() => {
  prepareTx(args);
}, [args]);
```

`args` 每次 render 都是新数组，effect 会频繁触发。

用 `useMemo`：

```tsx
const args = useMemo(() => [spender, amount], [spender, amount]);

useEffect(() => {
  prepareTx(args);
}, [args]);
```

这样只有 `spender` 或 `amount` 变化时，`args` 才变。

当然，如果只是当前 effect 自己使用，也可以直接写：

```tsx
useEffect(() => {
  prepareTx([spender, amount]);
}, [spender, amount]);
```

---

## 11. 怎么判断到底要不要用 useMemo

最值得用的场景主要有两类。

第一类：你把对象或数组放进依赖数组。

比如：

```tsx
useEffect(() => {
  doSomething(config);
}, [config]);
```

如果 `config` 是每次 render 新建的对象，就要考虑：

- 能不能直接依赖基础值？
- 如果必须传对象，是否需要 `useMemo` 稳定引用？

第二类：你做了重计算。

比如：

- 大数据量 `filter / sort / map`。
- 图表数据转换。
- 复杂聚合统计。
- 加密、哈希、复杂格式化。

这些计算如果会被无关 state 触发，就可以用 `useMemo`。

不适合用的场景：

- 简单计算，比如 `a + b`。
- 简单字符串拼接。
- 没有性能问题，也没有引用稳定需求。
- 依赖项写不清楚，反而让代码更难 debug。

---

## 12. 什么时候别用 useMemo

`useMemo` 不是越多越好，它本身也有开销：React 要维护缓存，还要比较 deps。

别用在这些地方：

- 计算很轻，比如 `a + b`。
- 简单 map，而且数据量很小。
- 你根本没遇到性能问题或重复触发问题。
- deps 很难写对，容易制造闭包和缓存错误。

更实用的判断方式是：

> 先写清楚，再看是否有慢计算或引用稳定需求。没有问题就别加，有问题再加。

---

## 13. 总结

`useMemo` 的本质是缓存一个值。

这个值可能是：

- 慢计算的结果。
- 一个需要稳定引用的对象。
- 一个需要稳定引用的数组。
- 一个传给 memo 子组件或第三方 hook 的配置。

最核心的规则是：

```txt
依赖不变，复用旧值
依赖变化，重新计算
```

使用 `useMemo` 时，要明确自己到底在解决什么问题：

- 是为了避免慢计算重复执行？
- 还是为了让对象 / 数组引用稳定，避免 effect、子组件或第三方 hook 乱触发？

如果两者都不是，就不用加。`useMemo` 不是装饰品，它应该出现在确实需要缓存结果或稳定引用的地方。
