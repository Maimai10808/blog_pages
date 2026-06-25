# Zustand 最佳实践：别只会 create Store，真正项目里要这样组织状态

Zustand 是 React 生态里非常轻量的状态管理库。它上手很简单，不需要 Provider，不需要写一堆模板代码，也不像 Redux 那样有很强的约束。

一个最基础的 Zustand store 可能长这样：

```ts id="vt03c5"
import { create } from "zustand";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

type TodoStore = {
  todos: Todo[];
  isSubscribed: boolean;
  setTodos: (todos: Todo[]) => void;
};

export const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  isSubscribed: true,
  setTodos: (todos) => set({ todos }),
}));
```

然后在组件里使用：

```tsx id="h5588p"
const todos = useTodoStore((state) => state.todos);
```

这已经可以工作。

但问题是：**Zustand 太自由了。**

自由意味着你可以写得很简单，也意味着项目变大后很容易写乱。

这篇文章总结几个更适合真实项目的 Zustand 使用习惯。

---

## 一、不要直接导出原始 store hook

很多人会直接导出：

```ts id="dgqs11"
export const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  isSubscribed: true,
  setTodos: (todos) => set({ todos }),
}));
```

然后在各个组件里随便用：

```tsx id="eb72um"
const todos = useTodoStore((state) => state.todos);
const isSubscribed = useTodoStore((state) => state.isSubscribed);
```

这看起来没问题，但它有一个隐患：

**所有组件都可以随意订阅 store 的任何部分。**

更糟糕的是，有人可能会这样写：

```tsx id="bnctb3"
const state = useTodoStore();
```

这等于订阅了整个 store。

结果就是：

```text id="xfda0r"
todos 变了，组件重渲染
isSubscribed 变了，组件也重渲染
actions 变了，组件也可能受影响
```

在小项目里可能感受不明显，但在高频状态或复杂页面里，这会造成很多不必要的重渲染。

更推荐的做法是：**不直接导出原始 store hook，而是导出封装好的业务 hooks。**

---

## 二、只导出自定义 hooks

可以把原始 store hook 留在文件内部：

```ts id="5bosyg"
const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  isSubscribed: true,
  actions: {
    addTodo: (title) =>
      set((state) => ({
        todos: [
          ...state.todos,
          {
            id: crypto.randomUUID(),
            title,
            completed: false,
          },
        ],
      })),
  },
}));
```

然后只导出这些 hooks：

```ts id="tovk3s"
export function useTodos() {
  return useTodoStore((state) => state.todos);
}

export function useIsSubscribed() {
  return useTodoStore((state) => state.isSubscribed);
}

export function useTodoActions() {
  return useTodoStore((state) => state.actions);
}
```

组件使用时：

```tsx id="b7wyfs"
const todos = useTodos();
const { addTodo } = useTodoActions();
```

这样做有几个好处：

第一，组件不需要知道 store 内部结构。
第二，selector 逻辑集中在一个地方。
第三，可以避免误订阅整个 store。
第四，未来 store 结构调整时，不需要到处改组件。

一句话总结：

**组件不要直接摸 store，组件只调用你暴露出去的业务 hook。**

---

## 三、使用原子化、稳定的 selector

Zustand 默认使用严格相等比较，也就是 `Object.is`。
这意味着 selector 的返回值如果每次都是新引用，组件就会重新渲染。

比如下面这种写法不推荐：

```ts id="alh5ad"
export function useTodoViewModel() {
  return useTodoStore((state) => ({
    todos: state.todos,
    isSubscribed: state.isSubscribed,
  }));
}
```

看起来只是返回了两个字段，但问题是：

```ts id="6p49kh"
{
  todos: state.todos,
  isSubscribed: state.isSubscribed,
}
```

这个对象每次 selector 执行都会新建。

即使 `todos` 和 `isSubscribed` 都没变，这个对象的引用也变了。

结果就是组件可能发生不必要的重渲染。

更推荐拆成两个 hook：

```ts id="8ld9sk"
export function useTodos() {
  return useTodoStore((state) => state.todos);
}

export function useIsSubscribed() {
  return useTodoStore((state) => state.isSubscribed);
}
```

组件里分别使用：

```tsx id="b1ptdu"
const todos = useTodos();
const isSubscribed = useIsSubscribed();
```

这就是所谓的 **atomic selectors**，也就是原子化 selector。

它的原则是：

```text id="o7sion"
一个 selector 只取一小块稳定状态。
```

---

## 四、什么时候可以返回对象？

不是绝对不能返回对象。

如果你确实想一次取多个字段，可以使用 shallow 比较。

例如：

```ts id="a8p5n8"
import { useShallow } from "zustand/react/shallow";

export function useTodoViewModel() {
  return useTodoStore(
    useShallow((state) => ({
      todos: state.todos,
      isSubscribed: state.isSubscribed,
    })),
  );
}
```

`useShallow` 会比较对象里的每个字段，而不是只比较整个对象引用。

但在多数情况下，我更推荐直接拆成多个小 hook。

原因很简单：更直观，也更不容易误用。

---

## 五、把 state 和 actions 分开

store 里通常有两类东西：

```text id="6gpcw1"
state：状态数据
actions：修改状态的函数
```

例如：

```ts id="hmig9d"
type TodoState = {
  todos: Todo[];
  isSubscribed: boolean;
};

type TodoActions = {
  addTodo: (title: string) => void;
  removeTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  toggleSubscribed: () => void;
};

type TodoStore = TodoState & {
  actions: TodoActions;
};
```

然后创建 store：

```ts id="wzsm48"
const useTodoStore = create<TodoStore>((set) => ({
  todos: [],
  isSubscribed: true,

  actions: {
    addTodo: (title) =>
      set((state) => ({
        todos: [
          ...state.todos,
          {
            id: crypto.randomUUID(),
            title,
            completed: false,
          },
        ],
      })),

    removeTodo: (id) =>
      set((state) => ({
        todos: state.todos.filter((todo) => todo.id !== id),
      })),

    toggleTodo: (id) =>
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo,
        ),
      })),

    toggleSubscribed: () =>
      set((state) => ({
        isSubscribed: !state.isSubscribed,
      })),
  },
}));
```

再导出 hooks：

```ts id="8cg05g"
export function useTodos() {
  return useTodoStore((state) => state.todos);
}

export function useIsSubscribed() {
  return useTodoStore((state) => state.isSubscribed);
}

export function useTodoActions() {
  return useTodoStore((state) => state.actions);
}
```

这里 `useTodoActions` 返回的是一个对象，看起来违反了前面“不要返回对象”的规则。

但这个地方是可以接受的。

因为 `actions` 对象在 store 初始化时创建，后续不会频繁变化。
它是稳定引用，所以一般不会因为普通 state 更新导致组件重渲染。

---

## 六、不要写 setTodo，要写业务事件

一个常见坏习惯是把 action 写得太底层：

```ts id="8667x1"
setTodos: (todos) => set({ todos });
```

然后把业务逻辑放到组件里：

```tsx id="67ixyi"
function TodoInput() {
  const todos = useTodos();
  const { setTodos } = useTodoActions();

  function handleAdd(title: string) {
    setTodos([
      ...todos,
      {
        id: crypto.randomUUID(),
        title,
        completed: false,
      },
    ]);
  }

  return <button onClick={() => handleAdd("New Todo")}>Add</button>;
}
```

这会导致业务逻辑散落在组件中。

更推荐把 action 建模成业务事件：

```ts id="ey1q9k"
addTodo(title);
removeTodo(id);
toggleTodo(id);
toggleSubscribed();
```

组件只触发事件：

```tsx id="7vdisx"
function TodoInput() {
  const { addTodo } = useTodoActions();

  return <button onClick={() => addTodo("New Todo")}>Add</button>;
}
```

这样组件只负责交互，store 负责业务状态变化。

这点很重要。

因为当项目变大后，如果业务逻辑都写在组件里，状态会越来越难维护。

---

## 七、多个小 store 比一个巨大 store 更好维护

Zustand 没有强制你只能建一个 store。
真实项目里，更推荐按业务拆成多个小 store。

例如：

```text id="ai7go9"
todo-store.ts
user-store.ts
theme-store.ts
cart-store.ts
market-store.ts
order-store.ts
```

每个 store 只负责一个领域。

不要一开始就写一个超级 store：

```text id="4w9ju7"
app-store.ts
  todos
  user
  theme
  cart
  orders
  market
  wallet
  modal
  settings
```

这种 store 后期会变得很难维护。

以 Todo 为例，`isSubscribed` 其实就不一定应该放在 `todoStore` 里。
如果它表示用户订阅状态，更适合放到 `userStore` 或 `subscriptionStore`。

判断一个状态该放哪里，可以问自己：

```text id="p4wwvv"
这个状态属于哪个业务领域？
它会和哪些组件一起变化？
它是否会被其他业务模块复用？
```

---

## 八、Slice 模式和多个 store 怎么选？

Zustand 也支持 slice 模式。

也就是把多个 slice 合并到一个 store：

```text id="pbtg1c"
createTodoSlice
createUserSlice
createCartSlice
      ↓
useBoundStore
```

这种方式适合希望整个应用只有一个 store 的团队。

但很多情况下，我更推荐多个独立 store：

```text id="nzz197"
useTodoStore
useUserStore
useCartStore
```

原因是：

```text id="9l7q1z"
边界更清晰
文件更简单
测试更容易
不会把不相关状态放到一起
```

Slice 模式不是不好，只是它更适合大型团队或强规范项目。

中小型项目里，多个小 store 往往更直观。

---

## 九、什么时候用 middleware？

Zustand 的核心很轻，但可以通过 middleware 增强能力。

常见 middleware 有三个。

### 1. persist

用于把状态持久化到 localStorage。

适合：

```text id="j8vtkh"
主题设置
用户偏好
购物车
本地草稿
最近访问记录
```

示例：

```ts id="v3wqtb"
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ThemeStore = {
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
};

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: "light",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "theme-storage",
    },
  ),
);
```

---

### 2. devtools

用于接入 Redux DevTools，方便调试状态变化。

```ts id="dqcj6u"
import { devtools } from "zustand/middleware";

const useTodoStore = create<TodoStore>()(
  devtools((set) => ({
    todos: [],
    actions: {
      addTodo: (title) =>
        set(
          (state) => ({
            todos: [
              ...state.todos,
              {
                id: crypto.randomUUID(),
                title,
                completed: false,
              },
            ],
          }),
          false,
          "todo/addTodo",
        ),
    },
  })),
);
```

这样你可以在 DevTools 里看到 action 名称和状态变化。

---

### 3. immer

用于简化复杂不可变更新。

不用 immer 时：

```ts id="nfl2j4"
toggleTodo: (id) =>
  set((state) => ({
    todos: state.todos.map((todo) =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo,
    ),
  }));
```

使用 immer 后：

```ts id="efv4q8"
import { immer } from "zustand/middleware/immer";

const useTodoStore = create<TodoStore>()(
  immer((set) => ({
    todos: [],
    actions: {
      toggleTodo: (id) =>
        set((state) => {
          const todo = state.todos.find((item) => item.id === id);
          if (todo) {
            todo.completed = !todo.completed;
          }
        }),
    },
  })),
);
```

如果状态更新层级很深，immer 会让代码更好写。

---

## 十、一个推荐的 Zustand store 模板

真实项目里，可以参考这种结构：

```ts id="ubgmug"
import { create } from "zustand";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

type TodoState = {
  todos: Todo[];
};

type TodoActions = {
  addTodo: (title: string) => void;
  removeTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
};

type TodoStore = TodoState & {
  actions: TodoActions;
};

const useTodoStore = create<TodoStore>((set) => ({
  todos: [],

  actions: {
    addTodo: (title) =>
      set((state) => ({
        todos: [
          ...state.todos,
          {
            id: crypto.randomUUID(),
            title,
            completed: false,
          },
        ],
      })),

    removeTodo: (id) =>
      set((state) => ({
        todos: state.todos.filter((todo) => todo.id !== id),
      })),

    toggleTodo: (id) =>
      set((state) => ({
        todos: state.todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo,
        ),
      })),
  },
}));

export function useTodos() {
  return useTodoStore((state) => state.todos);
}

export function useTodoActions() {
  return useTodoStore((state) => state.actions);
}
```

组件中使用：

```tsx id="lx5ejn"
function TodoList() {
  const todos = useTodos();
  const { toggleTodo, removeTodo } = useTodoActions();

  return (
    <ul>
      {todos.map((todo) => (
        <li key={todo.id}>
          <button onClick={() => toggleTodo(todo.id)}>
            {todo.completed ? "Done" : "Todo"}
          </button>

          <span>{todo.title}</span>

          <button onClick={() => removeTodo(todo.id)}>Remove</button>
        </li>
      ))}
    </ul>
  );
}
```

组件不直接操作原始 store，也不自己拼业务逻辑。
它只读取状态、触发事件。

---

## 十一、Zustand 最佳实践总结

### 1. 不直接导出原始 store hook

避免组件随意订阅整个 store。

推荐：

```ts id="gu2tu7"
export function useTodos() {
  return useTodoStore((state) => state.todos);
}
```

---

### 2. 使用原子化 selector

一个 hook 只取一小块状态。

推荐：

```ts id="pvli73"
const todos = useTodos();
const isSubscribed = useIsSubscribed();
```

不推荐：

```ts id="7oqr0n"
const { todos, isSubscribed } = useTodoStore((state) => ({
  todos: state.todos,
  isSubscribed: state.isSubscribed,
}));
```

---

### 3. actions 和 state 分开

推荐：

```ts id="8klc31"
type Store = State & {
  actions: Actions;
};
```

---

### 4. actions 要像业务事件

推荐：

```ts id="i2dm8c"
addTodo();
removeTodo();
toggleTodo();
```

不推荐：

```ts id="s90b9z"
setTodos();
setState();
```

---

### 5. 多个小 store 优先于一个大 store

推荐：

```text id="2l6ayq"
todo-store
user-store
cart-store
market-store
```

不推荐所有状态都塞进：

```text id="97ai0m"
app-store
```

---

### 6. 按需使用 middleware

```text id="e02wmw"
persist：本地持久化
devtools：调试状态变化
immer：简化复杂不可变更新
```

---

## 十二、结论

Zustand 的优势是简单，但真正项目里不能只会 `create` 一个 store。

更推荐的写法是：

```text id="d7r6f1"
原始 store 不直接导出
只导出业务 hooks
selector 保持原子化
state 和 actions 分开
actions 按业务事件命名
多个小 store 分领域维护
需要时再加 middleware
```

一句话总结：

**Zustand 最容易写，但也最容易写散。想让它在项目变大后依然好维护，关键不是多写代码，而是控制 store 的边界、selector 的粒度和 action 的语义。**
