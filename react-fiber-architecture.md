# React Fiber 深度解析：从卡顿到流畅的革命性架构升级

你以为 React 的流畅是魔法？不是。它背后是一场名为 Fiber 的底层架构升级。

在 React Fiber 出现之前，React 的旧协调器使用递归调用栈完成更新。一旦开始渲染，就必须一口气做完，中途无法被更高优先级任务打断。当页面里同时发生输入、动画、网络回包和大量组件更新时，主线程被占满，用户就会感到卡顿。

Fiber 的目标不是简单地“让计算更快”，而是让 React 更会安排事情：

> 把渲染工作拆成小块，按优先级调度，必要时暂停、继续或丢弃未提交的工作，从而优先保证输入和动画这类高优先级交互。

---

## 1. 为什么需要 Fiber：从一次卡顿说起

想象一个复杂 React 页面里有一个输入框，同时页面底部还有一个非常大的列表正在更新。

用户输入时，理想情况是：

- 输入立即响应。
- 光标不卡顿。
- 动画不掉帧。
- 低优先级列表更新可以稍后完成。

但旧版 React 的 Stack Reconciler 做不到这一点。

它的核心问题不是“算得慢”，而是：

> 一旦开始算，就不能停。

模拟旧版流程：

```ts
// src/react-fiber/stack-reconciler-example.ts
function oldRender() {
  processComponentA();
  processComponentB();
  processComponentC();
  processComponentD();
}
```

如果 `processComponentB()` 很耗时，后面的工作只能等。更糟糕的是，用户输入、点击、滚动和动画帧也只能等。

当一个大型更新需要 100ms 时，这 100ms 里：

- 用户输入被阻塞。
- 动画帧被跳过。
- 浏览器无法及时布局和绘制。
- 页面看起来卡住。

Fiber 要解决的正是这个问题。

---

## 2. Fiber 是什么：新的 Reconciler，而不是新 API

React 的更新工作主要分为两个角色。

### 2.1 Reconciler：协调器

Reconciler 负责计算：

> 从旧 UI 到新 UI，需要做哪些变更。

它会处理：

- 组件更新。
- 状态更新。
- 新旧树对比。
- 标记插入、删除、更新等副作用。

### 2.2 Renderer：渲染器

Renderer 负责落地：

- React DOM 把变更应用到浏览器 DOM。
- React Native 把变更应用到原生 UI。
- 自定义 renderer 可以把变更应用到 Canvas、CLI 或其他平台。

Fiber 是 React reconciler 的一次重写。它改变的是 React 更新的底层工作方式，而不是给开发者新增一个业务 API。

更准确地说：

> Fiber 是 React 用来支持可中断渲染、优先级调度、并发能力和双缓冲更新的数据结构与工作模型。

---

## 3. 旧架构的瓶颈：Stack Reconciler

旧架构的几个特点：

- 使用 JavaScript 调用栈递归遍历组件树。
- 更新过程同步执行。
- 中途无法暂停。
- 无法让高优先级任务插队。

概念上类似：

```ts
// src/react-fiber/recursive-render.ts
function renderNode(node: ReactNode) {
  updateCurrentNode(node);

  node.children.forEach((child) => {
    renderNode(child);
  });
}
```

递归调用的问题是：进了调用栈之后，React 无法优雅地说“我先暂停一下，等用户输入处理完再回来”。

这会导致：

- 动画掉帧。
- 用户输入延迟。
- 滚动卡顿。
- 大型更新阻塞主线程。

Fiber 的第一个关键改变，就是把“不可中断递归”改成“可控制的工作循环”。

---

## 4. Fiber 节点：从调用栈到链表结构

Fiber 引入了一种新的节点结构。每个 Fiber 节点都是一个普通 JavaScript 对象，表示组件树中的一个工作单元。

简化结构如下：

```ts
// src/react-fiber/fiber-node.ts
type FiberNode = {
  type: string | Function;
  stateNode: HTMLElement | unknown;

  child: FiberNode | null;
  sibling: FiberNode | null;
  return: FiberNode | null;

  alternate: FiberNode | null;

  flags: number;
  nextEffect: FiberNode | null;

  lanes: number;
  updateQueue: unknown;

  memoizedProps: unknown;
  memoizedState: unknown;
  pendingProps: unknown;
};
```

几个关键指针：

- `child`：指向第一个子节点。
- `sibling`：指向下一个兄弟节点。
- `return`：指向父节点。
- `alternate`：指向双缓冲中的另一棵树对应节点。

这套结构让 React 不再依赖 JavaScript 调用栈来记住“我走到哪里了”。

React 可以自己维护一个 `nextUnitOfWork` 指针：

- 做一个 Fiber。
- 判断是否该暂停。
- 有时间再继续。
- 高优先级任务来了可以先处理高优先级任务。

---

## 5. Work Loop：可中断的工作循环

Fiber 的核心是工作循环。

它把一次大型渲染拆成一个个工作单元，每次处理一个 Fiber。

```ts
// src/react-fiber/work-loop.ts
let nextUnitOfWork: FiberNode | null = null;

function workLoop(deadline: IdleDeadline) {
  while (nextUnitOfWork !== null && deadline.timeRemaining() > 1) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
  }

  if (nextUnitOfWork !== null) {
    requestIdleCallback(workLoop);
  } else {
    commitRoot();
  }
}
```

`performUnitOfWork` 的遍历方式是深度优先。

```ts
// src/react-fiber/perform-unit-of-work.ts
function performUnitOfWork(fiber: FiberNode) {
  beginWork(fiber);

  if (fiber.child) {
    return fiber.child;
  }

  let nextFiber: FiberNode | null = fiber;

  while (nextFiber) {
    completeWork(nextFiber);

    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }

    nextFiber = nextFiber.return;
  }

  return null;
}
```

这就是 Fiber 能可中断的底层原因：

> React 不再被 JS 调用栈牵着走，而是自己掌控遍历进度。

---

## 6. Render Phase 和 Commit Phase

为了既能中断，又不让 UI 出现半更新状态，Fiber 把一次更新拆成两个阶段。

### 6.1 Render Phase：可中断、可重启

Render Phase 也叫 Reconciliation Phase。

它做的是“计算”：

- 遍历 Fiber 树。
- 计算新状态。
- 调用组件函数或类组件 render。
- 构建 work-in-progress tree。
- 收集副作用。

这个阶段不会修改真实 DOM，所以可以被中断、重启、丢弃。

如果低优先级渲染还没 commit，高优先级更新来了，React 可以丢弃当前未提交的计算，先处理高优先级任务。

### 6.2 Commit Phase：不可中断、同步提交

Commit Phase 做的是“落地”：

- 执行 DOM 插入、删除、更新。
- 更新 refs。
- 执行类组件生命周期。
- 执行 layout effects。
- 安排 passive effects。

这个阶段必须同步完成，不能中断。

原因很简单：真实 UI 一旦开始修改，就不能只更新一半，否则用户会看到不一致状态。

概念代码：

```ts
// src/react-fiber/two-phase-render.ts
function reconcilePhase(root: FiberNode) {
  const effectList = buildWorkInProgressTree(root);
  return effectList;
}

function commitPhase(effectList: FiberNode[]) {
  effectList.forEach((effect) => {
    applyHostMutation(effect);
  });
}
```

Render Phase 负责算，Commit Phase 负责做。

---

## 7. 优先级系统：让重要任务先执行

仅仅“可中断”还不够。React 还需要知道哪些任务更重要。

用户输入、点击、动画应该尽快响应；后台数据刷新、日志上报、离屏内容预渲染可以延后。

早期可以把优先级理解为几类：

```ts
// src/react-fiber/priority-levels.ts
const PriorityLevels = {
  synchronous: 0,
  task: 1,
  animation: 2,
  high: 3,
  low: 4,
  offscreen: 5,
};
```

现代 React 内部使用 lane 模型表达更细的优先级和批次，但核心思想一样：

> 不同更新有不同优先级，高优先级更新可以打断低优先级工作。

例如：

```ts
// src/react-fiber/priority-preemption.ts
function onUserClick() {
  interruptCurrentLowPriorityWork();

  performHighPriorityUpdate(() => {
    markButtonActive();
  });

  resumeLowPriorityWork();
}
```

这就是 Fiber 改善流畅度的关键：

- 先保证交互。
- 再补齐次要更新。
- 未提交的低优先级工作可以重算或丢弃。

---

## 8. 时间分片：把大任务拆小

Fiber 通过时间分片避免长时间占用主线程。

概念上，React 会在一小段时间内处理一些 Fiber，然后检查是否应该让出主线程。

```ts
// src/react-fiber/time-slicing.ts
function scheduleWork(priority: number) {
  if (priority === PriorityLevels.animation) {
    requestAnimationFrame(performAnimationWork);
    return;
  }

  if (priority >= PriorityLevels.low) {
    requestIdleCallback((deadline) => {
      workLoop(deadline);
    });
    return;
  }

  scheduleImmediateWork(performHighPriorityWork);
}
```

需要说明的是，真实 React 的调度实现已经不简单依赖原生 `requestIdleCallback`，而是有自己的 Scheduler 包。但理解层面可以先把它看作：

> React 会在浏览器有空时继续处理低优先级工作，在高优先级事件到来时让出主线程。

---

## 9. 双缓冲：current 和 workInProgress

Fiber 维护两棵树：

- `current tree`：当前屏幕上真实生效的 Fiber 树。
- `workInProgress tree`：Render Phase 正在计算的新树。

Render Phase 只修改 `workInProgress`，不会动 `current`。

Commit 完成后，React 交换指针：

```ts
// src/react-fiber/double-buffering.ts
let currentTree = rootFiber;
let workInProgressTree = createWorkInProgress(currentTree);

function updateComponent() {
  workInProgressTree = performWorkOnTree(workInProgressTree);
  commitRoot();
}

function commitRoot() {
  applyDomChanges();

  const previousTree = currentTree;
  currentTree = workInProgressTree;
  workInProgressTree = prepareForNextUpdate(previousTree);
}
```

这和图形渲染里的双缓冲思想类似：

- 前台显示当前帧。
- 后台准备下一帧。
- 准备完后一次性交换。

双缓冲的好处：

- 不会出现半更新 UI。
- 未提交的 work 可以安全丢弃。
- Fiber 节点可以复用，减少内存分配和 GC 压力。

---

## 10. 一个完整例子：数字列表更新

来看一个简单组件：

```tsx
// src/components/NumberList.tsx
import { useState } from 'react';

export function NumberList() {
  const [numbers, setNumbers] = useState([1, 2, 3]);

  const squareNumbers = () => {
    setNumbers((items) => items.map((item) => item * item));
  };

  return (
    <div>
      <button onClick={squareNumbers}>平方</button>

      {numbers.map((number) => (
        <Item key={number} number={number} />
      ))}
    </div>
  );
}

function Item({ number }: { number: number }) {
  return <div className="item">{number}</div>;
}
```

初始 Fiber 树可以简化为：

```text
HostRootFiber
  └── NumberListFiber
        └── divFiber
              ├── buttonFiber
              └── FragmentFiber
                    ├── ItemFiber(number=1)
                    ├── ItemFiber(number=2)
                    └── ItemFiber(number=3)
```

点击“平方”后：

1. `setNumbers` 创建更新对象。
2. 更新进入 `NumberListFiber` 的 update queue。
3. Scheduler 判断这次更新优先级。
4. React 开始构建 work-in-progress tree。
5. `NumberList` 重新执行，得到 `[1, 4, 9]`。
6. React 对比旧 children 和新 children。
7. 标记需要更新的 Fiber。
8. 构建 effect list。
9. Commit Phase 更新真实 DOM。

---

## 11. Fiber 树的节点关系

这个例子里的 Fiber 节点关系可以展开理解：

```text
HostRootFiber
  child -> NumberListFiber
  return -> null
  stateNode -> div#root

NumberListFiber
  type -> NumberList
  child -> divFiber
  return -> HostRootFiber
  memoizedState -> useState 对应的 Hook 状态

divFiber
  type -> 'div'
  stateNode -> <div>
  child -> buttonFiber
  return -> NumberListFiber

buttonFiber
  type -> 'button'
  stateNode -> <button>平方</button>
  sibling -> FragmentFiber
  return -> divFiber

FragmentFiber
  child -> ItemFiber1
  return -> divFiber

ItemFiber1
  type -> Item
  key -> '1'
  sibling -> ItemFiber2
  return -> FragmentFiber

ItemFiber2
  type -> Item
  key -> '2'
  sibling -> ItemFiber3
  return -> FragmentFiber

ItemFiber3
  type -> Item
  key -> '3'
  sibling -> null
  return -> FragmentFiber
```

遍历顺序是深度优先：

```text
HostRootFiber
→ NumberListFiber
→ divFiber
→ buttonFiber
→ FragmentFiber
→ ItemFiber1
→ ItemFiber1 child
→ 回溯
→ ItemFiber2
→ ItemFiber2 child
→ 回溯
→ ItemFiber3
→ ItemFiber3 child
→ 回溯到根
```

这套 `child / sibling / return` 指针结构，就是 React 能自己掌控遍历过程的基础。

---

## 12. 更新流程细节

点击按钮时，`setNumbers` 会创建一个 update。

```ts
// src/react-fiber/update-queue.ts
const update = {
  action: (numbers: number[]) => numbers.map((number) => number * number),
  next: null,
};
```

这个 update 会进入对应 Fiber 的更新队列。

概念上：

```ts
// src/react-fiber/schedule-update.ts
function scheduleUpdate(fiber: FiberNode, update: unknown) {
  fiber.updateQueue = enqueueUpdate(fiber.updateQueue, update);

  scheduleCallback(getUpdatePriority(update), () => {
    performWorkOnRoot(root);
  });
}
```

处理到 `NumberListFiber` 时：

```ts
// src/react-fiber/begin-work.ts
function beginWork(fiber: FiberNode) {
  if (fiber.updateQueue) {
    const newState = processUpdateQueue(fiber.updateQueue);
    fiber.memoizedState = newState;
    fiber.flags |= Update;
  }

  const nextChildren = renderComponent(fiber);
  reconcileChildren(fiber, nextChildren);

  return fiber.child;
}
```

React 会得到新的 children，然后和旧 children 做协调。

---

## 13. Bailout：跳过不必要的工作

如果某个 Fiber 的 props、state、context 都没有变化，React 可以跳过它的部分工作。

例如 `ItemFiber1` 的 `number` 从 `1` 变成 `1`，没有实际变化。

概念代码：

```ts
// src/react-fiber/bailout.ts
function beginWorkForItem(fiber: FiberNode) {
  const oldProps = fiber.memoizedProps as { number: number };
  const newProps = fiber.pendingProps as { number: number };

  if (oldProps.number === newProps.number) {
    return bailoutOnAlreadyFinishedWork(fiber);
  }

  fiber.flags |= Update;
  return reconcileItemChildren(fiber);
}
```

Bailout 的意义是减少不必要的计算。

这也是为什么日常开发中 `React.memo`、稳定 props、稳定 key 都有意义：它们能帮助 React 更容易判断哪些子树可以复用或跳过。

---

## 14. Effect List：收集需要提交的变更

Render Phase 不直接更新 DOM，而是收集副作用。

在 `completeWork` 阶段，React 会把有副作用的 Fiber 串成 effect list。

概念代码：

```ts
// src/react-fiber/effect-list.ts
function completeWork(fiber: FiberNode) {
  if (fiber.flags !== NoFlags && fiber.return) {
    const parent = fiber.return;

    if (!parent.firstEffect) {
      parent.firstEffect = fiber;
      parent.lastEffect = fiber;
    } else {
      parent.lastEffect.nextEffect = fiber;
      parent.lastEffect = fiber;
    }
  }
}
```

对于数字列表更新，最终 effect list 可能类似：

```text
NumberListFiber(Update)
  → ItemFiber2(Update)
  → divItemFiber2(Update)
  → ItemFiber3(Update)
  → divItemFiber3(Update)
  → null
```

没有变化的 `buttonFiber` 和 `ItemFiber1` 不需要出现在 effect list 里。

---

## 15. Commit Phase 的三个子阶段

Commit Phase 可以拆成三个子阶段。

```ts
// src/react-fiber/commit-root.ts
function commitRoot(root: FiberRoot) {
  commitBeforeMutationEffects(root);
  commitMutationEffects(root);

  root.current = root.workInProgress;

  commitLayoutEffects(root);
}
```

### 15.1 Before Mutation

这个阶段发生在 DOM 变更前。

常见工作包括：

- 读取变更前快照。
- 处理部分生命周期准备工作。

### 15.2 Mutation

这个阶段真正修改宿主环境。

React DOM 会在这里：

- 插入 DOM。
- 删除 DOM。
- 更新属性。
- 更新文本。

示例：

```ts
// src/react-fiber/commit-mutation.ts
function commitMutationEffects(root: FiberRoot) {
  let effect = root.firstEffect;

  while (effect) {
    if (effect.flags & Update) {
      commitUpdate(effect);
    }

    effect = effect.nextEffect;
  }
}

function commitUpdate(fiber: FiberNode) {
  const instance = fiber.stateNode;
  const updatePayload = fiber.updateQueue;

  updateProperties(instance, updatePayload);
}
```

### 15.3 Layout

这个阶段发生在 DOM 变更后。

常见工作包括：

- 执行 `useLayoutEffect`。
- 执行类组件的 layout 生命周期。
- 更新 refs。

`useEffect` 这类 passive effect 通常会被安排到浏览器绘制后执行。

---

## 16. createWorkInProgress：Fiber 节点复用

Fiber 的双缓冲机制不是每次都创建全新节点，而是尽量复用 `alternate`。

```ts
// src/react-fiber/create-work-in-progress.ts
function createWorkInProgress(current: FiberNode, pendingProps: unknown) {
  let workInProgress = current.alternate;

  if (!workInProgress) {
    workInProgress = createFiber(current.tag, pendingProps, current.key);
    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;
    workInProgress.flags = NoFlags;
    workInProgress.nextEffect = null;
  }

  workInProgress.child = current.child;
  workInProgress.sibling = current.sibling;
  workInProgress.updateQueue = current.updateQueue;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;

  return workInProgress;
}
```

这种复用带来几个好处：

- 减少对象创建。
- 降低垃圾回收压力。
- 保留可复用的结构信息。
- 支持 current 和 work-in-progress 指针对应。

---

## 17. Fiber 完整流程图

一次更新的完整链路可以概括为：

```text
用户点击按钮
  ↓
调用 setState / setXxx
  ↓
创建 update，加入 Fiber update queue
  ↓
Scheduler 判断优先级并安排执行
  ↓
Render Phase 开始
  ↓
构建 work-in-progress tree
  ↓
遍历 Fiber，执行 beginWork / completeWork
  ↓
可中断、可恢复、可丢弃
  ↓
构建 effect list
  ↓
Commit Phase 开始
  ↓
Before Mutation
  ↓
Mutation：更新 DOM / Native UI
  ↓
交换 current 和 work-in-progress
  ↓
Layout：执行 layout effects / refs
  ↓
UI 更新完成
```

这条链路里，Render Phase 追求可调度，Commit Phase 追求一致性。

---

## 18. Fiber 带来的关键优化

### 18.1 增量渲染

大型更新可以拆成多个小任务，不再长时间阻塞主线程。

### 18.2 优先级调度

用户输入、点击、动画可以打断低优先级更新。

### 18.3 双缓冲更新

Render Phase 在 work-in-progress tree 上计算，Commit 后再交换成 current tree，避免 UI 半更新。

### 18.4 节点复用

通过 `alternate` 复用 Fiber 节点，减少内存分配和 GC 压力。

### 18.5 更好的错误边界和未来能力

Fiber 为错误边界、并发渲染、Suspense、transition、流式渲染等能力打下了基础。

---

## 19. Stack Reconciler vs Fiber Reconciler

| 维度 | Stack Reconciler | Fiber Reconciler |
| --- | --- | --- |
| 架构基础 | 递归调用栈 | 链表式 Fiber 树 |
| 调度方式 | 同步不可中断 | 可中断、可恢复 |
| 优先级 | 基本没有优先级模型 | 支持优先级调度 |
| 渲染阶段 | 单阶段同步处理 | Render / Commit 两阶段 |
| 并发能力 | 不支持 | 支持并发能力 |
| UI 一致性 | 同步更新 | Commit 阶段统一提交 |
| 扩展能力 | 有限 | 支持 Suspense、transition 等现代能力 |

Fiber 不是让每一次计算都变快，而是让 React 能更合理地安排计算。

---

## 20. 工程化理解：Fiber 对开发有什么影响

理解 Fiber 后，日常开发里会更容易理解这些原则。

### 20.1 render 阶段不要写副作用

Render Phase 可能被中断、重启或丢弃。因此不要在组件函数体里写外部副作用。

错误示例：

```tsx
// src/components/BadRenderEffect.tsx
function BadRenderEffect({ value }: { value: string }) {
  localStorage.setItem('value', value);

  return <div>{value}</div>;
}
```

正确做法：

```tsx
// src/components/GoodRenderEffect.tsx
import { useEffect } from 'react';

function GoodRenderEffect({ value }: { value: string }) {
  useEffect(() => {
    localStorage.setItem('value', value);
  }, [value]);

  return <div>{value}</div>;
}
```

### 20.2 保持 key 稳定

稳定 key 能帮助 React 正确复用 Fiber，避免状态串位。

```tsx
// src/components/StableKeyList.tsx
items.map((item) => <Row key={item.id} item={item} />);
```

### 20.3 不要把所有更新都当成同等紧急

React 18 中可以用 `startTransition` 标记非紧急更新。

```tsx
// src/components/SearchBox.tsx
import { startTransition, useState } from 'react';

export function SearchBox() {
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');

  const handleChange = (value: string) => {
    setKeyword(value);

    startTransition(() => {
      setQuery(value);
    });
  };

  return (
    <input
      value={keyword}
      onChange={(event) => handleChange(event.target.value)}
    />
  );
}
```

输入框值是高优先级，搜索结果过滤可以是低优先级。

### 20.4 使用 memoization 辅助 bailout

如果子组件 props 稳定，`React.memo` 可以帮助跳过不必要渲染。

```tsx
// src/components/MemoizedRow.tsx
import { memo } from 'react';

type RowProps = {
  id: string;
  title: string;
};

export const Row = memo(function Row({ title }: RowProps) {
  return <div>{title}</div>;
});
```

但不要无脑 memo。只有组件较重、props 稳定、确实有重渲染成本时才值得加。

---

## 21. Fiber 的真正意义

Fiber 代表了 React 架构思想的转变：

- 从一次性渲染到增量渲染。
- 从同步阻塞到合作式调度。
- 从无差别更新到基于优先级的智能调度。
- 从递归调用栈到可控制的 Fiber 工作循环。
- 从直接更新到双缓冲提交。

它为后续很多能力打下了基础：

- Concurrent Rendering。
- Suspense。
- `startTransition`。
- Streaming SSR。
- Server Components。
- 更细粒度的更新调度。

Fiber 的价值不只是“内部重写”，而是让 React 可以把“时间”和“优先级”纳入 UI 更新模型。

---

## 22. 总结

React Fiber 可以概括为：

> React 用 Fiber 节点把组件树表示成可遍历、可暂停、可恢复的工作单元链表，并通过优先级调度、双缓冲和两阶段提交，让大型更新不再长时间阻塞用户交互。

它的核心机制包括：

- Fiber 节点通过 `child`、`sibling`、`return` 形成可控遍历结构。
- Work Loop 把渲染拆成一个个工作单元。
- Render Phase 可中断、可重启，不直接修改真实 UI。
- Commit Phase 不可中断，统一提交真实 UI 更新。
- 优先级调度让输入、点击、动画优先响应。
- 双缓冲用 `current` 和 `workInProgress` 保证 UI 一致性。
- Effect List 收集需要提交的变更。
- `alternate` 让 Fiber 节点可以复用，减少内存压力。

理解 Fiber 不只是为了面试。它能帮助你理解为什么 React 推荐纯 render、稳定 key、合理拆分更新、谨慎使用副作用，以及为什么 React 18 的并发能力能让复杂页面保持更好的响应性。

优秀的用户体验不只来自界面设计，也来自底层架构对时间、优先级和一致性的深刻处理。Fiber 正是 React 在这些问题上的核心答案。
