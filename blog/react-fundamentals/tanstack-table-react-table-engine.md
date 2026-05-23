# TanStack Table 入门：为什么它是 React 表格开发里的“表格引擎”

很多前端开发者第一次做表格时，通常会觉得这件事很简单：拿到一个数组，`map` 一下，渲染成 `<table>` 就可以了。

但只要业务稍微真实一点，表格就会迅速变复杂。比如：

- 用户要按列排序。
- 要根据关键词筛选。
- 要支持分页。
- 某些单元格要可编辑。
- 状态字段要用下拉菜单修改。
- 日期字段要接日期选择器。
- 列宽要能拖拽调整。
- 数据量大了还要考虑性能。

这时候问题就来了：这些能力到底应该自己写，还是找一个表格库？如果找表格库，是不是就会被库自带的 UI 样式限制？如果想完全控制 UI，又不想从零实现排序、筛选、分页这些逻辑，该怎么办？

TanStack Table 解决的正是这个问题。

它不是一个“现成表格组件库”，而是一个 headless table library。简单理解，它负责表格的状态、数据模型、排序、筛选、分页、列配置这些核心逻辑；而具体的 HTML、CSS、UI 组件、交互样式，完全由你自己控制。

这也是它和很多传统表格组件最大的区别。

---

## 1. TanStack Table 解决了什么问题

在没有 TanStack Table 之前，React 里写一个简单表格通常是这样的：

```tsx
<table>
  <thead>
    <tr>
      <th>Task</th>
      <th>Status</th>
      <th>Due Date</th>
    </tr>
  </thead>
  <tbody>
    {data.map(item => (
      <tr key={item.id}>
        <td>{item.task}</td>
        <td>{item.status}</td>
        <td>{item.dueDate}</td>
      </tr>
    ))}
  </tbody>
</table>
```

这种写法在静态展示时没有问题。但一旦业务开始复杂，开发者会遇到几个典型问题。

第一，表格逻辑会散落在组件里。排序逻辑、筛选逻辑、分页逻辑、单元格编辑逻辑全部混在 JSX 里，组件会越来越重。

第二，列配置很难复用。比如同一份数据在不同页面要展示不同列，或者某些列要自定义渲染，纯手写表格会变得很难维护。

第三，表格状态会越来越多。排序状态、筛选状态、分页状态、列宽状态、选中状态、展开状态，如果全部自己设计，很容易写出一套不稳定的“小型表格框架”。

第四，UI 和逻辑耦合严重。如果用一些完整表格组件库，确实能快速拿到功能，但代价是 UI 很容易被库限制。你想换成 Chakra UI、shadcn/ui、Tailwind、Ant Design，或者完全自定义设计系统，往往会遇到样式覆盖和组件约束。

TanStack Table 的核心价值是：它只处理表格逻辑，不接管你的 UI。

它适合的场景包括：

- 中后台数据表格。
- 任务管理表格。
- 订单、交易、资产、日志列表。
- 需要自定义单元格的业务表格。
- 需要排序、筛选、分页、列宽调整的复杂表格。
- 需要和任意 UI 组件库组合的 React 表格。

它不太适合的场景是非常简单的一次性静态表格。如果只是展示三五行数据，没有排序、筛选、分页，也没有复杂单元格，直接手写 `<table>` 更直接。

---

## 2. TanStack Table 是什么：基本概念介绍

TanStack Table 是一个 headless 表格库。

所谓 headless，可以理解为“只有逻辑，没有样式”。它不会给你一个 `<Table />` 组件，也不会决定表格长什么样。

它提供的是一套表格引擎：你把数据和列定义交给它，它返回一个 table instance。这个 instance 里包含很多方法，用来生成 header、row、cell，以及处理排序、筛选、分页、列宽等逻辑。

初学者需要先理解几个核心概念。

第一个是 `data`。它就是表格的数据源，通常是一个对象数组。数组中的每个对象代表一行。

```ts
const data = [
  { id: 1, task: 'Write article', status: 'todo' },
  { id: 2, task: 'Review PR', status: 'done' },
];
```

第二个是 `columns`。它是列定义，用来告诉 TanStack Table：每一列从哪里取值，表头显示什么，单元格怎么渲染。

```ts
const columns = [
  {
    accessorKey: 'task',
    header: 'Task',
    cell: info => info.getValue(),
  },
];
```

第三个是 table instance。通过 `useReactTable` 创建，后续渲染表头、表格行、分页、排序，都从这个对象上拿方法。

```ts
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
});
```

第四个是 row model。它可以理解为 TanStack Table 内部计算后的“行模型”。比如原始数据经过筛选、排序、分页以后，最终页面上应该显示哪些行，就是通过 row model 得到的。

第五个是 `flexRender`。因为 header 和 cell 既可以是字符串，也可以是函数或 React 组件，所以 TanStack Table 提供了 `flexRender` 来统一渲染它们。

TanStack Table 不是 UI 库，不是 CSS 框架，也不是后端分页方案。它更像一个表格状态和数据模型管理器。

---

## 3. 最简单的使用方式

先看一个最小示例。

```tsx
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table';

type Task = {
  id: number;
  title: string;
  status: string;
};

const data: Task[] = [
  { id: 1, title: 'Write docs', status: 'todo' },
  { id: 2, title: 'Fix bug', status: 'done' },
];

const columns: ColumnDef<Task>[] = [
  {
    accessorKey: 'title',
    header: 'Task',
    cell: info => info.getValue(),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: info => info.getValue(),
  },
];

export function TaskTable() {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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
  );
}
```

这段代码里最关键的是三部分。

第一，`columns` 定义了表格有哪些列，每列如何取值、如何显示表头、如何渲染单元格。

第二，`useReactTable` 创建了表格实例。`data` 和 `columns` 是基础输入，`getCoreRowModel()` 是让 TanStack Table 生成基础行模型的核心函数。

第三，渲染时不是直接 `data.map`，而是使用：

```ts
table.getHeaderGroups();
table.getRowModel().rows;
row.getVisibleCells();
```

也就是说，页面上显示什么，不再直接由原始数组决定，而是由 TanStack Table 计算后的模型决定。

这个例子只是最小写法。它能帮助你理解 TanStack Table 的基本运行方式，但还没有排序、筛选、分页、自定义单元格这些能力。

---

## 4. 核心流程是怎么跑起来的

TanStack Table 的运行链路可以这样理解：

1. 你准备原始数据 `data`。
2. 你定义列配置 `columns`。
3. 你调用 `useReactTable` 创建 table instance。
4. TanStack Table 根据配置生成 header model 和 row model。
5. React 通过 `table.getHeaderGroups()` 渲染表头。
6. React 通过 `table.getRowModel().rows` 渲染行。
7. 每个 header 和 cell 通过 `flexRender` 渲染。
8. 如果启用了排序、筛选、分页，row model 会在内部经过对应处理。
9. 最终 UI 只负责把计算结果展示出来。

这里的关键点是：TanStack Table 不直接渲染 DOM。

它不会替你生成 `<table>`、`<tr>`、`<td>`，也不会替你写样式。它只告诉你：现在有哪些表头、有哪些行、有哪些单元格、每个单元格应该拿到什么上下文。

这就是 headless 的意义。

---

## 5. 常用 API / 核心能力介绍

### 5.1 useReactTable：创建表格实例

`useReactTable` 是最核心的 Hook。没有它，就没有 table instance。

```ts
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
});
```

常见配置包括：

```ts
const table = useReactTable({
  data,
  columns,
  state: {
    columnFilters,
    sorting,
    pagination,
  },
  onColumnFiltersChange: setColumnFilters,
  onSortingChange: setSorting,
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});
```

这里的思路很明确：

- `state` 用来把表格状态交给 React 管理。
- `onXXXChange` 用来响应表格内部状态变化。
- `getXXXRowModel` 用来开启某种计算能力。

比如你想要筛选，就加 `getFilteredRowModel`。你想要排序，就加 `getSortedRowModel`。你想要分页，就加 `getPaginationRowModel`。

### 5.2 columns：定义表格结构

列定义是 TanStack Table 的核心之一。

```tsx
const columns: ColumnDef<Task>[] = [
  {
    accessorKey: 'title',
    header: 'Task',
    cell: info => <strong>{info.getValue()}</strong>,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: info => <span>{info.getValue()}</span>,
  },
];
```

`accessorKey` 表示从 row 对象中取哪个字段。

`header` 表示表头内容。

`cell` 表示单元格渲染逻辑。

在真实业务里，cell 通常不只是显示文本。它可以渲染按钮、标签、菜单、输入框、复制按钮、日期选择器，甚至是一个复杂业务组件。

例如状态列：

```tsx
{
  accessorKey: 'status',
  header: 'Status',
  cell: info => {
    const status = info.getValue<string>();

    return (
      <span className={status === 'done' ? 'text-green-500' : 'text-gray-500'}>
        {status}
      </span>
    );
  },
}
```

### 5.3 flexRender：统一渲染 header 和 cell

TanStack Table 允许 header 和 cell 是字符串，也允许它们是函数或 React 组件。所以渲染时不能简单写：

```tsx
{cell.column.columnDef.cell}
```

而应该使用：

```tsx
{flexRender(cell.column.columnDef.cell, cell.getContext())}
```

`flexRender` 的作用就是：无论你传进来的是普通值还是组件函数，它都能按照正确方式渲染。

表头也一样：

```tsx
{flexRender(header.column.columnDef.header, header.getContext())}
```

### 5.4 getCoreRowModel：基础行模型

最小表格必须配置它。

```ts
getCoreRowModel: getCoreRowModel()
```

它负责根据原始 `data` 生成最基础的 row model。如果没有排序、筛选、分页，页面显示的行基本就是这个核心 row model。

### 5.5 getFilteredRowModel：筛选

如果要支持筛选，需要维护筛选状态：

```ts
const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
```

然后传给 table：

```ts
const table = useReactTable({
  data,
  columns,
  state: {
    columnFilters,
  },
  onColumnFiltersChange: setColumnFilters,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});
```

筛选状态通常长这样：

```ts
[
  {
    id: 'title',
    value: 'bug',
  },
]
```

`id` 对应列 ID，`value` 是筛选值。

### 5.6 getSortedRowModel：排序

排序也是类似思路：

```ts
const [sorting, setSorting] = useState<SortingState>([]);

const table = useReactTable({
  data,
  columns,
  state: {
    sorting,
  },
  onSortingChange: setSorting,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});
```

表头可以绑定排序事件：

```tsx
<th onClick={header.column.getToggleSortingHandler()}>
  {flexRender(header.column.columnDef.header, header.getContext())}
  {{
    asc: ' ↑',
    desc: ' ↓',
  }[header.column.getIsSorted() as string] ?? null}
</th>
```

`getToggleSortingHandler()` 会返回一个事件处理函数，点击表头时自动切换排序状态。

### 5.7 getPaginationRowModel：分页

客户端分页可以这样启用：

```ts
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
});
```

然后用 table instance 上的方法控制分页：

```tsx
<button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
  Previous
</button>
<button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
  Next
</button>
```

显示当前页：

```tsx
<span>
  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
</span>
```

如果要自己控制每页数量，可以把 pagination 状态交给 React：

```ts
const [pagination, setPagination] = useState({
  pageIndex: 0,
  pageSize: 10,
});
```

然后传给 table。

---

## 6. 在真实业务里一般怎么组合使用

真实业务里的 TanStack Table 通常不会单独存在。它会和 UI 组件库、表单控件、请求状态、业务 formatter、权限逻辑一起使用。

比如一个任务表格可能有这些组合：

- 输入框单元格：编辑任务名称。
- 状态菜单：修改任务状态。
- 日期选择器：修改截止日期。
- 筛选栏：按任务名称和状态筛选。
- 排序按钮：按日期排序。
- 分页控件：控制每页展示数量。
- 外部请求：从接口获取数据并提交修改。

一个稍微真实一点的组合方式是：把单元格编辑能力通过 `table.options.meta` 暴露给自定义 cell。

```ts
type Task = {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
};

type TableMeta = {
  updateData: (rowIndex: number, columnId: string, value: unknown) => void;
};

const table = useReactTable<Task>({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  meta: {
    updateData: (rowIndex, columnId, value) => {
      setData(old =>
        old.map((row, index) => {
          if (index !== rowIndex) return row;

          return {
            ...row,
            [columnId]: value,
          };
        })
      );
    },
  } satisfies TableMeta,
});
```

然后在自定义单元格里调用：

```tsx
function EditableCell({ getValue, row, column, table }: any) {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      value={value}
      onChange={event => setValue(event.target.value)}
      onBlur={() => {
        table.options.meta?.updateData(row.index, column.id, value);
      }}
    />
  );
}
```

这种设计的好处是：单元格组件只负责 UI 和局部交互，真正更新表格数据的逻辑仍然放在表格组件里。

在实际项目里，`updateData` 还可以进一步变成：

- 更新本地状态。
- 调用 mutation 提交后端。
- 成功后刷新 query cache。
- 失败时回滚旧值。
- 展示 toast 提示。

TanStack Table 不限制你怎么做。它只提供表格上下文和模型能力。

---

## 7. 常见误区和使用边界

### 误区一：以为 TanStack Table 是 UI 表格组件

TanStack Table 不是 Ant Design Table，也不是 Material UI DataGrid。它不会直接给你一个完整的可视化表格。

如果你期待安装以后写：

```tsx
<Table data={data} columns={columns} />
```

然后自动出现完整样式，那你会失望。

它的正确定位是表格逻辑引擎。你需要自己写表格结构和样式，或者把它和自己的 UI 组件库结合起来。

### 误区二：忘记使用 flexRender

有些初学者会直接渲染：

```tsx
{cell.column.columnDef.cell}
```

这样经常会出问题，因为 cell 可能是函数，可能需要上下文，也可能是 React 组件。

正确写法是：

```tsx
{flexRender(cell.column.columnDef.cell, cell.getContext())}
```

表头也是同理。

### 误区三：只配置 state，不配置 row model

比如你写了筛选状态：

```ts
state: {
  columnFilters,
}
```

但忘了加：

```ts
getFilteredRowModel: getFilteredRowModel()
```

那么筛选不会按预期生效。

TanStack Table 的很多能力都是组合式开启的。状态只是状态，真正的计算能力要通过对应的 row model 打开。

### 误区四：把所有逻辑都塞进 cell

cell 很灵活，但不意味着所有业务逻辑都应该写在 cell 里。

如果一个单元格里同时处理格式化、权限判断、接口请求、状态更新、错误提示，代码会很快失控。

更合理的方式是：列定义负责连接表格上下文，复杂 UI 抽成独立组件，业务请求放到 hook 或 mutation 里。

### 误区五：客户端分页和服务端分页混淆

`getPaginationRowModel` 处理的是客户端分页，也就是前端已经拿到了完整数据，再在本地分页。

如果数据量很大，真实项目通常应该做服务端分页。此时分页状态变化后，应该重新请求接口，而不是把所有数据一次性拉到前端。

TanStack Table 可以管理分页状态，但数据从哪里来、什么时候请求，仍然要由业务代码决定。

---

## 8. 一个更完整的 TypeScript 示例

下面给一个稍微完整的 TypeScript 示例，包含：

- 表格渲染。
- 可编辑单元格。
- 状态筛选。
- 排序。
- 分页。
- 自定义状态列。

先定义数据类型：

```ts
type Status = 'todo' | 'doing' | 'done';

type Task = {
  id: number;
  title: string;
  status: Status;
  dueDate: string;
};

const initialData: Task[] = [
  { id: 1, title: 'Write docs', status: 'todo', dueDate: '2026-05-01' },
  { id: 2, title: 'Fix table bug', status: 'doing', dueDate: '2026-05-03' },
  { id: 3, title: 'Release feature', status: 'done', dueDate: '2026-05-10' },
];
```

然后定义一个可编辑单元格。它内部有局部输入状态，在失焦时把值同步回表格数据。

```tsx
import { useEffect, useState } from 'react';
import type { CellContext } from '@tanstack/react-table';

function EditableCell<TData>({
  getValue,
  row,
  column,
  table,
}: CellContext<TData, unknown>) {
  const initialValue = getValue() as string;
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  return (
    <input
      value={value}
      onChange={event => setValue(event.target.value)}
      onBlur={() => {
        table.options.meta?.updateData(row.index, column.id, value);
      }}
      style={{ width: '100%' }}
    />
  );
}
```

这里的关键点是 `table.options.meta?.updateData`。它不是 TanStack Table 固定要求的 API，而是我们自己挂到 table meta 上的业务方法。这样 cell 组件就能通过表格上下文更新外层数据。

接着扩展 TanStack Table 的类型，让 TypeScript 知道 meta 里有 `updateData`。

```ts
import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  interface TableMeta<TData> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
  }
}
```

然后写主表格组件：

```tsx
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';

export function TaskTable() {
  const [data, setData] = useState<Task[]>(initialData);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Task',
        cell: EditableCell,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: info => {
          const status = info.getValue<Status>();

          return (
            <span>
              {status === 'todo' ? 'To Do' : status === 'doing' ? 'Doing' : 'Done'}
            </span>
          );
        },
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue) return true;

          return row.getValue(columnId) === filterValue;
        },
      },
      {
        accessorKey: 'dueDate',
        header: 'Due Date',
        cell: info => info.getValue(),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    meta: {
      updateData: (rowIndex, columnId, value) => {
        setData(old =>
          old.map((row, index) => {
            if (index !== rowIndex) return row;

            return {
              ...row,
              [columnId]: value,
            };
          })
        );
      },
    },
  });

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <select
          value={
            (columnFilters.find(filter => filter.id === 'status')?.value as string) ??
            ''
          }
          onChange={event => {
            table.getColumn('status')?.setFilterValue(event.target.value || undefined);
          }}
        >
          <option value="">All</option>
          <option value="todo">To Do</option>
          <option value="doing">Doing</option>
          <option value="done">Done</option>
        </select>
      </div>

      <table>
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  style={{
                    cursor: header.column.getCanSort() ? 'pointer' : 'default',
                  }}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: ' ↑',
                    desc: ' ↓',
                  }[header.column.getIsSorted() as string] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map(row => (
              <tr key={row.id}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>No results.</td>
            </tr>
          )}
        </tbody>
      </table>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </button>
        <span style={{ margin: '0 8px' }}>
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </span>
        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
          Next
        </button>
      </div>
    </div>
  );
}
```

这个示例已经比最小示例更接近真实业务。

它体现了 TanStack Table 的几个重要使用方式：

- 列定义和 UI 渲染分离。
- 筛选、排序、分页都由 table instance 管理。
- 自定义单元格可以通过 context 访问 row、column、table。
- 表格状态可以交给 React 控制。
- 数据更新可以通过 meta 暴露给 cell 组件。

但它仍然不是完整项目方案。真实项目里，数据通常来自接口；分页可能是服务端分页；编辑后要调用 mutation；错误需要 toast 或回滚；样式会接入自己的组件库。

---

## 9. 学习和落地建议

学习 TanStack Table，不建议一上来就看所有 API。它的 API 很多，如果没有业务场景，很容易看完就忘。

更合理的学习顺序是：

第一步，先理解 `data`、`columns`、`useReactTable`、row model、`flexRender`。只做一个最小表格，把表头和行渲染出来。

第二步，学习自定义 cell。比如把状态列渲染成标签，把操作列渲染成按钮，把 ID 列加上复制按钮。

第三步，学习排序和筛选。先做一个文本筛选，再做一个状态筛选。重点理解 column filter 的结构：`id + value`。

第四步，学习分页。先做客户端分页，再理解服务端分页时应该如何把 pagination state 和接口参数绑定。

第五步，学习 editable cell。重点理解局部状态和外层表格数据的同步关系，尤其是 `onBlur` 更新、`useEffect` 同步 `initialValue` 这类细节。

第六步，再考虑列宽调整、列显示隐藏、列顺序拖拽、行选择、虚拟滚动这些高级能力。

可以做一个小 demo：任务管理表格。字段包括任务名、状态、截止日期、备注。功能包括编辑任务名、修改状态、筛选状态、按日期排序、分页展示。这个 demo 足够覆盖 TanStack Table 的核心思想。

等你能独立做完这个 demo，再去看更复杂的官方文档会顺很多。

---

## 10. 总结

TanStack Table 的核心价值，不是让你少写几行 `<table>` 代码，而是把复杂表格背后的状态管理、数据模型、列定义、排序、筛选、分页这些逻辑抽象出来。

它适合那些“UI 要高度自定义，但表格逻辑又不能从零手写”的场景。

初学者最应该记住的是：TanStack Table 是 headless 的。它不负责样式，不负责 UI 组件，不负责请求接口。它负责生成表格模型，并提供一套稳定的方法让你渲染和操作表格。

真正使用时，需要注意几个边界：简单表格不一定需要它；客户端分页不等于服务端分页；复杂 cell 不要塞太多业务逻辑；启用某种能力时，通常既要有状态，也要有对应的 row model。

理解了这些之后，TanStack Table 就不再是一个“API 很多的表格库”，而是一个可以和任何 UI 系统组合的表格引擎。

对于中后台、交易系统、任务系统、订单系统这类复杂数据界面，它是非常值得掌握的 React 基础设施。
