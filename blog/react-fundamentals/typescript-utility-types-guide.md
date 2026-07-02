# TypeScript Utility Types 全解析：18 个内置工具类型到底怎么用？

TypeScript 提供了很多内置工具类型，也就是 Utility Types。

这些工具类型的作用是：**基于已有类型，快速派生出新的类型。**

它们可以帮助我们减少重复定义，让类型之间保持关联，避免一个地方改了类型，其他地方忘记同步修改。

在真实项目中，如果你只会手写类型，而不会使用 Utility Types，很容易写出重复、脆弱、难维护的类型代码。

这篇文章会系统整理 TypeScript 中常见的 18 个工具类型，包括：

```text
Pick
Omit
Partial
Required
Readonly
Record
Extract
Exclude
ReturnType
Parameters
ConstructorParameters
InstanceType
NonNullable
Awaited
Lowercase
Uppercase
Capitalize
Uncapitalize
```text

---

## 一、为什么需要 Utility Types？

假设我们有一个用户类型：

```ts
type User = {
  id: string;
  name: string;
  age: number;
  address: {
    city: string;
    street: string;
  };
};
```

然后我们有几个函数：

```ts
function createUser(user: User) {}

function updateUser(user: User) {}

function renderUserDetails(user: User) {}
```text

表面上看没有问题，但真实业务里并不是每个函数都需要完整的 `User`。

比如：

```text
createUser：创建用户时，不应该传 id，因为 id 通常由数据库生成。
updateUser：更新用户时，可能只更新 name 或 age，不需要传完整 user。
renderUserDetails：渲染用户详情时，可能只需要 name 和 age。
```

如果所有函数都强制传完整 `User`，代码就会变得很不灵活。

当然，我们可以手动写新类型：

```ts
type UserDetails = {
  name: string;
  age: number;
};
```tsx

但问题是，如果以后 `User.name` 的类型改了，比如从 `string` 改成了其他类型，你还要手动同步修改 `UserDetails`。

这就是 Utility Types 的价值：

**它可以让新类型从基础类型中自动推导出来。**

---

## 二、Pick：从对象类型中挑选属性

`Pick` 用来从一个对象类型中选择部分属性。

比如 `renderUserDetails` 只需要 `name` 和 `age`：

```ts
function renderUserDetails(user: Pick<User, "name" | "age">) {
  console.log(user.name, user.age);
}
```

这里的意思是：

```text
从 User 类型中，只挑选 name 和 age 两个属性。
```text

等价于：

```ts
type UserDetails = {
  name: string;
  age: number;
};
```

使用时：

```ts
renderUserDetails({
  name: "Kyle",
  age: 30,
});
```tsx

这样就不需要传 `id` 和 `address`。

更重要的是，如果未来 `User` 里的 `age` 类型发生变化，`Pick<User, "name" | "age">` 会自动跟着变化。

这比手写类型更安全。

适合场景：

```text
只需要对象中的部分字段
组件 props 只依赖某几个字段
列表项只展示部分数据
详情页和表单页复用同一个基础类型
```

---

## 三、Omit：从对象类型中排除属性

`Omit` 和 `Pick` 相反。

`Pick` 是“我要哪些字段”。
`Omit` 是“我不要哪些字段”。

创建用户时，我们不想手动传 `id`，因为 `id` 通常由数据库生成：

```ts
function createUser(user: Omit<User, "id">) {
  // create user
}
```text

这表示：

```text
使用 User 类型，但去掉 id 字段。
```

调用时：

```ts
createUser({
  name: "Kyle",
  age: 30,
  address: {
    city: "New York",
    street: "Main Street",
  },
});
```text

不需要传 `id`。

`Omit` 非常适合创建表单数据类型。

比如数据库里的完整用户是：

```ts
type User = {
  id: string;
  name: string;
  age: number;
  createdAt: Date;
  updatedAt: Date;
};
```

创建用户表单可能只需要：

```ts
type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;
```text

适合场景：

```text
创建数据时排除 id
表单类型排除系统字段
接口入参排除只读字段
组件 props 排除不需要暴露的字段
```

---

## 四、Partial：把所有属性变成可选

`Partial` 会把对象类型中的所有属性变成可选。

比如更新用户时，我们可能只更新 `name`，也可能只更新 `age`：

```ts
function updateUser(user: Partial<User>) {
  // update user
}
```text

这时可以这样调用：

```ts
updateUser({
  name: "Sally",
});
```

也可以：

```ts
updateUser({
  age: 20,
});
```text

甚至可以同时更新多个字段：

```ts
updateUser({
  name: "Sally",
  age: 20,
});
```

`Partial<User>` 等价于：

```ts
type PartialUser = {
  id?: string;
  name?: string;
  age?: number;
  address?: {
    city: string;
    street: string;
  };
};
```text

注意：`Partial` 只会处理第一层属性，不会默认把嵌套对象里的属性也变成可选。

适合场景：

```text
更新接口参数
表单草稿数据
可选配置项
状态 patch 更新
```

---

## 五、Required：把所有属性变成必填

`Required` 和 `Partial` 相反。

它会把所有可选属性变成必填。

比如：

```ts
type User = {
  id: string;
  name: string;
  age: number;
  address?: {
    city: string;
    street: string;
  };
};
```tsx

这里 `address` 是可选的。

但某个函数要求用户必须有地址：

```ts
function createUserWithAddress(user: Required<User>) {
  // ...
}
```

这时调用函数时就必须传 `address`：

```ts
createUserWithAddress({
  id: "1",
  name: "Kyle",
  age: 30,
  address: {
    city: "New York",
    street: "Main Street",
  },
});
```text

适合场景：

```text
某些流程要求完整数据
可选字段在特定场景下必须存在
提交前把草稿数据转成完整数据
```

需要注意的是：

**Required 只是去掉可选标记，不会移除 null 或 undefined 联合类型。**

比如：

```ts
type User = {
  name?: string | null;
};

type FullUser = Required<User>;
```text

得到的是：

```ts
type FullUser = {
  name: string | null;
};
```

`name` 必须存在，但它仍然可以是 `null`。

---

## 六、Readonly：把所有属性变成只读

`Readonly` 会把对象类型中的所有属性变成只读。

比如：

```ts
type ReadonlyUser = Readonly<User>;
```text

等价于：

```ts
type ReadonlyUser = {
  readonly id: string;
  readonly name: string;
  readonly age: number;
  readonly address: {
    city: string;
    street: string;
  };
};
```

使用时：

```ts
const user: ReadonlyUser = {
  id: "1",
  name: "Kyle",
  age: 30,
  address: {
    city: "New York",
    street: "Main Street",
  },
};

user.name = "Sally";
```text

这里会报错，因为 `name` 是只读属性。

需要注意：

**Readonly 默认也是浅层的。**

也就是说，它只会让第一层属性只读：

```ts
user.address = {
  city: "Los Angeles",
  street: "Park Street",
};
```

这会报错。

但是：

```ts
user.address.city = "Los Angeles";
```text

默认可能仍然允许，因为 `Readonly` 不会自动深度递归到嵌套对象。

适合场景：

```text
不可变数据
配置对象
函数返回只读结果
避免外部修改对象属性
```

---

## 七、Record：创建固定 key-value 结构

`Record` 是一个非常有用但容易被误解的工具类型。

它的语法是：

```ts
Record<Keys, Type>;
```text

意思是：

```text
创建一个对象类型，它的 key 来自 Keys，value 都是 Type。
```

例如：

```ts
type UserMap = Record<string, User>;
```text

表示：

```text
这是一个对象，key 是 string，value 是 User。
```

使用：

```ts
const users: UserMap = {
  "1": {
    id: "1",
    name: "Kyle",
    age: 30,
    address: {
      city: "New York",
      street: "Main Street",
    },
  },
};
```text

更常见、更强大的用法是配合联合类型。

比如角色有三种：

```ts
type Role = "admin" | "user" | "moderator";
```

我们希望每个角色都必须配置一个权限说明：

```ts
type RoleConfig = Record<Role, { label: string }>;
```text

使用：

```ts
const roleConfig: RoleConfig = {
  admin: {
    label: "Administrator",
  },
  user: {
    label: "Normal User",
  },
  moderator: {
    label: "Moderator",
  },
};
```

如果少写一个 key，比如漏掉 `moderator`，TypeScript 会报错。

所以 `Record` 很适合做映射表。

适合场景：

```text
角色映射
状态映射
枚举值配置表
字典对象
权限配置
主题配置
```tsx

例如：

```ts
type Status = "pending" | "success" | "failed";

const statusText: Record<Status, string> = {
  pending: "等待中",
  success: "成功",
  failed: "失败",
};
```

这样可以保证每个状态都有对应文案。

---

## 八、Extract：从联合类型中提取成员

`Extract` 用于从联合类型中提取指定成员。

比如：

```ts
type Role = "admin" | "user" | "moderator";

type PowerfulRole = Extract<Role, "admin" | "moderator">;
```text

得到：

```ts
type PowerfulRole = "admin" | "moderator";
```

它的意思是：

```text
从 Role 中提取也存在于 "admin" | "moderator" 里的成员。
```tsx

也可以用于两个联合类型之间取交集：

```ts
type Role = "admin" | "user" | "moderator";

type OtherRole = "admin" | "user" | "security";

type SharedRole = Extract<Role, OtherRole>;
```

得到：

```ts
type SharedRole = "admin" | "user";
```text

适合场景：

```text
从联合类型中筛选一部分
获取两个联合类型的交集
根据角色、状态、事件类型派生新类型
```

---

## 九、Exclude：从联合类型中排除成员

`Exclude` 和 `Extract` 相反。

它用于从联合类型中移除指定成员。

比如：

```ts
type Role = "admin" | "user" | "moderator";

type PowerfulRole = Exclude<Role, "user">;
```text

得到：

```ts
type PowerfulRole = "admin" | "moderator";
```

也可以排除多个：

```ts
type AdminOnly = Exclude<Role, "user" | "moderator">;
```text

得到：

```ts
type AdminOnly = "admin";
```

如果用两个联合类型：

```ts
type Role = "admin" | "user" | "moderator";

type OtherRole = "admin" | "user" | "security";

type OnlyRole = Exclude<Role, OtherRole>;
```text

得到：

```ts
type OnlyRole = "moderator";
```

意思是：

```text
从 Role 中移除 OtherRole 里也有的成员。
```text

适合场景：

```text
排除某些状态
排除某些角色
限制某些分支逻辑
从 enum-like union 中派生子类型
```

例如：

```ts
type ButtonVariant = "primary" | "secondary" | "danger";

type SafeVariant = Exclude<ButtonVariant, "danger">;
```text

---

## 十、ReturnType：获取函数返回值类型

`ReturnType` 用来获取函数的返回值类型。

比如：

```ts
function getUser(id: string) {
  return {
    id,
    name: "Kyle",
    age: 30,
  };
}
```

我们想拿到 `getUser` 的返回类型：

```ts
type UserResult = ReturnType<typeof getUser>;
```text

得到：

```ts
type UserResult = {
  id: string;
  name: string;
  age: number;
};
```

注意这里要写：

```ts
typeof getUser;
```text

因为 `getUser` 是一个运行时函数，而 `ReturnType` 需要的是函数类型。

适合场景：

```text
第三方库暴露函数但没有暴露返回类型
从业务函数中提取返回类型
避免重复手写函数返回值结构
```

例如：

```ts
const user = getUser("1");

type UserResult = ReturnType<typeof getUser>;
```tsx

这样如果 `getUser` 以后多返回一个字段，`UserResult` 会自动更新。

---

## 十一、Parameters：获取函数参数类型

`Parameters` 用来获取函数参数类型。

它返回的是一个 tuple。

比如：

```ts
function getUser(id: string, age: number) {
  return {
    id,
    age,
  };
}

type GetUserParams = Parameters<typeof getUser>;
```

得到：

```ts
type GetUserParams = [id: string, age: number];
```text

也就是：

```ts
[string, number];
```

使用：

```ts
const params: GetUserParams = ["1", 30];
```text

如果写成：

```ts
const params: GetUserParams = [30, "1"];
```

就会报错，因为顺序和类型都不对。

`Parameters` 在包装函数时特别有用。

比如：

```ts
function getUser(id: string) {
  return {
    id,
    name: "Kyle",
  };
}

function getUserWrapper(id: Parameters<typeof getUser>[0], shouldLog: boolean) {
  if (shouldLog) {
    console.log("getting user");
  }

  return getUser(id);
}
```text

这里：

```ts
Parameters < typeof getUser > [0];
```

表示获取 `getUser` 第一个参数的类型。

如果以后 `getUser` 的 `id` 从 `string` 改成 `number`，`getUserWrapper` 会自动同步。

适合场景：

```text
包装函数
高阶函数
复用第三方函数参数类型
避免手动同步参数类型
```text

---

## 十二、ConstructorParameters：获取构造函数参数类型

`Parameters` 用于普通函数。

如果是 class 的构造函数，就要用 `ConstructorParameters`。

例如：

```ts
class User {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}
```

获取构造函数参数：

```ts
type UserConstructorParams = ConstructorParameters<typeof User>;
```text

得到：

```ts
type UserConstructorParams = [name: string];
```

使用：

```ts
const params: UserConstructorParams = ["Kyle"];
```text

适合场景：

```text
class 工厂函数
封装 class 创建逻辑
依赖注入容器
需要复用 constructor 参数类型
```

---

## 十三、InstanceType：获取 class 实例类型

`InstanceType` 用来获取 class 构造出来的实例类型。

比如：

```ts
class User {
  name: string;

  constructor(name: string) {
    this.name = name;
  }
}

type UserInstance = InstanceType<typeof User>;
```text

得到的 `UserInstance` 本质上就是：

```ts
User;
```

所以在普通 class 场景中，它看起来用处不大：

```ts
type UserInstance = User;
```tsx

也能达到一样效果。

但如果你拿到的是一个构造函数类型，而不是直接的 class 名字，`InstanceType` 就有意义。

例如：

```ts
type ClassType = typeof User;

type Instance = InstanceType<ClassType>;
```

适合场景：

```text
处理构造函数类型
工厂模式
依赖注入
从 class constructor 中推导实例类型
```tsx

---

## 十四、NonNullable：移除 null 和 undefined

`NonNullable` 用来从类型中移除 `null` 和 `undefined`。

例如：

```ts
type A = string | null | undefined;

type B = NonNullable<A>;
```

得到：

```ts
type B = string;
```tsx

它和 `Required` 不一样。

`Required` 是让对象属性从可选变成必填。
`NonNullable` 是从类型本身移除 `null` 和 `undefined`。

比如：

```ts
type User = {
  name?: string | null;
};

type RequiredUser = Required<User>;
```

得到：

```ts
type RequiredUser = {
  name: string | null;
};
```tsx

可以看到，`Required` 去掉了 `?`，但没有去掉 `null`。

如果你想去掉 `null`，需要：

```ts
type Name = NonNullable<User["name"]>;
```

得到：

```ts
type Name = string;
```text

适合场景：

```text
确保值不为空
从可空类型中提取真实类型
处理 API 返回的 nullable 字段
```

---

## 十五、Awaited：获取 Promise 解析后的类型

`Awaited` 用来获取 Promise resolve 之后的类型。

比如：

```ts
async function getUser() {
  return {
    id: "1",
    name: "Kyle",
  };
}
```tsx

如果直接用 `ReturnType`：

```ts
type T = ReturnType<typeof getUser>;
```

得到的是：

```ts
Promise<{
  id: string;
  name: string;
}>;
```tsx

但很多时候我们真正想要的是 Promise 里面的数据类型。

这时可以用：

```ts
type UserResult = Awaited<ReturnType<typeof getUser>>;
```

得到：

```ts
type UserResult = {
  id: string;
  name: string;
};
```tsx

`Awaited` 会递归解开 Promise。

即使是多层 Promise：

```ts
type A = Awaited<Promise<Promise<string>>>;
```

得到：

```ts
type A = string;
```text

适合场景：

```text
获取 async 函数真实返回数据类型
封装接口请求函数
从 Promise 中提取 resolve 类型
```

在真实项目中非常常见：

```ts
type User = Awaited<ReturnType<typeof getUser>>;
```tsx

---

## 十六、Lowercase：字符串字面量转小写

`Lowercase` 用于把字符串字面量类型转换成小写。

```ts
type S = "Hello World";

type T = Lowercase<S>;
```

得到：

```ts
type T = "hello world";
```text

注意：它作用于类型层面的字符串字面量，不是运行时字符串。

适合场景：

```text
类型层面的字符串规范化
库类型设计
根据命名规则生成类型
```

---

## 十七、Uppercase：字符串字面量转大写

`Uppercase` 用于把字符串字面量类型转换成大写。

```ts
type S = "hello world";

type T = Uppercase<S>;
```text

得到：

```ts
type T = "HELLO WORLD";
```

适合场景和 `Lowercase` 类似，主要用于类型层面的字符串转换。

---

## 十八、Capitalize：首字母大写

`Capitalize` 用于把字符串字面量类型的首字母变成大写。

```ts
type S = "hello";

type T = Capitalize<S>;
```text

得到：

```ts
type T = "Hello";
```

常见于库类型设计，比如从字段名生成方法名：

```ts
type Field = "name";

type GetterName = `get${Capitalize<Field>}`;
```text

得到：

```ts
type GetterName = "getName";
```

---

## 十九、Uncapitalize：首字母小写

`Uncapitalize` 和 `Capitalize` 相反。

```ts
type S = "Hello";

type T = Uncapitalize<S>;
```text

得到：

```ts
type T = "hello";
```

适合场景：

```text
PascalCase 转 camelCase
生成对象 key
类型层面的命名转换
```tsx

比如：

```ts
type ComponentName = "UserCard";

type VariableName = Uncapitalize<ComponentName>;
```

得到：

```ts
type VariableName = "userCard";
```tsx

---

## 二十、18 个 Utility Types 总结表

| 工具类型                   | 作用                                 |
| -------------------------- | ------------------------------------ |
| `Pick<T, K>`               | 从对象类型 T 中选择指定属性 K        |
| `Omit<T, K>`               | 从对象类型 T 中排除指定属性 K        |
| `Partial<T>`               | 把对象类型 T 的所有属性变成可选      |
| `Required<T>`              | 把对象类型 T 的所有属性变成必填      |
| `Readonly<T>`              | 把对象类型 T 的所有属性变成只读      |
| `Record<K, T>`             | 创建 key 为 K、value 为 T 的对象类型 |
| `Extract<T, U>`            | 从联合类型 T 中提取能赋值给 U 的成员 |
| `Exclude<T, U>`            | 从联合类型 T 中排除能赋值给 U 的成员 |
| `ReturnType<T>`            | 获取函数 T 的返回值类型              |
| `Parameters<T>`            | 获取函数 T 的参数 tuple 类型         |
| `ConstructorParameters<T>` | 获取 class 构造函数参数 tuple 类型   |
| `InstanceType<T>`          | 获取 class 构造函数创建的实例类型    |
| `NonNullable<T>`           | 从 T 中移除 null 和 undefined        |
| `Awaited<T>`               | 获取 Promise resolve 后的类型        |
| `Lowercase<T>`             | 字符串字面量类型转小写               |
| `Uppercase<T>`             | 字符串字面量类型转大写               |
| `Capitalize<T>`            | 字符串字面量类型首字母大写           |
| `Uncapitalize<T>`          | 字符串字面量类型首字母小写           |

---

## 二十一、真实项目中最常用的是哪些？

虽然 TypeScript 内置工具类型很多，但日常业务中最常用的大概是这些：

```text
Pick
Omit
Partial
Required
Readonly
Record
ReturnType
Parameters
Awaited
NonNullable
Exclude
Extract
```

其中，在 React / Next.js 项目里尤其常见的是：

```ts
type ButtonProps = {
  variant: "primary" | "secondary" | "danger";
  size: "sm" | "md" | "lg";
  disabled?: boolean;
};

type SafeButtonVariant = Exclude<ButtonProps["variant"], "danger">;
```tsx

或者：

```ts
type User = Awaited<ReturnType<typeof getUser>>;
```

再比如创建表单类型：

```ts
type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;
```tsx

更新接口类型：

```ts
type UpdateUserInput = Partial<CreateUserInput>;
```

组件展示类型：

```ts
type UserCardProps = Pick<User, "name" | "age">;
```text

这些写法都可以避免重复定义类型。

---

## 二十二、核心思想：从一个基础类型派生其他类型

Utility Types 的核心思想不是炫技，而是减少重复。

好的类型设计通常是：

```text
先定义一个基础类型。
其他类型尽量从基础类型派生。
```

比如：

```ts
type User = {
  id: string;
  name: string;
  age: number;
  address?: {
    city: string;
    street: string;
  };
  createdAt: Date;
  updatedAt: Date;
};
```tsx

然后派生：

```ts
type CreateUserInput = Omit<User, "id" | "createdAt" | "updatedAt">;

type UpdateUserInput = Partial<CreateUserInput>;

type UserCardProps = Pick<User, "name" | "age">;

type UserMap = Record<string, User>;

type UserResult = Awaited<ReturnType<typeof getUser>>;
```

这样做的好处是：

```text
类型之间保持关联
修改基础类型后，派生类型自动更新
减少重复代码
降低维护成本
类型语义更清晰
```text

---

## 二十三、总结

TypeScript Utility Types 是进阶 TypeScript 必须掌握的内容。

它们不是为了让类型写得更复杂，而是为了让类型更可维护。

最重要的几个可以这样记：

```text
Pick：挑字段
Omit：删字段
Partial：全变可选
Required：全变必填
Readonly：全变只读
Record：创建映射对象
Extract：从联合类型中提取
Exclude：从联合类型中排除
ReturnType：拿函数返回值类型
Parameters：拿函数参数类型
Awaited：拿 Promise resolve 后的类型
NonNullable：去掉 null 和 undefined
```

在真实项目中，不要到处手写重复类型。
优先思考：

```text
这个新类型能不能从已有类型推导出来？
```

如果可以，就使用 Utility Types。

一句话总结：

**Utility Types 的本质，是让你基于一个可靠的基础类型，派生出更多准确、同步、可维护的新类型。**
