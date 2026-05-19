# 前端如何落地 SSE：从实时评论到可复用的实时数据 Hook

在前端项目里，“实时更新”是一个很常见的需求。

比如：

- 用户支付完成后，页面需要知道支付状态有没有更新。
- 后台任务执行中，前端需要展示任务进度。
- 直播比赛页面，需要实时展示文字评论。
- Dashboard 页面，需要实时刷新统计数据。
- Web3 项目里，也可能需要展示交易状态、链上事件、价格变化或者任务队列状态。

一说到实时通信，很多人第一反应是 WebSocket。但实际上，WebSocket 并不是所有实时场景的默认答案。

如果业务只是“服务端有新数据时推给前端”，客户端并不需要频繁向服务端发送消息，那么 SSE，也就是 Server-Sent Events，反而是一个更轻量、更直接的方案。

这篇文章会用一个“体育比赛实时评论”的例子，讲清楚前端如何落地 SSE，包括后端接口格式、前端 EventSource 使用方式，以及如何把 SSE 封装成一个可复用的自定义 Hook。

---

## 一、SSE 适合解决什么问题？

SSE 的全称是 Server-Sent Events。

从名字就可以看出来，它的核心特点是：

```txt
服务端主动向客户端发送事件。
```

它是一个 server to client 的单向实时通信方案。

也就是说，客户端建立连接之后，服务端可以持续向客户端推送数据。客户端只负责接收数据并更新 UI。

它非常适合这些场景：

- 直播文字评论。
- 股票价格更新。
- 通知流。
- 订单状态变化。
- 后台任务进度。
- Dashboard 数据刷新。
- AI 生成任务状态。
- 链上事件监听结果推送。

这些场景有一个共同点：

```txt
前端不需要和服务端频繁双向通信，只需要服务端在数据变化时通知前端。
```

比如一个比赛直播页面，比赛过程中服务端不断拿到新的评论内容：

```txt
比赛开始
印度赢得 toss
第一球开始
打出四分
比赛结束
```

前端要做的事情就是：收到一条，展示一条。

这就是 SSE 很适合的场景。

---

## 二、SSE、轮询、WebSocket 怎么选？

在系统设计或者前端架构面试里，不能一说实时就直接回答 WebSocket。更合理的方式是先判断通信模型。

### 1. 轮询 / Long Polling

轮询就是前端定时请求接口。

比如每 3 秒请求一次：

```ts
setInterval(() => {
  fetch("/api/payment/status");
}, 3000);
```

这种方式实现非常简单，适合短时间状态确认。

比如：

- 支付状态确认。
- 订单创建后的短时间检查。
- 后台任务短时间等待。

缺点也很明显：

前端会不断发请求，即使服务端没有新数据，也会产生请求开销。如果用户量很大，服务端压力会明显上升。

所以轮询适合“短时间、低频、实现简单优先”的场景。

### 2. WebSocket

WebSocket 是双向通信。

服务端可以给客户端发消息，客户端也可以主动给服务端发消息。

适合这些场景：

- 聊天应用。
- 协作文档。
- 在线游戏。
- 金融交易终端。
- 多人实时互动。
- P2P 通信。

WebSocket 能力强，但复杂度也更高。

实际项目里要考虑：

- 连接管理。
- 心跳机制。
- 断线重连。
- 消息确认。
- 服务端扩容。
- 房间管理。
- 鉴权。
- 负载均衡。

所以 WebSocket 更适合真正需要双向实时通信的场景。

### 3. SSE

SSE 介于轮询和 WebSocket 之间。

它比轮询实时性更好，也更节省请求开销；它比 WebSocket 更轻量，因为它只解决服务端到客户端的单向推送。

适合：

- 服务端有新数据就推给前端。
- 客户端基本不需要通过同一条连接发消息。
- 实现复杂度不想上 WebSocket。

可以简单总结成：

```txt
短时间状态检查：轮询 / Long Polling
双向实时通信：WebSocket
服务端单向实时推送：SSE
```

---

## 三、SSE 的基本工作方式

SSE 本质上还是 HTTP。

客户端通过浏览器原生的 EventSource 建立连接：

```ts
const eventSource = new EventSource("/events");
```

服务端返回的不是普通 JSON，而是一个持续不断的事件流。

服务端需要设置关键响应头：

```txt
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

其中最核心的是：

```txt
Content-Type: text/event-stream
```

它告诉浏览器：这个响应不是普通文本，也不是普通 JSON，而是一个 SSE 事件流。

服务端每次推送数据时，需要使用固定格式：

```txt
data: {"id":1,"comment":"Match started"}\n\n
```

注意这里有两个关键点。

第一，数据前面必须有 `data:`。

第二，结尾必须有两个换行 `\n\n`。

也就是说，服务端写入时通常是这样：

```ts
res.write(`data: ${JSON.stringify(payload)}\n\n`);
```

浏览器收到之后，会触发 `eventSource.onmessage`。

---

## 四、后端实现一个最小 SSE 接口

下面用 Express 实现一个最小版 SSE 接口。

假设我们有一组比赛评论数据：

```ts
const comments = [
  "Match started",
  "India wins the toss and chooses to bat",
  "First ball of the match",
  "It is a four",
  "India wins the match",
];
```

然后实现 `/events` 接口：

```ts
import express from "express";

const app = express();

const comments = [
  "Match started",
  "India wins the toss and chooses to bat",
  "First ball of the match",
  "It is a four",
  "India wins the match",
];

app.get("/events", (req, res) => {
  // 1. 告诉浏览器这是 SSE 事件流
  res.setHeader("Content-Type", "text/event-stream");

  // 2. 禁止缓存，避免中间层缓存事件流
  res.setHeader("Cache-Control", "no-cache");

  // 3. 保持长连接
  res.setHeader("Connection", "keep-alive");

  let index = 0;

  const timer = setInterval(() => {
    if (index >= comments.length) {
      clearInterval(timer);
      res.end();
      return;
    }

    const payload = {
      id: index + 1,
      title: "India vs Australia Live Score",
      comment: comments[index],
      time: new Date().toLocaleTimeString(),
    };

    // 重点：SSE 消息格式必须是 data: xxx\n\n
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    index += 1;
  }, 3000);

  // 客户端断开连接时清理 timer，避免内存泄漏
  req.on("close", () => {
    clearInterval(timer);
  });
});

app.listen(3001, () => {
  console.log("SSE server running on http://localhost:3001");
});
```

这个接口的运行方式是：

```txt
客户端连接 /events
服务端保持连接不关闭
每 3 秒推送一条 comment
客户端关闭页面或断开连接时，服务端清理定时器
```

这里最重要的不是 Express，而是 SSE 的响应格式。

核心代码只有两块：

```ts
res.setHeader("Content-Type", "text/event-stream");
```

和：

```ts
res.write(`data: ${JSON.stringify(payload)}\n\n`);
```

---

## 五、前端用 EventSource 消费 SSE

浏览器原生支持 EventSource，所以前端不需要额外安装库。

在 React 组件里可以这样写：

```tsx
"use client";

import { useEffect, useState } from "react";

type Commentary = {
  id: number;
  title: string;
  comment: string;
  time: string;
};

export default function CommentaryPage() {
  const [comments, setComments] = useState<Commentary[]>([]);

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:3001/events");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as Commentary;
      setComments((prev) => [data, ...prev]);
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <main>
      <h1>Live Commentary</h1>
      <ul>
        {comments.map((item) => (
          <li key={item.id}>
            <strong>{item.time}</strong>
            <p>{item.comment}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

这段代码的逻辑很直接：

- 组件挂载时创建 EventSource。
- 收到消息后 `JSON.parse(event.data)`。
- 把新评论插入 comments 数组。
- 组件卸载时关闭连接。
- 出错时关闭连接。

这里有一个关键点：

```ts
setComments((prev) => [data, ...prev]);
```

这表示把最新消息放到最前面，所以页面会优先展示最新评论。

---

## 六、基础写法的问题

上面的写法可以运行，但如果放在真实项目里，会有几个问题。

### 1. 组件里混入了太多数据订阅逻辑

组件不仅要负责 UI，还要负责：

- 创建 EventSource。
- 监听 message。
- 解析数据。
- 处理 error。
- 关闭连接。
- 维护 comments 状态。

这会让组件变得越来越重。

### 2. 多个组件使用同一个数据源时会重复创建连接

比如：

- 顶部通知栏要展示最新评论。
- 主内容区要展示完整评论列表。
- 侧边栏也要展示实时事件。

如果每个组件都自己 `new EventSource`，就会产生多个连接，不够优雅。

### 3. SSE 本质上是一个外部数据源

它不是 React 内部状态天然产生的数据，而是浏览器外部 API 推过来的数据。

对这种数据源，React 官方提供了一个很适合的 Hook：

```ts
useSyncExternalStore;
```

---

## 七、用 useSyncExternalStore 封装 SSE

`useSyncExternalStore` 专门用于订阅 React 外部的数据源。

例如：

- 浏览器 API。
- WebSocket。
- SSE。
- 自定义全局 store。
- 第三方状态管理库。

它的基本形式是：

```ts
useSyncExternalStore(subscribe, getSnapshot);
```

其中：

- `subscribe`：负责订阅外部数据变化。
- `getSnapshot`：返回当前数据快照。

我们可以把 SSE 数据维护在模块级变量里，然后让多个组件订阅这个 store。

---

## 八、实现 useCommentaryStore

先定义数据类型：

```ts
export type Commentary = {
  id: number;
  title: string;
  comment: string;
  time: string;
};
```

然后创建一个文件：

```txt
hooks/use-commentary-store.ts
```

代码如下：

```ts
"use client";

import { useSyncExternalStore } from "react";

export type Commentary = {
  id: number;
  title: string;
  comment: string;
  time: string;
};

type Listener = () => void;

let comments: Commentary[] = [];
let eventSource: EventSource | null = null;

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function getSnapshot() {
  return comments;
}

function subscribe(listener: Listener) {
  listeners.add(listener);

  if (!eventSource) {
    connectSSE();
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      closeSSE();
    }
  };
}

function connectSSE() {
  eventSource = new EventSource("http://localhost:3001/events");

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as Commentary;
      comments = [data, ...comments];
      notify();
    } catch (error) {
      console.error("Failed to parse SSE message:", error);
    }
  };

  eventSource.onerror = (error) => {
    console.error("SSE error:", error);
    closeSSE();
  };
}

function closeSSE() {
  eventSource?.close();
  eventSource = null;
}

export function useCommentaryStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

这段代码做了几件事。

第一，用模块级变量保存数据：

```ts
let comments: Commentary[] = [];
```

第二，用 Set 保存所有订阅者：

```ts
const listeners = new Set<Listener>();
```

第三，收到 SSE 消息后更新 comments：

```ts
comments = [data, ...comments];
```

第四，通知所有订阅组件：

```ts
notify();
```

第五，React 收到通知后，会重新调用：

```ts
getSnapshot();
```

然后组件拿到最新的 comments 并重新渲染。

---

## 九、组件中使用封装后的 Hook

封装完成后，组件就非常干净了：

```tsx
"use client";

import { useCommentaryStore } from "@/hooks/use-commentary-store";

export default function CommentaryPage() {
  const comments = useCommentaryStore();

  return (
    <main>
      <h1>Live Commentary</h1>
      <ul>
        {comments.map((item) => (
          <li key={item.id}>
            <strong>{item.time}</strong>
            <p>{item.comment}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

现在组件不需要关心：

- EventSource 怎么创建。
- 消息怎么监听。
- 错误怎么处理。
- 连接什么时候关闭。
- 多个组件怎么共享连接。

组件只负责一件事：

```txt
拿到 comments，然后渲染 UI。
```

这就是比较理想的前端落地方式。

---

## 十、进一步封装成通用 SSE Hook

上面的 `useCommentaryStore` 是针对评论业务写死的。如果想在项目里复用，可以继续抽象成通用 Hook。

比如：

```ts
type UseSSEOptions<T> = {
  url: string;
  parser?: (event: MessageEvent) => T;
};

export function createSSEStore<T>({ url, parser }: UseSSEOptions<T>) {
  type Listener = () => void;

  let data: T[] = [];
  let eventSource: EventSource | null = null;

  const listeners = new Set<Listener>();

  const notify = () => {
    listeners.forEach((listener) => listener());
  };

  const getSnapshot = () => data;

  const close = () => {
    eventSource?.close();
    eventSource = null;
  };

  const connect = () => {
    eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const nextData = parser ? parser(event) : (JSON.parse(event.data) as T);
        data = [nextData, ...data];
        notify();
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
      close();
    };
  };

  const subscribe = (listener: Listener) => {
    listeners.add(listener);

    if (!eventSource) {
      connect();
    }

    return () => {
      listeners.delete(listener);

      if (listeners.size === 0) {
        close();
      }
    };
  };

  return function useSSEStore() {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  };
}
```

然后具体业务里这样使用：

```ts
type Commentary = {
  id: number;
  title: string;
  comment: string;
  time: string;
};

export const useCommentaryStore = createSSEStore<Commentary>({
  url: "http://localhost:3001/events",
});
```

以后如果有别的业务，例如任务进度：

```ts
type TaskProgress = {
  taskId: string;
  status: "queued" | "processing" | "success" | "failed";
  progress: number;
};

export const useTaskProgressStore = createSSEStore<TaskProgress>({
  url: "http://localhost:3001/tasks/events",
});
```

组件里只需要：

```ts
const taskEvents = useTaskProgressStore();
```

这种设计更适合真实项目。

---

## 十一、SSE 在 Next.js 里的落地方式

如果是 Next.js App Router，可以在 Route Handler 里返回 ReadableStream。

例如：

```ts
// app/api/events/route.ts
export async function GET() {
  const encoder = new TextEncoder();

  const comments = [
    "Match started",
    "India wins the toss and chooses to bat",
    "First ball of the match",
    "It is a four",
    "India wins the match",
  ];

  const stream = new ReadableStream({
    start(controller) {
      let index = 0;

      const timer = setInterval(() => {
        if (index >= comments.length) {
          clearInterval(timer);
          controller.close();
          return;
        }

        const payload = {
          id: index + 1,
          title: "India vs Australia Live Score",
          comment: comments[index],
          time: new Date().toLocaleTimeString(),
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
        );
        index += 1;
      }, 3000);

      return () => {
        clearInterval(timer);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

前端直接连接：

```ts
const eventSource = new EventSource("/api/events");
```

不过在生产环境里要注意部署平台是否支持长连接。某些 serverless 环境对长连接、超时时间、响应流支持有限。SSE 更适合部署在支持持久连接的 Node 服务、边缘运行时或专门的实时服务层上。

---

## 十二、真实项目里要注意的问题

SSE 看起来简单，但落地时仍然要注意几个工程问题。

### 1. 一定要关闭连接

组件卸载时必须调用：

```ts
eventSource.close();
```

否则可能造成连接泄漏。

如果你使用 `useSyncExternalStore` 封装，也要在没有订阅者时关闭连接。

### 2. 服务端要监听 close

后端需要监听客户端断开：

```ts
req.on("close", () => {
  clearInterval(timer);
});
```

否则服务端可能继续执行 timer 或其他任务，造成资源浪费。

### 3. 消息格式要稳定

建议统一约定 SSE payload 格式：

```ts
type SSEMessage<T> = {
  type: string;
  data: T;
  timestamp: number;
};
```

例如：

```ts
res.write(
  `data: ${JSON.stringify({
    type: "comment.created",
    data: payload,
    timestamp: Date.now(),
  })}\n\n`,
);
```

前端就可以根据 type 做不同处理。

### 4. EventSource 默认只支持 GET

原生 EventSource 只能发 GET 请求，不适合携带复杂 body。

如果需要鉴权，常见方案是：

- 使用 Cookie 鉴权。
- URL query 携带短期 token。
- 服务端根据 session 判断用户。

不建议在 URL 里放长期敏感 token。

### 5. 需要处理重连和错误状态

浏览器的 EventSource 有自动重连能力，但真实项目里仍然建议维护连接状态：

```ts
type SSEStatus = "connecting" | "open" | "error" | "closed";
```

这样 UI 可以展示：

- 连接中。
- 实时更新中。
- 连接断开，正在重试。
- 连接失败。

### 6. 不适合双向实时业务

如果你的业务需要客户端频繁向服务端发送实时消息，例如聊天输入、协作文档编辑、游戏同步，应该优先考虑 WebSocket，而不是 SSE。

SSE 的定位不是替代 WebSocket，而是解决“服务端单向推送”这个更轻量的场景。

---

## 十三、用在 Web3 前端里的思路

如果放到 Web3 项目里，SSE 也很有价值。

比如用户发起交易之后，前端可以通过 SSE 监听后端的交易状态：

```txt
pending
submitted
confirmed
failed
indexed
```

或者监听后端索引服务推送的链上事件：

```txt
SwapCreated
TokenMinted
OrderFilled
AirdropClaimed
TaskCompleted
```

一个典型链路是：

```txt
用户在前端发起交易
  -> 钱包返回 transaction hash
  -> 前端把 hash 传给后端
  -> 后端监听链上确认 / indexer 状态
  -> 后端通过 SSE 推送状态给前端
  -> 前端实时更新 UI
```

这比前端一直轮询交易状态更优雅，也比直接上 WebSocket 更轻。

伪代码大概是：

```ts
const eventSource = new EventSource(`/api/tx-status?hash=${txHash}`);

eventSource.onmessage = (event) => {
  const message = JSON.parse(event.data);

  if (message.status === "confirmed") {
    showSuccessToast();
    eventSource.close();
  }

  if (message.status === "failed") {
    showErrorToast();
    eventSource.close();
  }
};
```

这种场景非常适合 SSE，因为它就是服务端把交易状态单向推给前端。

---

## 十四、总结

SSE 是一个很容易被低估的实时通信方案。

它不像 WebSocket 那样复杂，也比轮询更实时、更节省请求资源。对于“服务端单向推送给前端”的业务，SSE 是一个很合适的选择。

落地时可以按这个思路设计：

```txt
后端提供 text/event-stream 接口
服务端用 data: xxx\n\n 格式持续推送数据
前端用 EventSource 建立连接
收到消息后更新 UI
组件卸载时关闭连接
复杂项目里用 useSyncExternalStore 封装外部数据源
```

在真实项目里，不建议把 EventSource 逻辑直接堆在组件里。更推荐把它封装成自定义 Hook 或外部 store，让组件只负责渲染。

最终的架构应该是：

```txt
SSE API：负责推送事件
SSE Store / Hook：负责连接、订阅、解析、状态管理
UI Component：负责展示数据
```

这样既能保持实时能力，也能让前端代码结构更清晰，更容易复用和维护。

面试里可以这样表达：

> 如果业务是服务端单向推送，比如直播评论、通知流、后台任务进度、交易状态更新，我会优先考虑 SSE。它基于 HTTP，浏览器原生支持 EventSource，实现成本比 WebSocket 低。前端落地时，简单场景可以在 useEffect 里创建 EventSource；复杂项目里，我会把 SSE 封装成自定义 Hook，必要时结合 useSyncExternalStore 管理外部实时数据源，让 UI 和实时通信逻辑解耦。
