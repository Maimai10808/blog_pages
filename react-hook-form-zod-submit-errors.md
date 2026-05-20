# React Hook Form 项目落地：从受控表单、Zod 校验到异步提交错误处理

在 React 项目里，表单很容易被低估。登录表单、筛选表单、用户资料编辑、订单创建、后台配置页，看起来都只是几个 input 加一个 submit，但一旦进入真实业务，问题会立刻变多：字段越来越多、校验越来越复杂、提交需要 loading、接口可能返回业务错误、编辑页需要默认值、提交成功后还要刷新列表或跳转页面。

如果只是用 `useState` 手写表单，两个字段还可以接受；到了十几个字段、嵌套字段、动态字段、异步校验时，组件会迅速变成一坨状态管理代码。React Hook Form 解决的不是“少写几个 onChange”这么简单，而是把表单状态、字段注册、校验、错误、提交状态这些横切逻辑从组件里抽出去，让组件只关注业务输入和提交行为。

本文不写成 API 说明，而是按真实项目的方式讲：简单写法哪里能跑、哪里会失控，以及如何用 React Hook Form + Zod 做一套更适合项目维护的表单模块。

---

## 1. React 表单到底解决什么问题

表单本质上不是 UI 问题，而是一个局部业务状态管理问题。

一个完整的表单通常包含这些内容：字段值、字段校验、错误展示、默认值、提交状态、后端错误、重置逻辑、脏数据判断、禁用状态、异步提交和提交后的副作用。

React 原生当然可以写表单，但原生方案通常意味着你要自己维护所有状态。对于简单输入框，这没有问题；对于后台管理、用户系统、订单系统、内容发布系统，这种手写状态会导致组件越来越重。

React Hook Form 更适合这些场景：

- 用户登录、注册、修改资料。
- 后台管理里的新增、编辑表单。
- 订单创建、审批配置、筛选表单。
- 内容发布、草稿保存、富文本元信息配置。
- 需要和 Zod、Yup 等 schema 校验库集成的复杂表单。

它不适合所有场景。比如只有一个搜索框、一个简单确认弹窗、一个没有复杂校验的小输入组件，直接用 `useState` 更直接。不要为了使用库而使用库。

---

## 2. 最简单的写法是什么

最原始的 React 受控表单通常是这样：

```tsx
import {FormEvent, useState} from 'react';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: typeof errors = {};

    if (!email.includes('@')) {
      nextErrors.email = 'Email must include @';
    }

    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    console.log('submit', {email, password});
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <input
          value={email}
          onChange={event => setEmail(event.target.value)}
          placeholder="Email"
        />
        {errors.email && <p>{errors.email}</p>}
      </div>

      <div>
        <input
          value={password}
          onChange={event => setPassword(event.target.value)}
          placeholder="Password"
          type="password"
        />
        {errors.password && <p>{errors.password}</p>}
      </div>

      <button type="submit">Submit</button>
    </form>
  );
}
```

这段代码能跑，而且对于两个字段的小表单完全可以接受。

问题是，它没有真正解决“表单工程化”的问题。它只是把值、校验、错误、提交都写在一个组件里。当字段数量增加时，组件会持续膨胀。

---

## 3. 简单写法在真实项目中的问题

第一个问题是字段状态太分散。每增加一个字段，就要新增一个 `useState`、一个 `value`、一个 `onChange`，还要同步更新提交逻辑。字段少时问题不明显，字段多时会出现大量样板代码。

第二个问题是校验规则和组件耦合。比如邮箱校验、密码长度、手机号格式、确认密码、金额范围、日期区间，这些规则如果都写在组件里，后续复用和测试都很困难。

第三个问题是错误处理会失控。前端校验错误、后端业务错误、网络错误、表单级错误、字段级错误，这几类错误应该有清晰边界。手写表单时，很多人最后会把所有错误都塞进一个 `errorMessage`，导致 UI 展示和业务判断混在一起。

第四个问题是异步提交要手写 loading。你需要提交前 `setLoading(true)`，提交后 `setLoading(false)`，失败时还要处理错误，最后还要防止重复提交。简单登录表单还好，订单创建、内容发布这类复杂表单会很快变乱。

第五个问题是默认值和编辑场景不好维护。新增表单可以空值初始化，编辑表单需要从接口回填数据。字段一多，初始化逻辑、reset 逻辑、接口数据转换逻辑都会堆到组件里。

真实项目里的表单不应该让组件承担这么多职责。组件应该负责展示字段和触发提交，表单状态和校验应该被集中管理。

---

## 4. 推荐的项目落地结构

以“用户资料编辑表单”为例，目录可以这样设计：

```txt
src/
  features/
    profile/
      api.ts
      schema.ts
      types.ts
      components/
        ProfileForm.tsx
        ProfilePage.tsx
```

`api.ts` 只处理请求，比如获取用户资料、更新用户资料。它不关心 React Hook Form，也不关心 UI。

`schema.ts` 定义 Zod schema。这里是表单字段的类型来源，也是校验规则的集中位置。项目里不要把同一套字段类型在多个地方重复写。

`types.ts` 放业务实体类型。如果表单类型完全可以从 schema 推导，就不需要重复定义表单类型；但接口返回类型、领域模型类型可以放在这里。

`ProfileForm.tsx` 是表单组件，负责注册字段、展示错误、调用提交函数。它不应该直接散落复杂校验，也不应该在组件里拼接复杂请求逻辑。

`ProfilePage.tsx` 是页面容器，负责获取默认值、处理提交成功后的跳转或提示。这样表单组件可以复用于新增页、编辑页、弹窗等不同场景。

这个结构不大，但边界清楚：schema 管校验，api 管请求，form 管表单交互，page 管业务编排。

---

## 5. 推荐写法一：用 React Hook Form 管表单状态，用 Zod 管校验规则

先安装依赖：

```bash
npm install react-hook-form zod @hookform/resolvers
```

表单 schema 单独放在 `schema.ts` 中：

```ts
// src/features/profile/schema.ts
import {z} from 'zod';

export const profileFormSchema = z.object({
  email: z.string().email('请输入正确的邮箱地址'),
  displayName: z
    .string()
    .min(2, '昵称至少需要 2 个字符')
    .max(30, '昵称不能超过 30 个字符'),
  bio: z
    .string()
    .max(200, '个人简介不能超过 200 个字符')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
```

这里的关键点是：表单类型从 Zod schema 推导，而不是手动再写一份 interface。这样校验规则和 TypeScript 类型不会分裂。

然后写请求函数：

```ts
// src/features/profile/api.ts
import type {ProfileFormValues} from './schema';

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  bio?: string;
};

export async function getProfile(): Promise<UserProfile> {
  const response = await fetch('/api/profile');

  if (!response.ok) {
    throw new Error('获取用户资料失败');
  }

  return response.json();
}

export async function updateProfile(values: ProfileFormValues) {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(values),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? '更新用户资料失败');
  }

  return data;
}
```

请求函数不应该知道表单组件的存在。它只接收数据，返回结果，失败时抛出标准错误。

---

## 6. 推荐写法二：组件只消费表单能力，不承载复杂业务

React Hook Form 的核心入口是 `useForm`。字段通过 `register` 注册，提交通过 `handleSubmit` 接管，错误从 `formState.errors` 读取。

```tsx
// src/features/profile/components/ProfileForm.tsx
'use client';

import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {profileFormSchema, type ProfileFormValues} from '../schema';

type ProfileFormProps = {
  defaultValues?: Partial<ProfileFormValues>;
  onSubmit: (values: ProfileFormValues) => Promise<void>;
};

export function ProfileForm({defaultValues, onSubmit}: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting, isDirty},
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      email: defaultValues?.email ?? '',
      displayName: defaultValues?.displayName ?? '',
      bio: defaultValues?.bio ?? '',
    },
  });

  async function submit(values: ProfileFormValues) {
    try {
      await onSubmit(values);
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error ? error.message : '提交失败，请稍后再试',
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div>
        <label htmlFor="email">邮箱</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register('email')}
        />
        {errors.email?.message && <p role="alert">{errors.email.message}</p>}
      </div>

      <div>
        <label htmlFor="displayName">昵称</label>
        <input id="displayName" type="text" {...register('displayName')} />
        {errors.displayName?.message && (
          <p role="alert">{errors.displayName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="bio">个人简介</label>
        <textarea id="bio" rows={4} {...register('bio')} />
        {errors.bio?.message && <p role="alert">{errors.bio.message}</p>}
      </div>

      {errors.root?.message && <p role="alert">{errors.root.message}</p>}

      <button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? '保存中...' : '保存'}
      </button>
    </form>
  );
}
```

这段代码里有几个工程化点。

`resolver: zodResolver(profileFormSchema)` 把校验交给 Zod，而不是在每个 `register` 里手写 `required`、`minLength`、`pattern`。

`isSubmitting` 来自 React Hook Form，不需要自己维护 loading 状态。只要 `submit` 是 async function，React Hook Form 会自动管理提交中状态。

`setError('root')` 用于处理表单级错误，比如接口异常、权限不足、服务端拒绝提交。字段级错误应该落到具体字段上，非字段错误应该放到 root。

`isDirty` 可以判断用户是否修改过表单。编辑页里这很常用，可以避免用户没有修改也重复提交。

组件没有拼 URL，没有写 `fetch`，没有写复杂校验规则。它只消费表单能力和外部传入的 `onSubmit`。

---

## 7. 错误处理、异步提交、生命周期与缓存同步

在真实项目里，表单错误至少有三类。

第一类是前端字段校验错误，比如邮箱格式错误、密码太短、金额不能小于 0。这类错误适合放进 Zod schema。

第二类是后端字段错误，比如邮箱已被占用、用户名重复、验证码错误。这类错误应该通过 `setError('email')` 或 `setError('code')` 落到具体字段上。

第三类是后端业务错误，比如当前用户没有权限、资源已被删除、请求过于频繁。这类错误更适合 `setError('root')`，展示为表单级错误。

如果后端返回结构比较规范，比如：

```ts
type ApiErrorResponse = {
  message?: string;
  fieldErrors?: Partial<Record<keyof ProfileFormValues, string>>;
};
```

可以这样处理：

```ts
async function submit(values: ProfileFormValues) {
  try {
    await onSubmit(values);
  } catch (error) {
    const apiError = parseApiError<ProfileFormValues>(error);

    if (apiError.fieldErrors) {
      Object.entries(apiError.fieldErrors).forEach(([field, message]) => {
        if (message) {
          setError(field as keyof ProfileFormValues, {message});
        }
      });
      return;
    }

    setError('root', {
      message: apiError.message ?? '提交失败，请稍后再试',
    });
  }
}
```

错误标准化可以放到通用请求层，也可以放在具体 feature 的 `api.ts` 里。不要在每个表单组件里临时判断各种后端错误格式。

如果项目使用 React Query，表单提交成功后还需要做缓存同步。例如更新用户资料后，要刷新当前用户信息：

```tsx
'use client';

import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query';
import {getProfile, updateProfile} from '../api';
import {ProfileForm} from './ProfileForm';
import type {ProfileFormValues} from '../schema';

export function ProfilePage() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['profile']});
    },
  });

  if (profileQuery.isPending) {
    return <div>加载中...</div>;
  }

  if (profileQuery.isError) {
    return <div>用户资料加载失败</div>;
  }

  async function handleSubmit(values: ProfileFormValues) {
    await updateProfileMutation.mutateAsync(values);
  }

  return (
    <ProfileForm defaultValues={profileQuery.data} onSubmit={handleSubmit} />
  );
}
```

这里 React Hook Form 负责表单，React Query 负责服务端状态和缓存失效。不要把接口返回的用户资料再复制一份到 Zustand 或组件状态里，否则会出现两份数据源。

---

## 8. 结合真实业务：后台用户资料编辑页怎么落地

假设你在做一个后台管理系统，有一个“编辑用户资料”页面。

这个页面通常包含这些链路：

```txt
进入页面时请求用户详情
  -> 接口返回默认值
  -> 表单回填数据
  -> 用户修改字段
  -> 前端做基础校验
  -> 提交时按钮进入 loading
  -> 后端校验邮箱是否重复
  -> 成功后刷新用户详情和用户列表
  -> 失败时展示字段错误或表单错误
```

这里不应该让一个组件全部承担。比较合理的拆法是：

- `ProfilePage` 负责请求默认值和提交成功后的缓存同步。
- `ProfileForm` 负责字段注册、错误展示、提交状态。
- `profileFormSchema` 负责前端字段规则。
- `updateProfile` 负责接口调用。

如果还有用户列表页，更新成功后还可以同时刷新列表缓存：

```ts
onSuccess: () => {
  queryClient.invalidateQueries({queryKey: ['profile']});
  queryClient.invalidateQueries({queryKey: ['users']});
};
```

如果是订单创建表单，也类似。订单金额、收货地址、优惠券、备注、支付方式这些字段交给 React Hook Form；金额区间、地址必填、支付方式合法性用 Zod；提交订单接口失败后，如果是“库存不足”，可以放到 root；如果是“优惠券无效”，可以放到 coupon 字段；提交成功后刷新订单列表、购物车数量、账户余额。

这就是表单在真实项目里的位置：它不是孤立组件，而是业务链路的一环。

---

## 9. 完整代码示例：React Hook Form + Zod + React Query

下面给一个更完整的 TypeScript 示例，模拟“创建订单”的场景。这个例子更贴近真实业务：有 schema、api、form、page、提交后缓存同步。

先定义表单 schema：

```ts
// src/features/orders/schema.ts
import {z} from 'zod';

export const createOrderSchema = z.object({
  productId: z.string().min(1, '请选择商品'),
  quantity: z.coerce
    .number()
    .int('数量必须是整数')
    .min(1, '数量至少为 1')
    .max(99, '单次最多购买 99 件'),
  receiverName: z.string().min(2, '收货人姓名至少 2 个字符'),
  receiverPhone: z.string().regex(/^1[3-9]\d{9}$/, '请输入正确的手机号'),
  address: z.string().min(5, '请输入完整收货地址'),
  remark: z.string().max(100, '备注不能超过 100 个字符').optional(),
});

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>;
```

这里使用 `z.coerce.number()` 是因为 HTML input 的值默认是字符串。数量字段如果直接用 `z.number()`，需要额外处理类型转换；`coerce` 可以把输入转换为 number 后再校验。

然后定义接口：

```ts
// src/features/orders/api.ts
import type {CreateOrderFormValues} from './schema';

export type CreateOrderResponse = {
  orderId: string;
};

export class ApiError<TField extends string = string> extends Error {
  fieldErrors?: Partial<Record<TField, string>>;

  constructor(message: string, fieldErrors?: Partial<Record<TField, string>>) {
    super(message);
    this.name = 'ApiError';
    this.fieldErrors = fieldErrors;
  }
}

export async function createOrder(
  values: CreateOrderFormValues,
): Promise<CreateOrderResponse> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(values),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError<keyof CreateOrderFormValues & string>(
      data?.message ?? '创建订单失败',
      data?.fieldErrors,
    );
  }

  return data;
}
```

再封装 mutation：

```ts
// src/features/orders/mutations.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {createOrder} from './api';

export function useCreateOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['orders']});
      queryClient.invalidateQueries({queryKey: ['cart']});
    },
  });
}
```

这样组件不需要知道成功后该刷新哪些缓存。提交副作用集中在 mutation 层，更容易维护。

表单组件如下：

```tsx
// src/features/orders/components/CreateOrderForm.tsx
'use client';

import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {createOrderSchema, type CreateOrderFormValues} from '../schema';
import {ApiError} from '../api';

type CreateOrderFormProps = {
  productId: string;
  onSubmit: (values: CreateOrderFormValues) => Promise<void>;
};

export function CreateOrderForm({productId, onSubmit}: CreateOrderFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: {errors, isSubmitting, isDirty},
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      productId,
      quantity: 1,
      receiverName: '',
      receiverPhone: '',
      address: '',
      remark: '',
    },
  });

  async function submit(values: CreateOrderFormValues) {
    try {
      await onSubmit(values);
      reset({
        productId,
        quantity: 1,
        receiverName: '',
        receiverPhone: '',
        address: '',
        remark: '',
      });
    } catch (error) {
      if (error instanceof ApiError && error.fieldErrors) {
        Object.entries(error.fieldErrors).forEach(([field, message]) => {
          if (message) {
            setError(field as keyof CreateOrderFormValues, {message});
          }
        });
        return;
      }

      setError('root', {
        message:
          error instanceof Error ? error.message : '订单提交失败，请稍后再试',
      });
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <input type="hidden" {...register('productId')} />

      <div>
        <label htmlFor="quantity">购买数量</label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={99}
          {...register('quantity')}
        />
        {errors.quantity?.message && (
          <p role="alert">{errors.quantity.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="receiverName">收货人</label>
        <input id="receiverName" {...register('receiverName')} />
        {errors.receiverName?.message && (
          <p role="alert">{errors.receiverName.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="receiverPhone">手机号</label>
        <input id="receiverPhone" {...register('receiverPhone')} />
        {errors.receiverPhone?.message && (
          <p role="alert">{errors.receiverPhone.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="address">收货地址</label>
        <textarea id="address" rows={3} {...register('address')} />
        {errors.address?.message && <p role="alert">{errors.address.message}</p>}
      </div>

      <div>
        <label htmlFor="remark">备注</label>
        <textarea id="remark" rows={2} {...register('remark')} />
        {errors.remark?.message && <p role="alert">{errors.remark.message}</p>}
      </div>

      {errors.root?.message && <p role="alert">{errors.root.message}</p>}

      <button type="submit" disabled={isSubmitting || !isDirty}>
        {isSubmitting ? '提交中...' : '提交订单'}
      </button>
    </form>
  );
}
```

最后是页面容器：

```tsx
// src/features/orders/components/CreateOrderPage.tsx
'use client';

import {CreateOrderForm} from './CreateOrderForm';
import {useCreateOrderMutation} from '../mutations';
import type {CreateOrderFormValues} from '../schema';

type CreateOrderPageProps = {
  productId: string;
};

export function CreateOrderPage({productId}: CreateOrderPageProps) {
  const createOrderMutation = useCreateOrderMutation();

  async function handleCreateOrder(values: CreateOrderFormValues) {
    const result = await createOrderMutation.mutateAsync(values);
    console.log('订单创建成功', result.orderId);
  }

  return (
    <section>
      <h1>创建订单</h1>
      <CreateOrderForm productId={productId} onSubmit={handleCreateOrder} />
    </section>
  );
}
```

这个例子的核心不是 UI，而是边界：

- 表单组件只知道字段、错误和提交。
- mutation 知道缓存失效。
- api 知道请求。
- schema 知道校验。

后续字段增加、接口错误结构变化、缓存策略变化，都可以在对应位置修改，而不是把所有逻辑塞进一个组件。

---

## 10. 工程化注意事项

第一，不要把所有校验写在 JSX 的 `register` 参数里。`register('email', {required: true})` 适合很小的表单，但真实项目更推荐 schema 化。Zod schema 可以复用、推导类型，也更容易和后端契约对齐。

第二，不要重复定义表单类型。能从 `z.infer<typeof schema>` 推导，就不要再手写一份 `type FormValues = ...`。重复类型会在需求变化时产生不一致。

第三，不要只处理字段错误。后端返回的很多错误并不属于某个字段，比如权限不足、库存不足、订单状态已变化、当前账号被冻结。这类错误应该放到 root。

第四，不要忘记禁用提交按钮。异步提交期间如果允许重复点击，可能会产生重复订单、重复保存、重复请求。

第五，不要把接口请求直接写死在表单组件里。表单组件应该更关注表单本身，请求和缓存同步应该交给外层容器或 mutation hook。

第六，编辑表单要注意默认值更新。如果默认值来自异步请求，组件首次渲染时可能还没有数据。可以等数据加载完成再渲染表单，也可以在数据回来后调用 `reset`。不要假设 `defaultValues` 会随着 props 自动重新初始化。

第七，不要把所有表单都抽成高度通用组件。表单字段和业务强相关，过度抽象会降低可读性。可以抽通用的 `FormField`、`ErrorMessage`、`SubmitButton`，但不要把整个业务表单抽成难以理解的配置 JSON。

---

## 11. 总结

React Hook Form 的价值不在于让一个两字段表单少写几行代码，而在于它给复杂表单提供了一套稳定的状态模型：字段注册、校验、错误、提交状态、默认值、重置、后端错误接入，都有明确入口。

比较推荐的落地方式是：React Hook Form 管表单状态，Zod 管字段规则和类型推导，React Query 或页面容器管请求和缓存同步。这样拆分之后，组件不会被表单细节、接口细节和业务副作用同时污染。

在长期项目里，表单的复杂度通常是慢慢长出来的。一开始只是两个输入框，后面会有编辑回填、权限控制、字段联动、后端错误、提交后刷新列表。提前把 schema、api、mutation、form 这些边界划清楚，后续扩展会轻很多。
