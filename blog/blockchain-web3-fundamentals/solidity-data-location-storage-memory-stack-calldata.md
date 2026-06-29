# Solidity 数据位置详解：storage、memory、stack 和 calldata 到底有什么区别？

Solidity 是一门非常特殊的编程语言。

它不是运行在普通服务器上，而是运行在 EVM，也就是以太坊虚拟机上。

这意味着 Solidity 写出来的代码，最终会影响链上状态，也会消耗 gas。

所以在 Solidity 中，变量不仅有类型，还经常要指定它们存放在哪里。

这就是 Solidity 里的数据位置：

```txt
storage
memory
stack
calldata
```text

很多 Solidity 初学者只知道 `memory` 和 `storage`，但不太理解它们真正的区别，更不知道为什么有时候要写 `calldata`，有时候又不用写任何数据位置。

但这些概念非常重要。

因为数据放在哪里，直接影响：

```txt
变量生命周期
是否会上链保存
能不能修改
gas 成本
函数执行效率
合约安全性
```

如果数据位置理解错了，轻则浪费 gas，重则可能引入合约逻辑错误甚至安全漏洞。

---

## 一、为什么 Solidity 需要数据位置？

在普通前端或后端开发中，我们通常只关心变量类型。

比如：

```js
let name = "Alice";
let age = 18;
```text

但在 Solidity 中，除了变量类型，还要关心变量存储位置。

比如：

```solidity
string memory name;
uint256[] storage arr;
bytes calldata data;
```

这是因为 EVM 里的数据不是都放在同一个地方。

不同位置有不同特点：

```txt
storage：永久保存到链上
memory：函数执行期间的临时内存
stack：EVM 执行时的栈空间
calldata：外部调用传入的只读参数区
```text

理解这些位置，才能写出更安全、更省 gas 的智能合约。

---

## 二、Solidity 中的四种数据位置

Solidity / EVM 中常见的四种数据位置是：

```txt
storage
memory
stack
calldata
```

它们的核心区别可以先用一句话记住：

```txt
storage 是链上硬盘；
memory 是函数运行时内存；
stack 是 EVM 的临时操作栈；
calldata 是外部传入的只读参数区。
```solidity

更直观一点：

| 数据位置 | 是否持久化 | 是否可修改 | 常见用途                 | gas 成本 |
| -------- | ---------- | ---------- | ------------------------ | -------- |
| storage  | 是         | 可以       | 状态变量、合约持久化数据 | 最贵     |
| memory   | 否         | 可以       | 函数内部临时变量、返回值 | 较贵     |
| stack    | 否         | 可以       | 局部值类型变量、EVM 运算 | 较便宜   |
| calldata | 否         | 不可修改   | external 函数参数        | 最便宜   |

---

## 三、storage：链上永久存储

`storage` 是 Solidity 中最重要、也最昂贵的数据位置。

凡是存到 `storage` 的数据，都会写入区块链状态中。

这意味着它是持久化的。

只要合约还存在，storage 中的数据就会一直保留在链上。

---

## 四、哪些变量会放在 storage？

最典型的是状态变量。

状态变量就是定义在合约内部、函数外部的变量。

例如：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract StorageExample {
    uint256 public count;
    uint256[2] public stateArray = [uint256(1), uint256(2)];

    function getFirstValue() external view returns (uint256) {
        return stateArray[0];
    }

    function setCount(uint256 _count) external {
        count = _count;
    }
}
```

这里的：

```solidity
uint256 public count;
uint256[2] public stateArray;
```text

都是状态变量。

它们会被存储在 storage 中。

也就是说，它们的数据会真正写到链上。

函数执行结束后，数据仍然存在。

---

## 五、storage 的特点

storage 有几个核心特点：

```txt
永久保存
写入链上状态
合约级别可访问
gas 成本最高
适合保存真正需要长期存在的数据
```

比如：

- 用户余额；
- owner 地址；
- whitelist 状态；
- token 总供应量；
- mapping 数据；
- 合约配置；
- 用户质押信息。

这些数据需要长期保存，所以必须放在 storage 中。

---

## 六、storage 为什么贵？

因为 storage 会改变区块链的全局状态。

每个全节点都要保存这部分数据。

所以 storage 写入是 EVM 中最昂贵的操作之一。

尤其是：

```txt
从 0 写成非 0
```ts

通常成本非常高。

例如：

```solidity
mapping(address => uint256) public balances;

function deposit() external payable {
    balances[msg.sender] += msg.value;
}
```

这里修改 `balances[msg.sender]` 就是在写 storage。

在 gas 优化中，最核心的原则之一就是：

```txt
尽量减少 storage 读写。
```solidity

---

## 七、memory：函数执行期间的临时内存

`memory` 是函数执行期间的临时存储区域。

它不会写入区块链。

函数执行结束后，memory 中的数据就会被丢弃。

可以把它理解为普通计算机里的 RAM。

运行时需要它，运行结束就清掉。

---

## 八、什么时候使用 memory？

`memory` 常用于函数内部的临时引用类型变量。

例如：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MemoryExample {
    function memoryExample() external pure returns (uint256) {
        uint256[] memory x = new uint256[](1);

        x[0] = 23;

        uint256[] memory y = x;

        x[0] = 45;

        return y[0];
    }
}
```

这个函数最终返回：

```txt
45
```text

因为 `x` 和 `y` 都是 memory 中的引用类型变量。

对于引用类型来说：

```solidity
uint256[] memory y = x;
```

并不会复制一份完整数组，而是让 `y` 指向同一份 memory 数据。

所以修改 `x[0]` 后，`y[0]` 也会受到影响。

---

## 九、memory 的特点

memory 的特点是：

```txt
临时存在
函数执行结束后释放
不会持久化到链上
可以修改
比 storage 便宜
常用于数组、字符串、结构体等临时数据
```ts

常见使用场景：

```solidity
function getName() external pure returns (string memory) {
    string memory name = "Alice";
    return name;
}
```

或者：

```solidity
function buildArray() external pure returns (uint256[] memory) {
    uint256[] memory arr = new uint256[](3);
    arr[0] = 1;
    arr[1] = 2;
    arr[2] = 3;
    return arr;
}
```text

这里的字符串和数组都只是函数内部临时创建的数据，所以使用 `memory`。

---

## 十、memory 和 storage 的核心区别

`storage` 和 `memory` 最容易混淆。

可以这样区分：

```txt
storage：链上永久数据
memory：函数内部临时数据
```

举个例子：

```solidity
contract Example {
    uint256[] public numbers;

    function addNumber(uint256 n) external {
        numbers.push(n);
    }

    function getTempArray() external pure returns (uint256[] memory) {
        uint256[] memory temp = new uint256[](2);
        temp[0] = 1;
        temp[1] = 2;
        return temp;
    }
}
```text

`numbers` 是 storage，因为它是状态变量，会长期存在链上。

`temp` 是 memory，因为它只是函数执行期间临时创建的数组。

一句话：

```txt
需要长期保存，用 storage。
只在函数里临时用，用 memory。
```

---

## 十一、stack：EVM 的临时操作栈

`stack` 是 EVM 执行字节码时使用的栈空间。

Solidity 里一般不会显式写 `stack`。

但很多变量实际上会被放到 stack 中。

比如函数内部的简单值类型变量：

```solidity
function stackExample() external pure returns (uint256) {
    uint256 x = 10;
    uint256 y = 20;
    uint256 z = x + y;

    return z;
}
```text

这里的 `x`、`y`、`z` 这类简单局部变量通常会进入 stack。

---

## 十二、哪些类型常放在 stack？

一般来说，简单值类型更容易放在 stack 中。

例如：

```txt
uint256
bool
address
bytes32
enum
```

比如：

```solidity
function example(address user, uint256 amount) external pure returns (bool) {
    bool valid = user != address(0) && amount > 0;
    return valid;
}
```text

这些局部变量通常不需要显式声明数据位置。

Solidity 编译器会自动处理。

---

## 十三、stack 的特点

stack 的特点是：

```txt
函数执行期间存在
成本较低
由 EVM 自动管理
不能显式声明为 stack
适合简单值类型运算
空间有限
```

有时候你会遇到 Solidity 编译错误：

```txt
Stack too deep
```text

这表示函数里局部变量太多，或者表达式太复杂，导致栈空间不够用。

解决方式通常有：

- 拆分函数；
- 减少局部变量；
- 使用 struct 包装参数；
- 使用内部函数分段处理；
- 开启 viaIR 编译；
- 把部分逻辑拆成小函数。

---

## 十四、calldata：外部调用传入的只读数据

`calldata` 是外部调用传入参数所在的数据区域。

它和 memory 一样，是临时的。

但它有一个非常重要的特点：

```txt
calldata 是只读的，不能修改。
```

它通常用于 `external` 函数的引用类型参数。

例如：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract CalldataExample {
    function calldataTest(
        string calldata name
    ) external pure returns (string memory) {
        return name;
    }
}
```ts

这里的 `name` 就存放在 calldata 中。

---

## 十五、calldata 为什么省 gas？

因为 calldata 是交易输入数据的一部分。

如果函数只是读取参数，而不需要修改它，那么直接从 calldata 读取就可以。

这样可以避免把数据从 calldata 复制到 memory。

所以 calldata 通常比 memory 更省 gas。

例如：

```solidity
function submitNames(string[] calldata names) external {
    // 只读取 names，不修改
}
```

比下面这种更省：

```solidity
function submitNames(string[] memory names) public {
    // names 被复制到 memory
}
```text

对于外部函数参数，如果是数组、字符串、bytes、struct 这类引用类型，并且只读，优先考虑 `calldata`。

---

## 十六、calldata 的限制

calldata 也有一些限制：

```txt
只能用于函数参数
通常用于 external 函数
不可修改
生命周期只存在于本次调用
```

比如下面这样是不行的：

```solidity
function badExample() external pure {
    string calldata name = "Alice"; // 错误
}
```text

因为 calldata 不能用于函数内部随便声明变量。

它主要用于外部传入的参数。

---

## 十七、calldata 和 memory 的区别

`calldata` 和 `memory` 都是临时数据区域，但区别很明显：

| 对比点       | memory           | calldata          |
| ------------ | ---------------- | ----------------- |
| 生命周期     | 函数执行期间     | 本次外部调用期间  |
| 是否可修改   | 可以             | 不可以            |
| 常见用途     | 临时变量、返回值 | external 函数参数 |
| gas 成本     | 较高             | 更低              |
| 是否复制数据 | 通常会复制       | 避免复制          |

简单说：

```txt
需要修改，用 memory。
只读外部参数，用 calldata。
```

---

## 十八、引用类型为什么要写数据位置？

在 Solidity 里，引用类型通常需要明确指定数据位置。

常见引用类型包括：

```txt
array
string
bytes
struct
mapping
```ts

例如：

```solidity
function setNames(string[] calldata names) external {
    // names 来自 calldata
}
```

或者：

```solidity
function createArray() external pure returns (uint256[] memory) {
    uint256[] memory arr = new uint256[](3);
    return arr;
}
```ts

如果不写，编译器可能会报错。

而值类型通常不需要写数据位置。

例如：

```solidity
function setAge(uint256 age) external pure returns (uint256) {
    uint256 newAge = age + 1;
    return newAge;
}
```

这里的 `uint256` 是值类型，不需要写 `memory` 或 `calldata`。

---

## 十九、赋值时要注意：复制还是引用？

Solidity 中，数据位置还会影响赋值行为。

尤其是引用类型。

### memory 到 memory

引用类型从 memory 赋值给 memory，通常是引用同一份数据，不会完整复制。

```solidity
uint256[] memory x = new uint256[](1);
x[0] = 23;

uint256[] memory y = x;
x[0] = 45;

// y[0] 也是 45
```ts

### storage 到 storage

storage 引用赋值可能会创建引用，而不是复制。

例如：

```solidity
uint256[] public arr;

function update() external {
    uint256[] storage ref = arr;
    ref.push(1);
}
```

这里 `ref` 指向的就是状态变量 `arr`。

修改 `ref` 就是在修改 `arr`。

### storage 到 memory

如果把 storage 数据读到 memory，通常会复制一份临时数据。

```solidity
uint256[] public arr;

function getArray() external view returns (uint256[] memory) {
    uint256[] memory temp = arr;
    return temp;
}
```text

这里 `temp` 是一份 memory 副本。

修改 `temp` 不会影响 `arr`。

---

## 二十、gas 成本排序

从成本角度看，可以大致这样记：

```txt
storage 最贵
memory 次之
stack 较便宜
calldata 通常最便宜
```

但这个排序要结合具体场景理解。

### storage 最贵

因为它写入链上状态，需要所有节点长期保存。

### memory 较贵

因为它需要在执行期间分配内存，有时还涉及数据复制。

### stack 较便宜

它是 EVM 执行时的基础操作空间，适合简单值类型运算。

### calldata 最便宜

因为它是外部调用原始输入数据，只读，不需要额外复制到 memory。

所以实际开发中，常见优化思路是：

```txt
能不用 storage 就不用 storage。
external 只读参数优先 calldata。
简单局部变量让编译器放 stack。
临时数组、字符串、struct 用 memory。
```ts

---

## 二十一、常见使用建议

### 1. 状态变量默认是 storage

```solidity
uint256 public totalSupply;
mapping(address => uint256) public balances;
```

这类数据需要长期存在链上，所以放在 storage。

---

### 2. external 函数的引用类型参数优先 calldata

```solidity
function claim(bytes32[] calldata proof) external {
    // proof 只读，适合 calldata
}
```ts

比如 Merkle Proof、签名数组、地址数组等，只读参数都适合 calldata。

---

### 3. 函数内部临时引用类型用 memory

```solidity
function buildMessage() external pure returns (string memory) {
    string memory message = "hello";
    return message;
}
```

---

### 4. 不要频繁修改 storage

```solidity
function bad() external {
    for (uint256 i = 0; i < users.length; i++) {
        balances[users[i]] += 1; // 循环中大量写 storage，很贵
    }
}
```text

如果能先在 memory / stack 中计算好，再一次性写回 storage，通常更省 gas。

---

### 5. 小心 storage 引用

```solidity
User storage user = users[msg.sender];
user.amount += 1;
```

这种写法很常见，但要清楚：

```txt
user 是 storage 引用，修改它就是修改链上状态。
```text

---

## 二十二、从 Web3 前端角度怎么理解 calldata？

对 Web3 前端来说，calldata 还有另一层含义。

前端调用合约时，会根据 ABI 把函数名和参数编码成一段十六进制数据。

例如：

```txt
0xa9059cbb000000000000000000000000...
```

这段交易里的 input data 就是 calldata。

它告诉 EVM：

```txt
要调用哪个函数
传入哪些参数
```text

比如 ERC20 转账：

```solidity
transfer(address to, uint256 amount)
```

前端会通过 ABI 编码生成 calldata。

交易发送到合约后，EVM 根据 calldata 找到对应函数并解析参数。

所以 Solidity 中的 `calldata` 和前端交易里的 `data / input data` 是密切相关的。

可以理解为：

```txt
前端 encode 出来的交易 data，
进入合约执行时就成为函数参数的 calldata。
```text

---

## 二十三、面试回答参考

如果面试官问：“Solidity 中 storage、memory、calldata 有什么区别？”

可以这样回答：

Solidity 中的数据位置主要包括 storage、memory、stack 和 calldata。

storage 是链上永久存储，状态变量默认都在 storage 中。它会写入区块链状态，所以 gas 成本最高，适合保存用户余额、合约配置、mapping 等需要长期存在的数据。

memory 是函数执行期间的临时内存，函数结束后数据就会被释放，不会写入链上。它常用于函数内部临时数组、字符串、结构体和返回值。

calldata 是外部调用传入参数所在的只读区域，不能修改，通常用于 external 函数的引用类型参数。因为它避免把输入数据复制到 memory，所以在只读参数场景下更省 gas。

stack 是 EVM 执行时的操作栈，通常用于简单值类型的局部变量，比如 uint、bool、address 等。Solidity 中一般不会显式声明 stack，而是由编译器自动处理。如果函数局部变量太多，可能会遇到 stack too deep。

简单来说，storage 是永久链上数据，memory 是函数临时数据，calldata 是外部传入的只读数据，stack 是 EVM 临时运算空间。

---

## 二十四、总结

Solidity 的数据位置是理解 EVM 执行模型和 gas 优化的基础。

四种数据位置可以这样记：

```txt
storage：永久、链上、最贵
memory：临时、可修改、函数内使用
stack：临时、自动管理、适合简单值类型
calldata：临时、只读、external 参数最省 gas
```

在真实开发中，最重要的原则是：

```txt
状态变量放 storage。
函数临时引用类型放 memory。
external 只读参数优先 calldata。
简单值类型通常交给 stack。
尽量减少 storage 读写。
```text

对于 Web3 前端开发者来说，也要理解 calldata 的另一层意义：

```txt
前端构造交易时的 data/input data，
本质上就是合约执行时读取的 calldata。
```

所以，当你理解了 storage、memory、stack 和 calldata，你不仅能更好地写 Solidity，也能更深入地理解前端如何调用合约、交易 data 如何被 EVM 解析，以及为什么同样的合约调用会有不同的 gas 成本。
