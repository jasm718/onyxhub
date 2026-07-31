# OnyxHub

OnyxHub 是一个面向 Windows RemoteApp 的应用虚拟化平台。管理员通过 Web 管理端维护用户、应用和授权；Windows Agent 负责主机信息上报、Windows 用户和 RemoteApp 管理；普通用户通过 Qt 客户端登录并启动已授权应用。

本文档以 **Windows 10/11 x64 + PowerShell 7** 为基准，覆盖从全新电脑拉取代码到启动完整开发环境的全部步骤。

## 项目组成

| 目录 | 技术栈 | 默认入口 | 作用 |
| --- | --- | --- | --- |
| `backend` | Go、Gin、GORM、SQLite | `http://127.0.0.1:8080` | API、认证、数据库、Agent WebSocket |
| `frontend` | Next.js、React、TypeScript、pnpm | `http://localhost:3000` | 管理后台 |
| `agent` | Go、Windows Service | `ws://127.0.0.1:8080/ws/agent` | Windows 主机控制和状态上报 |
| `client` | Qt 6、C++17、QML、C# ActiveX | 桌面程序 | 普通用户登录并启动 RemoteApp |

完整开发链路：

```text
frontend :3000 ----HTTP----> backend :8080 <----WebSocket---- agent
                                ^                              |
                                |                              |
                         HTTP   |                        Windows/RemoteApp
                                |                              |
                              client --------RDP :3389---------+
```

## 最快启动

只开发管理后台时，启动 `backend + frontend` 即可。需要主机指标、扫描应用、创建 Windows 用户或启动 RemoteApp 时，还必须启动 `agent`。需要验证普通用户启动应用时，再构建并启动 `client`。

首次搭建建议按以下顺序执行：

1. 安装基础工具。
2. 拉取仓库和 FluentUI。
3. 下载 Go 与前端依赖。
4. 启动 backend。
5. 启动 agent。
6. 启动 frontend。
7. 按需构建 client。

## 环境要求

### 基础工具

| 工具 | 推荐版本 | 说明 |
| --- | --- | --- |
| Git | 2.47 或更高 | 拉取代码 |
| PowerShell | 7.x | 本文命令使用 PowerShell 语法 |
| Go | 1.26.3 | `backend/go.mod` 和 `agent/go.mod` 指定版本 |
| Node.js | 24 LTS | pnpm 11 要求 Node.js 22.13 或更高 |
| pnpm | 11.18.0 | 通过 Corepack 使用 |
| CMake | 3.20 或更高 | 构建 Qt 客户端 |

可以使用 `winget` 安装常用工具：

```powershell
winget install --id Git.Git -e
winget install --id Microsoft.PowerShell -e
winget install --id GoLang.Go -e
winget install --id OpenJS.NodeJS.LTS -e
winget install --id Kitware.CMake -e
```

安装完成后重新打开 PowerShell，检查版本：

```powershell
git --version
pwsh --version
go version
node --version
cmake --version
```

初始化 pnpm：

```powershell
corepack enable
corepack prepare pnpm@11.18.0 --activate
pnpm --version
```

### Qt 客户端工具

只有开发 `client` 时需要安装：

- Visual Studio 2022 Build Tools。
- `Desktop development with C++` 工作负载。
- MSVC v143 x64/x86 编译工具。
- Windows 10/11 SDK。
- Qt 6.8.2 `MSVC 2022 64-bit`。
- Qt Additional Libraries 中的 `Qt 5 Compatibility Module` 和 `Qt Shader Tools`。
- .NET Framework 4.x C# 编译器。构建脚本会查找 `C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe`。

Qt 默认安装路径应为：

```text
C:\Qt\6.8.2\msvc2022_64
```

使用其他路径时，通过客户端构建脚本的 `-QtPrefix` 参数指定。

### Agent 安装包工具

只有生成 Agent 安装包时需要安装 Inno Setup 6。普通开发和控制台运行 Agent 不需要。

## 拉取代码

```powershell
Set-Location D:\code
git clone https://github.com/jasm718/onyxhub.git
Set-Location .\onyxhub
```

### 准备 FluentUI

`client/third_party/FluentUI` 当前在 Git 中记录为 gitlink，但仓库暂未提供 `.gitmodules`，因此新电脑上不要直接执行 `git submodule update`。请手动拉取并切换到项目固定提交：

```powershell
git clone https://github.com/zhuzichu520/FluentUI.git .\client\third_party\FluentUI
git -C .\client\third_party\FluentUI checkout 4e4016ae3fed7d1a3534760b44313e8fb0b8fd29
```

确认版本：

```powershell
git -C .\client\third_party\FluentUI describe --tags --always
```

预期输出为 `1.7.7`。

### 下载项目依赖

```powershell
Push-Location .\backend
go mod download
Pop-Location

Push-Location .\agent
go mod download
Pop-Location

Push-Location .\frontend
pnpm install --frozen-lockfile
Pop-Location
```

安装 backend 开发工具：

```powershell
go install github.com/air-verse/air@v1.65.3
go install github.com/go-task/task/v3/cmd/task@v3.51.1
$env:Path += ";$(go env GOPATH)\bin"
```

检查工具：

```powershell
air -v
task --version
```

如需永久加入 PATH，将 `$(go env GOPATH)\bin` 添加到 Windows 用户环境变量 `Path`。

## 启动 backend

打开第一个 PowerShell：

```powershell
Set-Location D:\code\onyxhub\backend
task dev
```

`task dev` 使用 Air 监听 Go 文件，修改代码后自动重新编译和启动。

默认配置：

```text
ONYXHUB_HTTP_ADDR=:8080
ONYXHUB_DB_PATH=data/onyxhub.db
ONYXHUB_JWT_SECRET=dev-secret-change-me
ONYXHUB_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

不使用 Task 时，可以直接运行：

```powershell
Set-Location D:\code\onyxhub\backend
$env:ONYXHUB_HTTP_ADDR=":8080"
$env:ONYXHUB_DB_PATH="data/onyxhub.db"
$env:ONYXHUB_JWT_SECRET="dev-secret-change-me"
$env:ONYXHUB_CORS_ALLOWED_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
go run .\cmd\server
```

首次启动会自动创建并迁移 SQLite 数据库：

```text
backend/data/onyxhub.db
```

开发环境初始管理员：

```text
用户名：admin
密码：123456
```

看到以下日志表示 backend 已启动：

```text
OnyxHub backend listening on :8080
```

## 启动 Agent

Agent 仅支持 Windows。完整功能涉及 Windows 用户、服务、注册表、会话和 RemoteApp，建议使用“以管理员身份运行”的 PowerShell。

打开第二个 PowerShell：

```powershell
Set-Location D:\code\onyxhub\agent
New-Item -ItemType Directory -Force .\build\tmp | Out-Null
go build -o .\build\tmp\onyxhub-agent.exe .\cmd\agent
$env:ONYXHUB_AGENT_CONFIG=(Resolve-Path .\config.example.json).Path
.\build\tmp\onyxhub-agent.exe
```

开发配置文件内容：

```json
{
  "backendWebSocketUrl": "ws://127.0.0.1:8080/ws/agent",
  "heartbeatIntervalSeconds": 3
}
```

也可以使用环境变量覆盖配置：

```powershell
$env:ONYXHUB_BACKEND_WS_URL="ws://127.0.0.1:8080/ws/agent"
$env:ONYXHUB_AGENT_HEARTBEAT_SECONDS="3"
```

控制台开发模式下，运行日志位于可执行文件旁的 `Logs` 目录：

```text
agent/build/tmp/Logs
```

### 构建 Agent 安装包

安装 Inno Setup 6 后执行：

```powershell
Set-Location D:\code\onyxhub\agent
.\build\build-installer.ps1 -AppVersion "1.0.0"
```

输出：

```text
agent/build/dist/OnyxHubAgentSetup-windows-x64.exe
agent/build/dist/OnyxHubAgentSetup-windows-x64.exe.sha256
```

安装器会请求管理员权限，写入 Agent 配置、安装 `OnyxHubAgent` Windows 服务并设置自动启动。

## 启动 frontend

打开第三个 PowerShell：

```powershell
Set-Location D:\code\onyxhub\frontend
$env:NEXT_PUBLIC_ONYXHUB_API_BASE_URL="http://127.0.0.1:8080"
pnpm dev
```

浏览器访问：

```text
http://localhost:3000
```

使用 `admin / 123456` 登录。

如果 frontend 和 backend 不在同一台电脑：

1. 将 `NEXT_PUBLIC_ONYXHUB_API_BASE_URL` 改为 backend 的实际地址。
2. 将 frontend 的访问来源加入 backend 的 `ONYXHUB_CORS_ALLOWED_ORIGINS`。
3. 确保防火墙允许访问 backend 的 TCP 8080 端口。

## 构建 client

### 准备 ActiveX Interop 程序集

客户端构建需要以下两个本机生成文件，仓库不会跟踪它们：

```text
client/runtime/active-remoteapp/MSTSCLib.dll
client/runtime/active-remoteapp/AxInterop.MSTSCLib.dll
```

如果团队提供了统一依赖包，将两个文件放入上述目录即可。也可以在安装了 .NET Framework SDK 工具的 Developer PowerShell 中，从系统 `mstscax.dll` 生成：

```powershell
Set-Location D:\code\onyxhub
$sdkRoot="${env:ProgramFiles(x86)}\Microsoft SDKs\Windows"
$tlbImp=(Get-ChildItem -Path $sdkRoot -Recurse -Filter TlbImp.exe | Select-Object -First 1).FullName
$axImp=(Get-ChildItem -Path $sdkRoot -Recurse -Filter AxImp.exe | Select-Object -First 1).FullName
$runtimeDir=(New-Item -ItemType Directory -Force .\client\runtime\active-remoteapp).FullName
$mstscAx="$env:WINDIR\System32\mstscax.dll"
& $tlbImp $mstscAx "/out:$runtimeDir\MSTSCLib.dll"
& $axImp $mstscAx "/rcw:$runtimeDir\MSTSCLib.dll" "/out:$runtimeDir\AxInterop.MSTSCLib.dll"
```

构建前检查所有客户端依赖：

```powershell
$requiredFiles=@(
  ".\client\third_party\FluentUI\CMakeLists.txt",
  ".\client\runtime\active-remoteapp\MSTSCLib.dll",
  ".\client\runtime\active-remoteapp\AxInterop.MSTSCLib.dll"
)
$requiredFiles | ForEach-Object {
  if (-not (Test-Path -LiteralPath $_)) { throw "缺少客户端依赖: $_" }
}
```

### 正式构建

从仓库根目录执行：

```powershell
.\client\scripts\build-windows.ps1 `
  -QtPrefix "C:\Qt\6.8.2\msvc2022_64" `
  -Configuration Release
```

构建脚本会：

1. 编译 C# ActiveX RemoteApp 启动器。
2. 使用 CMake 和 Visual Studio 2022 编译 Qt 客户端。
3. 使用 `windeployqt` 收集 Qt 运行时。
4. 生成可直接运行的完整目录。

输出：

```text
client/build/dist/onyxhub-client.exe
client/build/dist/runtime/active-remoteapp/RichActiveRemoteApp.exe
```

启动客户端：

```powershell
.\client\build\dist\onyxhub-client.exe
```

客户端默认连接 `127.0.0.1:8080`，也可以在客户端设置中修改。客户端配置保存在可执行文件旁的 `config.ini`；重新生成 `build/dist` 会清理该目录。

## 完整业务验证

按以下顺序验证整条 RemoteApp 链路：

1. 启动 backend，确认 8080 端口监听。
2. 启动 agent，确认管理后台显示 Agent 在线。
3. 启动 frontend，使用 `admin / 123456` 登录。
4. 在用户管理中创建普通用户。
5. 在应用管理中扫描或创建应用。
6. 为普通用户授权应用。
7. 启动 client，填写 backend 地址并使用普通用户登录。
8. 点击已授权应用，确认远程应用窗口出现。

跨电脑验证时还需要满足：

- client 能解析并访问 Agent 上报的 Windows 主机名。
- Windows 主机已允许远程桌面连接。
- 防火墙允许 TCP 3389。
- backend/agent 所在网络允许 WebSocket 访问 TCP 8080。

## 常用开发命令

### backend

```powershell
Set-Location .\backend
task dev
task build
task test
task tidy
```

### agent

```powershell
Set-Location .\agent
go test ./...
go build -o .\build\tmp\onyxhub-agent.exe .\cmd\agent
```

### frontend

```powershell
Set-Location .\frontend
pnpm lint
pnpm build
```

### client

```powershell
cmake -S .\client -B .\client\build\cmake `
  -G "Visual Studio 17 2022" `
  -A x64 `
  "-DCMAKE_PREFIX_PATH=C:\Qt\6.8.2\msvc2022_64" `
  -DBUILD_TESTING=ON

cmake --build .\client\build\cmake --config Release `
  --target onyxhub-client des-cipher-test application-model-test

ctest --test-dir .\client\build\cmake -C Release --output-on-failure
```

## 配置和本地数据

| 路径 | 内容 | 是否提交 Git |
| --- | --- | --- |
| `backend/data/onyxhub.db` | 开发 SQLite 数据库 | 否 |
| `backend/tmp` | backend 构建输出 | 否 |
| `agent/build/tmp` | Agent 开发构建与日志 | 否 |
| `agent/build/dist` | Agent 安装包 | 否 |
| `frontend/node_modules` | 前端依赖 | 否 |
| `frontend/.next` | Next.js 构建缓存 | 否 |
| `client/build` | CMake、测试和发布输出 | 否 |
| `client/runtime` | 本机 ActiveX 运行时 | 否 |

需要重置开发数据库时，先停止 backend，再删除：

```powershell
Remove-Item -LiteralPath .\backend\data\onyxhub.db -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath .\backend\data\onyxhub.db-shm -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath .\backend\data\onyxhub.db-wal -Force -ErrorAction SilentlyContinue
```

下次启动 backend 会重新建表并创建初始管理员。

## 日常更新代码

```powershell
Set-Location D:\code\onyxhub
git pull --ff-only

git -C .\client\third_party\FluentUI fetch --tags
git -C .\client\third_party\FluentUI checkout 4e4016ae3fed7d1a3534760b44313e8fb0b8fd29

Push-Location .\backend
go mod download
Pop-Location

Push-Location .\agent
go mod download
Pop-Location

Push-Location .\frontend
pnpm install --frozen-lockfile
Pop-Location
```

当 `go.mod`、`pnpm-lock.yaml`、Qt 版本或 FluentUI gitlink 发生变化时，应重新执行对应依赖安装或构建步骤。

## 常见问题

### `task` 或 `air` 找不到

```powershell
$env:Path += ";$(go env GOPATH)\bin"
```

确认 `go install` 已成功执行。

### pnpm 提示 Node.js 版本过低

安装 Node.js 24 LTS，重新打开终端，然后执行：

```powershell
corepack enable
corepack prepare pnpm@11.18.0 --activate
```

### backend 启动时报缺少环境变量

优先使用 `task dev`，Taskfile 会提供开发默认值。直接 `go run` 时必须手动设置 `ONYXHUB_HTTP_ADDR`、`ONYXHUB_DB_PATH` 和 `ONYXHUB_JWT_SECRET`。

### 前端能打开但请求 API 失败

检查：

- backend 是否监听 8080。
- `NEXT_PUBLIC_ONYXHUB_API_BASE_URL` 是否正确。
- frontend 来源是否包含在 `ONYXHUB_CORS_ALLOWED_ORIGINS` 中。
- 修改 `NEXT_PUBLIC_*` 后是否重新启动了 `pnpm dev`。

### 管理后台显示 Agent 离线

检查 Agent 配置中的 WebSocket 地址、backend 日志、防火墙 TCP 8080，以及 Agent 日志目录。backend 必须先于 Agent 启动。

### Qt 构建提示 `Qt not found`

确认以下文件存在：

```text
C:\Qt\6.8.2\msvc2022_64\lib\cmake\Qt6\Qt6Config.cmake
```

如果 Qt 安装在其他位置，修改 `-QtPrefix`。

### 客户端提示缺少启动器文件

确认以下文件都存在：

```text
client/runtime/active-remoteapp/MSTSCLib.dll
client/runtime/active-remoteapp/AxInterop.MSTSCLib.dll
client/build/dist/runtime/active-remoteapp/RichActiveRemoteApp.exe
```

前两个是构建输入，最后一个是构建输出。

### RemoteApp 无法连接

确认 Agent 在线、普通用户已授权、Windows 用户已创建、Agent 主机名能从 client 所在电脑解析，并检查 Windows 远程桌面及 TCP 3389 防火墙配置。
