# React 多文件上传怎么做：从 File Input 到并发上传进度的工程化封装

文件上传在前端里看起来很简单：一个 `<input type="file" />`，拿到 `File` 对象，再丢给接口就可以了。

但真实项目里的上传通常不会这么简单。用户可能一次选择多个文件，上传过程需要展示每个文件的进度，上传中不能重复选择或重复提交，失败后要能重试，上传完成后要清理状态。如果这些逻辑全部堆在一个组件里，代码很快会变成一团混在一起的 UI、状态、请求和副作用。

这篇文章不只讲“如何写一个多文件上传组件”，而是围绕真实项目中的文件上传模块，拆清楚状态结构、组件边界、并发上传、进度更新、错误处理和后续扩展方式。

---

## 1. 多文件上传解决什么问题

多文件上传本质上解决的是“用户一次性提交多个本地文件，并让前端可控地管理每个文件的上传生命周期”。

它适合这些场景：

- 后台管理里的图片、合同、附件上传。
- 内容系统里的图文资源上传。
- 工单系统里的问题截图上传。
- 数据平台里的 CSV、Excel 批量导入。
- AI 文件任务里的多文件解析、转码、识别。

它不只是一个 input，而是一条完整的数据链路：

```txt
用户选择文件
  -> 前端读取 FileList
  -> 转换成业务可管理的文件状态
  -> 展示文件名、大小、类型
  -> 用户确认上传
  -> 前端构造 FormData
  -> 多个文件并发请求
  -> 每个文件独立更新 progress
  -> 上传完成后更新状态
  -> 失败时保留错误信息，支持重试或移除
```

这里的核心不是 UI，而是“每个文件都应该有自己的状态”。如果只把原生 `File` 对象塞进数组里，后面很难管理进度、完成状态、错误状态和重试状态。

---

## 2. 最简单的写法是什么

最简单的多文件选择大概是这样：

```tsx
import {ChangeEvent, useState} from 'react';

export function SimpleUpload() {
  const [files, setFiles] = useState<File[]>([]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files) return;

    setFiles(Array.from(event.target.files));
  }

  async function handleUpload() {
    await Promise.all(
      files.map(file => {
        const formData = new FormData();
        formData.append('file', file);

        return fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
      }),
    );
  }

  return (
    <div>
      <input type="file" multiple onChange={handleChange} />
      <button onClick={handleUpload}>Upload</button>
      <ul>
        {files.map(file => (
          <li key={file.name}>{file.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

这段代码能跑。用户可以选择多个文件，也可以点击按钮上传。

但它只适合 demo，不适合真实项目。因为它没有管理每个文件的上传状态，也没有进度，没有错误，没有禁用状态，没有清理 input 的值，也没有处理并发上传时的状态更新问题。

---

## 3. 简单写法的问题

最明显的问题是：`File` 本身不够用。

原生 `File` 对象包含文件名、大小、类型、最后修改时间这些信息，但它没有上传进度、上传状态、错误原因、重试次数、后端返回 ID 等业务状态。真实项目里只保存 `File[]`，后面会发现每做一个需求都要临时补字段，组件会越来越乱。

第二个问题是 input 和 React state 不是一回事。

文件 input 自己内部也保存了选中的文件。即使你清空了 React state，input 的 value 可能还在。如果用户连续选择同一个文件，某些情况下 `onChange` 不一定按预期触发。因此，清空文件列表时通常也要清理 input 的 value。

第三个问题是并发上传时容易出现状态覆盖。

多个文件同时上传，每个请求都会不断触发 progress 回调。如果更新 state 时直接依赖外层闭包里的 files，很容易出现后一次更新覆盖前一次更新的问题。这里必须使用函数式 `setState(prev => ...)`，保证每次基于最新状态更新。

第四个问题是组件职责混乱。

如果一个组件同时负责 input、文件列表、进度条、按钮、请求、错误处理、格式化文件大小，代码会迅速变长。后续要加“单文件重试”“限制文件类型”“限制最大文件大小”“取消上传”“拖拽上传”，每个需求都会继续往这个大组件里塞逻辑。

---

## 4. 推荐的项目落地结构

多文件上传这个主题不需要设计一个很大的目录。它的重点是上传状态、上传请求和组件拆分，所以目录应该围绕这三件事设计。

```txt
src/
  features/
    file-upload/
      types.ts
      uploadApi.ts
      utils.ts
      useMultiFileUpload.ts
      components/
        FileUpload.tsx
        FileInput.tsx
        FileList.tsx
        FileItem.tsx
        UploadActions.tsx
        ProgressBar.tsx
```

`types.ts` 只放文件上传相关类型，例如 `UploadFileItem`、`UploadStatus`。

`uploadApi.ts` 只负责真正的上传请求，不关心 UI 怎么展示。

`utils.ts` 放文件大小格式化、文件类型判断、生成文件 ID 这类纯函数。

`useMultiFileUpload.ts` 是核心业务 hook，负责选择文件、移除文件、清空文件、并发上传、更新进度、处理错误。

`components/` 下面的组件只负责渲染和触发动作。`FileUpload.tsx` 是组合组件，`FileInput.tsx` 只负责选择文件，`FileList.tsx` 只负责列表，`FileItem.tsx` 只负责单个文件展示，`UploadActions.tsx` 只负责上传和清空按钮，`ProgressBar.tsx` 只负责进度条。

这个结构已经足够。不要为了“架构感”再拆出一堆无关目录。文件上传模块的关键是让请求、状态和 UI 解耦，而不是把目录做得复杂。

---

## 5. 推荐写法一：先定义可管理的文件状态

不要直接用 `File[]` 作为核心状态。真实项目里应该把原生文件包装成业务对象。

```ts
// features/file-upload/types.ts
export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export type UploadFileItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  responseUrl?: string;
};
```

这里的 `file` 是原生文件对象，真正提交给接口时会用到。

`progress` 用来展示上传进度。

`status` 用来区分未上传、上传中、成功、失败。

`error` 用来保存单个文件的失败原因。

`responseUrl` 代表上传成功后后端返回的文件地址或资源 ID，真实项目里经常会用到。

然后准备几个工具函数：

```ts
// features/file-upload/utils.ts
export function createFileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;

  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function getFileCategory(file: File) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.includes('pdf')) return 'pdf';
  return 'file';
}
```

注意，不建议只用 `file.name` 当 ID。不同目录下可能存在同名文件，用户也可能多次选择同一个文件。更稳妥的做法是组合 name、size、lastModified，再加上 `crypto.randomUUID()`。

---

## 6. 推荐写法二：把上传请求单独封装

上传请求不要直接写在组件里。组件不应该知道接口地址、`FormData` 细节、上传进度事件如何计算。

这里使用 axios，因为它提供了 `onUploadProgress`，实现上传进度比较直接。

```ts
// features/file-upload/uploadApi.ts
import axios from 'axios';

export type UploadFileParams = {
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
};

export type UploadFileResponse = {
  url: string;
};

export async function uploadSingleFile({
  file,
  signal,
  onProgress,
}: UploadFileParams): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<UploadFileResponse>(
    '/api/upload',
    formData,
    {
      signal,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress(event) {
        if (!event.total) return;

        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress?.(progress);
      },
    },
  );

  return response.data;
}
```

这一层只做上传，不做 React state。这样后面不管是普通按钮触发上传，还是拖拽上传，还是表单提交时自动上传，都可以复用这个请求函数。

---

## 7. 推荐写法三：用业务 hook 管理选择、移除、上传和清理

核心逻辑应该放进 hook，而不是散落在组件里。

```ts
// features/file-upload/useMultiFileUpload.ts
import {ChangeEvent, useMemo, useRef, useState} from 'react';
import {uploadSingleFile} from './uploadApi';
import {createFileId} from './utils';
import type {UploadFileItem} from './types';

type UseMultiFileUploadOptions = {
  maxFiles?: number;
  maxSize?: number;
  accept?: string[];
};

export function useMultiFileUpload(options: UseMultiFileUploadOptions = {}) {
  const {maxFiles = 10, maxSize = 20 * 1024 * 1024, accept} = options;
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const canUpload = files.length > 0 && !isUploading;
  const hasFiles = files.length > 0;

  const uploadedCount = useMemo(() => {
    return files.filter(file => file.status === 'success').length;
  }, [files]);

  function validateFile(file: File) {
    if (file.size > maxSize) {
      return `文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`;
    }

    if (accept?.length && !accept.includes(file.type)) {
      return `不支持的文件类型：${file.type || 'unknown'}`;
    }

    return null;
  }

  function handleSelectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = event.target.files;
    if (!selectedFiles?.length) return;

    const nextFiles = Array.from(selectedFiles).slice(0, maxFiles - files.length);

    const mappedFiles: UploadFileItem[] = nextFiles.map(file => {
      const error = validateFile(file);

      return {
        id: createFileId(file),
        file,
        progress: 0,
        status: error ? 'error' : 'idle',
        error: error ?? undefined,
      };
    });

    setFiles(prev => [...prev, ...mappedFiles]);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function removeFile(id: string) {
    abortControllersRef.current.get(id)?.abort();
    abortControllersRef.current.delete(id);
    setFiles(prev => prev.filter(file => file.id !== id));
  }

  function clearFiles() {
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    setFiles([]);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  async function uploadFile(item: UploadFileItem) {
    if (item.status === 'error') return;

    const controller = new AbortController();
    abortControllersRef.current.set(item.id, controller);

    setFiles(prev =>
      prev.map(file =>
        file.id === item.id
          ? {...file, status: 'uploading', progress: 0, error: undefined}
          : file,
      ),
    );

    try {
      const result = await uploadSingleFile({
        file: item.file,
        signal: controller.signal,
        onProgress(progress) {
          setFiles(prev =>
            prev.map(file =>
              file.id === item.id ? {...file, progress} : file,
            ),
          );
        },
      });

      setFiles(prev =>
        prev.map(file =>
          file.id === item.id
            ? {
                ...file,
                progress: 100,
                status: 'success',
                responseUrl: result.url,
              }
            : file,
        ),
      );
    } catch (error) {
      const isAbortError =
        error instanceof DOMException && error.name === 'AbortError';

      setFiles(prev =>
        prev.map(file =>
          file.id === item.id
            ? {
                ...file,
                status: isAbortError ? 'idle' : 'error',
                error: isAbortError ? undefined : '上传失败，请重试',
              }
            : file,
        ),
      );
    } finally {
      abortControllersRef.current.delete(item.id);
    }
  }

  async function uploadAll() {
    if (!canUpload) return;

    setIsUploading(true);

    try {
      const pendingFiles = files.filter(file => file.status === 'idle');
      await Promise.all(pendingFiles.map(file => uploadFile(file)));
    } finally {
      setIsUploading(false);
    }
  }

  async function retryFile(id: string) {
    const target = files.find(file => file.id === id);

    if (!target || isUploading) return;

    await uploadFile(target);
  }

  return {
    inputRef,
    files,
    hasFiles,
    canUpload,
    isUploading,
    uploadedCount,
    handleSelectFiles,
    removeFile,
    clearFiles,
    uploadAll,
    retryFile,
  };
}
```

这里有几个关键点。

第一，选择文件时把 `File` 转成 `UploadFileItem`，这样后面所有 UI 都围绕统一状态渲染。

第二，进度更新使用函数式 `setFiles(prev => ...)`。因为多个文件并发上传时，progress 回调会高频触发，必须基于最新 state 更新。

第三，`AbortController` 用 ref 保存，而不是放进 state。因为它不参与渲染，只是用来控制请求生命周期。

第四，`uploadAll` 使用 `Promise.all` 并发上传。对于多数文件上传场景，并发上传体验更好。但如果文件很多，真实项目里可以加并发池，比如一次只上传 3 个，避免占满网络资源。

---

## 8. 组件只消费 hook 结果，不承载复杂业务

组件层应该尽量轻。它只负责渲染状态、绑定事件，不应该直接拼接请求、不应该直接计算上传进度、不应该直接操作 `FormData`。

先写输入组件：

```tsx
// features/file-upload/components/FileInput.tsx
import type {ChangeEvent, RefObject} from 'react';

type FileInputProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  disabled?: boolean;
  multiple?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function FileInput({
  inputRef,
  disabled,
  multiple = true,
  onChange,
}: FileInputProps) {
  return (
    <div>
      <input
        ref={inputRef}
        id="file-upload"
        type="file"
        multiple={multiple}
        disabled={disabled}
        onChange={onChange}
        className="hidden"
      />
      <label
        htmlFor="file-upload"
        className="inline-flex cursor-pointer items-center rounded-md border px-4 py-2 text-sm"
      >
        Select files
      </label>
    </div>
  );
}
```

再写进度条：

```tsx
// features/file-upload/components/ProgressBar.tsx
type ProgressBarProps = {
  value: number;
};

export function ProgressBar({value}: ProgressBarProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded bg-gray-200">
      <div
        className="h-full bg-black transition-all"
        style={{width: `${value}%`}}
      />
    </div>
  );
}
```

然后写单个文件项：

```tsx
// features/file-upload/components/FileItem.tsx
import type {UploadFileItem} from '../types';
import {formatFileSize, getFileCategory} from '../utils';
import {ProgressBar} from './ProgressBar';

type FileItemProps = {
  item: UploadFileItem;
  disabled?: boolean;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
};

export function FileItem({item, disabled, onRemove, onRetry}: FileItemProps) {
  const category = getFileCategory(item.file);

  return (
    <div className="rounded-md border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{item.file.name}</div>
          <div className="mt-1 text-xs text-gray-500">
            {category} · {formatFileSize(item.file.size)}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {item.status === 'error' && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRetry(item.id)}
              className="text-xs"
            >
              Retry
            </button>
          )}
          {item.status !== 'uploading' && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(item.id)}
              className="text-xs"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="mt-3">
        <ProgressBar value={item.progress} />
      </div>

      <div className="mt-2 text-xs text-gray-500">
        {item.status === 'idle' && 'Waiting'}
        {item.status === 'uploading' && `${item.progress}%`}
        {item.status === 'success' && 'Completed'}
        {item.status === 'error' && (item.error ?? 'Upload failed')}
      </div>
    </div>
  );
}
```

文件列表组件只负责 map：

```tsx
// features/file-upload/components/FileList.tsx
import type {UploadFileItem} from '../types';
import {FileItem} from './FileItem';

type FileListProps = {
  files: UploadFileItem[];
  disabled?: boolean;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
};

export function FileList({
  files,
  disabled,
  onRemove,
  onRetry,
}: FileListProps) {
  if (!files.length) return null;

  return (
    <div className="mt-4 space-y-3">
      {files.map(file => (
        <FileItem
          key={file.id}
          item={file}
          disabled={disabled}
          onRemove={onRemove}
          onRetry={onRetry}
        />
      ))}
    </div>
  );
}
```

操作按钮组件也单独拆出来：

```tsx
// features/file-upload/components/UploadActions.tsx
type UploadActionsProps = {
  canUpload: boolean;
  isUploading: boolean;
  onUpload: () => void;
  onClear: () => void;
};

export function UploadActions({
  canUpload,
  isUploading,
  onUpload,
  onClear,
}: UploadActionsProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={!canUpload}
        onClick={onUpload}
        className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
      >
        {isUploading ? 'Uploading...' : 'Upload'}
      </button>
      <button
        type="button"
        disabled={isUploading}
        onClick={onClear}
        className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
      >
        Clear all
      </button>
    </div>
  );
}
```

最后组合成主组件：

```tsx
// features/file-upload/components/FileUpload.tsx
import {useMultiFileUpload} from '../useMultiFileUpload';
import {FileInput} from './FileInput';
import {FileList} from './FileList';
import {UploadActions} from './UploadActions';

export function FileUpload() {
  const upload = useMultiFileUpload({
    maxFiles: 10,
    maxSize: 20 * 1024 * 1024,
  });

  return (
    <section className="max-w-xl rounded-lg border p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">File upload</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select multiple files and upload them with individual progress.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <FileInput
          inputRef={upload.inputRef}
          disabled={upload.isUploading}
          onChange={upload.handleSelectFiles}
        />
        <UploadActions
          canUpload={upload.canUpload}
          isUploading={upload.isUploading}
          onUpload={upload.uploadAll}
          onClear={upload.clearFiles}
        />
      </div>

      <FileList
        files={upload.files}
        disabled={upload.isUploading}
        onRemove={upload.removeFile}
        onRetry={upload.retryFile}
      />

      {upload.hasFiles && (
        <div className="mt-4 text-sm text-gray-500">
          Uploaded: {upload.uploadedCount} / {upload.files.length}
        </div>
      )}
    </section>
  );
}
```

这个组件已经比较接近真实项目写法。UI 可以换成任意组件库，核心逻辑不受影响。

---

## 9. 错误处理、重试和生命周期怎么处理

文件上传最容易被忽略的是失败状态。

很多 demo 只写成功路径：选择文件、上传、完成。但真实项目中，上传失败很常见。网络断开、文件过大、格式错误、接口超时、服务端扫描失败、用户关闭页面，都可能导致失败。

比较合理的处理方式是：

- 单个文件失败只影响单个文件，不应该让所有文件都失败。
- 失败状态要保留在对应文件上，方便用户重试。
- 上传中禁止重复点击上传按钮。
- 组件卸载、清空文件、移除文件时要中断还在上传的请求。
- 上传完成后不要直接清空列表，最好让用户看到完成状态。
- 重试时只重试失败文件，不要把已成功文件重新上传。

在上面的 hook 里，`AbortController` 已经承担了生命周期控制。清空文件时：

```ts
abortControllersRef.current.forEach(controller => controller.abort());
abortControllersRef.current.clear();
setFiles([]);
```

移除单个文件时：

```ts
abortControllersRef.current.get(id)?.abort();
abortControllersRef.current.delete(id);
setFiles(prev => prev.filter(file => file.id !== id));
```

这比只改 UI 状态更可靠。因为请求如果没有真正取消，后续 progress 或 success 回调仍然可能回来更新已经不存在的文件。

还有一个细节：`Promise.all` 遇到任意一个 reject 会直接 reject。如果希望“一个文件失败不影响其他文件”，可以让 `uploadFile` 内部消化错误，不继续向外抛。上面的实现就是这个思路：单文件失败只更新自己的状态，`uploadAll` 仍然等待所有文件流程结束。

---

## 10. 结合真实项目举例：后台附件上传

假设我们在做一个后台管理系统，里面有一个“合同附件上传”模块。用户在创建合同记录时，需要上传多个附件，包括 PDF、Word、图片扫描件。

这个业务里，文件上传不应该直接和表单提交死绑在一起。更好的链路通常是：

```txt
用户先选择多个附件
  -> 前端展示待上传附件列表
  -> 用户点击上传
  -> 每个文件上传到对象存储或后端文件服务
  -> 后端返回文件 URL、fileId、checksum 等信息
  -> 前端把成功上传的文件信息保存到表单状态
  -> 最后提交合同时，只提交 fileId 列表，而不是再次提交文件本体
```

这时 `UploadFileItem` 可以扩展成这样：

```ts
export type UploadFileItem = {
  id: string;
  file: File;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  serverFileId?: string;
  url?: string;
  checksum?: string;
};
```

上传接口返回：

```ts
export type UploadFileResponse = {
  fileId: string;
  url: string;
  checksum: string;
};
```

上传成功后更新：

```ts
setFiles(prev =>
  prev.map(file =>
    file.id === item.id
      ? {
          ...file,
          progress: 100,
          status: 'success',
          serverFileId: result.fileId,
          url: result.url,
          checksum: result.checksum,
        }
      : file,
  ),
);
```

表单提交时只取成功文件：

```ts
const uploadedFileIds = files
  .filter(file => file.status === 'success')
  .map(file => file.serverFileId)
  .filter(Boolean);
```

这个设计的好处是上传模块和业务表单解耦。上传模块负责“把本地文件变成服务端文件资源”，表单模块负责“引用这些资源”。后续要把同一个上传模块用于工单附件、文章图片、用户资质材料，也不会重写核心上传逻辑。

---

## 11. 完整示例：一个可落地的多文件上传组件

下面把核心代码合并成一个较完整的版本，方便直接理解整体链路。

```tsx
import axios from 'axios';
import {ChangeEvent, RefObject, useMemo, useRef, useState} from 'react';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

type UploadFileItem = {
  id: string;
  file: File;
  progress: number;
  status: UploadStatus;
  error?: string;
  url?: string;
};

type UploadResponse = {
  url: string;
};

function createFileId(file: File) {
  return `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`;
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;

  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  return `${(kb / 1024).toFixed(1)} MB`;
}

async function uploadSingleFile(params: {
  file: File;
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}) {
  const formData = new FormData();
  formData.append('file', params.file);

  const response = await axios.post<UploadResponse>('/api/upload', formData, {
    signal: params.signal,
    onUploadProgress(event) {
      if (!event.total) return;

      const progress = Math.round((event.loaded * 100) / event.total);
      params.onProgress?.(progress);
    },
  });

  return response.data;
}

function useMultiFileUpload() {
  const inputRef = useRef<HTMLInputElement>(null);
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const [files, setFiles] = useState<UploadFileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const canUpload = files.some(file => file.status === 'idle') && !isUploading;

  const uploadedCount = useMemo(() => {
    return files.filter(file => file.status === 'success').length;
  }, [files]);

  function handleSelectFiles(event: ChangeEvent<HTMLInputElement>) {
    if (!event.target.files?.length) return;

    const selectedFiles = Array.from(event.target.files).map(file => ({
      id: createFileId(file),
      file,
      progress: 0,
      status: 'idle' as const,
    }));

    setFiles(prev => [...prev, ...selectedFiles]);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  function removeFile(id: string) {
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    setFiles(prev => prev.filter(file => file.id !== id));
  }

  function clearFiles() {
    controllersRef.current.forEach(controller => controller.abort());
    controllersRef.current.clear();
    setFiles([]);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  async function uploadFile(item: UploadFileItem) {
    const controller = new AbortController();
    controllersRef.current.set(item.id, controller);

    setFiles(prev =>
      prev.map(file =>
        file.id === item.id
          ? {...file, status: 'uploading', progress: 0, error: undefined}
          : file,
      ),
    );

    try {
      const result = await uploadSingleFile({
        file: item.file,
        signal: controller.signal,
        onProgress(progress) {
          setFiles(prev =>
            prev.map(file =>
              file.id === item.id ? {...file, progress} : file,
            ),
          );
        },
      });

      setFiles(prev =>
        prev.map(file =>
          file.id === item.id
            ? {
                ...file,
                progress: 100,
                status: 'success',
                url: result.url,
              }
            : file,
        ),
      );
    } catch {
      setFiles(prev =>
        prev.map(file =>
          file.id === item.id
            ? {
                ...file,
                status: 'error',
                error: '上传失败，请重试',
              }
            : file,
        ),
      );
    } finally {
      controllersRef.current.delete(item.id);
    }
  }

  async function uploadAll() {
    if (!canUpload) return;

    setIsUploading(true);

    try {
      const pendingFiles = files.filter(file => file.status === 'idle');
      await Promise.all(pendingFiles.map(uploadFile));
    } finally {
      setIsUploading(false);
    }
  }

  async function retryFile(id: string) {
    const target = files.find(file => file.id === id);

    if (!target || isUploading) return;

    await uploadFile(target);
  }

  return {
    inputRef,
    files,
    isUploading,
    canUpload,
    uploadedCount,
    handleSelectFiles,
    removeFile,
    clearFiles,
    uploadAll,
    retryFile,
  };
}

function FileInput(props: {
  inputRef: RefObject<HTMLInputElement | null>;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <>
      <input
        ref={props.inputRef}
        id="file-upload"
        type="file"
        multiple
        hidden
        disabled={props.disabled}
        onChange={props.onChange}
      />
      <label htmlFor="file-upload">Select files</label>
    </>
  );
}

function FileItem(props: {
  item: UploadFileItem;
  disabled: boolean;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const {item} = props;

  return (
    <div>
      <div>
        <strong>{item.file.name}</strong>
        <span> {formatFileSize(item.file.size)}</span>
      </div>

      <div>
        <progress value={item.progress} max={100} />
        <span> {item.progress}%</span>
      </div>

      <div>
        {item.status === 'idle' && '等待上传'}
        {item.status === 'uploading' && '上传中'}
        {item.status === 'success' && '上传完成'}
        {item.status === 'error' && item.error}
      </div>

      {item.status === 'error' && (
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => props.onRetry(item.id)}
        >
          Retry
        </button>
      )}

      {item.status !== 'uploading' && (
        <button
          type="button"
          disabled={props.disabled}
          onClick={() => props.onRemove(item.id)}
        >
          Remove
        </button>
      )}
    </div>
  );
}

export function FileUpload() {
  const upload = useMultiFileUpload();

  return (
    <section>
      <h2>Multi file upload</h2>

      <div>
        <FileInput
          inputRef={upload.inputRef}
          disabled={upload.isUploading}
          onChange={upload.handleSelectFiles}
        />
        <button
          type="button"
          disabled={!upload.canUpload}
          onClick={upload.uploadAll}
        >
          {upload.isUploading ? 'Uploading...' : 'Upload'}
        </button>
        <button
          type="button"
          disabled={upload.isUploading}
          onClick={upload.clearFiles}
        >
          Clear all
        </button>
      </div>

      <div>
        {upload.files.map(file => (
          <FileItem
            key={file.id}
            item={file}
            disabled={upload.isUploading}
            onRemove={upload.removeFile}
            onRetry={upload.retryFile}
          />
        ))}
      </div>

      {upload.files.length > 0 && (
        <p>
          Uploaded: {upload.uploadedCount} / {upload.files.length}
        </p>
      )}
    </section>
  );
}
```

这份代码没有绑定具体 UI 库，所以可以直接改造成 Tailwind、shadcn/ui、Ant Design 或内部组件库版本。

---

## 12. 工程化注意事项

多文件上传里，最重要的不是把文件发出去，而是把状态管理清楚。

第一，不要只保存 `File[]`。至少要包装出 `id`、`progress`、`status`、`error` 这些字段。

第二，不要用 `file.name` 作为唯一 key。真实项目里文件名并不总是可靠。

第三，不要在组件里直接写上传请求。请求函数应该单独封装，组件只消费结果。

第四，不要在并发上传的 progress 回调里直接使用外层 `files`。要使用函数式 `setState`。

第五，不要只考虑成功路径。失败、重试、取消、清空、组件卸载都要有策略。

第六，不要让一个文件失败影响所有文件。多文件上传通常应该是“单文件独立状态”。

第七，不要在上传中允许重复点击上传按钮。否则可能产生重复请求。

第八，不要忘记清理 input 的 value。尤其是清空后重新选择同一个文件时，这个细节很容易影响交互。

第九，如果文件数量很多，不要无脑 `Promise.all` 全部并发。可以做并发限制，比如每次只上传 3 到 5 个。

第十，如果上传文件很大，后端可能还需要分片上传、断点续传、秒传、文件 hash 校验。这些属于更复杂的上传系统，和本文的基础多文件上传是同一条链路上的后续增强。

---

## 13. 总结

一个可维护的多文件上传组件，核心设计不在按钮和进度条，而在状态模型。

原生 `File` 只是文件本体，前端真正需要管理的是文件的上传生命周期：等待、上传中、成功、失败、进度、错误、重试、取消。只要这个状态模型设计清楚，后面的 UI 展示、并发上传、错误处理和业务表单集成都可以自然展开。

在项目里，可以把上传模块拆成三层：请求函数负责和接口通信，业务 hook 负责管理状态和生命周期，组件负责展示和触发动作。这个边界一旦稳定，后面加文件校验、拖拽上传、上传队列、失败重试、服务端文件 ID 回填，都不会破坏原来的结构。
