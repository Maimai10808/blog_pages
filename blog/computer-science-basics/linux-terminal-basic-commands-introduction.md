# Linux 终端入门：新手必须掌握的常用命令和基本思路

很多刚接触 Linux 的人，都会对终端有一点畏惧。

明明桌面上有文件管理器，为什么还要打开一个黑乎乎的窗口敲命令？为什么别人可以在终端里移动文件、安装软件、查找内容、修改权限，而自己只能一个个点图形界面？

其实终端并没有看起来那么难。它本质上只是另一种操作电脑的方式。图形界面是通过鼠标点击完成操作，终端是通过命令完成操作。

一开始学习终端，最重要的不是记住所有命令，而是先建立几个基本概念：

```txt
我现在在哪个目录？
这个目录里有什么？
我如何进入另一个目录？
我如何创建、查看、移动、复制、删除文件？
我如何搜索文件或文本？
我如何组合多个命令？
```

只要这些问题能回答清楚，Linux 终端就已经入门了一大半。

---

## 1. 如何打开终端

在大多数 Linux 桌面系统中，可以通过菜单找到 Terminal、终端、命令行等应用。

如果你使用的是 Ubuntu、Linux Mint 或其他 Debian / Ubuntu 系发行版，常见快捷键是：

```txt
Ctrl + Alt + T
```

打开终端后，如果字体太小，可以尝试：

```txt
Ctrl + +
```

放大字体。

如果想缩小字体，可以使用：

```txt
Ctrl + -
```

不同终端软件的快捷键可能略有差异，但大多数主流终端都支持类似操作。

---

## 2. pwd：查看当前所在目录

进入终端后，第一件事通常是确认自己当前在哪个位置。

使用：

```bash
pwd
```

`pwd` 是 `print working directory` 的缩写，意思是打印当前工作目录。

输出可能类似：

```txt
/home/user
```

这表示你当前位于用户的家目录。

在 Linux 中，用户家目录通常是：

```txt
/home/用户名
```

终端里经常会看到一个符号：

```txt
~
```

它表示当前用户的家目录。

比如：

```txt
~
```

等价于：

```txt
/home/user
```

所以看到：

```txt
~/Downloads
```

就表示：

```txt
/home/user/Downloads
```

---

## 3. cd：切换目录

`cd` 是 `change directory` 的缩写，用来切换目录。

比如进入下载目录：

```bash
cd Downloads
```

如果目录名比较长，可以输入前几个字母后按 Tab，终端会自动补全路径。

例如：

```bash
cd Down
```

按一下 Tab，可能会自动补全成：

```bash
cd Downloads
```

这就是命令行里非常常用的 tab 补全。

### 3.1 回到家目录

有几种方式可以回到家目录。

第一种，直接写完整路径：

```bash
cd /home/user
```

第二种，使用 `~`：

```bash
cd ~
```

第三种，最简单，直接执行：

```bash
cd
```

不带任何参数的 `cd` 默认回到当前用户的家目录。

### 3.2 回到上一次所在目录

如果你刚从一个目录切换到另一个目录，想回到上一次所在位置，可以使用：

```bash
cd -
```

这个命令在两个目录之间来回切换时非常方便。

---

## 4. clear：清空终端屏幕

终端输出内容太多时，可以清屏。

使用：

```bash
clear
```

也可以用快捷键：

```txt
Ctrl + L
```

这不会删除之前的命令历史，只是把屏幕显示清空，让终端看起来更干净。

---

## 5. ls：查看目录内容

`ls` 是 Linux 里最常用的命令之一，用来列出当前目录中的文件和文件夹。

```bash
ls
```

如果不带参数，它会列出当前目录中非隐藏的文件和目录。

### 5.1 查看隐藏文件

Linux 中，以 `.` 开头的文件或目录是隐藏文件。

比如：

```txt
.bashrc
.config
.local
```

普通 `ls` 不会显示它们。

如果想查看所有文件，包括隐藏文件，可以使用：

```bash
ls -a
```

这里的 `-a` 表示 `all`。

### 5.2 查看详细信息

如果想查看文件权限、所有者、大小、修改时间等信息，可以使用：

```bash
ls -l
```

它会以长格式显示目录内容。

### 5.3 更常用的组合：ls -lah

日常使用中，经常会写：

```bash
ls -lah
```

含义是：

```txt
-l：长格式显示
-a：显示所有文件，包括隐藏文件
-h：以人类可读方式显示文件大小
```

如果没有 `-h`，文件大小可能显示为一串字节数，不太直观。加上 `-h` 后，会显示成 KB、MB、GB 这样的格式。

---

## 6. man：查看命令手册

Linux 命令通常有很多参数，不可能一次性全部记住。

想查看某个命令的说明，可以使用：

```bash
man 命令名
```

比如查看 `ls` 的手册：

```bash
man ls
```

进入 man 页面后，可以上下滚动查看说明。

退出时按：

```txt
q
```

`man` 是学习 Linux 命令非常重要的工具。以后不确定某个命令怎么用时，可以先查它的 man page。

---

## 7. 创建文件：touch 和 nano

### 7.1 touch：创建空文件

如果只是想创建一个空文件，可以用：

```bash
touch file1.txt
```

然后执行：

```bash
ls
```

就能看到新建的 `file1.txt`。

`touch` 常用于快速创建空文件。

### 7.2 nano：创建并编辑文件

如果想创建文件并马上写内容，可以用文本编辑器。

Linux 终端里比较适合新手的是 `nano`。

```bash
nano file2.txt
```

打开后可以直接输入内容。

保存并退出：

```txt
Ctrl + X
```

然后按：

```txt
Y
```

确认保存，再按回车。

---

## 8. cat 和 less：查看文件内容

### 8.1 cat：直接打印文件内容

如果想查看一个文件内容，可以使用：

```bash
cat file2.txt
```

如果文件很短，`cat` 很方便。

但如果文件很长，`cat` 会一次性把所有内容输出到终端，阅读起来不方便。

### 8.2 less：分页查看长文件

查看长文件更适合使用：

```bash
less 文件名
```

例如：

```bash
less ~/.bashrc
```

`less` 会从文件开头开始显示，可以逐行阅读。

常用操作：

```txt
回车：向下滚动一行
空格：向下翻页
q：退出
```

所以简单理解：

```txt
cat 适合看短文件
less 适合看长文件
```

---

## 9. mkdir：创建目录

创建目录使用：

```bash
mkdir test
```

然后查看：

```bash
ls
```

就能看到 `test` 目录。

进入目录：

```bash
cd test
```

如果想返回上一级目录，可以使用：

```bash
cd ..
```

这里的 `..` 表示上一级目录。

---

## 10. mv 和 cp：移动与复制文件

### 10.1 mv：移动文件

假设当前目录有一个文件：

```txt
file1.txt
```

还有一个目录：

```txt
test
```

把文件移动到 `test` 目录中：

```bash
mv file1.txt test/
```

执行后，`file1.txt` 会从当前目录消失，出现在 `test` 目录中。

查看 `test` 目录：

```bash
ls test
```

### 10.2 cp：复制文件

复制文件使用：

```bash
cp file2.txt test/
```

复制和移动的区别是：

```txt
mv：原位置不再保留
cp：原位置仍然保留一份
```

如果想复制目录，通常需要加 `-r`：

```bash
cp -r dir1 dir2
```

---

## 11. rm、rmdir 和 rm -rf：删除文件和目录

### 11.1 rm：删除文件

删除文件使用：

```bash
rm file.txt
```

如果文件在某个目录下，需要写路径：

```bash
rm test/file.txt
```

### 11.2 rmdir：删除空目录

删除空目录可以使用：

```bash
rmdir test
```

但如果目录里还有文件，`rmdir` 会失败。

### 11.3 rm -rf：递归强制删除目录

如果想删除一个目录以及里面的所有内容，可以使用：

```bash
rm -rf test
```

这里：

```txt
-r：递归删除
-f：强制删除
```

这个命令非常危险。

比如：

```bash
rm -rf /
```

可能会破坏整个系统。

再比如：

```bash
rm -rf ~
```

会删除你家目录里的大量数据。

所以执行 `rm -rf` 前一定要反复确认路径是否正确。

---

## 12. which 和 whereis：查找程序位置

### 12.1 which：查看命令对应的可执行文件

比如：

```bash
which ls
```

可能输出：

```txt
/usr/bin/ls
```

这表示 `ls` 命令对应的可执行文件在 `/usr/bin/ls`。

再比如：

```bash
which firefox
```

可以查看 Firefox 的可执行文件路径。

### 12.2 whereis：查找更多相关路径

`whereis` 不只显示可执行文件，还可能显示库文件、man 手册路径等。

```bash
whereis firefox
```

可能输出：

```txt
firefox: /usr/bin/firefox /usr/lib/firefox /usr/share/man/...
```

简单理解：

```txt
which 更直接，查可执行文件
whereis 信息更多
```

---

## 13. locate 和 find：查找文件

### 13.1 locate：快速查找

`locate` 可以快速搜索系统中的文件路径。

比如：

```bash
locate firefox
```

它会列出路径中包含 `firefox` 的文件和目录。

有些系统默认没有安装 `locate`，在 Debian / Ubuntu 系统中可以安装：

```bash
sudo apt install mlocate
```

`locate` 依赖数据库，如果你刚创建了新文件但搜索不到，可能需要更新数据库：

```bash
sudo updatedb
```

### 13.2 find：更灵活的查找

`find` 是更强大的查找命令。

比如从根目录开始查找名字中包含 `linux` 的文件或目录：

```bash
sudo find / -iname "linux"
```

这里：

```txt
/：从根目录开始搜索
-iname：按名字搜索，忽略大小写
"linux"：搜索关键词
```

`find` 参数很多，非常强大。初学阶段可以先掌握最基本形式：

```bash
find 起始目录 -name "文件名"
```

例如：

```bash
find . -name "*.txt"
```

表示在当前目录及子目录中查找所有 `.txt` 文件。

---

## 14. echo、printf 和重定向

### 14.1 echo：输出文本

```bash
echo "hello world"
```

输出：

```txt
hello world
```

`echo` 常用于打印文本、查看变量值、写简单脚本。

### 14.2 printf：格式化输出

`printf` 比 `echo` 更适合格式化输出。

比如：

```bash
printf "one\ntwo\nthree\n"
```

输出：

```txt
one
two
three
```

这里的 `\n` 表示换行。

### 14.3 >：把输出写入文件

可以使用 `>` 把命令输出重定向到文件。

比如：

```bash
printf "one\ntwo\nthree\n" > file1.txt
```

这会把输出写入 `file1.txt`。

然后查看：

```bash
cat file1.txt
```

会看到：

```txt
one
two
three
```

需要注意：`>` 会覆盖原文件内容。

如果想追加内容，一般使用：

```bash
>>
```

例如：

```bash
echo "four" >> file1.txt
```

---

## 15. grep：搜索文本内容

如果想在文件中查找某个关键词，可以使用 `grep`。

比如在 `.bashrc` 中搜索 `alias`：

```bash
grep "alias" ~/.bashrc
```

它会输出所有包含 `alias` 的行。

`grep` 非常常用，尤其适合查日志、查配置、查代码。

比如：

```bash
grep "error" app.log
```

表示查找日志中包含 `error` 的行。

---

## 16. 管道 |：把多个命令组合起来

管道是 Linux 命令行非常重要的能力。

它的符号是：

```txt
|
```

作用是：把前一个命令的输出，交给后一个命令继续处理。

比如：

```bash
ls -l | grep ".txt"
```

意思是：

```txt
先执行 ls -l
再把输出交给 grep
grep 只筛选包含 .txt 的行
```

管道可以把很多小命令组合成强大的处理流程。

再比如：

```bash
cat app.log | grep "error"
```

表示查看日志文件，并筛选出包含 `error` 的行。

实际上可以写得更简单：

```bash
grep "error" app.log
```

但管道的意义在于：它可以让多个命令串联起来。

例如：

```bash
ls -l | grep ".txt" | sort
```

这表示：

```txt
列出文件
筛选 txt 文件
再排序
```

---

## 17. head 和 tail：查看文件开头或结尾

如果一个文件很长，但你只想看前几行，可以用：

```bash
head 文件名
```

默认显示前 10 行。

比如：

```bash
head ~/.bashrc
```

如果想指定行数：

```bash
head -n 15 ~/.bashrc
```

表示显示前 15 行。

如果想看文件最后几行，可以用：

```bash
tail 文件名
```

默认显示最后 10 行。

指定行数：

```bash
tail -n 15 ~/.bashrc
```

`tail` 在查看日志时尤其常用。

比如：

```bash
tail -n 50 app.log
```

表示查看日志最后 50 行。

---

## 18. chmod：修改文件权限

在 Linux 中，每个文件都有权限。

使用：

```bash
ls -l
```

可能会看到类似：

```txt
-rw-r--r-- 1 user user 123 file.txt
```

前面的：

```txt
-rw-r--r--
```

就是权限信息。

`chmod` 用来修改文件权限。

比如：

```bash
chmod 755 file1.txt
```

或者给脚本增加执行权限：

```bash
chmod +x script.sh
```

---

## 19. 执行 Shell 脚本

创建一个简单脚本：

```bash
nano script.sh
```

写入：

```bash
echo "hello world"
```

保存退出。

尝试执行：

```bash
./script.sh
```

如果提示：

```txt
Permission denied
```

说明没有执行权限。

添加执行权限：

```bash
chmod +x script.sh
```

再执行：

```bash
./script.sh
```

就会输出：

```txt
hello world
```

这里的 `./` 表示执行当前目录下的脚本。

---

## 20. history、!编号 和 !!

### 20.1 history：查看命令历史

```bash
history
```

会列出你最近执行过的命令。

每条命令前面都有编号。

### 20.2 !编号：执行历史中的某条命令

假设 `history` 中第 84 条命令是：

```bash
tail -n 15 ~/.bashrc
```

可以直接执行：

```bash
!84
```

终端会重新运行第 84 条命令。

### 20.3 !!：上一条命令

`!!` 表示上一条命令。

它最常见的用法是补 sudo。

比如你执行：

```bash
apt update
```

结果提示权限不够。

可以直接执行：

```bash
sudo !!
```

它等价于：

```bash
sudo apt update
```

非常方便。

---

## 21. kill、killall、xkill 和 htop：结束程序

有时候程序卡住了，需要从终端结束它。

### 21.1 kill：根据进程 ID 结束程序

```bash
kill 进程ID
```

进程 ID 可以通过 `ps`、`top`、`htop` 等工具查看。

### 21.2 killall：根据程序名结束程序

```bash
killall firefox
```

这会尝试结束所有名为 `firefox` 的进程。

### 21.3 xkill：点击窗口关闭程序

如果安装了 `xkill`，可以执行：

```bash
xkill
```

鼠标会变成一个特殊图标。点击某个窗口，就会关闭那个窗口。

这个命令在图形界面程序卡住时很方便。

### 21.4 htop：交互式查看和管理进程

安装：

```bash
sudo apt install htop
```

运行：

```bash
htop
```

它会显示当前系统中的进程，可以用方向键选择进程，然后按 F9 结束。

退出 `htop`：

```txt
q
```

或者根据界面提示操作。

---

## 22. ping 和 wget：网络相关命令

### 22.1 ping：测试网络连通性

```bash
ping google.com
```

如果能持续返回响应，说明网络连接正常。

停止 `ping`：

```txt
Ctrl + C
```

`ping` 常用于判断服务器、网站或网络是否可达。

### 22.2 wget：下载网络文件

```bash
wget 文件URL
```

比如：

```bash
wget https://example.com/file.iso
```

`wget` 常用于从命令行下载文件，尤其在服务器环境中非常常见。

---

## 23. date、cal 和 bc：几个实用小工具

### 23.1 date：查看日期时间

```bash
date
```

会输出当前日期和时间。

### 23.2 cal：查看日历

```bash
cal
```

会输出当前月份的日历。

### 23.3 bc：命令行计算器

```bash
bc
```

进入计算器后可以输入：

```txt
2 + 2
```

输出：

```txt
4
```

退出：

```txt
quit
```

---

## 24. .bashrc 和 alias：给常用命令设置别名

在用户家目录中，有一个常见配置文件：

```txt
~/.bashrc
```

它是 Bash shell 的配置文件之一。

可以用 `nano` 打开：

```bash
nano ~/.bashrc
```

里面可能已经有一些 alias，比如：

```bash
alias ll='ls -alF'
```

这表示以后输入：

```bash
ll
```

就等价于执行：

```bash
ls -alF
```

### 24.1 给系统更新命令设置别名

在 Debian、Ubuntu、Linux Mint 这类系统中，更新系统常用命令是：

```bash
sudo apt update && sudo apt upgrade
```

这个命令比较长，可以在 `.bashrc` 中添加别名：

```bash
alias aptup='sudo apt update && sudo apt upgrade'
```

保存后，让配置立即生效：

```bash
source ~/.bashrc
```

之后就可以直接执行：

```bash
aptup
```

这就是 alias 的价值：把常用长命令变成短命令，提高效率。

---

## 25. 新手学习终端时的几个建议

### 25.1 不要一开始追求记住所有命令

Linux 命令很多，不可能一次全部记住。

新手先掌握这些就够了：

```txt
pwd
cd
ls
touch
nano
cat
less
mkdir
mv
cp
rm
grep
chmod
history
man
```

这些命令已经能完成大部分基础操作。

### 25.2 多用 Tab 补全

终端不是让你每个路径都完整手打。

输入一部分后按 Tab，可以自动补全文件名、目录名，能减少很多错误。

### 25.3 删除命令要特别小心

尤其是：

```bash
rm -rf
```

这个命令执行前一定要确认路径。

不要复制网上不理解的删除命令直接运行。

### 25.4 学会查 man 手册

忘记命令参数很正常。

比如忘记 `ls` 有哪些参数，可以查：

```bash
man ls
```

忘记 `find` 怎么用，可以查：

```bash
man find
```

会查文档，比死记命令更重要。

### 25.5 从真实任务中练习

可以给自己设几个小练习：

1. 创建一个目录；
2. 进入这个目录；
3. 创建两个 txt 文件；
4. 写入几行内容；
5. 复制其中一个文件；
6. 移动另一个文件；
7. 用 `grep` 搜索某个词；
8. 用 `chmod` 给脚本加执行权限；
9. 写一个 `echo hello` 的脚本并运行。

这些操作练熟之后，终端就不会陌生了。

---

## 26. 总结

Linux 终端并不是高手专属工具，它只是 Linux 中非常高效的一种操作方式。

新手刚开始不需要理解所有底层原理，只要先掌握几个最常用的操作：

```txt
查看当前位置：pwd
切换目录：cd
查看目录内容：ls
创建文件：touch / nano
查看文件：cat / less
创建目录：mkdir
移动文件：mv
复制文件：cp
删除文件：rm / rmdir
搜索文本：grep
修改权限：chmod
查看帮助：man
```

当你熟悉这些命令后，会慢慢发现，很多原本需要在图形界面里点很多次的操作，在终端里只需要一行命令。

比如查看目录内容，用 `ls`；移动文件，用 `mv`；搜索文本，用 `grep`；更新系统，用一个 alias 就能完成。

终端真正强大的地方，不是某一个命令有多复杂，而是这些小命令可以通过管道、重定向、脚本和别名组合起来，形成一套非常高效的工作方式。

刚开始可以慢一点，边敲边理解。只要多练几次，这些命令就会变成肌肉记忆。Linux 终端入门，最重要的一步就是：打开终端，亲手把这些命令跑一遍。
