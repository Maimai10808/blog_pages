# 前端如何落地 SIWE 钱包登录：从 Reown AppKit 到 Token 鉴权完整链路

在 Web3 项目中，钱包登录是一个非常核心的认证模块。它和传统 Web2 的账号密码登录不一样，用户不是输入手机号、邮箱或密码，而是通过钱包签名来证明自己拥有某个链上地址。

这个过程通常被称为 SIWE，全称是 **Sign-In with Ethereum**。

简单来说，SIWE 要解决的问题是：

```text
用户怎么向后端证明：
“这个钱包地址确实是我控制的”
```

在实际项目中，SIWE 不只是“连接钱包”这么简单。连接钱包只能拿到地址，但拿到地址并不等于完成登录。真正的登录流程还包括 nonce 获取、message 构造、钱包签名、后端验签、token 下发、前端保存登录态、后续请求自动带认证信息。

本文结合一个真实项目链路，梳理前端如何落地 SIWE 钱包登录。

---

## 一、完整登录链路

项目中的 SIWE 登录链路可以概括为：

```text
用户点击 Sign In / CONNECT
→ useAppKit().open()
→ Reown AppKit 打开钱包连接弹窗
→ wagmi / AppKit 获取 wallet address、chainId
→ AppKit 触发 SIWE 流程
→ siweConfig.getNonce(address)
→ getCsrfToken(address)
→ POST /user/login/v1/nonce
→ 后端返回 nonce
→ siweConfig.createMessage()
→ formatMessage(args, address) 生成 SIWE message
→ 钱包签名 message
→ siweConfig.verifyMessage({ message, signature })
→ signIn({ message, signature, device_uuid })
→ POST /user/login/v1/login
→ 后端校验 message、signature、nonce、address、chainId
→ 返回 access_token / sign_secret / expire
→ saveSession()
→ accessDataAtom 写入 localStorage
→ isClientLoginAtom 变为 true
→ 后续私有接口由 addSignatureMiddleware 自动加认证头
```

这条链路可以拆成五个阶段：

```text
连接钱包
→ 获取 nonce
→ 构造并签名 SIWE message
→ 后端验签并下发登录态
→ 前端保存 session 并用于后续接口鉴权
```

---

## 二、连接钱包不等于登录

用户首先点击页面上的 `Sign In` 或 `CONNECT` 按钮。

前端会调用：

```ts
useAppKit().open();
```

这一步会打开 Reown AppKit 的钱包连接弹窗，让用户选择 MetaMask、WalletConnect 或其他钱包。

连接成功后，wagmi / AppKit 可以拿到两个关键信息：

```text
wallet address
chainId
```

例如：

```text
address = 0xabc...
chainId = 1
```

但这里要注意：

**拿到 address 还不等于用户已经登录。**

因为钱包地址本身是公开信息。任何人都可以复制一个地址，然后告诉后端“我是这个地址”。如果后端只根据 address 创建登录态，那就等于任何人都可以冒充任意地址登录。

所以真正的登录必须进入下一步：**让用户对一段后端认可的消息进行签名。**

---

## 三、AppKit 触发 SIWE 流程

项目中使用 Reown AppKit 集成钱包连接和 SIWE 登录流程。
钱包连接成功后，AppKit 会按照配置好的 `siweConfig` 执行认证流程。

核心配置包括：

```text
getNonce
createMessage
verifyMessage
```

它们分别对应 SIWE 中最关键的三个动作：

```text
getNonce：向后端获取一次性随机数
createMessage：根据地址、链 ID、域名等信息构造 SIWE message
verifyMessage：把 message 和 signature 提交给后端验证
```

这使得登录流程不是散落在各个组件里，而是收敛到一套 SIWE 配置中。
组件只需要负责触发连接，认证细节由 AppKit + siweConfig 接管。

---

## 四、获取 nonce：防止重放攻击

SIWE 流程中很重要的一步是获取 nonce。

项目链路是：

```text
siweConfig.getNonce(address)
→ getCsrfToken(address)
→ POST /user/login/v1/nonce
→ 后端返回 nonce
```

nonce 是后端生成的一次性随机数。
它的核心作用是：**防止重放攻击。**

如果没有 nonce，攻击者一旦拿到用户以前签过的 message 和 signature，就可以反复提交给后端，伪造登录。

有了 nonce 后，每次登录流程都会绑定一个新的随机值：

```text
本次登录 nonce = abc123
用户签名 message 中包含 abc123
后端验证 abc123 是否存在、是否过期、是否已经使用
验证成功后立即让 abc123 失效
```

这样旧签名即使被截获，也不能再次用于登录。

所以 nonce 必须满足几个要求：

```text
由后端生成
足够随机
服务端保存
有过期时间
一次性使用
验证成功后失效
```

这也是为什么 nonce 不能只由前端自己生成。
如果 nonce 完全由前端生成，后端就无法确认这个 nonce 是否可信，也无法可靠地防止重放。

---

## 五、构造 SIWE Message

拿到 nonce 后，前端会进入 message 构造阶段：

```text
siweConfig.createMessage()
→ formatMessage(args, address)
→ 生成 SIWE message
```

SIWE message 是用户最终要在钱包里签名的文本。
它通常包含以下字段：

```text
domain：当前站点域名
address：钱包地址
statement：登录说明
uri：当前应用地址
version：SIWE 版本
chainId：当前链 ID
nonce：后端返回的一次性随机数
issuedAt：签发时间
expirationTime：过期时间，可选
```

它的大致含义是：

```text
我正在用这个钱包地址，
在这个域名下，
针对这个应用，
在这个链上，
使用这个 nonce，
发起一次登录请求。
```

这一步的重点是：**message 不能随便拼。**

后端后续会根据 message 里的字段做校验，尤其是：

```text
address
nonce
domain
uri
chainId
issuedAt / expirationTime
```

如果前端构造的 message 和后端预期不一致，验签就会失败。

---

## 六、钱包签名：证明地址控制权

message 生成后，钱包会弹出签名确认。

用户点击确认后，钱包会用当前账户的私钥对 message 进行签名，生成：

```text
signature
```

前端此时会拿到：

```text
message
signature
```

这两个东西要一起发给后端。

这里的关键逻辑是：

```text
只有真正控制该钱包私钥的人，才能对 message 生成有效 signature。
```

后端拿到 message 和 signature 后，可以通过签名恢复出签名地址，然后判断它是否等于 message 中的 address。

如果一致，就说明：

```text
这个用户确实控制这个钱包地址。
```

注意：
签名不是把私钥发给后端。私钥永远不会离开钱包。
后端只是验证签名结果，不会拿到用户私钥。

---

## 七、后端验签：verifyMessage

项目中验签入口是：

```text
siweConfig.verifyMessage({ message, signature })
→ signIn({ message, signature, device_uuid })
→ POST /user/login/v1/login
```

也就是说，前端把 `message`、`signature` 以及设备标识 `device_uuid` 提交给后端登录接口。

后端会校验：

```text
signature 是否有效
signature 恢复出的地址是否等于 message 中的 address
nonce 是否存在
nonce 是否过期
nonce 是否已经使用过
domain 是否匹配当前站点
uri 是否匹配当前应用
chainId 是否符合项目允许的链
issuedAt / expirationTime 是否有效
```

这一步才是真正的“登录认证”。

前端这里的职责不是自己判断签名是否可信，而是：

```text
正确提交 message 和 signature
等待后端返回登录结果
根据结果保存登录态
```

因为最终可信任的认证状态必须由后端签发。

---

## 八、登录成功后返回 token 和 sign_secret

后端校验通过后，会返回登录态信息：

```text
access_token
sign_secret
expire
```

这些字段说明用户已经通过钱包签名认证，后端认可这次登录。

可以这样理解：

```text
钱包签名：证明你控制这个地址
access_token：后端给你的登录凭证
sign_secret：后续接口签名或请求认证使用的密钥材料
expire：登录态过期时间
```

这里有一个很重要的关系：

**SIWE 签名只发生在登录阶段，后续接口不是每次都让用户钱包签名。**

如果每次请求都弹钱包签名，用户体验会非常差。
所以登录成功后，系统会转成传统 Web2 风格的 token/session 鉴权。

也就是说：

```text
SIWE 负责建立身份
token/session 负责维持登录态
```

这是 Web3 项目里很常见的认证模式。

---

## 九、前端保存 Session

拿到后端返回的登录态后，前端会调用：

```text
saveSession()
```

然后把认证数据写入：

```text
accessDataAtom
```

并持久化到：

```text
localStorage
```

同时：

```text
isClientLoginAtom 变为 true
```

这表示客户端已经进入登录状态。

这里的状态可以拆成两层理解：

```text
accessDataAtom：保存具体认证数据，例如 access_token、sign_secret、expire
isClientLoginAtom：保存当前是否登录的派生状态
```

持久化到 localStorage 的作用是：

```text
页面刷新后可以恢复登录态
用户不需要每次刷新都重新连接钱包和签名
```

但 localStorage 也有安全风险。
如果站点存在 XSS，攻击者可能读取 localStorage 里的 token。
所以项目需要配合 XSS 防护、输入输出转义、避免危险 innerHTML、接口签名和过期机制来降低风险。

---

## 十、后续私有接口如何鉴权

登录完成后，后续私有接口不再重复走钱包签名，而是由请求中间件统一加认证信息。

项目链路是：

```text
后续私有接口
→ addSignatureMiddleware
→ 自动加认证头
```

也就是说，业务代码调用接口时，不需要每个地方手动拼 token。
认证逻辑被收敛到请求层中间件里。

这类中间件通常会做几件事：

```text
从 accessDataAtom / localStorage 读取 access_token
读取 sign_secret
生成请求签名
添加认证请求头
处理 token 过期
处理未登录状态
```

这样做的好处是：

```text
认证逻辑集中
业务接口更干净
减少重复代码
方便统一处理过期、登出、刷新登录态
```

在真实项目里，请求中间件是登录系统非常重要的一环。
因为登录成功只是第一步，后续所有需要用户身份的接口，都依赖这套认证信息。

---

## 十一、钱包连接状态和登录态的区别

SIWE 项目里很容易混淆两个概念：

```text
钱包连接状态
应用登录状态
```

钱包连接状态来自 AppKit / wagmi：

```text
当前有没有连接钱包
当前 address 是什么
当前 chainId 是什么
```

应用登录状态来自后端：

```text
access_token 是否存在
token 是否过期
后端是否认可当前用户身份
```

两者不是一回事。

用户连接了钱包，但还没有签名登录：

```text
有 address
没有 access_token
未登录
```

用户已经登录，但钱包断开：

```text
可能还有 access_token
但当前不能发起链上交互
```

用户切换了钱包账号：

```text
address 变化
原来的登录态不应该继续代表新地址
需要重新 SIWE 登录
```

所以项目中需要明确策略：

```text
连接钱包后触发 SIWE
切换 address 后清理旧登录态或重新登录
token 过期后要求重新签名
断开钱包后是否退出登录由业务安全策略决定
```

面试时可以重点强调这一点：
**连接钱包只是拿到地址，SIWE 登录才是建立后端认证状态。**

---

## 十二、为什么不能只用钱包地址登录

这是 SIWE 面试中最高频的问题之一。

不能只用钱包地址登录，是因为钱包地址是公开的。

假设后端接口是：

```text
POST /login
body: { address: "0x123..." }
```

那么任何人都可以填别人的地址登录。
这没有任何身份验证能力。

SIWE 的核心价值就是加入签名证明：

```text
address：我声称我是这个地址
signature：我证明我真的控制这个地址
nonce：我证明这是本次登录，不是旧签名重放
```

所以完整登录必须是：

```text
address + message + signature + nonce 校验
```

而不是只有 address。

---

## 十三、前端在 SIWE 中具体负责什么

从前端角度看，SIWE 落地主要负责以下工作：

```text
1. 触发钱包连接弹窗
2. 获取当前 address 和 chainId
3. 向后端请求 nonce
4. 根据 nonce、address、domain、chainId 构造 SIWE message
5. 调用钱包签名
6. 把 message、signature、device_uuid 提交给后端
7. 接收 access_token、sign_secret、expire
8. 保存 session
9. 更新登录状态
10. 后续接口通过 middleware 自动携带认证信息
11. 处理切换钱包、断开连接、token 过期等边界情况
```

前端不是只写一个 `connect wallet` 按钮，而是要把钱包状态、签名认证、后端登录态、请求鉴权串起来。

这也是 Web3 前端和普通 React 前端最大的区别之一。

---

## 十四、这个项目的 SIWE 落地亮点

根据这条链路，这个项目的 SIWE 落地有几个比较清晰的工程特点。

第一，使用 Reown AppKit 统一钱包连接体验。
通过 `useAppKit().open()` 打开连接弹窗，避免自己维护各种钱包连接 UI。

第二，SIWE 流程集中在 `siweConfig`。
`getNonce`、`createMessage`、`verifyMessage` 都收敛在配置中，减少组件层的认证逻辑。

第三，nonce 由后端接口生成。
通过 `/user/login/v1/nonce` 获取 nonce，符合防重放的安全要求。

第四，后端统一完成验签和登录态签发。
前端只提交 `message` 和 `signature`，后端负责校验 nonce、address、chainId 等关键字段。

第五，登录成功后转为 token/session 机制。
后端返回 `access_token / sign_secret / expire`，前端保存后用于后续接口鉴权。

第六，请求鉴权统一放在 middleware。
`addSignatureMiddleware` 自动给私有接口加认证头，避免业务代码重复处理 token。

---

## 十五、实际开发中容易踩的坑

### 1. 把 connect wallet 当成登录

连接钱包只能拿到 address，不能证明用户拥有这个地址。
真正登录必须签名。

### 2. nonce 由前端生成

nonce 必须由后端生成并保存，否则后端无法判断它是否可信，也无法防重放。

### 3. 后端只校验 address，不校验 nonce/domain/chainId

只恢复地址是不够的。
后端还要校验 nonce 是否有效、domain 是否匹配、chainId 是否允许。

### 4. 切换钱包账号后没有重新登录

如果 address 变化，旧 token 不能继续代表新地址。
应该清理旧 session 或重新触发 SIWE。

### 5. token 永久有效

access_token 必须有过期时间。
否则一旦泄露，风险会很高。

### 6. localStorage 保存 token 但没有 XSS 防护

localStorage 使用方便，但要注意 XSS 风险。
项目中必须避免危险的 HTML 注入，并做好内容转义和安全策略。

### 7. 每个接口手写认证头

认证逻辑应该放到请求中间件统一处理。
否则容易遗漏、重复、难维护。

---

## 十六、面试中怎么讲这个 SIWE 模块

如果面试官问：你们项目里的 Web3 登录是怎么做的？

可以这样回答：

```text
我们项目里用的是 SIWE，也就是 Sign-In with Ethereum。用户点击 Sign In 或 CONNECT 后，会通过 Reown AppKit 打开钱包连接弹窗，连接成功后 wagmi / AppKit 会拿到当前钱包 address 和 chainId。

然后 AppKit 会触发我们配置的 SIWE 流程。第一步是 getNonce，前端会带 address 请求后端的 /user/login/v1/nonce，后端返回一个一次性的 nonce，用来防止重放攻击。

拿到 nonce 后，前端通过 createMessage 构造 SIWE message，里面会包含 address、domain、uri、chainId、nonce、issuedAt 等信息。然后用户在钱包里对这个 message 签名。

签名完成后，前端会把 message、signature 和 device_uuid 提交到 /user/login/v1/login。后端会校验签名能否恢复出对应 address，同时校验 nonce、domain、chainId 等字段。验证通过后，后端返回 access_token、sign_secret 和 expire。

前端拿到这些信息后会调用 saveSession，把认证数据写入 accessDataAtom，并持久化到 localStorage，同时 isClientLoginAtom 变成 true。后续私有接口会通过 addSignatureMiddleware 自动加认证头，所以业务层不需要每个接口手动处理 token。

我理解这个流程的核心是：连接钱包只是拿到地址，SIWE 签名才是证明用户控制这个地址；nonce 用来防止旧签名被重复使用；登录成功后再转成 token/session 机制维护应用登录态。
```

这个回答比较完整，适合面试直接口述。

---

## 十七、如果被追问 nonce 是什么

可以回答：

```text
nonce 是后端生成的一次性随机数，主要用来防止重放攻击。

因为如果没有 nonce，攻击者拿到用户以前签过的 message 和 signature，就可能重复提交给后端伪造登录。

所以每次登录前，前端都会先向后端请求 nonce。后端保存这个 nonce，并设置过期时间。用户签名时 message 中会包含这个 nonce。后端验签时不仅校验签名地址，也会校验 nonce 是否存在、是否过期、是否已经使用过。验证成功后，这个 nonce 应该立即失效。

所以 nonce 不能只在前端生成，必须由后端生成并保存。
```

---

## 十八、如果被追问钱包连接和登录态的区别

可以回答：

```text
钱包连接状态和应用登录态不是一回事。

钱包连接只是 AppKit 或 wagmi 层面的状态，表示当前浏览器连接了某个钱包，并且可以拿到 address 和 chainId。

但应用登录态是后端认证状态，通常表现为 access_token 或 session。只有用户完成 SIWE 签名，并且后端校验通过后，才会签发登录态。

所以一个用户可能连接了钱包但还没登录，也可能 token 还在但钱包断开了。实际项目里，如果用户切换钱包账号，我们一般会清理旧登录态或者重新触发 SIWE，因为旧 token 不能代表新的 address。
```

---

## 十九、如果被追问前端主要做了什么

可以回答：

```text
前端主要负责把钱包连接、签名和后端登录态串起来。

具体包括：用户点击登录后打开 AppKit 钱包弹窗；连接成功后获取 address 和 chainId；请求后端 nonce；根据 nonce、address、domain、chainId 等字段构造 SIWE message；调用钱包签名；把 message、signature 和 device_uuid 提交给后端；登录成功后保存 access_token、sign_secret 和 expire；更新客户端登录状态；并通过请求中间件给后续私有接口自动加认证头。

后端负责最终验签和签发登录态，前端负责流程编排、状态保存和请求层鉴权接入。
```

---

## 二十、总结

SIWE 在前端项目中的落地，不只是一个“连接钱包按钮”。

完整链路应该是：

```text
连接钱包
→ 获取 address / chainId
→ 请求后端 nonce
→ 构造 SIWE message
→ 钱包签名
→ 提交 message / signature
→ 后端验签
→ 返回 token/session
→ 前端保存登录态
→ 请求中间件自动鉴权
```

这个项目中，前端通过 Reown AppKit 负责钱包连接和 SIWE 流程编排，通过 `getNonce` 请求后端 nonce，通过 `createMessage` 构造标准登录消息，通过 `verifyMessage` 提交签名结果，最终把后端返回的 `access_token / sign_secret / expire` 保存到本地 session 状态中。

它的核心安全点是：

```text
address 不能直接当登录凭证
signature 用来证明地址控制权
nonce 用来防止重放攻击
domain / chainId 用来限制签名适用范围
token/session 用来维持后续登录态
middleware 用来统一处理私有接口鉴权
```

真正理解 SIWE，不是只知道“钱包签名登录”，而是要理解它在工程里如何连接：

```text
钱包层
认证层
状态层
请求层
安全校验层
```

只有把这几层串起来，才算真正掌握了 Web3 前端登录模块的落地方式。
