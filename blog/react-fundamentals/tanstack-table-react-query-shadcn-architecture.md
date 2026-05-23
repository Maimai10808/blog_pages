# 用 TanStack Table、React Query 和 shadcn/ui 搭一个可维护的数据表格架构

在前端项目里，表格是一个很容易被低估的模块。

最开始我们只是想把一组数据渲染出来：请求接口、拿到数组、`map` 成一行一行的表格。这个阶段写法非常简单，甚至几十行代码就能跑起来。但真实项目里的表格通常不会停留在“展示数据”这一层。

它很快会出现这些需求：

- 接口请求、loading、error、empty 状态。
- 分页、筛选、排序。
- 服务端分页和缓存同步。
- 表格列配置越来越复杂。
- 单元格里有金额、状态、地址、操作按钮。
- 多个表格共用同一套 UI 规范。
- 后续还可能接虚拟滚动、行选择、列隐藏、批量操作。

如果这些逻辑全部写在一个组件里，前期看起来很快，后期维护会非常痛苦。

这篇文章基于一个真实的工程化练习：使用 Express mock 后端 + React Query + TanStack Table + shadcn/ui 搭一个数据表格模块，并逐步把它拆成更适合维护的结构。

重点不是 UI 多漂亮，而是讲清楚：数据请求、缓存状态、表格逻辑、UI 渲染到底应该怎么分层。

---

## 1. 为什么需要这套组合

先明确这几个工具分别解决什么问题。

React Query 负责服务端状态管理。它不是简单替代 `useEffect + fetch`，而是帮我们处理接口请求、缓存、请求去重、重试、失效刷新、分页查询、后台更新等问题。

TanStack Table 负责表格状态和表格模型。它是 headless 的，不提供 UI 样式，但提供列定义、row model、分页、排序、筛选、选择、列可见性等能力。

shadcn/ui 负责 UI primitive。比如 Table、Button、DropdownMenu 这些组件。它不关心数据怎么来，也不关心表格怎么分页，只负责提供一套可组合、可定制的 UI 基础组件。

这三者组合起来，边界应该是这样的：

```txt
React Query
  负责请求和缓存
TanStack Table
  负责表格数据模型和交互状态
shadcn/ui
  负责最终 DOM 和样式渲染
```

如果把它们混在一个组件里，代码也能跑。但真实项目里最怕的就是这种“能跑但边界不清”的代码。

---

## 2. 最简单的写法是什么

比如我们有一个 Web3 activity 列表，最简单可以这样写：

```tsx
"use client"

import * as React from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

type Activity = {
  id: string
  chain: string
  protocol: string
  status: string
  usdValue: number
}

const columnHelper = createColumnHelper<Activity>()

const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("chain", {
    header: "Chain",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("protocol", {
    header: "Protocol",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("usdValue", {
    header: "USD Value",
    cell: info => `$${info.getValue()}`,
  }),
]

export function ActivityTable() {
  const [data, setData] = React.useState<Activity[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    fetch("http://localhost:4000/api/table-demo/activities")
      .then(res => res.json())
      .then(result => {
        setData(result.data)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map(headerGroup => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map(header => (
              <th key={header.id}>
                {flexRender(header.column.columnDef.header, header.getContext())}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map(row => (
          <tr key={row.id}>
            {row.getVisibleCells().map(cell => (
              <td key={cell.id}>
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

这段代码确实能跑，但真实项目里很快会失控。

它的问题不是“写得不高级”，而是职责混在了一起：

- 组件里直接拼接口 URL。
- 请求、loading、error 都写在组件里。
- query key 没有统一管理。
- columns 和 UI 渲染混在一起。
- 表格实例和页面布局混在一起。
- 后续加分页、排序、筛选时会越来越难改。
- 其他组件想复用请求逻辑时只能复制代码。

所以我们需要换一种写法：不是为了拆文件而拆文件，而是让每个文件只负责一件事。

---

## 3. 先准备一个简单后端

为了更接近真实项目，我们先用 Express 搭一个简单 mock 后端。

目录可以这样放：

```txt
backend/
  src/
    index.ts
    app.ts
    routes/
      index.ts
    modules/
      table-demo/
        table-demo.types.ts
        table-demo.data.ts
        web3-table-500-dataset.ts
        table-demo.routes.ts
```

这里有两个数据源：

```txt
GET /api/table-demo/people
GET /api/table-demo/activities
```

`people` 用来做小表格，`activities` 用来做更真实一点的 Web3 activity 表格。

后端类型：

```ts
// backend/src/modules/table-demo/table-demo.types.ts
export type Person = {
  id: string
  firstName: string
  lastName: string
  age: number
  visits: number
  status: "In Relationship" | "Single" | "Complicated"
  progress: number
}

export type Web3TableActivity = {
  id: string
  requestId: string
  chain: string
  protocol: string
  eventType: string
  status: "queued" | "processing" | "succeeded" | "failed" | "cancelled"
  walletAddress: string
  walletTag: string
  txHash: string
  blockNumber: number
  assetIn: string
  assetOut: string
  amountIn: number
  usdValue: number
  gasUsd: number
  slippageBps: number
  riskLevel: "low" | "medium" | "high" | "critical"
  riskScore: number
  region: string
  teamOwner: string
  createdAt: string
  updatedAt: string
  retryCount: number
  confirmationCount: number
  notes: string
}
```

`people` mock 数据：

```ts
// backend/src/modules/table-demo/table-demo.data.ts
import type { Person } from "./table-demo.types"

export const people: Person[] = [
  {
    id: "person-001",
    firstName: "tanner",
    lastName: "linsley",
    age: 24,
    visits: 100,
    status: "In Relationship",
    progress: 50,
  },
  {
    id: "person-002",
    firstName: "tandy",
    lastName: "miller",
    age: 40,
    visits: 40,
    status: "Single",
    progress: 80,
  },
  {
    id: "person-003",
    firstName: "joe",
    lastName: "dirte",
    age: 45,
    visits: 20,
    status: "Complicated",
    progress: 10,
  },
]
```

`activities` 接口：

```ts
// backend/src/modules/table-demo/table-demo.routes.ts
import { Router } from "express"
import { people } from "./table-demo.data"
import {
  web3TableActivities,
  web3TableActivityMeta,
} from "./web3-table-500-dataset"

export const tableDemoRoutes = Router()

tableDemoRoutes.get("/people", (_req, res) => {
  res.json({
    data: people,
  })
})

tableDemoRoutes.get("/activities", (_req, res) => {
  res.json({
    data: web3TableActivities,
    meta: web3TableActivityMeta,
  })
})
```

这个阶段先不分页，一次返回全部数据。这样前端先能跑起来。

---

## 4. 推荐的前端项目结构

前端不要把所有东西都塞进一个 `components/table.tsx`。建议拆成下面这样：

```txt
src/
  app/
    page.tsx
    providers.tsx
  lib/
    api-client.ts
  types/
    people.types.ts
    web3-activities.types.ts
  services/
    people.service.ts
    web3-activities.service.ts
  queries/
    query-keys/
      people.keys.ts
      web3-activities.keys.ts
    people.queries.ts
    web3-activities.queries.ts
  components/
    people-table/
      index.ts
      people-table.container.tsx
      people-table.tsx
      people-table-columns.tsx
      people-table-view.tsx
    web3-activities-table/
      index.ts
      web3-activities-table.container.tsx
      web3-activities-table.tsx
      web3-activities-table-columns.tsx
      web3-activities-table-view.tsx
```

这个结构的重点不是“文件多”，而是边界清楚。

每一层负责什么：

- `lib/api-client.ts`：公共请求封装。
- `types/`：接口类型、业务实体类型。
- `services/`：具体 API 请求函数，比如 `getPeople`、`getWeb3Activities`。
- `queries/query-keys/`：统一管理 query key，避免字符串散落在组件里。
- `queries/*.queries.ts`：封装 React Query 的 `queryOptions` 和 custom hook。
- `*.container.tsx`：消费 query，处理 loading、error，把数据传给表格组件。
- `*-table.tsx`：创建 TanStack Table 实例。
- `*-columns.tsx`：定义列。
- `*-view.tsx`：只负责 shadcn/ui 表格渲染。

这套拆法在项目初期看起来比一个文件复杂，但到了要加分页、排序、筛选、行操作时，优势会非常明显。

---

## 5. 请求层：先封装 apiClient

不要在组件里直接写：

```ts
fetch("http://localhost:4000/api/table-demo/activities")
```

这样后面换 `baseURL`、加 header、处理错误都会散落在各个组件里。

我们先写一个简单的 `apiClient`：

```ts
// src/lib/api-client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function apiClient<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  if (!API_BASE_URL) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }

  return response.json() as Promise<TResponse>
}
```

`.env.local` 里配置：

```txt
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

这个封装很简单，但已经把请求入口统一起来了。后续你要加 token、统一错误结构、请求日志，都可以从这里切入。

---

## 6. 类型层：不要让组件自己猜数据结构

`people` 类型：

```ts
// src/types/people.types.ts
export type Person = {
  id: string
  firstName: string
  lastName: string
  age: number
  visits: number
  status: "In Relationship" | "Single" | "Complicated"
  progress: number
}

export type PeopleResponse = {
  data: Person[]
}
```

Web3 activities 类型：

```ts
// src/types/web3-activities.types.ts
export type Web3TableActivity = {
  id: string
  requestId: string
  chain: string
  protocol: string
  eventType: string
  status: "queued" | "processing" | "succeeded" | "failed" | "cancelled"
  walletAddress: string
  walletTag: string
  txHash: string
  blockNumber: number
  assetIn: string
  assetOut: string
  amountIn: number
  usdValue: number
  gasUsd: number
  slippageBps: number
  riskLevel: "low" | "medium" | "high" | "critical"
  riskScore: number
  region: string
  teamOwner: string
  createdAt: string
  updatedAt: string
  retryCount: number
  confirmationCount: number
  notes: string
}

export type Web3ActivitiesResponse = {
  data: Web3TableActivity[]
  meta: {
    total: number
    scenario: string
    generatedAt: string
  }
}
```

这里的关键是：类型不属于组件，也不属于 query，它属于业务数据本身。

后续表格、详情页、弹窗、筛选器都可以复用这些类型。

---

## 7. Service 层：请求函数和组件解耦

`people` 请求：

```ts
// src/services/people.service.ts
import { apiClient } from "@/lib/api-client"
import type { PeopleResponse } from "@/types/people.types"

export function getPeople() {
  return apiClient<PeopleResponse>("/api/table-demo/people")
}
```

`activities` 请求：

```ts
// src/services/web3-activities.service.ts
import { apiClient } from "@/lib/api-client"
import type { Web3ActivitiesResponse } from "@/types/web3-activities.types"

export function getWeb3Activities() {
  return apiClient<Web3ActivitiesResponse>("/api/table-demo/activities")
}
```

service 层不关心 React，不关心组件，不关心 TanStack Table。它只负责一件事：调用接口并返回数据。

---

## 8. Query Key：缓存边界必须统一管理

很多项目 React Query 用得混乱，就是因为 query key 到处硬编码。

比如组件 A 写：

```ts
["activities"]
```

组件 B 写：

```ts
["web3-activities"]
```

mutation 成功后又写：

```ts
invalidateQueries({ queryKey: ["activity-list"] })
```

这些 key 看起来都像一个东西，但 React Query 认为它们完全不同。结果就是缓存不刷新、页面数据不同步、bug 很难查。

所以 query key 必须集中管理。

`people`：

```ts
// src/queries/query-keys/people.keys.ts
export const peopleKeys = {
  all: ["people"] as const,
  lists: () => [...peopleKeys.all, "list"] as const,
}
```

`activities`：

```ts
// src/queries/query-keys/web3-activities.keys.ts
export const web3ActivitiesKeys = {
  all: ["web3-activities"] as const,
  lists: () => [...web3ActivitiesKeys.all, "list"] as const,
}
```

如果后面要分页，query key 还要带上参数。

---

## 9. Query 层：封装 queryOptions 和 custom hook

`people` query：

```ts
// src/queries/people.queries.ts
import { queryOptions, useQuery } from "@tanstack/react-query"
import { peopleKeys } from "@/queries/query-keys/people.keys"
import { getPeople } from "@/services/people.service"

export function peopleQueryOptions() {
  return queryOptions({
    queryKey: peopleKeys.lists(),
    queryFn: getPeople,
  })
}

export function usePeopleQuery() {
  return useQuery(peopleQueryOptions())
}
```

`activities` query：

```ts
// src/queries/web3-activities.queries.ts
import { queryOptions, useQuery } from "@tanstack/react-query"
import { web3ActivitiesKeys } from "@/queries/query-keys/web3-activities.keys"
import { getWeb3Activities } from "@/services/web3-activities.service"

export function web3ActivitiesQueryOptions() {
  return queryOptions({
    queryKey: web3ActivitiesKeys.lists(),
    queryFn: getWeb3Activities,
  })
}

export function useWeb3ActivitiesQuery() {
  return useQuery(web3ActivitiesQueryOptions())
}
```

这里有一个细节：为什么不直接在组件里写 `useQuery`？

因为真实项目里 query 配置经常会复用：

- 页面组件里 `useQuery`。
- 路由 loader 或 server 侧做 prefetch。
- mutation 成功后 invalidate。
- hover 某个入口时预加载。
- 详情页跳转前提前拉数据。

把 `queryOptions` 抽出来，比只封装 custom hook 更灵活。

---

## 10. 全局接入 QueryClientProvider

React Query 需要全局 Provider。

```tsx
// src/app/providers.tsx
"use client"

import * as React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

`layout.tsx` 中使用：

```tsx
// src/app/layout.tsx
import type { Metadata } from "next"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "TanStack Table Demo",
  description: "TanStack Table + React Query + shadcn/ui demo",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

这里注意一点：`QueryClient` 不要每次 render 都重新 `new`。用 `useState(() => new QueryClient())` 是为了保证它在客户端生命周期里稳定。

---

## 11. 表格组件怎么拆

我们以 Web3 activities 表格为例。

目录如下：

```txt
components/
  web3-activities-table/
    index.ts
    web3-activities-table.container.tsx
    web3-activities-table.tsx
    web3-activities-table-columns.tsx
    web3-activities-table-view.tsx
```

这几个文件分别负责不同事情。

`index.ts`：模块出口。

```ts
// src/components/web3-activities-table/index.ts
export { Web3ActivitiesTableContainer } from "./web3-activities-table.container"
```

这样页面里可以这样引入：

```ts
import { Web3ActivitiesTableContainer } from "@/components/web3-activities-table"
```

而不是引入很长路径。

---

## 12. Container：只负责消费 query

```tsx
// src/components/web3-activities-table/web3-activities-table.container.tsx
"use client"

import { Web3ActivitiesTable } from "./web3-activities-table"
import { useWeb3ActivitiesQuery } from "@/queries/web3-activities.queries"

export function Web3ActivitiesTableContainer() {
  const activitiesQuery = useWeb3ActivitiesQuery()

  if (activitiesQuery.isPending) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">
        Loading Web3 activities...
      </div>
    )
  }

  if (activitiesQuery.isError) {
    return (
      <div className="rounded-md border border-destructive/40 p-6 text-sm text-destructive">
        {activitiesQuery.error.message}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Total activities:{" "}
        <span className="font-medium text-foreground">
          {activitiesQuery.data.meta.total}
        </span>
      </div>

      <Web3ActivitiesTable data={activitiesQuery.data.data} />
    </div>
  )
}
```

这个组件不定义 columns，不创建 table，不写 `<TableCell>`。

它只做三件事：

1. 调用 `useWeb3ActivitiesQuery`。
2. 处理 loading / error。
3. 成功后把数据传给 `Web3ActivitiesTable`。

这是典型的容器组件职责。

---

## 13. Table：只负责创建 TanStack Table 实例

```tsx
// src/components/web3-activities-table/web3-activities-table.tsx
"use client"

import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { web3ActivitiesTableColumns } from "./web3-activities-table-columns"
import { Web3ActivitiesTableView } from "./web3-activities-table-view"
import type { Web3TableActivity } from "@/types/web3-activities.types"

type Web3ActivitiesTableProps = {
  data: Web3TableActivity[]
}

export function Web3ActivitiesTable({ data }: Web3ActivitiesTableProps) {
  const table = useReactTable({
    data,
    columns: web3ActivitiesTableColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Web3ActivitiesTableView
      table={table}
      columnCount={web3ActivitiesTableColumns.length}
    />
  )
}
```

这个文件是 TanStack Table 的核心配置层。

后面要加：

- sorting
- pagination
- row selection
- column visibility
- column resizing
- manualPagination

主要都在这里改。

---

## 14. Columns：只负责列配置

```tsx
// src/components/web3-activities-table/web3-activities-table-columns.tsx
import { createColumnHelper } from "@tanstack/react-table"
import type { Web3TableActivity } from "@/types/web3-activities.types"

const columnHelper = createColumnHelper<Web3TableActivity>()

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export const web3ActivitiesTableColumns = [
  columnHelper.accessor("id", {
    header: "Activity ID",
    cell: info => <span className="font-mono text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: info => (
      <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("chain", {
    header: "Chain",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("protocol", {
    header: "Protocol",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("eventType", {
    header: "Event",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("walletAddress", {
    header: "Wallet",
    cell: info => (
      <span className="font-mono text-xs">{formatAddress(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("txHash", {
    header: "Tx Hash",
    cell: info => (
      <span className="font-mono text-xs">{formatAddress(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("blockNumber", {
    header: "Block",
    cell: info => formatNumber(info.getValue()),
  }),
  columnHelper.accessor("assetIn", {
    header: "Asset In",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("assetOut", {
    header: "Asset Out",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("amountIn", {
    header: "Amount In",
    cell: info => formatNumber(info.getValue()),
  }),
  columnHelper.accessor("usdValue", {
    header: "USD Value",
    cell: info => formatUsd(info.getValue()),
  }),
  columnHelper.accessor("gasUsd", {
    header: "Gas",
    cell: info => formatUsd(info.getValue()),
  }),
  columnHelper.accessor("riskLevel", {
    header: "Risk",
    cell: info => (
      <span className="rounded-full border px-2 py-0.5 text-xs font-medium">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("region", {
    header: "Region",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("teamOwner", {
    header: "Owner",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("createdAt", {
    header: "Created",
    cell: info => new Date(info.getValue()).toLocaleString(),
  }),
]
```

如果以后要新增一列、格式化金额、加操作按钮、加状态徽标，主要改这个文件。

比如新增操作列：

```tsx
columnHelper.display({
  id: "actions",
  header: "Actions",
  cell: ({ row }) => {
    const activity = row.original

    return <button onClick={() => console.log(activity.id)}>View</button>
  },
})
```

这就是列配置层的职责。

---

## 15. View：只负责 shadcn/ui 渲染

```tsx
// src/components/web3-activities-table/web3-activities-table-view.tsx
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@web3-frontend-labs/ui/components/table"
import type { Web3TableActivity } from "@/types/web3-activities.types"

type Web3ActivitiesTableViewProps = {
  table: TanStackTable<Web3TableActivity>
  columnCount: number
}

export function Web3ActivitiesTableView({
  table,
  columnCount,
}: Web3ActivitiesTableViewProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id} className="whitespace-nowrap">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map(row => (
              <TableRow key={row.id} className="hover:bg-muted/50">
                {row.getVisibleCells().map(cell => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                No activities found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          {table.getFooterGroups().map(footerGroup => (
            <TableRow key={footerGroup.id}>
              {footerGroup.headers.map(header => (
                <TableCell key={header.id} className="whitespace-nowrap font-normal">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.footer, header.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableFooter>
      </Table>
    </div>
  )
}
```

这个文件不应该知道接口 URL，不应该知道 query key，不应该知道 loading/error。它只拿到 TanStack Table 实例，然后渲染成 shadcn/ui 的表格。

这是 UI 层的边界。

---

## 16. 页面只组合模块

最后页面会变得很干净：

```tsx
// src/app/page.tsx
import { PeopleTableContainer } from "@/components/people-table"
import { Web3ActivitiesTableContainer } from "@/components/web3-activities-table"

export default function Page() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 p-6">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          TanStack Table Lab
        </h1>
        <p className="text-sm text-muted-foreground">
          Testing TanStack Table with React Query and shared shadcn/ui components.
        </p>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">People Table</h2>
          <p className="text-sm text-muted-foreground">
            Small table for basic table structure and query state.
          </p>
        </div>
        <PeopleTableContainer />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Web3 Activities Table
          </h2>
          <p className="text-sm text-muted-foreground">
            Wider activity dataset for testing table rendering and horizontal scrolling.
          </p>
        </div>
        <Web3ActivitiesTableContainer />
      </section>
    </main>
  )
}
```

页面不直接写请求，不直接写 columns，也不直接写 TanStack Table 逻辑。

这就是分层的价值。

---

## 17. 为什么这种拆分更适合维护

可以用一句话概括：

```txt
拿数据：container
建表格：table
配列：columns
画 UI：view
```

这样之后改需求时会非常明确。

- 如果要改接口地址，改 service。
- 如果要改缓存 key，改 query-keys。
- 如果要改 loading/error，改 container。
- 如果要加一列，改 columns。
- 如果要加分页、排序、行选择，改 table。
- 如果要改表格外观，改 view。

这比一个组件里混着 300 行代码要好维护得多。

---

## 18. 接下来加入服务端分页

当数据量变大时，一次返回全部数据不是好方案。即使现在只有 500 条，也应该练习服务端分页，因为真实业务里通常是几千、几万、几十万条数据。

目标接口：

```txt
GET /api/table-demo/activities?page=1&pageSize=20
```

后端返回：

```json
{
  "data": [],
  "meta": {
    "total": 500,
    "page": 1,
    "pageSize": 20,
    "pageCount": 25,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}
```

---

## 19. 后端支持分页

修改 `/activities`：

```ts
// backend/src/modules/table-demo/table-demo.routes.ts
tableDemoRoutes.get("/activities", (req, res) => {
  const page = Math.max(Number(req.query.page ?? 1), 1)
  const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 20), 1), 100)
  const total = web3TableActivities.length
  const pageCount = Math.ceil(total / pageSize)
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const data = web3TableActivities.slice(start, end)

  res.json({
    data,
    meta: {
      ...web3TableActivityMeta,
      total,
      page,
      pageSize,
      pageCount,
      hasPreviousPage: page > 1,
      hasNextPage: page < pageCount,
    },
  })
})
```

这里后端使用的是 1-based page，也就是第一页是 `page=1`。

但是 TanStack Table 的 `pageIndex` 是 0-based，也就是第一页是 `pageIndex=0`。

所以前端请求时要做转换：

```ts
page: pagination.pageIndex + 1
```

---

## 20. 前端类型加入分页参数

```ts
// src/types/web3-activities.types.ts
export type Web3ActivitiesListParams = {
  page: number
  pageSize: number
}

export type Web3ActivitiesResponse = {
  data: Web3TableActivity[]
  meta: {
    total: number
    page: number
    pageSize: number
    pageCount: number
    hasPreviousPage: boolean
    hasNextPage: boolean
    scenario: string
    generatedAt: string
  }
}
```

影响请求结果的参数，要进入类型，也要进入 query key。

---

## 21. Service 接收分页参数

```ts
// src/services/web3-activities.service.ts
import { apiClient } from "@/lib/api-client"
import type {
  Web3ActivitiesListParams,
  Web3ActivitiesResponse,
} from "@/types/web3-activities.types"

export function getWeb3Activities(params: Web3ActivitiesListParams) {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  })

  return apiClient<Web3ActivitiesResponse>(
    `/api/table-demo/activities?${searchParams.toString()}`,
  )
}
```

service 不负责保存分页状态，它只负责根据参数请求数据。

---

## 22. Query Key 必须带分页参数

分页参数会影响返回数据，所以必须放进 query key。

```ts
// src/queries/query-keys/web3-activities.keys.ts
import type { Web3ActivitiesListParams } from "@/types/web3-activities.types"

export const web3ActivitiesKeys = {
  all: ["web3-activities"] as const,
  lists: () => [...web3ActivitiesKeys.all, "list"] as const,
  list: (params: Web3ActivitiesListParams) =>
    [...web3ActivitiesKeys.lists(), params] as const,
}
```

这样：

```ts
web3ActivitiesKeys.list({ page: 1, pageSize: 20 })
web3ActivitiesKeys.list({ page: 2, pageSize: 20 })
```

是两份不同缓存。

这很重要。如果分页参数不进入 query key，React Query 可能会认为不同页是同一个数据源，导致缓存错乱。

---

## 23. Query Hook 接收分页参数

```ts
// src/queries/web3-activities.queries.ts
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query"
import { web3ActivitiesKeys } from "@/queries/query-keys/web3-activities.keys"
import { getWeb3Activities } from "@/services/web3-activities.service"
import type { Web3ActivitiesListParams } from "@/types/web3-activities.types"

export function web3ActivitiesQueryOptions(params: Web3ActivitiesListParams) {
  return queryOptions({
    queryKey: web3ActivitiesKeys.list(params),
    queryFn: () => getWeb3Activities(params),
    placeholderData: keepPreviousData,
  })
}

export function useWeb3ActivitiesQuery(params: Web3ActivitiesListParams) {
  return useQuery(web3ActivitiesQueryOptions(params))
}
```

`placeholderData: keepPreviousData` 的作用是：切换页码时，新一页数据还没回来之前，先保留上一页数据，避免表格闪成 loading 空白。

这个体验在分页表格里很重要。

---

## 24. Container 管理分页状态

分页状态应该放哪里？

因为分页状态会影响 query，所以它适合放在 container。

```tsx
// src/components/web3-activities-table/web3-activities-table.container.tsx
"use client"

import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"
import { Web3ActivitiesTable } from "./web3-activities-table"
import { useWeb3ActivitiesQuery } from "@/queries/web3-activities.queries"

export function Web3ActivitiesTableContainer() {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })

  const activitiesQuery = useWeb3ActivitiesQuery({
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  })

  if (activitiesQuery.isPending) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">
        Loading Web3 activities...
      </div>
    )
  }

  if (activitiesQuery.isError) {
    return (
      <div className="rounded-md border border-destructive/40 p-6 text-sm text-destructive">
        {activitiesQuery.error.message}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <div>
          Total activities:{" "}
          <span className="font-medium text-foreground">
            {activitiesQuery.data.meta.total}
          </span>
        </div>
        {activitiesQuery.isFetching ? <div>Updating...</div> : null}
      </div>

      <Web3ActivitiesTable
        data={activitiesQuery.data.data}
        rowCount={activitiesQuery.data.meta.total}
        pagination={pagination}
        onPaginationChange={setPagination}
      />
    </div>
  )
}
```

这里的数据流是：

```txt
用户点击下一页
  -> TanStack Table 调用 onPaginationChange
  -> pagination.pageIndex 更新
  -> useWeb3ActivitiesQuery 参数变化
  -> queryKey 变化
  -> React Query 请求新页数据
  -> 表格重新渲染
```

---

## 25. Table 开启 manualPagination

服务端分页时，TanStack Table 不应该自己 slice 数据。因为后端已经只返回当前页了。

所以要开启 `manualPagination`：

```tsx
// src/components/web3-activities-table/web3-activities-table.tsx
"use client"

import {
  getCoreRowModel,
  type OnChangeFn,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table"
import { web3ActivitiesTableColumns } from "./web3-activities-table-columns"
import { Web3ActivitiesTableView } from "./web3-activities-table-view"
import type { Web3TableActivity } from "@/types/web3-activities.types"

type Web3ActivitiesTableProps = {
  data: Web3TableActivity[]
  rowCount: number
  pagination: PaginationState
  onPaginationChange: OnChangeFn<PaginationState>
}

export function Web3ActivitiesTable({
  data,
  rowCount,
  pagination,
  onPaginationChange,
}: Web3ActivitiesTableProps) {
  const table = useReactTable({
    data,
    columns: web3ActivitiesTableColumns,
    rowCount,
    state: {
      pagination,
    },
    onPaginationChange,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Web3ActivitiesTableView
      table={table}
      columnCount={web3ActivitiesTableColumns.length}
    />
  )
}
```

这里最关键的是：

- `manualPagination: true`
- `rowCount`
- `state: { pagination }`
- `onPaginationChange`

`rowCount` 告诉 TanStack Table 总共有多少行，它才能计算总页数。

---

## 26. View 层添加分页按钮

最后，在 view 层加分页按钮。

```tsx
// src/components/web3-activities-table/web3-activities-table-view.tsx
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@web3-frontend-labs/ui/components/table"
import type { Web3TableActivity } from "@/types/web3-activities.types"

type Web3ActivitiesTableViewProps = {
  table: TanStackTable<Web3TableActivity>
  columnCount: number
}

export function Web3ActivitiesTableView({
  table,
  columnCount,
}: Web3ActivitiesTableViewProps) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className="hover:bg-muted/50">
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center">
                  No activities found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            {table.getFooterGroups().map(footerGroup => (
              <TableRow key={footerGroup.id}>
                {footerGroup.headers.map(header => (
                  <TableCell key={header.id} className="whitespace-nowrap font-normal">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.footer, header.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableFooter>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Page{" "}
          <span className="font-medium text-foreground">
            {table.getState().pagination.pageIndex + 1}
          </span>{" "}
          of{" "}
          <span className="font-medium text-foreground">
            {table.getPageCount()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="rounded-md border px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
```

这里 view 层只是调用：

```ts
table.previousPage()
table.nextPage()
table.getCanPreviousPage()
table.getCanNextPage()
```

它不关心请求逻辑，也不关心 query key。

---

## 27. 大数据表格优化：分页和虚拟滚动

到这里，`People Table` 和 `Web3 Activities Table` 已经把一个可维护表格模块的基础结构跑通了：后端 mock、`apiClient`、service、query key、query options、container、table、columns、view，以及服务端分页。

但前面的数据量还不算大。真实项目里，如果遇到审计日志、交易流水、订单明细、监控事件、消息流这类数据，数据可能有几千条甚至更多。这个时候只靠普通表格渲染，很容易遇到首屏慢、滚动卡顿、浏览器内存压力变大的问题。

大数据表格常见有两种处理方式：

1. 分页 pagination。
2. 虚拟滚动 virtual scrolling / virtualization。

它们解决的问题不一样。

分页解决的是：

- 一次请求多少数据。
- 网络传输量。
- 后端查询压力。
- 前端内存中的数据规模。

虚拟滚动解决的是：

- 一次渲染多少 DOM。
- 首屏渲染压力。
- 滚动卡顿。
- 大量 `tr` / `td` 节点造成的浏览器压力。

一句话概括：分页控制“数据量”，虚拟滚动控制“DOM 数量”。两者不是互斥关系，可以单独用，也可以组合使用。

---

## 28. 分页解决什么问题

服务端分页适合真实业务里的订单列表、用户列表、交易记录、资金流水、审计日志等。

典型接口是：

```txt
GET /api/table-demo/activities?page=1&pageSize=20
```

返回：

```ts
{
  data: Web3TableActivity[],
  meta: {
    total: 500,
    page: 1,
    pageSize: 20,
    pageCount: 25,
    hasPreviousPage: false,
    hasNextPage: true
  }
}
```

前端只拿当前页数据。因为 `page` 和 `pageSize` 会影响接口返回结果，所以 React Query 的 `queryKey` 必须带分页参数：

```ts
web3ActivitiesKeys.list({
  page,
  pageSize,
})
```

TanStack Table 使用服务端分页时，核心配置是：

```ts
manualPagination: true
rowCount
state: { pagination }
onPaginationChange
```

这里还有一个很容易踩的点：TanStack Table 的 `pageIndex` 是从 0 开始，后端接口常见 `page` 是从 1 开始，所以请求时要转换：

```ts
page: pagination.pageIndex + 1
```

分页的价值是让后端和前端都只处理当前需要的那一段数据。它控制的是数据规模，而不是 DOM 数量。如果一页只展示 20 或 50 行，普通表格渲染通常就足够了。

---

## 29. 虚拟滚动解决什么问题

如果一次性渲染 5000 行，每行 15 列，那么 DOM 节点数量会非常大：

```txt
5000 行 × 15 列 = 75000 个单元格
```

这会导致：

- 首屏慢。
- 滚动卡顿。
- 浏览器内存压力大。
- cell 里如果有 badge、button、dropdown、tooltip，成本更高。

虚拟滚动的核心思想是：

```txt
数据可以有 5000 条，但页面只渲染当前可见区域附近的几十条。
```

`@tanstack/react-virtual` 的作用就是把这件事抽象出来：

- 根据滚动容器计算当前可见行。
- 只渲染 virtual rows。
- 用总高度撑开滚动区域。
- 用 `transform` 把可见行移动到正确位置。

也就是说，用户感觉自己在滚动完整的 5000 行数据，但浏览器实际同时存在的 DOM 行数可能只有几十行。

---

## 30. 新增 Audit Logs Virtual Table 场景

为了把虚拟滚动放到更真实的业务语境里，可以新增一个 `Audit Logs Virtual Table`。

它模拟的是系统审计日志 / 操作事件流，字段包括：

- `id`
- `timestamp`
- `eventType`
- `severity`
- `status`
- `actor`
- `team`
- `environment`
- `region`
- `resourceType`
- `resourceId`
- `requestId`
- `sessionId`
- `ipAddress`
- `method`
- `path`
- `httpStatus`
- `durationMs`
- `retryCount`
- `message`

这个场景比普通列表更适合展示虚拟滚动：

- 日志数据量通常很大。
- 用户经常连续滚动查看。
- 每行字段较多。
- 一次性渲染所有 DOM 性能不好。
- 比普通分页更适合观察滚动性能。

这里要注意，审计日志表不一定要替代前面的 Web3 activities 表。它是另一个更偏性能验证的场景：前面的表格用于讲请求、缓存、分层和分页；审计日志表用于讲大量行渲染时的 DOM 压力。

---

## 31. 后端新增 audit logs 接口

后端可以新增一个审计日志数据源：

```ts
import { auditLogEvents, auditLogMeta } from "./audit-log.data"

tableDemoRoutes.get("/audit-logs", (_req, res) => {
  res.json({
    data: auditLogEvents,
    meta: auditLogMeta,
  })
})
```

这里为了研究虚拟滚动，故意一次性返回 5000 条数据。这样前端能明确看到：如果普通渲染 5000 行会很重，而虚拟滚动只渲染可见区域附近的行。

真实项目里不一定要一次性返回 5000 条。更常见的做法是结合 cursor pagination 或 infinite query：用户滚动到底部时继续请求下一批日志，同时用 virtual list 控制 DOM 数量。

---

## 32. 前端新增 audit logs 分层结构

新增审计日志表时，仍然沿用前面的分层方式：

```txt
src/
  types/
    audit-logs.types.ts
  services/
    audit-logs.service.ts
  queries/
    query-keys/
      audit-logs.keys.ts
    audit-logs.queries.ts
  components/
    audit-logs-table/
      index.ts
      audit-logs-table.container.tsx
      audit-logs-table.tsx
      audit-logs-table-columns.tsx
      audit-logs-table-view.tsx
```

每个文件的职责保持清楚：

- `audit-logs.types.ts`：定义 `AuditLogEvent` 和 `AuditLogsResponse`。
- `audit-logs.service.ts`：请求 `/api/table-demo/audit-logs`。
- `audit-logs.keys.ts`：统一管理 query key。
- `audit-logs.queries.ts`：封装 `queryOptions` 和 `useAuditLogsQuery`。
- `audit-logs-table.container.tsx`：消费 query，处理 loading / error。
- `audit-logs-table.tsx`：创建 TanStack Table 实例。
- `audit-logs-table-columns.tsx`：定义审计日志列。
- `audit-logs-table-view.tsx`：使用 shadcn/ui Table + `@tanstack/react-virtual` 渲染虚拟列表。

这个结构说明了一个重要原则：即使表格渲染方式从普通表格变成虚拟滚动，请求层、query 层、container 层、columns 层也不需要混在一起。变化主要集中在 view 层。

---

## 33. 核心虚拟滚动代码

下面是一个简化版 `AuditLogsTableView`。重点不是完整列配置，而是虚拟滚动的渲染逻辑：

```tsx
"use client"

import * as React from "react"
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table"
import { useVirtualizer } from "@tanstack/react-virtual"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@web3-frontend-labs/ui/components/table"
import type { AuditLogEvent } from "@/types/audit-logs.types"

type AuditLogsTableViewProps = {
  table: TanStackTable<AuditLogEvent>
  columnCount: number
}

export function AuditLogsTableView({
  table,
  columnCount,
}: AuditLogsTableViewProps) {
  const parentRef = React.useRef<HTMLDivElement | null>(null)
  const rows = table.getRowModel().rows

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  })

  const virtualRows = rowVirtualizer.getVirtualItems()
  const totalSize = rowVirtualizer.getTotalSize()

  return (
    <div className="space-y-3">
      <div ref={parentRef} className="h-[600px] overflow-auto rounded-md border">
        <div style={{ height: `${totalSize}px` }}>
          <Table className="relative">
            <TableHeader className="sticky top-0 z-10 bg-background">
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {virtualRows.length ? (
                virtualRows.map(virtualRow => {
                  const row = rows[virtualRow.index]
                  if (!row) {
                    return null
                  }

                  return (
                    <TableRow
                      key={row.id}
                      className="absolute left-0 flex w-full hover:bg-muted/50"
                      style={{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.getVisibleCells().map(cell => (
                        <TableCell
                          key={cell.id}
                          className="flex min-w-[160px] items-center whitespace-nowrap"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columnCount} className="h-24 text-center">
                    No audit logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Rendering {virtualRows.length} visible rows out of {rows.length} rows.
      </div>
    </div>
  )
}
```

这段代码里有几个关键点。

`parentRef` 是滚动容器。`useVirtualizer` 需要通过它知道当前滚动位置。

`count` 是总行数。这里使用 `rows.length`，也就是 TanStack Table 当前 row model 里的行数。

`estimateSize` 是每一行的估算高度。虚拟滚动依赖这个值计算总高度和可见区域。如果行高变化很大，就需要更谨慎处理动态测量。

`overscan` 表示在可见区域之外额外渲染几行。它可以避免用户快速滚动时出现短暂白屏，但 overscan 太大也会增加 DOM 数量。

`getVirtualItems()` 返回当前应该渲染的行。页面不是 map 全部 `rows`，而是 map `virtualRows`。

`getTotalSize()` 返回所有行的总高度。外层 `div` 用这个高度撑开滚动条，让用户感觉自己在滚动完整列表。

每个可见行用 `transform: translateY(...)` 放到正确位置。这样实际 DOM 只渲染几十行，而不是 5000 行。

这里使用 shadcn/ui 的 `Table` 组件，但虚拟滚动时为了定位行，`TableRow` 使用了 `absolute` 和 `flex`。这说明虚拟滚动不是简单给普通表格加一个 hook，它会影响布局模型，尤其是列宽、sticky header、横向滚动和语义化 table 的取舍。

---

## 34. 分页和虚拟滚动怎么选择

前端分页适合数据量小、一次加载无压力、本地 mock、配置类表格这类场景。比如系统配置、枚举字典、少量团队成员列表，直接拿完整数据再本地分页就可以。

服务端分页适合订单、用户、交易记录、资金流水这类数据。它们通常数据量大，需要服务端筛选、排序、权限控制，也需要控制接口响应大小。后台管理系统里最常见的方案就是服务端分页 + 普通表格。

虚拟滚动适合日志流、消息流、交易流水、监控事件这类需要连续滚动浏览的场景。它的前提通常是前端已经加载了较多数据，或者通过 infinite query 逐步加载数据，但不希望一次性渲染所有 DOM。

这几种组合都合理：

- 服务端分页 + 普通表格：最常见后台管理方案。
- 前端一次加载 + 虚拟滚动：适合 demo、日志快照、客户端侧分析。
- cursor pagination + infinite query + virtual list：适合消息流、日志流、行情流等连续加载场景。

所以不要把虚拟滚动理解成分页的替代品。分页解决数据获取规模，虚拟滚动解决 DOM 渲染规模。数据少时普通表格更简单；数据多但每次只看一页时，服务端分页通常够用；数据多且需要连续滚动时，才更适合引入虚拟滚动。

---

## 35. 错误处理、重试和缓存同步

真实项目里，表格不是只要成功状态。

### loading 和 error 不要散落在所有表格里

最简单写法是每个组件都写：

```tsx
if (query.isPending) return <div>Loading...</div>
if (query.isError) return <div>{query.error.message}</div>
```

这没问题，但如果项目有很多表格，可以进一步封装通用的 `QueryStateBoundary`。

不过在当前 demo 里，我们先让 container 负责 loading/error，是比较合适的边界。

### retry 不要无脑开启

在 `QueryClient` 里配置：

```ts
retry: 1
```

对于临时网络波动，重试一次可以接受。但如果是 401、403、参数错误，重试没有意义。

后续可以根据错误类型更细地控制：

```ts
retry: (failureCount, error) => {
  if (failureCount >= 1) return false
  return true
}
```

### mutation 成功后要 invalidate

当前是列表查询，没有 mutation。真实业务里如果新增、删除、更新 activity，成功后应该：

```ts
queryClient.invalidateQueries({
  queryKey: web3ActivitiesKeys.lists(),
})
```

注意这里不要手写字符串：

```ts
queryClient.invalidateQueries({ queryKey: ["web3-activities"] })
```

统一使用 query key 工厂，后续改 key 结构时才不会散。

### 分页参数必须进入 queryKey

分页、筛选、排序都属于“影响接口返回结果的参数”。

所以这些参数必须进入 query key：

```ts
web3ActivitiesKeys.list({
  page,
  pageSize,
})
```

以后加排序可以扩展成：

```ts
type Web3ActivitiesListParams = {
  page: number
  pageSize: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
  status?: string
}
```

query key 也继续使用同一个 params：

```ts
list: (params: Web3ActivitiesListParams) =>
  [...web3ActivitiesKeys.lists(), params] as const
```

这样 React Query 才能正确区分不同查询结果。

---

## 36. 结合真实业务看这套结构

虽然示例用的是 Web3 activities，但这个结构不是 Web3 专属。

它也适合：

- 后台订单列表。
- 用户管理列表。
- 内容管理列表。
- 交易历史。
- 资金流水。
- 任务中心。
- 风控审核列表。
- 数据看板明细表。

比如一个订单系统，结构可能是：

```txt
types/orders.types.ts
services/orders.service.ts
queries/query-keys/orders.keys.ts
queries/orders.queries.ts
components/orders-table/
```

订单列表的分页、状态筛选、详情弹窗、取消订单、重新支付，都可以按同样思路拆。

组件不应该直接知道：

- 请求 URL。
- query key。
- 缓存失效规则。
- 接口响应结构细节。
- 服务端分页如何拼参数。

组件应该消费已经封装好的结果：

```ts
const ordersQuery = useOrdersQuery(params)
```

表格应该消费普通数据：

```tsx
<OrdersTable data={ordersQuery.data.data} />
```

这就是工程化落地里最重要的边界感。

---

## 37. 工程化注意事项

最后总结几个很容易踩坑的点。

第一，不要把请求逻辑写进 UI 组件。UI 组件应该尽量只做渲染。请求应该放在 service / query / container 里。

第二，queryKey 不要散落。所有 query key 都应该有工厂函数。分页、筛选、排序参数必须进入 query key。

第三，不要把 React Query 的数据复制进 Zustand 或普通全局 store。服务端数据已经在 React Query cache 里了。除非有明确理由，不要再复制一份，否则会出现双数据源不一致。

第四，TanStack Table 的 `data` 和 `columns` 要尽量稳定。columns 最好定义在组件外部或单独文件里，不要每次 render 都重新生成复杂 columns。

第五，服务端分页时要用 `manualPagination`。后端返回当前页数据，前端就不要再做本地 slice。TanStack Table 配置里要有：

```ts
manualPagination: true
rowCount
state: { pagination }
onPaginationChange
```

第六，`pageIndex` 和 `page` 不要搞混。TanStack Table 的 `pageIndex` 从 0 开始。后端接口通常 `page` 从 1 开始。

所以请求时要：

```ts
page: pagination.pageIndex + 1
```

第七，不要为了炫技一上来就用虚拟滚动。数据少时普通表格更简单；一页只有几十行时，服务端分页 + 普通表格通常已经够用。

第八，虚拟滚动需要固定或可预测的行高。动态行高、展开行、`rowspan`、sticky column 都会增加复杂度。横向滚动 + 虚拟行还要注意列宽一致性。

第九，shadcn/ui 是 UI 层，不要把业务逻辑塞进去。共享 UI 包里的 Table 组件应该保持通用。业务表格逻辑放在 app 内部的 `people-table`、`web3-activities-table`、`audit-logs-table` 这类模块里。

第十，shadcn/ui 的 Table 是语义化 table，但虚拟滚动时可能需要调整布局，例如 absolute row、flex cell。如果要保持完整 table 语义和复杂 sticky column，需要更谨慎设计。

第十一，React Query 的 queryKey 仍然要包含影响数据结果的参数。分页、筛选、排序、cursor、搜索词，只要会影响返回数据，就不应该漏掉。

第十二，分页和虚拟滚动解决的问题不同，不要混为一谈。分页控制数据量，虚拟滚动控制 DOM 数量。

---

## 38. 总结

这套方案的核心不是“用了几个流行库”，而是把边界拆清楚。

React Query 负责请求和缓存，TanStack Table 负责表格模型，shadcn/ui 负责 UI 组件。项目代码再按 service、query、container、table、columns、view 分层，后续加分页、排序、筛选、行操作时才不会牵一发动全身。

一个表格从简单展示变成真实业务模块，复杂度一定会上升。我们要做的不是避免复杂度，而是把复杂度放到它应该存在的位置。

如果只是写 demo，一个文件当然最快。但如果你希望这个 demo 以后还能继续扩展，比如服务端分页、Web3 activity 明细、交易状态、风险标记、行操作菜单、虚拟滚动，那么一开始就把数据请求、表格逻辑和 UI 渲染拆开，会让后面的每一步都更稳。

当数据量变大时，表格优化要同时考虑数据获取和 DOM 渲染。分页解决数据量，虚拟滚动解决渲染量。前者让接口和缓存更可控，后者让浏览器少渲染无意义的节点。把这两个边界分清楚，才能根据真实业务选择合适的表格方案。
