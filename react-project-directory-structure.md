# React 项目目录结构怎么设计：从基础分层到真实业务落地

React 项目的目录结构没有唯一标准。小项目里，所有代码都放在 `src` 下也能跑；但项目一旦变复杂，就会遇到组件混乱、请求逻辑散落、状态管理边界不清、业务模块难以扩展等问题。

很多人讨论目录结构时，只是在争论文件夹名字：到底叫 `pages`、`screens`、`views`，还是 `app`。但真实项目里更重要的不是名字，而是每一类代码应该放在哪里、为什么放在那里、它和其他模块的边界是什么。

这篇文章不追求给出一个“唯一正确”的 React 目录结构，而是整理一套适合大多数前端项目起步的工程化结构。它既适合普通 React 应用，也可以迁移到 Next.js、Web3 前端、交易系统、后台管理系统这类更复杂的项目里。

---

## 1. 目录结构解决什么问题

目录结构本质上解决的是工程组织问题。

在一个真实项目中，代码通常会被拆成几类：

- 页面入口。
- 通用组件。
- 业务组件。
- 自定义 hooks。
- 请求服务。
- 全局状态。
- 工具函数。
- Provider。
- 类型定义。
- 常量配置。

如果这些东西没有边界，项目会很快变成这样：

```txt
src/
  App.tsx
  Button.tsx
  UserList.tsx
  useUser.ts
  api.ts
  store.ts
  utils.ts
  Modal.tsx
  OrderList.tsx
  TradePanel.tsx
  format.ts
  request.ts
  config.ts
```

这在项目早期没问题，但后面会出现几个问题。

第一，文件越来越多，开发者不知道新代码应该放在哪里。

第二，组件层级不清楚。UI 基础组件、业务组件、页面组件混在一起。

第三，业务逻辑和 UI 耦合。比如页面组件里同时写请求、状态处理、表单校验、弹窗控制和渲染。

第四，模块边界不清。订单模块、用户模块、行情模块互相引用，后期很难迁移和重构。

第五，新人接手项目时很难快速理解：哪些是通用能力，哪些是业务代码，哪些是页面入口，哪些是底层服务。

所以目录结构不是为了“看起来整齐”，而是为了让项目在变大之后依然可维护。

---

## 2. 最简单的写法是什么

最简单的 React 项目可能是这样：

```txt
src/
  App.tsx
  main.tsx
  Button.tsx
  UserList.tsx
  api.ts
  store.ts
  utils.ts
```

组件里直接写业务逻辑：

```tsx
// src/App.tsx
import { useEffect, useState } from "react";

interface User {
  id: string;
  name: string;
}

async function getUsers(): Promise<User[]> {
  const res = await fetch("/api/users");

  if (!res.ok) {
    throw new Error("Failed to fetch users");
  }

  return res.json();
}

export function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function run() {
      setIsLoading(true);

      try {
        const data = await getUsers();
        setUsers(data);
      } finally {
        setIsLoading(false);
      }
    }

    run();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </main>
  );
}
```

这段代码可以运行，也很容易理解。问题是，它把很多职责都塞进了一个组件里。

`App.tsx` 同时负责：

- 页面入口。
- 接口请求。
- `loading` 状态。
- 错误处理。
- 数据保存。
- UI 渲染。

项目小的时候这不明显。项目大了以后，每个页面都这样写，代码会迅速失控。

---

## 3. 简单写法的问题

简单写法的问题不是“不能跑”，而是“不适合增长”。

比如一个真实的 Web3 交易前端里，可能会有这些模块：

- 钱包连接。
- 用户账户信息。
- 资产余额。
- Token 列表。
- 交易表单。
- 报价请求。
- 滑点设置。
- 订单簿。
- 近期成交。
- 当前挂单。
- 历史订单。
- SSE / WebSocket 实时更新。
- 链上交易状态。

如果所有东西都直接写在页面组件里，就会出现几个典型问题。

第一，页面组件越来越大。一个 `TradePage.tsx` 可能几百行甚至上千行。

第二，组件无法复用。比如订单列表在首页、交易页、用户中心都要用，但逻辑写死在某个页面里。

第三，请求逻辑散落。`fetch('/api/orders')`、`fetch('/api/user')`、`fetch('/api/positions')` 到处都是，后续改接口很痛苦。

第四，状态边界混乱。React Query、Zustand、`localStorage`、组件 state 混在一起，没人知道数据到底应该从哪里读。

第五，业务逻辑难测试。因为核心逻辑都写在组件里，没法单独测试。

第六，代码缺少可迁移性。比如以后要把用户模块迁到另一个项目，结果发现它依赖了整个页面、全局 store、很多散落的工具函数。

所以目录结构的核心目标是：让不同职责的代码有明确归属。

---

## 4. 推荐的项目落地结构

一个比较稳妥的基础结构可以这样设计：

```txt
src/
  app/
    App.tsx
    providers.tsx
    router.tsx
  pages/
    HomePage.tsx
    LoginPage.tsx
    DashboardPage.tsx
  components/
    ui/
      Button.tsx
      Input.tsx
      Modal.tsx
      Select.tsx
    DeleteAccountModal.tsx
    EmptyState.tsx
    ErrorState.tsx
  features/
    user/
      api.ts
      query-keys.ts
      query-options.ts
      store.ts
      hooks.ts
      components/
        UserList.tsx
        UserFilter.tsx
    trade/
      api.ts
      query-keys.ts
      query-options.ts
      store.ts
      hooks/
        useTradeForm.ts
        useTradeSSE.ts
      components/
        TradePanel.tsx
        OrderBook.tsx
        RecentTrades.tsx
  hooks/
    useDebounce.ts
    useCountdown.ts
    useIsMounted.ts
  services/
    http/
      client.ts
      error.ts
    wallet/
      evm.ts
      solana.ts
    sse/
      client.ts
  state/
    app-store.ts
    user-session-store.ts
  utils/
    format.ts
    number.ts
    date.ts
    invariant.ts
  config/
    env.ts
    constants.ts
  types/
    common.ts
```

这个结构不是固定模板，但它体现了几个关键原则。

`app/` 放应用级入口，比如全局 Provider、router、根组件。

`pages/` 放路由级页面。页面应该尽量薄，只负责组合业务模块。

`components/ui/` 放基础 UI 组件，比如 Button、Input、Modal。这些组件不应该知道具体业务。

`components/` 根目录下可以放跨业务的组合组件，比如 EmptyState、ErrorState、DeleteAccountModal。

`features/` 放业务模块。真实项目里，越来越推荐按 feature 组织代码，而不是只按技术类型组织。

`hooks/` 放跨业务的通用 hooks，比如 debounce、倒计时、mounted 判断。

`services/` 放底层服务封装，比如 HTTP client、钱包 SDK、SSE client、埋点 SDK。

`state/` 放全局状态，但不要滥用。很多状态应该靠 React Query、URL search params 或模块内 store 管理。

`utils/` 放小而通用的纯函数，比如格式化金额、格式化日期、数值转换。

`config/` 放环境变量、常量、链配置、接口地址等。

`types/` 放跨模块共享类型。

---

## 5. 页面目录：pages / app / screens 负责路由骨架

页面目录是应用的骨架。用户能访问的页面入口，应该集中放在这里。

普通 React + React Router 可以这样：

```txt
src/
  pages/
    HomePage.tsx
    LoginPage.tsx
    DashboardPage.tsx
    TradePage.tsx
```

Next.js App Router 中，页面结构可能由 `app/` 目录决定：

```txt
src/
  app/
    page.tsx
    login/
      page.tsx
    dashboard/
      page.tsx
    trade/
      page.tsx
```

React Native 中可能叫 `screens/`：

```txt
src/
  screens/
    HomeScreen.tsx
    LoginScreen.tsx
    ProfileScreen.tsx
```

名字不重要，职责才重要。页面组件应该负责页面级组合，而不是承载大量底层逻辑。

例如：

```tsx
// src/pages/TradePage.tsx
import { TradePanel } from "@/features/trade/components/TradePanel";
import { OrderBook } from "@/features/trade/components/OrderBook";
import { RecentTrades } from "@/features/trade/components/RecentTrades";

export function TradePage() {
  return (
    <main>
      <section>
        <OrderBook />
        <RecentTrades />
      </section>

      <aside>
        <TradePanel />
      </aside>
    </main>
  );
}
```

这里的 `TradePage` 不应该直接写订单簿请求、交易表单逻辑、钱包签名、SSE 连接。它应该只负责组合页面。

---

## 6. components：区分 UI Primitive 和业务组件

很多项目最容易混乱的地方就是 `components`。

不是所有组件都应该放在同一级。

基础 UI 组件应该单独放在 `components/ui`：

```txt
src/
  components/
    ui/
      Button.tsx
      Input.tsx
      Modal.tsx
      Select.tsx
      Spinner.tsx
```

这些组件应该足够通用，不依赖业务。

例如：

```tsx
// src/components/ui/Button.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
}

export function Button({
  children,
  variant = "primary",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button data-variant={variant} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
```

这个 Button 不知道什么是用户、订单、钱包、交易。它只负责按钮行为和样式。

但像 `DeleteAccountModal` 这种组件就不是 UI Primitive。它是一个业务组合组件，内部可能使用 Modal、Input、Button：

```tsx
// src/components/DeleteAccountModal.tsx
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface DeleteAccountModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteAccountModal({
  open,
  onClose,
  onConfirm,
}: DeleteAccountModalProps) {
  return (
    <Modal open={open} onClose={onClose}>
      <h2>Delete account</h2>
      <p>This action cannot be undone.</p>
      <Button variant="danger" onClick={onConfirm}>
        Delete
      </Button>
    </Modal>
  );
}
```

这里的关键点是：基础组件和业务组件不要混在一起。否则 `components` 很快会变成垃圾桶。

---

## 7. hooks：放跨业务复用逻辑

`hooks/` 目录适合放跨业务的通用 hooks。

例如：

```txt
src/
  hooks/
    useDebounce.ts
    useCountdown.ts
    useIsMounted.ts
```

一个典型的 debounce hook：

```ts
// src/hooks/useDebounce.ts
import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

这个 hook 可以用于搜索框、筛选器、行情列表过滤等场景。

但不是所有 hook 都应该放在全局 `hooks/` 目录。

如果 hook 是业务专属的，应该放在对应 feature 里：

```txt
src/
  features/
    trade/
      hooks/
        useTradeForm.ts
        useTradeSSE.ts
        useOrderbook.ts
```

比如 `useTradeForm` 只服务于交易模块，就不应该放进全局 hooks。

一个简单判断标准是：

- 如果这个 hook 不依赖具体业务，可以放 `src/hooks`。
- 如果这个 hook 只服务某个业务模块，放 `features/xxx/hooks`。

---

## 8. services：封装外部服务和底层能力

`services/` 放的是应用依赖的底层服务。

比如：

```txt
src/
  services/
    http/
      client.ts
      error.ts
    sse/
      client.ts
    wallet/
      evm.ts
      solana.ts
```

HTTP client 示例：

```ts
// src/services/http/client.ts
export class HttpError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions extends RequestInit {
  token?: string;
}

export async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let payload: unknown = null;

    try {
      payload = await res.json();
    } catch {
      payload = null;
    }

    throw new HttpError("Request failed", res.status, payload);
  }

  return res.json() as Promise<T>;
}
```

业务模块不应该到处手写 `fetch`。更好的方式是通过 `request` 统一处理 header、错误、token、返回值。

比如用户模块可以这样用：

```ts
// src/features/user/api.ts
import { request } from "@/services/http/client";

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserFilters {
  page: number;
  pageSize: number;
  keyword?: string;
}

export async function getUsers(filters: UserFilters) {
  const search = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    keyword: filters.keyword ?? "",
  });

  return request<User[]>(`/api/users?${search.toString()}`);
}
```

这样服务层和业务层就分开了。

`services/http` 负责怎么请求。

`features/user/api.ts` 负责请求什么业务数据。

---

## 9. features：真实项目更推荐按业务模块组织

当项目变复杂后，只按 `components` / `hooks` / `api` / `utils` 分类不够。

因为业务代码会分散在各个目录里。

例如用户模块相关代码可能散落成这样：

```txt
components/UserList.tsx
hooks/useUsers.ts
api/user.ts
state/user-store.ts
types/user.ts
```

如果以后要迁移用户模块，需要到处找。

更推荐的方式是按 feature 组织：

```txt
src/
  features/
    user/
      api.ts
      query-keys.ts
      query-options.ts
      store.ts
      hooks.ts
      components/
        UserList.tsx
        UserFilter.tsx
```

这样用户模块内部代码集中在一起，边界更清楚。

一个用户模块可以这样设计：

```ts
// src/features/user/types.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserFilters {
  page: number;
  pageSize: number;
  keyword?: string;
}
```

```ts
// src/features/user/api.ts
import { request } from "@/services/http/client";
import type { User, UserFilters } from "./types";

export async function getUsers(filters: UserFilters) {
  const search = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    keyword: filters.keyword ?? "",
  });

  return request<User[]>(`/api/users?${search.toString()}`);
}
```

如果项目使用 React Query，可以继续拆 query key 和 query options：

```ts
// src/features/user/query-keys.ts
import type { UserFilters } from "./types";

export const userQueryKeys = {
  all: ["user"] as const,
  list: (filters: UserFilters) =>
    [...userQueryKeys.all, "list", filters] as const,
};
```

```ts
// src/features/user/query-options.ts
import { queryOptions } from "@tanstack/react-query";
import { getUsers } from "./api";
import { userQueryKeys } from "./query-keys";
import type { UserFilters } from "./types";

export function usersQueryOptions(filters: UserFilters) {
  return queryOptions({
    queryKey: userQueryKeys.list(filters),
    queryFn: () => getUsers(filters),
    staleTime: 1000 * 30,
  });
}
```

这样业务请求、缓存 key、请求配置都在 user 模块内部。

---

## 10. state：全局状态不要滥用

很多项目会有一个 `state/` 或 `store/` 目录。

它可以放 Zustand、Redux、Jotai、Recoil 等状态管理相关代码。

例如：

```txt
src/
  state/
    app-store.ts
    user-session-store.ts
```

但要注意，状态管理库不是用来保存所有数据的。

在 React Query + Zustand 的项目里，一个常见原则是：

```txt
React Query 管 server state。
Zustand 管 client state。
```

比如接口返回的用户列表、订单列表、持仓数据、余额数据，优先放 React Query cache。

筛选条件、当前 tab、弹窗开关、当前选中的 token、表单临时状态，可以放 Zustand。

错误写法是把请求结果再复制一份到 Zustand：

```tsx
// 不推荐
const { data } = useQuery(usersQueryOptions(filters));
const setUsers = useUserStore((state) => state.setUsers);

useEffect(() => {
  if (data) {
    setUsers(data);
  }
}, [data, setUsers]);
```

这样会导致同一份 server state 同时存在 React Query 和 Zustand 两份数据源中。

更推荐的写法是 Zustand 只保存筛选条件：

```ts
// src/features/user/store.ts
import { create } from "zustand";
import type { UserFilters } from "./types";

interface UserFilterStore {
  filters: UserFilters;
  setFilters: (filters: Partial<UserFilters>) => void;
  resetFilters: () => void;
}

const defaultFilters: UserFilters = {
  page: 1,
  pageSize: 20,
  keyword: "",
};

export const useUserFilterStore = create<UserFilterStore>((set) => ({
  filters: defaultFilters,
  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
  resetFilters: () =>
    set({
      filters: defaultFilters,
    }),
}));
```

然后 React Query 根据 filters 请求数据：

```tsx
// src/features/user/components/UserList.tsx
import { useQuery } from "@tanstack/react-query";
import { usersQueryOptions } from "../query-options";
import { useUserFilterStore } from "../store";

export function UserList() {
  const filters = useUserFilterStore((state) => state.filters);

  const {
    data: users = [],
    isPending,
    error,
  } = useQuery(usersQueryOptions(filters));

  if (isPending) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Failed to load users</div>;
  }

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

这里的状态边界更清楚：

```txt
Zustand:
  filters / page / keyword
React Query:
  users data / loading / error / cache
```

---

## 11. utils：只放小而通用的纯函数

`utils/` 是很多项目里最容易失控的目录。

它可以有，但要有规则。

适合放进 utils 的代码通常满足三个条件：

- 小。
- 通用。
- 不明显属于某个业务模块。

例如：

```txt
src/
  utils/
    format.ts
    number.ts
    date.ts
    invariant.ts
```

格式化金额：

```ts
// src/utils/format.ts
export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}
```

Web3 项目里的 bigint 格式化：

```ts
// src/utils/number.ts
export function formatTokenAmount(
  amount: bigint,
  decimals: number,
  precision = 4,
) {
  const base = 10n ** BigInt(decimals);
  const integer = amount / base;
  const fraction = amount % base;
  const fractionText = fraction
    .toString()
    .padStart(decimals, "0")
    .slice(0, precision);

  return `${integer.toString()}.${fractionText}`;
}
```

但如果一个工具函数只服务某个业务模块，就不要放全局 utils。

例如 `calculateSwapMinOutput` 只服务 swap 模块，更适合放：

```txt
src/
  features/
    swap/
      utils.ts
```

不要把所有东西都塞进全局 utils，否则它最后也会变成垃圾桶。

---

## 12. providers：集中管理全局 Provider

React 项目通常会有很多 Provider。

比如：

- `QueryClientProvider`
- `ThemeProvider`
- `RouterProvider`
- `WagmiProvider`
- `WalletProvider`
- `IntlProvider`
- Jotai Provider
- Zustand 不一定需要 Provider

不要把这些全部塞进 `main.tsx` 或 `App.tsx`。

可以抽一个 `providers.tsx`：

```tsx
// src/app/providers.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

const queryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

入口文件保持干净：

```tsx
// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { AppProviders } from "./app/providers";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
```

Web3 项目里会更明显：

```tsx
// src/app/providers.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import type { ReactNode } from "react";
import { wagmiConfig } from "@/services/wallet/evm";

const queryClient = new QueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
```

这样 Provider 的管理是集中的，后续新增国际化、主题、钱包、埋点都不会污染页面组件。

---

## 13. 结合真实业务：Web3 交易前端怎么组织

假设我们做一个 Web3 期权交易页面，它可能包含：

- 市场行情。
- 订单簿。
- 近期成交。
- 用户账户。
- 当前持仓。
- 当前挂单。
- 历史订单。
- 交易表单。
- 钱包连接。
- SSE 实时更新。

推荐结构可以是：

```txt
src/
  features/
    market/
      api.ts
      query-keys.ts
      query-options.ts
      store.ts
      hooks/
        useMarketSSE.ts
      components/
        InstrumentTable.tsx
        OrderBook.tsx
        RecentTrades.tsx
    account/
      api.ts
      query-keys.ts
      query-options.ts
      components/
        AccountSummary.tsx
    trade/
      api.ts
      query-keys.ts
      query-options.ts
      store.ts
      hooks/
        useTradeForm.ts
        useTradeTransaction.ts
      components/
        TradePanel.tsx
        OpenOrders.tsx
        OrderHistory.tsx
  services/
    wallet/
      evm.ts
    sse/
      client.ts
    http/
      client.ts
```

交易页面只组合模块：

```tsx
// src/pages/TradePage.tsx
import { AccountSummary } from "@/features/account/components/AccountSummary";
import { InstrumentTable } from "@/features/market/components/InstrumentTable";
import { OrderBook } from "@/features/market/components/OrderBook";
import { RecentTrades } from "@/features/market/components/RecentTrades";
import { OpenOrders } from "@/features/trade/components/OpenOrders";
import { TradePanel } from "@/features/trade/components/TradePanel";

export function TradePage() {
  return (
    <main>
      <AccountSummary />

      <section>
        <InstrumentTable />
        <OrderBook />
        <RecentTrades />
      </section>

      <aside>
        <TradePanel />
        <OpenOrders />
      </aside>
    </main>
  );
}
```

交易表单内部可以调用业务 hook：

```tsx
// src/features/trade/components/TradePanel.tsx
import { useTradeForm } from "../hooks/useTradeForm";
import { useTradeTransaction } from "../hooks/useTradeTransaction";

export function TradePanel() {
  const form = useTradeForm();

  const { executeTrade, isPending, error } = useTradeTransaction({
    side: form.side,
    amount: form.amount,
    instrument: form.instrument,
    slippage: form.slippage,
  });

  return (
    <section>
      <input
        value={form.amount}
        onChange={(event) => form.setAmount(event.target.value)}
      />

      <button disabled={!form.canSubmit || isPending} onClick={executeTrade}>
        {isPending ? "Trading..." : "Submit Order"}
      </button>

      {error ? <p>{error.message}</p> : null}
    </section>
  );
}
```

组件不需要知道底层怎么构造交易、怎么签名、怎么刷新订单。它只消费 hook 暴露出来的结果。

这就是目录结构和封装边界的实际价值。

---

## 14. 一个完整的小示例：用户列表模块

下面用一个用户列表模块串起来看。

目录：

```txt
src/
  features/
    user/
      types.ts
      api.ts
      query-keys.ts
      query-options.ts
      store.ts
      components/
        UserFilter.tsx
        UserList.tsx
        UserPageContent.tsx
```

先定义类型：

```ts
// src/features/user/types.ts
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface UserFilters {
  page: number;
  pageSize: number;
  keyword: string;
}
```

请求函数只负责和后端通信：

```ts
// src/features/user/api.ts
import { request } from "@/services/http/client";
import type { User, UserFilters } from "./types";

export async function getUsers(filters: UserFilters): Promise<User[]> {
  const search = new URLSearchParams({
    page: String(filters.page),
    pageSize: String(filters.pageSize),
    keyword: filters.keyword,
  });

  return request<User[]>(`/api/users?${search.toString()}`);
}
```

query key 集中管理：

```ts
// src/features/user/query-keys.ts
import type { UserFilters } from "./types";

export const userQueryKeys = {
  all: ["user"] as const,
  lists: () => [...userQueryKeys.all, "list"] as const,
  list: (filters: UserFilters) => [...userQueryKeys.lists(), filters] as const,
};
```

query options 复用请求配置：

```ts
// src/features/user/query-options.ts
import { queryOptions } from "@tanstack/react-query";
import { getUsers } from "./api";
import { userQueryKeys } from "./query-keys";
import type { UserFilters } from "./types";

export function usersQueryOptions(filters: UserFilters) {
  return queryOptions({
    queryKey: userQueryKeys.list(filters),
    queryFn: () => getUsers(filters),
    staleTime: 1000 * 30,
  });
}
```

Zustand 只保存客户端筛选状态：

```ts
// src/features/user/store.ts
import { create } from "zustand";
import type { UserFilters } from "./types";

interface UserStore {
  filters: UserFilters;
  setKeyword: (keyword: string) => void;
  setPage: (page: number) => void;
  reset: () => void;
}

const defaultFilters: UserFilters = {
  page: 1,
  pageSize: 20,
  keyword: "",
};

export const useUserStore = create<UserStore>((set) => ({
  filters: defaultFilters,
  setKeyword: (keyword) =>
    set((state) => ({
      filters: {
        ...state.filters,
        keyword,
        page: 1,
      },
    })),
  setPage: (page) =>
    set((state) => ({
      filters: {
        ...state.filters,
        page,
      },
    })),
  reset: () =>
    set({
      filters: defaultFilters,
    }),
}));
```

筛选组件只改 client state：

```tsx
// src/features/user/components/UserFilter.tsx
import { useUserStore } from "../store";

export function UserFilter() {
  const keyword = useUserStore((state) => state.filters.keyword);
  const setKeyword = useUserStore((state) => state.setKeyword);

  return (
    <input
      value={keyword}
      placeholder="Search user"
      onChange={(event) => setKeyword(event.target.value)}
    />
  );
}
```

列表组件通过 React Query 读取 server state：

```tsx
// src/features/user/components/UserList.tsx
import { useQuery } from "@tanstack/react-query";
import { usersQueryOptions } from "../query-options";
import { useUserStore } from "../store";

export function UserList() {
  const filters = useUserStore((state) => state.filters);
  const setPage = useUserStore((state) => state.setPage);

  const {
    data: users = [],
    isPending,
    error,
  } = useQuery(usersQueryOptions(filters));

  if (isPending) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return <div>Failed to load users</div>;
  }

  return (
    <section>
      {users.map((user) => (
        <div key={user.id}>
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
      ))}

      <button onClick={() => setPage(filters.page + 1)}>Next Page</button>
    </section>
  );
}
```

最后组合成模块页面内容：

```tsx
// src/features/user/components/UserPageContent.tsx
import { UserFilter } from "./UserFilter";
import { UserList } from "./UserList";

export function UserPageContent() {
  return (
    <main>
      <h1>Users</h1>
      <UserFilter />
      <UserList />
    </main>
  );
}
```

页面入口只引用模块：

```tsx
// src/pages/UserPage.tsx
import { UserPageContent } from "@/features/user/components/UserPageContent";

export function UserPage() {
  return <UserPageContent />;
}
```

这个例子体现了一个比较清晰的边界：

```txt
pages:
  页面入口
features/user:
  用户业务模块
features/user/store:
  用户筛选条件
features/user/api:
  用户请求
features/user/query-options:
  用户请求配置
features/user/components:
  用户业务组件
services/http:
  通用请求能力
```

---

## 15. 工程化注意事项

目录结构不是越复杂越好。小项目不需要一开始就拆得非常细。真正重要的是：当项目变复杂时，你知道应该往哪里拆。

几个实践建议。

第一，页面组件保持薄。页面负责组合模块，不要承载大量业务逻辑。

第二，基础 UI 组件和业务组件分开。`components/ui` 放 Button、Input、Modal；业务组件放 feature 内部或 components 根目录。

第三，跨业务 hook 放全局 hooks，业务 hook 放 feature 内部。

第四，HTTP、钱包、SSE、埋点这类底层能力放 services，不要直接散落在组件里。

第五，业务模块优先按 features 组织。真实项目里，按业务边界组织通常比按文件类型组织更好维护。

第六，utils 只放小而通用的纯函数。不要把业务逻辑塞进全局 utils。

第七，全局 state 要克制使用。接口数据优先交给 React Query，客户端 UI 状态再考虑 Zustand、Jotai、Redux。

第八，Provider 集中管理。不要让 `main.tsx` 变成一堆 Provider 嵌套。

第九，模块之间不要随意互相引用。比如 `features/user` 不应该随便引用 `features/trade` 的内部实现。如果确实需要共享，考虑提到 services、utils 或更上层模块。

第十，目录结构要服务业务，而不是强行套模板。后台系统、Web3 交易前端、内容站、移动端应用的结构都可能不同。

---

## 16. 总结

这篇文章的核心不是说 React 项目必须有哪些文件夹，而是说目录结构背后应该有清晰的职责划分。

一个可维护的 React 项目通常应该具备这些特点：

- 请求逻辑和 UI 解耦。
- 页面入口和业务模块解耦。
- 基础 UI 组件和业务组件解耦。
- 通用 hooks 和业务 hooks 解耦。
- 底层服务和业务请求解耦。
- 全局状态和服务端缓存边界清晰。

真实项目里，目录结构不是一次性设计完的。它会随着业务增长不断演化。但只要一开始建立几个稳定原则，后面扩展就不会太乱。

技术本身通常不难，真正难的是项目变大之后，代码仍然能保持边界清晰、职责明确、方便维护。React 目录结构的价值就在这里。
