# Next.js 认证不只是保护页面：从 Middleware、Server Action 到 Data Access Layer 的工程化实践

很多 Next.js 项目做认证时，第一反应是“把 dashboard 页面保护起来”。这当然没错，但只保护页面远远不够。真实项目里，用户数据通常不是只在页面组件里读取，还会通过 Server Actions 写入，通过 Route Handlers 接收 webhook，通过共享组件间接访问数据。只要其中一个入口漏掉鉴权，整套认证体系就会出现绕过风险。

Next.js App Router 把前后端边界变得更紧密：Server Component、Client Component、Server Action、Route Handler、Middleware 都可能参与业务链路。认证也因此不能只理解成“登录后跳转页面”，而要理解成一套围绕数据访问、用户身份、权限判断和渲染策略的工程化设计。

本文以一个“费用管理后台”为例，讲清楚 Next.js 项目里到底应该保护什么、怎么保护、哪些写法看起来能跑但不安全，以及如何把认证逻辑沉到 Data Access Layer 里，降低团队协作中的遗漏风险。

---

## 1. Next.js 认证到底解决什么问题

认证 Authentication 解决的是“你是谁”的问题。比如当前请求是否携带有效的 access token，能否识别出 userId、email、avatar、roles 等信息。

授权 Authorization 解决的是“你能做什么”的问题。比如用户虽然已经登录，但能不能编辑某一条费用记录？能不能删除别人的数据？是不是 Pro 用户？是不是 admin？

在 Next.js App Router 项目里，认证通常要覆盖这些位置：

第一，Server Components。比如 `/dashboard/page.tsx` 里读取数据库数据，必须确认用户已登录，否则不能返回私有数据。

第二，Server Actions。比如添加费用、编辑资料、提交订单、删除文章，这些都是写操作。Server Action 本质上仍然会被 Next.js 转成一次请求，不能因为它“写在服务端文件里”就认为天然安全。

第三，Route Handlers。比如 `/api/webhooks/stripe/route.ts`、第三方回调、传统 REST API，都需要根据场景做 token、signature、session 或 webhook secret 校验。

第四，Middleware。它适合做路由层面的第一道防线，例如未登录访问 `/dashboard` 时重定向到登录页。

第五，Client Components。客户端通常不负责真正的数据安全，但可以用来展示用户头像、邮箱、登录按钮、登出按钮。注意：客户端认证信息主要用于 UI 状态，不应该作为服务端数据访问的安全依据。

认证适合保护私有后台、SaaS 控制台、订单系统、账户中心、内容管理系统、支付后功能、会员功能。不适合把所有安全判断都放在浏览器里。浏览器端代码可以被篡改，真正的安全边界必须在服务端。

---

## 2. 最简单的写法是什么

最容易想到的写法是在页面里检查用户是否登录：

```tsx
// app/dashboard/page.tsx
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const expenses = await db.expense.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <main>
      <h1>Dashboard</h1>
      <ul>
        {expenses.map(expense => (
          <li key={expense.id}>
            {expense.description} - {expense.amount}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

这段代码能跑。未登录用户访问 `/dashboard` 会被重定向，登录用户可以看到自己的费用记录。

然后你可能会在 Server Action 里也写一段类似逻辑：

```ts
// features/expenses/actions.ts
'use server';

import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export async function createExpense(formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const description = String(formData.get('description') ?? '');
  const amount = Number(formData.get('amount') ?? 0);

  await db.expense.create({
    data: {
      userId: user.id,
      description,
      amount,
    },
  });

  revalidatePath('/dashboard');
}
```

这也能跑。问题在于：随着项目变大，这种写法会快速变成重复、分散、容易漏的认证逻辑。

---

## 3. 简单写法在真实项目中的问题

只在页面里做鉴权，最大的问题是它保护的是“页面访问”，不是“数据访问”。

比如 `/dashboard` 被 Middleware 或 Page 保护了，但某个 Server Action 被复用到了公开首页，或者某个组件被其他同事复用到了未保护路由，原来依赖路由保护的假设就失效了。

Server Action 也容易被低估。很多人觉得 Server Action 是写在服务端的函数，就不需要额外保护。但 Server Action 仍然对应一次从客户端发起到服务端的请求。只要它会读写数据库，就应该在函数内部靠近数据库操作的位置重新做认证和参数校验。

还有一个常见问题是把认证 Authentication 和授权 Authorization 混为一谈。比如编辑费用记录时，只检查“用户是否登录”是不够的。攻击者如果构造一个属于其他用户的 `expenseId`，而你的 update 语句只按 id 更新，就可能修改别人的数据。

错误示例：

```ts
'use server';

import {getCurrentUser} from '@/lib/auth';
import {db} from '@/lib/db';

export async function updateExpense(expenseId: string, formData: FormData) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const description = String(formData.get('description') ?? '');
  const amount = Number(formData.get('amount') ?? 0);

  await db.expense.update({
    where: {
      id: expenseId,
    },
    data: {
      description,
      amount,
    },
  });
}
```

这段代码只证明“请求来自一个已登录用户”，没有证明“这个用户拥有这条 expense”。真实项目里这类问题很常见，尤其出现在编辑、删除、导出、审批、支付、订单详情等接口里。

还有一个 Next.js 特有的坑：在全局 Header 这种 app-wide 组件里直接读取服务端 cookies 或 headers，会让很多页面从静态渲染变成动态渲染。比如在根 layout 的 Header 里调用服务端认证函数获取用户信息，可能导致首页、文章页、营销页全部失去静态渲染优势。

---

## 4. 推荐的项目落地结构

认证模块不要散落在 pages、components、actions 里。建议把“认证能力”“路由保护”“数据访问”“业务表单”拆开。

一个精简但适合真实项目的结构可以这样设计：

```txt
src/
  middleware.ts
  lib/
    auth/
      server.ts
      client.ts
      permissions.ts
    db.ts
  data/
    expenses.ts
  features/
    expenses/
      schemas.ts
      actions.ts
      components/
        ExpenseForm.tsx
        ExpenseList.tsx
  app/
    page.tsx
    dashboard/
      page.tsx
```

`middleware.ts` 负责路由级保护，比如 `/dashboard`、`/settings`、`/billing` 必须登录后访问。它是第一道防线，但不是唯一防线。

`lib/auth/server.ts` 封装服务端获取用户、要求登录、获取角色等逻辑。Server Component、Server Action、Route Handler、Data Access Layer 都应该通过这里拿用户信息。

`lib/auth/client.ts` 封装客户端用户信息读取。它只服务 UI，比如显示头像、邮箱、登录按钮、登出按钮，不负责真正保护数据。

`lib/auth/permissions.ts` 放权限判断函数，比如 `canEditExpense`、`isAdmin`、`hasPermission`。授权逻辑不要散落在组件里。

`data/expenses.ts` 是 Data Access Layer。所有和 expense 表相关的数据库读写都从这里走，并在这里做认证、授权和数据隔离。

`features/expenses/actions.ts` 只处理表单提交、调用 DAL、触发 revalidate，不直接到处写数据库查询。

`features/expenses/schemas.ts` 放 Zod schema，统一校验 Server Action 输入。不要相信 `FormData` 一定来自你页面上的表单。

这个结构的重点不是“目录看起来高级”，而是把安全边界往数据访问处收拢。无论某个组件被复用到哪里，只要它最终调用的是 DAL，就不会绕过认证检查。

---

## 5. 推荐写法一：把认证能力封装到 server auth

先封装服务端认证函数。这里不绑定具体服务商，可以替换成 NextAuth、Clerk、Kinde、自研 JWT、Session Cookie 等方案。

```ts
// lib/auth/server.ts
import {cookies} from 'next/headers';

export type AuthUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  roles: string[];
};

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    return null;
  }

  // 这里用伪代码表示。
  // 真实项目里可以调用 auth provider SDK，或者 verify JWT/session。
  const user = await verifyAccessToken(token);

  if (!user) {
    return null;
  }

  return {
    id: user.sub,
    email: user.email,
    name: user.name,
    image: user.picture,
    roles: user.roles ?? [],
  };
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

async function verifyAccessToken(token: string): Promise<any | null> {
  try {
    // 示例：实际项目里替换成 jose、NextAuth、Clerk、Kinde SDK 等。
    return {
      sub: 'user_123',
      email: 'demo@example.com',
      name: 'Demo User',
      picture: null,
      roles: ['basic-user'],
    };
  } catch {
    return null;
  }
}
```

这里的关键是提供两个层级：

`getCurrentUser()` 适合“可登录可不登录”的场景，比如 Header 里判断是否显示登录按钮。

`requireUser()` 适合私有数据访问，一旦没有用户就直接抛错，不让业务代码继续往下走。

然后封装权限判断：

```ts
// lib/auth/permissions.ts
import type {AuthUser} from './server';

export function hasRole(user: AuthUser, role: string) {
  return user.roles.includes(role);
}

export function isAdmin(user: AuthUser) {
  return hasRole(user, 'admin');
}

export function canCreateExpense(user: AuthUser) {
  return hasRole(user, 'basic-user') || hasRole(user, 'admin');
}

export function canManageAllExpenses(user: AuthUser) {
  return isAdmin(user);
}
```

权限函数要独立出来。不要在每个 action 里写 `user.roles[0] === 'admin'` 这种判断，否则角色命名、权限升级、套餐变更时会非常难改。

---

## 6. 推荐写法二：Middleware 做路由级第一道防线

Middleware 适合保护一批路由。比如 `/dashboard` 下面所有页面都需要登录：

```ts
// middleware.ts
import {NextResponse, type NextRequest} from 'next/server';

const protectedRoutes = ['/dashboard', '/settings', '/billing'];

function isProtectedPath(pathname: string) {
  return protectedRoutes.some(route => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export function middleware(request: NextRequest) {
  const {pathname} = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

Middleware 的价值是集中管理路由访问规则。相比每个 Page 里都写一次 `if (!user) redirect('/login')`，Middleware 更容易看出哪些路由是私有的。

但要注意，Middleware 不是最终安全边界。它不能替代 Server Action、Route Handler、DAL 里的认证检查。原因很简单：数据访问不一定只发生在受保护页面里。

---

## 7. 推荐写法三：Data Access Layer 才是数据安全的核心

真实项目里最推荐的做法是：所有数据库访问都从 DAL 走，并在 DAL 内部做认证和授权。

以费用管理为例，先定义输入 schema：

```ts
// features/expenses/schemas.ts
import {z} from 'zod';

export const createExpenseSchema = z.object({
  description: z.string().min(1, 'Description is required').max(100),
  amount: z.coerce.number().positive('Amount must be positive'),
});

export const updateExpenseSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1).max(100),
  amount: z.coerce.number().positive(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
```

然后写 DAL：

```ts
// data/expenses.ts
import {db} from '@/lib/db';
import {ForbiddenError, requireUser} from '@/lib/auth/server';
import {canCreateExpense, canManageAllExpenses} from '@/lib/auth/permissions';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/features/expenses/schemas';

export async function getMyExpenses() {
  const user = await requireUser();

  return db.expense.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function createExpense(input: CreateExpenseInput) {
  const user = await requireUser();

  if (!canCreateExpense(user)) {
    throw new ForbiddenError('You do not have permission to create expenses');
  }

  return db.expense.create({
    data: {
      userId: user.id,
      description: input.description,
      amount: input.amount,
    },
  });
}

export async function updateExpense(input: UpdateExpenseInput) {
  const user = await requireUser();

  const expense = await db.expense.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  const isOwner = expense.userId === user.id;
  const canManageAll = canManageAllExpenses(user);

  if (!isOwner && !canManageAll) {
    throw new ForbiddenError('You cannot edit this expense');
  }

  return db.expense.update({
    where: {
      id: input.id,
    },
    data: {
      description: input.description,
      amount: input.amount,
    },
  });
}

export async function deleteExpense(id: string) {
  const user = await requireUser();

  const expense = await db.expense.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  const isOwner = expense.userId === user.id;
  const canManageAll = canManageAllExpenses(user);

  if (!isOwner && !canManageAll) {
    throw new ForbiddenError('You cannot delete this expense');
  }

  return db.expense.delete({
    where: {
      id,
    },
  });
}
```

这段代码里有几个关键点。

读取列表时，始终按 `userId` 过滤。不能先查全部再在前端过滤。

创建数据时，`userId` 来自服务端当前用户，而不是来自客户端提交。客户端传来的 `userId` 不可信。

编辑和删除时，先查数据归属，再判断当前用户是不是 owner 或 admin。只检查登录状态不够。

数据库访问集中在 `data/expenses.ts`，而不是散落在 page、action、component 里。这样团队里有人复用组件、移动路由、重构页面时，不容易绕过安全逻辑。

---

## 8. Server Action 只做表单入口，不直接承载复杂业务

Server Action 应该尽量薄。它负责把 `FormData` 转成结构化对象，做 schema 校验，调用 DAL，然后 revalidate 或 redirect。

```ts
// features/expenses/actions.ts
'use server';

import {revalidatePath} from 'next/cache';
import {createExpense, deleteExpense, updateExpense} from '@/data/expenses';
import {createExpenseSchema, updateExpenseSchema} from './schemas';

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function createExpenseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = createExpenseSchema.safeParse({
    description: formData.get('description'),
    amount: formData.get('amount'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createExpense(parsed.data);
    revalidatePath('/dashboard');
    return {
      ok: true,
      message: 'Expense created',
    };
  } catch (error) {
    return {
      ok: false,
      message: getActionErrorMessage(error),
    };
  }
}

export async function updateExpenseAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateExpenseSchema.safeParse({
    id: formData.get('id'),
    description: formData.get('description'),
    amount: formData.get('amount'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateExpense(parsed.data);
    revalidatePath('/dashboard');
    return {
      ok: true,
      message: 'Expense updated',
    };
  } catch (error) {
    return {
      ok: false,
      message: getActionErrorMessage(error),
    };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionState> {
  try {
    await deleteExpense(id);
    revalidatePath('/dashboard');
    return {
      ok: true,
      message: 'Expense deleted',
    };
  } catch (error) {
    return {
      ok: false,
      message: getActionErrorMessage(error),
    };
  }
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong';
}
```

这里不要把 Server Action 写成“大杂烩”。它不是放所有业务逻辑的地方。否则一旦 Route Handler、后台任务、管理员操作也要复用同一套逻辑，你会发现这些逻辑都被锁死在 action 文件里。

更好的边界是：

- Server Action 负责请求入口和缓存刷新。
- Zod schema 负责输入校验。
- DAL 负责数据库访问、认证、授权。
- 权限函数负责角色和操作判断。

---

## 9. 组件如何消费封装后的结果

组件只负责提交表单、展示错误、触发 action。它不应该知道数据库结构，也不应该自己判断用户能不能写数据库。

```tsx
// features/expenses/components/ExpenseForm.tsx
'use client';

import {useActionState} from 'react';
import {createExpenseAction, type ActionState} from '../actions';

const initialState: ActionState = {
  ok: false,
};

export function ExpenseForm() {
  const [state, formAction, isPending] = useActionState(
    createExpenseAction,
    initialState,
  );

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="description">Description</label>
        <input id="description" name="description" />
        {state.fieldErrors?.description?.map(error => (
          <p key={error}>{error}</p>
        ))}
      </div>

      <div>
        <label htmlFor="amount">Amount</label>
        <input id="amount" name="amount" type="number" step="0.01" />
        {state.fieldErrors?.amount?.map(error => (
          <p key={error}>{error}</p>
        ))}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Add expense'}
      </button>

      {!state.ok && state.message ? <p>{state.message}</p> : null}
    </form>
  );
}
```

列表组件也保持简单：

```tsx
// features/expenses/components/ExpenseList.tsx
type Expense = {
  id: string;
  description: string;
  amount: number;
  createdAt: Date;
};

type ExpenseListProps = {
  expenses: Expense[];
};

export function ExpenseList({expenses}: ExpenseListProps) {
  if (expenses.length === 0) {
    return <p>No expenses yet.</p>;
  }

  return (
    <ul>
      {expenses.map(expense => (
        <li key={expense.id}>
          <span>{expense.description}</span>
          <span>{expense.amount}</span>
        </li>
      ))}
    </ul>
  );
}
```

页面组件负责组合：

```tsx
// app/dashboard/page.tsx
import {getMyExpenses} from '@/data/expenses';
import {ExpenseForm} from '@/features/expenses/components/ExpenseForm';
import {ExpenseList} from '@/features/expenses/components/ExpenseList';

export default async function DashboardPage() {
  const expenses = await getMyExpenses();

  return (
    <main>
      <h1>Expenses</h1>
      <ExpenseForm />
      <ExpenseList expenses={expenses} />
    </main>
  );
}
```

注意这里没有在 Page 里手写 `requireUser()`。因为 `getMyExpenses()` 内部已经要求登录。即使将来某个同事把 `ExpenseList` 或数据获取逻辑挪到其他私有页面，DAL 仍然会保护数据。

---

## 10. 客户端展示用户信息：不要把所有页面都拖成动态渲染

很多项目会在全局 Header 里显示用户头像和邮箱。最直接的写法是在服务端 Header 里读取用户：

```tsx
// 不推荐：全局 Header 中读取服务端 cookies/headers
import {getCurrentUser} from '@/lib/auth/server';

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header>
      {user ? <span>{user.email}</span> : <span>Not logged in</span>}
    </header>
  );
}
```

如果这个 Header 被放在根 layout 里，就可能让使用它的页面都变成动态渲染。对于营销首页、文档页、公开文章页，这通常不是你想要的。

更稳妥的方式是把全局用户展示做成 Client Component，通过客户端 SDK 或 `/api/me` 获取用户信息。它会多一次客户端请求，但可以保留页面静态渲染能力。

```ts
// lib/auth/client.ts
'use client';

import {useEffect, useState} from 'react';

type ClientUser = {
  id: string;
  email: string;
  image?: string | null;
};

export function useCurrentUser() {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadUser() {
      try {
        const res = await fetch('/api/me');

        if (!res.ok) {
          if (!ignore) setUser(null);
          return;
        }

        const data = (await res.json()) as ClientUser;

        if (!ignore) {
          setUser(data);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      ignore = true;
    };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: Boolean(user),
  };
}
```

对应的 Route Handler：

```ts
// app/api/me/route.ts
import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth/server';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(null, {status: 401});
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    image: user.image,
  });
}
```

Header 组件：

```tsx
// components/HeaderUser.tsx
'use client';

import {useCurrentUser} from '@/lib/auth/client';

export function HeaderUser() {
  const {user, isLoading} = useCurrentUser();

  if (isLoading) {
    return <span>Loading...</span>;
  }

  if (!user) {
    return <a href="/login">Login</a>;
  }

  return (
    <div>
      {user.image ? (
        <img src={user.image} alt={user.email} width={24} height={24} />
      ) : null}
      <span>{user.email}</span>
      <a href="/logout">Logout</a>
    </div>
  );
}
```

这里的取舍很明确：安全判断仍然在服务端，客户端只负责展示用户状态。Header 不再强制所有页面读取 cookies/headers，从而避免无意间破坏静态渲染。

---

## 11. Route Handler 和 webhook 也要单独保护

Route Handler 不一定是给前端页面调用的。很多时候它用于第三方 webhook，比如 Stripe 支付成功通知、GitHub 回调、文件上传回调等。

这类场景不能简单用“当前登录用户”判断，因为请求可能来自第三方服务器，而不是浏览器用户。应该使用 signature 或 secret 校验。

```ts
// app/api/webhooks/payment/route.ts
import {NextResponse} from 'next/server';
import {db} from '@/lib/db';

export async function POST(request: Request) {
  const signature = request.headers.get('x-payment-signature');

  if (!signature) {
    return NextResponse.json({error: 'Missing signature'}, {status: 401});
  }

  const rawBody = await request.text();
  const valid = await verifyWebhookSignature(rawBody, signature);

  if (!valid) {
    return NextResponse.json({error: 'Invalid signature'}, {status: 403});
  }

  const event = JSON.parse(rawBody);

  await db.paymentEvent.create({
    data: {
      providerEventId: event.id,
      type: event.type,
      payload: event,
    },
  });

  return NextResponse.json({ok: true});
}

async function verifyWebhookSignature(body: string, signature: string) {
  // 真实项目里使用支付服务商提供的 SDK 校验。
  return Boolean(body && signature);
}
```

Route Handler 的认证方式取决于请求来源。浏览器用户请求通常校验 session/JWT；第三方系统请求通常校验 webhook signature；内部服务请求可能校验 service token。

---

## 12. 结合真实业务：费用管理 SaaS 的完整认证链路

以一个费用管理 SaaS 为例，真实业务链路通常是这样的：

用户访问首页，首页是公开页面，尽量保持静态渲染。Header 可以在客户端展示登录状态，但首页本身不应该因为 Header 读取 cookies 而变成动态渲染。

用户点击 Dashboard。Middleware 检查 `/dashboard` 是否需要登录。如果没有 access token，重定向到登录页；如果有 token，让请求继续。

Dashboard Server Component 调用 `getMyExpenses()`。这个函数位于 DAL 内部，会再次 `requireUser()`，然后按 `userId` 查询数据库，确保只能返回当前用户数据。

用户提交新增费用表单。Client Component 使用 Server Action 提交 `FormData`。Server Action 用 Zod 校验输入，调用 `createExpense()`。DAL 再次认证用户，并把服务端 `userId` 写入数据库。成功后 `revalidatePath('/dashboard')`，页面重新拿到最新数据。

用户编辑费用。Server Action 传入 `expenseId` 和表单数据。DAL 先查这条 expense 是否存在，再判断 `expense.userId === user.id` 或当前用户是否 admin。通过后才能 update。

管理员查看所有费用。普通用户走 `getMyExpenses()`；管理员页面可以走 `getAllExpensesForAdmin()`，函数内部必须检查 admin role。不要在 UI 上隐藏按钮就认为用户不能访问。

这个链路里，Middleware、Page、Server Action、DAL 都有自己的职责。Middleware 负责体验和第一道拦截；DAL 负责最终数据安全；组件负责展示和提交；权限函数负责业务规则。

---

## 13. 完整代码示例：一个可落地的费用模块

下面给出一组接近真实项目的简化代码。

先定义数据库客户端：

```ts
// lib/db.ts
import {PrismaClient} from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

定义认证和权限：

```ts
// lib/auth/server.ts
import {cookies} from 'next/headers';

export type AuthUser = {
  id: string;
  email: string;
  roles: string[];
};

export class UnauthorizedError extends Error {
  constructor() {
    super('Please login first');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Permission denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return null;
  }

  return {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles ?? [],
  };
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  return user;
}

async function verifyToken(token: string): Promise<any | null> {
  // 替换成真实认证 SDK 或 JWT verify。
  if (!token) return null;

  return {
    sub: 'user_123',
    email: 'demo@example.com',
    roles: ['basic-user'],
  };
}
```

```ts
// lib/auth/permissions.ts
import type {AuthUser} from './server';

export function isAdmin(user: AuthUser) {
  return user.roles.includes('admin');
}

export function canCreateExpense(user: AuthUser) {
  return user.roles.includes('basic-user') || isAdmin(user);
}

export function canEditExpense(user: AuthUser, expenseOwnerId: string) {
  return expenseOwnerId === user.id || isAdmin(user);
}

export function canDeleteExpense(user: AuthUser, expenseOwnerId: string) {
  return expenseOwnerId === user.id || isAdmin(user);
}
```

定义业务 schema：

```ts
// features/expenses/schemas.ts
import {z} from 'zod';

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1).max(100),
  amount: z.coerce.number().positive().max(999999),
});

export const updateExpenseSchema = createExpenseSchema.extend({
  id: z.string().min(1),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
```

Data Access Layer：

```ts
// data/expenses.ts
import {db} from '@/lib/db';
import {ForbiddenError, requireUser} from '@/lib/auth/server';
import {
  canCreateExpense,
  canDeleteExpense,
  canEditExpense,
} from '@/lib/auth/permissions';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
} from '@/features/expenses/schemas';

export async function getMyExpenses() {
  const user = await requireUser();

  return db.expense.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function createExpense(input: CreateExpenseInput) {
  const user = await requireUser();

  if (!canCreateExpense(user)) {
    throw new ForbiddenError('You cannot create expenses');
  }

  return db.expense.create({
    data: {
      userId: user.id,
      description: input.description,
      amount: input.amount,
    },
  });
}

export async function updateExpense(input: UpdateExpenseInput) {
  const user = await requireUser();

  const expense = await db.expense.findUnique({
    where: {
      id: input.id,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (!canEditExpense(user, expense.userId)) {
    throw new ForbiddenError('You cannot edit this expense');
  }

  return db.expense.update({
    where: {
      id: input.id,
    },
    data: {
      description: input.description,
      amount: input.amount,
    },
  });
}

export async function deleteExpense(id: string) {
  const user = await requireUser();

  const expense = await db.expense.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!expense) {
    throw new Error('Expense not found');
  }

  if (!canDeleteExpense(user, expense.userId)) {
    throw new ForbiddenError('You cannot delete this expense');
  }

  return db.expense.delete({
    where: {
      id,
    },
  });
}
```

Server Actions：

```ts
// features/expenses/actions.ts
'use server';

import {revalidatePath} from 'next/cache';
import {createExpense, deleteExpense, updateExpense} from '@/data/expenses';
import {createExpenseSchema, updateExpenseSchema} from './schemas';

export type ExpenseActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export async function createExpenseAction(
  _state: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const parsed = createExpenseSchema.safeParse({
    description: formData.get('description'),
    amount: formData.get('amount'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await createExpense(parsed.data);
    revalidatePath('/dashboard');
    return {
      ok: true,
      message: 'Created',
    };
  } catch (error) {
    return {
      ok: false,
      message: normalizeActionError(error),
    };
  }
}

export async function updateExpenseAction(
  _state: ExpenseActionState,
  formData: FormData,
): Promise<ExpenseActionState> {
  const parsed = updateExpenseSchema.safeParse({
    id: formData.get('id'),
    description: formData.get('description'),
    amount: formData.get('amount'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateExpense(parsed.data);
    revalidatePath('/dashboard');
    return {
      ok: true,
      message: 'Updated',
    };
  } catch (error) {
    return {
      ok: false,
      message: normalizeActionError(error),
    };
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    await deleteExpense(id);
    revalidatePath('/dashboard');
    return {
      ok: true,
      message: 'Deleted',
    };
  } catch (error) {
    return {
      ok: false,
      message: normalizeActionError(error),
    };
  }
}

function normalizeActionError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Request failed';
}
```

页面和组件：

```tsx
// app/dashboard/page.tsx
import {getMyExpenses} from '@/data/expenses';
import {ExpenseForm} from '@/features/expenses/components/ExpenseForm';
import {ExpenseList} from '@/features/expenses/components/ExpenseList';

export default async function DashboardPage() {
  const expenses = await getMyExpenses();

  return (
    <main>
      <h1>Expense Dashboard</h1>
      <ExpenseForm />
      <ExpenseList expenses={expenses} />
    </main>
  );
}
```

```tsx
// features/expenses/components/ExpenseForm.tsx
'use client';

import {useActionState} from 'react';
import {createExpenseAction, type ExpenseActionState} from '../actions';

const initialState: ExpenseActionState = {
  ok: false,
};

export function ExpenseForm() {
  const [state, action, isPending] = useActionState(
    createExpenseAction,
    initialState,
  );

  return (
    <form action={action}>
      <input name="description" placeholder="Description" />
      {state.fieldErrors?.description?.map(error => (
        <p key={error}>{error}</p>
      ))}

      <input name="amount" type="number" step="0.01" placeholder="Amount" />
      {state.fieldErrors?.amount?.map(error => (
        <p key={error}>{error}</p>
      ))}

      <button disabled={isPending}>{isPending ? 'Saving...' : 'Add'}</button>

      {!state.ok && state.message ? <p>{state.message}</p> : null}
    </form>
  );
}
```

```tsx
// features/expenses/components/ExpenseList.tsx
type Expense = {
  id: string;
  description: string;
  amount: number;
};

export function ExpenseList({expenses}: {expenses: Expense[]}) {
  return (
    <ul>
      {expenses.map(expense => (
        <li key={expense.id}>
          {expense.description} - {expense.amount}
        </li>
      ))}
    </ul>
  );
}
```

最后用 Middleware 做第一层路由保护：

```ts
// middleware.ts
import {NextResponse, type NextRequest} from 'next/server';

const protectedRoutes = ['/dashboard', '/settings', '/billing'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const shouldProtect = protectedRoutes.some(route => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });

  if (!shouldProtect) {
    return NextResponse.next();
  }

  const token = request.cookies.get('access_token')?.value;

  if (!token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}
```

这套代码里，Middleware、Server Action、DAL 都参与认证，但职责不同。Middleware 提升用户体验和路由保护；DAL 保证数据访问永远带着认证和授权；Server Action 负责输入校验、调用业务逻辑和刷新缓存。

---

## 14. 工程化注意事项

第一，不要只保护页面。页面保护只是第一层，真正关键的是保护数据读写位置。凡是访问数据库、调用内部服务、修改资源的地方，都应该靠近操作处做认证。

第二，不要把 Server Action 当成天然安全的函数。它依然是一个可被触发的服务端入口。输入要校验，用户要认证，资源归属要授权。

第三，不要把用户 id 从客户端传进来再写入数据库。创建订单、费用、文章、任务时，`ownerId` 必须来自服务端 session，而不是表单字段。

第四，编辑和删除一定要检查资源归属。`isAuthenticated` 只能说明用户登录了，不能说明他有权操作某条数据。

第五，权限逻辑要集中。角色、套餐、组织、权限点后期都会变化。散落在 action 和 component 里的判断会让重构变得很痛苦。

第六，全局 Header 里读取服务端 cookies/headers 要谨慎。它可能影响静态渲染。营销页、文档页、公开内容页通常应该尽量保持 static。

第七，Middleware 适合路由级 redirect，但不要在里面做复杂数据库查询。Middleware 的运行环境可能受限，也不适合承载大量业务逻辑。

第八，Route Handler 要根据请求来源选择认证方式。用户请求用 session/JWT，webhook 用 signature，内部服务调用用 service token，不要混用。

第九，缓存同步要明确。Server Action 修改数据后，使用 `revalidatePath` 或 `revalidateTag` 刷新对应页面或数据。不要让用户提交成功后还看到旧数据。

第十，认证方案可以用第三方，也可以自研，但边界不变。无论使用 NextAuth、Clerk、Kinde、Auth0，还是自己签 JWT，都必须保护 Server Component、Server Action、Route Handler 和 DAL。

---

## 15. 总结

Next.js App Router 里的认证不能只理解成“未登录跳转登录页”。在真实项目里，路由保护、服务端数据读取、Server Action 写操作、Route Handler 回调、权限判断、缓存刷新、静态渲染都会和认证产生关系。

比较稳妥的设计是：Middleware 做路由入口拦截，Server Action 做输入校验和缓存刷新，Data Access Layer 统一承接数据库访问，并在这里完成认证和授权。组件层只负责展示和触发动作，不直接理解 token、role、数据库归属这些底层细节。

这样组织后，项目后期新增页面、复用组件、迁移业务模块时，不容易因为某个路由忘记加鉴权而泄露数据。认证逻辑越靠近数据，安全边界越清楚；权限判断越集中，团队协作时越不容易出错。
