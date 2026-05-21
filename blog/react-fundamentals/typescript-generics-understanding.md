# TypeScript Generics 泛型的理解与应用

TypeScript 的 Generics，也就是泛型，可以理解成：

> 把类型当作参数传进来。

它解决的核心痛点是：你想写一份可复用的函数或类型，但又不想丢失类型信息，不想退回到 `any`，还希望 TypeScript 能根据你传入的数据推断出准确的返回类型。

泛型是 TypeScript 实现抽象和复用的关键能力。它不是为了让语法更复杂，而是为了让通用代码也能保持类型安全。

---

## 1. 什么是 Generics

泛型的本质是“类型参数化”。

普通函数接收值参数：

```ts
function add(a: number, b: number) {
  return a + b;
}
```

泛型函数接收类型参数：

```ts
function identity<T>(value: T): T {
  return value;
}
```

这里的 `T` 就是一个类型变量。调用函数时，TypeScript 会根据传入的值推断出 `T` 的具体类型。

```ts
const a = identity(123); // number
const b = identity('hello'); // string
```

你可以把泛型理解成：

```txt
先写一份逻辑模板
调用时再把具体类型填进去
```

---

## 2. 什么时候需要泛型

典型场景是：同一段逻辑要处理多种类型，并且输入类型和输出类型之间存在明确关联。

如果不用泛型，常见有两种失败方式。

### 方式 1：写死类型

```ts
function firstNumber(arr: number[]) {
  return arr[0];
}
```

它只能处理 `number[]`，传 `string[]` 就不行。

### 方式 2：使用 any

```ts
function firstAny(arr: any[]) {
  return arr[0];
}
```

这当然能跑，但返回值是 `any`，类型信息全丢了。

你无法知道返回值到底是 `number`、`string`，还是其他类型。后续调用任何属性都不会被 TypeScript 正确约束。

### 泛型解决方式

```ts
function getFirstElement<T>(array: T[]): T | undefined {
  return array[0];
}

const firstNum = getFirstElement([1, 2, 3]);
// firstNum: number | undefined

const firstStr = getFirstElement(['a', 'b', 'c']);
// firstStr: string | undefined
```

这里的关键点是：

> `T` 在函数内部是同一个类型，由调用时传入的数据决定。

传入 `number[]`，`T` 就是 `number`。

传入 `string[]`，`T` 就是 `string`。

泛型让我们既能复用逻辑，又不会丢失类型信息。

---

## 3. 泛型函数：把类型参数化

泛型函数的写法是在函数名后加 `<T>`。

```ts
function getFirstElement<T>(array: T[]): T | undefined {
  return array[0];
}
```

使用时，TypeScript 通常会自动推断 `T`。

```ts
const firstNum = getFirstElement([1, 2, 3]);
// T 被推断为 number

const firstStr = getFirstElement(['a', 'b', 'c']);
// T 被推断为 string
```

你也可以显式指定类型参数：

```ts
const explicit = getFirstElement<number>([1, 2, 3]);
```

但大多数时候不需要显式写，因为 TypeScript 可以自动推断。

`getFirstElement` 这个例子展示了一个典型演进：

```txt
写死 number
  -> 只能处理 number[]

使用 any
  -> 能处理所有类型，但失去类型安全

使用泛型 T
  -> 能处理多种类型，同时返回值保持精确类型
```

---

## 4. 泛型的推断与显式指定

大多数时候，TypeScript 会自动推断泛型参数。

```ts
const n = getFirstElement([1, 2, 3]);
```

这里不需要写：

```ts
const n = getFirstElement<number>([1, 2, 3]);
```

但在 TypeScript 无法推断时，可以显式指定。

一个常见例子是 `document.querySelector`：

```ts
const input = document.querySelector<HTMLInputElement>('#my-input');

input?.value;
```

如果不指定 `<HTMLInputElement>`，TypeScript 只能知道它是一个比较宽泛的 `Element | null`，并不知道它有 `value`。

显式指定泛型的作用是：在推断信息不足时，告诉 TypeScript 具体类型是什么。

---

## 5. 多个泛型参数

多个泛型参数，比如 `<T, K, V>`，本质是在同一个函数或类型里同时引入多个类型变量。

它们可以互相独立，也可以互相关联。

### 5.1 K 和 V：键和值

`Map<K, V>` 是经典例子。

```ts
const map = new Map<string, number>();

map.set('age', 18);
// map.set(123, 18); // 错：key 必须是 string
// map.set('age', 'x'); // 错：value 必须是 number
```

这里：

- `K` 决定 key 的类型。
- `V` 决定 value 的类型。

### 5.2 返回成对结果：pair<K, V>

如果你希望返回对象里的 key 和 value 类型分别跟输入一致，就需要两个泛型。

```ts
function pair<K, V>(key: K, value: V) {
  return { key, value };
}

const p1 = pair('id', 123);
// { key: string; value: number }

const p2 = pair(1, { ok: true });
// { key: number; value: { ok: boolean } }
```

如果只用一个泛型 `<T>`，就会被迫让 key 和 value 是同一种类型，这不符合需求。

### 5.3 类型之间有关联：K 必须是 T 的键

这类场景才是多个泛型参数最有价值的地方。

用一个泛型表示对象类型 `T`，另一个泛型 `K` 表示它的键，并约束 `K` 必须来自 `keyof T`。

```ts
function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 'u1', age: 18 };

const id = getProp(user, 'id');
// id: string

const age = getProp(user, 'age');
// age: number

// getProp(user, 'name'); // 错：name 不在 keyof user 里
```

这里的关联是：

- `K extends keyof T`：`K` 不能随便写，必须是 `T` 的键。
- `T[K]`：返回值类型由 key 精确决定。

传 `'id'` 返回 `string`，传 `'age'` 返回 `number`。

### 5.4 更语义化的命名

复杂代码里可以不用短的 `T / K / V`，而是用更有意义的名字。

```ts
function pickProperty<ObjectType, Key extends keyof ObjectType>(
  obj: ObjectType,
  key: Key
): ObjectType[Key] {
  return obj[key];
}
```

可读性会更好。

---

## 6. 泛型类型：type 和 interface 也能泛型化

泛型不仅能用于函数，也能用于类型。

泛型类型的核心是：把“类型”当成参数传进去，让同一个 `type` 或 `interface` 模板在不同场景复用，同时保持类型之间的关联一致。

---

## 7. type 的泛型化

### 7.1 把字段类型参数化

```ts
type Box<T> = {
  value: T;
};

const a: Box<number> = { value: 1 };
const b: Box<string> = { value: 'hi' };
```

### 7.2 多个泛型参数

```ts
type Pair<T, U> = {
  left: T;
  right: U;
};

const pairValue: Pair<string, number> = {
  left: 'id',
  right: 1,
};
```

### 7.3 默认泛型参数

```ts
type ApiResponse<T = unknown> = {
  ok: boolean;
  data: T;
};

const response: ApiResponse = {
  ok: true,
  data: { any: 'thing' },
};
```

如果调用方不提供类型参数，`T` 默认是 `unknown`。

### 7.4 泛型约束

```ts
type WithId<T extends { id: string }> = T & {
  createdAt: string;
};

type User = {
  id: string;
  name: string;
};

const user: WithId<User> = {
  id: 'u1',
  name: 'A',
  createdAt: '2026-01-26',
};
```

`T extends { id: string }` 表示：传进来的类型必须至少有一个字符串类型的 `id`。

---

## 8. interface 的泛型化

### 8.1 基础写法

```ts
interface Result<T> {
  ok: boolean;
  data: T;
}

const result: Result<number> = {
  ok: true,
  data: 123,
};
```

### 8.2 多个参数和约束

```ts
interface Dictionary<K extends string | number | symbol, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
}
```

这里 `K` 被限制为可以作为对象 key 的类型。

### 8.3 可扩展接口

```ts
interface Page<T> {
  items: T[];
  total: number;
}

interface UserPage extends Page<{ id: string; name: string }> {
  pageSize: number;
}
```

`interface` 更适合定义对象形状、协议和可扩展结构。

---

## 9. type 和 interface 在泛型场景怎么选

优先使用 `interface` 的场景：

- 定义对象形状。
- 定义组件 props。
- 定义 DTO、Service 契约。
- 希望后续通过 `extends` 扩展。
- 希望 class 用 `implements` 实现。

优先使用 `type` 的场景：

- 需要联合类型。
- 需要交叉类型。
- 需要条件类型。
- 需要映射类型。
- 需要更强的类型组合能力。

比如 API 返回结果通常更适合用 `type`：

```ts
type ApiResponse<TData, TError = string> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };
```

分页结构通常可以用 `interface`：

```ts
interface Paginated<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

---

## 10. 工程里常见的泛型类型模板

### 10.1 API 返回

```ts
type ApiResponse<TData, TError = string> =
  | { ok: true; data: TData }
  | { ok: false; error: TError };
```

### 10.2 分页

```ts
interface Paginated<T> {
  list: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

### 10.3 表单字段模型

```ts
type Field<T> = {
  value: T;
  touched: boolean;
  error?: string;
};
```

泛型类型真正的价值不是“把 `any` 换成 `T`”，而是把多个位置绑定为同一个类型参数，让数据在输入、输出、字段、回调之间保持一致，避免错配。

---

## 11. 泛型参数默认值

当大多数情况下某个类型参数有默认类型时，可以给默认值。

```ts
type ApiResponse<T = { status: number }> = {
  data: T;
  isError: boolean;
};

const res1: ApiResponse = {
  data: { status: 200 },
  isError: false,
};

const res2: ApiResponse<User> = {
  data: user,
  isError: false,
};
```

`res1` 使用默认类型，`res2` 覆盖默认类型。

---

## 12. 日常开发中的泛型实践

泛型无处不在，你可能已经用过很多次。

```ts
const nums: Array<number> = [1, 2, 3];

async function fetchUser(): Promise<User> {
  // ...
}

const [name, setName] = useState<string>('');

const input = document.querySelector<HTMLInputElement>('.input');
```

React 组件里也经常会用泛型，比如通用列表组件。

```tsx
import React from 'react';

type ListProps<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
};

export function List<T>({ items, renderItem }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

type User = {
  id: number;
  name: string;
};

const users: User[] = [{ id: 1, name: 'Alice' }];

type Product = {
  sku: string;
  price: number;
};

const products: Product[] = [{ sku: 'X123', price: 99.9 }];

export function App() {
  return (
    <>
      <List<User>
        items={users}
        renderItem={user => <span>{user.name}</span>}
      />

      <List<Product>
        items={products}
        renderItem={product => (
          <span>
            {product.sku}: ${product.price}
          </span>
        )}
      />
    </>
  );
}
```

这段代码展示了泛型组件的核心价值：组件本身不绑定某一种数据结构，而是把数据类型作为参数传进来，从而在不同场景复用，同时保留完整的类型推断和 IDE 提示。

---

## 13. 泛型组件的核心逻辑

### 第一部分：ListProps<T> 是泛型 props

```ts
type ListProps<T> = {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
};
```

这里的 `T` 是一个类型占位符。它不是具体类型，只有在组件被使用时，才会被替换成 `User`、`Product` 之类的具体类型。

- `items: T[]` 表示：`items` 是某种类型 `T` 的数组。
- `renderItem: (item: T) => React.ReactNode` 表示：渲染函数必须接收同一种 `T` 类型的 item，并返回可渲染内容。

这保证了 `items` 和 `renderItem` 的输入类型永远匹配。你不可能传入 `User[]`，却在 `renderItem` 里把参数当成 `Product` 用。

### 第二部分：List<T> 是泛型组件

```ts
export function List<T>({ items, renderItem }: ListProps<T>) {
  // ...
}
```

这行的含义是：`List` 组件本身也带一个类型参数 `T`，并且它的 props 类型是 `ListProps<T>`。

在组件内部：

- `items.map(item => ...)` 时，`item` 的类型被推断为 `T`。
- `renderItem(item)` 里传入的 item 也必然是 `T`。

类型系统在这里起到了“贯穿式约束”的作用：`T` 从 props 入口一路传到组件内部所有相关位置，保证一致。

### 第三部分：如何使用

```tsx
<List<User>
  items={users}
  renderItem={user => <span>{user.name}</span>}
/>
```

此时 `T = User`，所以 `renderItem` 的参数 `user` 自动是 `User`。能访问 `user.name`，访问 `user.sku` 会报错。

```tsx
<List<Product>
  items={products}
  renderItem={product => (
    <span>
      {product.sku}: ${product.price}
    </span>
  )}
/>
```

此时 `T = Product`，所以 `product.sku`、`product.price` 都有提示，访问 `product.name` 会报错。

这就是泛型组件的收益：复用 UI 结构，但数据形状不固定，同时避免 `any` 和错误字段访问。

---

## 14. 泛型解决了什么痛点

| 场景 | 不使用泛型的问题 | 使用泛型的解决方案 |
| --- | --- | --- |
| 通用函数 | 使用 `any` 会失去类型安全 | 输入与输出类型动态关联 |
| 通用函数 | 使用联合类型会让返回值过宽 | 返回值随输入类型精确变化 |
| 通用数据结构 | 为每种数据类型创建重复类型 | 一个泛型模板复用多种类型 |
| 通用数据结构 | 使用 `any` 字段无法检查内部结构 | 泛型字段类型完全可知 |

泛型的核心不是炫技，而是保持类型关系。

---

## 15. 泛型命名建议

`T / U / K / V` 的优势是短。但当泛型参数超过一个，或者涉及约束、默认值、嵌套时，语义弱会显著降低可维护性。

更工程化的做法是使用“领域名词 + 角色”来命名。

### 集合 / 列表 / 分页类

常见命名：

- `Item`
- `Element`
- `Row`
- `Entity`
- `PageItem`
- `Cursor`

示例：

```ts
interface Page<Item> {
  items: Item[];
  total: number;
}
```

### 键值 / 映射 / 字典类

常见命名：

- `Key`
- `Value`
- `MapKey`
- `MapValue`
- `Id`
- `FieldName`
- `FieldValue`
- `PropertyKey`

示例：

```ts
type KV<Key, Value> = {
  key: Key;
  value: Value;
};

type IndexBy<Id, Entity> = Map<Id, Entity>;
```

### API / 网络请求类

常见命名：

- `Request`
- `Response`
- `RequestBody`
- `ResponseBody`
- `ResponseData`
- `ErrorData`
- `StatusCode`
- `Headers`
- `Query`
- `Params`

示例：

```ts
type ApiResult<ResponseData, ErrorData = { message: string }> =
  | { ok: true; data: ResponseData }
  | { ok: false; error: ErrorData };
```

### 函数 / 回调 / 中间件类

常见命名：

- `Input`
- `Output`
- `Args`
- `Result`
- `Return`
- `Context`
- `State`
- `Action`
- `Payload`
- `Next`
- `ErrorType`

示例：

```ts
type Mapper<Input, Output> = (input: Input) => Output;

type Reducer<State, Action> = (state: State, action: Action) => State;
```

### 业务领域类

业务项目里，最推荐把业务语义写进类型参数。

常见命名：

- `User`
- `Order`
- `Product`
- `UserDto`
- `OrderEntity`
- `DomainModel`
- `ViewModel`

示例：

```ts
interface Repository<Entity, Id> {
  findById(id: Id): Promise<Entity | null>;
}
```

### 数据结构 / 算法类

常见命名：

- `Node`
- `Edge`
- `Vertex`
- `Left`
- `Right`
- `From`
- `To`
- `Prev`
- `Next`

示例：

```ts
type Either<Left, Right> =
  | { kind: 'left'; value: Left }
  | { kind: 'right'; value: Right };
```

### 命名实用规则

- 只有一个泛型参数且语境明确时，`Item`、`Value`、`Data` 通常比 `T` 更清楚。
- 两个参数表达对应关系时，优先使用 `Key/Value`、`Input/Output`、`State/Action`。
- 三个以上参数时，一定用语义名，并配合默认值和约束，否则很难读。
- 避免与 TypeScript 内置工具类型或全局类型撞名，比如 `Record`、`Error`、`Map`。
- 公共库或 SDK 可以用更通用的 `Input/Output/Context`。
- 业务项目可以用领域词，比如 `User`、`Order`、`Product`。

---

## 16. 总结

泛型是 TypeScript 实现抽象和复用的核心能力。

它通过将类型参数化，帮助我们在保持编译时类型安全的前提下，写出更灵活、更少重复的代码。

初学者可以按这个顺序理解：

1. 先接受“类型参数”这个概念。
2. 从 `getFirstElement<T>` 这类简单函数开始。
3. 再理解多个泛型参数之间的关系。
4. 学会用 `extends` 做约束。
5. 再看泛型类型、泛型组件、条件类型、映射类型。

最重要的是：

> 泛型不是把 `any` 改成 `T`，而是让输入、输出、字段、回调之间的类型关系保持一致。

日常开发里，`Array<T>`、`Promise<T>`、`useState<T>`、`querySelector<T>`、泛型组件、API 响应类型、分页模型都在使用泛型。

掌握泛型之后，你会更容易写出既可复用又类型安全的 TypeScript 代码。
