# Solidity 中三种编码 calldata 的方式：encodeWithSignature、encodeWithSelector 和 encodeCall

在 Solidity 中，我们有时会使用低级调用：

```solidity
contractAddress.call(data)
```text

这里的 `data` 就是要传给目标合约的 calldata。

换句话说，如果一个合约想通过低级 `call` 调用另一个合约，就必须先把“要调用哪个函数”和“要传哪些参数”编码成一段 `bytes` 数据。

这篇文章介绍三种常见的 calldata 编码方式：

```text
abi.encodeWithSignature
abi.encodeWithSelector
abi.encodeCall
```

它们都可以生成用于低级调用的 calldata，但安全性和编译期检查能力不一样。

## 一、示例场景

假设我们有两个合约：

```text
ABIEncode 合约
Token 合约
```text

`ABIEncode` 合约负责生成 calldata，并通过低级 `call` 去调用 `Token` 合约。

目标是调用 Token 合约里的 `transfer` 方法：

```solidity
transfer(address to, uint256 amount)
```

也就是说，我们要把下面这个函数调用：

```solidity
transfer(to, amount)
```text

编码成一段 `bytes` 数据，然后传给低级调用：

```solidity
target.call(data)
```

## 二、低级 call 的基本形式

低级调用通常长这样：

```solidity
function test(address target, bytes calldata data) external {
    (bool ok, ) = target.call(data);
    require(ok, "call failed");
}
```text

这里有两个关键参数：

```text
target：要调用的目标合约地址
data：编码后的函数调用数据
```

`data` 里面包含了：

```text
函数选择器 selector
函数参数
```text

所以，我们接下来要做的，就是用三种方式生成这段 `data`。

## 三、第一种方式：abi.encodeWithSignature

第一种方式是使用：

```solidity
abi.encodeWithSignature
```

示例代码：

```solidity
function encodeWithSignature(
    address to,
    uint256 amount
) external pure returns (bytes memory) {
    return abi.encodeWithSignature(
        "transfer(address,uint256)",
        to,
        amount
    );
}
```text

这里第一个参数是函数签名字符串：

```solidity
"transfer(address,uint256)"
```

后面的参数是要传给 `transfer` 的实际参数：

```solidity
to
amount
```text

所以它的意思是：

```text
我要调用 transfer(address,uint256)，并传入 to 和 amount。
```

这种方式比较直观，但缺点也很明显：函数签名是字符串。

如果你写错了，比如：

```solidity
"transfer(address, uint256)"
```text

中间多了一个空格，或者把 `uint256` 写错，合约仍然可能正常编译。

也就是说，`abi.encodeWithSignature` 的问题是：

```text
函数签名写错，编译器不一定能帮你发现。
```

它依赖开发者自己保证字符串完全正确。

## 四、第二种方式：abi.encodeWithSelector

第二种方式是使用：

```solidity
abi.encodeWithSelector
```ts

示例代码：

```solidity
function encodeWithSelector(
    address to,
    uint256 amount
) external pure returns (bytes memory) {
    return abi.encodeWithSelector(
        IERC20.transfer.selector,
        to,
        amount
    );
}
```

这里不再手写字符串 `"transfer(address,uint256)"`，而是直接使用接口里的函数 selector：

```solidity
IERC20.transfer.selector
```text

相比 `encodeWithSignature`，这种方式更安全一些。

因为如果你把函数名写错，比如写成：

```solidity
IERC20.transfers.selector
```

合约会直接编译失败。

也就是说，`encodeWithSelector` 可以避免函数名拼写错误。

但是它仍然有问题。

比如 `transfer` 正常需要两个参数：

```solidity
address to
uint256 amount
```text

可是如果你少传一个参数，或者传错参数类型，合约仍然可能编译通过。

例如：

```solidity
abi.encodeWithSelector(
    IERC20.transfer.selector,
    amount
);
```

或者：

```solidity
abi.encodeWithSelector(
    IERC20.transfer.selector,
    true,
    amount
);
```text

这种情况下，编译器不一定会阻止你。

所以 `abi.encodeWithSelector` 的特点是：

```text
可以检查函数名是否存在；
但不能完全检查参数数量和参数类型是否正确。
```

## 五、第三种方式：abi.encodeCall

第三种方式是：

```solidity
abi.encodeCall
```ts

示例代码：

```solidity
function encodeCall(
    address to,
    uint256 amount
) external pure returns (bytes memory) {
    return abi.encodeCall(
        IERC20.transfer,
        (to, amount)
    );
}
```

这里直接传入目标函数：

```solidity
IERC20.transfer
```text

然后把参数放在一个元组里：

```solidity
(to, amount)
```

这种方式是三种里面最严格的。

如果函数名写错，比如：

```solidity
IERC20.transfers
```text

合约无法编译。

如果参数类型写错，比如传入一个 `bool`：

```solidity
abi.encodeCall(
    IERC20.transfer,
    (true, amount)
);
```

合约也无法编译。

如果参数数量不对，比如少传一个参数：

```solidity
abi.encodeCall(
    IERC20.transfer,
    (amount)
);
```text

也会编译失败。

也就是说，`abi.encodeCall` 会同时检查：

```text
函数是否存在
参数数量是否正确
参数类型是否匹配
```

因此它比前两种方式更安全。

## 六、三种方式生成的数据是否一样？

如果三种方式都写对了，它们最终生成的 calldata 是一样的。

也就是说，下面三种写法在正确情况下都可以生成相同的 `bytes` 数据：

```solidity
abi.encodeWithSignature(
    "transfer(address,uint256)",
    to,
    amount
);
```text

```solidity
abi.encodeWithSelector(
    IERC20.transfer.selector,
    to,
    amount
);
```

```solidity
abi.encodeCall(
    IERC20.transfer,
    (to, amount)
);
```text

然后这段数据都可以传给低级调用：

```solidity
target.call(data)
```

只要目标合约确实有对应的 `transfer(address,uint256)` 函数，调用就可以成功。

## 七、完整示例代码

下面是一个简化版示例。

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}

contract ABIEncode {
    function encodeWithSignature(
        address to,
        uint256 amount
    ) external pure returns (bytes memory) {
        return abi.encodeWithSignature(
            "transfer(address,uint256)",
            to,
            amount
        );
    }

    function encodeWithSelector(
        address to,
        uint256 amount
    ) external pure returns (bytes memory) {
        return abi.encodeWithSelector(
            IERC20.transfer.selector,
            to,
            amount
        );
    }

    function encodeCall(
        address to,
        uint256 amount
    ) external pure returns (bytes memory) {
        return abi.encodeCall(
            IERC20.transfer,
            (to, amount)
        );
    }

    function test(address target, bytes calldata data) external {
        (bool ok, ) = target.call(data);
        require(ok, "call failed");
    }
}
```text

这个合约里有四个函数：

```text
encodeWithSignature：用函数签名字符串编码 calldata
encodeWithSelector：用函数 selector 编码 calldata
encodeCall：用类型安全的方式编码 calldata
test：用低级 call 调用目标合约
```

测试时，可以先调用三个编码函数，传入相同的 `to` 和 `amount`，观察它们返回的 `bytes` 数据。

如果写法都正确，三者返回的 calldata 应该是一样的。

然后把返回的 `data` 传入 `test` 函数，同时传入 Token 合约地址：

```solidity
test(tokenAddress, data)
```text

这样 `ABIEncode` 合约就会通过低级调用去调用 Token 合约的 `transfer` 方法。

## 八、三种方式的区别

可以用一张表总结：

| 编码方式                | 函数名检查 | 参数类型检查 | 参数数量检查 | 主要问题                       |
| ----------------------- | ---------- | ------------ | ------------ | ------------------------------ |
| abi.encodeWithSignature | 不严格     | 不严格       | 不严格       | 字符串写错也可能编译通过       |
| abi.encodeWithSelector  | 较严格     | 不严格       | 不严格       | 函数名更安全，但参数仍可能写错 |
| abi.encodeCall          | 严格       | 严格         | 严格         | 写法稍微更规范，但更安全       |

简单理解：

```text
encodeWithSignature：最灵活，但最容易写错
encodeWithSelector：避免函数名写错，但参数仍要小心
encodeCall：最安全，编译期检查最完整
```

## 九、应该优先使用哪一种？

如果是新项目，优先考虑：

```solidity
abi.encodeCall
```text

因为它能在编译阶段发现更多错误。

比如函数名写错、参数类型不对、参数数量不匹配，这些问题都可以提前暴露，而不是等到交易执行时才失败。

`abi.encodeWithSignature` 适合快速测试，或者在你只能拿到函数签名字符串的场景使用。

`abi.encodeWithSelector` 比 `encodeWithSignature` 更安全一些，因为它不需要手写完整函数签名字符串，但它仍然无法完全检查参数是否正确。

所以推荐顺序可以是：

```text
优先使用 abi.encodeCall
其次使用 abi.encodeWithSelector
最后才使用 abi.encodeWithSignature
```

## 十、总结

Solidity 中可以通过多种方式生成低级调用需要的 calldata。

三种常见方式分别是：

```text
abi.encodeWithSignature
abi.encodeWithSelector
abi.encodeCall
```text

它们最终都可以生成传给 `call` 的 `bytes` 数据。

区别在于编译器能帮你检查多少错误。

`abi.encodeWithSignature` 使用字符串形式的函数签名，写法直观，但最容易出错。即使函数签名写错，合约也可能正常编译。

`abi.encodeWithSelector` 使用接口函数的 selector，可以避免函数名拼写错误，但参数类型和参数数量仍然可能写错。

`abi.encodeCall` 是最安全的方式。它会检查函数是否存在，也会检查传入参数的类型和数量是否正确。

一句话总结：

```text
如果你只是想编码 calldata，三种方式都能做到；
如果你想减少错误，优先使用 abi.encodeCall。
```
