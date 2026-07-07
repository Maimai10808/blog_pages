# Web3 前端工程师应当具备哪些能力

Web3 前端工程师不是简单的“会写页面 + 会连接钱包”。真正合格的 Web3 前端，需要同时具备 传统前端工程能力、钱包连接能力、链上交互能力、交易状态处理能力、资产展示能力、实时行情能力、业务理解能力和安全意识。

如果把 Web3 前端能力拆开看，大致可以分成以下几个方向。

---

## 一、基础前端工程能力

Web3 前端首先还是前端工程师，所以基础前端能力是第一层要求。

需要熟悉：

- React
- Next.js
- TypeScript
- HTML / CSS
- 响应式布局
- 组件化开发
- 状态管理
- 接口请求
- 表单处理
- 页面性能优化
- 多语言 i18n
- 前端工程化

Web3 项目里常见页面包括：

- 钱包连接页面
- 资产列表页面
- Token 转账页面
- NFT 展示页面
- DApp 授权页面
- 签名确认弹窗
- 交易状态页面
- 交易首页
- K线图页面
- 盘口深度页面
- 当前委托页面
- 历史委托页面
- 成交记录页面
- 资产中心
- 充值提现页面
- 用户中心
- API Key 管理页面
- 邀请返佣页面
- 管理后台页面

所以 Web3 前端不是只写一个按钮连接钱包，而是要能独立完成完整产品页面。

---

## 二、钱包连接能力

钱包连接是 Web3 前端的入口能力。

用户进入 DApp 后，第一步通常就是连接钱包。前端需要处理钱包连接、账户识别、网络判断、链切换、断连重连等问题。

需要熟悉：

- MetaMask
- OKX Wallet
- Trust Wallet
- Coinbase Wallet
- WalletConnect
- Web3Modal
- RainbowKit
- wagmi
- EIP-1193 Provider

需要能实现：

- 连接钱包
- 断开钱包
- 获取钱包地址
- 获取当前 chainId
- 判断当前网络是否正确
- 引导用户切换网络
- 添加自定义网络
- 监听账户切换
- 监听链切换
- 监听断连
- 处理钱包未安装
- 处理用户拒绝连接
- 处理 WalletConnect 移动端唤起

这一块是 Web3 前端最基础、也最常被面试问到的部分。

---

## 三、链上交互能力

Web3 前端必须会和智能合约交互。

这包括读取链上数据，也包括发起链上交易。

需要熟悉：

- ethers.js
- viem
- wagmi
- web3.js
- ABI
- Contract Address
- RPC
- read contract
- write contract
- transaction hash
- transaction receipt
- contract event

需要能完成：

- 读取 Token 余额
- 读取 NFT 信息
- 查询授权额度 allowance
- 发起 approve
- 发起 transfer
- 发起 mint
- 发起 stake
- 发起 swap
- 调用合约 read 方法
- 调用合约 write 方法
- 监听合约事件
- 等待交易确认
- 交易完成后刷新数据

必须理解：

- read 不需要用户签名
- write 需要用户签名
- call 不改变链上状态
- transaction 会改变链上状态
- 拿到 hash 不代表交易成功
- 拿到 receipt 才能判断交易最终结果

这是 Web3 前端区别于普通前端的核心能力。

---

## 四、交易生命周期处理能力

Web3 前端最容易体现真实项目经验的地方，就是交易状态处理。

一笔链上交易通常会经历：

- 用户点击按钮
- 前端构造交易
- 钱包弹窗
- 用户确认签名
- 交易广播
- 返回 transaction hash
- 交易 pending
- 等待链上确认
- 交易成功
- 交易失败或 revert
- 前端刷新资产和页面状态

前端需要处理：

- 用户拒绝签名
- 钱包未连接
- 当前链错误
- Gas 不足
- RPC 超时
- 交易 pending 太久
- 合约 revert
- Nonce 冲突
- 重复点击
- 重复提交
- 交易失败后的错误提示
- 交易成功后的数据刷新

页面上需要有：

- 按钮 loading
- 禁止重复点击
- 交易 hash 展示
- 区块浏览器跳转
- pending 状态
- success 状态
- failed 状态
- 失败原因提示
- 交易完成后的资产刷新

一个合格的 Web3 前端，不能只做到“钱包弹出来了”，还要把交易的整个生命周期处理完整。

---

## 五、EVM 基础能力

Web3 前端至少要理解 EVM 链的基本规则。

需要熟悉：

- Ethereum
- BSC
- Polygon
- Arbitrum
- Optimism
- Base
- Avalanche
- chainId
- RPC URL
- Gas
- Nonce
- 交易签名
- 交易广播
- 交易回执
- 区块确认

需要理解：

- 什么是 EOA 地址
- 什么是合约地址
- 什么是 chainId
- 为什么要切换网络
- Gas 是什么
- Nonce 是什么
- 为什么交易会 pending
- 为什么交易会失败
- 为什么同一个地址可以出现在多条 EVM 链上

如果不懂这些，就很难处理真实 DApp 中的异常情况。

---

## 六、签名能力

Web3 前端除了发交易，还经常需要处理签名。

常见签名方式包括：

- personal_sign
- eth_sign
- eth_signTypedData
- EIP-712 Typed Data

常见场景包括：

- 钱包登录
- 地址绑定
- DApp 授权
- 链下订单签名
- DEX 限价单
- NFT 挂单
- API 授权
- 身份验证

需要理解：

- 签名不一定上链
- 签名也可能有风险
- EIP-712 比普通签名更清晰
- 签名前要展示用户能看懂的内容
- 不要让用户盲签

签名是 Web3 安全里非常重要的一环，不能只会调用 API。

---

## 七、Token 和 NFT 标准能力

Web3 前端必须熟悉常见资产标准。

需要熟悉：

- ERC20
- ERC721
- ERC1155
- Token balance
- Token allowance
- Token approve
- Token transfer
- NFT ownerOf
- NFT tokenURI
- NFT metadata

需要能实现：

- Token 余额展示
- Token 转账
- Token 授权查询
- Token approve
- NFT 列表展示
- NFT 图片展示
- NFT 详情页
- NFT 转账
- NFT 授权状态展示

需要理解：

- ERC20 是同质化代币
- ERC721 是 NFT 标准
- ERC1155 可以同时支持多种资产
- approve 是授权别人操作资产
- allowance 是授权额度
- metadata 可能来自 IPFS
- 假 Token 可能伪装成真 Token

---

## 八、链上资产展示能力

钱包、交易所、DeFi、NFT 平台都需要资产展示能力。

前端需要能展示：

- Token 列表
- Token 图标
- Token 名称
- Token symbol
- Token decimals
- Token 余额
- 法币估值
- NFT 图片
- NFT metadata
- 交易记录
- 链上确认状态

这里有很多细节：

- 链上返回的大数字通常是 BigInt
- Token decimals 不同，展示前必须格式化
- NFT 图片可能来自 IPFS
- Token metadata 不一定可信
- 交易记录通常需要索引服务
- 资产估值需要价格数据

资产展示看起来简单，但真实项目里很容易出错。

---

## 九、多链能力

现在 Web3 钱包和 DApp 基本都要支持多链。

至少要熟悉 EVM 多链：

- Ethereum
- BSC
- Polygon
- Arbitrum
- Optimism
- Base
- Avalanche

需要能实现：

- 链切换
- 添加网络
- 多链资产展示
- 不同链使用不同 RPC
- 不同链使用不同合约地址
- 不同链跳转不同区块浏览器
- 链不支持时给出提示

如果是钱包岗位，还可能要求非 EVM 链：

- BTC
- TRON
- Solana
- TON
- Cosmos

非 EVM 链是加分项，但 EVM 多链是 Web3 前端的基本能力。

---

## 十、钱包核心流程理解

如果是 Web3 钱包前端，必须理解钱包从创建到使用的完整流程。

需要理解：

- 创建钱包
- 生成助记词
- 派生私钥
- 生成公钥
- 生成地址
- 本地加密保存
- 导入助记词
- 导入私钥
- 导入 Keystore
- 构造交易
- 用户签名
- 广播交易
- 等待确认
- 资产更新

需要熟悉基础概念：

- 助记词
- 私钥
- 公钥
- 地址
- Keystore
- HD Wallet
- BIP39
- BIP32
- BIP44
- 派生路径

关键安全原则：

- 私钥不能上传服务器
- 助记词不能明文存储
- 敏感数据必须本地加密
- 签名必须由用户确认
- 不要记录私钥和助记词日志

钱包类前端对安全要求非常高。

---

## 十一、WebSocket 实时数据能力

如果是交易所前端，WebSocket 是核心能力。

交易所页面需要大量实时数据：

- 实时行情
- Ticker
- K线
- 盘口深度
- 实时成交
- 当前委托
- 订单回报
- 资产变动
- 成交记录

需要熟悉：

- WebSocket 连接
- 心跳检测
- 断线重连
- 消息订阅
- 消息取消订阅
- 增量数据更新
- 数据乱序处理
- 重复消息处理
- 前端状态同步
- 页面性能优化

特别是盘口和深度图，不是简单把接口数据展示出来，而是要处理实时增量更新。

需要理解：

- 买盘卖盘如何更新
- 深度数据如何合并
- 盘口数据如何排序
- 增量消息丢失后如何重新拉快照
- WebSocket 推送太频繁时如何减少页面重渲染

---

## 十二、K线图和交易图表能力

交易所前端通常要求能做 K线图。

需要熟悉：

- TradingView Charting Library
- Lightweight Charts
- K线数据格式
- OHLC
- 成交量
- 时间周期
- 历史 K线
- 实时 K线更新

需要能实现：

- 1m / 5m / 15m / 1h / 1d 周期切换
- 历史 K线加载
- 实时 K线更新
- 切换交易对
- 切换周期
- 图表 loading
- 图表 resize
- 暗黑 / 明亮主题
- 指标展示

如果你做过交易所前端，这一块非常适合写进简历。

---

## 十三、交易所业务理解

如果目标岗位偏交易所前端，必须理解交易业务。

需要理解：

- 买入
- 卖出
- 限价单
- 市价单
- 当前委托
- 历史委托
- 成交记录
- 撤单
- 部分成交
- 资产冻结
- 资产解冻
- 手续费
- 盘口
- 深度
- 实时成交

前端要知道：

- 用户下单后为什么资产要冻结
- 撤单后为什么资产要解冻
- 部分成交后如何展示
- 成交后资产余额如何变化
- 手续费在哪里扣
- 当前委托和历史委托有什么区别
- 成交记录和委托记录有什么区别
- 订单状态如何变化

这些虽然看起来像后端业务，但前端如果不懂，页面状态就容易写错。

---

## 十四、RPC 使用与优化能力

Web3 前端大量依赖 RPC。

需要理解：

- RPC 请求
- RPC 超时
- RPC 限流
- RPC 节点异常
- RPC fallback
- 批量请求
- 缓存
- 重试
- Multicall

需要能处理：

- RPC 慢导致页面卡顿
- RPC 挂了不能直接显示余额为 0
- 多个组件重复请求同一数据
- Token metadata 重复加载
- 链上数据刷新不及时
- 交易 pending 查询过于频繁

常见优化方式：

- 合并请求
- 使用 multicall
- 缓存静态数据
- 缓存 Token 信息
- 减少重复请求
- 失败重试
- 备用 RPC
- 合理轮询
- WebSocket 订阅实时数据

---

## 十五、链上数据索引能力

复杂 DApp 不能所有数据都直接查链。

需要了解：

- The Graph
- Subgraph
- 自建区块扫描器
- 合约事件监听
- 区块确认机制
- 链上重组 reorg
- 交易状态同步

需要知道：

- 余额可以直接查链
- 历史交易记录适合查索引
- NFT 列表适合查索引
- 排行榜适合查后端
- 复杂 DeFi 数据适合走索引服务

前端不一定要自己写索引器，但要知道链上数据从哪里来，以及为什么不能所有东西都实时查 RPC。

---

## 十六、Web3 安全意识

Web3 前端必须有安全意识。

尤其是钱包和交易类产品，安全问题非常严重。

需要理解：

- 私钥不能上传服务器
- 助记词不能明文存储
- 不要让用户盲签
- 不要默认无限授权
- 不要自动发起危险交易
- 签名内容要清晰展示
- 敏感信息不能进日志
- 防止重复点击
- 防止重复提交
- 防止恶意合约授权
- 防止假 Token 展示误导用户

常见风险包括：

- 钓鱼签名
- 恶意授权
- 假 Token
- 假充值
- 重复广播
- Nonce 堵塞
- RPC 节点异常
- 链上重组
- 用户拒签
- 授权额度过大

安全意识是 Web3 前端和普通前端非常不一样的地方。

---

## 十七、DApp 业务场景能力

如果做过具体业务，会明显加分。

常见业务包括：

- DEX
- Swap
- 跨链桥
- 质押
- DeFi 聚合器
- NFT 市场
- DAO 投票
- 链上授权管理
- 空投领取
- Launchpad

例如 Swap 页面需要理解：

- from token
- to token
- amount in
- amount out
- slippage
- price impact
- approve
- swap
- 交易确认
- 失败处理

NFT 市场需要理解：

- mint
- list
- buy
- sell
- metadata
- collection
- royalty
- approval

这些业务经验会让你比只会写钱包连接 demo 的人强很多。

---

## 最终总结

一个合格的 Web3 前端工程师，应当具备以下能力：

1. 扎实的 React / Vue / TypeScript 前端基础
2. 钱包连接能力：MetaMask、WalletConnect、OKX、Trust Wallet
3. 合约交互能力：ethers.js、viem、wagmi、ABI、read/write
4. 交易生命周期处理能力：签名、广播、pending、receipt、失败处理
5. EVM 基础能力：Gas、Nonce、RPC、chainId、交易回执
6. 签名能力：personal_sign、eth_signTypedData、EIP-712
7. Token / NFT 标准能力：ERC20、ERC721、ERC1155
8. 链上资产展示能力：余额、NFT、交易记录、资产估值
9. 多链能力：EVM 多链，进阶到 BTC、TRON、Solana
10. 钱包核心流程理解：助记词、私钥、HD Wallet、本地加密
11. WebSocket 实时数据能力：行情、盘口、成交、订单推送
12. K线图和交易图表能力：TradingView、Lightweight Charts
13. 交易所业务理解：下单、撤单、成交、冻结、手续费
14. RPC 使用与优化能力：缓存、重试、fallback、multicall
15. 链上数据索引能力：The Graph、事件监听、区块确认
16. Web3 安全意识：防钓鱼、防盲签、防恶意授权、私钥不上服务器
17. DApp 业务经验：DEX、Swap、跨链桥、质押、NFT、DAO

一句话说：

Web3 前端的核心，不是会连接钱包，而是能把“前端页面、钱包交互、合约调用、交易状态、链上资产、实时数据和安全风控”完整串起来。

如果只是会 React，那只是普通前端。
如果只是会连接钱包，那只是 Web3 Demo。
真正能打的 Web3 前端，是能独立完成一个真实 DApp 或钱包产品核心流程的人。
