# 在 Next.js 中使用 Sonner 实现 Toast 通知

在 Web 应用中，Toast 通知是非常常见的交互反馈方式。

比如用户提交表单成功后，我们需要提示“提交成功”；接口请求失败时，需要提示“操作失败”；系统有公告、提醒、撤销操作时，也可以通过 Toast 给用户一个轻量级反馈。

如果自己从零实现 Toast，需要处理很多细节：弹出位置、动画、自动消失、成功/失败状态、手动关闭、多个 Toast 的堆叠、不同颜色主题、操作按钮等。对于普通业务项目来说，这些都不是核心业务，却很容易消耗时间。

在 Next.js 项目中，我们可以使用 `sonner` 来快速实现漂亮、灵活、易扩展的 Toast 通知。如果项目已经使用了 `shadcn/ui`，也可以直接通过 shadcn 的方式添加 Sonner 组件。

## 一、Sonner 是什么？

Sonner 是一个用于 React / Next.js 项目的 Toast 通知库。它可以帮助我们快速实现各种通知效果，例如：

成功提示。
错误提示。
普通消息提示。
带描述的提示。
带操作按钮的提示。
带图标的提示。
自定义 JSX 内容。
Promise loading 状态提示。

相比自己手写 Toast，Sonner 的优势是开箱即用，样式好看，交互完整，并且可以很方便地和 Tailwind CSS、shadcn/ui 项目结合。

## 二、在 shadcn/ui 项目中添加 Sonner

如果你的项目使用的是 shadcn/ui，可以直接通过命令添加 Sonner：

```bash id="7qxe52"
npx shadcn@latest add sonner
```

执行完成后，项目的 `components/ui` 目录中会新增一个 `sonner` 相关文件。

一般路径类似：

```txt id="og88ya"
components/ui/sonner.tsx
```

需要注意，这里是 **add**，不是普通意义上的手动安装组件。shadcn/ui 的组件通常是通过命令添加到项目代码中的，添加后你可以直接修改源码。

## 三、在 layout 中注册 Toaster

Sonner 的 Toast 要能显示出来，首先需要在全局布局里放置 `Toaster` 组件。

例如在 `app/layout.tsx` 中：

```tsx id="zf4xhs"
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
```

`Toaster` 可以理解为 Toast 的容器。后面我们在任意客户端组件中调用 `toast()`，通知都会渲染到这个容器里。

如果没有在 layout 中加入 `Toaster`，你调用 `toast()` 时可能不会看到任何效果。

## 四、在 Client Component 中触发 Toast

接下来创建一个组件，比如 `SonnerDemo.tsx`。

因为 Toast 通常通过点击事件触发，而 Next.js App Router 默认是 Server Component，所以如果组件中有 `onClick` 这类交互，需要加上：

```tsx id="y3qzu5"
"use client";
```

最简单的 Toast 示例：

```tsx id="0lhxge"
"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function SonnerDemo() {
  return <Button onClick={() => toast("Hello React")}>Show Toast</Button>;
}
```

这里有一个容易混淆的点：

`Toaster` 是从项目里的 `@/components/ui/sonner` 引入。
`toast` 函数是从 `sonner` 包里引入。

也就是：

```tsx id="1nv27e"
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
```

一个负责渲染容器，一个负责触发通知。

## 五、修改 Toast 显示位置

默认情况下，Toast 可能出现在页面底部。如果你想修改 Toast 的显示位置，可以在 `Toaster` 上配置 `position`。

例如放到顶部居中：

```tsx id="tc5coa"
<Toaster position="top-center" />
```

也可以使用其他位置：

```tsx id="32get8"
<Toaster position="top-left" />
<Toaster position="top-right" />
<Toaster position="bottom-left" />
<Toaster position="bottom-right" />
<Toaster position="bottom-center" />
```

一般后台系统和交易类系统中，常见位置是 `top-center` 或 `top-right`。
如果是移动端体验较多，也可以考虑底部位置。

## 六、添加描述和操作按钮

Sonner 不只能显示一行文本，还可以添加描述和 action 按钮。

例如：

```tsx id="t65fcw"
toast("Event has been created", {
  description: "Sunday, December 03, 2023 at 9:00 AM",
  action: {
    label: "Undo",
    onClick: () => console.log("Undo"),
  },
});
```

这个 Toast 会显示一条主标题、一段描述，并带一个 `Undo` 按钮。

这种场景非常适合：

删除后撤销。
提交后查看详情。
保存成功后跳转页面。
通知用户某个操作已完成。

比如删除一条记录后：

```tsx id="llgbrq"
toast("删除成功", {
  description: "这条记录已经被删除",
  action: {
    label: "撤销",
    onClick: () => {
      console.log("执行撤销逻辑");
    },
  },
});
```

它的好处是：Toast 不只是提示，还可以承载轻量交互。

## 七、给 Toast 添加图标和持续时间

Sonner 也支持自定义图标和显示时长。

比如我们使用 `lucide-react` 的图标：

```tsx id="2n18k3"
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

toast("系统公告", {
  description: "平台将在今晚进行系统维护",
  icon: <Megaphone className="size-4" />,
  duration: 3000,
});
```

这里的 `duration: 3000` 表示 Toast 显示 3 秒后自动消失。

如果图标太大，可以用 Tailwind CSS 控制尺寸：

```tsx id="3kt9i7"
<Megaphone className="size-4" />
```

常见图标搭配：

成功：`CheckCircle`。
失败：`XCircle`。
公告：`Megaphone`。
警告：`AlertTriangle`。
加载：`Loader2`。

## 八、成功 Toast 和错误 Toast

Sonner 内置了常用状态方法，例如：

```tsx id="a3f46i"
toast.success("操作成功");
toast.error("操作失败");
```

完整示例：

```tsx id="ciwqm9"
"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ToastButtons() {
  return (
    <div className="flex gap-3">
      <Button onClick={() => toast("普通提示")}>Normal</Button>

      <Button onClick={() => toast.success("保存成功")}>Success</Button>

      <Button onClick={() => toast.error("提交失败")}>Error</Button>
    </div>
  );
}
```

这种写法在项目中非常实用。

例如登录成功：

```tsx id="j3k1f6"
toast.success("登录成功");
```

登录失败：

```tsx id="exh3i7"
toast.error("账号或密码错误");
```

表单提交成功：

```tsx id="pui9r0"
toast.success("提交成功");
```

接口异常：

```tsx id="q0kcvg"
toast.error(error.message || "请求失败");
```

## 九、开启 richColors，让状态更明显

默认的成功和错误 Toast 可能颜色差异不够明显。如果你希望成功是绿色、错误是红色，可以在 `Toaster` 上开启 `richColors`。

```tsx id="md1nrr"
<Toaster position="top-center" richColors />
```

开启后：

```tsx id="jd0dni"
toast.success("操作成功");
toast.error("操作失败");
```

成功和失败会有更明显的颜色区分。

这在真实业务里很重要，因为用户可以更快判断当前操作状态。

## 十、自定义 Toast 内容

Sonner 还支持直接传入 JSX，自定义整个 Toast 内容。

例如：

```tsx id="9vlhrc"
toast.custom(() => (
  <div className="rounded-lg border bg-background p-4 shadow-lg">
    <p className="font-medium">自定义通知</p>
    <p className="text-sm text-muted-foreground">你可以在这里放任意 JSX 内容</p>
    <a href="/profile" className="mt-2 inline-block text-sm text-primary">
      查看详情
    </a>
  </div>
));
```

这种方式适合更复杂的 Toast 场景，例如：

展示用户头像。
展示订单状态。
展示消息卡片。
放置跳转链接。
放置多个按钮。

不过需要注意，自定义 Toast 虽然灵活，但也不要过度使用。Toast 本质上是轻量提示，不适合承载太复杂的业务内容。

## 十一、Promise 和 Loading 场景

真实项目中，很多 Toast 都和异步请求绑定。例如提交表单、上传文件、保存配置、发起交易等。

Sonner 支持 Promise 风格的 Toast：

```tsx id="n8w0mu"
toast.promise(saveData(), {
  loading: "保存中...",
  success: "保存成功",
  error: "保存失败",
});
```

这样可以把 loading、success、error 三种状态统一交给 Sonner 管理。

例如：

```tsx id="ew2wik"
async function handleSubmit() {
  toast.promise(
    fetch("/api/save", {
      method: "POST",
    }),
    {
      loading: "正在提交...",
      success: "提交成功",
      error: "提交失败",
    },
  );
}
```

在交易系统、后台管理系统、表单系统中，这种写法非常方便。

## 十二、在 Next.js 中使用 Sonner 的注意点

在 Next.js App Router 中使用 Sonner，有几个点需要注意。

第一，触发 Toast 的组件必须是 Client Component。

如果你在组件中写了：

```tsx id="z3b3x2"
onClick={() => toast("Hello")}
```

那么文件顶部必须有：

```tsx id="3xv5r0"
"use client";
```

否则会出现类似“需要转换为 Client Component”的错误。

第二，`Toaster` 应该放在全局 layout 中。

这样无论在哪个页面触发 Toast，都能正常显示。

第三，`Toaster` 和 `toast` 的引入来源不同。

```tsx id="7gwp9n"
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
```

第四，如果使用 shadcn/ui，推荐使用项目内生成的 `Toaster` 组件，而不是直接从官方包中引入 Toaster。

这样可以更好地适配你的主题和样式。

## 十三、完整示例

下面是一个完整的 Sonner Demo 组件：

```tsx id="mvb9ld"
"use client";

import { Megaphone } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function SonnerDemo() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button onClick={() => toast("普通 Toast")}>普通提示</Button>

      <Button onClick={() => toast.success("操作成功")}>成功提示</Button>

      <Button onClick={() => toast.error("操作失败")}>错误提示</Button>

      <Button
        onClick={() =>
          toast("系统公告", {
            description: "平台将在今晚 23:00 进行系统维护",
            icon: <Megaphone className="size-4" />,
            duration: 3000,
            action: {
              label: "查看",
              onClick: () => console.log("查看公告"),
            },
          })
        }
      >
        带操作提示
      </Button>

      <Button
        onClick={() =>
          toast.custom(() => (
            <div className="rounded-lg border bg-background p-4 shadow-lg">
              <p className="font-medium">自定义 Toast</p>
              <p className="text-sm text-muted-foreground">
                这里可以放任意 JSX 内容
              </p>
              <a href="/help" className="text-sm text-primary">
                查看帮助
              </a>
            </div>
          ))
        }
      >
        自定义 Toast
      </Button>
    </div>
  );
}
```

同时在 layout 中：

```tsx id="j1t0m6"
import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
```

这样，一个基础但完整的 Toast 通知系统就完成了。

## 十四、总结

Sonner 是 Next.js / React 项目中非常好用的 Toast 通知方案。它可以帮助我们快速实现漂亮、灵活、交互完整的通知反馈。

在实际项目中，最常用的几个能力是：

普通提示：`toast()`。
成功提示：`toast.success()`。
错误提示：`toast.error()`。
异步状态：`toast.promise()`。
操作按钮：`action`。
自定义内容：`toast.custom()`。
全局配置：`<Toaster position="top-center" richColors />`。

对于表单提交、接口请求、登录注册、订单操作、交易反馈、系统公告等场景，Sonner 都非常适合。

如果你使用的是 Next.js + shadcn/ui，那么推荐直接通过 shadcn 添加 Sonner，然后在全局 layout 中注册 `Toaster`，在业务组件中调用 `toast`。这样可以用很少的代码，实现一个体验不错的通知系统。
