# 深入探讨 React 的核心工作原理

React 的性能和开发体验，来自一套相对清晰的分层设计：开发者写组件，组件生成 React 元素，React 通过协调过程比较新旧树，再由具体渲染器把变化提交到真实平台。

如果只从 API 层理解 React，很容易把它看成“状态变了重新渲染页面”。但真实过程更细：`state` 更新会进入调度系统，React 生成新的 element tree，通过 Diffing 找出变化，再在 commit 阶段由 React DOM 或 React Native 等 renderer 执行真实更新。

这篇文章围绕几个核心问题展开：

- React 元素、组件和实例分别是什么？
- 虚拟 DOM 到底是什么？
- 协调和 Diffing 在更新时做了什么？
- 为什么 `key` 对列表很重要？
- React 核心和 renderer 为什么要分层？
- `setState`、Hooks dispatcher、updater 和 renderer 之间如何协作？

---

## 1. React 元素、组件和实例的区别

理解 React 工作流程前，要先分清三个概念：元素、组件、实例。

---

## 2. React 元素：描述 UI 的普通对象

React 元素是一个轻量级 JavaScript 对象，用来描述“你想要的 UI 长什么样”。

例如 JSX：

```tsx
// src/App.tsx
<div className="App">Hello</div>
```

大致会被转成：

```ts
// src/react-element-example.ts
const element = {
  type: 'div',
  props: {
    className: 'App',
    children: 'Hello',
  },
  key: null,
  ref: null,
  $$typeof: Symbol.for('react.element'),
};
```

它不是 DOM 节点，也不是组件实例，只是一个描述对象。

可以把 React 元素理解成一张 UI 蓝图：

- `type` 表示元素类型，可能是 `'div'`，也可能是某个组件函数。
- `props` 表示传入属性和子元素。
- `key` 用于同层列表 Diff。
- `ref` 用于引用真实节点或组件实例。

---

## 3. React 组件：生成元素树的函数或类

React 组件可以是函数，也可以是类。

函数组件：

```tsx
// src/components/UserCard.tsx
type UserCardProps = {
  name: string;
};

export function UserCard({ name }: UserCardProps) {
  return <div>{name}</div>;
}
```

类组件：

```tsx
// src/components/UserCardClass.tsx
import { Component } from 'react';

type UserCardProps = {
  name: string;
};

export class UserCardClass extends Component<UserCardProps> {
  render() {
    return <div>{this.props.name}</div>;
  }
}
```

组件的职责是：

> 输入 props，输出 React 元素树。

组件本身不是 UI，它是生成 UI 描述的逻辑单元。

---

## 4. 组件实例：运行时状态的承载者

类组件有实例。

```tsx
// src/components/CounterClass.tsx
import { Component } from 'react';

type CounterState = {
  count: number;
};

export class CounterClass extends Component<object, CounterState> {
  state = {
    count: 0,
  };

  render() {
    return <button>{this.state.count}</button>;
  }
}
```

类组件实例通过 `this` 保存状态、生命周期和方法。

函数组件没有传统意义上的组件实例。函数组件的状态由 Fiber 和 Hooks 链表维护，开发者通过 `useState`、`useEffect` 等 Hooks 访问状态和生命周期能力。

所以可以这样理解：

- **Element**：描述 UI 的普通对象。
- **Component**：生成 element 的函数或类。
- **Instance**：类组件的运行时对象；函数组件用 Fiber + Hooks 状态替代。

---

## 5. 协调：React 更新时到底做了什么

React 的核心工作可以拆成两步。

第一步，生成一棵新的 element tree。

这一步相对便宜。React 元素只是 JavaScript 对象，创建对象的成本远低于直接操作 DOM。

第二步，把这棵树同步到真实 UI。

这一步更贵。初次渲染时，React 必须创建完整 DOM。后续更新时，React 会重新生成一棵新树，然后和旧树比较，找出最小变更集合，再交给 renderer 更新真实 DOM。

这个过程就叫协调，也就是 Reconciliation。

简化流程如下：

```ts
// src/react-workflow.ts
const reactWorkflow = {
  step1: '组件状态改变',
  step2: '调用组件函数或 render 方法',
  step3: '生成新的 React element tree',
  step4: '比较新旧树',
  step5: '计算最小变更集合',
  step6: 'renderer 批量更新真实 UI',
};
```

一句话：

> Reconciliation 就是 React 把旧树变成新树的过程。

---

## 6. 什么是虚拟 DOM

虚拟 DOM 是 React 元素组成的 JavaScript 对象树，用来描述真实 UI 结构。

它不是浏览器里的 DOM，而是 React 在内存里的 UI 描述。

对比一下：

| 对象 | 本质 | 成本 |
| --- | --- | --- |
| 真实 DOM | 浏览器原生对象 | 重，属性多，操作可能触发布局和绘制 |
| 虚拟 DOM | JavaScript 普通对象树 | 轻，适合计算和比较 |

例如 HTML：

```html
<!-- public/example.html -->
<div id="main" class="container active">
  Hello <span style="color: red;">World</span>
</div>
```

对应的虚拟 DOM 可以简化理解为：

```ts
// src/virtual-dom-example.ts
const virtualDivElement = {
  $$typeof: Symbol.for('react.element'),
  type: 'div',
  key: null,
  ref: null,
  props: {
    id: 'main',
    className: 'container active',
    children: [
      'Hello ',
      {
        $$typeof: Symbol.for('react.element'),
        type: 'span',
        key: null,
        ref: null,
        props: {
          style: {
            color: 'red',
          },
          children: 'World',
        },
      },
    ],
  },
};
```

真实 DOM 对象则复杂得多。一个 DOM 元素会包含：

- 节点关系：`parentNode`、`childNodes`、`nextSibling`。
- 属性集合：`attributes`、`classList`、`dataset`。
- 样式对象：`style`、计算样式。
- 布局信息：`offsetWidth`、`clientHeight`、`getBoundingClientRect()`。
- 事件系统：`addEventListener`、`dispatchEvent`。
- 查询方法：`querySelector`、`querySelectorAll`。
- 原型链和浏览器内部状态。

这就是为什么真实 DOM 操作成本更高。

---

## 7. 虚拟 DOM 为什么能提高效率

虚拟 DOM 并不是“永远比直接 DOM 快”。它真正的价值在于：

> 用便宜的 JavaScript 对象计算，减少昂贵的真实 DOM 操作，并把更新批量提交。

例如更新多个元素颜色：

```ts
// src/dom-update-comparison.ts
function updateWithRealDom(elements: HTMLElement[]) {
  for (let index = 0; index < elements.length; index += 1) {
    elements[index].style.color = 'blue';
  }
}

function updateWithVirtualDom() {
  const newVirtualTree = createNewVirtualTree();
  const diffs = diff(oldVirtualTree, newVirtualTree);

  applyDiffs(diffs);
}
```

直接操作 DOM 时，每次写入都可能触发浏览器样式计算、布局或绘制。

React 的方式是：

1. 在内存中生成新虚拟树。
2. 比较新旧虚拟树。
3. 计算要改哪些真实节点。
4. 在 commit 阶段批量更新真实 UI。

这套设计既保留声明式写法，又尽量减少真实 UI 操作。

---

## 8. Diffing 算法的核心目标

Diffing 是协调过程的核心。

它的目标是：

> 以尽量低的成本，把旧的虚拟 DOM 树转换成新的虚拟 DOM 树。

如果没有 Diffing，每次状态变化都可能变成这样：

```ts
// src/no-diffing-example.ts
function updateWithoutDiffing() {
  document.body.innerHTML = '';
  renderApp();
}
```

这会导致整个页面重建，性能和用户体验都很差。

有 Diffing 后：

```ts
// src/diffing-example.ts
function updateWithDiffing() {
  const diffs = findDiffs(oldVirtualTree, newVirtualTree);
  applyMinimumChanges(diffs);
}
```

React 不追求理论上的全局最优 Diff，因为树编辑距离算法成本太高。React 使用的是基于经验假设的启发式算法。

---

## 9. Diffing 的第一条假设：类型不同，整棵子树不同

React 的第一条核心假设是：

> 如果两个元素类型不同，React 认为它们代表完全不同的子树。

例如：

```tsx
// src/components/TypeChangeExample.tsx
function OldTree() {
  return (
    <div>
      <Counter />
    </div>
  );
}

function NewTree() {
  return (
    <span>
      <Counter />
    </span>
  );
}
```

根节点从 `div` 变成 `span`，React 会销毁旧的 `div` 子树，再创建新的 `span` 子树。

即使里面都有 `Counter`，旧的 `Counter` 实例也会被卸载，新 `Counter` 会重新挂载。

这意味着：

- 组件 state 会丢失。
- effect 会重新执行。
- DOM 会重新创建。

再看一个对象层面的示例：

```ts
// src/type-diff-example.ts
const oldTree = {
  type: 'div',
  props: {
    children: [
      { type: 'Header', props: { title: '首页' } },
      { type: 'Content', props: { text: '内容' } },
    ],
  },
};

const newTree = {
  type: 'section',
  props: {
    children: [
      { type: 'Header', props: { title: '首页' } },
      { type: 'Content', props: { text: '内容' } },
    ],
  },
};
```

React 发现根节点类型不同，就不会继续深挖子节点是否相同，而是直接重建。

这是一种性能取舍：避免昂贵的深度最优匹配。

---

## 10. Diffing 的第二条假设：同层列表需要稳定 key

React 的第二条核心假设是：

> 同一层级的列表 children 需要通过稳定 key 表达身份。

React 对比同一父节点下的一组子节点时，需要知道“谁是谁”。

没有 `key` 或 `key` 不稳定时，React 只能按位置猜：

- 第 0 个对第 0 个。
- 第 1 个对第 1 个。
- 第 2 个对第 2 个。

有稳定 `key` 时，React 可以按身份对齐：

- 哪些 key 还在，可以复用。
- 哪些 key 消失了，需要删除。
- 哪些 key 新出现了，需要新增。
- 哪些 key 位置变了，需要移动。

---

## 11. 为什么不要用 index 作为 key

旧列表：

```ts
// src/list-key-example.ts
const oldItems = [
  { id: 'A', text: 'A' },
  { id: 'B', text: 'B' },
  { id: 'C', text: 'C' },
];
```

如果用 index 作为 key：

```tsx
// src/components/BadList.tsx
function BadList({ items }: { items: Array<{ text: string }> }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={index}>{item.text}</li>
      ))}
    </ul>
  );
}
```

现在在开头插入一项：

```ts
// src/list-key-example.ts
const newItems = [
  { id: 'X', text: 'X' },
  { id: 'A', text: 'A' },
  { id: 'B', text: 'B' },
  { id: 'C', text: 'C' },
];
```

React 会认为：

- 旧的 key `0` 对应新的 key `0`。
- 旧的 key `1` 对应新的 key `1`。
- 旧的 key `2` 对应新的 key `2`。

但实际上第 0 项已经从 `A` 变成了 `X`。这会导致组件实例被错误复用，常见表现是：

- 输入框内容串位。
- 展开状态错位。
- 动画状态错位。
- 内部组件 state 跑到别的行。

正确做法是使用稳定业务 id：

```tsx
// src/components/GoodList.tsx
type Item = {
  id: string;
  text: string;
};

function GoodList({ items }: { items: Item[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.text}</li>
      ))}
    </ul>
  );
}
```

这样插入 `X` 后，`A` 的 key 仍然是 `A`，React 能正确复用它，只是把它移动到新的位置。

总结：

- `type` 不同，直接换整棵子树。
- 同层列表用稳定 `key` 表达身份。
- 不稳定 key 会导致错误复用。

---

## 12. React 渲染器架构

React 的架构是分层的。

开发者写的是 React 应用代码：

```tsx
// src/App.tsx
export function App() {
  return <div>Hello</div>;
}
```

React 核心负责：

- 管理组件树。
- 处理状态更新。
- 构建 Fiber 树。
- 执行协调和 Diff。
- 决定哪些节点需要更新。

具体平台的 renderer 负责：

- React DOM：创建 DOM 元素、设置属性、处理事件、更新 DOM。
- React Native：创建原生组件、调用原生 API、桥接平台 UI。
- 自定义 renderer：把 React 更新落到 Canvas、CLI、Three.js 或其他环境。

可以用一张简化图理解：

```text
应用组件
  ↓
React 核心 / Reconciler
  ↓
Renderer
  ├─ React DOM → 浏览器 DOM
  ├─ React Native → iOS / Android 原生 UI
  └─ 自定义 renderer → Canvas / CLI / 其他平台
```

这也是 React 能跨平台的原因。

---

## 13. 为什么 React 要这样分层

如果没有分层，UI 逻辑和平台操作会混在一起。

类似早期 jQuery 写法：

```ts
// src/jquery-style-example.ts
async function updateUIWithJQuery() {
  const data = await fetchData();

  $('#list').empty();

  data.forEach((item) => {
    $('#list').append(`<li>${item}</li>`);
  });
}
```

这种代码直接依赖浏览器 DOM，很难迁移到移动端、命令行或其他环境。

React 的分层设计是：

```ts
// src/react-architecture.ts
const reactArchitecture = {
  componentCode: '平台无关的 UI 描述',
  reactCore: {
    responsibility: '管理组件、状态、调度、协调和 Diff',
    doesNotCareAbout: '最终显示在浏览器、Native 还是其他平台',
  },
  renderer: {
    reactDom: '把 div 变成 DOM 元素',
    reactNative: '把 View 变成原生控件',
    customRenderer: '把元素变成特定平台对象',
  },
};
```

一句话：

> React 核心负责计算变更，renderer 负责把变更落到具体平台。

---

## 14. Scheduler、Reconciler、Renderer 分别做什么

React 的运行过程可以拆成三块。

### 14.1 Scheduler：决定什么时候做

Scheduler 负责优先级、任务调度、可中断执行。

例如：

- 用户输入、点击是高优先级。
- 后台刷新、非紧急更新是低优先级。
- transition 更新可以被更高优先级任务打断。

React 18 的并发能力，本质上依赖更灵活的调度。

### 14.2 Reconciler：决定做什么变更

Reconciler 负责：

- 根据组件生成 Fiber 树。
- 处理 update queue。
- 执行 render phase。
- 对比新旧树。
- 产出变更计划，也就是 effect。

它不关心 DOM，也不关心 Native View。

### 14.3 Renderer：决定怎么落地

Renderer 负责把 Reconciler 产出的变更计划应用到具体平台。

React DOM 会：

- 创建 DOM 节点。
- 插入节点。
- 删除节点。
- 更新属性。
- 更新文本。
- 绑定或更新事件。

React Native 则会把这些更新映射到原生控件。

总结：

> Scheduler 决定什么时候做，Reconciler 决定做什么变更，Renderer 决定怎么在平台上执行。

---

## 15. setState / setXxx 触发了什么

以函数组件的 `useState` 为例：

```tsx
// src/components/Counter.tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((value) => value + 1)}>
      {count}
    </button>
  );
}
```

调用 `setCount` 后，大致会发生三件事。

第一，把 update 放进当前组件 Fiber 的 update queue。

这一步是平台无关的。React 只是记录：这个 Fiber 有一次状态更新需要处理。

第二，触发调度。

React 会根据更新来源和优先级决定什么时候执行这次更新。

第三，进入 render phase 和 commit phase。

- render phase：计算新树和变更计划，可中断、可重试，不触碰真实 UI。
- commit phase：把变更一次性提交到宿主环境，不可中断。

真实 DOM 的增删改只发生在 commit phase，并且由 renderer 执行。

---

## 16. Dispatcher 和 Updater 的区别

这两个概念很容易混在一起。

### 16.1 Dispatcher：Hooks 的运行时路由器

函数组件里调用 `useState`、`useEffect` 时，并不是 `react` 包自己完成所有逻辑。

它会通过当前 dispatcher 转发到当前阶段对应的 Hooks 实现。

概念上类似：

```ts
// src/react-dispatcher-concept.ts
function useState(initialState: unknown) {
  const dispatcher = resolveDispatcher();
  return dispatcher.useState(initialState);
}
```

为什么需要 dispatcher？

因为 Hooks 在不同阶段行为不同：

- mount 阶段：创建 Hook 节点，保存初始值。
- update 阶段：读取旧 Hook 节点，应用更新队列。
- server render 或测试环境：可能有不同实现。

所以 dispatcher 解决的是：

> 当前 render 过程中，Hooks 应该走哪套实现。

### 16.2 Updater：更新入队和调度触发

类组件时代，实例上有 `this.setState`。React 内部会给实例注入 updater。

updater 的职责是：

- 把 state update 入队。
- 触发调度。
- 让 React 后续进入 render / commit 流程。

函数组件虽然没有类实例，但 `setXxx` 闭包里持有 queue 和 Fiber 信息，本质上扮演了类似 updater 的角色。

一句话区分：

- **Dispatcher** 面向 Hooks 解析和不同阶段实现切换。
- **Updater** 面向更新入队和调度触发。

---

## 17. Renderer 如何与 React 核心通信

Reconciler 不知道怎么创建 DOM 节点，也不知道怎么创建原生 View。

Renderer 会提供一套宿主操作能力，常被称为 host config 或 host operations。

典型能力包括：

- `createInstance`：创建宿主节点。
- `createTextInstance`：创建文本节点。
- `appendChild`：追加子节点。
- `insertBefore`：插入节点。
- `removeChild`：删除节点。
- `commitUpdate`：更新属性。
- `commitTextUpdate`：更新文本。
- `finalizeInitialChildren`：初次挂载后的额外处理。

概念上可以理解为：

```ts
// src/host-config-concept.ts
const hostConfig = {
  createInstance(type: string, props: Record<string, unknown>) {
    return document.createElement(type);
  },

  appendChild(parent: Node, child: Node) {
    parent.appendChild(child);
  },

  removeChild(parent: Node, child: Node) {
    parent.removeChild(child);
  },

  commitUpdate(domNode: HTMLElement, props: Record<string, unknown>) {
    updateDomProperties(domNode, props);
  },
};
```

协调器最终做的事，是在 commit 阶段按照 effect 列表调用这些宿主操作。

所以 renderer 可以理解成：

> 提供具体平台能力的实现者。

而 reconciler 是：

> 组织和调用这些能力的协调者。

---

## 18. render phase 和 commit phase

React 更新可以分为两个阶段。

### 18.1 render phase

render phase 负责计算。

它会：

- 执行组件函数或类组件 render。
- 生成新的 element tree。
- 构建或复用 Fiber。
- 执行 Diff。
- 生成 effect 列表。

这个阶段可以被中断，也可以被重新开始。

因为它不应该产生真实副作用。真实 DOM 更新、订阅、手动 DOM 操作都不应该发生在 render 阶段。

### 18.2 commit phase

commit phase 负责落地。

它会：

- 执行 DOM 插入、删除、更新。
- 执行 ref 更新。
- 执行 layout effect。
- 安排 passive effect，也就是 `useEffect`。

这个阶段不可中断。

因为真实 UI 一旦开始提交，就需要保持一致性。

---

## 19. 四个部分连起来的完整链路

把前面的内容串起来，一次 React 更新大致是这样：

1. 用户点击按钮。
2. 调用 `setState` 或 `setXxx`。
3. React 把 update 放入对应 Fiber 的 update queue。
4. Scheduler 根据优先级安排任务。
5. Reconciler 进入 render phase。
6. 组件重新执行，生成新的 element tree。
7. React 对比旧 Fiber / 旧 element 和新 element。
8. Diffing 产出需要插入、删除、更新的 effect。
9. commit phase 开始。
10. Renderer 调用宿主操作更新 DOM 或 Native UI。
11. 浏览器绘制更新后的页面。
12. passive effects 在合适时机执行。

可以简化为：

```text
setState / setXxx
  ↓
update queue
  ↓
scheduler
  ↓
render phase
  ↓
reconciliation / diffing
  ↓
commit phase
  ↓
renderer host operations
  ↓
real UI update
```

---

## 20. 工程化理解：这些原理如何影响日常开发

理解 React 工作原理，不只是为了面试，也能指导日常代码。

### 20.1 不要频繁改变组件 type

如果你在同一个位置频繁切换不同组件类型，React 会销毁旧子树并重新创建。

```tsx
// src/components/TypeSwitch.tsx
function TypeSwitch({ mode }: { mode: 'a' | 'b' }) {
  return mode === 'a' ? <PanelA /> : <PanelB />;
}
```

如果两个模式本质是同一个 UI，只是展示内容不同，可以考虑保持组件类型稳定，通过 props 控制差异。

### 20.2 列表 key 必须稳定

列表项有状态、输入框、动画、折叠状态时，尤其不能随便用 index 作为 key。

```tsx
// src/components/StableKeyList.tsx
items.map((item) => <Row key={item.id} item={item} />);
```

### 20.3 render 阶段不要写副作用

错误示例：

```tsx
// src/components/BadRenderSideEffect.tsx
function BadComponent({ value }: { value: string }) {
  localStorage.setItem('value', value);

  return <div>{value}</div>;
}
```

这类逻辑应该放进 effect：

```tsx
// src/components/GoodRenderSideEffect.tsx
import { useEffect } from 'react';

function GoodComponent({ value }: { value: string }) {
  useEffect(() => {
    localStorage.setItem('value', value);
  }, [value]);

  return <div>{value}</div>;
}
```

render phase 可能被中断或重复执行，不能依赖它产生外部副作用。

### 20.4 DOM 读取和写入要谨慎

访问 `offsetWidth`、`getBoundingClientRect()` 这类布局信息，可能触发布局计算。

如果必须读取布局，可以使用 `useLayoutEffect`，但不要滥用。

---

## 21. 总结

React 的核心工作链路可以概括为：

> 组件生成元素，React 通过协调比较新旧树，Diffing 找出变化，renderer 在 commit 阶段把变化落到真实平台。

这套机制里有几个关键点：

- React 元素是轻量 JavaScript 对象，不是真实 DOM。
- 组件是生成元素树的函数或类。
- 函数组件没有实例，状态由 Fiber 和 Hooks 管理。
- 虚拟 DOM 的价值是用内存计算减少真实 UI 操作。
- Reconciliation 是旧树到新树的同步过程。
- Diffing 依赖两个假设：类型不同重建子树，同层列表用 key 表达身份。
- React 核心和 renderer 分层，带来跨平台能力。
- Scheduler 决定什么时候做，Reconciler 决定做什么变更，Renderer 决定怎么落地。
- Dispatcher 负责 Hooks 在不同阶段的实现切换。
- Updater 负责更新入队和触发调度。
- render phase 做计算，commit phase 做真实 UI 更新。

理解这些之后，再看 React 的一些规则就会更清楚：

- 为什么不要在 render 里写副作用。
- 为什么列表 key 必须稳定。
- 为什么组件类型变化会导致状态丢失。
- 为什么 React 可以支持 DOM、Native 和自定义 renderer。

React 的设计不是简单地“重新渲染页面”，而是把 UI 更新拆成了声明式描述、调度、协调、Diff 和平台提交几个阶段。正是这种分层，让 React 能同时兼顾开发体验、性能和跨平台能力。
