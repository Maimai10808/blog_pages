# blog_pages

这个仓库用于存放计算机基础、Web 安全、前端工程化、DevOps、区块链原理与 Web3 前端实践相关的 Markdown 技术文章。内容以“项目落地”为主，不只写 API 用法，也会围绕网络协议、Linux、Git、容器化、CI/CD，以及真实业务里的状态边界、目录拆分、异步流程、认证链路、请求封装、钱包适配和组件消费方式展开。

文章主要覆盖计算机与网络基础、Linux 终端、Git、Web 安全、前端工程化、Docker、GitHub Actions、React、Next.js、状态管理、表单、文件上传、数据请求、实时通信、交易平台前端、金融市场基础、D3 可视化、区块链协议，以及 Web3 登录、支付、充值提现等方向。

## 内容定位

这些文章更适合作为：

- 技术博客草稿或发布源文件。
- 团队内部前端工程化经验沉淀。
- React / Next.js / Web3 前端项目的实践参考。
- 组件封装、Hook 设计、状态边界设计的案例库。

它不是一个可运行的应用项目，也不包含统一构建脚本。当前仓库的核心资产是 `blog/` 目录下按主题分类的 Markdown 文档。

## 文章目录

### 计算机基础

- [从 0x00 到 bit、byte、二进制、十六进制：讲清计算机底层表示](./blog/computer-science-basics/computer-bits-bytes-binary-hex.md)
- [Git 和 GitHub 入门：从版本控制到团队协作，一篇文章讲清楚](./blog/computer-science-basics/git-github-version-control-introduction.md)
- [如何写好 Git Commit Message：一份实用的提交信息指南](./blog/computer-science-basics/git_commit_message.md)
- [HTTP 缓存机制详解：从 Cache-Control 到 ETag 与 Cache Busting](./blog/computer-science-basics/http-cache-control-etag-cache-busting.md)
- [Linux 终端入门：新手必须掌握的常用命令和基本思路](./blog/computer-science-basics/linux-terminal-basic-commands-introduction.md)
- [常见网络协议入门：从 IP 地址到 HTTP，一篇搞懂网络通信基础](./blog/computer-science-basics/network-protocols-ip-http-security-basics.md)
- [TCP 三次握手：别只会背 SYN、SYN-ACK、ACK](./blog/computer-science-basics/tcp-three-way-handshake.md)

### Web 安全

- [Web 安全基础：同源策略、SameSite Cookie 与 CORS 详解](./blog/web-security/web-security-same-origin-samesite-cors.md)
- [前端安全入门：从 XSS 到 dangerouslySetInnerHTML，再到 DOMPurify](./blog/web-security/frontend-xss-dangerouslysetinnerhtml-dompurify.md)

### AI 工具与工作流

- [Codex App 完整教程：从安装、项目管理到插件、Skills、MCP 与电脑自动化](./blog/ai-tools-workflows/codex-app-complete-guide.md)
- [我是如何用 Codex 维护长期项目的：从项目管理、文件记忆到局部 Skill](./blog/ai-tools-workflows/codex-long-term-project-maintenance.md)
- [Codex 官方最佳实践解读：如何更高效地管理线程、工具、自动化和长期项目](./blog/ai-tools-workflows/codex-official-best-practices.md)
- [OpenClaw 入门：为什么它不只是一个 AI 聊天机器人，而是个人 AI 助手框架？](./blog/ai-tools-workflows/openclaw-personal-ai-assistant-framework-introduction.md)

### 前端工程化

- [从零搭建企业级 Mono Repo 工程：前端高薪必备技能](./blog/frontend-engineering/enterprise-monorepo-engineering.md)
- [为什么现代前端一定要学工程化？](./blog/frontend-engineering/why-modern-frontend-needs-engineering.md)

### 部署与 DevOps

- [Docker 入门：为什么容器化是应用部署绕不开的一步](./blog/deployment-devops/docker-containerization-introduction.md)
- [GitHub Actions 入门：从自动测试到自动部署，理解 CI/CD 的基本流程](./blog/deployment-devops/github-actions-ci-cd-introduction.md)

### React 基础工程化

- [Promise 的理解与应用：从异步结果容器到 async/await 实战](./blog/react-fundamentals/javascript-promise-understanding.md)
- [从 JSX 到 TSX：React 开发者必须掌握的 TypeScript 基础](./blog/react-fundamentals/react-jsx-to-tsx-typescript-basics.md)
- [TypeScript Generics 泛型的理解与应用](./blog/react-fundamentals/typescript-generics-understanding.md)
- [Type Alias 还是 Interface：TypeScript 类型设计里的工程取舍](./blog/react-fundamentals/typescript-type-alias-vs-interface-engineering-tradeoffs.md)
- [React 项目目录结构怎么设计：从页面、组件到业务模块拆分](./blog/react-fundamentals/react-project-directory-structure.md)
- [从能写 React 到写好 React：提升前端工程性的 17 个实践](./blog/react-fundamentals/react-engineering-17-practices.md)
- [React 复用思维入门：什么时候写组件，什么时候写工具函数，什么时候写自定义 Hook？](./blog/react-fundamentals/react-reuse-components-utils-custom-hooks.md)
- [React Context 进阶：Provider Pattern 的正确打开方式](./blog/react-fundamentals/react-context-provider-pattern.md)
- [深入探讨 React 的核心工作原理](./blog/react-fundamentals/react-core-working-principles.md)
- [React Fiber 深度解析：从卡顿到流畅的革命性架构升级](./blog/react-fundamentals/react-fiber-architecture.md)
- [React Server Components 是什么：讲清 CSR、Server Components 与 Next.js 客户端/服务端组件](./blog/react-fundamentals/react-server-components-csr-nextjs.md)
- [Next.js Image 组件入门：为什么一张图片也值得认真优化？](./blog/react-fundamentals/nextjs-image-component-optimization.md)
- [Next.js Image 组件实战：5 种常见图片布局与优化方案](./blog/react-fundamentals/nextjs-image-common-layouts-practices.md)
- [Next.js Image 响应式图片优化实践：别只写四个必填属性](./blog/react-fundamentals/nextjs-image-responsive-optimization-practices.md)
- [Next.js Route Handler 入门：理解 NextRequest 与 NextResponse](./blog/react-fundamentals/nextjs-route-handler-nextrequest-nextresponse.md)
- [Next.js 性能优化实战：用 dynamic 懒加载降低首屏 JavaScript 体积](./blog/react-fundamentals/nextjs-dynamic-import-performance.md)
- [在 Next.js 中使用 Sonner 实现 Toast 通知](./blog/react-fundamentals/nextjs-sonner-toast-notifications.md)
- [React / Next.js 中生成二维码的三种方式：客户端生成、服务端生成与外部 API 方案](./blog/react-fundamentals/react-nextjs-qr-code-generation.md)
- [React 性能优化：深入理解 useMemo 的作用、场景与最佳实践](./blog/react-fundamentals/react-usememo-performance-best-practices.md)
- [React useState 和 useEffect 入门：为什么这两个 Hook 最容易被用错？](./blog/react-fundamentals/react-usestate-useeffect-beginner-pitfalls.md)
- [React useEffect 请求封装：从页面请求到可复用 Hook](./blog/react-fundamentals/react-useeffect-fetch-request-hook.md)
- [React Hooks 底层原理深度解析：从数组到链表的魔法](./blog/react-fundamentals/react-hooks-internals-array-linked-list.md)
- [React useMemo 怎么理解：缓存计算结果和稳定引用的工程化场景](./blog/react-fundamentals/react-usememo-reference-performance.md)
- [React useCallback 的理解与应用：不是加速函数，而是稳定函数引用](./blog/react-fundamentals/react-usecallback-stable-function-reference.md)
- [React useRef 的理解与应用：跨渲染持久存在的值容器](./blog/react-fundamentals/react-useref-persistent-box.md)
- [React 大列表优化落地：从普通 map 到 react-window / react-virtualized 的工程化封装](./blog/react-fundamentals/react-large-list-virtualization.md)
- [AI 辅助前端工作流入门：从 shadcn/ui、Figma 到 Builder.io，前端开发方式正在怎么变？](./blog/react-fundamentals/ai-assisted-frontend-workflow-shadcn-figma-builderio.md)
- [TanStack Start 入门：一个基于 TanStack Router 的全栈 React 框架到底解决了什么问题？](./blog/react-fundamentals/tanstack-start-fullstack-react-framework-introduction.md)
- [TanStack Table 入门：为什么它是 React 表格开发里的“表格引擎”](./blog/react-fundamentals/tanstack-table-react-table-engine.md)
- [用 TanStack Table、React Query 和 shadcn/ui 搭一个可维护的数据表格架构](./blog/react-fundamentals/tanstack-table-react-query-shadcn-architecture.md)

### 状态管理

- [Redux Toolkit 项目落地：从 slice、thunk 到可维护的前端状态管理](./blog/state-management/redux-toolkit-project-state-management.md)
- [Zustand 项目落地：从全局状态、Store 拆分到真实业务封装](./blog/state-management/zustand-project-state-management.md)
- [React Query 和 Zustand 状态边界：server state 与 client state 怎么拆](./blog/state-management/react-query-zustand-state-boundary.md)
- [React localStorage 不只是 setItem：用 useSyncExternalStore 做一个可订阅的本地状态 Hook](./blog/state-management/react-localstorage-usesyncexternalstore-hook.md)

### 数据请求与实时通信

- [Axios 快速入门：从基础请求到拦截器、全局配置与错误处理](./blog/data-fetching-realtime/axios-basics-interceptors-error-handling.md)
- [从 Axios 到统一请求层：实际项目中的 Fetcher 应该怎么设计？](./blog/data-fetching-realtime/axios-unified-fetcher-request-layer.md)
- [React 博客项目中使用 Axios + JSON Server 实现完整 CRUD](./blog/data-fetching-realtime/react-axios-json-server-crud.md)
- [Next.js 16 Cache Components 完整代码示例：讲清 Suspense、use cache 和 cacheLife](./blog/data-fetching-realtime/nextjs-cache-components-suspense-use-cache.md)
- [React / Next.js 中如何落地 MQTT 单例客户端：从实时行情订阅到引用计数管理](./blog/data-fetching-realtime/nextjs-mqtt-singleton-client.md)
- [HTTP 快照 + MQTT 实时推送：一种更稳的前端实时数据架构](./blog/data-fetching-realtime/http-snapshot-mqtt-realtime-architecture.md)
- [TypeScript 中如何优雅实现 Server-Sent Events：基于 Effect 的实时同步方案](./blog/data-fetching-realtime/typescript-effect-sse-realtime-sync.md)
- [TanStack Query 项目落地：从 queryKey、缓存失效到无限分页的工程化封装](./blog/data-fetching-realtime/tanstack-query-querykey-cache-infinite.md)
- [React Query 项目落地：从接口请求到可维护的数据层封装](./blog/data-fetching-realtime/react-query-maintainable-data-requests.md)
- [从零实现 React Query 的 useQuery 钩子：深入理解其核心机制](./blog/data-fetching-realtime/react-query-usequery-from-scratch.md)
- [前端 SSE 实时通信怎么封装：从 EventSource 到业务 Hook](./blog/data-fetching-realtime/frontend-sse-realtime-hook.md)
- [fetch-event-source SSE 实践：从普通请求到可控的实时连接](./blog/data-fetching-realtime/frontend-fetch-event-source-sse.md)

### 表单与上传

- [为什么 React 表单推荐使用 React Hook Form + Zod？](./blog/forms-uploads/react-hook-form-zod-recommended-pattern.md)
- [在 React 应用中使用 Zod 进行数据验证的全面教程与应用](./blog/forms-uploads/react-zod-data-validation.md)
- [React Hook Form 项目落地：从受控表单、Zod 校验到异步提交错误处理](./blog/forms-uploads/react-hook-form-zod-submit-errors.md)
- [React 多步骤表单工程化落地：从 Zod Schema、React Hook Form 到 Zustand 持久化](./blog/forms-uploads/react-multistep-form-zod-rhf-zustand.md)
- [React 文件上传不只是 input type=file：从状态建模、上传进度到工程化封装](./blog/forms-uploads/react-file-upload-state-progress.md)
- [React 多文件上传怎么做：从 File Input 到并发上传进度的工程化封装](./blog/forms-uploads/react-multi-file-upload-progress.md)
- [Next.js App Router 图片上传入门：从 file input、API Route 到签名 URL 和图片优化](./blog/forms-uploads/nextjs-app-router-image-upload-signed-url-optimization.md)
- [Next.js 图片上传工程落地：从 Uploadcare 上传组件到图片存储、展示与安全上传](./blog/forms-uploads/nextjs-uploadcare-image-upload-engineering.md)
- [前端媒体资源优化实践：用 ImageKit 优化图片、视频与上传体验](./blog/forms-uploads/frontend-media-optimization-imagekit.md)

### 认证与权限

- [React 认证不只是存 Token：JWT、Access Token、Refresh Token 的工程化落地](./blog/auth-permissions/react-jwt-auth-token-refresh.md)
- [React 中使用 Axios 实现登录表单与全局认证状态](./blog/auth-permissions/react-axios-login-auth-context.md)
- [JWT 完整入门指南：从原理、结构到 Token 与 Session 的区别](./blog/auth-permissions/jwt-token-session-complete-guide.md)
- [Next.js 登录模块怎么落地：React Hook Form + Zod + Zustand + API 完整链路](./blog/auth-permissions/nextjs-login-rhf-zod-zustand-api.md)
- [Next.js 注册模块怎么落地：React Hook Form + Zod + API 的完整链路](./blog/auth-permissions/nextjs-registration-rhf-zod-api.md)
- [Next.js 找回密码模块怎么落地：React Hook Form + Zod + API 完整链路](./blog/auth-permissions/nextjs-password-reset-rhf-zod-api.md)
- [从请求层到路由保护：Next.js 项目用户鉴权完整实践](./blog/auth-permissions/nextjs-user-authentication-request-route-protection.md)
- [Next.js 认证不只是登录表单：从 Server Action、JWT Cookie 到 Middleware 的工程化落地](./blog/auth-permissions/nextjs-server-action-jwt-cookie-auth.md)
- [Next.js 认证不只是保护页面：从 Middleware、Server Action 到 Data Access Layer 的工程化实践](./blog/auth-permissions/nextjs-auth-middleware-server-action-dal.md)

### 区块链与 Web3 基础

- [EIP-1559 详解：Ethereum 手续费机制如何从 Gas Price 走向 Base Fee](./blog/blockchain-web3-fundamentals/eip-1559-ethereum-fee-mechanism.md)
- [EIP-7702 详解：让 EOA 临时拥有智能合约能力，钱包体验会发生什么变化？](./blog/blockchain-web3-fundamentals/eip-7702-smart-eoa-delegation.md)
- [ERC-1271 与 CoW Protocol 智能订单：让智能合约也能“签名”下单](./blog/blockchain-web3-fundamentals/erc-1271-cow-protocol-smart-orders.md)
- [ERC20 Permit 详解：用签名完成授权，减少一次 approve 交易](./blog/blockchain-web3-fundamentals/erc20-permit-signature-approval.md)
- [EVM 完整入门指南：从 Stack、Memory、Calldata、Storage 到 Opcode 执行过程](./blog/blockchain-web3-fundamentals/evm-stack-memory-storage-opcodes-guide.md)
- [Permit2 是什么：一次授权，多次签名，让 ERC20 支付更顺滑](./blog/blockchain-web3-fundamentals/permit2-erc20-signature-approval.md)
- [智能合约钱包和普通加密钱包有什么区别？](./blog/blockchain-web3-fundamentals/smart-contract-wallet-vs-crypto-wallet.md)
- [稳定币完整入门：从购买力、抵押机制到 DeFi 中的真实需求](./blog/blockchain-web3-fundamentals/stablecoin-defi-introduction.md)
- [Uniswap 流动性池入门：如何通过提供流动性赚取交易手续费](./blog/blockchain-web3-fundamentals/uniswap-liquidity-pool-introduction.md)
- [Web3 钱包安全指南：签名消息和发送交易时，钱包到底应该展示什么](./blog/blockchain-web3-fundamentals/web3-wallet-signature-transaction-security.md)

### Web3 前端

- [Web3 SIWE 钱包登录：从签名认证到业务登录态](./blog/web3-frontend/web3-siwe-wallet-login-flow.md)
- [Reown AppKit 入门：前端如何快速接入 Web3 钱包连接能力](./blog/web3-frontend/reown-appkit-wallet-connect-introduction.md)
- [Reown AppKit + SIWE 项目落地：从钱包连接到后端登录态的完整前端方案](./blog/web3-frontend/reown-appkit-siwe-wallet-auth.md)
- [Web3 前端钱包模块如何落地：从钱包连接、SIWE 登录到业务账户状态同步](./blog/web3-frontend/web3-frontend-wallet-module-implementation.md)
- [Web3 前端多链适配如何落地：从钱包连接到签名、支付与交易分发](./blog/web3-frontend/web3-frontend-multichain-adapter-implementation.md)
- [Web3 前端 EVM 交互如何落地：从切链、签名到 ERC20 支付与合约领奖](./blog/web3-frontend/web3-frontend-evm-interaction-implementation.md)
- [Web3 前端交易系统如何落地：从下单 UI 到 Operation 编码、签名与实时状态更新](./blog/web3-frontend/web3-frontend-trading-system-implementation.md)
- [Web3 前端如何落地 IPFS 上传：从 Token Logo 到 Metadata JSON](./blog/web3-frontend/web3-frontend-ipfs-upload-implementation.md)
- [Web3 前端实时通信如何落地：从 SSE 订阅到行情、订单与账户状态更新](./blog/web3-frontend/web3-frontend-realtime-sse-implementation.md)
- [Web3 空投领取前端怎么落地：从 React Query、钱包切链到链上 Claim 的完整工程封装](./blog/web3-frontend/web3-airdrop-claim-frontend-flow.md)
- [Web3 充值提现流程：从链上交易到后端状态同步](./blog/web3-frontend/web3-deposit-withdrawal-flow.md)
- [多链支付前端怎么封装：从钱包适配器到统一 usePay 的工程化落地](./blog/web3-frontend/multichain-payment-frontend-usepay.md)

### 交易平台前端

- [从 MQTT 单例客户端到 Zustand 行情 Store：Next.js 交易所实时行情系统实践](./blog/trading-platform-frontend/nextjs-exchange-mqtt-zustand-market-data.md)
- [从交易对切换到下单撤单：Next.js 现货交易页完整实践](./blog/trading-platform-frontend/nextjs-spot-trading-page-implementation.md)
- [从开多开空到一键平仓：Next.js 合约交易页完整实践](./blog/trading-platform-frontend/nextjs-futures-trading-page-implementation.md)

### 金融市场基础

- [写给 Web3 新人的加密货币交易入门：从现货、USDT 到合约交易](./blog/financial-markets/crypto-spot-usdt-futures-trading-introduction.md)
- [写给 Web3 从业者的期货入门：从合约规格、保证金到永续合约](./blog/financial-markets/futures-margin-perpetual-contracts-introduction.md)
- [给投资小白的一次系统扫盲：从余额宝、债券、股票到基金](./blog/financial-markets/investment-basics-stocks-bonds-funds.md)

### 数据可视化

- [D3.js 入门：它不只是画图，更是把数据映射成可视化图形的工具](./blog/data-visualization/d3js-data-visualization-introduction.md)

## 写作风格

仓库里的文章通常遵循同一套结构：

1. 先说明这个技术解决什么问题。
2. 再给出最简单、能跑的写法。
3. 分析简单写法在真实项目中的问题。
4. 给出推荐的项目结构和工程化封装方式。
5. 用 TypeScript / TSX 示例串起完整链路。
6. 最后总结工程化注意事项和适用边界。

这种结构的重点是把“能跑的 demo”和“可维护的项目落地”区分开，帮助读者理解为什么要做抽象、哪些逻辑应该下沉、组件应该消费什么样的稳定接口。

## 适合读者

- 正在做 React / Next.js 中后台、SaaS、交易平台或 Web3 应用的前端开发者。
- 想把页面代码拆成更稳定的 feature、hook、service、adapter 的工程实践者。
- 需要整理团队前端规范、技术分享或博客文章的开发者。
- 对 Web3 钱包连接、SIWE 登录、多链支付、充值提现等前端链路感兴趣的开发者。

## 维护建议

新增文章时建议保持以下约定：

- 文件名使用英文小写和连字符，例如 `react-query-maintainable-data-requests.md`。
- 每篇文章使用一个一级标题，正文使用二级、三级标题组织结构。
- 代码示例使用带语言标识的 fenced code block，例如 `ts`、`tsx`、`txt`。
- 新增文章时放入 `blog/` 下对应分类目录，并同步更新本 README 的文章目录。
- 如果文章属于新主题，可以在目录中新增分类，而不是把所有文章堆在一个列表里。

## License

当前仓库未声明开源许可证。如需公开分发、转载或商业使用，请先补充明确的 License。
