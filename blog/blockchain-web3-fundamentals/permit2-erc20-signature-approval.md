# Permit2 是什么：一次授权，多次签名，让 ERC20 支付更顺滑

在 ERC20 Token 的使用过程中，授权一直是一个非常核心但又不太友好的流程。

用户想在 DApp 中使用自己的 Token，通常需要先执行一次 `approve`，授权某个合约可以使用自己的 Token，然后再执行真正的业务操作。

例如：

```txt
第一步：approve
第二步：swap / deposit / transferFrom
```

这意味着用户需要发两笔交易，也需要付两次 Gas。

Permit2 的出现，就是为了改善这个问题。

它允许用户先对 Permit2 合约做一次授权，然后在后续使用不同 DApp 时，通过链下签名的方式授权具体 spender 使用某个 Token。

这样，用户只需要对 Permit2 做一次链上 approve，后续很多授权都可以通过 EIP-712 离线签名完成。

## 一、先理解 ERC20 的原生授权机制

在 ERC20 合约中，用户的余额和授权额度通常记录在两个 mapping 里。

第一个是余额：

```solidity
mapping(address => uint256) public balanceOf;
```

它表示某个地址有多少 Token。

例如：

```txt
Alice 有 100 USDC
```

在 ERC20 合约里，可以理解为：

```txt
balanceOf[Alice] = 100
```

第二个是授权额度：

```solidity
mapping(address => mapping(address => uint256)) public allowance;
```

它表示某个 owner 允许某个 spender 使用多少 Token。

例如：

```txt
Alice 允许 Uniswap Router 使用 50 USDC
```

在 ERC20 合约里，可以理解为：

```txt
allowance[Alice][UniswapRouter] = 50
```

只有当 allowance 足够时，spender 才能调用 `transferFrom` 把 Alice 的 Token 转走。

## 二、传统 ERC20 流程为什么需要两笔交易

假设 Alice 想在某个 DApp 中使用 100 USDC。

传统流程是：

第一步，Alice 调用 USDC 合约的 `approve`：

```solidity
USDC.approve(spender, 100);
```

这一步会更新 USDC 合约中的 allowance：

```txt
allowance[Alice][spender] = 100
```

第二步，DApp 或 spender 再调用：

```solidity
USDC.transferFrom(Alice, receiver, 100);
```

如果 allowance 足够，USDC 合约就会执行转账。

所以传统 ERC20 授权流程是：

```txt
用户 approve
  ↓
DApp transferFrom
```

这就是为什么很多 DApp 第一次使用某个 Token 时，都会让你先确认一笔授权交易，然后再确认一笔业务交易。

## 三、传统 approve 的体验问题

传统 approve 有几个明显问题。

第一，用户需要多点一次确认。

第二，用户要多付一笔 Gas。

第三，DApp 交互被拆成两步，体验不流畅。

第四，很多用户为了省事，会直接授权无限额度。

例如：

```txt
allowance[Alice][spender] = uint256.max
```

这样以后就不用反复 approve。

但无限授权也带来安全风险。

如果 spender 合约存在漏洞，或者 DApp 前端被攻击，用户的 Token 可能被恶意转走。

所以，传统 ERC20 approve 在体验和安全之间一直有矛盾。

## 四、Permit2 是什么

Permit2 是一个通用的 Token 授权合约。

它的核心思想是：

```txt
用户先把 Token 授权给 Permit2；
后续再通过签名授权具体 DApp 使用 Token。
```

也就是说，用户不再需要对每个 DApp 都单独执行 ERC20 approve。

用户只需要先对 Permit2 合约做一次 approve。

例如：

```solidity
USDC.approve(PERMIT2, type(uint256).max);
```

之后，Permit2 就成为一个统一授权入口。

当用户想让某个 DApp 使用 USDC 时，不需要再发链上 approve，而是签署一段 EIP-712 消息。

DApp 拿到签名后，可以调用 Permit2 合约完成授权和转账。

## 五、Permit2 的基本结构

Permit2 合约内部也维护了一套授权数据。

可以简单理解为，它记录了：

owner；

token；

spender；

amount；

expiration；

nonce。

类似：

```txt
owner: Alice
token: USDC
spender: DApp
amount: 100
expiration: 某个过期时间
nonce: 防重放编号
```

这表示：

```txt
Alice 允许某个 DApp 在指定时间内使用最多 100 USDC。
```

不同的是，这个授权不是通过 USDC 原生 `approve` 写入的，而是通过用户签署 EIP-712 消息，再由 DApp 提交给 Permit2 合约完成验证。

## 六、Permit2 为什么只需要一次 approve

Permit2 仍然离不开 ERC20 的底层授权。

用户第一次使用某个 Token 时，仍然需要给 Permit2 一次 ERC20 approve。

例如：

```txt
Alice approve USDC 给 Permit2
```

这一步会更新 USDC 合约里的 allowance：

```txt
allowance[Alice][Permit2] = 很大额度
```

之后，Permit2 就有能力从 Alice 地址中转出 USDC。

但 Permit2 不会随便转走用户 Token。

它还需要用户对具体 DApp、具体金额、具体 Token、具体期限进行签名授权。

所以整体结构变成了两层授权：

第一层：ERC20 Token 授权给 Permit2；

第二层：用户通过签名授权具体 DApp 使用 Permit2 转账。

这就是 Permit2 的关键。

## 七、Permit2 的工作流程

假设 Alice 有 100 USDC，并且想通过某个 DApp 使用其中 20 USDC。

### 第一步：Alice 授权 Permit2

Alice 先执行一次链上交易：

```solidity
USDC.approve(PERMIT2, type(uint256).max);
```

这表示 USDC 合约允许 Permit2 从 Alice 地址转走 USDC。

这一步需要 Gas，但通常只需要做一次。

### 第二步：Alice 离线签名

之后 Alice 访问某个 DApp。

DApp 构造一段 EIP-712 typed data，例如：

```txt
owner: Alice
token: USDC
spender: DAppContract
amount: 20
deadline: 过期时间
nonce: 当前 nonce
```

Alice 使用钱包签署这段结构化消息。

这一步不需要 Gas，因为只是链下签名。

### 第三步：DApp 提交签名

DApp 拿到 Alice 的签名后，调用 Permit2 合约。

Permit2 会验证：

签名是否来自 Alice；

Token 是否是 USDC；

spender 是否匹配；

amount 是否正确；

deadline 是否过期；

nonce 是否已使用；

Alice 是否已经授权 Permit2 使用 USDC。

验证通过后，Permit2 会执行转账或更新内部授权。

### 第四步：完成 Token 使用

最后，Permit2 可以把 Alice 的 USDC 转给目标合约或收款地址。

用户只签了一次消息，不需要再发一笔 approve 交易。

## 八、EIP-712 在 Permit2 中的作用

Permit2 使用 EIP-712 结构化签名。

EIP-712 的好处是，钱包可以展示更清晰的签名内容。

用户不需要签一串完全不可读的十六进制数据，而是可以看到类似：

```txt
Token: USDC
Spender: 0x...
Amount: 20
Deadline: ...
Nonce: ...
```

这比传统盲签更安全。

EIP-712 还会把签名绑定到具体合约和链上，减少签名被跨链或跨合约重放的风险。

所以 Permit2 的安全基础之一，就是通过 EIP-712 让用户签署明确的授权意图。

## 九、Permit2 和 ERC20 Permit 的区别

Permit2 很容易和 ERC20 Permit 混淆。

ERC20 Permit 通常指 EIP-2612。

它要求 Token 合约本身实现 `permit` 方法。

如果某个 Token 支持 EIP-2612，用户可以直接通过签名授权 spender。

但问题是，并不是所有 ERC20 Token 都支持 EIP-2612。

很多老 Token 没有 `permit` 方法。

Permit2 的优势是，它不要求每个 Token 自己支持 permit。

只要 Token 是标准 ERC20，并且用户先 approve 给 Permit2，后续就可以通过 Permit2 的统一签名授权流程来使用。

简单对比：

| 对比项                  | ERC20 Permit / EIP-2612 | Permit2                            |
| ----------------------- | ----------------------- | ---------------------------------- |
| 是否要求 Token 原生支持 | 是                      | 否                                 |
| 是否需要第一次 approve  | 不需要                  | 需要 approve 给 Permit2            |
| 是否使用 EIP-712        | 是                      | 是                                 |
| 授权对象                | 具体 spender            | 先授权 Permit2，再签名授权 spender |
| 适用范围                | 支持 permit 的 Token    | 大多数 ERC20 Token                 |
| 统一性                  | 每个 Token 自己实现     | 统一合约管理                       |

## 十、Permit2 为什么适合 DApp

对 DApp 来说，Permit2 的好处很明显。

第一，减少用户交互步骤。

用户不需要每次都发 approve 交易。

第二，适配更多 Token。

即使 Token 不支持 EIP-2612，也可以通过 Permit2 实现签名式授权。

第三，提升授权管理能力。

Permit2 可以支持金额、过期时间、nonce 等更细粒度控制。

第四，改善跨应用体验。

很多 DApp 可以围绕同一个 Permit2 授权体系构建。

第五，适合聚合器、支付、交易、结算等场景。

例如 DEX 聚合器、链上支付网络、批量结算系统，都可以通过 Permit2 让用户用签名表达授权意图。

## 十一、Permit2 是否完全 Gasless

需要准确理解这一点。

Permit2 并不是让所有操作都完全没有 Gas。

它让用户的“授权表达”可以通过链下签名完成。

但最终转账和结算仍然发生在链上，仍然需要某个交易发起者支付 Gas。

区别在于：

用户不一定亲自发 approve 交易；

DApp、relayer 或结算合约可以提交签名并执行链上操作；

Gas 成本可以由协议抽象、代付或从交易金额中扣除。

所以更准确地说，Permit2 支持 gasless approval experience，而不是让链上执行本身没有成本。

## 十二、Permit2 中的 Spender 是谁

在传统 ERC20 approve 中，spender 通常是某个 DApp 合约。

例如：

```txt
Uniswap Router
某个支付结算合约
某个 DeFi 协议合约
```

在 Permit2 中，情况分成两层。

第一层，ERC20 原生 allowance 中的 spender 是 Permit2 合约。

```txt
allowance[Alice][Permit2]
```

第二层，Permit2 内部授权中的 spender 是具体 DApp。

```txt
Permit2Allowance[Alice][USDC][DApp]
```

也就是说：

```txt
Token 合约信任 Permit2；
Permit2 再根据用户签名决定具体 DApp 能不能使用 Token。
```

这种设计让 Permit2 成为一个统一的授权路由层。

## 十三、Permit2 的安全边界

Permit2 提升了体验，但也需要正确使用。

### 1. 第一次 approve 给 Permit2 要谨慎

用户通常会给 Permit2 较大额度授权。

因此必须确认 Permit2 合约地址是官方可信地址。

不要在钓鱼网站上 approve 给假的 Permit2。

### 2. 签名内容要认真检查

虽然签名不花 Gas，但签名也可能授权真实资产转移。

用户应该检查：

Token；

amount；

spender；

deadline；

chain；

verifying contract。

### 3. Deadline 不要过长

签名应设置合理过期时间。

过期时间太长，签名泄露后的风险更高。

### 4. Nonce 必须正确

Nonce 用于防止同一签名被重复使用。

DApp 和合约必须正确校验 nonce。

### 5. 不要盲签

如果钱包只显示一段看不懂的信息，不显示 spender、amount 或 Token，需要谨慎。

签名不是“无风险操作”。

## 十四、Permit2 的核心价值

Permit2 的核心价值可以概括为：

```txt
把 ERC20 的重复 approve 流程，改造成一次 approve + 多次签名授权。
```

传统流程：

```txt
approve DApp A
DApp A transferFrom

approve DApp B
DApp B transferFrom

approve DApp C
DApp C transferFrom
```

Permit2 流程：

```txt
approve Permit2 一次

签名授权 DApp A
DApp A 通过 Permit2 转账

签名授权 DApp B
DApp B 通过 Permit2 转账

签名授权 DApp C
DApp C 通过 Permit2 转账
```

用户体验更顺滑，DApp 集成也更统一。

## 十五、一个简化例子

假设 Alice 有 100 USDC。

她第一次使用 Permit2 时，执行：

```solidity
USDC.approve(PERMIT2, 100);
```

此时 USDC 合约中记录：

```txt
allowance[Alice][Permit2] = 100
```

之后 Alice 使用某个 DApp，想支付 20 USDC。

DApp 让 Alice 签署 EIP-712 消息：

```txt
owner: Alice
token: USDC
spender: PaymentContract
amount: 20
deadline: 1700000000
nonce: 1
```

Alice 签名后，把 signature 交给 DApp。

DApp 调用 Permit2：

```solidity
permitTransferFrom(...)
```

Permit2 验证签名有效后，从 Alice 地址转走 20 USDC，并发送给 PaymentContract。

最终 Alice 只在第一次 approve 时发了一笔链上交易，后续支付授权通过签名完成。

## 十六、总结

Permit2 是一个通用 ERC20 授权合约。

它允许用户先把 Token 授权给 Permit2，然后在后续使用不同 DApp 时，通过 EIP-712 离线签名授权具体 spender 使用 Token。

传统 ERC20 使用流程通常是：

```txt
approve
transferFrom
```

需要两步链上交互。

Permit2 把流程优化为：

```txt
第一次 approve Permit2
之后通过签名授权具体 DApp
DApp 提交签名并完成转账
```

它的关键优势是：

减少重复 approve；

支持更多不原生支持 permit 的 ERC20 Token；

使用 EIP-712 提升签名可读性；

支持金额、期限、nonce 等细粒度授权；

适合 DEX、支付、聚合器和链上结算系统。

但 Permit2 不是完全没有风险。

用户仍然需要谨慎确认第一次 approve 的合约地址，认真检查每一次签名中的 Token、spender、amount、deadline 和 chain 信息。

可以把 Permit2 理解为 ERC20 世界中的统一授权层：

```txt
Token 授权给 Permit2；
用户签名授权具体应用；
Permit2 负责验证并执行转账。
```

这也是为什么越来越多 DApp、聚合器和链上支付系统开始采用 Permit2 的原因。
