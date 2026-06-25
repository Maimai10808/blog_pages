# blog_pages

> 一个围绕前端工程化、Web3 前端和真实项目落地的 Markdown 技术文章仓库。

我不太想只写“某个 API 怎么用”。API 文档已经足够多了，真正让项目变难维护的，往往是更具体的问题：请求层散落在页面里、状态边界不清楚、实时数据和缓存互相打架、钱包连接只完成了一半、链上交易成功了但后端状态还没同步。

这个仓库记录的是我在 React、Next.js、Web3 前端、交易平台前端和技术写作中持续沉淀下来的文章。它有计算机基础、网络协议、Linux、Git 这类底座内容，也有状态管理、实时通信、认证权限、钱包签名、链上交互、交易页面、行情系统这些更贴近真实业务的内容。

它不是一个可运行应用，也不是零散笔记。更准确地说，这是一个围绕“从 Demo 到工程落地”的个人技术知识库。

## 我主要关注这些问题

- 一个请求层怎么设计，才不会散落在页面和组件里？
- React Query、Zustand、Jotai 这类状态工具的边界到底怎么拆？
- SSE、MQTT、HTTP 快照这些实时链路，怎么在交易页、行情页、账户页里落地？
- Next.js 项目里哪些逻辑放页面，哪些放 hook，哪些放 service，哪些应该沉到 Data Access Layer？
- 钱包连接、SIWE、EIP-712、链上交易确认、后端登录态和前端缓存，怎么串成一条完整链路？
- Web3 前端如何处理多链差异、交易状态、签名认证、充值提现和后端状态同步？
- AI Coding Agent 如何进入长期项目维护，而不是只写一次性代码？

## 内容地图

目录按阅读路线重新组织：先是计算机和工程底座，再进入 React / Next.js 项目实践，随后是状态、请求、实时通信、认证、Web3 和交易平台前端。

<details>
<summary><strong>A. 计算机基础与工程底座</strong></summary>

这些文章是工程实践的底层背景：网络、系统、Git、HTTP、Web 安全。它们不直接写业务，但会影响你排查接口、缓存、登录、部署和安全问题的判断。

- [从 0x00 到 bit、byte、二进制、十六进制：讲清计算机底层表示](./blog/computer-science-basics/computer-bits-bytes-binary-hex.md)
- [常见网络协议入门：从 IP 地址到 HTTP，一篇搞懂网络通信基础](./blog/computer-science-basics/network-protocols-ip-http-security-basics.md)
- [TCP 三次握手：别只会背 SYN、SYN-ACK、ACK](./blog/computer-science-basics/tcp-three-way-handshake.md)
- [HTTP 缓存机制详解：从 Cache-Control 到 ETag 与 Cache Busting](./blog/computer-science-basics/http-cache-control-etag-cache-busting.md)
- [Linux 终端入门：新手必须掌握的常用命令和基本思路](./blog/computer-science-basics/linux-terminal-basic-commands-introduction.md)
- [Git 和 GitHub 入门：从版本控制到团队协作，一篇文章讲清楚](./blog/computer-science-basics/git-github-version-control-introduction.md)
- [如何写好 Git Commit Message：一份实用的提交信息指南](./blog/computer-science-basics/git_commit_message.md)
- [Docker 入门：为什么容器化是应用部署绕不开的一步](./blog/deployment-devops/docker-containerization-introduction.md)
- [GitHub Actions 入门：从自动测试到自动部署，理解 CI/CD 的基本流程](./blog/deployment-devops/github-actions-ci-cd-introduction.md)
- [Web 安全基础：同源策略、SameSite Cookie 与 CORS 详解](./blog/web-security/web-security-same-origin-samesite-cors.md)
- [前端安全入门：从 XSS 到 dangerouslySetInnerHTML，再到 DOMPurify](./blog/web-security/frontend-xss-dangerouslysetinnerhtml-dompurify.md)

</details>

<details>
<summary><strong>B. 前端工程化基础</strong></summary>

这里关注的是“代码怎么组织”。组件、Hook、工具函数、目录结构、TypeScript 类型设计，这些东西短期看只是写法，长期看会决定项目能不能继续迭代。

- [为什么现代前端一定要学工程化？](./blog/frontend-engineering/why-modern-frontend-needs-engineering.md)
- [从零搭建企业级 Mono Repo 工程：前端高薪必备技能](./blog/frontend-engineering/enterprise-monorepo-engineering.md)
- [React 项目目录结构怎么设计：从基础分层到真实业务落地](./blog/react-fundamentals/react-project-directory-structure.md)
- [Next.js 项目目录结构怎么设计？从入门到进阶的三种组织方式](./blog/react-fundamentals/nextjs-project-directory-structure-patterns.md)
- [从能写 React 到写好 React：提升前端工程性的 17 个实践](./blog/react-fundamentals/react-engineering-17-practices.md)
- [React 复用思维入门：什么时候写组件，什么时候写工具函数，什么时候写自定义 Hook？](./blog/react-fundamentals/react-reuse-components-utils-custom-hooks.md)
- [React Context 进阶：Provider Pattern 的正确打开方式](./blog/react-fundamentals/react-context-provider-pattern.md)
- [Promise 的理解与应用：从异步结果容器到 async/await 实战](./blog/react-fundamentals/javascript-promise-understanding.md)
- [从 JSX 到 TSX：React 开发者必须掌握的 TypeScript 基础](./blog/react-fundamentals/react-jsx-to-tsx-typescript-basics.md)
- [TypeScript Generics 泛型的理解与应用](./blog/react-fundamentals/typescript-generics-understanding.md)
- [Type Alias 还是 Interface：TypeScript 类型设计里的工程取舍](./blog/react-fundamentals/typescript-type-alias-vs-interface-engineering-tradeoffs.md)

</details>

<details>
<summary><strong>C. React / Next.js 项目实践</strong></summary>

这一组更偏 React 和 Next.js 日常项目：Hooks、组件行为、服务端组件、路由、缓存、图片、性能和 UI 工程实践。

- [深入探讨 React 的核心工作原理](./blog/react-fundamentals/react-core-working-principles.md)
- [React Fiber 深度解析：从卡顿到流畅的革命性架构升级](./blog/react-fundamentals/react-fiber-architecture.md)
- [React Hooks 底层原理深度解析：从数组到链表的魔法](./blog/react-fundamentals/react-hooks-internals-array-linked-list.md)
- [React useState 和 useEffect 入门：为什么这两个 Hook 最容易被用错？](./blog/react-fundamentals/react-usestate-useeffect-beginner-pitfalls.md)
- [React 数据请求不要只会 useEffect：从 loading、error 到竞态处理的工程化封装](./blog/react-fundamentals/react-useeffect-fetch-request-hook.md)
- [React useMemo 怎么理解：缓存计算结果和稳定引用的工程化场景](./blog/react-fundamentals/react-usememo-reference-performance.md)
- [React 性能优化：深入理解 useMemo 的作用、场景与最佳实践](./blog/react-fundamentals/react-usememo-performance-best-practices.md)
- [React useCallback 的理解与应用：不是加速函数，而是稳定函数引用](./blog/react-fundamentals/react-usecallback-stable-function-reference.md)
- [React useRef 的理解与应用：跨渲染持久存在的值容器](./blog/react-fundamentals/react-useref-persistent-box.md)
- [React 大列表优化落地：从普通 map 到 react-window / react-virtualized 的工程化封装](./blog/react-fundamentals/react-large-list-virtualization.md)
- [React Server Components 是什么：讲清 CSR、Server Components 与 Next.js 客户端/服务端组件](./blog/react-fundamentals/react-server-components-csr-nextjs.md)
- [Next.js Route Handler 入门：理解 NextRequest 与 NextResponse](./blog/react-fundamentals/nextjs-route-handler-nextrequest-nextresponse.md)
- [Next.js proxy.ts 入门：从 middleware.ts 迁移到 proxy.ts，并实现重定向、matcher 与 Cookie 操作](./blog/react-fundamentals/nextjs-proxy-middleware-migration.md)
- [Next.js Link 组件详解：什么时候应该关闭 `prefetch`？](./blog/react-fundamentals/nextjs-link-prefetch-behavior.md)
- [Next.js 路由预加载详解：如何用 `router.prefetch` 提升页面跳转体验](./blog/react-fundamentals/nextjs-router-prefetch-navigation.md)
- [Next.js Intercepting Routes 详解：如何实现“路由变了，但页面以弹窗打开”](./blog/react-fundamentals/nextjs-intercepting-routes-modal.md)
- [Next.js Parallel Routes 详解：如何让一个页面同时渲染多个独立区域](./blog/react-fundamentals/nextjs-parallel-routes-independent-regions.md)
- [Next.js 16 Cache Components 完整代码示例：讲清 Suspense、`use cache` 和 `cacheLife`](./blog/data-fetching-realtime/nextjs-cache-components-suspense-use-cache.md)
- [Next.js 16 Cache Components 入门：如何用 `use cache` 和 Suspense 优化页面性能](./blog/data-fetching-realtime/nextjs-16-cache-components-use-cache-suspense.md)
- [Next.js Image 组件入门：为什么一张图片也值得认真优化？](./blog/react-fundamentals/nextjs-image-component-optimization.md)
- [Next.js Image 组件实战：5 种常见图片布局与优化方案](./blog/react-fundamentals/nextjs-image-common-layouts-practices.md)
- [Next.js Image 响应式图片优化实践：别只写四个必填属性](./blog/react-fundamentals/nextjs-image-responsive-optimization-practices.md)
- [Next.js 性能优化实战：用 dynamic 懒加载降低首屏 JavaScript 体积](./blog/react-fundamentals/nextjs-dynamic-import-performance.md)
- [在 Next.js 中使用 Sonner 实现 Toast 通知](./blog/react-fundamentals/nextjs-sonner-toast-notifications.md)
- [React / Next.js 中生成二维码的三种方式：客户端生成、服务端生成与外部 API 方案](./blog/react-fundamentals/react-nextjs-qr-code-generation.md)
- [TanStack Start 入门：一个基于 TanStack Router 的全栈 React 框架到底解决了什么问题？](./blog/react-fundamentals/tanstack-start-fullstack-react-framework-introduction.md)
- [TanStack Table 入门：为什么它是 React 表格开发里的“表格引擎”](./blog/react-fundamentals/tanstack-table-react-table-engine.md)
- [用 TanStack Table、React Query 和 shadcn/ui 搭一个可维护的数据表格架构](./blog/react-fundamentals/tanstack-table-react-query-shadcn-architecture.md)

</details>

<details>
<summary><strong>D. 状态管理与数据请求</strong></summary>

这部分主要处理两个问题：数据从哪里来，以及状态应该放在哪里。很多前端复杂度不是组件多，而是 server state、client state、缓存、筛选条件和持久化状态混在一起。

- [Axios 快速入门：从基础请求到拦截器、全局配置与错误处理](./blog/data-fetching-realtime/axios-basics-interceptors-error-handling.md)
- [从 Axios 到统一请求层：实际项目中的 Fetcher 应该怎么设计？](./blog/data-fetching-realtime/axios-unified-fetcher-request-layer.md)
- [React 博客项目中使用 Axios + JSON Server 实现完整 CRUD](./blog/data-fetching-realtime/react-axios-json-server-crud.md)
- [React Query 不只是 useQuery：前端项目中更可维护的数据请求组织方式](./blog/data-fetching-realtime/react-query-maintainable-data-requests.md)
- [React Query 入门教程：从 useQuery 到 useMutation，彻底理解服务端状态管理](./blog/data-fetching-realtime/react-query-usequery-usemutation-introduction.md)
- [React Query 与 Server Components：在 Next.js 中到底该怎么配合使用？](./blog/data-fetching-realtime/react-query-server-components-nextjs.md)
- [从零实现 React Query 的 useQuery 钩子：深入理解其核心机制](./blog/data-fetching-realtime/react-query-usequery-from-scratch.md)
- [TanStack Query 项目落地：从 queryKey、缓存失效到无限分页的工程化封装](./blog/data-fetching-realtime/tanstack-query-querykey-cache-infinite.md)
- [Redux Toolkit 项目落地：从 slice、thunk 到可维护的前端状态管理](./blog/state-management/redux-toolkit-project-state-management.md)
- [Zustand 项目落地：从全局状态、Store 拆分到真实业务封装](./blog/state-management/zustand-project-state-management.md)
- [Zustand 入门教程：React 状态管理从本地状态到全局 Store](./blog/state-management/zustand-react-state-management-introduction.md)
- [Zustand 最佳实践：别只会 create Store，真正项目里要这样组织状态](./blog/state-management/zustand-store-organization-best-practices.md)
- [Zustand persist 中间件详解：让 Store 状态刷新后不丢失](./blog/state-management/zustand-persist-middleware.md)
- [Zustand 为什么要用 Selector？顺便讲清楚如何自动生成 Selector](./blog/state-management/zustand-selector-auto-generation.md)
- [React Query 和 Zustand 如何正确组合：别再把服务端数据重复塞进 Store 了](./blog/state-management/react-query-zustand-state-boundary.md)
- [React localStorage 不只是 setItem：用 useSyncExternalStore 做一个可订阅的本地状态 Hook](./blog/state-management/react-localstorage-usesyncexternalstore-hook.md)

</details>

<details>
<summary><strong>E. 实时通信与交易数据流</strong></summary>

这里是我很关注的一条线：实时数据不是收到消息后 `setState`。交易页里的行情、盘口、K 线、订单、账户、持仓，都需要先有快照，再有增量推送，还要考虑断线重连、缓存同步、组件消费和状态边界。

- [前端 SSE 入门到实战：原理、用法、踩坑和最佳实践](./blog/data-fetching-realtime/frontend-sse-introduction-practices.md)
- [前端如何落地 SSE：从实时评论到可复用的实时数据 Hook](./blog/data-fetching-realtime/frontend-sse-realtime-hook.md)
- [前端如何用 @microsoft/fetch-event-source 落地 SSE：比原生 EventSource 更灵活的实时推送方案](./blog/data-fetching-realtime/frontend-fetch-event-source-sse.md)
- [TypeScript 中如何优雅实现 Server-Sent Events：基于 Effect 的实时同步方案](./blog/data-fetching-realtime/typescript-effect-sse-realtime-sync.md)
- [React / Next.js 中如何落地 MQTT 单例客户端：从实时行情订阅到引用计数管理](./blog/data-fetching-realtime/nextjs-mqtt-singleton-client.md)
- [HTTP 快照 + MQTT 实时推送：一种更稳的前端实时数据架构](./blog/data-fetching-realtime/http-snapshot-mqtt-realtime-architecture.md)
- [实时数据到底怎么落地？用「HTTP 快照 + MQTT 推送 + 状态管理」讲清楚](./blog/data-fetching-realtime/http-snapshot-mqtt-state-management.md)
- [Web3 前端实时通信如何落地：从 SSE 订阅到行情、订单与账户状态更新](./blog/web3-frontend/web3-frontend-realtime-sse-implementation.md)
- [从 MQTT 单例客户端到 Zustand 行情 Store：Next.js 交易所实时行情系统实践](./blog/trading-platform-frontend/nextjs-exchange-mqtt-zustand-market-data.md)

</details>

<details>
<summary><strong>F. 表单、上传、认证与权限</strong></summary>

这一组文章更偏业务入口：登录、注册、找回密码、表单校验、文件上传、图片服务、JWT、路由保护、权限模型。重点不是“页面能提交”，而是错误处理、状态保存、鉴权边界和服务端校验。

- [为什么 React 表单推荐使用 React Hook Form + Zod？](./blog/forms-uploads/react-hook-form-zod-recommended-pattern.md)
- [在 React 应用中使用 Zod 进行数据验证的全面教程与应用](./blog/forms-uploads/react-zod-data-validation.md)
- [React Hook Form 项目落地：从受控表单、Zod 校验到异步提交错误处理](./blog/forms-uploads/react-hook-form-zod-submit-errors.md)
- [React 多步骤表单工程化落地：从 Zod Schema、React Hook Form 到 Zustand 持久化](./blog/forms-uploads/react-multistep-form-zod-rhf-zustand.md)
- [React 文件上传不只是 input type=file：从状态建模、上传进度到工程化封装](./blog/forms-uploads/react-file-upload-state-progress.md)
- [React 多文件上传怎么做：从 File Input 到并发上传进度的工程化封装](./blog/forms-uploads/react-multi-file-upload-progress.md)
- [Next.js App Router 图片上传入门：从 file input、API Route 到签名 URL 和图片优化](./blog/forms-uploads/nextjs-app-router-image-upload-signed-url-optimization.md)
- [Next.js 图片上传工程落地：从 Uploadcare 上传组件到图片存储、展示与安全上传](./blog/forms-uploads/nextjs-uploadcare-image-upload-engineering.md)
- [前端媒体资源优化实践：用 ImageKit 优化图片、视频与上传体验](./blog/forms-uploads/frontend-media-optimization-imagekit.md)
- [React 中使用 Axios 实现登录表单与全局认证状态](./blog/auth-permissions/react-axios-login-auth-context.md)
- [React 认证不只是存 Token：JWT、Access Token、Refresh Token 的工程化落地](./blog/auth-permissions/react-jwt-auth-token-refresh.md)
- [JWT 完整入门指南：从原理、结构到 Token 与 Session 的区别](./blog/auth-permissions/jwt-token-session-complete-guide.md)
- [Next.js 登录模块怎么落地：React Hook Form + Zod + Zustand + API 完整链路](./blog/auth-permissions/nextjs-login-rhf-zod-zustand-api.md)
- [Next.js 注册模块怎么落地：React Hook Form + Zod + API 的完整链路](./blog/auth-permissions/nextjs-registration-rhf-zod-api.md)
- [Next.js 找回密码模块怎么落地：React Hook Form + Zod + API 完整链路](./blog/auth-permissions/nextjs-password-reset-rhf-zod-api.md)
- [从请求层到路由保护：Next.js 项目用户鉴权完整实践](./blog/auth-permissions/nextjs-user-authentication-request-route-protection.md)
- [Next.js 认证不只是登录表单：从 Server Action、JWT Cookie 到 Middleware 的工程化落地](./blog/auth-permissions/nextjs-server-action-jwt-cookie-auth.md)
- [Next.js 认证不只是保护页面：从 Middleware、Server Action 到 Data Access Layer 的工程化实践](./blog/auth-permissions/nextjs-auth-middleware-server-action-dal.md)
- [Next.js 16 中 middleware.ts 改为 proxy.ts：认证逻辑到底应该放在哪里？](./blog/auth-permissions/nextjs-proxy-authentication-dal.md)
- [权限系统到底该怎么设计？从 Role 判断到 RBAC，再到 ABAC](./blog/auth-permissions/permission-system-rbac-abac-design.md)

</details>

<details>
<summary><strong>G. Web3 与区块链基础</strong></summary>

Web3 前端不能只停留在“连钱包”。如果不理解 EVM、签名、授权、交易费用、智能合约钱包和代币标准，很难把前端状态、钱包交互和链上行为对齐。

- [EVM 完整入门指南：从 Stack、Memory、Calldata、Storage 到 Opcode 执行过程](./blog/blockchain-web3-fundamentals/evm-stack-memory-storage-opcodes-guide.md)
- [EIP-1559 详解：Ethereum 手续费机制如何从 Gas Price 走向 Base Fee](./blog/blockchain-web3-fundamentals/eip-1559-ethereum-fee-mechanism.md)
- [EIP-7702 详解：让 EOA 临时拥有智能合约能力，钱包体验会发生什么变化？](./blog/blockchain-web3-fundamentals/eip-7702-smart-eoa-delegation.md)
- [ERC-1271 与 CoW Protocol 智能订单：让智能合约也能“签名”下单](./blog/blockchain-web3-fundamentals/erc-1271-cow-protocol-smart-orders.md)
- [ERC20 Permit 详解：用签名完成授权，减少一次 approve 交易](./blog/blockchain-web3-fundamentals/erc20-permit-signature-approval.md)
- [Permit2 是什么：一次授权，多次签名，让 ERC20 支付更顺滑](./blog/blockchain-web3-fundamentals/permit2-erc20-signature-approval.md)
- [智能合约钱包和普通加密钱包有什么区别？](./blog/blockchain-web3-fundamentals/smart-contract-wallet-vs-crypto-wallet.md)
- [Web3 钱包安全指南：签名消息和发送交易时，钱包到底应该展示什么](./blog/blockchain-web3-fundamentals/web3-wallet-signature-transaction-security.md)
- [稳定币完整入门：从购买力、抵押机制到 DeFi 中的真实需求](./blog/blockchain-web3-fundamentals/stablecoin-defi-introduction.md)
- [Uniswap 流动性池入门：如何通过提供流动性赚取交易手续费](./blog/blockchain-web3-fundamentals/uniswap-liquidity-pool-introduction.md)

</details>

<details>
<summary><strong>H. Web3 前端工程落地</strong></summary>

这一组文章偏完整业务链路：钱包连接、SIWE 登录、多链适配、EVM 交互、签名、交易、IPFS 上传、充值提现、空投领取。重点是把链上状态、后端业务状态和前端缓存串起来。

- [Web3 前端如何落地 SIWE 钱包登录：从钱包连接到后端 Session](./blog/web3-frontend/web3-siwe-wallet-login-flow.md)
- [Reown AppKit 入门：前端如何快速接入 Web3 钱包连接能力](./blog/web3-frontend/reown-appkit-wallet-connect-introduction.md)
- [Reown AppKit + SIWE 项目落地：从钱包连接到后端登录态的完整前端方案](./blog/web3-frontend/reown-appkit-siwe-wallet-auth.md)
- [Web3 前端钱包模块如何落地：从钱包连接、SIWE 登录到业务账户状态同步](./blog/web3-frontend/web3-frontend-wallet-module-implementation.md)
- [Web3 前端多链适配如何落地：从钱包连接到签名、支付与交易分发](./blog/web3-frontend/web3-frontend-multichain-adapter-implementation.md)
- [Web3 前端 EVM 交互如何落地：从切链、签名到 ERC20 支付与合约领奖](./blog/web3-frontend/web3-frontend-evm-interaction-implementation.md)
- [Web3 前端交易系统如何落地：从下单 UI 到 Operation 编码、签名与实时状态更新](./blog/web3-frontend/web3-frontend-trading-system-implementation.md)
- [Web3 前端如何落地 IPFS 上传：从 Token Logo 到 Metadata JSON](./blog/web3-frontend/web3-frontend-ipfs-upload-implementation.md)
- [Web3 空投领取前端怎么落地：从 React Query、钱包切链到链上 Claim 的完整工程封装](./blog/web3-frontend/web3-airdrop-claim-frontend-flow.md)
- [Web3 前端如何落地充值与提现模块：以 Next.js + 钱包签名 + 后端执行为例](./blog/web3-frontend/web3-deposit-withdrawal-flow.md)
- [多链支付前端怎么封装：从钱包适配器到统一 usePay 的工程化落地](./blog/web3-frontend/multichain-payment-frontend-usepay.md)

</details>

<details>
<summary><strong>I. 交易平台前端与金融市场</strong></summary>

交易平台前端不是普通 CRUD 页面。它同时涉及行情、盘口、K 线、下单、撤单、持仓、保证金、订单状态和风险展示。这里也放了一些金融市场基础文章，帮助把业务概念和前端模块对应起来。

- [从 MQTT 单例客户端到 Zustand 行情 Store：Next.js 交易所实时行情系统实践](./blog/trading-platform-frontend/nextjs-exchange-mqtt-zustand-market-data.md)
- [从交易对切换到下单撤单：Next.js 现货交易页完整实践](./blog/trading-platform-frontend/nextjs-spot-trading-page-implementation.md)
- [从开多开空到一键平仓：Next.js 合约交易页完整实践](./blog/trading-platform-frontend/nextjs-futures-trading-page-implementation.md)
- [写给 Web3 新人的加密货币交易入门：从现货、USDT 到合约交易](./blog/financial-markets/crypto-spot-usdt-futures-trading-introduction.md)
- [写给 Web3 从业者的期货入门：从合约规格、保证金到永续合约](./blog/financial-markets/futures-margin-perpetual-contracts-introduction.md)
- [给投资小白的一次系统扫盲：从余额宝、债券、股票到基金](./blog/financial-markets/investment-basics-stocks-bonds-funds.md)

</details>

<details>
<summary><strong>J. 数据可视化与 AI Coding Agent 工作流</strong></summary>

这里放数据可视化和 AI Coding Agent 相关内容。AI 工具不是为了替代工程判断，而是进入调研、代码维护、文档沉淀和长期项目上下文管理。

- [D3.js 入门：它不只是画图，更是把数据映射成可视化图形的工具](./blog/data-visualization/d3js-data-visualization-introduction.md)
- [AI 辅助前端工作流入门：从 shadcn/ui、Figma 到 Builder.io，前端开发方式正在怎么变？](./blog/react-fundamentals/ai-assisted-frontend-workflow-shadcn-figma-builderio.md)
- [Codex App 完整教程：从安装、项目管理到插件、Skills、MCP 与电脑自动化](./blog/ai-tools-workflows/codex-app-complete-guide.md)
- [我是如何用 Codex 维护长期项目的：从项目管理、文件记忆到局部 Skill](./blog/ai-tools-workflows/codex-long-term-project-maintenance.md)
- [Codex 官方最佳实践解读：如何更高效地管理线程、工具、自动化和长期项目](./blog/ai-tools-workflows/codex-official-best-practices.md)
- [OpenClaw 入门：为什么它不只是一个 AI 聊天机器人，而是个人 AI 助手框架？](./blog/ai-tools-workflows/openclaw-personal-ai-assistant-framework-introduction.md)

</details>

## 推荐阅读路线

### 路线 1：前端工程化入门到项目落地

从基础工具和语言能力开始，再进入 React / Next.js 的项目组织方式。

1. [Linux 终端入门](./blog/computer-science-basics/linux-terminal-basic-commands-introduction.md)
2. [Git 和 GitHub 入门](./blog/computer-science-basics/git-github-version-control-introduction.md)
3. [从 JSX 到 TSX：React 开发者必须掌握的 TypeScript 基础](./blog/react-fundamentals/react-jsx-to-tsx-typescript-basics.md)
4. [React useState 和 useEffect 入门](./blog/react-fundamentals/react-usestate-useeffect-beginner-pitfalls.md)
5. [React 项目目录结构怎么设计](./blog/react-fundamentals/react-project-directory-structure.md)
6. [从 Axios 到统一请求层：实际项目中的 Fetcher 应该怎么设计？](./blog/data-fetching-realtime/axios-unified-fetcher-request-layer.md)
7. [React Query 不只是 useQuery](./blog/data-fetching-realtime/react-query-maintainable-data-requests.md)
8. [Zustand 最佳实践](./blog/state-management/zustand-store-organization-best-practices.md)
9. [Next.js 项目目录结构怎么设计？](./blog/react-fundamentals/nextjs-project-directory-structure-patterns.md)

### 路线 2：实时通信与交易平台前端

从网络和请求层入手，再到缓存、实时推送、行情 Store 和交易页面。

1. [常见网络协议入门](./blog/computer-science-basics/network-protocols-ip-http-security-basics.md)
2. [HTTP 缓存机制详解](./blog/computer-science-basics/http-cache-control-etag-cache-busting.md)
3. [Axios 快速入门](./blog/data-fetching-realtime/axios-basics-interceptors-error-handling.md)
4. [React Query 入门教程](./blog/data-fetching-realtime/react-query-usequery-usemutation-introduction.md)
5. [React Query 和 Zustand 如何正确组合](./blog/state-management/react-query-zustand-state-boundary.md)
6. [前端 SSE 入门到实战](./blog/data-fetching-realtime/frontend-sse-introduction-practices.md)
7. [React / Next.js 中如何落地 MQTT 单例客户端](./blog/data-fetching-realtime/nextjs-mqtt-singleton-client.md)
8. [HTTP 快照 + MQTT 实时推送](./blog/data-fetching-realtime/http-snapshot-mqtt-realtime-architecture.md)
9. [交易所实时行情系统实践](./blog/trading-platform-frontend/nextjs-exchange-mqtt-zustand-market-data.md)
10. [Next.js 现货交易页完整实践](./blog/trading-platform-frontend/nextjs-spot-trading-page-implementation.md)
11. [Next.js 合约交易页完整实践](./blog/trading-platform-frontend/nextjs-futures-trading-page-implementation.md)

### 路线 3：Web3 前端

先补齐链上基础，再进入钱包、签名、交易、多链和后端状态同步。

1. [EVM 完整入门指南](./blog/blockchain-web3-fundamentals/evm-stack-memory-storage-opcodes-guide.md)
2. [Web3 钱包安全指南](./blog/blockchain-web3-fundamentals/web3-wallet-signature-transaction-security.md)
3. [Web3 前端如何落地 SIWE 钱包登录](./blog/web3-frontend/web3-siwe-wallet-login-flow.md)
4. [Reown AppKit 入门](./blog/web3-frontend/reown-appkit-wallet-connect-introduction.md)
5. [ERC20 Permit 详解](./blog/blockchain-web3-fundamentals/erc20-permit-signature-approval.md)
6. [Web3 前端多链适配如何落地](./blog/web3-frontend/web3-frontend-multichain-adapter-implementation.md)
7. [Web3 前端 EVM 交互如何落地](./blog/web3-frontend/web3-frontend-evm-interaction-implementation.md)
8. [多链支付前端怎么封装](./blog/web3-frontend/multichain-payment-frontend-usepay.md)
9. [Web3 前端如何落地充值与提现模块](./blog/web3-frontend/web3-deposit-withdrawal-flow.md)
10. [Web3 前端交易系统如何落地](./blog/web3-frontend/web3-frontend-trading-system-implementation.md)
11. [Web3 空投领取前端怎么落地](./blog/web3-frontend/web3-airdrop-claim-frontend-flow.md)

## 写作风格

这些文章通常不会只停留在“怎么调用 API”。我更习惯按下面的顺序写：

1. 先说明这个技术解决什么问题。
2. 给出最小可运行写法，让读者先跑通。
3. 再分析真实项目里会出现的问题，比如状态重复、请求散落、缓存失效、权限绕过、实时数据错乱。
4. 最后给出工程化封装方式，包括目录结构、Hook 设计、service 层、状态边界、组件消费方式和适用边界。

代码示例尽量使用 TypeScript / TSX。Web3 相关内容会尽量把钱包、签名、交易、后端状态、前端缓存之间的关系讲清楚，而不是只停留在“连接钱包成功”。

## 适合读者

- 正在做 React / Next.js 项目的前端开发者。
- 想提升工程化能力，而不是只会堆页面代码的前端。
- 做 SaaS、中后台、交易平台、Web3 应用的人。
- 想理解 Web3 前端真实链路的人：钱包、签名、交易、链上状态、后端业务状态和前端缓存。
- 想用 AI Coding Agent 辅助长期项目维护、技术写作和文档沉淀的人。

## 维护约定

- 文件名使用英文小写和连字符，例如 `react-query-maintainable-data-requests.md`。
- 每篇文章只保留一个一级标题。
- 代码块使用带语言标识的 fenced code block，例如 `ts`、`tsx`、`txt`。
- 新文章放入 `blog/` 下对应分类目录。
- 新增或移动文章后，同步更新本 README 的内容地图。
- 新主题可以新增分类，但不要把所有文章堆进一个杂项目录。

## License

当前仓库未声明开源许可证。如需公开分发、转载或商业使用，请先补充明确的 License。
