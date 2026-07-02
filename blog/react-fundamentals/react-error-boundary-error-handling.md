# React 应用中的错误处理：预期错误、非预期错误与 Error Boundary

在 React 项目中，错误是不可避免的。

表单可能提交失败，接口可能请求失败，组件渲染时可能访问到 `undefined`，第三方库也可能在某些边界场景下直接报错。一个成熟的 React 应用，不是保证永远不出错，而是要保证：

```text
错误发生时，应用不会整体崩掉。
用户能知道发生了什么。
开发者能追踪错误来源。
可恢复的错误可以让用户重新尝试。
```text

React 中的错误大致可以分成两类：

```text
预期错误：业务流程中可以预见的错误
非预期错误：代码运行中不应该发生的异常
```

这两类错误的处理方式完全不同。

---

## 一、什么是预期错误

预期错误指的是业务流程中可以合理预见的错误。

例如：

```text
用户提交了错误格式的邮箱
密码长度不够
表单字段为空
用户未登录
用户没有权限
接口返回校验失败
```text

这些错误虽然也是“错误”，但它们不是程序崩溃，而是正常业务流程的一部分。

例如，一个邮箱表单：

```tsx
async function submitFormAction(formData: FormData) {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.includes("@")) {
    return {
      status: "error",
      message: "请输入有效的邮箱地址",
    };
  }

  return {
    status: "success",
    message: "提交成功",
  };
}
```

这里邮箱不合法时，不应该 `throw new Error()`。

因为这不是程序异常，而是用户输入不符合要求。
更好的方式是直接返回一个业务结果：

```ts
return {
  status: "error",
  message: "请输入有效的邮箱地址",
};
```text

然后 UI 层根据这个返回值展示错误提示。

---

## 二、预期错误不要轻易 throw

很多人习惯把所有错误都写成：

```tsx
try {
  await submitForm(data);
} catch (error) {
  setError("提交失败");
}
```

但对于预期错误来说，这种方式不够清晰。

比如表单校验失败，本来就是我们知道可能发生的事情。
它不需要进入异常流程，只需要作为正常结果返回。

更推荐的模型是：

```text
预期错误 = 返回值
非预期错误 = throw / Error Boundary
```tsx

例如：

```tsx
type SubmitResult =
  | {
      status: "success";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

async function submitFormAction(formData: FormData): Promise<SubmitResult> {
  const email = formData.get("email");

  if (typeof email !== "string" || !email.includes("@")) {
    return {
      status: "error",
      message: "邮箱格式不正确",
    };
  }

  return {
    status: "success",
    message: "提交成功",
  };
}
```

这样代码会更容易理解：

```text
函数正常执行完成。
只是业务结果是失败。
UI 根据 status 展示对应信息。
```text

这比把业务校验失败当成异常更自然。

---

## 三、什么是非预期错误

非预期错误指的是程序运行中不应该发生的异常。

例如：

```text
组件渲染时访问 undefined.xxx
接口请求因为网络问题失败
第三方库内部抛错
JSON 解析失败
代码逻辑出现不可能状态
某个组件 render 阶段崩溃
```

比如：

```tsx
function UserProfile({ user }: { user?: { name: string } }) {
  return <div>{user.name}</div>;
}
```text

如果 `user` 是 `undefined`，组件会直接报错。

这种错误不是业务流程的一部分。
它代表代码在某个地方进入了异常状态。

如果不处理，React 应用可能会整个崩掉，用户看到白屏或者完整错误页面。

这时就需要 Error Boundary。

---

## 四、为什么不能让一个组件错误拖垮整个应用

假设页面里有三个区域：

```text
邮箱表单
数据展示卡片
统计图表
```

如果统计图表组件内部报错，理想情况应该是：

```text
统计图表区域显示“出错了，请重试”
邮箱表单仍然可以使用
页面其他部分仍然正常
```tsx

而不是整个页面白屏。

如果一个小组件的错误导致整个应用无法使用，用户体验会非常差。

尤其是用户正在填写表单时，如果某个不相关组件崩了，导致整页白屏，用户可能会丢失全部输入内容。

所以非预期错误要被“隔离”在局部区域内。

这就是 Error Boundary 的价值。

---

## 五、什么是 Error Boundary

Error Boundary 是 React 提供的一种错误隔离机制。

它可以包住组件树的一部分：

```tsx
<ErrorBoundary fallback={<div>Something went wrong</div>}>
  <ProblemComponent />
</ErrorBoundary>
```

如果 `ProblemComponent` 或它的子组件在渲染过程中报错，错误会被最近的 Error Boundary 捕获。

Error Boundary 会渲染 fallback UI，而不是让整个应用崩溃。

可以理解成：

```text
Error Boundary 是组件树中的错误隔离层。
哪里可能出错，就可以在哪里包一层。
```tsx

例如：

```tsx
<main>
  <EmailForm />

  <ErrorBoundary fallback={<ChartError />}>
    <DashboardChart />
  </ErrorBoundary>

  <UserList />
</main>
```

如果 `DashboardChart` 出错，只会影响图表区域。
`EmailForm` 和 `UserList` 仍然可以正常使用。

---

## 六、为什么 Error Boundary 还是 class component

React 官方文档中的 Error Boundary 通常是 class component：

```tsx
class ErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError() {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}
```text

这是 React 中少数 class component 仍然有用的场景。

原因是 Error Boundary 依赖：

```text
static getDerivedStateFromError
componentDidCatch
```

这些能力目前不能直接用普通函数组件和 hooks 完整替代。

所以在现代 React 项目里，class component 并没有完全消失。
Error Boundary 就是一个典型保留场景。

---

## 七、推荐使用 react-error-boundary

虽然可以自己写 Error Boundary，但实际项目中更推荐使用成熟库：

```bash
npm install react-error-boundary
```tsx

它提供了更方便的 API。

基础用法：

```tsx
import { ErrorBoundary } from "react-error-boundary";

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div>
      <p>Something went wrong:</p>
      <pre>{error.message}</pre>
      <button onClick={resetErrorBoundary}>Try again</button>
    </div>
  );
}

export function Page() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        console.error(error, info);
      }}
      onReset={() => {
        console.log("reset error state");
      }}
    >
      <ProblemComponent />
    </ErrorBoundary>
  );
}
```

相比自己写 class component，`react-error-boundary` 提供了几个很实用的能力：

```text
FallbackComponent：自定义错误 UI
onError：错误发生时执行回调
onReset：重置错误状态时执行回调
resetErrorBoundary：让用户点击按钮重新尝试
useErrorBoundary：在异步逻辑中手动触发边界错误
```tsx

这让错误处理更工程化。

---

## 八、Error Boundary 适合放在哪里

Error Boundary 不一定只放在应用最外层。

如果只在最外层放一个：

```tsx
<ErrorBoundary fallback={<FullPageError />}>
  <App />
</ErrorBoundary>
```

确实可以防止整个应用直接崩溃。
但用户看到的仍然可能是整个页面错误。

更推荐根据业务区域放多个边界：

```tsx
<Layout>
  <Header />

  <ErrorBoundary fallback={<SidebarError />}>
    <Sidebar />
  </ErrorBoundary>

  <ErrorBoundary fallback={<MainContentError />}>
    <MainContent />
  </ErrorBoundary>

  <ErrorBoundary fallback={<ChartError />}>
    <AnalyticsChart />
  </ErrorBoundary>
</Layout>
```text

这样错误可以局部隔离。

原则是：

```text
越重要、越容易出错、越独立的区域，越适合单独包 Error Boundary。
```

常见适合单独包的区域：

```text
图表组件
富文本编辑器
第三方组件
复杂表格
异步数据展示区
低代码画布
用户可配置模块
插件系统
```text

---

## 九、Error Boundary 捕获不了所有错误

Error Boundary 很强，但不是万能的。

它主要捕获：

```text
渲染阶段错误
生命周期错误
子组件树中的错误
```

但它不能自动捕获：

```text
事件处理函数中的错误
异步请求中的错误
setTimeout / Promise 中的错误
服务端错误
```tsx

例如：

```tsx
function FetchButton() {
  async function handleClick() {
    const res = await fetch("/api/data");
    const data = await res.json();

    throw new Error("fetch failed");
  }

  return <button onClick={handleClick}>Fetch</button>;
}
```

这个异步错误不会自动被 Error Boundary 捕获。

因为 Error Boundary 捕获的是 React 渲染过程中的错误，而不是所有异步任务里的错误。

---

## 十、异步错误如何交给 Error Boundary

如果使用 `react-error-boundary`，可以用 `useErrorBoundary`。

```tsx
import { useErrorBoundary } from "react-error-boundary";

function FetchExample() {
  const { showBoundary } = useErrorBoundary();

  async function fetchData() {
    try {
      const res = await fetch("/api/data");

      if (!res.ok) {
        throw new Error("Failed to fetch");
      }

      return await res.json();
    } catch (error) {
      showBoundary(error);
    }
  }

  return <button onClick={fetchData}>Trigger Fetch Error</button>;
}
```text

这里的关键是：

```tsx
showBoundary(error);
```

它会把异步错误交给最近的 Error Boundary，让 fallback UI 显示出来。

这比直接 `throw error` 更适合异步场景。

也就是说：

```text
同步渲染错误：Error Boundary 自动捕获
异步请求错误：catch 后手动 showBoundary
```text

---

## 十一、resetErrorBoundary：让用户重新尝试

一个好的错误 UI 不应该只显示：

```text
Something went wrong
```

更好的做法是给用户一个恢复入口：

```tsx
function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div>
      <p>出错了：{error.message}</p>
      <button onClick={resetErrorBoundary}>重试</button>
    </div>
  );
}
```text

当用户点击“重试”时：

```tsx
resetErrorBoundary();
```

Error Boundary 会清除错误状态，重新渲染被包裹的组件。

如果错误是由某个临时状态导致的，比如网络波动、筛选条件异常、某个缓存数据坏了，那么重试可能就能恢复。

也可以配合 `onReset` 清理状态：

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onReset={() => {
    clearSelectedId();
    refetchData();
  }}
>
  <ProblemComponent />
</ErrorBoundary>
```text

---

## 十二、onError：把错误上报到监控平台

生产环境中，不能只把错误打印到 console。

应该把非预期错误上报到错误监控平台，例如：

```text
Sentry
LogRocket
Datadog
Bugsnag
自研日志系统
```

使用 `react-error-boundary` 时可以这样做：

```tsx
<ErrorBoundary
  FallbackComponent={ErrorFallback}
  onError={(error, info) => {
    reportError(error, {
      componentStack: info.componentStack,
    });
  }}
>
  <ProblemComponent />
</ErrorBoundary>
```text

`onError` 适合做：

```text
错误日志上报
记录组件栈
记录当前用户 ID
记录当前路由
记录浏览器信息
记录业务上下文
```

这样开发者才能在线上环境知道：

```text
哪里报错了
影响了多少用户
什么操作触发了错误
是否是某个版本引入的问题
```text

---

## 十三、预期错误和非预期错误的处理边界

可以用一句话区分：

```text
预期错误给用户提示。
非预期错误用 Error Boundary 隔离，并上报监控。
```

例如表单校验：

```tsx
if (!email.includes("@")) {
  return {
    status: "error",
    message: "邮箱格式不正确",
  };
}
```tsx

这是预期错误。

例如组件渲染崩溃：

```tsx
return <div>{user.profile.name}</div>;
```

如果 `profile` 是 `undefined`，这是非预期错误。

两者处理方式不同：

| 错误类型       | 示例                                  | 推荐处理                         |
| -------------- | ------------------------------------- | -------------------------------- |
| 预期错误       | 表单校验失败、权限不足、未登录        | 返回状态和 message               |
| 非预期错误     | render 崩溃、未知异常、第三方组件报错 | Error Boundary + fallback + 上报 |
| 异步非预期错误 | fetch 失败、Promise reject            | try-catch + showBoundary         |
| 可恢复错误     | 临时网络失败、局部组件失败            | fallback 中提供重试按钮          |

---

## 十四、不要滥用 Error Boundary

Error Boundary 不是用来替代表单校验的。

错误示例：

```tsx
function SubmitForm() {
  if (!email.includes("@")) {
    throw new Error("Invalid email");
  }

  return <div>...</div>;
}
```text

邮箱格式不正确，是业务预期内的错误。
不应该让它进入 Error Boundary。

正确做法是：

```tsx
return {
  status: "error",
  message: "邮箱格式不正确",
};
```

Error Boundary 主要处理的是：

```text
不应该发生，但确实发生了的错误。
```text

如果把所有业务错误都 throw 给 Error Boundary，用户体验会变得很粗糙，代码语义也会混乱。

---

## 十五、推荐的 React 错误处理架构

一个比较清晰的错误处理模型是：

```text
表单校验错误
→ action / mutation 返回 message
→ UI 展示字段错误或 toast

接口业务错误
→ 返回业务状态码 / Result
→ UI 根据错误类型展示提示

组件渲染错误
→ Error Boundary 捕获
→ fallback UI 局部展示

异步非预期错误
→ try-catch
→ showBoundary(error)

线上错误
→ onError 上报 Sentry / 日志系统
```

对应代码结构可以是：

```tsx
<ErrorBoundary FallbackComponent={PageErrorFallback} onError={reportError}>
  <PageLayout>
    <EmailForm />

    <ErrorBoundary FallbackComponent={ChartErrorFallback} onError={reportError}>
      <ChartPanel />
    </ErrorBoundary>

    <ErrorBoundary FallbackComponent={TableErrorFallback} onError={reportError}>
      <DataTable />
    </ErrorBoundary>
  </PageLayout>
</ErrorBoundary>
```text

这样既有全局兜底，也有局部隔离。

---

## 十六、面试中怎么回答 React 错误处理

如果面试官问：React 项目里你怎么处理错误？

可以这样回答：

```text
我会先区分预期错误和非预期错误。

预期错误是业务流程中可以预见的，比如表单校验失败、用户未登录、权限不足。这类错误我一般不会 throw，而是通过返回值返回状态和 message，然后 UI 根据结果展示错误提示。

非预期错误是代码运行中不应该发生的异常，比如组件渲染时访问 undefined、第三方组件崩溃、未知异常。这类错误我会用 Error Boundary 做局部隔离，避免一个组件错误导致整个应用白屏。

在实际项目里，我通常会使用 react-error-boundary。它可以提供 FallbackComponent、onError、onReset 和 useErrorBoundary。同步渲染错误可以被 Error Boundary 捕获；异步请求错误不会自动被捕获，所以我会在 catch 中调用 showBoundary(error)，把错误交给最近的 Error Boundary。

生产环境中，我还会在 onError 中接入 Sentry 或日志系统，把错误和组件栈、路由、用户信息等上下文一起上报。这样用户看到的是友好的 fallback UI，开发者也能定位线上问题。
```

---

## 十七、总结

React 错误处理的核心不是到处写 try-catch，而是先区分错误类型。

```text
预期错误：业务流程的一部分，用返回值处理。
非预期错误：程序异常，用 Error Boundary 隔离。
异步非预期错误：try-catch 后用 showBoundary 交给 Error Boundary。
线上错误：通过 onError 上报监控系统。
```text

可以记住这句话：

```text
不要让一个局部组件错误拖垮整个应用，也不要把正常业务校验错误当成异常抛出。
```

一个成熟的 React 应用，应该做到：

```text
用户输入错了，有明确提示。
局部组件崩了，页面其他区域还能用。
异步请求失败，可以重试。
线上错误发生后，开发者能追踪。
错误边界清晰，用户体验可恢复。
```

这就是 React 中更工程化、更稳定的错误处理方式。
