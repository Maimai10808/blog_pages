# React Context 进阶：Provider Pattern 的正确打开方式

想象这样一个场景：你要把一封信从公司 CEO，也就是 `App` 组件，传递给前台实习生，也就是 `Avatar` 组件。但这封信必须经过 `Header`、`Navbar`、`Profile` 层层转交，而这些中间组件根本不需要看信的内容，只是机械地继续往下传。

这就是 React 开发里常见的 **Prop Drilling** 问题。组件树越深，传递链路越长，中间组件越容易被无关 props 污染。

在 React 项目里，“数据要不要全局共享”“共享到什么范围”“怎么避免层层传 props”是迟早会遇到的问题。很多人学会了 Context 的语法，但在工程上越用越乱：一个巨大的 Provider，全局包一层，动不动全量重渲染，最后开始觉得 Context 不好用。

问题通常不在 Context 本身，而在于缺少稳定的组织方式。Provider Pattern 的价值，就是把 Context 从“语法用法”变成一套更可维护的架构习惯。

---

## 1. 为什么需要 Provider Pattern

先看一个典型的 Prop Drilling 例子：

```tsx
// src/App.tsx
function App() {
  const user = {
    name: '张三',
    role: 'admin',
  };

  return <Header user={user} />;
}

function Header({ user }: { user: { name: string; role: string } }) {
  return <Navbar user={user} />;
}

function Navbar({ user }: { user: { name: string; role: string } }) {
  return <Profile user={user} />;
}

function Profile({ user }: { user: { name: string; role: string } }) {
  return <Avatar user={user} />;
}

function Avatar({ user }: { user: { name: string; role: string } }) {
  return <div>{user.name}</div>;
}
```

这段代码的问题很明显：

- `Header` 不需要 `user`，但被迫接收。
- `Navbar` 不需要 `user`，但被迫接收。
- `Profile` 不需要 `user`，但被迫接收。
- 只有最底层的 `Avatar` 真正使用 `user`。

传统 props 传递在这种场景下有三个痛点：

- **代码冗余**：中间组件被迫接收和转发无关数据。
- **维护成本高**：字段改名或结构变化时，整条链路都要改。
- **组件耦合**：中间组件变得难复用，因为它们依赖了不该关心的 props。

Provider Pattern 的目标就是：让真正需要数据的组件直接拿到数据，而不是让中间层做传声筒。

---

## 2. Provider Pattern 是什么

Provider Pattern 的核心很简单：

> 把某类需要共享的数据或能力集中放到一个 Provider 组件里，再用它包裹组件树的一段范围，让这个范围内的后代组件都能直接获取这些数据或能力。

可以把它理解成一个广播模型：

- `Provider` 是发射器，负责提供 `value`。
- `Context` 是频道，决定广播边界。
- `useContext` 或封装后的自定义 Hook 是接收器。

一个健康的 Provider 通常不只是写一个 `Context.Provider`，而是包含完整闭环：

- 创建 Context。
- 创建 Provider。
- 封装消费 Hook。
- 在需要的范围包裹组件树。
- 在后代组件中通过 Hook 消费。

---

## 3. 标准落地步骤

一个工程可维护的 Context / Provider 通常按这 5 步走：

1. 创建 Context，定义共享边界。
2. 创建 Provider，管理状态并提供 `value`。
3. 用 Provider 包裹组件树，决定共享范围。
4. 封装自定义 Hook，统一消费入口。
5. 在后代组件中使用 Hook，读取数据或调用能力。

下面用一个暗黑模式 `ThemeProvider` 示例说明。

---

## 4. 最小可用示例：ThemeProvider

### 4.1 创建 Context

```tsx
// src/theme/ThemeContext.tsx
import { createContext } from 'react';

export type ThemeContextValue = {
  isDark: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);
```

这里把默认值设为 `null`，是为了在消费 Hook 里明确判断 Provider 是否缺失。

### 4.2 创建 Provider

```tsx
// src/theme/ThemeProvider.tsx
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ThemeContext, type ThemeContextValue } from './ThemeContext';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const nextValue = !prev;
      document.body.classList.toggle('dark', nextValue);
      return nextValue;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      toggleTheme,
    }),
    [isDark, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

这里有两个细节：

- `toggleTheme` 使用 `useCallback` 稳定函数引用。
- `value` 使用 `useMemo`，避免每次 render 都创建新对象。

如果直接写：

```tsx
// src/theme/ThemeProvider.tsx
<ThemeContext.Provider value={{ isDark, toggleTheme }}>
  {children}
</ThemeContext.Provider>
```

每次 Provider 重新渲染都会创建一个新的 `value` 对象，消费者可能出现无意义更新。

### 4.3 封装自定义 Hook

```ts
// src/theme/useTheme.ts
import { useContext } from 'react';
import { ThemeContext } from './ThemeContext';

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within <ThemeProvider />');
  }

  return context;
}
```

为什么推荐封装自定义 Hook？

- 避免每个组件都重复写 `useContext(ThemeContext)`。
- 能在 Hook 内统一做 Provider 缺失校验。
- TypeScript 类型更清晰。
- 后续可以在 Hook 内增加转换、埋点、调试逻辑。

### 4.4 在入口包裹组件树

```tsx
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './theme/ThemeProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
```

### 4.5 在组件中消费

```tsx
// src/App.tsx
import { useTheme } from './theme/useTheme';

export function App() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <main style={{ padding: 16 }}>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <p>当前主题：{isDark ? 'Dark' : 'Light'}</p>
    </main>
  );
}
```

这就是 Provider Pattern 的完整闭环：

> Context 定义边界，Provider 提供状态，Hook 统一消费，组件只关心业务使用。

---

## 5. 多 Provider 嵌套：模块化的艺术

真实应用通常会有多个 Provider：

```tsx
// src/app/AppProviders.tsx
<ErrorBoundary>
  <AuthProvider>
    <ThemeProvider>
      <I18nProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </I18nProvider>
    </ThemeProvider>
  </AuthProvider>
</ErrorBoundary>
```

多 Provider 嵌套本质上是在组件树上叠加多个广播范围。关键不是“能不能嵌套”，而是嵌套顺序和更新范围是否可控。

下面是三个设计原则。

---

## 6. 原则一：单一职责，每个 Provider 只做一件事

推荐写法：

```tsx
// src/app/AppProviders.tsx
<AuthProvider>
  <ThemeProvider>
    <CartProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </CartProvider>
  </ThemeProvider>
</AuthProvider>
```

不推荐把所有东西塞进一个 `AppProvider`：

```tsx
// src/app/AppProvider.tsx
<AppContext.Provider
  value={{
    user,
    login,
    logout,
    theme,
    toggleTheme,
    cartItems,
    addToCart,
    language,
    changeLanguage,
  }}
>
  {children}
</AppContext.Provider>
```

这种巨型 Context 的问题是：

- 任意字段变化都可能影响大量消费者。
- Provider 内部逻辑变成全局大杂烩。
- 测试和维护困难。
- 高频状态和低频状态被绑在一起。
- 后续很难按领域优化。

更好的方式是按领域拆分：

- `AuthProvider` 只管认证。
- `ThemeProvider` 只管主题。
- `I18nProvider` 只管国际化。
- `CartProvider` 只管购物车。

拆分后，边界更清楚，也更容易控制更新范围。

---

## 7. 原则二：被依赖的 Provider 放外层

如果 `ThemeProvider` 需要读取用户偏好的主题，而用户信息来自 `AuthProvider`，那么 `AuthProvider` 必须在外层。

错误顺序：

```tsx
// src/app/AppProviders.tsx
<ThemeProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</ThemeProvider>
```

正确顺序：

```tsx
// src/app/AppProviders.tsx
<AuthProvider>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</AuthProvider>
```

原因很简单：Provider 本身也是组件。如果 `ThemeProvider` 内部调用 `useAuth()`，它必须位于 `AuthProvider` 的覆盖范围内。

这个原则可以避免两类问题：

- Provider 内部拿不到依赖的上下文。
- 初始化顺序混乱，导致闪烁、重复请求或二次切换。

例如 `I18nProvider` 的默认语言来自 `user.profile.language`，那它也应该放在 `AuthProvider` 内部。

---

## 8. 原则三：频繁更新的 Provider 尽量放内层

Context 的基本特性是：Provider 的 `value` 变了，消费这个 Context 的组件会重新渲染。

高频更新的 Provider 不应该盲目包住整个应用。

不推荐：

```tsx
// src/app/AppProviders.tsx
<CartProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</CartProvider>
```

更合理：

```tsx
// src/app/AppProviders.tsx
<AuthProvider>
  <ThemeProvider>
    <CartProvider>
      <App />
    </CartProvider>
  </ThemeProvider>
</AuthProvider>
```

如果购物车只在 Header 和购物车页面使用，也可以进一步缩小范围：

```tsx
// src/app/AppLayout.tsx
<MainLayout>
  <CartProvider>
    <Header />
    <CartDrawer />
  </CartProvider>

  <ProductList />
  <Footer />
</MainLayout>
```

这样购物车数量变化时，不会影响不需要购物车状态的组件。

原则是：

> 稳定、被依赖广的 Provider 放外层；高频、局部使用的 Provider 放内层或局部。

---

## 9. 完整实战：电商应用 Provider 架构

一个电商应用可能需要：

- 错误边界。
- 路由上下文。
- 用户认证。
- 国际化。
- 主题。
- 通知系统。
- 购物车。

可以先统一收敛到 `AppProviders`。

```tsx
// src/app/AppProviders.tsx
import { type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from '../providers/AuthProvider';
import { CartProvider } from '../providers/CartProvider';
import { I18nProvider } from '../providers/I18nProvider';
import { NotificationProvider } from '../providers/NotificationProvider';
import { ThemeProvider } from '../providers/ThemeProvider';

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <I18nProvider>
            <ThemeProvider>
              <NotificationProvider>
                <CartProvider>{children}</CartProvider>
              </NotificationProvider>
            </ThemeProvider>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
```

这里的顺序可以这样理解：

- `ErrorBoundary` 最外层，捕获整棵树错误。
- `BrowserRouter` 提供路由上下文。
- `AuthProvider` 放外层，因为很多能力依赖用户信息。
- `I18nProvider` 可能依赖用户语言偏好。
- `ThemeProvider` 可能依赖用户主题偏好。
- `NotificationProvider` 提供通知能力。
- `CartProvider` 更新较频繁，放更内层。

---

## 10. AuthProvider 示例

认证通常是相对稳定的全局状态。

```tsx
// src/providers/AuthProvider.tsx
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type User = {
  id: string;
  name: string;
  email: string;
  themePreference?: 'light' | 'dark';
};

type LoginPayload = {
  email: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchUser(token: string): Promise<User> {
  const response = await fetch('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user');
  }

  return response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem('token');

    if (!token) {
      setLoading(false);
      return;
    }

    fetchUser(token)
      .then(setUser)
      .catch(() => {
        window.localStorage.removeItem('token');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    window.localStorage.setItem('token', data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      login,
      logout,
    }),
    [user, loading, login, logout],
  );

  if (loading) {
    return <div>加载中...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

---

## 11. ThemeProvider 示例：依赖 AuthProvider

主题可能依赖用户偏好，因此它应该在 `AuthProvider` 内部。

```tsx
// src/providers/ThemeProvider.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthContext } from './AuthProvider';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  isDarkMode: boolean;
  toggleTheme: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): Theme {
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const user = auth?.user;

  const [theme, setTheme] = useState<Theme>(() => {
    return user?.themePreference ?? getSystemTheme();
  });

  useEffect(() => {
    if (user?.themePreference) {
      setTheme(user.themePreference);
    }
  }, [user?.themePreference]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const nextTheme = prev === 'light' ? 'dark' : 'light';

      if (user) {
        void fetch('/api/me/theme', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ theme: nextTheme }),
        });
      }

      return nextTheme;
    });
  }, [user]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      isDarkMode: theme === 'dark',
      toggleTheme,
    }),
    [theme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
```

注意这里的依赖：

- `ThemeProvider` 读取 `AuthContext`，所以必须放在 `AuthProvider` 内部。
- `value` 使用 `useMemo` 稳定引用。
- `toggleTheme` 使用 `useCallback`，避免函数引用无意义变化。

---

## 12. CartProvider 示例：高频状态

购物车属于可能高频更新的状态，因此更要注意范围和 `value` 稳定性。

```tsx
// src/providers/CartProvider.tsx
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Product = {
  id: string;
  name: string;
  price: number;
};

type CartItem = Product & {
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isEmpty: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

export const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = window.localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    window.localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === product.id);

      if (existingIndex >= 0) {
        const nextItems = [...prev];
        const currentItem = nextItems[existingIndex];

        nextItems[existingIndex] = {
          ...currentItem,
          quantity: currentItem.quantity + quantity,
        };

        return nextItems;
      }

      return [...prev, { ...product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === productId ? { ...item, quantity } : item,
        ),
      );
    },
    [removeFromCart],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const { totalItems, totalPrice } = useMemo(() => {
    return items.reduce(
      (result, item) => ({
        totalItems: result.totalItems + item.quantity,
        totalPrice: result.totalPrice + item.price * item.quantity,
      }),
      {
        totalItems: 0,
        totalPrice: 0,
      },
    );
  }, [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems,
      totalPrice,
      isEmpty: items.length === 0,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    }),
    [
      items,
      totalItems,
      totalPrice,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
```

购物车这类状态还可以进一步拆分 Context：

- 一个 Context 存 `items`、`totalItems`、`totalPrice`。
- 一个 Context 存 `addToCart`、`removeFromCart` 等 actions。

这样只用 action 的组件不会因为 `items` 改变而重新渲染。

---

## 13. 自定义 Hook 统一消费入口

每个 Provider 都应该配套一个自定义 Hook。

```ts
// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../providers/AuthProvider';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within <AuthProvider />');
  }

  return context;
}
```

```ts
// src/hooks/useTheme.ts
import { useContext } from 'react';
import { ThemeContext } from '../providers/ThemeProvider';

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within <ThemeProvider />');
  }

  return context;
}
```

```ts
// src/hooks/useCart.ts
import { useContext } from 'react';
import { CartContext } from '../providers/CartProvider';

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used within <CartProvider />');
  }

  return context;
}
```

统一 Hook 的好处是：组件不直接依赖 Context 文件，也不需要重复写空值判断。

---

## 14. 组件如何消费 Provider

Header 可以同时消费认证、主题和购物车：

```tsx
// src/components/Header.tsx
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useTheme } from '../hooks/useTheme';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { totalItems } = useCart();

  return (
    <header className={`header ${theme}`}>
      <div className="logo">电商网站</div>

      <div className="header-actions">
        <div className="cart-icon">
          购物车
          {totalItems > 0 ? (
            <span className="cart-count">{totalItems}</span>
          ) : null}
        </div>

        <button onClick={toggleTheme}>
          {theme === 'light' ? '切换到暗色' : '切换到亮色'}
        </button>

        {user ? (
          <div className="user-info">
            <span>欢迎，{user.name}</span>
            <button onClick={logout}>退出</button>
          </div>
        ) : (
          <a href="/login">登录</a>
        )}
      </div>
    </header>
  );
}
```

商品卡片只需要购物车和认证状态：

```tsx
// src/components/ProductCard.tsx
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';

type Product = {
  id: string;
  name: string;
  price: number;
  image: string;
};

export function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }

    addToCart(product);
  };

  return (
    <article className="product-card">
      <img src={product.image} alt={product.name} />
      <h3>{product.name}</h3>
      <p>¥{product.price}</p>

      <button onClick={handleAddToCart} disabled={!isAuthenticated}>
        {isAuthenticated ? '加入购物车' : '登录后购买'}
      </button>
    </article>
  );
}
```

组件只消费自己需要的能力，不再通过 props 层层传递。

---

## 15. Provider 嵌套太深怎么办

如果 Provider 嵌套超过 5 层，阅读体验会变差。可以封装 `AppProviders`，也可以使用组合函数。

```tsx
// src/app/composeProviders.tsx
import { type ComponentType, type ReactNode } from 'react';

type ProviderComponent = ComponentType<{ children: ReactNode }>;

export function composeProviders(...providers: ProviderComponent[]) {
  return function ComposedProviders({ children }: { children: ReactNode }) {
    return providers.reduceRight((acc, Provider) => {
      return <Provider>{acc}</Provider>;
    }, children);
  };
}
```

使用：

```tsx
// src/app/AppProviders.tsx
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../providers/AuthProvider';
import { CartProvider } from '../providers/CartProvider';
import { I18nProvider } from '../providers/I18nProvider';
import { NotificationProvider } from '../providers/NotificationProvider';
import { ThemeProvider } from '../providers/ThemeProvider';
import { composeProviders } from './composeProviders';

export const AppProviders = composeProviders(
  BrowserRouter,
  AuthProvider,
  I18nProvider,
  ThemeProvider,
  NotificationProvider,
  CartProvider,
);
```

这种写法可以减少 JSX 嵌套，但也有代价：依赖顺序不如显式嵌套直观。团队里如果 Provider 顺序很重要，显式写出来反而更清楚。

---

## 16. 循环依赖怎么处理

如果出现这种情况：

- `ProviderA` 需要 `ProviderB` 的数据。
- `ProviderB` 又需要 `ProviderA` 的数据。

这通常说明领域边界划错了。

解决方式有两个：

第一，把强相关状态合并到同一个 Provider。

```tsx
// src/providers/UserProvider.tsx
import { useCallback, useMemo, useState, type ReactNode } from 'react';

export function UserProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState(null);
  const [profile, setProfile] = useState(null);

  const updateProfile = useCallback((nextProfile: unknown) => {
    setProfile(nextProfile);
  }, []);

  const value = useMemo(
    () => ({
      auth,
      profile,
      setAuth,
      updateProfile,
    }),
    [auth, profile, updateProfile],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
```

第二，如果状态关系已经比较复杂，可以引入 Zustand、Redux Toolkit 等状态管理库。

Provider Pattern 适合简单清晰的共享边界，不适合强耦合的大型状态图。

---

## 17. 如何调试 Provider 重渲染

可以写一个简单的调试 Hook，查看 Provider 渲染次数。

```ts
// src/hooks/useProviderDebug.ts
import { useEffect, useRef } from 'react';

export function useProviderDebug(providerName: string) {
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`${providerName} render count:`, renderCountRef.current);
  });
}
```

在 Provider 中使用：

```tsx
// src/providers/ThemeProvider.tsx
import { useProviderDebug } from '../hooks/useProviderDebug';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useProviderDebug('ThemeProvider');

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
```

更正式的性能定位应该使用 React DevTools Profiler，看组件提交时间和重渲染来源。

---

## 18. Provider 测试策略

Provider 最好做两类测试：

- 单元测试：验证 Provider 的状态更新和 actions。
- 集成测试：验证多个 Provider 嵌套后能正常消费。

示例：

```tsx
// src/providers/__tests__/providers.test.tsx
import { render, screen } from '@testing-library/react';
import { AuthProvider } from '../AuthProvider';
import { ThemeProvider } from '../ThemeProvider';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';

function TestComponent() {
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <div>
      <span data-testid="user">{user?.name ?? 'anonymous'}</span>
      <span data-testid="theme">{theme}</span>
    </div>
  );
}

describe('providers', () => {
  it('provides auth and theme context', () => {
    render(
      <AuthProvider>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthProvider>,
    );

    expect(screen.getByTestId('theme')).toBeInTheDocument();
  });
});
```

测试重点不是 Provider 语法，而是验证消费方是否能稳定拿到预期上下文。

---

## 19. 什么时候适合用 Provider Pattern

Provider Pattern 适合“跨层共享、低频更新、逻辑集中”的对象：

- 主题 `Theme`。
- 鉴权 `Auth`。
- 国际化 `i18n`。
- 品牌信息 `Brand`。
- 购物车 `Cart`。
- Feature flags。
- A/B 测试开关。
- 当前组织、当前工作区。
- 全局通知系统。

不太适合：

- 高频输入状态。
- 滚动位置。
- 鼠标移动坐标。
- 大型列表数据。
- 需要选择器精确订阅的复杂状态。
- 服务端数据缓存。

这些场景更适合组件本地 state、Zustand、Redux Toolkit、Jotai、TanStack Query 等方案。

---

## 20. 常见坑与反模式

### 20.1 Context 范围太大

很多人图省事，把 Provider 全部包在根节点。结果某个局部状态更新时，影响范围过大。

建议：

> Provider 只包需要它的那段组件树。

### 20.2 巨型 Context

把 `theme`、`auth`、`cart`、`settings` 全塞到一个 Context 里，是典型反模式。

建议：

> 按领域拆分 Context，一个 Provider 只提供自己领域的数据和能力。

### 20.3 value 每次 render 都创建新对象

错误示例：

```tsx
// src/providers/SomeProvider.tsx
<SomeContext.Provider value={{ a, b, fn }}>
  {children}
</SomeContext.Provider>
```

建议：

```tsx
// src/providers/SomeProvider.tsx
const value = useMemo(
  () => ({
    a,
    b,
    fn,
  }),
  [a, b, fn],
);
```

### 20.4 把高频大对象塞进 Context

例如把超大列表、实时输入、滚动位置放到 Context 里，会导致大量消费者更新。

建议：

- 下沉到局部 state。
- 拆分 Context。
- 使用带 selector 的状态管理方案。

---

## 21. Provider vs Redux / Zustand / React Query

| 工具 | 适用场景 | 复杂度 | 学习成本 |
| --- | --- | --- | --- |
| Context + Provider | 简单全局状态，如主题、用户信息 | 低 | 低 |
| Zustand / Jotai | 中等复杂度全局状态，需要选择器或更细粒度订阅 | 中 | 中 |
| Redux Toolkit | 企业级复杂状态，需要强约束、中间件和 DevTools | 高 | 高 |
| React Query / SWR | 服务端状态，请求、缓存、同步和失效 | 中 | 中 |

建议是：

> 简单共享状态先用 Context + Provider。只有当状态复杂度、更新频率或订阅粒度超出 Context 能力时，再引入更强的状态管理库。

---

## 22. TypeScript 完整示例

下面给一个更完整的认证 Provider 类型示例。

```ts
// src/types/index.ts
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
};

export type Theme = {
  mode: 'light' | 'dark' | 'auto';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
};

export type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, 'id'>) => Promise<void>;
};
```

```tsx
// src/context/AuthContext.tsx
import { createContext } from 'react';
import type { AuthContextValue } from '../types';

export const AuthContext = createContext<AuthContextValue | null>(null);
```

```tsx
// src/providers/AuthProvider.tsx
import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AuthContext } from '../context/AuthContext';
import type { AuthContextValue, User } from '../types';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('登录失败');
      }

      const userData = await response.json();
      setUser(userData.user);
      window.localStorage.setItem('token', userData.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    window.localStorage.removeItem('token');
  }, []);

  const register = useCallback(async (userData: Omit<User, 'id'>) => {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('注册失败');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login,
      logout,
      register,
    }),
    [user, isLoading, login, logout, register],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

```ts
// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within <AuthProvider />');
  }

  return context;
}
```

这套写法的重点是：

- Context 类型独立定义。
- Provider 负责状态和 actions。
- Hook 负责消费和错误提示。
- 组件不直接接触 Context。

---

## 23. 总结

Provider Pattern 的价值不在于“会写 Context”，而在于把共享状态组织得可维护：

- 边界清晰。
- 职责单一。
- 范围可控。
- 依赖顺序明确。
- 高频状态尽量下沉。
- `value` 引用保持稳定。
- 消费入口统一封装成 Hook。

当你遵循这套模式后，Context 不再是一个容易失控的全局变量容器，而会变成 React 项目里非常稳定的一类基础设施。

真正需要记住的是：

> Context 负责跨层共享，Provider 负责组织边界，自定义 Hook 负责消费入口。不要让一个 Provider 变成全局大杂烩，也不要让高频状态广播到整棵组件树。
