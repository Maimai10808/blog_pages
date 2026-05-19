# Web3 前端如何落地 SIWE 钱包登录：从钱包连接到后端 Session

在 Web3 应用里，很多人一开始会把“连接钱包”和“登录”混在一起。实际上这两个动作不是一回事。

连接钱包只是让前端拿到了当前钱包地址，比如：

```ts
const { isConnected, address } = useAppKitAccount();
```

这只能说明用户当前浏览器连接了一个钱包地址，但它并不能证明这个用户已经完成了业务系统的登录，也不能让后端信任这个请求。

真正的登录需要解决的是另一个问题：

- 这个用户是否真的控制这个钱包地址？
- 这个登录请求是否是当前这一次发起的？
- 这个签名是否可以被后端验证？
- 验证通过之后，系统如何生成自己的登录态？

这就是 SIWE 要解决的问题。

SIWE，全称是 Sign-In with Ethereum。它的本质不是“连接钱包”，而是“用钱包签名完成登录”。

SIWE 的落地链路大概是这样：

```txt
用户连接钱包
  -> 前端向后端请求 nonce
  -> 前端组装 SIWE message
  -> 用户钱包签名 message
  -> 前端把 message + signature 发给后端
  -> 后端验签
  -> 后端返回 access token / expire / 用户信息
  -> 前端保存 session
  -> 后续访问私有页面和接口
```

也就是说，SIWE 在整个系统里的位置更接近传统登录中的“账号密码校验”，只是这里不再输入密码，而是使用钱包私钥签名。

---

## 一、为什么不能只用钱包连接当作登录？

很多 Web3 前端新手会有一个误区：既然钱包连接之后我已经拿到了地址，那是不是就可以认为用户已经登录了？

不可以。

因为钱包连接只是前端本地状态。它更多是一个浏览器和钱包插件之间的连接结果。后端并不知道这个地址是不是用户本人控制的，也不知道这次请求是否可信。

比如前端可以直接伪造一个地址：

```ts
const address = "0x123...";
```

如果后端只相信前端传来的地址，那任何人都可以冒充任何钱包地址。

所以后端必须要求用户签名一段消息，再通过签名恢复地址，确认签名者确实是这个地址的私钥持有人。

这就是 SIWE 登录的基本安全模型。

---

## 二、真实项目中的 SIWE 分层设计

真实项目里，SIWE 不是写在某一个组件里的，而是拆成了几层。

第一层是钱包初始化层，负责配置 Reown AppKit、wagmi、支持的链和钱包弹窗。

第二层是 SIWE 配置层，负责定义登录流程：怎么拿 nonce、怎么生成 message、怎么提交签名、怎么读取 session、怎么登出。

第三层是 auth service 层，负责真正和后端 API 交互，并管理本地 session。

第四层是页面保护层，比如 Auth 组件，用来判断当前用户是否已经登录。

大概可以理解成：

```txt
wallet config
  -> 初始化钱包和 SIWE 能力
siwe config
  -> 定义 SIWE 登录流程
auth service
  -> 调用后端登录接口，保存和清理 session
Auth component
  -> 判断私有页面是否允许访问
```

这种拆分方式的好处是：钱包连接、签名登录、后端会话、页面权限不会混在一个组件里。后期维护时，也更容易定位问题。

---

## 三、钱包层：把 SIWE 接入 Reown AppKit

项目里通过 `createAppKit` 初始化钱包连接能力：

```ts
export const appKitModal = createAppKit({
  adapters: [wagmiAdapter],
  networks: [...chains],
  allowUnsupportedChain: false,
  defaultNetwork: chains[0],
  siweConfig,
  metadata,
  projectId,
  features: {
    swaps: false,
    onramp: false,
    email: false,
    socials: false,
  },
});
```

这里最关键的是：

```ts
siweConfig;
```

也就是说，Reown AppKit 不只是负责弹出钱包连接窗口，它还会按照 `siweConfig` 里面定义的规则去完成 SIWE 登录。

在 Web3 前端里，这种方式比较适合业务项目。因为 AppKit 负责钱包连接体验，SIWE 配置负责登录协议，业务代码只需要关心登录之后的 session 和账户状态。

---

## 四、SIWE 配置层：定义登录流程

核心配置在这里：

```ts
export const siweConfig = createSIWEConfig({
  signOutOnAccountChange: true,
  signOutOnNetworkChange: true,
  signOutOnDisconnect: false,
  getMessageParams: async () => ({
    domain: typeof window !== "undefined" ? window.location.host : "",
    uri: typeof window !== "undefined" ? window.location.origin : "",
    chains: chains.map((chain) => chain.id),
    statement: "Please sign with your account",
  }),
  createMessage: ({ address, ...args }) => formatMessage(args, address),
  getNonce: async (address) => {
    if (!address) throw new Error("Address is required");
    const nonce = await getCsrfToken(address);
    if (!nonce) {
      throw new Error("Failed to get nonce!");
    }
    return nonce;
  },
  getSession: async () => {
    await sleep(1000);
    const session = getSession();
    if (!session) {
      return null;
    }
    const { address, chain_id } = session;
    return { address, chainId: chain_id };
  },
  verifyMessage: async ({ message, signature }) => {
    const { deviceUuid } = getDeviceInfo();
    return Boolean(
      await signIn({
        message,
        signature,
        device_uuid: deviceUuid,
      }),
    );
  },
  signOut: async () => {
    try {
      await signOut();
      return true;
    } catch {
      return false;
    }
  },
});
```

这个配置其实就是在告诉 Reown：

- 登录前怎么获取 nonce。
- 签名消息怎么生成。
- 用户签名之后怎么交给后端验证。
- 登录成功后怎么读取 session。
- 登出时怎么清理状态。
- 切换账号或网络时要不要自动登出。

其中最重要的是三个函数：

```ts
getNonce;
createMessage;
verifyMessage;
```

这三个函数构成了 SIWE 登录的核心闭环。

---

## 五、第一步：向后端请求 nonce

登录前，前端会根据钱包地址向后端请求 nonce：

```ts
getNonce: async (address) => {
  if (!address) throw new Error("Address is required");
  const nonce = await getCsrfToken(address);
  if (!nonce) {
    throw new Error("Failed to get nonce!");
  }
  return nonce;
};
```

对应的 auth service：

```ts
export async function getCsrfToken(address: string) {
  try {
    const res = await getNonce({ address });
    if (res.code === 0) {
      return res.data.nonce;
    }
    return null;
  } catch (error: any) {
    toast.error(error.message);
    return null;
  }
}
```

nonce 的作用是防重放攻击。

如果没有 nonce，用户以前签过的一段登录消息，可能被别人拿去重复提交。后端如果只验证签名正确，就可能误以为这是一次新的登录请求。

加入 nonce 之后，每次登录挑战都是一次性的。后端可以记录 nonce 是否已经使用、是否过期。这样旧签名就不能重复登录。

所以 SIWE 登录里，nonce 不是可选项，而是安全设计的核心。

---

## 六、第二步：构造 SIWE message

拿到 nonce 后，前端会构造需要签名的消息：

```ts
getMessageParams: async () => ({
  domain: typeof window !== "undefined" ? window.location.host : "",
  uri: typeof window !== "undefined" ? window.location.origin : "",
  chains: chains.map((chain) => chain.id),
  statement: "Please sign with your account",
});
```

这些字段的作用分别是：

- `domain`：当前登录的域名。
- `uri`：当前应用地址。
- `chains`：允许登录的链 ID。
- `statement`：给用户看的签名说明。

然后通过：

```ts
createMessage: ({ address, ...args }) => formatMessage(args, address);
```

把钱包地址和登录参数格式化成标准 SIWE message。

用户在钱包里看到的不是一个随便的字符串，而是一段结构化登录声明。

它大概表达的是：

- 某个域名希望你使用这个 Ethereum 地址登录。
- 本次登录绑定某个 URI。
- 本次登录使用某个 chainId。
- 本次登录包含一次性 nonce。

这样做的好处是，用户签名的内容是明确的，后端验证的内容也是结构化的。

---

## 七、第三步：钱包签名，然后交给后端验证

用户确认签名之后，项目会走到：

```ts
verifyMessage: async ({ message, signature }) => {
  const { deviceUuid } = getDeviceInfo();
  return Boolean(
    await signIn({
      message,
      signature,
      device_uuid: deviceUuid,
    }),
  );
};
```

这里函数名叫 `verifyMessage`，但在这个项目里，真正的验签不是前端完成的，而是后端完成的。

前端只负责把：

- `message`
- `signature`
- `device_uuid`

提交给后端。

后端需要做的事情通常包括：

1. 解析 SIWE message。
2. 检查 domain 是否正确。
3. 检查 chainId 是否允许。
4. 检查 nonce 是否存在、是否过期、是否已使用。
5. 根据 signature 恢复签名地址。
6. 对比恢复地址和 message 中的 address 是否一致。
7. 验证通过后，生成系统自己的登录态。

这一步非常关键。

因为签名只证明用户控制钱包地址，而业务系统最终还需要自己的 session。比如 access token、过期时间、用户 ID、设备信息等。

---

## 八、第四步：保存 session

项目里的登录函数是：

```ts
export async function signIn(body: ApiLoginReqBody) {
  try {
    const res = await login(body);
    if (res.code === 0) {
      queryClient.invalidateQueries({ queryKey: ["user"] });
      saveSession(res.data);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
```

这里的 `login(body)` 就是后端登录接口。后端验签成功后，会返回访问数据。

前端通过：

```ts
saveSession(res.data);
```

保存 session。

这个 session 一般包括：

- access token。
- expire。
- address。
- chain_id。
- sign secret。
- 其他后端认证元数据。

后续用户访问账户页面、交易接口、订单接口、充值提现接口时，前端就不需要每次都让钱包签名登录，而是使用本地 session 作为登录态。

这和传统 Web2 登录很像。

区别只是：

```txt
Web2 登录：账号密码 -> 后端返回 token
Web3 登录：钱包签名 -> 后端返回 token
```

---

## 九、第五步：读取和校验 session

项目中读取 session 的函数是：

```ts
export function getSession() {
  const user = getLocalStorage<ApiAccessData>({
    key: LocalStorageKey.User,
  });
  if (!user) return null;

  const currentTime = getUnixTime(new Date());
  const expireTime = Number(user.expire);
  if (expireTime <= currentTime) {
    removeSession();
    return null;
  }

  return user;
}
```

这里做了两件事：

第一，读取本地保存的用户访问数据。

第二，检查是否过期。

如果 session 已经过期，就直接移除：

```ts
removeSession();
```

这一步很重要。因为 Web3 项目里经常会有多个状态来源：

- 钱包连接状态。
- 本地 token 状态。
- 服务端登录状态。
- React Query 缓存。
- Jotai 全局状态。

如果 session 过期后不清理，页面可能继续展示旧账户数据，甚至导致用户误操作。

所以 session 校验不能只看 localStorage 有没有数据，还要检查 expire。

---

## 十、页面保护：Auth 组件的作用

项目里的页面保护组件大概是这样：

```tsx
export function Auth({ children }: Props) {
  const router = useRouter();
  if (!getSession()) {
    router.replace("/");
  }
  return children;
}
```

比如账户页面：

```tsx
export function Content() {
  const userAccount = useAtomValue(userAccountAtom);
  return (
    <Auth>
      <DashboardWarp>
        <h1>Account</h1>
        <span>{truncateAddress(userAccount?.address)}</span>
      </DashboardWarp>
    </Auth>
  );
}
```

这个逻辑表示：如果没有有效 session，就跳回首页。

也就是说，进入业务页面不只看钱包有没有连接，而是看有没有经过 SIWE 登录后生成的系统 session。

这是一个很重要的边界。

```txt
钱包连接是 Web3 连接层。
SIWE session 是业务认证层。
```

这两层应该分开。

---

## 十一、为什么切换账号和网络要自动登出？

在 SIWE 配置里有这三项：

```ts
signOutOnAccountChange: true;
signOutOnNetworkChange: true;
signOutOnDisconnect: false;
```

意思是：

- 切换钱包账号时，自动登出。
- 切换网络时，自动登出。
- 断开钱包时，不一定登出。

### 为什么切换账号要登出？

因为当前 session 是绑定某个钱包地址的。比如用户用 `0xAAA` 登录后，系统返回的是 `0xAAA` 的访问令牌。如果用户切换到 `0xBBB`，还继续使用 `0xAAA` 的 session，就会产生身份错乱。

### 为什么切换网络要登出？

因为业务系统可能和 chainId 绑定。不同链上的合约地址、账户体系、签名 domain、操作模块都可能不同。切换网络后继续复用旧 session，也可能导致错误请求。

### 为什么断开钱包不一定登出？

这是一个产品选择。有些应用希望断开钱包后也保留登录态，有些应用则希望立即退出。

这里设置为：

```ts
signOutOnDisconnect: false;
```

表示断开钱包不强制退出登录。

但在交易、充值、提现等强交互场景下，仍然应该要求钱包重新连接后才能继续操作。

---

## 十二、登出时要清理哪些状态？

项目里的登出逻辑不是只删除 token，而是做了完整清理：

```ts
export function handleLogout() {
  removeSession();

  const positionsMap = getAtomValue(positionsMapAtom);
  setAtomValue(positionsMapAtom, positionsMap.clear());

  queryClient.removeQueries({ queryKey: ["trade"], type: "all" });
  queryClient.removeQueries({ queryKey: ["user"], type: "all" });
  queryClient.removeQueries({ queryKey: ["private"], type: "all" });
}
```

这里清理了三类数据：

1. 本地 session。
2. Jotai 中的私有交易状态。
3. React Query 中的用户、交易、私有接口缓存。

这一步在交易类 Web3 产品里非常重要。

因为用户登出后，如果页面还保留旧的订单、持仓、账户余额、任务数据，就可能产生安全和体验问题。

尤其是在钱包切换账号之后，如果不清理缓存，用户可能看到上一个地址的私有数据。

所以登录和登出不是单纯的 token 存取，而是整个前端私有状态生命周期的管理。

---

## 十三、SIWE 和业务签名不是一回事

在 Web3 交易产品里，除了 SIWE 登录签名，还经常会有 EIP-712 业务签名。

比如充值、提现、下单、撤单等操作，可能都会要求用户签名一个 operation。

这两者要分清楚：

```txt
SIWE 签名：证明“我是谁”
业务签名：证明“我同意做这件事”
```

SIWE 登录通常发生在用户进入系统时。

业务签名发生在用户执行具体操作时，比如：

- 充值。
- 提现。
- 下单。
- 撤单。
- 修改账户配置。

它们的安全目标不同。

```txt
SIWE 解决身份认证问题。
业务签名解决操作授权问题。
```

所以一个比较清晰的系统应该是：

```txt
用户登录：
SIWE message -> wallet signature -> backend verify -> session

用户操作：
operation data -> wallet signature -> backend verify -> execute business
```

这样设计的好处是，登录态和业务授权分离。

用户登录之后，并不代表后端可以替用户随便执行高风险操作。高风险操作仍然需要单独签名确认。

---

## 十四、前端落地 SIWE 时要注意什么？

### 1. nonce 必须由后端生成，不能由前端自己生成后直接相信

前端可以请求 nonce，但 nonce 的有效性、过期时间、是否已使用，都应该由后端控制。

### 2. 后端必须校验 domain 和 chainId

如果不校验 domain，签名可能被其他站点复用。

如果不校验 chainId，可能出现跨网络身份混乱。

### 3. 前端不要把钱包连接当成登录态

钱包连接只是连接状态。真正的登录态应该以后端返回的 session 为准。

### 4. 切换账号和切换网络时要清理 session

否则很容易出现地址 A 的 session 被地址 B 继续使用的问题。

### 5. 登出时要清理私有缓存

尤其是交易产品，要清理账户、订单、持仓、任务、私有数据相关的 React Query 缓存和客户端状态。

### 6. SIWE 只负责登录，不要把所有业务操作都塞进 SIWE

充值、提现、下单这类业务操作，应该使用单独的 EIP-712 operation 签名。

---

## 十五、总结

SIWE 在前端落地时，核心不是弹一个钱包签名窗口，而是把“钱包地址”转化成业务系统可信任的“登录态”。

真实项目里，SIWE 的完整链路可以总结为：

```txt
连接钱包
  -> 获取 nonce
  -> 构造 SIWE message
  -> 钱包签名
  -> 后端验签
  -> 保存 session
  -> 访问私有业务页面
  -> 登出时清理 session 和缓存
```

它解决的是 Web3 应用中的身份认证问题。

从工程角度看，一个比较合理的 SIWE 前端实现，应该至少包含这几层：

```txt
wallet config：管理钱包连接和支持网络
siwe config：管理 SIWE 登录流程
auth service：管理后端登录、session、登出清理
Auth component：管理页面访问权限
```

这样拆分之后，SIWE 就不会散落在各个组件里，也不会和具体的交易、充值、提现逻辑耦合在一起。

最终形成的架构是：

```txt
SIWE 负责登录身份
Session 负责业务访问
EIP-712 负责具体操作授权
```

这也是 Web3 交易类产品里比较清晰、可维护、也更安全的一种前端落地方式。
