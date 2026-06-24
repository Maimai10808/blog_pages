# 从 Axios 到统一请求层：实际项目中的 Fetcher 应该怎么设计？

在前端项目里，很多人第一次封装请求时，想法都很简单：

```ts
axios.get("/api/user");
axios.post("/api/order", data);
```

这当然没错。Axios 本质上就是一个 HTTP 请求库，负责把请求发给后端，再把响应拿回来。

但在真实项目里，尤其是交易所、Web3、金融、电商、管理后台这类业务中，“发请求”往往不是全部。一个接口真正进入业务页面之前，通常还要经过很多统一规则：

```text
请求前：
- 设置 baseURL
- 设置 timeout
- 注入 token
- 注入语言 lang
- 生成 signature
- 生成 nonce
- 添加 timestamp
- 设置设备类型、内容类型

响应后：
- 解密响应数据
- 判断业务 code
- 处理登录过期
- 统一 toast 错误
- 抛出业务异常
- 解包 data 字段
- 支持文件上传和下载
```

所以在实际项目里，请求层不只是“封装 axios.post”，而是一个**请求生命周期管理器**。

这篇文章就结合一个实际项目里的 `createFetcher`，讲清楚一个成熟前端项目的统一请求层应该如何设计。

---

## 一、为什么不能到处直接写 axios？

最简单的请求代码可能是这样的：

```ts
const res = await axios.post("/swap/order/open", data);
return res.data;
```

如果只是一个 Demo，这样写没问题。

但真实项目里，一个下单接口可能还需要：

```text
- 带上用户 token
- 带上当前语言
- 对请求参数做签名
- 生成 nonce 防止重放
- 带上 timestamp
- 处理后端加密响应
- 判断 code 是否为 0
- 登录过期时跳转登录页
- 业务失败时统一 toast
- 最后只返回真正的 data
```

如果每个接口都手写这些逻辑，代码会变成这样：

```ts
const token = localStorage.getItem("TOKEN");
const lang = localStorage.getItem("LANGUAGE") ?? "en_us";

const res = await axios.post("/swap/order/open", data, {
  headers: {
    "access-auth-token": token,
    lang,
    signature: buildSignature(data),
    nonce: generateNonce(8),
    timestamp: Date.now().toString(),
  },
});

const decoded = decryptResponse(res.data, "/swap/order/open");

if (decoded.code === 4000) {
  localStorage.clear();
  window.location.href = "/login";
}

if (decoded.code !== 0) {
  toast.error(decoded.message);
  throw new Error(decoded.message);
}

return decoded.data;
```

一个接口这么写还能接受。
如果项目里有几十个、几百个接口，这种写法就会非常难维护。

所以统一请求层要解决的问题是：

> 把所有接口都需要遵守的通用规则，集中放到一个地方处理，让业务代码只关心业务本身。

---

## 二、统一请求层的职责边界

一个好的请求层，不是什么都管。

它应该管的是“所有接口共有的通用规则”，而不是某个页面自己的业务逻辑。

适合放请求层的内容包括：

| 能力               | 是否适合放请求层 | 原因                           |
| ------------------ | ---------------- | ------------------------------ |
| baseURL            | 适合             | 所有请求共享                   |
| timeout            | 适合             | 所有请求共享                   |
| token 注入         | 适合             | 鉴权通用逻辑                   |
| lang 注入          | 适合             | 多语言通用逻辑                 |
| signature          | 适合             | 请求安全通用逻辑               |
| nonce              | 适合             | 防重放通用逻辑                 |
| timestamp          | 适合             | 请求安全通用逻辑               |
| 响应解密           | 适合             | 响应进入业务前统一处理         |
| code != 0          | 适合             | 统一业务错误处理               |
| code = 4000 跳登录 | 适合             | 全局鉴权失效                   |
| toast.error        | 部分适合         | 通用错误可处理，特殊接口要静默 |
| 文件上传           | 适合             | 通用请求能力                   |
| 文件下载           | 适合             | 通用请求能力                   |

不适合放请求层的内容包括：

```text
- 下单成功后刷新持仓
- 撤单成功后刷新当前委托
- 余额不足时弹充值弹窗
- 某个页面的空状态展示
- 某个业务模块的特殊提示
```

这些属于业务层或页面层，不应该塞进请求层。

一句话概括：

> 请求层负责通用协议和通用规范，业务层负责具体业务动作。

---

## 三、用工厂函数创建一个 fetcher

这段代码使用的是工厂函数模式：

```ts
export function createFetcher(fetcherConfig: FetcherConfig): Fetcher {
  const instance = axios.create({
    baseURL: fetcherConfig.baseURL,
    timeout: fetcherConfig.timeout ?? 30_000,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      equipment: "PC",
    },
  });

  return {
    instance,
    get,
    post,
    put,
    del,
    blob,
    download,
    blobDownload,
    fileUpload,
  };
}
```

这样设计的好处是：不同环境可以创建不同 fetcher。

比如：

```ts
const fetcher = createFetcher({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL!,
});
```

如果以后项目里有多个服务，也可以创建多个实例：

```ts
const userFetcher = createFetcher({ baseURL: USER_API });
const marketFetcher = createFetcher({ baseURL: MARKET_API });
const adminFetcher = createFetcher({ baseURL: ADMIN_API });
```

它比全局直接使用 `axios` 更灵活。

---

## 四、第一步：创建 Axios 实例

统一请求层的第一步是创建一个 Axios instance。

```ts
const instance = axios.create({
  baseURL: fetcherConfig.baseURL,
  timeout: fetcherConfig.timeout ?? 30_000,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    equipment: "PC",
  },
});
```

这里做了几件事：

```text
baseURL：统一接口前缀
timeout：统一超时时间
Content-Type：默认请求体格式
equipment：告诉后端当前设备类型
```

业务代码以后不用每次都写完整 URL，也不用每次都设置默认 headers。

比如业务层只需要：

```ts
fetcher.post("/swap/order/open", data);
```

请求层会自动拼成：

```text
baseURL + /swap/order/open
```

这就是请求实例的价值。

---

## 五、请求拦截器：请求发出前统一补上下文

Axios 的 request interceptor 可以理解为：

> 请求真正发出去之前，统一经过的一道关卡。

代码里是这样写的：

```ts
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("TOKEN");
  const lang = localStorage.getItem("LANGUAGE") ?? "en_us";

  config.headers.set("lang", lang);
  config.headers.set("dev-encode-body", "true");

  if (token) {
    config.headers.set("access-auth-token", token);
  }

  const url = config.url ?? "";
  const needsSignature = !NO_AUTH_URLS.some((u) => url.includes(u));

  if (needsSignature) {
    const payload =
      (config.data as Record<string, unknown> | null) ??
      (config.params as Record<string, unknown> | null) ??
      null;

    config.headers.set("signature", buildSignature(payload));
    config.headers.set("nonce", generateNonce(8));
    config.headers.set("timestamp", Date.now().toString());
  }

  return config;
});
```

这段逻辑可以拆成四部分。

---

## 六、token 注入：统一处理用户身份

```ts
const token = localStorage.getItem("TOKEN");

if (token) {
  config.headers.set("access-auth-token", token);
}
```

用户登录后，前端通常会保存 token。后续访问需要登录的接口时，都要把 token 带给后端。

如果每个接口都手动加 token，很容易漏。

比如：

```ts
fetcher.post("/exchange/order/add", data);
fetcher.post("/swap/order/open", data);
fetcher.post("/uc/asset/wallet", data);
```

这些接口都可能需要身份信息。

所以 token 注入放在请求拦截器里最合适。

业务层只管调用接口，不用关心 token 怎么带。

---

## 七、lang 注入：统一处理多语言

```ts
const lang = localStorage.getItem("LANGUAGE") ?? "en_us";
config.headers.set("lang", lang);
```

交易所、Web3 产品通常面向多语言用户。后端可能根据 `lang` 返回不同语言的错误信息、枚举文案或配置数据。

如果每个接口都手动传语言字段，不仅重复，而且容易不一致。

所以语言信息也适合统一放到请求头里。

---

## 八、signature、nonce、timestamp：请求安全三件套

这部分是很多新手最疑惑的地方：

```ts
config.headers.set("signature", buildSignature(payload));
config.headers.set("nonce", generateNonce(8));
config.headers.set("timestamp", Date.now().toString());
```

为什么发个请求还要签名？

因为在交易所、金融、Web3 这类系统里，请求安全非常重要。尤其是下单、撤单、提币、划转、资产查询等接口，后端通常希望确认：

```text
这个请求是谁发的？
请求参数有没有被篡改？
这个请求是不是旧请求被重复发送？
这个请求是否在合理时间窗口内？
```

这三个字段大致可以这样理解。

### 1. signature

signature 是请求签名。

它通常由请求参数、密钥或某种约定规则计算出来，用来证明请求内容没有被篡改。

比如请求体是：

```ts
{
  symbol: "BTC/USDT",
  price: 65000,
  amount: 1
}
```

请求层会基于这个 payload 生成签名：

```ts
buildSignature(payload);
```

后端收到请求后，也会用同样规则算一次签名。如果前后不一致，说明请求可能被篡改。

### 2. nonce

nonce 是一次性随机数。

```ts
generateNonce(8);
```

它的作用通常是防止重放攻击。

所谓重放攻击，可以简单理解为：别人拿到你之前发过的请求，又重新发了一遍。

有了 nonce 后，后端可以记录某些随机数是否用过，或者结合 timestamp 判断请求是否有效。

### 3. timestamp

timestamp 是请求发出的时间。

```ts
Date.now().toString();
```

后端可以判断这个请求是不是太旧。

比如后端规定请求必须在 30 秒或 60 秒内有效。如果有人拿一个很久以前的请求重新发，后端可以拒绝。

这三个字段放在请求层，是因为它们不是某个页面独有逻辑，而是项目级安全规范。

---

## 九、NO_AUTH_URLS：不是所有接口都需要签名

代码里有一个白名单：

```ts
const NO_AUTH_URLS = ["/uc/login", "/mqtts/exchange/exchange-rate/getAllRate"];
```

然后判断：

```ts
const needsSignature = !NO_AUTH_URLS.some((u) => url.includes(u));
```

这说明不是所有接口都需要签名和 token。

比如登录接口：

```text
/uc/login
```

用户还没登录，当然还没有 token。
如果登录接口也强制注入 token 或签名，可能反而会导致请求异常。

所以统一请求层通常会保留一些白名单：

```text
登录接口
公开配置接口
汇率接口
行情公开接口
不需要鉴权的营销接口
```

请求层不是简单地“所有接口一刀切”，而是要支持例外规则。

---

## 十、响应拦截器：响应进入业务前统一处理

请求发出去之后，响应也要经过统一处理。

代码里使用 response interceptor：

```ts
instance.interceptors.response.use((response: AxiosResponse) => {
  const raw = response.data;
  const url = response.config?.url || "";
  const decoded = decryptResponse<ApiResponse>(raw, url);

  if (decoded !== null) {
    response.data = decoded;
  }

  const body = response.data as ApiResponse | null;

  if (body?.code === "4000" || body?.code === 4000) {
    const skipRedirect = NO_REDIRECT_ON_4000_URLS.some((u) => url.includes(u));

    if (!skipRedirect) {
      redirectToLogin();
    }

    return Promise.reject(new ApiError("Auth expired", 4000));
  }

  return response;
}, errorHandler);
```

这段主要做了两件事：

```text
1. 解密响应数据
2. 处理登录过期
```

---

## 十一、响应解密：让业务层拿到干净数据

```ts
const raw = response.data;
const decoded = decryptResponse<ApiResponse>(raw, url);

if (decoded !== null) {
  response.data = decoded;
}
```

这说明后端有些接口返回的是加密数据。

如果没有统一处理，业务层每个接口都要自己解密：

```ts
const raw = await axios.post("/api");
const decoded = decryptResponse(raw);
return decoded.data;
```

这显然不合理。

响应解密属于典型的响应预处理，适合放在 response interceptor 里。

这样业务层拿到的永远是解密后的正常对象。

---

## 十二、code = 4000：统一处理登录过期

```ts
if (body?.code === "4000" || body?.code === 4000) {
  const skipRedirect = NO_REDIRECT_ON_4000_URLS.some((u) => url.includes(u));

  if (!skipRedirect) {
    redirectToLogin();
  }

  return Promise.reject(new ApiError("Auth expired", 4000));
}
```

这里表示后端用 `4000` 作为鉴权过期的业务码。

登录过期是全局问题，不应该每个页面自己判断。

比如这些页面都可能遇到登录过期：

```text
资产页
订单页
现货交易页
合约交易页
C2C 页面
理财页面
跟单页面
```

如果每个页面都写一遍跳登录逻辑，项目会很乱。

所以请求层统一处理：

```text
发现 code=4000
清除本地登录信息
清除鉴权 cookie
跳转登录页
抛出 ApiError
```

这就是全局鉴权失效处理。

---

## 十三、为什么还需要 NO_REDIRECT_ON_4000_URLS？

代码里还有一个白名单：

```ts
const NO_REDIRECT_ON_4000_URLS = [
  "/newbusiness/NewCoinMemberCycleController/cycle-list",
  "/newbusiness/c2c/order/getOrderPage",
];
```

它的作用是：某些接口即使返回 4000，也不要强制跳登录。

为什么？

因为有些页面是公开页面，未登录也可以访问。
比如营销活动页、产品列表页、C2C 公开列表页。

这些页面调用接口时，如果用户没登录，后端可能返回 4000 或拿不到个性化数据。此时合理的行为是页面展示空态或未登录状态，而不是直接把用户踢到登录页。

所以请求层处理登录过期时，也要支持业务例外：

```text
真正的私有接口 4000：跳登录
公开页面接口 4000：不跳登录，让页面自己处理
```

这就是成熟项目里的细节。

---

## 十四、网络错误和 HTTP 错误处理

响应拦截器的第二个参数负责处理请求失败：

```ts
(error) => {
  if (error?.response?.status === 401) {
    redirectToLogin();
  }

  const raw = error?.response?.data;
  const url = error?.config?.url || "";
  const status = error?.response?.status as number | undefined;

  const decodedBody = raw
    ? decryptResponse<ApiResponse & SpringError>(raw, url)
    : null;

  if (decodedBody?.message) {
    error.message = decodedBody.message;
  }

  if (status === 401) {
    redirectToLogin();
  }

  if (typeof window !== "undefined" && status && status >= 400) {
    console.error("[fetcher] HTTP error", {
      status,
      url,
      method: error?.config?.method,
      params: error?.config?.params,
      data: error?.config?.data,
      rawResponse: typeof raw === "string" ? raw.slice(0, 800) : raw,
      decodedBody,
    });
  }

  if (typeof window !== "undefined" && error?.message) {
    const silent = SILENT_URLS.some((u) => url.includes(u));
    if (!silent) {
      toast.error(error.message);
    }
  }

  return Promise.reject(error);
};
```

这部分主要处理：

```text
HTTP 401
HTTP 4xx / 5xx
后端加密错误体
错误日志
toast 提示
```

这里有一个很重要的工程经验：

> 不要因为所有 5xx 都像鉴权错误，就把用户踢到登录页。

代码里的注释也说明了这一点：历史经验表明，后端未捕获异常可能会返回 Spring 默认错误体，如果前端误判，就会导致用户被错误清登录态。

所以这里选择：

```text
标准 HTTP 401：跳登录
业务 code=4000：跳登录
普通 5xx：打印日志，不清登录态
```

这比简单粗暴地“所有错误都跳登录”要稳很多。

---

## 十五、SILENT_URLS：控制全局 toast 噪音

代码里有：

```ts
const SILENT_URLS = ["/market/", "/swap/symbol-thumb", "/exchange/favor/find"];
```

它的作用是：某些接口失败时不要自动 toast。

比如行情接口、收藏状态接口、高频轮询接口，如果偶尔失败就弹 toast，用户体验会很差。

想象一下行情接口每 2 秒请求一次，如果网络抖动，页面一直弹：

```text
请求失败
请求失败
请求失败
```

这会非常烦。

所以请求层支持静默接口：

```ts
const silent = SILENT_URLS.some((u) => url.includes(u));

if (!silent) {
  toast.error(error.message);
}
```

这说明统一错误处理也要有边界。

通用错误可以 toast，但高频接口、弱依赖接口、业务自处理接口应该允许静默。

---

## 十六、unwrap：把后端响应解包成业务数据

很多后端接口会统一返回这种结构：

```ts
export interface ApiResponse<T = unknown> {
  code: number | string;
  message: string;
  data: T;
}
```

也就是：

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "name": "BTC/USDT"
  }
}
```

业务层真正想要的是 `data`。

所以 fetcher 提供了 `unwrap`：

```ts
function unwrap<T>(res: AxiosResponse<ApiResponse<T>>): T {
  const body = res.data;

  if (Array.isArray(body)) {
    return body as unknown as T;
  }

  if (body === null || body === undefined || typeof body !== "object") {
    return body as unknown as T;
  }

  if (!("code" in body)) {
    return body as unknown as T;
  }

  if (body.code !== 0 && body.code !== "0") {
    if (typeof window !== "undefined") {
      const url = (res.config?.url as string) || "";
      const silent = SILENT_URLS.some((u) => url.includes(u));

      if (!silent) {
        toast.error(body.message || "请求失败");
      }
    }

    throw new ApiError(body.message || "请求失败", body.code, body.data);
  }

  return body.data;
}
```

这段代码做了几件事：

```text
如果返回的是数组，直接返回数组
如果返回的不是标准包装对象，原样返回
如果没有 code 字段，原样返回
如果 code != 0，抛出 ApiError
如果 code = 0，返回 body.data
```

为什么要兼容数组和未包装对象？

因为真实项目里后端接口经常不完全统一。比如行情接口可能直接返回数组，没有标准的 `code/data` 包装。

所以请求层不能太理想化，要兼容历史接口和特殊接口。

---

## 十七、ApiError：让业务错误变成真正的异常

代码里定义了：

```ts
export class ApiError extends Error {
  code: number | string;
  data?: unknown;

  constructor(message: string, code: number | string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.data = data;
  }
}
```

为什么要封装 ApiError？

因为业务失败不一定是 HTTP 失败。

比如 HTTP 状态码是 200，但后端返回：

```json
{
  "code": 10001,
  "message": "余额不足",
  "data": null
}
```

从 Axios 看，请求成功。
从业务看，下单失败。

所以 `unwrap` 会把它变成异常：

```ts
throw new ApiError(body.message || "请求失败", body.code, body.data);
```

这样 React Query 的 `useMutation` 就可以进入 `onError`：

```ts
const mutation = useMutation({
  mutationFn: placeOrder,
  onSuccess() {
    toast.success("下单成功");
  },
  onError(error) {
    // ApiError 会走这里
  },
});
```

这让业务错误和网络错误都能进入统一的错误处理链路。

---

## 十八、对外暴露统一方法：get / post / put / del

最后 fetcher 返回了一组方法：

```ts
return {
  instance,

  get<T>(url: string, params?: any, config?: AxiosRequestConfig) {
    return instance
      .get<ApiResponse<T>>(url, { params, ...config })
      .then(unwrap<T>);
  },

  post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return instance.post<ApiResponse<T>>(url, data, config).then(unwrap<T>);
  },

  put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return instance.put<ApiResponse<T>>(url, data, config).then(unwrap<T>);
  },

  del<T>(url: string, params?: any, config?: AxiosRequestConfig) {
    return instance
      .delete<ApiResponse<T>>(url, { params, ...config })
      .then(unwrap<T>);
  },
};
```

业务层以后可以这样写：

```ts
export const getSpotThumb = () =>
  fetcher.post<MarketThumb[]>("/mqtts/exchange/market/symbol-thumb", {});
```

或者：

```ts
export const openPosition = (data: OpenPositionPayload) =>
  fetcher.post<OpenPositionResult>("/swap/order/open", data);
```

这样业务 API 文件只关心：

```text
接口路径
请求参数
返回类型
```

而不关心：

```text
token 怎么带
签名怎么加
响应怎么解密
错误怎么处理
data 怎么解包
```

这就是统一 fetcher 的最终目的。

---

## 十九、为什么还要提供 blob / download / fileUpload？

真实项目里不只有 JSON 接口。

还会有：

```text
文件上传
头像上传
KYC 材料上传
订单报表下载
资金流水导出
图片预览
Excel 导出
PDF 下载
```

所以 fetcher 里还封装了：

```ts
blob(url, params);
download(url, filename, params);
blobDownload(url, filename, params);
fileUpload(url, file, extraFields, config);
```

### blob

```ts
blob(url: string, params?: any) {
  return instance
    .get<Blob>(url, { params, responseType: "blob" })
    .then((res) => res.data);
}
```

用于把二进制文件读到内存，比如图片预览、文件处理。

### download

```ts
async download(url: string, filename: string, params?: any) {
  const fullUrl = new URL(url, fetcherConfig.baseURL);
  const a = document.createElement("a");
  a.href = fullUrl.toString();
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
```

它通过 `<a>` 标签触发下载，适合大文件，避免把文件全部读入内存。

### blobDownload

```ts
async blobDownload(url: string, filename: string, params?: any) {
  const blob = await this.blob(url, params);
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
```

它先读取 Blob，再通过临时 URL 下载，适合报表导出这类场景。

### fileUpload

```ts
fileUpload<T>(
  url: string,
  file: File | Blob,
  extraFields?: Record<string, string>,
  config?: AxiosRequestConfig,
) {
  const form = new FormData();
  form.append("file", file);

  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      form.append(k, v);
    }
  }

  return instance
    .post<ApiResponse<T>>(url, form, {
      ...config,
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then(unwrap<T>);
}
```

它统一了文件上传的 FormData 处理。

这些能力看起来和“请求”不一样，但本质上仍然是 HTTP 请求的不同形态。

---

## 二十、请求层如何和 React Query 配合？

统一 fetcher 通常不会直接管理缓存。缓存应该交给 React Query 这类服务端状态库。

请求层负责：

```text
发请求
加 token
加签名
解密
解包
抛错
```

React Query 负责：

```text
缓存
loading
error
refetch
invalidate
retry
staleTime
```

例如：

```ts
export const getSwapPositions = (params: { symbol: string }) =>
  fetcher.post<SwapPosition[]>("/swap/order/current", params);
```

在组件里：

```ts
const { data: positions = [], isLoading } = useQuery({
  queryKey: ["swapPositions", symbol],
  queryFn: () => getSwapPositions({ symbol }),
  enabled: isLogin && !!symbol,
});
```

下单成功后：

```ts
const mutation = useMutation({
  mutationFn: openPosition,
  onSuccess() {
    queryClient.invalidateQueries({ queryKey: ["swapPositions"] });
    queryClient.invalidateQueries({ queryKey: ["swapCurrentOrders"] });
    queryClient.invalidateQueries({ queryKey: ["swapWallet"] });
  },
});
```

这就是合理分工：

```text
fetcher 负责请求链路
React Query 负责服务端状态
业务组件负责交互逻辑
```

不要把缓存逻辑塞进 fetcher，也不要让组件到处处理 token 和签名。

---

## 二十一、一个成熟请求层的设计原则

总结一下，实际项目中设计请求层，可以遵守这些原则。

### 1. 统一入口

不要在项目里到处直接用 `axios`。

统一使用：

```ts
fetcher.get(...)
fetcher.post(...)
```

这样后续要改 token、签名、解密、错误处理，只需要改一个地方。

### 2. 请求前处理公共上下文

比如：

```text
token
language
device
signature
nonce
timestamp
```

都适合放 request interceptor。

### 3. 响应后统一清洗数据

比如：

```text
解密
解包 data
识别业务错误
识别登录过期
```

都适合放 response interceptor 或 unwrap。

### 4. 业务异常要抛出

不要让业务层每次都判断 `code !== 0`。

统一抛出 `ApiError`，让 `try/catch` 或 React Query `onError` 处理。

### 5. 支持白名单和静默接口

真实项目一定有例外。

比如：

```text
登录接口不需要 token
公开接口不需要跳登录
行情接口失败不需要 toast
```

所以请求层要支持配置，而不是一刀切。

### 6. 不要塞入具体业务逻辑

请求层不要知道：

```text
下单成功刷新哪些表
撤单后要不要弹确认框
余额不足是否打开充值弹窗
```

这些应该留在业务层。

---

## 二十二、这段代码在简历里怎么写？

不要写得太简单：

```text
封装 Axios 请求
```

这句话太弱了，看不出复杂度。

可以写成：

```text
封装统一 Axios fetcher，基于 request / response interceptor 集中处理 token 注入、请求签名、nonce、timestamp、响应解密、业务错误、登录过期跳转、文件上传下载和响应数据解包，统一交易、资产和行情接口调用规范。
```

如果要短一点，可以写：

```text
设计统一请求层，基于 Axios interceptor 实现鉴权注入、请求签名、响应解密、业务错误处理与登录过期跳转，提升接口调用一致性和交易链路稳定性。
```

这个表达会比“封装 axios”更能体现工程价值。

---

## 二十三、总结

Axios 本身只是一个 HTTP 请求库。

它负责：

```text
把请求发出去
把响应拿回来
```

但真实项目里的统一请求层要负责的是完整请求生命周期：

```text
请求前：
补 token、lang、signature、nonce、timestamp

请求中：
统一 baseURL、timeout、headers、上传下载格式

响应后：
解密、解包 data、判断 code、处理 4000、抛出 ApiError、toast 错误

业务层：
只拿到干净的数据，专注业务逻辑
```

所以统一请求层不是“过度封装”，而是在复杂项目中把重复规则、项目规范、安全要求和错误处理集中治理。

一句话总结：

**Axios 是发请求的工具；Fetcher 是项目级请求规范的承载层。一个成熟的请求层，不只是把请求发出去，而是让所有接口以统一、安全、可维护的方式进入业务系统。**
