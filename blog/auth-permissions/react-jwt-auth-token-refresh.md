# React 认证不只是存 Token：JWT、Access Token、Refresh Token 的工程化落地

在 React 项目里，认证经常被写得很随意：登录接口返回一个 token，前端把它塞进 `localStorage`，然后每次请求带上 `Authorization`。这套写法能跑，但在真实项目里风险很高。

认证不是“登录成功后存个 token”这么简单。它至少涉及用户身份识别、请求鉴权、Token 过期、自动刷新、接口重试、登录态恢复、退出登录、异常兜底，以及安全存储策略。如果这些边界没有处理好，轻则用户频繁掉线，重则把用户数据暴露给攻击者。

本文围绕 React 应用中常见的 JWT 认证方案，讲清楚 Access Token、Refresh Token 应该如何配合，前端应该存什么、不该存什么，以及如何用 Axios Interceptor 封装一套接近真实项目的认证链路。

---

## 1. JWT 认证解决什么问题

React 应用本身并不知道用户是谁。用户点击按钮、提交表单、进入页面，本质上都是前端把这些操作转换成请求发送给服务端。服务端在处理请求时，必须知道这几个问题：

- 当前请求是谁发起的。
- 这个用户是否已经登录。
- 这个用户是否有权限访问当前资源。
- 这个请求是否来自一个可信的登录态。

JWT，也就是 JSON Web Token，常用于解决“服务端如何识别请求身份”的问题。服务端在用户登录成功后签发 token，前端后续请求携带 token，服务端验证 token 后决定是否放行。

在较完整的认证设计里，通常不会只用一个 token，而是拆成两个：

- Access Token：短期有效，用于请求接口。
- Refresh Token：长期有效，用于刷新 Access Token。

Access Token 通常有效期很短，比如 15 分钟。它会被前端放在请求头里：

```txt
Authorization: Bearer <access_token>
```

Refresh Token 通常有效期更长，比如 7 天、15 天、30 天。它不应该暴露给前端 JavaScript，而应该由服务端写入 HttpOnly Cookie。这样浏览器会自动携带 Cookie，但前端 JS 无法读取它。

这套设计的核心取舍是：

- Access Token 暴露面较大，所以生命周期要短。
- Refresh Token 权限更高，所以不能让 JavaScript 直接访问。
- Access Token 过期后，不要立刻要求用户重新登录，而是先用 Refresh Token 换一个新的 Access Token。
- Refresh Token 也失效时，才真正让用户退出登录。

这就是比较常见的前后端分离认证模型。

---

## 2. 最简单的写法是什么

很多项目最开始会这样写：

```ts
async function login(email: string, password: string) {
  const res = await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({email, password}),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json();
  localStorage.setItem('token', data.accessToken);
}
```

请求接口时再从 `localStorage` 里取 token：

```ts
async function getProfile() {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.json();
}
```

这段代码看起来很直接：登录成功，保存 token；请求接口，带上 token。对于一个本地 demo 来说，它确实能跑。

但是在真实项目里，这种写法有几个明显问题。

第一，Access Token 被放进了 `localStorage`。`localStorage` 可以被 JavaScript 读取，一旦页面存在 XSS 风险，攻击者就可能直接拿到 token。

第二，没有处理 token 过期。Access Token 如果设置了 15 分钟过期，那么 15 分钟后用户再请求接口就会失败。如果前端没有自动刷新逻辑，用户体验会非常差。

第三，每个请求都要手动拼 `Authorization`，重复代码多，而且容易漏。

第四，没有统一处理 401 / 403。某个接口失败后，到底是跳登录页、刷新 token、重试原请求，还是展示错误提示？如果每个组件自己处理，认证逻辑会很快失控。

第五，刷新页面后登录态会丢失或混乱。如果 Access Token 只存在 React state 里，刷新后内存清空；如果放在 `localStorage` 里，又有安全风险。更合理的做法是刷新页面后通过 Refresh Token 向服务端重新换取 Access Token。

所以，简单写法的主要问题不是代码短，而是它没有区分“认证状态”“请求鉴权”“Token 刷新”“安全存储”这几个边界。

---

## 3. 简单写法在真实项目中的问题

在中大型 React 项目里，认证链路通常不是一个登录按钮的问题，而是整个请求系统的基础设施。一旦基础设施设计不好，后面的接口请求、权限控制、页面守卫、用户信息加载都会被拖累。

首先是 token 存储问题。把 Access Token 放在 `localStorage` 或普通 Cookie 里，前端读写方便，但安全性差。只要攻击者能执行恶意脚本，就有机会读取这些值。Access Token 更推荐放在内存状态里，例如 React state、Zustand store、Redux store 或某个 AuthProvider 内部状态中。

其次是刷新机制问题。Access Token 过期是正常情况，不应该直接视为用户退出。正确流程应该是：接口返回未授权，前端请求刷新接口，服务端检查 HttpOnly Cookie 里的 Refresh Token，如果有效就返回新的 Access Token，然后前端更新内存 token，并重试刚才失败的请求。

再者是并发请求问题。如果页面同时发出多个请求，而 Access Token 已经过期，可能会有多个请求同时触发 refresh token 接口。这会导致重复刷新、token 覆盖、请求顺序混乱。更严谨的项目里，需要给 refresh 流程加锁，保证同一时间只有一个刷新请求。

还有初始化问题。用户刷新浏览器后，React 内存状态会丢失，但 HttpOnly Cookie 仍然存在。此时应用不能直接认为用户未登录，而应该先请求 `/auth/me` 或 `/auth/refresh`，尝试恢复登录态。在这个请求完成之前，应用应该处于 loading 或 checking 状态，而不是立即展示登录页。

最后是拦截器生命周期问题。如果在组件里注册 Axios interceptor，但没有 eject 清理，组件重新挂载后可能会重复注册多个 interceptor。后果是一个请求被多个拦截器处理，刷新逻辑执行多次，bug 非常隐蔽。

---

## 4. 推荐的项目落地结构

这篇文章的主题是 React JWT 认证，所以项目结构不需要塞进 Redux、React Query、SSE、Web3 这些无关内容。认证模块的重点是：API 实例、Token 状态、请求拦截、响应拦截、登录态恢复、页面消费。

可以用下面这套精简结构：

```txt
src/
  shared/
    api/
      http.ts
  features/
    auth/
      authApi.ts
      authStore.ts
      AuthProvider.tsx
      useAuth.ts
      types.ts
      components/
        LoginForm.tsx
        ProtectedRoute.tsx
```

`shared/api/http.ts` 只负责创建统一的 HTTP 客户端，比如 Axios 实例。它不应该直接写死某个业务模块的逻辑。

`features/auth/authApi.ts` 只放认证相关请求，例如登录、退出、刷新 token、获取当前用户。

`features/auth/authStore.ts` 保存认证相关客户端状态，例如 `accessToken`、`user`、`status`。这里可以用 Zustand，也可以用 React Context。本文使用 Zustand，因为它写法轻量，且适合保存内存态。

`features/auth/AuthProvider.tsx` 负责把认证生命周期接入 React：初始化登录态、注册请求拦截器、注册响应拦截器、卸载时清理拦截器。

`features/auth/useAuth.ts` 负责给组件提供稳定的消费入口，避免组件直接理解 store 的内部结构。

`features/auth/components/LoginForm.tsx` 是登录表单，只负责收集账号密码并调用登录动作。

`features/auth/components/ProtectedRoute.tsx` 负责路由保护，根据认证状态决定展示页面、loading，还是跳转登录页。

这个结构不追求复杂，但边界是清楚的：HTTP 客户端归 shared，认证请求归 authApi，认证状态归 authStore，生命周期归 AuthProvider，组件只消费封装后的结果。

---

## 5. 推荐写法一：先封装 HTTP 客户端

先创建统一 Axios 实例：

```ts
// src/shared/api/http.ts
import axios from 'axios';

export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
});
```

这里的 `withCredentials: true` 很关键。Refresh Token 存在 HttpOnly Cookie 中，前端 JavaScript 不能读取它，但浏览器可以在请求同源或允许凭证的跨域接口时自动携带 Cookie。

如果你的前后端不同域，还需要服务端正确配置 CORS，例如允许 credentials，并且不能使用 `Access-Control-Allow-Origin: *`。

---

## 6. 推荐写法二：认证 API 只负责请求

认证请求单独放在 `authApi.ts`：

```ts
// src/features/auth/types.ts
export type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

export type LoginParams = {
  email: string;
  password: string;
};

export type AuthResponse = {
  accessToken: string;
  user: User;
};
```

```ts
// src/features/auth/authApi.ts
import {http} from '@/shared/api/http';
import type {AuthResponse, LoginParams} from './types';

export async function loginApi(params: LoginParams): Promise<AuthResponse> {
  const res = await http.post<AuthResponse>('/auth/login', params);
  return res.data;
}

export async function refreshTokenApi(): Promise<AuthResponse> {
  const res = await http.post<AuthResponse>('/auth/refresh');
  return res.data;
}

export async function getCurrentUserApi(): Promise<AuthResponse> {
  const res = await http.get<AuthResponse>('/auth/me');
  return res.data;
}

export async function logoutApi(): Promise<void> {
  await http.post('/auth/logout');
}
```

这里有一个设计点：`/auth/login`、`/auth/refresh`、`/auth/me` 都可以返回新的 `accessToken` 和用户信息。这样前端刷新页面后，可以通过 `/auth/me` 或 `/auth/refresh` 恢复登录态。

服务端侧大致应该这样做：

- 登录成功：生成 Refresh Token，写入 HttpOnly Cookie；返回 Access Token。
- 刷新 token：读取 HttpOnly Cookie，验证 Refresh Token；有效则返回新的 Access Token。
- 退出登录：清除 Refresh Token Cookie。

前端不要自己解析 Refresh Token，也不应该能读到它。

---

## 7. 推荐写法三：用 Zustand 保存内存认证状态

Access Token 推荐保存在内存中，而不是 `localStorage`。

```ts
// src/features/auth/authStore.ts
import {create} from 'zustand';
import type {User} from './types';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

type AuthState = {
  accessToken: string | null;
  user: User | null;
  status: AuthStatus;
  setAuth: (payload: {accessToken: string; user: User}) => void;
  clearAuth: () => void;
  setChecking: () => void;
};

export const useAuthStore = create<AuthState>(set => ({
  accessToken: null,
  user: null,
  status: 'checking',
  setAuth: ({accessToken, user}) => {
    set({
      accessToken,
      user,
      status: 'authenticated',
    });
  },
  clearAuth: () => {
    set({
      accessToken: null,
      user: null,
      status: 'unauthenticated',
    });
  },
  setChecking: () => {
    set({
      status: 'checking',
    });
  },
}));
```

这里没有把 token 持久化。刷新页面后 `accessToken` 会丢失，这是预期行为。登录态恢复交给服务端的 HttpOnly Cookie 和 `/auth/me` 接口处理。

这个状态里保留三个核心字段：

- `accessToken`：用于请求头鉴权。
- `user`：用于展示当前用户信息和做简单前端权限判断。
- `status`：用于区分正在检查、已登录、未登录。

不要只用 `accessToken === null` 判断登录态，因为初始化阶段和真正未登录是两个不同状态。

---

## 8. 推荐写法四：在 AuthProvider 里接管认证生命周期

认证生命周期主要做三件事：

- 应用启动时恢复登录态。
- 请求发出前自动注入 Access Token。
- 响应未授权时尝试刷新 token，并重试原请求。

```tsx
// src/features/auth/AuthProvider.tsx
import {PropsWithChildren, useEffect, useLayoutEffect, useRef} from 'react';
import type {AxiosError, InternalAxiosRequestConfig} from 'axios';
import {http} from '@/shared/api/http';
import {getCurrentUserApi, refreshTokenApi} from './authApi';
import {useAuthStore} from './authStore';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

export function AuthProvider({children}: PropsWithChildren) {
  const accessToken = useAuthStore(state => state.accessToken);
  const setAuth = useAuthStore(state => state.setAuth);
  const clearAuth = useAuthStore(state => state.clearAuth);
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
      try {
        const data = await getCurrentUserApi();

        if (!mounted) return;

        setAuth({
          accessToken: data.accessToken,
          user: data.user,
        });
      } catch {
        if (!mounted) return;

        clearAuth();
      }
    }

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, [setAuth, clearAuth]);

  useLayoutEffect(() => {
    const requestInterceptorId = http.interceptors.request.use(config => {
      if (accessToken && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      return config;
    });

    return () => {
      http.interceptors.request.eject(requestInterceptorId);
    };
  }, [accessToken]);

  useLayoutEffect(() => {
    const responseInterceptorId = http.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as
          | RetryableRequestConfig
          | undefined;

        if (!originalRequest) {
          return Promise.reject(error);
        }

        const status = error.response?.status;
        const isUnauthorized = status === 401 || status === 403;

        if (!isUnauthorized || originalRequest._retry) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          if (!refreshPromiseRef.current) {
            refreshPromiseRef.current = refreshTokenApi()
              .then(data => {
                setAuth({
                  accessToken: data.accessToken,
                  user: data.user,
                });
                return data.accessToken;
              })
              .catch(() => {
                clearAuth();
                return null;
              })
              .finally(() => {
                refreshPromiseRef.current = null;
              });
          }

          const newAccessToken = await refreshPromiseRef.current;

          if (!newAccessToken) {
            return Promise.reject(error);
          }

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return http(originalRequest);
        } catch (refreshError) {
          clearAuth();
          return Promise.reject(refreshError);
        }
      },
    );

    return () => {
      http.interceptors.response.eject(responseInterceptorId);
    };
  }, [setAuth, clearAuth]);

  return <>{children}</>;
}
```

这段代码里有几个关键点。

第一，初始化时调用 `getCurrentUserApi()`。如果 HttpOnly Cookie 里的 Refresh Token 仍然有效，服务端就返回新的 Access Token，前端恢复登录态。如果失败，就进入未登录状态。

第二，请求拦截器里自动注入 `Authorization`。组件和业务请求不需要手动拼 token。

第三，响应拦截器处理 401 / 403。如果原请求未授权，就先尝试刷新 Access Token，再重试原请求。

第四，`_retry` 用来防止无限重试。如果刷新后的请求仍然失败，就不能继续递归刷新。

第五，`refreshPromiseRef` 用来处理并发刷新问题。多个请求同时遇到 token 过期时，只发起一个 refresh 请求，其他请求等待同一个 Promise。

第六，拦截器注册后必须 eject。否则组件重新挂载时会重复注册，导致请求被重复处理。

这里使用 `useLayoutEffect` 的原因是，拦截器最好在子组件发起请求前完成注册。尤其是很多页面组件会在 mount 后立即请求数据，如果拦截器注册晚了，首批请求可能没有带上 token。

---

## 9. 组件如何消费认证结果

组件不应该直接访问 Axios interceptor，也不应该自己刷新 token。组件只应该关心当前用户、登录状态、登录动作、退出动作。

封装一个 `useAuth`：

```ts
// src/features/auth/useAuth.ts
import {loginApi, logoutApi} from './authApi';
import {useAuthStore} from './authStore';
import type {LoginParams} from './types';

export function useAuth() {
  const user = useAuthStore(state => state.user);
  const status = useAuthStore(state => state.status);
  const setAuth = useAuthStore(state => state.setAuth);
  const clearAuth = useAuthStore(state => state.clearAuth);

  const login = async (params: LoginParams) => {
    const data = await loginApi(params);
    setAuth({
      accessToken: data.accessToken,
      user: data.user,
    });
  };

  const logout = async () => {
    try {
      await logoutApi();
    } finally {
      clearAuth();
    }
  };

  return {
    user,
    status,
    isChecking: status === 'checking',
    isAuthenticated: status === 'authenticated',
    isUnauthenticated: status === 'unauthenticated',
    login,
    logout,
  };
}
```

登录表单可以这样写：

```tsx
// src/features/auth/components/LoginForm.tsx
import {FormEvent, useState} from 'react';
import {useAuth} from '../useAuth';

export function LoginForm() {
  const {login} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    try {
      setSubmitting(true);
      setErrorMessage(null);

      await login({
        email,
        password,
      });
    } catch {
      setErrorMessage('邮箱或密码错误');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={email}
        onChange={event => setEmail(event.target.value)}
        placeholder="Email"
      />
      <input
        value={password}
        onChange={event => setPassword(event.target.value)}
        placeholder="Password"
        type="password"
      />
      {errorMessage && <p>{errorMessage}</p>}
      <button disabled={submitting}>
        {submitting ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
```

路由保护可以这样写：

```tsx
// src/features/auth/components/ProtectedRoute.tsx
import {PropsWithChildren} from 'react';
import {Navigate} from 'react-router-dom';
import {useAuth} from '../useAuth';

export function ProtectedRoute({children}: PropsWithChildren) {
  const {isChecking, isAuthenticated} = useAuth();

  if (isChecking) {
    return <div>正在检查登录状态...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

这里的重点是：页面组件不关心 Access Token 如何存储，也不关心 Refresh Token 如何刷新。它只消费认证状态。

---

## 10. 结合真实业务场景：后台管理系统怎么落地

以后台管理系统为例，认证链路一般会影响这些模块：

- 用户登录。
- 当前用户信息。
- 菜单权限。
- 页面路由守卫。
- 接口请求鉴权。
- 无权限页面。
- 登录态过期后的自动续期。
- 退出登录。

一个合理的业务流程应该是：

```txt
用户打开后台系统
  -> AuthProvider 先请求 /auth/me
  -> 如果 Refresh Token 有效，服务端返回新的 Access Token 和用户信息
  -> 前端进入已登录状态，渲染业务页面
  -> 业务页面请求订单列表、用户列表、数据看板等接口
  -> 请求拦截器自动加上 Authorization
  -> 如果 Access Token 过期，响应拦截器自动刷新并重试原请求
  -> 如果 Refresh Token 也过期，清空认证状态并跳转登录页
```

对于用户来说，整个刷新 token 的过程应该是无感的。用户最多感觉某个请求慢了一点，而不是突然跳回登录页。

在权限控制上，前端可以根据 `user.role` 或 `user.permissions` 做菜单展示和路由限制，但最终权限必须由服务端校验。前端权限控制只是体验层，不能当作安全边界。

例如菜单过滤可以这样写：

```ts
type MenuItem = {
  path: string;
  title: string;
  permission?: string;
};

export function filterMenusByPermission(
  menus: MenuItem[],
  permissions: string[],
) {
  return menus.filter(menu => {
    if (!menu.permission) return true;
    return permissions.includes(menu.permission);
  });
}
```

但是接口层仍然必须验证权限。用户即使在前端看不到某个按钮，也可能直接构造请求调用接口。

---

## 11. 更完整的 TypeScript 示例

下面把核心代码串起来，形成一个最小但接近真实项目的认证实现。

应用入口：

```tsx
// src/App.tsx
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {AuthProvider} from '@/features/auth/AuthProvider';
import {ProtectedRoute} from '@/features/auth/components/ProtectedRoute';
import {LoginForm} from '@/features/auth/components/LoginForm';
import {DashboardPage} from '@/pages/DashboardPage';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

业务请求不需要关心 token：

```ts
// src/features/orders/orderApi.ts
import {http} from '@/shared/api/http';

export type Order = {
  id: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
};

export async function getOrders(): Promise<Order[]> {
  const res = await http.get<Order[]>('/orders');
  return res.data;
}
```

页面组件只调用业务 API：

```tsx
// src/pages/DashboardPage.tsx
import {useEffect, useState} from 'react';
import {getOrders, type Order} from '@/features/orders/orderApi';
import {useAuth} from '@/features/auth/useAuth';

export function DashboardPage() {
  const {user, logout} = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadOrders() {
      try {
        const data = await getOrders();

        if (mounted) {
          setOrders(data);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      <header>
        <span>当前用户：{user?.name}</span>
        <button onClick={logout}>退出登录</button>
      </header>

      {loading ? (
        <p>加载订单中...</p>
      ) : (
        <ul>
          {orders.map(order => (
            <li key={order.id}>
              {order.id} - {order.amount} - {order.status}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

这个页面里没有任何 `Authorization`、refresh token、retry 逻辑。认证逻辑被放在 `AuthProvider` 和 `http` 体系里，业务页面只负责业务展示。

这就是工程化封装的目的：把横切逻辑收敛到基础设施层，不要让每个页面都重复处理。

---

## 12. 错误处理、重试和安全边界

认证模块的错误处理要比普通接口更谨慎。

Access Token 过期时，可以自动刷新。Refresh Token 过期时，应该清空状态并让用户重新登录。

Refresh Token 刷新失败，不要无限重试。无限重试会造成请求风暴，也会让用户卡在无意义的 loading 状态。

401 和 403 要根据后端语义区分。一般来说，401 更偏向未认证，403 更偏向无权限。但很多项目会混用，所以前后端最好约定清楚错误结构，例如：

```json
{
  "code": "UNAUTHORIZED",
  "message": "Unauthorized"
}
```

响应拦截器不要只判断 HTTP status，也可以结合业务 code 判断，这样更稳定。

退出登录时，前端清空内存状态还不够，还应该请求服务端清除 Refresh Token Cookie。否则用户刷新页面后可能又被恢复登录。

Access Token 不要放 `localStorage`。这个建议不是说内存存储绝对安全，而是它减少了 token 被持久化窃取的风险。前端安全不能只依赖 token 存在哪里，还要配合 XSS 防护、CSP、输入转义、依赖安全、Cookie SameSite、HTTPS 等策略。

如果是跨域 Cookie，还需要考虑：

- HttpOnly：禁止 JavaScript 读取。
- Secure：只在 HTTPS 下发送。
- SameSite：降低 CSRF 风险。
- CORS credentials：允许浏览器携带 Cookie。
- CSRF Token：在某些 Cookie 认证场景下仍然需要额外防护。

认证是前后端共同设计的结果，不是前端单方面能完全解决的问题。

---

## 13. 工程化注意事项

第一，Access Token 推荐放内存，不要持久化到 `localStorage`。

第二，Refresh Token 应由服务端写入 HttpOnly Cookie，不要返回给前端 JS 使用。

第三，应用初始化时要有 `checking` 状态，避免一刷新页面就误判为未登录。

第四，请求拦截器负责注入 token，业务组件不要手写请求头。

第五，响应拦截器负责刷新 token 和重试原请求，页面组件不应该感知这条链路。

第六，要给重试请求加 `_retry` 标记，避免无限递归。

第七，并发 refresh 要加锁，否则多个请求同时过期时会重复刷新 token。

第八，Axios interceptor 要在组件卸载时 eject，避免重复注册。

第九，前端权限控制只能改善体验，真正的权限校验必须在服务端完成。

第十，认证错误结构要和后端约定清楚。不要靠猜测字符串来判断是否需要刷新 token。

---

## 14. 总结

React 认证模块的核心不是“登录后存在哪里”，而是把身份状态、请求鉴权、Token 刷新、请求重试、登录态恢复这些逻辑拆清楚。

Access Token 适合放在前端内存中，用来给接口请求加 `Authorization`。Refresh Token 适合放在服务端控制的 HttpOnly Cookie 中，用来在 Access Token 失效后恢复登录态。前端通过 AuthProvider 和请求拦截器把这套流程封装起来，业务页面只消费 `user`、`status`、`login`、`logout` 这些稳定接口。

这样设计以后，认证逻辑不会散落在每个页面里，接口请求也不需要重复处理 token。后续无论是接后台管理、用户中心、订单系统，还是更复杂的权限模块，都可以在这个基础上继续扩展。
