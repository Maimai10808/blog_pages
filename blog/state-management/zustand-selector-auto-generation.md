# Zustand 为什么要用 Selector？顺便讲清楚如何自动生成 Selector

在 Zustand 里读取状态非常简单。

比如我们有一个猫咪计数 store：

```ts id="8byqpi"
import { create } from "zustand";

type CatStore = {
  cats: {
    bigCats: number;
    smallCats: number;
  };
  increaseBigCats: () => void;
  increaseSmallCats: () => void;
};

export const useCatStore = create<CatStore>((set) => ({
  cats: {
    bigCats: 0,
    smallCats: 0,
  },

  increaseBigCats: () =>
    set((state) => ({
      cats: {
        ...state.cats,
        bigCats: state.cats.bigCats + 1,
      },
    })),

  increaseSmallCats: () =>
    set((state) => ({
      cats: {
        ...state.cats,
        smallCats: state.cats.smallCats + 1,
      },
    })),
}));
```

组件里可以直接这样拿状态：

```tsx id="m3471d"
const store = useCatStore();
```

看起来很方便。

但在真实项目里，这种写法很容易带来一个问题：

**组件会订阅整个 store。**

只要 store 里任意状态发生变化，这个组件就可能重新渲染。

这就是 selector 要解决的问题。

---

## 一、问题从哪里来？

假设我们有一个组件 `CatBox`，它需要展示大猫和小猫数量：

```tsx id="zrw8px"
import { useCatStore } from "./cat-store";

export function CatBox() {
  const { cats, increaseBigCats, increaseSmallCats } = useCatStore();

  return (
    <div>
      <p>Random: {Math.random()}</p>

      <p>Big cats: {cats.bigCats}</p>
      <p>Small cats: {cats.smallCats}</p>

      <button onClick={increaseBigCats}>Add big cats</button>
      <button onClick={increaseSmallCats}>Add small cats</button>
    </div>
  );
}
```

这里用了 `Math.random()`，目的是观察组件是否发生了重渲染。

因为每次组件重新渲染，`Math.random()` 都会生成一个新数字。

这个组件用到了整个 store，所以当 `bigCats` 或 `smallCats` 变化时，它重渲染是合理的。

但如果另一个组件只需要 `bigCats` 呢？

---

## 二、只用一部分状态，却订阅了整个 store

比如新建一个 `CatBox2`，它只展示大猫数量：

```tsx id="kywe67"
import { useCatStore } from "./cat-store";

export function CatBox2() {
  const { cats } = useCatStore();

  return (
    <div>
      <p>Random: {Math.random()}</p>
      <p>Big cats: {cats.bigCats}</p>
    </div>
  );
}
```

这个组件只用到了：

```ts id="eoujs0"
cats.bigCats;
```

但它写的是：

```ts id="3dmubt"
const { cats } = useCatStore();
```

这意味着它订阅的是整个 store 返回结果。

此时如果点击：

```text id="d8xa7j"
Add small cats
```

按理说 `CatBox2` 不需要更新，因为它根本没有展示 `smallCats`。

但实际情况是，它也可能重新渲染。

因为它订阅得太宽了。

---

## 三、selector 是什么？

selector 本质上就是一个函数。

它从完整 store state 中挑出组件真正需要的那一小块状态。

比如：

```tsx id="m9ayte"
const bigCats = useCatStore((state) => state.cats.bigCats);
```

这里：

```ts id="ev6xq5"
(state) => state.cats.bigCats;
```

就是 selector。

它的意思是：

```text id="9ecxkg"
我这个组件只关心 cats.bigCats。
其他状态变化，不要影响我。
```

所以 `CatBox2` 可以改成：

```tsx id="amkc28"
import { useCatStore } from "./cat-store";

export function CatBox2() {
  const bigCats = useCatStore((state) => state.cats.bigCats);

  return (
    <div>
      <p>Random: {Math.random()}</p>
      <p>Big cats: {bigCats}</p>
    </div>
  );
}
```

现在再点击：

```text id="asv6dx"
Add big cats
```

`CatBox2` 会重渲染，因为它用到了 `bigCats`。

但点击：

```text id="u42b47"
Add small cats
```

`CatBox2` 不应该重渲染，因为它没有订阅 `smallCats`。

这就是 selector 的价值。

---

## 四、selector 解决的不是“能不能拿到状态”，而是“该不该重渲染”

不使用 selector 时：

```tsx id="ox0cfg"
const store = useCatStore();
```

组件拿到了很多东西，也订阅了很多东西。

使用 selector 后：

```tsx id="63tu7b"
const bigCats = useCatStore((state) => state.cats.bigCats);
```

组件只订阅一小块状态。

这两种写法都能拿到数据，但它们的渲染行为不一样。

可以这样理解：

```text id="4jhjpi"
不用 selector：整个仓库变化了，都通知我
使用 selector：只有我关心的货架变化了，再通知我
```

所以 selector 的核心作用是：

**减少不必要的重渲染。**

---

## 五、actions 也建议用 selector 拿

除了状态，store 里的函数也可以通过 selector 拿。

比如：

```tsx id="8o89iv"
const increaseBigCats = useCatStore((state) => state.increaseBigCats);
const increaseSmallCats = useCatStore((state) => state.increaseSmallCats);
```

这样组件只订阅这两个函数。

如果组件只是一个控制器，只负责按钮操作，不展示具体状态，就不应该因为 `bigCats` 或 `smallCats` 变化而重渲染。

例如：

```tsx id="3njq8m"
import { useCatStore } from "./cat-store";

export function CatController() {
  const increaseBigCats = useCatStore((state) => state.increaseBigCats);
  const increaseSmallCats = useCatStore((state) => state.increaseSmallCats);

  return (
    <div>
      <p>Random: {Math.random()}</p>

      <button onClick={increaseBigCats}>Add big cats</button>
      <button onClick={increaseSmallCats}>Add small cats</button>
    </div>
  );
}
```

这个组件不展示大猫和小猫数量，它只是触发 action。

所以点击按钮后，它自己不一定需要重新渲染。

这也是 selector 很实用的地方。

---

## 六、selector 写多了会不会很烦？

会。

如果每次都写：

```tsx id="7ag6ie"
const bigCats = useCatStore((state) => state.cats.bigCats);
const increaseBigCats = useCatStore((state) => state.increaseBigCats);
```

项目大了之后会有点重复。

所以 Zustand 官方文档里给了一个思路：**自动生成第一层 selector。**

实现后，你可以这样写：

```tsx id="jmtnbm"
const cats = useCatStore.use.cats();
const increaseBigCats = useCatStore.use.increaseBigCats();
```

注意后面有括号。

因为它们本质上是 hook 函数。

---

## 七、自动生成 selector 的工具函数

可以在 `utils/createSelectors.ts` 中写一个工具函数：

```ts id="2aoxdk"
import type { StoreApi, UseBoundStore } from "zustand";

type WithSelectors<S> = S extends { getState: () => infer T }
  ? S & {
      use: {
        [K in keyof T]: () => T[K];
      };
    }
  : never;

export function createSelectors<S extends UseBoundStore<StoreApi<object>>>(
  store: S,
) {
  const storeWithSelectors = store as WithSelectors<typeof store>;

  storeWithSelectors.use = {} as WithSelectors<typeof store>["use"];

  for (const key of Object.keys(store.getState())) {
    const typedKey = key as keyof ReturnType<typeof store.getState>;

    storeWithSelectors.use[typedKey] = (() =>
      store((state) => state[typedKey])) as never;
  }

  return storeWithSelectors;
}
```

这段代码做的事情并不复杂。

它接收一个 Zustand store，然后给这个 store 扩展一个 `use` 属性。

这个 `use` 属性里会自动生成第一层 key 对应的 selector hook。

比如 store 第一层有：

```ts id="4o40uv"
{
  (cats, increaseBigCats, increaseSmallCats);
}
```

生成后就可以使用：

```tsx id="9rzwkx"
useCatStore.use.cats();
useCatStore.use.increaseBigCats();
useCatStore.use.increaseSmallCats();
```

---

## 八、改造 catStore

原来是：

```ts id="e5rkcv"
export const useCatStore = create<CatStore>((set) => ({
  cats: {
    bigCats: 0,
    smallCats: 0,
  },

  increaseBigCats: () =>
    set((state) => ({
      cats: {
        ...state.cats,
        bigCats: state.cats.bigCats + 1,
      },
    })),

  increaseSmallCats: () =>
    set((state) => ({
      cats: {
        ...state.cats,
        smallCats: state.cats.smallCats + 1,
      },
    })),
}));
```

改成：

```ts id="57byne"
import { create } from "zustand";
import { createSelectors } from "./utils/createSelectors";

type CatStore = {
  cats: {
    bigCats: number;
    smallCats: number;
  };
  increaseBigCats: () => void;
  increaseSmallCats: () => void;
};

const useCatStoreBase = create<CatStore>((set) => ({
  cats: {
    bigCats: 0,
    smallCats: 0,
  },

  increaseBigCats: () =>
    set((state) => ({
      cats: {
        ...state.cats,
        bigCats: state.cats.bigCats + 1,
      },
    })),

  increaseSmallCats: () =>
    set((state) => ({
      cats: {
        ...state.cats,
        smallCats: state.cats.smallCats + 1,
      },
    })),
}));

export const useCatStore = createSelectors(useCatStoreBase);
```

现在调用第一层状态会更方便。

---

## 九、使用自动生成的 selector

如果要拿第一层的 `cats`：

```tsx id="dhl8w1"
const cats = useCatStore.use.cats();
```

如果要拿第一层的 action：

```tsx id="u17tq4"
const increaseBigCats = useCatStore.use.increaseBigCats();
const increaseSmallCats = useCatStore.use.increaseSmallCats();
```

比如 `CatController` 可以写成：

```tsx id="1ehim7"
import { useCatStore } from "./cat-store";

export function CatController() {
  const increaseBigCats = useCatStore.use.increaseBigCats();
  const increaseSmallCats = useCatStore.use.increaseSmallCats();

  return (
    <div>
      <p>Random: {Math.random()}</p>

      <button onClick={increaseBigCats}>Add big cats</button>
      <button onClick={increaseSmallCats}>Add small cats</button>
    </div>
  );
}
```

这个组件只拿 action，不拿具体状态。

所以 `bigCats` 或 `smallCats` 数值变化时，它不需要跟着重渲染。

---

## 十、自动 selector 的限制

这里有一个很重要的点：

**这个工具只能自动生成第一层 selector。**

比如 store 是这样：

```ts id="j7mv5o"
{
  cats: {
    bigCats: 0,
    smallCats: 0
  },
  increaseBigCats,
  increaseSmallCats
}
```

它能生成：

```tsx id="93szku"
useCatStore.use.cats();
useCatStore.use.increaseBigCats();
useCatStore.use.increaseSmallCats();
```

但不能直接生成：

```tsx id="pmo4n8"
useCatStore.use.bigCats();
useCatStore.use.smallCats();
```

因为 `bigCats` 和 `smallCats` 是第二层状态。

如果你这样写：

```tsx id="kd5bx9"
const cats = useCatStore.use.cats();
const bigCats = cats.bigCats;
```

那组件订阅的是整个 `cats` 对象。

只要 `cats.smallCats` 变化，`cats` 对象也可能变化，组件也会重新渲染。

所以如果组件只需要 `bigCats`，更推荐手写 selector：

```tsx id="5edngp"
const bigCats = useCatStore((state) => state.cats.bigCats);
```

或者你单独封装一个 hook：

```ts id="cnk5ab"
export function useBigCats() {
  return useCatStore((state) => state.cats.bigCats);
}
```

这一点很关键。

自动 selector 很方便，但它不是万能的。

---

## 十一、第一层状态设计会影响 selector 效果

因为自动生成的 selector 只能选择第一层，所以 store 的结构设计很重要。

如果你经常需要单独订阅 `bigCats` 和 `smallCats`，可以考虑把它们放到第一层：

```ts id="0c4nu6"
type CatStore = {
  bigCats: number;
  smallCats: number;
  increaseBigCats: () => void;
  increaseSmallCats: () => void;
};
```

这样自动 selector 就能直接生成：

```tsx id="9rma26"
const bigCats = useCatStore.use.bigCats();
const smallCats = useCatStore.use.smallCats();
```

但如果你想把相关状态组织在一起，也可以保留嵌套结构：

```ts id="2mmto6"
cats: {
  bigCats: number;
  smallCats: number;
}
```

只是这种情况下，第二层状态仍然需要手写 selector。

没有绝对正确，取决于你的业务。

但要记住：

```text id="zw5vd3"
经常被单独订阅的状态，尽量不要藏得太深。
```

---

## 十二、什么时候用自动 selector，什么时候手写 selector？

可以按这个规则判断。

### 适合自动 selector

适合选择第一层状态或 action：

```tsx id="4huvty"
const cats = useCatStore.use.cats();
const increaseBigCats = useCatStore.use.increaseBigCats();
```

尤其适合 action：

```tsx id="0otbfm"
const increaseBigCats = useCatStore.use.increaseBigCats();
```

因为 action 函数通常是稳定的，不会因为状态变化而变化。

---

### 适合手写 selector

适合选择深层状态：

```tsx id="4bwiar"
const bigCats = useCatStore((state) => state.cats.bigCats);
```

也适合选择计算后的局部值：

```tsx id="9na77m"
const totalCats = useCatStore(
  (state) => state.cats.bigCats + state.cats.smallCats,
);
```

或者封装成业务 hook：

```ts id="amemx2"
export function useBigCats() {
  return useCatStore((state) => state.cats.bigCats);
}

export function useTotalCats() {
  return useCatStore((state) => state.cats.bigCats + state.cats.smallCats);
}
```

---

## 十三、一个推荐使用方式

真实项目里，我更推荐这几种方式结合使用。

第一，action 可以用自动 selector：

```tsx id="u6g5lc"
const increaseBigCats = useCatStore.use.increaseBigCats();
```

第二，第一层简单状态可以用自动 selector：

```tsx id="e5wvf0"
const activeTab = useUiStore.use.activeTab();
```

第三，深层状态用手写 selector 或业务 hook：

```tsx id="auyrfq"
const bigCats = useCatStore((state) => state.cats.bigCats);
```

第四，高频状态一定要尽量选得细：

```tsx id="fn8qkx"
const lastPrice = useMarketStore((state) => state.tickerMap[symbol]?.close);
```

不要为了省事写：

```tsx id="nzoceh"
const tickerMap = useMarketStore.use.tickerMap();
```

然后在组件里取：

```tsx id="0g5n5a"
tickerMap[symbol].close;
```

因为这样组件订阅的是整个 `tickerMap`。

当其他交易对 ticker 变化时，也可能影响当前组件。

---

## 十四、总结

Zustand 里使用 selector 的核心目的不是让代码更花哨，而是减少不必要的重渲染。

直接写：

```tsx id="t0hfej"
const store = useCatStore();
```

意味着组件可能订阅整个 store。

更推荐写：

```tsx id="1lwc8c"
const bigCats = useCatStore((state) => state.cats.bigCats);
```

这样组件只关心自己需要的状态。

自动生成 selector 可以进一步简化第一层状态的调用：

```tsx id="r67dfn"
const increaseBigCats = useCatStore.use.increaseBigCats();
```

但它也有边界：

```text id="3lpa5c"
它只能自动生成第一层 selector。
深层状态仍然建议手写 selector 或封装业务 hook。
```

一句话总结：

**selector 是 Zustand 性能和可维护性的关键。能选小就不要选大，能订阅局部就不要订阅整个 store。**
