# blog_pages

这个仓库用于存放前端工程化与 Web3 前端实践相关的 Markdown 技术文章。内容以“项目落地”为主，不只写 API 用法，而是围绕真实业务里的状态边界、目录拆分、异步流程、认证链路、请求封装、钱包适配和组件消费方式展开。

文章主要覆盖 React、Next.js、状态管理、表单、文件上传、数据请求、实时通信、D3 可视化，以及 Web3 登录、支付、充值提现等方向。

## 内容定位

这些文章更适合作为：

- 技术博客草稿或发布源文件。
- 团队内部前端工程化经验沉淀。
- React / Next.js / Web3 前端项目的实践参考。
- 组件封装、Hook 设计、状态边界设计的案例库。

它不是一个可运行的应用项目，也不包含统一构建脚本。当前仓库的核心资产是根目录下的 Markdown 文档。

## 文章目录

### React 基础工程化

- [React 项目目录结构怎么设计：从页面、组件到业务模块拆分](./react-project-directory-structure.md)
- [React useEffect 请求封装：从页面请求到可复用 Hook](./react-useeffect-fetch-request-hook.md)
- [React 状态持久化不只是 localStorage：从简单计数器到可复用 usePersistedState 封装](./react-persisted-state-localstorage-hook.md)

### 状态管理

- [Redux Toolkit 项目落地：从 slice、thunk 到可维护的前端状态管理](./redux-toolkit-project-state-management.md)
- [Zustand 项目落地：从全局状态、Store 拆分到真实业务封装](./zustand-project-state-management.md)
- [React Query 和 Zustand 状态边界：server state 与 client state 怎么拆](./react-query-zustand-state-boundary.md)

### 数据请求与实时通信

- [React Query 项目落地：从接口请求到可维护的数据层封装](./react-query-maintainable-data-requests.md)
- [前端 SSE 实时通信怎么封装：从 EventSource 到业务 Hook](./frontend-sse-realtime-hook.md)
- [fetch-event-source SSE 实践：从普通请求到可控的实时连接](./frontend-fetch-event-source-sse.md)

### 表单与上传

- [React Hook Form 项目落地：从受控表单、Zod 校验到异步提交错误处理](./react-hook-form-zod-submit-errors.md)
- [React 多步骤表单工程化落地：从 Zod Schema、React Hook Form 到 Zustand 持久化](./react-multistep-form-zod-rhf-zustand.md)
- [React 文件上传不只是 input type=file：从状态建模、上传进度到工程化封装](./react-file-upload-state-progress.md)
- [React 多文件上传怎么做：从 File Input 到并发上传进度的工程化封装](./react-multi-file-upload-progress.md)

### 认证与权限

- [React 认证不只是存 Token：JWT、Access Token、Refresh Token 的工程化落地](./react-jwt-auth-token-refresh.md)
- [Next.js 认证不只是登录表单：从 Server Action、JWT Cookie 到 Middleware 的工程化落地](./nextjs-server-action-jwt-cookie-auth.md)
- [Next.js 认证不只是保护页面：从 Middleware、Server Action 到 Data Access Layer 的工程化实践](./nextjs-auth-middleware-server-action-dal.md)

### Web3 前端

- [Web3 SIWE 钱包登录：从签名认证到业务登录态](./web3-siwe-wallet-login-flow.md)
- [Reown AppKit + SIWE 项目落地：从钱包连接到后端登录态的完整前端方案](./reown-appkit-siwe-wallet-auth.md)
- [Web3 充值提现流程：从链上交易到后端状态同步](./web3-deposit-withdrawal-flow.md)
- [多链支付前端怎么封装：从钱包适配器到统一 usePay 的工程化落地](./multichain-payment-frontend-usepay.md)

### 数据可视化

- [D3.js 入门：它不只是画图，更是把数据映射成可视化图形的工具](./d3js-data-visualization-introduction.md)

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
- 新增文章后同步更新本 README 的文章目录。
- 如果文章属于新主题，可以在目录中新增分类，而不是把所有文章堆在一个列表里。

## License

当前仓库未声明开源许可证。如需公开分发、转载或商业使用，请先补充明确的 License。
