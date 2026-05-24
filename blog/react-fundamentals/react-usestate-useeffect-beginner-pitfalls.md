# React useState 和 useEffect 入门：为什么这两个 Hook 最容易被用错？

很多人第一次学 React Hooks，通常会先接触两个 API：`useState` 和 `useEffect`。

`useState` 看起来很简单：保存一个状态，调用 `setState` 更新它。`useEffect` 看起来也很直接：组件加载后执行一些副作用，比如请求接口、绑定事件、设置定时器。

但真正写项目时，很多问题恰恰就出在这两个 Hook 上：

- 为什么连续调用多次 `setCount(count + 1)`，结果只加了一次？
- 为什么对象状态明明内容一样，组件还是重新渲染？
- 为什么 `useEffect` 里设置定时器后，数字只更新到 1？
- 为什么接口请求写在 `useEffect` 里，快速切换参数会出现数据闪烁？
- 为什么有时候不能在 `if` 后面再写 Hook？
- 为什么 Next.js 里用了 `useState` 会提示必须加 `"use client"`？

这些问题不是因为 Hook 难，而是因为它们背后涉及 React 渲染机制、JavaScript 闭包、对象引用、组件生命周期和服务端 / 客户端组件边界。

这篇文章就围绕 `useState` 和 `useEffect`，把它们到底解决什么问题、怎么正确使用、初学者容易踩哪些坑讲清楚。

---

## 1. useState 和 useEffect 解决了什么问题

在函数组件出现之前，React 里有状态和生命周期的组件通常要写 class component。

比如：

```tsx
class Counter extends React.Component {
  state = {
    count: 0,
  }

  componentDidMount() {
    console.log("mounted")
  }

  render() {
    return <button>{this.state.count}</button>
  }
}
```

这种写法能用，但有几个问题：

- 状态逻辑分散在 class 的不同方法里。
- 复用状态逻辑不方便。
- 生命周期方法里经常混杂很多不相关逻辑。
- `this` 对初学者不友好。
- 组件之间共享逻辑容易依赖高阶组件或 render props，代码会变复杂。

Hooks 出现后，函数组件也可以拥有状态和副作用。

`useState` 解决的是：函数组件如何保存和更新状态。

`useEffect` 解决的是：函数组件如何处理副作用。

这里的副作用包括：

- 请求数据。
- 设置定时器。
- 监听窗口大小变化。
- 操作浏览器 API。
- 订阅外部事件。
- 清理事件监听或定时器。

简单理解：

```txt
useState 负责“组件记住什么”
useEffect 负责“组件渲染之后做什么”
```

它们适合绝大多数普通交互组件，比如表单、计数器、弹窗、列表筛选、窗口监听等。

但它们不适合被滥用。尤其是 `useEffect`，很多时候初学者会把它当成“万能胶水”，结果让组件变得难维护。

---

## 2. 它是什么：基本概念介绍

### 2.1 useState 是什么

`useState` 是 React 提供的状态 Hook。

它返回两个东西：

```tsx
const [count, setCount] = useState(0)
```

这里：

- `count` 是当前状态。
- `setCount` 是更新状态的函数。
- `0` 是初始值。

当调用 `setCount` 后，React 会安排一次重新渲染。组件函数会重新执行，新的 `count` 会出现在下一次渲染中。

这里有一个非常关键的点：

```txt
调用 setState 不会立刻修改当前这一次渲染里的变量。
```

比如：

```tsx
setCount(count + 1)
console.log(count)
```

这里打印的 `count` 仍然是当前渲染里的旧值。

### 2.2 useEffect 是什么

`useEffect` 是处理副作用的 Hook。

最常见写法：

```tsx
useEffect(() => {
  console.log("component mounted")
}, [])
```

第二个参数叫依赖数组。

它决定 effect 什么时候重新执行：

```tsx
useEffect(() => {
  // 每次渲染后都执行
})

useEffect(() => {
  // 只在首次挂载后执行
}, [])

useEffect(() => {
  // count 变化后执行
}, [count])
```

`useEffect` 的核心不是“组件加载时执行代码”，而是：

```txt
当某些依赖变化后，同步外部世界
```

比如：

- `id` 变化后重新请求数据。
- `count` 变化后更新 `document.title`。
- 组件挂载后监听 `resize`。
- 组件卸载前移除监听。

### 2.3 它们不是什么

`useState` 不是普通变量。普通变量变了不会触发 React 重新渲染，state 变了才会。

`useEffect` 也不是所有逻辑都应该放进去。能直接从已有 state 或 props 计算出来的值，不需要再用 `useEffect` 同步一份 state。

比如总价：

```tsx
const totalPrice = quantity * pricePerItem
```

不需要写成：

```tsx
const [totalPrice, setTotalPrice] = useState(0)

useEffect(() => {
  setTotalPrice(quantity * pricePerItem)
}, [quantity])
```

后者反而多了一层不必要的状态同步。

---

## 3. 最简单的使用方式

先看 `useState` 最简单的用法：

```tsx
"use client"

import { useState } from "react"

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

这段代码里关键的是：

```tsx
const [count, setCount] = useState(0)
```

它让组件拥有一个 `count` 状态。

点击按钮时：

```tsx
setCount(count + 1)
```

React 会安排一次状态更新，然后重新渲染组件，页面上显示新的 `count`。

再看一个最简单的 `useEffect`：

```tsx
"use client"

import { useEffect, useState } from "react"

export function WindowTitleCounter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    document.title = `Count: ${count}`
  }, [count])

  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

这里的 effect 表示：

```txt
每当 count 变化后，把 document.title 同步成最新的 count
```

这个例子能帮助理解 `useEffect` 的本质：它不是负责渲染 UI，而是负责把 React 状态同步到 React 外部的系统，比如浏览器标题、事件监听、接口请求、定时器等。

---

## 4. 核心流程是怎么跑起来的

以 `useState` 为例，流程是这样的：

1. 组件第一次渲染。
2. React 读取 `useState(0)` 的初始值。
3. 页面显示 `count = 0`。
4. 用户点击按钮。
5. 调用 `setCount(count + 1)`。
6. React 安排一次状态更新。
7. 组件重新渲染。
8. 新的 `count` 出现在页面上。

这里要注意：`setCount` 是安排更新，不是立即修改当前变量。

所以这种代码容易误解：

```tsx
setCount(count + 1)
setCount(count + 1)
setCount(count + 1)
```

如果当前 `count` 是 0，这三行看到的都是同一个 `count = 0`，所以它们都会设置成 1，而不是 3。

正确写法是使用 updater function：

```tsx
setCount(prev => prev + 1)
setCount(prev => prev + 1)
setCount(prev => prev + 1)
```

这时每一次更新都会基于上一次最新结果。

`useEffect` 的流程则是：

1. 组件渲染。
2. React 把 UI 提交到页面。
3. 渲染完成后执行 effect。
4. 如果依赖变化，下次渲染后重新执行 effect。
5. 如果 effect 返回 cleanup 函数，会在下一次 effect 执行前或组件卸载时清理。

比如监听窗口大小：

```tsx
useEffect(() => {
  function handleResize() {
    console.log(window.innerWidth)
  }

  window.addEventListener("resize", handleResize)

  return () => {
    window.removeEventListener("resize", handleResize)
  }
}, [])
```

这里的 cleanup 很重要。否则组件卸载后，事件监听还留在 `window` 上，可能造成内存泄漏或重复执行。

---

## 5. 常用 API 和核心能力介绍

### 5.1 useState：保存组件状态

最常见的状态是数字、字符串、布尔值：

```tsx
const [count, setCount] = useState(0)
const [name, setName] = useState("")
const [open, setOpen] = useState(false)
```

当新值依赖旧值时，推荐使用 updater function：

```tsx
setCount(prev => prev + 1)
```

比如连续加多次、定时器更新、异步回调里更新 state，都更适合这种写法。

### 5.2 对象状态：更新时要复制旧对象

对象状态不能直接修改：

```tsx
user.name = "Tom" // 不推荐
```

也不能只传一个局部对象：

```tsx
setUser({
  name: "Tom",
})
```

这样会丢掉其他字段。

正确写法：

```tsx
setUser({
  ...user,
  name: "Tom",
})
```

如果使用 updater function：

```tsx
setUser(prev => ({
  ...prev,
  name: "Tom",
}))
```

对象 state 更新的关键是：创建新对象，并保留旧字段。

### 5.3 表单状态：多个字段可以放在一个对象里

如果一个表单有很多字段，不一定要写很多个 `useState`：

```tsx
const [form, setForm] = useState({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
})
```

可以用一个通用的 `handleChange`：

```tsx
function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
  const { name, value } = event.target

  setForm(prev => ({
    ...prev,
    [name]: value,
  }))
}
```

使用方式：

```tsx
<input name="firstName" value={form.firstName} onChange={handleChange} />
<input name="lastName" value={form.lastName} onChange={handleChange} />
<input name="email" value={form.email} onChange={handleChange} />
```

这里的关键是：

```tsx
[name]: value
```

它会根据 input 的 `name` 动态更新对应字段。

### 5.4 useEffect：同步外部副作用

一个典型的 effect：

```tsx
useEffect(() => {
  console.log("id changed:", id)
}, [id])
```

表示：当 `id` 变化后执行。

如果 effect 里创建了外部资源，比如定时器、事件监听、请求取消控制器，就要考虑 cleanup。

```tsx
useEffect(() => {
  const timer = setInterval(() => {
    console.log("running")
  }, 1000)

  return () => {
    clearInterval(timer)
  }
}, [])
```

不要忽略 cleanup。很多隐藏 bug 都来自这里。

### 5.5 自定义 Hook：复用状态逻辑

如果多个组件都需要监听窗口宽度，不要复制同一段 `useEffect`。

可以封装成 custom hook：

```tsx
"use client"

import { useEffect, useState } from "react"

export function useWindowSize() {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth)
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return width
}
```

组件里使用：

```tsx
export function Header() {
  const width = useWindowSize()

  return <div>Window width: {width}</div>
}
```

自定义 Hook 本质上就是一个普通函数，但它内部可以使用 React Hook，所以命名必须以 `use` 开头。

---

## 6. 在真实业务里一般怎么组合使用

在真实项目里，`useState` 和 `useEffect` 很少单独出现，通常会和这些能力组合：

- 表单输入。
- 弹窗打开关闭。
- 组件局部 loading。
- URL 参数。
- React Query / SWR。
- Next.js client component。
- 自定义 Hook。
- 浏览器 API。
- cleanup 生命周期。

比如一个真实的搜索框可能会这样：

```tsx
"use client"

import { useEffect, useState } from "react"

export function SearchBox() {
  const [keyword, setKeyword] = useState("")
  const [debouncedKeyword, setDebouncedKeyword] = useState("")

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword)
    }, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [keyword])

  return (
    <div>
      <input
        value={keyword}
        onChange={event => setKeyword(event.target.value)}
        placeholder="Search..."
      />
      <p>Searching for: {debouncedKeyword}</p>
    </div>
  )
}
```

这里：

- `keyword` 是用户正在输入的值。
- `debouncedKeyword` 是防抖后的值。
- `useEffect` 用来处理定时器。
- cleanup 用来清除上一次定时器。

这就是一个很典型的真实组合场景。

不过如果是接口请求，真实项目里通常不建议长期手写 `useEffect + fetch`。更常见的做法是使用 React Query 或 SWR 处理缓存、loading、error、取消请求、竞态等问题。

---

## 7. 常见误区和使用边界

### 误区一：以为 setState 会立即改变当前变量

错误理解：

```tsx
setCount(count + 1)
console.log(count) // 以为这里是新值
```

更合理的理解是：`setCount` 会安排下一次渲染，当前这次渲染里的 `count` 不会变。

如果新状态依赖旧状态，使用：

```tsx
setCount(prev => prev + 1)
```

### 误区二：连续 setState 以为会自动累加

```tsx
setCount(count + 1)
setCount(count + 1)
setCount(count + 1)
```

这通常只会加 1。

正确写法：

```tsx
setCount(prev => prev + 1)
setCount(prev => prev + 1)
setCount(prev => prev + 1)
```

### 误区三：在条件语句后面调用 Hook

错误写法：

```tsx
function ProductCard({ id }: { id?: string }) {
  if (!id) {
    return <div>No ID</div>
  }

  const [count, setCount] = useState(0)

  return <div>{count}</div>
}
```

Hook 必须在每次渲染时保持相同调用顺序。条件 return 可能导致某次渲染调用 Hook，某次渲染不调用 Hook。

正确做法是先调用 Hook，再条件渲染：

```tsx
function ProductCard({ id }: { id?: string }) {
  const [count, setCount] = useState(0)

  if (!id) {
    return <div>No ID</div>
  }

  return <div>{count}</div>
}
```

### 误区四：能计算出来的值也放进 state

比如：

```tsx
const [quantity, setQuantity] = useState(1)
const [totalPrice, setTotalPrice] = useState(0)

useEffect(() => {
  setTotalPrice(quantity * 5)
}, [quantity])
```

这没有必要。

更简单：

```tsx
const [quantity, setQuantity] = useState(1)
const totalPrice = quantity * 5
```

能从 state 或 props 推导出来的值，不要再单独存一份 state。

### 误区五：对象和数组依赖导致 effect 频繁执行

JavaScript 里对象和数组是引用类型。

```ts
{} === {} // false
[] === [] // false
```

所以如果你在依赖数组里放对象：

```tsx
useEffect(() => {
  console.log("price changed")
}, [price])
```

而 `price` 每次都是一个新对象，那么 effect 会频繁执行。

更合理的是依赖稳定的原始值：

```tsx
useEffect(() => {
  console.log("price number changed")
}, [price.number])
```

### 误区六：异步数据初始值乱写

请求数据时，很多人会这样：

```tsx
const [post, setPost] = useState()
```

然后直接渲染：

```tsx
<h1>{post.title}</h1>
```

初始时 `post` 是 `undefined`，会报错。

更合理的是显式使用 `null`：

```tsx
type Post = {
  title: string
  body: string
}

const [post, setPost] = useState<Post | null>(null)
```

渲染时处理 loading：

```tsx
if (!post) {
  return <div>Loading...</div>
}

return <h1>{post.title}</h1>
```

### 误区七：在 useEffect 里设置定时器却不清理

错误写法：

```tsx
useEffect(() => {
  setInterval(() => {
    setCount(prev => prev + 1)
  }, 1000)
}, [])
```

这里没有清理 interval。

正确写法：

```tsx
useEffect(() => {
  const timer = setInterval(() => {
    setCount(prev => prev + 1)
  }, 1000)

  return () => {
    clearInterval(timer)
  }
}, [])
```

### 误区八：在 Next.js Server Component 里使用 useState / useEffect

在 Next.js App Router 中，组件默认是 Server Component。

Server Component 不能使用：

- `useState`
- `useEffect`
- `window`
- `localStorage`
- 浏览器事件

如果需要这些能力，要在文件顶部加：

```tsx
"use client"
```

比如：

```tsx
"use client"

import { useState } from "react"

export function Counter() {
  const [count, setCount] = useState(0)

  return <button onClick={() => setCount(count + 1)}>{count}</button>
}
```

这里的 `"use client"` 是客户端组件边界。

### 误区九：用 useEffect 手写复杂请求逻辑

简单 demo 里可以这样：

```tsx
useEffect(() => {
  fetch(`/api/posts/${id}`)
    .then(res => res.json())
    .then(setPost)
}, [id])
```

但真实项目会遇到：

- loading 状态。
- error 状态。
- 请求取消。
- 参数快速变化导致竞态。
- 缓存。
- 重试。
- 多组件复用同一份数据。

这时更适合用 React Query 或 SWR。

---

## 8. 一个更完整的 TypeScript 示例

下面写一个稍微完整一点的例子：根据 `postId` 请求文章，同时处理 loading、error 和请求取消。

这不是推荐你长期手写请求库，而是为了理解 `useEffect` 的生命周期和 cleanup。

```tsx
"use client"

import { useEffect, useState } from "react"

type Post = {
  id: number
  title: string
  body: string
}

type PostViewerProps = {
  postId: number
}

export function PostViewer({ postId }: PostViewerProps) {
  const [post, setPost] = useState<Post | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchPost() {
      try {
        setIsLoading(true)
        setError(null)

        const response = await fetch(
          `https://jsonplaceholder.typicode.com/posts/${postId}`,
          {
            signal: controller.signal,
          },
        )

        if (!response.ok) {
          throw new Error("Failed to fetch post")
        }

        const data = (await response.json()) as Post
        setPost(data)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setError("文章加载失败，请稍后重试")
      } finally {
        setIsLoading(false)
      }
    }

    fetchPost()

    return () => {
      controller.abort()
    }
  }, [postId])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>{error}</div>
  }

  if (!post) {
    return <div>No post</div>
  }

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  )
}
```

这段代码体现了几个真实项目里很重要的点：

第一，异步数据初始值用 `null`，类型写成：

```ts
Post | null
```

第二，请求开始时设置 loading：

```tsx
setIsLoading(true)
```

第三，请求失败时设置 error：

```tsx
setError("文章加载失败，请稍后重试")
```

第四，`postId` 变化时重新请求：

```tsx
}, [postId])
```

第五，使用 `AbortController` 取消上一次请求：

```tsx
return () => {
  controller.abort()
}
```

这样当用户快速切换 `postId` 时，旧请求不会继续回来覆盖新数据。

不过要注意：如果项目里大量地方都要请求数据，不建议每个组件都写这一套。更合理的是使用 React Query 这类库，把缓存、竞态、loading、error、重试交给专门工具处理。

---

## 9. 学习和落地建议

学习 `useState` 和 `useEffect`，建议按这个顺序来。

第一步，先理解组件重新渲染。

你要知道：组件函数不是只执行一次。每次 state 更新，组件函数都会重新执行。

第二步，理解 state 更新不是立即生效。

重点练习：

```tsx
setCount(count + 1)
setCount(prev => prev + 1)
```

搞清楚它们的区别。

第三步，掌握对象和数组状态更新。

练习：

```tsx
setUser(prev => ({
  ...prev,
  name: "Tom",
}))
```

不要直接修改对象。

第四步，理解 `useEffect` 的依赖数组。

你要能解释：

```tsx
useEffect(() => {})
useEffect(() => {}, [])
useEffect(() => {}, [id])
```

分别什么时候执行。

第五步，掌握 cleanup。

重点练：

- `setInterval + clearInterval`
- `addEventListener + removeEventListener`
- `fetch + AbortController`

第六步，学会判断什么时候不需要 `useEffect`。

比如：

- 总价。
- 全名。
- 过滤后的列表。
- 根据 props 计算出来的展示值。

这些通常可以直接计算，不需要额外 state。

第七步，再学习 React Query / SWR。

当你理解了手写 `useEffect + fetch` 的问题后，再学 React Query，会更容易明白它为什么有价值。

可以做一个小 demo：

1. Counter：练 `useState` 和 updater function。
2. UserForm：练对象 state 和 `handleChange`。
3. WindowSize：练 custom hook 和 cleanup。
4. PostViewer：练 `useEffect` 请求、loading、error、`AbortController`。
5. React Query 版本 PostViewer：对比手写请求和请求库。

这样学会比较扎实。

---

## 10. 总结

`useState` 和 `useEffect` 是 React 里最基础、也最容易被误用的两个 Hook。

`useState` 的重点不是“声明一个变量”，而是理解 React 如何通过状态触发重新渲染。状态更新不是立即改变当前变量；如果新值依赖旧值，就应该使用 updater function。

`useEffect` 的重点也不是“组件加载时执行代码”，而是把 React 状态同步到外部世界。只要涉及定时器、事件监听、请求取消，就要考虑 cleanup。只要某个值能从已有 state 或 props 计算出来，就不要为了它再写一份 state 和 effect。

在 Next.js 里还要多理解一层：默认组件是 Server Component，只有 Client Component 才能使用 `useState`、`useEffect`、`window`、`localStorage` 这些浏览器相关能力。

真正掌握这两个 Hook，不是背 API，而是理解几个底层原则：渲染、状态快照、依赖数组、闭包、引用类型、cleanup。把这些搞清楚之后，你会发现很多看似奇怪的 React bug，其实都有很明确的原因。
