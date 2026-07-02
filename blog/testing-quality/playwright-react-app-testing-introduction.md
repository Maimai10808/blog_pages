# Playwright 测试 React 应用入门：从“测什么”到“怎么测”的完整实践

在 React 项目里，很多人听到“测试”两个字，第一反应可能是单元测试：测试某个函数、某个组件、某个工具方法。但在真实业务项目中，我们更关心的是：

> 用户打开页面之后，看到的内容对不对？  
> 点击按钮之后，页面跳转对不对？  
> 填写表单之后，结果是否符合预期？  
> 前端、后端、数据库组合起来的完整流程是否能正常工作？

这类测试，就是 **端到端测试**，也就是 E2E Testing。

Playwright 就是一个非常适合做 E2E 测试的工具。它可以启动真实浏览器，像真实用户一样打开页面、点击元素、填写输入框、提交表单，并断言页面是否按预期变化。

这篇文章会用一个非常简单的 React 应用作为例子，讲清楚：

- 什么是 Playwright
- 什么是端到端测试
- Playwright 怎么安装
- 测试前应该如何思考“测什么”
- 如何测试首页内容
- 如何测试页面跳转
- 如何测试表单输入和列表渲染
- `test.describe`、`beforeEach`、`getByRole`、`getByTestId` 怎么用
- 如何用 Playwright UI Mode 调试测试

---

## 一、Playwright 是什么

Playwright 是一个端到端测试工具。

它可以帮我们启动真实浏览器，然后模拟用户操作：

```ts
await page.goto("http://localhost:3000");
await page.getByRole("link", { name: "Form" }).click();
await page.getByPlaceholder("Enter item").fill("item one");
await page.getByRole("button", { name: "Add" }).click();
```text

也就是说，Playwright 不是只测试某个函数，也不是只测试某个 React 组件，而是测试整个应用。

它会像真实用户一样：

- 打开页面
- 点击链接
- 输入内容
- 提交表单
- 检查页面是否跳转
- 检查元素是否出现
- 检查内容是否符合预期

这类测试非常适合验证一个完整业务流程是否可用。

---

## 二、端到端测试和单元测试有什么区别

### 单元测试

单元测试关注的是一个很小的代码单元。

比如：

```ts
function add(a: number, b: number) {
  return a + b;
}
```

你可以测试：

```ts
expect(add(1, 2)).toBe(3);
```text

它只关心这个函数本身是否正确。

### 端到端测试

端到端测试关注的是完整用户流程。

比如用户打开页面后：

1. 看到首页标题
2. 点击表单链接
3. 跳转到表单页面
4. 输入内容
5. 点击添加按钮
6. 页面列表出现新内容
7. 输入框被清空

这个流程可能涉及：

- React 前端
- 路由
- 表单状态
- 后端接口
- 数据库
- 页面渲染

如果其中任意一环坏了，端到端测试都有可能发现。

所以，端到端测试更接近真实用户视角。

---

## 三、准备一个简单的 React 应用

假设我们有一个非常简单的 React 应用。

首页长这样：

```text
Homepage

Form
```

其中 `Form` 是一个链接，点击之后跳转到：

```text
/form
```text

表单页长这样：

```text
Form

[ Enter item ] [ Add ]

- item list
```

用户可以在输入框里输入内容，点击 `Add` 按钮后，内容会被添加到列表里，并且输入框会被清空。

虽然这个应用很简单，但已经足够演示 Playwright 的核心测试思路。

---

## 四、安装 Playwright

如果你已经有 React 项目，可以直接在项目根目录执行：

```bash
pnpm create playwright
```text

如果你使用 npm，也可以：

```bash
npm init playwright@latest
```

初始化过程中，Playwright 会问你几个问题：

```text
Where to put your end-to-end tests?
Add a GitHub Actions workflow?
Install Playwright browsers?
```text

新手可以先使用默认配置。

安装完成后，项目里通常会多出：

```text
tests/
tests-examples/
playwright.config.ts
```

其中：

- `tests/`：放你自己的测试
- `tests-examples/`：Playwright 官方示例
- `playwright.config.ts`：Playwright 配置文件

---

## 五、运行 Playwright 测试

运行所有测试：

```bash
npx playwright test
```text

打开 Playwright UI Mode：

```bash
npx playwright test --ui
```

查看测试报告：

```bash
npx playwright show-report
```text

如果你是新手，强烈建议多用 UI Mode。

UI Mode 可以看到：

- 每个测试步骤
- 页面截图
- 元素定位
- 断言失败原因
- 测试源码
- 浏览器实际执行过程

它对调试测试非常友好。

---

## 六、测试之前，先想清楚“测什么”

很多教程会直接教你写代码，但真实项目里更重要的问题是：

> 我到底应该测试什么？

不要为了测试而测试。测试应该围绕用户行为。

以这个简单应用为例，我们有两个页面：

1. 首页
2. 表单页

首页需要测试：

- 页面标题是否正确
- 是否有 `Homepage` 这个 heading
- 是否有 `Form` 链接
- 点击 `Form` 链接后是否跳转到表单页

表单页需要测试：

- 页面标题是否正确
- 是否有 `Form` heading
- 是否有输入框
- 是否有 Add 按钮
- 初始列表是否为空
- 输入内容并点击 Add 后，列表是否出现新内容
- 添加成功后输入框是否被清空

这就是测试设计的核心：

> 看用户能做什么，然后验证这些行为是否符合预期。

---

## 七、创建测试文件

我们可以在 `tests` 目录下创建：

```text
tests/example.spec.ts
```

引入 Playwright：

```ts
import { test, expect } from "@playwright/test";
```ts

其中：

- `test` 用来定义测试用例
- `expect` 用来写断言

---

## 八、用 `test.describe` 分组测试

因为我们有两个页面，所以可以把测试分成两组：

```ts
import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  // 首页相关测试
});

test.describe("Form page", () => {
  // 表单页相关测试
});
```

`test.describe` 的作用是把相关测试放在一起。

这样在 Playwright UI Mode 里，你会看到测试按组展示，结构更清晰。

---

## 九、测试首页标题和元素

首页测试的第一步是访问页面：

```ts
await page.goto("http://localhost:3000");
```ts

然后检查页面标题：

```ts
await expect(page).toHaveTitle("Cosden Solutions");
```

检查页面 heading：

```ts
await expect(
  page.getByRole("heading", { name: "Homepage" })
).toBeVisible();
```ts

检查 Form 链接：

```ts
await expect(
  page.getByRole("link", { name: "Form" })
).toBeVisible();
```

完整代码：

```ts
import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test("should have correct metadata and elements", async ({ page }) => {
    await page.goto("http://localhost:3000");

    await expect(page).toHaveTitle("Cosden Solutions");

    await expect(
      page.getByRole("heading", { name: "Homepage" })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Form" })
    ).toBeVisible();
  });
});
```text

这里推荐使用 `getByRole`，因为它更接近用户视角。

比如：

```ts
page.getByRole("heading", { name: "Homepage" })
```

意思是：找到一个用户能识别为 heading 的元素，并且它的名字是 Homepage。

这比直接写 CSS 选择器更稳定，也更符合可访问性测试思路。

---

## 十、用 `beforeEach` 避免重复代码

如果每个首页测试都要写：

```ts
await page.goto("http://localhost:3000");
```ts

就会很重复。

Playwright 提供了 `beforeEach`：

```ts
test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("should have correct metadata and elements", async ({ page }) => {
    await expect(page).toHaveTitle("Cosden Solutions");

    await expect(
      page.getByRole("heading", { name: "Homepage" })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Form" })
    ).toBeVisible();
  });
});
```

`beforeEach` 会在当前 `describe` 里的每个测试执行前运行。

这样你就不用在每个测试里重复写页面跳转逻辑。

---

## 十一、测试点击链接后跳转页面

首页还有一个关键行为：点击 `Form` 链接后跳转到表单页。

测试代码：

```ts
test("should redirect to form page on click", async ({ page }) => {
  await page.getByRole("link", { name: "Form" }).click();

  await expect(page).toHaveTitle("Form");
});
```ts

完整首页测试：

```ts
import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("should have correct metadata and elements", async ({ page }) => {
    await expect(page).toHaveTitle("Cosden Solutions");

    await expect(
      page.getByRole("heading", { name: "Homepage" })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Form" })
    ).toBeVisible();
  });

  test("should redirect to form page on click", async ({ page }) => {
    await page.getByRole("link", { name: "Form" }).click();

    await expect(page).toHaveTitle("Form");
  });
});
```

这个测试验证的是用户真实行为：

```text
看到链接 -> 点击链接 -> 页面跳转
```text

---

## 十二、测试表单页基础元素

表单页也可以单独分组：

```ts
test.describe("Form page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/form");
  });
});
```

先测试页面元素是否存在：

```ts
test("should have correct metadata and elements", async ({ page }) => {
  await expect(page).toHaveTitle("Form");

  await expect(
    page.getByRole("heading", { name: "Form" })
  ).toBeVisible();

  await expect(
    page.getByPlaceholder("Enter item")
  ).toBeVisible();

  await expect(
    page.getByRole("button", { name: "Add" })
  ).toBeVisible();
});
```text

这里用到了：

```ts
page.getByPlaceholder("Enter item")
```

它可以通过输入框的 placeholder 找到 input。

---

## 十三、什么时候需要 `data-testid`

Playwright 推荐优先使用用户视角的定位方式，比如：

- `getByRole`
- `getByLabel`
- `getByPlaceholder`
- `getByText`

但有些元素不方便通过用户可见文本定位，比如一个空列表：

```tsx
<ul>
  {items.map((item) => (
    <li>{item}</li>
  ))}
</ul>
```tsx

这个时候可以加：

```tsx
<ul data-testid="items-list">
  {items.map((item) => (
    <li data-testid="item" key={item}>
      {item}
    </li>
  ))}
</ul>
```

然后在测试中使用：

```ts
page.getByTestId("items-list");
page.getByTestId("item");
```ts

`data-testid` 不是给用户看的，而是专门给测试定位元素用的。

---

## 十四、测试初始列表为空

假设表单页一开始没有任何 item，我们可以测试：

```ts
test("should have empty items list on start", async ({ page }) => {
  const itemsList = page.getByTestId("items-list");

  await expect(itemsList).toBeEmpty();
});
```

这可以确保初始状态符合预期。

如果以后有人改代码，导致页面一开始就显示了错误数据，这个测试就会失败。

---

## 十五、测试添加 item

这是整个表单页最核心的业务行为。

用户流程是：

1. 找到输入框
2. 输入 `item one`
3. 点击 Add
4. 列表出现 `item one`
5. 输入框被清空

测试代码：

```ts
test("should add item to list", async ({ page }) => {
  const input = page.getByPlaceholder("Enter item");

  await input.fill("item one");

  await page.getByRole("button", { name: "Add" }).click();

  const item = page.getByTestId("item").nth(0);

  await expect(item).toHaveText("item one");

  await expect(input).toBeEmpty();
});
```text

这里有几个关键点。

### 1. 填写输入框

```ts
await input.fill("item one");
```

`fill` 用来模拟用户输入。

### 2. 点击按钮

```ts
await page.getByRole("button", { name: "Add" }).click();
```text

### 3. 获取列表第一项

```ts
const item = page.getByTestId("item").nth(0);
```

因为列表里可能有多个 item，每个 item 都用了同一个 `data-testid="item"`，所以用 `nth(0)` 获取第一个。

### 4. 校验内容

```ts
await expect(item).toHaveText("item one");
```ts

### 5. 校验输入框清空

```ts
await expect(input).toBeEmpty();
```

这个测试验证了完整用户行为，不只是验证某个函数。

---

## 十六、完整测试代码示例

```ts
import { test, expect } from "@playwright/test";

test.describe("Home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("should have correct metadata and elements", async ({ page }) => {
    await expect(page).toHaveTitle("Cosden Solutions");

    await expect(
      page.getByRole("heading", { name: "Homepage" })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Form" })
    ).toBeVisible();
  });

  test("should redirect to form page on click", async ({ page }) => {
    await page.getByRole("link", { name: "Form" }).click();

    await expect(page).toHaveTitle("Form");
  });
});

test.describe("Form page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/form");
  });

  test("should have correct metadata and elements", async ({ page }) => {
    await expect(page).toHaveTitle("Form");

    await expect(
      page.getByRole("heading", { name: "Form" })
    ).toBeVisible();

    await expect(
      page.getByPlaceholder("Enter item")
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: "Add" })
    ).toBeVisible();
  });

  test("should have empty items list on start", async ({ page }) => {
    const itemsList = page.getByTestId("items-list");

    await expect(itemsList).toBeEmpty();
  });

  test("should add item to list", async ({ page }) => {
    const input = page.getByPlaceholder("Enter item");

    await input.fill("item one");

    await page.getByRole("button", { name: "Add" }).click();

    const item = page.getByTestId("item").nth(0);

    await expect(item).toHaveText("item one");

    await expect(input).toBeEmpty();
  });
});
```text

---

## 十七、推荐的测试思路

写 Playwright 测试时，不要一上来就问：

> 这个组件怎么测？

更好的问题是：

> 用户在这个页面上能做什么？  
> 用户看到什么内容？  
> 用户点击之后应该发生什么？  
> 用户输入之后页面应该怎么变化？  
> 出错时页面应该如何响应？

也就是说，端到端测试应该围绕用户路径来写。

比如：

```text
用户打开首页
用户看到标题
用户点击 Form
用户进入表单页
用户输入 item
用户点击 Add
用户看到列表新增 item
```

这就是一个完整的用户路径。

---

## 十八、不要过度测试实现细节

Playwright 更适合测试行为，不适合测试实现细节。

不建议测试：

```text
某个 useState 是否被调用
某个函数内部变量是什么
某个组件内部 className 是否存在
```text

更建议测试：

```text
用户能否看到内容
用户点击后是否跳转
用户输入后是否提交成功
页面是否展示正确结果
```

测试越接近用户行为，越稳定，也越有价值。

---

## 十九、Playwright UI Mode 为什么好用

执行：

```bash
npx playwright test --ui
```text

你可以看到：

- 每个测试分组
- 每个测试步骤
- 页面在每一步的状态
- 点击了哪个元素
- 填写了什么内容
- 哪一行断言失败
- 浏览器控制台输出

这对新手非常友好。

如果测试失败，你不用盲猜原因，可以直接看 Playwright UI 里每一步发生了什么。

---

## 二十、真实项目里应该怎么组织测试

上面的示例为了简单，把所有测试都放在一个文件里。

真实项目里，更推荐按页面或业务模块拆分：

```text
tests/
  home.spec.ts
  form.spec.ts
  login.spec.ts
  order.spec.ts
  checkout.spec.ts
```

如果是复杂项目，也可以按业务域组织：

```text
tests/
  auth/
    login.spec.ts
    register.spec.ts
  trading/
    exchange.spec.ts
    swap.spec.ts
  user/
    profile.spec.ts
    assets.spec.ts
```text

这样更容易维护。

---

## 二十一、总结

Playwright 是一个非常适合测试 React 应用的端到端测试工具。

它的核心价值是：

```text
像真实用户一样测试你的应用
```

这篇文章里，我们从一个简单应用出发，完成了：

- 安装 Playwright
- 运行测试
- 使用 UI Mode
- 用 `test.describe` 分组
- 用 `beforeEach` 复用页面跳转逻辑
- 测试首页标题和元素
- 测试链接跳转
- 测试表单页元素
- 测试初始空列表
- 测试输入内容并添加到列表

最终你应该记住这几个核心原则：

1. Playwright 适合测试完整用户流程。
2. E2E 测试关注的是用户行为，而不是组件实现细节。
3. 写测试前先想清楚“用户能做什么”。
4. 优先使用 `getByRole`、`getByPlaceholder` 这类用户视角定位方式。
5. 必要时再使用 `data-testid`。
6. 用 `beforeEach` 减少重复页面跳转代码。
7. 用 UI Mode 调试测试会更直观。

当你能用这种方式思考测试时，就不只是学会了 Playwright 的 API，而是开始真正理解“为什么要测试”和“应该测试什么”。