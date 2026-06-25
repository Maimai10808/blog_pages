# 权限系统到底该怎么设计？从 Role 判断到 RBAC，再到 ABAC

在很多项目里，权限判断一开始都是这样写的：

```tsx id="e7m41p"
if (user.role === "admin") {
  return <DeleteButton />;
}
```

刚开始看起来没问题。

如果用户是管理员，就显示删除按钮。
如果不是管理员，就不显示。

但随着业务变复杂，这种写法很快就会失控。

比如：

- 管理员可以删除评论；
- Moderator 也可以删除评论；
- 用户可以删除自己的评论；
- 已发布内容不能删除；
- 被屏蔽用户不能查看某些内容；
- 被邀请用户可以编辑某个资源；
- 不同组织中的角色不同；
- 同一个用户可能有多个角色。

这时如果继续在组件里写一堆 `if`、`&&`、`||`，权限逻辑会散落在整个代码库中，后期维护会非常痛苦。

本文将系统梳理几种常见权限模型：

- 简单 Role 判断；
- RBAC，Role Based Access Control；
- 多角色系统；
- 组织级权限；
- 资源级权限；
- ABAC，Attribute Based Access Control。

---

## 一、最朴素的角色判断有什么问题？

假设页面里有一条评论，只有管理员可以删除：

```tsx id="esd816"
const canDelete = user.role === "admin";

return (
  <div>
    <p>{comment.body}</p>
    {canDelete && <button>Delete</button>}
  </div>
);
```

后来你增加了 Moderator 角色，Moderator 也可以删除评论：

```tsx id="k7sel5"
const canDelete = user.role === "admin" || user.role === "moderator";
```

再后来，你希望评论作者也能删除自己的评论：

```tsx id="kqur09"
const canDelete =
  user.role === "admin" ||
  user.role === "moderator" ||
  user.id === comment.authorId;
```

如果又增加“已锁定评论不能删除”：

```tsx id="ovnb8r"
const canDelete =
  !comment.locked &&
  (user.role === "admin" ||
    user.role === "moderator" ||
    user.id === comment.authorId);
```

这段代码已经开始变复杂了。

更严重的问题是：你可能不只在一个地方判断删除权限。

例如：

- UI 中控制是否显示删除按钮；
- Server Action 中真正执行删除；
- API Route 中处理删除请求；
- 管理后台中批量删除；
- 移动端接口中也要判断。

如果这些地方都手写权限判断，一旦业务规则改变，就要到处修改。

例如你想取消 Moderator 删除评论的权限，就必须找到所有：

```tsx id="vepe96"
user.role === "moderator";
```

然后逐一修改。

这很容易漏掉，也很容易造成安全问题。

---

## 二、权限系统的核心目标

一个好的权限系统，至少应该解决几个问题：

第一，权限规则应该集中管理，而不是散落在组件里。

第二，UI 判断和服务端真正执行操作时，应该使用同一套权限规则。

第三，修改某个角色的权限时，不应该改一堆业务代码。

第四，权限逻辑应该能表达“谁可以对什么资源做什么操作”。

第五，复杂场景下，还应该能判断资源属性，比如“是否作者本人”“是否已完成”“是否被邀请”。

---

## 三、RBAC：从角色判断升级到权限判断

RBAC 全称是 **Role Based Access Control**，即基于角色的访问控制。

它听起来仍然和角色有关，但重点不是到处写：

```tsx id="kyqov4"
user.role === "admin";
```

而是把角色和权限集中配置起来。

一般会把权限拆成两部分：

```txt id="lbyfxh"
action:resource
```

例如：

```txt id="ul3cmo"
view:comments
create:comments
update:comments
delete:comments
view:todos
update:todos
delete:todos
```

其中：

- `view`、`create`、`update`、`delete` 是 action；
- `comments`、`todos` 是 resource。

---

## 四、基础 RBAC 示例

可以创建一个权限配置文件：

```ts id="yyzuvl"
// auth/permissions.ts

export const roles = {
  admin: [
    "view:comments",
    "create:comments",
    "update:comments",
    "delete:comments",
  ],
  moderator: ["view:comments", "update:comments", "delete:comments"],
  user: [
    "view:comments",
    "create:comments",
    "update:own-comments",
    "delete:own-comments",
  ],
} as const;

export type Role = keyof typeof roles;
export type Permission = (typeof roles)[Role][number];

export type User = {
  id: string;
  role: Role;
};
```

然后写一个统一的权限判断函数：

```ts id="ju1o2l"
// auth/has-permission.ts

import { roles, type Permission, type User } from "./permissions";

export function hasPermission(user: User, permission: Permission) {
  return roles[user.role].includes(permission);
}
```

使用时就不再直接判断角色，而是判断权限：

```tsx id="rcp9qw"
const canDelete = hasPermission(user, "delete:comments");
```

这样做的好处是：

如果以后 Moderator 不允许删除评论，只需要改配置：

```ts id="n3mxkw"
moderator: ["view:comments", "update:comments"];
```

所有调用：

```tsx id="uzfl2a"
hasPermission(user, "delete:comments");
```

的地方都会自动生效。

---

## 五、RBAC 比直接判断 role 好在哪里？

直接判断角色时，业务代码里会出现大量这样的逻辑：

```tsx id="v0h5ci"
user.role === "admin" || user.role === "moderator";
```

而使用 RBAC 后，业务代码只关心：

```tsx id="9jx351"
hasPermission(user, "delete:comments");
```

这带来几个明显好处：

### 1. 权限规则集中

所有角色能做什么，都在一个文件里。

### 2. 修改权限更简单

改角色配置，不用改业务组件。

### 3. 语义更清晰

`delete:comments` 比 `user.role === "admin"` 更能表达业务含义。

### 4. UI 和服务端可以复用同一套判断

按钮显示和服务端删除操作都可以调用 `hasPermission`。

---

## 六、RBAC 的局限：资源属性不好处理

RBAC 适合处理“某个角色能不能做某件事”。

但它不擅长处理“某个用户能不能操作某个具体资源”。

比如：

```txt id="zer68q"
用户可以删除自己的评论
```

这就不只是角色问题，还要看：

```txt id="gijj1k"
user.id 是否等于 comment.authorId
```

你可以勉强扩展权限：

```ts id="f3hklm"
user: ["view:comments", "create:comments", "delete:own-comments"];
```

然后业务中这样判断：

```tsx id="ggr54f"
const canDelete =
  hasPermission(user, "delete:comments") ||
  (hasPermission(user, "delete:own-comments") && user.id === comment.authorId);
```

这能用，但问题又开始出现：

- 业务代码重新变复杂；
- `own` 这类规则越来越多；
- 如果还要判断状态、组织、邀请关系，会继续膨胀。

例如：

```txt id="0vhpqr"
用户只能删除自己创建的、已完成的、没有被锁定的 todo
```

如果继续靠 RBAC 硬拼，会变得非常难维护。

---

## 七、多角色系统：一个用户不一定只有一个角色

实际业务中，用户经常不止一个角色。

例如：

```txt id="54gq5z"
用户 A 同时是 user 和 moderator
用户 B 同时是 admin 和 billing-manager
用户 C 在内容系统里是 editor，在客服系统里是 agent
```

所以用户模型最好一开始就支持多个角色：

```ts id="ub249l"
export type User = {
  id: string;
  roles: Role[];
};
```

权限判断也要从单个 role 改成多个 roles：

```ts id="d6craj"
export function hasPermission(user: User, permission: Permission) {
  return user.roles.some((role) => {
    return roles[role].includes(permission);
  });
}
```

这样只要用户任意一个角色拥有权限，就认为通过。

即使你的项目当前只给每个用户一个角色，也建议数据结构上保留多角色能力，因为扩展成本很低，但未来会更灵活。

---

## 八、组织级权限：同一个用户在不同组织里角色不同

如果你做的是团队协作类应用，就会遇到组织权限。

例如：

- Slack；
- Notion；
- Linear；
- GitHub Organization；
- 多租户 SaaS；
- 企业后台。

同一个用户可能在不同组织里有不同角色：

```txt id="cmdmre"
用户 Lee 在组织 A 是 admin
用户 Lee 在组织 B 是 member
用户 Lee 在组织 C 是 billing-manager
```

这时用户和角色之间不能只是简单关系，而要引入组织。

数据库结构通常类似：

```txt id="v33lyi"
users
roles
organizations
user_organization_roles
```

`user_organization_roles` 这张表用来表达：

```txt id="j3hysp"
某个用户，在某个组织中，拥有某个角色
```

例如：

```txt id="qy1u98"
user_id | organization_id | role
1       | org_a           | admin
1       | org_b           | member
2       | org_a           | moderator
```

权限判断时，就不能只问：

```txt id="6x0az7"
这个用户是不是 admin？
```

而应该问：

```txt id="h4sggn"
这个用户在当前组织里是不是 admin？
```

也就是：

```ts id="fdv9r7"
hasPermission(user, organization, "delete:comments");
```

---

## 九、资源级权限：Google Drive 类场景

还有一种更复杂的权限场景：资源级权限。

典型例子是 Google Drive。

你在整个组织里可能只是普通成员，但某个文件别人单独分享给了你，并给你 editor 权限。

这时权限不是只挂在组织上，而是挂在具体资源上。

例如：

```txt id="hsvdfx"
用户 A 对 file_1 是 owner
用户 B 对 file_1 是 editor
用户 C 对 file_1 是 viewer
用户 B 对 file_2 没有权限
```

这类系统通常需要一张资源权限表：

```txt id="89nclm"
resource_permissions
```

可能包含：

```txt id="z7tdvw"
user_id
resource_type
resource_id
role
```

例如：

```txt id="nxff4w"
user_id | resource_type | resource_id | role
1       | file          | file_123     | owner
2       | file          | file_123     | editor
3       | folder        | folder_456   | viewer
```

这样就可以表达：

```txt id="utzl45"
某个用户对某个具体资源拥有什么权限
```

但这种系统会明显复杂很多，尤其当资源类型很多时，比如：

- 文件；
- 文件夹；
- 文档；
- 评论；
- 项目；
- 任务；
- 看板；
- 数据报表。

这时如果每种资源都单独设计一套权限表，会变得非常混乱。

---

## 十、ABAC：基于属性的访问控制

当 RBAC 不够灵活时，可以使用 ABAC。

ABAC 全称是 **Attribute Based Access Control**，基于属性的访问控制。

它的核心思想是：

权限判断不只看角色，而是同时看多个对象的属性。

一次 ABAC 判断通常包含四个部分：

```txt id="189db0"
subject  主体：谁要做这件事，通常是 user
action   动作：要做什么，比如 view、create、update、delete
resource 资源：对什么东西操作，比如 comment、todo、file
context  上下文：额外信息，比如组织、环境、设备、时间等
```

举例：

```txt id="do9uv6"
用户 Lee 是否可以 delete 这个 todo？
```

ABAC 会看：

```txt id="y9zl16"
subject: 当前用户 Lee
action: delete
resource: 这个 todo
context: 当前组织、邀请关系、请求环境等
```

然后根据规则判断。

---

## 十一、ABAC 能表达什么复杂规则？

ABAC 可以表达 RBAC 很难优雅表达的规则。

例如：

```txt id="vabju8"
管理员可以做任何操作
Moderator 可以删除已完成的 todo
普通用户可以更新自己创建的 todo
普通用户可以更新被邀请参与的 todo
用户不能查看屏蔽自己的人的内容
已完成的 todo 才允许删除
被邀请用户可以编辑特定资源
```

这些规则都依赖资源属性。

比如：

```txt id="8yabc1"
todo.userId
todo.completed
todo.invitedUsers
comment.authorId
user.blockedBy
```

ABAC 的优势就是可以把这些判断统一写进权限配置，而不是散落在业务代码里。

---

## 十二、ABAC 权限配置示例

先定义一些类型：

```ts id="eeyvnt"
type Role = "admin" | "moderator" | "user";

type User = {
  id: string;
  roles: Role[];
  blockedBy: string[];
};

type Comment = {
  id: string;
  body: string;
  authorId: string;
  createdAt: Date;
};

type Todo = {
  id: string;
  title: string;
  userId: string;
  completed: boolean;
  invitedUsers: string[];
};
```

然后定义权限配置：

```ts id="caeglv"
type PermissionCheck<Resource> =
  | boolean
  | ((user: User, resource: Resource) => boolean);

type Permissions = {
  comments: {
    view?: PermissionCheck<Comment>;
    create?: PermissionCheck<Comment>;
    update?: PermissionCheck<Comment>;
  };
  todos: {
    view?: PermissionCheck<Todo>;
    create?: PermissionCheck<Todo>;
    update?: PermissionCheck<Todo>;
    delete?: PermissionCheck<Todo>;
  };
};
```

每个角色对应一组规则：

```ts id="aajm5l"
const rolePermissions: Record<Role, Permissions> = {
  admin: {
    comments: {
      view: true,
      create: true,
      update: true,
    },
    todos: {
      view: true,
      create: true,
      update: true,
      delete: true,
    },
  },

  moderator: {
    comments: {
      view: true,
      create: true,
      update: true,
    },
    todos: {
      view: true,
      create: true,
      update: true,
      delete: (user, todo) => todo.completed,
    },
  },

  user: {
    comments: {
      view: (user, comment) => {
        return !user.blockedBy.includes(comment.authorId);
      },
      create: true,
      update: (user, comment) => {
        return comment.authorId === user.id;
      },
    },
    todos: {
      view: (user, todo) => {
        return !user.blockedBy.includes(todo.userId);
      },
      create: true,
      update: (user, todo) => {
        return todo.userId === user.id || todo.invitedUsers.includes(user.id);
      },
      delete: (user, todo) => {
        return (
          todo.completed &&
          (todo.userId === user.id || todo.invitedUsers.includes(user.id))
        );
      },
    },
  },
};
```

这就是 ABAC 的关键：

权限规则不再只是 `true/false`，也可以是一个函数。
这个函数可以根据 user 和 resource 的属性决定是否允许操作。

---

## 十三、实现 `hasPermission`

接下来写一个通用判断函数：

```ts id="xxb5ax"
type ResourceMap = {
  comments: Comment;
  todos: Todo;
};

type ActionMap = {
  comments: "view" | "create" | "update";
  todos: "view" | "create" | "update" | "delete";
};

export function hasPermission<Resource extends keyof ResourceMap>(
  user: User,
  resource: Resource,
  action: ActionMap[Resource],
  data?: ResourceMap[Resource],
) {
  return user.roles.some((role) => {
    const permission = rolePermissions[role]?.[resource]?.[action as never];

    if (permission == null) {
      return false;
    }

    if (typeof permission === "boolean") {
      return permission;
    }

    if (data == null) {
      return false;
    }

    return permission(user, data as never);
  });
}
```

使用时可以这样判断通用权限：

```ts id="svg45u"
hasPermission(user, "todos", "create");
```

也可以判断某个具体资源：

```ts id="ehzldl"
hasPermission(user, "todos", "delete", todo);
```

如果不传具体 todo，就表示“是否可以删除所有 todo”。
如果传了具体 todo，就表示“是否可以删除这个 todo”。

---

## 十四、ABAC 使用示例

假设有一个 todo：

```ts id="hj6p0h"
const todo = {
  id: "1",
  title: "Write article",
  userId: "user_1",
  completed: true,
  invitedUsers: ["user_3"],
};
```

当前用户：

```ts id="x6ti1w"
const user = {
  id: "user_3",
  roles: ["user"],
  blockedBy: [],
};
```

判断是否可以更新：

```ts id="9o3ztc"
const canUpdate = hasPermission(user, "todos", "update", todo);
```

因为 `user_3` 在 `invitedUsers` 中，所以可以更新。

判断是否可以删除：

```ts id="1mgbbj"
const canDelete = hasPermission(user, "todos", "delete", todo);
```

因为这个 todo 已完成，并且用户被邀请，所以可以删除。

如果 `completed` 是 `false`，则不能删除。

---

## 十五、ABAC 相比 RBAC 的优势

RBAC 适合回答：

```txt id="xkxqie"
这个角色能不能做这个动作？
```

ABAC 适合回答：

```txt id="d5la8x"
这个用户，在当前上下文下，能不能对这个具体资源做这个动作？
```

RBAC 更简单，适合很多中小项目。

ABAC 更灵活，适合复杂权限系统。

例如：

```txt id="n8d2hm"
RBAC：moderator 可以 delete:comments
ABAC：moderator 只能删除未锁定、未归档、未被举报处理中的评论
```

后者显然不能只靠简单角色判断优雅完成。

---

## 十六、权限判断应该在哪里做？

权限判断不要只做在 UI。

例如：

```tsx id="dmgpcd"
{
  canDelete && <DeleteButton />;
}
```

这只能隐藏按钮，不能真正保证安全。

真正的权限判断必须在服务端执行，例如：

- Server Action；
- API Route；
- Data Access Layer；
- 数据库查询条件；
- 后端服务。

UI 判断只是为了用户体验。
服务端判断才是安全边界。

例如：

```ts id="wxzxtx"
export async function deleteTodoAction(todoId: string) {
  const user = await getCurrentUser();
  const todo = await getTodoById(todoId);

  if (!hasPermission(user, "todos", "delete", todo)) {
    throw new Error("Forbidden");
  }

  await deleteTodo(todoId);
}
```

---

## 十七、和 Data Access Layer 结合

权限系统最好和 Data Access Layer 结合使用。

例如：

```ts id="iycvd4"
export async function deleteTodo(user: User, todoId: string) {
  const todo = await db.query.todos.findFirst({
    where: eq(todos.id, todoId),
  });

  if (!todo) {
    return {
      success: false,
      error: "NOT_FOUND",
    };
  }

  if (!hasPermission(user, "todos", "delete", todo)) {
    return {
      success: false,
      error: "NO_ACCESS",
    };
  }

  await db.delete(todos).where(eq(todos.id, todoId));

  return {
    success: true,
  };
}
```

这样可以保证所有删除 todo 的入口都走同一套权限判断。

---

## 十八、认证系统和权限系统的关系

认证和权限不是同一件事。

认证解决的是：

```txt id="oc2iwn"
你是谁？
```

权限解决的是：

```txt id="34cr8b"
你能做什么？
```

登录系统、Session、JWT、OAuth、Clerk、NextAuth 等，主要负责认证。

而 RBAC、ABAC、组织角色、资源权限，负责授权。

所以不要把权限逻辑完全塞进认证服务里。

更推荐的方式是：

```txt id="ys32c2"
认证服务提供 userId、roles、organizationId
应用自己的权限系统决定能不能操作资源
```

认证系统可以存储角色或组织信息，但真正的业务权限判断最好仍然由应用侧掌控。

---

## 十九、如果使用 Clerk，角色可以放在哪里？

在使用 Clerk 这类认证服务时，可以把角色信息放到用户 metadata 或 session claims 中。

例如用户的 public metadata：

```json id="hhzxdr"
{
  "roles": ["user", "admin"]
}
```

然后在服务端获取：

```ts id="oic7cg"
const { userId, sessionClaims } = auth();

const user = {
  id: userId,
  roles: sessionClaims.roles,
  blockedBy: [],
};
```

这样就可以把认证系统里的用户信息转换成权限系统需要的 user 对象。

但要注意：
像 `blockedBy`、`invitedUsers`、资源所有者等业务数据，通常应该从数据库中读取，而不是全部塞进认证 token。

---

## 二十、组织权限和 Clerk Organizations

如果使用 Clerk Organizations，可以利用它管理组织、成员和组织角色。

典型流程是：

```txt id="mimchq"
用户登录
选择当前组织
读取当前组织中的角色
应用权限系统判断该角色能做什么
```

例如：

```ts id="m98q7o"
const user = {
  id: userId,
  roles: currentOrganizationRoles,
};
```

然后继续调用：

```ts id="1n4d6u"
hasPermission(user, "todos", "delete", todo);
```

组织系统负责“这个用户在这个组织中是什么角色”。
权限系统负责“这个角色对这个资源能做什么”。

---

## 二十一、数据库设计思路

### 1. 简单角色

```txt id="d4l4wf"
users
  id
  role
```

适合很小的项目。

---

### 2. 多角色

```txt id="ngk89n"
users
roles
user_roles
```

一个用户可以有多个角色。

---

### 3. 角色权限

```txt id="1wzb07"
roles
permissions
role_permissions
```

一个角色拥有多个权限，一个权限也可以属于多个角色。

---

### 4. 组织角色

```txt id="dwu6t2"
users
organizations
roles
organization_user_roles
```

表达“用户在某个组织中拥有什么角色”。

---

### 5. 资源级角色

```txt id="5wsh9j"
users
resources
roles
resource_user_roles
```

表达“用户对某个具体资源拥有什么角色”。

如果资源类型很多，可以使用：

```txt id="dt5j3j"
resource_type
resource_id
```

来做泛化设计。

---

## 二十二、什么时候用哪种权限系统？

### 1. 简单 role 判断

适合：

- 练习项目；
- 只有 admin/user 两种角色；
- 权限点很少；
- 没有复杂资源规则。

但不建议长期使用。

---

### 2. RBAC

适合：

- 大多数后台系统；
- SaaS 基础权限；
- 角色和权限比较清晰；
- 权限主要取决于用户角色；
- 不太依赖资源属性。

例如：

```txt id="5ae3b1"
admin 可以管理用户
editor 可以编辑文章
viewer 只能查看
```

---

### 3. 多角色 RBAC

适合：

- 一个用户可能承担多个职责；
- 企业内部系统；
- 内容系统；
- 管理后台。

例如：

```txt id="buyik3"
用户同时是 editor 和 billing-manager
```

---

### 4. 组织级 RBAC

适合：

- 多租户 SaaS；
- 团队协作应用；
- 企业工作台；
- 项目管理工具。

例如：

```txt id="hil71a"
用户在 A 团队是 admin，在 B 团队是 member
```

---

### 5. 资源级权限

适合：

- Google Drive 类文件共享；
- Notion 类协作文档；
- 项目管理工具；
- 细粒度资源分享。

例如：

```txt id="50o27o"
用户对文档 A 是 editor，对文档 B 是 viewer
```

---

### 6. ABAC

适合：

- 权限依赖资源属性；
- 权限规则复杂；
- 有邀请、屏蔽、所有者、状态判断；
- 希望权限逻辑集中在配置中；
- 需要表达非常细粒度的规则。

例如：

```txt id="l4cia3"
用户只能删除自己创建且已完成的 todo
用户不能查看屏蔽自己的用户发布的评论
被邀请用户可以编辑指定资源
Moderator 可以绕过屏蔽限制
```

---

## 二十三、不要为了高级而高级

ABAC 很强，但不一定所有项目都需要。

如果你的系统只是：

```txt id="80ghtu"
admin 可以管理所有内容
user 只能管理自己的内容
```

那么 RBAC 加少量 owner 判断可能就够了。

如果你的项目一开始就上复杂 ABAC，可能会增加理解成本。

更现实的演进方式是：

```txt id="6gsi8c"
简单 role 判断
      ↓
RBAC
      ↓
多角色 RBAC
      ↓
组织级 RBAC
      ↓
资源级权限 / ABAC
```

权限系统应该随着业务复杂度升级，而不是一开始就过度设计。

---

## 二十四、最佳实践总结

### 1. 不要到处写 `user.role === "admin"`

这种写法维护成本高，也容易漏权限判断。

### 2. 把权限抽象成 action + resource

例如：

```txt id="em9pu0"
delete:comments
update:todos
view:users
```

### 3. 用 `hasPermission` 统一判断

业务代码应该调用统一函数，而不是手写角色判断。

### 4. 一个用户最好支持多个角色

即使现在只用一个角色，也建议结构上支持数组。

### 5. UI 和服务端都要判断权限

隐藏按钮不是安全措施。
真正的权限校验必须在服务端。

### 6. 复杂资源规则使用 ABAC

如果权限依赖资源属性，就不要硬塞进 RBAC。

### 7. 组织权限要带上 organization context

同一个用户在不同组织中可能权限不同。

### 8. 资源级分享要单独建模

Google Drive 类场景不能只靠全局角色解决。

### 9. 权限系统和认证系统要分清

认证负责“你是谁”，权限负责“你能做什么”。

---

## 二十五、结论

权限系统最容易犯的错误，就是一开始到处写：

```tsx id="iv6qrw"
user.role === "admin";
```

这种写法短期最快，但长期最难维护。

更好的方式是把权限逻辑集中起来，从“判断角色”转向“判断权限”。

对于简单项目，RBAC 已经足够好：

```tsx id="wswx49"
hasPermission(user, "delete:comments");
```

对于复杂项目，尤其是权限依赖资源属性时，可以使用 ABAC：

```tsx id="mlbyii"
hasPermission(user, "todos", "delete", todo);
```

这样权限规则既集中，又能表达复杂业务。

一句话总结：

**简单系统用 RBAC，复杂资源规则用 ABAC；UI 可以隐藏按钮，但服务端必须真正校验权限。**
