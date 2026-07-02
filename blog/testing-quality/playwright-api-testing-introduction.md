# Playwright API 测试入门：从项目搭建到 GET / POST / PUT / DELETE 请求实战

在前端自动化测试里，很多人第一反应是“页面测试”：打开浏览器、点击按钮、填写表单、断言页面内容。但 Playwright 不只能做 UI 自动化，它也可以直接做 **API 测试**。

API 测试的好处是：不依赖页面 UI，速度更快，定位问题更直接。比如我们可以直接请求登录接口、订单接口、用户接口，然后校验状态码、响应字段和错误信息。

这篇文章会从 0 开始，用 Playwright 搭建一个 API 测试项目，并依次实现：

- GET 请求测试
- POST 请求测试
- PUT 请求测试
- DELETE 请求测试
- 响应状态码断言
- 响应内容断言
- Playwright UI Mode 调试
- HTML Report 查看测试报告

---

## 一、什么是 Playwright API 测试

Playwright 最常见的用法是浏览器自动化，比如：

```ts
await page.goto("https://example.com");
await page.click("button");
```text

但 Playwright 还提供了一个非常重要的能力：`APIRequestContext`。

它允许我们直接发 HTTP 请求：

```ts
await request.get(url);
await request.post(url, { data });
await request.put(url, { data });
await request.delete(url);
```

也就是说，我们可以不打开页面，直接测试后端接口。

---

## 二、创建 Playwright 测试项目

如果你已经有 Playwright 项目，可以跳过这一步。

如果你要从零开始，可以先创建一个新文件夹，比如：

```bash
mkdir playwright-api-testing
cd playwright-api-testing
```text

然后执行：

```bash
npm init playwright@latest
```

执行后，命令行会询问几个问题：

```text
Do you want to use TypeScript or JavaScript?
Where to put your end-to-end tests?
Add a GitHub Actions workflow?
Install Playwright browsers?
```text

如果你是新手，可以先选择默认配置。

项目初始化后，一般会生成：

```text
package.json
package-lock.json
playwright.config.js
tests/
```

其中：

- `package.json`：项目依赖和脚本配置
- `playwright.config.js`：Playwright 配置文件
- `tests/`：测试用例目录

---

## 三、运行默认测试

项目创建完成后，可以先运行一次默认测试，确认环境没问题：

```bash
npx playwright test
```text

如果测试通过，说明 Playwright 项目已经可以正常运行。

查看 HTML 测试报告：

```bash
npx playwright show-report
```

Playwright 会打开一个本地报告页面，你可以看到：

- 测试是否通过
- 每个测试耗时
- 失败原因
- 截图
- Trace 信息

---

## 四、使用 Playwright UI Mode

Playwright 还有一个非常好用的调试模式：

```bash
npx playwright test --ui
```text

UI Mode 会打开一个可视化测试界面，你可以：

- 点击运行某个测试
- 查看测试步骤
- 查看 Network 请求
- 查看 Console 输出
- 查看错误信息
- 查看源码定位

对于新手来说，UI Mode 非常适合学习和调试。

---

## 五、创建 API 测试文件

在 `tests` 目录下新建文件：

```text
tests/api_tests.spec.js
```

然后引入 Playwright 的 `test` 和 `expect`：

```js
import { test, expect } from "@playwright/test";
```text

其中：

- `test` 用来定义测试用例
- `expect` 用来写断言

---

## 六、GET 请求测试

我们先写一个最简单的 GET 请求。

这里使用公开测试 API：

```text
https://reqres.in/api/users/2
```

测试代码如下：

```js
import { test, expect } from "@playwright/test";

test("API GET request", async ({ request }) => {
  const response = await request.get("https://reqres.in/api/users/2");

  expect(response.status()).toBe(200);

  const text = await response.text();
  expect(text).toContain("Janet");

  console.log(await response.json());
});
```text

这里的关键点是：

```js
async ({ request }) => {}
```

这个 `request` 就是 Playwright 提供的 API 请求上下文。

我们通过它发送 GET 请求：

```js
const response = await request.get(url);
```ts

然后校验状态码：

```js
expect(response.status()).toBe(200);
```

再校验响应内容里是否包含某个字段：

```js
expect(text).toContain("Janet");
```text

如果你把 `"Janet"` 改成一个不存在的字符串，比如 `"John"`，测试就会失败。Playwright 会告诉你是哪一行断言失败。

---

## 七、POST 请求测试

POST 请求一般需要传请求体，也就是 payload。

示例接口：

```text
https://reqres.in/api/users
```

请求体：

```json
{
  "name": "raghav",
  "job": "teacher"
}
```ts

测试代码：

```js
test("API POST request", async ({ request }) => {
  const response = await request.post("https://reqres.in/api/users", {
    data: {
      name: "raghav",
      job: "teacher",
    },
  });

  expect(response.status()).toBe(201);

  const text = await response.text();
  expect(text).toContain("raghav");

  console.log(await response.json());
});
```

POST 请求和 GET 请求最大的区别是这里：

```js
{
  data: {
    name: "raghav",
    job: "teacher",
  },
}
```ts

Playwright 会自动把 `data` 作为请求 body 发送给接口。

POST 创建成功后，通常返回状态码 `201`：

```js
expect(response.status()).toBe(201);
```

---

## 八、PUT 请求测试

PUT 通常用于更新资源。

示例接口：

```text
https://reqres.in/api/users/2
```ts

测试代码：

```js
test("API PUT request", async ({ request }) => {
  const response = await request.put("https://reqres.in/api/users/2", {
    data: {
      name: "raghav",
      job: "teacher",
    },
  });

  expect(response.status()).toBe(200);

  const text = await response.text();
  expect(text).toContain("raghav");

  console.log(await response.json());
});
```

PUT 和 POST 写法很像，都可以带 `data`。

区别在于语义：

- POST：创建资源
- PUT：完整更新资源
- PATCH：部分更新资源

成功的 PUT 请求通常返回 `200`。

---

## 九、DELETE 请求测试

DELETE 用来删除资源。

示例接口：

```text
https://reqres.in/api/users/2
```ts

测试代码：

```js
test("API DELETE request", async ({ request }) => {
  const response = await request.delete("https://reqres.in/api/users/2");

  expect(response.status()).toBe(204);
});
```

DELETE 请求通常不需要 body。

删除成功后，常见状态码是：

```text
204 No Content
```ts

也就是说，接口成功了，但是响应 body 为空。

---

## 十、常见断言写法

### 1. 校验状态码

```js
expect(response.status()).toBe(200);
```

### 2. 校验响应是否成功

Playwright 也支持：

```js
await expect(response).toBeOK();
```ts

`toBeOK()` 会判断状态码是否在 `200-299` 范围内。

### 3. 校验响应文本

```js
const text = await response.text();
expect(text).toContain("Janet");
```

### 4. 校验 JSON 字段

```js
const body = await response.json();

expect(body.data.first_name).toBe("Janet");
expect(body.data.email).toContain("@reqres.in");
```ts

这种写法比 `text().toContain()` 更精确，更适合真实项目。

---

## 十一、完整示例代码

```js
import { test, expect } from "@playwright/test";

test("API GET request", async ({ request }) => {
  const response = await request.get("https://reqres.in/api/users/2");

  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.data.first_name).toBe("Janet");

  console.log(body);
});

test("API POST request", async ({ request }) => {
  const response = await request.post("https://reqres.in/api/users", {
    data: {
      name: "raghav",
      job: "teacher",
    },
  });

  expect(response.status()).toBe(201);

  const body = await response.json();
  expect(body.name).toBe("raghav");
  expect(body.job).toBe("teacher");

  console.log(body);
});

test("API PUT request", async ({ request }) => {
  const response = await request.put("https://reqres.in/api/users/2", {
    data: {
      name: "raghav",
      job: "teacher",
    },
  });

  expect(response.status()).toBe(200);

  const body = await response.json();
  expect(body.name).toBe("raghav");
  expect(body.job).toBe("teacher");

  console.log(body);
});

test("API DELETE request", async ({ request }) => {
  const response = await request.delete("https://reqres.in/api/users/2");

  expect(response.status()).toBe(204);
});
```

---

## 十二、运行指定测试文件

运行所有测试：

```bash
npx playwright test
```text

运行某个测试文件：

```bash
npx playwright test tests/api_tests.spec.js
```

打开 UI Mode：

```bash
npx playwright test --ui
```text

查看 HTML 报告：

```bash
npx playwright show-report
```

---

## 十三、API 测试中应该重点检查什么

真实项目中，API 测试不只是检查状态码，还应该检查：

1. **状态码是否正确**
   ```js
   expect(response.status()).toBe(200);
   ```ts

2. **业务 code 是否正确**
   ```js
   expect(body.code).toBe(0);
   ```

3. **关键字段是否存在**
   ```js
   expect(body.data.token).toBeTruthy();
   ```ts

4. **字段类型是否符合预期**
   ```js
   expect(typeof body.data.username).toBe("string");
   ```

5. **错误请求是否返回正确错误信息**
   ```js
   expect(body.message).toContain("Password is incorrect");
   ```ts

6. **创建、更新、删除接口是否符合业务流程**
   比如先创建用户，再查询用户，再修改用户，最后删除用户。

---

## 十四、Playwright API 测试适合哪些场景

Playwright API 测试适合：

- 登录接口测试
- 注册接口测试
- 用户信息接口测试
- 订单接口测试
- 商品列表接口测试
- 支付回调接口测试
- 后台管理接口测试
- 前端 E2E 测试前的数据准备

比如在 UI 测试前，你可以先调用接口创建测试数据，再打开页面验证 UI。

---

## 十五、总结

Playwright 不仅能做浏览器自动化，也可以很方便地做 API 测试。

核心用法其实很简单：

```js
test("API test", async ({ request }) => {
  const response = await request.get("https://example.com/api");

  expect(response.status()).toBe(200);
});
```

对于新手来说，可以按这个顺序学习：

1. 先搭建 Playwright 项目
2. 学会运行测试
3. 学会使用 UI Mode
4. 写 GET 请求
5. 写 POST 请求
6. 写 PUT 请求
7. 写 DELETE 请求
8. 学会断言状态码和响应内容
9. 学会查看 HTML Report

掌握这些之后，你就可以把 Playwright API 测试用到真实项目里，比如测试登录、订单、资产、交易等接口。API 测试比 UI 测试更快、更稳定，也更适合做接口回归测试。