# React useRef 的理解与应用：跨渲染持久存在的值容器

`useRef` 可以理解成一个“跨渲染持久存在的盒子”。这个盒子里放的值在 `ref.current` 上，修改它不会触发组件重新渲染。

它和 `useState` 的核心区别可以用一句话概括：

- `useState`：值变了，触发 re-render，UI 更新。
- `useRef`：值变了，不触发 re-render，UI 不会自动更新。

所以 `useRef` 最适合保存那些“不影响 UI，但需要跨渲染记住”的值，比如 DOM 节点、计时器 ID、WebSocket 实例、上一次的值、请求序号、SDK 实例、缓存 Map 等。

---

## 1. useRef 返回什么

```tsx
const ref = useRef(0);
```

`ref` 是一个对象：

```ts
{
  current: 0;
}
```

`current` 才是你真正存的值。

后续你可以这样改：

```tsx
ref.current = ref.current + 1;
```

但要注意：修改 `ref.current` 不会触发组件重新渲染。

---

## 2. useRef 最常见的三大用法

### A. 拿到 DOM 节点做命令式操作

适用于输入框聚焦、滚动到某个位置、读取元素尺寸等。

```tsx
import { useRef } from 'react';

export function FocusInput() {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current?.focus()}>
        Focus
      </button>
    </>
  );
}
```

这类操作必须命令式，`useRef` 很合适。

但不要用 ref 去“改 UI 数据”，比如直接改 `input.value` 来代替 state。那会把 React 的数据流搞乱。

错误示例：

```tsx
inputRef.current!.value = 'xxx';
```

正确方式是使用受控组件：

```tsx
const [name, setName] = useState('');

return (
  <input
    value={name}
    onChange={event => setName(event.target.value)}
  />
);
```

### B. 存不会影响 UI、但要跨渲染记住的东西

典型场景包括：

- render 次数。
- 计时器 ID。
- WebSocket 实例。
- SSE 实例。
- AbortController。
- Map 缓存。
- 第三方 SDK 实例。

比如记录组件渲染次数：

```tsx
const renderCount = useRef(0);
renderCount.current++;

console.log('render', renderCount.current);
```

每次 render 时 `renderCount.current` 都会增加，但不会因为它的变化导致额外 render。

再比如保存轮询 timer，组件卸载时清理：

```tsx
const timerRef = useRef<number | null>(null);

useEffect(() => {
  timerRef.current = window.setInterval(() => {
    // poll something
  }, 5000);

  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };
}, []);
```

### C. 存上一次的值

例如地址变化时，你想知道上一次 `address` 是什么，用于埋点、对比或动画。

```tsx
const prevAddressRef = useRef<string | null>(null);

useEffect(() => {
  prevAddressRef.current = address;
}, [address]);

const prevAddress = prevAddressRef.current;
```

这里 `prevAddressRef.current` 会跨渲染保留，不会因为组件重新渲染而丢失。

---

## 3. Web3 / 远程开发场景里的常见 useRef 用法

### 例子 1：避免并发请求乱序覆盖

问题是：你发起两次请求，第二次先返回，第一次后返回，结果第一次把新数据覆盖掉。

```tsx
const reqIdRef = useRef(0);

useEffect(() => {
  const id = ++reqIdRef.current;

  (async () => {
    const data = await fetchBalance(address);
    if (id !== reqIdRef.current) return;
    setBalance(data);
  })();
}, [address]);
```

这在地址快速切换、链快速切换、搜索输入等场景里非常实用。

核心逻辑是：

```txt
每次请求开始时给自己一个 id
  -> 请求回来后检查自己是不是最新 id
  -> 不是最新请求就丢弃结果
```

这样可以避免旧请求覆盖新状态。

### 例子 2：保存最新 state 给回调用，避免闭包拿旧值

比如你有一个 WebSocket 的 `onMessage` 回调，回调里拿到的 state 常常是旧的。

```tsx
const balanceRef = useRef(balance);

useEffect(() => {
  balanceRef.current = balance;
}, [balance]);

useEffect(() => {
  socket.onmessage = () => {
    console.log('latest balance', balanceRef.current);
  };
}, []);
```

这里 `balanceRef.current` 永远指向最新值，而 `onmessage` 不需要因为 `balance` 变化而反复重新注册。

### 例子 3：保存 provider / contract / client 实例

有些 SDK 初始化很贵，且你不希望因为组件渲染导致重复创建。

```tsx
const clientRef = useRef<SomeClient | null>(null);

useEffect(() => {
  clientRef.current = new SomeClient({ chainId });

  return () => {
    clientRef.current?.destroy();
    clientRef.current = null;
  };
}, [chainId]);
```

这里的逻辑是：

- `chainId` 不变时，实例跨渲染保留。
- `chainId` 变化时，重新创建实例。
- 组件卸载或依赖变化时，清理旧实例。

### 例子 4：保存 WebSocket / SSE 实例

目标是：组件渲染很多次，但 socket 只创建一次，并且卸载时关闭。

```tsx
function PriceStream() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('wss://example.com/prices');
    wsRef.current = ws;

    ws.onmessage = event => {
      const msg = JSON.parse(event.data);
      // 这里更新 UI 才用 setState
      // setPrice(msg.price);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, []);

  const sendPing = () => {
    wsRef.current?.send(JSON.stringify({ type: 'ping' }));
  };

  return <button onClick={sendPing}>Ping</button>;
}
```

为什么用 ref？

- `ws` 需要跨渲染存在。
- `ws` 不用于 UI 渲染。
- 不需要把 `ws` 放进 state，因为放进 state 会触发渲染，而且也没有序列化意义。

### 例子 5：保存 Ethers / Viem 的 client / provider / walletClient 实例

目标是：`chainId` 或 `rpcUrl` 变化时重建，其余渲染不重建。

```tsx
function usePublicClient(chainId: number) {
  const clientRef = useRef<any>(null);

  useEffect(() => {
    clientRef.current = createPublicClient({
      chain: getChain(chainId),
      transport: http(getRpcUrl(chainId)),
    });

    return () => {
      clientRef.current = null;
    };
  }, [chainId]);

  return clientRef;
}
```

使用：

```tsx
const clientRef = usePublicClient(chainId);

async function loadBalance(address: `0x${string}`) {
  const client = clientRef.current;
  if (!client) return;

  const balance = await client.getBalance({ address });
}
```

为什么用 ref？

- `client/provider` 属于基础设施实例，不用于 UI 渲染。
- 你只需要随时能拿到它。
- 需要保证它不是每次 render 都 new 一遍。

### 例子 6：保存 ethers.Contract 实例

很多人会写成：

```tsx
const contract = new ethers.Contract(addr, abi, signer);
```

这会导致每次 render 都 new 一个合约实例。

更合理的写法是：

```tsx
function useContract(address: string, abi: any, signer: any) {
  const contractRef = useRef<any>(null);

  useEffect(() => {
    if (!address || !signer) {
      contractRef.current = null;
      return;
    }

    contractRef.current = new ethers.Contract(address, abi, signer);

    return () => {
      contractRef.current = null;
    };
  }, [address, abi, signer]);

  return contractRef;
}
```

好处是：

- 合约实例不会因为组件重渲染重复创建。
- 依赖变化，比如换地址、换 signer 时才重建。

这里也可以用 `useMemo`，但 `useRef` 更像“实例容器”，更适合需要命令式访问和生命周期清理的对象。

### 例子 7：保存缓存 Map

比如余额缓存、请求缓存。

目标是：缓存更新不需要触发 UI 更新，只是让后续读取更快。

```tsx
function useBalanceCache() {
  const cacheRef = useRef<Map<string, bigint>>(new Map());

  const getCached = (key: string) => cacheRef.current.get(key);

  const setCached = (key: string, value: bigint) => {
    cacheRef.current.set(key, value);
  };

  return { getCached, setCached };
}
```

调用：

```tsx
const { getCached, setCached } = useBalanceCache();

async function fetchBalance(address: string, chainId: number) {
  const key = `${chainId}:${address}`;
  const cached = getCached(key);

  if (cached !== undefined) {
    return cached;
  }

  const value = await rpcGetBalance(address);
  setCached(key, value);
  return value;
}
```

为什么用 ref？

- `Map` 更新很频繁，没必要每次 `set` 都让 UI 重新渲染。
- UI 只在真正需要展示新值时 `setState`。

---

## 4. useRef 为什么容易被误用

`useRef` 很容易被误用，因为它太自由了，很多人会用它绕过 React 的数据流。

### 错误：用 ref 当 state 用

```tsx
inputRef.current!.value = 'xxx';
```

这样 UI 看似变了，但 React state 没变。后续 React 重新渲染时，DOM 状态和组件状态可能不一致。

### 正确：要更新 UI 就用 state

```tsx
const [name, setName] = useState('');

return (
  <input
    value={name}
    onChange={event => setName(event.target.value)}
  />
);
```

### 正确：ref 只做命令式操作

```tsx
inputRef.current?.focus();
```

比如 focus、scroll、measure 这类必须访问 DOM 实例的操作，适合用 ref。

---

## 5. useRef 和 useState 怎么选

可以用下面这组判断：

```txt
要更新 UI
  -> 用 useState

不想触发渲染，但要跨渲染记住值
  -> 用 useRef

要操作 DOM，比如 focus / scroll / measure
  -> 用 useRef
```

再具体一点：

| 场景 | 推荐 |
| --- | --- |
| 输入框内容要展示到 UI | `useState` |
| 点击按钮后页面要更新 | `useState` |
| 保存 timer id | `useRef` |
| 保存 WebSocket 实例 | `useRef` |
| 保存上一次的 props/state | `useRef` |
| 保存请求序号，防止乱序覆盖 | `useRef` |
| 操作 DOM 聚焦、滚动、测量 | `useRef` |
| 保存缓存 Map，不想每次 set 都渲染 | `useRef` |

---

## 6. 总结

`useRef` 的核心不是“拿 DOM”，而是“保存一个跨渲染持久存在、但修改时不触发渲染的值”。

它最常见的用途是：

- 拿 DOM 节点，做 focus、scroll、measure。
- 保存不会影响 UI 的可变值，比如 timer、WebSocket、AbortController、Map 缓存。
- 保存上一次的值，比如上一次地址、上一次价格、上一次状态。
- 保存基础设施实例，比如 provider、client、contract、SDK 实例。
- 避免异步请求乱序覆盖。
- 给事件回调读取最新 state，避免闭包拿旧值。

最重要的边界是：

> 要更新 UI，用 `useState`。不想触发渲染但要记住值，用 `useRef`。

只要抓住这个边界，`useRef` 就不会变成绕过 React 数据流的工具，而会成为处理 DOM、实例、缓存、异步生命周期时非常实用的基础 Hook。
