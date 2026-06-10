# OnyxHub Agent 端完整实现计划

## Summary

实现独立 Windows Agent，负责主机控制能力；backend 只保存业务状态并通过 WebSocket 下发命令。Agent 对齐 RichRemoteApp 的主机能力：系统上报、会话监控、Windows 用户管理、RemoteApp 注册、应用扫描、图标提取、RDP 环境准备、存储隔离、断开会话清理、安装初始化和卸载清理。

核心原则：

- Agent 主动连接 backend `/ws/agent`，长期运行靠自动重连，不假设单个连接永不断开。
- 所有主机操作 failfast：主机操作失败则业务操作失败，不写入半成功状态。
- 安装阶段只做主机级固定初始化；用户、应用、存储隔离等依赖业务配置的动作由 backend 下发命令执行。

## Key Changes

### 1. Agent 工程

在 `agent/` 新建 Go 工程，生成单独可执行文件。

Agent 运行形态：

- Windows Service 运行。
- 启动后读取配置：
  - `backendWebSocketUrl`
  - `agentToken`
  - `hostId`
  - `logDir`
  - `heartbeatIntervalSeconds`
- 主动连接 backend WebSocket。
- 断线后指数退避重连：`1s -> 2s -> 5s -> 10s -> 30s -> 60s`。
- 重连成功后立即上报完整主机状态和会话快照。

### 2. WebSocket 协议

保留现有 `/ws/agent`，扩展协议。

连接鉴权：

- Agent 连接时携带 token。
- backend 校验失败直接拒绝连接。
- 单 agent v1：新连接成功后关闭旧连接。

Agent 上报消息：

```json
{
  "type": "host_status",
  "reportedAt": "2026-06-10T12:00:00Z",
  "hostname": "HOST",
  "cpuUsage": 10.5,
  "memoryUsage": 45.2,
  "gpuUsage": 0,
  "diskUsage": 60.1
}
```

```json
{
  "type": "session_snapshot",
  "reportedAt": "2026-06-10T12:00:00Z",
  "sessions": [
    {
      "windowsSessionId": 2,
      "windowsUsername": "user1",
      "connectedAt": "2026-06-10T11:00:00Z",
      "state": "active"
    }
  ]
}
```

Backend 下发命令：

```json
{
  "type": "command",
  "commandId": "cmd_xxx",
  "name": "create_windows_user",
  "payload": {}
}
```

Agent 返回结果：

```json
{
  "type": "command_result",
  "commandId": "cmd_xxx",
  "success": true,
  "message": "",
  "data": {}
}
```

失败时：

```json
{
  "type": "command_result",
  "commandId": "cmd_xxx",
  "success": false,
  "message": "具体错误",
  "data": null
}
```

### 3. Agent 命令能力

实现以下命令，backend 只在成功后提交 DB 状态。

Windows 用户：

- `check_windows_user`
- `create_windows_user`
- `delete_windows_user`
- `set_windows_user_password`
- `ensure_windows_user_profile`
- `set_windows_user_home_directory`
- `clear_windows_user_home_directory`

应用与 RemoteApp：

- `scan_installed_apps`
- `fetch_application_icon`
- `register_remote_app`
- `unregister_remote_app`
- `list_remote_apps`
- `enable_unlisted_remote_apps`

RDP 与用户环境：

- `prepare_user_environment`
- `cleanup_user_environment`
- `sync_all_user_storage`
- `generate_rdp_launch_info` 由 backend 生成 RDP 内容时调用环境准备能力。

会话控制：

- `list_terminal_sessions`
- `logoff_terminal_session`
- `start_disconnected_session_cleanup`
- `stop_disconnected_session_cleanup`

系统初始化/清理：

- `install_initialize`
- `clear_disconnected_session_machine_policy`
- `apply_storage_isolation_settings`
- `clear_machine_storage_isolation_policies`
- `uninstall_cleanup`

### 4. Backend 改造

扩展 agent manager：

- 支持 token 鉴权。
- 支持通用 `SendCommand(ctx, name, payload)`。
- 支持命令结果 `data`。
- 命令超时默认 30 秒；存储隔离、批量同步、扫描类命令使用更长超时。

用户流程改造：

- 创建普通用户：
  1. 校验参数和唯一性。
  2. 调 agent 创建 Windows 用户。
  3. 调 agent 同步用户存储环境。
  4. 写入 DB。
- 修改密码：
  1. 调 agent 修改 Windows 密码。
  2. 写入 DB 密码哈希。
- 删除用户：
  1. 检查无在线 session。
  2. 调 agent 清理存储隔离。
  3. 调 agent 删除 Windows 用户。
  4. 删除授权关系和 DB 用户。

应用流程改造：

- 创建应用时可选注册 RemoteApp；注册失败则创建失败。
- 删除应用时若已注册，必须先取消注册成功，再删除 DB。
- 新增扫描已安装应用接口。
- 新增拉取应用图标能力。

设置流程改造：

- 新增系统设置模型与接口，支持：
  - `storageRootPath`
  - `storageQuotaMb`
  - `storageVisibleDriveLetter`
  - `rdpLocalDriveMappingEnabled`
  - `disconnectedSessionLogoffMinutes`
- 更新存储设置时，先由 agent 应用主机策略并同步用户，成功后写 DB。
- 更新断开会话超时时，backend 保存设置并通知 agent 重启清理轮询。

### 5. 安装初始化

Agent 安装包要求管理员权限。

安装阶段固定执行：

- 安装 agent Windows Service，设置自动启动和失败自动重启。
- 写入 agent 配置文件。
- 设置 RemoteApp 策略：
  - `HKLM\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services`
  - `fAllowUnlistedRemotePrograms=1`
- 清理断开会话机器策略：
  - 删除 `MaxDisconnectionTime`
  - 删除 `fResetBroken`
- 启动 agent 服务。

不在安装阶段执行：

- 不创建业务用户。
- 不注册业务应用。
- 不应用存储隔离。
- 不修改用户级注册表。
- 不配置 agent 入站防火墙；agent 主动连接 backend。

卸载阶段执行：

- 停止 agent 服务。
- 清理 agent 创建的计划任务。
- 清理机器级存储隔离策略。
- 清理 RemoteApp 安装策略。
- 卸载 agent 服务。
- 默认不删除业务 DB；如后续需要彻底卸载，单独提供 `uninstall_cleanup_final`。

### 6. 存储隔离策略

对齐 RichRemoteApp，迁移到 agent 执行。

配置校验：

- 存储根目录必须是本地固定磁盘。
- 必须是绝对路径。
- 不能是盘符根目录。
- 不能是系统保留目录。
- 文件系统必须是 NTFS。
- 可见盘符必须为 `H-Z`，且不能与存储根目录盘符相同。

机器级策略：

- 创建存储根目录。
- 开启 `fsutil quota track/enforce`。
- 设置根目录 ACL。
- 清理机器级 `NoDrives`、`NoViewOnDrive`。
- 隐藏 Quick Access 和 This PC 中非必要目录。

用户级策略：

- 创建用户 profile。
- 创建用户存储目录。
- 设置用户目录 ACL。
- 设置用户配额。
- 加载用户 hive，写入 Explorer 策略。
- 设置桌面/文档目录重定向。
- 创建登录计划任务挂载可见盘符。

### 7. RDP 启动

backend 提供客户端启动信息：

- RemoteApp 启动。
- 桌面会话启动。
- 支持用户名、应用路径、参数、工作目录、本地磁盘重定向开关。
- 若启用存储隔离，启动前调用 agent 准备用户环境。
- RDP 内容生成保留在 backend，主机环境准备放在 agent。

## Test Plan

Agent 单元测试：

- 配置解析失败直接报错。
- WebSocket 断线重连。
- command/result 匹配。
- PowerShell/命令执行错误提取。
- 路径、盘符、配额参数校验。

Backend 单元测试：

- agent 未连接时用户/应用主机操作失败。
- agent 命令失败时 DB 不写入。
- 创建用户、改密码、删用户流程顺序正确。
- 创建应用注册 RemoteApp 失败时整体失败。
- 存储设置应用失败时 DB 不更新。

Windows 集成测试：

- 安装 agent 服务后自动启动。
- `fAllowUnlistedRemotePrograms=1` 写入成功。
- 创建 Windows 用户并加入 `Remote Desktop Users`。
- 注册/取消注册 RemoteApp。
- 扫描安装应用。
- 提取 exe/lnk 图标。
- 创建用户存储目录、ACL、配额、计划任务。
- 断开会话超过配置时间后 logoff。

验收场景：

- backend 重启后 agent 自动重连。
- agent 重启后 backend 显示在线并恢复状态。
- 网络断开 5 分钟后恢复，agent 自动重连。
- 用户创建失败时系统无 DB 脏数据。
- RemoteApp 注册失败时应用不进入已发布状态。
- 删除用户时在线用户被拒绝，离线用户完整清理。

## Assumptions

- `plan.md` 写入位置为 `D:\code\onyxhub\plan.md`。
- v1 只支持单 agent，保留协议字段以便后续扩展多 agent。
- Agent 使用 Go 实现，与 backend 技术栈保持一致。
- Agent 不监听入站端口，因此不配置 agent 防火墙规则。
- 安装阶段只执行固定主机初始化，业务相关动作全部由 backend 下发命令。
- 所有主机操作失败均返回失败，不做静默降级或半成功写库。
