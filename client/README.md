# OnyxHub Client

OnyxHub 普通用户桌面客户端。当前技术栈：

- Qt 6
- C++17
- QML / Qt Quick
- FluentUI
- CMake

## 功能

- 客户端用户登录
- 保存服务端地址和登录态
- 拉取当前用户授权应用
- 获取应用 RDP 启动信息
- 写入临时 `.rdp` 文件并调用系统远程桌面客户端

## 构建

Windows：

```powershell
powershell -ExecutionPolicy Bypass -File client\scripts\build-windows.ps1
```

目录约定：

```text
client/build/cmake  # CMake/VS 中间产物
client/build/dist   # 可直接运行的客户端产物
```

生成文件：

```text
client/build/dist/onyxhub-client.exe
```

FluentUI 固定在 `client/third_party/FluentUI`，当前使用 1.7.7。Qt 需要包含 `qt5compat` 和 `qtshadertools` 模块。
