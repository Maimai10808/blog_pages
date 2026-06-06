# 如何写好 Git Commit Message：一份实用的提交信息指南

在日常开发中，我们几乎每天都会用到 Git。无论是个人项目、团队协作，还是参与开源项目，提交代码都是一个非常高频的操作。

但是，很多人在写 commit message 的时候，往往只是随手写一句：

```bash
git commit -m "update"
```

或者：

```bash
git commit -m "fix bug"
```

短期来看，这样似乎也能完成提交。但当项目变大、时间变久，或者需要和别人协作时，混乱的提交记录就会带来很多问题：你很难知道某次修改到底做了什么，也很难理解当时为什么要这样改。

所以，写好 commit message 其实不是形式主义，而是一种很重要的工程习惯。

## 一、什么是 Commit Message？

在 Git 中，`commit` 用来保存当前代码的修改记录。简单来说，每一次 commit 都相当于给项目拍了一张“快照”。

而 commit message，就是这张快照的说明文字。

例如：

```bash
git add .
git commit -m "Add user login page"
```

这里的 `"Add user login page"` 就是 commit message。它告诉我们：这次提交新增了用户登录页面。

如果提交信息写得清楚，之后查看 Git 历史记录时，就能很快明白每一次修改的目的。

## 二、为什么要写好 Commit Message？

很多人可能会觉得：“我只是做个人项目，随便写一下也没关系吧？”

其实不完全是这样。

即使是个人项目，过一段时间后再回头看代码，你也很可能忘记当时为什么要这样修改。如果 commit message 写得太随意，比如：

```bash
update
```

```bash
change something
```

```bash
fix
```

那几乎无法提供任何有效信息。

而一个好的 commit message 可以帮助我们：

1. 快速理解历史修改；
2. 更方便地排查 bug；
3. 让团队成员理解代码变更；
4. 提高代码审查效率；
5. 给未来的自己留下清晰记录；
6. 在开源项目中体现专业性。

换句话说，commit message 不只是写给别人看的，也是写给未来的自己看的。

## 三、常见的 Git Commit 写法

最常见的提交方式是使用 `-m` 参数：

```bash
git commit -m "Fix typo in README"
```

这种方式适合比较简单的小修改。

如果一次提交包含较多内容，可以使用多段 commit message：

```bash
git commit -m "Fix login validation" -m "Add validation for empty email and password fields."
```

第一段是简短标题，第二段是更详细的说明。

也可以直接运行：

```bash
git commit
```

这时 Git 会打开默认编辑器，让你写更完整的提交信息。一般格式是：

```text
简短说明

更详细的说明内容，用来解释这次修改的原因、背景和影响。
```

标题和正文之间要空一行，这是比较推荐的格式。

## 四、一个好的 Commit Message 应该长什么样？

一个比较规范的 commit message 通常包含两部分：

```text
简短标题

详细说明这次修改做了什么，以及为什么要这样修改。
```

比如：

```text
Fix login form validation

Prevent users from submitting the login form when email or password is empty.
This improves user feedback and avoids unnecessary API requests.
```

这个提交信息就比简单写 `fix bug` 清楚得多。

它不仅说明了“修复登录表单校验”，还解释了为什么要修复：避免用户提交空表单，减少不必要的 API 请求。

## 五、常见的 Commit 类型

为了让提交记录更加统一，很多团队会给 commit message 加上类型前缀。常见类型包括：

```text
feat: 新功能
fix: 修复 bug
docs: 文档修改
style: 样式或格式修改
refactor: 代码重构
test: 测试相关修改
chore: 构建、依赖、配置等日常维护
```

例如：

```bash
git commit -m "feat: add wallet connect button"
```

表示新增了钱包连接按钮。

```bash
git commit -m "fix: correct login redirect path"
```

表示修复了登录跳转路径的问题。

```bash
git commit -m "docs: update project README"
```

表示更新了项目文档。

这种写法的好处是非常直观。别人一眼就能看出来这次提交属于什么类型。

## 六、推荐的 Commit Message 格式

比较推荐的格式是：

```text
type: short summary

longer description if needed
```

例如：

```text
feat: add task progress panel

Add a task progress panel to show completed tasks, current tier,
and claimable amount before issuing eligibility.
```

如果是简单修改，可以只写第一行：

```text
fix: correct typo in README
```

如果是复杂修改，就补充正文，说明修改背景和原因。

## 七、写 Commit Message 的实用规则

写好 commit message，不一定要很复杂，但至少要做到以下几点。

### 1. 标题要简短清楚

标题最好控制在 50 个字符左右，不要写太长。

不推荐：

```text
I changed some files and fixed some bugs in the login page
```

推荐：

```text
fix: improve login validation
```

### 2. 使用祈使句

英文 commit message 中通常使用祈使语气，比如：

```text
Add user profile page
```

而不是：

```text
Added user profile page
```

或者：

```text
Adds user profile page
```

这是 Git 社区比较常见的习惯。

### 3. 不要只写 “update” 或 “fix”

类似下面这种提交信息信息量太少：

```text
update
```

```text
fix
```

```text
change
```

更好的写法是：

```text
fix: resolve login form validation error
```

```text
docs: update installation guide
```

```text
refactor: simplify user store logic
```

### 4. 必要时解释为什么修改

代码本身通常只能告诉别人“你改了什么”，但不一定能说明“你为什么这样改”。

所以在一些重要修改中，正文说明很有必要。

例如：

```text
fix: prevent duplicate airdrop claims

Add a claimed mapping check before issuing a new eligibility record.
This prevents the same account from claiming the same campaign twice.
```

这里就明确说明了修改目的：防止重复领取。

### 5. 遵循团队约定

如果你在公司项目或者开源项目中开发，最重要的是遵循项目已有规范。

有些项目使用 Conventional Commits，有些项目有自己的格式。不要为了“个性化”而破坏团队的一致性。

## 八、适合个人项目的简单规范

如果是个人项目，不想搞得太复杂，可以先采用下面这套简单规则：

```text
feat: 新增功能
fix: 修复问题
docs: 修改文档
style: 修改样式
refactor: 重构代码
test: 添加或修改测试
chore: 依赖、配置、脚本等杂项修改
```

示例：

```text
feat: add Aleo devnet account switcher
```

```text
fix: prevent duplicate claim requests
```

```text
docs: add local devnet setup guide
```

```text
refactor: extract wallet state into Zustand store
```

这套规范已经足够覆盖大多数日常开发场景。

## 九、Commit Message 示例对比

不好的写法：

```text
update
```

较好的写法：

```text
docs: update README setup steps
```

不好的写法：

```text
fix bug
```

较好的写法：

```text
fix: handle empty wallet address
```

不好的写法：

```text
change page
```

较好的写法：

```text
feat: add task overview page
```

不好的写法：

```text
final version
```

较好的写法：

```text
chore: prepare demo submission files
```

可以看出，好的 commit message 并不一定很长，但它一定要具体、明确、有信息量。

## 十、总结

写好 Git Commit Message 是一个容易被忽视，但非常重要的开发习惯。

它不仅能让 Git 历史记录更加清晰，也能帮助团队协作、代码审查、问题排查和项目维护。对于个人开发者来说，好的提交信息也能帮助自己回顾项目演进过程，理解当时的开发思路。

一个好的 commit message 至少应该做到：

1. 明确说明这次提交做了什么；
2. 必要时说明为什么这样修改；
3. 使用统一的提交类型；
4. 避免无意义的 `update`、`fix`、`change`；
5. 遵循团队或项目已有规范。

代码会不断变化，项目会不断迭代，而清晰的提交记录就是项目成长过程中的说明书。

从今天开始，别再随手写 `update` 了。
