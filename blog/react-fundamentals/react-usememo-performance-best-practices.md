# React 性能优化：深入理解 useMemo 的作用、场景与最佳实践

在 React 开发中，组件重新渲染是非常常见的事情。只要组件中的 `state` 或 `props` 发生变化，React 就会重新执行组件函数，并生成新的 UI。

大多数情况下，这种重新渲染没有问题。但如果组件中存在复杂计算、超大数组处理、复杂对象创建，或者父组件每次渲染都会生成新的对象和数组，就可能带来不必要的性能消耗。

这时，`useMemo` 就派上用场了。

本文将系统讲解 React 中的 `useMemo`：它是什么、为什么需要它、它能解决哪些问题，以及在实际项目中应该如何正确使用它。

---

## 一、什么是 useMemo？

`useMemo` 是 React 提供的一个 Hook，用于 **缓存计算结果**。

它的核心作用是：

> React 会记住某个函数的计算结果，只有当依赖项发生变化时，才会重新执行这个函数。

基本语法如下：

```tsx
const memoizedValue = useMemo(() => {
  return computedValue;
}, [dependencies]);
```

可以理解为：

```text
第一次渲染：执行函数，得到结果，并缓存结果
后续渲染：如果依赖项没变，直接使用上一次缓存的结果
依赖变化：重新执行函数，得到新结果，并更新缓存
```

因此，`useMemo` 主要用于性能优化，避免一些没有必要的重复计算。

---

## 二、为什么需要 useMemo？

在 React 函数组件中，每一次组件重新渲染，组件函数都会重新执行。

例如：

```tsx
function App() {
  const [count, setCount] = useState(0);

  const result = expensiveCalculation();

  return (
    <div>
      <p>{result}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

这里的问题是：只要点击按钮更新 `count`，组件就会重新渲染，`expensiveCalculation()` 也会重新执行。

如果这个函数只是简单计算，问题不大。

但如果它是一个非常耗时的计算，比如：

```tsx
function expensiveCalculation(num: number) {
  console.log("Expensive calculation running...");

  let total = 0;

  for (let i = 0; i < num; i++) {
    total += i;
  }

  return total;
}
```

当 `num` 很大时，每次点击按钮都会造成明显卡顿。

即使这次更新和 `num` 没有关系，React 依然会重新执行组件函数，导致这个昂贵计算被重复执行。

这就是 `useMemo` 要解决的问题。

---

## 三、使用 useMemo 缓存昂贵计算

假设我们有一个组件：

```tsx
import { useState } from "react";

function ExpensiveComponent({ num }: { num: number }) {
  const [count, setCount] = useState(0);

  const result = expensiveCalculation(num);

  return (
    <div>
      <p>计算结果：{result}</p>

      <p>Count：{count}</p>

      <button onClick={() => setCount(count + 1)}>增加 Count</button>
    </div>
  );
}

function expensiveCalculation(num: number) {
  console.log("执行昂贵计算");

  let total = 0;

  for (let i = 0; i < num; i++) {
    total += i;
  }

  return total;
}
```

这个组件中有两个关键点：

```text
num：决定昂贵计算的参数
count：只是页面上的普通计数状态
```

问题是：即使只是点击按钮修改 `count`，`expensiveCalculation(num)` 也会重新执行。

实际上，`count` 的变化并不会影响计算结果。计算结果只和 `num` 有关。

所以可以用 `useMemo` 优化：

```tsx
import { useMemo, useState } from "react";

function ExpensiveComponent({ num }: { num: number }) {
  const [count, setCount] = useState(0);

  const result = useMemo(() => {
    return expensiveCalculation(num);
  }, [num]);

  return (
    <div>
      <p>计算结果：{result}</p>

      <p>Count：{count}</p>

      <button onClick={() => setCount(count + 1)}>增加 Count</button>
    </div>
  );
}

function expensiveCalculation(num: number) {
  console.log("执行昂贵计算");

  let total = 0;

  for (let i = 0; i < num; i++) {
    total += i;
  }

  return total;
}
```

现在逻辑变成：

```text
页面第一次加载：执行 expensiveCalculation
点击增加 Count：不会重新执行 expensiveCalculation
num 发生变化：重新执行 expensiveCalculation
```

这就是 `useMemo` 最典型的使用场景：**缓存昂贵计算的结果**。

---

## 四、useMemo 的依赖数组是什么意思？

`useMemo` 的第二个参数是依赖数组。

例如：

```tsx
const result = useMemo(() => {
  return expensiveCalculation(num);
}, [num]);
```

这里的 `[num]` 表示：

```text
只有 num 变化时，才重新执行 useMemo 里的函数
num 没变时，直接复用上一次缓存的 result
```

如果依赖数组写错，就可能出现问题。

例如：

```tsx
const result = useMemo(() => {
  return expensiveCalculation(num);
}, []);
```

这里依赖数组是空数组，表示只在组件首次渲染时计算一次。

如果后续 `num` 发生变化，`result` 也不会更新。这就可能导致页面显示旧数据。

所以使用 `useMemo` 时，一定要保证依赖项准确。

---

## 五、useMemo 的第二个常见场景：缓存对象或数组引用

除了缓存昂贵计算，`useMemo` 还有一个很常见的用途：

> 缓存对象或数组，避免子组件因为引用变化而重复渲染。

先看一个例子。

父组件中有两个状态：

```tsx
const [count, setCount] = useState(0);
const [username, setUsername] = useState("Tom");
```

然后根据 `username` 创建一个对象，传给子组件：

```tsx
const user = {
  name: username,
};

<Child user={user} />;
```

子组件使用 `React.memo` 包裹：

```tsx
import React from "react";

const Child = React.memo(function Child({ user }: { user: { name: string } }) {
  console.log("Child 重新渲染");

  return <div>用户名：{user.name}</div>;
});
```

完整代码如下：

```tsx
import React, { useState } from "react";

function Parent() {
  const [count, setCount] = useState(0);
  const [username, setUsername] = useState("Tom");

  const user = {
    name: username,
  };

  return (
    <div>
      <p>Count：{count}</p>

      <button onClick={() => setCount(count + 1)}>增加 Count</button>

      <button onClick={() => setUsername("Jerry")}>修改用户名</button>

      <Child user={user} />
    </div>
  );
}

const Child = React.memo(function Child({ user }: { user: { name: string } }) {
  console.log("Child 重新渲染");

  return <div>用户名：{user.name}</div>;
});
```

你可能会以为：

```text
点击“修改用户名”时，Child 应该重新渲染
点击“增加 Count”时，Child 不应该重新渲染
```

但实际情况是：点击“增加 Count”时，子组件也会重新渲染。

为什么？

因为每次父组件重新渲染时，都会重新执行：

```tsx
const user = {
  name: username,
};
```

虽然 `username` 的值没有变，但这个对象是新创建的。

也就是说：

```tsx
const user1 = { name: "Tom" };
const user2 = { name: "Tom" };

console.log(user1 === user2); // false
```

对象内容一样，不代表引用一样。

React.memo 默认是浅比较 props。对于对象和数组，它比较的是引用地址。

所以只要父组件重新创建了对象，子组件就会认为 props 变了，从而重新渲染。

---

## 六、用 useMemo 缓存对象引用

为了解决这个问题，可以使用 `useMemo` 缓存对象：

```tsx
import React, { useMemo, useState } from "react";

function Parent() {
  const [count, setCount] = useState(0);
  const [username, setUsername] = useState("Tom");

  const user = useMemo(() => {
    return {
      name: username,
    };
  }, [username]);

  return (
    <div>
      <p>Count：{count}</p>

      <button onClick={() => setCount(count + 1)}>增加 Count</button>

      <button onClick={() => setUsername("Jerry")}>修改用户名</button>

      <Child user={user} />
    </div>
  );
}

const Child = React.memo(function Child({ user }: { user: { name: string } }) {
  console.log("Child 重新渲染");

  return <div>用户名：{user.name}</div>;
});
```

现在 `user` 只会在 `username` 改变时重新创建。

所以：

```text
点击“修改用户名”：username 改变，user 重新创建，Child 重新渲染
点击“增加 Count”：username 没变，user 复用旧引用，Child 不重新渲染
```

这就是 `useMemo` 的第二个重要使用场景：**稳定对象或数组的引用**。

---

## 七、为什么对象和数组容易导致重复渲染？

在 JavaScript 中，对象和数组是引用类型。

每次写：

```tsx
const list = [1, 2, 3];
```

或者：

```tsx
const options = {
  pageSize: 10,
};
```

都会创建一个新的引用。

即使内容完全一样，引用也不一样：

```tsx
console.log([1, 2, 3] === [1, 2, 3]); // false

console.log({ pageSize: 10 } === { pageSize: 10 }); // false
```

因此，如果你把对象或数组直接写在组件内部，并作为 props 传给经过 `React.memo` 优化的子组件，就可能导致子组件重复渲染。

例如：

```tsx
<Child filters={{ type: "active" }} />
```

这段代码每次父组件渲染时，都会创建一个新的对象。

更推荐写法是：

```tsx
const filters = useMemo(() => {
  return {
    type: "active",
  };
}, []);

<Child filters={filters} />;
```

如果对象依赖某个状态：

```tsx
const filters = useMemo(() => {
  return {
    type,
    keyword,
  };
}, [type, keyword]);
```

这样只有 `type` 或 `keyword` 改变时，`filters` 才会重新创建。

---

## 八、useMemo 和 React.memo 的关系

`useMemo` 和 `React.memo` 经常一起出现，但它们解决的问题不一样。

### React.memo

`React.memo` 用来缓存组件渲染结果。

它的作用是：

```text
如果子组件 props 没变，就跳过子组件重新渲染
```

例如：

```tsx
const Child = React.memo(function Child({ name }: { name: string }) {
  console.log("Child render");

  return <div>{name}</div>;
});
```

### useMemo

`useMemo` 用来缓存计算结果或引用值。

它的作用是：

```text
如果依赖没变，就复用上一次计算结果
```

例如：

```tsx
const user = useMemo(() => {
  return {
    name: username,
  };
}, [username]);
```

两者配合时，常见模式是：

```tsx
const user = useMemo(() => {
  return {
    name: username,
  };
}, [username]);

return <Child user={user} />;
```

同时子组件使用：

```tsx
const Child = React.memo(function Child({ user }) {
  return <div>{user.name}</div>;
});
```

这样才能真正避免因为对象引用变化导致的无意义重渲染。

---

## 九、useMemo 不等于 useCallback

很多人会把 `useMemo` 和 `useCallback` 混淆。

它们确实很像，但缓存的东西不同。

### useMemo 缓存的是值

```tsx
const value = useMemo(() => {
  return expensiveCalculation(num);
}, [num]);
```

这里缓存的是 `expensiveCalculation(num)` 的结果。

### useCallback 缓存的是函数

```tsx
const handleClick = useCallback(() => {
  console.log("click");
}, []);
```

这里缓存的是函数本身。

实际上，`useCallback` 可以理解为一种特殊的 `useMemo`：

```tsx
const handleClick = useMemo(() => {
  return () => {
    console.log("click");
  };
}, []);
```

所以简单记忆：

```text
useMemo：缓存值
useCallback：缓存函数
```

---

## 十、什么时候应该使用 useMemo？

`useMemo` 不是所有地方都需要用。

推荐使用场景主要有两个。

### 1. 存在昂贵计算

例如：

```text
大数组过滤
大数组排序
复杂递归计算
复杂数据转换
图表数据组装
大量列表分组统计
复杂派生状态
```

示例：

```tsx
const filteredList = useMemo(() => {
  return list.filter((item) => item.name.includes(keyword));
}, [list, keyword]);
```

如果 `list` 很大，过滤操作比较耗时，就适合使用 `useMemo`。

---

### 2. 需要稳定对象或数组引用

例如你要把对象或数组传给 `React.memo` 包裹的子组件：

```tsx
const columns = useMemo(() => {
  return [
    {
      title: "姓名",
      dataIndex: "name",
    },
    {
      title: "年龄",
      dataIndex: "age",
    },
  ];
}, []);

return <Table columns={columns} />;
```

或者：

```tsx
const user = useMemo(() => {
  return {
    name: username,
    role,
  };
}, [username, role]);

return <UserCard user={user} />;
```

这种场景下，`useMemo` 可以避免每次父组件渲染时创建新引用。

---

## 十一、什么时候不应该使用 useMemo？

`useMemo` 是性能优化工具，不是默认写法。

如果计算很简单，就没必要使用。

例如：

```tsx
const fullName = useMemo(() => {
  return firstName + lastName;
}, [firstName, lastName]);
```

这类计算非常便宜，直接写就可以：

```tsx
const fullName = firstName + lastName;
```

滥用 `useMemo` 反而会增加复杂度。

因为 React 维护 memo 缓存本身也有成本，包括：

```text
保存上一次结果
比较依赖数组
维护额外内存
增加代码阅读成本
```

所以不要为了“看起来高级”到处使用 `useMemo`。

正确原则是：

```text
先写清晰代码
发现性能问题
定位问题来源
再使用 useMemo 优化
```

---

## 十二、useMemo 的常见错误

### 1. 依赖数组漏写

错误示例：

```tsx
const result = useMemo(() => {
  return expensiveCalculation(num);
}, []);
```

这里 `result` 实际依赖 `num`，但依赖数组中没有写 `num`。

结果是：`num` 更新后，`result` 不会重新计算，页面可能显示旧数据。

正确写法：

```tsx
const result = useMemo(() => {
  return expensiveCalculation(num);
}, [num]);
```

---

### 2. 把所有计算都包进 useMemo

错误示例：

```tsx
const title = useMemo(() => {
  return "Hello " + name;
}, [name]);
```

这类计算没有必要缓存。

直接写：

```tsx
const title = "Hello " + name;
```

更简单，也更容易阅读。

---

### 3. 以为 useMemo 可以阻止组件重新渲染

`useMemo` 不能阻止当前组件重新渲染。

它只能在组件重新渲染时，避免某些计算重新执行。

例如：

```tsx
function App() {
  const value = useMemo(() => {
    return expensiveCalculation();
  }, []);

  return <div>{value}</div>;
}
```

组件仍然会重新执行，只是 `expensiveCalculation()` 不会每次都执行。

如果你想避免子组件不必要渲染，通常还需要配合 `React.memo`。

---

### 4. 过度依赖 useMemo 掩盖结构问题

有时候性能问题不是因为缺少 `useMemo`，而是组件结构设计不合理。

比如：

```text
状态放得太高
父组件承担了太多逻辑
大组件频繁整体刷新
列表没有拆分组件
key 使用不合理
```

这种情况下，单纯加 `useMemo` 可能只是治标不治本。

更好的方式是先优化组件结构，再考虑缓存计算结果。

---

## 十三、一个更贴近项目的例子

假设你有一个用户列表页面，需要根据关键词过滤用户：

```tsx
function UserList({ users }: { users: User[] }) {
  const [keyword, setKeyword] = useState("");
  const [count, setCount] = useState(0);

  const filteredUsers = users.filter((user) => {
    return user.name.includes(keyword);
  });

  return (
    <div>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索用户"
      />

      <button onClick={() => setCount(count + 1)}>Count: {count}</button>

      <ul>
        {filteredUsers.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

这里的问题是：点击 `count` 按钮时，`keyword` 没变，`users` 也没变，但过滤逻辑依然会重新执行。

如果 `users` 很大，可以使用 `useMemo`：

```tsx
function UserList({ users }: { users: User[] }) {
  const [keyword, setKeyword] = useState("");
  const [count, setCount] = useState(0);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      return user.name.includes(keyword);
    });
  }, [users, keyword]);

  return (
    <div>
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="搜索用户"
      />

      <button onClick={() => setCount(count + 1)}>Count: {count}</button>

      <ul>
        {filteredUsers.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

现在只有当 `users` 或 `keyword` 改变时，才会重新过滤列表。

---

## 十四、useMemo 最佳实践总结

使用 `useMemo` 时，可以记住下面几条原则：

### 1. 只在真正需要时使用

适合使用：

```text
昂贵计算
大数组处理
复杂对象生成
传递对象或数组给 memo 组件
避免重复生成引用
```

不适合使用：

```text
简单字符串拼接
简单数学计算
普通变量赋值
没有性能压力的场景
```

---

### 2. 依赖项必须准确

`useMemo` 的结果依赖哪些变量，就应该把哪些变量写进依赖数组。

例如：

```tsx
const value = useMemo(() => {
  return getValue(a, b, c);
}, [a, b, c]);
```

不要漏写依赖，否则可能出现旧数据。

---

### 3. 不要为了优化而优化

`useMemo` 本身也有成本。

如果一个计算本身非常简单，加 `useMemo` 可能不会提升性能，反而会让代码更复杂。

---

### 4. 配合 React.memo 使用效果更明显

当你希望减少子组件重复渲染时，常见组合是：

```text
React.memo：缓存子组件渲染
useMemo：缓存传给子组件的对象或数组
useCallback：缓存传给子组件的函数
```

---

### 5. 先保证正确性，再考虑性能

不要一开始就把所有值都包进 `useMemo`。

更推荐的流程是：

```text
先实现功能
再观察是否有性能问题
定位具体慢在哪里
最后针对性使用 useMemo
```

---

## 十五、总结

`useMemo` 是 React 中非常重要的性能优化 Hook。

它主要解决两个问题：

```text
1. 避免昂贵计算在每次渲染时重复执行
2. 缓存对象或数组引用，减少子组件不必要的重新渲染
```

它的基本写法是：

```tsx
const memoizedValue = useMemo(() => {
  return value;
}, [dependencies]);
```

当依赖项没有变化时，React 会复用上一次缓存的结果；当依赖项发生变化时，React 才会重新执行计算函数。

但需要注意的是，`useMemo` 不是万能优化手段，也不是所有变量都需要使用。过度使用 `useMemo` 可能增加代码复杂度，甚至带来额外性能成本。

一句话总结：

**useMemo 适合用来缓存昂贵计算结果和稳定引用，但不要滥用；只有当重复计算或引用变化真的带来性能问题时，它才是有价值的优化工具。**
