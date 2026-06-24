# TypeScript 中如何优雅实现 Server-Sent Events：基于 Effect 的实时同步方案

在很多 Web 应用中，我们都需要“服务端主动推送消息到客户端”的能力。

例如：

```text
待办事项在多个客户端之间实时同步
聊天消息实时到达
后台任务状态实时更新
订单状态变化通知
协作编辑状态同步
系统公告实时推送
```

这类场景通常有几种实现方案：

```text
WebSocket
Server-Sent Events
轮询
长轮询
```

如果业务只需要 **服务端单向推送到客户端**，并不需要客户端和服务端之间进行高频双向通信，那么 **Server-Sent Events，简称 SSE**，是一个非常合适的选择。

本文将介绍一种基于 **TypeScript + Effect** 的 SSE 实现思路，包括服务端连接管理、连接清理、Keep Alive、事件推送，以及 React 前端如何建立连接、解析事件并更新本地缓存。

---

## 一、什么是 Server-Sent Events？

Server-Sent Events 是浏览器原生支持的一种服务端推送技术。

它允许客户端打开一条 HTTP 长连接，然后服务端通过这条连接持续向客户端发送事件。

它的特点是：

```text
基于 HTTP
浏览器原生支持
服务端向客户端单向推送
适合通知、状态同步、消息流等场景
比 WebSocket 更简单
```

和 WebSocket 相比，SSE 更适合这种场景：

```text
客户端主要是接收消息
服务端需要主动通知客户端
不需要复杂的双向实时通信
```

例如一个 Todo 应用：

```text
客户端 A 新增一条任务
服务端保存任务
服务端通过 SSE 通知客户端 B
客户端 B 收到事件后更新本地缓存
```

这样多个页面或多个设备之间的数据就可以保持同步。

---

## 二、Demo 场景：多个客户端同步 Todo 数据

假设我们有一个 Todo 应用，同时打开两个客户端。

当客户端 A 新增任务：

```text
do the dishes
```

客户端 B 会立刻收到同样的事件，并更新自己的本地缓存。

当客户端 B 删除任务、勾选任务完成状态时，客户端 A 也会同步更新。

整个流程大概是：

```text
用户操作 Todo
前端发起 mutation 请求
服务端修改数据库
服务端通过 SSE 推送事件
所有在线客户端收到事件
客户端更新本地缓存
页面自动同步
```

为了保证连接稳定，服务端还会定期发送 Keep Alive 事件，客户端则会监听这些事件。如果长时间没有收到 Keep Alive，就认为连接可能断开，然后触发重试逻辑。

---

## 三、为什么使用 Effect 实现 SSE？

在普通 TypeScript 项目中，实现 SSE 并不难。

但真正麻烦的是这些问题：

```text
连接什么时候建立？
连接什么时候断开？
断开后如何清理资源？
如何管理每个用户的多个连接？
如何保证事件推送类型安全？
如何处理失败、重试、超时？
如何避免内存里保留大量失效连接？
```

这些问题如果手写，代码很容易变得分散、混乱，而且难以测试。

Effect 的优势在于：

```text
可以用 Effect 管理异步流程
可以用 Scope 和 Finalizer 做资源清理
可以用 Queue 管理每条连接的事件队列
可以用 Stream 表达持续事件流
可以用 Schema 做运行时编码和解码
可以用 Retry、Timeout、Cause 处理失败和重试
```

所以基于 Effect 实现 SSE，核心思路会更清晰：

```text
连接是一个资源
事件流是一个 Stream
断开连接触发中断
中断时执行 finalizer
finalizer 负责注销连接
```

---

## 四、服务端 SSE 接口设计

首先需要提供一个 SSE endpoint。

例如：

```text
GET /sse
```

客户端访问这个接口后，服务端不立即结束响应，而是保持连接，并持续向客户端写入事件。

SSE 响应需要设置几个关键响应头：

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

其中：

```text
Content-Type: text/event-stream
```

表示当前响应是 SSE 事件流。

```text
Cache-Control: no-cache
```

表示不要缓存事件流。

```text
Connection: keep-alive
```

表示保持连接。

```text
X-Accel-Buffering: no
```

通常用于避免 Nginx 等代理层缓冲响应内容，否则客户端可能不能及时收到事件。

SSE 的基本事件格式是：

```text
event: message
data: {"text":"hello"}

```

注意最后需要两个换行符，用来表示一个事件结束。

---

## 五、连接清理为什么重要？

SSE 是长连接。

一旦客户端打开连接，服务端就需要在内存中保存这条连接，方便后续给它推送事件。

但是如果客户端关闭页面、刷新页面、断网，连接会断开。

如果服务端不清理这条连接，就会出现问题：

```text
内存里保存大量失效连接
每次推送事件时仍然遍历这些连接
无效连接越来越多
服务端内存和 CPU 被浪费
最终可能导致服务不稳定
```

所以 SSE 的关键点不是“如何发送事件”，而是：

```text
如何正确注册连接
如何正确注销连接
如何在连接断开时自动清理资源
```

这正是 Effect Finalizer 非常适合解决的问题。

---

## 六、使用 Effect Finalizer 做连接清理

Effect 中可以把一个连接看成一个资源。

当连接建立时，注册它。

当连接断开时，执行 finalizer 清理它。

伪代码可以理解为：

```ts
Effect.addFinalizer(() => {
  return unregisterConnection(connectionId, userId);
});
```

当客户端关闭连接后，HTTP handler 对应的 fiber 会被 interrupt。

fiber 被中断时，Effect 会关闭对应的 scope，并执行已注册的 finalizer。

也就是说：

```text
客户端连接 /sse
服务端创建连接资源
服务端注册 finalizer
客户端关闭连接
handler fiber 被 interrupt
scope 关闭
finalizer 执行
连接从连接表中移除
```

这比手动到处监听断开事件更加声明式，也更不容易遗漏资源清理。

---

## 七、Keep Alive 事件流

SSE 连接可能会因为网络、代理、浏览器策略等原因断开。

为了让连接保持活跃，同时让客户端知道服务端仍然在线，服务端通常会定期发送 Keep Alive 事件。

例如每 3 秒发送一次：

```text
event: keep-alive
data: alive

```

在 Effect 中，可以把 Keep Alive 表示成一个 Stream：

```ts
const keepAliveStream = Stream.repeat("event: keep-alive\ndata: alive").pipe(
  Stream.schedule(Schedule.spaced("3 seconds")),
);
```

实际写法可以根据项目中的 Effect API 调整，但核心思想是：

```text
创建一个无限 Stream
每隔固定时间产出一个 keep-alive 事件
把事件编码成 Uint8Array
写入 HTTP response stream
```

然后服务端返回一个 streaming response：

```ts
return HttpServerResponse.stream(bodyStream, {
  headers: {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "x-accel-buffering": "no",
    connection: "keep-alive",
  },
});
```

这样客户端就能持续收到事件。

---

## 八、SSE Manager：统一管理所有连接

为了让 SSE 能在业务服务中方便复用，建议创建一个独立的 `SSEManager` 服务。

它的职责是：

```text
注册连接
注销连接
向指定用户推送事件
```

内部可以维护一个结构：

```ts
Map<UserId, Connection[]>;
```

其中：

```text
key：用户 ID
value：该用户所有活跃连接
```

为什么一个用户会有多个连接？

因为用户可能同时打开多个页面：

```text
电脑浏览器打开一个页面
手机浏览器打开一个页面
同一个浏览器开多个 Tab
```

每个页面都可能建立一条 SSE 连接。

所以数据结构应该支持：

```text
一个用户对应多条连接
给用户推送事件时，推送到该用户所有活跃连接
```

---

## 九、连接对象应该保存什么？

每条连接至少需要保存两个信息：

```ts
type SSEConnection = {
  connectionId: string;
  queue: Queue<string>;
};
```

其中：

```text
connectionId：当前连接的唯一 ID
queue：当前连接的消息队列
```

服务端推送事件时，不是直接写 response，而是把事件写入对应连接的 Queue。

每条连接自己的 response stream 再从 Queue 中读取数据，并发送给客户端。

这样结构会更清楚：

```text
业务服务产生事件
SSEManager 找到用户连接
把事件 offer 到每条连接的 Queue
每条连接的 Stream 从 Queue 读取事件
事件发送到客户端
```

---

## 十、registerConnection：注册连接

当客户端访问 `/sse` 时，服务端会为这条连接创建一个新的 Queue，并生成一个 connectionId。

然后调用：

```ts
registerConnection(connectionId, queue, userId);
```

大致逻辑是：

```text
读取当前 userId 对应的连接列表
如果已有连接列表，把新连接追加进去
如果没有连接列表，创建一个新的连接数组
更新连接 Map
```

伪代码：

```ts
function registerConnection(connectionId, queue, userId) {
  return Ref.update(connectionsRef, (map) => {
    const connections = map.get(userId) ?? [];

    return map.set(userId, [
      ...connections,
      {
        connectionId,
        queue,
      },
    ]);
  });
}
```

这样就完成了连接注册。

---

## 十一、unregisterConnection：注销连接

当连接断开时，需要根据 `userId` 和 `connectionId` 找到对应连接，并把它从连接表中移除。

同时，还应该关闭对应的 Queue。

伪代码：

```ts
function unregisterConnection(connectionId, userId) {
  return Ref.modify(connectionsRef, (map) => {
    const connections = map.get(userId) ?? [];

    const connection = connections.find(
      (item) => item.connectionId === connectionId,
    );

    if (!connection) {
      return [Effect.void, map];
    }

    const nextConnections = connections.filter(
      (item) => item.connectionId !== connectionId,
    );

    const nextMap = map.set(userId, nextConnections);

    return [Queue.shutdown(connection.queue), nextMap];
  }).pipe(Effect.flatten);
}
```

这里有一个细节：`Ref.modify` 返回的是一个 tuple。

可以理解为：

```text
第一个值：这次 modify 操作最终要返回的结果
第二个值：Ref 的新状态
```

如果第一个值本身也是 Effect，就会出现嵌套 Effect，所以需要 `Effect.flatten`。

---

## 十二、notifyUser：向指定用户推送事件

当业务层需要通知某个用户时，可以调用：

```ts
notifyUser(userId, event);
```

它的大致流程是：

```text
从连接 Map 中读取 userId 对应的连接列表
如果没有连接，什么都不做
如果有连接，把事件编码成字符串
遍历所有连接
把事件 offer 到每条连接的 Queue
```

伪代码：

```ts
function notifyUser(userId, event) {
  return pipe(
    Ref.get(connectionsRef),
    Effect.flatMap((map) => {
      const connections = map.get(userId) ?? [];

      if (connections.length === 0) {
        return Effect.void;
      }

      return encodeEvent(event).pipe(
        Effect.flatMap((encoded) =>
          Effect.forEach(connections, (connection) =>
            Queue.offer(connection.queue, encoded),
          ),
        ),
      );
    }),
  );
}
```

这里建议使用 Schema 对事件进行编码。

例如：

```ts
const encoded = Schema.encodeSync(SSEEventSchema)(event);
```

然后再转换成 SSE 格式：

```text
event: data
data: {"tag":"TodoCreated","todo":{"id":"1","title":"do the dishes"}}

```

这样可以保证服务端发送出去的事件结构是受控的。

---

## 十三、服务端 Controller 如何接入 SSEManager？

在 `/sse` handler 中，大致需要做这些事：

```text
获取当前登录用户
生成 connectionId
创建 Queue
注册连接
添加 finalizer，连接断开时注销连接
创建 queue stream
创建 keep-alive stream
合并两个 stream
返回 text/event-stream response
```

伪代码：

```ts
const handler = Effect.gen(function* () {
  const currentUser = yield* CurrentUser;
  const sseManager = yield* SSEManager;

  const connectionId = crypto.randomUUID();
  const queue = yield* Queue.unbounded<string>();

  yield* sseManager.registerConnection({
    userId: currentUser.id,
    connectionId,
    queue,
  });

  yield* Effect.addFinalizer(() =>
    sseManager.unregisterConnection({
      userId: currentUser.id,
      connectionId,
    }),
  );

  const queueStream = Stream.fromQueue(queue);
  const keepAliveStream = createKeepAliveStream();

  const bodyStream = Stream.merge(queueStream, keepAliveStream).pipe(
    Stream.map((line) => `${line}\n\n`),
    Stream.map((line) => new TextEncoder().encode(line)),
  );

  return HttpServerResponse.stream(bodyStream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
});
```

其中最关键的是 finalizer：

```ts
yield *
  Effect.addFinalizer(() =>
    sseManager.unregisterConnection({
      userId: currentUser.id,
      connectionId,
    }),
  );
```

它保证客户端关闭连接后，服务端不会一直保存失效连接。

---

## 十四、测试通知接口

为了测试 SSE 推送，可以额外提供一个测试接口：

```text
POST /notify
```

这个接口只做一件事：

```text
向当前用户推送一个测试事件
```

例如推送：

```json
{
  "tag": "TestEvent",
  "message": "hello"
}
```

测试流程：

```text
客户端先连接 GET /sse
服务端开始发送 keep-alive
调用 POST /notify
客户端收到 TestEvent
多次调用 POST /notify
客户端收到多条事件
```

这样可以验证：

```text
连接是否建立成功
事件是否能推送
多个连接是否都能收到消息
连接断开后是否能清理
```

---

## 十五、React 前端如何接入 SSE？

前端可以创建一个专门负责 SSE 副作用的组件，例如：

```tsx
function SSEConnector() {
  useEffect(() => {
    // 建立 SSE 连接
    // 监听事件
    // 处理重试
    // 清理连接
  }, []);

  return null;
}
```

这个组件不渲染任何 UI，只负责建立连接和处理事件。

然后在全局 Provider 中使用：

```tsx
function GlobalProviders({ children }) {
  return (
    <>
      <SSEConnector />
      {children}
    </>
  );
}
```

这样整个应用启动后，SSE 连接就会自动建立。

---

## 十六、前端如何读取事件流？

原生方式可以使用浏览器的 `EventSource`：

```ts
const eventSource = new EventSource("/sse");

eventSource.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
});

eventSource.addEventListener("keep-alive", () => {
  console.log("keep alive");
});

return () => {
  eventSource.close();
};
```

这是最简单的方式。

不过视频中的实现使用的是 Effect Stream 方案：

```text
通过 API client 获取原始 Response
读取 response.body
把 ReadableStream 转成 Effect Stream
decode text
split lines
filter empty lines
区分 keep-alive 和 data event
用 Schema decode data
分发给不同业务模块
```

这种方式比 `EventSource` 更复杂，但好处是：

```text
类型安全更强
可以复用 Effect 的 Stream 能力
可以统一处理 retry、timeout、cause
可以共享同一条底层 stream
可以和项目已有 Effect 架构保持一致
```

---

## 十七、为什么需要共享 Stream？

浏览器中的 `ReadableStream` 通常只能被消费一次。

也就是说，如果你已经用一个消费者读取了 response body，另一个消费者就不能再重新读取同一个 body。

但在实际应用中，可能有多个模块都想消费 SSE 事件：

```text
Todo 模块关心 TodoCreated、TodoDeleted
Chat 模块关心 MessageCreated
Notification 模块关心 NotificationReceived
User 模块关心 UserUpdated
```

如果每个模块都重新建立一条 SSE 连接，会造成浪费。

更好的方式是：

```text
整个应用只建立一条 SSE 连接
把底层 stream share 出去
不同模块从共享 stream 中筛选自己关心的事件
```

Effect Stream 中可以使用类似 `Stream.share` 的能力实现广播。

整体思路是：

```text
原始 SSE Stream
decode text
split lines
share
keep-alive consumer
data-event consumer
业务模块 consumer
```

---

## 十八、前端 Keep Alive 检测与重试

服务端每隔几秒发送一次 Keep Alive。

前端可以做一个超时检测：

```text
如果 8 秒内没有收到 keep-alive
说明连接可能已经不可用
让当前 computation fail
触发 retry
重新建立连接
```

伪代码：

```ts
const keepAliveStream = sharedStream.pipe(
  Stream.filter((event) => event.type === "keep-alive"),
  Stream.timeout("8 seconds"),
);
```

这类机制可以让客户端在网络波动时自动恢复连接。

完整流程：

```text
连接正常：持续收到 keep-alive
网络异常：收不到 keep-alive
timeout 触发失败
retry 策略介入
等待网络恢复
重新连接 /sse
```

---

## 十九、数据事件的解码与过滤

SSE 事件最终会被解析成业务事件。

例如：

```json
{
  "tag": "TodoCreated",
  "todo": {
    "id": "1",
    "title": "do the dishes",
    "completed": false
  }
}
```

前端应该使用和服务端一致的 Schema 进行解码。

服务端负责 encode：

```ts
Schema.encode(SSEEventSchema)(event);
```

前端负责 decode：

```ts
Schema.decodeUnknownEither(SSEEventSchema)(payload);
```

如果解码失败，说明服务端推送了不符合约定的数据。

这种情况下可以：

```text
记录 warning
丢弃无效事件
继续处理后续有效事件
```

不要因为一条坏事件导致整个 SSE 连接永久失败。

---

## 二十、业务模块如何消费 SSE 事件？

以 Todo 模块为例，它只关心 Todo 相关事件：

```text
TodoCreated
TodoUpdated
TodoDeleted
TodoCompletedChanged
```

可以封装一个事件过滤工具：

```ts
function isTodoEvent(event: SSEEvent) {
  return event.tag.startsWith("Todo");
}
```

然后在 Todo 查询模块中消费事件：

```ts
const todoEventStream = sseEventStream.pipe(
  Stream.filter(isTodoEvent),
  Stream.tap((event) => {
    return Match.value(event).pipe(
      Match.tag("TodoCreated", handleTodoCreated),
      Match.tag("TodoUpdated", handleTodoUpdated),
      Match.tag("TodoDeleted", handleTodoDeleted),
      Match.exhaustive,
    );
  }),
);
```

事件到达后，可以更新本地缓存。

例如删除 Todo：

```ts
function handleTodoDeleted(event) {
  queryClient.setQueryData(["todos"], (oldTodos) => {
    return oldTodos.filter((todo) => todo.id !== event.todoId);
  });
}
```

新增 Todo：

```ts
function handleTodoCreated(event) {
  queryClient.setQueryData(["todos"], (oldTodos) => {
    return [...oldTodos, event.todo];
  });
}
```

这样就能做到：

```text
一个客户端操作
服务端推送事件
其他客户端收到事件
本地缓存更新
页面同步变化
```

---

## 二十一、处理 mutation 和 SSE 的竞态问题

在实时同步场景中，有一个常见问题：mutation 响应和 SSE 事件可能会同时更新缓存。

例如用户新增 Todo：

```text
客户端发送 createTodo mutation
服务端创建 Todo
服务端返回 mutation response
服务端同时通过 SSE 推送 TodoCreated
```

这可能导致本地缓存被重复插入一条 Todo。

解决方式之一是使用 optimistic id。

流程：

```text
客户端创建临时 optimisticId
mutation 请求带上 optimisticId
服务端创建真实 Todo 后，通过 SSE 返回 optimisticId
客户端收到 SSE 后，如果发现本地已有 optimisticId 对应项，就替换而不是新增
```

这样可以避免：

```text
mutation 更新一次
SSE 又更新一次
同一条数据重复出现
```

在实时应用中，这类竞态问题非常常见，必须提前考虑。

---

## 二十二、断网与重连处理

SSE 连接不是建立一次就永远可靠。

实际项目中需要考虑：

```text
用户断网
服务器重启
代理层超时
浏览器暂停后台页面
移动网络切换
服务端主动关闭连接
```

因此前端应该具备重连能力。

视频中的思路是：

```text
如果 stream 正常结束，也主动 fail
让 retry 策略接管
如果 stream 出错，记录 cause，然后 refail
如果没有网络，则等待网络恢复
网络恢复后重新连接
```

可以抽象成：

```text
连接应该无限期保持
除非用户退出登录或业务明确不需要
任何非业务主动关闭都应该触发重试
```

这对于实时同步应用非常重要。

---

## 二十三、为什么不用普通轮询？

轮询也能实现类似效果，例如每隔 5 秒请求一次 Todo 列表。

但它有几个缺点：

```text
实时性差
无变化时也会请求
请求次数多
服务端压力更大
客户端逻辑不够优雅
```

SSE 的优势是：

```text
有变化时服务端主动推送
实时性更好
连接模型简单
比 WebSocket 更轻量
适合单向通知
```

如果只是服务端通知客户端，SSE 往往比 WebSocket 更简单。

---

## 二十四、SSE、WebSocket 和轮询怎么选？

可以简单这样判断：

```text
只需要服务端推送：优先考虑 SSE
需要高频双向通信：使用 WebSocket
只是低频状态刷新：可以用轮询
```

例如：

```text
通知中心：SSE
订单状态更新：SSE
Todo 多端同步：SSE
聊天应用：WebSocket
多人协作编辑：WebSocket
后台任务进度：SSE
低频数据统计刷新：轮询
```

当然，具体选择还要结合业务复杂度、基础设施和团队技术栈。

---

## 二十五、实现 SSE 时的注意事项

### 1. 一定要清理连接

客户端断开后，服务端必须移除连接。

否则内存会不断增长。

---

### 2. 一定要发送 Keep Alive

很多代理层或运行时会关闭长时间没有数据的连接。

Keep Alive 可以降低连接被静默断开的概率。

---

### 3. 响应头必须正确

至少需要：

```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

如果使用 Nginx，还应考虑：

```http
X-Accel-Buffering: no
```

---

### 4. 事件格式要规范

SSE 事件需要用空行分隔。

例如：

```text
event: message
data: {"hello":"world"}

```

最后的空行非常重要。

---

### 5. 数据要可序列化

SSE 本质上发送的是文本。

所以事件 payload 应该是 JSON 可序列化的。

不要直接发送：

```text
函数
Date 对象未处理形式
Map
Set
循环引用对象
不可序列化结构
```

---

### 6. 前端要处理重试

连接断开是正常情况，不是异常情况。

前端应该有自动重连机制。

---

### 7. 一个用户可能有多个连接

不要假设一个用户只有一个客户端。

应该支持：

```text
同用户多 Tab
同用户多设备
同用户多浏览器
```

---

## 二十六、整体架构总结

一个比较完整的 SSE 实时同步架构可以这样设计：

```text
服务端：
1. 提供 GET /sse 长连接接口
2. 每个连接创建独立 Queue
3. SSEManager 维护 userId -> connections
4. 业务服务调用 notifyUser 推送事件
5. Keep Alive Stream 保持连接活跃
6. Finalizer 在连接断开时清理资源

前端：
1. 全局 SSEConnector 建立连接
2. 读取服务端事件流
3. 解析 keep-alive 和业务事件
4. 使用 Schema 解码事件
5. 按业务 namespace 分发事件
6. 更新 query cache
7. 断线后自动重试
```

这样可以实现一个比较稳定的实时同步系统。

---

## 二十七、总结

Server-Sent Events 是一种非常适合“服务端向客户端推送事件”的技术。

相比 WebSocket，它更简单；相比轮询，它更实时、更节省资源。

在 TypeScript 项目中，如果结合 Effect，可以把 SSE 中最复杂的部分抽象得更加清晰：

```text
用 Stream 表达事件流
用 Queue 表达连接消息队列
用 Ref 管理连接状态
用 Finalizer 做连接清理
用 Schema 保证事件类型安全
用 Retry 和 Timeout 处理断线重连
```

最终我们可以实现这样的效果：

```text
多个客户端同时在线
任意客户端修改 Todo
服务端推送事件
所有客户端实时更新本地缓存
连接断开后自动清理
网络恢复后自动重连
```

一句话总结：

**SSE 的核心不是简单地把事件发出去，而是要把连接管理、资源清理、事件编码、前端解码和重连机制都设计完整。Effect 的资源管理和 Stream 模型非常适合构建这种可靠的实时推送系统。**
