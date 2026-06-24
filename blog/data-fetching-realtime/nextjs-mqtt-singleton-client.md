# React / Next.js 中如何落地 MQTT 单例客户端：从实时行情订阅到引用计数管理

在做交易类前端时，实时数据几乎绕不开。

比如一个数字资产交易页面，可能同时需要：

```text id="d3x4s1"
24h 行情
盘口数据
最新成交
K 线更新
订单状态
持仓变化
资产变化
```

这些数据有一个共同特点：**它们不是用户点击一次按钮后才变化，而是在页面打开期间持续变化。**

如果只靠 HTTP 轮询，请求会很多，实时性也不够好。
所以交易所前端通常会使用 WebSocket、SSE 或 MQTT 来接收实时推送。

这篇文章主要记录我在 React / Next.js 项目里理解和落地 MQTT 单例客户端的过程。它不是一篇 MQTT 协议论文，而是一篇偏工程实践的学习笔记：**在一个前端 App 里，如何只维护一条 MQTT 连接，并让多个组件安全地订阅和取消订阅不同 topic。**

---

## 一、先理解 MQTT 在前端里解决什么问题

MQTT 是一种发布 / 订阅模型的消息协议。

你可以把它理解成：

```text id="iag2r4"
后端持续往不同频道里发消息
前端选择自己关心的频道订阅
订阅了哪个频道，就收到哪个频道的消息
```

这里的“频道”就是 topic。

比如交易所行情里，可以有这些 topic：

```text id="i6e3ke"
exchange-thumb/BTC-USDT        BTC-USDT 24h 行情
exchange-plate/BTC-USDT        BTC-USDT 盘口
exchange-trade-pc/BTC-USDT     BTC-USDT 最新成交
exchange-kline/BTC-USDT        BTC-USDT K 线
contract-thumb/#               合约全市场 24h 行情
```

前端打开 BTC/USDT 交易页，就订阅 BTC/USDT 相关 topic。
用户切到 ETH/USDT，就取消 BTC 相关 topic，再订阅 ETH 相关 topic。
用户离开交易页，就清理这些订阅。

这就是 MQTT 在交易前端里的核心作用：

> 用一条长连接，按 topic 接收不同类型的实时数据。

---

## 二、为什么不是每个组件自己连接 MQTT？

一开始很容易这样想：

```tsx id="fpanpb"
useEffect(() => {
  const client = mqtt.connect(url);

  client.on("connect", () => {
    client.subscribe("exchange-plate/BTC-USDT");
  });

  client.on("message", handleMessage);

  return () => {
    client.end();
  };
}, []);
```

这个写法在 Demo 里能跑，但真实项目里会很快出问题。

因为一个交易页里可能有很多组件：

```text id="ibjc02"
行情头部组件需要 thumb
盘口组件需要 plate
最新成交组件需要 trade
K 线组件需要 kline
深度图组件也需要 plate
订单组件需要私有订单推送
持仓组件需要私有持仓推送
```

如果每个组件都自己建立 MQTT 连接，就会出现：

```text id="jysrnh"
一个页面创建多条 MQTT 连接
同一个 topic 被重复订阅多次
组件卸载时连接关系很难管理
切换交易对时旧 topic 可能没有清理
重连后订阅状态容易丢失
浏览器和后端 broker 压力变大
```

所以更合理的方式是：

```text id="hb1ovk"
整个 App 只维护一个 MQTT client
所有组件通过这个 client 订阅 topic
client 内部负责 topic 和 handler 的管理
```

这就是 MQTT 单例客户端的核心思想。

---

## 三、单例客户端到底是什么？

“单例”听起来像设计模式，但在这个场景里很简单：

> 不管有多少组件需要实时数据，浏览器里只创建一个 MQTT 连接。

也就是：

```text id="dp6dq0"
错误方式：
盘口组件创建一条连接
成交组件创建一条连接
K 线组件创建一条连接
持仓组件创建一条连接

正确方式：
整个 App 只有一条 MQTT 连接
不同组件只是在这条连接上订阅不同 topic
```

你可以把它理解成：

```text id="3mu5wo"
WebSocket / MQTT 连接 = 一根总水管
topic = 不同水路
handler = 每个组件自己的接水桶
```

单例客户端负责的是：

```text id="lqpoz2"
建立连接
维护连接状态
订阅 topic
取消订阅 topic
接收消息
解析消息
把消息分发给对应组件
断线重连
重连后恢复订阅
```

组件只需要关心：

```text id="fyggr8"
我要订阅哪个 topic
收到消息后我要做什么
组件卸载时取消订阅
```

---

## 四、最小使用方式是什么？

一个设计比较好的 MQTT 客户端，业务侧最好这样用：

```ts id="rba1wi"
const off = mqttClient.subscribe("exchange-plate/BTC-USDT", (payload) => {
  console.log("收到盘口数据", payload);
});

// 组件卸载时调用
off();
```

放到 React 组件里：

```tsx id="xt8cnx"
useEffect(() => {
  const off = mqttClient.subscribe("exchange-plate/BTC-USDT", (payload) => {
    updateOrderBook(payload);
  });

  return () => {
    off();
  };
}, []);
```

也就是说，业务组件不应该直接关心：

```text id="cwd08n"
mqtt.connect 怎么写
client.on("message") 怎么监听
topic 是不是已经订阅过
什么时候 unsubscribe
重连后要不要重新 subscribe
```

这些都应该由单例客户端内部处理。

---

## 五、核心数据结构：topic -> handlers 映射

MQTT 单例客户端最难理解的点，其实是这个：

```ts id="koerg3"
private topics = new Map<string, TopicState>();
```

它表示：

```text id="gbkydn"
topic -> 这个 topic 下所有处理函数
```

比如现在有两个组件都需要 BTC 盘口：

```text id="0tcs7i"
盘口列表组件
深度图组件
```

它们都订阅：

```text id="4tj0ul"
exchange-plate/BTC-USDT
```

内部就会变成：

```text id="qz53jz"
exchange-plate/BTC-USDT
  ├── updateOrderBook
  └── updateDepthChart
```

所以一个 topic 下面不是只有一个 handler，而是一组 handlers。

对应代码可以设计成：

```ts id="hztb25"
type Handler = (payload: unknown, rawTopic: string) => void;

interface TopicState {
  handlers: Set<Handler>;
  subscribed: boolean;
}
```

这里的 `Set<Handler>` 很关键。

它解决的是：

```text id="5bx5yn"
同一个 topic 可以被多个组件使用
组件卸载时只移除自己的 handler
还有其他组件在用时，不要真正 unsubscribe
最后一个组件离开时，才真正取消 topic 订阅
```

这就是所谓“引用计数”的思想。

---

## 六、为什么需要引用计数？

假设两个组件都订阅 BTC 盘口：

```ts id="wo5yg1"
const off1 = mqttClient.subscribe("exchange-plate/BTC-USDT", updateOrderBook);
const off2 = mqttClient.subscribe("exchange-plate/BTC-USDT", updateDepthChart);
```

如果盘口组件卸载了，调用：

```ts id="wnn7ex"
off1();
```

此时深度图组件还在使用同一个 topic。

如果你直接执行：

```ts id="kb877j"
client.unsubscribe("exchange-plate/BTC-USDT");
```

那深度图组件也收不到数据了。

所以正确逻辑应该是：

```text id="s9zw5c"
移除当前 handler
检查这个 topic 下还有没有其他 handler
如果还有，不真正 unsubscribe
如果没有了，才真正 unsubscribe
```

代码大概是：

```ts id="o0grm2"
private unsubscribe(topic: string, handler: Handler) {
  const state = this.topics.get(topic);
  if (!state) return;

  state.handlers.delete(handler);

  if (state.handlers.size === 0) {
    this.topics.delete(topic);

    if (this.client && state.subscribed) {
      this.client.unsubscribe(topic);
    }
  }
}
```

这就是 MQTT 单例客户端里最核心的工程细节之一。

---

## 七、懒连接：为什么首次 subscribe 才连接？

单例客户端通常不会在 App 启动时立刻连接 MQTT，而是在首次订阅时才连接。

```ts id="eyyhwr"
private ensureClient() {
  if (this.client || this.connecting) return;

  this.connecting = true;
  const c = mqtt.connect(DEFAULT_URL, OPTIONS);
  this.client = c;
}
```

这样做的好处是：

```text id="f7hs7y"
用户不进入交易页时，不创建无用连接
减少页面初始化成本
避免服务端渲染阶段误触发浏览器 API
App 里只有真正需要实时数据时才连接
```

在 Next.js 里尤其重要，因为 MQTT 依赖浏览器环境。
所以文件顶部通常要写：

```ts id="v4nnga"
"use client";
```

并且在订阅时做 SSR 保护：

```ts id="hz5spy"
if (typeof window === "undefined") {
  return () => {};
}
```

否则服务端渲染阶段可能因为没有 `window` 而报错。

---

## 八、连接成功后为什么要恢复订阅？

MQTT 连接可能断开。

比如：

```text id="v8l3bb"
网络抖动
电脑休眠
Wi-Fi 切换
broker 临时断开
浏览器短暂离线
```

mqtt.js 本身支持自动重连：

```ts id="m47j1o"
reconnectPeriod: 3000;
```

但重连成功后，要考虑一个问题：

> 之前订阅过的 topic 还在吗？

如果配置了：

```ts id="gn2fkr"
clean: true;
```

表示使用干净会话。连接断开后，broker 不会保留旧会话订阅状态。

所以重连成功后，前端需要根据本地保存的 `topics` 重新订阅。

```ts id="rkisxg"
c.on("connect", () => {
  this.connected = true;
  this.connecting = false;

  for (const [topic, state] of this.topics) {
    state.subscribed = false;

    c.subscribe(topic, { qos: 0 }, (err) => {
      if (!err) state.subscribed = true;
    });
  }
});
```

这里的关键点是：

```text id="ynwpmd"
断线时不清空 topics
重连后遍历 topics
重新向 broker subscribe
业务组件不用重新执行 subscribe
```

这样页面在网络恢复后，实时数据也能恢复。

---

## 九、message 事件如何分发消息？

MQTT 客户端收到消息时，会触发：

```ts id="a87hhz"
c.on("message", (topic, payload) => {
  // ...
});
```

这里的 `topic` 是 broker 实际推送过来的 topic。
`payload` 是消息内容，一般是 Buffer。

单例客户端要做三件事：

```text id="k9ho7l"
找到这个 topic 对应的 handlers
解析 payload
逐个调用 handler
```

代码可以是：

```ts id="h7fkwq"
c.on("message", (topic, payload) => {
  const state = this.topics.get(topic);
  if (!state || state.handlers.size === 0) return;

  let parsed: unknown = null;

  try {
    const text = payload.toString("utf-8");
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = payload.toString("utf-8");
  }

  for (const h of state.handlers) {
    try {
      h(parsed, topic);
    } catch (e) {
      console.error("[mqtt] handler error", topic, e);
    }
  }
});
```

这里有几个细节：

### 1. 为什么要 JSON.parse？

因为后端推送的消息通常是 JSON 字符串。

比如：

```json id="jebtby"
{
  "symbol": "BTC/USDT",
  "price": "65000",
  "volume": "1.23"
}
```

前端收到的是 Buffer，需要先转成字符串，再解析成对象。

### 2. 为什么 parse 失败后返回字符串？

因为不是所有消息都一定是 JSON。
有些后端可能推普通文本。

所以这里做了兼容：

```text id="djtg5g"
能解析成 JSON → 返回对象
不能解析 → 返回字符串
```

### 3. 为什么每个 handler 单独 try/catch？

因为一个组件的处理函数报错，不应该影响其他组件。

如果 `updateOrderBook` 报错，不能导致 `updateDepthChart` 也收不到消息。

---

## 十、业务侧应该怎么用？

假设我们要在 React 里订阅 BTC 盘口。

可以写：

```tsx id="0frlbb"
useEffect(() => {
  const topic = topicSpotPlate("BTC/USDT");

  const off = mqttClient.subscribe(topic, (payload) => {
    console.log("盘口更新", payload);
  });

  return () => {
    off();
  };
}, []);
```

如果交易对是动态的：

```tsx id="aak2bc"
useEffect(() => {
  if (!symbol) return;

  const topic = topicSpotPlate(symbol);

  const off = mqttClient.subscribe(topic, (payload) => {
    setOrderBook(symbol, payload);
  });

  return () => {
    off();
  };
}, [symbol]);
```

这个写法的好处是：

```text id="5sannl"
symbol 变化时自动取消旧 topic
重新订阅新 topic
组件卸载时自动清理订阅
不会残留旧交易对消息
```

比如：

```text id="o6b01o"
BTC/USDT 页面 → 订阅 exchange-plate/BTC-USDT
切到 ETH/USDT → cleanup 取消 BTC topic，再订阅 ETH topic
离开交易页 → cleanup 取消 ETH topic
```

---

## 十一、交易行情里如何和状态管理结合？

在真实交易页里，通常不会在组件里直接 `setState` 存所有行情。

更常见的是：

```text id="qtlcvg"
MQTT 收到消息
  ↓
写入 Zustand / Jotai / Redux 等状态层
  ↓
多个组件从状态层读取
```

比如：

```tsx id="yujanc"
useEffect(() => {
  if (!symbol) return;

  const off = mqttClient.subscribe(topicSpotTrade(symbol), (payload) => {
    appendTrade(symbol, payload as TradeRecord);
  });

  return off;
}, [symbol, appendTrade]);
```

这样最新成交列表组件、交易页、行情头部都可以共享同一份实时状态。

一个常见组合是：

```text id="91sl8r"
HTTP 快照：页面进入时先拉一份完整数据
MQTT 增量：页面打开后持续接收变化
状态管理：把快照和增量合并给页面使用
```

比如盘口：

```text id="cstpbw"
先 HTTP 请求当前完整盘口
再 MQTT 接收盘口更新
最后写入 marketStore
```

这样页面首屏不会空等 MQTT，后续又能实时更新。

---

## 十二、topic 构造器为什么要单独封装？

交易系统里 topic 很多，如果到处手写字符串，很容易写错。

比如：

```ts id="j26cou"
"exchange-plate/BTC-USDT";
"exchange-trade-pc/BTC-USDT";
"contract-plate/BTC-USDT";
"contract-kline/BTC-USDT";
```

如果每个组件自己拼，可能出现：

```text id="metqru"
BTC/USDT
BTC-USDT
BTC_USDT
BTCUSDT
```

格式不一致，后端就收不到订阅。

所以要封装 topic 构造器：

```ts id="wnwh7m"
export const toSymbolKey = (symbol: string): string => symbol.replace("/", "-");

export const topicSpotPlate = (symbol: string) =>
  `exchange-plate/${toSymbolKey(symbol)}`;

export const topicSwapTrade = (symbol: string) =>
  `contract-trade-pc/${toSymbolKey(symbol)}`;
```

业务组件只需要传：

```ts id="bbs63d"
topicSpotPlate("BTC/USDT");
```

不用关心 topic 后缀到底是 `BTC-USDT` 还是其他格式。

这就是把字符串规则集中管理。

---

## 十三、完整的 MQTT 单例客户端示例

下面是一个简化版实现，保留核心思想：

```ts id="lwie0o"
"use client";

import mqtt, { type IClientOptions, type MqttClient } from "mqtt";

type Handler = (payload: unknown, rawTopic: string) => void;

interface TopicState {
  handlers: Set<Handler>;
  subscribed: boolean;
}

const DEFAULT_URL =
  process.env.NEXT_PUBLIC_MQTT_URL ?? "ws://localhost:8083/mqtt";

const OPTIONS: IClientOptions = {
  clientId: `web_${Math.random().toString(16).slice(2)}`,
  username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
  password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
  keepalive: 120,
  reconnectPeriod: 3000,
  connectTimeout: 4000,
  clean: true,
};

class MqttManager {
  private client: MqttClient | null = null;
  private topics = new Map<string, TopicState>();
  private connected = false;
  private connecting = false;

  private ensureClient() {
    if (this.client || this.connecting) return;

    this.connecting = true;

    const client = mqtt.connect(DEFAULT_URL, OPTIONS);
    this.client = client;

    client.on("connect", () => {
      this.connected = true;
      this.connecting = false;

      for (const [topic, state] of this.topics) {
        state.subscribed = false;

        client.subscribe(topic, { qos: 0 }, (err) => {
          if (!err) state.subscribed = true;
        });
      }
    });

    client.on("reconnect", () => {
      this.connected = false;
    });

    client.on("close", () => {
      this.connected = false;
    });

    client.on("error", (err) => {
      console.warn("[mqtt] error:", err?.message ?? err);
    });

    client.on("message", (topic, payload) => {
      const state = this.topics.get(topic);

      if (!state || state.handlers.size === 0) return;

      let parsed: unknown;

      try {
        const text = payload.toString("utf-8");
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = payload.toString("utf-8");
      }

      for (const handler of state.handlers) {
        try {
          handler(parsed, topic);
        } catch (error) {
          console.error("[mqtt] handler error", topic, error);
        }
      }
    });
  }

  subscribe(topic: string, handler: Handler): () => void {
    if (typeof window === "undefined") {
      return () => {};
    }

    this.ensureClient();

    let state = this.topics.get(topic);

    if (!state) {
      state = {
        handlers: new Set(),
        subscribed: false,
      };

      this.topics.set(topic, state);
    }

    state.handlers.add(handler);

    if (this.client && this.connected && !state.subscribed) {
      this.client.subscribe(topic, { qos: 0 }, (err) => {
        if (!err && state) {
          state.subscribed = true;
        }
      });
    }

    return () => {
      this.unsubscribe(topic, handler);
    };
  }

  private unsubscribe(topic: string, handler: Handler) {
    const state = this.topics.get(topic);

    if (!state) return;

    state.handlers.delete(handler);

    if (state.handlers.size === 0) {
      this.topics.delete(topic);

      if (this.client && state.subscribed) {
        this.client.unsubscribe(topic);
      }
    }
  }

  disconnect() {
    this.client?.end(true);
    this.client = null;
    this.connected = false;
    this.connecting = false;
    this.topics.clear();
  }

  isConnected() {
    return this.connected;
  }
}

export const mqttClient = new MqttManager();

export const toSymbolKey = (symbol: string) => symbol.replace("/", "-");

export const topicSpotPlate = (symbol: string) =>
  `exchange-plate/${toSymbolKey(symbol)}`;

export const topicSpotTrade = (symbol: string) =>
  `exchange-trade-pc/${toSymbolKey(symbol)}`;

export const topicSpotKline = (symbol: string) =>
  `exchange-kline/${toSymbolKey(symbol)}`;

export const topicSwapPlate = (symbol: string) =>
  `contract-plate/${toSymbolKey(symbol)}`;

export const topicSwapTrade = (symbol: string) =>
  `contract-trade-pc/${toSymbolKey(symbol)}`;

export const topicSwapKline = (symbol: string) =>
  `contract-kline/${toSymbolKey(symbol)}`;
```

这段代码的核心不是 `mqtt.connect`，而是：

```text id="w2fguq"
单例连接
topic -> handlers 映射
重复订阅复用
取消订阅引用计数
重连后恢复订阅
消息统一分发
```

理解了这几个点，MQTT 单例客户端就不难了。

---

## 十四、封装一个 React Hook：useMqttTopic

为了让组件使用更简单，可以再封装一个 hook。

```tsx id="ayzklo"
import { useEffect } from "react";

export function useMqttTopic(topic: string | undefined, handler: Handler) {
  useEffect(() => {
    if (!topic) return;

    const off = mqttClient.subscribe(topic, handler);

    return () => {
      off();
    };
  }, [topic, handler]);
}
```

使用时：

```tsx id="dl8drh"
useMqttTopic(topicSpotTrade(symbol), (payload) => {
  appendTrade(symbol, payload as TradeRecord);
});
```

不过这里要注意：如果 handler 每次渲染都会重新创建，可能导致重复订阅和取消订阅。

所以更稳的写法是配合 `useCallback`：

```tsx id="cgo9r6"
const handleTrade = useCallback(
  (payload: unknown) => {
    appendTrade(symbol, payload as TradeRecord);
  },
  [symbol, appendTrade],
);

useMqttTopic(topicSpotTrade(symbol), handleTrade);
```

或者在业务 hook 内部统一处理。

---

## 十五、常见坑一：通配 topic 可能无法精确匹配

MQTT 支持通配符。

比如：

```ts id="dn4nzu"
contract-thumb/#
```

表示订阅 `contract-thumb` 下的所有子 topic。

但是要注意：broker 实际推送消息时，message 事件里的 topic 可能是：

```text id="kczsko"
contract-thumb/BTC-USDT
```

而你本地 Map 里保存的是：

```text id="1ik5qm"
contract-thumb/#
```

如果代码这样写：

```ts id="wul2jc"
const state = this.topics.get(topic);
```

那就可能找不到 handler。

因为：

```text id="3j037y"
this.topics.get("contract-thumb/BTC-USDT")
```

找不到：

```text id="cchofq"
"contract-thumb/#"
```

所以如果项目里大量使用 MQTT wildcard，需要补一个 topic 匹配函数。

比如简化版：

```ts id="r5d235"
function matchTopic(subscription: string, actual: string) {
  if (subscription === actual) return true;

  if (subscription.endsWith("/#")) {
    const prefix = subscription.slice(0, -2);
    return actual.startsWith(prefix);
  }

  return false;
}
```

message 分发时就不能只精确 get，而要匹配：

```ts id="7fuc98"
for (const [subTopic, state] of this.topics) {
  if (!matchTopic(subTopic, topic)) continue;

  for (const handler of state.handlers) {
    handler(parsed, topic);
  }
}
```

这是 MQTT 单例客户端里比较容易踩的坑。

---

## 十六、常见坑二：忘记 cleanup，导致旧交易对继续更新

React 里订阅实时数据，一定要在 `useEffect` cleanup 里取消订阅。

错误写法：

```tsx id="i1vnd0"
useEffect(() => {
  mqttClient.subscribe(topicSpotPlate(symbol), updatePlate);
}, [symbol]);
```

这里没有清理旧订阅。

当 symbol 从 BTC 切到 ETH 时，BTC 的订阅还在。结果可能是：

```text id="zq8n19"
页面已经切到 ETH
但 BTC 的消息仍然写入 store
盘口数据错乱
旧 handler 一直存在，造成内存泄漏
```

正确写法：

```tsx id="k6r4md"
useEffect(() => {
  const off = mqttClient.subscribe(topicSpotPlate(symbol), updatePlate);

  return () => {
    off();
  };
}, [symbol]);
```

实时数据最怕的就是旧订阅没有清理。

---

## 十七、常见坑三：MQTT 只负责增量，不一定负责首屏

很多人会误以为：

> 有了 MQTT，就不用 HTTP 了。

这在行情系统里通常不对。

因为 MQTT 推的是“后续变化”，但页面刚打开时，需要一份当前完整状态。

比如盘口。

如果你只等 MQTT：

```text id="xoldq9"
可能只收到某一档变化
但不知道完整买盘卖盘是什么
```

所以更稳的模式是：

```text id="6gtx1p"
先 HTTP 拉快照
再 MQTT 接增量
```

例如：

```tsx id="b8zcev"
useEffect(() => {
  let cancelled = false;

  getOrderBookSnapshot(symbol).then((snapshot) => {
    if (!cancelled) {
      setPlate(symbol, snapshot);
    }
  });

  const off = mqttClient.subscribe(topicSpotPlate(symbol), (payload) => {
    setPlate(symbol, payload as OrderBook);
  });

  return () => {
    cancelled = true;
    off();
  };
}, [symbol]);
```

这里的 `cancelled` 是为了防止 HTTP 请求晚回来后，把旧 symbol 的数据写进新页面。

---

## 十八、常见坑四：重连后需要重新校准快照

MQTT 自动重连后，虽然可以恢复订阅，但断线期间可能丢消息。

比如断线 5 秒，期间盘口变化了很多。

重连后继续接 MQTT，可能本地状态已经不准。

所以更成熟的方案是：

```text id="iypx9m"
重连成功
  ↓
恢复订阅
  ↓
重新拉一遍 HTTP 快照
  ↓
用快照校准本地状态
```

单例客户端可以提供连接状态事件，或者业务层监听重连后 refetch。

这在交易系统里很重要，因为行情和订单状态不能长期不一致。

---

## 十九、什么时候应该用 MQTT 单例客户端？

适合：

```text id="iosr7t"
行情实时更新
盘口实时更新
逐笔成交
K 线推送
订单状态推送
持仓变化推送
资产变化推送
游戏房间状态
IoT 设备状态
实时协作
```

不太需要：

```text id="64bekb"
用户资料页
普通列表页
静态详情页
低频配置页面
一次性表单提交
```

也就是说，MQTT 单例客户端适合**高频、持续、跨组件共享的实时数据**。

---

## 二十、面试时怎么讲？

可以这样说：

> 项目里行情和订单状态需要实时推送，所以我封装了一个基于 mqtt.js over WebSocket 的 MQTT 单例客户端。它的核心思路是整个 App 只维护一条 MQTT 连接，组件通过 `subscribe(topic, handler)` 注册订阅。内部用 `Map<string, TopicState>` 维护 topic 到 handlers 的映射，同一个 topic 可以被多个组件复用；组件卸载时只移除当前 handler，最后一个 handler 移除时才真正 unsubscribe。
>
> 另外，mqtt.js 负责自动重连，连接恢复后我会遍历本地仍然存在的 topics 重新订阅，保证页面在网络抖动后能恢复实时数据。业务侧通常结合 HTTP 快照和 MQTT 增量使用，先用 HTTP 初始化完整状态，再通过 MQTT 接收后续变化，最后写入 Zustand 这类状态管理层供页面消费。

这个表达能体现你不是只会调用库，而是理解了实时数据链路的工程设计。

---

## 二十一、总结

MQTT 单例客户端难理解，是因为它不只是一个 `mqtt.connect`。

它真正解决的是 React / Next.js 应用里的实时订阅管理问题：

```text id="ytua4p"
如何避免多个组件重复创建连接？
如何让多个组件复用同一个 topic？
如何在组件卸载时安全取消订阅？
如何保证最后一个使用者离开时才 unsubscribe？
如何在网络重连后恢复订阅？
如何把 MQTT 消息分发给正确的业务模块？
如何和 HTTP 快照、状态管理配合？
```

所以它的核心不是连接，而是管理。

一句话总结：

**MQTT 单例客户端 = 一条全局连接 + topic 到 handlers 的映射 + 引用计数式订阅管理 + 重连恢复机制。**

当你把它理解成“实时消息的统一调度中心”，而不是单纯的“发起一个 MQTT 连接”，这段代码就会清楚很多。
