# Axios 快速入门：从基础请求到拦截器、全局配置与错误处理

在前端开发中，请求后端接口是非常常见的需求。浏览器原生提供了 `fetch API`，但在实际项目中，很多开发者更喜欢使用 `Axios`。Axios 是一个基于 Promise 的 HTTP 客户端，可以运行在浏览器和 Node.js 环境中，常用于 React、Vue、原生 JavaScript 或全栈项目中。

相比 `fetch`，Axios 的语法更加简洁，默认会对 JSON 数据进行处理，并且提供了拦截器、全局配置、请求取消、超时控制等能力。本文以一个 Axios 速通示例为基础，整理 Axios 的常用功能和写法。

## 一、Axios 是什么

Axios 是一个 HTTP 请求库，可以用来向自己的后端服务或第三方 API 发送请求。它可以完成常见的请求操作，例如：

```text
GET     获取数据
POST    新增数据
PUT     替换数据
PATCH   局部更新数据
DELETE  删除数据
```

它和浏览器内置的 `fetch` 功能类似，但 Axios 提供了更丰富的功能，例如：

```text
自动解析 JSON 响应
更方便的错误处理
支持请求和响应拦截器
支持全局默认配置
支持请求超时
支持同时发送多个请求
支持取消请求
支持自定义请求头
```

在 React 或 Vue 项目中，Axios 经常被用来封装统一请求层。

## 二、引入 Axios

在真实项目中，通常使用 npm 安装：

```bash
npm install axios
```

然后在 JavaScript 文件中引入：

```js
import axios from "axios";
```

如果只是做简单的前端演示，也可以通过 CDN 引入：

```html
<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
```

本文示例使用的是 JSONPlaceholder 这个免费的假 REST API：

```text
https://jsonplaceholder.typicode.com
```

它提供了 `todos`、`posts`、`comments` 等测试资源，适合学习 HTTP 请求。

## 三、Axios 响应对象结构

当 Axios 请求成功后，会返回一个响应对象。这个对象中常见的字段有：

```text
data        后端返回的数据
status      HTTP 状态码，例如 200、201、404
statusText  状态文本
headers     响应头
config      本次请求的配置信息
request     生成该响应的请求对象
```

例如：

```js
axios
  .get("https://jsonplaceholder.typicode.com/todos")
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.error(err);
  });
```

大多数情况下，我们最常用的是：

```js
res.data;
```

因为真正的业务数据通常都在 `data` 字段中。

## 四、发送 GET 请求

`GET` 请求用于获取数据。Axios 有两种常见写法。

第一种是传入配置对象：

```js
axios({
  method: "get",
  url: "https://jsonplaceholder.typicode.com/todos",
})
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

第二种是使用更简洁的快捷方法：

```js
axios
  .get("https://jsonplaceholder.typicode.com/todos")
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

在实际开发中，第二种写法更常见，因为它更直观。

如果想限制返回数量，可以通过 URL 参数传递：

```js
axios
  .get("https://jsonplaceholder.typicode.com/todos?_limit=5")
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

也可以使用 `params`：

```js
axios
  .get("https://jsonplaceholder.typicode.com/todos", {
    params: {
      _limit: 5,
    },
  })
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

`params` 的好处是更适合动态拼接复杂查询参数。

## 五、发送 POST 请求

`POST` 请求通常用于新增数据。比如新增一个 todo：

```js
axios
  .post("https://jsonplaceholder.typicode.com/todos", {
    title: "New Todo",
    completed: false,
  })
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

这里的第二个参数就是提交给后端的数据。

JSONPlaceholder 会模拟创建成功，并返回新增后的数据，例如：

```json
{
  "title": "New Todo",
  "completed": false,
  "id": 201
}
```

其中 `id` 通常由后端生成。

## 六、发送 PUT 请求

`PUT` 通常用于替换整个资源。比如更新 `id` 为 `1` 的 todo：

```js
axios
  .put("https://jsonplaceholder.typicode.com/todos/1", {
    title: "Updated Todo",
    completed: true,
  })
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

`PUT` 的语义更接近“整体替换”。也就是说，提交的数据会被认为是这个资源的新完整内容。

例如原来的 todo 中可能还有 `userId`，但如果 `PUT` 时没有提交 `userId`，返回结果中可能就不再包含它。

## 七、发送 PATCH 请求

`PATCH` 通常用于局部更新资源。比如只更新标题和完成状态：

```js
axios
  .patch("https://jsonplaceholder.typicode.com/todos/1", {
    title: "Updated Todo",
    completed: true,
  })
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

和 `PUT` 不同，`PATCH` 更强调“只修改指定字段”。没有传递的字段通常会保留原值。

简单理解：

```text
PUT：整体替换
PATCH：局部更新
```

在实际项目中，如果编辑表单提交的是完整对象，可以用 `PUT`；如果只是修改某几个字段，更适合用 `PATCH`。

## 八、发送 DELETE 请求

`DELETE` 请求用于删除数据：

```js
axios
  .delete("https://jsonplaceholder.typicode.com/todos/1")
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

删除请求一般不需要传递请求体，只需要在 URL 中指定要删除的资源 ID。

不同后端删除成功后的返回值可能不同，有的返回空对象，有的返回被删除的数据，有的只返回状态码。

## 九、同时发送多个请求

有时候页面需要同时获取多份数据，例如同时获取 `todos` 和 `posts`。如果一个请求完成后再发另一个请求，效率不高。

Axios 可以使用 `axios.all` 同时发起多个请求：

```js
axios
  .all([
    axios.get("https://jsonplaceholder.typicode.com/todos?_limit=5"),
    axios.get("https://jsonplaceholder.typicode.com/posts?_limit=5"),
  ])
  .then((res) => {
    console.log(res[0].data);
    console.log(res[1].data);
  })
  .catch((err) => console.error(err));
```

返回结果会按照请求数组的顺序排列：

```text
res[0] 对应第一个请求
res[1] 对应第二个请求
```

为了让代码更清晰，也可以使用 `axios.spread`：

```js
axios
  .all([
    axios.get("https://jsonplaceholder.typicode.com/todos?_limit=5"),
    axios.get("https://jsonplaceholder.typicode.com/posts?_limit=5"),
  ])
  .then(
    axios.spread((todos, posts) => {
      console.log(todos.data);
      console.log(posts.data);
    }),
  )
  .catch((err) => console.error(err));
```

这样变量名更有语义，代码可读性更好。

不过在现代项目中，也常直接使用原生的 `Promise.all`：

```js
Promise.all([axios.get("/todos"), axios.get("/posts")]).then(
  ([todosRes, postsRes]) => {
    console.log(todosRes.data);
    console.log(postsRes.data);
  },
);
```

## 十、使用请求拦截器

Axios 的拦截器可以在请求发出前或响应返回后做统一处理。

例如，我们可以创建一个请求日志拦截器：

```js
axios.interceptors.request.use(
  (config) => {
    console.log(
      `${config.method.toUpperCase()} request sent to ${config.url} at ${new Date().getTime()}`,
    );

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
```

这样每次发送请求时，都会先经过这个拦截器，并打印请求方法、URL 和时间戳。

拦截器的常见用途包括：

```text
统一添加 token
统一设置请求头
统一打印日志
统一处理 loading 状态
统一处理响应错误
统一处理登录过期跳转
```

在真实项目中，拦截器通常是封装 Axios 请求层的核心。

## 十一、自定义请求头

有些接口需要传递自定义请求头，比如登录后的 token。

可以创建一个配置对象：

```js
const config = {
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer your-token",
  },
};
```

然后作为第三个参数传给 `post`：

```js
axios
  .post(
    "https://jsonplaceholder.typicode.com/todos",
    {
      title: "New Todo",
      completed: false,
    },
    config,
  )
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

对于 `POST`、`PUT`、`PATCH` 这类请求，Axios 的参数结构通常是：

```text
axios.post(url, data, config)
axios.put(url, data, config)
axios.patch(url, data, config)
```

而 `GET` 和 `DELETE` 通常是：

```text
axios.get(url, config)
axios.delete(url, config)
```

## 十二、使用全局默认请求头

如果很多接口都需要携带同一个 token，不应该每个请求都手动写一遍。可以设置 Axios 全局默认请求头：

```js
axios.defaults.headers.common["Authorization"] = "Bearer your-token";
```

也可以添加自定义头：

```js
axios.defaults.headers.common["X-Auth-Token"] = "your-token";
```

这样之后的每个请求都会自动带上这些请求头。

这种方式常用于认证场景：

```text
用户登录成功
        ↓
后端返回 access token
        ↓
前端保存 token
        ↓
设置 Axios 默认请求头
        ↓
后续请求自动携带 token
```

不过在真实项目中，也要注意 token 的存储安全。不要随意把敏感信息暴露在不安全的位置。

## 十三、转换响应数据

Axios 支持 `transformResponse`，可以在响应进入 `.then` 之前对数据做处理。

例如，把返回数据中的标题转成大写：

```js
const options = {
  method: "post",
  url: "https://jsonplaceholder.typicode.com/todos",
  data: {
    title: "hello world",
  },
  transformResponse: axios.defaults.transformResponse.concat((data) => {
    data.title = data.title.toUpperCase();
    return data;
  }),
};

axios(options)
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

这样返回结果中的 `title` 会变成：

```text
HELLO WORLD
```

这个功能不算特别常用，但在需要统一处理后端响应格式时会有用。

除了 `transformResponse`，Axios 也支持 `transformRequest`，用于在请求发出前转换请求数据。

## 十四、错误处理

Axios 在响应状态码不属于成功范围时，会进入 `catch`。在错误处理中，常见情况有三类。

第一类：后端有响应，但状态码不是 `2xx`：

```js
if (error.response) {
  console.log(error.response.data);
  console.log(error.response.status);
  console.log(error.response.headers);
}
```

例如接口返回 `404`，可以根据状态码做不同处理：

```js
if (error.response.status === 404) {
  alert("Page Not Found");
}
```

第二类：请求已经发出，但没有收到响应：

```js
else if (error.request) {
  console.error(error.request);
}
```

这可能是网络异常、服务端无响应、跨域问题等。

第三类：请求配置阶段就出现错误：

```js
else {
  console.error(error.message);
}
```

完整写法如下：

```js
axios
  .get("https://jsonplaceholder.typicode.com/todoss")
  .then((res) => console.log(res.data))
  .catch((error) => {
    if (error.response) {
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);

      if (error.response.status === 404) {
        alert("Page Not Found");
      }
    } else if (error.request) {
      console.error(error.request);
    } else {
      console.error(error.message);
    }
  });
```

在真实项目中，可以根据不同状态码跳转到不同页面：

```text
400：表单参数错误
401：未登录或登录过期
403：没有权限
404：资源不存在
500：服务器错误
```

## 十五、自定义 validateStatus

默认情况下，Axios 会把非 `2xx` 状态码视为错误，并进入 `catch`。

如果想修改这个规则，可以使用 `validateStatus`：

```js
axios
  .get("https://jsonplaceholder.typicode.com/todoss", {
    validateStatus: function (status) {
      return status < 500;
    },
  })
  .then((res) => {
    console.log(res.status);
  })
  .catch((err) => {
    console.error(err);
  });
```

这段代码表示：只有状态码大于等于 `500` 时，才进入 `catch`。

也就是说，即使返回 `404`，也会进入 `then`，而不是 `catch`。

这个功能适合一些特殊业务场景，例如某些接口把 `404` 当作正常业务状态处理。

## 十六、设置请求超时

Axios 可以通过 `timeout` 设置请求最大等待时间，单位是毫秒。

```js
axios
  .get("https://jsonplaceholder.typicode.com/todos", {
    timeout: 5000,
  })
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

这里表示如果请求超过 5 秒还没有完成，就会报错。

如果设置得非常短，例如：

```js
timeout: 5;
```

就很容易触发超时错误：

```text
timeout of 5ms exceeded
```

在真实项目中，合理设置超时时间可以避免页面长时间等待，提高用户体验。

## 十七、取消请求

Axios 也支持取消请求。早期写法是使用 `CancelToken`：

```js
const source = axios.CancelToken.source();

axios
  .get("https://jsonplaceholder.typicode.com/todos", {
    cancelToken: source.token,
  })
  .then((res) => console.log(res.data))
  .catch((thrown) => {
    if (axios.isCancel(thrown)) {
      console.log("Request canceled", thrown.message);
    } else {
      console.error(thrown);
    }
  });

source.cancel("Request canceled");
```

这个功能可以用于：

```text
用户离开当前页面时取消未完成请求
搜索框快速输入时取消上一次请求
避免重复提交
避免组件卸载后继续更新状态
```

在现代项目中，也常使用 `AbortController` 来取消请求。

## 十八、创建 Axios 实例

在实际项目中，不建议到处直接使用全局的 `axios`。更推荐创建 Axios 实例，把基础地址、请求头、超时时间等统一配置起来。

例如：

```js
const axiosInstance = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
});
```

然后使用这个实例发请求：

```js
axiosInstance
  .get("/comments")
  .then((res) => console.log(res.data))
  .catch((err) => console.error(err));
```

因为已经设置了：

```js
baseURL: "https://jsonplaceholder.typicode.com";
```

所以请求 `/comments` 时，实际地址就是：

```text
https://jsonplaceholder.typicode.com/comments
```

这种方式非常适合项目封装：

```text
src/api/request.js
src/api/user.js
src/api/post.js
```

例如：

```js
import axios from "axios";

const request = axios.create({
  baseURL: "https://api.example.com",
  timeout: 5000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default request;
```

这样业务组件只需要调用封装好的请求方法，而不用关心底层细节。

## 十九、Axios 常用写法总结

Axios 的常用请求方式可以总结为：

```js
axios.get(url, config);

axios.post(url, data, config);

axios.put(url, data, config);

axios.patch(url, data, config);

axios.delete(url, config);
```

常用配置项包括：

```text
baseURL            基础请求地址
headers            请求头
params             URL 查询参数
timeout            超时时间
withCredentials    是否携带凭证
validateStatus     自定义成功状态码范围
transformRequest   转换请求数据
transformResponse  转换响应数据
```

常用响应字段包括：

```text
res.data       响应数据
res.status     状态码
res.headers    响应头
res.config     请求配置
```

错误处理中常用字段包括：

```text
error.response  后端返回了错误响应
error.request   请求已发出但没有响应
error.message   请求配置或其他错误信息
```

## 二十、总结

Axios 是前端项目中非常常用的 HTTP 请求库。它不仅能完成基本的 `GET`、`POST`、`PUT`、`PATCH`、`DELETE` 请求，还支持拦截器、全局配置、自定义请求头、错误处理、超时控制、请求取消和实例封装等高级功能。

对于普通页面请求来说，掌握以下内容就已经足够应对大部分业务：

```text
1. 使用 axios.get 获取数据
2. 使用 axios.post 提交数据
3. 使用 axios.put 或 axios.patch 更新数据
4. 使用 axios.delete 删除数据
5. 使用 params 传递查询参数
6. 使用 headers 携带 token
7. 使用 interceptors 统一处理请求和响应
8. 使用 axios.create 封装请求实例
9. 使用 catch 区分不同错误类型
10. 使用 timeout 避免请求长时间挂起
```

如果项目规模较小，可以直接在组件中使用 Axios。
如果项目逐渐变复杂，建议尽早封装统一请求实例，把 `baseURL`、请求头、错误处理、token 注入和登录过期处理集中到一个地方。

这样不仅能减少重复代码，也能让项目结构更加清晰，后续维护起来会更加轻松。
