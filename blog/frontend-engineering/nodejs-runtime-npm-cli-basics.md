# Node.js 基础学习笔记：从运行环境到 npm 与命令行能力

最近继续系统学习 Node.js。作为一个主要写 React / Next.js 的前端开发者，我以前对 JavaScript 的理解更多集中在浏览器环境：组件渲染、状态管理、事件交互、接口请求和页面性能优化。

但 Node.js 让我重新意识到，JavaScript 不只是浏览器脚本语言，它也可以运行在服务端、命令行和工程化环境中，完成后端服务、文件处理、环境变量读取、命令行交互、npm 包管理等任务。

这篇文章主要记录我对 Node.js 基础能力的阶段性理解，包括 Node.js 运行环境、npm、nodemon、环境变量、REPL、命令行参数、console 调试、用户输入以及模块导出。

## 一、Node.js 是什么？
Node.js 是一个开源、跨平台的 JavaScript 运行环境。它基于 Chrome V8 引擎，可以让 JavaScript 脱离浏览器运行。

以前我们写 JavaScript，更多是在浏览器里执行：

```js
document.querySelector('.btn')
window.localStorage
fetch('/api/user')
```

但在 Node.js 中，没有 DOM，也没有浏览器窗口。Node.js 更关注服务端和工程环境，比如：

- 读取文件
- 访问操作系统信息
- 创建 HTTP 服务
- 连接数据库
- 执行命令行脚本
- 管理项目依赖
- 构建后端 API

所以我现在对 Node.js 的理解是：

Node.js = JavaScript 的服务端运行环境 + 工程化运行环境
对于前端开发者来说，Node.js 非常重要。因为 React、Next.js、Vite、Webpack、npm、pnpm、脚手架、构建命令，本质上都离不开 Node.js 生态。

## 二、Node.js 为什么适合前端开发者学习？
Node.js 最大的优势之一是：前后端都可以使用 JavaScript / TypeScript。

这意味着前端开发者不需要马上切换到 Java、Go 或 Python，也可以开始理解后端服务和完整 Web 应用。

比如一个典型项目可以这样分工：

- React / Next.js：负责前端页面和用户交互
- Node.js / Express：负责后端接口和业务逻辑
- MongoDB / MySQL：负责数据持久化
- npm / Git：负责工程管理和协作

对我来说，学习 Node.js 不只是为了“写后端”，更是为了补齐前端工程化能力。尤其是 Next.js 本身就涉及 SSR、API Routes、Middleware、Server Components、环境变量等概念，如果不理解 Node.js，很多底层逻辑其实是不清楚的。

## 三、初始化一个 Node.js 项目
安装 Node.js 后，可以通过下面两个命令检查版本：

```bash
node -v
npm -v
```

Node.js 项目通常通过 npm init 初始化：

```bash
npm init
```

如果想快速使用默认配置，可以使用：

```bash
npm init -y
```

初始化后会生成一个 package.json 文件。这个文件非常重要，它是整个 Node.js 项目的配置中心。

一个简单的 package.json 可能长这样：

```json
{
"name": "nodejs-tutorial",
"version": "1.0.0",
"description": "Node.js tutorial for beginners",
"main": "index.js",
"scripts": {
"start": "node index.js"
}
}
```

之后就可以通过：

```bash
npm start
```

运行项目。

我的理解是：

package.json 不是普通配置文件，而是 Node.js 项目的入口说明书。
它记录了项目名称、版本、入口文件、启动脚本、依赖包、开发依赖等信息。

## 四、nodemon：提升开发效率
在 Node.js 开发中，如果每次修改代码都要手动重新运行：

```bash
node index.js
```

会非常麻烦。

这时候可以使用 nodemon。它可以监听文件变化，自动重启 Node.js 程序。

安装方式：

```bash
npm install nodemon --save-dev
```

然后在 package.json 中修改启动脚本：

```json
{
"scripts": {
"start": "nodemon index.js"
}
}
```

之后运行：

```bash
npm start
```

只要保存文件，程序就会自动重启。

这个工具虽然简单，但对开发体验提升很大。尤其是写 Express API 时，不需要频繁 Ctrl + C 再重新启动服务。

## 五、process：Node.js 中很重要的全局对象
在 Node.js 中，process 是一个非常重要的全局对象。它可以用来获取当前程序运行时的信息，也可以控制程序退出、读取环境变量、读取命令行参数等。

比如退出程序：

```js
process.exit(0)
```

其中：

- 0 表示正常退出
- 1 通常表示异常退出

读取环境变量：

```js
console.log(process.env.NODE_ENV)
```

读取命令行参数：

```js
console.log(process.argv)
```

我对 process 的理解是：

process 是 Node.js 程序和运行环境之间的桥梁。
它让程序能够知道自己运行在哪里、接收了什么参数、有什么环境变量，以及什么时候需要退出。

## 六、环境变量：不要把配置写死在代码里
在真实项目中，我们经常会遇到一些不能直接写进代码的配置，比如：

- 数据库连接地址
- API Key
- JWT Secret
- 端口号
- 第三方服务密钥
- 运行环境标识

这些内容通常应该放到环境变量里。

比如创建一个 .env 文件：

```env
NAME=Robin
PROFESSION=Developer
COURSE=Node.js
```

然后安装 dotenv：

```bash
npm install dotenv
```

在代码中引入：

```js
require('dotenv').config()

console.log(process.env.NAME)
console.log(process.env.PROFESSION)
console.log(process.env.COURSE)
```

这样就可以从 .env 文件中读取配置。

需要注意的是，.env 一般不应该提交到 GitHub。应该在 .gitignore 中添加：

.env
因为 .env 里面可能包含敏感信息。

这一点对后端开发和全栈开发都很重要。写代码不只是让功能跑起来，也要考虑安全性和可维护性。

## 七、REPL：Node.js 的交互式运行环境
直接在终端输入：

```bash
node
```

就会进入 Node.js 的 REPL 模式。

REPL 是：

- Read
- Eval
- Print
- Loop

也就是读取输入、执行代码、打印结果，然后继续等待下一次输入。

在 REPL 中可以快速测试代码：

```js
5 + 5
Math.random()
'hello' + ' node'
```

也可以定义函数：

```js
function generateRandomNumber() {
return Math.random()
}
```

然后调用：

```js
generateRandomNumber()
```

REPL 很适合临时验证 JavaScript 语法、测试某个 API、查看对象属性。它不是用来写正式项目的，但非常适合快速实验。

Node.js 还提供了 repl 模块，可以在代码中创建自定义 REPL：

```js
const repl = require('repl')

const local = repl.start('$ ')

local.on('exit', () => {
console.log('exiting REPL')
process.exit()
})
```

这个能力让我意识到，Node.js 不仅可以写 Web 服务，也可以写命令行工具和开发者工具。

## 八、命令行参数：process.argv
运行 Node.js 文件时，可以给程序传递参数：

```bash
node argument.js --name Robin --role developer
```

在代码中可以通过 process.argv 读取：

```js
console.log(process.argv)
```

process.argv 是一个数组：

- 第 0 项：node 程序路径
- 第 1 项：当前执行文件路径
- 第 2 项及以后：用户传入的参数

如果想更方便地解析参数，可以使用 minimist：

```bash
npm install minimist
```

代码示例：

```js
const minimist = require('minimist')

const args = minimist(process.argv.slice(2))

console.log(args.name)
console.log(args.role)
```

运行：

```bash
node argument.js --name Robin --role developer
```

就可以得到：

- Robin
- developer

这类能力在写 CLI 工具时非常有用。比如脚手架、自动化脚本、构建工具，很多都需要读取命令行参数。

## 九、console 不只是 console.log
以前我对 console 的理解比较简单，基本就是：

```js
console.log('hello')
```

但 Node.js 中的 console 其实有很多调试能力。

1. 格式化输出
```js
console.log('I am %s and my age is %d', 'Robin', 22)
```

常见格式：

- %s：字符串
- %d：数字
- %i：整数
- %o：对象

2. 计数

```js
console.count('render')
console.count('render')
console.countReset('render')
console.count('render')
```

适合用来统计某段逻辑执行了多少次。

3. 打印调用栈
```js
function fn1() {
console.trace('trace message')
}

function fn2() {
fn1()
}

fn2()
```

console.trace() 可以帮助我们查看函数调用链，对调试很有帮助。

4. 统计执行时间
```js
console.time('sum')

const result = 2 + 3

console.timeEnd('sum')
```

这个可以用来粗略观察某段代码的执行耗时。

这些能力虽然基础，但在日常调试中很实用。

## 十、命令行输出美化：progress 和 chalk
Node.js 也可以用来写命令行程序，而命令行程序的体验也可以优化。

比如使用 progress 创建进度条：

```bash
npm install progress
```

示例：

```js
const ProgressBar = require('progress')

const bar = new ProgressBar(':bar :percent', {
total: 20,
})

const timer = setInterval(() => {
bar.tick()

if (bar.complete) {
clearInterval(timer)
}
}, 100)
```

使用 chalk 给终端输出加颜色：

```bash
npm install chalk@4
```

示例：

```js
const chalk = require('chalk')

console.log(chalk.green('Node.js tutorial'))
console.log(chalk.blue('Learning command line output'))
```

这里要注意，如果使用 CommonJS 的 require 语法，chalk 的新版本可能会有 ESM 兼容问题，所以可以安装 chalk@4。

这也让我意识到，npm 包版本和模块规范在实际开发中非常重要，不能只会安装，还要理解版本差异。

## 十一、命令行输入：readline 和 prompt-sync
Node.js 不仅可以输出内容，也可以读取用户输入。

使用内置模块 readline：

```js
const readline = require('readline')

const rl = readline.createInterface({
input: process.stdin,
output: process.stdout,
})

rl.question('What is your name? ', (name) => {
console.log(`Hi ${name}`)
rl.close()
})
```

这段代码会在命令行中等待用户输入，输入完成后执行回调。

如果想写得更简单，也可以使用 prompt-sync：

```bash
npm install prompt-sync
```

示例：

```js
const prompt = require('prompt-sync')()

const name = prompt('What is your name? ')

console.log(`Hi ${name}`)
```

这种方式更接近同步写法，初学时会更容易理解。

命令行输入输出是 Node.js 很重要的能力，因为很多工程化工具本质上都是 CLI 程序，比如：

- create-react-app
- vite
- next
- eslint
- prettier
- hardhat
- foundry scripts

理解这些基础能力，有助于理解现代前端工具链。

## 十二、npm：Node.js 生态的核心
npm 是 Node Package Manager，也就是 Node.js 的包管理器。

常见命令包括：

```bash
npm init
npm install
npm install package-name
npm install package-name --save-dev
npm install package-name -g
npm update
npm uninstall package-name
npm list
npm view package-name version
npm run start
```

我对 npm 的理解是：

npm 解决的是项目依赖管理和脚本运行问题。
比如安装依赖：

```bash
npm install lodash
```

使用依赖：

```js
const _ = require('lodash')

const arr = [1, 4, 6, 8]

console.log(_.chunk(arr, 2))
console.log(_.last(arr))
```

执行本地包的命令：

```bash
npx cowsay "I am learning Node.js"
```

npx 可以直接运行包中的可执行命令，这也是很多脚手架工具的运行方式。

## 十三、package.json 和 package-lock.json

Node.js 项目中最重要的两个文件是：

- package.json
- package-lock.json

package.json 记录项目的依赖范围，例如：

```json
{
"dependencies": {
"express": "^4.18.1"
}
}
```

这里的 ^ 表示允许更新 minor 和 patch 版本，但不会自动升级到新的 major 版本。

语义化版本一般是：

major.minor.patch
比如：

4.18.1
其中：

- 4：major，大版本
- 18：minor，小版本
- 1：patch，补丁版本

package-lock.json 则会锁定当前实际安装的精确版本，保证团队成员安装依赖时尽量保持一致。

所以团队协作时，应该提交：

- package.json
- package-lock.json

但不要提交：

- node_modules

因为 node_modules 可以通过下面命令重新生成：

```bash
npm install
```

## 十四、Node.js 模块导出：module.exports 和 exports

Node.js 中常见的模块系统是 CommonJS。

比如有一个 car.js：

```js
const ford = {
brand: 'Ford',
model: 'Fiesta',
}

module.exports = ford
```

在 index.js 中引入：

```js
const car = require('./car')

console.log(car)
```

如果要导出多个内容，可以这样写：

```js
const ford = {
brand: 'Ford',
model: 'Fiesta',
}

const tesla = {
brand: 'Tesla',
model: 'Model 3',
}

exports.ford = ford
exports.tesla = tesla
```

引入时：

```js
const { ford, tesla } = require('./car')

console.log(ford)
console.log(tesla)
```

如果想更漂亮地打印对象，可以使用：

```js
console.log(JSON.stringify(ford, null, 2))
```

这里第三个参数 2 表示缩进空格数，适合调试复杂对象。

## 十五、阶段性总结
这部分 Node.js 学习虽然还没有进入大型项目，但对我来说非常重要。

因为它补齐了很多前端工程背后的基础能力：

- Node.js 如何运行 JavaScript
- npm 如何管理依赖
- package.json 如何组织项目
- nodemon 如何提升开发效率
- process 如何读取环境和参数
- dotenv 如何管理配置
- REPL 如何快速测试代码
- console 如何辅助调试
- readline 如何读取命令行输入
- module.exports 如何组织模块

这些内容看起来基础，但都是理解后端服务、CLI 工具、前端脚手架和工程化体系的前置知识。

以前我更多关注 React 组件怎么写、状态怎么管理、接口怎么请求。现在学习 Node.js 后，我开始更关注：

- 项目是如何启动的
- 依赖是如何管理的
- 环境变量是如何注入的
- 命令行工具是如何工作的
- 模块之间是如何组织的
- 服务端代码是如何运行的

这对我继续学习 Express、MongoDB、用户认证、CRUD API，以及理解 Next.js 服务端能力都有很大帮助。

## 结语
Node.js 对前端开发者来说，不只是后端入门工具，更是理解现代 JavaScript 工程体系的基础。

从 node index.js 到 npm start，从 process.env 到 .env，从 readline 到 CLI 输入输出，从 module.exports 到 npm 包管理，这些能力逐步构成了 Node.js 的基础开发模型。

后续我会继续整理 Express、Middleware、CRUD API、MongoDB、用户认证等内容，把这些基础能力和真实项目开发连接起来。
