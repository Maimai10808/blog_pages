# ERC20 Permit 详解：用签名完成授权，减少一次 approve 交易

在 ERC20 Token 的交互中，`approve + transferFrom` 是一个非常常见的流程。

例如用户想在 DEX 中兑换代币，或者想让某个合约帮自己转走 Token，通常需要先执行一次 `approve`，授权某个 spender 可以花费自己的 Token，然后再执行真正的业务交易。

这意味着用户往往需要发起两笔交易：

第一笔：`approve(spender, amount)`；

第二笔：真正的业务操作，例如 swap、stake、deposit 等。

这不仅增加了用户操作成本，也增加了 Gas 消耗和交互复杂度。

ERC20 Permit 的出现，就是为了解决这个问题。

它允许用户不通过链上 `approve` 交易，而是通过离线签名的方式授权 spender。之后任何人都可以把这份签名提交到链上，合约验证签名有效后，直接设置 allowance。

这样就可以把授权这一步从“链上交易”变成“链下签名”。

## 一、ERC20 Permit 是什么

ERC20 Permit 通常指 EIP-2612 中定义的一套授权机制。

它的核心思想是：

用户通过钱包签署一段结构化消息；

这段消息表达“我允许某个 spender 花费我多少 Token”；

签名结果包含 `v`、`r`、`s`；

任何人都可以把这份签名提交到 Token 合约的 `permit` 函数；

Token 合约验证签名；

验证通过后，合约内部执行类似 `approve` 的逻辑；

spender 获得 allowance。

也就是说，用户不需要亲自发送 `approve` 交易，只需要签名。

从用户体验上看，原来的流程是：

```txt
用户发起 approve 交易
  ↓
等待 approve 上链
  ↓
用户再发起业务交易
```

使用 Permit 后，流程可以变成：

```txt
用户签名 permit 消息
  ↓
业务合约在同一笔交易中调用 permit
  ↓
业务合约继续 transferFrom
```

这样就减少了一次独立的 approve 交易。

## 二、ERC20 Permit 依赖哪些标准

ERC20 Permit 主要依赖三个标准或概念。

### 1. ERC20

ERC20 是最基础的同质化代币标准。

它定义了常见方法：

```solidity
transfer
approve
transferFrom
allowance
balanceOf
```

Permit 并不是替代 ERC20，而是在 ERC20 的基础上增加一种新的授权方式。

### 2. EIP-2612

EIP-2612 定义了 ERC20 Permit 的接口和行为。

核心包括三个方法：

```solidity
permit(...)
nonces(...)
DOMAIN_SEPARATOR()
```

其中最重要的是 `permit`。

### 3. EIP-712

EIP-712 是结构化数据签名标准。

如果直接让用户签一串难以理解的十六进制数据，用户体验和安全性都很差。EIP-712 允许钱包以更清晰的方式展示签名内容。

例如用户可以看到：

```txt
owner: 0x...
spender: 0x...
value: 1000
nonce: 0
deadline: 1719999999
```

这比直接签一段乱码更安全，也更容易理解。

ERC20 Permit 使用的就是 EIP-712 Typed Data 签名。

## 三、permit 函数长什么样

EIP-2612 中的 `permit` 函数大致如下：

```solidity
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;
```

这些参数分别表示：

`owner`：Token 持有人；

`spender`：被授权花费 Token 的地址；

`value`：授权额度；

`deadline`：签名过期时间；

`v`、`r`、`s`：签名拆分后的三个值。

调用 `permit` 成功后，效果类似于：

```solidity
approve(spender, value)
```

但区别在于，`approve` 必须由 owner 自己发起链上交易，而 `permit` 可以由任何人提交，只要签名是 owner 本人签的即可。

## 四、nonces 的作用：防止重放攻击

Permit 中还有一个非常重要的概念：nonce。

合约会为每个 owner 维护一个 nonce：

```solidity
function nonces(address owner) external view returns (uint256);
```

用户签名时，必须把当前 nonce 放入签名数据中。

例如第一次签名时：

```txt
nonce = 0
```

当这份签名被成功使用后，合约会把该用户的 nonce 加 1。

下一次签名时就必须使用：

```txt
nonce = 1
```

如果攻击者拿到旧签名，再次提交，合约会发现当前 nonce 已经不是旧签名中的 nonce，于是验证失败。

这就是防止重放攻击的关键。

如果没有 nonce，同一份签名可能被反复使用，这是非常危险的。

## 五、deadline 的作用：限制签名有效期

`deadline` 用来限制签名的有效时间。

例如：

```txt
deadline = 当前时间 + 30 分钟
```

如果超过这个时间，签名就不能再被使用。

这样做可以降低签名泄露后的风险。

如果你把 deadline 设置成非常大的值，接近无限期，那么这份签名就会长期有效。虽然某些场景会这样做，但从安全角度看，最好给签名设置合理的过期时间。

## 六、DOMAIN_SEPARATOR 是什么

`DOMAIN_SEPARATOR` 来自 EIP-712。

它的作用是把签名和特定合约、特定链绑定起来。

一个 EIP-712 domain 通常包含：

```txt
name
version
chainId
verifyingContract
```

例如：

```json
{
  "name": "MyToken",
  "version": "1",
  "chainId": 1,
  "verifyingContract": "0xTokenAddress"
}
```

这样可以避免签名被拿到其他链、其他合约中重放。

例如用户在 Ethereum 主网上给某个 Token 签了一份 permit，这份签名不应该能在 Polygon 或另一个 Token 合约上被使用。

`chainId` 和 `verifyingContract` 就是为了解决这个问题。

## 七、使用 OpenZeppelin 实现 ERC20 Permit

在 Solidity 中，最简单的方式是直接使用 OpenZeppelin 的 `ERC20Permit`。

示例合约：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract MyToken is ERC20, ERC20Permit {
    constructor()
        ERC20("MyToken", "MTK")
        ERC20Permit("MyToken")
    {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
```

关键点是继承：

```solidity
ERC20Permit
```

并在构造函数中调用：

```solidity
ERC20Permit("MyToken")
```

这里的 `"MyToken"` 要和 ERC20 的 name 保持一致。前端签名时使用的 domain name 也要和它一致。

部署后，合约会自动拥有：

```solidity
permit
nonces
DOMAIN_SEPARATOR
```

这些方法。

## 八、Permit 签名需要包含哪些数据

用户签名的数据主要分为三部分：

### 1. types

定义 EIP-712 的结构。

```ts
const types = {
  Permit: [
    { name: "owner", type: "address" },
    { name: "spender", type: "address" },
    { name: "value", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};
```

### 2. domain

定义签名所属的链和合约。

```ts
const domain = {
  name: "MyToken",
  version: "1",
  chainId: 1,
  verifyingContract: tokenAddress,
};
```

### 3. message

定义用户实际授权的信息。

```ts
const message = {
  owner,
  spender,
  value,
  nonce,
  deadline,
};
```

这三部分组合起来，就是用户要签的 EIP-712 Typed Data。

## 九、前端生成 Permit 签名

以 ethers 为例，前端可以这样生成签名：

```ts
import { ethers } from "ethers";

async function signPermit({
  signer,
  token,
  tokenAddress,
  owner,
  spender,
  value,
  deadline,
}: {
  signer: ethers.Signer;
  token: ethers.Contract;
  tokenAddress: string;
  owner: string;
  spender: string;
  value: bigint;
  deadline: bigint;
}) {
  const nonce = await token.nonces(owner);
  const network = await signer.provider!.getNetwork();

  const domain = {
    name: "MyToken",
    version: "1",
    chainId: Number(network.chainId),
    verifyingContract: tokenAddress,
  };

  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    owner,
    spender,
    value,
    nonce,
    deadline,
  };

  const signature = await signer.signTypedData(domain, types, message);

  const { v, r, s } = ethers.Signature.from(signature);

  return {
    owner,
    spender,
    value,
    deadline,
    v,
    r,
    s,
  };
}
```

用户在钱包中看到结构化签名内容后点击确认，就能得到签名。

这一步不需要 Gas，因为只是本地签名，不是链上交易。

## 十、调用 permit

拿到签名后，就可以调用 Token 合约的 `permit`：

```ts
await token.permit(owner, spender, value, deadline, v, r, s);
```

如果签名有效，合约会设置：

```solidity
allowance[owner][spender] = value
```

之后 spender 就可以调用：

```solidity
transferFrom(owner, to, value)
```

来转走 owner 授权额度内的 Token。

## 十一、为什么任何人都可以调用 permit

这正是 Permit 的设计目标。

因为真正表达授权意愿的是 owner 的签名，而不是 `msg.sender`。

也就是说：

owner 不需要亲自发交易；

relayer 可以帮 owner 提交签名；

业务合约也可以在交易中提交签名；

DEX 可以在 swap 前先调用 permit；

然后再调用 transferFrom。

只要签名是 owner 生成的，并且参数一致，合约就会认可。

这就为无 Gas 授权、代付交易、聚合交易和更好的用户体验提供了基础。

## 十二、Permit + transferFrom 一笔交易完成

很多 DEX 或业务合约会把 permit 和真实操作合并在一个函数里。

例如：

```solidity
function permitAndTransfer(
    IERC20Permit token,
    address owner,
    address to,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external {
    token.permit(
        owner,
        address(this),
        value,
        deadline,
        v,
        r,
        s
    );

    IERC20(address(token)).transferFrom(
        owner,
        to,
        value
    );
}
```

用户只需要签名，然后发送一笔业务交易。

这笔交易内部先执行 `permit`，给当前合约授权；再执行 `transferFrom`，完成转账或业务操作。

这样就把原来的两步：

```txt
approve
业务操作
```

变成了：

```txt
签名
业务操作
```

如果业务交易由 relayer 发起，甚至可以进一步实现用户不直接支付授权 Gas 的体验。

## 十三、Permit 在 DEX 中的使用场景

在 DEX 中，用户第一次 swap 某个 Token 时，通常需要先 approve Router 合约。

传统流程：

```txt
用户 approve Router
  ↓
等待交易确认
  ↓
用户 swap
```

使用 Permit 后，流程可以变成：

```txt
用户签名 permit
  ↓
Router 调用 permit
  ↓
Router 调用 transferFrom
  ↓
完成 swap
```

用户感知上会更顺滑，不需要单独批准一次授权交易。

Uniswap、1inch 等协议生态中，都有类似的 permit 授权思路或扩展实现。

## 十四、为什么签名参数必须完全一致

Permit 签名中包含以下数据：

```txt
owner
spender
value
nonce
deadline
chainId
verifyingContract
name
version
```

只要其中任何一个值和链上调用时不一致，签名验证都会失败。

常见错误包括：

Token name 写错；

version 写错；

chainId 写错；

verifyingContract 地址写错；

spender 地址写错；

value 和签名时不一致；

deadline 和签名时不一致；

nonce 不是当前 nonce；

钱包连接的网络不对；

合约部署地址不是签名时使用的地址。

尤其要注意 nonce。

第一次 permit 时，nonce 通常是 0。

成功使用后，nonce 会变成 1。

下一次签名必须使用新的 nonce。如果继续用旧 nonce 签名，合约会报错。

## 十五、Remix 中测试 Permit 的思路

如果使用 Remix 测试 OpenZeppelin ERC20Permit，可以按下面流程。

第一步，部署带 `ERC20Permit` 的 Token。

第二步，调用 `mint` 给 owner 铸造一些 Token。

第三步，查询：

```solidity
nonces(owner)
```

第一次通常返回 0。

第四步，前端或脚本构造 EIP-712 数据，并让 owner 签名。

第五步，从签名中拆出：

```txt
v
r
s
```

第六步，在 Remix 中调用：

```solidity
permit(owner, spender, value, deadline, v, r, s)
```

第七步，查询：

```solidity
allowance(owner, spender)
```

如果返回 value，说明授权成功。

第八步，再次查询：

```solidity
nonces(owner)
```

此时应该从 0 变成 1。

## 十六、签名拆分 v、r、s

钱包返回的 signature 通常是一整段字符串。

链上 `permit` 需要的是：

```txt
v
r
s
```

在 ethers 中可以这样拆：

```ts
const signature = await signer.signTypedData(domain, types, message);

const { v, r, s } = ethers.Signature.from(signature);
```

然后把它们传给合约：

```ts
await token.permit(owner, spender, value, deadline, v, r, s);
```

## 十七、Permit 的优势

ERC20 Permit 的优势非常明显。

第一，减少用户交易次数。

用户不再需要单独发送 `approve` 交易。

第二，节省 Gas。

签名本身不消耗 Gas，只有提交签名到链上时才消耗 Gas。

第三，改善用户体验。

很多场景可以把授权和业务操作合并在一笔交易里。

第四，支持 relayer。

用户签名后，relayer 可以代替用户提交交易。

第五，更适合聚合器和 DEX。

Swap、stake、deposit 等场景可以减少前置授权步骤。

第六，授权更可组合。

业务合约可以在同一笔交易中先 permit，再 transferFrom。

## 十八、Permit 的风险和注意事项

Permit 虽然方便，但也有一些安全注意事项。

### 1. deadline 不要无限期

如果 deadline 设置得太远，签名长期有效。一旦签名泄露，风险更大。

建议根据业务设置较短的有效期。

### 2. value 不要随便设置为最大值

有些场景会把 value 设置成 `uint256.max`，表示无限授权。

虽然用户体验方便，但安全风险更高。

如果业务允许，建议只授权本次所需额度。

### 3. 签名前要让用户看清 spender

spender 是最关键的地址。

用户应该确认自己授权的是可信合约，而不是陌生地址。

### 4. nonce 必须正确

每次签名前都应该从链上读取当前 nonce。

不能写死 nonce。

### 5. chainId 必须正确

如果用户钱包连接的链和签名数据里的 chainId 不一致，签名会失败。

### 6. domain name 和 version 必须匹配合约

OpenZeppelin 的 `ERC20Permit(name)` 中的 name 必须和前端 domain 中的 name 一致。

### 7. 不要把签名随便暴露给不可信方

签名本身可以被任何人提交。如果签名还没过期，并且 nonce 没被使用，就具备真实授权效力。

## 十九、Permit 和 approve 的区别

| 对比项                | approve               | permit                         |
| --------------------- | --------------------- | ------------------------------ |
| 授权方式              | 链上交易              | 链下签名 + 链上提交            |
| 是否消耗 Gas          | 用户 approve 消耗 Gas | 签名不消耗 Gas，提交者消耗 Gas |
| 是否需要 owner 发交易 | 需要                  | 不需要                         |
| 是否可由 relayer 提交 | 不方便                | 天然支持                       |
| 是否依赖签名          | 不依赖                | 依赖 EIP-712 签名              |
| 是否需要 nonce        | 不需要                | 需要                           |
| 用户体验              | 通常两步              | 可合并成一步                   |

简单说，`approve` 是 owner 自己上链授权，`permit` 是 owner 签名授权，别人可以帮他提交。

## 二十、一个完整的业务合约示例

下面是一个更贴近实际业务的例子：用户签名 permit 后，合约在同一笔交易中完成授权和存款。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";

contract PermitDeposit {
    mapping(address => uint256) public balances;

    function depositWithPermit(
        address token,
        address owner,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IERC20Permit(token).permit(
            owner,
            address(this),
            amount,
            deadline,
            v,
            r,
            s
        );

        bool success = IERC20(token).transferFrom(
            owner,
            address(this),
            amount
        );

        require(success, "TRANSFER_FROM_FAILED");

        balances[owner] += amount;
    }
}
```

用户只需要签名，然后调用 `depositWithPermit`。

合约会先验证签名并设置 allowance，再把 Token 转入合约。

这就是 Permit 最常见的组合用法。

## 二十一、什么时候适合使用 Permit

适合使用 Permit 的场景包括：

DEX swap；

staking；

deposit；

lending；

vault 存款；

跨链桥存款；

聚合器交易；

relayer 代付；

减少首次 approve 交互；

希望提升 Web3 UX 的项目。

不太适合的场景是：

Token 本身不支持 permit；

用户钱包不支持 EIP-712；

业务对签名管理没有把握；

团队还没有处理好 nonce、deadline、spender 风险提示。

另外，并不是所有 ERC20 Token 都支持 EIP-2612。真实主网上很多老 Token 并没有 `permit` 方法。

因此在前端中，需要先判断 Token 是否支持 Permit。如果不支持，仍然要走传统 approve 流程。

## 二十二、总结

ERC20 Permit 是一种基于 EIP-2612 和 EIP-712 的授权机制。

它允许用户通过签名表达授权意愿，而不是发送链上 approve 交易。

Permit 的核心函数是：

```solidity
permit(owner, spender, value, deadline, v, r, s)
```

它会验证 owner 的签名是否有效。如果有效，就为 spender 设置 allowance。

其中：

`owner` 是 Token 持有人；

`spender` 是被授权地址；

`value` 是授权数量；

`deadline` 是签名过期时间；

`v`、`r`、`s` 是签名参数；

`nonce` 用于防止重放攻击；

`DOMAIN_SEPARATOR` 用于绑定链、合约和签名域。

Permit 最大的价值是改善用户体验。它可以减少一次 approve 交易，让用户通过签名完成授权，并允许业务合约在同一笔交易中先 `permit` 再 `transferFrom`。

在实际项目中，使用 Permit 时要特别注意 domain、chainId、contract address、nonce、deadline、spender 和 value 的一致性。任何一个字段不匹配，签名都会验证失败。

如果你正在开发 ERC20 Token、DEX、staking、vault、借贷协议或任何需要用户授权 Token 的 Web3 应用，EIP-2612 Permit 都是一个非常值得掌握的优化点。
