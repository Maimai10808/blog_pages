# GitHub Actions 入门：从自动测试到自动部署，理解 CI/CD 的基本流程

很多开发者第一次听到 GitHub Actions，会觉得它离自己有点远。

因为一提到它，常常会同时出现一些看起来比较“工程化”的词：CI/CD、自动部署、Workflow、Job、Runner、Docker、Secrets、Branch Protection……

但如果换一个角度看，GitHub Actions 其实解决的是一个非常直接的问题：

项目里那些每次都要重复执行、而且很容易忘记执行的命令，能不能交给 GitHub 自动完成？

比如你写完一个功能，准备提交 Pull Request。正常情况下，你可能需要手动执行：

```bash
npm run build
npm run test
```

确认项目能正常构建，测试也全部通过。

如果项目很小，这两条命令可能十几秒就跑完了。但如果项目很大，构建一次可能要几分钟，测试用例可能有几百个。每次都靠人手动执行，不仅浪费时间，还容易漏掉。

GitHub Actions 就是为了解决这类问题而出现的。它可以在代码提交、Pull Request、合并主分支等事件发生时，自动运行你提前配置好的任务。

---

## 1. GitHub Actions 解决了什么问题

在没有 GitHub Actions 之前，团队开发中很多流程都依赖人工执行。

比如一个前端项目，开发者在 feature 分支上完成了一个新功能，然后准备合并到 main 分支。为了保证代码质量，通常需要做这些检查：

```bash
npm run build
npm run test
```

如果项目使用 TypeScript，构建阶段可以检查类型错误、导入错误、语法问题等。

如果项目有测试用例，测试阶段可以确认新功能有没有破坏已有逻辑。

问题在于，这些事情如果完全靠人来做，就会出现几个问题。

第一，容易忘。

开发者写完功能后，可能觉得本地页面能跑，就直接提 PR 了。但本地能跑不代表构建一定能过，也不代表测试一定没问题。

第二，耗费时间。

大型项目里，构建和测试可能需要几分钟甚至更久。每个开发者都手动跑一遍，会消耗很多重复劳动。

第三，标准不统一。

有人提交前会跑测试，有人不会；有人只跑 build，有人只跑部分测试。最后代码质量就变得不可控。

第四，合并风险高。

如果没有自动检查，错误代码可能直接合并进 main 分支，影响后续部署甚至线上环境。

GitHub Actions 的核心价值就是：把这些重复、固定、可自动化的流程交给机器执行。

它常见的使用场景包括：

- Pull Request 时自动构建；
- Pull Request 时自动运行测试；
- 合并 main 后自动部署；
- 自动构建 Docker 镜像；
- 自动推送镜像到 Docker Hub；
- 自动发布 npm 包；
- 自动生成文档；
- 自动运行代码格式检查；
- 自动执行安全扫描。

简单来说，GitHub Actions 让 GitHub 不只是一个代码托管平台，还能成为自动化工作流的执行平台。

---

## 2. GitHub Actions 是什么

GitHub Actions 是 GitHub 提供的一套自动化工作流工具。

它可以监听仓库里的事件，比如：

- `push`；
- `pull_request`；
- `release`；
- issue 创建；
- 手动触发；
- 定时任务。

当指定事件发生时，GitHub Actions 会按照配置文件中的规则，在 GitHub 提供的运行环境中执行一系列命令。

比如：

```txt
有人向 main 发起 Pull Request
        ↓
触发 GitHub Actions
        ↓
安装依赖
        ↓
执行构建
        ↓
执行测试
        ↓
把结果显示在 PR 页面
```

开发者不用手动跑命令，GitHub 会自动完成。

---

## 3. GitHub Actions 的几个核心概念

学习 GitHub Actions，不需要一开始记住所有配置项。先理解下面几个概念就够了。

### 3.1 Workflow：工作流

Workflow 是一次自动化流程。

比如：

- PR 检查是一个 workflow；
- 自动部署是一个 workflow；
- 自动发布 npm 包也是一个 workflow。

Workflow 通过 YAML 文件定义，文件必须放在项目的这个目录下：

```txt
.github/workflows
```

例如：

```txt
.github/workflows/integration.yml
.github/workflows/deploy.yml
```

一个仓库可以有多个 workflow，每个 workflow 可以监听不同事件，执行不同任务。

### 3.2 Event：触发事件

Event 表示 workflow 在什么时候运行。

比如：

```yaml
on:
  pull_request:
    branches:
      - main
```

表示当有人向 `main` 分支发起 Pull Request 时触发。

再比如：

```yaml
on:
  push:
    branches:
      - main
```

表示当 `main` 分支发生 push 时触发。

这通常用于代码已经合并到主分支后，执行部署流程。

### 3.3 Job：任务

一个 workflow 里可以有一个或多个 job。

比如 Pull Request 检查可以有两个 job：

```txt
build
unit-test
```

一个负责构建项目，一个负责跑测试。

每个 job 默认可以独立运行，也可以配置依赖关系。

### 3.4 Step：步骤

Job 下面由多个 step 组成。

比如一个 build job 可能包括：

1. 拉取代码；
2. 设置 Node.js 环境；
3. 安装依赖；
4. 执行构建命令。

对应到 GitHub Actions 里，就是多个 step。

### 3.5 Runner：运行环境

GitHub Actions 里的命令不是在你的电脑上执行的，而是在 GitHub 提供的机器上执行的。

比如：

```yaml
runs-on: ubuntu-latest
```

表示这个 job 会运行在 GitHub 提供的 Ubuntu 环境中。

你可以简单理解为：GitHub 临时给你开了一台服务器，在上面拉取代码、安装依赖、执行命令，执行完后再销毁。

### 3.6 Action：可复用动作

GitHub Actions 生态里有很多已经写好的 action，可以直接复用。

比如：

```yaml
- uses: actions/checkout@v4
```

它的作用是把当前仓库的代码拉取到 runner 里。

再比如：

```yaml
- uses: actions/setup-node@v4
```

它的作用是设置 Node.js 环境。

这些 action 可以理解为别人已经封装好的自动化步骤，我们不需要重复造轮子。

---

## 4. 最简单的 GitHub Actions 示例

假设我们有一个 Node.js 项目，`package.json` 里有两个命令：

```json
{
  "scripts": {
    "build": "next build",
    "test": "jest"
  }
}
```

现在希望每次向 `main` 分支发起 Pull Request 时，自动安装依赖并执行构建。

可以创建文件：

```txt
.github/workflows/integration.yml
```

内容如下：

```yaml
name: Integration

on:
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout current branch
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm install
      - name: Run build
        run: npm run build
```

这就是一个最小可理解的 GitHub Actions 工作流。

它做了几件事：

第一，声明 workflow 名字：

```yaml
name: Integration
```

这个名字会显示在 GitHub 的 Actions 页面和 PR 检查里。

第二，声明触发条件：

```yaml
on:
  pull_request:
    branches:
      - main
```

意思是：只要有人向 `main` 分支提 Pull Request，就运行这个 workflow。

第三，定义一个 job：

```yaml
jobs:
  build:
```

这个 job 的名字叫 `build`。

第四，指定运行环境：

```yaml
runs-on: ubuntu-latest
```

意思是让 GitHub 在 Ubuntu runner 上执行任务。

第五，定义执行步骤：

```yaml
steps:
```

每一个 step 都是一件具体的事，比如拉代码、装 Node、安装依赖、执行构建。

这个例子能帮助我们理解 GitHub Actions 的基本结构，但它还不是完整业务写法。真实项目里通常还会跑测试、缓存依赖、配置分支保护，甚至执行部署。

---

## 5. Pull Request 阶段：自动构建和自动测试

在团队开发中，最常见的第一个自动化场景就是：每次有人提 Pull Request，都自动检查这次代码能不能正常合并。

比如我们希望在 PR 阶段自动做两件事：

1. 检查项目能不能成功 build；
2. 检查测试用例能不能全部通过。

可以写成下面这样：

```yaml
name: Integration

on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - name: Checkout current branch
        uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - name: Install dependencies
        run: npm install
      - name: Run build
        run: npm run build

  unit-test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - name: Checkout current branch
        uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - name: Install dependencies
        run: npm install
      - name: Run test cases
        run: npm run test
```

这个 workflow 比前面的最小例子更接近真实项目。

它有两个 job：

`build`：用于检查构建是否成功。

`unit-test`：用于检查测试是否通过。

### 5.1 为什么要使用 matrix

这里出现了一个配置：

```yaml
strategy:
  matrix:
    node-version: [18, 20, 22]
```

它表示同一个 job 会在多个 Node.js 版本下运行。

也就是说，GitHub Actions 会分别用 Node 18、Node 20、Node 22 执行构建或测试。

这在开源库、组件库、SDK 中很常见，因为你需要确认项目在多个运行环境下都能正常工作。

如果你是业务项目，也可以只保留一个版本，比如：

```yaml
node-version: 20
```

不需要一开始就把 matrix 配得很复杂。

### 5.2 actions/checkout 的作用

几乎所有 workflow 都会有这一行：

```yaml
- uses: actions/checkout@v4
```

它的作用是把仓库代码拉取到 GitHub runner 上。

要注意：runner 是 GitHub 临时创建的运行环境，它一开始并没有你的项目代码。没有 checkout，后面的 `npm install`、`npm run build` 都找不到项目文件。

### 5.3 actions/setup-node 的作用

这一段用于设置 Node.js 环境：

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
```

因为 runner 上不一定有你需要的 Node 版本，所以需要明确告诉 GitHub：这个项目要用哪个 Node 版本运行。

如果你的项目是最新 Next.js，通常需要 Node 18 或以上版本。否则可能会因为 Node 版本太低导致构建失败。

### 5.4 run 表示执行命令

比如：

```yaml
- name: Install dependencies
  run: npm install
```

表示在 runner 里执行：

```bash
npm install
```

再比如：

```yaml
- name: Run build
  run: npm run build
```

表示执行项目里的 build 脚本。

这些命令和你本地终端里执行的命令本质一样，只是它们现在由 GitHub 自动执行。

---

## 6. 检查失败时会发生什么

假设测试用例里原本期望页面中有一个数字 `1`，但你错误地改成了 `11`，那么本地执行：

```bash
npm run test
```

会失败。

如果你提交这个修改并创建 Pull Request，GitHub Actions 也会自动运行测试。

测试失败后，PR 页面上会显示失败状态。进入 Actions 页面，可以看到具体是哪一个 job 失败，哪一条测试失败，错误原因是什么。

这就是 GitHub Actions 在团队协作中的一个重要价值：

它把问题暴露在代码合并之前。

如果没有自动检查，错误代码可能已经进入 main 分支。等到后续部署或线上运行时才发现，成本就高很多了。

---

## 7. Branch Protection：让检查不通过的代码不能合并

光有自动测试还不够。

因为如果仓库没有限制，即使 GitHub Actions 失败了，某些人仍然可能强行点击 merge，把有问题的代码合并到 main。

所以真实团队里，通常会给 main 分支配置保护规则。

大致路径是：

```txt
Repository Settings
  → Branches
  → Branch protection rules
  → Add branch protection rule
```

然后填写分支名：

```txt
main
```

常见配置包括：

```txt
Require a pull request before merging
Require status checks to pass before merging
```

第一项表示不能直接推送到 `main`，必须通过 Pull Request。

第二项表示状态检查必须通过，也就是 GitHub Actions 的 build、test 等 job 必须成功，才能合并。

这样可以形成一条比较安全的流程：

```txt
开发者提交 PR
    ↓
GitHub Actions 自动检查
    ↓
构建和测试全部通过
    ↓
允许合并到 main
```

如果检查失败，普通协作者就不能合并。

需要注意的是，如果你是仓库 owner，某些情况下仍然可能有权限强制合并。但在团队项目中，正确配置权限后，就可以有效避免失败代码进入主分支。

---

## 8. 合并 main 后：自动构建 Docker 镜像并推送 Docker Hub

Pull Request 阶段主要关注代码质量，比如构建和测试。

但当代码真正合并到 main 分支后，通常还需要进入部署流程。

假设项目使用 Docker 部署，那么每次 main 更新后，我们可能需要手动执行：

```bash
docker build -t username/nextjs-app:latest .
docker push username/nextjs-app:latest
```

第一条命令负责构建 Docker 镜像。

第二条命令负责把镜像推送到 Docker Hub。

如果每次合并 main 都靠人手动执行这些命令，同样会浪费时间，而且容易忘记。

所以可以创建另一个 workflow：

```txt
.github/workflows/deploy.yml
```

这个 workflow 不在 Pull Request 时运行，而是在 `main` 分支发生 push 时运行。

也就是说，它对应的是：

```txt
代码已经合并到 main
        ↓
触发部署 workflow
        ↓
构建 Docker 镜像
        ↓
登录 Docker Hub
        ↓
推送镜像
```

一个基础写法如下：

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout current branch
        uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/nextjs-app:latest .
      - name: Login to Docker Hub
        run: echo "${{ secrets.DOCKERHUB_PASSWORD }}" | docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin
      - name: Push Docker image
        run: docker push ${{ secrets.DOCKERHUB_USERNAME }}/nextjs-app:latest
```

这就是一个非常典型的部署 workflow。

---

## 9. 为什么要用 GitHub Secrets

部署 workflow 里有一个很重要的问题：登录 Docker Hub 需要用户名和访问令牌。

最不应该做的事情，是把密码或 token 直接写进 YAML 文件里。

错误示例：

```yaml
run: echo "my-real-token" | docker login -u "my-username" --password-stdin
```

如果这是一个公开仓库，相当于把密钥暴露给所有人。即使是私有仓库，也不推荐这样做。

正确方式是使用 GitHub Secrets。

在仓库设置中找到：

```txt
Settings
  → Secrets and variables
  → Actions
  → Repository secrets
```

然后添加两个 secret：

```txt
DOCKERHUB_USERNAME
DOCKERHUB_PASSWORD
```

其中 `DOCKERHUB_PASSWORD` 通常不是 Docker Hub 登录密码，而是 Docker Hub 生成的 Access Token。

在 workflow 中使用 secrets：

```yaml
${{ secrets.DOCKERHUB_USERNAME }}
${{ secrets.DOCKERHUB_PASSWORD }}
```

GitHub Actions 在运行时会自动读取这些值，但不会把它们明文显示在日志中。

这就是 Secrets 的作用：让自动化流程可以使用敏感信息，但不把敏感信息写进代码仓库。

---

## 10. Docker Hub Access Token 是什么

如果 GitHub Actions 要把 Docker 镜像推送到 Docker Hub，它必须先登录 Docker Hub。

人工登录时，可以输入用户名和密码。

但自动化流程里没有人可以手动输入密码，所以需要使用 Access Token。

Docker Hub 的 Access Token 可以理解为一个专门给自动化系统使用的密码。

它的优势是：

- 可以单独创建；
- 可以单独删除；
- 不需要暴露你的主密码；
- 适合 CI/CD 系统使用；
- 权限更容易控制。

GitHub Actions 中常用的登录方式是：

```bash
echo "$DOCKERHUB_PASSWORD" | docker login -u "$DOCKERHUB_USERNAME" --password-stdin
```

为什么不用交互式输入？

因为 GitHub Actions 是自动执行的，不可能像人在终端里那样等待输入密码。

所以使用 `--password-stdin` 把 token 通过标准输入传给 Docker CLI，是更适合自动化环境的方式。

---

## 11. 两个 workflow 的区别：Integration 和 Deploy

到这里，其实视频中的核心设计已经很清楚了。

它把自动化流程分成了两个 workflow。

第一个是集成检查：

```txt
integration.yml
```

它监听：

```yaml
on:
  pull_request:
    branches:
      - main
```

主要做：

```txt
构建项目
运行测试
确保 PR 质量
```

第二个是部署流程：

```txt
deploy.yml
```

它监听：

```yaml
on:
  push:
    branches:
      - main
```

主要做：

```txt
构建 Docker 镜像
登录 Docker Hub
推送 Docker 镜像
```

它们的区别在于触发时机不同。

```txt
Pull Request 阶段：代码还没有进入 main，需要检查质量
Push main 阶段：代码已经进入 main，需要进入部署流程
```

这也是 CI/CD 中非常经典的一种拆分方式。

---

## 12. GitHub Actions 的核心流程是怎么跑起来的

从整体链路看，一个完整流程可以这样理解。

开发者先创建一个 feature 分支：

```bash
git checkout -b feature/navbar
```

完成开发后提交代码：

```bash
git add .
git commit -m "新增导航栏"
git push origin feature/navbar
```

然后在 GitHub 上创建 Pull Request，目标分支是 `main`。

此时触发 `integration.yml`：

```txt
PR created
    ↓
checkout 当前分支代码
    ↓
设置 Node.js 环境
    ↓
安装依赖
    ↓
执行 npm run build
    ↓
执行 npm run test
    ↓
检查结果显示在 PR 页面
```

如果失败，开发者需要修复后继续 push。

如果成功，并且通过 code review，就可以合并到 `main`。

合并后，`main` 分支发生 push，触发 `deploy.yml`：

```txt
main updated
    ↓
checkout main 分支代码
    ↓
docker build 构建镜像
    ↓
docker login 登录 Docker Hub
    ↓
docker push 推送镜像
    ↓
Docker Hub 出现最新镜像
```

后续服务器就可以拉取这个最新镜像进行部署。

这就是 GitHub Actions 自动化工作流的基本运行链路。

---

## 13. 一个更完整的 GitHub Actions 示例

下面给一个稍微完整一点的示例，把 PR 检查和 Docker 部署分成两个文件。

### 13.1 Pull Request 检查：integration.yml

```yaml
name: Integration

on:
  pull_request:
    branches:
      - main

jobs:
  build:
    name: Build App
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - name: Install dependencies
        run: npm install
      - name: Build application
        run: npm run build

  unit-test:
    name: Unit Test
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm
      - name: Install dependencies
        run: npm install
      - name: Run unit tests
        run: npm run test
```

这个文件的重点是保证进入 `main` 之前，代码至少满足两个条件：

```txt
能构建
测试通过
```

如果项目里还有 lint，也可以增加一个 job：

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: npm
    - run: npm install
    - run: npm run lint
```

不过初学阶段不用一开始就写太多 job。先让 build 和 test 跑起来就已经很有价值。

### 13.2 合并 main 后部署：deploy.yml

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  docker:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t ${{ secrets.DOCKERHUB_USERNAME }}/nextjs-app:latest .
      - name: Login to Docker Hub
        run: echo "${{ secrets.DOCKERHUB_PASSWORD }}" | docker login -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin
      - name: Push Docker image
        run: docker push ${{ secrets.DOCKERHUB_USERNAME }}/nextjs-app:latest
```

这个文件的重点是自动完成镜像发布。

其中：

```bash
docker build -t username/nextjs-app:latest .
```

表示根据当前项目根目录下的 Dockerfile 构建镜像。

```bash
docker push username/nextjs-app:latest
```

表示把镜像推送到 Docker Hub。

如果 Docker Hub 中原本是空仓库，workflow 执行成功后，就能看到一个新的镜像 tag。

---

## 14. 常见误区和使用边界

### 14.1 误区一：以为 GitHub Actions 只能用于部署

很多人第一次接触 GitHub Actions，是因为自动部署。

但它不只是部署工具。

它还可以用于：

- 自动测试；
- 自动构建；
- 自动代码检查；
- 自动发布；
- 自动生成文档；
- 自动处理 issue；
- 自动打 tag；
- 自动通知。

部署只是其中一个场景。

### 14.2 误区二：以为 workflow 在本地运行

GitHub Actions 的命令不是在你的电脑上执行，而是在 GitHub runner 上执行。

所以你本地有的环境，runner 上不一定有。

比如你本地装了 Node 22，但 runner 上不一定默认就是 Node 22。你需要通过：

```yaml
uses: actions/setup-node@v4
```

明确设置运行环境。

### 14.3 误区三：把密钥写进 YAML 文件

这是非常严重的问题。

不要这样写：

```yaml
run: echo "真实密码" | docker login -u "用户名" --password-stdin
```

正确做法是使用 GitHub Secrets：

```yaml
${{ secrets.DOCKERHUB_PASSWORD }}
```

敏感信息永远不要提交进代码仓库。

### 14.4 误区四：只写 Actions，不配置分支保护

如果没有 Branch Protection，即使检查失败，也可能有人强制合并。

所以真实团队里，Actions 和 Branch Protection 通常要一起使用。

Actions 负责检查，Branch Protection 负责阻止不合格代码进入 `main`。

### 14.5 误区五：所有 workflow 都写在一个文件里

技术上可以把很多 job 写在一个 workflow 里，但不一定清晰。

更推荐按照触发时机拆分。

比如：

```txt
integration.yml：PR 阶段检查
deploy.yml：main 更新后部署
```

这样结构更清楚，也方便团队维护。

### 14.6 误区六：不了解触发事件就乱写 on

`on` 是 workflow 的入口。

如果你写：

```yaml
on:
  push:
    branches:
      - main
```

它只会在 `main` 分支 push 时触发。

如果你写：

```yaml
on:
  pull_request:
    branches:
      - main
```

它只会在 PR 指向 `main` 时触发。

很多 Actions 没有按预期运行，问题往往出在触发事件写错了。

---

## 15. 学习 GitHub Actions 的建议

GitHub Actions 不建议一上来就学很复杂的 CI/CD。

更适合按这个顺序来。

第一步，先理解 workflow 文件的位置。

```txt
.github/workflows/xxx.yml
```

只要文件不在这个目录下，GitHub 就不会把它识别成 workflow。

第二步，理解 `on`。

先搞清楚 workflow 什么时候触发：

```yaml
on: pull_request
on: push
```

触发事件是整个自动化流程的入口。

第三步，理解 job 和 step。

可以先写一个最简单的 job：

```yaml
jobs:
  hello:
    runs-on: ubuntu-latest
    steps:
      - run: echo "hello github actions"
```

先让它跑起来，比一开始就写部署流程更重要。

第四步，把本地命令搬到 GitHub Actions 里。

比如你本地平时要执行：

```bash
npm install
npm run build
npm run test
```

就可以把这些命令写进 workflow 的 `run` 里。

第五步，再学习 secrets。

当你需要连接外部平台，比如 Docker Hub、云服务器、npm registry，就一定会遇到密钥管理问题。这时候再学习 GitHub Secrets 会比较自然。

第六步，再学习分支保护和部署。

当你已经能自动构建和测试后，再去配置 Branch Protection，让检查结果真正影响合并流程。

最后再考虑更复杂的内容，比如：

- 缓存优化；
- 多环境部署；
- 手动触发 workflow；
- artifact 上传；
- release 自动发布；
- 自托管 runner；
- 权限控制；
- 多 job 依赖关系。

---

## 16. 总结

GitHub Actions 的核心价值，是把软件开发中那些重复、固定、容易出错的流程自动化。

在 Pull Request 阶段，它可以帮你自动构建项目、运行测试，提前发现代码问题。在代码合并到 `main` 之后，它可以继续执行部署相关任务，比如构建 Docker 镜像并推送到 Docker Hub。

初学时，最需要记住的是这几个概念：

```txt
Workflow：一个自动化流程
Event：触发 workflow 的事件
Job：workflow 里的任务
Step：job 里的具体步骤
Runner：执行任务的运行环境
Secrets：保存敏感信息的地方
```

一个典型流程可以这样理解：

```txt
开发者提交 PR
    ↓
GitHub Actions 自动 build/test
    ↓
检查通过后允许合并
    ↓
合并 main 后自动构建 Docker 镜像
    ↓
推送到 Docker Hub
    ↓
进入后续部署流程
```

所以 GitHub Actions 不只是“自动跑几条命令”，它真正带来的价值是让团队开发流程变得标准、可靠、可追踪。

当项目越来越大、参与人数越来越多、发布越来越频繁时，这种自动化能力会变得非常重要。它可以减少人工操作，降低合并风险，也让每一次从代码提交到上线的过程更加稳定。
