# AI 辅助前端工作流入门：从 shadcn/ui、Figma 到 Builder.io，前端开发方式正在怎么变？

过去做一个新项目，前端开发通常会经历一条比较固定的路线：先搭项目，再选 UI 库，然后设计师在 Figma 里画稿，开发再根据设计稿实现页面。如果是后台、SaaS、Dashboard 这类项目，还要重复处理布局、表格、卡片、图表、侧边栏、空状态、加载态、响应式等大量基础工作。

现在 AI Coding Agent 出现之后，很多人会直接让 AI 帮自己“生成一个页面”。但很快就会遇到一个问题：AI 确实能写代码，但如果项目一开始没有清晰的设计系统、组件规范和代码基础，它生成出来的东西很容易风格不统一、组件不复用、代码很散。

所以真正高效的 AI 前端工作流，不是简单地对 AI 说“帮我做一个 dashboard”，而是先给 AI 准备好合适的上下文：设计系统、组件库、现有代码、Figma 设计稿、项目结构和目标页面。

这篇文章就从初学者角度，介绍一种正在变得越来越常见的前端开发方式：使用 shadcn/ui 快速建立设计系统，用 Claude Code 这类 Agent 生成和调整代码，用 Figma 补充设计细节，再用 Builder.io 这类工具把设计和现有代码仓库连接起来，形成一条更接近真实项目的 AI 辅助开发流程。

---

## 1. 这种工作流解决了什么问题

以前做一个新前端项目，大概会有几类常见痛点。

第一，项目初始 UI 很难统一。

你可能装了 Tailwind，也装了某个组件库，但按钮、卡片、输入框、表格、侧边栏到底长什么样，通常还要自己慢慢调。如果没有设计师，开发自己调 UI 很容易变成“能用但不精致”。

第二，AI 生成页面缺少上下文。

很多人第一次用 AI 写前端，会直接输入：

```txt
帮我生成一个 SaaS dashboard 页面
```

AI 可以生成，但问题是它不知道你的项目里有什么组件、什么颜色、什么间距、什么圆角、什么交互规范。结果就是页面看起来还行，但很难融入现有项目。

第三，从 Figma 到代码仍然很慢。

传统方式里，设计师在 Figma 中完成页面，开发再手动实现。哪怕有 AI，也经常需要截图、描述、来回调整。设计和代码之间缺少一个更顺畅的连接方式。

第四，现有项目改 UI 很麻烦。

很多 AI builder 适合从零生成页面，但真实工作里更多时候不是从零开始，而是在一个已经存在的项目里增加一个 banner、一个空状态、一个 loading skeleton、一个详情抽屉或一个 dashboard 区块。

这类工作流主要解决的是：如何让 AI 在已有设计系统、已有组件和已有代码基础上，更稳定地生成可用的前端代码。

它解决的不是某一个单点技术问题，而是前端开发体验和协作效率问题。

适合的场景包括：

- 快速搭建 SaaS Dashboard。
- 做后台管理系统原型。
- 基于 shadcn/ui 搭产品界面。
- 把 Figma 设计转成现有项目代码。
- 在已有页面里增加新组件。
- 让 AI 根据项目设计系统生成 UI。
- 快速验证产品想法和交互方案。

不适合的场景也要明确：

- 对像素级设计要求极高的最终交付页面，仍然需要人工设计和代码 review。
- 对安全性、权限、支付、交易等关键逻辑，不能完全依赖 AI 自动生成。
- 大型项目的架构决策，不能只靠 AI 一次性生成。
- AI 生成的 PR 必须 review，不能直接合并上线。

---

## 2. 它是什么：基本概念介绍

这里说的“AI 辅助前端工作流”，不是单独某一个库，而是一组工具组合起来的开发方式。

核心工具可以分成几类。

### shadcn/ui：提供组件和设计系统基础

shadcn/ui 不是传统意义上的 npm UI 库。它更像是一套可复制到项目里的组件代码集合。

它的特点是：

- 基于 Tailwind CSS。
- 组件代码直接进入你的项目。
- 可以自由修改。
- 风格统一。
- 适合做后台、SaaS、Dashboard、表单、弹窗等产品 UI。

它解决的是：先给项目一个稳定的 UI 基础。

如果项目里已经有 Button、Card、Table、Dialog、Sidebar、Chart 这些组件，AI 后面生成页面时就更容易复用现有组件，而不是乱写一堆新的 `div`。

### shadcn/ui create：快速创建带风格的项目

shadcn/ui 提供了类似 create 的项目创建方式，可以让你在创建项目时选择风格、颜色、组件基础和 UI preset。

简单理解，它帮助你在项目一开始就确定：

- 使用什么组件方案。
- 使用什么颜色风格。
- 使用什么圆角、边框、间距感觉。
- 项目默认长什么样。

这比先创建一个空 Next.js 项目，再一点点配置 UI 要快很多。

### Blocks：更大的页面级组件

shadcn/ui 不只有基础组件，还有 blocks。

比如：

- dashboard block。
- sidebar block。
- authentication block。
- table block。
- chart block。
- form block。

基础组件像积木，block 更像已经搭好的一个页面片段。

这对 AI 工作流很重要。因为你可以先用 block 生成一个比较完整的基础页面，再让 AI 根据业务继续改。

### MCP Server：让 AI Agent 直接访问组件 registry

MCP 可以简单理解为一种让 AI 工具访问外部能力的协议。

shadcn/ui 的 MCP Server 可以让 Claude Code 这类 Agent 获取 registry 信息，比如有哪些组件、有哪些 blocks、怎么安装、怎么引入。

以前你可能要手动复制命令：

```bash
npx shadcn@latest add dashboard-01
```

现在你可以让 Agent 自己查 registry、找 block、安装组件、修改页面。

### Figma：补充定制设计

AI 可以生成界面，但产品真正做下去，总会有一些定制设计：

- 品牌色。
- 特定 banner。
- loading 状态。
- empty 状态。
- warning 状态。
- 移动端布局。
- 特定业务组件。

这时 Figma 仍然很重要。

不同的是，现在 Figma 不一定只是“设计师交给开发看的图”，它可以直接参与 AI 生成代码的流程。

### Builder.io：把 Figma、AI 和现有代码仓库连接起来

Builder.io 这类工具的价值在于，它不是只从零生成一个页面，而是可以连接已有 GitHub 仓库，理解现有项目，再基于 Figma 设计或自然语言需求生成代码，并创建 Pull Request。

这意味着它更接近真实团队工作流：

```txt
已有项目
  -> 导入 Figma 设计
  -> AI 根据现有组件实现
  -> 在线预览
  -> 生成 PR
  -> 人工 review
  -> 合并
```

这比“AI 生成一份孤立代码”更有实际价值。

---

## 3. 最简单的使用方式

我们先看一个最小流程：用 shadcn/ui 创建一个带设计系统基础的 Next.js 项目。

假设你要创建一个新的 dashboard 项目，可以先用 shadcn/ui 的 create 页面生成命令。命令大概类似：

```bash
npx shadcn@latest init
```

或者在创建项目时直接选择 Next.js、主题、组件风格等配置。

创建完项目后，启动项目：

```bash
npm run dev
```

项目里通常会出现一些基础组件，比如：

```txt
components/
  ui/
    button.tsx
    card.tsx
    input.tsx
    table.tsx
```

然后你就可以在页面里使用这些组件：

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function Page() {
  return (
    <main className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Usage Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Track token usage, spend, and model activity.
          </p>
          <Button className="mt-4">View Report</Button>
        </CardContent>
      </Card>
    </main>
  )
}
```

这个例子很简单，但它说明了这类工作流的核心：先让项目拥有一套可复用的 UI 语言。

这里的关键不是 Button 和 Card 本身，而是它们背后的设计系统：

- 颜色来自主题变量。
- 间距来自 Tailwind。
- 组件风格统一。
- 后续 AI 生成页面时可以复用这些组件。

如果没有这一步，你直接让 AI 写页面，它可能每次都写出不同风格的按钮和卡片。

---

## 4. 核心流程是怎么跑起来的

一个比较完整的 AI 辅助前端工作流，大概是这样跑起来的。

第一步，先创建项目基础。

你用 shadcn/ui create 或普通 Next.js 脚手架创建项目，并配置 Tailwind、组件库和主题。

第二步，选择设计风格。

比如选择某个 preset、颜色、圆角、风格，确保项目从一开始就有统一视觉基础。

第三步，引入 blocks。

如果你要做 dashboard，可以先引入 dashboard block；如果要做登录页，可以引入 authentication block。

这一步相当于给项目一个更完整的 UI 骨架。

第四步，让 AI Agent 在现有基础上修改。

比如对 Claude Code 说：

```txt
请基于当前 shadcn/ui 组件，把首页改成一个 AI usage SaaS dashboard。
保留现有设计系统，使用现有 Card、Button、Chart、Table 组件。
```

这时 AI 不是从零乱写，而是在已有组件基础上扩展。

第五步，在 Figma 中补充定制设计。

比如你需要一个“预算异常警告 banner”，可以在 Figma 里设计几种状态：

- default warning。
- critical alert。
- dismissible banner。
- mobile version。

第六步，把 Figma 设计导入 Builder.io。

Builder.io 可以读取设计，并结合已有 GitHub 仓库生成代码。

第七步，AI 在现有代码里实现组件。

它会检查项目结构、组件风格、已有 design system，然后创建对应组件，例如：

```txt
components/spend-anomaly-banner.tsx
```

再把它插入到页面中。

第八步，在线预览和视觉检查。

Builder.io 这类工具可以直接预览页面，甚至检查桌面端、移动端效果。

第九步，生成 Pull Request。

最终代码不是复制粘贴给你，而是进入一个 Git 分支，形成 PR。

第十步，人工 review、修改、合并。

这一步不能省。AI 可以提升速度，但代码质量、业务正确性和安全性仍然需要开发者把关。

---

## 5. 常用工具和核心能力介绍

### 5.1 shadcn/ui create：快速启动项目风格

shadcn/ui create 的价值在于快速确定项目 UI 基础。

它适合在新项目开始时使用。

你可以先选择：

- React / Next.js。
- 组件方案。
- 样式 preset。
- 颜色。
- light / dark mode。
- 基础组件。

示例流程：

```bash
npx shadcn@latest init
```

或者从 shadcn/ui 官网复制对应的初始化命令。

它真正解决的是项目初期的“不知道 UI 从哪里开始”。对于 AI 工作流来说，这一步尤其重要，因为 AI 需要一个稳定的设计上下文。

### 5.2 shadcn/ui blocks：快速获得页面骨架

如果组件是基础零件，blocks 就是已经搭好的模块。

比如 dashboard block 可能包含：

- sidebar。
- top nav。
- chart card。
- table。
- stats card。
- tabs。
- user menu。

添加 block 后，项目不再只是几个零散组件，而是有了一个完整页面雏形。

这时再让 AI 修改业务内容，效果通常会更好。

比如你可以让 AI 把通用 dashboard 改成：

```txt
AI Usage SaaS Dashboard
```

页面里可以包含：

- 本月 token 消耗。
- 模型调用次数。
- 预算使用进度。
- 异常消费告警。
- 最近请求记录。
- 团队使用排行。

这样 AI 有结构可以改，而不是从空白页面开始生成。

### 5.3 Claude Code / Coding Agent：在代码里执行修改

Claude Code、Codex、Cursor Agent 这类工具，本质上是能理解项目文件并直接修改代码的 AI Agent。

它们适合做：

- 添加组件。
- 修改页面布局。
- 调整样式。
- 接入已有组件。
- 重构文件。
- 生成 mock 数据。
- 根据错误提示修复代码。
- 运行检查命令。

一个比较好的提示词通常不是：

```txt
帮我做一个好看的页面
```

而是：

```txt
请基于当前项目已有的 shadcn/ui 组件，创建一个 AI usage dashboard。
要求：
1. 使用现有 Card、Button、Table、Chart 组件；
2. 保持当前 dark mode 风格；
3. 添加 usage stats、spend trend、recent requests 三个区域；
4. 不要引入新的 UI 库；
5. 组件拆分清晰。
```

AI 最怕上下文不清楚。越明确它应该复用什么、不要做什么，结果越稳定。

### 5.4 shadcn/ui MCP：让 Agent 访问组件 registry

MCP Server 的意义是让 AI Agent 不只是“看你当前项目”，还可以访问外部工具能力。

以 shadcn/ui MCP 为例，Agent 可以：

- 查询可用 registry。
- 查找 block。
- 获取安装命令。
- 添加组件。
- 理解组件依赖。

这样你就可以对 Agent 说：

```txt
请添加 shadcn 的 dashboard-01 block，并改造成 AI usage SaaS dashboard。
```

Agent 可以自己去查 block、安装组件、修改页面。

这比你手动查官网、复制命令、再让 AI 修改更顺。

### 5.5 Figma：设计定制组件和边界状态

AI 生成页面很快，但真实产品很难只靠默认 block。

你迟早会遇到这些定制状态：

- 空状态。
- 加载状态。
- 错误状态。
- 风险提示。
- 预算告警。
- 付款失败。
- 权限不足。
- 移动端变体。

这时 Figma 的价值就出来了。

比如你要做一个“消费异常告警 Banner”，可以先在 Figma 中设计：

- 普通 warning。
- critical alert。
- 可关闭状态。
- 不可关闭状态。
- mobile layout。

然后把设计交给 AI 工具生成代码。

关键点是：Figma 不再只是最终设计稿，也可以成为 AI 生成代码的视觉上下文。

### 5.6 Builder.io：从 Figma 到现有代码仓库

Builder.io 这类工具最值得注意的地方是：它可以连接已有 GitHub repo，而不是只生成一个孤立 demo。

它通常可以做几件事：

- 导入现有项目。
- 在线运行预览。
- 导入 Figma 设计。
- 结合现有组件实现页面。
- 生成代码修改。
- 创建 Pull Request。
- 继续在 PR 上迭代。
- 支持视觉模式调整样式。

这很像一个“设计到代码的 AI 中间层”。

传统方式：

```txt
Figma 设计
-> 开发看图实现
-> 本地改代码
-> 提 PR
```

AI 辅助方式：

```txt
Figma 设计
-> Builder.io 读取设计和项目代码
-> AI 实现组件
-> 在线预览
-> 生成 PR
-> 开发 review
```

它的价值不是替代开发，而是把重复性的 UI 实现和初稿搭建速度大幅提高。

---

## 6. 在真实业务里一般怎么组合使用

这种工作流在真实业务里通常不是单工具完成，而是多个工具配合。

一个比较自然的流程是：

```txt
shadcn/ui create
  -> 创建项目和设计系统基础
shadcn/ui blocks
  -> 快速搭建 dashboard / auth / sidebar 页面骨架
Claude Code + MCP
  -> 在本地项目里安装组件、修改页面、生成业务 UI
Figma
  -> 设计定制组件、品牌化页面、边界状态
Builder.io
  -> 把 Figma 设计落到已有代码仓库，并生成 PR
开发者
  -> review、修正业务逻辑、优化组件边界、合并代码
```

比如做一个 AI Usage Dashboard，可以这样组合。

第一阶段，用 shadcn/ui 创建项目，选择 dark mode 风格。

第二阶段，添加 dashboard block，得到 sidebar、chart、table、card 基础结构。

第三阶段，让 Claude Code 把页面改成 AI SaaS 场景：

- usage overview。
- spend trend。
- model usage。
- recent API calls。
- team usage table。

第四阶段，发现还缺一个业务定制组件：Spend Anomaly Banner。

第五阶段，在 Figma 中设计这个 banner 的普通状态和 critical 状态。

第六阶段，用 Builder.io 把 Figma 设计导入现有项目，让 AI 根据已有设计系统实现组件。

第七阶段，Builder.io 创建 PR。

第八阶段，开发者本地拉分支检查代码：

```bash
git checkout builder/spend-anomaly-banner
npm install
npm run dev
```

第九阶段，人工 review：

- 组件是否复用已有 Button / Card / Badge。
- `className` 是否合理。
- 响应式是否正常。
- 状态是否可控。
- 代码是否容易维护。
- 是否引入不必要依赖。

这个流程比“从零写页面”快很多，也比“完全让 AI 乱生成”稳定很多。

---

## 7. 常见误区和使用边界

### 误区一：以为 AI 可以直接替代设计系统

很多人会直接让 AI 生成页面，但没有任何组件基础和设计规范。

结果就是：

- 每个页面长得不一样。
- Button 样式不统一。
- Card 间距不统一。
- dark mode 适配混乱。
- 组件无法复用。

更合理的做法是：先建立基础设计系统，再让 AI 基于它生成页面。

shadcn/ui、Tailwind theme、CSS variables、组件命名规范，这些都是 AI 生成高质量代码的上下文。

### 误区二：以为 prompt 越短越好

比如：

```txt
做一个 dashboard
```

这种 prompt 太模糊。

AI 不知道：

- 用什么组件。
- 什么业务场景。
- 什么数据结构。
- 什么风格。
- 是否需要响应式。
- 是否允许新增依赖。
- 是否要拆组件。

更好的 prompt 是：

```txt
请基于当前 shadcn/ui 项目实现一个 AI usage dashboard。
使用已有 Card、Button、Table、Badge、Chart 组件。
页面包含 overview cards、spend trend、recent requests、budget alert。
保持 dark mode 风格，不要引入新的 UI 库。
```

AI 不是读心工具，上下文越清楚，结果越稳定。

### 误区三：以为 Figma 到代码可以完全自动化

Figma 设计可以作为 AI 输入，但不能保证 100% 自动生成生产级代码。

原因很简单：

- Figma 里没有完整业务逻辑。
- 设计稿不一定体现所有状态。
- 组件命名不一定和代码一致。
- 响应式规则可能不完整。
- 设计稿里的视觉层级不等于代码组件边界。

所以 Figma 到代码之后，一定要 review。

重点看：

- 是否复用已有组件。
- 是否写死数据。
- 是否产生重复组件。
- 是否破坏布局。
- 是否符合 accessibility。
- 是否适配移动端。

### 误区四：只看页面效果，不看代码质量

AI 生成的 UI 可能很好看，但代码不一定好。

比如：

- 一个文件 800 行。
- 所有数据写死在 JSX 里。
- `className` 超长且重复。
- 业务组件和 UI primitive 混在一起。
- 重复定义 Button 样式。
- 引入了没必要的第三方库。

所以看结果不能只看截图，还要看代码。

至少要检查：

- 组件是否拆分合理。
- 是否复用现有 UI 组件。
- 是否有重复逻辑。
- 是否符合项目目录规范。
- 是否有不必要依赖。
- TypeScript 类型是否清晰。

### 误区五：直接合并 AI 生成的 PR

Builder.io 这类工具可以生成 PR，这是非常好的工作流。

但 PR 不是终点，而是 review 的起点。

AI 生成 PR 后，开发者仍然要做几件事：

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

还要本地打开页面确认：

- 桌面端正常。
- 移动端正常。
- dark mode 正常。
- hover / click 正常。
- empty / loading / error 状态正常。

### 误区六：忽略响应式和边界状态

很多 AI 生成页面在默认桌面宽度下很好看，但换到移动端就乱了。

真实项目里要考虑：

- 小屏布局。
- 长文本。
- 空数据。
- loading。
- error。
- 权限不足。
- 数据过多。
- 弹窗溢出。
- 表格横向滚动。

这也是为什么 Figma 和 Builder.io 的视觉检查、移动端截图检查会变得重要。

---

## 8. 一个更完整的 TypeScript 示例

下面用一个简化示例展示：如何写一个适合 AI 工作流生成和维护的 `SpendAnomalyBanner` 组件。

它不是复杂业务代码，但体现了几个关键点：

- 类型清晰。
- 状态可控。
- 样式基于 shadcn/ui 风格。
- 可以被 AI 插入到 dashboard 页面。
- 支持 warning / critical 两种状态。
- 支持可关闭。

```tsx
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SpendAnomalySeverity = "warning" | "critical"

type SpendAnomalyBannerProps = {
  title: string
  description: string
  severity?: SpendAnomalySeverity
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
}

export function SpendAnomalyBanner({
  title,
  description,
  severity = "warning",
  dismissible = false,
  onDismiss,
  className,
}: SpendAnomalyBannerProps) {
  const isCritical = severity === "critical"

  return (
    <section
      className={cn(
        "flex items-start justify-between gap-4 rounded-xl border p-4 shadow-sm",
        isCritical
          ? "border-destructive/30 bg-destructive/10"
          : "border-amber-500/30 bg-amber-500/10",
        className,
      )}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            "mt-0.5 rounded-full p-2",
            isCritical ? "bg-destructive/15" : "bg-amber-500/15",
          )}
        >
          <AlertTriangle
            className={cn(
              "h-4 w-4",
              isCritical ? "text-destructive" : "text-amber-600",
            )}
          />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {dismissible ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          aria-label="Dismiss spend anomaly alert"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </section>
  )
}
```

这个组件可以这样用：

```tsx
"use client"

import { useState } from "react"
import { SpendAnomalyBanner } from "@/components/spend-anomaly-banner"

export function DashboardAlerts() {
  const [visible, setVisible] = useState(true)

  return (
    <div className="space-y-4">
      {visible ? (
        <SpendAnomalyBanner
          title="Unusual spend detected"
          description="Your GPT-4.1 usage is 38% higher than the previous 7-day average."
          dismissible
          onDismiss={() => setVisible(false)}
        />
      ) : null}
      <SpendAnomalyBanner
        title="Critical budget threshold reached"
        description="This workspace has used 92% of its monthly budget. Review usage before new requests are blocked."
        severity="critical"
      />
    </div>
  )
}
```

这段代码虽然简单，但很适合真实项目里的 AI 工作流。

因为 AI 后续很容易理解：

- 这是一个独立业务组件。
- `severity` 控制状态。
- `dismissible` 控制是否可关闭。
- `onDismiss` 由外部管理。
- 样式复用项目里的 Button 和 `cn`。
- 图标来自 `lucide-react`。
- 组件可以被插入到 dashboard 任意位置。

当你让 AI 修改它时，也可以给出明确指令：

```txt
请为 SpendAnomalyBanner 增加 compact 模式，保持现有 API 不破坏。
```

或者：

```txt
请把 SpendAnomalyBanner 接入 dashboard 顶部，只在 workspace spend 超过 80% 时展示。
```

这种组件比一整段散落在页面 JSX 里的 `div` 更适合 AI 继续维护。

---

## 9. 学习和落地建议

如果你第一次接触这种 AI 前端工作流，不建议一上来就把所有工具全用上。

可以按这个顺序学。

第一步，先熟悉 shadcn/ui。

重点掌握：

```txt
Button
Card
Input
Dialog
DropdownMenu
Table
Badge
Tabs
Sidebar
```

理解它不是传统组件库，而是把组件代码复制到项目里，让你可以自由改。

第二步，学会创建一个带主题的项目。

不要一开始就让 AI 从零生成。先手动初始化项目，确定：

```txt
Next.js
Tailwind
shadcn/ui
dark mode
基础组件
```

第三步，使用 blocks 搭页面骨架。

比如先做一个 dashboard block，然后手动看它的结构：

```txt
sidebar
header
cards
chart
table
tabs
```

搞清楚页面是怎么组织的。

第四步，再引入 Claude Code 或其他 Agent。

让 AI 做小任务，而不是一次性做整个系统。

比如：

- 添加一个 usage summary card。
- 添加一个 budget alert banner。
- 把 table 改成 recent requests。
- 给 dashboard 增加 mobile layout。

第五步，学习 MCP。

当你发现自己经常手动查组件、复制命令、添加 block，可以再接 MCP，让 Agent 能访问 shadcn registry。

第六步，使用 Figma 做定制状态。

不要把所有设计都交给 AI 随机发挥。对于关键业务组件，最好有设计参考。

比如：

- warning banner。
- empty state。
- billing card。
- upgrade modal。
- onboarding step。

第七步，尝试 Builder.io 这类工具连接现有 repo。

它适合练习：

```txt
Figma design -> existing repo -> AI implementation -> PR
```

第八步，建立 review 习惯。

每次 AI 生成代码后，都跑：

```bash
npm run lint
npm run typecheck
npm run build
```

如果项目有测试，也跑：

```bash
npm run test
```

最后人工检查代码，而不是只看页面。

可以做一个练习项目：

```txt
AI Usage Dashboard Lab
功能：
1. 使用 shadcn/ui create 初始化项目
2. 添加 dashboard block
3. 用 Agent 改成 AI usage dashboard
4. 在 Figma 设计 spend anomaly banner
5. 用 Builder.io 导入设计并生成 PR
6. 本地 review 和调整代码
```

这个 demo 做完，你会对新的 AI 前端工作流有很直观的理解。

---

## 10. 总结

AI 正在改变前端开发流程，但更准确地说，它改变的不是“写代码”这一件事，而是从设计系统、页面搭建、视觉稿、代码实现到 PR 协作的整条链路。

一个更稳定的 AI 前端工作流，不是让 AI 在空白项目里随便生成页面，而是先给它足够好的基础：shadcn/ui 提供组件和设计系统，blocks 提供页面骨架，MCP 让 Agent 能访问组件 registry，Figma 提供定制设计上下文，Builder.io 把设计和现有代码仓库连接起来。

开发者在这个流程里的角色也在变化。你不只是手写每一行 JSX，而是要更会定义边界、提供上下文、审查代码、控制设计系统、判断 AI 生成的东西能不能进入项目。

真正值得掌握的不是某个单独工具，而是这套思路：

```txt
先建立设计系统
再让 AI 基于现有组件生成
再用 Figma 补充定制设计
再通过 PR 工作流进入项目
最后由开发者 review 和收敛质量
```

这样用 AI，结果会比单纯“帮我做个页面”稳定得多，也更接近真实团队可以接受的前端开发方式。
