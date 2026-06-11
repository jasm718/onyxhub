# OnyxHub Agent

Windows 主机侧 Agent，主动连接 backend `/ws/agent`，执行 Windows 用户、RemoteApp、会话、存储隔离等主机操作。

## 构建

```powershell
go build -o .\build\tmp\onyxhub-agent.exe .\cmd\agent
```

构建安装包：

```powershell
.\build\build-installer.ps1
```

## 配置

默认读取：

```text
C:\Program Files\OnyxHub\Agent\agent.json
```

也可以通过 `ONYXHUB_AGENT_CONFIG` 指定配置路径。

## 控制台运行

```powershell
$env:ONYXHUB_AGENT_CONFIG="D:\code\onyxhub\agent\config.example.json"
go run .\cmd\agent
```

## 安装服务

以管理员身份执行，服务端地址默认 `127.0.0.1`，未填写端口时自动使用 `8080`：

安装器会自动完成服务安装、启动和日志初始化。
