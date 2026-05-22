# React localStorage 不只是 setItem：用 useSyncExternalStore 做一个可订阅的本地状态 Hook

在很多 React 项目里，`localStorage` 经常被当成一个很简单的工具：读的时候 `localStorage.getItem()`，写的时候 `localStorage.setItem()`。

这种写法在 demo 里没问题，但放到真实项目里，很快会遇到状态不同步、组件无法自动更新、SSR 报错、类型不安全、异常没有兜底等问题。

尤其是登录态、主题配置、用户偏好、表格筛选条件、弹窗引导状态这类数据，它们既需要持久化，又需要被多个组件共享。

如果每个组件都自己读写 `localStorage`，项目后期会非常难维护。

本文就围绕一个真实项目里的 `useLocalStorage` Hook 展开，讲清楚如何把 `localStorage` 封装成 React 可订阅的外部状态源，并且处理同页面同步、初始化、错误捕获和生命周期边界。

---

## 1. localStorage 状态同步解决什么问题

`localStorage` 本质上是浏览器提供的持久化存储，不属于 React 状态系统。

这意味着它有几个特点：

- 它可以跨刷新保留数据，但 React 不知道它什么时候变化。
- 它可以跨多个页面标签共享数据，但同一个页面内调用 `setItem`，并不会天然驱动当前 React 组件重新渲染。
- 它只能存字符串，复杂对象需要序列化和反序列化。
- 它只存在于浏览器环境，服务端渲染阶段不能直接访问。

所以在 React 项目里，直接使用 `localStorage` 往往不够。我们真正需要的是一个“React 风格”的封装：

```ts
const [theme, setTheme] = useLocalStorage('theme', 'dark');
```

组件看起来像在用 `useState`，但数据实际持久化在 `localStorage`。多个组件使用同一个 key 时，一个地方更新，其他地方也能跟着更新。

这种封装适合这些场景：

- 登录后的轻量用户偏好，例如主题、语言、布局模式。
- 后台管理系统里的筛选条件、分页大小、表格列显示状态。
- 产品里的引导状态，例如某个提示是否已经看过。
- Web3 或交易类项目里的默认链、默认钱包、最近选择的 token。

不适合的场景也要明确：不要用它存高频变化的大型服务端数据，不要把订单列表、用户列表、行情流这种数据塞进 `localStorage`，更不要把它当数据库用。

---

## 2. 最简单的写法是什么

很多项目一开始会这样写：

```tsx
import { useEffect, useState } from 'react';

export function ThemeSwitcher() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const value = localStorage.getItem('theme');

    if (value) {
      setTheme(value);
    }
  }, []);

  const changeTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';

    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  return <button onClick={changeTheme}>current theme: {theme}</button>;
}
```

这段代码能跑。刷新页面后也能恢复状态。

但它的问题是：这个组件只管自己。如果另一个组件也依赖 `theme`，它不会自动知道 `localStorage` 已经被改了。

比如：

```tsx
export function HeaderThemeLabel() {
  const theme = localStorage.getItem('theme');

  return <span>{theme}</span>;
}
```

这个组件不会因为 `ThemeSwitcher` 写入 `localStorage` 自动更新。除非你再引入全局状态，或者手动传 props。

也就是说，简单写法只是“持久化”了数据，并没有把 `localStorage` 变成 React 可订阅的状态源。

---

## 3. 简单写法在真实项目中的问题

真实项目里，`localStorage` 的问题通常不是“怎么读写”，而是“怎么和 React 状态流对齐”。

第一，状态不同步。组件 A 写入 `localStorage`，组件 B 不一定重新渲染。结果就是页面上不同区域展示不同状态。

第二，逻辑散落。每个组件都写一遍 `getItem`、`setItem`、`JSON.parse`、`JSON.stringify`，后续改 key、改数据结构、加异常处理都会很麻烦。

第三，SSR 容易踩坑。Next.js 项目里，如果在服务端阶段直接访问 `window.localStorage`，会出现 `window is not defined`。

第四，类型不可靠。TypeScript 泛型只能约束你在代码里传入的类型，但 `localStorage` 里真实存的字符串可能来自旧版本、手动修改、其他脚本写入。没有校验时，读出来的数据不一定符合预期。

第五，异常没有兜底。隐私模式、存储容量超限、JSON 解析失败等情况都可能导致异常。如果不统一捕获，用户操作可能直接中断。

第六，原生 `storage` 事件有边界。浏览器的 `storage` 事件主要用于跨 tab 通知。同一个页面内主动 `setItem`，当前页面的监听器不一定会收到事件。所以如果要做“同页面多组件同步”，需要手动派发事件。

这些问题叠在一起，就说明我们需要一个专门的 Hook，而不是让业务组件直接操作 `localStorage`。

---

## 4. 推荐的项目落地结构

这个主题不需要设计很大的目录。重点是把“存储工具”“遥测日志”“业务 Hook”分开。

推荐结构如下：

```txt
src/
  config/
    localStorage.ts
  lib/
    helper/
      localStorage.ts
      telemetry.ts
  hooks/
    useLocalStorage.ts
```

`config/localStorage.ts` 负责统一维护允许使用的 `localStorage` key。这样项目里不会到处出现散落的字符串 key。

`lib/helper/localStorage.ts` 负责底层读写、序列化和反序列化。它不关心 React，只是普通工具函数。

`lib/helper/telemetry.ts` 负责统一错误日志。比如写入失败、解析失败时，不应该每个 Hook 自己决定怎么上报。

`hooks/useLocalStorage.ts` 是 React 层封装。它负责把 `localStorage` 接入 React 生命周期，让组件可以订阅、读取和更新。

这个结构的重点不是“目录看起来整齐”，而是边界清楚：工具函数不依赖 React，Hook 不重复实现序列化，组件不直接碰浏览器存储细节。

---

## 5. 推荐写法一：先封装 localStorage key 和基础读写

先定义业务允许使用的 key。

```ts
// src/config/localStorage.ts
export const LocalStorageKeys = {
  theme: 'app:theme',
  accessToken: 'app:access-token',
  userPreference: 'app:user-preference',
} as const;

export type LocalStorageKey =
  (typeof LocalStorageKeys)[keyof typeof LocalStorageKeys];
```

这里不推荐在业务组件里直接写 `'theme'`、`'token'` 这种字符串。真实项目里 key 一旦散落，很容易出现拼写错误，也很难做统一迁移。

然后封装底层读写：

```ts
// src/lib/helper/localStorage.ts
import type { LocalStorageKey } from '@/config/localStorage';

type GetLocalStorageOptions<Value> = {
  key: LocalStorageKey;
  defaultValue?: Value;
};

type SetLocalStorageOptions<Value> = {
  key: LocalStorageKey;
  value: Value;
};

export function getLocalStorage<Value>({
  key,
  defaultValue,
}: GetLocalStorageOptions<Value>): Value | undefined {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  const rawValue = window.localStorage.getItem(key);

  if (rawValue === null) {
    return defaultValue;
  }

  try {
    return JSON.parse(rawValue) as Value;
  } catch {
    return defaultValue;
  }
}

export function setLocalStorage<Value>({
  key,
  value,
}: SetLocalStorageOptions<Value>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}
```

这一层只做纯工具封装，不写 React Hook，也不写组件逻辑。它的职责是把字符串存储转换成业务值。

注意，这里只是基础版本。严格项目里还可以加 schema 校验，比如用 Zod 校验读取结果是否符合预期。

---

## 6. 推荐写法二：用 useSyncExternalStore 接入 React

React 18 提供了 `useSyncExternalStore`，专门用于订阅 React 外部的状态源，比如 Redux store、浏览器存储、媒体查询、SSE store 等。

它的核心思想是：React 不管理这个状态，但 React 可以通过订阅函数知道它什么时候变化，并通过快照函数读取最新值。

我们来看完整 Hook：

```ts
// src/hooks/useLocalStorage.ts
'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { LocalStorageKey } from '@/config/localStorage';
import { getLocalStorage, setLocalStorage } from '@/lib/helper/localStorage';
import { log } from '@/lib/helper/telemetry';

type StateUpdater<Value> = (prevState: Value) => Value;

/**
 * 手动派发 storage 事件。
 *
 * 浏览器原生 storage 事件主要用于跨 tab 通知；
 * 当前页面内调用 localStorage.setItem 后，不一定会触发当前页面监听器。
 * 所以这里手动 dispatch，让同页面多个组件也能同步更新。
 */
export function dispatchStorageEvent(key: LocalStorageKey, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

/**
 * 给 useSyncExternalStore 使用的订阅函数。
 *
 * React 会在组件挂载时调用 subscribe 注册监听，
 * 并在组件卸载时调用返回的清理函数。
 */
const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);

  return () => {
    window.removeEventListener('storage', callback);
  };
};

/**
 * 将 localStorage 封装成 React 可订阅状态。
 *
 * 使用方式接近 useState：
 * const [value, setValue] = useLocalStorage(key, initialValue)
 *
 * 但 value 实际来自 localStorage，setValue 会写回 localStorage，
 * 并通知所有订阅 storage 事件的组件重新读取快照。
 */
export function useLocalStorage<Value>(key: LocalStorageKey, initialValue?: Value) {
  const lastValueRef = useRef<Value | undefined>(initialValue);
  const isInitializedRef = useRef(false);

  /**
   * 首次挂载时初始化默认值。
   *
   * 如果 localStorage 里还没有这个 key，并且调用方提供了 initialValue，
   * 就把默认值写入 localStorage，保证后续读取有稳定来源。
   */
  useEffect(() => {
    if (!isInitializedRef.current && initialValue !== undefined) {
      const existingValue = getLocalStorage<Value | undefined>({
        key,
        defaultValue: undefined,
      });

      if (existingValue === undefined) {
        setLocalStorage({ key, value: initialValue });
        dispatchStorageEvent(key, JSON.stringify(initialValue));
      }

      isInitializedRef.current = true;
    }
  }, [key, initialValue]);

  /**
   * 读取当前快照。
   *
   * useSyncExternalStore 会在订阅事件触发后重新调用 getSnapshot。
   * 这里用 lastValueRef 缓存上一次结果，避免无意义的引用变化造成额外渲染。
   */
  const getSnapshot = useCallback(() => {
    const value = getLocalStorage<Value>({
      key,
      defaultValue: initialValue,
    });

    if (JSON.stringify(value) !== JSON.stringify(lastValueRef.current)) {
      lastValueRef.current = value;
    }

    return lastValueRef.current;
  }, [key, initialValue]);

  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialValue as Value
  );

  /**
   * 更新 localStorage 状态。
   *
   * 支持两种写法：
   * setState(nextValue)
   * setState(prev => nextValue)
   *
   * 写入成功后手动派发 storage 事件，让同页面内其他组件也能同步更新。
   */
  const setState = useCallback(
    (valueOrUpdater: Value | StateUpdater<Value>) => {
      try {
        const nextState =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as StateUpdater<Value>)(state)
            : valueOrUpdater;

        setLocalStorage({ key, value: nextState });
        dispatchStorageEvent(key, nextState === null ? null : JSON.stringify(nextState));
      } catch (error) {
        log('useLocalStorage/setState', error, { key });
      }
    },
    [key, state]
  );

  return [state, setState] as const;
}
```

这里有几个关键点。

第一，`subscribe` 负责订阅 `storage` 事件。React 组件不需要关心事件监听和清理。

第二，`getSnapshot` 负责读取当前值。它是 React 从外部状态源拿数据的入口。

第三，`dispatchStorageEvent` 解决同页面多组件同步问题。如果只依赖原生 `storage` 事件，在当前页面内可能不会触发更新。

第四，`setState` 同时支持值更新和函数式更新，让使用体验接近 `useState`。

第五，写入失败时进入 telemetry log，而不是把异常直接暴露给业务组件。

---

## 7. 推荐写法三：组件只消费 Hook，不直接操作 localStorage

封装完成后，组件应该只关心业务状态，不应该直接拼 key、不应该手写 `localStorage.setItem`，也不应该自己监听 `storage`。

例如主题切换组件：

```tsx
'use client';

import { LocalStorageKeys } from '@/config/localStorage';
import { useLocalStorage } from '@/hooks/useLocalStorage';

type Theme = 'light' | 'dark';

export function ThemeSwitcher() {
  const [theme, setTheme] = useLocalStorage<Theme>(LocalStorageKeys.theme, 'dark');

  const handleToggle = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return <button onClick={handleToggle}>当前主题：{theme}</button>;
}
```

另一个组件读取同一个状态：

```tsx
'use client';

import { LocalStorageKeys } from '@/config/localStorage';
import { useLocalStorage } from '@/hooks/useLocalStorage';

type Theme = 'light' | 'dark';

export function HeaderThemeLabel() {
  const [theme] = useLocalStorage<Theme>(LocalStorageKeys.theme, 'dark');

  return <span>Theme: {theme}</span>;
}
```

现在 `ThemeSwitcher` 更新后，`HeaderThemeLabel` 也会重新读取快照并更新。业务组件完全不需要知道底层是 `storage` 事件、`useSyncExternalStore`，还是手动派发事件。

这就是封装的价值：组件消费结果，不承载同步机制。

---

## 8. 错误处理、初始化和生命周期边界

这种 Hook 真正落地时，重点不是代码能不能跑，而是边界能不能稳。

首先是初始化。`initialValue` 只应该在 `localStorage` 没有值时写入。如果每次渲染都写入默认值，就会覆盖用户真实选择。所以代码里用 `isInitializedRef` 保证初始化只执行一次。

其次是订阅清理。`useSyncExternalStore` 会接管订阅生命周期，组件卸载时执行 `subscribe` 返回的清理函数。这比在每个组件里手写 `useEffect + addEventListener` 更稳。

然后是写入异常。`localStorage.setItem` 并不是永远安全的。比如浏览器隐私模式、容量限制、用户禁用存储，都可能导致写入失败。封装层应该捕获错误，并通过统一日志入口记录。

再就是 SSR。这个 Hook 是 Client Hook，所以文件顶部需要 `'use client'`。底层工具函数也应该判断 `typeof window === 'undefined'`，避免未来被非客户端代码误用时直接炸掉。

最后是类型校验。当前泛型只能告诉 TypeScript“我希望它是什么类型”，但不能保证 `localStorage` 里的历史数据一定符合这个类型。更严格的做法是引入 schema：

```ts
import { z } from 'zod';

const ThemeSchema = z.union([z.literal('light'), z.literal('dark')]);
const parsed = ThemeSchema.safeParse(value);

if (!parsed.success) {
  return 'dark';
}
```

如果是用户配置、复杂偏好、权限缓存这类重要数据，建议加校验。

---

## 9. 结合真实项目举例：后台管理系统的表格偏好

一个常见场景是后台管理系统里的表格偏好。

比如订单列表页面，用户可以选择每页数量、显示哪些列、默认排序方式。这些状态不是服务端数据，不需要进 React Query；也不是特别复杂的全局流程状态，不一定需要 Redux。它很适合用 `localStorage` 持久化。

先定义 key：

```ts
// src/config/localStorage.ts
export const LocalStorageKeys = {
  orderTablePreference: 'admin:order-table-preference',
} as const;

export type LocalStorageKey =
  (typeof LocalStorageKeys)[keyof typeof LocalStorageKeys];
```

定义偏好类型：

```ts
// src/features/orders/types.ts
export type OrderTablePreference = {
  pageSize: number;
  visibleColumns: string[];
  sortBy: 'createdAt' | 'amount' | 'status';
  sortOrder: 'asc' | 'desc';
};
```

组件消费：

```tsx
'use client';

import { LocalStorageKeys } from '@/config/localStorage';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { OrderTablePreference } from '../types';

const defaultPreference: OrderTablePreference = {
  pageSize: 20,
  visibleColumns: ['orderId', 'user', 'amount', 'status', 'createdAt'],
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

export function OrderTablePreferencePanel() {
  const [preference, setPreference] = useLocalStorage<OrderTablePreference>(
    LocalStorageKeys.orderTablePreference,
    defaultPreference
  );

  const handlePageSizeChange = (pageSize: number) => {
    setPreference(prev => ({
      ...prev,
      pageSize,
    }));
  };

  const handleToggleColumn = (column: string) => {
    setPreference(prev => {
      const visibleColumns = prev.visibleColumns.includes(column)
        ? prev.visibleColumns.filter(item => item !== column)
        : [...prev.visibleColumns, column];

      return {
        ...prev,
        visibleColumns,
      };
    });
  };

  return (
    <div>
      <div>
        <span>每页数量：</span>
        {[10, 20, 50].map(size => (
          <button key={size} onClick={() => handlePageSizeChange(size)}>
            {size}
          </button>
        ))}
      </div>

      <div>
        {['orderId', 'user', 'amount', 'status', 'createdAt'].map(column => (
          <label key={column}>
            <input
              type="checkbox"
              checked={preference.visibleColumns.includes(column)}
              onChange={() => handleToggleColumn(column)}
            />
            {column}
          </label>
        ))}
      </div>
    </div>
  );
}
```

订单表格读取同一份偏好：

```tsx
'use client';

import { LocalStorageKeys } from '@/config/localStorage';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { OrderTablePreference } from '../types';

const defaultPreference: OrderTablePreference = {
  pageSize: 20,
  visibleColumns: ['orderId', 'user', 'amount', 'status', 'createdAt'],
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

type Order = {
  orderId: string;
  user: string;
  amount: number;
  status: string;
  createdAt: string;
};

type OrderTableProps = {
  orders: Order[];
};

export function OrderTable({ orders }: OrderTableProps) {
  const [preference] = useLocalStorage<OrderTablePreference>(
    LocalStorageKeys.orderTablePreference,
    defaultPreference
  );

  return (
    <table>
      <thead>
        <tr>
          {preference.visibleColumns.map(column => (
            <th key={column}>{column}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {orders.slice(0, preference.pageSize).map(order => (
          <tr key={order.orderId}>
            {preference.visibleColumns.includes('orderId') && <td>{order.orderId}</td>}
            {preference.visibleColumns.includes('user') && <td>{order.user}</td>}
            {preference.visibleColumns.includes('amount') && <td>{order.amount}</td>}
            {preference.visibleColumns.includes('status') && <td>{order.status}</td>}
            {preference.visibleColumns.includes('createdAt') && <td>{order.createdAt}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

这里的关键点是：订单列表数据仍然可以来自接口、React Query 或服务端组件；表格偏好是客户端状态，适合进入 `localStorage`。两者不要混在一起。

也就是说，`orders` 是 server state，`preference` 是 client persistent state。边界清楚，项目才不会乱。

---

## 10. 完整代码示例

下面给出一套更完整的代码组织，接近真实项目写法。

先是 key 配置：

```ts
// src/config/localStorage.ts
export const LocalStorageKeys = {
  theme: 'app:theme',
  orderTablePreference: 'admin:order-table-preference',
} as const;

export type LocalStorageKey =
  (typeof LocalStorageKeys)[keyof typeof LocalStorageKeys];
```

然后是环境判断和日志工具：

```ts
// src/lib/helper/env.ts
export const isClient = typeof window !== 'undefined';
export const isDev = process.env.NODE_ENV === 'development';
```

```ts
// src/lib/helper/telemetry.ts
import { isClient, isDev } from './env';

export function log(
  location: string,
  error: unknown,
  metadata?: Record<string, unknown>
) {
  const normalizedError = error instanceof Error ? error : new Error(String(error));

  if (isDev) {
    console.warn('telemetry/log:', {
      location,
      error: normalizedError,
      metadata,
    });
  }

  if (!isClient || typeof CustomEvent === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('app:log', {
      detail: {
        location,
        error: normalizedError,
        metadata,
      },
    })
  );
}
```

底层 `localStorage` 工具：

```ts
// src/lib/helper/localStorage.ts
import type { LocalStorageKey } from '@/config/localStorage';
import { isClient } from './env';

type GetLocalStorageOptions<Value> = {
  key: LocalStorageKey;
  defaultValue?: Value;
};

type SetLocalStorageOptions<Value> = {
  key: LocalStorageKey;
  value: Value;
};

export function getLocalStorage<Value>({
  key,
  defaultValue,
}: GetLocalStorageOptions<Value>): Value | undefined {
  if (!isClient) {
    return defaultValue;
  }

  const rawValue = window.localStorage.getItem(key);

  if (rawValue === null) {
    return defaultValue;
  }

  try {
    return JSON.parse(rawValue) as Value;
  } catch {
    return defaultValue;
  }
}

export function setLocalStorage<Value>({
  key,
  value,
}: SetLocalStorageOptions<Value>) {
  if (!isClient) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}
```

核心 Hook：

```ts
// src/hooks/useLocalStorage.ts
'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import type { LocalStorageKey } from '@/config/localStorage';
import { getLocalStorage, setLocalStorage } from '@/lib/helper/localStorage';
import { log } from '@/lib/helper/telemetry';

type StateUpdater<Value> = (prevState: Value) => Value;

export function dispatchStorageEvent(key: LocalStorageKey, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue }));
}

const subscribe = (callback: () => void) => {
  window.addEventListener('storage', callback);

  return () => {
    window.removeEventListener('storage', callback);
  };
};

export function useLocalStorage<Value>(key: LocalStorageKey, initialValue?: Value) {
  const lastValueRef = useRef<Value | undefined>(initialValue);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (!isInitializedRef.current && initialValue !== undefined) {
      const existingValue = getLocalStorage<Value | undefined>({
        key,
        defaultValue: undefined,
      });

      if (existingValue === undefined) {
        setLocalStorage({ key, value: initialValue });
        dispatchStorageEvent(key, JSON.stringify(initialValue));
      }

      isInitializedRef.current = true;
    }
  }, [key, initialValue]);

  const getSnapshot = useCallback(() => {
    const value = getLocalStorage<Value>({
      key,
      defaultValue: initialValue,
    });

    if (JSON.stringify(value) !== JSON.stringify(lastValueRef.current)) {
      lastValueRef.current = value;
    }

    return lastValueRef.current;
  }, [key, initialValue]);

  const state = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => initialValue as Value
  );

  const setState = useCallback(
    (valueOrUpdater: Value | StateUpdater<Value>) => {
      try {
        const nextState =
          typeof valueOrUpdater === 'function'
            ? (valueOrUpdater as StateUpdater<Value>)(state)
            : valueOrUpdater;

        setLocalStorage({ key, value: nextState });
        dispatchStorageEvent(key, nextState === null ? null : JSON.stringify(nextState));
      } catch (error) {
        log('useLocalStorage/setState', error, { key });
      }
    },
    [key, state]
  );

  return [state, setState] as const;
}
```

最后是业务组件：

```tsx
// src/features/settings/components/ThemeSwitcher.tsx
'use client';

import { LocalStorageKeys } from '@/config/localStorage';
import { useLocalStorage } from '@/hooks/useLocalStorage';

type Theme = 'light' | 'dark';

export function ThemeSwitcher() {
  const [theme, setTheme] = useLocalStorage<Theme>(LocalStorageKeys.theme, 'dark');

  const handleToggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return <button onClick={handleToggleTheme}>当前主题：{theme}</button>;
}
```

这套代码的核心是：组件不直接操作浏览器 API，所有同步细节都收敛在 Hook 内部。后续如果要增加 schema 校验、清除状态、版本迁移，也可以集中改封装层。

---

## 11. 工程化注意事项

第一，不要在组件里到处直接写 `localStorage.getItem` 和 `localStorage.setItem`。一旦多个组件依赖同一个 key，同步问题会变得很隐蔽。

第二，key 要集中管理。字符串 key 散落在项目里，会带来拼写错误、迁移困难和调试成本。

第三，`localStorage` 只能存字符串，复杂对象一定要统一序列化和反序列化。不要有的地方存 JSON，有的地方存裸字符串。

第四，同页面同步要手动处理。不要以为 `storage` 事件一定会通知当前页面。跨 tab 和同页面是两个问题。

第五，Next.js 项目要注意客户端边界。Hook 文件使用 `'use client'`，工具函数内部也建议判断浏览器环境。

第六，泛型不等于运行时类型安全。对于复杂数据，尤其是用户配置、权限缓存、版本迁移数据，建议用 Zod 或其他 schema 工具做校验。

第七，不要把服务端数据复制进 `localStorage`。用户列表、订单列表、行情数据、账户余额这类数据应该交给 React Query、SWR 或服务端状态管理方案。`localStorage` 更适合低频、轻量、客户端偏好的持久化。

第八，注意性能。示例里用 `JSON.stringify` 比较快照变化，对于小对象够用。如果存储值较大，应该优化比较方式，或者避免把大对象放进这个 Hook。

第九，错误要统一记录。写入失败不一定要打断用户流程，但应该进入 telemetry，方便线上排查。

---

## 12. 总结

把 `localStorage` 用好，不是把 `setItem` 包一层就结束了。真实项目里更重要的是让它和 React 状态模型对齐：组件能订阅，状态能同步，初始化可控，异常有兜底，服务端和客户端边界清楚。

这套封装的核心取舍是：

- `localStorage` 负责持久化。
- `useSyncExternalStore` 负责订阅外部状态。
- `dispatchStorageEvent` 负责同页面同步。
- 业务组件只消费 `[state, setState]`。

这样做之后，主题、用户偏好、表格配置、引导状态这类客户端持久状态就可以从零散代码里抽出来，变成一套稳定的工程能力。

对于长期维护的 React 项目，这种小型基础设施往往比单个页面里的业务代码更值得认真设计。
