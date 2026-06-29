# 一文理解 EIP-712：如何用链下签名实现链上授权执行

在以太坊开发中，我们经常会遇到一种场景：

用户本来需要自己发起一笔交易，但我们希望他只在链下签一次名，然后由别人帮他把交易提交到链上执行。

比如：

```text
用户签名授权
↓
签名数据发送给 relayer 或第三方
↓
relayer 帮用户提交链上交易
↓
合约验证签名
↓
签名有效，执行操作
```text

这种模式在 Web3 项目里非常常见，例如：

```text
Permit 授权
Gasless Transaction
Meta Transaction
链下订单签名
白名单签名验证
委托操作
```

而在这些场景中，经常会用到一个重要标准：

```text
EIP-712
```text

EIP-712 是以太坊中用于 **结构化数据哈希和签名** 的标准。它可以让用户在钱包里看到更清晰、更可读的签名内容，而不是一串难以理解的十六进制数据。

简单来说：

```text
EIP-712 = 用标准化方式对结构化数据进行签名和验证
```

## 一、为什么需要 EIP-712？

在区块链中，很多操作都需要用户签名。

最常见的是用户直接发起交易，比如调用合约里的 `transfer`、`approve`、`mint` 等函数。这种方式需要用户支付 Gas，并且每次操作都要提交链上交易。

但有些时候，我们并不希望用户直接发交易，而是希望用户先在链下签名。

比如用户想授权别人帮他执行一个操作：

```text
我允许你把合约里的 greeting 改成 Hello World
```text

用户可以在前端页面中签名这段授权信息，然后把签名交给别人。别人拿到签名后，就可以把这个签名提交到链上。合约会验证：

```text
这个签名是不是 owner 签的？
签名内容是不是和当前调用参数一致？
签名有没有被篡改？
```

如果验证通过，合约就执行对应操作。

这样做的好处是：

```text
用户不一定要自己发交易
用户可以把执行权临时交给别人
链上合约仍然可以验证授权真实性
前端可以实现更灵活的交互体验
```text

这就是 EIP-712 的典型使用场景。

## 二、EIP-712 解决了什么问题？

普通签名也可以完成授权，但普通签名有一个问题：

用户看到的签名内容通常不够清楚。

如果钱包只展示一串 hash，用户很难知道自己到底签了什么。这样就容易出现钓鱼风险。

EIP-712 的优势在于，它签的是结构化数据。

比如用户要签名的不是一串乱码，而是类似这样的内容：

```json
{
  "name": "Greeter",
  "version": "1",
  "chainId": 1,
  "verifyingContract": "0x...",
  "message": {
    "text": "Hello World"
  }
}
```

钱包可以把这些字段展示给用户，让用户知道：

```text
我正在给哪个合约签名
我签名的内容是什么
这个签名在哪条链上有效
这个签名对应哪个应用或协议
```text

这比普通的 `personal_sign` 更安全，也更适合复杂业务场景。

## 三、EIP-712 的核心组成

EIP-712 签名通常包含三部分：

```text
Domain
Type
Message
```

### 1. Domain：签名域

Domain 用来说明这个签名属于哪个应用、哪个版本、哪条链、哪个合约。

常见字段包括：

```solidity
name
version
chainId
verifyingContract
```text

比如：

```text
name = Greeter
version = 1
chainId = 1
verifyingContract = 当前合约地址
```

Domain 的作用是防止签名被拿到其他合约或其他链上重复使用。

比如用户在 A 合约上签了一个授权，如果没有 Domain 限制，攻击者可能尝试把这个签名拿到 B 合约上使用。

所以 Domain 本质上是在告诉合约：

```text
这个签名只属于当前应用、当前版本、当前链、当前合约。
```text

### 2. Type：结构体类型

Type 用来定义用户签名的数据结构。

比如我们要让用户授权修改 greeting 文本，可以定义一个结构：

```solidity
struct Greeting {
    string text;
}
```

它对应的类型哈希可以写成：

```solidity
bytes32 private constant GREETING_TYPEHASH =
    keccak256("Greeting(string text)");
```text

这个 `TYPEHASH` 非常重要。

它告诉 EIP-712：

```text
用户签名的数据结构是什么？
字段有哪些？
字段类型是什么？
字段顺序是什么？
```

只要字段类型、名称或顺序变化，最终 hash 就会变化，原签名就无法通过验证。

### 3. Message：具体签名内容

Message 就是用户真正要签的数据。

比如：

```json
{
  "text": "Hello World"
}
```ts

在链上验证时，合约会把这个 `text` 重新编码、哈希，然后和用户签名恢复出来的地址进行比对。

如果签名者确实是 owner，说明这个操作被 owner 授权过。

## 四、示例场景：把 Greeter 改造成 Permit 模式

假设我们有一个简单的 Greeter 合约。

它里面有一个 `text` 状态变量，只有 owner 可以修改：

```solidity
string public text;
address public owner;

function greet(string calldata newText) external {
    require(msg.sender == owner, "Not owner");
    text = newText;
}
```

这种写法要求 owner 必须自己发交易。

现在我们希望改成：

```text
owner 在链下签名
任何人拿着 owner 的签名都可以提交交易
合约验证签名有效后修改 text
```ts

这样就可以实现一种类似 Permit 的授权模式。

也就是说，owner 不需要自己发交易，只需要签名；真正提交交易的人可以是 relayer，也可以是其他用户。

## 五、使用 OpenZeppelin 实现 EIP-712

OpenZeppelin 已经封装好了 EIP-712 和 ECDSA 相关工具。

我们可以直接继承：

```solidity
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
```

其中：

```text
EIP712：负责生成符合 EIP-712 标准的 digest
ECDSA：负责从签名中恢复 signer 地址
```text

合约可以这样初始化 EIP-712：

```solidity
constructor() EIP712("Greeter", "1") {
    owner = msg.sender;
}
```

这里的：

```text
Greeter = domain name
1 = domain version
```solidity

这两个值会参与签名域的计算。

## 六、合约代码示例

下面是一个简化版示例：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Greeter is EIP712 {
    using ECDSA for bytes32;

    string public text;
    address public owner;

    bytes32 private constant GREETING_TYPEHASH =
        keccak256("Greeting(string text)");

    constructor() EIP712("Greeter", "1") {
        owner = msg.sender;
        text = "Hello World";
    }

    function greet(string calldata newText, bytes calldata signature) external {
        require(_verify(newText, signature), "Invalid signature");

        text = newText;
    }

    function _verify(
        string calldata newText,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                GREETING_TYPEHASH,
                keccak256(bytes(newText))
            )
        );

        bytes32 digest = _hashTypedDataV4(structHash);

        address signer = ECDSA.recover(digest, signature);

        return signer == owner;
    }
}
```

这段代码的核心逻辑是：

```text
1. 用户链下签名 newText
2. 调用 greet(newText, signature)
3. 合约重新计算 structHash
4. 合约通过 _hashTypedDataV4 生成 digest
5. 合约用 ECDSA.recover 恢复 signer
6. 如果 signer == owner，说明签名有效
7. 修改 text
```text

## 七、为什么 string 要先 keccak256？

在代码中，`newText` 是一个字符串：

```solidity
string calldata newText
```

但在 EIP-712 中，对动态类型数据，例如：

```solidity
string
bytes
```text

通常需要先做一次 hash：

```solidity
keccak256(bytes(newText))
```

然后再放进 `abi.encode` 里：

```solidity
bytes32 structHash = keccak256(
    abi.encode(
        GREETING_TYPEHASH,
        keccak256(bytes(newText))
    )
);
```text

如果直接把 string 塞进去，很容易导致链下签名和链上验证结果不一致。

所以处理 EIP-712 的时候，一定要注意：

```text
动态类型先 hash，再参与结构体编码。
```

## 八、前端如何生成 EIP-712 签名？

如果你是前端开发者，可以用 ethers 或 viem 来生成 EIP-712 签名。

下面以 ethers 为例。

假设合约地址是：

```ts
const contractAddress = "0x...";
```ts

用户要签名的内容是：

```ts
const message = {
  text: "Hello EIP-712",
};
```

前端可以这样写：

```ts
const domain = {
  name: "Greeter",
  version: "1",
  chainId: 1,
  verifyingContract: contractAddress,
};

const types = {
  Greeting: [{ name: "text", type: "string" }],
};

const value = {
  text: "Hello EIP-712",
};

const signature = await signer.signTypedData(domain, types, value);
```text

生成签名后，就可以把 `newText` 和 `signature` 一起传给合约：

```ts
await greeter.greet("Hello EIP-712", signature);
```

这里要注意：

```text
链下签名的 text 必须和链上调用 greet 时传入的 newText 完全一致。
```text

如果链下签的是：

```text
Hello EIP-712
```

但链上调用时传的是：

```text
Hello World
```ts

那么签名验证一定会失败。

因为合约会根据链上传入的 `newText` 重新计算 hash，只要内容不同，digest 就不同，恢复出来的 signer 也不会匹配。

## 九、用 viem 生成签名

如果你的项目使用 Next.js + viem，也可以这样写：

```ts
import { mainnet } from "viem/chains";

const domain = {
  name: "Greeter",
  version: "1",
  chainId: mainnet.id,
  verifyingContract: contractAddress,
} as const;

const types = {
  Greeting: [{ name: "text", type: "string" }],
} as const;

const message = {
  text: "Hello EIP-712",
};

const signature = await walletClient.signTypedData({
  account,
  domain,
  types,
  primaryType: "Greeting",
  message,
});
```

然后调用合约：

```ts
await walletClient.writeContract({
  address: contractAddress,
  abi: greeterAbi,
  functionName: "greet",
  args: ["Hello EIP-712", signature],
});
```text

在真实项目中，这个 `writeContract` 不一定由签名用户自己调用，也可以由 relayer 调用。

这就是 gasless transaction 或 meta transaction 的基础思路。

## 十、EIP-712 的执行流程

整个流程可以总结为：

```text
前端构造 domain、types、message
↓
用户使用钱包签名 typed data
↓
前端得到 signature
↓
signature 发送给 relayer 或其他执行方
↓
执行方调用合约函数
↓
合约根据参数重新计算 EIP-712 digest
↓
合约用 ECDSA.recover 恢复签名地址
↓
检查 signer 是否是授权人
↓
验证通过，执行链上逻辑
```

这里最关键的是：

```text
签名不是授权所有操作，而是授权某一份具体数据。
```text

比如用户签的是：

```text
text = Hello EIP-712
```

那么这个签名只能用于设置这段文本，不能被改成其他文本。

## 十一、EIP-712 常见使用场景

EIP-712 在实际开发中非常常见。

### 1. ERC20 Permit

最典型的例子是 ERC20 Permit。

传统 ERC20 授权需要用户先发送一笔 `approve` 交易，然后再发送一笔业务交易。

Permit 则允许用户链下签名授权，别人可以拿着签名在链上提交，从而减少一次链上交易。

### 2. Gasless Transaction

用户只负责签名，不需要自己支付 Gas。

项目方或 relayer 帮用户提交交易。

这对新用户体验非常友好，尤其适合游戏、社交、消费类 Web3 应用。

### 3. 链下订单

很多 DEX 或 NFT 市场会让用户在链下签订单。

只有当订单被成交时，才把签名提交到链上验证并执行。

这样可以减少链上存储和交易成本。

### 4. 白名单验证

项目方可以给用户生成 EIP-712 签名，用户 mint 或领取奖励时提交签名。

合约验证签名来自项目方地址，就允许用户执行操作。

### 5. 委托执行

用户可以授权某个操作由别人代为执行。

比如修改配置、领取奖励、提交某个状态更新等。

## 十二、需要注意的安全问题

EIP-712 很强大，但如果使用不当，也会有安全风险。

### 1. 防止重放攻击

如果一个签名可以被重复使用，那么攻击者可能反复提交同一个签名。

比如用户只想授权一次：

```text
把 text 改成 Hello
```ts

但如果合约没有记录这个签名是否已经使用过，别人就可以重复调用。

解决方式通常是加入 nonce：

```solidity
mapping(address => uint256) public nonces;
```

签名时把 nonce 一起签进去：

```solidity
keccak256("Greeting(string text,uint256 nonce)")
```text

每次成功执行后递增 nonce。

这样旧签名就无法重复使用。

### 2. 设置 deadline

签名最好有过期时间。

比如：

```solidity
deadline
```

合约验证时检查：

```solidity
require(block.timestamp <= deadline, "Expired signature");
```text

这样即使签名泄露，也不会永久有效。

### 3. 绑定 chainId 和 verifyingContract

EIP-712 的 domain 里应该包含：

```text
chainId
verifyingContract
```

这样可以防止签名被拿到其他链或其他合约中使用。

### 4. 签名内容必须完整

用户授权什么，签名里就应该包含什么。

如果业务逻辑里有金额、接收人、token 地址、nonce、deadline 等关键字段，就都应该放进 EIP-712 message 里。

不要只签一部分数据，否则可能被别人替换参数。

## 十三、一个更完整的结构设计

真实项目里，建议不要只签一个 `text`。

更完整的结构可能是：

```solidity
struct Greeting {
    address owner;
    string text;
    uint256 nonce;
    uint256 deadline;
}
```text

对应的 typehash：

```solidity
bytes32 private constant GREETING_TYPEHASH =
    keccak256("Greeting(address owner,string text,uint256 nonce,uint256 deadline)");
```

这样可以同时解决：

```text
谁授权的
授权内容是什么
签名是否已经使用过
签名是否过期
```text

这比只签 `text` 安全很多。

## 十四、总结

EIP-712 是以太坊中非常重要的签名标准。

它解决的核心问题是：

```text
如何让用户对结构化数据进行可读、可验证、安全的链下签名？
```

通过 EIP-712，用户可以在链下签名授权，其他人可以把签名提交到链上，合约再通过 ECDSA 恢复签名者地址，从而判断操作是否被授权。

它的核心流程是：

```text
链下构造结构化数据
↓
用户签名
↓
链上重新计算 digest
↓
恢复 signer
↓
验证 signer 是否有权限
↓
执行业务逻辑
```text

OpenZeppelin 提供了成熟的 `EIP712` 和 `ECDSA` 工具，可以帮助开发者更安全、更方便地实现这一套逻辑。

对于前端开发者来说，EIP-712 也非常重要。因为很多高级交互，比如 Permit、Gasless Transaction、Meta Transaction、链下订单、白名单授权，本质上都离不开结构化签名。

一句话总结：

```text
EIP-712 让用户可以在链下签一份“可读的授权书”，合约可以在链上验证这份授权书是否真实有效。
```

如果你正在开发 Web3 前端、钱包交互、DeFi 授权或合约签名功能，EIP-712 是一个必须掌握的基础能力。
