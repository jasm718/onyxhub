# OnyxHub Backend

独立后端服务，使用 Go + Gin + GORM + SQLite。

## 启动

先安装开发工具：

```powershell
cd backend
go install github.com/air-verse/air@v1.65.3
go install github.com/go-task/task/v3/cmd/task@v3.51.1
```

如果安装后提示找不到 `air` 或 `task`，确认 `$(go env GOPATH)\bin` 已加入 `PATH`。Windows 默认通常是：

```powershell
C:\Users\1\go\bin
```

开发环境推荐用 Task + Air，文件变更后会自动重新构建并重启：

```powershell
task dev
```

常用命令：

```powershell
task build
task run
task test
task tidy
task clean
```

Taskfile 默认使用以下配置，也可以在当前 shell 中设置同名环境变量覆盖：

```text
ONYXHUB_HTTP_ADDR=:8080
ONYXHUB_DB_PATH=data/onyxhub.db
ONYXHUB_JWT_SECRET=dev-secret-change-me
ONYXHUB_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

初始化数据库时会写入 MVP 固定管理员：

- 用户名：`admin`
- 密码：`123456`

## 接口入口

- 管理后台 API：`/api/admin/*`
- client API：`/api/client/*`
- agent WebSocket：`/ws/agent`
