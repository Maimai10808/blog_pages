# React 大列表优化落地：从普通 map 到 react-window / react-virtualized 的工程化封装

在 React 项目里，列表渲染看起来是最简单的事情之一：接口拿到数组，然后 map 出组件。用户列表、订单列表、日志列表、消息流、交易历史、后台表格，基本都绕不开这套写法。

但列表一旦变大，问题就会变得很直接：页面卡顿、滚动掉帧、首屏渲染慢、浏览器内存占用高。尤其是在后台管理、数据看板、交易历史、日志审计这种场景里，几万条数据并不罕见。如果每一行还有按钮、图标、状态标签、Tooltip、操作菜单，DOM 数量会很快失控。

虚拟列表解决的就是这个问题。它不是真的把 10 万条数据全部渲染到页面上，而是只渲染当前可视区域附近的一小段数据，让用户“看起来”像在滚动完整列表。本文从真实项目落地角度，讲清楚为什么需要虚拟列表、普通写法的问题、如何用 react-window / react-virtualized 封装，以及如何和 React Query、分页加载、缓存同步结合。

---

## 1. 虚拟列表解决什么问题

普通列表的性能瓶颈不在于数组本身，而在于 DOM。

比如你有 100 条数据：

```tsx
{/* src/features/orders/components/NormalList.tsx */}
{items.map(item => (
  <div key={item.id}>{item.name}</div>
))}
```

这没什么问题。

但如果是 10000 条、100000 条，React 就需要创建对应数量的组件和 DOM 节点。浏览器还要处理样式计算、布局、绘制和滚动更新。如果每一行不是一个简单 div，而是复杂业务组件，性能压力会更明显。

虚拟列表的核心思想是：

```txt
数据可以有 100000 条
但 DOM 只保留当前屏幕附近的几十条
```

比如一个容器高度是 400px，每一行高度是 40px，那么用户一次最多看到 10 行左右。即使数据总量是 100000 条，也没必要把 100000 行全部挂在 DOM 上。

虚拟列表会维护一个总高度，让滚动条看起来像完整列表；同时根据 `scrollTop` 计算当前应该渲染哪几行。

它适合这些场景：

- 后台管理表格。
- 订单列表。
- 日志审计。
- 交易历史。
- 通知消息流。
- 大规模搜索结果。
- 文件列表。
- 数据看板明细。

它不适合这些场景：

- 列表数据很少。
- 每一行高度不固定且变化频繁。
- 强依赖浏览器原生页面搜索。
- SEO 依赖完整 DOM 内容。
- 需要复杂跨行布局测量。

所以虚拟列表不是所有列表的默认方案。它是当列表数量大、DOM 压力明显、滚动体验变差时才需要引入的优化手段。

---

## 2. 最简单的写法是什么

先看一个最普通的 React 列表：

```tsx
// src/features/orders/components/NormalList.tsx
type Item = {
  id: string;
  title: string;
};

export function NormalList({ items }: { items: Item[] }) {
  return (
    <div style={{ height: 400, overflow: 'auto' }}>
      {items.map(item => (
        <div
          key={item.id}
          style={{
            height: 40,
            borderBottom: '1px solid #eee',
            padding: '0 12px',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {item.title}
        </div>
      ))}
    </div>
  );
}
```

这段代码能跑，也很容易理解。

如果 `items.length = 100`，基本没问题。

如果 `items.length = 1000`，大多数设备也还能接受。

但如果 `items.length = 100000`，它就不再是一个“简单列表”，而是一次性创建 100000 个 DOM 节点。即使页面上一次只看到十几行，剩下看不见的 DOM 也已经被创建出来了。

很多项目一开始就是这种写法。业务刚启动时数据量小，没问题；后面数据增长，页面越来越慢，才开始补优化。

---

## 3. 普通 map 写法在真实项目中的问题

普通 map 的问题不是“写法不优雅”，而是它在复杂项目里会带来具体后果。

第一，首屏渲染慢。接口返回大量数据后，React 要一次性生成大量组件树，浏览器要一次性创建大量 DOM。用户会明显感觉按钮点击后页面卡住。

第二，滚动不流畅。DOM 节点过多时，浏览器滚动过程中的布局和绘制成本变高，容易出现掉帧和白屏。

第三，内存占用高。大量节点和组件实例长期挂在页面上，低端设备、移动端 WebView、内嵌浏览器更容易出现性能问题。

第四，业务组件越复杂，问题越明显。一行里如果包含头像、图标、状态、按钮、菜单、Tooltip、倒计时、价格变化动画，10000 行就不再是 10000 个节点，而可能是几十万 DOM 节点。

第五，无限滚动会越来越慢。很多页面只是不断追加下一页数据，但前面所有数据都留在 DOM 中。用户滚得越久，页面越慢。

第六，React Profiler 会暴露出明显问题。你会看到列表组件一次渲染耗时随着数据量上升快速增加。100 条可能几毫秒，10000 条可能几十毫秒，100000 条可能几百毫秒甚至更高。

这里的关键点是：用户当前看不到的内容，不应该长期存在于 DOM 里。

---

## 4. react-virtualized 和 react-window 怎么选

React 生态里常见的虚拟列表方案有两个：

- `react-virtualized`
- `react-window`

`react-virtualized` 功能更完整，支持 `List`、`Table`、`Grid`、`CellMeasurer`、`AutoSizer` 等复杂场景，适合历史项目或需要较完整能力的场景。

`react-window` 更轻量，API 更简洁，包体更小，推荐新项目优先考虑。它的作者和 `react-virtualized` 有关联，可以理解为更轻量、更聚焦的版本。

一般选择建议：

- 只做普通固定高度列表：优先 `react-window`。
- 需要复杂表格、动态测量、历史项目已有依赖：可以用 `react-virtualized`。
- 对包体敏感：优先 `react-window`。
- 需要更完整组件能力：考虑 `react-virtualized`。

本文后面会以 `react-window` 为主，因为它更适合大多数项目里的固定高度列表场景。

安装：

```bash
pnpm add react-window react-virtualized-auto-sizer
```

或者：

```bash
npm install react-window react-virtualized-auto-sizer
```

如果你使用 `react-virtualized`：

```bash
pnpm add react-virtualized
```

在某些 Vite 项目里，`react-virtualized` 可能会遇到构建兼容问题，这时可能需要额外处理依赖优化。但如果是新项目，只是做普通虚拟列表，直接用 `react-window` 会省事很多。

---

## 5. 推荐的项目落地结构

虚拟列表不应该直接写死在某个页面里。真实项目里应该把它拆成“通用虚拟列表组件”和“业务列表组件”。

一个精简结构可以这样设计：

```txt
src/
  shared/
    virtual-list/
      AppVirtualList.tsx
      types.ts
  features/
    orders/
      api.ts
      types.ts
      queryKeys.ts
      queryOptions.ts
      mutations.ts
      components/
        OrderHistoryPage.tsx
        OrderHistoryList.tsx
        OrderRow.tsx
        OrderFilters.tsx
```

这里的边界很明确。

`shared/virtual-list/AppVirtualList.tsx` 只封装虚拟列表能力，不关心订单、用户、消息这些业务概念。

`features/orders/api.ts` 只放订单请求函数。

`features/orders/queryKeys.ts` 统一管理 React Query 缓存 key。

`features/orders/queryOptions.ts` 封装订单列表查询配置。

`features/orders/mutations.ts` 封装订单操作，例如关闭订单、取消订单，并负责缓存失效。

`OrderHistoryPage.tsx` 负责组合筛选条件、数据请求和页面状态。

`OrderHistoryList.tsx` 负责把订单数组交给虚拟列表。

`OrderRow.tsx` 只负责单行订单展示和操作。

这种结构的好处是：虚拟列表是通用能力，订单只是其中一个消费方。后面如果有用户列表、日志列表、消息列表，也可以复用同一套虚拟列表封装。

---

## 6. 推荐写法一：封装通用 AppVirtualList

先写一个基于 `react-window` 的通用虚拟列表组件。

```tsx
// src/shared/virtual-list/AppVirtualList.tsx
'use client';

import React, { ReactNode, useMemo } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList, ListChildComponentProps } from 'react-window';

export interface AppVirtualListProps<T> {
  data: T[];
  itemHeight: number;
  height?: number;
  overscanCount?: number;
  getKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => ReactNode;
  empty?: ReactNode;
  className?: string;
}

type RowData<T> = {
  items: T[];
  getKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => ReactNode;
};

function Row<T>({ index, style, data }: ListChildComponentProps<RowData<T>>) {
  const item = data.items[index];

  return (
    <div style={style} key={data.getKey(item, index)}>
      {data.renderItem(item, index)}
    </div>
  );
}

export function AppVirtualList<T>({
  data,
  itemHeight,
  height,
  overscanCount = 6,
  getKey,
  renderItem,
  empty,
  className,
}: AppVirtualListProps<T>) {
  const itemData = useMemo<RowData<T>>(
    () => ({
      items: data,
      getKey,
      renderItem,
    }),
    [data, getKey, renderItem]
  );

  if (data.length === 0) {
    return <div className={className}>{empty ?? null}</div>;
  }

  if (height) {
    return (
      <FixedSizeList
        className={className}
        height={height}
        width="100%"
        itemCount={data.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={overscanCount}
        itemKey={(index, listData) => {
          const item = listData.items[index];
          return listData.getKey(item, index);
        }}
      >
        {Row}
      </FixedSizeList>
    );
  }

  return (
    <div className={className} style={{ height: '100%' }}>
      <AutoSizer>
        {({ height: autoHeight, width }) => (
          <FixedSizeList
            height={autoHeight}
            width={width}
            itemCount={data.length}
            itemSize={itemHeight}
            itemData={itemData}
            overscanCount={overscanCount}
            itemKey={(index, listData) => {
              const item = listData.items[index];
              return listData.getKey(item, index);
            }}
          >
            {Row}
          </FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
}
```

这个组件封装了几个关键点。

第一，业务方不需要直接接触 `FixedSizeList`。如果以后要替换虚拟列表实现，只需要改这一层。

第二，`getKey` 必须由业务方传入。因为只有业务方知道哪个字段能代表实体身份。订单用 `order.id`，用户用 `user.id`，日志用 `log.id`。

第三，`renderItem` 保持灵活。虚拟列表只负责性能，不限制业务行的 UI。

第四，支持固定高度和自适应高度。页面知道高度时直接传 `height`；如果希望跟随父容器，可以用 `AutoSizer`。

第五，`overscanCount` 用来减少快速滚动时的空白感。它表示可视区域外额外渲染多少项。

---

## 7. 推荐写法二：业务组件只消费封装结果

接下来写订单行组件。

```ts
// src/features/orders/types.ts
export type OrderSide = 'long' | 'short';
export type OrderStatus = 'opening' | 'closed' | 'failed';

export interface Order {
  id: string;
  symbol: string;
  side: OrderSide;
  amount: string;
  openPrice: string;
  profit: string;
  roi: string;
  status: OrderStatus;
  createdAt: string;
}
```

`OrderRow` 只关心单行展示，不关心虚拟列表、不关心请求、不关心缓存。

```tsx
// src/features/orders/components/OrderRow.tsx
import React from 'react';
import type { Order } from '../types';

interface OrderRowProps {
  order: Order;
  onClose?: (orderId: string) => void;
  closing?: boolean;
}

export function OrderRow({ order, onClose, closing }: OrderRowProps) {
  const isProfitPositive = Number(order.profit) >= 0;

  return (
    <div className="flex h-full items-center justify-between border-b px-4">
      <div>
        <div className="font-medium">
          {order.symbol} / USDT
        </div>
        <div className="text-xs text-gray-500">
          {order.createdAt}
        </div>
      </div>

      <div className="text-right">
        <div className={order.side === 'long' ? 'text-blue-500' : 'text-red-500'}>
          {order.side === 'long' ? 'Long' : 'Short'}
        </div>
        <div className="text-xs text-gray-500">
          Amount: {order.amount}
        </div>
      </div>

      <div className="text-right">
        <div>Open: {order.openPrice}</div>
        <div className={isProfitPositive ? 'text-blue-500' : 'text-red-500'}>
          {Number(order.profit) > 0 ? '+' : ''}
          {order.profit}
        </div>
      </div>

      {order.status === 'opening' && (
        <button
          disabled={closing}
          onClick={() => onClose?.(order.id)}
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white disabled:bg-gray-400"
        >
          {closing ? 'Closing' : 'Close'}
        </button>
      )}
    </div>
  );
}
```

再写订单列表组件：

```tsx
// src/features/orders/components/OrderHistoryList.tsx
import React, { useCallback } from 'react';
import { AppVirtualList } from '@/shared/virtual-list/AppVirtualList';
import type { Order } from '../types';
import { OrderRow } from './OrderRow';

interface OrderHistoryListProps {
  orders: Order[];
  closingOrderId?: string;
  onCloseOrder?: (orderId: string) => void;
}

export function OrderHistoryList({
  orders,
  closingOrderId,
  onCloseOrder,
}: OrderHistoryListProps) {
  const renderItem = useCallback(
    (order: Order) => (
      <OrderRow
        order={order}
        closing={closingOrderId === order.id}
        onClose={onCloseOrder}
      />
    ),
    [closingOrderId, onCloseOrder]
  );

  return (
    <AppVirtualList
      data={orders}
      height={520}
      itemHeight={72}
      overscanCount={8}
      getKey={(order) => order.id}
      renderItem={renderItem}
      empty={
        <div className="flex h-[240px] items-center justify-center text-gray-500">
          暂无订单
        </div>
      }
    />
  );
}
```

这里的组件职责是健康的：

- `AppVirtualList`：负责虚拟滚动。
- `OrderHistoryList`：负责把订单数据接入虚拟列表。
- `OrderRow`：负责单行渲染。

不要让 `OrderRow` 知道 React Query，也不要让 `AppVirtualList` 知道订单状态。

---

## 8. 推荐写法三：结合 React Query 管理列表请求

虚拟列表通常要和服务端数据一起用。这里用订单列表举例。

请求函数：

```ts
// src/features/orders/api.ts
import type { Order } from './types';

export interface FetchOrdersParams {
  keyword?: string;
  status?: 'opening' | 'closed' | 'failed';
}

export interface FetchOrdersReply {
  list: Order[];
  total: number;
}

export async function fetchOrders(
  params: FetchOrdersParams
): Promise<FetchOrdersReply> {
  const search = new URLSearchParams();
  if (params.keyword) search.set('keyword', params.keyword);
  if (params.status) search.set('status', params.status);

  const res = await fetch(`/api/orders?${search.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch orders');
  }
  return res.json();
}

export async function closeOrder(orderId: string) {
  const res = await fetch(`/api/orders/${orderId}/close`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error('Failed to close order');
  }
  return res.json();
}
```

统一 queryKey：

```ts
// src/features/orders/queryKeys.ts
import type { FetchOrdersParams } from './api';

export const orderQueryKeys = {
  all: ['orders'] as const,
  list: (params: FetchOrdersParams) =>
    [...orderQueryKeys.all, 'list', params] as const,
};
```

封装查询配置：

```ts
// src/features/orders/queryOptions.ts
import { queryOptions } from '@tanstack/react-query';
import { fetchOrders, type FetchOrdersParams } from './api';
import { orderQueryKeys } from './queryKeys';

export function ordersQueryOptions(params: FetchOrdersParams) {
  return queryOptions({
    queryKey: orderQueryKeys.list(params),
    queryFn: () => fetchOrders(params),
    staleTime: 30 * 1000,
    retry: 2,
  });
}
```

封装 mutation，并在成功后同步缓存：

```ts
// src/features/orders/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { closeOrder } from './api';
import { orderQueryKeys } from './queryKeys';

export function useCloseOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: closeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: orderQueryKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: ['account'],
      });
    },
  });
}
```

为什么关闭订单后要刷新 account？

因为在交易、订单、资产类业务里，订单状态变化通常会影响余额、可用额度、持仓、统计数据。写操作成功后只刷新当前列表，经常是不够的。

---

## 9. 页面如何组合：筛选、请求、虚拟列表、操作

页面组件负责组合业务流程。

```tsx
// src/features/orders/components/OrderHistoryPage.tsx
'use client';

import React, { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ordersQueryOptions } from '../queryOptions';
import { useCloseOrderMutation } from '../mutations';
import { OrderHistoryList } from './OrderHistoryList';

export function OrderHistoryPage() {
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<
    'opening' | 'closed' | 'failed' | undefined
  >();

  const ordersQuery = useQuery(
    ordersQueryOptions({
      keyword,
      status,
    })
  );

  const closeOrderMutation = useCloseOrderMutation();

  const handleCloseOrder = useCallback(
    (orderId: string) => {
      closeOrderMutation.mutate(orderId);
    },
    [closeOrderMutation]
  );

  if (ordersQuery.isPending) {
    return <div className="p-4 text-gray-500">订单加载中...</div>;
  }

  if (ordersQuery.isError) {
    return (
      <div className="p-4">
        <div className="mb-2 text-red-500">订单加载失败</div>
        <button
          onClick={() => ordersQuery.refetch()}
          className="rounded bg-blue-600 px-3 py-1 text-white"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-3 flex gap-2">
        <input
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索交易对或订单"
          className="rounded border px-3 py-2"
        />
        <select
          value={status ?? ''}
          onChange={(event) => {
            const value = event.target.value;
            setStatus(value ? (value as any) : undefined);
          }}
          className="rounded border px-3 py-2"
        >
          <option value="">全部</option>
          <option value="opening">进行中</option>
          <option value="closed">已关闭</option>
          <option value="failed">失败</option>
        </select>
      </div>

      <OrderHistoryList
        orders={ordersQuery.data.list}
        closingOrderId={closeOrderMutation.variables}
        onCloseOrder={handleCloseOrder}
      />
    </div>
  );
}
```

这个页面有几个重要点。

第一，筛选条件进入 `queryKey`。`keyword` 和 `status` 影响接口结果，所以必须进入 `ordersQueryOptions(params)`，最终进入 `queryKey`。否则缓存会混乱。

第二，组件不直接拼 `queryKey`。页面只调用 `ordersQueryOptions`，不用关心 key 结构。

第三，关闭订单的逻辑不写在行组件里。`OrderRow` 只触发 `onClose`，真正 mutation 在业务 hook 里处理。

第四，虚拟列表只拿最终的 `ordersQuery.data.list`。它不关心数据是从接口、缓存、SSE 还是本地 mock 来的。

---

## 10. 无限滚动和虚拟列表怎么配合

真实业务里，接口不一定一次返回所有数据。更多时候是分页或无限滚动。

这时不要把“虚拟列表”和“分页加载”混在一起写。推荐让 React Query 管分页数据，VirtualList 管渲染性能。

先写分页接口：

```ts
// src/features/orders/api.ts
export interface FetchOrderPageParams {
  page: number;
  pageSize: number;
  status?: 'opening' | 'closed' | 'failed';
}

export async function fetchOrderPage(params: FetchOrderPageParams) {
  const search = new URLSearchParams();
  search.set('page', String(params.page));
  search.set('pageSize', String(params.pageSize));
  if (params.status) {
    search.set('status', params.status);
  }

  const res = await fetch(`/api/orders/page?${search.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch order page');
  }

  return res.json() as Promise<{
    list: Order[];
    page: {
      currentPage: number;
      totalPage: number;
    };
  }>;
}
```

然后用 `useInfiniteQuery`：

```tsx
// src/features/orders/components/InfiniteOrderHistoryList.tsx
import React, { useCallback, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AppVirtualList } from '@/shared/virtual-list/AppVirtualList';
import { fetchOrderPage } from '../api';
import { OrderRow } from './OrderRow';

const PAGE_SIZE = 50;

export function InfiniteOrderHistoryList() {
  const query = useInfiniteQuery({
    queryKey: ['orders', 'infinite'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      fetchOrderPage({
        page: pageParam,
        pageSize: PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      if (lastPage.page.currentPage < lastPage.page.totalPage) {
        return lastPage.page.currentPage + 1;
      }
      return undefined;
    },
  });

  const orders = useMemo(() => {
    return query.data?.pages.flatMap(page => page.list) ?? [];
  }, [query.data]);

  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      const threshold = 10;
      if (
        visibleStopIndex >= orders.length - threshold &&
        query.hasNextPage &&
        !query.isFetchingNextPage
      ) {
        query.fetchNextPage();
      }
    },
    [orders.length, query]
  );

  if (query.isPending) {
    return <div>加载中...</div>;
  }

  if (query.isError) {
    return <div>加载失败</div>;
  }

  return (
    <>
      <AppVirtualList
        data={orders}
        height={520}
        itemHeight={72}
        overscanCount={8}
        getKey={(order) => order.id}
        renderItem={(order) => <OrderRow order={order} />}
      />
      {query.isFetchingNextPage && (
        <div className="py-2 text-center text-sm text-gray-500">
          正在加载更多...
        </div>
      )}
    </>
  );
}
```

不过上面这个版本还不够完整。因为 `AppVirtualList` 目前没有暴露 `onItemsRendered`。可以把它补上：

```ts
// src/shared/virtual-list/AppVirtualList.tsx
import type { ListOnItemsRenderedProps } from 'react-window';

export interface AppVirtualListProps<T> {
  data: T[];
  itemHeight: number;
  height?: number;
  overscanCount?: number;
  getKey: (item: T, index: number) => React.Key;
  renderItem: (item: T, index: number) => React.ReactNode;
  onItemsRendered?: (props: ListOnItemsRenderedProps) => void;
  empty?: React.ReactNode;
  className?: string;
}
```

然后传给 `FixedSizeList`：

```tsx
// src/shared/virtual-list/AppVirtualList.tsx
<FixedSizeList
  height={height}
  width="100%"
  itemCount={data.length}
  itemSize={itemHeight}
  itemData={itemData}
  overscanCount={overscanCount}
  onItemsRendered={onItemsRendered}
  itemKey={(index, listData) => {
    const item = listData.items[index];
    return listData.getKey(item, index);
  }}
>
  {Row}
</FixedSizeList>
```

这样业务层可以通过可视范围判断是否需要加载下一页，而不是在 `renderItem` 里做副作用。

---

## 11. react-virtualized 的基础写法

如果你的项目已经使用 `react-virtualized`，可以这样写：

```tsx
// src/shared/virtual-list/VirtualizedListByReactVirtualized.tsx
import React, { useCallback } from 'react';
import { AutoSizer, List, ListRowRenderer } from 'react-virtualized';
import 'react-virtualized/styles.css';

type Item = {
  id: string;
  title: string;
};

export function VirtualizedListByReactVirtualized({
  items,
}: {
  items: Item[];
}) {
  const rowRenderer = useCallback<ListRowRenderer>(
    ({ key, index, style }) => {
      const item = items[index];
      return (
        <div key={key} style={style}>
          {item.title}
        </div>
      );
    },
    [items]
  );

  return (
    <div style={{ height: 400, width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            width={width}
            rowCount={items.length}
            rowHeight={40}
            rowRenderer={rowRenderer}
            overscanRowCount={8}
          />
        )}
      </AutoSizer>
    </div>
  );
}
```

`react-virtualized` 的几个核心参数：

- `height`：列表容器高度。
- `width`：列表容器宽度。
- `rowCount`：总行数。
- `rowHeight`：每一行高度。
- `rowRenderer`：如何渲染某一行。
- `overscanRowCount`：额外渲染多少行作为缓冲。

它和 `react-window` 的思路一致，只是 API 名称不同。

`react-window` 中：

- `itemCount`
- `itemSize`
- children row component
- `overscanCount`

`react-virtualized` 中：

- `rowCount`
- `rowHeight`
- `rowRenderer`
- `overscanRowCount`

新项目如果没有复杂需求，`react-window` 更轻；老项目或复杂表格可以继续用 `react-virtualized`。

---

## 12. 错误处理、重试、生命周期和缓存同步

虚拟列表本身解决的是渲染性能，但真实项目不是只写一个列表。你还需要处理请求失败、加载状态、筛选变化、写操作后的缓存同步。

### 第一，loading、error、empty 要分开

```tsx
// src/features/orders/components/OrderHistoryPage.tsx
if (query.isPending) {
  return <OrderListSkeleton />;
}

if (query.isError) {
  return <RetryPanel onRetry={() => query.refetch()} />;
}

if (query.data.list.length === 0) {
  return <EmptyOrders />;
}
```

不要把“接口报错”和“列表为空”都展示成空状态。用户看到的结果一样，但含义完全不同。

### 第二，queryKey 必须包含影响结果的参数

```ts
// src/features/orders/queryOptions.ts
queryKey: orderQueryKeys.list({
  keyword,
  status,
})
```

如果 `keyword` 没进 `queryKey`，搜索词变化时 React Query 可能还在复用旧缓存。

### 第三，mutation 成功后要刷新相关缓存

订单关闭成功后至少要刷新：

- 订单列表。
- 账户信息。
- 余额。
- 持仓统计。

示例：

```ts
// src/features/orders/mutations.ts
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: orderQueryKeys.all,
  });
  queryClient.invalidateQueries({
    queryKey: ['account'],
  });
  queryClient.invalidateQueries({
    queryKey: ['positions'],
  });
}
```

### 第四，列表项 key 必须稳定

不要这样：

```tsx
// src/features/orders/components/OrderHistoryList.tsx
getKey={(_, index) => index}
```

在可筛选、可删除、可排序、可追加的列表里，index 会导致组件身份错乱。比如某一行内部有展开状态、输入框状态、动画状态，数据顺序变化后可能错位。

正确做法：

```tsx
// src/features/orders/components/OrderHistoryList.tsx
getKey={(order) => order.id}
```

### 第五，固定高度列表必须保证行高稳定

`FixedSizeList` 的前提是每一项高度固定。如果你的行内容可能换行、展开、动态高度变化，就不能随便用固定高度。要么设计上固定行高，要么使用动态高度方案。

### 第六，不要在 renderItem 里做副作用

错误示例：

```tsx
// src/features/orders/components/InfiniteOrderHistoryList.tsx
renderItem={(item, index) => {
  if (index > data.length - 10) {
    fetchNextPage();
  }
  return <Row item={item} />;
}}
```

`renderItem` 应该只负责渲染。加载更多应该通过 `onItemsRendered` 这类回调处理。

### 第七，注意父容器高度

虚拟列表必须知道容器高度。如果用 `AutoSizer`，父容器也必须有明确高度：

```tsx
// src/features/orders/components/OrderHistoryPage.tsx
<div style={{ height: 520 }}>
  <AppVirtualList data={data} itemHeight={72} />
</div>
```

否则 `AutoSizer` 可能拿到 0 高度，列表不显示。

---

## 13. 结合真实业务：交易历史 / 订单列表

在金融或交易类项目里，订单列表非常适合虚拟列表。

比如一个交易平台的订单模块可能有：

- 当前持仓。
- 历史订单。
- 成交记录。
- 资金流水。
- 行情变动日志。

这些列表有几个特点：

- 数据量大。
- 行结构复杂。
- 状态更新频繁。
- 用户会快速滚动。
- 操作后需要刷新余额和订单。

比如关闭订单的流程：

```txt
用户点击 Close
  -> 触发 closeOrder mutation
  -> 按钮进入 Closing
  -> 后端关闭订单
  -> 成功后 invalidate 订单列表
  -> 同时刷新账户余额
  -> 如果有 SSE/WebSocket，收到订单状态变更后再同步缓存
```

虚拟列表在这里只负责“高性能展示大量订单”。它不应该处理关闭订单的业务细节。业务细节应该放在 `mutations.ts` 和页面组合层。

如果项目里还有 SSE 实时推送，可以在收到订单状态变化时更新 React Query 缓存：

```ts
// src/features/orders/realtime.ts
queryClient.setQueryData(
  orderQueryKeys.list(currentParams),
  (oldData: FetchOrdersReply | undefined) => {
    if (!oldData) return oldData;

    return {
      ...oldData,
      list: oldData.list.map(order =>
        order.id === event.orderId
          ? { ...order, status: event.status }
          : order
      ),
    };
  }
);
```

这样虚拟列表消费的数据还是来自 React Query cache，不需要额外维护一份重复 store。

---

## 14. 工程化注意事项

虚拟列表落地时，最容易踩的坑主要集中在这些地方。

第一，不要过早优化。几十条、几百条简单数据没必要引入虚拟列表。虚拟列表会增加实现复杂度。

第二，固定高度要真的固定。使用 `FixedSizeList` 时，每一行高度必须稳定，否则滚动位置会错乱。

第三，key 必须来自业务 ID。不要用 `index`、`Math.random()`、`Date.now()`。

第四，父容器必须有高度。`AutoSizer` 不是魔法，它只能读取父容器尺寸。

第五，overscan 不宜过大。过小会快速滚动白屏，过大会失去虚拟化意义。一般从 5 到 10 开始调。

第六，不要把接口数据复制进本地 store。React Query 已经负责 server state，虚拟列表直接消费 query 结果即可。筛选条件、当前 tab、弹窗状态这类 client state 可以放 Zustand 或组件 state。

第七，写操作后要同步缓存。订单关闭、删除用户、批量操作后，要 invalidate 或 setQueryData。

第八，移动端更要关注性能。桌面浏览器能扛住的 DOM 数量，移动端 WebView 不一定能扛住。

第九，React Profiler 要作为验证工具。不要只凭肉眼判断优化是否有效。用 Profiler 看提交时间、组件渲染次数和交互耗时。

第十，复杂表格不一定只靠虚拟列表。列很多、单元格复杂、横向滚动、固定列、动态高度，这些都可能需要更完整的表格方案，而不是自己硬写。

---

## 15. 总结

虚拟列表的核心不是某个库的 API，而是一种前端性能取舍：数据可以很多，但 DOM 不应该无限增长。

在真实项目里，一个好的落地方式应该是：

- 虚拟列表封装成通用组件。
- 业务列表只传 `data`、`itemHeight`、`getKey`、`renderItem`。
- 服务端数据交给 React Query 管理。
- 筛选参数进入 `queryKey`。
- mutation 成功后同步缓存。
- 列表项 key 使用稳定业务 ID。
- 复杂副作用不要写进 `renderItem`。

`react-window` 适合大多数固定高度列表场景，轻量、直接、容易封装。`react-virtualized` 功能更完整，适合已有项目或更复杂的列表、表格场景。

真正要避免的是两种极端：一种是所有列表都无脑虚拟化，增加不必要复杂度；另一种是数据已经上万条了还坚持全量 map。比较稳妥的做法是先保持普通写法，在数据量、DOM 复杂度、滚动性能开始成为问题时，再把虚拟列表作为一个独立基础能力引入项目。这样既不会过度设计，也能在业务规模上来之后保持页面可用。
