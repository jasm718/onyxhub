param(
  [string]$ServerAddress,
  [switch]$Prompt,
  [int]$HeartbeatIntervalSeconds = 3
)

$ErrorActionPreference = "Stop"

function Test-Administrator {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Invoke-ElevatedSelf {
  if ([string]::IsNullOrWhiteSpace($PSCommandPath)) {
    throw "无法定位当前安装脚本"
  }

  $argumentList = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  if ($PSBoundParameters.ContainsKey("ServerAddress")) {
    $argumentList += " -ServerAddress `"$ServerAddress`""
  }
  if ($Prompt) {
    $argumentList += " -Prompt"
  }
  $argumentList += " -HeartbeatIntervalSeconds $HeartbeatIntervalSeconds"

  $process = Start-Process -FilePath "powershell.exe" -ArgumentList $argumentList -Verb RunAs -Wait -PassThru -WorkingDirectory $PSScriptRoot
  exit $process.ExitCode
}

function Read-ServerAddress {
  if (-not $Prompt -and $PSBoundParameters.ContainsKey("ServerAddress")) {
    return $ServerAddress
  }

  $defaultAddress = "127.0.0.1"
  try {
    Add-Type -AssemblyName Microsoft.VisualBasic
    $value = [Microsoft.VisualBasic.Interaction]::InputBox("请输入 OnyxHub 服务端地址", "OnyxHub Agent 安装", $defaultAddress)
  } catch {
    $value = Read-Host "服务端地址 [$defaultAddress]"
  }
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $defaultAddress
  }
  return $value
}

function ConvertTo-BackendWebSocketUrl {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $value = $Value.Trim()
  if ($value -eq "") {
    throw "服务端地址不能为空"
  }
  if (($value -match '\s') -or ($value.IndexOf('"') -ge 0)) {
    throw "服务端地址不能包含空白字符或引号"
  }

  if ($value -notmatch "^[A-Za-z][A-Za-z0-9+.-]*://") {
    $value = "ws://$value"
  }

  $explicitPort = Test-ExplicitPort -Value $value

  try {
    $uri = [Uri]$value
  } catch {
    throw "服务端地址格式无效: $Value"
  }

  switch ($uri.Scheme.ToLowerInvariant()) {
    "http" { $scheme = "ws" }
    "https" { $scheme = "wss" }
    "ws" { $scheme = "ws" }
    "wss" { $scheme = "wss" }
    default { throw "服务端地址协议无效: $($uri.Scheme)" }
  }

  if ([string]::IsNullOrWhiteSpace($uri.Host)) {
    throw "服务端地址缺少主机名"
  }
  if (($uri.AbsolutePath -ne "") -and ($uri.AbsolutePath -ne "/")) {
    throw "服务端地址不能包含路径"
  }
  if ($uri.Query -ne "" -or $uri.Fragment -ne "") {
    throw "服务端地址不能包含查询参数或片段"
  }

  if ($uri.Port -lt 1 -or $uri.Port -gt 65535) {
    throw "服务端端口无效"
  }

  if ($explicitPort) {
    $port = $uri.Port
  } else {
    $port = 8080
  }

  $hostValue = $uri.Host
  if ($hostValue.Contains(":") -and -not $hostValue.StartsWith("[")) {
    $hostValue = "[$hostValue]"
  }

  return "${scheme}://$hostValue`:$port/ws/agent"
}

function Test-ExplicitPort {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $authority = $Value
  $schemeIndex = $authority.IndexOf("://", [StringComparison]::Ordinal)
  if ($schemeIndex -ge 0) {
    $authority = $authority.Substring($schemeIndex + 3)
  }
  $pathIndex = $authority.IndexOf("/")
  if ($pathIndex -ge 0) {
    $authority = $authority.Substring(0, $pathIndex)
  }
  if ($authority.StartsWith("[")) {
    $end = $authority.IndexOf("]")
    if ($end -lt 0) {
      throw "服务端地址格式无效: $Value"
    }
    return $authority.Substring($end + 1) -match "^:[0-9]+$"
  }
  return $authority -match ":[0-9]+$"
}

function Resolve-AgentBinary {
  $packageBinary = Join-Path $PSScriptRoot "onyxhub-agent.exe"
  if (Test-Path $packageBinary) {
    return $packageBinary
  }

  $buildRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
  $repoRoot = Resolve-Path (Join-Path $buildRoot "..")
  $binary = Join-Path $buildRoot "tmp\onyxhub-agent.exe"
  if (-not (Test-Path $binary)) {
    $agentMain = Join-Path $repoRoot "cmd\agent"
    if (-not (Test-Path $agentMain)) {
      throw "找不到 onyxhub-agent.exe"
    }
    New-Item -ItemType Directory -Force -Path (Join-Path $buildRoot "tmp") | Out-Null
    Push-Location $repoRoot
    try {
      go build -o $binary .\cmd\agent
    } finally {
      Pop-Location
    }
  }
  return $binary
}

function Copy-FileIfNeeded {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [Parameter(Mandatory = $true)]
    [string]$Destination
  )

  $sourcePath = (Resolve-Path -LiteralPath $Source).Path
  $destinationPath = [IO.Path]::GetFullPath($Destination)
  if ((Test-Path -LiteralPath $Destination) -and ($sourcePath -ieq (Resolve-Path -LiteralPath $Destination).Path)) {
    return
  }
  Copy-Item -LiteralPath $sourcePath -Destination $destinationPath -Force
}

function Invoke-AgentServiceCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Binary,

    [Parameter(Mandatory = $true)]
    [string]$Command,

    [Parameter(Mandatory = $true)]
    [string]$StepName
  )

  if (-not (Test-Path -LiteralPath $Binary)) {
    throw "$StepName 失败: 文件不存在 - $Binary"
  }

  & $Binary $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$StepName 失败，退出码: $LASTEXITCODE"
  }
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not (Test-Administrator)) {
  Invoke-ElevatedSelf
}

$serverAddress = Read-ServerAddress
$backendWebSocketUrl = ConvertTo-BackendWebSocketUrl -Value $serverAddress

$installDir = "$env:ProgramFiles\OnyxHub\Agent"
$configDir = "$env:ProgramData\OnyxHub"
$logDir = $installDir
$binary = Resolve-AgentBinary

New-Item -ItemType Directory -Force -Path $installDir, $configDir, $logDir | Out-Null
$agentBinary = Join-Path $installDir "onyxhub-agent.exe"
Copy-FileIfNeeded -Source $binary -Destination $agentBinary

$config = [ordered]@{
  backendWebSocketUrl = $backendWebSocketUrl
  logDir = $logDir
  heartbeatIntervalSeconds = $HeartbeatIntervalSeconds
}
$configJson = $config | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText((Join-Path $configDir "agent.json"), $configJson, [System.Text.UTF8Encoding]::new($false))

$policy = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services"
New-Item -Path $policy -Force | Out-Null
New-ItemProperty -Path $policy -Name "fAllowUnlistedRemotePrograms" -Value 1 -PropertyType DWord -Force | Out-Null
Remove-ItemProperty -Path $policy -Name "MaxDisconnectionTime" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path $policy -Name "fResetBroken" -ErrorAction SilentlyContinue

$edgePolicy = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
New-Item -Path $edgePolicy -Force | Out-Null
New-ItemProperty -Path $edgePolicy -Name "HideFirstRunExperience" -Value 1 -PropertyType DWord -Force | Out-Null

Invoke-AgentServiceCommand -Binary $agentBinary -Command "install" -StepName "安装 OnyxHub Agent 服务"
Invoke-AgentServiceCommand -Binary $agentBinary -Command "start" -StepName "启动 OnyxHub Agent 服务"

Write-Host "OnyxHub Agent 已安装并启动"
exit 0
