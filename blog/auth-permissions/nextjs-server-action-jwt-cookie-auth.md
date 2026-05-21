# Next.js 认证不只是登录表单：从 Server Action、JWT Cookie 到 Middleware 的工程化落地

在 Next.js 项目里，认证流程很容易被写得过于简单：一个登录表单、一个接口、成功后跳转页面，看起来就完成了。但真实项目里的认证不是“提交一下账号密码”这么简单，它至少要处理表单校验、服务端凭证验证、登录态存储、受保护路由拦截、已登录用户重定向、退出登录、错误回显，以及 Cookie 安全策略。

尤其是在 Next.js App Router 体系下，Server Component、Client Component、Server Action、Middleware 同时存在。如果没有清晰边界，很容易写出一种“能跑，但很难维护”的认证代码：组件里塞请求逻辑，服务端校验不统一，Cookie 随便存，页面权限靠前端判断，最后安全性和可维护性都不稳定。

这篇文章不讨论 OAuth、NextAuth、Clerk 这类成熟方案，而是从“自己实现一个最小但完整的认证流”出发，拆清楚 Next.js 认证的工程化边界。重点不是鼓励所有项目都自研认证，而是通过这个实现理解认证链路的核心模型。

---

## 1. 这个技术解决什么问题

认证的本质是两个问题。

第一个问题是：用户如何证明自己是谁？

这一步通常发生在登录阶段。用户提交 email 和 password，服务端校验凭证。如果凭证正确，服务端生成一个可以代表用户身份的会话标识，比如 session id 或 JWT。本文使用 JWT，并把它写入 HTTP-only Cookie。

第二个问题是：系统如何在后续请求中识别用户？

用户登录成功后，浏览器后续请求会自动携带 Cookie。服务端可以读取 Cookie，验证 JWT，拿到 userId，从而判断当前请求是否来自一个已登录用户。

在 Next.js 里，这个流程可以拆成几块：

- 客户端表单负责收集 email/password，并展示 pending/error 状态。
- Server Action 负责接收表单数据，做字段校验、凭证校验、创建 session、写入 Cookie、跳转页面。
- session 工具层负责签发和验证 JWT，并提供 `createSession` / `deleteSession` 这样的业务函数。
- Middleware 负责在请求进入页面前读取 Cookie，判断用户是否可以访问当前路由。

这种拆法的好处是很明确的：登录表单不关心 JWT 怎么签发，页面不关心 Cookie 怎么读，Middleware 不关心登录表单怎么写。每一层只处理自己的职责。

适合自己实现认证逻辑的场景通常是内部系统、教学项目、小型后台、对认证逻辑有强定制需求的项目。不适合的场景也很明确：复杂第三方登录、多租户权限、大型用户体系、强安全合规系统。在这些情况下，应该优先考虑成熟认证服务或框架。

---

## 2. 最简单的写法是什么

很多人第一次写登录，会写成这样：

```tsx
'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        email: formData.get('email'),
        password: formData.get('password'),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      setError('登录失败');
      return;
    }

    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" />
      <input name="password" type="password" />
      {error && <p>{error}</p>}
      <button type="submit">登录</button>
    </form>
  );
}
```

这段代码当然能跑。它能提交表单，能请求接口，成功后能跳转。但是在 Next.js App Router 的工程化项目里，它并不是一个理想写法。

问题不在于 `fetch` 本身，而在于这段代码把太多东西塞进了组件：表单提交、接口路径、错误处理、跳转逻辑、登录状态变化全部堆在一起。项目小的时候问题不明显，项目一复杂，认证链路很快会失控。

---

## 3. 简单写法的问题

简单写法在真实项目里通常会暴露这些问题。

首先，认证逻辑和 UI 耦合。登录表单组件不仅渲染 UI，还知道请求地址、请求格式、错误判断、成功跳转。以后如果登录逻辑从 password 登录改成验证码登录，或者后端返回格式调整，组件会跟着大改。

其次，服务端校验容易分散。如果每个接口各自处理 `FormData`、字段校验、错误格式，前端拿到的错误结构就不稳定。一个地方返回 `{message}`，另一个地方返回 `{errors}`，表单展示会越来越混乱。

第三，登录态存储容易写错。有些初学者会把 token 存 `localStorage`，然后在客户端读取。这种写法容易暴露 token。对于普通 Web 应用，认证 Cookie 更适合放在 HTTP-only Cookie 中，让浏览器自动携带，并避免客户端 JavaScript 直接读取。

第四，路由保护不应该只放在客户端。比如你在 Dashboard 页面里写：

```ts
useEffect(() => {
  if (!user) {
    router.push('/login');
  }
}, [user]);
```

这意味着页面已经进入客户端渲染阶段了，才开始判断是否跳转。用户可能短暂看到受保护页面，也不利于服务端层面的访问控制。更合理的做法是在 Middleware 中提前拦截请求。

第五，退出登录如果只是清掉客户端状态是不够的。真正的登录态在 Cookie 里，退出时必须让服务端删除 Cookie，然后再跳转到登录页。

---

## 4. 推荐的项目落地结构

认证模块不需要一上来设计成庞大的权限系统。对于一个 Next.js App Router 项目，可以先保持结构精简：

```txt
src/
  app/
    login/
      page.tsx
    dashboard/
      page.tsx
  features/
    auth/
      actions.ts
      schemas.ts
      components/
        LoginForm.tsx
        SubmitButton.tsx
  lib/
    session.ts
  middleware.ts
```

这套结构的重点是边界清楚。

`app/login/page.tsx` 只负责页面入口，渲染登录表单。

`app/dashboard/page.tsx` 是受保护页面，具体是否能访问由 middleware 判断。

`features/auth/actions.ts` 放认证相关的 Server Actions，比如 `login` / `logout`。这里是客户端表单和服务端认证逻辑之间的桥。

`features/auth/schemas.ts` 放 Zod schema，统一表单字段校验规则。

`features/auth/components/LoginForm.tsx` 是客户端组件，负责渲染表单，消费 Server Action 返回的状态。

`features/auth/components/SubmitButton.tsx` 单独拆出来，是为了使用 `useFormStatus` 获取当前表单的 pending 状态。

`lib/session.ts` 是底层 session 工具，负责 JWT 加密、解密、创建 Cookie、删除 Cookie。这个文件不应该依赖 UI。

`middleware.ts` 负责路由拦截。它只关心当前请求是否有合法 session，以及当前 path 是否需要登录。

这个结构没有刻意追求复杂，但已经能支撑真实项目的后续扩展。比如以后要加注册、忘记密码、刷新 token、用户角色判断，都有明确位置可以放。

---

## 5. 推荐写法一：抽离 session 核心逻辑

认证链路里最应该先抽离的是 session 逻辑。因为 Cookie 和 JWT 是服务端关心的东西，不应该散落在 action 或页面里。

先定义 session payload：

```ts
// src/lib/session.ts
import 'server-only';

import {cookies} from 'next/headers';
import {jwtVerify, SignJWT} from 'jose';

export type SessionPayload = {
  userId: string;
  expiresAt: Date;
};

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
const secretKey = process.env.SESSION_SECRET;

if (!secretKey) {
  throw new Error('SESSION_SECRET is required');
}

const encodedKey = new TextEncoder().encode(secretKey);
```

这里有几个关键点。

`server-only` 用来明确这个模块只能在服务端使用，避免被客户端组件误导入。

`SESSION_COOKIE_NAME` 和 `SESSION_DURATION` 集中管理，不要在多个文件里手写 `'session'`。

`SESSION_SECRET` 必须来自环境变量，不要写死在代码里。

接着实现 JWT 签发和验证：

```ts
export async function encrypt(payload: SessionPayload) {
  return new SignJWT({
    userId: payload.userId,
    expiresAt: payload.expiresAt.toISOString(),
  })
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined) {
  if (!session) return null;

  try {
    const {payload} = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });

    if (typeof payload.userId !== 'string') {
      return null;
    }

    return {
      userId: payload.userId,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}
```

这里的 `decrypt` 不应该直接把错误抛给页面。对业务来说，token 无效、token 过期、token 被篡改，最终都可以视为“当前没有有效登录态”。所以返回 `null` 更适合作为上层判断依据。

然后封装 `createSession` 和 `deleteSession`：

```ts
export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const session = await encrypt({userId, expiresAt});
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decrypt(session);
}
```

这里的 Cookie 选项很重要。

- `httpOnly: true` 表示客户端 JavaScript 不能读取这个 Cookie。
- `secure: true` 表示生产环境下只通过 HTTPS 发送 Cookie。
- `sameSite: 'lax'` 可以在多数普通 Web 应用里降低 CSRF 风险，同时不影响常见页面跳转。
- `path: '/'` 表示整个站点都可以携带这个 Cookie。

---

## 6. 推荐写法二：Server Action 处理登录业务

表单字段校验应该有统一 schema。比如登录只需要 email 和 password：

```ts
// src/features/auth/schemas.ts
import {z} from 'zod';

export const loginSchema = z.object({
  email: z.string().email('请输入正确的邮箱地址'),
  password: z.string().min(8, '密码至少需要 8 个字符'),
});

export type LoginInput = z.infer<typeof loginSchema>;
```

接下来写 Server Action。它负责三件事：校验输入、验证用户、创建 session。

```ts
// src/features/auth/actions.ts
'use server';

import {redirect} from 'next/navigation';
import {loginSchema} from './schemas';
import {createSession, deleteSession} from '@/lib/session';

type LoginActionState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
        form?: string[];
      };
    }
  | undefined;

const testUser = {
  id: '1',
  email: 'contact@example.com',
  password: '12345678',
};

export async function login(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const result = loginSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  const {email, password} = result.data;
  const isValidUser = email === testUser.email && password === testUser.password;

  if (!isValidUser) {
    return {
      errors: {
        form: ['邮箱或密码错误'],
      },
    };
  }

  await createSession(testUser.id);
  redirect('/dashboard');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
```

真实项目里，`testUser` 会换成数据库查询和密码哈希校验。例如用 bcrypt 校验 password hash。这里为了聚焦认证链路，用测试用户模拟即可。

这里要注意：不要告诉用户“邮箱不存在”或“密码错误”。更安全的提示是“邮箱或密码错误”。这样可以避免通过错误信息枚举用户邮箱。

---

## 7. 组件如何消费 Server Action 结果

登录表单本身应该尽量薄。它只负责渲染字段、绑定 action、展示错误。

```tsx
// src/features/auth/components/LoginForm.tsx
'use client';

import {useActionState} from 'react';
import {login} from '../actions';
import {SubmitButton} from './SubmitButton';

export function LoginForm() {
  const [state, loginAction] = useActionState(login, undefined);

  return (
    <form action={loginAction} className="space-y-4">
      <div>
        <label htmlFor="email">邮箱</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="block w-full rounded border px-3 py-2"
        />
        {state?.errors?.email?.map(error => (
          <p key={error} className="text-sm text-red-500">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="password">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="block w-full rounded border px-3 py-2"
        />
        {state?.errors?.password?.map(error => (
          <p key={error} className="text-sm text-red-500">
            {error}
          </p>
        ))}
      </div>

      {state?.errors?.form?.map(error => (
        <p key={error} className="text-sm text-red-500">
          {error}
        </p>
      ))}

      <SubmitButton />
    </form>
  );
}
```

`useActionState` 的价值在于，它把 Server Action 的返回结果接回客户端组件。Server Action 返回字段错误，表单就能展示字段错误；Server Action 成功 redirect，用户就进入 Dashboard。

提交按钮单独拆出来：

```tsx
// src/features/auth/components/SubmitButton.tsx
'use client';

import {useFormStatus} from 'react-dom';

export function SubmitButton() {
  const {pending} = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? '登录中...' : '登录'}
    </button>
  );
}
```

`useFormStatus` 必须在 form 内部的子组件里使用。它不是全局 loading hook，而是读取当前表单的提交状态。所以 `SubmitButton` 拆成子组件不是为了“好看”，而是为了正确消费表单状态。

页面入口保持简单：

```tsx
// src/app/login/page.tsx
import {LoginForm} from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm py-20">
      <h1 className="mb-6 text-2xl font-semibold">登录</h1>
      <LoginForm />
    </main>
  );
}
```

---

## 8. Middleware 处理受保护路由

有了 session 之后，还需要判断哪些页面需要登录，哪些页面登录后不应该再访问。

比如：

- 未登录用户访问 `/dashboard`，应该跳到 `/login`。
- 已登录用户访问 `/login`，应该跳到 `/dashboard`。

这类判断适合放在 `middleware.ts`：

```ts
// src/middleware.ts
import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';
import {decrypt} from './lib/session';

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login'];

function isPathMatched(pathname: string, routes: string[]) {
  return routes.some(route => {
    if (route === pathname) return true;
    return pathname.startsWith(`${route}/`);
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = isPathMatched(pathname, protectedRoutes);
  const isPublicRoute = isPathMatched(pathname, publicRoutes);
  const cookie = request.cookies.get('session')?.value;
  const session = await decrypt(cookie);

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

这里不建议只用 `protectedRoutes.includes(pathname)`，因为真实项目里经常有 `/dashboard/settings`、`/dashboard/orders` 这种子路由。用 `startsWith` 能覆盖一整个路由段。

`matcher` 也很重要。Middleware 默认可能影响很多请求，包括静态资源。通常需要排除 `_next/static`、`_next/image`、`favicon` 等路径，避免无意义地执行认证逻辑。

Dashboard 页面可以直接写业务页面：

```tsx
// src/app/dashboard/page.tsx
import {logout} from '@/features/auth/actions';

export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <form action={logout} className="mt-6">
        <button type="submit" className="rounded border px-4 py-2">
          退出登录
        </button>
      </form>
    </main>
  );
}
```

这里用 form action 调用 `logout`，比在客户端写 `onClick={() => logout()}` 更符合 Server Action 的使用方式。退出登录本质是服务端删除 Cookie，然后 redirect，不需要让客户端组件参与。

---

## 9. 错误处理、生命周期和安全边界

认证模块的错误处理不能只停留在“展示一个错误消息”。

首先，字段错误和业务错误要区分。字段错误来自 Zod，比如 email 格式错误、password 长度不足。业务错误来自凭证校验，比如邮箱或密码错误。建议返回结构中同时支持 fieldErrors 和 formErrors，否则 UI 会很难统一展示。

其次，Server Action 不应该把系统错误直接暴露给用户。数据库异常、JWT 签发失败、环境变量缺失，这些应该记录日志，但前端只展示“登录失败，请稍后重试”这类安全信息。

例如：

```ts
export async function login(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const result = loginSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const {email, password} = result.data;
    const user = await findUserByEmail(email);

    if (!user) {
      return {
        errors: {
          form: ['邮箱或密码错误'],
        },
      };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return {
        errors: {
          form: ['邮箱或密码错误'],
        },
      };
    }

    await createSession(user.id);
  } catch (error) {
    console.error('[login_failed]', error);

    return {
      errors: {
        form: ['登录失败，请稍后重试'],
      },
    };
  }

  redirect('/dashboard');
}
```

这里把 `redirect('/dashboard')` 放在 `try/catch` 外面，是因为 Next.js 的 `redirect` 通过特殊机制中断流程。如果把它放进 catch 里误处理，容易出现不符合预期的行为。

第三，Cookie 生命周期要和 JWT 生命周期一致。不要 JWT 7 天过期，但 Cookie 30 天过期；也不要 Cookie 过期了，但 JWT 还有效。两者应统一由 `createSession` 管理。

第四，Middleware 中验证失败要当成未登录处理，而不是抛异常。用户携带了一个过期或篡改过的 token，这在真实环境里很常见。最稳定的处理方式是 redirect 到登录页。

第五，生产环境必须配置 HTTPS 和安全 Cookie。`secure: process.env.NODE_ENV === 'production'` 是比较常见的写法。开发环境用 http，本地仍能正常调试；生产环境强制 https。

---

## 10. 结合真实项目举例：后台管理系统认证

假设你在做一个后台管理系统，有这些页面：

```txt
/login
/dashboard
/dashboard/users
/dashboard/orders
/dashboard/settings
```

其中 `/login` 是公共页面，`/dashboard/**` 都需要登录。

登录流程应该是这样：

```txt
用户进入 /login，提交 email/password
  -> Server Action 校验表单字段
  -> 服务端查询用户表，根据 email 找用户
  -> 使用 bcrypt 校验 password 和 passwordHash
  -> 校验成功后调用 createSession(user.id)
  -> 服务端写入 HTTP-only Cookie
  -> redirect 到 /dashboard
  -> 后续用户访问 /dashboard/orders 时，Middleware 读取 Cookie
  -> 验证 JWT，如果有效则放行
  -> 用户点击退出登录时，Server Action 删除 Cookie
  -> redirect 到 /login
```

这里的关键不是代码有多少，而是每一层职责要稳定。表单只管输入和展示状态，Server Action 只管认证业务，session 层只管 Cookie/JWT，Middleware 只管路由访问控制。

如果后面要加角色权限，比如 admin 才能访问用户管理，可以把 session payload 扩展为：

```ts
type SessionPayload = {
  userId: string;
  role: 'admin' | 'operator' | 'viewer';
  expiresAt: Date;
};
```

然后在 Middleware 中针对不同路由做 role 判断。不过在真实项目里，更推荐 Middleware 只做粗粒度登录判断，页面或服务端查询再做细粒度权限判断。因为用户角色可能会变化，如果 role 长时间存在 JWT 中，可能出现权限更新不及时的问题。

---

## 11. 给出完整代码示例

下面把核心代码串起来，形成一个最小可落地版本。

先是 schema：

```ts
// src/features/auth/schemas.ts
import {z} from 'zod';

export const loginSchema = z.object({
  email: z.string().email('请输入正确的邮箱地址'),
  password: z.string().min(8, '密码至少需要 8 个字符'),
});
```

然后是 session 工具：

```ts
// src/lib/session.ts
import 'server-only';

import {cookies} from 'next/headers';
import {jwtVerify, SignJWT} from 'jose';

const SESSION_COOKIE_NAME = 'session';
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;
const secretKey = process.env.SESSION_SECRET;

if (!secretKey) {
  throw new Error('SESSION_SECRET is required');
}

const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  expiresAt: Date;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({
    userId: payload.userId,
    expiresAt: payload.expiresAt.toISOString(),
  })
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined) {
  if (!session) return null;

  try {
    const {payload} = await jwtVerify(session, encodedKey, {
      algorithms: ['HS256'],
    });

    if (typeof payload.userId !== 'string') {
      return null;
    }

    return {
      userId: payload.userId,
      expiresAt: payload.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const session = await encrypt({userId, expiresAt});
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return decrypt(session);
}
```

认证 Action：

```ts
// src/features/auth/actions.ts
'use server';

import {redirect} from 'next/navigation';
import {loginSchema} from './schemas';
import {createSession, deleteSession} from '@/lib/session';

type LoginActionState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
        form?: string[];
      };
    }
  | undefined;

const testUser = {
  id: '1',
  email: 'contact@example.com',
  password: '12345678',
};

export async function login(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const result = loginSchema.safeParse(Object.fromEntries(formData));

  if (!result.success) {
    return {
      errors: result.error.flatten().fieldErrors,
    };
  }

  const {email, password} = result.data;
  const isValidUser = email === testUser.email && password === testUser.password;

  if (!isValidUser) {
    return {
      errors: {
        form: ['邮箱或密码错误'],
      },
    };
  }

  await createSession(testUser.id);
  redirect('/dashboard');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}
```

登录表单：

```tsx
// src/features/auth/components/LoginForm.tsx
'use client';

import {useActionState} from 'react';
import {login} from '../actions';
import {SubmitButton} from './SubmitButton';

export function LoginForm() {
  const [state, loginAction] = useActionState(login, undefined);

  return (
    <form action={loginAction} className="space-y-4">
      <div>
        <label htmlFor="email">邮箱</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="block w-full rounded border px-3 py-2"
        />
        {state?.errors?.email?.map(error => (
          <p key={error} className="text-sm text-red-500">
            {error}
          </p>
        ))}
      </div>

      <div>
        <label htmlFor="password">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="block w-full rounded border px-3 py-2"
        />
        {state?.errors?.password?.map(error => (
          <p key={error} className="text-sm text-red-500">
            {error}
          </p>
        ))}
      </div>

      {state?.errors?.form?.map(error => (
        <p key={error} className="text-sm text-red-500">
          {error}
        </p>
      ))}

      <SubmitButton />
    </form>
  );
}
```

提交按钮：

```tsx
// src/features/auth/components/SubmitButton.tsx
'use client';

import {useFormStatus} from 'react-dom';

export function SubmitButton() {
  const {pending} = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? '登录中...' : '登录'}
    </button>
  );
}
```

登录页：

```tsx
// src/app/login/page.tsx
import {LoginForm} from '@/features/auth/components/LoginForm';

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-sm py-20">
      <h1 className="mb-6 text-2xl font-semibold">登录</h1>
      <LoginForm />
    </main>
  );
}
```

Dashboard 页：

```tsx
// src/app/dashboard/page.tsx
import {logout} from '@/features/auth/actions';

export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <form action={logout} className="mt-6">
        <button type="submit" className="rounded border px-4 py-2">
          退出登录
        </button>
      </form>
    </main>
  );
}
```

Middleware：

```ts
// src/middleware.ts
import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';
import {decrypt} from './lib/session';

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login'];

function isPathMatched(pathname: string, routes: string[]) {
  return routes.some(route => {
    if (route === pathname) return true;
    return pathname.startsWith(`${route}/`);
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = isPathMatched(pathname, protectedRoutes);
  const isPublicRoute = isPathMatched(pathname, publicRoutes);
  const cookie = request.cookies.get('session')?.value;
  const session = await decrypt(cookie);

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isPublicRoute && session?.userId) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

这个版本已经具备完整认证闭环：登录表单、服务端校验、JWT Cookie、受保护路由、退出登录。

---

## 12. 工程化注意事项

第一，认证状态不要依赖 `localStorage`。`localStorage` 可以被客户端 JavaScript 读取，不适合作为敏感 token 的主要存储位置。普通 Web 登录态更推荐 HTTP-only Cookie。

第二，Server Action 返回给客户端的错误要经过整理。不要把数据库错误、JWT 错误、堆栈信息直接返回给表单。

第三，Cookie 配置不要随便省略。`httpOnly`、`secure`、`sameSite`、`path`、`expires` 都应该根据项目明确设置。

第四，Middleware 适合做粗粒度路由保护，不适合承载太复杂的业务权限。比如“是否登录”可以放 Middleware，“是否能操作某条订单”应该放到具体服务端业务逻辑里判断。

第五，不要只在客户端做权限跳转。客户端跳转可以改善体验，但不能替代服务端拦截。

第六，密码不能明文存储。本文为了演示链路使用测试用户，真实项目必须使用 password hash，并通过 bcrypt、argon2 等方式校验。

第七，JWT 失效和 Cookie 失效要统一。否则会出现“Cookie 还在但 token 已过期”或“token 还有效但 Cookie 没了”的混乱状态。

第八，退出登录必须由服务端删除 Cookie。只清客户端状态并不等于退出登录。

---

## 13. 总结

Next.js 认证的核心不是某一个 API，而是把完整链路拆清楚。

登录表单负责收集输入和展示状态；Server Action 负责处理表单提交和服务端认证；session 层负责 JWT 与 Cookie；Middleware 负责路由级访问控制。每一层职责越清晰，后续扩展注册、忘记密码、角色权限、刷新会话、用户信息查询时，代码就越不容易变成一团。

对于真实项目，自研认证要谨慎。如果是生产级用户系统，成熟认证方案通常更稳。但即使最终使用 NextAuth、Clerk、Auth0 或公司内部 SSO，理解这条底层链路仍然很有价值。因为所有认证方案背后，本质上都绕不开凭证校验、会话创建、Cookie 存储、请求识别和路由保护这些基本问题。
