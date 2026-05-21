# 在 React 应用中使用 Zod 进行数据验证的全面教程与应用

在 React 项目里，数据验证经常被低估。很多时候我们会以为 TypeScript 已经写了类型，接口数据、表单输入、URL 参数、环境变量就天然安全了。但 TypeScript 只在编译时工作，真实运行时拿到的数据仍然可能是错的。

Zod 解决的就是这个问题：用一份 schema 同时描述数据结构、做运行时校验，并自动推导 TypeScript 类型。你可以把它理解成“数据的门卫 + 自动生成类型的说明书”。

这篇文章从基础概念讲起，再讲 Zod 的基本用法、错误处理、数据转换，以及它在 React 项目里的典型应用场景。

---

## 1. 什么是 Zod

Zod 是一个 TypeScript 优先的模式声明和验证库。

它主要有几个特点：

- **模式验证**：定义数据结构的形状，验证传入数据是否符合模式。
- **类型推断**：可以从 schema 自动推断 TypeScript 类型。
- **错误处理**：提供详细的验证错误信息。
- **支持 JS / TS**：虽然推荐与 TypeScript 配合使用，但也完全支持 JavaScript。

通俗地说，Zod 就像数据的“身份证扫描仪”。

假设你开了一家会员制俱乐部，每个会员都需要登记信息。

没有 Zod 的情况：

```txt
客人说：
我叫张三，25 岁，邮箱 zhangsan@qq.com

你直接记下来，相信他说的都是真的。

结果有人写：
年龄 250 岁
邮箱是乱七八糟的文字
名字是空字符串
```

系统很快就会混乱。

使用 Zod 的情况：

```txt
你在门口放了一台智能信息扫描仪：

- 名字必须是字符串
- 邮箱必须符合 xx@xx.com
- 年龄必须在 1 到 120 岁之间
- 数据全部通过才能进入系统
```

也就是说，你先用 Zod 写一份“规则”。之后任何数据进来，比如表单输入、接口返回、URL 参数、环境变量，都先交给它检查。符合规则就放行，不符合规则就告诉你哪里错了。

---

## 2. Zod 的基本用法

### 2.1 定义数据规则

先看一个比喻。

```ts
// 就像你立下俱乐部规矩：
const 会员规矩 = {
  名字: '必须是汉字，2-4 个字',
  年龄: '必须是 18-70 岁之间的数字',
  邮箱: '必须有 @ 和 .com',
  电话: '必须是 11 位数字',
};
```

Zod 就是执行这些规矩的“保安队长”。

实际写法是：

```ts
import { z } from 'zod';

const userSchema = z.object({
  firstName: z.string().optional(),
  email: z.string().email(),
  profileURL: z.string().url(),
  age: z.number().min(1),
  friends: z.array(z.string()).max(3),
  settings: z.object({
    isSubscribed: z.boolean(),
  }),
});
```

这段 schema 表示：

- `firstName` 是可选字符串。
- `email` 必须是邮箱格式。
- `profileURL` 必须是 URL。
- `age` 必须是数字，并且最小为 1。
- `friends` 是字符串数组，最多 3 个。
- `settings` 是嵌套对象，里面有布尔值 `isSubscribed`。

---

## 3. 自动类型推断

Zod 的类型推断指的是：你只写一份 schema，Zod / TypeScript 就能自动从这份 schema 推导出对应的 TypeScript 类型。

你不需要再手写一份重复的 `interface`。

```ts
const memberSchema = z.object({
  name: z.string().min(2).max(4),
  age: z.number().min(18).max(70),
});

type Member = z.infer<typeof memberSchema>;
```

`Member` 会自动变成：

```ts
type Member = {
  name: string;
  age: number;
};
```

如果以后你改了 schema，比如把 `age` 改成可选，或者新增字段，TypeScript 类型也会同步跟着变。

常见好处是：

- 避免“写两份定义”，一份类型、一份校验，最后两边不一致。
- 前后端共享同一份 schema 时，类型自动统一。
- 在表单、接口等场景里，类型提示更准确。
- 运行时校验和编译时类型来自同一个来源。

示例：

```ts
type User = z.infer<typeof userSchema>;

const user: User = {
  email: 'contact@example.com',
  profileURL: 'https://example.com',
  age: 20,
  friends: ['alice'],
  settings: {
    isSubscribed: true,
  },
};
```

---

## 4. 验证数据和错误处理

Zod 的验证本质上分两步：

1. 写规则，也就是 schema。
2. 拿数据去过规则，也就是 `parse` 或 `safeParse`。

两者区别：

- `parse()`：验证失败会直接 throw。
- `safeParse()`：不会 throw，而是返回 `{ success, data, error }`。

表单、接口、用户输入这类场景，更常用 `safeParse()`，因为你通常需要自己处理错误展示。

---

## 5. 基础验证示例

### A. 基本数据类型验证

```ts
import { z } from 'zod';

const nameSchema = z.string();
nameSchema.parse('张三');
// nameSchema.parse(123); // 报错：期望字符串，收到数字

const ageSchema = z.number().min(0).max(120);
ageSchema.parse(25);
// ageSchema.parse(-5); // 报错：数字不能小于 0

const isActiveSchema = z.boolean();
isActiveSchema.parse(true);
// isActiveSchema.parse('true'); // 报错：期望布尔值

const dateSchema = z.date();
dateSchema.parse(new Date());
// dateSchema.parse('2024-01-01'); // 报错：期望 Date
```

### B. 对象验证

```ts
const userSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().min(18).max(120).optional(),
  tags: z.array(z.string()).max(5),
  metadata: z.object({
    createdAt: z.date(),
    isVerified: z.boolean(),
  }),
});

const validUser = {
  id: 1,
  name: '张三',
  email: 'zhangsan@example.com',
  tags: ['vip', 'active'],
  metadata: {
    createdAt: new Date(),
    isVerified: true,
  },
};

userSchema.parse(validUser);

const invalidUser = {
  id: -1,
  name: 'A',
  email: 'not-an-email',
  tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6'],
};

// userSchema.parse(invalidUser); // 会抛出错误
```

### C. parse 和 safeParse 对比

```ts
const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  price: z.number().positive(),
});

const productData = {
  id: 1,
  name: '手机',
  price: -1000,
};

try {
  productSchema.parse(productData);
  console.log('验证通过');
} catch (error) {
  console.log('验证失败:', error);
}

const result = productSchema.safeParse(productData);

if (result.success) {
  console.log('验证通过:', result.data);
} else {
  console.log('验证失败:');
  result.error.issues.forEach(issue => {
    console.log(`${issue.path.join('.')}: ${issue.message}`);
  });
}
```

在较新的 Zod 版本中，推荐读取 `error.issues`。很多旧文章里会写 `error.errors`，实际项目里需要根据当前 Zod 版本确认。

### D. 异步验证

如果验证逻辑里需要调用异步函数，比如检查用户是否存在，可以使用 `parseAsync` 或 `safeParseAsync`。

```ts
const schema = z.object({
  userId: z.number(),
  username: z.string().refine(
    async value => {
      const exists = await checkUserExists(value);
      return exists;
    },
    { message: '用户不存在' }
  ),
});

async function validate(data: unknown) {
  return schema.parseAsync(data);
}
```

---

## 6. 自定义错误消息

Zod 可以给每条规则配置清晰的错误信息。

```ts
const orderSchema = z.object({
  orderId: z.string().uuid('订单 ID 必须是有效的 UUID'),

  items: z
    .array(
      z.object({
        productId: z.number(),
        quantity: z
          .number()
          .int('数量必须是整数')
          .min(1, '数量至少为 1'),
      })
    )
    .min(1, '订单至少包含一件商品'),

  shippingAddress: z.object({
    province: z.string(),
    city: z.string(),
    detail: z.string().min(5, '详细地址至少 5 个字符'),
  }),

  totalAmount: z
    .number()
    .positive('总金额必须大于 0')
    .refine(value => value < 1000000, {
      message: '单笔订单不能超过 100 万元',
    }),
});
```

验证失败后可以这样格式化错误：

```ts
const invalidOrder = {
  orderId: 'not-a-uuid',
  items: [],
  shippingAddress: {
    province: '北京',
    city: '北京市',
    detail: '某街道',
  },
  totalAmount: 2000000,
};

const result = orderSchema.safeParse(invalidOrder);

if (!result.success) {
  const userMessages = result.error.issues.map(issue => {
    const field = issue.path.join('.') || '表单';
    return `${field}: ${issue.message}`;
  });

  console.log(userMessages);
}
```

Zod 的错误信息通常包含：

- 错误 code。
- 错误路径 path。
- 错误 message。
- 期望类型或规则。
- 实际收到的值类型。

这比只提示“信息有误”更适合表单和 API 调试。

---

## 7. 数据转换和预处理

前端表单拿到的数据通常都是字符串，但业务逻辑需要数字、日期、数组等类型。Zod 可以用 `transform()` 和 `preprocess()` 做转换。

```ts
const formDataSchema = z.object({
  id: z.string().transform(value => parseInt(value, 10)),

  description: z
    .string()
    .optional()
    .transform(value => (value === '' ? undefined : value)),

  date: z.string().transform(value => new Date(value)),

  scores: z
    .string()
    .transform(value => value.split(',').map(Number))
    .refine(value => value.every(score => !Number.isNaN(score)), {
      message: '所有分数必须是数字',
    }),

  age: z.preprocess(value => {
    if (typeof value === 'string') {
      return parseInt(value, 10);
    }
    return value;
  }, z.number().min(0)),
});

const rawFormData = {
  id: '123',
  description: '',
  date: '2024-01-01',
  scores: '90,85,95',
  age: '25',
};

const parsedData = formDataSchema.parse(rawFormData);
```

解析后的结果会变成：

```ts
{
  id: 123,
  description: undefined,
  date: new Date('2024-01-01'),
  scores: [90, 85, 95],
  age: 25,
}
```

总结一下：

- `transform()`：验证后转换数据。
- `preprocess()`：验证前先预处理输入。
- `z.coerce.number()`：常用于把字符串数字转换成 number。

例如：

```ts
const schema = z.object({
  amount: z.coerce.number().positive(),
});
```

这在 React 表单里非常常见。

---

## 8. 在 React 中的实际应用场景

在 React 里用 Zod，最常见的不是“为了校验而校验”，而是把边界输入拦在 UI 或请求入口，保证后面的组件、状态、请求逻辑拿到的都是干净数据。

### 8.1 表单验证

用户输入是最容易出错的来源。你通常需要：

- 字段级校验：必填、长度、邮箱、密码强度。
- 提交级校验：两次密码一致、至少选择一个兴趣等。
- 友好错误展示：映射到每个 input 下方。

```ts
import { z } from 'zod';

const registerSchema = z
  .object({
    email: z.string().email('邮箱不合法'),
    password: z.string().min(8, '密码至少 8 位'),
    confirm: z.string(),
  })
  .refine(value => value.password === value.confirm, {
    path: ['confirm'],
    message: '两次密码不一致',
  });

const result = registerSchema.safeParse(formValues);

if (!result.success) {
  const fieldErrors = result.error.flatten().fieldErrors;
}
```

`error.flatten().fieldErrors` 很适合直接喂给表单组件展示。

如果项目使用 React Hook Form，可以配合 `@hookform/resolvers/zod`：

```ts
const form = useForm<RegisterFormValues>({
  resolver: zodResolver(registerSchema),
});
```

### 8.2 API 响应校验

即使你写了 TypeScript 类型，运行时仍可能拿到不符合类型的响应，比如后端改字段、灰度返回异常结构、网关返回错误 HTML。

Zod 可以让“解析失败”在请求层暴露，而不是把脏数据传进 UI。

```ts
const userDto = z.object({
  id: z.number(),
  name: z.string(),
  roles: z.array(z.string()),
});

const response = await fetch('/api/me');
const json = await response.json();

const parsed = userDto.safeParse(json);
if (!parsed.success) {
  throw new Error('Invalid /api/me response');
}

setUser(parsed.data);
```

这种做法尤其适合：

- 关键用户信息。
- 权限信息。
- 支付和订单数据。
- Web3 账户和资产数据。
- 后台管理中的核心实体。

### 8.3 环境变量和运行时配置校验

你以为有 `VITE_API_BASE`，结果线上漏配，页面直接白屏。用 Zod 可以在启动时就把问题暴露出来。

```ts
const envSchema = z.object({
  VITE_API_BASE: z.string().url(),
});

export const env = envSchema.parse(import.meta.env);
```

Next.js 项目也可以用同样思路验证 `process.env`。

```ts
const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
});

export const serverEnv = serverEnvSchema.parse(process.env);
```

### 8.4 复杂业务规则校验

例如：

- 金额必须是两位小数。
- 地址填写了省就必须填写市。
- 链上交易里 `gasLimit`、`slippage` 要在合理范围内。
- tokenIn 和 tokenOut 不能相同。

```ts
const swapSchema = z
  .object({
    amount: z.coerce.number().positive(),
    slippage: z.coerce.number().min(0).max(5),
    tokenIn: z.string().min(1),
    tokenOut: z.string().min(1),
  })
  .refine(value => value.tokenIn !== value.tokenOut, {
    message: '同币种不能互换',
    path: ['tokenOut'],
  });
```

复杂跨字段校验可以用 `refine()` 或 `superRefine()`。

---

## 9. Zod 的关键优势

### 9.1 类型安全和防御性编程

没有 Zod 时，你当然也可以自己写校验：

```ts
function validateUser(user: any) {
  if (!user) {
    throw new Error('用户不能为空');
  }
  if (typeof user.name !== 'string') {
    throw new Error('姓名必须是字符串');
  }
  if (user.name.length < 2) {
    throw new Error('姓名至少 2 个字符');
  }
  if (user.name.length > 50) {
    throw new Error('姓名最多 50 个字符');
  }
  if (typeof user.age !== 'number') {
    throw new Error('年龄必须是数字');
  }
  if (user.age < 0) {
    throw new Error('年龄不能为负数');
  }
}
```

问题是这些 `if` 会散落在很多地方，比如表单、请求、localStorage、URL 参数、组件 props。重复写、重复维护，而且规则一变很容易漏掉某个入口。

Zod 的方式是一次定义：

```ts
const userSchema = z.object({
  name: z.string().min(2).max(50),
  age: z.number().min(0).max(120),
  email: z.string().email(),
});

const result = userSchema.safeParse(realDataFromAPI);

if (!result.success) {
  console.log('发现错误：', result.error.issues);
}

type User = z.infer<typeof userSchema>;
```

它同时完成三件事：

- 运行时验证。
- TypeScript 类型推断。
- 统一错误信息管理。

### 9.2 错误早发现

坏的情况是错误数据层层传递，到最后才报错：

```txt
用户数据
  -> 业务逻辑 1
  -> 业务逻辑 2
  -> 数据库
  -> 报错
```

你很难知道是哪一步出了问题。

好的情况是在入口处就拦住：

```txt
用户数据
  -> Zod 验证失败
  -> 立即知道字段格式不对
```

### 9.3 灵活的验证规则

```ts
z.string().min(5).max(100);
z.string().email();
z.string().url();
z.number().min(0).max(100);
z.array(z.string()).nonempty();
```

可选、null、默认值也很好处理：

```ts
z.string().optional();
z.string().nullable();
z.string().nullish();
z.string().default('hello');
```

### 9.4 代码更简洁

以前可能是一堆验证函数：

```ts
function validateUser(user: unknown) {
  validateName(user);
  validateAge(user);
  validateEmail(user);
  validatePhone(user);
}
```

现在可以统一收敛：

```ts
const isValid = userSchema.safeParse(user).success;
```

---

## 10. Zod 和 TypeScript 的边界

TypeScript 只在编译时检查，运行时没有用。

比如：

```ts
interface User {
  name: string;
  age: number;
  email: string;
}

const user: User = {
  name: '张三',
  age: 25,
  email: 'xxx',
};
```

这段代码在编译阶段可能通过。

但真实接口返回的数据可能是：

```ts
const realDataFromAPI = {
  name: 123,
  age: '二十五',
  email: null,
};
```

TypeScript 不会自动帮你在运行时拦住它。

所以 Zod 的价值是：把 TypeScript 管不到的运行时边界补上。

常见边界包括：

- 用户表单输入。
- API 响应。
- localStorage 数据。
- URL query 参数。
- 环境变量。
- WebSocket / SSE 消息。
- 第三方 SDK 返回值。

---

## 11. 最佳实践建议

### 第一，推荐和 TypeScript 一起使用

Zod 不是必须配合 TypeScript，但配合 TypeScript 才能发挥最大价值。

推荐这样写：

```ts
export const profileSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(30),
});

export type Profile = z.infer<typeof profileSchema>;
```

不要 schema 写一份，type 再手写一份。

### 第二，schema 应该靠近业务边界

比如：

- 表单 schema 放在 feature 的 `schema.ts`。
- API response schema 放在请求层或 service 层。
- 环境变量 schema 放在 config / env 模块。
- WebSocket message schema 放在 realtime 模块。

### 第三，API 边界要验证

前端不要完全相信接口返回。

```ts
const data = await response.json();
const parsed = userSchema.parse(data);
```

这样组件拿到的就是已经验证过的数据。

### 第四，表单推荐结合 React Hook Form

Zod 很适合和 React Hook Form 搭配：

```ts
const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
});
```

这样字段校验、错误提示、提交状态可以统一管理。

### 第五，环境变量启动时校验

环境变量错误应该尽早暴露，而不是等用户访问页面后才出错。

```ts
export const env = envSchema.parse(import.meta.env);
```

### 第六，不要滥用复杂 transform

`transform()` 很强，但如果转换逻辑太复杂，会让 schema 难读。复杂业务转换可以放在单独函数里，schema 只做边界校验和必要转换。

---

## 12. 总结

Zod 的核心思想是：

> Write once, validate everywhere.

一次定义数据模式，就可以在多个层面获得一致的验证逻辑和类型安全，比如表单、API、环境变量、URL 参数、localStorage、WebSocket 消息等。

没有 Zod 时：

- 数据可能侵入系统深处才暴露问题。
- 错误定位困难。
- 每个地方都要重复写验证逻辑。
- TypeScript 只能管编译时，管不了运行时。

有了 Zod 后：

- 数据在入口处就能被校验。
- 错误信息更明确。
- schema 和类型来自同一个来源。
- 表单、接口、配置可以复用统一规则。
- 后续业务逻辑可以更放心地使用数据。

Zod 的价值不是“多写一层校验”，而是把不可信数据拦在边界之外，让 React 应用内部流动的数据更加干净、可预测、可维护。
