# 从 LLM 到 Agent，再到 Playwright MCP：AI 自动化测试到底是怎么工作的？

过去我们写自动化测试，通常是这样的流程：

1. 人工阅读需求
2. 人工设计测试用例
3. 人工写 Playwright / Selenium 脚本
4. 人工运行测试
5. 测试失败后人工分析原因
6. 修改代码后重新执行

但现在，随着 LLM、Agent、MCP 这些 AI 工具逐渐成熟，自动化测试的开发方式正在发生变化。

现在你可以这样做：

```text
输入一句测试需求
AI 理解需求
AI 打开浏览器
AI 操作页面
AI 生成 Playwright 测试代码
AI 执行测试
测试失败后 AI 自动修复
最终保存测试文件
```

这背后涉及几个重要概念：

- LLM
- Prompt
- Agent
- MCP
- Playwright MCP
- GitHub Copilot Agent
- Vibe Coding

这篇文章就从最基础的 AI 概念讲起，帮你理解：为什么普通 LLM 只能“想”，而 Agent + MCP 可以真正“做事”。

---

## 一、什么是人工智能 AI？

AI，全称是 Artificial Intelligence，也就是人工智能。

简单理解：

> AI 是让机器模拟人类思考、判断和回应问题的技术。

比如我们问 AI：

```text
帮我写一个登录页面测试用例
```

AI 可以根据已有知识生成一段测试用例。

再比如我们问：

```text
帮我写一封邮件
```

AI 也可以根据上下文生成邮件内容。

这种“向 AI 提问，并让 AI 根据问题生成回答”的过程，就是我们经常说的 **Prompting**。

---

## 二、什么是 Prompt？

Prompt 可以理解为你给 AI 的指令。

比如：

```text
帮我用 Playwright 写一个登录页面自动化测试
```

这就是一个 prompt。

更完整一点，你可以这样写：

```text
你是一个高级自动化测试工程师。
请使用 Playwright + TypeScript 生成一个登录测试。
测试步骤：
1. 打开登录页面
2. 输入用户名和密码
3. 点击登录按钮
4. 验证跳转到首页
```

Prompt 写得越清楚，AI 生成的结果通常越接近你的预期。

所以使用 AI 工具时，一个非常重要的能力就是：

> 把你的需求清楚、具体、结构化地描述出来。

---

## 三、什么是 LLM？

LLM，全称是 Large Language Model，也就是大语言模型。

常见的 LLM 有：

- ChatGPT
- Claude
- Google Gemini
- DeepSeek
- GitHub Copilot 背后的模型

LLM 本质上是一个经过大量文本、代码、文档、网页数据训练出来的模型。

它可以做很多事情：

- 回答问题
- 写代码
- 写文档
- 写邮件
- 总结内容
- 翻译文本
- 生成测试用例
- 解释代码
- 生成自动化脚本

比如你给 LLM 一个需求：

```text
请帮我写一个 Playwright 测试，打开首页并验证标题。
```

它可以生成类似代码：

```ts
import { test, expect } from "@playwright/test";

test("home page title", async ({ page }) => {
  await page.goto("http://localhost:3000");
  await expect(page).toHaveTitle(/Home/);
});
```

这就是 LLM 的能力：根据上下文生成内容。

---

## 四、LLM 的核心限制：只能“想”，不能“做”

LLM 很强，但它也有明显限制。

它可以生成代码，但它自己不能真正执行代码。

它可以告诉你：

```text
应该点击登录按钮
```

但它自己不能真的打开浏览器去点击。

它可以生成 SQL：

```sql
SELECT * FROM users;
```

但它自己不能直接连接你的数据库执行查询。

它可以生成 API 测试代码：

```ts
await request.get("/api/users");
```

但它自己不能直接访问你的本地项目、发请求、读取响应。

也就是说：

```text
LLM 可以思考和生成内容
但 LLM 不能直接执行真实世界的动作
```

它不能独立完成这些事情：

- 打开浏览器
- 点击页面元素
- 操作表单
- 执行测试命令
- 访问本地文件
- 连接数据库
- 发送 API 请求
- 安装依赖
- 修改项目文件
- 运行终端命令

所以我们可以把 LLM 理解成：

```text
LLM = 大脑
```

它会思考、会生成方案，但它没有手脚。

那谁来真正执行动作？

这就需要 Agent。

---

## 五、什么是 Agent？

Agent 可以理解为“执行者”或者“智能代理”。

它会接收 LLM 的指令，然后调用外部工具完成真实任务。

比如你对 AI 说：

```text
帮我生成一个 Playwright 测试，并运行它。
```

LLM 会先理解你的需求，然后 Agent 会负责：

1. 查看项目目录
2. 创建测试文件
3. 写入测试代码
4. 在终端执行测试命令
5. 读取测试结果
6. 如果失败，继续修改代码
7. 再次运行测试

所以 Agent 的作用是：

```text
LLM 负责思考
Agent 负责调度工具执行任务
```

但是 Agent 本身也不是万能的。Agent 要真正操作浏览器、数据库、API、文件系统，还需要具体工具。

这时候 MCP 就出现了。

---

## 六、什么是 MCP？

MCP，全称是 Model Context Protocol，中文可以理解为模型上下文协议。

它的作用是：**把 LLM / Agent 和真实工具连接起来。**

你可以把 MCP 理解成桥梁。

```text
LLM 负责理解需求
Agent 负责协调任务
MCP 负责连接真实工具
```

MCP 可以让 AI 工具访问不同能力，比如：

- 浏览器
- 文件系统
- 数据库
- API
- GitHub
- Playwright
- Selenium
- 本地终端
- 项目代码

没有 MCP 时，LLM 只能告诉你“应该怎么做”。

有了 MCP 后，Agent 可以通过 MCP 真正去“做”。

---

## 七、LLM、Agent、MCP 的关系

可以这样理解：

```text
用户输入 Prompt
      ↓
LLM 理解需求并生成计划
      ↓
Agent 接收 LLM 的任务
      ↓
Agent 调用 MCP 工具
      ↓
MCP 操作真实环境
      ↓
返回执行结果
      ↓
LLM 根据结果继续调整
```

用一个生活化比喻：

```text
LLM = 大脑
Agent = 项目经理
MCP = 工具和工人
浏览器 / 数据库 / API = 真实工作现场
```

如果你只用 LLM，它可以告诉你：

```text
你应该点击搜索框，输入 t-shirts，然后验证结果。
```

但如果你用 Agent + Playwright MCP，它可以真的：

```text
打开浏览器
输入 t-shirts
点击搜索
检查商品是否出现
生成测试代码
运行测试
修复失败
保存文件
```

---

## 八、MCP 能做什么？

不同 MCP 有不同用途。

### 1. 浏览器 MCP

用于操作浏览器：

- 打开网页
- 点击按钮
- 输入文本
- 选择下拉框
- 获取页面内容
- 截图
- 验证元素是否存在

### 2. Playwright MCP

用于自动化测试场景：

- 打开浏览器
- 操作页面
- 生成 Playwright 测试代码
- 运行测试
- 分析失败原因
- 自动修复测试代码

### 3. 数据库 MCP

用于连接数据库：

- 执行 SQL 查询
- 查看表结构
- 读取数据
- 分析字段
- 生成查询语句

### 4. API MCP

用于接口测试：

- 发送 GET / POST / PUT / DELETE 请求
- 获取响应
- 校验状态码
- 分析响应 body
- 生成 API 测试代码

### 5. 文件系统 MCP

用于操作本地项目：

- 读取文件
- 创建文件
- 修改代码
- 搜索目录
- 分析项目结构

---

## 九、什么是 Playwright MCP？

Playwright MCP 是和 Playwright 自动化测试相关的 MCP 工具。

Playwright 本身是一个浏览器自动化测试框架，可以：

- 打开浏览器
- 点击元素
- 输入内容
- 断言页面
- 运行 E2E 测试
- 运行 API 测试

而 Playwright MCP 则把这些能力交给 AI Agent 使用。

也就是说，AI 不只是生成代码，还可以通过 Playwright MCP 真正操作浏览器。

比如你输入：

```text
打开 https://www.automationpractice.pl/index.php
搜索 t-shirts
验证搜索结果里有 Faded Short Sleeve T-shirts
生成 Playwright 测试
运行测试直到通过
```

Agent + Playwright MCP 可以完成：

1. 打开网页
2. 找到搜索框
3. 输入 `t-shirts`
4. 点击搜索
5. 检查商品是否出现
6. 生成测试代码
7. 执行 `npx playwright test`
8. 如果失败，修改 locator
9. 再次执行测试
10. 测试通过后保存文件

这就是 Playwright MCP 的价值。

---

## 十、Playwright Codegen 和 Playwright MCP 有什么区别？

Playwright 原本就有一个工具叫 Codegen。

你可以运行：

```bash
npx playwright codegen
```

它会打开浏览器，你手动点击页面、输入内容，它会根据你的操作生成测试代码。

Codegen 的特点是：

```text
人操作浏览器
Playwright 记录动作
生成代码
```

而 Playwright MCP 的特点是：

```text
人只输入 prompt
AI 操作浏览器
AI 生成代码
AI 运行测试
AI 修复失败
```

区别很明显：

| 能力 | Playwright Codegen | Playwright MCP |
|---|---|---|
| 是否需要人手动操作浏览器 | 需要 | 不一定需要 |
| 是否能理解自然语言需求 | 不能 | 可以 |
| 是否能自动运行测试 | 不能自动闭环 | 可以 |
| 是否能测试失败后自动修复 | 不能 | 可以尝试修复 |
| 是否适合快速生成复杂测试 | 一般 | 更强 |

简单说：

```text
Codegen 是录制工具
MCP 是 AI 自动化执行工具
```

---

## 十一、用 Playwright MCP 生成 Web UI 测试

假设我们有一个测试需求：

```text
打开网站
搜索 t-shirts
验证结果列表中显示 Faded Short Sleeve T-shirts
```

你可以给 Copilot Agent 这样的 prompt：

```text
使用 Playwright 生成一个自动化测试。

测试步骤：
1. 打开 https://www.automationpractice.pl/index.php
2. 在搜索框输入 t-shirts
3. 点击搜索按钮
4. 验证结果列表中出现 Faded Short Sleeve T-shirts
5. 运行测试
6. 如果测试失败，请自动修复并重新运行，直到测试通过
```

AI 会尝试：

- 创建测试文件
- 使用 Playwright locator
- 生成断言
- 运行测试
- 根据失败信息调整代码

生成的代码可能类似：

```ts
import { test, expect } from "@playwright/test";

test("search t-shirts", async ({ page }) => {
  await page.goto("https://www.automationpractice.pl/index.php");

  await page.getByRole("textbox", { name: /search/i }).fill("t-shirts");
  await page.getByRole("button", { name: /search/i }).click();

  await expect(
    page.getByText("Faded Short Sleeve T-shirts")
  ).toBeVisible();
});
```

实际生成结果可能不同，因为 AI 会根据页面结构选择 locator。

---

## 十二、测试失败后 AI 为什么还能修复？

Playwright 测试失败时，通常会给出错误信息，比如：

```text
locator not found
expect.toBeVisible timeout
button not found
```

Agent 可以读取这些错误，然后重新分析页面结构。

比如第一次它生成了：

```ts
page.getByRole("button", { name: "Search" })
```

但页面按钮没有 accessible name，它就可能改成：

```ts
page.locator("#searchbox button").click();
```

这就是 AI 迭代修复的过程：

```text
生成代码
运行测试
读取错误
修改代码
再次运行
直到通过
```

当然，这不代表 AI 一定每次都能修好。LLM 也会犯错，所以人工 review 仍然非常重要。

---

## 十三、用 Playwright MCP 生成 POM 测试

真实项目里，我们通常不会把所有测试代码都写在一个文件里，而是会使用 Page Object Model，也就是 POM。

POM 的核心思想是：

```text
页面操作封装到 Page 类
测试用例只描述业务流程
```

比如搜索页面可以拆成：

```text
HomePage
SearchResultsPage
```

你可以给 AI 这样的 prompt：

```text
请使用 Page Object Model 方式生成 Playwright 测试。

测试步骤：
1. 打开 https://www.automationpractice.pl/index.php
2. 搜索 t-shirts
3. 验证搜索结果中出现 Faded Short Sleeve T-shirts

要求：
1. 创建 HomePage 类，封装搜索框和搜索动作
2. 创建 SearchResultsPage 类，封装搜索结果断言
3. 创建 spec 测试文件
4. 运行测试并修复直到通过
```

AI 可能生成类似结构：

```text
tests/
  search.spec.ts
pages/
  home-page.ts
  search-results-page.ts
```

示例代码：

```ts
// pages/home-page.ts
import { Page } from "@playwright/test";

export class HomePage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("https://www.automationpractice.pl/index.php");
  }

  async search(keyword: string) {
    await this.page.locator("#search_query_top").fill(keyword);
    await this.page.locator('[name="submit_search"]').click();
  }
}
```

```ts
// pages/search-results-page.ts
import { expect, Page } from "@playwright/test";

export class SearchResultsPage {
  constructor(private page: Page) {}

  async expectProductVisible(productName: string) {
    await expect(this.page.getByText(productName)).toBeVisible();
  }
}
```

```ts
// tests/search.spec.ts
import { test } from "@playwright/test";
import { HomePage } from "../pages/home-page";
import { SearchResultsPage } from "../pages/search-results-page";

test("search t-shirts with POM", async ({ page }) => {
  const homePage = new HomePage(page);
  const resultsPage = new SearchResultsPage(page);

  await homePage.goto();
  await homePage.search("t-shirts");
  await resultsPage.expectProductVisible("Faded Short Sleeve T-shirts");
});
```

这种方式更适合真实项目维护。

---

## 十四、用 Playwright MCP 生成 API 测试

Playwright 不只能做浏览器测试，也可以做 API 测试。

如果你想测试一个接口，比如：

```text
GET https://fakestoreapi.com/products/1
```

你可以给 AI 这样的 prompt：

```text
请使用 Playwright request context 生成 API 测试。

接口：
GET https://fakestoreapi.com/products/1

要求：
1. 验证状态码是 200
2. 验证响应中包含 id、title、price、category、image、rating
3. 验证字段类型
4. 如果需要 JSON schema 校验，请安装 ajv
5. 打印 product title 和 price
6. 将测试保存到 tests/product-api.spec.ts
7. 运行测试并确保通过
```

AI 可能会生成：

```ts
import { test, expect } from "@playwright/test";
import Ajv from "ajv";

test("get product detail", async ({ request }) => {
  const response = await request.get("https://fakestoreapi.com/products/1");

  expect(response.status()).toBe(200);

  const body = await response.json();

  expect(body).toHaveProperty("id");
  expect(body).toHaveProperty("title");
  expect(body).toHaveProperty("price");
  expect(body).toHaveProperty("category");
  expect(body).toHaveProperty("image");
  expect(body).toHaveProperty("rating");

  expect(typeof body.id).toBe("number");
  expect(typeof body.title).toBe("string");
  expect(typeof body.price).toBe("number");
  expect(typeof body.category).toBe("string");
  expect(typeof body.image).toBe("string");

  const ajv = new Ajv();

  const schema = {
    type: "object",
    required: ["id", "title", "price", "category", "image", "rating"],
    properties: {
      id: { type: "number" },
      title: { type: "string" },
      price: { type: "number" },
      description: { type: "string" },
      category: { type: "string" },
      image: { type: "string" },
      rating: {
        type: "object",
        required: ["rate", "count"],
        properties: {
          rate: { type: "number" },
          count: { type: "number" },
        },
      },
    },
  };

  const validate = ajv.compile(schema);
  const valid = validate(body);

  expect(valid).toBeTruthy();

  console.log("Product title:", body.title);
  console.log("Product price:", body.price);
});
```

如果项目里没有安装 `ajv`，Agent 可能会请求执行：

```bash
npm install ajv
```

这就是 Agent + MCP 的能力：它不仅写代码，还可以发现依赖缺失，并尝试安装依赖。

---

## 十五、什么是 Vibe Coding？

Vibe Coding 可以理解为：

> 主要通过自然语言 prompt 驱动 AI 完成编码任务。

也就是说，你不再一行一行手写代码，而是通过描述需求，让 AI 帮你生成、修改、运行、修复代码。

比如：

```text
帮我用 Playwright 写一个搜索商品的测试
```

或者：

```text
把这个测试改成 Page Object Model
```

或者：

```text
给这个 API 测试加上 schema 校验
```

这种方式就是一种 Vibe Coding。

但要注意：Vibe Coding 不等于完全不懂代码。

你仍然需要知道：

- 生成的代码是否合理
- locator 是否稳定
- 断言是否有价值
- 文件结构是否适合项目
- 是否引入了不必要依赖
- 测试是否真的覆盖了业务风险

AI 可以提高效率，但不能替代工程判断。

---

## 十六、使用 Playwright MCP 的建议

### 1. Prompt 要写清楚

不要只写：

```text
帮我写测试
```

应该写：

```text
使用 Playwright + TypeScript 写一个登录测试。
步骤：
1. 打开 /login
2. 输入邮箱 test@example.com
3. 输入密码 123456
4. 点击登录
5. 验证跳转到 /dashboard
要求：
- 使用 getByRole / getByLabel 优先定位
- 测试失败后请修复并重新运行
```

### 2. 先让 AI 生成，再人工 review

AI 生成的代码不一定最优。

你需要检查：

- locator 是否稳定
- 测试是否过度依赖文本
- 是否有硬编码账号密码
- 是否缺少等待条件
- 是否污染测试数据
- 是否适合 CI 运行

### 3. 不要迷信一次生成

LLM 可能会生成错误代码。

正确姿势是：

```text
生成
运行
失败
分析
修复
再运行
```

这也是 Agent 工作流的价值。

### 4. 项目要有清晰规范

如果项目里已经有测试目录、POM 目录、命名规范，你要在 prompt 里说清楚：

```text
请把页面对象放到 pages/ 目录
测试文件放到 tests/e2e/ 目录
使用已有的 BasePage
不要创建重复工具函数
```

否则 AI 可能会自己乱建目录。

### 5. 敏感信息不要写进 prompt

不要直接把真实账号、密码、token、数据库连接串写到 prompt 里。

应该使用：

```text
process.env.TEST_EMAIL
process.env.TEST_PASSWORD
```

或者测试环境专用账号。

---

## 十七、Playwright MCP 适合什么场景？

它很适合：

- 快速生成 E2E 测试
- 把手工测试步骤转成自动化脚本
- 生成 POM 结构
- 给已有测试补断言
- 生成 API 测试
- 运行失败测试并辅助修复
- 学习 Playwright 写法
- 做自动化测试脚手架

尤其适合这种场景：

```text
我知道测试步骤，但不想从 0 手写测试代码
```

---

## 十八、Playwright MCP 不适合什么场景？

它不适合完全无监督地写生产级测试。

原因是：

1. AI 可能选错 locator。
2. AI 可能加无意义断言。
3. AI 可能忽略测试数据清理。
4. AI 可能生成不符合项目规范的目录。
5. AI 可能在测试失败时过度修改代码。
6. AI 可能引入不必要依赖。
7. AI 可能把偶然通过的测试当成正确结果。

所以更合理的定位是：

```text
AI 负责提高测试开发效率
人负责测试设计和质量把关
```

---

## 十九、从传统自动化到 AI 自动化的变化

传统写法：

```text
测试人员手动分析需求
手写 Playwright 测试
手动运行
手动排查失败
手动修复
```

AI + MCP 写法：

```text
测试人员写清楚测试目标
AI 生成测试
AI 执行测试
AI 根据失败信息修复
测试人员 review 并确认质量
```

角色发生了变化。

以前你主要是写代码的人。

现在你更像是：

```text
测试需求设计者
Prompt 编写者
测试质量审核者
自动化架构把关者
```

这对测试工程师和前端工程师都是新的能力要求。

---

## 二十、总结

LLM、Agent、MCP 是理解 AI 自动化测试的三个核心概念。

可以简单记住：

```text
LLM 负责思考
Agent 负责调度
MCP 负责连接真实工具
```

普通 LLM 可以帮你写测试代码，但不能真正执行测试。

Agent + MCP 则可以进一步做到：

- 打开浏览器
- 操作页面
- 生成 Playwright 测试
- 运行测试
- 分析失败
- 自动修复
- 保存文件

Playwright MCP 的价值在于，它把自然语言需求和真实浏览器自动化连接了起来。

但最后一定要记住：

> AI 可以帮你更快地写测试，但不能替你判断测试是否真的有价值。

真正高级的用法，不是让 AI 随便生成一堆测试，而是你清楚知道业务风险在哪里，然后用 AI 快速落地高质量的自动化测试。
