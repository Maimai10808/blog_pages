# ERC-1271 与 CoW Protocol 智能订单：让智能合约也能“签名”下单

在以太坊中，普通用户使用钱包下单、授权或签署消息时，通常依赖 EOA，也就是外部拥有账户。EOA 有私钥，因此可以通过 ECDSA 签名证明“我同意这笔操作”。

但智能合约没有私钥。

这就带来一个问题：如果一个智能合约钱包、DAO 金库、Safe 多签，或者某个自动化策略合约想要在 CoW Protocol 上下单，它该如何表达“我同意这笔订单”？

答案就是 ERC-1271。

ERC-1271 提供了一种标准方式，让智能合约可以通过自定义逻辑验证签名。它不要求合约真的拥有私钥，而是让合约自己实现一个方法，告诉外部系统：这个 hash 是否被我认可。

这篇文章会围绕 CoW Protocol 的订单机制，梳理 ERC-1271 的基本原理、Safe 如何使用它实现无 Gas 订单，以及更进一步的 Smart Orders，也就是智能合约订单。

## 一、CoW Protocol 是什么

CoW Protocol 是一个 Meta DEX Aggregator，也可以理解为更高一层的交易聚合协议。

它和普通 DEX 或普通聚合器的区别在于，用户不是直接把交易发到链上，而是先离线签署一笔订单。

这些订单会被提交到 CoW Protocol 的订单系统中，然后进入批处理流程。

CoW Protocol 会把多个用户订单放在一起，交给一组 solvers 竞争解决方案。

Solvers 会尝试：

撮合用户之间的 Coincidence of Wants；

寻找最优流动性来源；

降低滑点；

减少 MEV 风险；

为用户提供更好的成交价格。

CoW 这个名字来自 Coincidence of Wants，意思是“需求巧合”。例如 A 想用 ETH 换 USDC，B 想用 USDC 换 ETH，那么协议可以优先让他们内部撮合，而不是都去外部 AMM 交易。

这种机制可以带来更好的用户体验和更强的 MEV 保护。

## 二、CoW Protocol 的普通订单结构

CoW Protocol 中，一个订单通常包含以下字段：

```solidity
struct Order {
    address sellToken;
    address buyToken;
    address receiver;
    uint256 sellAmount;
    uint256 buyAmount;
    uint32 validTo;
    bytes32 appData;
    uint256 feeAmount;
    string kind;
    bool partiallyFillable;
    string sellTokenBalance;
    string buyTokenBalance;
}
```

简单理解，这些字段描述了用户想要完成的一笔交易：

卖出什么 Token；

买入什么 Token；

卖出多少；

至少买入多少；

接收地址是谁；

订单什么时候过期；

手续费是多少；

是否允许部分成交。

普通 EOA 用户下单时，会把这份订单按照 EIP-712 结构化签名标准进行哈希，然后用自己的钱包私钥签名。

CoW Protocol 只需要拿到订单和签名，就能知道用户确实授权了这笔订单。

## 三、EOA 为什么可以签名

EOA 拥有私钥。

当用户使用 MetaMask、Rabby、Ledger 等钱包签署消息时，本质上是用私钥对某个 hash 进行签名。

签名结果通常包含：

```txt
r
s
v
```

这三个值可以被用来恢复签名者地址。

合约或后端系统可以通过 ECDSA 验证：

```txt
这个签名确实来自某个地址。
```

所以，对于 EOA 来说，下单逻辑很自然：

订单结构；

EIP-712 hash；

用户私钥签名；

得到 r、s、v；

协议验证签名者是否为订单 owner。

问题是，智能合约没有私钥，因此不能像 EOA 一样生成 ECDSA 签名。

## 四、智能合约为什么不能直接签名

智能合约是链上的代码和状态。

它没有私钥，也不能像 EOA 一样在链下签署 EIP-712 消息。

这意味着：

Safe 多签不能直接用私钥签订单；

DAO 金库不能直接用私钥签订单；

策略合约不能直接用 ECDSA 表达授权；

AMM 合约也不能像普通钱包一样签名。

但智能合约可以执行代码。

因此，Ethereum 社区设计了一种替代方案：让智能合约自己实现一个验证函数。

这就是 ERC-1271。

## 五、ERC-1271 是什么

ERC-1271 是智能合约签名验证标准。

它定义了一个核心方法：

```solidity
function isValidSignature(
    bytes32 hash,
    bytes memory signature
) external view returns (bytes4 magicValue);
```

这个方法的含义是：

```txt
给我一个 hash 和一段 signature，我告诉你这个签名对我来说是否有效。
```

如果合约认可这个 hash 和 signature，就返回一个特定的 magic value。

如果不认可，就返回其他值或 revert。

虽然返回类型不是 bool，但你可以把它理解成：

```txt
true：我认可这个签名
false：我不认可这个签名
```

之所以不是 bool，而是 magic value，是标准设计中的历史原因和接口约定。

## 六、ERC-1271 的 signature 可以是什么

ERC-1271 中的 `signature` 并不一定是传统 ECDSA 签名。

它可以是任何 bytes 数据。

例如：

EOA owner 的签名；

多个 Safe owner 签名拼接后的数据；

某个 delegate 的签名；

某个订单参数；

某个策略条件；

某个 oracle 检查所需数据；

甚至可以是空 bytes。

重点不在于 signature 长什么样，而在于智能合约如何解释它。

ERC-1271 给智能合约提供了极大的自由度：

```txt
只要 isValidSignature 返回有效 magic value，外部协议就认为这个合约同意了该 hash。
```

这使智能合约可以用任意逻辑表达“同意”。

## 七、Safe 多签如何使用 ERC-1271

Safe 是最常见的智能合约钱包之一。

它没有单一私钥，而是由多个 owner 管理，并设置一个 threshold。

例如：

```txt
5 个 owner 中至少 3 个签名，交易才有效。
```

Safe 实现 ERC-1271 时，大致逻辑是：

接收一个 hash；

接收一组拼接后的 owner 签名；

逐个拆分签名；

验证每个签名是否来自 Safe owner；

统计有效签名数量；

如果有效签名数量达到 threshold，则返回 magic value；

否则认为签名无效。

这意味着 Safe 本身不需要私钥。

它通过合约逻辑判断：

```txt
是否有足够多 owner 同意这个 hash？
```

如果有，就认为 Safe 对这笔订单或交易进行了有效签名。

## 八、CoW Protocol 如何支持 Safe 无 Gas 下单

CoW Protocol 的一个重要特点是，用户可以通过离线签名提交订单。

对于 Safe 来说，只要 Safe 实现了 ERC-1271，CoW Protocol 就可以通过 `isValidSignature` 验证 Safe 是否同意这笔订单。

流程大致如下：

Safe owner 离线签署订单 hash；

收集足够数量的 owner 签名；

把这些签名拼接成 ERC-1271 signature；

CoW Protocol 在结算时调用 Safe 的 `isValidSignature`；

Safe 检查签名数量和签名者身份；

验证通过后，CoW Protocol 执行订单。

这种方式的好处是：Safe owner 不需要为下单单独发一笔链上交易。

他们只需要签名。

订单后续由 CoW Protocol 的 solvers 在结算交易中处理，Gas 成本会以交易费用形式从订单中体现。

这就是所谓的 gasless order。它不是完全没有成本，而是用户不需要自己单独持有 ETH 发起下单交易。

## 九、从普通订单到 Smart Orders

ERC-1271 更有意思的地方在于，它不只是支持 Safe 多签。

因为 `isValidSignature` 可以写任意逻辑，所以智能合约订单可以变得非常灵活。

这就是 Smart Orders。

普通订单通常是静态的：

```txt
我愿意用 1 ETH 换至少 3000 USDC，有效期到某个时间。
```

Smart Order 则可以是动态的：

```txt
只有当某个链上条件满足时，这笔订单才有效。
```

例如：

某个时间之后才有效；

价格跌破某个阈值才有效；

预言机价格满足条件才有效；

每日定投策略；

止损订单；

DAO 分批买入；

AMM 型订单；

根据合约内部状态决定是否成交。

这些逻辑不需要改 CoW Protocol 的核心订单格式。

只需要让订单 owner 是一个实现 ERC-1271 的智能合约，然后在 `isValidSignature` 中写入条件判断。

## 十、Good-After-Time 订单是什么

演讲中举的例子是 Good-After-Time Order。

它的含义是：

```txt
这笔订单只有在某个时间点之后才有效。
```

CoW Protocol 原生订单里有 `validTo`，表示订单什么时候过期。

但它没有 `validFrom`，也就是订单什么时候开始有效。

如果要把 `validFrom` 加入原生订单结构，就需要改订单格式、改合约、改后端和相关基础设施。

但借助 ERC-1271，我们可以不用改协议本身，而是在智能合约订单中实现这个逻辑。

## 十一、Good-After-Time 的核心实现思路

一个 Good-After-Time 智能订单合约可以保存两个核心字段：

```solidity
bytes32 public orderHash;
uint256 public validFrom;
```

其中：

`orderHash` 是这笔订单的 hash；

`validFrom` 是订单开始有效的时间戳。

然后在 `isValidSignature` 中检查：

```solidity
block.timestamp >= validFrom
```

如果当前时间还没到，就认为签名无效。

如果当前时间已经超过 `validFrom`，并且传入的 hash 等于预设的 `orderHash`，就返回 ERC-1271 magic value。

示意代码如下：

```solidity
function isValidSignature(
    bytes32 hash,
    bytes calldata
) external view returns (bytes4) {
    require(hash == orderHash, "invalid order");
    require(block.timestamp >= validFrom, "order not valid yet");

    return 0x1626ba7e;
}
```

这样，一个“未来才会生效”的订单就完成了。

## 十二、为什么需要取消功能

如果用户今天创建了一笔明天才生效的订单，但明天市场价格发生巨大变化，用户可能不希望继续执行它。

因此 Good-After-Time 订单通常还需要取消或取回资金的能力。

例如合约可以加入 owner，并允许 owner 在订单执行前取回存入的 Token：

```solidity
function withdraw(address token, address to, uint256 amount) external onlyOwner {
    IERC20(token).transfer(to, amount);
}
```

这样用户就可以在订单未执行时撤回资金。

对于真实生产环境，还需要更严格地处理：

权限控制；

订单是否已成交；

重复执行；

Token 余额；

批准额度；

reentrancy；

异常 Token 行为。

## 十三、CoW Protocol 为什么需要 allowance

CoW Protocol 结算订单时，需要从订单 owner 地址转出 sellToken。

因此，无论 owner 是 EOA、Safe，还是智能订单合约，都需要给 CoW Protocol settlement contract 授权。

对于智能订单合约来说，通常需要在部署或初始化时执行：

```solidity
IERC20(sellToken).approve(settlementContract, amount);
```

否则即使 `isValidSignature` 返回有效，结算合约也无法转走 sellToken，订单无法成交。

所以，一个完整的智能订单合约通常需要做几件事：

保存订单 hash；

保存执行条件；

持有 sellToken；

批准 settlement contract；

实现 ERC-1271；

提供取消或取回机制。

## 十四、为什么需要 Factory

如果每个用户每次创建 Good-After-Time 订单都要手动部署一个合约，体验会比较差。

因此可以写一个 Factory 合约。

用户调用 Factory 的 `place` 方法，传入订单参数和 validFrom。

Factory 自动完成：

部署 Good-After-Time 订单合约；

把用户的 sellToken 转入订单合约；

设置 validFrom；

设置 orderHash；

给 settlement contract 授权；

返回订单 ID 或订单合约地址。

这样用户不需要自己理解部署细节。

Factory 可以把智能订单创建流程封装起来。

## 十五、CoW 后端如何发现智能订单

智能订单部署后，CoW Protocol 的后端需要知道：

有一笔新订单存在；

应该开始跟踪它；

应该周期性检查它是否有效；

一旦有效，就把它放进当前 batch auction。

目前一种方式是手动调用 CoW API，把订单提交给后端跟踪。

更理想的方式是智能订单合约在创建时 emit event，例如：

```solidity
event OrderCreated(bytes32 orderHash, address orderContract);
```

CoW 后端监听事件后，自动发现订单并跟踪。

这样智能订单体验会更接近原生协议能力。

## 十六、Good-After-Time 的执行流程

完整流程可以概括为：

用户准备订单参数；

用户批准 Factory 转移 sellToken；

用户调用 Factory 创建智能订单；

Factory 部署 Good-After-Time 订单合约；

Factory 把 sellToken 转入订单合约；

订单合约设置 validFrom 和 orderHash；

订单被提交到 CoW 后端；

后端定期检查订单状态；

在 validFrom 之前，`isValidSignature` 返回无效；

到达 validFrom 之后，`isValidSignature` 返回有效；

订单进入 solver auction；

solver 尝试找到最优成交方案；

订单在 CoW Protocol 中被结算。

这就是一个基于 ERC-1271 的时间条件订单。

## 十七、Smart Orders 的更多可能性

Good-After-Time 只是最简单的例子。

只要条件能写成 Solidity 逻辑，就可以变成 Smart Order。

### 1. Stop Loss Order

止损订单可以通过预言机判断价格。

例如：

```txt
如果 ETH 价格跌破 1000 USDC，就卖出 ETH。
```

合约可以在 `isValidSignature` 中读取 Chainlink 价格，如果价格低于阈值，就返回有效。

### 2. DCA Order

DCA 是 Dollar-Cost Averaging，也就是定投。

例如 DAO 想在一个月内每天买入一定数量的 Token。

可以部署多个 Good-After-Time 订单，或者写一个更复杂的 DCA 合约，让它按照时间间隔逐步释放订单。

### 3. TWAP Order

TWAP 是 Time-Weighted Average Price，时间加权平均价格。

协议或 DAO 可以把一笔大额交易拆成多个时间段执行，减少市场冲击。

### 4. Oracle-Based Order

订单是否有效取决于某个预言机状态。

例如：

ETH 价格高于某个值时卖出；

某个汇率低于某个值时买入；

某个链上指标满足条件时执行。

### 5. AMM Smart Order

甚至可以把一个简化 AMM 写进智能订单合约。

例如合约持有两个 Token，并用：

```txt
x * y >= k
```

来判断是否允许交易。

这样 CoW Protocol 的 solver 可以把这个 AMM 合约当作一个流动性来源，并通过 batch auction 获得更好的统一清算价格。

## 十八、为什么 CoW Protocol 适合 Smart Orders

Smart Orders 和 CoW Protocol 很契合。

原因在于 CoW Protocol 本身就是基于离线订单和批量结算。

用户不需要每次都自己发链上交易。

订单可以先进入系统，等条件满足后再由 solver 结算。

同时，CoW Protocol 的 solver 竞争机制可以帮助用户获得更好的价格改善。

相比单独写一个 keeper 合约，CoW Protocol 可以提供：

订单发现；

批量拍卖；

solver 竞争；

MEV 保护；

统一清算价格；

更好的交易执行体验。

对于 DAO 或协议金库来说，这种机制很有吸引力。

例如 DAO 想分批买回治理 Token，不一定需要自己维护 keeper 网络，也不一定要直接在 AMM 上交易。它可以通过智能订单把策略交给 CoW Protocol 的 solver 网络执行。

## 十九、ERC-1271 的关键安全点

Smart Orders 很强大，但也需要注意安全。

### 1. isValidSignature 不应该过于宽松

如果 `isValidSignature` 对任何 hash 都返回有效，合约资金可能被任意订单使用。

必须确保传入 hash 是预期订单。

### 2. 订单 hash 要绑定具体参数

订单 hash 应该包含 sellToken、buyToken、amount、receiver、validTo 等关键字段。

否则可能被重放或替换。

### 3. 预言机要谨慎选择

如果订单依赖 Chainlink 或其他 oracle，需要考虑：

价格更新频率；

stale price；

预言机异常；

闪电贷操纵；

价格精度；

链上可用性。

### 4. 取消逻辑要安全

用户应能在订单未执行时取回资金，但不能破坏已经执行或正在结算的订单。

### 5. 授权额度要合理

不要盲目给 settlement contract 无限授权，除非你明确理解风险。

### 6. Factory 要防止重放

如果 Factory 使用 salt 部署合约，需要确保订单参数、owner、链 ID 等信息不会被跨场景重放。

## 二十、ERC-1271 的意义

ERC-1271 的意义不只是“让 Safe 可以签名”。

它真正打开的是一种更通用的账户表达能力。

EOA 的签名逻辑是固定的：

```txt
私钥签名 = 授权
```

智能合约的签名逻辑可以是任意的：

```txt
多签达到阈值 = 授权
时间到达 = 授权
价格满足 = 授权
DAO 投票通过 = 授权
余额足够 = 授权
策略条件满足 = 授权
```

这让订单不再只是静态意图，而可以变成链上可验证的条件化意图。

## 二十一、开发者可以如何开始

如果你想基于 CoW Protocol 构建 Smart Orders，可以从以下步骤开始：

学习 CoW Protocol 订单结构；

理解 EIP-712 订单 hash；

实现 ERC-1271 的 `isValidSignature`；

在合约中保存订单 hash 和条件；

让合约持有 sellToken；

给 settlement contract 授权；

把订单提交给 CoW API；

等待 solver 结算。

最小版本可以先实现一个 Good-After-Time 订单。

进阶版本可以尝试：

止损订单；

DCA 策略；

DAO treasury 自动买卖；

基于预言机的条件订单；

AMM-style smart order；

带 UI 的智能订单创建器。

## 二十二、总结

ERC-1271 是智能合约签名验证标准。

它解决了一个核心问题：智能合约没有私钥，不能像 EOA 那样签名，但它可以通过 `isValidSignature` 表达自己是否认可某个 hash。

在 CoW Protocol 中，ERC-1271 可以让 Safe 多签、DAO 金库、策略合约和自定义智能订单合约参与离线订单系统。

最基础的用法是让 Safe 通过 owner 签名实现 gasless orders。

更进一步，开发者可以把任意链上逻辑写进 `isValidSignature`，构建 Smart Orders。

例如：

某个时间之后才有效的 Good-After-Time 订单；

价格跌破某个阈值才执行的 Stop Loss 订单；

分批买入或卖出的 DCA / TWAP 订单；

基于预言机或链上状态的条件订单；

甚至把 AMM 逻辑写成可被 solver 结算的智能订单。

ERC-1271 让“签名”从单纯的私钥动作，变成了智能合约可以自定义的授权逻辑。

这也是它在 CoW Protocol、Safe、多签钱包、DAO 和更复杂 DeFi 策略中非常重要的原因。
