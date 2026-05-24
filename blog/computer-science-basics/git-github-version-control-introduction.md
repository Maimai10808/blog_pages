# Git 和 GitHub 入门：从版本控制到团队协作，一篇文章讲清楚

很多人第一次接触 Git，都会觉得它有点绕。

明明只是写代码，为什么还要 `add` 一下？为什么 `commit` 之后还要 `push`？为什么有了 Git，还要用 GitHub？为什么切换分支后，文件会突然消失或者出现？为什么合并代码时会产生冲突？

这些问题很正常。因为 Git 不是一个“保存文件”的工具，它真正解决的是：如何记录项目的每一次变化，并让多人安全地协作开发同一个项目。

如果你只是一个人写一个很小的 demo，可能暂时感觉不到 Git 的价值。但只要项目稍微复杂一点，或者涉及多人协作、版本回退、代码备份、线上问题修复，Git 就会变成开发工作里非常重要的一部分。

这篇文章会沿着一个初学者最容易理解的路线，讲清楚 Git 和 GitHub 的基本概念、常用命令、分支协作、冲突处理以及 Pull Request 的基本流程。

---

## 1. 为什么需要 Git：版本控制到底解决什么问题

在没有 Git 之前，很多人管理文件版本的方式可能是这样的：

```txt
project-final
project-final-new
project-final-new-2
project-final-really-final
project-final-client-old-version
```

这种方式看起来简单，但问题非常多。

比如你写了一个项目，客户确认了第一版。一个月后客户又提出了一些新需求，于是你直接修改了原来的代码。结果过几天客户又说：“还是之前那个版本比较好。”

这时候你可能就麻烦了。

如果你没有保存旧版本，就很难准确恢复到之前的状态。即使你手动备份过几个文件，也很难知道：

- 哪些文件被改过；
- 每次改动发生在什么时候；
- 是谁改的；
- 为什么这样改；
- 当前版本和旧版本到底差在哪里。

Git 解决的就是这个问题。

它可以记录项目中每一次变化，包括：

- 哪个文件被修改了；
- 哪些内容被新增或删除了；
- 谁提交了这次修改；
- 修改发生在什么时候；
- 每次提交对应的说明是什么。

更重要的是，Git 允许你随时回到之前的某一个版本。

所以简单理解，Git 是一个版本控制系统。它不是只适合代码，理论上文本、配置文件、文档等很多文件都可以用 Git 管理。只是因为代码项目最需要版本追踪和多人协作，所以 Git 在软件开发中使用最广泛。

---

## 2. Git 和 GitHub 不是一回事

初学者经常把 Git 和 GitHub 混在一起，但它们不是同一个东西。

### Git 是本地版本控制工具

Git 安装在你的电脑上。它负责追踪本地项目中的文件变化，并把这些变化保存成一个个版本。

你可以完全不使用 GitHub，只在自己电脑上使用 Git。

比如：

```bash
git init
git add .
git commit -m "init project"
```

这些操作都发生在本地电脑上，不需要联网，也不依赖 GitHub。

### GitHub 是远程代码托管平台

GitHub 是一个在线平台，用来存放 Git 仓库。

它的作用类似于代码世界里的云盘，但它不只是存文件，还支持：

- 远程仓库；
- 多人协作；
- Pull Request；
- Issue；
- 代码审查；
- 开源项目管理；
- CI/CD 自动化流程。

除了 GitHub，还有 GitLab、Bitbucket 等平台。它们都可以托管 Git 仓库，只是 GitHub 更流行，尤其在开源社区中使用非常广泛。

可以这样理解：

```txt
Git：本地记录代码历史的工具
GitHub：把 Git 仓库放到云端并支持协作的平台
```

如果用一个生活化类比，Git 像是你本地的笔记管理系统，GitHub 像是一个在线协作空间。你可以自己写，也可以把内容同步上去，和别人一起修改、讨论、合并。

---

## 3. Git 的核心结构：工作区、暂存区、本地仓库、远程仓库

理解 Git，最重要的是理解它的几个区域。

一个项目从修改到上传，一般会经过这几个地方：

```txt
工作区 → 暂存区 → 本地仓库 → 远程仓库
```

### 3.1 工作区：你真正写代码的地方

工作区就是你平时打开项目、编辑文件的地方。

比如你新建了一个 `index.html`，修改了一个 `main.js`，删除了一个 `style.css`，这些操作都发生在工作区。

此时 Git 能检测到变化，但还没有真正保存这些变化。

你可以用：

```bash
git status
```

查看当前工作区发生了什么变化。

### 3.2 暂存区：准备提交的临时区域

当你确认某些修改想要保存进版本历史时，需要先把它们放进暂存区。

命令是：

```bash
git add 文件名
```

或者：

```bash
git add .
```

暂存区可以理解为一个“待提交清单”。

为什么 Git 不直接从工作区提交到仓库，而是多了一个暂存区？

因为暂存区给了你一次整理机会。你可以决定这次提交到底包含哪些文件，而不是把所有修改一股脑全提交进去。

比如你同时改了登录功能和样式文件，但只想先提交登录功能，就可以只 `add` 和登录相关的文件。

### 3.3 本地仓库：真正保存版本历史的地方

当修改进入暂存区后，可以通过 `commit` 保存到本地仓库：

```bash
git commit -m "完成登录功能"
```

一次 commit 就是项目历史中的一个版本节点。

它会记录：

- 本次提交修改了哪些内容；
- 提交人是谁；
- 提交时间；
- 提交说明；
- 唯一的 commit id。

提交完成后，这次修改就正式进入 Git 的版本历史了。

### 3.4 远程仓库：放在 GitHub 上的云端仓库

本地仓库只存在于你的电脑上。

如果你想把代码备份到云端，或者和团队成员共享代码，就需要把本地提交推送到远程仓库：

```bash
git push origin main
```

这里的 `origin` 通常表示远程仓库地址，`main` 表示要推送的分支。

所以完整流程可以理解为：

```txt
修改文件
  ↓
git add
  ↓
进入暂存区
  ↓
git commit
  ↓
保存到本地仓库
  ↓
git push
  ↓
上传到 GitHub
```

这条链路是学习 Git 最核心的基础。

---

## 4. 安装 Git 与初始化仓库

使用 Git 之前，需要先安装它。

安装完成后，可以在终端里输入：

```bash
git --version
```

如果能看到版本号，说明 Git 已经安装成功。

例如：

```txt
git version 2.x.x
```

接下来可以创建一个本地项目：

```bash
mkdir git-demo
cd git-demo
```

然后初始化 Git 仓库：

```bash
git init
```

执行后，Git 会在当前目录下创建一个隐藏文件夹：

```txt
.git
```

这个 `.git` 文件夹非常重要，它保存了 Git 的内部数据，包括提交历史、分支信息、配置等。

一般不要手动修改或删除 `.git` 文件夹。删除它，就相当于这个项目不再是一个 Git 仓库，之前的版本历史也会丢失。

---

## 5. git status：查看当前项目状态

在 Git 中，`git status` 是一个非常常用的命令。

它可以告诉你当前项目处于什么状态：

```bash
git status
```

比如：

- 哪些文件被修改了；
- 哪些文件是新建的；
- 哪些文件已经进入暂存区；
- 当前分支是否落后或领先远程分支；
- 是否还有内容需要提交。

初学 Git 时，不确定当前发生了什么，就先运行：

```bash
git status
```

它相当于 Git 世界里的“查看当前情况”。

---

## 6. git add：把修改放入暂存区

当你修改了文件后，Git 会检测到变化，但这些变化还没有准备提交。

这时需要使用 `git add`。

### 添加指定文件

```bash
git add 1.txt
```

只把 `1.txt` 放入暂存区。

### 添加当前目录及子目录的修改

```bash
git add .
```

这是日常开发中最常用的写法之一。

它表示把当前目录以及子目录里的变化加入暂存区。

### 添加整个仓库的所有变化

```bash
git add -A
```

或者：

```bash
git add --all
```

这两个命令效果基本一样，会把整个仓库里的新增、修改、删除都加入暂存区。

### git add . 和 git add -A 的区别

在很多情况下，它们效果看起来差不多，但严格来说：

`git add .` 主要作用于当前目录及其子目录。

`git add -A` 作用于整个仓库，通常更完整。

如果你在仓库根目录执行 `git add .`，一般也能满足大多数日常开发需求。

---

## 7. git commit：把修改保存为一个版本

暂存区里的内容可以通过 `git commit` 保存为一个版本：

```bash
git commit -m "修改首页样式"
```

这里的 `-m` 表示添加提交说明。

提交说明非常重要，它不是随便写的。好的 commit message 可以帮助自己和团队成员快速理解这次提交做了什么。

比如下面这种就比较清楚：

```bash
git commit -m "新增用户登录接口"
git commit -m "修复商品列表分页错误"
git commit -m "优化移动端导航样式"
```

不太推荐这样的提交说明：

```bash
git commit -m "update"
git commit -m "fix"
git commit -m "test"
```

因为过一段时间再看，很难知道这次提交到底改了什么。

---

## 8. 第一次提交前：配置用户名和邮箱

如果你第一次使用 Git，执行 `git commit` 时可能会看到类似提示：

```txt
Please tell me who you are
```

这是因为 Git 需要知道提交者是谁。

可以通过下面两个命令配置：

```bash
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"
```

`--global` 表示这份配置对当前电脑上的所有 Git 仓库生效。

如果只想在当前项目中配置，可以去掉 `--global`：

```bash
git config user.name "你的名字"
git config user.email "你的邮箱"
```

每一次 commit 都会记录提交者信息，所以这是 Git 的基础配置之一。

---

## 9. git log：查看提交历史

提交之后，可以用 `git log` 查看历史记录：

```bash
git log
```

它会显示每次提交的详细信息，包括：

- commit id；
- 作者；
- 时间；
- 提交说明。

如果觉得默认输出太长，可以使用简洁模式：

```bash
git log --oneline
```

输出可能类似这样：

```txt
a1b2c3d 修复登录错误
e4f5g6h 新增用户页面
i7j8k9l 初始化项目
```

前面的短字符串是 commit id 的简写。通过 commit id，可以对比版本、回退版本，或者查看某次提交的具体变化。

---

## 10. git reset：撤回暂存或提交

`git reset` 是一个很容易让初学者紧张的命令，因为它和撤销有关。

### 取消暂存

如果你已经执行了：

```bash
git add .
```

但又想把文件从暂存区拿出来，可以执行：

```bash
git reset
```

这会把暂存区里的内容退回工作区。

文件修改还在，只是不再处于待提交状态。

### 撤销最近一次提交

如果已经 commit 了，但想撤回最近一次提交，可以使用：

```bash
git reset HEAD~
```

这会撤销最近一次提交，并把修改退回到工作区。

也就是说，commit 没了，但文件修改还在。

### 强制回到某个状态

还有一种更危险的写法：

```bash
git reset --hard
```

它会丢弃工作区的修改，让项目回到最近一次提交的状态。

如果文件中有未提交的修改，执行后会直接消失，所以要非常谨慎。

---

## 11. git restore：恢复文件到上一次提交状态

如果你改了一些文件，但发现思路错了，想放弃这些未提交修改，可以用：

```bash
git restore 文件名
```

例如：

```bash
git restore 1.txt
```

这会把 `1.txt` 恢复到最近一次 commit 时的状态。

如果想恢复整个项目：

```bash
git restore .
```

如果文件已经被添加到暂存区，可以先取消暂存：

```bash
git restore --staged 文件名
```

比如：

```bash
git restore --staged 1.txt
```

简单理解：

`git restore 文件名` 用于丢弃工作区修改。

`git restore --staged 文件名` 用于取消暂存，但保留文件修改。

---

## 12. git rm：删除文件并记录删除操作

如果你直接在文件系统里删除一个文件，Git 会检测到这个删除操作。

然后你还需要执行：

```bash
git add .
```

把删除操作加入暂存区。

Git 提供了一个更直接的命令：

```bash
git rm 文件名
```

例如：

```bash
git rm 4.txt
```

它会同时做两件事：

1. 删除文件；
2. 把删除操作加入暂存区。

如果文件有未提交修改，Git 可能会阻止删除。这是为了防止你误删内容。

如果你确认要强制删除，可以使用：

```bash
git rm -f 4.txt
```

如果你只是想让 Git 不再追踪某个文件，但文件本身仍然保留在本地，可以使用：

```bash
git rm --cached 4.txt
```

这个命令常用于某些文件已经被提交过，但后来希望加入 `.gitignore`，不再让 Git 管理。

如果要删除整个文件夹，需要加上 `-r`：

```bash
git rm -r my-folder
```

这里的 `-r` 表示递归删除目录及其内部内容。

---

## 13. git clone：从 GitHub 克隆仓库

除了在本地用 `git init` 创建仓库，也可以直接从 GitHub 克隆一个已有仓库：

```bash
git clone 仓库地址
```

例如：

```bash
git clone https://github.com/username/repository.git
```

执行后，Git 会把远程仓库下载到本地，并自动保留 `.git` 目录。

这意味着克隆下来的项目本身就是一个完整的 Git 仓库，你可以直接查看历史、创建分支、提交修改。

本地创建仓库和克隆远程仓库的区别可以这样理解：

```txt
git init：从本地新建一个 Git 仓库
git clone：从远程复制一个已有 Git 仓库
```

---

## 14. git push、git fetch、git pull：本地和远程如何同步

Git 本地仓库和 GitHub 远程仓库之间，最常用的三个命令是：

```txt
git push
git fetch
git pull
```

它们分别负责不同方向的数据同步。

### git push：把本地提交推送到远程

当你本地 commit 之后，GitHub 上还不会自动更新。

需要执行：

```bash
git push origin main
```

含义是：把本地 `main` 分支的提交推送到远程仓库 `origin` 的 `main` 分支。

如果你有一个新分支，比如 `development`，也可以推送：

```bash
git push origin development
```

这样 GitHub 上就会出现对应的远程分支。

### git fetch：拉取远程更新，但不合并

如果 GitHub 上有新的提交，你可以执行：

```bash
git fetch
```

它会把远程更新下载到本地，但不会直接修改你的工作区文件。

也就是说，fetch 比较安全，它只是让本地知道远程发生了什么变化。

### git pull：拉取并合并远程更新

如果你想直接把远程更新同步到当前分支，可以执行：

```bash
git pull
```

它相当于：

```txt
git fetch + git merge
```

也就是说，`git pull` 会先拉取远程更新，然后尝试合并到当前分支。

日常开发中，很多人会在开始工作前先执行：

```bash
git pull
```

确保本地代码是最新的。

---

## 15. Git 分支：为什么不要直接在 main 上乱改

分支是 Git 最重要的能力之一。

默认情况下，一个仓库通常会有一个主分支，叫：

```txt
main
```

以前很多项目叫 `master`，现在更常见的是 `main`。

主分支一般代表项目的稳定版本。真实开发中，不建议所有新功能都直接在 `main` 上修改，因为这样很容易把未完成的代码带进稳定分支。

更合理的方式是：

1. 从 `main` 创建一个新分支；
2. 在新分支上开发功能；
3. 测试通过后；
4. 再把新分支合并回 `main`。

创建分支：

```bash
git branch development
```

查看分支：

```bash
git branch
```

切换分支：

```bash
git checkout development
```

也可以创建并切换到新分支：

```bash
git checkout -b feature-login
```

分支可以理解为一条独立的开发线。

你在 `development` 分支提交的内容，不会自动出现在 `main` 分支里。只有合并之后，主分支才会拥有这些变化。

---

## 16. git merge：把一个分支的内容合并到另一个分支

假设你在 `development` 分支开发完成了一个功能，现在想合并回 `main`。

先切换到 `main`：

```bash
git checkout main
```

然后执行：

```bash
git merge development
```

意思是：把 `development` 分支上的变化合并到当前所在的 `main` 分支。

注意，`git merge` 是把别的分支合并到当前分支。

所以你当前在哪个分支，合并结果就会进入哪个分支。

例如：

```bash
git checkout development
git merge main
```

表示把 `main` 的更新合并进 `development`。

```bash
git checkout main
git merge development
```

表示把 `development` 的更新合并进 `main`。

这个方向一定要搞清楚。

---

## 17. 合并冲突：为什么会冲突，怎么解决

如果两个分支修改了不同文件，Git 通常可以自动合并。

但如果两个分支修改了同一个文件的同一块内容，Git 就不知道应该保留哪一份，于是会产生冲突。

比如：

在 `staging` 分支里，你把 `4.txt` 改成：

```txt
44
```

在 `development` 分支里，别人把同一个位置改成：

```txt
444
```

当你尝试合并时，Git 可能会提示：

```txt
Automatic merge failed; fix conflicts and then commit the result.
```

打开冲突文件，会看到类似内容：

```txt
<<<<<<< HEAD
444
=======
44
>>>>>>> staging
```

这表示 Git 把两个版本都展示出来，让你手动决定。

你可以选择保留上面的内容，也可以保留下面的内容，也可以合并成新的内容。

解决冲突后，需要删除这些冲突标记：

```txt
<<<<<<<
=======
>>>>>>>
```

然后重新执行：

```bash
git add .
git commit -m "解决合并冲突"
```

冲突并不可怕。它只是 Git 在告诉你：这里我不能替你做决定，需要开发者自己判断。

---

## 18. git checkout：切换分支，也可以查看历史版本

`git checkout` 最常见的用法是切换分支：

```bash
git checkout main
git checkout development
```

它还可以用来切换到某个历史提交：

```bash
git checkout commit_id
```

比如：

```bash
git checkout a1b2c3d
```

这样项目会回到某个历史版本的状态。

这时你可能会看到提示：

```txt
detached HEAD
```

这表示你当前不在某个正常分支上，而是在某个历史提交点上查看代码。

如果只是查看旧版本，没问题。

如果想回到最新的主分支，可以执行：

```bash
git checkout main
```

一般初学阶段，只需要记住：用 `checkout commit_id` 可以查看历史版本，但不要随便在 `detached HEAD` 状态下长期开发。

---

## 19. git diff：比较两个版本的差异

如果想知道两个提交之间到底差了什么，可以使用：

```bash
git diff commit_id_1 commit_id_2
```

它会显示：

- 哪些文件发生了变化；
- 哪些行被删除；
- 哪些行被新增。

比如：

```bash
git diff a1b2c3d e4f5g6h
```

在终端输出中，通常：

- 删除的内容会用 `-` 表示；
- 新增的内容会用 `+` 表示。

`git diff` 很适合用来检查某两次提交之间的具体变化。

---

## 20. git stash：临时保存未完成的工作

真实开发中，经常会遇到这种情况：

你正在写一个功能，但还没有写完，不适合提交。突然同事让你切到另一个分支看一个问题。

这时候如果直接切分支，Git 可能会提示：

```txt
Your local changes would be overwritten by checkout
```

因为你当前有未提交修改，切换分支可能导致这些修改丢失。

这时可以使用：

```bash
git stash
```

它会把当前未提交的修改临时保存起来，并让工作区恢复干净。

然后你就可以切换分支：

```bash
git checkout development
```

处理完事情后，再切回原分支：

```bash
git checkout main
```

恢复刚才暂存的工作：

```bash
git stash pop
```

### stash pop 和 stash apply 的区别

恢复 stash 有两个常用命令：

```bash
git stash pop
```

和：

```bash
git stash apply
```

区别是：

```txt
git stash pop：恢复修改，并从 stash 列表中删除这份记录
git stash apply：恢复修改，但 stash 记录仍然保留
```

查看 stash 列表：

```bash
git stash list
```

删除某个 stash：

```bash
git stash drop
```

`git stash` 非常适合临时切换任务，但不要把它当成长久保存代码的方式。重要代码还是应该通过 commit 进入版本历史。

---

## 21. git revert：安全撤销某次提交

如果某次提交引入了 bug，但这个提交已经推送到了远程仓库，不建议直接用 reset 去改历史。

更安全的方式是：

```bash
git revert commit_id
```

`git revert` 的作用是：创建一个新的提交，用来抵消某次旧提交带来的变化。

它不会删除原来的提交历史。

比如你有一个提交：

```txt
a1b2c3d 新增 hello 3
```

后来发现这个提交有问题，可以执行：

```bash
git revert a1b2c3d
```

Git 会生成一个新的 commit，专门撤销 `a1b2c3d` 这次提交的修改。

这和 reset 最大的区别是：

```txt
git reset：可能会删除提交历史
git revert：不删除历史，而是新增一个“反向提交”
```

因此，在团队协作或已经推送到远程的分支上，revert 通常比 reset 更安全。

---

## 22. git rebase：让提交历史更线性

`git rebase` 是一个更进阶的命令，主要用来整理提交历史。

假设你从 `main` 创建了一个 `feature` 分支：

```bash
git checkout -b feature
```

你在 `feature` 上提交了几个功能。

与此同时，其他人在 `main` 上也提交了新内容。

现在你希望 `feature` 分支基于最新的 `main` 继续开发，有两种方式。

第一种是 merge：

```bash
git merge main
```

它会把 `main` 合并进来，并可能产生一个 merge commit。

第二种是 rebase：

```bash
git rebase main
```

它会把你的 `feature` 分支“搬到”最新的 `main` 后面，让历史看起来像是你从最新的 `main` 开始开发的一样。

简单理解：

```txt
merge：保留真实分叉和合并历史
rebase：整理成更线性的历史
```

rebase 的优点是提交历史更干净。

但它也有一个重要风险：rebase 会改写提交历史。

所以不要随便对已经推送到远程、并且多人共同使用的公共分支执行 rebase。否则可能导致别人本地的提交历史和远程对不上，造成同步困难。

更合理的原则是：

```txt
自己的本地功能分支可以 rebase
多人共享的公共分支谨慎 rebase
```

---

## 23. Pull Request：团队协作中的代码合并流程

在真实团队中，开发者通常不会直接把代码合并到 `main` 分支。

更常见的流程是：

1. 从 `main` 创建一个功能分支；
2. 在功能分支上开发；
3. 提交代码并 push 到 GitHub；
4. 在 GitHub 上创建 Pull Request；
5. 团队成员进行代码 review；
6. 确认没问题后合并到 main。

Pull Request，简称 PR。

它的意思是：“我在这个分支上完成了一些修改，请帮我检查一下。如果没问题，请把它合并到目标分支。”

在 GitHub 上创建 PR 时，一般需要选择：

```txt
base：目标分支，比如 main
compare：来源分支，比如 development
```

也就是：

```txt
把 development 的修改合并到 main
```

GitHub 会展示：

- 本次 PR 包含哪些提交；
- 哪些文件发生了变化；
- 哪些行被新增或删除；
- 是否存在冲突；
- 是否通过自动检查。

团队成员可以在 PR 里评论、讨论、提出修改建议。

确认没问题后，点击：

```txt
Merge pull request
```

就可以把代码合并到目标分支。

PR 的价值不只是合并代码，更重要的是让代码进入主分支之前经过 review，从而降低错误进入稳定分支的风险。

---

## 24. 一条完整的 Git 日常工作流

把前面的内容串起来，一个比较常见的 Git 工作流是这样的：

```bash
# 1. 拉取远程最新代码
git pull

# 2. 创建并切换到新分支
git checkout -b feature-login

# 3. 修改代码后查看状态
git status

# 4. 添加到暂存区
git add .

# 5. 提交到本地仓库
git commit -m "新增登录功能"

# 6. 推送到远程分支
git push origin feature-login
```

然后到 GitHub 上创建 Pull Request，请团队成员 review。

如果 review 后需要修改，就继续在这个分支上提交：

```bash
git add .
git commit -m "根据 review 修改登录校验逻辑"
git push origin feature-login
```

GitHub 上的 PR 会自动更新。

最后合并进 `main`。

这就是很多公司日常使用 Git 和 GitHub 的基本方式。

---

## 25. 初学 Git 时最容易混淆的几个点

### 1. git add 不是提交

`git add` 只是把修改放入暂存区。

真正保存版本的是：

```bash
git commit
```

### 2. git commit 不是上传 GitHub

commit 只保存到本地仓库。

上传到 GitHub 需要：

```bash
git push
```

### 3. git fetch 不会直接改你的文件

`git fetch` 只是下载远程更新信息，不会直接合并到工作区。

如果想直接同步远程更新，用：

```bash
git pull
```

### 4. 分支上的修改不会自动出现在其他分支

你在 `development` 分支提交的代码，不会自动出现在 `main`。

需要执行：

```bash
git merge development
```

或者通过 GitHub 创建 PR 合并。

### 5. rebase 很强，但不要乱用

`git rebase` 可以让提交历史更干净，但它会改写历史。

如果分支已经被多人使用，就要非常谨慎。

---

## 26. Git 常用命令速查

最后整理一份入门常用命令。

```bash
# 查看 Git 版本
git --version

# 初始化本地仓库
git init

# 克隆远程仓库
git clone 仓库地址

# 查看当前状态
git status

# 添加文件到暂存区
git add 文件名
git add .
git add -A

# 提交修改
git commit -m "提交说明"

# 查看提交历史
git log
git log --oneline

# 取消暂存
git reset

# 恢复文件修改
git restore 文件名
git restore .

# 删除文件并记录删除
git rm 文件名

# 查看分支
git branch

# 创建分支
git branch 分支名

# 切换分支
git checkout 分支名

# 创建并切换分支
git checkout -b 分支名

# 合并分支
git merge 分支名

# 推送到远程
git push origin 分支名

# 拉取远程更新但不合并
git fetch

# 拉取并合并远程更新
git pull

# 暂存未完成工作
git stash

# 恢复最近一次 stash
git stash pop

# 查看 stash 列表
git stash list

# 安全撤销某次提交
git revert commit_id

# 变基
git rebase 分支名
```

---

## 27. 总结

Git 的核心不是命令本身，而是它背后的版本管理思维。

你在工作区修改文件，通过 `git add` 选择哪些修改进入暂存区，再通过 `git commit` 把这些修改保存到本地仓库。如果需要共享或备份，就通过 `git push` 推送到 GitHub。团队协作时，每个人在自己的分支上开发，通过 merge 或 Pull Request 把稳定代码合并回主分支。

初学 Git，最重要的是先理解这条主线：

```txt
工作区 → 暂存区 → 本地仓库 → 远程仓库
```

再理解分支：

```txt
main 保持稳定
功能分支负责开发
开发完成后再合并
```

最后再学习 `stash`、`revert`、`rebase` 这些更灵活的命令。

Git 一开始确实会让人觉得命令很多、概念很多。但只要你理解了它为什么存在，就会发现这些命令其实都在围绕同一个目标服务：安全地记录变化，清晰地管理版本，并让多人协作变得可控。
