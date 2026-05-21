# React 文件上传不只是 input type=file：从状态建模、上传进度到工程化封装

文件上传在 React 里看起来很简单：写一个 `<input type="file" />`，拿到文件，然后用 `FormData` 发给后端。很多教程到这里就结束了。

但在真实项目里，文件上传通常不会这么简单。你要处理文件选择、文件信息展示、上传状态、进度条、错误提示、重新上传、取消上传、接口封装、表单联动、权限校验、业务回调，甚至还要和任务系统、内容管理、图片审核、对象存储直传结合起来。

所以，文件上传的重点不是“如何拿到 `File` 对象”，而是如何把上传链路拆成清晰、可维护、可复用的模块。

下面我们从最简单写法开始，再逐步整理成更接近真实项目的实现。

---

## 1. 文件上传解决什么问题

在前端业务里，文件上传常见于这些场景：

- 用户头像上传。
- 商品图片上传。
- 后台管理导入 Excel。
- 内容平台上传封面图。
- 工单系统上传附件。
- AI 平台上传图片生成任务。
- 数据平台上传 CSV。
- 合同系统上传 PDF。

这些场景表面上都是“上传文件”，但实际链路通常包括：

```txt
选择文件
  -> 校验文件
  -> 展示文件信息
  -> 构造 FormData
  -> 调用上传接口
  -> 展示上传进度
  -> 处理上传成功
  -> 处理上传失败
  -> 允许用户重新上传
  -> 上传成功后同步业务数据
```

其中有一部分是浏览器原生能力，比如 `File`、`FileList`、`FormData`。另一部分是项目工程能力，比如请求封装、状态建模、错误处理、组件边界、业务回调。

文件上传适合用独立组件或业务 hook 封装，不适合直接散落在页面组件里。页面应该只关心“用户上传了什么”和“上传成功后做什么”，不应该把 `FormData`、`axios.post`、进度计算、错误状态全部写在 JSX 旁边。

---

## 2. 最简单的写法是什么

最小实现可以非常短：

```tsx
import {useState, type ChangeEvent} from 'react';

export function SimpleUploader() {
  const [file, setFile] = useState<File | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
  }

  async function handleUpload() {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
  }

  return (
    <div>
      <input type="file" onChange={handleChange} />
      {file && (
        <div>
          <p>文件名：{file.name}</p>
          <p>文件大小：{Math.round(file.size / 1024)} KB</p>
          <p>文件类型：{file.type}</p>
          <button onClick={handleUpload}>上传</button>
        </div>
      )}
    </div>
  );
}
```

这段代码能跑。它已经完成了文件选择、文件信息展示、`FormData` 构造和上传请求。

但这只是演示级代码。真实项目里，如果继续这样写，很快会失控。

---

## 3. 简单写法在真实项目中的问题

第一个问题是状态太粗糙。上面的代码只有一个 `file`，但上传链路至少还需要 `idle`、`uploading`、`success`、`error` 等状态。如果状态不明确，按钮禁用、错误提示、进度展示、重新上传逻辑都会散在组件里。

第二个问题是缺少上传进度。用户上传大图、视频、PDF、Excel 时，如果页面没有进度反馈，很容易被认为是卡死。原生 `fetch` 在浏览器端并不方便拿到上传进度，所以很多项目会选择 Axios，因为它提供了 `onUploadProgress`。

第三个问题是缺少错误处理。接口 413、网络中断、文件格式不合法、登录过期、服务端业务错误，都不能只用一个 `catch` 混过去。至少要区分“客户端校验失败”“网络失败”“服务端拒绝”“用户取消”。

第四个问题是组件承担了太多职责。文件校验、上传请求、状态变化、进度计算、UI 渲染全部混在一个组件里，后面如果要复用到头像上传、附件上传、批量导入，就只能复制粘贴。

第五个问题是没有生命周期控制。用户正在上传时切换页面、重复点击上传、选择新文件覆盖旧文件、上传中清空文件，这些都可能导致状态错乱。真实项目里至少需要控制重复提交，复杂一点还需要取消上传。

---

## 4. 推荐的项目落地结构

对于单文件上传，不需要设计很大的目录。重点是把“上传请求”“上传状态 hook”“业务组件”拆开。

```txt
src/
  features/
    file-upload/
      types.ts
      uploadApi.ts
      useFileUpload.ts
      components/
        FileUploader.tsx
```

`types.ts` 放上传状态、上传结果、配置项类型。状态模型放在这里，可以避免组件里出现一堆魔法字符串。

`uploadApi.ts` 只负责请求。它不关心 React，不关心按钮，不关心 UI，只接收 `File` 和进度回调，然后返回上传结果。

`useFileUpload.ts` 是核心业务 hook。它负责管理文件、状态、进度、错误、上传、重置。组件消费它即可。

`FileUploader.tsx` 是展示层。它只负责渲染 input、文件信息、按钮、进度条和错误提示。

这个结构不复杂，但边界清楚。后面要扩展文件校验、取消上传、图片预览、多文件上传，都有明确位置。

---

## 5. 推荐写法一：抽离类型和请求逻辑

先定义状态类型。这里不建议用多个 boolean，比如 `isUploading`、`isSuccess`、`isError`。多个 boolean 很容易出现互斥状态不一致，例如 `isUploading=true` 同时 `isError=true`。

更推荐使用联合类型表示状态。

```ts
// src/features/file-upload/types.ts
export type UploadStatus = 'idle' | 'ready' | 'uploading' | 'success' | 'error';

export type UploadResult = {
  url: string;
  filename: string;
};

export type UploadError = {
  message: string;
  code?: string;
};

export type UploadProgressHandler = (progress: number) => void;
```

然后封装上传请求。这里使用 Axios，因为它对上传进度支持更直接。

```ts
// src/features/file-upload/uploadApi.ts
import axios from 'axios';
import type {UploadProgressHandler, UploadResult} from './types';

type UploadFileParams = {
  file: File;
  onProgress?: UploadProgressHandler;
  signal?: AbortSignal;
};

export async function uploadFile({
  file,
  onProgress,
  signal,
}: UploadFileParams): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadResult>('/api/upload', formData, {
    signal,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress(event) {
      if (!event.total) {
        onProgress?.(0);
        return;
      }

      const progress = Math.round((event.loaded * 100) / event.total);
      onProgress?.(progress);
    },
  });

  return response.data;
}
```

这里的关键点是：上传请求函数不直接操作 React state，而是通过 `onProgress` 把进度抛出去。这样它可以被 React hook 使用，也可以被其他业务逻辑复用。

另外，`signal` 用于取消请求。Axios 新版本支持 `AbortController`，这比旧的 `CancelToken` 更符合现代 Web API 习惯。

---

## 6. 推荐写法二：用 hook 管理上传状态

接下来写核心 hook。它负责把浏览器文件对象、上传 API、进度、错误、取消、重置串起来。

```ts
// src/features/file-upload/useFileUpload.ts
import {useCallback, useRef, useState} from 'react';
import {uploadFile} from './uploadApi';
import type {UploadError, UploadResult, UploadStatus} from './types';

type UseFileUploadOptions = {
  maxSizeMB?: number;
  acceptTypes?: string[];
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: UploadError) => void;
};

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {maxSizeMB = 10, acceptTypes, onSuccess, onError} = options;
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<UploadError | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateFile = useCallback(
    (nextFile: File): UploadError | null => {
      const maxBytes = maxSizeMB * 1024 * 1024;

      if (nextFile.size > maxBytes) {
        return {
          code: 'FILE_TOO_LARGE',
          message: `文件不能超过 ${maxSizeMB}MB`,
        };
      }

      if (acceptTypes?.length && !acceptTypes.includes(nextFile.type)) {
        return {
          code: 'INVALID_FILE_TYPE',
          message: '文件类型不符合要求',
        };
      }

      return null;
    },
    [acceptTypes, maxSizeMB],
  );

  const selectFile = useCallback(
    (nextFile: File | null) => {
      if (!nextFile) return;

      const validationError = validateFile(nextFile);

      if (validationError) {
        setFile(null);
        setStatus('error');
        setProgress(0);
        setResult(null);
        setError(validationError);
        onError?.(validationError);
        return;
      }

      setFile(nextFile);
      setStatus('ready');
      setProgress(0);
      setError(null);
      setResult(null);
    },
    [onError, validateFile],
  );

  const upload = useCallback(async () => {
    if (!file) return;
    if (status === 'uploading') return;

    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus('uploading');
    setProgress(0);
    setError(null);
    setResult(null);

    try {
      const uploadResult = await uploadFile({
        file,
        signal: controller.signal,
        onProgress: setProgress,
      });

      setProgress(100);
      setResult(uploadResult);
      setStatus('success');
      onSuccess?.(uploadResult);
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus('ready');
        return;
      }

      const uploadError: UploadError = {
        code: 'UPLOAD_FAILED',
        message: err instanceof Error ? err.message : '上传失败，请稍后重试',
      };

      setProgress(0);
      setError(uploadError);
      setStatus('error');
      onError?.(uploadError);
    } finally {
      abortControllerRef.current = null;
    }
  }, [file, onError, onSuccess, status]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStatus(file ? 'ready' : 'idle');
    setProgress(0);
  }, [file]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
    setResult(null);
  }, []);

  return {
    file,
    status,
    progress,
    error,
    result,
    canUpload: Boolean(file) && status !== 'uploading',
    isUploading: status === 'uploading',
    isSuccess: status === 'success',
    isError: status === 'error',
    selectFile,
    upload,
    cancel,
    reset,
  };
}
```

这里的设计重点有几个。

第一，组件不直接调用 `uploadFile`，而是调用 `upload`。这样组件不需要知道 `FormData`、Axios、进度计算、`AbortController`。

第二，上传状态是单一状态机：`idle -> ready -> uploading -> success/error`。这比多个 boolean 更稳定。

第三，文件校验放在 hook 里。因为文件大小、类型限制通常是业务规则，不应该散落在 UI 组件里。

第四，上传中重复点击会被拦截。真实项目里，这一点很重要，否则用户连续点击可能发出多个重复请求。

第五，取消上传通过 `AbortController` 管理。即使当前 UI 没有取消按钮，也应该预留这个能力，尤其是大文件上传场景。

---

## 7. 推荐写法三：组件只消费结果，不承载复杂业务

组件应该足够薄。它不应该知道上传请求怎么发，也不应该知道进度怎么算。

```tsx
// src/features/file-upload/components/FileUploader.tsx
import type {ChangeEvent} from 'react';
import {useRef} from 'react';
import {useFileUpload} from '../useFileUpload';

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function FileUploader() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const {
    file,
    status,
    progress,
    error,
    canUpload,
    isUploading,
    isSuccess,
    selectFile,
    upload,
    cancel,
    reset,
  } = useFileUpload({
    maxSizeMB: 5,
    acceptTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    onSuccess(result) {
      console.log('上传成功：', result);
    },
  });

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null;
    selectFile(selectedFile);
    event.target.value = '';
  }

  function handleReset() {
    reset();

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          disabled={isUploading}
          onChange={handleFileChange}
        />
      </div>

      {file && (
        <div className="rounded-md bg-gray-50 p-3 text-sm">
          <p>文件名：{file.name}</p>
          <p>文件大小：{formatFileSize(file.size)}</p>
          <p>文件类型：{file.type || 'unknown'}</p>
        </div>
      )}

      {isUploading && (
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded bg-gray-200">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{width: `${progress}%`}}
            />
          </div>
          <p className="text-sm text-gray-600">上传中：{progress}%</p>
        </div>
      )}

      {isSuccess && <p className="text-sm text-green-600">文件上传成功</p>}
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      <div className="flex gap-2">
        <button type="button" disabled={!canUpload} onClick={upload}>
          {status === 'error' ? '重新上传' : '上传'}
        </button>
        {isUploading && (
          <button type="button" onClick={cancel}>
            取消
          </button>
        )}
        <button type="button" disabled={isUploading} onClick={handleReset}>
          清空
        </button>
      </div>
    </section>
  );
}
```

这个组件的职责很明确：接收用户输入，渲染状态，触发动作。

它没有直接拼接口地址，没有直接构造 `FormData`，没有写 Axios，也没有维护一堆复杂状态。后续如果要换成对象存储直传、预签名 URL、分片上传，组件可以基本不动，主要改 `uploadApi.ts` 和 `useFileUpload.ts`。

---

## 8. 错误处理、重试、生命周期应该怎么做

文件上传的错误处理不能只写一句“上传失败”。至少要考虑四类错误。

第一类是客户端校验错误，比如文件太大、格式不对、文件数量超限。这类错误应该在上传前拦截，避免浪费网络请求。

第二类是网络错误，比如断网、超时、请求被取消。这类错误通常允许用户重试。

第三类是服务端错误，比如 413 Payload Too Large、401 未登录、403 无权限、500 服务端异常。不同状态码应该给不同反馈。

第四类是业务错误，比如图片审核不通过、文件内容解析失败、Excel 模板不符合规范。这类错误通常来自接口响应体，需要展示具体原因。

可以在 `uploadApi.ts` 里对错误做标准化：

```ts
// src/features/file-upload/uploadApi.ts
import axios from 'axios';
import type {UploadError} from './types';

export function normalizeUploadError(error: unknown): UploadError {
  if (axios.isCancel(error)) {
    return {
      code: 'UPLOAD_CANCELED',
      message: '上传已取消',
    };
  }

  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 401) {
      return {
        code: 'UNAUTHORIZED',
        message: '登录已过期，请重新登录',
      };
    }

    if (status === 413) {
      return {
        code: 'PAYLOAD_TOO_LARGE',
        message: '文件过大，请压缩后重新上传',
      };
    }

    const serverMessage =
      typeof error.response?.data === 'object' &&
      error.response?.data &&
      'message' in error.response.data
        ? String(error.response.data.message)
        : null;

    return {
      code: `HTTP_${status ?? 'UNKNOWN'}`,
      message: serverMessage ?? '上传失败，请稍后重试',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : '未知错误',
  };
}
```

然后在 hook 里使用它：

```ts
import {normalizeUploadError, uploadFile} from './uploadApi';

// catch 内部
catch (err) {
  if (controller.signal.aborted) {
    setStatus('ready');
    return;
  }

  const uploadError = normalizeUploadError(err);
  setProgress(0);
  setError(uploadError);
  setStatus('error');
  onError?.(uploadError);
}
```

生命周期方面，最容易忽略的是“组件卸载时还在上传”。可以在组件或 hook 中增加清理逻辑：

```ts
import {useEffect} from 'react';

// 在 useFileUpload 内部
useEffect(() => {
  return () => {
    abortControllerRef.current?.abort();
  };
}, []);
```

这样页面切换时，正在进行的上传会被取消，不会出现组件卸载后还继续更新状态的问题。

---

## 9. 结合真实业务举例：后台内容管理的封面上传

假设我们在做一个内容管理系统，文章发布前需要上传封面图。这个业务不是单纯上传文件，而是：

```txt
用户选择封面图
  -> 前端校验图片格式和大小
  -> 上传到后端或对象存储
  -> 后端返回图片 URL
  -> 表单把 coverUrl 写入文章草稿
  -> 用户点击发布文章
  -> 发布成功后跳转到文章列表
```

在这种场景下，文件上传组件不应该直接提交文章表单。它只负责上传文件，并在成功后把结果抛给父组件。

```tsx
type ArticleFormState = {
  title: string;
  content: string;
  coverUrl: string;
};

export function ArticleEditor() {
  const [form, setForm] = useState<ArticleFormState>({
    title: '',
    content: '',
    coverUrl: '',
  });

  async function submitArticle() {
    if (!form.coverUrl) {
      alert('请先上传封面图');
      return;
    }

    await fetch('/api/articles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(form),
    });
  }

  return (
    <div className="space-y-6">
      <input
        value={form.title}
        onChange={event =>
          setForm(prev => ({...prev, title: event.target.value}))
        }
        placeholder="文章标题"
      />

      <FileUploader
        onUploaded={result => {
          setForm(prev => ({
            ...prev,
            coverUrl: result.url,
          }));
        }}
      />

      <button onClick={submitArticle}>发布文章</button>
    </div>
  );
}
```

为了支持这种用法，可以让 `FileUploader` 接收业务回调：

```tsx
type FileUploaderProps = {
  onUploaded?: (result: UploadResult) => void;
};

export function FileUploader({onUploaded}: FileUploaderProps) {
  const uploader = useFileUpload({
    maxSizeMB: 5,
    acceptTypes: ['image/png', 'image/jpeg'],
    onSuccess(result) {
      onUploaded?.(result);
    },
  });

  // 省略 UI
}
```

这里的边界是清楚的。

上传模块负责“把文件变成 URL”。文章模块负责“把 URL 放进文章表单”。这两个模块不互相污染，后面同一个上传组件也可以用于头像、商品图、附件、PDF。

---

## 10. 完整代码示例

下面给出一个压缩后的完整版本，保留真实项目里最核心的结构。

先是类型：

```ts
// types.ts
export type UploadStatus = 'idle' | 'ready' | 'uploading' | 'success' | 'error';

export type UploadResult = {
  url: string;
  filename: string;
};

export type UploadError = {
  code?: string;
  message: string;
};
```

上传 API：

```ts
// uploadApi.ts
import axios from 'axios';
import type {UploadError, UploadResult} from './types';

export async function uploadFile(params: {
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}) {
  const formData = new FormData();
  formData.append('file', params.file);

  const response = await axios.post<UploadResult>('/api/upload', formData, {
    signal: params.signal,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress(event) {
      if (!event.total) return;

      const progress = Math.round((event.loaded * 100) / event.total);
      params.onProgress?.(progress);
    },
  });

  return response.data;
}

export function normalizeUploadError(error: unknown): UploadError {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 413) {
      return {
        code: 'FILE_TOO_LARGE',
        message: '文件过大，请重新选择',
      };
    }

    return {
      code: `HTTP_${error.response?.status ?? 'UNKNOWN'}`,
      message: '上传失败，请稍后重试',
    };
  }

  return {
    code: 'UNKNOWN',
    message: error instanceof Error ? error.message : '未知错误',
  };
}
```

核心 hook：

```ts
// useFileUpload.ts
import {useCallback, useEffect, useRef, useState} from 'react';
import {normalizeUploadError, uploadFile} from './uploadApi';
import type {UploadError, UploadResult, UploadStatus} from './types';

type Options = {
  maxSizeMB?: number;
  acceptTypes?: string[];
  onSuccess?: (result: UploadResult) => void;
};

export function useFileUpload(options: Options = {}) {
  const {maxSizeMB = 10, acceptTypes, onSuccess} = options;
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<UploadError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selectFile = useCallback(
    (nextFile: File | null) => {
      if (!nextFile) return;

      if (nextFile.size > maxSizeMB * 1024 * 1024) {
        setStatus('error');
        setError({
          code: 'FILE_TOO_LARGE',
          message: `文件不能超过 ${maxSizeMB}MB`,
        });
        return;
      }

      if (acceptTypes?.length && !acceptTypes.includes(nextFile.type)) {
        setStatus('error');
        setError({code: 'INVALID_TYPE', message: '文件类型不符合要求'});
        return;
      }

      setFile(nextFile);
      setStatus('ready');
      setProgress(0);
      setError(null);
    },
    [acceptTypes, maxSizeMB],
  );

  const upload = useCallback(async () => {
    if (!file || status === 'uploading') return;

    const controller = new AbortController();
    abortRef.current = controller;

    setStatus('uploading');
    setProgress(0);
    setError(null);

    try {
      const result = await uploadFile({
        file,
        signal: controller.signal,
        onProgress: setProgress,
      });

      setProgress(100);
      setStatus('success');
      onSuccess?.(result);
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus('ready');
        return;
      }

      setProgress(0);
      setError(normalizeUploadError(err));
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  }, [file, onSuccess, status]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setFile(null);
    setStatus('idle');
    setProgress(0);
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    file,
    status,
    progress,
    error,
    isUploading: status === 'uploading',
    canUpload: Boolean(file) && status !== 'uploading',
    selectFile,
    upload,
    cancel,
    reset,
  };
}
```

组件消费：

```tsx
// FileUploader.tsx
import type {ChangeEvent} from 'react';
import {useRef} from 'react';
import {useFileUpload} from './useFileUpload';
import type {UploadResult} from './types';

type Props = {
  onUploaded?: (result: UploadResult) => void;
};

export function FileUploader({onUploaded}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploader = useFileUpload({
    maxSizeMB: 5,
    acceptTypes: ['image/png', 'image/jpeg'],
    onSuccess: onUploaded,
  });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    uploader.selectFile(event.target.files?.[0] ?? null);
    event.target.value = '';
  }

  function handleReset() {
    uploader.reset();

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        disabled={uploader.isUploading}
        onChange={handleChange}
      />

      {uploader.file && (
        <div>
          <p>{uploader.file.name}</p>
          <p>{Math.round(uploader.file.size / 1024)} KB</p>
        </div>
      )}

      {uploader.isUploading && (
        <div>
          <div style={{width: `${uploader.progress}%`, height: 8}} />
          <span>{uploader.progress}%</span>
        </div>
      )}

      {uploader.error && <p>{uploader.error.message}</p>}

      <button disabled={!uploader.canUpload} onClick={uploader.upload}>
        上传
      </button>

      {uploader.isUploading && <button onClick={uploader.cancel}>取消</button>}

      <button disabled={uploader.isUploading} onClick={handleReset}>
        清空
      </button>
    </div>
  );
}
```

这个版本已经具备真实项目的基础能力：文件选择、文件校验、上传状态、上传进度、错误标准化、取消上传、组件卸载清理、业务回调。

---

## 11. 工程化注意事项

文件上传里有几个容易踩坑的点。

第一，不要把 `File` 对象直接长期放进全局 store。`File` 是浏览器对象，不适合持久化，也不适合放进 `localStorage`。局部上传组件或页面级状态更合适。

第二，不要只靠前端校验文件类型。前端校验只能改善体验，不能保证安全。后端仍然必须校验 MIME type、文件扩展名、文件大小和文件内容。

第三，不要用多个 boolean 管理上传状态。`isUploading`、`isSuccess`、`isError` 同时存在时，很容易出现状态组合错误。优先用 `UploadStatus` 这类状态枚举。

第四，不要忽略重复点击。上传按钮在上传中必须禁用，或者在 hook 里直接拦截重复上传。

第五，不要忽略取消和卸载。用户切换页面时，应该取消请求，避免无意义的网络开销和状态更新。

第六，不要把上传成功等同于业务完成。文件上传成功通常只是拿到了 URL 或文件 ID，后续还要把这个 URL 或 ID 写入业务表单，再提交具体业务。

第七，如果是大文件上传，还要考虑分片上传、断点续传、秒传、并发数控制、失败分片重试、文件 hash 计算。这已经不是普通表单上传的范畴，应该单独设计上传任务模块。

---

## 12. 总结

React 文件上传的基础能力并不复杂：input 选择文件，`FormData` 发送文件，Axios 监听进度。但真正影响项目质量的是边界设计。

一个比较稳妥的做法是：请求逻辑放在 `uploadApi`，状态流转放在 `useFileUpload`，组件只消费状态和触发动作。这样后面无论是做头像上传、后台附件上传、文章封面上传，还是扩展成多文件上传，都不需要把页面组件改成一团复杂逻辑。

文件上传不是一个 UI 小功能，而是一条完整的前端业务链路。把这条链路拆清楚，后面的复用、错误处理和业务接入才会轻很多。
