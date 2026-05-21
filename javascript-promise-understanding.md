# Promise 的理解与应用：从异步结果容器到 async/await 实战

`Promise` 可以理解成“一个未来才会给你结果的容器”。

你现在先拿到一个 `Promise`，等异步任务结束后，它要么给你成功结果，也就是 `resolve`，要么给你失败原因，也就是 `reject`。然后你可以通过 `.then()`、`.catch()`、`.finally()` 来处理后续逻辑。

Promise 的核心价值是：让异步流程更可组合、更可链式处理，并且能用统一方式处理成功、失败和收尾逻辑。

---

## 1. Promise 的三个状态

Promise 有三个状态：

- `pending`：进行中，还没有结果。
- `fulfilled`：已成功，调用了 `resolve`。
- `rejected`：已失败，调用了 `reject`。

状态一旦从 `pending` 变成 `fulfilled` 或 `rejected`，就定型了，不能再改回去。

```txt
pending
  -> fulfilled
  -> rejected
```

注意：一个 Promise 最终只能成功一次或失败一次。

---

## 2. 怎么创建一个 Promise

最原始的写法是：

```ts
new Promise((resolve, reject) => {
  // async work
});
```

示例：

```ts
const promise = new Promise((resolve, reject) => {
  const result = 1 + 1;

  if (result === 2) {
    resolve('success');
  } else {
    reject('failed');
  }
});
```

这里有两个关键函数：

- `resolve(value)`：把 Promise 变成 `fulfilled`，并把 `value` 传给 `.then()`。
- `reject(error)`：把 Promise 变成 `rejected`，并把 `error` 传给 `.catch()`。

---

## 3. 怎么使用 Promise：then / catch / finally

```ts
promise
  .then(value => {
    console.log('then:', value);
  })
  .catch(error => {
    console.log('catch:', error);
  })
  .finally(() => {
    console.log('finally: always run');
  });
```

三者职责很清楚：

- `.then()`：处理成功。
- `.catch()`：处理失败。
- `.finally()`：不管成功失败都会执行，常用于关闭 loading、清理资源、恢复按钮状态等收尾逻辑。

比如：

```ts
setLoading(true);

fetchUser()
  .then(user => {
    setUser(user);
  })
  .catch(error => {
    setError(error);
  })
  .finally(() => {
    setLoading(false);
  });
```

---

## 4. 链式调用：Promise 的核心价值之一

`.then()` 可以返回一个新值，也可以返回一个新的 Promise，从而形成链式调用。

```ts
const promiseChain = new Promise<number>((resolve) => {
  resolve(2);
});

promiseChain
  .then(result => {
    console.log(result); // 2
    return result * 2;
  })
  .then(result => {
    console.log(result); // 4
    return result * 2;
  })
  .then(result => {
    console.log(result); // 8
  })
  .catch(error => {
    console.log('错误:', error);
  });
```

再看接口请求场景：

```ts
fetch('/api/user')
  .then(response => response.json())
  .then(user => fetch(`/api/order?uid=${user.id}`))
  .then(response => response.json())
  .then(orders => {
    console.log(orders);
  })
  .catch(error => {
    console.error('error:', error);
  });
```

链式调用的规则很重要：

- 在 `.then()` 里 return 普通值：下一层 `.then()` 直接拿到这个值。
- 在 `.then()` 里 return Promise：下一层 `.then()` 会等待这个 Promise 完成后拿到结果。
- 在任意 `.then()` 里 throw，或者返回 `Promise.reject(...)`：会直接跳到最近的 `.catch()`。

示例：

```ts
Promise.resolve(1)
  .then(value => {
    return value + 1;
  })
  .then(value => {
    return Promise.resolve(value + 1);
  })
  .then(value => {
    throw new Error(`failed at ${value}`);
  })
  .catch(error => {
    console.log(error.message);
  });
```

---

## 5. Promise 的进阶方法

### 5.1 Promise.all：全都成功才成功

`Promise.all()` 会并行执行多个 Promise，全部成功才成功；任何一个失败就失败。

```ts
const recordVideoOne = new Promise(resolve => {
  resolve('视频 1 录制完成');
});

const recordVideoTwo = new Promise(resolve => {
  resolve('视频 2 录制完成');
});

const recordVideoThree = new Promise(resolve => {
  resolve('视频 3 录制完成');
});

Promise.all([
  recordVideoOne,
  recordVideoTwo,
  recordVideoThree,
]).then(messages => {
  console.log(messages);
  // ['视频 1 录制完成', '视频 2 录制完成', '视频 3 录制完成']
});
```

适合场景：

- 多个接口必须都成功，页面才能渲染。
- 支付成功后同时发邮件、更新库存、刷新账户信息。
- 多个独立异步任务可以并行执行。

### 5.2 Promise.race：谁先完成就用谁

`Promise.race()` 会返回最先完成的 Promise 结果。成功或失败都算“完成”。

```ts
Promise.race([
  recordVideoOne,
  recordVideoTwo,
  recordVideoThree,
]).then(message => {
  console.log(message);
});
```

适合场景：

- 请求超时控制。
- 多个任务竞速，谁先返回就用谁。

比如：

```ts
function timeout(ms: number) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), ms);
  });
}

await Promise.race([
  fetch('/api/data'),
  timeout(5000),
]);
```

### 5.3 Promise.allSettled：不管成功失败都等完

`Promise.allSettled()` 会等待所有 Promise 完成，不管成功还是失败。

```ts
Promise.allSettled([p1, p2]).then(results => {
  console.log(results);
});
```

返回结果里每一项都有状态：

```ts
[
  { status: 'fulfilled', value: 'success' },
  { status: 'rejected', reason: 'failed' },
]
```

适合场景：

- 批量上传文件。
- 多个接口互不影响，部分失败也要展示可用数据。
- 批量任务需要统计成功和失败数量。

### 5.4 Promise.any：只要有一个成功就成功

`Promise.any()` 只要有一个 Promise 成功就成功；只有全部失败才失败。

适合场景：

- 多个镜像源取最快可用的成功结果。
- 多个服务节点里选择一个成功响应。

```ts
const result = await Promise.any([
  fetchFromMirrorA(),
  fetchFromMirrorB(),
  fetchFromMirrorC(),
]);
```

---

## 6. Promise vs 回调函数

Promise 之前，异步流程通常通过回调函数组织。复杂场景下很容易变成回调地狱。

### 6.1 传统回调写法

```ts
function checkUserExists(userId, onSuccess, onError) {
  setTimeout(() => {
    if (userId === 'user123') {
      console.log('用户存在');
      onSuccess(userId);
    } else {
      onError('用户不存在');
    }
  }, 1000);
}

function validatePassword(userId, password, onSuccess, onError) {
  setTimeout(() => {
    if (password === 'correct123') {
      console.log('密码正确');
      onSuccess({ userId, token: 'abc123' });
    } else {
      onError('密码错误');
    }
  }, 1000);
}

function getUserProfile(token, onSuccess, onError) {
  setTimeout(() => {
    if (token === 'abc123') {
      console.log('获取用户资料成功');
      onSuccess({
        name: '张三',
        email: 'zhangsan@example.com',
        avatar: 'avatar.jpg',
      });
    } else {
      onError('Token 无效');
    }
  }, 1000);
}
```

使用时会出现多层嵌套：

```ts
checkUserExists(
  'user123',
  userId => {
    validatePassword(
      userId,
      'correct123',
      authData => {
        getUserProfile(
          authData.token,
          profile => {
            console.log('登录成功！', profile);
          },
          profileError => {
            console.log('获取资料失败:', profileError);
          }
        );
      },
      passwordError => {
        console.log('密码验证失败:', passwordError);
      }
    );
  },
  userError => {
    console.log('用户验证失败:', userError);
  }
);
```

问题是：

- 嵌套越来越深。
- 错误处理分散。
- 流程难读。
- 后续维护成本高。

### 6.2 Promise 改写

```ts
function checkUserExistsPromise(userId: string) {
  return new Promise<string>((resolve, reject) => {
    setTimeout(() => {
      if (userId === 'user123') {
        console.log('用户存在');
        resolve(userId);
      } else {
        reject('用户不存在');
      }
    }, 1000);
  });
}

function validatePasswordPromise(userId: string, password: string) {
  return new Promise<{ userId: string; token: string }>((resolve, reject) => {
    setTimeout(() => {
      if (password === 'correct123') {
        console.log('密码正确');
        resolve({ userId, token: 'abc123' });
      } else {
        reject('密码错误');
      }
    }, 1000);
  });
}

function getUserProfilePromise(token: string) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (token === 'abc123') {
        console.log('获取用户资料成功');
        resolve({
          name: '张三',
          email: 'zhangsan@example.com',
          avatar: 'avatar.jpg',
        });
      } else {
        reject('Token 无效');
      }
    }, 1000);
  });
}
```

使用 Promise 后：

```ts
checkUserExistsPromise('user123')
  .then(userId => validatePasswordPromise(userId, 'correct123'))
  .then(authData => getUserProfilePromise(authData.token))
  .then(profile => {
    console.log('登录成功！', profile);
  })
  .catch(error => {
    console.log('登录失败:', error);
  });
```

Promise 的优势是：

- 异步流程可以链式表达。
- 错误可以统一进入 `.catch()`。
- 嵌套层级明显减少。
- 更容易组合并行任务。

---

## 7. 多个并行 API 请求

在真实项目里，常见场景是页面需要同时请求多个接口。

比如结算页需要：

- 购物车数据。
- 用户信息。
- 商品库存。
- 优惠券。
- 推荐商品。

回调方式会很快变成多层嵌套。

Promise 方式可以并行执行：

```ts
Promise.all([
  getCartDataPromise(),
  getUserInfoPromise(),
  getProductStockPromise(),
  getCouponsPromise(),
  getRecommendationsPromise(),
])
  .then(([cartData, userInfo, stockInfo, coupons, recommendations]) => {
    renderCheckoutPage(
      cartData,
      userInfo,
      stockInfo,
      coupons,
      recommendations
    );
  })
  .catch(error => {
    console.log('页面数据获取失败:', error);
  });
```

如果希望部分失败也能继续：

```ts
Promise.allSettled([
  getCartDataPromise(),
  getUserInfoPromise(),
  getProductStockPromise(),
]).then(results => {
  const cartData =
    results[0].status === 'fulfilled' ? results[0].value : null;
  const userInfo =
    results[1].status === 'fulfilled' ? results[1].value : null;
  const stockInfo =
    results[2].status === 'fulfilled' ? results[2].value : null;

  renderPartialData(cartData, userInfo, stockInfo);
});
```

这里的选择原则是：

- 全部数据都必须成功：用 `Promise.all()`。
- 部分失败也能展示：用 `Promise.allSettled()`。
- 多个来源取最快成功结果：用 `Promise.any()`。
- 谁先完成就用谁，包括失败：用 `Promise.race()`。

---

## 8. async / await + Promise

现代 JavaScript 里，`async / await` 是 Promise 的语法糖。它没有替代 Promise，而是让 Promise 写起来更像同步代码。

比如支付流程：

```ts
async function processPayment(orderId: string, paymentMethod: string) {
  try {
    const order = await validateOrder(orderId);

    const paymentResult = await processPaymentGateway(
      paymentMethod,
      order.total
    );

    await updateOrderStatus(orderId, 'paid', paymentResult.transactionId);

    const sendReceipt = sendReceiptEmail(order.email, paymentResult);
    const updateInventory = updateInventoryAfterPayment(order.items);

    await Promise.all([sendReceipt, updateInventory]);

    return {
      success: true,
      transactionId: paymentResult.transactionId,
      message: '支付成功',
    };
  } catch (error) {
    console.error('支付流程失败:', error);

    await rollbackPayment(orderId);

    return {
      success: false,
      message: error instanceof Error ? error.message : '支付失败',
    };
  }
}
```

使用：

```ts
const result = await processPayment('order123', 'credit_card');

if (result.success) {
  console.log('支付成功');
} else {
  console.log('支付失败');
}
```

这里有几个重点：

- `await` 等待的是 Promise。
- `try/catch` 可以捕获 Promise reject。
- 多个独立任务不要一个个 await，可以先创建 Promise，再 `Promise.all()`。

---

## 9. 串行和并行的区别

很多性能问题来自“想并发，却写成了串行”。

### 串行写法

```ts
const user = await fetchUser();
const orders = await fetchOrders();
const notifications = await fetchNotifications();
```

这三个请求会一个接一个执行。

如果它们互不依赖，就应该并行。

### 并行写法

```ts
const userPromise = fetchUser();
const ordersPromise = fetchOrders();
const notificationsPromise = fetchNotifications();

const [user, orders, notifications] = await Promise.all([
  userPromise,
  ordersPromise,
  notificationsPromise,
]);
```

或者更简洁：

```ts
const [user, orders, notifications] = await Promise.all([
  fetchUser(),
  fetchOrders(),
  fetchNotifications(),
]);
```

原则是：

> 没有依赖关系的异步任务，优先并行。

---

## 10. 实战里最常见的坑

### 坑 1：在 then 里忘了 return

错误写法：

```ts
fetchUser()
  .then(user => {
    fetchOrders(user.id);
  })
  .then(orders => {
    console.log(orders); // undefined
  });
```

第一个 `.then()` 里没有 return，所以下一层拿不到订单。

正确写法：

```ts
fetchUser()
  .then(user => {
    return fetchOrders(user.id);
  })
  .then(orders => {
    console.log(orders);
  });
```

### 坑 2：Promise 嵌套过深

不要这样：

```ts
fetchUser().then(user => {
  fetchOrders(user.id).then(orders => {
    fetchOrderDetail(orders[0].id).then(detail => {
      console.log(detail);
    });
  });
});
```

应该用链式调用或 `async / await`。

```ts
fetchUser()
  .then(user => fetchOrders(user.id))
  .then(orders => fetchOrderDetail(orders[0].id))
  .then(detail => {
    console.log(detail);
  });
```

### 坑 3：忘记 catch

每条 Promise 链都应该有错误处理。

```ts
fetchUser()
  .then(user => fetchOrders(user.id))
  .catch(error => {
    console.error(error);
  });
```

如果使用 `async / await`，就用 `try/catch`。

```ts
try {
  const user = await fetchUser();
  const orders = await fetchOrders(user.id);
} catch (error) {
  console.error(error);
}
```

### 坑 4：想并发却写成串行

错误写法：

```ts
const a = await fetchA();
const b = await fetchB();
const c = await fetchC();
```

如果三者互不依赖，应该写成：

```ts
const [a, b, c] = await Promise.all([
  fetchA(),
  fetchB(),
  fetchC(),
]);
```

### 坑 5：在 render 或循环里重复创建 Promise

在 React 组件 render 阶段直接创建 Promise，容易导致重复请求或状态抖动。

错误示例：

```tsx
function UserPanel({ id }: { id: string }) {
  const userPromise = fetchUser(id);

  return <div>...</div>;
}
```

更合理的做法是把请求放到 effect、事件、React Query、SWR 或框架数据层里。

```tsx
useEffect(() => {
  let ignore = false;

  fetchUser(id).then(user => {
    if (!ignore) {
      setUser(user);
    }
  });

  return () => {
    ignore = true;
  };
}, [id]);
```

---

## 11. Promise 在 React 项目里的典型位置

React 项目里，Promise 通常会出现在这些地方：

- 请求接口：`fetch()`、`axios()`。
- 表单提交：登录、注册、保存资料。
- 文件上传：上传图片、合同、附件。
- 并发加载页面数据：多个接口一起请求。
- 支付流程：验证订单、发起支付、更新状态、发送通知。
- Web3：读取链上数据、发送交易、等待交易确认。
- 定时任务和轮询：请求状态、刷新订单。

但 React 组件里不要随意把 Promise 写散。

更工程化的做法是：

- 请求逻辑放在 `api.ts` / `service.ts`。
- 页面用 React Query / SWR 管 server state。
- 表单提交用 mutation 或封装好的 action。
- 组件只处理 loading、success、error 和用户交互。

---

## 12. 总结

Promise 是一个未来结果的容器。

它有三种状态：

- `pending`：进行中。
- `fulfilled`：成功。
- `rejected`：失败。

它的核心用法是：

- `.then()` 处理成功。
- `.catch()` 处理失败。
- `.finally()` 做收尾。
- 链式调用组织串行异步流程。
- `Promise.all()` 处理全部成功的并行任务。
- `Promise.allSettled()` 处理部分失败也要继续的任务。
- `Promise.race()` 处理竞速。
- `Promise.any()` 获取最快成功结果。
- `async / await` 让 Promise 代码更接近同步写法。

真正写项目时，最重要的不是背 API，而是搞清楚异步任务之间有没有依赖：

- 有依赖：串行 await 或链式 then。
- 没依赖：并行创建 Promise，再 `Promise.all()`。
- 允许部分失败：用 `Promise.allSettled()`。
- 需要统一错误处理：用 `.catch()` 或 `try/catch`。

掌握这些规则后，Promise 就不只是一个异步语法点，而是组织前端异步业务流程的基础工具。
