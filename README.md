# blog_pages

这个仓库用于存放前端工程化与 Web3 前端实践相关的 Markdown 技术文章。内容以“项目落地”为主，不只写 API 用法，而是围绕真实业务里的状态边界、目录拆分、异步流程、认证链路、请求封装、钱包适配和组件消费方式展开。

文章主要覆盖 React、Next.js、状态管理、表单、文件上传、数据请求、实时通信、D3 可视化，以及 Web3 登录、支付、充值提现等方向。

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
- [Linux 终端入门：新手必须掌握的常用命令和基本思路](./blog/computer-science-basics/linux-terminal-basic-commands-introduction.md)

### AI 工具与工作流

- [OpenClaw 入门：为什么它不只是一个 AI 聊天机器人，而是个人 AI 助手框架？](./blog/ai-tools-workflows/openclaw-personal-ai-assistant-framework-introduction.md)

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

- [Next.js 16 Cache Components 完整代码示例：讲清 Suspense、use cache 和 cacheLife](./blog/data-fetching-realtime/nextjs-cache-components-suspense-use-cache.md)
- [TanStack Query 项目落地：从 queryKey、缓存失效到无限分页的工程化封装](./blog/data-fetching-realtime/tanstack-query-querykey-cache-infinite.md)
- [React Query 项目落地：从接口请求到可维护的数据层封装](./blog/data-fetching-realtime/react-query-maintainable-data-requests.md)
- [从零实现 React Query 的 useQuery 钩子：深入理解其核心机制](./blog/data-fetching-realtime/react-query-usequery-from-scratch.md)
- [前端 SSE 实时通信怎么封装：从 EventSource 到业务 Hook](./blog/data-fetching-realtime/frontend-sse-realtime-hook.md)
- [fetch-event-source SSE 实践：从普通请求到可控的实时连接](./blog/data-fetching-realtime/frontend-fetch-event-source-sse.md)

### 表单与上传

- [在 React 应用中使用 Zod 进行数据验证的全面教程与应用](./blog/forms-uploads/react-zod-data-validation.md)
- [React Hook Form 项目落地：从受控表单、Zod 校验到异步提交错误处理](./blog/forms-uploads/react-hook-form-zod-submit-errors.md)
- [React 多步骤表单工程化落地：从 Zod Schema、React Hook Form 到 Zustand 持久化](./blog/forms-uploads/react-multistep-form-zod-rhf-zustand.md)
- [React 文件上传不只是 input type=file：从状态建模、上传进度到工程化封装](./blog/forms-uploads/react-file-upload-state-progress.md)
- [React 多文件上传怎么做：从 File Input 到并发上传进度的工程化封装](./blog/forms-uploads/react-multi-file-upload-progress.md)
- [Next.js App Router 图片上传入门：从 file input、API Route 到签名 URL 和图片优化](./blog/forms-uploads/nextjs-app-router-image-upload-signed-url-optimization.md)
- [Next.js 图片上传工程落地：从 Uploadcare 上传组件到图片存储、展示与安全上传](./blog/forms-uploads/nextjs-uploadcare-image-upload-engineering.md)

### 认证与权限

- [React 认证不只是存 Token：JWT、Access Token、Refresh Token 的工程化落地](./blog/auth-permissions/react-jwt-auth-token-refresh.md)
- [Next.js 认证不只是登录表单：从 Server Action、JWT Cookie 到 Middleware 的工程化落地](./blog/auth-permissions/nextjs-server-action-jwt-cookie-auth.md)
- [Next.js 认证不只是保护页面：从 Middleware、Server Action 到 Data Access Layer 的工程化实践](./blog/auth-permissions/nextjs-auth-middleware-server-action-dal.md)

### Web3 前端

- [Web3 SIWE 钱包登录：从签名认证到业务登录态](./blog/web3-frontend/web3-siwe-wallet-login-flow.md)
- [Reown AppKit 入门：前端如何快速接入 Web3 钱包连接能力](./blog/web3-frontend/reown-appkit-wallet-connect-introduction.md)
- [Reown AppKit + SIWE 项目落地：从钱包连接到后端登录态的完整前端方案](./blog/web3-frontend/reown-appkit-siwe-wallet-auth.md)
- [Web3 空投领取前端怎么落地：从 React Query、钱包切链到链上 Claim 的完整工程封装](./blog/web3-frontend/web3-airdrop-claim-frontend-flow.md)
- [Web3 充值提现流程：从链上交易到后端状态同步](./blog/web3-frontend/web3-deposit-withdrawal-flow.md)
- [多链支付前端怎么封装：从钱包适配器到统一 usePay 的工程化落地](./blog/web3-frontend/multichain-payment-frontend-usepay.md)

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
