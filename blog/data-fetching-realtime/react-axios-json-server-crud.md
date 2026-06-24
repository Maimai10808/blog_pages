# React 博客项目中使用 Axios + JSON Server 实现完整 CRUD

在 React 项目中，请求后端数据是非常常见的需求。虽然浏览器原生提供了 `fetch API`，但在实际开发中，很多项目会选择使用 `Axios`，因为它语法更简洁，错误处理更方便，并且会自动帮我们解析 JSON 数据。

本文以一个 React 博客应用为例，记录如何使用 `Axios` 配合 `JSON Server` 搭建本地开发 API，并实现文章的查询、新增、删除和编辑功能。

## 一、准备 JSON Server 数据

首先，在项目根目录下创建一个 `data` 文件夹，并在其中新建 `db.json` 文件：

```text
data/db.json
```

`db.json` 中的数据结构需要是标准 JSON 格式。假设我们要管理博客文章，可以这样写：

```json
{
  "posts": [
    {
      "id": 1,
      "title": "First Post",
      "datetime": "July 01, 2021 11:17:36 AM",
      "body": "This is my first post."
    },
    {
      "id": 2,
      "title": "Second Post",
      "datetime": "July 01, 2021 11:17:36 AM",
      "body": "This is my second post."
    }
  ]
}
```

需要注意的是，JSON 文件中的属性名必须使用双引号包裹，这一点和 JavaScript 对象不同。

原来项目中可能是在 `App.js` 中通过 `useState` 写死静态数据：

```js
const [posts, setPosts] = useState([
  // static posts
]);
```

现在我们要改为从接口获取数据，所以初始值改为空数组：

```js
const [posts, setPosts] = useState([]);
```

## 二、安装 Axios

接下来安装 Axios：

```bash
npm i axios
```

安装完成后，可以在 `package.json` 的 `dependencies` 中看到 `axios`。

## 三、封装 Axios 实例

为了避免在每次请求时重复写完整的接口地址，可以单独封装一个 Axios 实例。

在 `src` 目录下创建 `api` 文件夹，并新建 `posts.js`：

```text
src/api/posts.js
```

代码如下：

```js
import axios from "axios";

export default axios.create({
  baseURL: "http://localhost:3500",
});
```

这里的 `baseURL` 指向本地 JSON Server 的地址。以后请求 `/posts` 时，实际访问的就是：

```text
http://localhost:3500/posts
```

如果项目上线，只需要把这里的地址替换成线上接口地址即可。

## 四、启动 JSON Server 和 React 项目

先启动 JSON Server：

```bash
npx json-server -p 3500 -w data/db.json
```

其中：

```text
-p 3500
```

表示使用 `3500` 端口；

```text
-w data/db.json
```

表示监听 `data/db.json` 文件变化。

然后打开另一个终端，启动 React 项目：

```bash
npm start
```

此时页面可能暂时没有文章，因为我们已经把原来的静态文章状态清空了。接下来需要通过 Axios 请求数据。

## 五、使用 Axios 获取文章列表

在 `App.js` 中引入刚才封装好的 Axios 实例：

```js
import api from "./api/posts";
```

然后使用 `useEffect` 在页面加载时获取文章数据：

```js
useEffect(() => {
  const fetchPosts = async () => {
    try {
      const response = await api.get("/posts");
      setPosts(response.data);
    } catch (err) {
      if (err.response) {
        console.log(err.response.data);
        console.log(err.response.status);
        console.log(err.response.headers);
      } else {
        console.log(`Error: ${err.message}`);
      }
    }
  };

  fetchPosts();
}, []);
```

这里的核心代码是：

```js
const response = await api.get("/posts");
setPosts(response.data);
```

和 `fetch` 相比，Axios 有两个明显优点：

第一，Axios 会自动把响应数据解析成 JSON，不需要再写：

```js
const data = await response.json();
```

第二，Axios 会自动捕获非 `2xx` 状态码的错误，不需要手动判断：

```js
if (!response.ok) {
  throw Error("Something went wrong");
}
```

所以整体代码会更简洁。

## 六、使用 Axios 新增文章

新增文章对应的是 CRUD 中的 Create 操作，也就是 HTTP 请求中的 `POST`。

假设我们有一个 `handleSubmit` 函数，用于提交新文章：

```js
const handleSubmit = async (e) => {
  e.preventDefault();

  const id = posts.length ? posts[posts.length - 1].id + 1 : 1;
  const datetime = format(new Date(), "MMMM dd, yyyy pp");
  const newPost = {
    id,
    title: postTitle,
    datetime,
    body: postBody,
  };

  try {
    const response = await api.post("/posts", newPost);
    const allPosts = [...posts, response.data];

    setPosts(allPosts);
    setPostTitle("");
    setPostBody("");
    history.push("/");
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
};
```

这里最重要的是：

```js
const response = await api.post("/posts", newPost);
```

第一个参数是接口路径，第二个参数是要提交的数据。

提交成功后，JSON Server 会返回新创建的文章数据，我们使用：

```js
response.data;
```

更新本地状态：

```js
const allPosts = [...posts, response.data];
setPosts(allPosts);
```

这样页面就可以立即显示新增后的文章列表。

## 七、使用 Axios 删除文章

删除文章对应的是 CRUD 中的 Delete 操作，也就是 HTTP 请求中的 `DELETE`。

可以定义一个 `handleDelete` 函数：

```js
const handleDelete = async (id) => {
  try {
    await api.delete(`/posts/${id}`);

    const postsList = posts.filter((post) => post.id !== id);
    setPosts(postsList);
    history.push("/");
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
};
```

核心代码是：

```js
await api.delete(`/posts/${id}`);
```

由于删除接口通常不需要我们特别使用返回值，所以这里不一定要接收 `response`。

请求成功后，再通过 `filter` 从本地状态中移除对应文章：

```js
const postsList = posts.filter((post) => post.id !== id);
setPosts(postsList);
```

## 八、使用 Axios 编辑文章

编辑文章对应的是 CRUD 中的 Update 操作。这里我们使用 `PUT` 请求。

首先，需要新增两个状态，用于编辑表单：

```js
const [editTitle, setEditTitle] = useState("");
const [editBody, setEditBody] = useState("");
```

然后编写 `handleEdit` 函数：

```js
const handleEdit = async (id) => {
  const datetime = format(new Date(), "MMMM dd, yyyy pp");

  const updatedPost = {
    id,
    title: editTitle,
    datetime,
    body: editBody,
  };

  try {
    const response = await api.put(`/posts/${id}`, updatedPost);

    setPosts(
      posts.map((post) => (post.id === id ? { ...response.data } : post)),
    );

    setEditTitle("");
    setEditBody("");
    history.push("/");
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
};
```

这里的核心请求是：

```js
const response = await api.put(`/posts/${id}`, updatedPost);
```

`PUT` 通常表示替换整个资源。如果只是更新部分字段，也可以使用 `PATCH`。在这个例子中，我们提交的是完整文章数据，所以使用 `PUT` 更合适。

更新本地状态时，不能简单地把新文章追加进去，否则会出现旧文章和新文章同时存在的问题。因此需要使用 `map`：

```js
setPosts(posts.map((post) => (post.id === id ? { ...response.data } : post)));
```

它的逻辑是：如果当前文章的 `id` 和被编辑文章的 `id` 一致，就替换成接口返回的新数据；否则保持原文章不变。

## 九、创建 EditPost 组件

为了实现文章编辑页面，可以创建一个新的组件：

```text
src/EditPost.js
```

该组件需要通过路由参数获取文章 `id`，并根据 `id` 找到对应文章：

```js
import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const EditPost = ({
  posts,
  handleEdit,
  editBody,
  setEditBody,
  editTitle,
  setEditTitle,
}) => {
  const { id } = useParams();

  const post = posts.find((post) => post.id.toString() === id);

  useEffect(() => {
    if (post) {
      setEditTitle(post.title);
      setEditBody(post.body);
    }
  }, [post, setEditTitle, setEditBody]);

  return (
    <main className="NewPost">
      {editTitle && (
        <>
          <h2>Edit Post</h2>
          <form className="newPostForm" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="postTitle">Title:</label>
            <input
              id="postTitle"
              type="text"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <label htmlFor="postBody">Post:</label>
            <textarea
              id="postBody"
              required
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
            />

            <button type="submit" onClick={() => handleEdit(post.id)}>
              Submit
            </button>
          </form>
        </>
      )}

      {!editTitle && (
        <>
          <h2>Post Not Found</h2>
          <p>Well, that's disappointing.</p>
          <p>
            <Link to="/">Visit Our Homepage</Link>
          </p>
        </>
      )}
    </main>
  );
};

export default EditPost;
```

这里使用了：

```js
const { id } = useParams();
```

从 URL 中获取文章 id。

然后使用：

```js
posts.find((post) => post.id.toString() === id);
```

查找当前要编辑的文章。

因为 URL 参数默认是字符串，而文章 `id` 可能是数字，所以这里把 `post.id` 转成字符串再比较。

## 十、添加编辑路由

在 `App.js` 中引入组件：

```js
import EditPost from "./EditPost";
```

然后添加路由：

```jsx
<Route path="/edit/:id">
  <EditPost
    posts={posts}
    handleEdit={handleEdit}
    editTitle={editTitle}
    setEditTitle={setEditTitle}
    editBody={editBody}
    setEditBody={setEditBody}
  />
</Route>
```

这里的：

```text
/edit/:id
```

表示编辑页面的动态路由。例如：

```text
/edit/1
```

就是编辑 `id` 为 `1` 的文章。

## 十一、在文章详情页添加编辑按钮

在文章详情页中，可以添加一个跳转到编辑页面的按钮：

```jsx
<Link to={`/edit/${post.id}`}>
  <button className="editButton">Edit Post</button>
</Link>

<button
  className="deleteButton"
  onClick={() => handleDelete(post.id)}
>
  Delete Post
</button>
```

这样用户进入文章详情页后，就可以选择编辑或删除文章。

## 十二、简单调整按钮样式

为了区分编辑按钮和删除按钮，可以添加一些 CSS：

```css
.editButton {
  background-color: #333;
}

.deleteButton {
  background-color: red;
}

.editButton,
.deleteButton {
  color: #fff;
  padding: 0.5rem;
  margin-right: 0.5rem;
  border: none;
  cursor: pointer;
}
```

这样编辑按钮和删除按钮在视觉上会更加清晰。

## 十三、总结

通过本文的步骤，我们完成了一个基于 React、Axios 和 JSON Server 的博客 CRUD 功能。

主要流程如下：

```text
GET /posts       获取文章列表
POST /posts      新增文章
DELETE /posts/id 删除文章
PUT /posts/id    更新文章
```

Axios 的优势在于请求写法简洁、自动解析 JSON、自动处理非 `2xx` 状态码错误。相比原生 `fetch`，它更适合在中大型项目中统一封装请求逻辑。

在这个博客项目中，我们先用 JSON Server 模拟后端接口，再通过 Axios 完成文章的增删改查。虽然这只是一个开发环境中的示例，但它已经覆盖了真实项目中最常见的数据请求流程，也为后续抽离自定义 Hook、封装统一请求层、处理加载状态和错误状态打下了基础。
