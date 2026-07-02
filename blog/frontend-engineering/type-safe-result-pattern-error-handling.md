# 从普通 try-catch 到类型安全 Result Pattern：前端项目如何设计错误处理架构

判断一个开发者是否成熟，很多时候不是看他会不会写功能，而是看他如何处理错误。

初级开发者经常把错误处理写在业务逻辑旁边：

```ts id="kmfwh6"
try {
  const result = await createProject(data);
  redirect(`/projects/${result.id}`);
} catch (error) {
  return {
    message: "Unexpected error",
  };
}
```

这看起来没有问题，至少比完全不处理错误要好。
但在真实项目里，这种写法很快会暴露问题：

```text id="dhxufb"
错误处理散落在各处
业务逻辑和响应逻辑混在一起
Action、API、移动端接口无法复用
新增错误后调用方不一定知道要处理
删除错误后调用方可能留下死代码
TypeScript 无法强制你处理所有错误类型
```

一个更成熟的做法是：**把核心业务逻辑抽到 service layer，让 service 只负责业务判断和返回结果，Action / API / UI 层再根据结果决定如何响应。**

本文会从最普通的 try-catch 开始，逐步梳理如何演进到类型安全的 Result Pattern。

---

## 一、最常见的问题：错误处理和业务逻辑混在一起

假设我们有一个创建项目的功能。

用户点击创建项目后，系统需要做几件事：

```text id="mcr6o9"
检查用户是否登录
检查用户是否有权限
校验表单数据
写入数据库
成功后跳转到项目详情页
失败后展示错误信息或重定向
```

一种常见写法是直接在 Server Action 中处理所有逻辑：

```ts id="obooe4"
export async function createProjectAction(data: ProjectFormValues) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!can(user, "create", "project")) {
    redirect("/unauthorized");
  }

  const result = ProjectSchema.safeParse(data);

  if (!result.success) {
    return {
      message: "Invalid data",
    };
  }

  try {
    const project = await createProject(result.data);

    revalidatePath("/projects");
    redirect(`/projects/${project.id}`);
  } catch {
    return {
      message: "Unexpected error",
    };
  }
}
```

这段代码的问题不是它不能工作，而是它很难复用。

如果以后我们要加一个 API：

```text id="wvttco"
POST /api/projects
```

给移动端、小程序或第三方系统调用，那么同样的逻辑又要写一遍：

```ts id="tvpm47"
export async function POST(req: Request) {
  const body = await req.json();

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (!can(user, "create", "project")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const result = ProjectSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ message: "Invalid data" }, { status: 400 });
  }

  try {
    const project = await createProject(result.data);

    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
  }
}
```

你会发现，认证、鉴权、校验、数据库写入这些核心逻辑被复制了。

只是响应方式不同：

```text id="ptk8m3"
Server Action：redirect / return message / revalidatePath
API Route：NextResponse.json / status code
```

真正应该复用的是业务逻辑，不应该把业务逻辑和响应逻辑绑死在一起。

---

## 二、引入 Service Layer：让业务逻辑可复用

更合理的结构是增加一层 service：

```text id="lxn61x"
UI / Action / API
→ Service Layer
→ Database / Permission / Validation
```

Service 负责：

```text id="u9p2je"
认证判断
权限判断
数据校验
调用数据库
返回成功或失败结果
```

Action 和 API 负责：

```text id="6m03ts"
把 service 的结果转换成各自需要的响应形式
```

例如：

```ts id="xoz3mb"
export async function createProjectService(data: ProjectFormValues) {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthenticated");
  }

  if (!can(user, "create", "project")) {
    throw new Error("Unauthorized");
  }

  const result = ProjectSchema.safeParse(data);

  if (!result.success) {
    throw new Error("Invalid data");
  }

  try {
    return await createProject(result.data);
  } catch {
    throw new Error("Unexpected error");
  }
}
```

然后 Server Action 调用它：

```ts id="oypf29"
export async function createProjectAction(data: ProjectFormValues) {
  try {
    const project = await createProjectService(data);

    revalidatePath("/projects");
    redirect(`/projects/${project.id}`);
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Unexpected error",
    };
  }
}
```

API Route 也调用它：

```ts id="ecr6ws"
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const project = await createProjectService(body);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}
```

这一步已经比复制粘贴好很多。
核心业务逻辑只有一份，不同入口只负责各自的响应。

但是，这还不够类型安全。

---

## 三、用自定义 Error 区分不同错误

如果 service 只是抛普通 `Error`：

```ts id="eoqs91"
throw new Error("Unauthorized");
```

调用方只能通过字符串判断错误类型，这很脆弱。

更好的方式是定义自定义错误类：

```ts id="qu3wsg"
export class UnauthenticatedError extends Error {
  constructor(message = "Unauthenticated") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}
```

Service 中：

```ts id="sxz7jv"
if (!user) {
  throw new UnauthenticatedError();
}

if (!can(user, "create", "project")) {
  throw new AuthorizationError();
}
```

Action 中：

```ts id="lxcg4a"
try {
  const project = await createProjectService(data);

  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
} catch (error) {
  if (error instanceof UnauthenticatedError) {
    redirect("/login");
  }

  if (error instanceof AuthorizationError) {
    redirect("/unauthorized");
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: "Unexpected error",
  };
}
```

API 中：

```ts id="3mq4tq"
try {
  const project = await createProjectService(body);

  return NextResponse.json(project, { status: 201 });
} catch (error) {
  if (error instanceof UnauthenticatedError) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
  }

  if (error instanceof AuthorizationError) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({ message: "Unexpected error" }, { status: 500 });
}
```

这种方式的好处是错误类型更明确。
Action 可以用 redirect，API 可以用 HTTP status code，同一个 service 可以复用。

但是它仍然有一个大问题：

```text id="8crhff"
TypeScript 不知道这个函数到底会 throw 哪些错误。
```

如果 service 新增一个错误：

```ts id="2sh9ln"
throw new RandomError();
```

调用方不会自动报错。
你可能忘记在 Action 和 API 里处理它。

如果 service 删除一个错误，调用方也不会提示你删除对应的死代码。

所以自定义 Error 比字符串好，但仍然不够安全。

---

## 四、throw 的问题：TypeScript 无法追踪错误类型

在 TypeScript 中，函数签名通常只能表达返回值：

```ts id="tziadr"
async function createProjectService(data: ProjectFormValues): Promise<Project>;
```

它没有告诉你：

```text id="by9o0a"
这个函数可能抛出 UnauthenticatedError
也可能抛出 AuthorizationError
也可能抛出 ValidationError
也可能抛出 UnexpectedError
```

也就是说，`throw` 不参与 TypeScript 的类型系统约束。

这就导致：

```text id="mk5crb"
新增错误时，调用方不会强制处理
删除错误时，调用方不会发现死代码
调用方只能靠经验和文档知道要 catch 什么
```

如果想让错误处理真正类型安全，就需要把错误也变成返回值的一部分。

这就是 Result Pattern。

---

## 五、Result Pattern：把错误当作返回值

Result Pattern 的核心思想是：

```text id="khulxq"
函数不 throw。
函数返回一个结果。
结果要么成功，要么失败。
```

例如：

```ts id="u8bwbg"
type Result<Success, Error> =
  | [error: Error, data: null]
  | [error: null, data: Success];
```

成功时：

```ts id="0616qq"
[null, project];
```

失败时：

```ts id="8akfbv"
[{ reason: "unauthorized" }, null];
```

我们可以写两个辅助函数：

```ts id="7ptpsf"
type AppError<R extends string = string> = {
  reason: R;
};

type Result<S, E extends AppError> =
  | [error: E, data: null]
  | [error: null, data: S];

function ok<S>(data: S): Result<S, never> {
  return [null, data];
}

function err<const E extends AppError>(error: E): Result<never, E> {
  return [error, null];
}
```

这样 service 就可以写成：

```ts id="d36w6y"
export async function createProjectService(data: ProjectFormValues) {
  const user = await getCurrentUser();

  if (!user) {
    return err({
      reason: "unauthenticated",
    });
  }

  if (!can(user, "create", "project")) {
    return err({
      reason: "unauthorized",
    });
  }

  const parsed = ProjectSchema.safeParse(data);

  if (!parsed.success) {
    return err({
      reason: "invalid_data",
      details: parsed.error,
    });
  }

  try {
    const project = await createProject(parsed.data);

    return ok(project);
  } catch {
    return err({
      reason: "unexpected",
    });
  }
}
```

现在这个函数不会抛出业务错误。
它永远返回一个明确的结果。

---

## 六、调用方如何消费 Result

调用 service 时：

```ts id="90x27c"
const [error, project] = await createProjectService(data);
```

如果 `error === null`，说明成功：

```ts id="mn53vb"
if (error === null) {
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}
```

否则就根据 `error.reason` 处理不同错误：

```ts id="bmzj3u"
switch (error.reason) {
  case "invalid_data": {
    return {
      message: "Invalid data",
      details: error.details,
    };
  }

  case "unauthenticated": {
    redirect("/login");
  }

  case "unauthorized": {
    redirect("/unauthorized");
  }

  case "unexpected": {
    return {
      message: "Unexpected error",
    };
  }

  default: {
    error.reason satisfies never;
    throw new Error(`Unhandled error: ${error.reason}`);
  }
}
```

这里最重要的是：

```ts id="p71bmk"
error.reason satisfies never;
```

这会让 TypeScript 检查你是否处理了所有可能的错误类型。

如果 service 新增一个错误：

```ts id="bf1779"
return err({
  reason: "rate_limited",
});
```

调用方的 switch 就会立刻报错，提醒你还没有处理 `rate_limited`。

这就是类型安全错误处理的关键。

---

## 七、为什么 Result Pattern 更适合复杂项目

Result Pattern 相比 try-catch 有几个明显优势。

### 1. 错误类型可见

函数返回类型中能看到所有可能错误。

调用方不用猜这个函数会 throw 什么。

### 2. 调用方被迫处理错误

因为返回值里第一个就是 error，调用方不能假装没看见。

```ts id="or34gr"
const [error, project] = await createProjectService(data);
```

你必须决定如何处理 error。

### 3. 新增错误时有类型提示

如果 service 新增了错误原因，调用方没有处理，TypeScript 会报错。

这能避免线上出现“新错误没人处理”的情况。

### 4. 删除错误时能清理死代码

如果 service 不再返回某种错误，调用方对应 case 会变成无效代码。

### 5. 同一个 service 可以适配多个入口

Server Action 可以：

```text id="zpbl2o"
unauthenticated → redirect('/login')
unauthorized → redirect('/unauthorized')
invalid_data → return message
unexpected → toast
```

API Route 可以：

```text id="4dadcx"
unauthenticated → 401
unauthorized → 403
invalid_data → 400
unexpected → 500
```

Service 不关心怎么响应，只关心业务结果。

---

## 八、在 API Route 中处理 Result

同一个 service 可以用于 API：

```ts id="5kp4e6"
export async function POST(req: Request) {
  const body = await req.json();

  const [error, project] = await createProjectService(body);

  if (error === null) {
    return NextResponse.json(project, { status: 201 });
  }

  switch (error.reason) {
    case "invalid_data": {
      return NextResponse.json(
        {
          message: "Invalid data",
          details: error.details,
        },
        { status: 400 },
      );
    }

    case "unauthenticated": {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    case "unauthorized": {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    case "unexpected": {
      return NextResponse.json(
        { message: "Unexpected error" },
        { status: 500 },
      );
    }

    default: {
      error.reason satisfies never;
      return NextResponse.json({ message: "Unhandled error" }, { status: 500 });
    }
  }
}
```

你会发现 API 层和 Action 层处理方式完全不同，但 service 不需要改。

这就是架构分层的价值。

---

## 九、Next.js redirect 的特殊坑

在 Next.js 中，`redirect()` 不是普通 return。

它底层是通过 throw 一个特殊错误来中断执行。

所以不要把 `redirect()` 放进会捕获它的 try-catch 里：

```ts id="n97cp0"
try {
  const project = await createProjectService(data);

  redirect(`/projects/${project.id}`);
} catch (error) {
  return {
    message: "Unexpected error",
  };
}
```

这样 `redirect()` 可能会被 catch 捕获，导致出现奇怪的 redirect error。

更安全的写法是：

```ts id="46oyou"
const [error, project] = await createProjectService(data);

if (error === null) {
  revalidatePath("/projects");
  redirect(`/projects/${project.id}`);
}
```

或者如果必须用 try-catch，也要把 redirect 放到 try-catch 外面。

Result Pattern 的一个额外好处是：
因为 service 不 throw 业务错误，所以 Action 层通常不需要大 try-catch，redirect 也不容易被误捕获。

---

## 十、Neverthrow：成熟的 Result Pattern 库

如果不想自己实现 Result，可以使用 `neverthrow`。

安装：

```bash id="w97jw1"
npm install neverthrow
```

基础用法：

```ts id="2tl0ep"
import { okAsync, errAsync } from "neverthrow";

export async function createProjectService(data: ProjectFormValues) {
  const user = await getCurrentUser();

  if (!user) {
    return errAsync({
      reason: "unauthenticated" as const,
    });
  }

  if (!can(user, "create", "project")) {
    return errAsync({
      reason: "unauthorized" as const,
    });
  }

  const parsed = ProjectSchema.safeParse(data);

  if (!parsed.success) {
    return errAsync({
      reason: "invalid_data" as const,
      details: parsed.error,
    });
  }

  try {
    const project = await createProject(parsed.data);

    return okAsync(project);
  } catch {
    return errAsync({
      reason: "unexpected" as const,
    });
  }
}
```

调用时可以用 `match`：

```ts id="jsumgx"
const result = await createProjectService(data);

return result.match(
  (project) => {
    revalidatePath("/projects");
    redirect(`/projects/${project.id}`);
  },
  (error) => {
    switch (error.reason) {
      case "invalid_data":
        return {
          message: "Invalid data",
          details: error.details,
        };

      case "unauthenticated":
        redirect("/login");

      case "unauthorized":
        redirect("/unauthorized");

      case "unexpected":
        return {
          message: "Unexpected error",
        };

      default:
        error.reason satisfies never;
        throw new Error(`Unhandled error: ${error.reason}`);
    }
  },
);
```

`neverthrow` 还支持链式处理，比如 `andThen`：

```ts id="lhclqg"
return createProjectService(data).andThen((project) => {
  if (Math.random() > 0.5) {
    return errAsync({
      reason: "random" as const,
    });
  }

  return okAsync(project);
});
```

它会把不同阶段可能出现的错误类型合并起来，让最终调用方统一处理。

---

## 十一、为什么要加 `as const`

如果你写：

```ts id="g7xg86"
return errAsync({
  reason: "unauthorized",
});
```

TypeScript 可能把 `reason` 推断成：

```ts id="3mxa2b"
string;
```

而不是具体的：

```ts id="c1az48"
"unauthorized";
```

这样 switch 就无法获得精确类型。

所以推荐写：

```ts id="fh52f9"
return errAsync({
  reason: "unauthorized" as const,
});
```

或者用泛型工具函数封装掉。

`as const` 的作用是让 TypeScript 知道：

```text id="2t0qxo"
这个 reason 就是固定字符串，不是任意 string。
```

这对 discriminated union 非常关键。

---

## 十二、配合 ESLint 强制处理 Result

使用 Result Pattern 最大的问题是：
调用方可能拿到 result 后不处理。

例如：

```ts id="gmbvw6"
createProjectService(data);
```

为了避免这种情况，`neverthrow` 提供了 ESLint 插件，可以强制你处理结果，比如必须调用：

```text id="8uqy0o"
match
unwrapOr
map
mapErr
andThen
```

这样可以避免“返回了错误，但调用方忘记处理”的问题。

思路是：

```text id="hvwd9a"
TypeScript 负责错误类型完整性
ESLint 负责强制你消费 Result
```

这两者结合，错误处理会更稳。

---

## 十三、什么时候用 throw，什么时候用 Result

Result Pattern 很强，但不是说所有地方都禁止 throw。

可以这样区分：

### 适合用 Result 的场景

```text id="m2bq05"
业务预期内错误
用户未登录
权限不足
表单校验失败
资源不存在
余额不足
重复提交
状态不允许变更
第三方服务返回可预期失败
```

这些错误是业务流程的一部分，调用方通常需要根据不同错误展示不同响应。

### 适合用 throw 的场景

```text id="731gqx"
程序员错误
不可能发生的状态
基础设施崩溃
数据库连接异常
配置缺失
严重系统错误
```

不过即使是 throw，最好也在 service 边界捕获后转成：

```ts id="1kerkv"
{
  reason: "unexpected";
}
```

这样调用方能统一处理。

---

## 十四、推荐的项目分层方式

一个比较清晰的结构是：

```text id="hh9x21"
app/
  actions/
    project.action.ts
  api/
    projects/
      route.ts
services/
  project.service.ts
db/
  project.db.ts
permissions/
  project.permission.ts
schemas/
  project.schema.ts
errors/
  result.ts
```

每一层职责如下：

```text id="i0aewb"
Action 层：处理表单、redirect、revalidatePath、返回 UI message
API 层：处理 Request、Response、HTTP status code
Service 层：处理业务流程、权限、校验、调用数据库
DB 层：只做数据库读写
Schema 层：校验输入结构
Permission 层：判断用户是否有权限
Result/Error 层：定义统一错误结果
```

核心原则是：

```text id="52hnpc"
Service 不 redirect。
Service 不返回 NextResponse。
Service 不关心 UI。
Service 只返回成功结果或业务错误。
```

这样 service 才能被 Action、API、后台任务、测试代码复用。

---

## 十五、面试中怎么讲这个错误处理架构

如果面试官问：你在项目中怎么处理错误？

可以这样回答：

```text id="w520kb"
我不会把所有错误处理都散落在 action 或 API 里，而是会把核心业务逻辑放到 service layer。

比如创建项目这个功能，service 负责检查用户是否登录、是否有权限、表单数据是否合法，以及最终写入数据库。Action 和 API 只负责把 service 的结果转换成对应响应。Action 里可能是 redirect、revalidatePath、return message；API 里则是返回 JSON 和 HTTP status code。

早期可以用自定义 Error，比如 UnauthenticatedError、AuthorizationError，然后在调用层用 instanceof 区分。但这种方式的问题是 TypeScript 无法知道 service 到底会 throw 哪些错误，新增或删除错误时调用方不会被强制更新。

更类型安全的做法是 Result Pattern。service 不直接 throw 业务错误，而是返回一个结果：成功时返回 project，失败时返回带 reason 的 error，比如 unauthenticated、unauthorized、invalid_data、unexpected。调用方通过 switch error.reason 处理，并用 satisfies never 确保所有错误分支都被覆盖。

这样如果 service 新增一个错误类型，Action 和 API 层会立刻有 TypeScript 报错，提醒我处理这个错误。这样错误处理就从运行时约定变成了编译期约束。
```

---

## 十六、总结

成熟的错误处理不是简单写几个 try-catch。

更好的演进路径是：

```text id="og9wmr"
第一阶段：直接 try-catch，先避免应用崩溃
第二阶段：抽 service layer，复用核心业务逻辑
第三阶段：自定义 Error，让不同错误可区分
第四阶段：Result Pattern，把错误纳入返回类型
第五阶段：satisfies never / neverthrow / ESLint，保证错误处理完整性
```

最终目标是：

```text id="fdstey"
业务逻辑只写一遍
不同入口可以用不同方式响应
错误类型清晰
新增错误时调用方必须处理
删除错误时能发现死代码
异常不会意外打崩应用
TypeScript 能参与错误处理约束
```

一句话总结：

```text id="lg0sg2"
高级错误处理的核心不是到处 catch，而是把错误设计成架构的一部分，让业务层、响应层和类型系统各司其职。
```
