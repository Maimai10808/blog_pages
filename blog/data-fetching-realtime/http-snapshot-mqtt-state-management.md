# 实时数据到底怎么落地？用「HTTP 快照 + MQTT 推送 + 状态管理」讲清楚

很多人聊实时数据时，容易一上来就说 WebSocket、SSE、MQTT，然后列一堆连接封装、topic 设计、重连机制、状态管理目录。

这些东西当然重要，但如果一开始就讲太细，反而容易把人讲懵。

实时数据真正要解决的问题，其实很简单：

**用户打开页面时，要先看到一份完整数据；页面打开之后，要持续看到最新变化。**

所以一个比较常见、也比较稳的方案是：

```text
HTTP 快照 + MQTT 实时推送 + 前端状态管理
```

这篇文章不讲复杂交易所，也不讲一堆大而全的目录结构。我们换一个更日常的场景来讲：

**一个商品详情页。**

这个页面里有三类实时数据：

```text
商品价格
商品库存
最近购买记录
```

用户打开商品详情页时，要先看到当前价格、当前库存和最近购买记录。
如果有人下单，库存要减少；如果商家改价，价格要更新；如果有新订单，最近购买记录要追加。

这就是一个非常典型的实时数据场景。

---

## 一、为什么不能只用 HTTP？

最简单的方式是页面进入时请求接口：

```text
GET /api/products/1001
```

返回：

```json
{
  "id": "1001",
  "name": "Wireless Keyboard",
  "price": 199,
  "stock": 86,
  "recentOrders": [
    {
      "id": "o1",
      "user": "Alice",
      "quantity": 1,
      "time": 1710000000
    }
  ]
}
```

这个接口能解决首屏问题。

用户打开页面时，至少可以看到一份完整数据：

```text
当前价格是多少？
当前库存是多少？
最近有哪些人购买？
```

但问题是，页面打开之后，数据可能继续变化。

如果只靠 HTTP，你只能轮询：

```text
每 3 秒请求一次商品接口
```

这会带来几个问题：

```text
请求多
实时性一般
服务端压力大
数据没有变化也在请求
```

所以 HTTP 更适合拿“当前完整状态”，而不适合承担所有实时变化。

---

## 二、为什么不能只用 MQTT？

那能不能只用 MQTT？

比如用户进入商品页后，直接订阅：

```text
product/1001/price
product/1001/stock
product/1001/orders
```

理论上可以，但实际不稳。

因为 MQTT 推送通常更适合表达“变化”，而不是表达“完整状态”。

比如页面刚打开时，服务端只推了一条：

```json
{
  "type": "stock:update",
  "stock": 85
}
```

前端知道库存变成 85，但它不知道：

```text
商品名字是什么？
当前价格是多少？
最近购买记录有哪些？
页面初始状态怎么渲染？
```

再比如断线重连后，断线期间可能发生了多次库存变化。
如果只靠推送，前端可能漏掉中间状态。

所以 MQTT 更适合拿“打开页面之后的增量变化”，而不是首屏完整数据。

---

## 三、比较合理的方案：HTTP 快照 + MQTT 推送

更稳的做法是两步走。

第一步，页面进入时，请求 HTTP 快照：

```text
GET /api/products/1001/snapshot
```

拿到当前完整状态：

```json
{
  "id": "1001",
  "name": "Wireless Keyboard",
  "price": 199,
  "stock": 86,
  "recentOrders": []
}
```

第二步，建立 MQTT 订阅，接收后续变化：

```text
product/1001/price
product/1001/stock
product/1001/orders
```

整体链路是：

```text
用户进入商品页
  ↓
HTTP 请求商品快照
  ↓
把快照写入前端 store
  ↓
页面渲染初始数据
  ↓
建立 MQTT 连接
  ↓
订阅当前商品的 3 个 topic
  ↓
收到价格 / 库存 / 订单变化
  ↓
更新 store
  ↓
组件自动刷新
```

这就是实时数据落地最核心的思路。

一句话：

**HTTP 负责“先给我一份完整的当前状态”，MQTT 负责“之后有变化再通知我”。**

---

## 四、只需要三个 topic 就够了

不要一开始把 topic 设计得特别复杂。
对于这个商品详情页，三个 topic 就够了：

```text
product/{productId}/price
product/{productId}/stock
product/{productId}/orders
```

例如商品 ID 是 `1001`，那么实际订阅：

```text
product/1001/price
product/1001/stock
product/1001/orders
```

分别表示：

```text
price：商品价格变化
stock：库存变化
orders：新购买记录
```

这样就很清楚。

如果以后业务变复杂，再继续扩展：

```text
product/{productId}/status
product/{productId}/promotion
product/{productId}/comments
```

但一开始没必要设计得过重。

---

## 五、前端状态应该怎么放？

这里可以用 Zustand、Jotai、Redux，甚至普通 React state。
重点不是用哪个库，而是要把状态分清楚。

以 Zustand 为例，商品实时状态可以设计成这样：

```ts
type ProductState = {
  productId: string;
  price: number;
  stock: number;
  recentOrders: Order[];
};
```

页面进入时，HTTP 快照写入 store：

```ts
setProductSnapshot({
  productId: "1001",
  price: 199,
  stock: 86,
  recentOrders: [],
});
```

MQTT 收到价格变化时，只更新价格：

```ts
setPrice(188);
```

收到库存变化时，只更新库存：

```ts
setStock(85);
```

收到新订单时，把订单插入列表前面：

```ts
pushOrder(newOrder);
```

也就是说，HTTP 和 MQTT 都只是数据来源，真正驱动页面的是前端状态。

```text
HTTP snapshot
      ↓
    store
      ↑
MQTT message
```

页面组件只订阅 store 中自己需要的数据。

---

## 六、一个最小 Zustand store 示例

这个 store 不追求复杂，只演示核心思路。

```ts
import { create } from "zustand";

type Order = {
  id: string;
  user: string;
  quantity: number;
  time: number;
};

type ProductStore = {
  productId: string | null;
  price: number | null;
  stock: number | null;
  recentOrders: Order[];

  setSnapshot: (data: {
    productId: string;
    price: number;
    stock: number;
    recentOrders: Order[];
  }) => void;

  setPrice: (price: number) => void;
  setStock: (stock: number) => void;
  pushOrder: (order: Order) => void;
  reset: () => void;
};

export const useProductStore = create<ProductStore>((set) => ({
  productId: null,
  price: null,
  stock: null,
  recentOrders: [],

  setSnapshot: (data) =>
    set({
      productId: data.productId,
      price: data.price,
      stock: data.stock,
      recentOrders: data.recentOrders,
    }),

  setPrice: (price) => set({ price }),

  setStock: (stock) => set({ stock }),

  pushOrder: (order) =>
    set((state) => ({
      recentOrders: [order, ...state.recentOrders].slice(0, 20),
    })),

  reset: () =>
    set({
      productId: null,
      price: null,
      stock: null,
      recentOrders: [],
    }),
}));
```

这个 store 里有四个核心动作：

```text
setSnapshot：写入 HTTP 快照
setPrice：处理价格推送
setStock：处理库存推送
pushOrder：处理新订单推送
```

这已经足够表达实时链路的核心。

---

## 七、MQTT 封装不需要一开始写得很重

很多文章一讲 MQTT 就开始写完整 class、重连队列、订阅池、handler map。

实际理解时，可以先把它看成三个动作：

```text
连接
订阅
收到消息后回调
```

一个简化版封装可以这样理解：

```ts
import mqtt from "mqtt";

let client: mqtt.MqttClient | null = null;

export function getMqttClient() {
  if (!client) {
    client = mqtt.connect("wss://example.com/mqtt", {
      reconnectPeriod: 3000,
    });
  }

  return client;
}
```

在页面里使用：

```ts
import { useEffect } from "react";
import { getMqttClient } from "./mqtt-client";
import { useProductStore } from "./product-store";

export function useProductRealtime(productId: string) {
  const setPrice = useProductStore((s) => s.setPrice);
  const setStock = useProductStore((s) => s.setStock);
  const pushOrder = useProductStore((s) => s.pushOrder);

  useEffect(() => {
    if (!productId) return;

    const client = getMqttClient();

    const priceTopic = `product/${productId}/price`;
    const stockTopic = `product/${productId}/stock`;
    const ordersTopic = `product/${productId}/orders`;

    client.subscribe(priceTopic);
    client.subscribe(stockTopic);
    client.subscribe(ordersTopic);

    const handleMessage = (topic: string, buffer: Buffer) => {
      const payload = JSON.parse(buffer.toString());

      if (topic === priceTopic) {
        setPrice(payload.price);
      }

      if (topic === stockTopic) {
        setStock(payload.stock);
      }

      if (topic === ordersTopic) {
        pushOrder(payload.order);
      }
    };

    client.on("message", handleMessage);

    return () => {
      client.unsubscribe(priceTopic);
      client.unsubscribe(stockTopic);
      client.unsubscribe(ordersTopic);
      client.off("message", handleMessage);
    };
  }, [productId, setPrice, setStock, pushOrder]);
}
```

这段代码已经能说明 MQTT 怎么和状态管理接起来：

```text
MQTT 收到消息
  ↓
判断 topic
  ↓
解析 payload
  ↓
调用 store action
  ↓
组件更新
```

真正项目里当然会把订阅去重、重连恢复、错误处理再封装得更完整。
但理解落地链路时，先抓住这条线就够了。

---

## 八、HTTP 快照怎么接？

商品详情页进入时，先请求快照。

可以用 React Query：

```ts
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useProductStore } from "./product-store";

async function fetchProductSnapshot(productId: string) {
  const res = await fetch(`/api/products/${productId}/snapshot`);
  return res.json();
}

export function useProductSnapshot(productId: string) {
  const setSnapshot = useProductStore((s) => s.setSnapshot);

  const query = useQuery({
    queryKey: ["product-snapshot", productId],
    queryFn: () => fetchProductSnapshot(productId),
    enabled: !!productId,
  });

  useEffect(() => {
    if (query.data) {
      setSnapshot(query.data);
    }
  }, [query.data, setSnapshot]);

  return query;
}
```

这里 React Query 负责：

```text
请求快照
loading
error
缓存
重新请求
```

Zustand 负责：

```text
保存页面实时状态
被 MQTT 增量更新
被组件订阅
```

不要把两者混在一起。

---

## 九、页面怎么使用？

最后页面就很简单。

```tsx
export function ProductPage({ productId }: { productId: string }) {
  useProductSnapshot(productId);
  useProductRealtime(productId);

  return (
    <main>
      <ProductPrice />
      <ProductStock />
      <RecentOrders />
    </main>
  );
}
```

价格组件只订阅价格：

```tsx
function ProductPrice() {
  const price = useProductStore((s) => s.price);

  return <div>价格：{price ?? "--"}</div>;
}
```

库存组件只订阅库存：

```tsx
function ProductStock() {
  const stock = useProductStore((s) => s.stock);

  return <div>库存：{stock ?? "--"}</div>;
}
```

订单组件只订阅最近订单：

```tsx
function RecentOrders() {
  const orders = useProductStore((s) => s.recentOrders);

  return (
    <div>
      {orders.map((order) => (
        <div key={order.id}>
          {order.user} 购买了 {order.quantity} 件
        </div>
      ))}
    </div>
  );
}
```

这样价格变化只影响价格组件，库存变化只影响库存组件，订单变化只影响订单列表。

这就是状态拆分的价值。

---

## 十、切换商品时要做什么？

如果用户从商品 `1001` 切换到商品 `1002`，要做三件事：

```text
取消旧商品的 MQTT topic
请求新商品 HTTP 快照
订阅新商品 MQTT topic
```

对应到页面逻辑：

```text
productId 变化
  ↓
useProductSnapshot 重新请求新快照
  ↓
useProductRealtime cleanup 旧订阅
  ↓
useProductRealtime 订阅新 topic
```

React 的 `useEffect cleanup` 正好适合做这件事。

---

## 十一、断线重连后要做什么？

MQTT 一般支持自动重连。

但重连后要注意一个问题：

**断线期间的消息可能丢了。**

比如断线前库存是 86，断线期间卖出了 5 件。
重连后如果只继续收推送，前端可能不知道中间少了多少库存。

所以比较稳的做法是：

```text
MQTT 重连成功
  ↓
重新请求一次 HTTP 快照
  ↓
用快照校准当前 store
  ↓
继续接收 MQTT 增量
```

也就是说，HTTP 快照不仅用于首屏，也可以用于重连后的状态校准。

---

## 十二、这个模式迁移到交易所也一样

虽然上面讲的是商品页，但换成交易所也是同一套逻辑。

商品价格可以类比成：

```text
ticker 最新价
```

商品库存可以类比成：

```text
盘口 orderbook
```

最近购买记录可以类比成：

```text
最新成交 trades
```

所以交易所里也是：

```text
HTTP 请求 ticker / orderbook / trades / kline 快照
  ↓
写入 Zustand
  ↓
MQTT 订阅实时 topic
  ↓
收到增量后 merge 到 Zustand
  ↓
组件通过 selector 更新
```

只是交易所的数据合并更复杂一些：

```text
盘口要按 price 合并档位
K 线要判断更新当前 candle 还是追加新 candle
成交要按 tradeId 去重并控制长度
```

但底层思想完全一样。

---

## 十三、面试时怎么说？

如果面试官问：

> 你们实时行情链路是怎么设计的？

可以这样回答：

我们当时采用的是 HTTP 快照加 MQTT 实时推送的方式。HTTP 负责初始化完整状态，比如用户进入页面时先拿当前交易对的 24h 行情、盘口、最近成交和 K 线数据，保证首屏不是空的。MQTT 负责后续增量变化，比如最新价、盘口档位、成交记录和 K 线更新。

前端状态层用 Zustand 做统一承接。React Query 只负责请求 HTTP 快照和处理 loading、error、缓存这些请求状态；MQTT 收到消息后不会直接 setState，而是根据 topic 类型调用 Zustand 的 action，比如更新 ticker、合并 orderbook、追加 trades、更新 K 线。

组件层不会订阅整个 store，而是用 selector 只订阅自己需要的数据。比如盘口组件只订阅 orderbook，成交组件只订阅 trades，价格组件只订阅 ticker。这样高频推送不会导致整个交易页重渲染。

切换交易对时，会取消旧 symbol 的 topic 订阅，重新请求新 symbol 的 HTTP 快照，再订阅新的 MQTT topic。断线重连后，会重新拉一次快照校准状态，避免断线期间丢失增量消息。

一句话总结就是：**HTTP 负责完整基准状态，MQTT 负责实时增量变化，Zustand 负责承接和分发状态，组件通过 selector 做局部更新。**

---

## 十四、总结

实时数据落地不要一开始就想得太复杂。

先抓住三个角色：

```text
HTTP 快照：页面刚打开时，现在完整状态是什么？
MQTT 推送：页面打开之后，发生了哪些变化？
状态管理：这些变化怎么进入前端，并驱动局部 UI 更新？
```

一个最小可落地模型就是：

```text
进入页面
  ↓
拉 HTTP snapshot
  ↓
写入 store
  ↓
订阅 MQTT topic
  ↓
收到消息
  ↓
更新 store
  ↓
组件 selector 局部更新
```

这个模式可以用在很多场景里：

```text
商品库存
订单状态
物流轨迹
在线协作
实时通知
交易行情
游戏房间状态
设备监控数据
```

不要被“实时系统”这个词吓到。
它本质上就是：

**先拿一份完整数据，再持续接收变化，然后把变化正确地合并到前端状态里。**
