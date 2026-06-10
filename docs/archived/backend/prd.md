# backend 后端服务

## 需求背景

OnyxHub 目前已有管理端前端页面，但页面数据仍为静态 mock。项目需要开始实现 backend，让管理员可以真实管理本地用户、RemoteApp 应用和用户授权关系，并为后续 client 与 agent 接入建立清晰接口边界。

OnyxHub 的最终目标是管理和分发运行于本机 Windows RemoteApp 环境中的应用。第一阶段需要先完成本机单节点 MVP：后台可以管理基础数据，client 可以按授权获取应用启动信息，agent 可以通过 WebSocket 上报主机状态和 Windows 用户连接会话。

## 解决方法

第一阶段实现一个独立 backend 服务，使用 Go + Gin + GORM + SQLite。

backend 提供三类入口：

- 管理后台 API：供管理员登录、管理用户、管理应用、管理授权、查看首页概览。
- client API：供普通用户登录、获取已授权应用、获取应用启动信息。
- agent WebSocket：供 agent 每秒上报主机状态和 Windows 用户连接会话快照，同时允许 backend 下发删除 Windows 用户指令。

设置模块、agent 端实现、真正启动或关闭 RemoteApp 不在本次范围内。

## 范围

本次做：

- 管理员账号密码登录和 JWT Bearer Token 认证。
- 本地用户表，管理员和普通用户共用，通过 `role=admin/user` 区分。
- 用户管理：列表、新增、修改、删除。
- 应用管理：列表、新增、修改、删除、启用、禁用、维护启动信息。
- 用户与应用的直接授权和取消授权。
- client 用户登录。
- client 获取已授权应用。
- client 获取应用启动信息。
- agent 通过 `/ws/agent` 每 1 秒上报主机状态和 Windows 用户连接会话快照。
- backend 根据 agent 快照维护真实连接会话状态。
- backend 根据会话开启/断开生成活动日志。
- 删除平台用户时，通过 agent 删除对应 Windows 用户。
- 首页 overview 聚合统计接口。
- 内部活动日志表，供 overview 最近活动使用。

本次不做：

- 设置模块。
- AD/LDAP/OAuth。
- 用户组或部门授权。
- 多 agent 调度。
- agent 端实现。
- 真正启动 RemoteApp。
- 主动关闭 RemoteApp。
- 应用级 session 统计。
- 授权到期时间和授权到期警告。
- 独立活动日志列表页。
- 独立 session REST API。

## 用户故事

1. 作为管理员，我想登录管理后台，以便安全管理系统数据。
2. 作为管理员，我想管理用户，以便控制谁可以使用平台。
3. 作为管理员，我想维护用户的 Windows 用户名，以便平台用户可以映射到真实 RemoteApp 连接用户。
4. 作为管理员，我想删除用户时同步删除 Windows 用户，以便平台用户和本机系统用户保持一致。
5. 作为管理员，我想管理 RemoteApp 应用，以便维护可发布的应用列表。
6. 作为管理员，我想维护应用启动路径、启动参数和工作目录，以便 client 可以获得启动器所需信息。
7. 作为管理员，我想给用户授权应用，以便用户只能看到允许使用的应用。
8. 作为管理员，我想查看首页概览，以便了解用户、应用、连接和最近活动状态。
9. 作为普通用户，我想登录 client，以便进入自己的应用列表。
10. 作为普通用户，我想查看已授权应用，以便选择要使用的 RemoteApp。
11. 作为普通用户，我想获取应用启动信息，以便 client 启动器可以发起连接。
12. 作为 agent，我想上报主机状态，以便 backend 能展示当前主机运行情况。
13. 作为 agent，我想上报当前活跃 Windows 用户连接会话，以便 backend 能判断连接开启和断开。
14. 作为 backend，我想向 agent 下发删除 Windows 用户指令，以便删除平台用户前完成本机用户删除。

## 实现方案

### 技术约束

- 后端使用 Go + Gin + GORM。
- 数据库使用 SQLite。
- 认证使用 JWT Bearer Token。
- 密码必须使用 bcrypt 哈希存储，禁止明文入库。
- 第一阶段数据库迁移使用 GORM AutoMigrate。
- `backend` 作为独立 Go module。
- 配置只从环境变量读取，缺少关键配置时启动失败。
- 数据库初始化时写入固定管理员账号：
  - 用户名：`admin`
  - 密码：`123456`
  - 角色：`admin`
  - 状态：`active`
- 固定管理员密码必须 bcrypt 哈希后写入数据库。
- 固定 `admin/123456` 只适合 MVP，不适合生产环境。
- HTTP API 只使用 `GET` 和 `POST`。
- 查询使用 `GET`。
- 新增、修改、删除、启用、禁用、授权、取消授权等动作使用 `POST`。
- API 不采用严格 RESTful 风格，使用动作式路径。
- API 返回统一格式：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

### 改动模块及接口

| 模块 | 改动类型 | 改动内容 |
| --- | --- | --- |
| `auth` | 新增 | 管理员和普通用户登录、JWT 签发与校验 |
| `users` | 新增 | 用户列表、新增、修改、删除，维护平台登录名和 Windows 用户名 |
| `applications` | 新增 | 应用列表、新增、修改、删除、启用、禁用、启动信息维护 |
| `authorizations` | 新增 | 用户与应用直接授权和取消授权 |
| `client` | 新增 | 获取授权应用、获取应用启动信息 |
| `agent_ws` | 新增 | `/ws/agent` 双向 WebSocket，接收状态快照并下发控制指令 |
| `overview` | 新增 | 首页统计卡片、连接趋势、最近活动 |
| `activity_logs` | 新增 | 内部活动日志表，不作为独立对外模块 |

```text
admin frontend
  -> /api/admin/*
      -> users / applications / authorizations / overview

client
  -> /api/client/*
      -> authorized applications / launch info

agent
  <-> /ws/agent
      -> host status snapshot
      -> session snapshot
      <- delete_windows_user command
      -> sessions table
      -> activity logs(仅会话开启/关闭)
```

`/ws/agent` 当前不认证，只适合本机单节点 MVP，不能暴露到不可信网络。

### 数据结构

#### `users`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 用户 ID |
| `username` | `string` | 平台登录名，唯一 |
| `displayName` | `string` | 展示名称 |
| `windowsUsername` | `string` | Windows 连接用户名，普通用户必填且唯一 |
| `passwordHash` | `string` | bcrypt 密码哈希 |
| `role` | `admin \| user` | 用户角色 |
| `status` | `active \| disabled` | 用户状态 |
| `lastLoginAt` | `datetime` | 最后登录时间 |
| `createdAt` | `datetime` | 创建时间 |
| `updatedAt` | `datetime` | 更新时间 |

约束：

- `username` 必须唯一。
- 普通用户必须填写 `windowsUsername`。
- `windowsUsername` 必须唯一。
- 管理员如果不用于 RemoteApp 连接，可以允许 `windowsUsername` 为空。

#### `applications`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 应用 ID |
| `name` | `string` | 应用名称 |
| `path` | `string` | 应用启动路径，唯一 |
| `arguments` | `string` | 启动参数 |
| `workingDir` | `string` | 工作目录 |
| `category` | `string` | 应用分类 |
| `status` | `active \| disabled` | 应用状态 |
| `createdAt` | `datetime` | 创建时间 |
| `updatedAt` | `datetime` | 更新时间 |

约束：

- `path` 必须唯一。
- `name` 不强制唯一。
- 删除应用只删除 OnyxHub 数据库中的应用记录和授权关系，不卸载 Windows 系统中的真实应用。

#### `user_app_authorizations`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 授权 ID |
| `userId` | `string` | 用户 ID |
| `applicationId` | `string` | 应用 ID |
| `createdAt` | `datetime` | 创建时间 |

约束：

- 同一 `userId + applicationId` 只能授权一次。
- 删除用户时同步删除该用户的授权关系。
- 删除应用时同步删除该应用的授权关系。
- 本阶段不支持授权过期时间。

#### `agent_status`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 固定单 agent 记录 ID |
| `hostname` | `string` | 主机名 |
| `cpuUsage` | `number` | CPU 使用率 |
| `memoryUsage` | `number` | 内存使用率 |
| `gpuUsage` | `number` | GPU 使用率 |
| `diskUsage` | `number` | 磁盘使用率 |
| `reportedAt` | `datetime` | 上报时间 |

#### `sessions`

session 只表示 Windows/RDS 用户连接会话，不表示用户打开了哪个应用。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 会话 ID |
| `remoteSessionId` | `string` | backend 生成的稳定会话标识 |
| `windowsSessionId` | `number` | Windows Session ID |
| `userId` | `string` | 平台用户 ID |
| `windowsUsername` | `string` | Windows 用户名 |
| `status` | `active \| closed` | 会话状态 |
| `connectedAt` | `datetime` | 连接开始时间 |
| `disconnectedAt` | `datetime` | 断开时间 |
| `lastSeenAt` | `datetime` | 最后一次在 agent 快照中出现的时间 |
| `createdAt` | `datetime` | 创建时间 |
| `updatedAt` | `datetime` | 更新时间 |

约束：

- `remoteSessionId` 由 backend 根据 `hostname + windowsSessionId + connectedAt` 生成。
- agent 快照只上报当前活跃连接。
- backend 根据“上次存在、本次完整快照不存在”判断连接断开。
- agent WebSocket 断开后不自动关闭 active session。
- session 不关联 `applicationId`。

#### `activity_logs`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `string` | 日志 ID |
| `type` | `string` | 日志类型 |
| `actorType` | `admin \| system` | 操作者类型 |
| `actorUserId` | `string` | 管理员用户 ID，可为空 |
| `targetType` | `string` | 目标类型 |
| `targetId` | `string` | 目标 ID |
| `message` | `string` | 展示文案 |
| `createdAt` | `datetime` | 创建时间 |

记录范围：

- 用户新增、修改、删除。
- 应用新增、修改、删除、启用、禁用。
- 授权、取消授权。
- 会话开启、断开。

不记录：

- 用户查询。
- 应用查询。
- agent 原始心跳。
- agent 原始主机状态上报。

### 代码/目录变动

```text
backend/
├── go.mod
├── cmd/
│   └── server/
│       └── main.go              # 服务入口
├── internal/
│   ├── config/                  # 环境变量配置读取
│   ├── db/                      # SQLite 初始化、AutoMigrate、固定 admin 初始化
│   ├── models/                  # GORM models
│   ├── auth/                    # JWT、bcrypt 密码哈希
│   ├── http/                    # Gin 路由、handler、中间件
│   ├── ws/                      # agent WebSocket、指令等待确认
│   └── service/                 # 业务逻辑
└── data/
    └── onyxhub.db               # 本地 SQLite 数据库
```

### API接口

#### 管理后台 API

| 接口名称 | 请求方法 | 路径 | 参数 | 返回值说明 |
| --- | --- | --- | --- | --- |
| 管理员登录 | `POST` | `/api/admin/auth/login` | `username`, `password` | 返回 JWT 和管理员信息 |
| 用户列表 | `GET` | `/api/admin/users` | 无 | 返回全部用户 |
| 新增用户 | `POST` | `/api/admin/users/create` | `username`, `displayName`, `windowsUsername`, `password`, `role`, `status` | 创建用户 |
| 修改用户 | `POST` | `/api/admin/users/update` | `id` 及可修改字段 | 修改用户 |
| 删除用户 | `POST` | `/api/admin/users/delete` | `id` | 删除 Windows 用户成功后删除平台用户 |
| 应用列表 | `GET` | `/api/admin/applications` | 无 | 返回全部应用 |
| 新增应用 | `POST` | `/api/admin/applications/create` | `name`, `path`, `arguments`, `workingDir`, `category`, `status` | 创建应用 |
| 修改应用 | `POST` | `/api/admin/applications/update` | `id` 及可修改字段 | 修改应用 |
| 删除应用 | `POST` | `/api/admin/applications/delete` | `id` | 删除数据库应用记录和授权关系 |
| 启用应用 | `POST` | `/api/admin/applications/enable` | `id` | 将应用状态改为 `active` |
| 禁用应用 | `POST` | `/api/admin/applications/disable` | `id` | 将应用状态改为 `disabled` |
| 授权列表 | `GET` | `/api/admin/authorizations` | 无 | 返回用户应用授权关系 |
| 授权应用 | `POST` | `/api/admin/authorizations/grant` | `userId`, `applicationId` | 给用户授权应用 |
| 取消授权 | `POST` | `/api/admin/authorizations/revoke` | `userId`, `applicationId` | 取消用户应用授权 |
| 首页概览 | `GET` | `/api/admin/overview` | 无 | 返回统计卡片、连接趋势、最近活动 |

用户删除流程：

1. 检查用户存在。
2. 检查用户没有 `active` session。
3. 检查 agent WebSocket 已连接。
4. 通过 `/ws/agent` 下发 `delete_windows_user` 指令。
5. 等待 agent 在 10 秒内返回成功。
6. 删除该用户的授权关系。
7. 删除平台用户。
8. 任一步失败直接返回错误，不删除平台用户。

#### client API

| 接口名称 | 请求方法 | 路径 | 参数 | 返回值说明 |
| --- | --- | --- | --- | --- |
| client 登录 | `POST` | `/api/client/auth/login` | `username`, `password` | 只允许 `role=user` 登录，返回 JWT 和用户信息 |
| 授权应用列表 | `GET` | `/api/client/applications` | 无 | 返回当前用户已授权且启用的应用 |
| 获取启动信息 | `GET` | `/api/client/applications/launch-info` | `applicationId` | 返回应用 `path`, `arguments`, `workingDir` |

#### agent WebSocket

| 接口名称 | 协议 | 路径 | 说明 |
| --- | --- | --- | --- |
| agent 双向连接 | `WS` | `/ws/agent` | agent 上报主机状态和 session 快照，backend 下发控制指令 |

agent 每 1 秒通过同一个 WebSocket 上报完整快照。

主机状态消息：

```json
{
  "type": "host_status",
  "reportedAt": "2026-06-09T12:00:00Z",
  "hostname": "ONYXHOST",
  "cpuUsage": 12.5,
  "memoryUsage": 48.2,
  "gpuUsage": 5.1,
  "diskUsage": 64.3
}
```

session 快照消息：

```json
{
  "type": "session_snapshot",
  "reportedAt": "2026-06-09T12:00:00Z",
  "sessions": [
    {
      "windowsSessionId": 12,
      "windowsUsername": "zhangsan",
      "connectedAt": "2026-06-09T11:58:30Z"
    }
  ]
}
```

删除 Windows 用户指令：

```json
{
  "type": "command",
  "commandId": "cmd_001",
  "name": "delete_windows_user",
  "payload": {
    "windowsUsername": "zhangsan"
  }
}
```

agent 指令响应：

```json
{
  "type": "command_result",
  "commandId": "cmd_001",
  "success": true,
  "message": "ok"
}
```

### 异常处理

| 场景 | 处理方式 | 用户提示 |
| --- | --- | --- |
| 登录账号不存在或密码错误 | 返回登录失败，不签发 token | 账号或密码错误 |
| 用户状态为 `disabled` | 禁止登录 | 用户已禁用 |
| 非 admin 调用 admin API | 返回无权限 | 无权限访问 |
| 创建用户时 `username` 重复 | 直接失败 | 用户名已存在 |
| 创建普通用户时缺少 `windowsUsername` | 直接失败 | Windows 用户名不能为空 |
| `windowsUsername` 重复 | 直接失败 | Windows 用户名已存在 |
| 删除用户时存在 active session | 直接失败，不下发 agent 指令 | 用户当前在线，无法删除 |
| 删除用户时 agent 未连接 | 直接失败 | agent 未连接，无法删除 Windows 用户 |
| 删除 Windows 用户指令超时 | 直接失败，不删除平台用户 | 删除 Windows 用户超时 |
| 删除 Windows 用户失败 | 直接失败，不删除平台用户 | 删除 Windows 用户失败 |
| 删除应用失败 | 直接失败，不删除授权关系 | 删除应用失败 |
| 创建应用时 `path` 重复 | 直接失败 | 应用路径已存在 |
| client 获取启动信息时应用未授权 | 直接失败 | 未授权访问该应用 |
| client 获取启动信息时应用已禁用 | 直接失败 | 应用已禁用 |
| agent WS 上报格式错误 | 丢弃该消息并记录错误日志 | 无 |
| session 快照中 `windowsUsername` 找不到用户 | 跳过该 session，记录错误日志 | 无 |
| session 快照缺少 `windowsSessionId/windowsUsername/connectedAt` | 跳过该 session，记录错误日志 | 无 |
| agent WS 断开 | 不自动关闭 active session，overview 显示 agent 离线 | agent 离线 |

## 低保真原型

本次是 backend 服务规划，不新增前端页面，低保真原型不适用。

## 备忘

- 当前 PRD 只规划 backend，不做前端接入。
- 设置模块明确排除在本次实现之外。
- `/ws/agent` 当前不认证，只适合本机单节点 MVP，后续进入生产前必须增加认证。
- 当前只支持单 agent，但数据结构和 WebSocket 模块命名保留后续扩展空间。
- session 只关注 Windows/RDS 用户连接，不关注用户打开了什么应用。
- 应用授权只用于 client 展示可启动应用和获取启动信息，不用于 session 识别。
- 删除用户会引入 backend 到 agent 的控制指令，因此后续实现时必须保证指令超时和失败时 failfast。
- 固定管理员账号 `admin/123456` 是 MVP 初始化策略，后续需要补充改密能力。
- 后续可以使用 `$refine` 对该 PRD 继续细化，再使用 `$to-task` 拆分开发任务。
