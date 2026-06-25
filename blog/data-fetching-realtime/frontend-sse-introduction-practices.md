# 前端 SSE 入门到实战：原理、用法、踩坑和最佳实践

在前端实时通信里，大家最熟悉的可能是 WebSocket。

但很多场景其实并不需要 WebSocket。
如果你的需求只是“服务端实时推消息给前端”，前端不需要通过同一条连接实时发消息给服务端，那么 **SSE** 往往是一个更简单、更轻量的选择。

这篇文章就从基本概念开始，把 SSE 的用法、踩坑点和实战最佳实践讲清楚。

---

## 一、SSE 是什么？

SSE，全称是 **Server-Sent Events**。

你可以把它理解成：

```text
一个单向的 WebSocket
```

它允许服务端主动给前端推送消息。

普通 HTTP 请求是：

```text
前端发请求
  ↓
服务端返回响应
  ↓
连接结束
```

而 SSE 是：

```text
前端建立连接
  ↓
服务端保持连接不断开
  ↓
服务端可以不断往前端推消息
```

它和 WebSocket 最大的区别是：

```text
WebSocket：前端和服务端可以双向实时通信
SSE：只能服务端主动推消息给前端
```

所以 SSE 更适合“服务端通知前端”的场景。

---

## 二、SSE 和 WebSocket 有什么区别？

### 1. SSE 基于 HTTP

SSE 本质上还是一个 HTTP 请求，只是这个请求的响应不会立刻结束，而是持续返回一个文本流。

它使用的是：

```http
Content-Type: text/event-stream
```

也就是说，它仍然走 HTTP / HTTPS 协议。

相比 WebSocket，SSE 对服务端来说更简单。
WebSocket 通常需要维护连接池、处理双向消息、管理连接断开和重连，后端开发复杂度会更高。

SSE 则更接近普通接口，只是响应是持续的事件流。

---

### 2. SSE 是单向通信

SSE 只能：

```text
服务端 -> 前端
```

不能通过同一条 SSE 连接做到：

```text
前端 -> 服务端
```

如果前端要主动发消息，仍然需要用普通 HTTP 请求，比如 `POST /api/message`。

所以 SSE 适合“后端主动通知前端”，不适合“前后端双向实时聊天”这类场景。

---

### 3. SSE 自带重连机制

原生 `EventSource` 在连接异常断开后，会自动尝试重连。

这点比自己封装轮询或长连接舒服很多。

但也正因为它会自动重连，所以服务端如果只是普通地结束响应，前端可能会重新连上。这一点后面会讲到。

---

## 三、SSE 适合什么场景？

只要你的需求是：

```text
服务端需要实时推消息给前端
但前端不需要通过这条连接实时发消息给服务端
```

就可以考虑 SSE。

常见场景包括：

### 1. 实时通知

比如：

```text
新订单提醒
未读消息数量
系统公告
任务进度
```

服务端有新事件时，直接推给前端。

---

### 2. 实时状态更新

比如：

```text
物流定位
设备状态
订单状态
支付状态
部署进度
```

前端只需要接收最新状态，然后更新页面即可。

---

### 3. AI 流式输出

现在很多 AI 产品，比如 ChatGPT、豆包、DeepSeek 一类的问答界面，都会有一种“字一个个出来”的效果。

这种效果就很适合用 SSE。

流程大概是：

```text
用户提交问题
  ↓
服务端开始生成回答
  ↓
每生成一小段内容，就通过 SSE 推给前端
  ↓
前端逐步拼接展示
```

所以你看到的“流式输出”，很多时候就是 SSE 或类似流式协议实现的。

---

## 四、Node + Express 实现一个 SSE 服务端

下面用 Node.js + Express 写一个最简单的 SSE 接口。

先安装依赖：

```bash
npm install express cors
```

服务端代码：

```ts
import express from "express";
import cors from "cors";

const app = express();

app.use(cors());

app.get("/api/sse", (req, res) => {
  // SSE 必须设置 text/event-stream
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");

  // 保持 HTTP 长连接
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Cache-Control", "no-cache");

  const words = ["你", "好", "，", "S", "S", "E"];
  let index = 0;

  const timer = setInterval(() => {
    if (index >= words.length) {
      clearInterval(timer);
      return;
    }

    // 注意：原生 EventSource 要求必须以 data: 开头，并以 \n\n 结尾
    res.write(`data: ${words[index]}\n\n`);

    index += 1;
  }, 1000);

  req.on("close", () => {
    console.log("客户端断开连接");
    clearInterval(timer);
  });
});

app.listen(3000, () => {
  console.log("SSE server running at http://localhost:3000");
});
```

这里最关键的是响应头：

```ts
res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
res.setHeader("Connection", "keep-alive");
res.setHeader("Cache-Control", "no-cache");
```

`text/event-stream` 表示这是一个事件流。
`charset=utf-8` 可以避免中文乱码。
`keep-alive` 表示保持长连接。

---

## 五、前端使用 EventSource 接收 SSE

前端使用原生 `EventSource` 非常简单：

```ts
const eventSource = new EventSource("http://localhost:3000/api/sse");

eventSource.onopen = () => {
  console.log("SSE 连接已建立");
};

eventSource.onmessage = (event) => {
  console.log("收到消息：", event.data);
};

eventSource.onerror = (error) => {
  console.error("SSE 连接异常：", error);
};
```

如果要做类似 AI 流式输出的效果，可以把每次收到的内容拼起来：

```tsx
import { useEffect, useState } from "react";

export function SSETextDemo() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const eventSource = new EventSource("http://localhost:3000/api/sse");

    eventSource.onmessage = (event) => {
      setMessage((prev) => prev + event.data);
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return <div>{message}</div>;
}
```

页面就会逐步显示：

```text
你好，SSE
```

---

## 六、第一个坑：服务端返回格式必须规范

很多人第一次用 SSE，会遇到一个问题：

```text
Network 面板里明明看到接口在持续返回数据
但是前端 onmessage 就是不触发
```

大概率是服务端返回格式不对。

原生 `EventSource` 要求普通消息必须是这种格式：

```text
data: 内容\n\n
```

比如：

```ts
res.write(`data: 你好\n\n`);
```

不要写成：

```ts
res.write("你好");
```

也不要只写：

```ts
res.write("data: 你好");
```

必须以 `data:` 开头，并且用两个换行符结尾：

```text
data: 你好

```

也就是代码里的：

```ts
res.write(`data: ${content}\n\n`);
```

否则浏览器可能收到了响应流，但不会触发 `onmessage`。

这是 SSE 最常见的坑之一。

---

## 七、第二个坑：不要随便 close 连接

前端可以这样关闭 SSE：

```ts
eventSource.close();
```

一旦调用 `close()`，这个 `EventSource` 实例就不会再接收消息。

如果你还想重新连接，需要重新创建一个新的实例：

```ts
const eventSource = new EventSource(url);
```

所以在 React 里通常只在组件卸载时关闭：

```ts
useEffect(() => {
  const eventSource = new EventSource(url);

  return () => {
    eventSource.close();
  };
}, [url]);
```

注意：组件卸载时必须清理连接。

否则用户切换页面后，旧页面的 SSE 连接还在，可能继续接收消息，造成内存泄漏或重复更新。

---

## 八、服务端 res.end() 会怎样？

如果服务端调用：

```ts
res.end();
```

连接会被断开。

但原生 `EventSource` 默认有自动重连机制，所以前端可能会重新发起连接。

也就是说，如果你只是普通结束响应：

```ts
res.end();
```

它不一定代表“永久关闭”。
前端可能会自动重连。

如果后端希望明确告诉前端不要再重连，通常需要配合特定状态码或业务协议处理。这个属于更具体的服务端实现。

在多数实时推送场景里，SSE 本来就希望保持连接，所以一般不会主动 `end`。

---

## 九、使用自定义事件：一个 SSE 接口承载多种消息

SSE 不只能发普通 message。

除了默认的：

```text
data: 普通消息\n\n
```

还可以使用自定义事件：

```text
event: new_message
data: 你有一条未读消息\n\n
```

服务端示例：

```ts
app.get("/api/sse", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Cache-Control", "no-cache");

  res.write(`data: 普通消息\n\n`);

  res.write(`event: new_message\n`);
  res.write(`data: 你有一条未读消息\n\n`);
});
```

前端监听普通消息：

```ts
eventSource.onmessage = (event) => {
  console.log("普通消息：", event.data);
};
```

前端监听自定义事件：

```ts
eventSource.addEventListener("new_message", (event) => {
  console.log("新消息事件：", event.data);
});
```

这样一个 SSE 接口就可以承载多种事件类型。

比如：

```text
event: order_created
event: order_paid
event: notification
event: task_progress
event: ai_message
```

这在真实项目里很常见。

---

## 十、自定义事件适合怎么设计？

假设一个订单系统需要实时通知前端：

```text
新订单
订单支付
订单取消
未读消息
```

可以这样设计：

```text
event: order_created
data: {"orderId":"1001","amount":99}

event: order_paid
data: {"orderId":"1001","status":"paid"}

event: notification
data: {"message":"你有一条新消息"}
```

前端分别监听：

```ts
eventSource.addEventListener("order_created", (event) => {
  const data = JSON.parse(event.data);
  console.log("新订单：", data);
});

eventSource.addEventListener("order_paid", (event) => {
  const data = JSON.parse(event.data);
  console.log("订单支付：", data);
});

eventSource.addEventListener("notification", (event) => {
  const data = JSON.parse(event.data);
  console.log("通知：", data);
});
```

这样代码会比所有消息都塞到 `onmessage` 里再手动判断 `type` 更清晰。

当然，也可以只用默认 `message`，然后在 `data` 里带 `type`：

```json
{
  "type": "order_created",
  "data": {}
}
```

两种方式都可以，取决于团队协议设计。

---

## 十一、第三个坑：原生 EventSource 不能自定义请求头

这是实战中很关键的一个问题。

原生 `EventSource` 这样使用：

```ts
const eventSource = new EventSource("/api/sse");
```

但是它不能让你这样传 header：

```ts
new EventSource("/api/sse", {
  headers: {
    Authorization: "Bearer token",
  },
});
```

原生不支持。

这就麻烦了。因为很多项目的 token 是放在请求头里的：

```http
Authorization: Bearer xxx
```

或者：

```http
ACCESS-TOKEN: xxx
```

那 SSE 要怎么鉴权？

常见有三种方案。

---

## 十二、方案一：把 token 放到 URL 上

例如：

```ts
const token = "xxx";

const eventSource = new EventSource(`/api/sse?token=${token}`);
```

后端从 query 参数里取 token。

但这个方案不太安全。

因为 token 会出现在 URL 里，可能被浏览器历史、日志、代理服务记录下来。

除非是短期临时 token，否则不推荐。

---

## 十三、方案二：用 Cookie 鉴权

原生 `EventSource` 支持传第二个参数：

```ts
const eventSource = new EventSource("/api/sse", {
  withCredentials: true,
});
```

这样请求会携带 Cookie。

如果你的后端本来就是 Cookie Session 鉴权，这个方案比较自然。

但如果你的项目是常见的 JWT header 鉴权，这个方案就不一定适合。

---

## 十四、方案三：使用支持 header 的 SSE 客户端

如果必须把 token 放在请求头里，可以使用第三方库，比如：

```bash
npm install @microsoft/fetch-event-source
```

使用方式：

```ts
import { fetchEventSource } from "@microsoft/fetch-event-source";

fetchEventSource("/api/sse", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
  onmessage(event) {
    console.log(event.data);
  },
  onopen(response) {
    console.log("连接成功", response);
  },
  onerror(error) {
    console.error("连接失败", error);
  },
});
```

它的底层思路是用 `fetch` 请求流式响应，所以可以自定义请求头。

你在一些真实项目里会看到这种写法：

```ts
fetchEventSource(`${SSE_URL}/event/user`, {
  headers: {
    "ACCESS-TOKEN": accessToken,
  },
  signal: controller.signal,
  onmessage(event) {
    const { type, data } = JSON.parse(event.data);
    // 根据 type 更新状态
  },
});
```

这就是私有 SSE 比较常见的落地方式。

---

## 十五、也可以自己实现一个简易 SSE 客户端

SSE 本质上就是一个返回流的 HTTP 请求。

所以理论上我们可以用 `fetch` 自己读流。

一个非常简化的版本：

```ts
class MySSE {
  private url: string;
  public onmessage: (message: string) => void = () => {};

  constructor(url: string) {
    this.url = url;
    this.init();
  }

  private async init() {
    const response = await fetch(this.url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: "Bearer your-token",
      },
    });

    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const text = decoder.decode(value, {
        stream: true,
      });

      if (text.startsWith("data:")) {
        this.onmessage(text.replace(/^data:\s*/, "").trim());
      }
    }
  }
}
```

使用：

```ts
const sse = new MySSE("/api/sse");

sse.onmessage = (message) => {
  console.log("收到消息：", message);
};
```

这段代码的重点不是让你直接复制到生产环境，而是理解：

```text
SSE 本质上就是 fetch 一个文本流
然后前端不断读取这个流
再把读取到的 chunk 解析成消息
```

原生 `EventSource` 也是在帮你做类似的事情，只是它规定了标准 SSE 协议格式。

---

## 十六、自定义 SSE 协议是什么意思？

原生 SSE 要求普通消息是：

```text
data: 内容\n\n
```

这是浏览器 `EventSource` 的协议规则。

但如果你自己用 `fetch` 读流，那你可以自己定义协议。

比如你规定服务端返回：

```text
A: 你好
A: SSE
```

然后客户端只解析 `A:` 开头的内容：

```ts
if (text.startsWith("A:")) {
  this.onmessage(text.replace(/^A:\s*/, ""));
}
```

这就是自定义协议。

但实战中一般不建议随便自定义，除非你有明确需求。
否则尽量遵循标准 SSE 协议，方便维护，也方便和浏览器原生能力、第三方库兼容。

---

## 十七、EventSource Polyfill

如果你想兼容一些不支持原生 `EventSource` 的环境，或者希望在更复杂场景里使用类似原生的 API，可以考虑 polyfill。

例如：

```bash
npm install event-source-polyfill
```

使用：

```ts
import { EventSourcePolyfill } from "event-source-polyfill";

const eventSource = new EventSourcePolyfill("/api/sse", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

eventSource.onmessage = (event) => {
  console.log(event.data);
};
```

它的使用方式接近原生 `EventSource`，但支持更多能力，比如自定义 headers。

不过它仍然遵循标准 SSE 协议，也就是服务端还是应该返回：

```text
data: 内容\n\n
```

而不是随便自定义格式。

---

## 十八、React 中使用 SSE 的推荐写法

在 React 里，SSE 连接应该放在 `useEffect` 里，并且在 cleanup 中关闭。

示例：

```tsx
import { useEffect, useState } from "react";

export function MessageStream() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const eventSource = new EventSource("/api/sse");

    eventSource.onmessage = (event) => {
      setMessage((prev) => prev + event.data);
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return <div>{message}</div>;
}
```

核心点：

```text
组件挂载：创建 SSE 连接
服务端推送：onmessage 接收数据
组件卸载：close 连接
```

这和定时器、全局事件监听一样，都需要清理。

---

## 十九、实战最佳实践总结

### 1. 服务端必须设置正确响应头

```ts
res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
res.setHeader("Connection", "keep-alive");
res.setHeader("Cache-Control", "no-cache");
```

---

### 2. 普通消息必须符合 SSE 格式

```ts
res.write(`data: ${message}\n\n`);
```

---

### 3. 多业务消息可以用 event 区分

```ts
res.write(`event: order_created\n`);
res.write(`data: ${JSON.stringify(order)}\n\n`);
```

前端：

```ts
eventSource.addEventListener("order_created", (event) => {
  console.log(event.data);
});
```

---

### 4. React 组件卸载时必须关闭连接

```ts
return () => {
  eventSource.close();
};
```

---

### 5. 需要 header 鉴权时，不要用原生 EventSource

原生 `EventSource` 不能自定义 header。
如果要带 token，推荐：

```text
@microsoft/fetch-event-source
event-source-polyfill
```

---

### 6. 不建议把长期 token 放在 URL 上

```ts
new EventSource(`/api/sse?token=${token}`);
```

能用 Cookie 或 header 方案，就不要把 token 暴露在 URL 里。

---

### 7. 高频场景要注意批量更新

如果 SSE 推送频率很高，比如行情、报价、订单簿，不建议每条消息都立刻 setState。

可以使用：

```text
队列
requestAnimationFrame
节流
批处理
```

减少 React 渲染压力。

---

## 二十、SSE 的本质

最后总结一下 SSE 的本质。

SSE 不是魔法。

它本质上就是：

```text
一个 GET 请求
一个长期保持的 HTTP 连接
一个 text/event-stream 响应
服务端持续往响应流里写文本
前端按事件流协议解析文本
```

所以你可以把它理解成：

```text
HTTP 长连接 + 文本流协议
```

它没有 WebSocket 那么强，但也没有 WebSocket 那么复杂。

如果你的业务只需要服务端向前端推消息，比如通知、进度、AI 流式输出、订单状态、行情更新，那么 SSE 是一个非常值得优先考虑的方案。

一句话总结：

**SSE 适合“服务端主动推送、前端只负责接收”的实时场景。它比 WebSocket 简单，比轮询实时，落地时重点注意消息格式、连接清理和鉴权方式。**
