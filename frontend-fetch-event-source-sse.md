# 前端如何用 @microsoft/fetch-event-source 落地 SSE：比原生 EventSource 更灵活的实时推送方案

在前端实时数据场景里，我们通常会想到三种方案：轮询、WebSocket、SSE。

轮询最简单，但资源浪费明显；WebSocket 支持双向通信，但连接管理、心跳、重连、鉴权、服务端维护成本都更高；SSE 则适合一种很常见的场景：服务端持续向前端推送数据，但前端不需要频繁反向发送消息。

比如：

- 实时行情。
- 交易状态。
- 订单状态。
- AI 任务进度。
- 直播评论。
- 通知流。
- 数据看板更新。
- 支付状态刷新。

这些都很适合 SSE。

原生浏览器提供了 EventSource，但它有一个明显限制：只能发 GET 请求，不方便携带 body，也不方便像普通 fetch 那样处理 headers、authorization、POST 参数等业务信息。

这也是 `@microsoft/fetch-event-source` 的价值所在。

它本质上是基于 fetch 实现的 SSE 客户端封装，让我们可以用更接近普通 HTTP 请求的方式去消费服务端事件流。

---

## 一、原生 EventSource 的局限

原生 SSE 的前端写法通常是这样：

```ts
const eventSource = new EventSource("/api/events");

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};

eventSource.onerror = (error) => {
  console.error(error);
  eventSource.close();
};
```

这段代码足够简单，但问题也很明显。

首先，它只能发 GET 请求。你不能像 fetch 一样自然地传 `method: 'POST'`，也不能直接传 JSON body。

其次，业务鉴权不够舒服。比如你想在请求头里带：

```txt
Authorization: Bearer xxx
```

原生 EventSource 并不支持自定义 headers。虽然可以通过 cookie、query 参数等方式绕过去，但从工程角度看，这并不优雅。

第三，复杂业务场景下不方便传请求参数。比如一个行情流接口，前端可能要告诉后端：

```ts
{
  symbols: ['BTC-USDT', 'ETH-USDT'],
  interval: '1s',
}
```

如果用原生 EventSource，一般只能拼 query：

```txt
/api/stream?symbols=BTC-USDT,ETH-USDT&interval=1s
```

参数少还可以接受，一旦请求体复杂，就会变得很别扭。

所以原生 EventSource 更适合简单场景，而 `@microsoft/fetch-event-source` 更适合真实项目里的业务落地。

---

## 二、@microsoft/fetch-event-source 解决了什么

安装：

```bash
npm i @microsoft/fetch-event-source
```

它的核心能力是：用 fetch 的方式发起 SSE 请求。

也就是说，你可以这样写：

```ts
import { fetchEventSource } from "@microsoft/fetch-event-source";

await fetchEventSource("/api/v1/user/stats", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    id: 1,
  }),
  onmessage(event) {
    console.log(event.data);
  },
});
```

这个写法相比原生 EventSource 更接近真实业务里的 API 调用。

它可以支持：

- `POST` / `PUT` / `DELETE` 等 HTTP 方法。
- 自定义请求头，比如 Authorization。
- JSON body 请求体。
- AbortController 主动取消请求。
- `onopen` 阶段检查响应类型和鉴权错误。
- `onerror` 阶段自定义错误处理和重试逻辑。
- `onmessage` 阶段消费服务端推送的数据。

简单说，fetch-event-source 让 SSE 不再只是一个“只能 GET 的浏览器 API”，而是变成一个可以参与业务请求链路的实时通信工具。

---

## 三、后端如何配合 SSE

SSE 的服务端核心不是框架，而是响应格式。

不管你用 Express、NestJS、Next.js Route Handler，还是其他 Node 服务，只要服务端能够持续写入 HTTP response，并设置正确的响应头，就可以实现 SSE。

一个 Express 示例：

```ts
import type { Response } from "express";

export function prepStream(res: Response) {
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Connection", "keep-alive");

  // 如果经过 Nginx，建议关闭代理层 buffer
  res.setHeader("X-Accel-Buffering", "no");

  // 立即发送响应头
  res.flushHeaders();

  res.on("close", () => {
    res.end();
  });
}
```

这几个响应头很关键。

- `Content-Type: text/event-stream` 表示这是 SSE 事件流。
- `Cache-Control: no-cache` 表示不要缓存。
- `Connection: keep-alive` 表示保持长连接。
- `X-Accel-Buffering: no` 主要是为了避免 Nginx 之类的代理层把响应缓冲起来，否则前端可能不能实时收到数据。

然后在接口里持续写入数据：

```ts
router.post("/stats", (req, res) => {
  prepStream(res);

  let counter = 0;

  const timer = setInterval(() => {
    counter += 1;

    res.write(`event: message\n`);
    res.write(`data: ${JSON.stringify({ value: counter })}\n\n`);

    if (counter === 5) {
      clearInterval(timer);
      res.end();
    }
  }, 2000);

  res.on("close", () => {
    clearInterval(timer);
  });
});
```

SSE 的数据格式也要注意。

一条完整消息一般是：

```txt
event: message
data: {"value":1}
```

重点是最后需要两个换行：

```txt
\n\n
```

否则浏览器或客户端库可能不会认为这是一条完整事件。

---

## 四、前端基础写法

使用 fetchEventSource 的最小写法如下：

```ts
import { fetchEventSource } from "@microsoft/fetch-event-source";

async function requestStream() {
  await fetchEventSource("/api/v1/user/stats", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: 1,
    }),
    onmessage(event) {
      if (!event.data) return;

      const data = JSON.parse(event.data);
      console.log("stream data:", data);
    },
    onerror(error) {
      console.error("stream error:", error);
      throw error;
    },
  });
}
```

这里有几个关键点。

- `method` 可以是 POST，这就是它相比原生 EventSource 的明显优势。
- `headers` 可以带鉴权信息，比如 `Authorization: Bearer xxx`。
- `body` 可以传复杂业务参数。
- `onmessage` 负责消费服务端持续推送过来的数据。
- `onerror` 负责处理错误。

如果你在 `onerror` 里 `throw error`，它会停止内部自动重试；如果你不 throw，它可能会继续 retry。

这点在真实项目里很重要。比如 token 过期、接口 401、权限不足，如果你不主动终止或刷新 token，就可能出现一直重试的情况。

---

## 五、为什么需要 onopen：提前识别错误响应

一个成熟的 SSE 封装里，`onopen` 很关键。

因为真实业务里的接口不一定永远返回 `text/event-stream`。比如鉴权失败时，后端可能返回：

```json
{
  "code": 401,
  "message": "Unauthorized"
}
```

这时候响应类型就不是：

```txt
text/event-stream
```

而是：

```txt
application/json
```

所以我们应该在 `onopen` 里检查响应头：

```ts
onopen: async (response) => {
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    const errorBody = await response.json();
    throw errorBody;
  }

  if (!contentType?.includes("text/event-stream")) {
    throw new Error(`Unexpected content-type: ${contentType}`);
  }
};
```

这样做的好处是：前端可以在流开始前就识别普通 JSON 错误，避免后续解析 SSE 数据时出现奇怪问题。

尤其是有登录态、access token、refresh token 的系统，这个处理非常必要。

---

## 六、AbortController：主动取消 SSE 请求

fetch-event-source 支持传入 `signal`：

```ts
const controller = new AbortController();

fetchEventSource("/api/v1/user/stats", {
  method: "POST",
  signal: controller.signal,
  onmessage(event) {
    console.log(event.data);
  },
});

// 主动取消
controller.abort();
```

这在前端很常见。

比如组件卸载时取消连接：

```tsx
useEffect(() => {
  const controller = new AbortController();

  fetchEventSource("/api/v1/user/stats", {
    method: "POST",
    signal: controller.signal,
    onmessage(event) {
      console.log(event.data);
    },
  });

  return () => {
    controller.abort();
  };
}, []);
```

或者用户切换 token、切换交易对、切换页面时，取消旧连接，重新建立新连接。

在行情、订单、任务流这种场景里，如果不取消旧连接，很容易出现多个流同时写入状态，导致 UI 数据错乱。

---

## 七、openWhenHidden：页面隐藏时是否继续拉流

fetch-event-source 有一个配置：

```ts
openWhenHidden: true;
```

它控制的是：当浏览器页面切到后台、tab 不可见时，是否继续保持连接。

默认行为和原生 EventSource 不完全一样。为了节省资源，库内部会根据页面可见性处理连接。

如果你的场景是：

- AI 任务进度。
- 订单状态。
- 支付状态。
- 行情数据。
- 交易结果确认。

那么你可能希望页面切走后仍然继续接收事件，可以设置：

```ts
openWhenHidden: true;
```

如果只是一些不重要的通知流、推荐流、低优先级看板数据，可以保持默认策略，减少无意义请求。

这个配置要根据业务取舍，不是永远 true，也不是永远 false。

---

## 八、封装一个通用的 useFetchSSE Hook

在真实项目里，不应该在组件里到处直接写 fetchEventSource。

更好的方式是封装成 Hook，让组件只关心数据，不关心连接细节。

下面是一个基础版封装：

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

type UseFetchSSEOptions<TPayload, TData> = {
  url: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  payload?: TPayload;
  headers?: Record<string, string>;
  enabled?: boolean;
  openWhenHidden?: boolean;
  onMessage?: (data: TData) => void;
  onError?: (error: unknown) => void;
};

export function useFetchSSE<TPayload = unknown, TData = unknown>({
  url,
  method = "POST",
  payload,
  headers,
  enabled = true,
  openWhenHidden = true,
  onMessage,
  onError,
}: UseFetchSSEOptions<TPayload, TData>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const close = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setLoading(false);
  }, []);

  const start = useCallback(async () => {
    close();

    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      await fetchEventSource(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: method === "GET" ? undefined : JSON.stringify(payload ?? {}),
        signal: controller.signal,
        openWhenHidden,
        async onopen(response) {
          const contentType = response.headers.get("content-type");

          if (contentType?.includes("application/json")) {
            const errorBody = await response.json();
            throw errorBody;
          }

          if (!contentType?.includes("text/event-stream")) {
            throw new Error(`Unexpected content-type: ${contentType}`);
          }
        },
        onmessage(event) {
          if (!event.data) return;

          try {
            const data = JSON.parse(event.data) as TData;
            onMessage?.(data);
          } catch (parseError) {
            console.error("SSE message parse error:", parseError);
          }
        },
        onerror(err) {
          setError(err);
          onError?.(err);

          // throw 后会停止 fetch-event-source 内部 retry
          throw err;
        },
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err);
        onError?.(err);
      }
    } finally {
      setLoading(false);
    }
  }, [
    url,
    method,
    headers,
    payload,
    openWhenHidden,
    onMessage,
    onError,
    close,
  ]);

  useEffect(() => {
    if (!enabled) return;

    start();

    return () => {
      close();
    };
  }, [enabled, start, close]);

  return {
    loading,
    error,
    start,
    close,
  };
}
```

这个 Hook 做了几件事：

- 统一创建 AbortController。
- 组件卸载时自动关闭连接。
- 支持 POST body。
- 支持 headers 鉴权。
- 支持 `onopen` 检查响应类型。
- 支持 `onmessage` 解析 JSON。
- 支持 `onerror` 抛出错误，停止异常重试。
- 暴露 `start` 和 `close` 给业务层手动控制。

组件里使用时就很清晰了：

```tsx
type StatsPayload = {
  id: number;
};

type StatsMessage = {
  value: number;
};

export function StatsPanel() {
  const [messages, setMessages] = useState<StatsMessage[]>([]);

  const { loading, error, start, close } = useFetchSSE<
    StatsPayload,
    StatsMessage
  >({
    url: "/api/v1/user/stats",
    method: "POST",
    payload: {
      id: 1,
    },
    openWhenHidden: true,
    onMessage(data) {
      setMessages((prev) => [...prev, data]);
    },
  });

  return (
    <div>
      <button onClick={start}>Start Stream</button>
      <button onClick={close}>Close Stream</button>

      {loading && <div>Streaming...</div>}
      {error && <div>Stream error</div>}

      <pre>{messages.map((item) => item.value).join("\n")}</pre>
    </div>
  );
}
```

这样组件只负责 UI，流式通信逻辑被封装到 Hook 里。

---

## 九、进一步封装成外部 Store

如果一个 SSE 流的数据需要被多个组件消费，比如：

- 顶部通知组件。
- 订单列表组件。
- 交易详情组件。
- Toast 提醒组件。

那么只在某个组件里 `useState` 不一定合适。因为组件卸载后状态就丢了，而且多个组件可能会重复建立连接。

这时候可以参考外部 Store 的思路，用 `useSyncExternalStore` 管理 SSE 数据。

简单模型如下：

```ts
import { useSyncExternalStore } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";

type StreamMessage = {
  value: number;
};

let messages: StreamMessage[] = [];
let started = false;
let controller: AbortController | null = null;

const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((callback) => callback());
}

function subscribe(callback: () => void) {
  subscribers.add(callback);

  if (!started) {
    startStream();
  }

  return () => {
    subscribers.delete(callback);

    if (subscribers.size === 0) {
      stopStream();
    }
  };
}

function getSnapshot() {
  return messages;
}

async function startStream() {
  started = true;
  controller = new AbortController();

  try {
    await fetchEventSource("/api/v1/user/stats", {
      method: "POST",
      body: JSON.stringify({ id: 1 }),
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      openWhenHidden: true,
      onmessage(event) {
        if (!event.data) return;

        const data = JSON.parse(event.data) as StreamMessage;
        messages = [...messages, data];
        notify();
      },
      onerror(error) {
        throw error;
      },
    });
  } finally {
    started = false;
  }
}

function stopStream() {
  controller?.abort();
  controller = null;
  started = false;
}

export function useStatsStreamStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
```

业务组件中使用：

```tsx
export function StatsList() {
  const messages = useStatsStreamStore();

  return <pre>{messages.map((item) => item.value).join("\n")}</pre>;
}
```

这种封装的好处是：

- SSE 连接和 React 组件解耦。
- 多个组件可以共享同一份流数据。
- 组件只订阅数据变化，不直接管理连接。
- 最后一个组件卸载时，可以自动关闭连接。
- 适合全局通知、实时订单、交易行情、任务进度等场景。

---

## 十、压缩和代理层 Buffer 问题

SSE 最容易踩的坑之一是：服务端明明在分批写数据，但前端却一次性收到所有数据。

这通常不是前端代码的问题，而是中间层把响应缓冲了。

常见来源包括：

- Express compression 中间件。
- Nginx buffering。
- Cloudflare / CDN / 反向代理。
- 某些网关层默认开启响应缓冲。

比如使用 Express 的 compression 后，服务端可能不会每次 `res.write` 都立刻发给客户端，而是等响应完整后再一起发送。

如果使用 compression，需要在每次写入后 flush：

```ts
res.write(`data: ${JSON.stringify({ value: counter })}\n\n`);

// 如果使用了 compression 中间件
res.flush?.();
```

同时建议设置：

```ts
res.setHeader("X-Accel-Buffering", "no");
```

如果你用 Nginx，还需要检查 Nginx 配置，避免代理层缓存事件流。

这个问题在开发环境可能不明显，但上线后很常见。

典型表现是：本地 SSE 正常，部署后前端等了十几秒，最后一次性收到一堆消息。

---

## 十一、错误处理：什么时候 throw，什么时候不 throw

fetch-event-source 内部有自动重试机制。

这意味着如果 `onerror` 里什么都不做，它可能会继续尝试重连。

这在网络抖动时是好事，但在鉴权失败时可能是坏事。

比如 token 过期了，后端一直返回 401，如果你没有处理，就可能出现连续请求。

一般建议：

- 如果是网络抖动，可以允许重试。
- 如果是业务错误，比如 401、403、参数错误、权限错误，应该停止重试或者先刷新 token。
- 如果你明确要停止内部 retry，就在 `onerror` 里 throw error。

示例：

```ts
onerror(error) {
  console.error('SSE error:', error);

  // 停止内部自动重试
  throw error;
}
```

如果你要做 refresh token，可以在 `onopen` 里识别 401，然后刷新 token，再重新发起连接，而不是盲目重试旧请求。

---

## 十二、适合使用 fetch-event-source 的场景

fetch-event-source 特别适合这些业务。

### 1. AI 任务进度

用户提交一个任务后，后端持续推送：

```ts
{
  taskId: 'xxx',
  status: 'processing',
  progress: 72,
}
```

前端可以实时更新进度条。

### 2. 交易订单状态

Web3 或交易平台里，用户下单后需要等待：

```txt
pending -> submitted -> confirmed -> failed
```

这种状态流非常适合 SSE。

### 3. 行情或看板数据

如果只是服务端向前端推送，不需要前端双向频繁发消息，SSE 比 WebSocket 更轻。

### 4. 通知流

比如系统通知、活动通知、用户消息提醒，服务端有新事件时推给前端。

### 5. 支付状态

支付完成后，前端不需要一直轮询订单接口，而是打开一个状态流，由服务端在状态变化时推送。

---

## 十三、不适合使用 SSE 的场景

SSE 不是 WebSocket 的完全替代。

如果你的业务需要高频双向通信，比如：

- 聊天。
- 协同编辑。
- 多人游戏。
- 实时语音视频信令。
- 客户端需要频繁向服务端发送操作。

那么 WebSocket 更合适。

SSE 更适合“服务端主动推送，客户端主要接收”的场景。

它的优势是简单、HTTP 友好、容易接入现有服务体系，也更容易和普通 API 鉴权体系结合。

---

## 十四、一个推荐的项目落地结构

在真实前端项目里，可以这样组织：

```txt
src/
  services/
    stream/
      createFetchSSE.ts
      types.ts
  hooks/
    useFetchSSE.ts
    useTaskStream.ts
    useOrderStream.ts
  stores/
    orderStreamStore.ts
    notificationStreamStore.ts
  components/
    TaskProgress.tsx
    OrderStatus.tsx
```

其中：

- `createFetchSSE.ts` 做底层封装。
- `useFetchSSE.ts` 做 React Hook 适配。
- `useTaskStream.ts`、`useOrderStream.ts` 做具体业务流封装。
- 复杂全局数据可以放到外部 Store。
- 组件只消费业务 Hook，不直接写 fetchEventSource。

比如订单流可以封装成：

```ts
export function useOrderStream(orderId: string) {
  return useFetchSSE({
    url: "/api/orders/stream",
    method: "POST",
    payload: {
      orderId,
    },
    enabled: Boolean(orderId),
    onMessage(data) {
      // 更新订单状态
    },
  });
}
```

这样组件就非常干净：

```tsx
function OrderStatus({ orderId }: { orderId: string }) {
  const { loading, error } = useOrderStream(orderId);

  if (loading) return <div>Waiting for order update...</div>;
  if (error) return <div>Order stream error</div>;

  return <div>Order status...</div>;
}
```

这才是工程化落地的关键：不要把通信细节散落在 UI 组件里。

---

## 十五、实际项目案例一：私有用户 SSE 如何落地

前面讲的是通用封装方式，但真实业务里，SSE 往往不会只有一种流。比如在一个交易系统里，用户维度的数据和市场维度的数据应该分开处理。

用户私有 SSE 主要处理当前登录用户自己的数据，例如：

- 账户余额。
- 保证金。
- 冻结金额。
- 挂单。
- 持仓。
- 用户相关的合约状态。

这类数据有一个明显特征：它不是公开数据，必须依赖登录态和 access token。

也就是说，这类 SSE 连接不能直接用浏览器原生 EventSource 很优雅地完成，因为原生 EventSource 不方便自定义请求头。

这也是 `@microsoft/fetch-event-source` 的一个典型使用场景：它可以像 fetch 一样传 headers、method、body、signal，同时仍然保持 SSE 的流式接收能力。

### 15.1 私有 SSE 的设计目标

在交易项目里，私有 SSE 一般要解决几个问题：

1. 只有用户登录后才建立连接。
2. 连接时需要带上 token，让后端知道当前用户是谁。
3. 收到不同类型的事件后，要分发到不同的本地状态里。
4. 订单和持仓变化后，不只是更新本地状态，还要让相关 React Query 缓存失效。
5. 用户退出登录、token 变化或组件卸载时，要主动断开连接。
6. 连接失败时要允许有限重试，避免无限重连造成资源浪费。

可以把它理解成下面这条链路：

```txt
isLogin + accessToken
  -> fetchEventSource('/event/user')
  -> dashboard / open_order / position / user_instrument
  -> 更新 Jotai / Zustand / React state
  -> invalidate React Query cache
  -> UI 自动刷新
```

### 15.2 私有 SSE 示例代码

下面这个 Hook 可以作为私有用户 SSE 的项目级写法。

```ts
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useRef } from "react";
import { useAtomValue } from "jotai";
import { useQueryClient } from "@tanstack/react-query";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@microsoft/fetch-event-source";

import { SSE_URL } from "@/lib/services/config";
import { getLocalStorage } from "@/lib/localStorage";
import { isClientLoginAtom } from "@/state/user";
import { LocalStorageKey } from "@/config/constants/localStorage";
import { useUpdateUserAccount } from "../useAccount";
import { useUpdateUserInstrument } from "../useOptions";
import { useUpdateOrders } from "../useOrders";
import { useUpdatePositions } from "../usePosition";

type SSEUser =
  | SSEAccountResult
  | SSEOpenOrderResult
  | SSEPositionResult
  | SSEUserInstrumentResult;

/**
 * useUserSSE
 *
 * 负责当前登录用户的私有 SSE：
 * - 账户 dashboard
 * - 当前挂单
 * - 当前持仓
 * - 用户相关 instrument
 */
export const useUserSSE = () => {
  const queryClient = useQueryClient();
  const setUserAccount = useUpdateUserAccount();
  const setOrdersMap = useUpdateOrders();
  const setPositionsMap = useUpdatePositions();
  const setOptionsMapByPosition = useUpdateUserInstrument();
  const isLogin = useAtomValue(isClientLoginAtom);

  /**
   * 登录态变化时，重新读取本地 token。
   */
  const userLocalStorage = useMemo(
    () => getLocalStorage<ApiAccessData>({ key: LocalStorageKey.User }),
    [isLogin],
  );

  /**
   * 记录失败重试次数，避免无限重连。
   */
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!userLocalStorage || !isLogin) return;
    if (!SSE_URL) throw new Error("App SSE URL not defined");

    const controller = new AbortController();

    fetchEventSource(`${SSE_URL}/event/user`, {
      /**
       * 私有 SSE 的关键点：
       * fetchEventSource 可以自定义 headers，
       * 所以这里可以携带 access token。
       */
      headers: {
        "ACCESS-TOKEN": userLocalStorage.access_token,
      },
      signal: controller.signal,

      /**
       * 接收服务端推送的数据。
       */
      onmessage(event) {
        try {
          const { data, type }: SSEUser = JSON.parse(event.data);

          switch (type) {
            case "dashboard":
              setUserAccount(data);
              break;

            case "open_order":
              /**
               * 挂单变化后：
               * 1. 立即更新本地订单 Map
               * 2. 让订单列表缓存失效，保证分页列表后续一致
               */
              setOrdersMap(data);
              queryClient.invalidateQueries({
                queryKey: ["trade", "order", "open"],
              });
              queryClient.invalidateQueries({
                queryKey: ["trade", "order", "history"],
              });
              break;

            case "position":
              /**
               * 持仓变化通常意味着成交、平仓、行权或结算。
               */
              setPositionsMap(data);
              queryClient.invalidateQueries({
                queryKey: ["trade", "history"],
              });
              break;

            case "user_instrument":
              /**
               * 用户相关 instrument，一般用于更新期权行上的用户持仓字段。
               */
              setOptionsMapByPosition(data);
              break;

            default:
              console.log("[SSE USER]: Unhandled event", event);
          }
        } catch (error) {
          console.error("[SSE USER]: Failed to process message:", error);
        }
      },

      /**
       * 建连成功时校验响应。
       */
      async onopen(response) {
        if (
          response.ok &&
          response.headers.get("content-type") === EventStreamContentType
        ) {
          retryCountRef.current = 0;
          console.log("[SSE USER]: Connected");
          return;
        }

        const isClientError =
          response.status >= 400 &&
          response.status < 500 &&
          response.status !== 429;
        throw new Error(
          isClientError ? "SSE client error" : "SSE server error",
        );
      },

      /**
       * fetchEventSource 默认会自动重试。
       * 如果这里 throw，则停止内部重试。
       */
      onerror(error) {
        console.error("[SSE USER]: Error:", error);
        retryCountRef.current += 1;

        if (retryCountRef.current >= maxRetries) {
          controller.abort();
          throw new Error("SSE max retries reached");
        }
      },

      onclose() {
        console.log("[SSE USER]: Closed");
      },

      /**
       * 交易系统通常需要后台继续接收订单和持仓变化。
       */
      openWhenHidden: true,
    });

    return () => {
      console.log("[SSE USER]: Cleanup");
      controller.abort();
    };
  }, [
    userLocalStorage,
    isLogin,
    setUserAccount,
    setOrdersMap,
    setPositionsMap,
    setOptionsMapByPosition,
    queryClient,
  ]);
};
```

### 15.3 这个 Hook 的关键设计点

这里最重要的不是 fetchEventSource 怎么写，而是状态更新策略。

对于 dashboard 这种账户面板数据，可以直接覆盖本地账户状态。因为它通常是一个账户级快照。

对于 open_order，不能只更新本地 Map。真实项目里订单列表往往还有分页、筛选、历史订单等接口数据，所以 SSE 到达后最好同时执行：

```ts
setOrdersMap(data);
queryClient.invalidateQueries({
  queryKey: ["trade", "order", "open"],
});
queryClient.invalidateQueries({
  queryKey: ["trade", "order", "history"],
});
```

这样可以做到两层一致性：

- 本地状态先即时更新，保证 UI 反馈快。
- React Query 缓存随后失效，保证接口数据最终和服务端一致。

对于 position 也是类似的。持仓变化通常不是孤立事件，它往往意味着成交记录、历史记录、账户权益等数据都可能发生变化。因此，收到持仓推送后，除了更新持仓 Map，也应该让相关查询失效。

---

## 十六、实际项目案例二：公共市场 SSE 如何落地

公共 SSE 和私有 SSE 不一样。

公共 SSE 一般不需要登录态，它处理的是公开市场数据，例如：

- 标的资产。
- 期权合约。
- 报价。
- Greeks。
- 订单簿。
- 近期成交。

这类数据的特点是：

- 推送频率更高。
- 数据量更大。
- 对 UI 性能影响更明显。
- 不一定每条消息都应该立刻触发 React 状态更新。

如果服务端每秒推几十条甚至几百条市场数据，而前端每收到一条就 setState，很容易造成渲染压力。所以在公共市场 SSE 里，常见做法是加一个队列，把同一帧内收到的数据批量处理。

### 16.1 公共市场 SSE 的设计目标

公共市场 SSE 一般需要解决这些问题：

1. 根据当前选中的市场 stream 建立连接。
2. 切换 stream 时关闭旧连接，建立新连接。
3. 避免重复连接同一个 stream。
4. 对高频消息做队列缓冲。
5. 用 requestAnimationFrame 批量处理更新。
6. 组件卸载时关闭连接并清空队列。

整体链路可以理解为：

```txt
currentUnderlyingIndex
  -> EventSource('/event/market?stream=BTC-240705')
  -> instrument / underlying / instrument_greek / instrument_quote
  -> push into queue
  -> requestAnimationFrame
  -> batch update local state
  -> invalidate query when necessary
```

这里也可以使用 fetchEventSource，但如果公共流不需要自定义 headers，也可以直接使用原生 EventSource。

### 16.2 公共市场 SSE 示例代码

```ts
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { SSE_URL } from "@/lib/services/config";
import { currentUnderlyingIndexAtom } from "@/state/atomState";
import {
  useUpdateInstruments,
  useUpdateInstrumentsGreek,
  useUpdateInstrumentsQuote,
} from "../useOptions";

type SSEMarket =
  | SSEInstrumentResult
  | SSEUnderlyingResult
  | SSEInstrumentGreekResult
  | SSEInstrumentQuoteResult;

interface MarketUpdate {
  type: "instrument" | "underlying" | "instrumentGreek" | "instrumentQuote";
  data: SSEInstrument | SSEUnderlying | SSEInstrumentGreek | SSEInstrumentQuote;
}

/**
 * useGlobalSSE
 *
 * 负责公共市场 SSE：
 * - instrument 基础信息
 * - underlying 行情
 * - instrument greek
 * - instrument quote
 */
const useGlobalSSE = () => {
  const queryClient = useQueryClient();
  const ssePublic = useRef<EventSource>();
  const lastUnderlyingIndex = useRef("");
  const marketUpdateQueue = useRef<MarketUpdate[]>([]);
  const pendingMarketUpdateRef = useRef(false);
  const currentUnderlyingIndex = useAtomValue(currentUnderlyingIndexAtom);
  const setOptionsMap = useUpdateInstruments();
  const setOptionsMapByGreek = useUpdateInstrumentsGreek();
  const setOptionsMapByQuote = useUpdateInstrumentsQuote();

  if (!SSE_URL) throw new Error("App SSE URL not defined");

  /**
   * 批量处理市场更新。
   */
  const batchMarketUpdate = useCallback(() => {
    if (!pendingMarketUpdateRef.current) return;

    let shouldInvalidateUnderlying = false;

    while (marketUpdateQueue.current.length > 0) {
      const update = marketUpdateQueue.current.shift();
      if (!update) continue;

      switch (update.type) {
        case "instrument":
          setOptionsMap(update.data as SSEInstrument);
          break;

        case "underlying":
          /**
           * underlying 可以不立即逐条 refetch。
           * 同一帧内多条 underlying 更新，最终合并成一次 invalidate。
           */
          shouldInvalidateUnderlying = true;
          break;

        case "instrumentGreek":
          setOptionsMapByGreek(update.data as SSEInstrumentGreek);
          break;

        case "instrumentQuote":
          setOptionsMapByQuote(update.data as SSEInstrumentQuote);
          break;
      }
    }

    if (shouldInvalidateUnderlying) {
      queryClient.invalidateQueries({
        queryKey: ["market", "underlying"],
        exact: true,
      });
    }

    pendingMarketUpdateRef.current = false;
  }, [setOptionsMap, setOptionsMapByGreek, setOptionsMapByQuote, queryClient]);

  /**
   * 把批处理安排到下一帧。
   */
  const scheduleMarketUpdate = useCallback(() => {
    if (pendingMarketUpdateRef.current) return;

    pendingMarketUpdateRef.current = true;
    requestAnimationFrame(batchMarketUpdate);
  }, [batchMarketUpdate]);

  useEffect(() => {
    const nextIndex = currentUnderlyingIndex?.underlying_index;

    if (!nextIndex) {
      if (ssePublic.current) {
        ssePublic.current.close();
        ssePublic.current = undefined;
      }

      lastUnderlyingIndex.current = "";
      marketUpdateQueue.current = [];
      pendingMarketUpdateRef.current = false;
      return;
    }

    const shouldConnect =
      !ssePublic.current ||
      lastUnderlyingIndex.current !== nextIndex ||
      ssePublic.current.readyState === EventSource.CLOSED;

    if (!shouldConnect) {
      console.log("[SSE MARKET]: Already connected to same stream");
      return;
    }

    if (ssePublic.current) {
      ssePublic.current.close();
      ssePublic.current = undefined;
      marketUpdateQueue.current = [];
      pendingMarketUpdateRef.current = false;
    }

    console.log("[SSE MARKET]: Connecting stream:", nextIndex);

    const eventSource = new EventSource(
      `${SSE_URL}/event/market?stream=${nextIndex}`,
    );
    ssePublic.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const { data, type }: SSEMarket = JSON.parse(event.data);
        const updateType =
          type === "instrument"
            ? "instrument"
            : type === "Underlying"
              ? "underlying"
              : type === "instrument_greek"
                ? "instrumentGreek"
                : type === "instrument_quote"
                  ? "instrumentQuote"
                  : null;

        if (!updateType) return;

        marketUpdateQueue.current.push({
          type: updateType,
          data,
        });
        scheduleMarketUpdate();
      } catch (error) {
        console.error("[SSE MARKET]: Failed to process message:", error);
      }
    };

    eventSource.onopen = () => {
      lastUnderlyingIndex.current = nextIndex;
      console.log("[SSE MARKET]: Connected:", nextIndex);
    };

    eventSource.onerror = (error) => {
      console.error("[SSE MARKET]: Error:", error);
      eventSource.close();

      if (ssePublic.current === eventSource) {
        ssePublic.current = undefined;
      }

      lastUnderlyingIndex.current = "";
      marketUpdateQueue.current = [];
      pendingMarketUpdateRef.current = false;
    };

    return () => {
      console.log("[SSE MARKET]: Cleanup:", nextIndex);
      eventSource.close();

      if (ssePublic.current === eventSource) {
        ssePublic.current = undefined;
      }

      lastUnderlyingIndex.current = "";
      marketUpdateQueue.current = [];
      pendingMarketUpdateRef.current = false;
    };
  }, [currentUnderlyingIndex?.underlying_index, scheduleMarketUpdate]);
};

export default useGlobalSSE;
```

### 16.3 为什么公共市场 SSE 要做队列批处理

如果每条 SSE 消息都直接调用状态更新函数：

```ts
eventSource.onmessage = (event) => {
  const { data } = JSON.parse(event.data);
  setOptionsMap(data);
};
```

这个写法在低频场景下没问题，但在交易系统里容易出问题。因为市场数据可能是高频推送，如果每条消息都触发一次状态更新，那么 React 会频繁调度渲染，页面容易卡顿。

更稳妥的方式是：

```ts
marketUpdateQueue.current.push(update);
scheduleMarketUpdate();
```

然后在下一帧统一处理：

```ts
requestAnimationFrame(batchMarketUpdate);
```

这样做有几个好处：

- 可以保留消息顺序。数据进入队列后，按照接收顺序逐条处理。
- 可以减少同步压力。onmessage 本身只做解析和入队，不做大量状态更新。
- 可以合并重复操作。比如同一帧内来了多条 underlying 更新，不需要重复 invalidate，只需要最后统一执行一次。
- 更适合交易页面。报价、Greeks、订单簿这类数据变化频繁，前端必须控制渲染节奏。

---

## 十七、实际项目案例三：交易级 SSE 如何落地

除了全局市场 SSE 和用户私有 SSE，还有一种更细粒度的 SSE：交易级 SSE。

例如用户当前正在看某一个具体期权合约：

```txt
BTC-240705-60000-C
```

这个时候页面可能需要展示这个具体合约的：

- 订单簿。
- 近期成交。
- 实时买卖盘。

这种数据不适合放在全局市场 SSE 里，因为它粒度更细，和当前选中的 instrument 强绑定。

### 17.1 交易级 SSE 的设计目标

交易级 SSE 的核心逻辑是：

- 当前选中哪个 instrument，就订阅哪个 instrument。
- 用户切换 instrument 时，关闭旧连接，打开新连接。
- 如果当前已经连接的是同一个 instrument，不重复连接。
- 连接失败后允许有限重试。
- 组件卸载时中断连接。

链路大概是：

```txt
selectedOptionAtom
  -> selectedOption.instrument
  -> fetchEventSource('/event/trade?stream=BTC-240705-60000-C')
  -> recent_trade / order_book
  -> setRecentTrades / setOrderbook
```

### 17.2 交易级 SSE 示例代码

```ts
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  EventStreamContentType,
  fetchEventSource,
} from "@microsoft/fetch-event-source";

import { SSE_URL } from "@/lib/services/config";
import { selectedOptionAtom } from "@/state/options/option";
import { useOrderbook, useRecentTrades } from "../useMarkets";

type SSETrade = SSERecentTradeResult | SSEOrderbookResult;

interface ConnectionManager {
  isConnected: boolean;
  controller: AbortController | null;
  retryCount: number;
  currentInstrument: string | null;
}

/**
 * useTradeSSE
 *
 * 负责当前选中 instrument 的交易级 SSE：
 * - recent_trade
 * - order_book
 */
const useTradeSSE = () => {
  const selectedOption = useAtomValue(selectedOptionAtom);
  const { setRecentTrades } = useRecentTrades();
  const { setOrderbook } = useOrderbook();
  const [isConnected, setIsConnected] = useState(false);
  const maxRetries = 3;

  const connectionManager = useRef<ConnectionManager>({
    isConnected: false,
    controller: null,
    retryCount: 0,
    currentInstrument: null,
  });

  const previousInstrumentRef = useRef<string | null>(null);

  if (!SSE_URL) throw new Error("App SSE URL not defined");

  /**
   * 清理当前连接。
   */
  const cleanup = useCallback(() => {
    const manager = connectionManager.current;

    if (manager.controller) {
      manager.controller.abort();
    }

    manager.controller = null;
    manager.isConnected = false;
    manager.retryCount = 0;
    manager.currentInstrument = null;
    setIsConnected(false);
  }, []);

  /**
   * 初始化指定 instrument 的 SSE 连接。
   */
  const initConnection = useCallback(
    async (instrument: string) => {
      const manager = connectionManager.current;

      if (manager.isConnected && manager.currentInstrument === instrument) {
        console.log("[SSE TRADE]: Already connected:", instrument);
        return;
      }

      cleanup();

      const controller = new AbortController();
      manager.controller = controller;
      manager.currentInstrument = instrument;
      manager.retryCount = 0;
      manager.isConnected = false;

      try {
        await fetchEventSource(`${SSE_URL}/event/trade?stream=${instrument}`, {
          signal: controller.signal,
          onmessage(event) {
            try {
              const { data, type }: SSETrade = JSON.parse(event.data);

              switch (type) {
                case "recent_trade":
                  setRecentTrades(data);
                  break;

                case "order_book":
                  setOrderbook(data);
                  break;

                default:
                  console.log("[SSE TRADE]: Unhandled type:", type);
              }
            } catch (error) {
              console.error("[SSE TRADE]: Message error:", error);
            }
          },
          async onopen(response) {
            if (
              response.ok &&
              response.headers.get("content-type") === EventStreamContentType
            ) {
              manager.isConnected = true;
              manager.retryCount = 0;
              setIsConnected(true);
              console.log("[SSE TRADE]: Connected:", instrument);
              return;
            }

            const isClientError =
              response.status >= 400 &&
              response.status < 500 &&
              response.status !== 429;
            throw new Error(
              isClientError ? "SSE client error" : "SSE server error",
            );
          },
          onerror(error) {
            console.error("[SSE TRADE]: Error:", instrument, error);
            manager.retryCount += 1;
            manager.isConnected = false;
            setIsConnected(false);

            if (manager.retryCount >= maxRetries) {
              cleanup();
              throw new Error("SSE max retries reached");
            }
          },
          onclose() {
            manager.isConnected = false;
            setIsConnected(false);
          },
          openWhenHidden: true,
        });
      } catch (error) {
        console.error("[SSE TRADE]: Connection failed:", instrument, error);
        manager.isConnected = false;
        setIsConnected(false);
      }
    },
    [cleanup, setOrderbook, setRecentTrades],
  );

  /**
   * 当前选中的 instrument。
   */
  const currentInstrument = useMemo(
    () => selectedOption?.instrument ?? null,
    [selectedOption?.instrument],
  );

  useEffect(() => {
    if (!currentInstrument) {
      cleanup();
      previousInstrumentRef.current = null;
      return;
    }

    if (
      previousInstrumentRef.current === currentInstrument &&
      connectionManager.current.isConnected
    ) {
      return;
    }

    previousInstrumentRef.current = currentInstrument;
    initConnection(currentInstrument);

    return () => {
      cleanup();
    };
  }, [currentInstrument, cleanup, initConnection]);

  return {
    isConnected,
  };
};

export default useTradeSSE;
```

### 17.3 交易级 SSE 和全局市场 SSE 的区别

全局市场 SSE 通常订阅的是一个更大的市场维度，例如：

```txt
BTC-240705
```

它适合更新某一批合约的基础信息、报价、Greeks、标的行情。

交易级 SSE 订阅的是一个具体合约，例如：

```txt
BTC-240705-60000-C
```

它适合更新这个合约自己的订单簿和近期成交。

所以一个比较合理的拆分是：

```txt
useGlobalSSE
  -> /event/market?stream={underlyingIndex}
  -> instrument / underlying / greek / quote

useTradeSSE
  -> /event/trade?stream={instrument}
  -> order_book / recent_trade

useUserSSE
  -> /event/user
  -> dashboard / open_order / position / user_instrument
```

这种拆分的好处是边界清晰。

- 公共市场数据不关心用户是谁。
- 私有用户数据必须依赖登录态。
- 具体交易面板数据只跟当前 instrument 有关。

---

## 十八、项目级 SSE 的推荐分层

结合上面的三个例子，一个真实前端项目可以按下面的结构组织 SSE：

```txt
src/
  hooks/
    sse/
      useGlobalSSE.ts
      useUserSSE.ts
      useTradeSSE.ts
      useSSEConnection.ts
      types.ts
      utils.ts
```

其中：

- `useGlobalSSE.ts` 负责公共市场流。
- `useUserSSE.ts` 负责用户私有流。
- `useTradeSSE.ts` 负责具体交易面板流。
- `useSSEConnection.ts` 可以抽象通用 fetchEventSource 生命周期。
- `types.ts` 放 SSE event type 和 payload 类型。
- `utils.ts` 放 parseMessage、isEventStreamResponse、retry 判断等工具函数。

在应用入口层，可以这样使用：

```tsx
function AppSSEProvider() {
  useGlobalSSE();
  useUserSSE();
  return null;
}
```

而交易详情页内部再使用：

```tsx
function TradePanel() {
  const { isConnected } = useTradeSSE();

  return (
    <div>
      <span>{isConnected ? "实时连接中" : "连接断开"}</span>
      {/* orderbook / recent trades */}
    </div>
  );
}
```

这样就能避免所有 SSE 都堆在一个文件里，也能避免一个 Hook 同时处理市场、用户、订单簿、持仓、账户等所有逻辑。

---

## 十九、总结：真实项目里 SSE 不只是“接收消息”

很多人理解 SSE，只停留在：

```ts
const es = new EventSource("/events");

es.onmessage = (event) => {
  console.log(event.data);
};
```

但在真实业务里，SSE 的重点不是这几行代码，而是围绕它建立一套可靠的数据同步机制。

对于私有 SSE，重点是鉴权、登录态、订单状态、持仓状态和缓存一致性。

对于公共市场 SSE，重点是高频数据、批处理、渲染节奏和状态分发。

对于交易级 SSE，重点是跟随当前 instrument 切换连接，避免重复订阅和旧连接泄漏。

如果用一句话总结：

```txt
SSE 在前端项目里的落地，本质上不是“开一个长连接”，
而是把服务端推送的数据接入到前端状态系统、缓存系统和组件生命周期里。
```

一个成熟的 SSE 模块，至少应该考虑这些问题：

- 什么时候连接？
- 什么时候断开？
- 是否需要鉴权？
- 是否需要自动重试？
- 是否需要手动终止重试？
- 是否要在页面隐藏时继续连接？
- 收到消息后更新哪个状态？
- 是否需要 invalidate React Query？
- 高频消息是否需要批处理？
- 切换 stream 时旧连接是否正确关闭？
- 组件卸载时是否清理 AbortController / EventSource？

只要这些问题处理清楚，SSE 就可以非常稳定地用于交易系统、实时看板、通知中心、任务状态流、行情流、订单状态流等场景。

---

## 二十、总结

`@microsoft/fetch-event-source` 的核心价值是：它保留了 SSE 简单、单向、基于 HTTP 的优点，同时补齐了原生 EventSource 在真实业务中的短板。

相比原生 EventSource，它可以支持 POST 请求、headers、body、AbortController、`onopen` 检查、`onerror` 重试控制，更适合需要鉴权、参数传递和复杂错误处理的前端项目。

前端落地时，建议不要直接在组件里写裸的 fetchEventSource，而是至少封装一层 `useFetchSSE`。如果数据要被多个组件共享，可以进一步用 `useSyncExternalStore` 或状态管理库抽象成外部流式 Store。

服务端侧要注意 SSE 响应头、消息格式、连接关闭、定时器清理，以及 compression / Nginx / CDN 造成的 buffer 问题。很多 SSE“不实时”的问题，根因都不是前端，而是中间层把响应攒起来了。

最终可以用一个简单判断来选择技术：

```txt
如果只是短时间查状态，用轮询。
如果需要双向通信，用 WebSocket。
如果主要是服务端向前端持续推送，用 SSE。
```

如果你还希望 SSE 支持 POST、鉴权、复杂参数和更强的错误处理，那么 `@microsoft/fetch-event-source` 是一个很适合前端工程落地的选择。
