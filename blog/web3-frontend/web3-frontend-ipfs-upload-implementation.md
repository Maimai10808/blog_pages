# Web3 前端如何落地 IPFS 上传：从 Token Logo 到 Metadata JSON

在 Token、NFT、Meme Coin 这类 Web3 项目中，很多人一开始会把 IPFS 上传理解成一个普通的图片上传功能：用户选择一张 Logo，前端上传成功后拿到一个图片地址。

但真正放到 Token 创建流程里看，IPFS 上传并不是一个孤立的上传模块，而是链上资产创建之前非常关键的一步。

因为链上并不适合直接存储图片、项目介绍、官网链接、社交媒体地址这类内容。链上更适合保存关键状态和索引信息，例如 Token 地址、创建者、权限关系、交易状态等。至于 Logo、描述、外部链接这些展示信息，通常会放在链下存储中，再通过一个 URI 和链上对象关联起来。

在实际项目里，比较常见的流程是：

```text
用户填写 Token 信息
→ 上传 Token Logo 到 IPFS
→ 获得图片 CID 或访问 URL
→ 组装 metadata JSON
→ 上传 metadata JSON 到 IPFS
→ 获得 metadata URI
→ 将 metadata URI 传入链上创建交易
```

这篇文章就从前端工程角度，聊一聊 Web3 项目里 Pinata / IPFS 上传是如何落地的，以及它如何和 Token 创建流程串起来。

---

## 1. 为什么 Token 创建需要 IPFS

在传统 Web2 项目中，用户上传图片后，通常会把文件存到对象存储里，比如 OSS、S3 或自己的文件服务器。数据库里保存图片 URL，页面需要展示时再读取。

Web3 项目也可以这么做，但对于 Token、NFT、Meme Coin 这类链上资产来说，更多时候会选择 IPFS。

原因主要有三个。

第一，链上不适合存大文件。
图片、描述、社交链接这些内容如果直接写进链上，不仅成本高，也不利于维护和展示。

第二，链上资产需要一个相对稳定的内容入口。
Token 创建完成后，钱包、浏览器、交易页面、索引服务都可能需要读取它的 Logo 和描述信息。如果这些内容只存在前端临时状态里，其他系统就无法复用。

第三，IPFS 是内容寻址。
IPFS 会根据内容生成 CID。也就是说，CID 不是随便分配的文件名，而是和内容本身相关。只要内容不变，对应的 CID 就可以作为这份内容的标识。

所以，在 Web3 Token 创建流程中，前端真正要做的不是“上传一张图片”这么简单，而是要准备一份可被链上对象引用、可被外部系统访问的 metadata。

---

## 2. Token Logo 和 Metadata 的关系

很多人第一次做 Token 创建时，会有一个疑问：既然 Token 需要 Logo，那我把 Logo 上传到 IPFS 不就行了吗？为什么还要上传 metadata JSON？

原因是，Logo 只是 Token 展示信息的一部分。

一个完整的 Token metadata 通常至少包括：

```json
{
  "name": "Demo Token",
  "symbol": "DEMO",
  "description": "A meme token created by users.",
  "image": "https://gateway.pinata.cloud/ipfs/xxx"
}
```

如果项目复杂一点，还可能包括：

```json
{
  "name": "Demo Token",
  "symbol": "DEMO",
  "description": "A meme token created by users.",
  "image": "https://gateway.pinata.cloud/ipfs/xxx",
  "twitter": "https://x.com/demo",
  "telegram": "https://t.me/demo",
  "website": "https://demo.xyz",
  "createdOn": "Demo Platform"
}
```

这里的 `image` 字段指向前面上传好的 Token Logo。也就是说，metadata JSON 本身会引用图片地址。

所以流程必须是：

```text
先上传图片
→ 得到图片 URL
→ 把图片 URL 写入 metadata.image
→ 再上传 metadata JSON
→ 得到 metadata URI
```

最终传给链上创建流程的，通常不是单独的图片 URL，而是 metadata URI。

图片 URL 解决的是“Logo 在哪里”；
metadata URI 解决的是“这个 Token 的完整展示信息在哪里”。

---

## 3. Pinata 在这里做了什么

IPFS 本身是一套去中心化内容寻址网络，但在前端工程中，直接处理 IPFS 节点和内容固定并不方便。因此很多项目会使用 Pinata 这样的服务。

Pinata 的作用可以简单理解为：

```text
帮你把文件上传到 IPFS
帮你固定内容
返回 CID
提供可访问的 Gateway URL
```

对于前端来说，Pinata 简化了很多底层细节。我们不需要自己维护 IPFS 节点，只需要通过 SDK 或 API 完成上传。

一个常见的上传封装大概是这样：

```ts
export async function uploadFileToIpfs(file: File) {
  const result = await pinata.upload.file(file);

  return {
    cid: result.IpfsHash,
    url: `${gateway}/ipfs/${result.IpfsHash}`,
  };
}
```

上传 JSON 的思路也类似：

```ts
export async function uploadJsonToIpfs(metadata: object) {
  const result = await pinata.upload.json(metadata);

  return {
    cid: result.IpfsHash,
    url: `${gateway}/ipfs/${result.IpfsHash}`,
  };
}
```

实际项目里的 SDK 写法可能会因为 Pinata 版本不同而略有差异，但核心逻辑基本一致：

```text
上传内容
→ 获取 CID
→ 转换成可访问的网关 URL
→ 返回给业务流程使用
```

这里要注意一点：CID 和 Gateway URL 不是同一个东西。

CID 是内容标识，例如：

```text
bafy...
```

Gateway URL 是 HTTP 访问地址，例如：

```text
https://gateway.pinata.cloud/ipfs/bafy...
```

同一个 CID 可以通过不同 Gateway 访问。前端页面展示时一般更喜欢用 Gateway URL，因为浏览器可以直接打开；链上或 metadata 中则可能根据项目约定保存 `ipfs://CID` 或 `https://gateway/ipfs/CID`。

---

## 4. 为什么要封装上传 Hook

在 React 项目中，IPFS 上传不建议直接写在表单组件里。

因为一个创建表单本身已经承担了很多职责：

```text
表单输入
字段校验
图片预览
上传状态
错误提示
链上交易
后端记录
按钮 loading
```

如果再把 Pinata SDK 调用、JWT 获取、CID 转换、metadata 组装全部塞进表单组件，组件会很快变得臃肿。

更合理的方式是封装一个上传 Hook，例如：

```ts
const {
  uploadFileToIpfs,
  uploadMetadataToIpfs,
  isUploading,
  error,
  resetState,
} = useIpfsUpload();
```

这样表单组件只需要关心业务动作：

```text
用户选择图片
→ 调用 uploadFileToIpfs
→ 拿到图片 URL
→ 表单展示预览
```

提交时再调用：

```text
组装 name / symbol / description / image
→ uploadMetadataToIpfs
→ 拿到 metadata URL
→ 发起 Token 创建
```

上传 Hook 的价值不只是“代码更好看”，而是把上传流程从 UI 组件中抽离出来，让文件上传、metadata 上传、错误状态、loading 状态有一个统一入口。

一个简化版 Hook 可以这样理解：

```ts
export function useIpfsUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  async function uploadFileToIpfs(file: File) {
    try {
      setIsUploading(true);
      setError(null);

      const result = await uploadFile(file);
      return result.url;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadMetadataToIpfs(metadata: object) {
    try {
      setIsUploading(true);
      setError(null);

      const result = await uploadJson(metadata);
      return result.url;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }

  return {
    uploadFileToIpfs,
    uploadMetadataToIpfs,
    isUploading,
    error,
  };
}
```

这样做以后，页面层不会直接依赖 Pinata SDK，后续如果要换成其他 IPFS 服务，也更容易调整。

---

## 5. 前后端边界：JWT 不能直接写在前端

IPFS 上传模块里最容易被忽视的问题，是密钥安全。

Pinata JWT 属于敏感凭证。如果把主 JWT 直接写在前端代码里，或者放到 `NEXT_PUBLIC_*` 环境变量中，它就会被打包进浏览器。任何人打开开发者工具，都可能拿到这个 JWT。

这会带来很明显的风险：

```text
别人可以盗用你的 Pinata 上传额度
别人可以用你的账号上传垃圾文件
你的项目可能被滥用甚至产生额外成本
```

因此，更合理的做法是：

```text
主 JWT 放在服务端环境变量中
前端请求自己的 API Route
服务端生成受限的临时凭证
前端用临时凭证完成上传
```

在 Next.js 项目里，可以通过 API Route 做一层中转：

```ts
export async function GET() {
  const temporaryJwt = await createTemporaryPinataKey({
    permissions: {
      endpoints: {
        pinning: {
          pinFileToIPFS: true,
          pinJSONToIPFS: true,
        },
      },
    },
    maxUses: 2,
  });

  return Response.json({
    jwt: temporaryJwt,
  });
}
```

这段代码只是示意。核心思想是：前端不要直接持有主密钥，而是拿一个权限更小、使用次数有限的临时凭证。

比如在 Token 创建场景中，一个临时凭证最多可能只需要使用两次：

```text
第一次：上传 Logo 图片
第二次：上传 metadata JSON
```

这样即使临时凭证被截获，风险也比暴露主 JWT 小得多。

当然，这还不是终点。生产环境里最好继续加上：

```text
用户登录校验
接口频率限制
文件大小限制
文件类型限制
上传记录审计
业务 ID 绑定
```

也就是说，API Route 不是单纯为了“拿 key”，而是在前端和第三方上传服务之间建立安全边界。

---

## 6. Create 表单里的上传流程应该怎么组织

在 Token 创建页面中，上传流程通常会分成两个阶段。

第一个阶段是用户选择 Logo 后立即上传，主要用于预览和提前准备图片地址。

```text
用户选择文件
→ 校验文件类型和大小
→ 上传到 IPFS
→ 拿到 image URL
→ 展示图片预览
→ 保存到表单状态
```

第二个阶段是用户提交表单时上传 metadata。

```text
读取 name / symbol / description / social links
→ 读取 image URL
→ 组装 metadata JSON
→ 上传 metadata
→ 拿到 metadata URL
→ 继续发起链上创建交易
```

在代码中，创建流程大概可以抽象成这样：

```ts
async function handleCreateToken() {
  if (!form.name || !form.symbol || !form.logoUrl) {
    throw new Error("Please complete token information");
  }

  const metadata = {
    name: form.name,
    symbol: form.symbol,
    description: form.description,
    image: form.logoUrl,
    twitter: form.twitter,
    telegram: form.telegram,
    website: form.website,
  };

  const metadataUrl = await uploadMetadataToIpfs(metadata);

  const txHash = await createToken({
    name: form.name,
    symbol: form.symbol,
    metadataUri: metadataUrl,
  });

  await saveTokenRecord({
    txHash,
    metadataUri: metadataUrl,
  });
}
```

这里有一个工程细节很重要：上传成功不代表创建成功。

IPFS 上传只是链下资源准备。后面还要经历链上交易、交易确认、后端记录保存等步骤。

所以 UI 状态最好不要只设计一个 `success`，而应该区分：

```text
Logo 上传中
Logo 上传成功
metadata 上传中
链上交易确认中
后端记录保存中
创建完成
```

这样用户体验会更清晰，排查问题也更方便。

---

## 7. Metadata URL 如何接入链上创建

Token 创建时，链上通常不会保存完整 JSON，更不会保存图片文件。更常见的是保存一个 URI。

这个 URI 指向 IPFS 上的 metadata JSON。

链上 Token 和链下内容之间的关系可以理解为：

```text
链上 Token
→ 保存 metadata URI
→ 外部系统读取 metadata
→ 根据 image 字段展示 Logo
→ 根据 name / symbol / description 展示基础信息
```

对于 Solana Token Metadata 来说，metadata URI 是非常关键的字段。钱包、浏览器、交易页面或索引服务会通过这个 URI 去读取 Token 展示信息。

对于 EVM 业务合约来说，有些项目也会把 metadata URI 或 tokenURI 作为创建参数传入合约；也有些项目会把它先保存到后端，再由业务系统统一管理。

不管是哪种方式，metadata URL 的作用都很明确：

> 它是链上资产和链下展示内容之间的桥。

如果没有这个 URI，链上可能只知道有一个 Token 被创建了，但外部系统并不知道它的 Logo、描述、官网和社交链接是什么。

---

## 8. IPFS 上传成功，不等于 Token 创建成功

在这个流程里，有一个特别容易踩的坑：把 IPFS 上传成功当成 Token 创建成功。

实际上，完整流程至少有这些状态：

```text
图片上传成功
→ metadata 上传成功
→ 链上交易已提交
→ 链上交易已确认
→ 后端业务记录已保存
```

任意一步失败，最终业务都没有真正完成。

比如：

图片上传成功，但 metadata 上传失败；
metadata 上传成功，但用户拒绝钱包交易；
链上交易成功，但后端记录保存失败；
后端记录保存成功，但前端没有及时刷新状态。

所以前端需要把这些阶段拆开处理。

一个更稳妥的状态流可以是：

```text
uploading_logo
→ logo_uploaded
→ uploading_metadata
→ metadata_uploaded
→ creating_onchain
→ confirming_transaction
→ saving_record
→ completed
```

这样不仅方便 UI 展示，也方便后续排查问题。

如果项目对资源管理要求较高，还可以进一步考虑：当 metadata 已经上传但链上创建失败时，是否需要记录“未完成创建”的资源，后续做清理或复用。

---

## 9. 实际开发中容易踩的几个坑

### 9.1 把主 JWT 暴露到浏览器

这是最常见也最危险的问题。只要变量以 `NEXT_PUBLIC_` 形式暴露，前端构建后就可能被用户看到。主 JWT 应该只存在服务端。

### 9.2 只上传图片，不上传 metadata

Token 创建一般需要完整 metadata，而不是单独图片地址。图片地址只是 metadata 的一个字段。

### 9.3 CID 和 Gateway URL 命名混乱

很多代码里会把变量命名为 `cid`，但实际保存的是 Gateway URL。建议区分：

```ts
type IpfsUploadResult = {
  cid: string;
  gatewayUrl: string;
  ipfsUri: string;
};
```

这样更清楚：

```text
cid：内容标识
gatewayUrl：浏览器访问地址
ipfsUri：链上或 metadata 中可能使用的 URI
```

### 9.4 重复上传 Logo

有些项目会在用户选择图片时上传一次，用于预览；提交时又重新上传一次，用于 metadata。这样虽然能跑通，但会浪费上传次数和时间。

更好的方式是复用第一次上传得到的图片 URL：

```text
选择图片时上传 Logo
→ 保存 imageUrl
→ 提交时直接写入 metadata.image
```

除非用户重新选择图片，否则不需要重复上传同一文件。

### 9.5 没有限制文件类型和大小

前端至少应该限制图片类型和大小，例如只允许 PNG、JPG、WEBP，并限制最大体积。服务端也应该再次校验，不能只依赖前端。

### 9.6 metadata 字段不统一

不同展示端通常依赖固定字段解析 Token 信息。建议维护一个统一的 metadata schema，避免一会儿叫 `image`，一会儿叫 `logo`，一会儿叫 `tokenLogo`。

---

## 10. 我比较推荐的模块拆分

如果从零设计一个 IPFS 上传模块，我会这样拆：

```text
utils/
  pinata.ts

hooks/
  useIpfsUpload.ts

app/api/
  ipfs-key/route.ts

features/create-token/
  CreateForm.tsx
  useCreateToken.ts
  metadata.ts
```

各层职责可以这样划分。

`pinata.ts` 只负责 Pinata SDK 初始化和底层上传。
`useIpfsUpload.ts` 负责 React 状态管理和上传动作封装。
`api/ipfs-key` 负责生成临时凭证，不暴露主 JWT。
`metadata.ts` 负责统一组装 metadata schema。
`CreateForm.tsx` 负责表单输入和用户交互。
`useCreateToken.ts` 负责把上传、链上交易、后端记录串起来。

这样拆分后，上传逻辑不会散落在表单组件里，metadata 字段也更容易统一维护。

例如可以单独写一个 metadata 构造函数：

```ts
export function buildTokenMetadata(values: {
  name: string;
  symbol: string;
  description?: string;
  image: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}) {
  return {
    name: values.name,
    symbol: values.symbol,
    description: values.description ?? "",
    image: values.image,
    twitter: values.twitter ?? "",
    telegram: values.telegram ?? "",
    website: values.website ?? "",
  };
}
```

这样后续如果 metadata 字段要调整，只需要改一个地方，而不是到处找表单和上传代码。

---

## 11. 面试时可以怎么讲

如果面试中被问到：“你们项目里的 IPFS 上传是怎么做的？”

可以这样回答：

> 这个项目里 IPFS 主要用于 Token 创建前的链下资源准备。用户在创建表单里选择 Logo 后，前端会先通过上传 Hook 调用 Pinata，把图片上传到 IPFS，拿到图片的 CID 或 Gateway URL。然后前端会把 Token 的 name、symbol、description、image 以及社交链接组装成 metadata JSON，再上传到 IPFS，得到最终的 metadata URI。链上创建 Token 时，不会直接存图片，而是把这个 metadata URI 作为参数传入创建流程。这样钱包、浏览器和业务页面都可以通过 URI 读取 Token 的 Logo 和描述信息。

如果面试官继续问：“前后端边界在哪里？”

可以这样回答：

> 前端负责文件选择、上传触发、loading 和错误状态，以及把 metadata URL 接入创建流程。后端主要负责保存 Pinata 主 JWT，并通过 API Route 提供权限受限、使用次数有限的临时凭证，避免把敏感密钥直接暴露到浏览器。生产环境还可以在后端增加登录校验、频率限制、文件大小限制和上传审计。

如果面试官问：“为什么要先上传图片，再上传 metadata？”

可以这样回答：

> 因为 metadata 里的 image 字段需要引用图片地址，而图片 CID 或 URL 只有上传完成后才能拿到。所以流程必须先上传 Logo，再把返回的图片地址写入 metadata，最后上传 metadata JSON。链上最终使用的是 metadata URI，而不是单独的图片 URL。

---

## 12. 总结

Pinata / IPFS 在 Web3 前端里不是一个普通的图片上传工具，而是链上资产创建流程中的链下数据准备层。

一个比较完整的 Token 创建上传链路是：

```text
选择 Logo
→ 上传图片到 IPFS
→ 获得 image URL
→ 组装 metadata JSON
→ 上传 metadata 到 IPFS
→ 获得 metadata URI
→ 发起链上创建交易
→ 保存后端业务记录
→ 刷新 UI
```

这里最关键的不是“怎么调用上传 API”，而是理解几个边界：

第一，链上通常保存 URI，不保存图片本体。
第二，Token Logo 只是 metadata 的一部分。
第三，Pinata 主 JWT 不能暴露在前端。
第四，IPFS 上传成功不等于 Token 创建成功。
第五，metadata schema 要统一，否则后续展示端会很难解析。

当你能把这条流程讲清楚，说明你理解的就不只是“上传图片”，而是 Web3 前端如何把链下资源、链上交易和业务系统真正串起来。
