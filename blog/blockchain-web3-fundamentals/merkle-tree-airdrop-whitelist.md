# Merkle Tree 详解：为什么空投和白名单都喜欢用它？

在 Web3 开发里，Merkle Tree 是一个非常高频的概念。

你可能在很多地方见过这些词：

```txt
Merkle Tree
Merkle Proof
Merkle Root
Merkle Patricia Tree
```text

它们看起来很抽象，但实际解决的问题非常具体：

```txt
如何高效、低成本、可验证地证明某个数据属于一组数据？
```

比如：

- 某个地址是否在空投名单里；
- 某个用户是否在 NFT 白名单里；
- 某笔交易是否包含在某个区块里；
- 某个状态是否属于某个 Rollup 批次；
- 某个名字是否在 VIP 名单里。

如果我们把所有数据都直接存到链上，成本会非常高。

所以在链上开发中，Merkle Tree 经常被用来做大规模集合证明。

---

## 一、Merkle Tree 解决什么问题？

先看一个简单场景。

假设有一个 VIP Club，门口保安需要判断某个人的名字是否在 VIP 名单里。

最笨的方法是拿出一份完整名单，从头到尾查：

```txt
Alice
Bob
Cara
Dylan
Sarah
...
```ts

如果名单只有 10 个人，这没什么问题。

但如果名单有 10000 个人，每次都从头遍历，就非常低效。

如果放到 Solidity 里，这个问题会更严重。

因为链上计算需要 gas。

你可能会想：

```solidity
address[] public whitelist;

function isWhitelisted(address user) public view returns (bool) {
    for (uint256 i = 0; i < whitelist.length; i++) {
        if (whitelist[i] == user) {
            return true;
        }
    }
    return false;
}
```

这个逻辑在传统后端里可能还能接受，但在链上就很危险。

因为数组越长，循环越贵。

当白名单地址很多时，遍历数组可能直接超过 gas limit，导致交易无法执行。

这就可能形成 DoS 问题：

```txt
名单太长，导致用户无法完成验证。
```text

所以我们需要一种更高效的方式来证明：

```txt
这个地址确实在名单里。
```

这就是 Merkle Tree 的用武之地。

---

## 二、Merkle Tree 是什么？

Merkle Tree 是一种树形数据结构。

它由 Ralph Merkle 在 1979 年提出。

它的核心思想是：

```txt
把一组数据不断两两哈希，最终得到一个根哈希。
```text

这个根哈希就叫：

```txt
Merkle Root
```

Merkle Tree 通常可以想象成一棵倒过来的树。

底部是叶子节点，顶部是根节点。

```txt
          Merkle Root
              |
        ----------------
        |              |
     Hash12          Hash34
      |  |            |  |
   Hash1 Hash2     Hash3 Hash4
     |     |          |     |
   Cara  Sarah       Bob   Dylan
```text

最底层的数据，比如名字、地址、交易数据，会先被哈希成叶子节点。

然后相邻的叶子节点继续两两哈希，得到中间节点。

中间节点继续两两哈希，直到最后只剩一个根节点。

这个根节点就是 Merkle Root。

---

## 三、Merkle Tree 的三个核心概念

理解 Merkle Tree，需要先记住三个词。

### 1. Leaf

Leaf，也就是叶子节点。

它通常是原始数据经过哈希后的结果。

比如 VIP 名单里有一个名字：

```txt
Cara
```

可以对它做哈希：

```solidity
keccak256(bytes("Cara"))
```text

得到的结果就是一个 leaf。

如果是空投场景，leaf 可能是：

```solidity
keccak256(abi.encodePacked(userAddress, amount))
```

也就是说，leaf 不一定只是地址，也可以包含地址和额度。

---

### 2. Merkle Root

Merkle Root 是整棵树最顶部的根哈希。

它代表了整组数据的摘要。

只要底层任何一个数据变了，最终 Merkle Root 就会变。

所以 Merkle Root 可以用来代表整份名单。

链上只需要存一个 root，就可以代表整个白名单或空投名单。

这就是它省 gas 的关键。

---

### 3. Merkle Proof

Merkle Proof 是用来证明某个 leaf 属于这棵树的一组辅助数据。

它通常是从 leaf 到 root 路径上所需要的兄弟节点哈希。

比如要证明 `Cara` 在树里。

假设树是这样：

```txt
          Root
          /  \
      Hash12 Hash34
      /   \   /   \
   Hash1 Hash2 Hash3 Hash4
   Cara  Sarah Bob  Dylan
```text

如果要证明 Cara 存在，我们已经知道 Cara 自己能算出 Hash1。

还需要提供：

```txt
Hash2
Hash34
```

有了这两个值，就可以从 Hash1 一路向上重新计算出 Root。

如果计算出来的 Root 和链上保存的 Root 一样，就说明 Cara 确实在这棵树里。

所以 Merkle Proof 本质上是：

```txt
从某个 leaf 还原 root 所需要的一组兄弟节点哈希。
```text

---

## 四、Merkle Tree 是怎么构造的？

假设我们有 4 个 VIP 名字：

```txt
Cara
Sarah
Bob
Dylan
```

第一步，先分别哈希每个名字：

```txt
Hash1 = keccak256("Cara")
Hash2 = keccak256("Sarah")
Hash3 = keccak256("Bob")
Hash4 = keccak256("Dylan")
```text

第二步，把相邻节点两两哈希：

```txt
Hash12 = keccak256(Hash1 + Hash2)
Hash34 = keccak256(Hash3 + Hash4)
```

第三步，再把中间节点哈希成根：

```txt
Root = keccak256(Hash12 + Hash34)
```text

最终得到 Merkle Root。

这棵树就可以表示整个 VIP 名单。

---

## 五、Merkle Proof 是怎么验证的？

假设现在 Cara 来到 VIP Club 门口，她要证明自己在名单里。

她需要提供：

```txt
name = "Cara"
proof = [Hash2, Hash34]
```

验证过程如下：

第一步，根据 Cara 自己的名字算出 leaf：

```txt
Hash1 = keccak256("Cara")
```text

第二步，把 Hash1 和 proof 里的第一个值 Hash2 组合，算出 Hash12：

```txt
Hash12 = keccak256(Hash1 + Hash2)
```

第三步，把 Hash12 和 proof 里的第二个值 Hash34 组合，算出 Root：

```txt
CalculatedRoot = keccak256(Hash12 + Hash34)
```text

第四步，把计算出来的 root 和预期 root 比较：

```txt
CalculatedRoot == ExpectedRoot
```

如果相等，说明 Cara 在名单里。

如果不相等，说明 Cara 不在名单里，或者 proof 是假的。

---

## 六、为什么 Merkle Proof 很高效？

如果名单有 N 个地址，普通遍历需要 O(N)。

也就是说，名单越长，验证成本越高。

但 Merkle Proof 只需要验证从 leaf 到 root 的那条路径。

复杂度是：

```txt
O(log N)
```text

例如名单有 10000 个地址，遍历可能要查 10000 次。

但 Merkle Proof 只需要大约十几层证明。

所以它非常适合链上验证大规模名单。

这就是为什么 NFT 白名单、空投名单经常用 Merkle Tree。

---

## 七、空投场景中的 Merkle Tree

空投是 Merkle Tree 最经典的应用之一。

假设项目方要给 100000 个地址发 token。

如果把所有地址和额度都存到链上，成本会非常高。

更好的方式是：

第一步，项目方在链下准备空投名单：

```txt
address1 -> 100 token
address2 -> 200 token
address3 -> 50 token
...
```

第二步，把每一项哈希成 leaf：

```solidity
leaf = keccak256(abi.encodePacked(account, amount))
```text

第三步，用所有 leaf 构造 Merkle Tree。

第四步，把 Merkle Root 存到空投合约里。

第五步，用户 claim 时提交：

```txt
account
amount
proof
```

第六步，合约根据用户提交的数据重新计算 leaf，再用 proof 还原 root。

如果 root 匹配，说明用户确实在空投名单里，并且额度正确。

这样链上只需要存一个 root。

用户自己提交 proof。

这就极大节省了链上存储成本。

---

## 八、Solidity 中如何验证 Merkle Proof？

在 Solidity 里，通常不会自己手写完整验证逻辑，而是使用 OpenZeppelin 的 `MerkleProof` 库。

常见代码如下：

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract VIPClub {
    bytes32 public merkleRoot;

    error NotInClub();

    constructor(bytes32 _merkleRoot) {
        merkleRoot = _merkleRoot;
    }

    function verifyInClub(
        string calldata name,
        bytes32[] calldata proof
    ) external view returns (bool) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(bytes(name))));

        bool valid = MerkleProof.verify(proof, merkleRoot, leaf);

        if (!valid) {
            revert NotInClub();
        }

        return true;
    }
}
```text

这里的核心是：

```solidity
MerkleProof.verify(proof, merkleRoot, leaf)
```

它会根据 leaf 和 proof 计算出一个 root，然后和合约里保存的 `merkleRoot` 比较。

如果相等，就返回 true。

否则返回 false。

---

## 九、OpenZeppelin 的 MerkleProof.verify 做了什么？

OpenZeppelin 的 `verify` 大致逻辑是：

1. 从 leaf 开始；
2. 遍历 proof 数组；
3. 每次把当前 hash 和 proof 中的下一个 hash 组合；
4. 再次 keccak256；
5. 最终得到 computedRoot；
6. 比较 computedRoot 是否等于 expectedRoot。

伪代码可以这样理解：

```solidity
function verify(
    bytes32[] memory proof,
    bytes32 root,
    bytes32 leaf
) internal pure returns (bool) {
    bytes32 computedHash = leaf;

    for (uint256 i = 0; i < proof.length; i++) {
        computedHash = hashPair(computedHash, proof[i]);
    }

    return computedHash == root;
}
```text

真实实现里会更细节一些。

例如在哈希两个节点时，OpenZeppelin 会先按大小排序，再哈希。

也就是说：

```txt
较小的 hash 放前面
较大的 hash 放后面
```

这样可以避免左右顺序不一致导致验证失败。

---

## 十、链上和链下分别做什么？

Merkle Tree 的使用通常分成链下和链上两部分。

### 链下做什么？

链下负责：

- 准备完整名单；
- 生成 leaf；
- 构造 Merkle Tree；
- 生成 Merkle Root；
- 为每个用户生成 Merkle Proof；
- 输出 JSON 文件。

常用工具包括：

- OpenZeppelin 的 JavaScript Merkle Tree 工具；
- murky Solidity library；
- merkletreejs；
- 自定义脚本。

链下可以保存完整名单和 proof。

### 链上做什么？

链上只负责：

- 存储 Merkle Root；
- 接收用户提交的 proof；
- 重新计算 root；
- 判断是否匹配；
- 执行 mint / claim / whitelist 逻辑。

所以链上不需要存储完整名单。

这就是 Merkle Tree 省 gas 的根本原因。

---

## 十一、为什么 leaf 有时要 hash 两次？

在一些 Merkle Tree 实现中，你会看到 leaf 被 hash 两次。

例如：

```solidity
bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(name))));
```text

或者：

```solidity
bytes32 leaf = keccak256(abi.encodePacked(
    keccak256(abi.encode(account, amount))
));
```

这不是随便写的。

它主要是为了防止一种攻击：

```txt
Second Preimage Attack
```text

也就是二次原像攻击。

---

## 十二、什么是二次原像攻击？

在某些情况下，如果 leaf 数据刚好是 64 字节，攻击者可能把两个已经存在的子节点拼接起来，伪装成一个 leaf。

比如原本树里有：

```txt
Hash1
Hash2
```

正常情况下：

```txt
Hash12 = keccak256(Hash1 + Hash2)
```text

攻击者如果能把：

```txt
Hash1 + Hash2
```

作为原始 leaf 数据传进去，合约再对它做一次哈希，就可能得到 Hash12。

这样攻击者传入的“数据”虽然不是原始名单中的 leaf，却可能通过 proof 验证。

这就是二次原像攻击的思路。

简单说就是：

```txt
攻击者把中间节点伪装成叶子节点。
```text

---

## 十三、如何防止二次原像攻击？

常见防御方式有两个。

### 1. 避免接受 64 字节 leaf 原始数据

如果业务不需要接受 64 字节长度的原始 leaf 数据，可以避免这种风险。

因为两个 `bytes32` 拼接起来正好是 64 字节。

### 2. 对 leaf 做双重哈希

更常见的方式是对 leaf 数据 hash 两次。

这样 leaf 的生成逻辑和中间节点的生成逻辑就不一样。

中间节点通常是：

```solidity
keccak256(abi.encodePacked(left, right))
```

而 leaf 是：

```solidity
keccak256(bytes.concat(keccak256(abi.encode(data))))
```text

这样攻击者就不能把两个中间节点拼接后伪装成 leaf。

因为 leaf 会被额外 hash 一次，计算结果对不上。

所以在很多成熟工具里，生成 leaf 时会默认使用双重哈希。

这也是 OpenZeppelin、murky 等工具通常推荐的安全做法。

---

## 十四、Merkle Tree 在区块链中的其他应用

除了空投和白名单，Merkle Tree 在区块链中还有很多应用。

### 1. 区块中的交易证明

在区块链中，一个区块通常包含很多交易。

为了高效证明某笔交易属于某个区块，可以把区块中的交易构造成 Merkle Tree。

区块头里只保存交易树的 root。

如果你想证明某笔交易在这个区块中，只需要提供 Merkle Proof，而不需要提供整个区块里的全部交易。

---

### 2. Ethereum 中的 Merkle Patricia Tree

以太坊底层使用的是 Merkle Patricia Tree。

它和普通 Merkle Tree 有相似之处：

```txt
子节点变化会影响父节点
父节点变化会影响 root
root 可以代表整棵树的状态
```

以太坊区块头里会包含一些重要 root，例如：

```txt
stateRoot
transactionsRoot
receiptsRoot
```text

它们分别代表：

- 世界状态树；
- 交易树；
- 收据树。

如果某个账户状态、交易或 receipt 改变，对应 root 也会改变。

---

### 3. Rollup 中的批次证明

Rollup 是以太坊 Layer2 扩容方案。

它会把多笔交易打包成一个 batch，然后把 batch 的相关数据或状态承诺提交到 Layer1。

Merkle Tree 可以用于表示：

- batch 中的交易集合；
- Rollup 执行前状态；
- Rollup 执行后状态；
- 用户提现证明；
- 某笔交易是否包含在 batch 中。

例如，一个 Rollup batch 中有很多交易，每笔交易可以作为一个 leaf。

这些 leaf 构造成 Merkle Tree 后，得到一个 batch root。

如果想证明某笔交易包含在 batch 中，就可以提供对应的 Merkle Proof。

---

## 十五、什么时候应该使用 Merkle Tree？

在智能合约开发中，如果你遇到下面这些场景，就可以考虑使用 Merkle Tree：

```txt
数据集合很大
不想把完整列表存链上
只需要验证某个元素是否属于集合
希望链上验证成本较低
希望证明过程可验证
```

典型场景包括：

- NFT 白名单 mint；
- Token 空投 claim；
- 大规模地址名单校验；
- 用户资格证明；
- 批量额度分配；
- Rollup batch inclusion proof；
- 跨链消息证明；
- 区块交易包含证明。

---

## 十六、Merkle Tree 的优点和缺点

### 优点

Merkle Tree 的优点很明显：

```txt
链上只存 root，节省 storage
验证复杂度是 O(log N)
适合大规模名单
证明过程可验证
不需要暴露完整数据集合
```text

### 缺点

但它也不是万能的。

Merkle Tree 也有一些限制：

```txt
名单更新不方便
root 一变，所有 proof 都要重新生成
用户需要拿到自己的 proof
链下脚本和链上验证逻辑必须保持一致
leaf 编码方式必须严格统一
需要注意二次原像攻击
```

尤其是 leaf 的编码方式一定要小心。

比如链下生成 leaf 用的是：

```solidity
keccak256(abi.encode(account, amount))
```text

链上验证也必须用同样方式。

如果链上用 `abi.encodePacked`，链下用 `abi.encode`，就可能导致 proof 验证失败。

---

## 十七、前端如何配合 Merkle Tree？

从 Web3 前端角度看，Merkle Tree 通常这样用：

1. 项目方生成一份 JSON 文件；
2. JSON 中包含用户地址、额度、proof；
3. 前端根据当前连接的钱包地址查找对应 proof；
4. 用户点击 claim 或 mint；
5. 前端把 proof、amount 等参数传给合约；
6. 合约调用 `MerkleProof.verify` 验证；
7. 验证通过后执行 claim / mint。

前端要特别注意：

- 地址大小写统一；
- chainId 是否正确；
- proof 是否和当前 root 对应；
- leaf 参数顺序是否正确；
- amount 单位是否正确；
- 用户不在名单时要给出明确提示；
- proof 文件不要太大，否则前端加载慢；
- 可以把 proof 放后端接口按地址查询。

---

## 十八、面试回答参考

如果面试官问：“Merkle Tree 是什么？为什么空投和白名单常用它？”

可以这样回答：

Merkle Tree 是一种哈希树结构，主要用于高效证明某个元素属于一组数据。

它会先把每个原始数据哈希成 leaf，然后把相邻节点两两哈希，逐层向上计算，最后得到一个 Merkle Root。这个 root 可以代表整批数据。

在空投或白名单场景中，如果把所有地址都存到链上，storage 成本会非常高；如果用数组遍历，名单太长时 gas 也会非常高，甚至可能超过 gas limit。

所以通常会在链下构造 Merkle Tree，只把 Merkle Root 存到链上。用户 claim 或 mint 时提交自己的 leaf 信息和 Merkle Proof。合约根据 proof 重新计算 root，如果计算结果和链上保存的 root 一致，就说明该用户确实在名单里。

Merkle Proof 的验证复杂度是 O(log N)，比遍历整个数组高效很多。

从前端角度看，我们通常会根据用户钱包地址从 JSON 或后端接口中取出对应 proof，然后作为参数传给合约。

需要注意的是，链下生成 leaf 的编码方式必须和链上验证保持一致，并且最好使用成熟库或双重哈希方式，避免二次原像攻击风险。

---

## 十九、总结

Merkle Tree 的核心目标是：

```txt
用一个 root 代表一大组数据，并允许用户用 proof 证明自己属于这组数据。
```

Merkle Tree 中：

```txt
Leaf 是原始数据的哈希
Merkle Proof 是从 leaf 到 root 所需的兄弟节点数组
Merkle Root 是整棵树的最终根哈希
```text

它非常适合大规模名单证明。

比如：

- 空投；
- NFT 白名单；
- 资格认证；
- Rollup 批次证明；
- 交易包含证明。

它的最大优势是：

```txt
链上只需要存 root，不需要存完整名单。
```

用户提交 proof 后，合约就能高效验证该用户是否在名单中。

对于 Web3 前端开发者来说，理解 Merkle Tree 不只是为了会背概念，更是为了知道在真实项目中：

```txt
什么时候该用 Merkle Tree？
proof 从哪里来？
root 存在哪里？
前端怎么传 proof？
合约怎么验证？
leaf 编码为什么必须一致？
```

能把这些讲清楚，才是真正理解了 Merkle Tree。
