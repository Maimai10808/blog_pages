# EVM 完整入门指南：从 Stack、Memory、Calldata、Storage 到 Opcode 执行过程

如果你想从一个初级或中级 Solidity 开发者，继续成长为更成熟的区块链工程师，甚至是智能合约安全研究员，那么理解 EVM 是绕不开的一步。

很多时候，我们写 Solidity 时看到的是高级语言：

```solidity
uint256 public count;

function increment() external {
    count++;
}
```

但真正被链上执行的并不是 Solidity 源码，而是编译后的 EVM Bytecode。EVM 会按照一条条 opcode 指令执行，并在执行过程中读写 Stack、Memory、Calldata、Storage 等不同数据区域。

理解这些底层结构，可以帮助我们：

更好地理解 Solidity 代码如何执行；

写出更省 Gas 的合约；

读懂反编译结果和字节码；

分析合约安全问题；

理解 calldata、memory、storage 的区别；

理解函数选择器、fallback、selector dispatch 等底层机制。

这篇文章会系统梳理 EVM 中几个最重要的数据区域，并通过函数调用过程理解 EVM 是如何执行智能合约的。

## 一、EVM 中数据可以存在哪里

在 EVM 中，数据并不是只有一种存放位置。常见的数据区域包括：

Stack；

Memory；

Calldata；

Storage；

Code；

Logs。

其中最常用、也最需要重点理解的是前四个：

Stack；

Memory；

Calldata；

Storage。

它们的生命周期、读写方式、Gas 成本和使用场景都不同。

简单对比一下：

| 区域     | 是否持久化 | 是否可写 | 主要用途                       | Gas 成本 |
| -------- | ---------- | -------- | ------------------------------ | -------- |
| Stack    | 否         | 可写     | 运算、临时变量、opcode 参数    | 低       |
| Memory   | 否         | 可写     | 临时数据、数组、结构体、返回值 | 中       |
| Calldata | 否         | 只读     | 函数输入参数、外部调用数据     | 低       |
| Storage  | 是         | 可写     | 合约状态变量                   | 高       |

其中 Storage 是唯一持久化的数据区域。它可以理解为合约的链上数据库。

Stack、Memory、Calldata 都只存在于一次交易执行过程中。交易结束后，它们都会被清空。

## 二、Stack：EVM 的操作栈

EVM 是一个基于栈的虚拟机。

Stack 是 EVM 最核心的数据结构之一。它的工作方式类似“后进先出”。

你可以把 Stack 想象成一个杯子：

先放进去的数据在下面；

后放进去的数据在上面；

取数据时，先取最上面的。

这个过程对应两个常见动作：

push：把数据压入栈；

pop：把栈顶数据弹出。

在 EVM 中，Stack 中存储的是 32 字节的 word。

也就是说，每一个 Stack 元素都是一个 32 bytes 的数据。

例如我们想把数字 `1` 放到 Stack 中，实际形式类似：

```txt
0x0000000000000000000000000000000000000000000000000000000000000001
```

这是一个完整的 32 字节 word，只不过前面全是 0，最后一位是 1。

EVM 中很多 opcode 都会从 Stack 顶部读取参数，然后把计算结果再压回 Stack。

例如 `ADD` 指令会：

从 Stack 顶部取出两个值；

把它们相加；

把结果压回 Stack。

可以理解为：

```txt
Stack before:
[3]
[2]

执行 ADD

Stack after:
[5]
```

很多类型最终都会以 32 字节 word 的形式放在 Stack 中，例如：

`uint256`；

`bool`；

`address`；

指向 memory 的指针；

指向 storage 的槽位；

中间计算结果。

Stack 很快，但也有深度限制。EVM Stack 最多支持 1024 个元素，因此复杂逻辑中编译器需要不断在 Stack、Memory 之间移动数据。

## 三、Memory：交易执行期间的临时内存

Memory 也是临时数据区域，只在一次交易执行期间存在。

和 Stack 不同，Memory 不是后进先出的结构。它更像一块可寻址的临时空间，可以在指定位置读写数据。

Memory 同样以 32 字节为基本单位。

在 Solidity 中，Memory 常用于：

函数中的临时数组；

临时 struct；

字符串处理；

ABI 编码；

返回值构造；

哈希计算过程中的临时数据。

例如：

```solidity
function getArray() external pure returns (uint256[] memory) {
    uint256[] memory arr = new uint256[](2);
    arr[0] = 1;
    arr[1] = 2;
    return arr;
}
```

这里的 `arr` 就存储在 memory 中。

## 四、Memory 的特殊布局

Solidity 对 memory 有一套约定布局。

几个重要位置包括：

```txt
0x00 - 0x3f：scratch space
0x40 - 0x5f：free memory pointer
0x60 - 0x7f：zero slot
0x80 之后：可分配的自由内存区域
```

### 1. 0x00 到 0x3f：scratch space

这部分是 Solidity 内部使用的临时空间。

它通常用于一些短期操作，比如哈希计算时的中间数据。

### 2. 0x40：free memory pointer

`0x40` 位置存放的是 free memory pointer，也就是“空闲内存指针”。

它告诉 EVM：下一段可以安全写入的新 memory 从哪里开始。

在一次执行刚开始时，`0x40` 位置通常存放：

```txt
0x80
```

意思是：当前可以安全使用的 memory 从 `0x80` 开始。

### 3. 0x60：zero slot

`0x60` 位置通常保持为 0。

它常被 Solidity 用作动态数组的初始空值引用，因此不应该随便写入。

### 4. 0x80 之后：自由内存区域

从 `0x80` 开始，才是真正可以分配给程序使用的 memory 区域。

当合约需要写入新的临时数据时，通常会读取 `0x40` 中的 free memory pointer，知道从哪里开始写，然后更新 `0x40` 中的指针位置。

## 五、Memory Expansion 与 Gas 成本

Memory 的 Gas 成本和使用范围有关。

如果你只是使用较低位置的 memory，成本相对较低。

但如果你突然往一个非常远的位置写入数据，例如：

```txt
0xffff....ffff
```

EVM 需要认为中间所有 memory 区域都被扩展了，这会产生非常高的 memory expansion 成本。

Memory 扩展成本不是简单线性增长，随着使用范围变大，成本会明显上升。

所以在写底层 Solidity、Yul 或 assembly 时，不要随便向很大的 memory offset 写入数据。

## 六、Calldata：只读的函数调用数据

Calldata 是外部调用合约时附带的原始输入数据。

例如调用：

```solidity
transfer(address to, uint256 amount)
```

这次调用的函数选择器和参数都会放在 calldata 中。

Calldata 的特点是：

只读；

不可修改；

生命周期只存在于当前调用；

读取成本低；

适合外部函数参数。

在 Solidity 中，如果外部函数接收数组、字符串、bytes 等参数，并且你不需要修改它们，应该优先使用 `calldata`：

```solidity
function submit(uint256[] calldata values) external {
    // 只读取 values，不修改
}
```

不要写成：

```solidity
function submit(uint256[] memory values) external {
    // 如果不修改 values，这里会浪费 gas
}
```

因为 `memory` 会把 calldata 中的数据复制一份到 memory，而 `calldata` 可以直接读取原始调用数据。

所以一个常见 Gas 优化原则是：

外部函数参数如果不需要修改，优先使用 calldata。

## 七、Storage：链上持久化状态

Storage 是 EVM 中最昂贵、但也是最重要的数据区域。

它是唯一持久化的数据区域。

合约中的状态变量最终都会存储在 Storage 中：

```solidity
uint256 public count;
address public owner;
mapping(address => uint256) public balances;
```

Storage 可以理解为合约的链上数据库。

交易执行结束后，Stack、Memory、Calldata 都会消失，但 Storage 中的数据会被保留下来，成为区块链状态的一部分。

## 八、Storage Slot

Storage 由一个个 slot 组成。

每个 slot 是 32 字节。

例如：

```solidity
uint256 public a;
uint256 public b;
```

通常情况下：

`a` 存在 slot 0；

`b` 存在 slot 1。

每个合约账户在链上状态中都有自己的 storage trie。合约地址对应一个账户，账户中除了 nonce、balance、code hash 等信息外，还会有 storage root，用来表示这个合约的存储状态。

Storage 的读写操作对应两个重要 opcode：

`SLOAD`：读取 storage；

`SSTORE`：写入 storage。

其中 `SSTORE` 非常昂贵。因为它会改变链上状态，需要被所有节点验证和保存。

因此，Solidity Gas 优化中一个非常重要的原则是：

少写 storage，能用 memory 就不要频繁写 storage。

## 九、Code 与 Logs

除了 Stack、Memory、Calldata、Storage 外，还有两个区域也值得知道。

### 1. Code

Code 指的是合约部署后的字节码。

合约地址上存储的代码也是链上状态的一部分。EVM 执行合约时，读取的就是这些 bytecode。

Solidity 源码最终会被编译成 EVM bytecode，其中包含一条条 opcode。

### 2. Logs

Logs 用于记录事件。

例如：

```solidity
event Transfer(address indexed from, address indexed to, uint256 amount);
```

当合约执行：

```solidity
emit Transfer(from, to, amount);
```

EVM 会把事件写入交易日志。

Logs 是只写的。合约内部不能读取过去的 logs，但链下应用可以通过节点查询事件日志。

这也是为什么前端、索引器、The Graph 等系统经常依赖 event 追踪链上状态变化。

## 十、Opcode：EVM 真正执行的指令

Solidity 不是 EVM 直接执行的内容。

Solidity 会先编译成 bytecode，而 bytecode 中包含一条条 opcode。

Opcode 是 EVM 的基础指令。

例如：

`ADD`：加法；

`PUSH1`：压入 1 字节数据到 Stack；

`PUSH32`：压入 32 字节数据到 Stack；

`POP`：弹出 Stack 顶部数据；

`MSTORE`：写入 Memory；

`MLOAD`：读取 Memory；

`SSTORE`：写入 Storage；

`SLOAD`：读取 Storage；

`CALLDATALOAD`：读取 Calldata；

`JUMP`：跳转；

`JUMPI`：条件跳转；

`RETURN`：返回；

`REVERT`：回滚。

每个 opcode 都有对应的十六进制编码。

例如：

```txt
PUSH1  -> 0x60
PUSH32 -> 0x7f
POP    -> 0x50
MLOAD  -> 0x51
MSTORE -> 0x52
SLOAD  -> 0x54
SSTORE -> 0x55
```

EVM 执行 bytecode 时，就是不断读取 opcode，并根据当前 Stack、Memory、Storage、Calldata 的状态执行相应操作。

## 十一、PUSH、POP 与 Stack 操作

`PUSH` 系列 opcode 用于把数据压入 Stack。

它从 `PUSH1` 到 `PUSH32`：

```txt
PUSH1
PUSH2
...
PUSH32
```

`PUSH1` 表示压入 1 字节数据。

`PUSH32` 表示压入 32 字节数据。

例如，如果 bytecode 中有：

```txt
7f ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
```

其中 `0x7f` 是 `PUSH32`，后面的 32 字节 `ff...ff` 是被压入 Stack 的值。

这通常对应 Solidity 中的：

```solidity
type(uint256).max
```

因为 `uint256` 最大值就是 32 字节全为 `1`，也就是十六进制全是 `f`。

## 十二、MSTORE 与 MLOAD

Memory 的读写主要通过 `MSTORE` 和 `MLOAD` 完成。

### 1. MSTORE

`MSTORE` 用于向 memory 写入一个 32 字节 word。

它会从 Stack 上读取：

写入位置；

写入值。

然后把这个值存入指定 memory offset。

### 2. MLOAD

`MLOAD` 用于从 memory 读取一个 32 字节 word。

它会从 Stack 上读取一个 memory offset，然后把该位置的 32 字节数据加载到 Stack 顶部。

例如在交易执行开始时，经常会看到类似逻辑：

```txt
PUSH1 0x80
PUSH1 0x40
MSTORE
```

意思是：

把 `0x80` 放入 Stack；

把 `0x40` 放入 Stack；

执行 `MSTORE`；

最终效果是：

```txt
memory[0x40] = 0x80
```

这就是初始化 free memory pointer。

## 十三、SSTORE 与 SLOAD

Storage 的读写通过 `SSTORE` 和 `SLOAD` 完成。

### 1. SLOAD

`SLOAD` 从指定 storage slot 读取 32 字节数据，并压入 Stack。

例如读取：

```solidity
uint256 public count;
```

如果 `count` 位于 slot 0，那么底层会执行类似：

```txt
SLOAD slot 0
```

### 2. SSTORE

`SSTORE` 向指定 storage slot 写入数据。

例如：

```solidity
count = 1;
```

底层会把 `1` 写入 `count` 对应的 storage slot。

`SSTORE` 是非常昂贵的操作。尤其是从 0 写成非 0，或者修改已有状态时，Gas 成本明显高于普通 Stack 和 Memory 操作。

所以优化合约时要格外关注 storage 写入次数。

## 十四、函数调用从 calldata 开始

当你调用一个合约函数时，本质上是向合约地址发送一段 calldata。

例如调用：

```solidity
count()
```

实际 calldata 的前 4 个字节是函数选择器。

函数选择器的计算方式是：

```txt
keccak256("count()") 的前 4 个字节
```

可以使用 Foundry 的 `cast` 工具查看：

```bash
cast sig "count()"
```

输出类似：

```txt
0x06661abd
```

这 4 个字节就告诉合约：我要调用哪个函数。

如果函数有参数，参数会按照 ABI 编码规则跟在函数选择器后面。

例如：

```solidity
transfer(address,uint256)
```

calldata 会包含：

前 4 字节函数选择器；

address 参数；

uint256 参数。

## 十五、EVM 如何找到要执行的函数

合约 bytecode 中会有一段 selector dispatch 逻辑。

当 calldata 进入合约后，EVM 会做几件事。

第一，检查 calldata 长度是否至少有 4 字节。

如果连 4 字节都没有，就无法包含函数选择器，通常会进入 fallback 或 revert。

第二，读取 calldata 的前 32 字节。

第三，将其右移 224 bits，只保留最前面的 4 字节。

为什么是 224？

因为一个 word 是 256 bits，而函数选择器是 4 bytes，也就是 32 bits。

```txt
256 - 32 = 224
```

所以右移 224 bits 后，就得到 4 字节函数选择器。

第四，把这个 selector 和合约中所有函数的 selector 比较。

如果匹配，就跳转到对应函数逻辑。

如果不匹配，就进入 fallback 或 revert。

## 十六、JUMP 与 JUMPI

EVM 中没有高级语言里的 `if`、`for`、`function call` 这种结构。

这些最终都会变成跳转指令。

常见跳转 opcode 有：

`JUMP`：无条件跳转；

`JUMPI`：条件跳转；

`JUMPDEST`：合法跳转目标。

`JUMPI` 会根据 Stack 上的条件决定是否跳转。

例如在函数入口处，EVM 会检查是否给一个非 payable 函数发送了 ETH。

如果 `msg.value` 不为 0，就跳转到 revert 逻辑。

大概逻辑是：

```txt
CALLVALUE
ISZERO
JUMPI
REVERT
```

意思是：

读取本次调用附带的 ETH 数量；

判断是否为 0；

如果为 0，继续正常执行；

如果不为 0，revert。

这就是为什么给非 payable 函数发送 ETH 会失败。

## 十七、函数选择器的匹配顺序

合约中有多个函数时，EVM 需要根据 selector 找到目标函数。

在较简单的合约中，编译器可能会生成线性查找逻辑：

```txt
selector == functionA?
selector == functionB?
selector == functionC?
```

如果函数数量较少，线性查找成本不高。

如果函数数量较多，编译器可能会使用更接近二分查找的方式优化匹配过程。

一个有趣的细节是，函数选择器通常会按数值大小排序。

这意味着在某些情况下，selector 数值较小、较早匹配到的函数，调用成本可能略低，因为 EVM 比较次数更少。

不过这只是非常底层、非常细微的 Gas 差异。实际开发中不要为了这点差异刻意改函数名，除非你在做极限优化。

## 十八、一个简单函数调用的执行过程

假设有这样一个合约：

```solidity
contract Counter {
    uint256 public count;

    function increment() external {
        count++;
    }
}
```

当你调用：

```solidity
increment()
```

大致流程是：

用户发送交易；

交易中包含目标合约地址和 calldata；

calldata 前 4 字节是 `increment()` 的函数选择器；

EVM 开始执行合约 bytecode；

初始化 free memory pointer；

检查 msg.value 是否允许；

检查 calldata 长度；

读取函数选择器；

和合约中函数 selector 逐个比较；

找到 `increment()` 对应逻辑；

通过 `SLOAD` 读取 count 当前值；

执行加一；

通过 `SSTORE` 写回 storage；

交易结束；

新的 count 值持久化到链上。

这就是一个看似简单的 Solidity 函数背后发生的事情。

## 十九、为什么 calldata 比 memory 更省 Gas

假设有一个外部函数：

```solidity
function process(uint256[] memory values) external {
    // 只读取 values
}
```

这里 `values` 来自 calldata，但因为你声明成了 `memory`，Solidity 需要先把参数从 calldata 复制到 memory。

如果数组很大，这个复制过程会额外消耗 Gas。

如果你并不需要修改它，应该写成：

```solidity
function process(uint256[] calldata values) external {
    // 直接读取 calldata
}
```

这样就避免了复制。

所以外部函数中，数组、字符串、bytes、struct 等引用类型，如果只读，优先使用 calldata。

## 二十、为什么 storage 最贵

Storage 贵的原因在于它改变的是链上持久状态。

Memory 和 Stack 只是当前交易执行中的临时数据，执行完就没了。

Storage 则会影响区块链全局状态，需要被所有节点保存、验证和同步。

因此：

读 Storage 比读 Memory 贵；

写 Storage 比写 Memory 贵很多；

频繁写 Storage 是 Gas 消耗大头。

常见优化包括：

减少 storage 写入次数；

把多次 storage 读取缓存到 memory 或 stack；

合理打包 storage 变量；

能用 calldata 就不用 memory；

能用 memory 就不要频繁写 storage；

避免不必要的状态变量。

例如：

```solidity
uint256 value = count;
value += 1;
value += 2;
count = value;
```

通常比多次直接操作 `count` 更合理，因为只读写 storage 一次。

## 二十一、Storage 打包

Storage slot 是 32 字节。

如果多个变量加起来不超过 32 字节，Solidity 可能会把它们打包进同一个 slot。

例如：

```solidity
uint128 a;
uint128 b;
```

它们可能被打包到同一个 storage slot 中。

但如果写成：

```solidity
uint128 a;
uint256 c;
uint128 b;
```

可能就无法很好打包。

合理排列状态变量可以节省 storage slot，从而降低部署和读写成本。

一般建议把小类型变量放在一起：

```solidity
uint128 a;
uint128 b;
uint256 c;
```

不过也要注意：小类型不一定总是更省 Gas。对于普通计算，EVM 原生处理 256 位 word，有些小类型反而需要额外清理和转换。Storage 打包主要在减少 slot 数量时有价值。

## 二十二、EVM 执行模型的一个直观比喻

可以把 EVM 想象成一个非常简单但严格的机器人。

它手里有几块区域：

Stack：临时放操作数；

Memory：临时草稿纸；

Calldata：只能看的输入数据；

Storage：永久数据库；

Code：指令手册；

Logs：只能写出的记录本。

然后你给它一串 opcode 指令：

```txt
PUSH1
MSTORE
CALLDATALOAD
SLOAD
ADD
SSTORE
RETURN
```

它就按照这些指令，一步一步移动数据、计算结果、读写状态。

Solidity 编译器的工作，就是把高级语言代码翻译成这套机器人能理解的 opcode。

## 二十三、学习 EVM 可以用哪些工具

理解 EVM 时，可以配合一些工具。

### 1. evm.codes

`evm.codes` 可以查看所有 opcode 的说明、Gas 成本和执行行为。

适合学习 opcode。

### 2. Foundry cast

Foundry 的 `cast` 可以快速计算函数选择器：

```bash
cast sig "transfer(address,uint256)"
```

也可以做很多 ABI、calldata、hash 相关操作。

### 3. Chisel

Chisel 是 Foundry 提供的 Solidity REPL，可以快速测试 Solidity 片段。

例如查看某段代码编译后的 bytecode。

### 4. Remix Debugger

Remix 可以逐步调试交易执行过程，查看 stack、memory、storage 的变化。

### 5. hevm / forge debug

适合更深入地调试合约执行流程。

## 二十四、开发者应该记住的几个结论

第一，EVM 是基于 Stack 的虚拟机。

第二，Stack 中每个元素都是 32 字节 word。

第三，Memory 是临时可写空间，不会持久化。

第四，Memory 有固定布局，`0x40` 存放 free memory pointer。

第五，Calldata 是只读输入数据，读取便宜，适合作为外部函数只读参数。

第六，Storage 是持久化状态，读写最贵。

第七，Solidity 最终会被编译成 opcode。

第八，函数调用本质上是 calldata 加函数选择器。

第九，函数选择器是函数签名 keccak256 后的前 4 字节。

第十，EVM 通过 selector dispatch 找到要执行的函数逻辑。

第十一，`SSTORE` 是非常昂贵的操作，要尽量减少不必要的 storage 写入。

第十二，能用 calldata 就不要复制到 memory，能用 memory 临时处理就不要频繁写 storage。

## 二十五、总结

EVM 是 Ethereum 智能合约真正运行的环境。

我们写的 Solidity 代码最终会被编译成 bytecode，再由 EVM 按照 opcode 一条条执行。

在执行过程中，EVM 会使用多个数据区域：

Stack 用于临时操作数和 opcode 参数；

Memory 用于交易执行期间的临时数据；

Calldata 用于只读的函数调用输入；

Storage 用于链上持久状态；

Code 存储合约字节码；

Logs 用于事件日志。

理解这些区域的区别，是理解 Solidity 底层行为和 Gas 成本的关键。

当我们调用一个函数时，EVM 会从 calldata 中读取函数选择器，再通过 selector dispatch 找到对应函数逻辑，然后执行一系列 opcode，比如 `SLOAD`、`ADD`、`SSTORE` 等。

掌握 EVM 不只是为了看懂底层细节，更是为了写出更安全、更高效、更可审计的智能合约。

如果你希望从“会写 Solidity”进一步走向“真正理解智能合约运行机制”，那么 EVM 就是必须跨过的一道门槛。
