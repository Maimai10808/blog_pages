# TanStack Query 项目落地：从 queryKey、缓存失效到无限分页的工程化封装

在 React 项目里，请求数据这件事很容易被写得很简单：组件挂载时发请求，拿到数据后 `setState`，失败了就展示 `error`。小 demo 里这样写没什么问题，但只要业务稍微复杂一点，比如列表筛选、分页加载、创建订单、删除记录、详情预取、实时刷新，就会很快变成一堆分散在组件里的 `useEffect`、`loading`、`error`、`refetch` 和手写缓存同步。

TanStack Query 的价值不只是“替代 `useEffect` 请求接口”。它更准确的定位是：

> 前端的 server state 管理工具。

它负责帮你处理接口数据的缓存、请求去重、失效刷新、后台同步、分页、预取、mutation 状态以及错误重试。

真正落地到项目里，关键不是会不会写 `useQuery`，而是能不能把 `queryKey`、`queryOptions`、API function、mutation、组件消费边界设计清楚。

本文用一个后台用户列表场景来讲 TanStack Query 的工程化写法。重点不是 UI，而是请求层、缓存层、分页层和业务组件之间如何协作。

---

## 1. TanStack Query 解决什么问题

React 组件里的接口数据，本质上不是普通本地状态。

比如：

- 用户列表。
- 订单列表。
- 账户信息。
- 文章详情。
- 交易记录。

这些数据的真实来源都在服务端。前端只是把服务端状态拉到页面上展示，并在用户操作后让它重新同步。

如果用普通 `useState + useEffect` 管这些状态，你需要自己处理很多细节：

- 请求是否正在进行。
- 失败后如何展示错误。
- 参数变化后是否重新请求。
- 组件卸载后是否取消旧请求。
- 多个组件请求同一份数据是否重复打接口。
- 创建、更新、删除后列表是否刷新。
- 页面切回来是否重新同步。
- 详情页能否复用列表页已有数据。

TanStack Query 解决的就是这类问题。它不是一个简单请求库，而是一套围绕 query cache 运转的 server state 管理机制。

它适合这些场景：

- 用户列表、订单列表、商品列表。
- 内容管理列表、详情页。
- 账户信息、通知列表。
- 交易历史、后台表格筛选。
- 无限滚动、轮询刷新。
- 预取详情、提交表单后刷新相关数据。

它不适合代替所有状态管理。

比如弹窗开关、当前选中的 tab、表单临时输入、侧边栏展开状态、前端购物车草稿状态，这些更适合 Zustand、Redux 或组件本地状态。

TanStack Query 应该管服务端数据，不应该被当成万能 store。

---

## 2. 最简单的写法是什么

最基础的 `useQuery` 写法是这样的：

```tsx
// src/features/users/components/UserList.tsx
import { useQuery } from '@tanstack/react-query';

async function getUsers() {
  const response = await fetch('/api/users');

  if (!response.ok) {
    throw new Error('Failed to fetch users');
  }

  return response.json();
}

export function UserList() {
  const { data, isPending, error } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>请求失败</div>;
  }

  return (
    <div>
      {data.users.map((user: any) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

这段代码能跑，也确实比在组件里手写 `useEffect` 清楚一些。

- `queryKey` 用来标识这次查询。
- `queryFn` 是真正发请求的函数。
- `data`、`isPending`、`error` 是 TanStack Query 帮你维护的异步状态。

但这个写法只适合入门示例。真实项目里，如果每个组件都这样写，很快会出现大量重复代码和缓存管理问题。

---

## 3. 简单写法在真实项目中的问题

### 3.1 queryKey 到处硬编码

比如用户列表里写 `['users']`，创建用户成功后也写 `['users']`，详情页又写 `['users', id]`。

一旦 key 规则变化，很容易漏改。

更严重的是，筛选参数、分页参数如果没有进入 `queryKey`，不同条件下可能复用同一份缓存，页面展示错数据。

### 3.2 API function 和组件耦合

组件里直接写：

```ts
// src/features/users/components/UserList.tsx
fetch('/api/users?page=1&limit=20');
```

看起来方便，但长期会让请求逻辑散落在页面组件、弹窗组件、按钮组件里。接口地址、错误处理、响应类型、参数组装都没有统一边界。

### 3.3 mutation 后忘记同步缓存

创建用户、删除订单、更新文章状态，这些操作改变了服务端数据。

如果 mutation 成功后不 invalidate 对应 query，页面上的列表仍然是旧数据。用户必须刷新页面才能看到最新结果，这在后台管理、订单系统、金融交易类项目里都不能接受。

### 3.4 分页和无限加载容易写乱

普通列表还好，一旦变成“加载更多”“无限滚动”“上一页 / 下一页”“滚动加载历史记录”，数据结构就不再是一个简单数组，而是多页数据集合。

组件如果直接理解 pages 结构，UI 层会越来越重。

### 3.5 请求策略没有统一

有的数据可以缓存 5 分钟，比如用户基础信息。

有的数据应该频繁刷新，比如行情、任务进度、订单状态。

有的数据需要窗口重新聚焦时刷新。

有的数据需要在按钮 hover 时提前预取。

如果全部写在组件里，后期很难维护。

所以项目里更推荐的方式是：

> 请求函数、queryKey、queryOptions、mutation、组件消费分层管理。

---

## 4. 推荐的项目落地结构

以用户列表和用户详情为例，可以设计成 feature-based 结构：

```text
src/
  features/
    users/
      api.ts
      types.ts
      queryKeys.ts
      queryOptions.ts
      mutations.ts
      components/
        UserTable.tsx
        UserCreateButton.tsx
        UserDetailPanel.tsx
        UserInfiniteList.tsx
```

各文件职责如下：

- `api.ts`：只放请求函数，比如 `getUsers`、`getUserDetail`、`createUser`、`deleteUser`。
- `types.ts`：放接口响应类型和业务实体类型。
- `queryKeys.ts`：统一维护 `queryKey`。
- `queryOptions.ts`：封装 `queryOptions` 和 `infiniteQueryOptions`。
- `mutations.ts`：封装创建、删除、更新等写操作，并处理缓存失效。
- `components/`：只消费查询结果和 mutation，不直接写请求细节。

这个结构不复杂，但边界清楚：

> 请求归请求，缓存配置归缓存配置，写操作归写操作，组件只负责渲染和触发动作。

---

## 5. 先把类型和 API 函数独立出来

先定义接口类型。这里用普通 TypeScript 类型，真实项目可以再加 Zod 做运行时校验。

```ts
// src/features/users/types.ts
export type User = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export type Pagination = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
};

export type GetUsersParams = {
  page?: number;
  limit?: number;
  keyword?: string;
};

export type GetUsersResponse = {
  users: User[];
  pagination: Pagination;
};

export type CreateUserInput = {
  name: string;
  email: string;
};
```

然后写请求函数：

```ts
// src/features/users/api.ts
import type {
  CreateUserInput,
  GetUsersParams,
  GetUsersResponse,
  User,
} from './types';

function buildSearchParams(
  params?: Record<string, string | number | undefined>,
) {
  const searchParams = new URLSearchParams();

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

export async function getUsers(
  params?: GetUsersParams,
): Promise<GetUsersResponse> {
  const query = buildSearchParams(params);
  const response = await fetch(`/api/users${query ? `?${query}` : ''}`);

  if (!response.ok) {
    throw new Error('获取用户列表失败');
  }

  return response.json();
}

export async function getUserDetail(userId: string): Promise<User> {
  const response = await fetch(`/api/users/${userId}`);

  if (!response.ok) {
    throw new Error('获取用户详情失败');
  }

  return response.json();
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('创建用户失败');
  }

  return response.json();
}

export async function deleteUser(userId: string): Promise<void> {
  const response = await fetch(`/api/users/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('删除用户失败');
  }
}
```

关键点是：

> API 函数必须有明确返回类型。

否则组件里的 `data` 很容易变成 `unknown` 或 `any`，后面 `select`、`queryOptions`、mutation 的类型推导都会变差。

---

## 6. 统一 queryKey，不要在组件里手写字符串

`queryKey` 是 TanStack Query 缓存系统的核心。它不是随便写的数组，而是缓存身份。

```ts
// src/features/users/queryKeys.ts
import type { GetUsersParams } from './types';

export const userQueryKeys = {
  all: ['users'] as const,
  lists: () => [...userQueryKeys.all, 'list'] as const,
  list: (params?: GetUsersParams) =>
    [...userQueryKeys.lists(), params ?? {}] as const,
  details: () => [...userQueryKeys.all, 'detail'] as const,
  detail: (userId: string) => [...userQueryKeys.details(), userId] as const,
};
```

为什么要这样写？

因为列表、详情、筛选列表是不同缓存。

例如：

```ts
// src/features/users/queryKeys.example.ts
userQueryKeys.list({
  page: 1,
  limit: 20,
  keyword: 'jack',
});

userQueryKeys.list({
  page: 1,
  limit: 20,
  keyword: 'tom',
});
```

这两个 `queryKey` 不同，TanStack Query 才知道它们是两份不同数据。

如果你只写 `['users']`，搜索 `jack` 和搜索 `tom` 会共用同一份缓存，页面可能显示错数据。

---

## 7. 封装 queryOptions，让查询配置可复用

很多人会写自定义 hook：

```ts
// src/features/users/useUsers.ts
function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  });
}
```

这没错，但在复杂项目里，更推荐优先抽 `queryOptions`。

原因是：`queryOptions` 不只可以给 `useQuery` 用，也可以给 `prefetchQuery`、SSR hydration、loader、测试代码使用。

```ts
// src/features/users/queryOptions.ts
import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  type UseQueryOptions,
} from '@tanstack/react-query';
import { getUserDetail, getUsers } from './api';
import { userQueryKeys } from './queryKeys';
import type { GetUsersParams, GetUsersResponse } from './types';

type UsersQueryOptions<TData = GetUsersResponse, TError = Error> = Omit<
  UseQueryOptions<GetUsersResponse, TError, TData>,
  'queryKey' | 'queryFn'
>;

export function usersQueryOptions<TData = GetUsersResponse>(
  params?: GetUsersParams,
  options?: UsersQueryOptions<TData>,
) {
  return queryOptions({
    queryKey: userQueryKeys.list(params),
    queryFn: () => getUsers(params),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    ...options,
  });
}

export function userDetailQueryOptions(userId: string) {
  return queryOptions({
    queryKey: userQueryKeys.detail(userId),
    queryFn: () => getUserDetail(userId),
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}
```

这里有几个细节。

`staleTime: 60_000` 表示用户列表在 1 分钟内是 fresh 状态。组件重复挂载、切换回来、其他地方再次读取同一个 `queryKey` 时，不会立即重复请求。

`placeholderData: keepPreviousData` 用来减少分页和筛选切换时的闪烁。比如用户从第 1 页切到第 2 页，旧数据不会瞬间消失，而是先展示旧数据，等新数据回来后再替换。

`options` 作为第二个参数传入，允许组件按需覆盖配置。比如某个页面想禁用自动请求，可以传 `enabled: false`；某个任务页面想轮询，可以传 `refetchInterval: 3000`。

但 `queryKey` 和 `queryFn` 不允许外部覆盖，否则缓存身份会被破坏。

---

## 8. 组件如何消费 queryOptions

组件可以这样消费：

```tsx
// src/features/users/components/UserTable.tsx
import { useQuery } from '@tanstack/react-query';
import { usersQueryOptions } from '../queryOptions';

export function UserTable() {
  const { data, isPending, isError } = useQuery(
    usersQueryOptions(
      {
        page: 1,
        limit: 20,
      },
      {
        select: (response) => response.users,
      },
    ),
  );

  if (isPending) {
    return <div>加载中...</div>;
  }

  if (isError) {
    return <div>加载失败</div>;
  }

  return (
    <div>
      {data.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}
    </div>
  );
}
```

这里用了 `select`。

接口返回的是：

```ts
// src/features/users/types.ts
type GetUsersResponse = {
  users: User[];
  pagination: Pagination;
};
```

但当前组件只关心 `users`，所以直接在 query 层把数据裁剪成数组。

这样组件不需要写 `data.users.map()`，也不需要理解完整响应结构。

---

## 9. fresh、stale 和 staleTime 怎么理解

TanStack Query 的缓存不是简单的“有数据就不请求”。它会把缓存数据区分成 fresh 和 stale。

默认情况下，数据拿到后会立刻变成 stale。也就是说，即使缓存里有数据，下次组件挂载时仍然可能重新请求。

这个默认策略偏保守，保证数据尽量新。

如果设置了 `staleTime`：

```ts
// src/features/users/queryOptions.ts
useQuery({
  queryKey: ['users'],
  queryFn: getUsers,
  staleTime: 60_000,
});
```

表示这份数据 60 秒内被认为是 fresh。

在这 60 秒内，如果其他组件也读取同一个 `queryKey`，TanStack Query 会直接返回缓存，不会重复打接口。

如何选择 `staleTime`？

- 用户资料、权限菜单、基础配置、静态字典：可以设置较长 staleTime，比如 5 分钟甚至 `Infinity`。
- 订单状态、任务进度、行情数据、实时通知：应该设置较短 staleTime，或者结合轮询、SSE、WebSocket。

不要无脑把所有数据都设成 `Infinity`。这样可以减少请求，但也更容易展示旧数据。

缓存策略必须和业务时效性匹配。

---

## 10. mutation：写操作应该如何封装

读取数据用 `useQuery`，创建、更新、删除一般用 `useMutation`。

它的价值不只是调用 POST / DELETE，而是统一处理：

- pending。
- success。
- error。
- settled。
- 成功后的缓存同步。

```ts
// src/features/users/mutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser } from './api';
import { userQueryKeys } from './queryKeys';
import type { CreateUserInput } from './types';

export function useCreateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: async (newUser) => {
      await queryClient.invalidateQueries({
        queryKey: userQueryKeys.lists(),
      });

      console.log('创建成功，新用户 ID:', newUser.id);
    },
    onError: (error) => {
      console.error('创建用户失败:', error);
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: userQueryKeys.lists(),
      });
    },
    onError: (error) => {
      console.error('删除用户失败:', error);
    },
  });
}
```

这里的核心是 `invalidateQueries`。

当你创建了一个用户，服务端数据已经变了，但 TanStack Query 的缓存还不知道。

调用 `invalidateQueries` 后，它会把匹配的 query 标记为 stale。如果这个 query 当前正在页面上被使用，它会重新请求，从而让页面展示最新数据。

不要随便写：

```ts
// src/features/users/mutations.bad.ts
queryClient.invalidateQueries();
```

这样会让整个 query cache 都失效，当前挂载的所有 query 都可能重新请求。大型项目里这会造成不必要的性能压力。

更推荐精确失效：

```ts
// src/features/users/mutations.ts
queryClient.invalidateQueries({
  queryKey: userQueryKeys.lists(),
});
```

什么时候需要 `await invalidateQueries`？

如果后续逻辑依赖刷新后的最新数据，比如创建成功后马上读取列表最后一项，或者刷新后再跳转，可以 `await`。

```ts
// src/features/users/mutations.ts
await queryClient.invalidateQueries({
  queryKey: userQueryKeys.lists(),
});

router.push('/users');
```

如果只是让页面最终同步，通常不需要 `await`。

---

## 11. 组件只消费结果，不承载复杂业务

写好 `queryOptions` 和 mutations 后，组件应该变得很薄。

创建按钮：

```tsx
// src/features/users/components/UserCreateButton.tsx
import { useCreateUserMutation } from '../mutations';

export function UserCreateButton() {
  const { mutate, isPending } = useCreateUserMutation();

  const handleCreate = () => {
    mutate({
      name: 'New User',
      email: `user-${Date.now()}@example.com`,
    });
  };

  return (
    <button onClick={handleCreate} disabled={isPending}>
      {isPending ? '创建中...' : '创建用户'}
    </button>
  );
}
```

删除按钮：

```tsx
// src/features/users/components/DeleteUserButton.tsx
import { useDeleteUserMutation } from '../mutations';

type DeleteUserButtonProps = {
  userId: string;
};

export function DeleteUserButton({ userId }: DeleteUserButtonProps) {
  const { mutate, isPending } = useDeleteUserMutation();

  return (
    <button onClick={() => mutate(userId)} disabled={isPending}>
      {isPending ? '删除中...' : '删除'}
    </button>
  );
}
```

列表组件：

```tsx
// src/features/users/components/UserTable.tsx
import { useQuery } from '@tanstack/react-query';
import { usersQueryOptions } from '../queryOptions';
import { DeleteUserButton } from './DeleteUserButton';

export function UserTable() {
  const {
    data: users,
    isPending,
    isError,
    refetch,
  } = useQuery(
    usersQueryOptions(
      {
        page: 1,
        limit: 20,
      },
      {
        select: (response) => response.users,
      },
    ),
  );

  if (isPending) {
    return <div>用户加载中...</div>;
  }

  if (isError) {
    return (
      <div>
        <p>用户加载失败</p>
        <button onClick={() => refetch()}>重试</button>
      </div>
    );
  }

  if (users.length === 0) {
    return <div>暂无用户</div>;
  }

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>
          <span>{user.name}</span>
          <span>{user.email}</span>
          <DeleteUserButton userId={user.id} />
        </div>
      ))}
    </div>
  );
}
```

组件没有拼 URL，没有写 `queryKey`，没有写 invalidate，也没有理解缓存失效细节。

它只关心：

- 数据是什么。
- 是否 loading。
- 是否 error。
- 用户点击后触发什么动作。

这就是组件层和数据层的边界。

---

## 12. 无限分页：useInfiniteQuery 怎么落地

普通 `useQuery` 适合一次请求一页或一份数据。

如果业务是“加载更多”“无限滚动”“历史记录往下翻”，应该使用 `useInfiniteQuery`。

前提是后端必须支持分页。

例如接口支持：

```text
GET /api/users?page=1&limit=20
GET /api/users?page=2&limit=20
```

如果后端不支持分页，前端用 `useInfiniteQuery` 没有意义。它不能凭空把一次性返回的 10 万条数据变成真正的分页请求。

封装 infinite query options：

```ts
// src/features/users/queryOptions.ts
import { infiniteQueryOptions } from '@tanstack/react-query';
import { getUsers } from './api';
import { userQueryKeys } from './queryKeys';
import type { GetUsersParams } from './types';

export function usersInfiniteQueryOptions(
  params?: Omit<GetUsersParams, 'page'>,
) {
  return infiniteQueryOptions({
    queryKey: userQueryKeys.list(params),
    queryFn: ({ pageParam }) =>
      getUsers({
        ...params,
        page: pageParam,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.hasMore) {
        return lastPage.pagination.currentPage + 1;
      }

      return undefined;
    },
  });
}
```

关键点：

- `initialPageParam: 1` 表示第一页从 1 开始。如果后端从 0 开始，这里就写 0。
- `queryFn` 可以从参数里拿到 `pageParam`，这个值就是当前要请求的页码。
- `getNextPageParam` 决定下一页是什么。如果返回 `undefined`，TanStack Query 会认为没有下一页。

---

## 13. 无限分页组件消费

```tsx
// src/features/users/components/UserInfiniteList.tsx
import { useInfiniteQuery } from '@tanstack/react-query';
import { usersInfiniteQueryOptions } from '../queryOptions';

export function UserInfiniteList() {
  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery(
    usersInfiniteQueryOptions({
      limit: 20,
    }),
  );

  const users = data?.pages.flatMap((page) => page.users) ?? [];

  if (isPending) {
    return <div>加载中...</div>;
  }

  if (isError) {
    return <div>加载失败</div>;
  }

  return (
    <div>
      {users.map((user) => (
        <div key={user.id}>{user.name}</div>
      ))}

      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage
          ? '加载中...'
          : hasNextPage
            ? '加载更多'
            : '没有更多了'}
      </button>
    </div>
  );
}
```

`useInfiniteQuery` 返回的数据结构不是普通数组，而是：

```ts
// src/features/users/infinite-data-shape.ts
const data = {
  pages: [
    {
      users: [],
      pagination: {},
    },
    {
      users: [],
      pagination: {},
    },
  ],
};
```

如果 UI 是“加载更多”，通常会用：

```ts
// src/features/users/components/UserInfiniteList.tsx
const users = data?.pages.flatMap((page) => page.users) ?? [];
```

如果 UI 是传统分页器，比如第 1 页、第 2 页、第 3 页，可以根据当前页索引取：

```ts
// src/features/users/components/UserPagedList.tsx
const currentPageData = data?.pages[currentPage - 1];
```

两种模式都合理，取决于业务交互。

---

## 14. select：让组件拿到刚好需要的数据

`select` 是 TanStack Query 很实用但容易被忽略的配置。

它可以把接口返回数据转换成组件真正需要的数据形状。

接口返回：

```ts
// src/features/users/types.ts
type GetUsersResponse = {
  users: User[];
  pagination: Pagination;
};
```

组件只展示用户数组：

```tsx
// src/features/users/components/UserTable.tsx
const { data: users } = useQuery(
  usersQueryOptions(
    {
      page: 1,
      limit: 20,
    },
    {
      select: (data) => data.users,
    },
  ),
);
```

也可以在 `select` 里做排序或裁剪：

```tsx
// src/features/users/components/LatestUsers.tsx
const { data: latestUsers } = useQuery(
  usersQueryOptions(undefined, {
    select: (data) =>
      [...data.users].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      ),
  }),
);
```

注意这里用了 `[...data.users]`，而不是直接 `data.users.sort()`。

因为 `sort()` 会原地修改数组，真实项目里不要直接修改缓存数据引用。

`select` 的另一个价值是减少组件重渲染范围。比如组件只关心第一个用户：

```tsx
// src/features/users/components/FirstUser.tsx
const { data: firstUser } = useQuery(
  usersQueryOptions(undefined, {
    select: (data) => data.users[0],
  }),
);
```

这不是每个页面都必须做的优化，但在数据结构很大、组件很重时有价值。

---

## 15. refetchInterval 和 refetchOnWindowFocus

有些数据需要定时刷新，比如任务进度、订单状态、行情价格、系统通知数量。

可以使用 `refetchInterval`：

```tsx
// src/features/users/components/PollingUsers.tsx
const { data } = useQuery(
  usersQueryOptions(undefined, {
    refetchInterval: 5_000,
  }),
);
```

这表示组件挂载期间每 5 秒重新请求一次。组件卸载后，这个轮询不会继续运行。

也可以根据数据状态动态决定是否轮询：

```tsx
// src/features/users/components/DynamicPollingUsers.tsx
const { data } = useQuery(
  usersQueryOptions(undefined, {
    refetchInterval: (query) => {
      const users = query.state.data?.users;

      if (!users || users.length === 0) {
        return false;
      }

      return 5_000;
    },
  }),
);
```

另一个常见配置是 `refetchOnWindowFocus`。

TanStack Query 默认在窗口重新聚焦时，如果数据已经 stale，会自动 refetch。这对大多数业务是合理的。

如果不希望切回来刷新：

```tsx
// src/features/users/components/NoFocusRefetchUsers.tsx
useQuery(
  usersQueryOptions(undefined, {
    refetchOnWindowFocus: false,
  }),
);
```

如果希望不管 staleTime 如何，窗口聚焦时都刷新：

```tsx
// src/features/users/components/AlwaysFocusRefetchUsers.tsx
useQuery(
  usersQueryOptions(undefined, {
    refetchOnWindowFocus: 'always',
  }),
);
```

真实项目里不要所有 query 都统一关闭窗口聚焦刷新。订单、通知、任务进度这类数据，窗口聚焦刷新往往是有价值的。

---

## 16. placeholderData 和 initialData 的区别

`placeholderData` 是临时占位数据，不会真正进入缓存。它适合减少页面闪烁。

常见写法：

```tsx
// src/features/users/components/PagedUsers.tsx
import { keepPreviousData, useQuery } from '@tanstack/react-query';

useQuery(
  usersQueryOptions(
    {
      page,
      limit,
    },
    {
      placeholderData: keepPreviousData,
    },
  ),
);
```

当 `page` 或 `limit` 变化时，新请求还没回来之前，页面继续显示旧数据。用户不会看到列表瞬间清空再出现。

`initialData` 不一样。它会进入 TanStack Query 的缓存，并被当成真实数据处理。

```tsx
// src/features/users/components/UsersWithInitialData.tsx
useQuery(
  usersQueryOptions(undefined, {
    initialData: {
      users: [],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasMore: false,
      },
    },
    staleTime: 60_000,
  }),
);
```

这表示初始数据 60 秒内是 fresh。TanStack Query 可能不会立刻请求真实接口。

`initialData` 更适合这些场景：

- SSR / loader 已经提前拿到数据。
- 详情页可以从列表页缓存里找一份初始数据。
- 页面首次展示需要可靠的初始快照。

详情页复用列表缓存示例：

```ts
// src/features/users/queryOptions.ts
import { queryOptions, type QueryClient } from '@tanstack/react-query';
import { getUserDetail } from './api';
import { userQueryKeys } from './queryKeys';
import type { GetUsersResponse } from './types';

export function userDetailQueryOptionsWithInitialData(
  queryClient: QueryClient,
  userId: string,
) {
  return queryOptions({
    queryKey: userQueryKeys.detail(userId),
    queryFn: () => getUserDetail(userId),
    initialData: () => {
      const listData = queryClient.getQueryData<GetUsersResponse>(
        userQueryKeys.list({
          page: 1,
          limit: 20,
        }),
      );

      return listData?.users.find((user) => user.id === userId);
    },
    staleTime: 30_000,
  });
}
```

注意：这种做法要求你清楚列表数据和详情数据是否一致。

如果详情接口字段更多，而列表只有基础字段，就不能盲目把列表项当成完整详情。

---

## 17. prefetch：让用户感觉页面更快

预取的目的不是减少请求，而是提前请求。

典型场景：

- 用户 hover 一个“查看详情”按钮。
- 鼠标进入某个菜单。
- 列表项进入视口。
- 用户下一步大概率进入详情页。

```tsx
// src/features/users/components/UserDetailLink.tsx
import { useQueryClient } from '@tanstack/react-query';
import { userDetailQueryOptions } from '../queryOptions';

type UserDetailLinkProps = {
  userId: string;
};

export function UserDetailLink({ userId }: UserDetailLinkProps) {
  const queryClient = useQueryClient();

  const prefetch = () => {
    queryClient.prefetchQuery(userDetailQueryOptions(userId));
  };

  return <button onMouseEnter={prefetch}>查看详情</button>;
}
```

当用户 hover 按钮时，请求已经开始。用户真正点击进入详情页时，如果数据已经在缓存里，详情页就可以少展示一次 loading。

预取不要滥用。它适合“用户下一步大概率会打开”的数据，不适合把所有列表项详情都一次性预取，否则会制造额外接口压力。

---

## 18. 完整业务示例

下面把前面的封装串起来，形成一个接近真实项目的用户模块。

```tsx
// src/features/users/components/UserManagementPage.tsx
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  userDetailQueryOptions,
  usersInfiniteQueryOptions,
} from '../queryOptions';
import { useCreateUserMutation, useDeleteUserMutation } from '../mutations';

export function UserManagementPage() {
  const queryClient = useQueryClient();

  const {
    data,
    isPending,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery(
    usersInfiniteQueryOptions({
      limit: 20,
      keyword: '',
    }),
  );

  const users = data?.pages.flatMap((page) => page.users) ?? [];
  const createUserMutation = useCreateUserMutation();
  const deleteUserMutation = useDeleteUserMutation();

  const handleCreate = () => {
    createUserMutation.mutate({
      name: `User ${Date.now()}`,
      email: `user-${Date.now()}@example.com`,
    });
  };

  const handlePrefetchDetail = (userId: string) => {
    queryClient.prefetchQuery(userDetailQueryOptions(userId));
  };

  if (isPending) {
    return <div>正在加载用户...</div>;
  }

  if (isError) {
    return (
      <div>
        <p>用户列表加载失败</p>
        <button onClick={() => refetch()}>重新加载</button>
      </div>
    );
  }

  return (
    <section>
      <header>
        <h1>用户管理</h1>
        <button onClick={handleCreate} disabled={createUserMutation.isPending}>
          {createUserMutation.isPending ? '创建中...' : '创建用户'}
        </button>
      </header>

      {users.length === 0 ? (
        <div>暂无用户</div>
      ) : (
        <div>
          {users.map((user) => (
            <div
              key={user.id}
              onMouseEnter={() => handlePrefetchDetail(user.id)}
            >
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>

              <button
                onClick={() => deleteUserMutation.mutate(user.id)}
                disabled={deleteUserMutation.isPending}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}

      <footer>
        <button
          onClick={() => fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage
            ? '加载中...'
            : hasNextPage
              ? '加载更多'
              : '没有更多了'}
        </button>
      </footer>
    </section>
  );
}
```

这个页面里有几条完整的数据流：

- 页面挂载后，通过 `usersInfiniteQueryOptions` 拉取第一页用户。
- 点击“加载更多”后，`fetchNextPage` 根据 `getNextPageParam` 请求下一页。
- 点击“创建用户”后，mutation 调用 POST 接口，成功后 invalidate 用户列表缓存，列表自动刷新。
- 点击“删除”后，mutation 调用 DELETE 接口，成功后同样 invalidate 用户列表缓存。
- 鼠标移入用户行时，提前 prefetch 用户详情。

组件不需要关心 `queryKey` 规则，不需要手动拼分页 URL，也不需要在创建和删除后自己维护数组。

缓存同步交给 TanStack Query，业务边界更稳定。

---

## 19. 错误处理、重试和生命周期

TanStack Query 默认会对失败请求做 retry。这个策略不是所有业务都适合。

比如网络抖动、500 错误，可以重试；但 401、403、参数错误、余额不足、业务校验失败，不应该无脑重试。

可以在 `QueryClient` 里做全局默认配置：

```ts
// src/app/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false;
        }

        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }

        return true;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
});
```

写操作一般不建议默认 retry。

比如创建订单、提交支付、打开盲盒、链上交易这类操作，重复提交可能造成严重后果。

mutation 是否重试应该由具体业务决定。

---

## 20. enabled：控制是否真正发请求

`enabled` 很重要。

比如详情接口依赖 `userId`，用户未登录时不请求私有接口：

```ts
// src/features/users/queryOptions.ts
export function userDetailQueryOptions(userId: string) {
  return queryOptions({
    queryKey: userQueryKeys.detail(userId),
    queryFn: () => getUserDetail(userId),
    enabled: Boolean(userId),
  });
}
```

如果需要登录态：

```tsx
// src/features/users/components/AuthedUsers.tsx
useQuery(
  usersQueryOptions(params, {
    enabled: isAuthed,
  }),
);
```

不要在组件里写：

```tsx
// src/features/users/components/BadAuthedUsers.tsx
if (isAuthed) {
  useQuery(usersQueryOptions(params));
}
```

Hook 不能条件调用。应该始终调用 hook，用 `enabled` 控制是否真正请求。

---

## 21. 真实项目里的典型落地方式

后台管理系统里，TanStack Query 最常见的是表格筛选和 CRUD。

筛选条件变化时，不要手动 `refetch` 后再 `setState`，而是让筛选条件进入 `queryKey`：

```tsx
// src/features/users/components/UserTablePage.tsx
const params = {
  page,
  limit,
  keyword,
  status,
};

const query = useQuery(usersQueryOptions(params));
```

当 `params` 变化，`queryKey` 变化，TanStack Query 会自动识别为另一份查询。

订单系统里，创建订单成功后至少要刷新订单列表，有时还要刷新账户余额：

```ts
// src/features/orders/mutations.ts
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: orderQueryKeys.lists(),
  });
  queryClient.invalidateQueries({
    queryKey: accountQueryKeys.detail(),
  });
};
```

金融行情或任务进度里，可以用 `refetchInterval` 做轻量轮询。

但如果消息频率非常高，或者需要服务端主动推送，则应该考虑 SSE 或 WebSocket。

TanStack Query 可以负责初始快照和历史数据，实时事件到达后再用 `setQueryData` 或 `invalidateQueries` 同步缓存。

收到一条订单更新事件后，可以简单失效：

```ts
// src/features/orders/realtime.ts
queryClient.invalidateQueries({
  queryKey: orderQueryKeys.lists(),
});
```

也可以直接局部更新缓存：

```ts
// src/features/orders/realtime.ts
queryClient.setQueryData(orderQueryKeys.detail(order.id), order);
```

前者简单稳妥，后者更快，但要求你准确维护缓存结构。

---

## 22. 工程化注意事项

第一，`queryKey` 必须集中管理。不要在组件、mutation、prefetch 里到处手写 `['users']`。

第二，所有影响请求结果的参数都必须进入 `queryKey`。分页、筛选、排序、搜索词、用户 ID、状态 tab 都不能漏。

第三，`queryOptions` 比简单 custom hook 更灵活。它可以同时用于 `useQuery`、`prefetchQuery`、SSR、loader 和测试。

第四，mutation 成功后要明确失效哪些缓存。不要无脑 invalidate 全部 query cache。

第五，`staleTime` 不是越长越好。它本质上是在“减少请求”和“数据新鲜度”之间做取舍。

第六，`placeholderData` 适合防闪烁，`initialData` 会进入缓存，不要混用。

第七，`select` 里不要原地修改缓存数据，比如直接 `sort()`。要先复制数组。

第八，无限分页必须依赖后端分页能力。前端不能用 `useInfiniteQuery` 弥补后端一次性返回大量数据的问题。

第九，mutation 不一定每次都必须用。如果只是非常简单的一次性操作，并且不需要 pending、error、onSuccess、onSettled 等能力，直接调用 API 再 invalidate 也可以。但大多数中大型业务里，mutation 封装会更稳定。

第十，不要把 React Query 的 `data` 再复制到 Zustand 或 Redux。接口数据优先留在 Query Cache。Zustand / Redux 更适合保存筛选条件、弹窗状态、当前选中项、流程状态等 client state。

---

## 23. 总结

TanStack Query 写得好不好，不取决于会不会写 `useQuery`，而取决于能不能把 server state 的生命周期设计清楚。

一个可维护的 TanStack Query 模块，通常会有：

- 稳定的 `queryKey` 规则。
- 独立的 API function。
- 可复用的 `queryOptions`。
- 明确的 mutation 缓存失效策略。
- 足够薄的组件层。

组件只消费结果和触发动作，不直接管理缓存，不直接拼请求，不直接理解后端分页细节。

在真实项目里，TanStack Query 的核心价值是让接口数据变成一套可管理的缓存系统。

列表、详情、创建、删除、分页、预取、刷新、重试都围绕 query cache 协作。

把这套边界建立起来之后，业务继续扩展时，你不会在每个组件里重复处理同一批异步问题，项目也更容易长期维护。
