# 用 TanStack Table、React Query 和 shadcn/ui 搭一个可维护的数据表格架构

在前端项目里，表格是一个很容易被低估的模块。

最开始我们只是想把一组数据渲染出来：请求接口、拿到数组、`map` 成一行一行的表格。这个阶段写法非常简单，甚至几十行代码就能跑起来。

但真实项目里的表格通常不会停留在“展示数据”这一层。它很快会出现这些需求：

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

## 1. 这套组合分别解决什么问题

先明确这几个工具分别负责什么。

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

真实项目里最怕的不是代码不能跑，而是所有东西都能跑，但边界不清。边界不清的代码，后面加分页、排序、筛选、虚拟滚动时，维护成本会快速上升。

---

## 2. 安装依赖和项目准备

这套方案适用于普通 React 项目，也适用于 Next.js、Vite 等常见 React 工程。本文示例以单项目为主说明，安装命令也按照普通项目来写。

先安装 TanStack Table：

```bash
npm install @tanstack/react-table
```

安装 React Query：

```bash
npm install @tanstack/react-query
```

如果需要调试 query cache，可以安装 React Query Devtools：

```bash
npm install @tanstack/react-query-devtools
```

如果后续要研究虚拟滚动，再安装 TanStack Virtual：

```bash
npm install @tanstack/react-virtual
```

如果使用 shadcn/ui，可以先初始化 shadcn：

```bash
npx shadcn@latest init
```

然后安装表格组件：

```bash
npx shadcn@latest add table
```

如果后面要做行操作菜单，还可以安装：

```bash
npx shadcn@latest add button dropdown-menu
```

安装后，普通 React / Next.js 项目里通常这样导入 shadcn/ui 的 Table 组件：

```ts
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
```

也就是说，示例里的 UI 组件路径统一使用项目内路径 `@/components/ui/table`。如果你的项目给 shadcn/ui 配了不同 alias，再按自己的工程配置调整。

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
        table-demo.routes.ts
```

这里先准备一个最简单的数据源：

```txt
GET /api/table-demo/people
```

`people` 数据用来做一个基础表格。这个阶段不追求数据复杂，而是先把前后端链路和前端分层跑通。

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
```

mock 数据：

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

路由：

```ts
// backend/src/modules/table-demo/table-demo.routes.ts
import { Router } from "express"
import { people } from "./table-demo.data"

export const tableDemoRoutes = Router()

tableDemoRoutes.get("/people", (_req, res) => {
  res.json({
    data: people,
  })
})
```

这个后端非常简单，但已经足够支撑我们前端做数据请求、缓存、表格渲染和状态处理。

---

## 4. 最简单写法的问题

很多人一开始会这样写表格：组件里直接 fetch，然后把数据丢给 TanStack Table。

```tsx
"use client"

import * as React from "react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

type Person = {
  id: string
  firstName: string
  lastName: string
  age: number
}

const columnHelper = createColumnHelper<Person>()

const columns = [
  columnHelper.accessor("firstName", {
    header: "First Name",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("lastName", {
    header: "Last Name",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("age", {
    header: "Age",
    cell: info => info.getValue(),
  }),
]

export function PeopleTable() {
  const [data, setData] = React.useState<Person[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    fetch("http://localhost:4000/api/table-demo/people")
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

这段代码能跑，但问题也很明显：

- 组件里直接拼接口 URL。
- 请求、loading、error 都写在组件里。
- 没有统一 query key。
- columns 和 UI 渲染混在一起。
- 表格实例和页面布局混在一起。
- 后续加分页、排序、筛选时会越来越难改。
- 其他组件想复用请求逻辑时只能复制代码。

所以我们需要换一种写法：不是为了拆文件而拆文件，而是让每个文件只负责一件事。

---

## 5. 推荐的前端项目结构

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
  services/
    people.service.ts
  queries/
    query-keys/
      people.keys.ts
    people.queries.ts
  components/
    people-table/
      index.ts
      people-table.container.tsx
      people-table.tsx
      people-table-columns.tsx
      people-table-view.tsx
```

这个结构的重点不是“文件多”，而是边界清楚。

每一层负责什么：

- `lib/api-client.ts`：公共请求封装。
- `types/`：接口类型、业务实体类型。
- `services/`：具体 API 请求函数，比如 `getPeople`。
- `queries/query-keys/`：统一管理 query key，避免字符串散落在组件里。
- `queries/*.queries.ts`：封装 React Query 的 `queryOptions` 和 custom hook。
- `*.container.tsx`：消费 query，处理 loading、error，把数据传给表格组件。
- `*-table.tsx`：创建 TanStack Table 实例。
- `*-columns.tsx`：定义列。
- `*-view.tsx`：只负责 shadcn/ui 表格渲染。

这套拆法在项目初期看起来比一个文件复杂，但到了要加分页、排序、筛选、行操作时，优势会非常明显。

你以后维护时可以按这个规则找文件：

- 改接口：services。
- 改缓存 key：query-keys。
- 改 query 配置：queries。
- 改 loading / error：container。
- 改表格能力：table。
- 改列：columns。
- 改 UI 样式：view。

---

## 6. 请求层：封装 apiClient

不要在组件里直接写：

```ts
fetch("http://localhost:4000/api/table-demo/people")
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

维护建议：

- 如果要加鉴权 header，改这里。
- 如果要统一处理 401、403，改这里。
- 如果要把后端错误格式转换成前端错误格式，也改这里。
- 不要在每个组件里单独写一套 fetch 错误处理。

---

## 7. 类型层：不要让组件自己猜数据结构

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

这里的关键是：类型不属于组件，也不属于 query，它属于业务数据本身。

后续表格、详情页、弹窗、筛选器都可以复用这些类型。

维护建议：

- 如果接口字段变了，先改 types。
- 如果后端响应结构变了，比如多了 meta，也在这里改。
- 不要让组件里到处写临时类型。

---

## 8. Service 层：请求函数和组件解耦

```ts
// src/services/people.service.ts
import { apiClient } from "@/lib/api-client"
import type { PeopleResponse } from "@/types/people.types"

export function getPeople() {
  return apiClient<PeopleResponse>("/api/table-demo/people")
}
```

service 层不关心 React，不关心组件，不关心 TanStack Table。

它只负责一件事：调用接口并返回数据。

维护建议：

- 如果接口路径变了，改 service。
- 如果接口参数变了，改 service 的函数参数。
- 如果后续要加分页、筛选、排序，service 接收 params，然后拼 query string。
- 不要在 UI 组件里拼 URL。

---

## 9. Query Key：缓存边界必须统一管理

很多项目 React Query 用得混乱，就是因为 query key 到处硬编码。

比如组件 A 写：

```ts
["people"]
```

组件 B 写：

```ts
["person-list"]
```

mutation 成功后又写：

```ts
invalidateQueries({ queryKey: ["users"] })
```

这些 key 看起来都像一个东西，但 React Query 认为它们完全不同。结果就是缓存不刷新、页面数据不同步、bug 很难查。

所以 query key 必须集中管理。

```ts
// src/queries/query-keys/people.keys.ts
export const peopleKeys = {
  all: ["people"] as const,
  lists: () => [...peopleKeys.all, "list"] as const,
}
```

维护建议：

- 不要在组件里手写字符串 key。
- 列表、详情、筛选、分页都应该有清晰的 key 层级。
- 后续 mutation 成功后 invalidate，也使用这里的 key 工厂。

---

## 10. Query 层：封装 queryOptions 和 custom hook

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

这里有一个细节：为什么不直接在组件里写 `useQuery`？

因为真实项目里 query 配置经常会复用：

- 页面组件里 `useQuery`。
- 路由 loader 或 server 侧做 prefetch。
- mutation 成功后 invalidate。
- hover 某个入口时预加载。
- 详情页跳转前提前拉数据。

把 `queryOptions` 抽出来，比只封装 custom hook 更灵活。

维护建议：

- query 的 `staleTime`、`enabled`、`placeholderData` 等配置放这里。
- 组件只消费 `usePeopleQuery()`。
- 如果多个地方要 prefetch，也复用 `peopleQueryOptions()`。
- 不要在组件里重复写 `queryKey` 和 `queryFn`。

---

## 11. 全局接入 QueryClientProvider

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

## 12. People Table：基础表格分层

现在开始写基础表格。

目录：

```txt
components/
  people-table/
    index.ts
    people-table.container.tsx
    people-table.tsx
    people-table-columns.tsx
    people-table-view.tsx
```

这几个文件分别负责不同事情。

### index.ts：模块出口

```ts
// src/components/people-table/index.ts
export { PeopleTableContainer } from "./people-table.container"
```

这样页面里可以写：

```ts
import { PeopleTableContainer } from "@/components/people-table"
```

而不是写很长的路径。

### container：只负责消费 query

```tsx
// src/components/people-table/people-table.container.tsx
"use client"

import { PeopleTable } from "./people-table"
import { usePeopleQuery } from "@/queries/people.queries"

export function PeopleTableContainer() {
  const peopleQuery = usePeopleQuery()

  if (peopleQuery.isPending) {
    return (
      <div className="rounded-md border p-6 text-sm text-muted-foreground">
        Loading people...
      </div>
    )
  }

  if (peopleQuery.isError) {
    return (
      <div className="rounded-md border border-destructive/40 p-6 text-sm text-destructive">
        {peopleQuery.error.message}
      </div>
    )
  }

  return <PeopleTable data={peopleQuery.data.data} />
}
```

这个组件不定义 columns，不创建 table，不写 `<TableCell>`。

它只做三件事：

1. 调用 `usePeopleQuery`。
2. 处理 loading / error。
3. 成功后把数据传给 `PeopleTable`。

后续如果 loading 样式要换，或者错误展示要统一，就改这个文件。

### table：只负责创建 TanStack Table 实例

```tsx
// src/components/people-table/people-table.tsx
"use client"

import { getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { peopleTableColumns } from "./people-table-columns"
import { PeopleTableView } from "./people-table-view"
import type { Person } from "@/types/people.types"

type PeopleTableProps = {
  data: Person[]
}

export function PeopleTable({ data }: PeopleTableProps) {
  const table = useReactTable({
    data,
    columns: peopleTableColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <PeopleTableView table={table} columnCount={peopleTableColumns.length} />
  )
}
```

这个文件是 TanStack Table 的配置层。

后续要加 sorting、pagination、row selection、column visibility，主要都在这里改。

### columns：只负责列配置

```tsx
// src/components/people-table/people-table-columns.tsx
import { createColumnHelper } from "@tanstack/react-table"
import type { Person } from "@/types/people.types"

const columnHelper = createColumnHelper<Person>()

export const peopleTableColumns = [
  columnHelper.accessor("firstName", {
    header: "First Name",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("lastName", {
    header: "Last Name",
    cell: info => <i>{info.getValue()}</i>,
  }),
  columnHelper.accessor("age", {
    header: "Age",
    cell: info => info.renderValue(),
  }),
  columnHelper.accessor("visits", {
    header: "Visits",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: info => info.getValue(),
  }),
  columnHelper.accessor("progress", {
    header: "Profile Progress",
    cell: info => info.getValue(),
  }),
]
```

后续如果要新增一列、删除一列、修改 cell 展示、加操作按钮，都改这个文件。

### view：只负责 shadcn/ui 渲染

```tsx
// src/components/people-table/people-table-view.tsx
import { flexRender, type Table as TanStackTable } from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Person } from "@/types/people.types"

type PeopleTableViewProps = {
  table: TanStackTable<Person>
  columnCount: number
}

export function PeopleTableView({
  table,
  columnCount,
}: PeopleTableViewProps) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(headerGroup => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <TableHead key={header.id}>
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
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
```

这个文件不应该知道接口 URL，不应该知道 query key，不应该知道 loading/error。它只拿到 TanStack Table 实例，然后渲染成 shadcn/ui 表格。

---

## 13. 页面只组合模块

```tsx
// src/app/page.tsx
import { PeopleTableContainer } from "@/components/people-table"

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
          <h2 className="text-xl font-semibold tracking-tight">
            People Table
          </h2>
          <p className="text-sm text-muted-foreground">
            Small table for basic table structure and query state.
          </p>
        </div>
        <PeopleTableContainer />
      </section>
    </main>
  )
}
```

页面不直接写请求，不直接写 columns，也不直接写 TanStack Table 逻辑。

这就是分层的价值。

---

## 14. 当数据变多时怎么办

前面的 People Table 更适合作为基础表格示例。它的数据量小、字段少、业务含义简单，重点是验证这套分层是否成立。

但真实项目不会只停留在这种小数据集。比如：

- 订单明细。
- 用户列表。
- 交易流水。
- 资金记录。
- 审计日志。
- 监控事件。
- 消息流。

这些数据通常会更宽、更长，也更接近线上业务压力。

当表格数据变多时，我们要先区分两个问题：

1. 一次请求多少数据？
2. 一次渲染多少 DOM？

对应的常见方案也有两种：

1. 分页 pagination。
2. 虚拟滚动 virtual scrolling / virtualization。

它们不是同一个问题的两个名字，而是分别处理两类压力。

---

## 15. 分页和虚拟滚动分别解决什么

分页解决的是数据获取规模。

它关心的是：

- 一次请求多少数据。
- 网络传输量。
- 后端查询压力。
- 前端内存中的数据规模。

虚拟滚动解决的是 DOM 渲染规模。

它关心的是：

- 一次渲染多少 DOM。
- 首屏渲染压力。
- 滚动卡顿。
- 大量 `tr` / `td` 节点造成的浏览器压力。

一句话概括：

```txt
分页控制数据量。
虚拟滚动控制 DOM 数量。
```

两者不是互斥关系，可以单独用，也可以组合使用。

所以后面的两个大数据场景会分别落到这两条路线：

- Web3 Activities Table：用服务端分页控制每次请求和缓存的数据量。
- Audit Logs Virtual Table：用虚拟滚动控制一次渲染的 DOM 数量。

---

## 16. Web3 Activities Table：服务端分页场景

现在再引入 Web3 Activity 场景。

它比 People Table 更接近真实业务：字段更多，单元格里有状态、地址、金额、区块号、风险等级，也更适合承接服务端分页。

后端类型可以是：

```ts
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

## 17. 后端支持服务端分页

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

## 18. Web3 Activities 的前端类型和 service

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

service 接收分页参数：

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

## 19. Web3 Activities 的 queryKey 必须带分页参数

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

如果分页参数不进入 query key，React Query 可能会认为不同页是同一个数据源，导致缓存错乱。

---

## 20. Web3 Activities 的 query hook

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

---

## 21. Web3 Activities Table 管理分页状态

分页状态应该放在 container，因为它会影响 query。

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

## 22. Web3 Activities Table 开启 manualPagination

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

## 23. View 层添加分页按钮

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
} from "@/components/ui/table"
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
                  <TableCell
                    key={header.id}
                    className="whitespace-nowrap font-normal"
                  >
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

## 24. Audit Logs Virtual Table：虚拟滚动场景

服务端分页解决了“一次请求多少数据”的问题。

但还有另一种情况：前端已经拿到很多数据，或者业务就是希望用户连续滚动浏览，比如：

- 审计日志。
- 监控事件。
- 消息流。
- 交易流水。
- 系统操作记录。

这时如果一次性渲染 5000 行，每行 15 列，那么 DOM 节点数量会非常大：

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

---

## 25. 后端新增 audit logs 接口

这里新增一个审计日志数据源：

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

## 26. Audit Logs 的前端分层结构

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

## 27. 核心虚拟滚动代码

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
} from "@/components/ui/table"
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

## 28. 分页和虚拟滚动怎么选择

前端分页适合数据量小、一次加载无压力、本地 mock、配置类表格这类场景。比如系统配置、枚举字典、少量团队成员列表，直接拿完整数据再本地分页就可以。

服务端分页适合订单、用户、交易记录、资金流水这类数据。它们通常数据量大，需要服务端筛选、排序、权限控制，也需要控制接口响应大小。后台管理系统里最常见的方案就是服务端分页 + 普通表格。

虚拟滚动适合日志流、消息流、交易流水、监控事件这类需要连续滚动浏览的场景。它的前提通常是前端已经加载了较多数据，或者通过 infinite query 逐步加载数据，但不希望一次性渲染所有 DOM。

这几种组合都合理：

- 服务端分页 + 普通表格：最常见后台管理方案。
- 前端一次加载 + 虚拟滚动：适合 demo、日志快照、客户端侧分析。
- cursor pagination + infinite query + virtual list：适合消息流、日志流、行情流等连续加载场景。

所以不要把虚拟滚动理解成分页的替代品。分页解决数据获取规模，虚拟滚动解决 DOM 渲染规模。数据少时普通表格更简单；数据多但每次只看一页时，服务端分页通常够用；数据多且需要连续滚动时，才更适合引入虚拟滚动。

---

## 29. 错误处理、重试和缓存同步

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

## 30. 工程化注意事项

最后总结几个很容易踩坑的点。

第一，不要把请求逻辑写进 UI 组件。UI 组件应该尽量只做渲染。请求应该放在 service / query / container 里。

第二，queryKey 不要散落。所有 query key 都应该有工厂函数。分页、筛选、排序参数必须进入 query key。

第三，不要把 React Query 的数据复制进 Zustand 或普通全局 store。服务端数据已经在 React Query cache 里了。除非有明确理由，不要再复制一份，否则会出现双数据源不一致。

第四，TanStack Table 的 `data` 和 `columns` 要尽量稳定。columns 最好定义在组件外部或单独文件里，不要每次 render 都重新生成复杂 columns。

第五，服务端分页时要用 `manualPagination`。后端返回当前页数据，前端就不要再做本地 slice。

第六，`pageIndex` 和 `page` 不要搞混。TanStack Table 的 `pageIndex` 从 0 开始。后端接口通常 `page` 从 1 开始。

第七，不要为了炫技一上来就用虚拟滚动。数据少时普通表格更简单；一页只有几十行时，服务端分页 + 普通表格通常已经够用。

第八，虚拟滚动需要固定或可预测的行高。动态行高、展开行、`rowspan`、sticky column 都会增加复杂度。横向滚动 + 虚拟行还要注意列宽一致性。

第九，shadcn/ui 是 UI 层，不要把业务逻辑塞进去。共享 UI 包里的 Table 组件应该保持通用。业务表格逻辑放在 app 内部的 `people-table`、`web3-activities-table`、`audit-logs-table` 这类模块里。

第十，shadcn/ui 的 Table 是语义化 table，但虚拟滚动时可能需要调整布局，例如 absolute row、flex cell。如果要保持完整 table 语义和复杂 sticky column，需要更谨慎设计。

第十一，React Query 的 queryKey 仍然要包含影响数据结果的参数。分页、筛选、排序、cursor、搜索词，只要会影响返回数据，就不应该漏掉。

第十二，分页和虚拟滚动解决的问题不同，不要混为一谈。分页控制数据量，虚拟滚动控制 DOM 数量。

---

## 31. 总结

这套方案的核心不是“用了几个流行库”，而是把边界拆清楚。

React Query 负责请求和缓存，TanStack Table 负责表格模型，shadcn/ui 负责 UI 组件。项目代码再按 service、query、container、table、columns、view 分层，后续加分页、排序、筛选、行操作时才不会牵一发动全身。

如果只是写 demo，一个文件当然最快。但如果你希望这个 demo 以后还能继续扩展，比如服务端分页、交易状态、风险标记、行操作菜单、虚拟滚动，那么一开始就把数据请求、表格逻辑和 UI 渲染拆开，会让后面的每一步都更稳。

当数据量变大时，表格优化要同时考虑数据获取和 DOM 渲染。分页解决数据量，虚拟滚动解决渲染量。前者让接口和缓存更可控，后者让浏览器少渲染无意义的节点。

把这两个边界分清楚，才能根据真实业务选择合适的表格方案。
