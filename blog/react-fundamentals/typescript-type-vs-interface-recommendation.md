# TypeScript 中为什么我更推荐使用 type，而不是 interface？

在 TypeScript 中，`type` 和 `interface` 都可以用来描述对象结构。

比如一个用户组件的 props：

```ts
type UserProps = {
  name: string;
  age: number;
};
```

也可以用 `interface` 写：

```ts
interface UserProps {
  name: string;
  age: number;
}
```

这两种写法看起来非常相似。

所以很多人会问：

**到底应该用 type，还是 interface？**

我的结论是：

**大多数情况下，优先使用 type。**

不是说 `interface` 完全不能用，而是从一致性、表达能力和可预测性来看，`type` 更适合作为默认选择。

---

## 一、type 和 interface 的基础区别

先看最基础的对象类型定义。

使用 `type`：

```ts
type UserProps = {
  name: string;
  age: number;
};
```

使用 `interface`：

```ts
interface UserProps {
  name: string;
  age: number;
}
```

它们都可以描述一个对象：

```ts
const user: UserProps = {
  name: "Tom",
  age: 20,
};
```

在这个场景下，`type` 和 `interface` 的效果几乎一样。

区别主要是语法：

```text
type      使用 = 赋值
interface 使用 {} 声明对象结构
```

---

## 二、扩展对象类型的写法不同

在真实项目中，我们经常会有基础类型，然后在它的基础上扩展新的类型。

比如普通用户和管理员。

普通用户有 `name` 和 `age`：

```ts
type UserProps = {
  name: string;
  age: number;
};
```

管理员也有 `name` 和 `age`，但额外有一个 `role`：

```ts
type AdminProps = UserProps & {
  role: string;
};
```

这叫做交叉类型，也就是 intersection。

如果用 `interface`，写法是：

```ts
interface UserProps {
  name: string;
  age: number;
}

interface AdminProps extends UserProps {
  role: string;
}
```

这两种写法都可以。

`type` 使用 `&`：

```ts
type AdminProps = UserProps & {
  role: string;
};
```

`interface` 使用 `extends`：

```ts
interface AdminProps extends UserProps {
  role: string;
}
```

在简单对象扩展上，两者差别不大。

但问题是，`interface` 只能很好地描述对象，而 `type` 能描述的东西更多。

---

## 三、type 可以描述基本类型，interface 不行

`type` 不只能描述对象，还可以给基本类型起别名。

比如地址本质上是一个字符串：

```ts
type Address = string;

const address: Address = "123 Main Street";
```

这在业务代码中很常见。

例如：

```ts
type UserId = string;
type OrderId = string;
type Timestamp = number;
type IsActive = boolean;
```

这些类型虽然底层是 `string`、`number`、`boolean`，但通过类型别名，可以增强语义。

比如：

```ts
type UserId = string;

function getUserById(id: UserId) {
  // ...
}
```

你一看就知道这里传的不是普通字符串，而是用户 ID。

但是 `interface` 做不到这一点。

你不能写：

```ts
interface Address = string;
```

这是错误的。

`interface` 默认只能描述对象结构：

```ts
interface Address {
  value: string;
}
```

这就变成了对象，而不是字符串别名。

所以第一个重要区别是：

**type 可以描述基本类型，interface 主要用于描述对象。**

---

## 四、type 可以描述联合类型，interface 不行

`type` 还可以描述联合类型。

比如一个地址可以是字符串，也可以是字符串数组：

```ts
type Address = string | string[];

const address1: Address = "123 Main Street";

const address2: Address = ["123 Main Street", "456 Park Avenue"];
```

这表示：

```text
Address 可以是 string
也可以是 string[]
```

这就是联合类型。

在业务中很常见，比如：

```ts
type Status = "pending" | "success" | "failed";

type Theme = "light" | "dark";

type Size = "sm" | "md" | "lg";
```

这种写法非常适合限制固定取值。

例如：

```ts
type ButtonVariant = "primary" | "secondary" | "danger";

function Button(props: { variant: ButtonVariant }) {
  // ...
}
```

如果用 `interface`，就没法直接表达：

```ts
interface Status = "pending" | "success" | "failed";
```

这是错误的。

所以第二个重要区别是：

**type 可以直接描述联合类型，interface 不行。**

---

## 五、type 使用 Utility Types 更自然

TypeScript 提供了很多实用工具类型，比如：

```text
Pick
Omit
Partial
Required
Readonly
Record
ReturnType
Parameters
```

这些工具类型在 React 和 Next.js 项目里非常常见。

比如我们有一个用户 props：

```ts
type UserProps = {
  name: string;
  age: number;
  createdAt: Date;
};
```

现在有一个游客组件，它不需要 `name` 和 `age`，只需要 `createdAt`。

可以用 `Omit`：

```ts
type GuestProps = Omit<UserProps, "name" | "age">;
```

这样 `GuestProps` 就等价于：

```ts
type GuestProps = {
  createdAt: Date;
};
```

这种写法非常简洁。

如果用 `interface`，虽然也能实现：

```ts
interface GuestProps extends Omit<UserProps, "name" | "age"> {}
```

但是这个写法明显别扭。

它需要：

```text
extends
Omit
空的 {}
```

语法不够自然。

相比之下：

```ts
type GuestProps = Omit<UserProps, "name" | "age">;
```

更像普通赋值，也更容易阅读。

所以第三个理由是：

**type 和 TypeScript 工具类型配合起来更自然。**

---

## 六、type 描述 tuple 更简单

tuple 可以理解为固定结构的数组。

比如一个地址记录由两个部分组成：

```text
第一个元素：编号
第二个元素：地址字符串
```

可以这样写：

```ts
type Address = [number, string];

const address: Address = [1, "123 Main Street"];
```

这表示数组必须是两个元素：

```text
第一个元素必须是 number
第二个元素必须是 string
```

如果写错：

```ts
const address: Address = ["123 Main Street", 1];
```

TypeScript 就会报错。

这种 tuple 在一些场景下很有用，比如：

```ts
type Coordinate = [number, number];

const point: Coordinate = [120.5, 30.2];
```

如果用 `interface` 也可以勉强描述，但语法会很别扭：

```ts
interface Address extends Array<number | string> {
  0: number;
  1: string;
}
```

这种写法可读性明显不如：

```ts
type Address = [number, string];
```

所以第四个理由是：

**type 描述 tuple 更直接、更清晰。**

---

## 七、既然项目里一定会用 type，不如保持统一

到这里已经可以看到，`type` 能做很多 `interface` 不方便做的事情：

```text
基本类型别名
联合类型
工具类型
tuple
从其他类型中提取类型
```

而这些能力在真实项目中非常常用。

特别是在 React 项目里，你经常会写：

```ts
type ButtonVariant = "primary" | "secondary";

type UserProps = {
  id: string;
  name: string;
};

type GuestProps = Omit<UserProps, "id">;
```

也就是说，你的项目里几乎一定会用到 `type`。

既然如此，为了代码风格统一，完全可以默认使用 `type`。

这样团队里不需要纠结：

```text
这个地方用 type 还是 interface？
什么时候用 type？
什么时候用 interface？
```

默认用 `type`，只有特殊场景再考虑 `interface`，会更简单。

---

## 八、type 可以从已有对象中提取类型

`type` 还有一个非常好用的能力：可以从已有变量中提取类型。

比如有一个项目对象：

```ts
const project = {
  title: "Project One",
  specification: {
    areaSize: 100,
    rooms: 3,
  },
};
```

现在我们想单独拿到 `specification` 的类型。

可以这样写：

```ts
type Specification = (typeof project)["specification"];
```

这样 TypeScript 会自动推导出：

```ts
type Specification = {
  areaSize: number;
  rooms: number;
};
```

这在真实项目中非常有用。

比如从配置对象、接口返回数据、常量对象中提取类型：

```ts
const routes = {
  home: "/",
  dashboard: "/dashboard",
  settings: "/settings",
};

type RouteKey = keyof typeof routes;
```

得到：

```ts
type RouteKey = "home" | "dashboard" | "settings";
```

这种能力用 `type` 写起来非常自然。

如果用 `interface`，通常也能绕出来，但语法不够直观。

---

## 九、补充技巧：as const

在刚才的例子中：

```ts
const project = {
  title: "Project One",
  specification: {
    areaSize: 100,
    rooms: 3,
  },
};
```

TypeScript 默认会把 `areaSize` 推导成 `number`，把 `rooms` 推导成 `number`。

也就是说它认为：

```ts
areaSize: number;
rooms: number;
```

但有时候我们希望它更精确。

比如 `areaSize` 就是固定的 `100`，`rooms` 就是固定的 `3`。

可以使用：

```ts
const project = {
  title: "Project One",
  specification: {
    areaSize: 100,
    rooms: 3,
  },
} as const;
```

这时 TypeScript 会把它推导得更具体：

```ts
areaSize: 100;
rooms: 3;
```

而不是泛泛的 `number`。

`as const` 在处理常量配置、枚举值、路由表、状态列表时非常好用。

例如：

```ts
const STATUS = ["pending", "success", "failed"] as const;

type Status = (typeof STATUS)[number];
```

这样得到的 `Status` 就是：

```ts
type Status = "pending" | "success" | "failed";
```

这也是 `type` 非常适合的场景。

---

## 十、interface 会自动合并，可能带来不可预测性

`interface` 有一个特性叫 Declaration Merging，也就是声明合并。

例如：

```ts
interface User {
  name: string;
  age: number;
}

interface User {
  role: string;
}
```

这两个 `User` 不会报错，而是会被 TypeScript 合并成：

```ts
interface User {
  name: string;
  age: number;
  role: string;
}
```

于是：

```ts
const user: User = {
  name: "Tom",
  age: 20,
  role: "admin",
};
```

这是合法的。

这个特性在某些场景有用，比如扩展第三方库的类型。

但是在日常业务代码中，它也会带来问题。

因为同一个 `interface` 可以在不同文件、不同位置被重复声明，然后自动合并。

这样会导致类型变得不够可预测。

你以为 `User` 只有：

```ts
interface User {
  name: string;
  age: number;
}
```

但别人可能在另一个地方又写了：

```ts
interface User {
  role: string;
}
```

最后 `User` 的结构就被悄悄改变了。

这在大型项目和多人协作中，容易造成困惑。

---

## 十一、type 是封闭的，更可预测

相比之下，`type` 不允许重复声明。

比如：

```ts
type User = {
  name: string;
  age: number;
};

type User = {
  role: string;
};
```

TypeScript 会直接报错：

```text
Duplicate identifier 'User'
```

这意味着 `type` 是封闭的。

如果你想扩展它，必须显式创建一个新的类型：

```ts
type User = {
  name: string;
  age: number;
};

type AdminUser = User & {
  role: string;
};
```

这种写法更清晰。

你能明确看到：

```text
AdminUser = User + role
```

而不是某个接口在别的地方被悄悄合并了。

所以从可维护性角度看：

```text
interface 是开放的，可能被合并。
type 是封闭的，更可预测。
```

对于大多数业务项目来说，可预测性比自动合并更重要。

---

## 十二、class implements 也可以用 type

有些人认为，如果要给 class 规定结构，就必须用 `interface`。

其实不是。

比如用 `interface`：

```ts
interface IUser {
  name: string;
  age: number;
}

class User implements IUser {
  constructor(
    public name: string,
    public age: number,
  ) {}
}
```

这当然可以。

但 `type` 也可以：

```ts
type TUser = {
  name: string;
  age: number;
};

class User implements TUser {
  constructor(
    public name: string,
    public age: number,
  ) {}
}
```

一样可以正常工作。

所以即使在 `class implements` 的场景里，`type` 也不是不能用。

---

## 十三、type 语法更短

这个理由比较小，但也确实存在。

```ts
type;
```

只有 4 个字符。

```ts
interface;
```

有 9 个字符。

当然，代码选择不应该只看字符数量。

但在两者功能接近时，更短、更统一的语法会让代码看起来更轻。

尤其是 React 项目里经常写 props 类型：

```ts
type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  onClick?: () => void;
};
```

这种写法已经非常常见。

---

## 十四、那 interface 还有没有使用场景？

有。

虽然我建议默认使用 `type`，但 `interface` 不是完全没价值。

它至少有几个适合场景。

### 1. 需要声明合并时

如果你就是想利用 Declaration Merging，比如扩展第三方库类型，那么 `interface` 很合适。

例如扩展某个库的类型声明，或者做全局类型增强。

这种场景下，`interface` 的开放性反而是优势。

---

### 2. 某些错误提示可能更清晰

TypeScript 官方文档中也提到过，有时使用 `interface` 的错误提示会更短、更聚焦。

在非常复杂的对象类型中，`interface` 有时能让报错更容易读。

不过在大多数普通 React / Next.js 项目中，这不是决定性因素。

---

### 3. 团队已有规范要求 interface

如果团队规范明确规定：

```text
对象结构用 interface
联合类型、工具类型用 type
```

那也可以遵守团队规范。

工程实践里，一致性往往比个人偏好更重要。

但如果是新项目，或者你可以制定规范，我更推荐：

```text
默认用 type。
只有确实需要 interface 特性时，再用 interface。
```

---

## 十五、推荐规则

我的建议很简单：

```text
默认使用 type。
需要声明合并时，使用 interface。
团队已有规范时，遵守团队规范。
```

在 React / Next.js 项目中，尤其推荐这样写：

```ts
type UserProps = {
  name: string;
  age: number;
};

type ButtonVariant = "primary" | "secondary" | "danger";

type GuestProps = Omit<UserProps, "name" | "age">;

type Coordinate = [number, number];
```

这样你可以用同一种语法处理：

```text
对象类型
联合类型
工具类型
tuple
类型提取
props 类型
```

代码风格更统一。

---

## 十六、总结

`type` 和 `interface` 在描述对象结构时很相似。

比如：

```ts
type User = {
  name: string;
  age: number;
};

interface User {
  name: string;
  age: number;
}
```

这两种写法在简单对象上几乎没有区别。

但 `type` 的表达能力更强。

它可以描述：

```text
基本类型
联合类型
交叉类型
tuple
工具类型结果
从变量中提取出的类型
```

而 `interface` 更适合描述对象，并且支持声明合并。

问题在于，声明合并虽然有用，但在普通业务代码里也可能让类型变得不可预测。

所以我的结论是：

**在大多数 TypeScript 项目中，尤其是 React 和 Next.js 项目里，优先使用 type 会更简单、更统一、更可预测。**

可以用一句话记住：

```text
type 更通用，interface 更适合特殊扩展场景。
```

默认用 `type`，需要声明合并时再用 `interface`，这是我认为更稳妥的 TypeScript 编码习惯。
