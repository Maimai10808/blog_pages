# Type Alias 还是 Interface：TypeScript 类型设计里的工程取舍

很多人刚开始写 TypeScript 时，都会遇到一个问题：对象类型到底应该用 `type`，还是用 `interface`？

比如一个组件 props：

```ts
type UserProps = {
  name: string;
  age: number;
};
```

也可以写成：

```ts
interface UserProps {
  name: string;
  age: number;
}
```

这两种写法看起来几乎一样。很多团队也会说：“对象用 interface，其他用 type。”这听起来像一个简单规则，但在真实项目里，事情没有那么简单。

当项目越来越大，你会发现类型不仅仅是“让代码不报错”的工具，它还会影响代码可读性、团队一致性、类型复用方式、错误定位方式，甚至影响后续重构的成本。

这篇文章不做官方文档式的罗列，而是从工程实践角度聊一个更实用的问题：在大多数业务项目里，为什么更推荐优先使用 `type`，以及什么时候 `interface` 仍然有存在价值。

---

## 1. 这个问题真正要解决的不是语法，而是类型设计的一致性

初学者通常会把 `type` 和 `interface` 看成两种“写对象类型”的方式。

比如：

```ts
type User = {
  name: string;
  age: number;
};
```

和：

```ts
interface User {
  name: string;
  age: number;
}
```

它们确实都能描述对象结构。

但真实项目里，我们要描述的类型远不止普通对象。你可能会遇到：

- 字符串字面量联合类型。
- 枚举式状态。
- 函数参数类型。
- 元组。
- 工具类型组合。
- 从已有对象中提取类型。
- React 组件 props。
- API 返回值。
- 表单字段。
- 配置对象。
- 第三方库类型扩展。

这时候，如果团队同时混用 `type` 和 `interface`，就很容易出现一个问题：同样是定义类型，有些地方用 `type`，有些地方用 `interface`，规则不清楚，维护者需要额外判断。

这不是语法问题，而是工程一致性问题。

成熟的代码库通常会倾向于减少不必要的选择。因为每多一种选择，团队就要多一条约定；每多一条约定，新人就要多理解一个判断标准。

所以这篇文章的核心立场是：

> 在普通业务项目里，优先使用 `type`，只有在确实需要 `interface` 特性的地方再使用 `interface`。

---

## 2. 核心原则：能用一种方式稳定表达，就不要制造两套规则

先把判断标准说清楚。

`interface` 的优势主要在两个地方：

第一，它专门用于描述对象结构。

第二，它支持声明合并，也就是同名 `interface` 可以自动合并。

但这两个优势，在很多业务项目里并不总是优势。

相反，`type` 的表达能力更统一。它可以描述对象，也可以描述联合类型、基本类型、元组、函数类型、工具类型结果、条件类型等。

比如：

```ts
type Status = "idle" | "loading" | "success" | "error";
type Address = string | string[];
type Point = [number, number];
type UserProps = {
  name: string;
  age: number;
};
```

这些类型都可以用 `type` 很自然地表达。

而 `interface` 基本只能直接描述对象结构。它在对象之外的类型表达上就不够自然。

所以更实际的工程原则是：

- 如果团队想减少类型写法的分歧，优先用 `type`。
- 如果类型可能是联合、元组、工具类型结果，直接用 `type`。
- 如果只是 React props、普通对象结构，也可以统一用 `type`。
- 如果你明确需要声明合并或扩展第三方类型，再考虑 `interface`。
- 如果你在写公共库，需要暴露可被用户扩展的类型，`interface` 可能更合适。

这不是说 `interface` 不能用，而是说：在多数应用代码里，`type` 的一致性和表达能力更适合长期维护。

---

## 3. 从一个最小反例开始：同一类类型混用两套写法

假设项目里有这样的类型：

```ts
interface UserProps {
  name: string;
  age: number;
}

type AdminProps = UserProps & {
  role: "admin" | "owner";
};

type Status = "active" | "disabled";

interface GuestProps extends Omit<UserProps, "name" | "age"> {}
```

这段代码能跑，但读起来有点割裂。

有的对象类型用 `interface`，有的对象类型用 `type`；扩展对象时有的用 `extends`，有的用 `&`；工具类型结果还要写成：

```ts
interface GuestProps extends Omit<UserProps, "name" | "age"> {}
```

这种写法不是错，但从工程角度看，它会让类型系统变得不够统一。

尤其在多人协作中，大家可能会反复争论：

- props 用 `type` 还是 `interface`？
- 继承对象用 `extends` 还是交叉类型？
- utility type 结果应该怎么命名？
- `interface` 的声明合并是不是会影响当前类型？

这些问题本身不会让程序崩溃，但会增加维护成本。

---

## 4. 更合理的写法：用 type 统一表达绝大多数业务类型

上面的例子可以改成这样：

```ts
type UserProps = {
  name: string;
  age: number;
  createdAt: Date;
};

type AdminProps = UserProps & {
  role: "admin" | "owner";
};

type GuestProps = Omit<UserProps, "name" | "age">;
type Status = "active" | "disabled";
```

这时类型写法会更统一。

对象是 `type`：

```ts
type UserProps = {
  name: string;
  age: number;
};
```

扩展对象是 `&`：

```ts
type AdminProps = UserProps & {
  role: string;
};
```

基于已有类型做裁剪是工具类型：

```ts
type GuestProps = Omit<UserProps, "name" | "age">;
```

联合状态也是 `type`：

```ts
type Status = "idle" | "loading" | "success" | "error";
```

这种风格的收益不是少写几个字符，而是降低团队心智负担。

大家只需要记住：业务类型优先用 `type`。只有遇到 `interface` 特有场景，再单独使用 `interface`。

---

## 5. 核心实践拆解

### 5.1 实践一：React props 优先用 type，保持组件类型风格一致

React 项目里最常见的类型就是组件 props。

不太好的写法：

```tsx
interface UserCardProps {
  name: string;
  age: number;
}

function UserCard({ name, age }: UserCardProps) {
  return (
    <div>
      {name} - {age}
    </div>
  );
}
```

这当然没错。

但如果项目里同时存在：

```ts
type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
  variant: ButtonVariant;
  children: React.ReactNode;
};

interface UserCardProps {
  name: string;
  age: number;
}
```

就会出现风格不统一。

更一致的写法是：

```tsx
type UserCardProps = {
  name: string;
  age: number;
};

function UserCard({ name, age }: UserCardProps) {
  return (
    <div>
      {name} - {age}
    </div>
  );
}
```

这里的关键不是 `type` 比 `interface` 更能描述 props，而是 React 项目中除了 props 之外，还会大量使用联合类型、工具类型、泛型类型。

既然这些场景都离不开 `type`，那么 props 也统一用 `type`，会让整个代码库更一致。

真实项目里，组件 props 很少需要 `interface` 的声明合并能力。它通常只是一个封闭的输入结构，不希望被其他地方悄悄扩展。

### 5.2 实践二：联合类型必须用 type，适合表达状态和业务枚举

很多业务状态不是对象，而是一组有限值。

比如请求状态：

```ts
type RequestStatus = "idle" | "loading" | "success" | "error";
```

按钮类型：

```ts
type ButtonVariant = "primary" | "secondary" | "danger";
```

用户角色：

```ts
type UserRole = "guest" | "user" | "admin";
```

这些都不能用 `interface` 自然表达。

不太好的做法是为了使用 `interface`，把它们强行包成对象：

```ts
interface RequestState {
  status: "idle" | "loading" | "success" | "error";
}
```

如果你确实需要一个对象状态，这样没问题。但如果你只是想表达状态值本身，直接用 `type` 更准确：

```ts
type RequestStatus = "idle" | "loading" | "success" | "error";
```

在 React 里尤其常见：

```ts
const [status, setStatus] = useState<RequestStatus>("idle");
```

这比多个 boolean 更可靠：

```ts
const [isLoading, setIsLoading] = useState(false);
const [isError, setIsError] = useState(false);
const [isSuccess, setIsSuccess] = useState(false);
```

联合类型可以让状态互斥。当前状态只能是 `"loading"` 或 `"error"` 之一，不会出现 `isLoading` 和 `isError` 同时为 `true` 的混乱情况。

这里 `type` 解决的是状态可靠性问题，而不只是类型语法问题。

### 5.3 实践三：工具类型组合时，type 更自然

TypeScript 提供了很多工具类型，比如：

- `Pick`
- `Omit`
- `Partial`
- `Required`
- `Readonly`
- `Record`
- `ReturnType`
- `Parameters`

这些工具类型在真实项目里非常常见。

比如有一个用户类型：

```ts
type User = {
  id: string;
  name: string;
  age: number;
  createdAt: Date;
};
```

注册表单只需要 `name` 和 `age`：

```ts
type RegisterFormValues = Pick<User, "name" | "age">;
```

用户列表不需要 `createdAt`：

```ts
type UserListItem = Omit<User, "createdAt">;
```

更新接口只允许传部分字段：

```ts
type UpdateUserPayload = Partial<Pick<User, "name" | "age">>;
```

如果用 `interface`，也能写，但会变得不够自然：

```ts
interface RegisterFormValues extends Pick<User, "name" | "age"> {}
```

这种写法多了 `extends` 和空 `{}`，可读性反而下降。

更重要的是，工具类型本质上是“类型表达式”。既然是表达式，用 `type X = ...` 的形式更符合直觉。

```ts
type RegisterFormValues = Pick<User, "name" | "age">;
```

这就像 JavaScript 里的变量赋值：

```ts
const value = getValue();
```

`type` 的等号语法在这种场景下更容易理解：把右边的类型表达式命名为左边的类型别名。

### 5.4 实践四：元组和函数类型用 type 更清晰

有些类型不是对象，比如元组：

```ts
type Point = [number, number];
const position: Point = [120, 80];
```

或者某个固定结构：

```ts
type AddressEntry = [order: number, address: string];
const firstAddress: AddressEntry = [1, "123 Main Street"];
```

用 `interface` 技术上也可以描述类似结构，但写法会很别扭：

```ts
interface AddressEntry extends Array<number | string> {
  0: number;
  1: string;
}
```

这就没有必要了。

函数类型也是类似：

```ts
type SubmitHandler = (value: string) => void;
```

用在 props 里：

```ts
type SearchFormProps = {
  onSubmit: SubmitHandler;
};
```

这种写法简单、直接、可读性高。

真实项目里，类型不只是对象结构。只要你需要表达“某种值的形态”，`type` 往往更通用。

### 5.5 实践五：从已有对象中提取类型时，type 更顺手

有时候我们希望从已有变量中提取类型。

比如有一个配置对象：

```ts
const project = {
  title: "Project One",
  specification: {
    areaSize: 100,
    rooms: 3,
  },
};
```

现在想得到 `specification` 的类型：

```ts
type Specification = typeof project["specification"];
```

这样 `Specification` 会被推导为：

```ts
type Specification = {
  areaSize: number;
  rooms: number;
};
```

如果你希望推导得更精确，可以使用 `as const`：

```ts
const project = {
  title: "Project One",
  specification: {
    areaSize: 100,
    rooms: 3,
  },
} as const;
```

这时 TypeScript 会把 `areaSize` 推导成字面量 `100`，而不是普通 `number`。

这类“从已有值推导类型”的写法，天然更适合 `type`。

因为它本质上还是：

```ts
type SomeType = 某个类型表达式;
```

这也是 `type` 的优势：它不只是描述对象，还可以给任意类型表达式命名。

### 5.6 实践六：谨慎使用 interface 的声明合并

`interface` 有一个特殊能力：声明合并。

比如：

```ts
interface User {
  name: string;
  age: number;
}

interface User {
  role: string;
}
```

最终 `User` 会被合并成：

```ts
interface User {
  name: string;
  age: number;
  role: string;
}
```

这在某些场景很有用，比如扩展第三方库的类型。

但在普通业务代码里，这个特性也可能带来隐患。

因为同名 `interface` 可能散落在不同文件里，某个类型的最终结构不是在一个地方完整定义的，而是由多个声明拼起来的。

这会降低可预测性。

相比之下，`type` 是封闭的：

```ts
type User = {
  name: string;
  age: number;
};

type User = {
  role: string;
};
```

这会直接报错：

```txt
Duplicate identifier 'User'
```

如果你想扩展它，必须显式创建一个新类型：

```ts
type AdminUser = User & {
  role: string;
};
```

这反而更适合业务项目。

因为扩展关系是显式的，类型不会被某个文件悄悄合并。

工程上，可预测性比灵活性更重要。尤其是团队协作时，一个类型突然多了字段，可能会让排查问题变得很困难。

### 5.7 实践七：class implements 不一定必须用 interface

有些开发者认为 class 实现某种结构时必须用 `interface`。

其实不是。

`interface` 可以这样：

```ts
interface UserShape {
  name: string;
  age: number;
}

class User implements UserShape {
  constructor(
    public name: string,
    public age: number,
  ) {}
}
```

`type` 也可以：

```ts
type UserShape = {
  name: string;
  age: number;
};

class User implements UserShape {
  constructor(
    public name: string,
    public age: number,
  ) {}
}
```

所以“class 要用 interface”并不是硬规则。

当然，如果你在写偏面向对象风格的代码，或者在写公共库，`interface` 的语义可能更贴近“契约”。但在常见前端业务项目，尤其是 React 项目里，class 使用频率本身就不高，没必要因为这个理由全面偏向 `interface`。

---

## 6. 真实项目里应该如何组合使用

在一个 TypeScript + React 项目里，可以采用一种简单统一的类型策略。

比如：

```txt
src/
  components/
    user-card.tsx
  types/
    user.ts
  lib/
    constants.ts
    utils.ts
```

用户相关类型：

```ts
// types/user.ts
export type UserRole = "guest" | "user" | "admin";

export type User = {
  id: string;
  name: string;
  age: number;
  role: UserRole;
  createdAt: string;
};

export type UserCardProps = {
  user: User;
  onSelectUser?: (id: string) => void;
};

export type RegisterFormValues = Pick<User, "name" | "age">;
export type UpdateUserPayload = Partial<Pick<User, "name" | "age" | "role">>;
```

组件里使用：

```tsx
import type { UserCardProps } from "@/types/user";

export function UserCard({ user, onSelectUser }: UserCardProps) {
  return (
    <article>
      <h2>{user.name}</h2>
      <p>{user.role}</p>
      <button onClick={() => onSelectUser?.(user.id)}>查看</button>
    </article>
  );
}
```

状态里使用联合类型：

```ts
type RequestStatus = "idle" | "loading" | "success" | "error";
const [status, setStatus] = useState<RequestStatus>("idle");
```

API 类型里使用工具类型：

```ts
type CreateUserPayload = Pick<User, "name" | "age" | "role">;
type UserListItem = Omit<User, "createdAt">;
```

这种组合方式有一个明显特点：所有业务类型都用 `type` 表达。

它不复杂，也不追求“高级”。它解决的是团队可读性和类型一致性问题。

只有在下面这类场景，再考虑 `interface`：

```ts
declare global {
  interface Window {
    analytics?: {
      track: (event: string) => void;
    };
  }
}
```

或者扩展第三方库类型：

```ts
declare module "some-library" {
  interface LibraryConfig {
    customField?: string;
  }
}
```

这类场景需要声明合并，`interface` 就很合适。

所以真实项目里的建议不是“永远不用 `interface`”，而是：

> 默认用 `type`。需要声明合并、库扩展、开放式契约时，再用 `interface`。

---

## 7. 常见误区和边界

### 误区一：对象类型就应该用 interface

这是很多团队早期的约定，但不是必须的。

`type` 完全可以描述对象结构，而且在 React props、API 类型、表单类型等场景中都很自然。

如果项目里已经大量使用联合类型和工具类型，那么统一使用 `type` 反而更简单。

### 误区二：interface 比 type 更“面向对象”，所以更专业

`interface` 确实在面向对象语言里很常见，也更像“契约”。

但 TypeScript 服务的是 JavaScript，而现代前端项目里很多代码并不是 class 驱动的面向对象结构。

在函数式组件、hooks、工具类型、联合类型大量存在的项目里，`type` 的表达方式更贴近日常写法。

### 误区三：声明合并一定是优势

声明合并在库类型扩展里很有用。

但在业务代码里，它也可能让类型变得不可预测。同一个 `User interface` 可能在多个文件里被补充字段，最终结构不集中，阅读成本会变高。

如果你不需要开放扩展，封闭的 `type` 反而更安全。

### 误区四：type 不能扩展

`type` 当然可以扩展，只是方式不同。

`interface` 用 `extends`：

```ts
interface Admin extends User {
  role: string;
}
```

`type` 用交叉类型：

```ts
type Admin = User & {
  role: string;
};
```

这两者都能表达扩展。区别是语法风格和类型组合方式。

### 误区五：interface 才能用于 class implements

不是。

`implements` 可以接 `interface`，也可以接对象形态的 `type`。

```ts
type UserShape = {
  name: string;
};

class User implements UserShape {
  constructor(public name: string) {}
}
```

所以这不是必须选择 `interface` 的理由。

### 误区六：为了统一，项目里应该完全禁止 interface

也没必要走极端。

如果你在做类型声明扩展、公共库设计、全局对象增强，`interface` 依然有价值。

更成熟的做法不是“禁用 `interface`”，而是明确边界：

- 应用业务类型：优先 `type`。
- 可被外部扩展的开放契约：考虑 `interface`。
- 第三方库类型增强：使用 `interface`。
- 团队已有稳定规范：优先遵守团队规范，不要为风格重构全部代码。

---

## 8. 一个更完整的 TypeScript 示例

下面用一个简化的用户管理场景，把 `type` 的常见使用方式串起来。

先定义基础类型：

```ts
// types/user.ts
export type UserRole = "guest" | "user" | "admin";
export type UserStatus = "active" | "disabled";

export type User = {
  id: string;
  name: string;
  age: number;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
};
```

这里 `UserRole` 和 `UserStatus` 都是联合类型，只能用 `type` 自然表达。它们比普通 `string` 更安全：

```ts
const role: UserRole = "admin"; // ✅
const wrongRole: UserRole = "super-admin"; // ❌
```

接着定义不同业务场景需要的类型：

```ts
export type CreateUserPayload = Pick<User, "name" | "age" | "role">;

export type UpdateUserPayload = Partial<
  Pick<User, "name" | "age" | "role" | "status">
>;

export type UserListItem = Omit<User, "createdAt">;
```

这些类型都来自 `User`，但服务于不同场景：

- 创建用户时不需要 `id` 和 `createdAt`。
- 更新用户时字段可以是可选的。
- 列表展示时不需要所有字段。

组件 props 也继续用 `type`：

```tsx
// components/user-card.tsx
import type { UserListItem } from "@/types/user";

type UserCardProps = {
  user: UserListItem;
  onChangeStatus: (id: string, status: UserListItem["status"]) => void;
};

export function UserCard({ user, onChangeStatus }: UserCardProps) {
  return (
    <article>
      <h2>{user.name}</h2>
      <p>角色：{user.role}</p>
      <p>状态：{user.status}</p>
      <button onClick={() => onChangeStatus(user.id, "disabled")}>
        禁用用户
      </button>
    </article>
  );
}
```

这里有一个细节：

```ts
UserListItem["status"]
```

它表示从 `UserListItem` 中取出 `status` 字段的类型。这样如果以后 `status` 类型变化，组件 props 会自动同步。

再看一个表单组件：

```tsx
import type { CreateUserPayload, UserRole } from "@/types/user";

type CreateUserFormProps = {
  onSubmit: (values: CreateUserPayload) => void;
};

export function CreateUserForm({ onSubmit }: CreateUserFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    const values: CreateUserPayload = {
      name: String(formData.get("name") ?? ""),
      age: Number(formData.get("age") ?? 0),
      role: String(formData.get("role") ?? "user") as UserRole,
    };

    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="用户名" />
      <input name="age" type="number" placeholder="年龄" />
      <select name="role" defaultValue="user">
        <option value="guest">访客</option>
        <option value="user">用户</option>
        <option value="admin">管理员</option>
      </select>
      <button type="submit">创建用户</button>
    </form>
  );
}
```

这个示例体现了几个实践点：

- 用联合类型约束枚举值。
- 用对象类型描述实体。
- 用工具类型派生不同业务场景的类型。
- 用 props 类型约束组件输入。
- 用索引访问类型复用字段类型。
- 全部使用 `type` 保持一致。

如果某一天你要扩展全局 `Window`，再使用 `interface`：

```ts
declare global {
  interface Window {
    analytics?: {
      track: (eventName: string, payload?: Record<string, unknown>) => void;
    };
  }
}
```

这就是合理边界：业务类型用 `type`，声明合并场景用 `interface`。

---

## 9. 学习和落地建议

如果你想在项目里更好地使用 TypeScript 类型，可以按这个顺序练习。

第一步，先统一团队风格。

不要一边写 props 用 `interface`，一边写 API 类型用 `type`，又在某些地方混用。可以先定一个简单规则：业务代码默认用 `type`。

第二步，熟练掌握联合类型。

比如状态、角色、按钮类型、订单状态、页面 tab，都很适合用联合类型表达。

```ts
type OrderStatus = "pending" | "paid" | "shipped" | "cancelled";
```

第三步，掌握工具类型。

优先练习这些：

```txt
Pick<T, K>
Omit<T, K>
Partial<T>
Required<T>
Readonly<T>
Record<K, T>
ReturnType<T>
Parameters<T>
```

它们能让你少重复定义很多类型。

第四步，学会从已有类型中提取字段类型。

比如：

```ts
type UserId = User["id"];
type UserStatus = User["status"];
```

这可以减少类型重复。

第五步，再学习 `typeof` 和 `as const`。

它们适合从配置对象、常量对象中反推出类型。

```ts
const routes = {
  home: "/",
  users: "/users",
  settings: "/settings",
} as const;

type RouteKey = keyof typeof routes;
type RoutePath = (typeof routes)[RouteKey];
```

第六步，最后再理解 `interface` 的适用场景。

不要一开始就陷入 “type vs interface 谁更正统” 的争论。先把业务类型写清楚、写稳定，再去理解声明合并、库扩展、开放契约这些更特殊的场景。

---

## 10. 总结

`type` 和 `interface` 都是 TypeScript 类型系统的重要能力，但在普通前端业务项目里，更推荐把 `type` 作为默认选择。

原因不是 `interface` 不能用，而是 `type` 的表达能力更统一。

它能描述对象，也能描述联合类型、元组、函数类型、工具类型结果、从已有值推导出的类型。对于 React props、API 类型、表单类型、状态类型这些常见场景，`type` 足够自然，也更容易保持项目风格一致。

`interface` 的价值主要在需要声明合并和开放扩展的地方，比如扩展第三方库类型、增强全局对象、设计公共库 API 等。

真正成熟的类型设计，不是纠结某个语法更“高级”，而是让团队能够稳定、清楚、可预测地表达业务模型。

一个简单实用的结论是：

> 业务代码默认用 `type`。需要声明合并或开放式扩展时，再使用 `interface`。
