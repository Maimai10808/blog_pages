# Zustand persist 中间件详解：让 Store 状态刷新后不丢失

在 Zustand 中，我们已经可以通过 `create` 创建 Store，也可以借助 `immer` 简化复杂状态更新，借助 `devtools` 接入 Redux DevTools 调试状态变化。

但还有一个非常重要、实际项目里使用频率很高的中间件：

```ts
persist;
```

`persist` 的作用是：**把 Zustand Store 中的状态持久化保存下来，让页面刷新后状态不会丢失。**

本文将围绕 `persist` 讲清楚几个核心问题：

```text
1. 为什么 Zustand 状态刷新后会丢失
2. 如何使用 persist 保存 Store 状态
3. persist 默认把状态保存在哪里
4. 如何改成 sessionStorage
5. 如何只保存部分状态
6. clearStorage 和 reset 有什么区别
7. persist 和 devtools 一起用时怎么嵌套
```

---

## 一、为什么需要 persist？

先看一个简单场景。

页面上有两个状态：

```text
bears: 0
bigCats: 0
```

然后我们点击按钮：

```text
Add Bear
Add Bear
Add Cat
Add Cat
```

页面上显示：

```text
bears: 2
bigCats: 2
```

看起来一切正常。

但是一刷新页面，状态又变回：

```text
bears: 0
bigCats: 0
```

原因很简单：

**Zustand 默认把状态保存在内存中。**

只要页面刷新，JavaScript 运行环境会重新加载，Store 也会重新初始化，所以状态自然会回到默认值。

在一些业务中，这不是我们想要的结果。

例如：

```text
用户选择的主题
用户选择的语言
购物车数据
登录 token
用户基本信息
计价货币
侧边栏折叠状态
筛选条件
```

这些状态通常希望刷新后还能保留。

传统做法是手动使用：

```ts
localStorage.setItem();
localStorage.getItem();
sessionStorage.setItem();
sessionStorage.getItem();
```

但这样每次更新状态都要同步 storage，代码会变得非常繁琐。

Zustand 官方提供的 `persist` 中间件，就可以自动完成这件事。

---

## 二、persist 是什么？

`persist` 是 Zustand 官方中间件。

它可以自动把 Store 状态保存到浏览器 storage 中。

默认情况下，它保存到：

```text
localStorage
```

也就是说：

```text
状态变化时，persist 自动写入 localStorage
页面刷新时，persist 自动从 localStorage 恢复状态
```

我们不需要自己写 JSON 序列化和反序列化逻辑。

比如不需要手动写：

```ts
localStorage.setItem("bear-store", JSON.stringify(state));
```

也不需要手动写：

```ts
const state = JSON.parse(localStorage.getItem("bear-store") || "{}");
```

这些工作都由 `persist` 帮我们完成。

---

## 三、基础 Bear Store

先看一个没有持久化的 Store。

```ts
import { create } from "zustand";

type BearStore = {
  bears: number;
  addBear: () => void;
};

export const useBearStore = create<BearStore>((set) => ({
  bears: 0,
  addBear: () =>
    set((state) => ({
      bears: state.bears + 1,
    })),
}));
```

这个 Store 可以正常增加 `bears`。

但是刷新页面后，`bears` 会重新变成 `0`。

如果想让它刷新后保留，就需要加上 `persist`。

---

## 四、使用 persist 包裹 Store

`persist` 是中间件，所以用法和其他 Zustand 中间件类似：**把原来的 state creator 包起来。**

先导入：

```ts
import { persist } from "zustand/middleware";
```

然后改造 Store：

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type BearStore = {
  bears: number;
  addBear: () => void;
};

export const useBearStore = create<BearStore>()(
  persist(
    (set) => ({
      bears: 0,
      addBear: () =>
        set((state) => ({
          bears: state.bears + 1,
        })),
    }),
    {
      name: "bear-store",
    },
  ),
);
```

这里的核心是：

```ts
persist(
  (set) => ({
    bears: 0,
    addBear: () =>
      set((state) => ({
        bears: state.bears + 1,
      })),
  }),
  {
    name: "bear-store",
  },
);
```

`persist` 接收两个参数：

```text
第一个参数：原来的 Store 创建函数
第二个参数：persist 配置项
```

其中 `name` 是必须配置的。

---

## 五、name 配置有什么作用？

这里写了：

```ts
{
  name: "bear-store",
}
```

这个 `name` 会成为 storage 里的 key。

也就是说，Zustand 会把当前 Store 状态保存到 localStorage 的：

```text
bear-store
```

这个 key 下面。

打开浏览器开发者工具：

```text
Application
Local Storage
当前网站地址
```

可以看到类似内容：

```json
{
  "state": {
    "bears": 2
  },
  "version": 0
}
```

所以 `name` 要保持唯一。

如果多个 Store 使用同一个 `name`，它们的持久化数据可能互相覆盖。

推荐命名：

```ts
name: "bear-store";
name: "cat-store";
name: "user-storage";
name: "cart-storage";
```

---

## 六、persist 默认保存到 localStorage

当我们只写：

```ts
persist(
  (set) => ({
    bears: 0,
  }),
  {
    name: "bear-store",
  },
);
```

Zustand 默认会使用：

```text
localStorage
```

这意味着：

```text
刷新页面后，状态还在
关闭标签页后重新打开，状态通常还在
关闭浏览器后重新打开，状态通常也还在
```

所以 `localStorage` 更适合保存长期状态。

例如：

```text
主题偏好
语言偏好
登录 token
用户信息
计价货币
购物车
```

但如果某些状态只想在当前标签页会话中保留，就可以改用 `sessionStorage`。

---

## 七、把状态保存到 sessionStorage

如果想指定保存位置，需要使用：

```ts
createJSONStorage;
```

导入：

```ts
import { createJSONStorage, persist } from "zustand/middleware";
```

然后配置 `storage`：

```ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type BearStore = {
  bears: number;
  addBear: () => void;
};

export const useBearStore = create<BearStore>()(
  persist(
    (set) => ({
      bears: 0,
      addBear: () =>
        set((state) => ({
          bears: state.bears + 1,
        })),
    }),
    {
      name: "bear-store",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
```

核心代码是：

```ts
storage: createJSONStorage(() => sessionStorage);
```

这样状态就会保存到 `sessionStorage`。

`sessionStorage` 的特点是：

```text
刷新页面后仍然存在
当前标签页关闭后会被清除
不同标签页之间通常不共享
```

适合保存一些短期状态。

例如：

```text
当前会话中的临时表单
临时筛选条件
一次性流程状态
```

---

## 八、createJSONStorage 是做什么的？

浏览器的 `localStorage` 和 `sessionStorage` 只能保存字符串。

但 Zustand Store 通常是对象。

例如：

```ts
{
  bears: 2,
  color: "red",
  size: "big"
}
```

所以保存时需要：

```text
对象 → JSON 字符串
```

读取时需要：

```text
JSON 字符串 → 对象
```

`createJSONStorage` 就是帮我们做这层转换的工具。

例如：

```ts
storage: createJSONStorage(() => localStorage);
```

或者：

```ts
storage: createJSONStorage(() => sessionStorage);
```

如果你不写 `storage`，Zustand 默认就是类似 localStorage 的 JSON 存储。

---

## 九、默认会保存整个 Store

假设 Store 中不只有 `bears`，还有：

```ts
color: "red";
size: "big";
```

例如：

```ts
type BearStore = {
  bears: number;
  color: string;
  size: string;
  addBear: () => void;
};

export const useBearStore = create<BearStore>()(
  persist(
    (set) => ({
      bears: 0,
      color: "red",
      size: "big",
      addBear: () =>
        set((state) => ({
          bears: state.bears + 1,
        })),
    }),
    {
      name: "bear-store",
    },
  ),
);
```

默认情况下，`persist` 会把这些状态都保存起来。

也就是说 localStorage 中会有：

```json
{
  "state": {
    "bears": 0,
    "color": "red",
    "size": "big"
  },
  "version": 0
}
```

但实际项目中，我们经常不想保存全部状态。

这时候就要用 `partialize`。

---

## 十、使用 partialize 只保存部分状态

`partialize` 可以控制哪些状态被持久化。

例如，只保存 `bears`：

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type BearStore = {
  bears: number;
  color: string;
  size: string;
  addBear: () => void;
};

export const useBearStore = create<BearStore>()(
  persist(
    (set) => ({
      bears: 0,
      color: "red",
      size: "big",
      addBear: () =>
        set((state) => ({
          bears: state.bears + 1,
        })),
    }),
    {
      name: "bear-store",
      partialize: (state) => ({
        bears: state.bears,
      }),
    },
  ),
);
```

核心代码：

```ts
partialize: (state) => ({
  bears: state.bears,
});
```

意思是：

```text
虽然 Store 里有 bears、color、size
但真正写入 storage 的只有 bears
```

这样刷新页面后，`bears` 会恢复，`color` 和 `size` 不会从 storage 恢复。

---

## 十一、为什么需要 partialize？

实际业务中的 Store 往往会包含很多状态。

例如用户 Store：

```ts
type UserState = {
  token: string | null;
  userInfo: UserInfo | null;
  isLogin: boolean;
  pricing: PricingCurrency;
  loading: boolean;
  error: string | null;
};
```

并不是所有字段都应该持久化。

适合持久化：

```text
token
userInfo
isLogin
pricing
```

不适合持久化：

```text
loading
error
临时弹窗状态
请求中的状态
实时行情数据
```

所以我们可以写：

```ts
partialize: (state) => ({
  token: state.token,
  userInfo: state.userInfo,
  isLogin: state.isLogin,
  pricing: state.pricing,
});
```

这样可以避免把不该保存的状态写进 localStorage。

---

## 十二、排除某些字段的写法

有时候 Store 字段很多，只想排除一两个字段。

例如：保存除了 `size` 以外的所有状态。

可以用 `Object.entries` 过滤：

```ts
partialize: (state) =>
  Object.fromEntries(
    Object.entries(state).filter(([key]) => !["size"].includes(key)),
  ),
```

完整示例：

```ts
export const useBearStore = create<BearStore>()(
  persist(
    (set) => ({
      bears: 0,
      color: "red",
      size: "big",
      addBear: () =>
        set((state) => ({
          bears: state.bears + 1,
        })),
    }),
    {
      name: "bear-store",
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(([key]) => !["size"].includes(key)),
        ),
    },
  ),
);
```

不过在 TypeScript 项目中，这种写法有时类型不够精确。

如果字段不多，更推荐显式返回要保存的字段：

```ts
partialize: (state) => ({
  bears: state.bears,
  color: state.color,
});
```

可读性更好，也更安全。

---

## 十三、清空持久化存储：clearStorage

`persist` 还提供了一个方法：

```ts
useBearStore.persist.clearStorage();
```

它可以清除当前 Store 在 storage 中保存的数据。

例如组件中写：

```tsx
"use client";

import { useBearStore } from "./bearStore";

export function BearBox() {
  const bears = useBearStore((state) => state.bears);
  const addBear = useBearStore((state) => state.addBear);

  return (
    <div>
      <p>Bears: {bears}</p>

      <button onClick={addBear}>Add Bear</button>

      <button onClick={() => useBearStore.persist.clearStorage()}>
        Clear Storage
      </button>
    </div>
  );
}
```

点击 `Clear Storage` 后，localStorage 中的 `bear-store` 会被清掉。

但是这里有一个重点：

```text
clearStorage 只清除 storage，不会清除当前内存中的 Store 状态。
```

也就是说，假设当前页面显示：

```text
Bears: 2
```

你点击 `Clear Storage` 后，localStorage 中的持久化数据消失了，但页面上的 `bears` 仍然可能是 `2`。

因为内存中的 Store 还没有被重置。

---

## 十四、clearStorage 不等于 reset

`clearStorage` 和 `reset` 是两件事。

```text
clearStorage：清除 localStorage / sessionStorage 中的数据
reset：重置当前内存中的 Store 状态
```

如果你只是调用：

```ts
useBearStore.persist.clearStorage();
```

它不会自动执行：

```ts
set({ bears: 0 });
```

所以如果你真的想重置 Store，应该自己写一个 reset action。

---

## 十五、给 Store 添加 reset 方法

推荐先把初始状态抽出来：

```ts
const initialState = {
  bears: 0,
  color: "red",
  size: "big",
};
```

然后写 `reset`：

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type BearStore = {
  bears: number;
  color: string;
  size: string;
  addBear: () => void;
  reset: () => void;
};

const initialState = {
  bears: 0,
  color: "red",
  size: "big",
};

export const useBearStore = create<BearStore>()(
  persist(
    (set) => ({
      ...initialState,
      addBear: () =>
        set((state) => ({
          bears: state.bears + 1,
        })),
      reset: () => set(initialState),
    }),
    {
      name: "bear-store",
    },
  ),
);
```

这样就可以在组件中调用：

```tsx
const reset = useBearStore((state) => state.reset);

<button onClick={reset}>Reset State</button>;
```

如果想同时清除 storage 和内存状态，可以写：

```tsx
<button
  onClick={() => {
    useBearStore.persist.clearStorage();
    useBearStore.getState().reset();
  }}
>
  Clear Storage And Reset
</button>
```

这样才是真正意义上的“清空并恢复初始状态”。

---

## 十六、给 Cat Store 添加 persist

假设我们还有一个 Cat Store，之前用了 `devtools`：

```ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

type CatStore = {
  bigCats: number;
  smallCats: number;
  addBigCat: () => void;
  addSmallCat: () => void;
};

export const useCatStore = create<CatStore>()(
  devtools((set) => ({
    bigCats: 0,
    smallCats: 0,
    addBigCat: () =>
      set((state) => ({
        bigCats: state.bigCats + 1,
      })),
    addSmallCat: () =>
      set((state) => ({
        smallCats: state.smallCats + 1,
      })),
  })),
);
```

如果要加 `persist`，可以这样写：

```ts
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

type CatStore = {
  bigCats: number;
  smallCats: number;
  addBigCat: () => void;
  addSmallCat: () => void;
};

export const useCatStore = create<CatStore>()(
  persist(
    devtools((set) => ({
      bigCats: 0,
      smallCats: 0,
      addBigCat: () =>
        set((state) => ({
          bigCats: state.bigCats + 1,
        })),
      addSmallCat: () =>
        set((state) => ({
          smallCats: state.smallCats + 1,
        })),
    })),
    {
      name: "cat-store",
    },
  ),
);
```

这里 `persist` 包在外层，`devtools` 在内层。

这样刷新页面后，`bigCats` 和 `smallCats` 也可以被恢复。

---

## 十七、persist 和 devtools 的顺序

多个 Zustand 中间件一起使用时，顺序很重要。

常见写法是：

```ts
create<Store>()(
  persist(
    devtools((set) => ({
      // state and actions
    })),
    {
      name: "store-name",
    },
  ),
);
```

也就是：

```text
persist 在外层
devtools 在内层
```

这样既可以持久化状态，也可以保留 DevTools 调试能力。

如果你还使用 `immer`，可以根据项目类型和类型提示调整顺序，但原则是：

```text
让 TypeScript 类型不报错
让 devtools 能看到 action
让 persist 能正确保存最终状态
```

实际项目中，写完后建议重点检查：

```text
刷新页面后状态是否恢复
Redux DevTools 是否还能看到状态变化
localStorage / sessionStorage 中 key 是否正确
```

---

## 十八、完整 Bear Store 示例

下面是一个完整的 Bear Store，包含：

```text
persist
partialize
reset
clearStorage 可配合组件使用
```

```ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type BearStore = {
  bears: number;
  color: string;
  size: string;
  addBear: () => void;
  reset: () => void;
};

const initialState = {
  bears: 0,
  color: "red",
  size: "big",
};

export const useBearStore = create<BearStore>()(
  persist(
    (set) => ({
      ...initialState,
      addBear: () =>
        set((state) => ({
          bears: state.bears + 1,
        })),
      reset: () => set(initialState),
    }),
    {
      name: "bear-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        bears: state.bears,
        color: state.color,
      }),
    },
  ),
);
```

这个 Store 的效果是：

```text
bears 会被保存
color 会被保存
size 不会被保存
刷新页面后 bears 和 color 会恢复
reset 可以重置内存状态
clearStorage 可以清除本地存储
```

---

## 十九、组件中使用完整示例

```tsx
"use client";

import { useBearStore } from "./bearStore";

export function BearBox() {
  const bears = useBearStore((state) => state.bears);
  const addBear = useBearStore((state) => state.addBear);
  const reset = useBearStore((state) => state.reset);

  return (
    <div>
      <p>Bears: {bears}</p>

      <button onClick={addBear}>Add Bear</button>

      <button onClick={() => useBearStore.persist.clearStorage()}>
        Clear Storage
      </button>

      <button
        onClick={() => {
          useBearStore.persist.clearStorage();
          reset();
        }}
      >
        Clear Storage And Reset
      </button>
    </div>
  );
}
```

这里三个按钮分别负责：

```text
Add Bear：修改内存状态，同时 persist 自动同步到 storage
Clear Storage：只清除 storage，不改变当前页面内存状态
Clear Storage And Reset：清除 storage，同时重置当前 Store
```

---

## 二十、persist 适合保存哪些状态？

适合保存：

```text
登录 token
用户基本信息
主题模式
语言设置
计价货币
购物车
表单草稿
侧边栏折叠状态
用户偏好配置
```

不适合保存：

```text
loading
error
弹窗开关
接口临时状态
WebSocket / MQTT 实时数据
行情盘口
最新成交
动画状态
hover 状态
```

尤其是在交易系统里，像行情数据这类高频实时状态，不适合长期持久化：

```text
thumbMap
plateMap
tradeMap
```

它们应该来自接口或实时推送，而不是刷新后从 localStorage 恢复旧数据。

---

## 二十一、Next.js 中使用 persist 的注意点

如果你在 Next.js 项目中使用 Zustand persist，要注意：

```text
localStorage 和 sessionStorage 只存在于浏览器
服务端没有 window、document、localStorage
```

所以使用 persist 的 Store 通常给客户端组件使用。

如果页面初始渲染依赖持久化状态，可能会出现服务端默认状态和客户端恢复状态不一致的问题。

例如：

```text
服务端初始 isLogin = false
客户端从 localStorage 恢复 isLogin = true
```

这种场景下，可能需要增加 hydrated 标记，在 persist 恢复完成后再渲染强依赖状态的 UI。

不过普通用户偏好，例如主题、语言、计价货币，一般比较适合 persist。

---

## 二十二、常见踩坑总结

### 1. 忘记配置 name

`persist` 需要 `name`：

```ts
{
  name: "bear-store",
}
```

这个 name 是 storage 中的 key。

---

### 2. name 不唯一

不推荐：

```ts
persist(..., { name: "store" })
persist(..., { name: "store" })
```

推荐：

```ts
persist(..., { name: "bear-store" })
persist(..., { name: "cat-store" })
persist(..., { name: "user-storage" })
```

---

### 3. 误以为 clearStorage 会重置当前状态

错误理解：

```text
clearStorage = reset
```

正确理解：

```text
clearStorage 只清 storage
reset 才清当前内存状态
```

---

### 4. 不加 partialize，导致保存了太多状态

默认会保存整个 Store。

如果 Store 中有临时状态，建议使用：

```ts
partialize;
```

只保存真正需要恢复的字段。

---

### 5. 中间件嵌套顺序混乱

`persist` 和 `devtools` 一起用时，建议先采用：

```ts
persist(
  devtools((set) => ({
    // state
  })),
  {
    name: "store-name",
  },
);
```

写完后检查：

```text
状态是否能恢复
DevTools 是否正常
TypeScript 是否报错
```

---

## 二十三、总结

`persist` 是 Zustand 中非常实用的官方中间件。

它解决的核心问题是：

```text
页面刷新后 Store 状态丢失
```

最基础写法：

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useBearStore = create<BearStore>()(
  persist(
    (set) => ({
      bears: 0,
      addBear: () =>
        set((state) => ({
          bears: state.bears + 1,
        })),
    }),
    {
      name: "bear-store",
    },
  ),
);
```

常用配置：

```text
name：storage 中的唯一 key
storage：指定 localStorage / sessionStorage
partialize：只保存部分状态
clearStorage：清除持久化 storage
```

需要牢记：

```text
persist 默认保存到 localStorage
createJSONStorage 可以切换存储位置
partialize 可以控制保存哪些字段
clearStorage 不会重置内存状态
真正 reset 要自己写 action
多个中间件组合时要注意顺序
```

一句话总结：

**Zustand persist 可以自动把 Store 状态保存到浏览器存储中，让页面刷新后状态不丢失；但持久化不是越多越好，只应该保存真正需要恢复的业务状态。**
