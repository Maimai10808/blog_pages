# Web3 前端钱包模块如何落地：从钱包连接、SIWE 登录到业务账户状态同步

在很多 Web3 入门项目里，钱包模块往往被简化成一句话：连接钱包，拿到地址，然后调用合约。

如果只是做一个 NFT Mint 页面、Token 查询页面，或者简单的转账功能，这种理解基本够用。因为在这些场景中，钱包地址本身就可以承担大部分身份和资产展示逻辑。

但一旦进入交易平台、期权平台、保证金账户系统这类复杂业务，钱包模块就不能只停留在 `connect wallet` 这一层。

原因很简单：钱包地址只能说明“用户当前连接了哪个链上身份”，但它无法直接描述用户在业务系统中的真实账户状态。

比如一个交易页面里经常会出现这些数据：

```text
Cash
Market Value
Available Margin
Frozen Margin
Open Orders
Positions
Withdraw Frozen
```

这些数据并不是 Wagmi 读取钱包地址后直接给出的结果，也不是简单调用 ERC-20 `balanceOf` 就能得到的链上余额。它们通常来自后端账户系统、撮合系统、风控模块、订单系统和链上结算结果的共同计算。

所以，在一个真实 Web3 交易项目中，钱包模块更合理的设计方式是拆成三层：

```text
钱包连接态
系统登录态
业务账户态
```

这三层状态有关联，但不能混在一起。只有把它们拆开，前端才能同时处理钱包连接、身份认证、交易账户、订单持仓和实时状态同步。

在代码层面，也可以先把这三层状态抽象出来：

```ts
type WalletStatus = "disconnected" | "connecting" | "connected";

type AuthStatus = "unauthenticated" | "authenticating" | "authenticated";

interface BusinessAccountState {
  cash: string;
  marketValue: string;
  availableMargin: string;
  frozenMargin: string;
  withdrawFrozen: string;
  openOrdersCount: number;
  positionsCount: number;
}
```

这里要注意，`WalletStatus`、`AuthStatus` 和 `BusinessAccountState` 不应该被混成一个状态。钱包连接成功，不代表系统登录成功；系统登录成功，也不代表业务账户数据已经加载完成。

---

## 一、为什么钱包连接不等于登录

很多人第一次做 Web3 登录时，会默认认为：

```text
连接钱包 = 用户已经登录
```

但在真实业务系统中，这个等号并不成立。

连接钱包只能说明浏览器当前连接到了一个钱包地址，并且前端可以读取当前地址、链 ID，或者请求用户签名。它解决的是“连接能力”问题。

但后端业务系统真正关心的是另一个问题：

> 当前请求是否来自这个钱包地址的真实控制者？

这就需要登录认证。

常见做法是 SIWE，也就是 Sign-In with Ethereum。它的核心流程是：

```text
后端生成 nonce
→ 前端构造登录消息
→ 用户用钱包签名
→ 后端验签
→ 建立 Session 或 Token
```

连接钱包只是拿到了地址。SIWE 登录才是把这个地址转换成系统可以信任的用户身份。

这也是为什么钱包连接态和登录态一定要分开。

在组件中，这种区别可以非常直观地体现出来：

```tsx
function WalletEntry() {
  const { address, isConnected } = useAccount();
  const { signIn, isSigningIn, isAuthenticated } = useSiweLogin();

  if (!isConnected) {
    return <ConnectWalletButton />;
  }

  if (!isAuthenticated) {
    return (
      <button disabled={isSigningIn} onClick={() => signIn()}>
        {isSigningIn ? "登录中..." : "使用钱包登录"}
      </button>
    );
  }

  return <span>已登录：{shortAddress(address)}</span>;
}
```

这里有两个判断：

```text
isConnected：是否连接钱包
isAuthenticated：是否完成系统登录
```

这两个状态不能合并。用户连接钱包后，仍然可能没有完成 SIWE 签名；用户断开钱包后，也需要考虑是否清理系统登录态和私有业务数据。

---

## 二、为什么登录态也不等于业务账户态

完成 SIWE 登录后，系统已经知道“这个用户是谁”。但这仍然不代表前端已经拿到了完整的交易账户状态。

在交易平台里，用户的钱包地址和业务账户之间通常还存在一层账户模型。

例如用户在钱包里有 USDC，并不代表这些 USDC 已经进入交易账户；用户在交易账户里有可用保证金，也不代表这些资金一定还停留在原生钱包余额里。

业务账户可能包含：

```text
现金余额
冻结保证金
可用保证金
持仓市值
挂单冻结
提现冻结
订单状态
持仓状态
```

这些都是平台业务语义，不是钱包连接库可以直接提供的数据。

因此，登录完成后，前端还需要通过后端账户接口获取业务账户数据，再把这些数据同步到页面状态中。

这就形成了第三层：业务账户态。

代码中可以把业务账户定义成独立类型，而不是直接挂在钱包状态上：

```ts
interface UserAccount {
  accountId: string;
  ownerAddress: `0x${string}`;
  cash: string;
  marketValue: string;
  availableMargin: string;
  frozenMargin: string;
  withdrawFrozen: string;
  updatedAt: number;
}
```

然后通过业务接口获取：

```ts
async function fetchUserAccount(): Promise<UserAccount> {
  const response = await fetch("/api/account/me", {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch user account");
  }

  return response.json();
}
```

这说明业务账户状态来自后端账户系统，而不是来自 `useAccount()`。

---

## 三、三层状态模型：钱包、登录、业务账户

一个比较清晰的 Web3 钱包模块，可以按照下面三层理解。

### 第一层：钱包连接态

这一层通常由 Reown AppKit 和 Wagmi 负责。

它主要管理：

```text
是否连接钱包
当前钱包地址
当前链 ID
网络是否支持
签名能力
断开连接
链切换
```

这一层回答的问题是：

> 用户当前连接了哪个钱包？在哪条链上？是否具备签名能力？

它不负责后端登录，也不负责交易账户数据。

### 第二层：系统登录态

这一层通常由 SIWE、Session、Token 或后端登录接口负责。

它主要管理：

```text
nonce
SIWE message
钱包签名
后端验签
access token
session
登录过期
退出登录
```

这一层回答的问题是：

> 后端业务系统是否信任当前用户身份？

用户连接钱包后，还需要通过 SIWE 签名来证明自己确实控制这个地址。验签成功后，后端才会建立系统会话。

### 第三层：业务账户态

这一层通常由后端账户接口、React Query、Jotai 和实时流共同维护。

它主要管理：

```text
cash
market value
available margin
frozen margin
orders
positions
withdraw frozen
```

这一层回答的问题是：

> 用户在交易系统里的真实资产、订单和持仓状态是什么？

它不是简单的钱包余额，而是经过业务系统计算后的账户状态。

如果把三层状态放到代码结构里，大致可以这样组织：

```text
src/features/wallet
  connect-wallet-button.tsx
  use-wallet-network.ts

src/features/auth
  use-siwe-login.ts
  auth.api.ts
  auth.store.ts

src/features/account
  account.api.ts
  account.queries.ts
  account.atoms.ts
  use-account-events.ts
```

这种目录结构能让边界更清楚：

```text
wallet 负责连接钱包
auth 负责系统登录
account 负责业务账户
```

不要把 SIWE 登录、账户接口、订单状态都塞进一个 `useWallet()` 里面，否则后面很容易变成一个难以维护的超级 Hook。

---

## 四、钱包连接层：AppKit 和 Wagmi 负责什么

在项目中，钱包连接能力由 Reown AppKit 和 Wagmi 承担。

可以简单理解为：

```text
AppKit 负责钱包连接交互
Wagmi 负责账户、链、签名和合约调用能力
```

AppKit 更偏向连接入口和交互体验，比如弹出钱包选择、连接钱包、断开连接等。

Wagmi 则更偏向 React 侧的 Web3 能力封装，比如：

```text
useAccount
useChainId
useSignTypedData
useDisconnect
```

这些能力让前端可以知道当前连接的钱包地址、当前链 ID，也可以在需要时发起签名或合约调用。

但这一层始终只处理“钱包侧状态”。

比如当前钱包连接到了某个地址，只能说明前端知道了这个地址。它还不能说明这个地址已经登录系统，也不能说明这个地址在交易平台里有多少可用保证金。

所以，钱包连接层的边界要非常清楚：

```text
钱包层负责连接和签名能力
不负责业务账户数据
不负责判断用户是否拥有平台账户
不负责计算订单和持仓
```

一个基础的钱包状态 Hook 可以这样写：

```ts
import { useAccount, useChainId, useDisconnect } from "wagmi";

const SUPPORTED_CHAIN_IDS = [1, 42161, 8453];

export function useWalletState() {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();

  const isSupportedChain = SUPPORTED_CHAIN_IDS.includes(chainId);

  return {
    address,
    chainId,
    isConnected,
    isConnecting,
    isSupportedChain,
    disconnectWallet: disconnect,
  };
}
```

这个 Hook 只返回钱包连接相关的数据，不返回业务账户，也不判断用户是否登录系统。

页面中可以这样使用：

```tsx
function WalletStatusBar() {
  const { address, chainId, isConnected, isSupportedChain, disconnectWallet } =
    useWalletState();

  if (!isConnected) {
    return <span>未连接钱包</span>;
  }

  return (
    <div>
      <span>{shortAddress(address)}</span>
      <span>Chain: {chainId}</span>

      {!isSupportedChain && <span>当前网络暂不支持</span>}

      <button onClick={() => disconnectWallet()}>断开钱包</button>
    </div>
  );
}
```

这里仍然只是在处理钱包连接态。即使 `isConnected` 为 `true`，也不能直接展示用户交易账户里的 `cash` 或 `available margin`。

---

## 五、登录层：SIWE 如何建立系统会话

当用户连接钱包后，项目会继续走 SIWE 登录流程。

这个流程可以理解为一次“用钱包完成的登录认证”。

大致过程是：

```text
前端请求 nonce
→ 后端返回一次性 nonce
→ 前端构造 SIWE Message
→ 用户钱包签名
→ 前端提交 message 和 signature
→ 后端验签
→ 后端返回 Session 或 access token
```

这里的关键点是：最终验签应该由后端完成。

前端负责发起签名，钱包负责生成签名，后端负责验证签名和 nonce 是否匹配。验签通过后，后端才会给前端发放访问业务接口所需的登录凭证。

这样做的好处是，后端不用盲目信任前端传来的钱包地址，而是通过签名确认：

```text
这个用户确实控制该地址
这个登录请求不是伪造的
这个 nonce 没有被重复使用
```

完成 SIWE 登录后，系统才真正进入“已登录”状态。

但需要注意，已登录也不代表已经拿到了业务账户数据。它只是说明用户已经有权限访问后端私有接口。

SIWE 的 API 可以先拆成三个函数：

```ts
interface NonceResponse {
  nonce: string;
}

interface VerifySiweRequest {
  message: string;
  signature: `0x${string}`;
}

interface VerifySiweResponse {
  accessToken: string;
  userId: string;
  address: `0x${string}`;
}

async function requestSiweNonce(
  address: `0x${string}`,
): Promise<NonceResponse> {
  const response = await fetch(`/api/auth/siwe/nonce?address=${address}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to request SIWE nonce");
  }

  return response.json();
}

async function verifySiweLogin(
  payload: VerifySiweRequest,
): Promise<VerifySiweResponse> {
  const response = await fetch("/api/auth/siwe/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to verify SIWE login");
  }

  return response.json();
}
```

前端 Hook 可以负责把 nonce、message、signature 串起来：

```ts
import { useAccount, useChainId, useSignMessage } from "wagmi";

export function useSiweLogin() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const signIn = async () => {
    if (!address) {
      throw new Error("Wallet is not connected");
    }

    const { nonce } = await requestSiweNonce(address);

    const message = [
      "Sign in to Web3 Option Trading",
      "",
      `Address: ${address}`,
      `Chain ID: ${chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${new Date().toISOString()}`,
    ].join("\n");

    const signature = await signMessageAsync({ message });

    return verifySiweLogin({
      message,
      signature,
    });
  };

  return {
    signIn,
  };
}
```

这段代码只是示意，但它表达了一个关键点：前端不是直接告诉后端“我是这个地址”，而是提交 `message + signature`，由后端完成身份验证。

---

## 六、业务账户层：为什么不能只读钱包余额

登录完成后，前端需要从后端账户接口拉取业务账户数据。

这一步非常重要，因为交易平台展示的账户资产不是简单的钱包余额。

比如页面上的 `available margin`，通常不是链上某个代币余额，而是业务系统计算出来的结果：

```text
available margin = cash - frozen margin
```

再比如总权益视图，可能会由多个字段共同组成：

```text
total balance = cash + market value + withdraw frozen
```

这些字段背后都有业务含义：

```text
cash：账户现金余额
market value：持仓市值
frozen margin：订单或风险控制冻结的保证金
available margin：当前可用于交易的保证金
withdraw frozen：提现流程中冻结的资金
```

这些信息并不能通过钱包地址直接读取。

即使用户钱包中有很多 USDC，也不代表这些资金已经进入交易账户；即使用户交易账户中有可用保证金，也不代表它等同于钱包里的原生余额。

所以，在交易平台里，钱包地址只是身份入口，真正支撑业务页面的是后端账户模型。

业务账户接口返回的数据可以是这样的：

```ts
interface AccountDashboard {
  accountId: string;
  cash: string;
  marketValue: string;
  totalBalance: string;
  availableMargin: string;
  frozenMargin: string;
  withdrawFrozen: string;
  openOrders: number;
  positions: number;
  updatedAt: number;
}
```

账户 API 可以独立封装：

```ts
async function fetchAccountDashboard(): Promise<AccountDashboard> {
  const response = await fetch("/api/account/dashboard", {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 401) {
    throw new Error("Unauthorized");
  }

  if (!response.ok) {
    throw new Error("Failed to fetch account dashboard");
  }

  return response.json();
}
```

页面展示时，应该展示业务账户接口返回的值，而不是直接展示钱包余额：

```tsx
function AccountOverview() {
  const { data, isLoading } = useAccountDashboardQuery();

  if (isLoading) {
    return <div>账户数据加载中...</div>;
  }

  if (!data) {
    return <div>暂无账户数据</div>;
  }

  return (
    <section>
      <div>Cash: {data.cash}</div>
      <div>Market Value: {data.marketValue}</div>
      <div>Available Margin: {data.availableMargin}</div>
      <div>Frozen Margin: {data.frozenMargin}</div>
      <div>Withdraw Frozen: {data.withdrawFrozen}</div>
    </section>
  );
}
```

这段代码的重点是：交易页面里的资产视图来自 `account dashboard`，而不是来自钱包连接状态。

---

## 七、React Query：负责账户数据的完整快照

业务账户数据通常通过 React Query 拉取。

它适合做几件事：

```text
请求后端账户接口
管理 loading / error / success 状态
缓存接口返回结果
在操作后重新请求
在页面重新进入时恢复数据
```

比如用户完成 SIWE 登录后，前端可以通过账户查询接口拉取业务账户：

```text
有效 Session
→ 请求账户接口
→ 获取 cash、margin、position 等数据
→ 写入页面状态
```

React Query 在这里扮演的是“完整快照管理者”。

它保证页面可以在初始化、刷新、重新进入时，拿到一份来自服务端的完整账户数据。

但交易系统只靠 React Query 还不够。

因为账户、订单和持仓变化往往是实时发生的。如果每次都等待页面重新请求，用户看到的状态就会有明显延迟。

这就需要 Jotai 和 SSE 参与进来。

账户 Query 可以这样组织：

```ts
import { useQuery } from "@tanstack/react-query";

export const accountQueryKeys = {
  all: ["account"] as const,
  dashboard: () => [...accountQueryKeys.all, "dashboard"] as const,
};

export function useAccountDashboardQuery(enabled = true) {
  return useQuery({
    queryKey: accountQueryKeys.dashboard(),
    queryFn: fetchAccountDashboard,
    enabled,
    staleTime: 10_000,
    retry: 1,
  });
}
```

登录后再开启账户查询：

```tsx
function AccountContainer() {
  const { isAuthenticated } = useAuthState();

  const accountQuery = useAccountDashboardQuery(isAuthenticated);

  if (!isAuthenticated) {
    return <div>请先连接钱包并登录</div>;
  }

  if (accountQuery.isLoading) {
    return <div>账户加载中...</div>;
  }

  return <AccountOverview data={accountQuery.data} />;
}
```

这里的 `enabled` 很重要。只有系统登录态有效时，才应该请求私有账户接口。

---

## 八、Jotai：负责前端即时业务状态

在交易页面中，有很多数据需要非常快地响应变化。

例如：

```text
订单状态从 Open 变成 Partially Filled
某个持仓数量发生变化
账户可用保证金被重新计算
某个期权相关数据更新
```

这些变化往往不是整页刷新，而是某一条记录被更新。

这类场景很适合使用 Jotai 保存局部即时状态，比如：

```text
userAccountAtom：账户快照
positionsMapAtom：持仓 Map
ordersMapAtom：订单 Map
optionsMapAtom：期权数据 Map
```

为什么用 Map 类结构？

因为交易系统里的更新通常是按 ID 或 symbol 增量发生的。

例如后端推送一条订单更新，前端并不一定需要重新请求完整订单列表，而是可以先在本地定位到对应订单并更新状态：

```text
收到订单事件
→ 根据 order id 找到本地订单
→ 更新订单状态
→ UI 立即变化
```

Jotai 在这里不是替代后端数据，而是让页面能够更快响应实时事件。

可以这样理解：

```text
React Query 管完整数据
Jotai 管即时快照
SSE 负责推送变化
```

Jotai 状态可以这样定义：

```ts
import { atom } from "jotai";

interface OrderItem {
  orderId: string;
  status: "Open" | "PartiallyFilled" | "Filled" | "Cancelled" | "Rejected";
  price: string;
  amount: string;
  filledAmount: string;
  updatedAt: number;
}

interface PositionItem {
  positionId: string;
  symbol: string;
  size: string;
  marketValue: string;
  updatedAt: number;
}

export const userAccountAtom = atom<AccountDashboard | null>(null);

export const ordersMapAtom = atom<Record<string, OrderItem>>({});

export const positionsMapAtom = atom<Record<string, PositionItem>>({});
```

当 React Query 首次拉到账户快照时，可以同步写入 Jotai：

```ts
function useSyncAccountSnapshot() {
  const { data } = useAccountDashboardQuery();
  const setUserAccount = useSetAtom(userAccountAtom);

  useEffect(() => {
    if (data) {
      setUserAccount(data);
    }
  }, [data, setUserAccount]);
}
```

这样页面可以先通过 Query 拿完整快照，再通过 Jotai 响应实时变化。

---

## 九、SSE：让账户、订单和持仓跟随真实业务变化

对于交易系统来说，最关键的问题之一是：交易提交后，页面状态如何更新？

很多普通前端会在 mutation 成功后直接 `setState`，比如把订单标记为成功，或者把余额手动减掉。

但在交易系统中，这样做很危险。

因为用户提交订单后，后续可能经历很多状态：

```text
订单被接收
订单进入订单簿
订单部分成交
订单完全成交
订单被取消
订单被拒绝
订单过期
持仓变化
保证金变化
账户权益变化
```

这些状态不是前端自己能判断的，而是由后端、撮合系统、风控系统和链上确认共同决定。

所以，交易系统更合理的做法是：

```text
mutation 负责提交动作
SSE 负责回推真实状态
Jotai 负责即时更新 UI
React Query 负责重新拉取完整快照
```

SSE 可以建立一条用户级实时连接，让服务端主动推送：

```text
账户 dashboard 更新
订单 open_order 更新
持仓 position 更新
用户相关 instrument 更新
```

这样，前端不需要不断轮询，也不需要凭空猜测订单状态。

页面展示的账户、订单和持仓，最终应该以后端回推和服务端查询结果为准。

可以先定义 SSE 事件类型：

```ts
type AccountEvent =
  | {
      type: "account.updated";
      payload: AccountDashboard;
    }
  | {
      type: "order.updated";
      payload: OrderItem;
    }
  | {
      type: "position.updated";
      payload: PositionItem;
    };
```

然后建立 SSE Hook：

```ts
function useAccountEvents(enabled: boolean) {
  const queryClient = useQueryClient();

  const setUserAccount = useSetAtom(userAccountAtom);
  const setOrdersMap = useSetAtom(ordersMapAtom);
  const setPositionsMap = useSetAtom(positionsMapAtom);

  useEffect(() => {
    if (!enabled) return;

    const eventSource = new EventSource("/api/events/account", {
      withCredentials: true,
    });

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data) as AccountEvent;

      if (message.type === "account.updated") {
        setUserAccount(message.payload);

        queryClient.setQueryData(accountQueryKeys.dashboard(), message.payload);
      }

      if (message.type === "order.updated") {
        setOrdersMap((prev) => ({
          ...prev,
          [message.payload.orderId]: message.payload,
        }));

        queryClient.invalidateQueries({
          queryKey: ["orders"],
        });
      }

      if (message.type === "position.updated") {
        setPositionsMap((prev) => ({
          ...prev,
          [message.payload.positionId]: message.payload,
        }));

        queryClient.invalidateQueries({
          queryKey: ["positions"],
        });
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [enabled, queryClient, setUserAccount, setOrdersMap, setPositionsMap]);
}
```

这段逻辑体现了一个比较稳妥的策略：

```text
账户 dashboard 更新：直接写入 Jotai，并同步 Query Cache
订单和持仓更新：先写入本地 Map，再让相关 Query 失效
```

这样既有即时性，也能让服务端数据在后续重新拉取中回到最终一致状态。

---

## 十、为什么有 SSE 还需要 React Query

既然 SSE 已经能实时推送变化，为什么还要 React Query？

因为 SSE 和 React Query 解决的是不同问题。

SSE 适合处理实时增量变化：

```text
某条订单更新了
某个持仓变化了
账户余额发生变化了
```

但它不擅长提供完整可靠的初始快照，也不适合独自承担断线恢复后的状态校正。

React Query 则擅长处理完整数据：

```text
首次进入页面时拉取完整账户
刷新页面后恢复数据
网络重连后重新请求
mutation 后刷新相关查询
缓存分页列表
处理错误和重试
```

所以二者不是二选一，而是组合使用：

```text
React Query：负责完整快照和最终一致性
SSE：负责实时增量更新
Jotai：负责把增量变化快速反映到 UI
```

这种组合非常适合交易类 Web3 产品。

只靠 React Query，实时性不足。

只靠 SSE，断线和丢事件后难以恢复完整状态。

只靠本地 Store，又容易和服务端事实脱节。

三者组合，才能同时兼顾实时体验和数据一致性。

在代码层面，React Query 可以负责页面初始化：

```ts
function useBootstrapAccountState(isAuthenticated: boolean) {
  const accountQuery = useAccountDashboardQuery(isAuthenticated);

  useSyncAccountSnapshot();

  useAccountEvents(isAuthenticated);

  return accountQuery;
}
```

页面中只需要组合使用：

```tsx
function TradingLayout() {
  const { isAuthenticated } = useAuthState();

  const accountQuery = useBootstrapAccountState(isAuthenticated);

  if (!isAuthenticated) {
    return <LoginRequired />;
  }

  if (accountQuery.isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <AccountOverview />
      <OpenOrders />
      <Positions />
    </>
  );
}
```

这样，初始化快照、实时事件和本地展示状态可以形成一条比较完整的链路。

---

## 十一、一次完整的钱包到账户同步链路

把前面的内容串起来，一次完整的钱包到账户状态同步链路大概是：

```text
用户连接钱包
→ AppKit / Wagmi 获取 address、chainId 和签名能力
→ 前端校验当前链是否支持
→ 请求 SIWE nonce
→ 用户用钱包签署 SIWE Message
→ 后端验签并建立 Session
→ 前端获得 access token
→ React Query 拉取业务账户数据
→ 写入 userAccountAtom
→ 页面展示 cash、market value、available margin
→ 用户发起交易、充值或提现
→ 后端、撮合系统或链上状态发生变化
→ SSE 推送账户、订单、持仓更新
→ Jotai 即时更新页面
→ React Query invalidate 或 refetch
→ UI 回到服务端真实状态
```

这条链路里最重要的一句话是：

> 钱包提供身份和签名能力，业务账户才是交易页面的数据主体。

如果把钱包余额直接当成交易账户余额，系统就很难处理保证金、冻结资金、挂单、持仓市值、提现中资金等复杂状态。

可以用一个组合 Hook 表达完整链路：

```ts
export function useWalletAccountFlow() {
  const wallet = useWalletState();
  const auth = useAuthState();

  const accountQuery = useAccountDashboardQuery(
    wallet.isConnected && auth.isAuthenticated,
  );

  useSyncAccountSnapshot();

  useAccountEvents(wallet.isConnected && auth.isAuthenticated);

  return {
    wallet,
    auth,
    account: accountQuery.data,
    isReady:
      wallet.isConnected &&
      wallet.isSupportedChain &&
      auth.isAuthenticated &&
      accountQuery.isSuccess,
  };
}
```

这里的 `isReady` 不是只看钱包是否连接，而是同时看：

```text
钱包已连接
网络受支持
系统已登录
账户数据已加载成功
```

这比简单判断 `isConnected` 更符合交易产品的真实需求。

---

## 十二、交易和出入金后，为什么不能只靠 mutation 返回

在交易、充值、提现这类操作中，mutation 返回成功通常只代表一件事：

```text
请求已经被服务端接收
```

它不一定代表：

```text
订单已经成交
资金已经到账
持仓已经变化
保证金已经释放
链上已经确认
```

所以前端不能在 mutation success 后直接假设业务完成。

更好的方式是把 mutation 看作“动作入口”，把 SSE 和 Query 看作“状态来源”。

例如：

```text
用户提交订单
→ mutation 成功
→ 显示订单已提交
→ 等待 SSE 推送订单状态
→ 更新订单列表和持仓
→ 必要时重新拉取账户数据
```

充值和提现也是类似。

提交成功只是流程开始，真正的到账、冻结、释放或确认，需要依赖后端状态和链上状态同步。

这也是交易前端和普通表单前端最大的区别之一。

普通表单只关心提交结果。

交易系统还要关心提交之后漫长的状态流转。

代码中可以这样处理 mutation：

```ts
interface DepositRequest {
  amount: string;
  txHash?: `0x${string}`;
}

async function submitDeposit(payload: DepositRequest) {
  const response = await fetch("/api/deposit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to submit deposit request");
  }

  return response.json();
}
```

React Query mutation 只负责提交动作：

```ts
function useSubmitDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitDeposit,
    onSuccess: () => {
      // 这里不能直接认为资金已到账
      // 只能说明充值请求已经提交
      queryClient.invalidateQueries({
        queryKey: accountQueryKeys.dashboard(),
      });
    },
  });
}
```

UI 提示也要区分：

```tsx
function DepositButton() {
  const depositMutation = useSubmitDeposit();

  return (
    <button
      disabled={depositMutation.isPending}
      onClick={() => depositMutation.mutate({ amount: "100" })}
    >
      {depositMutation.isPending ? "提交中..." : "提交充值请求"}
    </button>
  );
}
```

提交成功后的文案更适合写成：

```text
充值请求已提交，到账状态将根据链上确认和账户系统同步更新。
```

而不是直接写：

```text
充值成功。
```

这种细节对交易类产品非常重要，因为它会影响用户对资金状态的理解。

---

## 十三、这套设计的工程价值

这套钱包模块设计的价值，主要体现在几个方面。

### 1. 状态边界清楚

钱包连接、系统登录、业务账户被拆成三层后，每一层的职责都很明确：

```text
钱包层：连接、地址、链、签名能力
登录层：身份认证、Session、Token
业务层：账户、订单、持仓、保证金
```

这样可以避免很多常见问题，比如把连接钱包误认为登录成功，或者把钱包余额误认为交易账户余额。

### 2. 支持复杂交易账户

业务账户模型可以支持更多复杂场景：

```text
保证金计算
冻结资金
订单簿挂单
部分成交
组合持仓
风险控制
提现冻结
账户权益变化
```

这些能力都无法只靠钱包连接库完成。

### 3. 降低钱包交互频率

如果每个业务请求都要求钱包签名，用户体验会非常差。

通过 SIWE 建立系统 Session 后，普通私有请求可以通过 Token 或请求签名完成认证。钱包签名只在登录、授权或关键交易场景中出现。

这更适合交易平台这类高频交互产品。

### 4. 提升实时体验

SSE 可以让订单、持仓和账户变化及时回到页面。

Jotai 可以让这些变化快速反映到 UI。

React Query 可以在关键节点重新拉取完整数据，保证最终一致性。

这比单纯靠轮询或本地 setState 更稳定。

### 5. 更容易维护和扩展

当状态边界清晰后，后续扩展也更容易。

比如新增提现冻结字段、新增订单状态、新增持仓类型、新增风险指标，都可以放在业务账户层，而不用污染钱包连接逻辑。

如果用一个最小化的数据流来概括，可以是这样：

```ts
async function bootstrapAfterWalletConnected(address: `0x${string}`) {
  // 1. 钱包地址只是入口
  const nonce = await requestSiweNonce(address);

  // 2. SIWE 登录建立系统身份
  const authResult = await signAndVerifySiwe(nonce);

  // 3. 登录成功后再请求业务账户
  const account = await fetchAccountDashboard();

  // 4. 业务账户才是交易页面展示主体
  return {
    auth: authResult,
    account,
  };
}
```

这段代码背后的核心原则是：

```text
先连接钱包，再完成登录，最后加载业务账户。
```

这三个步骤不能跳过，也不能混为一谈。

---

## 十四、可以继续优化的方向

在实际项目中，这类架构还可以继续打磨。

### 1. 更明确地区分 disconnect 和 logout

断开钱包连接和退出系统登录不是一回事。

更清晰的设计可以拆成：

```text
disconnectWallet：只断开钱包
signOutSession：只退出系统会话
logoutAndClearPrivateState：退出登录并清理私有状态
```

这样可以避免用户断开钱包后，页面仍短暂保留旧业务账户数据。

代码上可以这样区分：

```ts
async function signOutSession() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

function useLogoutAndClearState() {
  const queryClient = useQueryClient();
  const setUserAccount = useSetAtom(userAccountAtom);
  const setOrdersMap = useSetAtom(ordersMapAtom);
  const setPositionsMap = useSetAtom(positionsMapAtom);

  return async function logoutAndClearPrivateState() {
    await signOutSession();

    setUserAccount(null);
    setOrdersMap({});
    setPositionsMap({});

    queryClient.removeQueries({ queryKey: ["account"] });
    queryClient.removeQueries({ queryKey: ["orders"] });
    queryClient.removeQueries({ queryKey: ["positions"] });
  };
}
```

这类函数的意义在于：退出登录时要清掉私有数据，而不是只删除一个 token。

### 2. 统一登录态判断

前端本地判断“是否登录”时，不应该只检查本地是否存在访问数据，还要考虑 token 是否过期、session 是否有效。

否则可能出现一个短暂状态：本地看起来已登录，但真实 session 已经过期。

可以通过一个 `me` 接口来确认当前登录态：

```ts
async function fetchCurrentSession() {
  const response = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }

  return response.json();
}
```

对应的 Query：

```ts
function useSessionQuery() {
  return useQuery({
    queryKey: ["auth", "session"],
    queryFn: fetchCurrentSession,
    retry: false,
  });
}
```

这样系统登录态就不只是前端本地猜测，而是有服务端校验依据。

### 3. 登出时清理所有私有状态

退出登录时，除了清理 token 和部分 Query Cache，也应该考虑清理：

```text
账户状态
订单 Map
持仓 Map
用户私有缓存
交易页面选择状态
```

这样可以降低切换账户时看到旧数据的风险。

尤其是在交易系统里，旧账户数据短暂残留是非常危险的体验问题。比如用户切换钱包后，还看到上一个账户的保证金或持仓，很容易造成误解。

### 4. 统一 SSE 和 Query Cache

如果 SSE 更新了 Jotai，但没有同步更新 React Query Cache，二者可能出现短暂不一致。

可以考虑在 SSE 回调中：

```text
更新 Jotai
同时 setQueryData
或 invalidate 对应 Query
```

也可以明确规定：Query 只负责初始化快照，实时展示完全以 Jotai 为准。

关键是团队内部要有统一约定。

例如账户 dashboard 可以直接同步 Query Cache：

```ts
queryClient.setQueryData(accountQueryKeys.dashboard(), nextAccountDashboard);
```

而订单列表如果涉及分页、筛选和排序，可以只做失效：

```ts
queryClient.invalidateQueries({
  queryKey: ["orders"],
});
```

这样可以避免把复杂分页列表在前端手动拼错。

### 5. 增强 SSE 断线恢复

SSE 断线重连后，最好重新拉取账户、订单和持仓完整快照，弥补断线期间可能丢失的事件。

这对交易系统尤其重要，因为订单状态变化可能非常快。

可以在 `onerror` 或重连成功后触发全量刷新：

```ts
function refetchPrivateSnapshots(queryClient: QueryClient) {
  queryClient.invalidateQueries({
    queryKey: accountQueryKeys.dashboard(),
  });

  queryClient.invalidateQueries({
    queryKey: ["orders"],
  });

  queryClient.invalidateQueries({
    queryKey: ["positions"],
  });
}
```

然后在 SSE 异常时处理：

```ts
eventSource.onerror = () => {
  eventSource.close();

  refetchPrivateSnapshots(queryClient);
};
```

这样可以在连接异常后重新校正页面状态，减少丢事件带来的状态偏差。

---

## 十五、总结：Web3 钱包模块的落地范式

一个真实 Web3 交易产品的钱包模块，不应该只围绕 `connect wallet` 展开。

更合理的设计是：

```text
Reown AppKit / Wagmi
负责钱包连接、链状态和签名能力

SIWE / Session
负责证明钱包所有权并建立系统登录态

React Query
负责拉取和缓存业务账户完整数据

Jotai
负责账户、订单和持仓的即时展示状态

SSE
负责持续回推后端、撮合和链路中的真实变化
```

钱包连接态解决的是：

```text
当前连接了哪个钱包
```

系统登录态解决的是：

```text
后端是否信任这个身份
```

业务账户态解决的是：

```text
这个用户在交易系统里真实拥有什么
```

这三层状态拆清楚之后，前端才能稳定处理交易、充值、提现、持仓、订单和保证金等复杂业务。

对于简单 DApp，可以只用 Wagmi 获取地址、余额并调用合约。

但只要产品涉及私有接口、交易账户、撮合系统、实时订单、保证金账户或复杂资产状态，就需要把钱包身份和业务账户模型拆开设计。

Web3 前端的难点，不只是连接钱包，而是把钱包、登录、业务账户和实时状态组织成一条清晰、稳定、可维护的工程链路。

最后，可以用一段最小化伪代码概括这套钱包模块的落地范式：

```ts
async function enterTradingApp() {
  // 1. 连接钱包，拿到地址和链信息
  const wallet = await connectWallet();

  // 2. 检查网络是否支持
  assertSupportedChain(wallet.chainId);

  // 3. 通过 SIWE 证明钱包所有权
  const session = await siweLogin(wallet.address);

  // 4. 登录后拉取业务账户完整快照
  const account = await fetchAccountDashboard();

  // 5. 建立实时连接，接收账户、订单、持仓变化
  connectAccountEventStream();

  return {
    wallet,
    session,
    account,
  };
}
```

这段伪代码不是为了覆盖所有实现细节，而是为了强调一个核心原则：

```text
钱包只是入口，登录建立信任，业务账户才是交易页面真正的数据主体。
```

---
