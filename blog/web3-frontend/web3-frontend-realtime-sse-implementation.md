# Web3 前端实时通信如何落地：从 SSE 订阅到行情、订单与账户状态更新

在 Web3 交易产品里，实时通信几乎是绕不开的一环。

如果只是做一个普通 DApp，前端可能只需要在用户点击按钮后调用合约，然后等待交易确认。但一旦进入期权交易、订单簿、账户保证金、持仓管理这类场景，页面需要持续接收大量服务端状态变化。

这些变化可能包括：

```text id="p9e6xa"
标的资产价格
期权报价
Greeks
订单簿
最近成交
用户订单状态
用户持仓
账户余额
可用保证金
Mini App 中的余额、积分与仓位
```

这些数据的特点并不相同。有些是公开行情，有些是用户私有账户数据；有些频率很高，有些只需要低频刷新；有些与当前市场有关，有些与当前登录用户有关。

所以，实时通信模块真正要解决的问题，不只是“怎么建立一条连接”，而是：

```text id="m1bdjj"
哪些数据走长连接
哪些数据继续走 HTTP 查询
不同业务流如何拆分
连接什么时候建立和关闭
订阅目标变化时如何切换
如何避免旧连接污染新页面
如何把实时数据落到前端状态
高频行情如何避免造成频繁渲染
断线或丢事件后如何恢复完整状态
```

在这个项目里，实时通信采用的不是 WebSocket，而是：

```text id="tfy8so"
SSE + HTTP Mutation + React Query Polling
```

也就是说，SSE 负责服务端状态回推，HTTP Mutation 负责用户操作提交，React Query 和 polling 负责完整快照与兜底刷新。

这篇文章就围绕这个思路，聊一聊一个 Web3 前端中的 SSE 实时模块应该如何落地。

从代码结构上看，实时通信模块可以先被拆成几个明确的入口：

```text id="0exgjn"
src/features/realtime
  market-stream.ts
  trade-stream.ts
  user-stream.ts
  miniapp-public-stream.ts
  miniapp-private-stream.ts
  realtime.types.ts
  realtime.utils.ts
```

这样做不是为了形式上拆文件，而是为了让每条实时流都有自己的订阅条件、事件类型、生命周期和消费方式。

---

## 一、实时通信不是收到消息后 setState

很多人第一次封装实时通信时，可能会写成这样：

```text id="a41yg1"
建立连接
→ 收到消息
→ JSON.parse
→ switch type
→ setState
```

如果数据量小、业务简单，这种写法还能跑。但在交易系统中，这种实现很快会失控。

比如行情流可能高频推送，订单流只和用户相关，成交流又和当前选中的 instrument 有关。用户切换市场后，旧连接如果没有关闭，旧数据可能继续写入当前页面。再加上账户、持仓、订单列表、行情表格都需要更新，一个巨大的消息处理器很容易变得难以维护。

最简单但不推荐的写法大概是这样：

```ts id="ish6vc"
function useBadRealtime() {
  const [state, setState] = useState({});

  useEffect(() => {
    const source = new EventSource("/api/events");

    source.onmessage = (event) => {
      const message = JSON.parse(event.data);

      setState((prev) => ({
        ...prev,
        [message.type]: message.payload,
      }));
    };

    return () => {
      source.close();
    };
  }, []);
}
```

这段代码的问题不是不能运行，而是边界太粗。所有消息都从同一个入口进来，也都写进同一个状态里。随着业务增长，很容易出现几个问题：

```text id="7zwovt"
事件类型越来越多
消息处理器越来越大
旧订阅没有及时关闭
高频行情不断触发渲染
公共数据和用户私有数据混在一起
```

因此，一个成熟一点的实时通信模块，不应该只关注通信协议，而应该围绕业务流设计。

在这个项目中，实时流大致拆成了几类：

```text id="t3ai4j"
公共市场流：推送行情、期权报价、Greeks 等公开数据
成交流：推送当前 instrument 的订单簿和最近成交
用户私有流：推送账户、订单、持仓等用户级数据
Mini App 公共流：推送 ticker、分时线等数据
Mini App 私有流：推送余额、仓位等私有数据
```

不同流有不同的订阅条件、鉴权方式、生命周期和消费方式。拆开之后，每条流的职责更清楚，也更容易做连接治理。

---

## 二、为什么选择 SSE，而不是 WebSocket

从项目实现来看，实时通信并没有使用 WebSocket，主要采用的是 SSE。

这不是因为 SSE 一定比 WebSocket 更高级，而是因为当前业务模型更适合 SSE。

SSE，也就是 Server-Sent Events，天然适合服务端向浏览器持续推送事件。它的通信模型是：

```text id="n3gq5f"
前端建立订阅
→ 服务端持续推送
→ 前端消费事件
```

这个项目中的大多数实时需求都符合这种模式。

例如：

```text id="wixb5s"
用户选择 BTC 市场
→ 服务端推送 BTC 期权行情

用户打开某个 instrument
→ 服务端推送该 instrument 的订单簿和最近成交

用户完成登录
→ 服务端推送该用户的账户、订单和持仓变化

Mini App 建立 Telegram 鉴权连接
→ 服务端推送 ticker、余额和仓位变化
```

前端在这些场景中主要是订阅者和消费者，不需要通过同一条长连接高频向服务端发送消息。

下单、撤单、充值、提现这类用户主动操作，仍然通过 HTTP mutation 完成。

因此，当前架构可以明确拆成：

```text id="0h49pd"
交易提交：HTTP Mutation
实时更新：SSE
完整快照与兜底：React Query / Polling
```

WebSocket 更适合强双向场景，比如聊天室、多人协作、实时游戏，或者客户端需要高频向服务端发送消息的业务。如果未来产品出现这类需求，WebSocket 会更自然。

但对于以服务端单向推送为主的行情、订单、账户和持仓同步，SSE 的接入成本更低，也更贴近现有 HTTP 鉴权体系。

一个最基础的 SSE 连接可以写成这样：

```ts id="e9mp81"
function createEventSource(url: string, onMessage: (data: unknown) => void) {
  const source = new EventSource(url);

  source.onmessage = (event) => {
    onMessage(JSON.parse(event.data));
  };

  source.onerror = () => {
    source.close();
  };

  return source;
}
```

而用户操作仍然保持 HTTP mutation：

```ts id="ta0yo2"
async function cancelOrder(orderId: string) {
  const response = await fetch(`/api/orders/${orderId}/cancel`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to cancel order");
  }

  return response.json();
}
```

这两段代码分别代表两种职责：

```text id="kcl04e"
SSE：接收状态变化
HTTP：提交用户动作
```

不要为了“实时”就把所有事情都塞进长连接里。

---

## 三、项目中的实时流如何拆分

一个真实交易前端，不应该只有一个全局 SSE。

如果所有事件都通过一个连接进来，再在前端做巨型分发，业务边界会变得很模糊。

这个项目的做法是按业务场景拆流。

### 1. Trade 公共市场流

Trade 端的公共市场流用于订阅当前市场的公开行情。

它会根据当前选中的 `underlying index` 建立连接。比如用户正在看 BTC 市场，就订阅 BTC 相关的市场数据。

这类流主要处理：

```text id="yoq3fg"
instrument
Underlying
instrument_greek
instrument_quote
```

它们会影响期权表格、标记价格、盘口报价、成交量、持仓量和 Greeks 等展示。

公共市场流的特点是：

```text id="sbocxn"
数据公开
频率较高
和当前 underlying 相关
切换市场时需要切换订阅
```

可以先定义市场流事件类型：

```ts id="ysgd2x"
type MarketStreamEvent =
  | {
      type: "instrument";
      payload: Instrument;
    }
  | {
      type: "instrument_greek";
      payload: InstrumentGreek;
    }
  | {
      type: "instrument_quote";
      payload: InstrumentQuote;
    }
  | {
      type: "Underlying";
      payload: UnderlyingInfo;
    };
```

然后根据当前 underlying 建立订阅：

```ts id="u0cj3c"
function getMarketStreamUrl(underlying: string) {
  return `/api/stream/market?underlying=${encodeURIComponent(underlying)}`;
}
```

### 2. Trade 成交流

成交流关注的是当前具体 instrument。

比如用户点开某个期权合约，页面需要展示这个合约的订单簿和最近成交。它和公共市场流不同，订阅粒度更细。

可以理解成：

```text id="jqimbf"
公共市场流：关注整个 BTC 期权市场
成交流：关注 BTC 某一个具体期权合约
```

成交流主要处理：

```text id="bocp8n"
recent_trade
order_book
```

用户切换 instrument 时，需要关闭旧流，再建立新流，避免旧合约的成交数据写入当前页面。

事件类型可以这样定义：

```ts id="88sl64"
type TradeStreamEvent =
  | {
      type: "recent_trade";
      payload: RecentTrade[];
    }
  | {
      type: "order_book";
      payload: OrderBookSnapshot;
    };
```

### 3. Trade 用户私有流

用户私有流只在用户登录后建立。

它通过 access token 接入，用于接收用户级别的实时变化，比如：

```text id="eqmpoq"
dashboard：账户概览
open_order：挂单变化
position：持仓变化
user_instrument：用户相关合约数据变化
```

这条流的权限边界更强。它不是公共行情，而是和当前登录用户绑定。

私有事件可以单独定义：

```ts id="bvrqx2"
type UserStreamEvent =
  | {
      type: "dashboard";
      payload: AccountDashboard;
    }
  | {
      type: "open_order";
      payload: OpenOrder;
    }
  | {
      type: "position";
      payload: Position;
    }
  | {
      type: "user_instrument";
      payload: UserInstrument;
    };
```

### 4. Mini App 公共流与私有流

Mini App 也有自己的实时流拆分。

公共流主要处理 ticker、分时线等展示数据；私有流则处理余额和仓位。

不过这里有一个细节：虽然叫公共流，但 Mini App 后端仍然要求携带 Telegram `tma` Authorization。因此它不是完全匿名的公共连接，而是带有 Telegram 鉴权上下文的实时订阅。

这也说明了一个问题：前端命名里的 public/private，更多是业务语义，不一定等同于“是否完全无需鉴权”。

Mini App 的事件可以这样拆：

```ts id="xohtdj"
type MiniAppPublicEvent =
  | {
      type: "ticker";
      payload: MiniTicker;
    }
  | {
      type: "tsline";
      payload: MiniTsLinePoint[];
    };

type MiniAppPrivateEvent =
  | {
      type: "balance";
      payload: MiniBalance;
    }
  | {
      type: "order_position";
      payload: MiniOrderPosition;
    };
```

通过类型拆分之后，后续 Hook 就不会把行情、订单、账户和 Mini App 状态混在一个巨大 switch 里。

---

## 四、核心链路：SSE 如何进入前端状态系统

从整体上看，项目的实时数据消费链路可以概括为：

```text id="vvr2v6"
Provider 或 Container 挂载
→ 根据业务场景建立 SSE 流
→ market / trade / user / private stream 接收事件
→ 根据 underlying / instrument / token 分发
→ 更新 Jotai atoms
→ 必要时 invalidate React Query
→ UI 更新行情、订单、账户和持仓
→ cleanup 时 close / abort / clear queue
```

这条链路里，最关键的不是如何创建连接，而是数据进入前端之后如何被消费。

项目中主要使用两类状态工具：

```text id="bbf9fz"
Jotai：负责即时展示状态
React Query：负责完整快照、缓存和兜底刷新
```

例如行情、订单和持仓这类实时更新，适合先写入 Jotai，让页面立即响应。

而订单列表、账户接口、历史数据这类需要完整快照的数据，则可以通过 React Query 重新请求，保证最终一致性。

可以先定义几个 Jotai atom：

```ts id="9nf2wn"
import { atom } from "jotai";

export const instrumentsMapAtom = atom<Record<string, Instrument>>({});
export const greeksMapAtom = atom<Record<string, InstrumentGreek>>({});
export const quotesMapAtom = atom<Record<string, InstrumentQuote>>({});

export const orderBookAtom = atom<OrderBookSnapshot | null>(null);
export const recentTradesAtom = atom<RecentTrade[]>([]);

export const accountDashboardAtom = atom<AccountDashboard | null>(null);
export const openOrdersMapAtom = atom<Record<string, OpenOrder>>({});
export const positionsMapAtom = atom<Record<string, Position>>({});
```

React Query 负责完整快照：

```ts id="c78ian"
export const queryKeys = {
  account: ["account"] as const,
  accountDashboard: () => ["account", "dashboard"] as const,
  openOrders: () => ["orders", "open"] as const,
  positions: () => ["positions"] as const,
  underlyings: () => ["market", "underlyings"] as const,
};
```

收到 SSE 后，可以选择更新 Jotai，也可以让 Query 失效：

```ts id="8gjsic"
queryClient.invalidateQueries({
  queryKey: queryKeys.openOrders(),
});
```

这种组合的核心是：

```text id="xgkhwi"
实时事件让 UI 先动起来
Query 刷新让数据回到完整快照
```

---

## 五、Provider 只负责启动，不承载复杂业务

Trade 端通过全局 Provider 挂载实时通信层。

Provider 的职责很轻：它主要负责让实时 Hook 在合适的位置运行。

真正决定是否连接的，是 Hook 内部的业务条件：

```text id="43unxk"
没有选择 underlying，不连接市场流
没有登录，不连接用户私有流
没有选中 instrument，不连接成交流
组件卸载时关闭连接
```

Mini App 也是类似思路，通过无 UI 的 Container 挂载公共流和私有流。

这种设计的好处是，Provider 和 Container 不需要理解复杂消息结构，也不需要承担业务更新逻辑。它们只负责启动副作用，具体的连接、解析、分发和清理由各自 Hook 负责。

这比把所有实时逻辑写在一个全局 Provider 中更清晰。

Provider 可以写得非常轻：

```tsx id="vcqe59"
function TradeRealtimeProvider({ children }: { children: React.ReactNode }) {
  const selectedUnderlying = useSelectedUnderlying();
  const selectedInstrument = useSelectedInstrument();
  const { isAuthenticated, accessToken } = useAuthState();

  useMarketStream(selectedUnderlying);
  useTradeStream(selectedInstrument);
  useUserStream({
    enabled: isAuthenticated,
    accessToken,
  });

  return <>{children}</>;
}
```

Mini App 也可以类似：

```tsx id="b0ukqo"
function MiniAppRealtimeContainer() {
  const tmaAuth = useTelegramAuth();

  useMiniAppPublicStream({
    enabled: Boolean(tmaAuth),
    authorization: tmaAuth,
  });

  useMiniAppPrivateStream({
    enabled: Boolean(tmaAuth),
    authorization: tmaAuth,
  });

  return null;
}
```

这里的重点是：Provider 只是启动实时副作用，不直接处理消息细节。真正的连接、分发和清理放在各自 Hook 内部。

---

## 六、订阅目标变化时，如何避免旧流污染新页面

实时系统中一个很常见的问题是 stale stream。

比如用户正在查看 BTC 市场，此时建立了 BTC 的行情流。随后用户切换到 ETH，如果 BTC 的 SSE 没有及时关闭，它仍然可能继续推送数据。这样就会出现：

```text id="p5qj6w"
页面显示 ETH
但 BTC 数据继续写入状态
```

为了避免这种问题，项目在切换订阅目标时会先比较当前流和目标流是否一致。

对于市场流来说，需要关注当前 `underlying index`。

对于成交流来说，需要关注当前 `instrument`。

如果订阅目标发生变化，就应该执行：

```text id="bvk9zp"
关闭旧连接
清空旧队列
重置 pending 状态
建立新连接
```

这个过程非常重要。

实时连接不是越多越好。每一条连接都应该和当前页面状态绑定：页面看什么，就订阅什么；页面切走了，就关闭旧流。

可以用 `ref` 保存当前订阅目标：

```ts id="1pvmo9"
function useMarketStream(underlying: string | null) {
  const currentUnderlyingRef = useRef<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!underlying) return;

    if (currentUnderlyingRef.current === underlying) {
      return;
    }

    sourceRef.current?.close();
    sourceRef.current = null;

    currentUnderlyingRef.current = underlying;

    const source = new EventSource(getMarketStreamUrl(underlying));
    sourceRef.current = source;

    source.onmessage = (event) => {
      const message = JSON.parse(event.data) as MarketStreamEvent;

      if (currentUnderlyingRef.current !== underlying) {
        return;
      }

      handleMarketEvent(message);
    };

    return () => {
      source.close();

      if (currentUnderlyingRef.current === underlying) {
        currentUnderlyingRef.current = null;
      }
    };
  }, [underlying]);
}
```

这里有两个保护点：

```text id="9cndv1"
切换 underlying 时主动关闭旧连接
收到消息时再次确认当前订阅目标是否一致
```

第二个判断很有用，因为在极端情况下，旧连接关闭前仍然可能有消息到达。

成交流也可以做类似处理：

```ts id="kflgdf"
function useTradeStream(instrumentId: string | null) {
  const currentInstrumentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!instrumentId) return;

    currentInstrumentRef.current = instrumentId;

    const source = new EventSource(
      `/api/stream/trade?instrument=${instrumentId}`,
    );

    source.onmessage = (event) => {
      const message = JSON.parse(event.data) as TradeStreamEvent;

      if (currentInstrumentRef.current !== instrumentId) {
        return;
      }

      handleTradeEvent(message);
    };

    return () => {
      source.close();

      if (currentInstrumentRef.current === instrumentId) {
        currentInstrumentRef.current = null;
      }
    };
  }, [instrumentId]);
}
```

这类代码看起来不复杂，但对实时页面非常关键。没有它，切换市场、切换合约、切换用户时都可能出现旧数据污染。

---

## 七、SSE 生命周期：建立、重连与清理

SSE 是长连接，所以生命周期管理比创建连接更重要。

项目中使用了几种不同方式接入 SSE。

### 原生 EventSource

公共市场流使用原生 `EventSource`。

它的优点是浏览器原生支持，接入简单：

```ts id="rqxxu4"
const source = new EventSource(url);
```

清理时调用：

```ts id="blojzt"
source.close();
```

原生 EventSource 更适合不需要复杂请求头的公共流。

一个基础实现可以是：

```ts id="n59f85"
function useNativeEventSource<TEvent>(params: {
  url: string | null;
  enabled: boolean;
  onEvent: (event: TEvent) => void;
}) {
  useEffect(() => {
    if (!params.enabled || !params.url) return;

    const source = new EventSource(params.url);

    source.onmessage = (event) => {
      params.onEvent(JSON.parse(event.data) as TEvent);
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [params.enabled, params.url, params.onEvent]);
}
```

### fetchEventSource

用户流和成交流使用 `fetchEventSource`。

相比原生 EventSource，它更适合需要自定义请求头、AbortController 和响应校验的场景。

例如用户私有流需要携带 token，清理时可以通过：

```ts id="r4fhu7"
controller.abort();
```

主动中止请求。

这类流也实现了最大重试次数控制。比如 Trade 中 `fetchEventSource` 相关流最大重试 3 次，超过后会终止连接，避免无限重试。

示意代码如下：

```ts id="y5l8to"
import { fetchEventSource } from "@microsoft/fetch-event-source";

function useFetchSSE<TEvent>(params: {
  url: string | null;
  enabled: boolean;
  token?: string;
  onEvent: (event: TEvent) => void;
}) {
  useEffect(() => {
    if (!params.enabled || !params.url) return;

    const controller = new AbortController();
    let retryCount = 0;
    const maxRetryCount = 3;

    fetchEventSource(params.url, {
      signal: controller.signal,
      headers: params.token
        ? {
            Authorization: `Bearer ${params.token}`,
          }
        : undefined,

      onmessage(message) {
        params.onEvent(JSON.parse(message.data) as TEvent);
      },

      onerror(error) {
        retryCount += 1;

        if (retryCount > maxRetryCount) {
          controller.abort();
          throw error;
        }

        throw error;
      },
    });

    return () => {
      controller.abort();
    };
  }, [params.enabled, params.url, params.token, params.onEvent]);
}
```

这类封装比原生 EventSource 更适合用户私有流，因为它可以明确处理 token、abort 和重试。

### EventSourcePolyfill

Mini App 中需要携带 Telegram Authorization。由于原生 EventSource 不支持自定义 header，因此需要使用 polyfill 或适配方案。

这类连接除了关闭 EventSource 本身，还需要清理重连定时器，避免组件卸载后仍然触发重连。

示意代码如下：

```ts id="gfl5g4"
function useMiniAppEventSource(params: {
  url: string | null;
  enabled: boolean;
  authorization: string | null;
  onEvent: (event: MiniAppPublicEvent | MiniAppPrivateEvent) => void;
}) {
  const retryTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!params.enabled || !params.url || !params.authorization) return;

    const source = new EventSourcePolyfill(params.url, {
      headers: {
        Authorization: params.authorization,
      },
    });

    source.onmessage = (event) => {
      params.onEvent(JSON.parse(event.data));
    };

    source.onerror = () => {
      source.close();

      retryTimerRef.current = window.setTimeout(() => {
        // 这里可以触发重连状态变化
      }, 1000);
    };

    return () => {
      source.close();

      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [params.enabled, params.url, params.authorization, params.onEvent]);
}
```

这个例子强调的是：除了关闭连接，也要清理定时器，否则页面卸载后仍然可能触发重连逻辑。

---

## 八、重连机制如何设计

重连机制不能只写一句“连接失败后重试”。

不同流的重试策略可以不同。

Trade 中使用 `fetchEventSource` 的用户流和成交流，会记录失败次数，最多重试 3 次。

大致逻辑是：

```text id="oqyqre"
连接出错
→ retryCount + 1
→ 未超过 3 次，继续重试
→ 超过 3 次，中止连接
```

Mini App 则使用指数退避，最大尝试 5 次：

```text id="7nhd9x"
1 秒
→ 2 秒
→ 4 秒
→ 8 秒
→ 最高不超过 30 秒
```

指数退避的好处是，在弱网或服务端故障时，不会持续高频打请求。

不过实际工程中还需要注意一个细节：连接实例应该尽早写入 ref。否则如果连接在 `onopen` 前失败，错误处理逻辑可能拿不到当前连接实例，从而影响重连判断。

此外，公共市场流发生错误后会主动关闭连接，但没有做明确的最大重试控制，重新连接更多依赖业务状态变化触发 Effect。这个策略能工作，但后续可以抽象成更统一的连接管理器。

指数退避可以单独写成工具函数：

```ts id="bh87w2"
function getBackoffDelay(retryCount: number) {
  const baseDelay = 1000;
  const maxDelay = 30_000;

  return Math.min(baseDelay * 2 ** retryCount, maxDelay);
}
```

重连状态也可以被显式管理：

```ts id="l9a33e"
type SSEStatus =
  | "idle"
  | "connecting"
  | "open"
  | "retrying"
  | "closed"
  | "failed";
```

一个简化的重连逻辑可以这样写：

```ts id="pitiz7"
function useReconnectableSSE(params: {
  url: string | null;
  enabled: boolean;
  maxRetryCount: number;
  onEvent: (event: unknown) => void;
}) {
  const [status, setStatus] = useState<SSEStatus>("idle");
  const retryCountRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!params.enabled || !params.url) return;

    let disposed = false;

    const connect = () => {
      if (disposed || !params.url) return;

      setStatus(retryCountRef.current > 0 ? "retrying" : "connecting");

      const source = new EventSource(params.url);
      sourceRef.current = source;

      source.onopen = () => {
        retryCountRef.current = 0;
        setStatus("open");
      };

      source.onmessage = (event) => {
        params.onEvent(JSON.parse(event.data));
      };

      source.onerror = () => {
        source.close();

        if (retryCountRef.current >= params.maxRetryCount) {
          setStatus("failed");
          return;
        }

        const delay = getBackoffDelay(retryCountRef.current);
        retryCountRef.current += 1;

        timerRef.current = window.setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      disposed = true;
      setStatus("closed");

      sourceRef.current?.close();
      sourceRef.current = null;

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [params.enabled, params.url, params.maxRetryCount, params.onEvent]);

  return status;
}
```

这个示例不是为了替代所有 SSE 封装，而是说明重连逻辑至少要处理几件事：

```text id="rnd3d7"
连接状态
最大重试次数
指数退避
连接实例 ref
定时器清理
组件卸载后的停止标记
```

---

## 九、SSE 数据如何分发到 Jotai 和 React Query

SSE 收到消息后，不能一股脑地全局 setState。

项目更偏向“按事件类型和业务 key 增量更新”。

### Trade 侧：Jotai 即时更新，Query 局部失效

公共行情流收到数据后，会根据消息类型更新不同状态。

例如：

```text id="q2wgo6"
instrument
→ 更新期权基础信息

instrument_greek
→ 更新 Greeks、mark price、spot price

instrument_quote
→ 更新成交量、持仓量、报价等

Underlying
→ 触发 underlying 相关 Query 刷新
```

这些行情数据通常以 instrument 为 key 存在 Map 中。

使用 Map 的好处是增量更新很方便：

```text id="7ctnon"
根据 instrument 找到旧数据
→ 合并本次推送字段
→ 保留其他字段
→ 返回新的 Map
```

示意代码如下：

```ts id="34j7aj"
function mergeByInstrumentId<T extends { instrumentId: string }>(
  prev: Record<string, T>,
  next: T,
) {
  return {
    ...prev,
    [next.instrumentId]: {
      ...prev[next.instrumentId],
      ...next,
    },
  };
}
```

公共市场流的分发可以这样写：

```ts id="j0zaib"
function useHandleMarketEvent() {
  const queryClient = useQueryClient();

  const setInstruments = useSetAtom(instrumentsMapAtom);
  const setGreeks = useSetAtom(greeksMapAtom);
  const setQuotes = useSetAtom(quotesMapAtom);

  return useCallback(
    (event: MarketStreamEvent) => {
      if (event.type === "instrument") {
        setInstruments((prev) => mergeByInstrumentId(prev, event.payload));
      }

      if (event.type === "instrument_greek") {
        setGreeks((prev) => mergeByInstrumentId(prev, event.payload));
      }

      if (event.type === "instrument_quote") {
        setQuotes((prev) => mergeByInstrumentId(prev, event.payload));
      }

      if (event.type === "Underlying") {
        queryClient.invalidateQueries({
          queryKey: queryKeys.underlyings(),
        });
      }
    },
    [queryClient, setInstruments, setGreeks, setQuotes],
  );
}
```

用户私有流也是类似逻辑：

```text id="yvx0d1"
dashboard
→ 更新账户 Atom

open_order
→ 更新订单 Map
→ 失效挂单和历史订单 Query

position
→ 更新持仓 Map
→ 局部刷新相关 Query
```

代码可以这样写：

```ts id="48kom9"
function useHandleUserEvent() {
  const queryClient = useQueryClient();

  const setDashboard = useSetAtom(accountDashboardAtom);
  const setOpenOrders = useSetAtom(openOrdersMapAtom);
  const setPositions = useSetAtom(positionsMapAtom);

  return useCallback(
    (event: UserStreamEvent) => {
      if (event.type === "dashboard") {
        setDashboard(event.payload);

        queryClient.setQueryData(queryKeys.accountDashboard(), event.payload);
      }

      if (event.type === "open_order") {
        setOpenOrders((prev) => ({
          ...prev,
          [event.payload.orderId]: {
            ...prev[event.payload.orderId],
            ...event.payload,
          },
        }));

        queryClient.invalidateQueries({
          queryKey: queryKeys.openOrders(),
        });
      }

      if (event.type === "position") {
        setPositions((prev) => ({
          ...prev,
          [event.payload.positionId]: {
            ...prev[event.payload.positionId],
            ...event.payload,
          },
        }));

        queryClient.invalidateQueries({
          queryKey: queryKeys.positions(),
        });
      }
    },
    [queryClient, setDashboard, setOpenOrders, setPositions],
  );
}
```

Jotai 负责让页面立即变化，React Query 负责在必要时拉取完整数据，避免长期依赖增量事件。

### Mini App 侧：SSE 主要写入 Jotai

Mini App 的 SSE 消费更偏向直接更新 Jotai。

例如：

```text id="xq4d36"
ticker
→ 更新 tickerMapAtom

tsline
→ 更新时间序列数据

balance
→ 更新 balanceAtom

order_position
→ 更新 orderPositionMapAtom
```

其中分时线数据会合并新旧数据、按 timestamp 去重排序，并只保留最近一段长度，避免数组无限增长。

示意代码如下：

```ts id="vez0ut"
export const tickerMapAtom = atom<Record<string, MiniTicker>>({});
export const tsLineMapAtom = atom<Record<string, MiniTsLinePoint[]>>({});
export const balanceAtom = atom<MiniBalance | null>(null);
export const orderPositionMapAtom = atom<Record<string, MiniOrderPosition>>({});
```

分时线更新可以单独封装：

```ts id="qovqox"
function mergeTsLinePoints(
  prev: MiniTsLinePoint[],
  next: MiniTsLinePoint[],
  maxLength = 300,
) {
  const map = new Map<number, MiniTsLinePoint>();

  for (const item of prev) {
    map.set(item.timestamp, item);
  }

  for (const item of next) {
    map.set(item.timestamp, item);
  }

  return Array.from(map.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-maxLength);
}
```

Mini App 事件分发可以这样写：

```ts id="v67e17"
function useHandleMiniAppEvent() {
  const setTickerMap = useSetAtom(tickerMapAtom);
  const setTsLineMap = useSetAtom(tsLineMapAtom);
  const setBalance = useSetAtom(balanceAtom);
  const setOrderPositionMap = useSetAtom(orderPositionMapAtom);

  return useCallback(
    (event: MiniAppPublicEvent | MiniAppPrivateEvent) => {
      if (event.type === "ticker") {
        setTickerMap((prev) => ({
          ...prev,
          [event.payload.symbol]: event.payload,
        }));
      }

      if (event.type === "tsline") {
        setTsLineMap((prev) => ({
          ...prev,
          [event.payload[0]?.symbol ?? "unknown"]: mergeTsLinePoints(
            prev[event.payload[0]?.symbol ?? "unknown"] ?? [],
            event.payload,
          ),
        }));
      }

      if (event.type === "balance") {
        setBalance(event.payload);
      }

      if (event.type === "order_position") {
        setOrderPositionMap((prev) => ({
          ...prev,
          [event.payload.positionId]: {
            ...prev[event.payload.positionId],
            ...event.payload,
          },
        }));
      }
    },
    [setTickerMap, setTsLineMap, setBalance, setOrderPositionMap],
  );
}
```

Mini App 的 Query Cache 刷新更多发生在 mutation、页面查询和 polling 中，而不是每条 SSE 消息里都直接 setQueryData 或 invalidate。

这也是一种可接受的分工：Jotai 负责实时展示，Query 负责请求型数据和兜底恢复。

---

## 十、Trade 高频行情如何做消费层削峰

行情流最容易造成性能问题。

如果每收到一条消息就立即更新状态：

```ts id="izsccd"
source.onmessage = (event) => {
  updateAtom(JSON.parse(event.data));
};
```

那么在高频行情下，React 会被不断触发更新，表格和图表很容易卡顿。

这个项目比较值得借鉴的一点，是没有试图“改造 SSE 协议”，而是在前端消费层做削峰。

核心思路是：

```text id="3cnua2"
SSE 消息先进入队列
同一帧内只安排一次 requestAnimationFrame
下一帧统一消费队列
批量处理状态更新
```

可以理解成：

```text id="8mvrgq"
短时间内收到多条行情
→ 先入队
→ 当前帧不重复调度
→ 下一帧统一处理
→ 减少 React 高频渲染
```

这里优化的不是网络层，而是 UI 消费层。

这点很重要。服务端推送频率高，不代表前端要以完全相同的频率更新 React 状态。对于高频行情来说，前端应该控制消费节奏，把更新压到浏览器渲染帧内处理。

这就是 Trade 实时模块的一个亮点：**消费层削峰，而不是协议层魔改**。

可以用一个队列 Hook 表达这种思路：

```ts id="xy3zrk"
function useRafEventQueue<TEvent>(consume: (events: TEvent[]) => void) {
  const queueRef = useRef<TEvent[]>([]);
  const rafRef = useRef<number | null>(null);

  const push = useCallback(
    (event: TEvent) => {
      queueRef.current.push(event);

      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        const events = queueRef.current;
        queueRef.current = [];
        rafRef.current = null;

        consume(events);
      });
    },
    [consume],
  );

  useEffect(() => {
    return () => {
      queueRef.current = [];

      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return push;
}
```

市场流可以这样使用：

```ts id="cpvhvw"
function useMarketStreamWithQueue(underlying: string | null) {
  const handleBatch = useHandleMarketEventBatch();

  const pushMarketEvent = useRafEventQueue<MarketStreamEvent>(handleBatch);

  useEffect(() => {
    if (!underlying) return;

    const source = new EventSource(getMarketStreamUrl(underlying));

    source.onmessage = (event) => {
      pushMarketEvent(JSON.parse(event.data) as MarketStreamEvent);
    };

    return () => {
      source.close();
    };
  }, [underlying, pushMarketEvent]);
}
```

批量处理时，可以按类型聚合，再一次性更新状态：

```ts id="zn1r56"
function useHandleMarketEventBatch() {
  const setInstruments = useSetAtom(instrumentsMapAtom);
  const setGreeks = useSetAtom(greeksMapAtom);
  const setQuotes = useSetAtom(quotesMapAtom);

  return useCallback(
    (events: MarketStreamEvent[]) => {
      const instruments: Instrument[] = [];
      const greeks: InstrumentGreek[] = [];
      const quotes: InstrumentQuote[] = [];

      for (const event of events) {
        if (event.type === "instrument") {
          instruments.push(event.payload);
        }

        if (event.type === "instrument_greek") {
          greeks.push(event.payload);
        }

        if (event.type === "instrument_quote") {
          quotes.push(event.payload);
        }
      }

      if (instruments.length > 0) {
        setInstruments((prev) => instruments.reduce(mergeByInstrumentId, prev));
      }

      if (greeks.length > 0) {
        setGreeks((prev) => greeks.reduce(mergeByInstrumentId, prev));
      }

      if (quotes.length > 0) {
        setQuotes((prev) => quotes.reduce(mergeByInstrumentId, prev));
      }
    },
    [setInstruments, setGreeks, setQuotes],
  );
}
```

这样一来，短时间内即使收到多条行情消息，也不会每条消息都触发一次 React 状态更新。

---

## 十一、为什么还要保留 Polling

用了 SSE，不代表所有数据都必须走长连接。

项目中仍然保留了不少 polling 场景，比如：

```text id="7n6v1x"
报价结果
任务面板
用户任务列表
新闻
推荐合约
部分账户或排行数据
服务可用性检查
```

这些数据不一定适合 SSE。

原因可能是：

```text id="vjs39z"
更新频率较低
只有特定页面需要
属于请求型结果
不值得长期占用连接
需要作为 SSE 断线后的兜底
```

因此更合理的划分是：

```text id="lvvuzt"
高频、持续、服务端主动变化的数据：SSE
低频、按需、请求型数据：React Query / Polling
用户主动提交的操作：HTTP Mutation
```

这也是为什么项目不是纯 SSE，而是 SSE + polling 的混合实时架构。

混合架构的好处是灵活：实时性强的数据用推送，低频数据继续查询，关键操作通过 mutation，断线或丢事件时还能通过 Query 重新拉取完整状态。

React Query 的 polling 可以这样写：

```ts id="vm4pn9"
function useQuoteResultQuery(taskId: string | null) {
  return useQuery({
    queryKey: ["quote-result", taskId],
    queryFn: () => fetchQuoteResult(taskId!),
    enabled: Boolean(taskId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status === "completed" || status === "failed") {
        return false;
      }

      return 3000;
    },
  });
}
```

服务可用性检查也可以用低频 polling：

```ts id="dtiobh"
function useServiceHealthQuery() {
  return useQuery({
    queryKey: ["service-health"],
    queryFn: fetchServiceHealth,
    refetchInterval: 30_000,
    retry: 1,
  });
}
```

这类数据没必要长期挂 SSE。用 Query 定时刷新，反而更简单。

---

## 十二、SSE 与交易提交的边界

SSE 不负责提交交易。

这个边界必须讲清楚。

用户下单、撤单、充值、提现时，仍然走 HTTP mutation。Mutation 成功通常只表示：

```text id="sq245y"
请求已经被服务端接收
```

它不等于：

```text id="fz1zyd"
订单已经成交
持仓已经变化
资金已经到账
保证金已经释放
链上已经确认
```

后续真实状态应该通过 SSE 或 Query 回到前端。

例如一次下单可能经历：

```text id="368vue"
提交订单
→ 服务端接收
→ 订单进入订单簿
→ 部分成交
→ 完全成交
→ 持仓变化
→ 账户余额变化
```

这些状态不是前端自己 setState 猜出来的，而是由后端和撮合系统回推。

所以，这个项目里的职责边界可以总结为：

```text id="yadnrb"
HTTP Mutation：提交用户操作
SSE：接收后端状态变化
React Query / Polling：获取完整快照和兜底恢复
Jotai：驱动页面即时展示
```

这套分工比“mutation success 后直接改 UI”更适合交易系统。

例如下单 mutation 可以这样写：

```ts id="0hg14g"
interface PlaceOrderRequest {
  instrumentId: string;
  side: "buy" | "sell";
  price: string;
  amount: string;
}

async function placeOrder(payload: PlaceOrderRequest) {
  const response = await fetch("/api/orders/place", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to place order");
  }

  return response.json() as Promise<{
    orderId: string;
    status: "received";
  }>;
}
```

对应的 mutation 只处理“请求已提交”：

```ts id="nq2e3h"
function usePlaceOrderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: placeOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.openOrders(),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.accountDashboard(),
      });
    },
  });
}
```

UI 文案也应该清楚区分：

```tsx id="uc5gbk"
function PlaceOrderButton({ payload }: { payload: PlaceOrderRequest }) {
  const mutation = usePlaceOrderMutation();

  return (
    <button
      disabled={mutation.isPending}
      onClick={() => mutation.mutate(payload)}
    >
      {mutation.isPending ? "提交中..." : "提交订单"}
    </button>
  );
}
```

提交成功后更适合提示：

```text id="lcqjnp"
订单请求已提交，最终状态将根据撮合结果实时更新。
```

而不是直接提示：

```text id="56khjm"
订单已成交。
```

---

## 十三、这套实时架构的工程价值

这套 SSE 模块真正有价值的地方，不是用了某个库，而是整体分层比较清楚。

### 1. 按业务流拆 Hook

公共市场、成交流、用户私有流、Mini App 公共流和私有流都被拆开。

不同流有不同的订阅目标、鉴权方式和生命周期。拆开之后，维护成本更低。

从代码上看，可以形成这样的 Hook 分工：

```ts id="v5t1t7"
useMarketStream(selectedUnderlying);
useTradeStream(selectedInstrument);
useUserStream({ enabled: isAuthenticated, accessToken });
useMiniAppPublicStream({ enabled: Boolean(tmaAuth), authorization: tmaAuth });
useMiniAppPrivateStream({ enabled: Boolean(tmaAuth), authorization: tmaAuth });
```

这比一个 `useGlobalSSE()` 更容易维护。

### 2. 连接生命周期和业务状态绑定

连接不是全局永久存在的对象，而是和业务状态绑定：

```text id="k2pfbe"
underlying 改变，切换市场流
instrument 改变，切换成交流
登录态改变，切换用户私有流
页面卸载，关闭连接
```

这可以减少重复连接、旧数据污染和内存泄漏。

### 3. Jotai 与 React Query 分工明确

Jotai 用于即时、局部、高频状态。

React Query 用于完整快照、分页数据、缓存失效和 polling 兜底。

这比把所有实时数据都塞进一个全局 Store 更清晰。

### 4. 高频行情在消费层削峰

行情流没有直接每条消息触发 React 更新，而是通过队列和 `requestAnimationFrame` 控制消费节奏。

这类优化更贴近前端实际性能问题。

### 5. SSE 与 HTTP Mutation 边界清楚

提交动作走 HTTP，状态回推走 SSE。

这避免了把 SSE 当成万能通信通道，也避免了把 mutation success 误认为最终业务状态。

如果用一段最小化代码概括这套架构，大概是：

```ts id="v01flw"
function RealtimeRuntime() {
  const underlying = useSelectedUnderlying();
  const instrument = useSelectedInstrument();
  const { isAuthenticated, accessToken } = useAuthState();

  useMarketStream(underlying);
  useTradeStream(instrument);
  useUserStream({
    enabled: isAuthenticated,
    accessToken,
  });

  useAccountSnapshotQuery(isAuthenticated);
  useOpenOrdersQuery(isAuthenticated);
  usePositionsQuery(isAuthenticated);

  return null;
}
```

这段代码背后的核心不是 Hook 本身，而是这套分工：

```text id="8039sj"
实时流负责增量变化
Query 负责完整快照
Mutation 负责提交操作
组件只消费状态
```

---

## 十四、可以继续优化的方向

这类实时模块后续还可以继续优化。

### 1. 抽象统一的 SSE 连接状态

目前不同流使用了原生 EventSource、fetchEventSource 和 EventSourcePolyfill。

可以抽象统一的连接状态：

```ts id="8n83p7"
type SSEStatus =
  | "idle"
  | "connecting"
  | "open"
  | "retrying"
  | "closed"
  | "failed";
```

这样可以更方便地做日志、监控、错误展示和调试。

例如：

```ts id="tvznf4"
interface SSEConnectionState {
  status: SSEStatus;
  retryCount: number;
  lastConnectedAt?: number;
  lastErrorAt?: number;
  errorMessage?: string;
}
```

### 2. 统一重试策略

不同流目前重试策略不完全一致。

可以根据业务重要性分层：

```text id="f8cjgd"
公共行情：可自动重连
用户私有流：重连后刷新账户和订单快照
成交流：instrument 切换时重建
Mini App 私有流：指数退避并限制次数
```

统一策略后，排查问题会更容易。

### 3. cleanup 时取消未执行的 requestAnimationFrame

如果行情更新已经安排了下一帧处理，但组件在下一帧之前卸载，最好在 cleanup 中取消对应 RAF，避免执行无效更新。

示意代码如下：

```ts id="k7pefi"
return () => {
  queueRef.current = [];

  if (rafRef.current !== null) {
    window.cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }
};
```

### 4. 重连后主动刷新完整快照

SSE 断线期间可能丢事件。

连接恢复后，可以主动刷新：

```text id="deubc9"
账户
订单
持仓
underlying
instrument
```

这样可以避免只依赖增量事件造成状态缺口。

可以封装一个统一刷新函数：

```ts id="3g8jmq"
function refetchRealtimeSnapshots(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.accountDashboard(),
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.openOrders(),
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.positions(),
  });

  queryClient.invalidateQueries({
    queryKey: queryKeys.underlyings(),
  });
}
```

然后在连接重新打开时调用：

```ts id="z1d6rb"
source.onopen = () => {
  refetchRealtimeSnapshots(queryClient);
};
```

### 5. 明确 Jotai 和 Query Cache 的同步策略

如果 SSE 只更新 Jotai，但 Query Cache 没有更新，短时间内可能出现两套状态不一致。

可以根据业务选择：

```text id="biz27z"
SSE 后 setQueryData
SSE 后 invalidateQueries
或明确 Query 只做初始化快照，实时展示以 Jotai 为准
```

关键是团队内部需要统一约定。

比如账户 dashboard 可以直接 `setQueryData`：

```ts id="rnu2cr"
queryClient.setQueryData(queryKeys.accountDashboard(), nextDashboard);
```

订单和持仓这类涉及分页、筛选、排序的数据，可以选择失效：

```ts id="o06rkq"
queryClient.invalidateQueries({
  queryKey: queryKeys.openOrders(),
});
```

这样既能保持账户概览的即时一致，也能避免手动维护复杂列表缓存。

---

## 十五、总结：Web3 前端 SSE 模块的落地范式

一个真实 Web3 前端的实时通信模块，不只是建立一条长连接。

它需要同时处理：

```text id="qr0qv6"
公共流和私有流
market 和 instrument 维度
token 与 Telegram Authorization
连接建立和清理
订阅切换
重连和指数退避
高频行情削峰
Jotai 即时状态更新
React Query 完整快照与 polling 兜底
HTTP mutation 与实时状态回推的边界
```

这套架构可以总结成一句话：

```text id="2jn4xm"
SSE 负责服务端状态变化回推，
HTTP Mutation 负责提交用户操作，
Jotai 负责页面即时响应，
React Query / Polling 负责完整快照和最终一致性。
```

SSE 的价值不是替代所有请求，也不是证明它比 WebSocket 更先进。

它真正适合的是：前端主要订阅，服务端持续推送，而交易提交仍然通过标准 HTTP 链路完成的系统。

对于 Web3 交易前端来说，这种架构既能保证行情、订单、账户和持仓的实时性，也能通过 Query 和 polling 保留完整数据恢复能力。

真正的重点不在于“用了 SSE”，而在于如何围绕业务流管理连接、分发状态、控制渲染压力，并让 UI 始终回到服务端真实状态。

最后，可以用一段简化代码概括这套实时通信范式：

```ts id="pofvxn"
function Web3TradingRealtimeLayer() {
  // 1. 公共行情：跟随 underlying 切换
  useMarketStream(useSelectedUnderlying());

  // 2. 成交与订单簿：跟随 instrument 切换
  useTradeStream(useSelectedInstrument());

  // 3. 用户私有状态：跟随登录态切换
  const { isAuthenticated, accessToken } = useAuthState();

  useUserStream({
    enabled: isAuthenticated,
    accessToken,
  });

  // 4. 完整快照：作为初始化和兜底恢复
  useAccountDashboardQuery(isAuthenticated);
  useOpenOrdersQuery(isAuthenticated);
  usePositionsQuery(isAuthenticated);

  return null;
}
```

这段代码并不复杂，但它表达了 Web3 交易前端实时模块最重要的工程原则：

```text id="xtmh5x"
长连接只负责接收真实变化，
用户操作仍然通过 HTTP 提交，
即时状态交给 Jotai，
完整快照和兜底恢复交给 React Query。
```

---
