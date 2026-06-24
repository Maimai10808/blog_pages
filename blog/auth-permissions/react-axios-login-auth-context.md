# React 中使用 Axios 实现登录表单与全局认证状态

在 React 项目中，登录表单不仅仅是收集用户名和密码，还涉及表单受控、错误提示、接口请求、认证状态保存以及无障碍访问等内容。本文基于一个 React 登录表单示例，记录如何使用 `Axios` 提交用户信息，并结合 `Context API` 保存全局认证状态。

本文实现的功能包括：

```text
1. 创建登录组件
2. 使用 useRef、useState、useEffect 管理表单状态
3. 使用 Axios 提交用户名和密码
4. 根据服务端响应展示成功或错误提示
5. 使用 Context API 保存登录后的认证信息
6. 考虑基础无障碍访问体验
```

## 一、创建 Login 组件

首先，在 `src` 目录下创建一个新的组件文件：

```text
src/Login.js
```

然后创建一个函数式组件：

```jsx
const Login = () => {
  return (
    <section>
      <h1>Sign In</h1>
    </section>
  );
};

export default Login;
```

接着在 `App.js` 中引入并使用它：

```jsx
import Login from "./Login";

function App() {
  return (
    <main>
      <Login />
    </main>
  );
}

export default App;
```

这里使用 `main` 和 `section` 这样的语义化标签，而不是普通的 `div`，有助于提升页面结构的清晰度和可访问性。

## 二、引入 React Hooks

登录表单需要管理输入框状态、错误信息、登录成功状态，还需要在页面加载时自动聚焦到用户名输入框。因此需要用到 `useRef`、`useState` 和 `useEffect`。

在 `Login.js` 顶部引入：

```jsx
import { useRef, useState, useEffect } from "react";
```

然后在组件内部定义引用和状态：

```jsx
const Login = () => {
  const userRef = useRef();
  const errRef = useRef();

  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [success, setSuccess] = useState(false);

  return (
    <section>
      <h1>Sign In</h1>
    </section>
  );
};
```

其中：

```text
userRef：用于页面加载后自动聚焦用户名输入框
errRef：用于登录失败时聚焦错误提示
user：保存用户名
pwd：保存密码
errMsg：保存错误信息
success：标记是否登录成功
```

## 三、页面加载时自动聚焦输入框

当登录组件第一次加载时，可以自动把焦点放到用户名输入框上：

```jsx
useEffect(() => {
  userRef.current.focus();
}, []);
```

依赖数组为空，表示这个副作用只在组件首次加载时执行一次。

这样用户打开登录页后，可以直接输入用户名，体验会更顺畅。

## 四、输入变化时清空错误信息

如果用户登录失败后开始重新输入用户名或密码，之前的错误提示就应该被清空。可以再写一个 `useEffect`：

```jsx
useEffect(() => {
  setErrMsg("");
}, [user, pwd]);
```

只要 `user` 或 `pwd` 发生变化，就清空错误信息。

这种处理方式比较自然，因为用户已经看到错误提示，并且正在尝试修改输入内容，没有必要继续保留旧错误。

## 五、编写登录表单 JSX

接下来开始写登录表单结构。完整表单包括错误提示、标题、用户名输入框、密码输入框、提交按钮以及注册链接。

```jsx
return (
  <>
    {success ? (
      <section>
        <h1>You are logged in!</h1>
        <br />
        <p>
          <a href="#">Go to Home</a>
        </p>
      </section>
    ) : (
      <section>
        <p
          ref={errRef}
          className={errMsg ? "errmsg" : "offscreen"}
          aria-live="assertive"
        >
          {errMsg}
        </p>

        <h1>Sign In</h1>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            ref={userRef}
            autoComplete="off"
            onChange={(e) => setUser(e.target.value)}
            value={user}
            required
          />

          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            onChange={(e) => setPwd(e.target.value)}
            value={pwd}
            required
          />

          <button>Sign In</button>
        </form>

        <p>
          Need an Account?
          <br />
          <span className="line">
            <a href="#">Sign Up</a>
          </span>
        </p>
      </section>
    )}
  </>
);
```

这里有几个关键点。

第一，每个输入框都要有对应的 `label`：

```jsx
<label htmlFor="username">Username:</label>
<input id="username" />
```

`label` 的 `htmlFor` 要和 `input` 的 `id` 对应，这样有利于表单可访问性。

第二，用户名和密码输入框都是受控组件：

```jsx
value={user}
onChange={(e) => setUser(e.target.value)}
```

受控组件的好处是 React 状态和表单输入始终保持一致，后续清空输入框也更加方便。

第三，错误提示使用了：

```jsx
aria-live="assertive"
```

这可以让屏幕阅读器在错误信息出现时及时读出内容，有助于无障碍体验。

## 六、先实现一个临时提交逻辑

在真正接入后端接口之前，可以先写一个临时的 `handleSubmit`，测试表单是否正常工作：

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();

  console.log(user, pwd);

  setUser("");
  setPwd("");
  setSuccess(true);
};
```

这里通过：

```jsx
e.preventDefault();
```

阻止表单默认提交行为，避免页面刷新。

如果点击登录按钮后页面能显示登录成功，并且输入框可以清空，就说明基础表单逻辑没有问题。

## 七、创建认证上下文 AuthProvider

登录成功后，通常需要把用户认证信息保存到全局状态中，方便其他组件使用。这里可以使用 React 的 `Context API`。

在 `src` 目录下创建 `context` 文件夹，并新建文件：

```text
src/context/AuthProvider.js
```

代码如下：

```jsx
import { createContext, useState } from "react";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [auth, setAuth] = useState({});

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
```

这里做了两件事：

```text
1. 创建 AuthContext
2. 创建 AuthProvider，并把 auth 和 setAuth 提供给子组件
```

`children` 代表被 `AuthProvider` 包裹的所有组件。

## 八、在入口文件中包裹 App

为了让整个应用都能访问认证状态，需要在入口文件中用 `AuthProvider` 包裹 `App`。

例如在 `index.js` 中：

```jsx
import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthProvider";

ReactDOM.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
  document.getElementById("root"),
);
```

这样 `App` 以及它内部的所有组件，都可以通过 `useContext(AuthContext)` 访问认证状态。

## 九、在 Login 中使用认证上下文

回到 `Login.js`，引入 `useContext` 和 `AuthContext`：

```jsx
import { useRef, useState, useEffect, useContext } from "react";
import AuthContext from "./context/AuthProvider";
```

然后在组件内部取出 `setAuth`：

```jsx
const { setAuth } = useContext(AuthContext);
```

登录成功后，就可以通过 `setAuth` 保存用户信息、角色和 token。

## 十、安装并封装 Axios

安装 Axios：

```bash
npm i axios
```

然后在 `src` 目录下创建 `api` 文件夹，并新建：

```text
src/api/axios.js
```

代码如下：

```jsx
import axios from "axios";

export default axios.create({
  baseURL: "http://localhost:3500",
});
```

这样以后在组件中请求接口时，就不用反复写完整的基础地址。

例如登录接口如果是：

```text
http://localhost:3500/auth
```

在组件中只需要请求：

```text
/auth
```

## 十一、在 Login 中引入 Axios

在 `Login.js` 中引入封装好的 Axios 实例：

```jsx
import axios from "./api/axios";
```

然后定义登录接口地址：

```jsx
const LOGIN_URL = "/auth";
```

## 十二、使用 Axios 提交登录请求

现在可以完善 `handleSubmit`：

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const response = await axios.post(
      LOGIN_URL,
      JSON.stringify({ user, pwd }),
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      },
    );

    console.log(JSON.stringify(response?.data));

    const accessToken = response?.data?.accessToken;
    const roles = response?.data?.roles;

    setAuth({ user, pwd, roles, accessToken });

    setUser("");
    setPwd("");
    setSuccess(true);
  } catch (err) {
    if (!err?.response) {
      setErrMsg("No Server Response");
    } else if (err.response?.status === 400) {
      setErrMsg("Missing Username or Password");
    } else if (err.response?.status === 401) {
      setErrMsg("Unauthorized");
    } else {
      setErrMsg("Login Failed");
    }

    errRef.current.focus();
  }
};
```

这段代码是整个登录功能的核心。

其中：

```jsx
await axios.post(LOGIN_URL, JSON.stringify({ user, pwd }), config);
```

表示向登录接口发送 `POST` 请求。

第二个参数是请求体：

```jsx
JSON.stringify({ user, pwd });
```

第三个参数是请求配置：

```jsx
{
  headers: { "Content-Type": "application/json" },
  withCredentials: true
}
```

`Content-Type` 表示发送 JSON 数据。

`withCredentials: true` 表示允许请求携带凭证，例如 cookie。在涉及跨域认证、refresh token cookie 等场景时，这个配置经常会用到。

## 十三、保存登录后的认证信息

如果登录成功，后端可能会返回类似这样的数据：

```json
{
  "roles": [2001, 1984],
  "accessToken": "xxx.xxx.xxx"
}
```

前端可以取出这些字段：

```jsx
const accessToken = response?.data?.accessToken;
const roles = response?.data?.roles;
```

然后保存到全局认证状态中：

```jsx
setAuth({ user, pwd, roles, accessToken });
```

这样其他组件就可以通过 `AuthContext` 获取当前登录用户的信息。

不过在真实项目中，一般不建议长期保存明文密码。这里保存 `pwd` 主要是教程演示，实际项目中通常只保存用户信息、角色、权限和 token 等必要认证数据。

## 十四、处理登录错误

Axios 的一个优点是：当响应状态码不是 `2xx` 时，会自动进入 `catch` 分支。因此不需要像 `fetch` 那样手动判断：

```jsx
if (!response.ok) {
  throw Error("Login failed");
}
```

在 `catch` 中，可以根据不同情况展示不同错误信息：

```jsx
if (!err?.response) {
  setErrMsg("No Server Response");
} else if (err.response?.status === 400) {
  setErrMsg("Missing Username or Password");
} else if (err.response?.status === 401) {
  setErrMsg("Unauthorized");
} else {
  setErrMsg("Login Failed");
}
```

常见情况包括：

```text
没有响应：后端服务未启动、网络异常、跨域阻止
400：请求参数不完整，例如缺少用户名或密码
401：用户名或密码错误，认证失败
其他错误：统一显示登录失败
```

最后调用：

```jsx
errRef.current.focus();
```

把焦点设置到错误提示上，配合 `aria-live="assertive"`，让辅助技术可以及时读出错误信息。

## 十五、后端接口需要注意的问题

如果前端运行在：

```text
http://localhost:3000
```

后端运行在：

```text
http://localhost:3500
```

那么后端需要正确配置 CORS，允许前端地址访问。

后端的允许来源中应包含：

```text
http://localhost:3000
```

否则浏览器会因为跨域问题阻止请求，前端无法正常完成登录。

同时，登录接口应该返回前端需要的数据，例如：

```jsx
res.json({
  roles,
  accessToken,
});
```

如果后端返回的字段名不同，前端也要相应调整：

```jsx
response?.data?.accessToken;
response?.data?.roles;
```

## 十六、完整 Login 组件示例

下面是一个完整的 `Login.js` 示例：

```jsx
import { useRef, useState, useEffect, useContext } from "react";
import AuthContext from "./context/AuthProvider";
import axios from "./api/axios";

const LOGIN_URL = "/auth";

const Login = () => {
  const { setAuth } = useContext(AuthContext);

  const userRef = useRef();
  const errRef = useRef();

  const [user, setUser] = useState("");
  const [pwd, setPwd] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    userRef.current.focus();
  }, []);

  useEffect(() => {
    setErrMsg("");
  }, [user, pwd]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(
        LOGIN_URL,
        JSON.stringify({ user, pwd }),
        {
          headers: { "Content-Type": "application/json" },
          withCredentials: true,
        },
      );

      const accessToken = response?.data?.accessToken;
      const roles = response?.data?.roles;

      setAuth({ user, pwd, roles, accessToken });

      setUser("");
      setPwd("");
      setSuccess(true);
    } catch (err) {
      if (!err?.response) {
        setErrMsg("No Server Response");
      } else if (err.response?.status === 400) {
        setErrMsg("Missing Username or Password");
      } else if (err.response?.status === 401) {
        setErrMsg("Unauthorized");
      } else {
        setErrMsg("Login Failed");
      }

      errRef.current.focus();
    }
  };

  return (
    <>
      {success ? (
        <section>
          <h1>You are logged in!</h1>
          <br />
          <p>
            <a href="#">Go to Home</a>
          </p>
        </section>
      ) : (
        <section>
          <p
            ref={errRef}
            className={errMsg ? "errmsg" : "offscreen"}
            aria-live="assertive"
          >
            {errMsg}
          </p>

          <h1>Sign In</h1>

          <form onSubmit={handleSubmit}>
            <label htmlFor="username">Username:</label>
            <input
              type="text"
              id="username"
              ref={userRef}
              autoComplete="off"
              onChange={(e) => setUser(e.target.value)}
              value={user}
              required
            />

            <label htmlFor="password">Password:</label>
            <input
              type="password"
              id="password"
              onChange={(e) => setPwd(e.target.value)}
              value={pwd}
              required
            />

            <button>Sign In</button>
          </form>

          <p>
            Need an Account?
            <br />
            <span className="line">
              <a href="#">Sign Up</a>
            </span>
          </p>
        </section>
      )}
    </>
  );
};

export default Login;
```

## 十七、总结

本文实现了一个基于 React 和 Axios 的登录表单。它不仅完成了用户名和密码的提交，也加入了全局认证状态和基础无障碍处理。

整个流程可以概括为：

```text
用户输入用户名和密码
        ↓
React 受控组件保存输入状态
        ↓
提交表单，阻止默认刷新
        ↓
Axios 向 /auth 发送 POST 请求
        ↓
后端验证用户信息
        ↓
成功：返回 roles 和 accessToken
失败：返回对应错误状态码
        ↓
前端保存认证状态或展示错误提示
```

这类登录表单是 React 认证系统的基础。后续还可以继续扩展路由跳转、登录持久化、刷新 token、权限路由、退出登录等功能。

需要特别注意的是，教程中为了演示方便，把 `user`、`pwd`、`roles` 和 `accessToken` 都放进了全局状态。但在真实项目中，不建议保存明文密码。认证信息的存储方式需要结合项目安全策略设计，例如使用内存状态保存 access token，使用 httpOnly cookie 保存 refresh token 等。

通过这个例子，可以看到 Axios 相比原生 `fetch` 的优势：请求写法更直接，响应自动解析，错误处理更方便。配合 React 的受控表单和 Context API，就可以搭建出一个比较完整的前端登录认证基础结构。
