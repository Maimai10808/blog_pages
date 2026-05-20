# React 多步骤表单工程化落地：从 Zod Schema、React Hook Form 到 Zustand 持久化

多步骤表单在业务系统里非常常见：开户注册、用户入驻、商家认证、简历填写、订单结算、风控问卷、后台配置向导，本质上都是“一个完整表单被拆成多个步骤”。

很多人第一次写多步骤表单，会直接在一个组件里维护一堆 `useState`，然后用 `step` 控制显示哪个表单。这个方案能跑，但一旦表单跨页面、需要刷新后恢复、需要校验前置步骤、需要最终统一提交，代码很快就会变得混乱。

这篇文章不讲一个玩具 Demo，而是按真实项目的方式复盘：多步骤表单应该怎么拆 schema、怎么管理跨页面数据、怎么做持久化、怎么处理刷新和用户直接访问中间步骤的问题。

---

## 1. 多步骤表单解决什么问题

多步骤表单的核心不是“把几个 input 分页展示”，而是把一个完整业务流程拆成多个可管理的局部表单。

比如一个用户 onboarding 流程：

- 第一步填写姓名信息。
- 第二步设置密码。
- 第三步填写用户名并勾选协议。
- 最后一次性提交给后端。

从数据角度看，它仍然是一个完整对象：

```ts
type OnboardingForm = {
  firstName: string;
  lastName: string;
  password: string;
  repeatPassword: string;
  username: string;
  terms: boolean;
};
```

只是从交互角度看，它被拆成了多个页面或者多个步骤。

它适合这些场景：

- 注册 / 入驻 / 认证流程。
- 结算流程。
- 后台配置向导。
- 表单字段很多，需要降低用户一次性填写压力。
- 每一步都有独立校验逻辑。
- 需要支持刷新后继续填写。

它不适合这些场景：

- 字段很少，直接一个表单即可。
- 步骤之间没有实际业务边界，只是为了“看起来高级”。
- 每一步数据强依赖服务端实时计算，这时可能更适合将每一步都设计成服务端状态机。

这里的关键点是：多步骤表单不只是 UI 问题，它同时涉及表单校验、跨步骤状态共享、路由跳转、数据持久化、最终提交、异常恢复。

---

## 2. 最简单的写法是什么

最简单的写法通常是：在父组件里维护一个 `step`，所有表单字段都放在同一个组件中。

```tsx
import {useState} from 'react';

type FormData = {
  firstName: string;
  lastName: string;
  password: string;
  username: string;
};

export function SimpleOnboardingForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    password: '',
    username: '',
  });

  function submit() {
    console.log(formData);
  }

  return (
    <div>
      {step === 1 && (
        <div>
          <input
            value={formData.firstName}
            onChange={event =>
              setFormData({...formData, firstName: event.target.value})
            }
            placeholder="First name"
          />
          <input
            value={formData.lastName}
            onChange={event =>
              setFormData({...formData, lastName: event.target.value})
            }
            placeholder="Last name"
          />
          <button onClick={() => setStep(2)}>Next</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <input
            value={formData.password}
            onChange={event =>
              setFormData({...formData, password: event.target.value})
            }
            placeholder="Password"
          />
          <button onClick={() => setStep(3)}>Next</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <input
            value={formData.username}
            onChange={event =>
              setFormData({...formData, username: event.target.value})
            }
            placeholder="Username"
          />
          <button onClick={submit}>Submit</button>
        </div>
      )}
    </div>
  );
}
```

这段代码可以跑，也适合理解多步骤表单的基本概念。但它不适合真实项目。

---

## 3. 简单写法在真实项目中的问题

这种写法最大的问题不是“不优雅”，而是边界不清。

第一，所有字段都堆在一个组件里。步骤越多，组件越长，校验逻辑、跳转逻辑、提交逻辑、UI 逻辑混在一起。后期想改某一步，会影响整个组件。

第二，没有标准化校验。真实项目里不能只靠 `required` 或手写 `if (!value)`。密码长度、两次密码一致、协议必须勾选、用户名格式，这些都应该有统一 schema，而不是散落在各个事件处理函数里。

第三，跨页面场景无法工作。如果你的步骤不是同一个组件里的条件渲染，而是 Next.js 里的多个页面，比如：

```txt
/onboarding/name
/onboarding/password
/onboarding/username
```

那么父组件的 `useState` 不能自然跨页面共享。

第四，刷新后数据丢失。用户填到第三步，刷新页面，内存状态全部清空。如果这是一个开户注册、商家认证、复杂问卷，这种体验不可接受。

第五，用户可以直接访问中间步骤。如果用户直接打开 `/onboarding/username`，但前面的姓名和密码都没有填，这时直接让他提交就是错误业务状态。

第六，最终提交时容易拼错数据。每一步各管各的数据，如果没有一个统一结构，最后很容易出现字段丢失、字段覆盖、类型不一致。

所以，多步骤表单真正要解决的是：每一步独立、整体一致、状态可恢复、路由可保护、最终可提交。

---

## 4. 推荐的项目落地结构

本文用一个 onboarding 流程举例。技术栈选择：

- Next.js App Router：负责多页面步骤路由。
- React Hook Form：负责每一步表单状态。
- Zod：负责统一 schema 和局部 schema。
- Zustand：负责跨页面共享表单草稿。
- Zustand persist：负责本地持久化。

推荐目录如下：

```txt
src/
  app/
    onboarding/
      name/
        page.tsx
      password/
        page.tsx
      username/
        page.tsx
  features/
    onboarding/
      schema.ts
      store.ts
      routes.ts
      guards.ts
      components/
        OnboardingNameForm.tsx
        OnboardingPasswordForm.tsx
        OnboardingUsernameForm.tsx
```

`app/onboarding/*/page.tsx` 只负责页面入口，不写复杂业务逻辑。

`schema.ts` 定义完整表单 schema，并通过 `pick` 派生每一步 schema。这样字段规则只有一个来源。

`store.ts` 保存跨步骤草稿数据，并通过 `persist` 写入 `localStorage`。

`routes.ts` 管理步骤路由，避免字符串路径散落在组件里。

`guards.ts` 判断当前步骤是否允许访问，比如没有姓名就不能进入密码页。

`components/` 放每一步表单组件。组件只负责当前步骤的表单渲染、校验、提交当前步骤数据、跳转下一步。

这个结构不大，但边界清楚。后续新增“上传头像”“填写公司信息”“邮箱验证”等步骤，只需要新增 schema pick、页面、组件和 guard，不需要重写整个流程。

---

## 5. 推荐写法一：用一个完整 Schema 管住整体数据

先定义完整 onboarding schema。

```ts
// src/features/onboarding/schema.ts
import {z} from 'zod';

export const onboardingSchema = z
  .object({
    firstName: z.string().min(1, '请输入名'),
    lastName: z.string().min(1, '请输入姓'),
    password: z
      .string()
      .min(8, '密码至少需要 8 位')
      .max(64, '密码不能超过 64 位'),
    repeatPassword: z.string().min(1, '请再次输入密码'),
    username: z
      .string()
      .min(3, '用户名至少需要 3 位')
      .max(20, '用户名不能超过 20 位')
      .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
    terms: z.boolean().refine(value => value === true, {
      message: '请先同意服务条款',
    }),
  })
  .refine(data => data.password === data.repeatPassword, {
    path: ['repeatPassword'],
    message: '两次输入的密码不一致',
  });

export type OnboardingData = z.infer<typeof onboardingSchema>;

export const onboardingNameSchema = onboardingSchema.pick({
  firstName: true,
  lastName: true,
});

export const onboardingPasswordSchema = onboardingSchema
  .pick({
    password: true,
    repeatPassword: true,
  })
  .refine(data => data.password === data.repeatPassword, {
    path: ['repeatPassword'],
    message: '两次输入的密码不一致',
  });

export const onboardingUsernameSchema = onboardingSchema.pick({
  username: true,
  terms: true,
});

export type OnboardingNameData = z.infer<typeof onboardingNameSchema>;
export type OnboardingPasswordData = z.infer<typeof onboardingPasswordSchema>;
export type OnboardingUsernameData = z.infer<typeof onboardingUsernameSchema>;
```

这里不要给每一步重复写一份 schema。真实项目里字段规则会变，比如用户名长度从 20 改成 30，如果每个步骤各写一份，很容易改漏。

主 schema 表示最终提交给后端的数据结构；局部 schema 表示每一步当前需要校验的字段。

---

## 6. 推荐写法二：用 Zustand 保存跨步骤草稿

多步骤表单的数据属于客户端流程状态，不是服务端缓存。它适合放在 Zustand 中。

```ts
// src/features/onboarding/store.ts
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import type {OnboardingData} from './schema';

type OnboardingDraft = Partial<OnboardingData>;

type OnboardingStore = {
  data: OnboardingDraft;
  setData: (data: OnboardingDraft) => void;
  reset: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    set => ({
      data: {},
      setData: partialData => {
        set(state => ({
          data: {
            ...state.data,
            ...partialData,
          },
        }));
      },
      reset: () => {
        set({data: {}});
      },
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

这里有几个关键点。

第一，`data` 使用 `Partial<OnboardingData>`，因为第一步提交后只会有 `firstName` 和 `lastName`，不能要求它一开始就是完整对象。

第二，`setData` 必须 merge，而不是直接覆盖。否则第二步提交 password 时，会把第一步的姓名覆盖掉。

错误写法如下：

```ts
setData: partialData => {
  set({data: partialData});
};
```

这会导致每一步只保留当前步骤的数据。

第三，使用 `persist` 后，数据会保存到 `localStorage`。用户刷新页面后，Zustand 会从 `localStorage` 重新 hydrate 状态。

---

## 7. 推荐写法三：集中管理路由和步骤守卫

不要在组件里到处写 `/onboarding/password` 这种字符串。

```ts
// src/features/onboarding/routes.ts
export const onboardingRoutes = {
  name: '/onboarding/name',
  password: '/onboarding/password',
  username: '/onboarding/username',
} as const;
```

然后定义每一步的访问条件。

```ts
// src/features/onboarding/guards.ts
import type {OnboardingData} from './schema';

type Draft = Partial<OnboardingData>;

export function canAccessPasswordStep(data: Draft) {
  return Boolean(data.firstName && data.lastName);
}

export function canAccessUsernameStep(data: Draft) {
  return Boolean(
    data.firstName &&
      data.lastName &&
      data.password &&
      data.repeatPassword,
  );
}
```

真实项目里 guard 可能更复杂。比如商家入驻流程里，进入“资质上传”之前必须完成“主体信息”；进入“提交审核”之前必须完成所有文件上传。这些逻辑应该集中放在 guard 里，而不是写在页面组件里。

---

## 8. 组件如何消费封装后的结果

每一步组件都遵循同一个模式：

- 使用局部 schema 初始化 React Hook Form。
- 从 Zustand 读取已有草稿作为默认值。
- 提交当前步骤时写入 Zustand。
- 跳转到下一步。
- 如果当前步骤依赖前置数据，则等待 persist hydration 后再做路由守卫。

先看第一步：姓名表单。

```tsx
// src/features/onboarding/components/OnboardingNameForm.tsx
'use client';

import {useRouter} from 'next/navigation';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {onboardingNameSchema, type OnboardingNameData} from '../schema';
import {useOnboardingStore} from '../store';
import {onboardingRoutes} from '../routes';

export function OnboardingNameForm() {
  const router = useRouter();
  const data = useOnboardingStore(state => state.data);
  const setData = useOnboardingStore(state => state.setData);

  const form = useForm<OnboardingNameData>({
    resolver: zodResolver(onboardingNameSchema),
    defaultValues: {
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
    },
  });

  function onSubmit(values: OnboardingNameData) {
    setData(values);
    router.push(onboardingRoutes.password);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label>First name</label>
        <input {...form.register('firstName')} />
        {form.formState.errors.firstName && (
          <p>{form.formState.errors.firstName.message}</p>
        )}
      </div>

      <div>
        <label>Last name</label>
        <input {...form.register('lastName')} />
        {form.formState.errors.lastName && (
          <p>{form.formState.errors.lastName.message}</p>
        )}
      </div>

      <button type="submit">下一步</button>
    </form>
  );
}
```

这个组件只关心当前步骤，不知道最终提交接口，也不关心其他步骤的 UI。它只负责把当前步骤的合法数据写入 store。

第二步：密码表单。

```tsx
// src/features/onboarding/components/OnboardingPasswordForm.tsx
'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {
  onboardingPasswordSchema,
  type OnboardingPasswordData,
} from '../schema';
import {useOnboardingStore} from '../store';
import {onboardingRoutes} from '../routes';
import {canAccessPasswordStep} from '../guards';

export function OnboardingPasswordForm() {
  const router = useRouter();
  const data = useOnboardingStore(state => state.data);
  const setData = useOnboardingStore(state => state.setData);
  const hasHydrated = useOnboardingStore.persist.hasHydrated();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!canAccessPasswordStep(data)) {
      router.replace(onboardingRoutes.name);
    }
  }, [hasHydrated, data, router]);

  const form = useForm<OnboardingPasswordData>({
    resolver: zodResolver(onboardingPasswordSchema),
    defaultValues: {
      password: data.password ?? '',
      repeatPassword: data.repeatPassword ?? '',
    },
  });

  function onSubmit(values: OnboardingPasswordData) {
    setData(values);
    router.push(onboardingRoutes.username);
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label>Password</label>
        <input type="password" {...form.register('password')} />
        {form.formState.errors.password && (
          <p>{form.formState.errors.password.message}</p>
        )}
      </div>

      <div>
        <label>Repeat password</label>
        <input type="password" {...form.register('repeatPassword')} />
        {form.formState.errors.repeatPassword && (
          <p>{form.formState.errors.repeatPassword.message}</p>
        )}
      </div>

      <button type="submit">下一步</button>
    </form>
  );
}
```

这里的关键点是 `hasHydrated`。

使用 Zustand persist 时，初始渲染时 store 可能还没有从 `localStorage` 恢复数据。如果你不等 hydration 完成，就直接判断 `data.firstName` 是否存在，那么刷新中间页面时会误判为空，导致用户被错误重定向回第一步。

第三步：用户名和协议表单，同时负责最终提交。

```tsx
// src/features/onboarding/components/OnboardingUsernameForm.tsx
'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {
  onboardingSchema,
  onboardingUsernameSchema,
  type OnboardingUsernameData,
} from '../schema';
import {useOnboardingStore} from '../store';
import {onboardingRoutes} from '../routes';
import {canAccessUsernameStep} from '../guards';

async function submitOnboarding(data: unknown) {
  const response = await fetch('/api/onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('提交失败，请稍后重试');
  }

  return response.json();
}

export function OnboardingUsernameForm() {
  const router = useRouter();
  const data = useOnboardingStore(state => state.data);
  const reset = useOnboardingStore(state => state.reset);
  const hasHydrated = useOnboardingStore.persist.hasHydrated();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!canAccessUsernameStep(data)) {
      router.replace(onboardingRoutes.name);
    }
  }, [hasHydrated, data, router]);

  const form = useForm<OnboardingUsernameData>({
    resolver: zodResolver(onboardingUsernameSchema),
    defaultValues: {
      username: data.username ?? '',
      terms: data.terms ?? false,
    },
  });

  async function onSubmit(values: OnboardingUsernameData) {
    setSubmitError(null);

    const mergedData = {
      ...data,
      ...values,
    };

    const parsed = onboardingSchema.safeParse(mergedData);

    if (!parsed.success) {
      setSubmitError('表单数据不完整，请返回前面步骤检查');
      router.replace(onboardingRoutes.name);
      return;
    }

    try {
      setIsSubmittingAll(true);
      await submitOnboarding(parsed.data);
      reset();
      router.push('/onboarding/success');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : '提交失败，请稍后重试',
      );
    } finally {
      setIsSubmittingAll(false);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div>
        <label>Username</label>
        <input {...form.register('username')} />
        {form.formState.errors.username && (
          <p>{form.formState.errors.username.message}</p>
        )}
      </div>

      <div>
        <label>
          <input type="checkbox" {...form.register('terms')} />
          我同意服务条款
        </label>
        {form.formState.errors.terms && (
          <p>{form.formState.errors.terms.message}</p>
        )}
      </div>

      {submitError && <p>{submitError}</p>}

      <button type="submit" disabled={isSubmittingAll}>
        {isSubmittingAll ? '提交中...' : '提交'}
      </button>
    </form>
  );
}
```

最后一步不要盲目相信 store 中的数据。即使前面每一步都校验过，最终提交前仍然应该用完整 schema 再校验一次。

原因很简单：`localStorage` 可以被用户清空、修改，代码版本也可能变化。最终提交前用 `onboardingSchema.safeParse` 做一次完整校验，是比较稳妥的边界检查。

---

## 9. 页面入口保持干净

Next.js 页面文件只负责渲染对应组件。

```tsx
// src/app/onboarding/name/page.tsx
import {OnboardingNameForm} from '@/features/onboarding/components/OnboardingNameForm';

export default function OnboardingNamePage() {
  return <OnboardingNameForm />;
}
```

```tsx
// src/app/onboarding/password/page.tsx
import {OnboardingPasswordForm} from '@/features/onboarding/components/OnboardingPasswordForm';

export default function OnboardingPasswordPage() {
  return <OnboardingPasswordForm />;
}
```

```tsx
// src/app/onboarding/username/page.tsx
import {OnboardingUsernameForm} from '@/features/onboarding/components/OnboardingUsernameForm';

export default function OnboardingUsernamePage() {
  return <OnboardingUsernameForm />;
}
```

这样页面层不会污染业务逻辑。后续如果要换 UI、加布局、加埋点，也不会影响核心表单逻辑。

---

## 10. 错误处理、重试、生命周期和持久化

多步骤表单的错误处理通常有三层。

第一层是字段校验错误。比如密码太短、用户名格式不合法、协议没有勾选。这一层交给 React Hook Form + Zod。

第二层是流程错误。比如用户直接访问第三步，但前两步没有数据。这一层交给 route guard。

第三层是提交错误。比如接口 500、网络断开、用户名已被占用。这一层应该在最终提交时处理。

一个更接近真实项目的提交函数可以这样写：

```ts
type ApiError = {
  message: string;
  fieldErrors?: Record<string, string>;
};

async function submitOnboarding(data: unknown) {
  const response = await fetch('/api/onboarding', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ApiError | null;
    throw new Error(error?.message ?? '提交失败，请稍后重试');
  }

  return response.json();
}
```

如果后端返回字段级错误，比如“用户名已存在”，可以把它写回 React Hook Form：

```ts
try {
  await submitOnboarding(parsed.data);
  reset();
  router.push('/onboarding/success');
} catch (error) {
  form.setError('username', {
    type: 'server',
    message: error instanceof Error ? error.message : '用户名不可用',
  });
}
```

但这只适合错误明确属于当前步骤字段。如果是前面步骤的数据错误，比如密码策略变化导致 password 不合法，更合理的做法是跳回对应步骤，让用户修正。

持久化方面，需要注意不要把敏感信息随便存在 `localStorage`。本文为了演示完整流程，把 password 也放进了 persist。但在真实项目中，密码、身份证号、银行卡号、密钥等敏感数据不应该长期持久化到 `localStorage`。

更稳妥的策略是：

- 普通 onboarding 信息可以持久化。
- 敏感字段只存在内存。
- 非常敏感的流程由服务端 draft id 管理。
- `localStorage` 中的数据设置版本号，schema 变化时可以清理旧数据。

Zustand persist 支持 `partialize`，可以只持久化部分字段。

```ts
export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    set => ({
      data: {},
      setData: partialData => {
        set(state => ({
          data: {
            ...state.data,
            ...partialData,
          },
        }));
      },
      reset: () => set({data: {}}),
    }),
    {
      name: 'onboarding-draft',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        data: {
          firstName: state.data.firstName,
          lastName: state.data.lastName,
          username: state.data.username,
          terms: state.data.terms,
        },
      }),
    },
  ),
);
```

这样密码不会进入 `localStorage`。代价是用户刷新后需要重新输入密码。这是安全性和体验之间的取舍。

---

## 11. 结合真实业务场景：商家入驻流程

把这个方案放到真实业务里，可以直接对应商家入驻流程。

比如：

- 第一步：主体信息，填写公司名称、联系人、手机号。
- 第二步：账号信息，设置登录邮箱和密码。
- 第三步：资质信息，上传营业执照、行业许可证。
- 第四步：确认提交，展示所有信息并提交审核。

工程上可以这样设计：

- 完整 schema 描述最终提交结构。
- 每一步通过 `schema.pick()` 或 `schema.omit()` 派生局部 schema。
- Zustand 保存草稿状态。
- 文件上传步骤不直接把 `File` 放进 persist，而是上传后保存 `fileId`。
- 每一步页面通过 guard 判断是否允许访问。
- 最终提交前用完整 schema 校验。
- 提交成功后 reset store 并清理本地草稿。

特别是文件上传场景，不要把 `File` 对象直接塞进 `localStorage`。正确做法通常是：文件一选择就上传到后端或对象存储，后端返回 `fileId`，表单草稿里只保存 `fileId`、文件名、文件大小、上传状态。

这个思路也适用于简历填写、贷款申请、Web3 KYC、后台配置向导。重点不是字段是什么，而是流程状态要可控。

---

## 12. 更完整的工程化版本

如果希望把逻辑再抽一层，可以提供一个自定义 hook，封装“获取草稿、更新草稿、重置草稿、检查 hydration”。

```ts
// src/features/onboarding/useOnboardingDraft.ts
import {useOnboardingStore} from './store';

export function useOnboardingDraft() {
  const data = useOnboardingStore(state => state.data);
  const setData = useOnboardingStore(state => state.setData);
  const reset = useOnboardingStore(state => state.reset);
  const hasHydrated = useOnboardingStore.persist.hasHydrated();

  return {
    data,
    setData,
    reset,
    hasHydrated,
  };
}
```

组件中就不需要直接知道 Zustand persist 的 API。

```ts
const {data, setData, hasHydrated} = useOnboardingDraft();
```

这类封装的价值在于：如果后续你从 `localStorage` 改成 `sessionStorage`，或者从 Zustand 改成服务端 draft API，组件层不需要大改。

也可以继续抽一个通用 guard hook：

```ts
// src/features/onboarding/useStepGuard.ts
'use client';

import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import type {OnboardingData} from './schema';

type Draft = Partial<OnboardingData>;

type UseStepGuardOptions = {
  data: Draft;
  hasHydrated: boolean;
  canAccess: (data: Draft) => boolean;
  fallbackPath: string;
};

export function useStepGuard({
  data,
  hasHydrated,
  canAccess,
  fallbackPath,
}: UseStepGuardOptions) {
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!canAccess(data)) {
      router.replace(fallbackPath);
    }
  }, [data, hasHydrated, canAccess, fallbackPath, router]);
}
```

然后在步骤组件里使用：

```ts
useStepGuard({
  data,
  hasHydrated,
  canAccess: canAccessPasswordStep,
  fallbackPath: onboardingRoutes.name,
});
```

这样每个步骤的生命周期逻辑更统一。

---

## 13. 工程化注意事项

多步骤表单最容易踩的坑，基本都集中在状态边界和生命周期上。

第一，不要每一步重复定义字段规则。完整 schema 应该是唯一数据契约，局部 schema 从完整 schema 派生。

第二，不要直接覆盖草稿数据。每一步提交时应该 merge 当前步骤数据，否则前面步骤的数据会丢失。

第三，不要忽略 persist hydration。使用 Zustand persist 时，中间步骤刷新后需要等待数据恢复，再判断是否跳转。

第四，不要把所有字段都无脑持久化。密码、证件号、银行卡、私钥、token 这类敏感数据不应该长期放在 `localStorage`。

第五，不要只在每一步校验。最终提交前仍然要用完整 schema 校验一次。

第六，不要把路由字符串散落在组件中。步骤多了以后，路径变更会非常难维护。

第七，不要让页面组件承载业务逻辑。页面入口应该薄，业务逻辑放到 feature 模块里。

第八，不要把多步骤表单当成纯 UI。它是一个小型流程状态机，需要考虑前置条件、草稿、恢复、提交、失败、清理。

---

## 14. 总结

多步骤表单的核心设计取舍，是把“完整数据结构”和“分步骤交互”分开处理。

完整数据结构由 Zod schema 统一定义；每一步表单通过局部 schema 只处理自己的字段；跨页面草稿由 Zustand 管理；刷新恢复由 persist 处理；路由访问通过 guard 控制；最终提交前再做一次完整 schema 校验。

这样写的好处是边界清楚：组件只负责当前步骤，store 只负责草稿状态，schema 只负责数据契约，guard 只负责流程合法性。业务复杂之后，这种拆法比一个大组件里塞满 `useState`、`if step === 1`、`if step === 2` 更稳定，也更适合团队协作。

真正上线的多步骤表单，往往还会接入服务端草稿、字段级错误回填、埋点、离开页面确认、文件上传、权限校验。但这些扩展都应该建立在清晰的基础结构上。先把 schema、状态、路由、提交边界拆干净，后面的复杂度才不会全部压到组件里。
