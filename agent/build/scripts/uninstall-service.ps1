param(
  [string]$InstallDir = "$env:ProgramFiles\OnyxHub\Agent",
  [switch]$KeepInstallDir
)

$ErrorActionPreference = "Stop"

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw "请以管理员身份运行卸载脚本"
}

function Invoke-AgentServiceCommandIfExists {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Binary,

    [Parameter(Mandatory = $true)]
    [string]$Command
  )

  if (-not (Test-Path -LiteralPath $Binary)) {
    return
  }

  & $Binary $Command
  if ($LASTEXITCODE -ne 0) {
    throw "执行服务命令失败: $Command, 退出码: $LASTEXITCODE"
  }
}

$agentBinary = Join-Path $InstallDir "onyxhub-agent.exe"
Invoke-AgentServiceCommandIfExists -Binary $agentBinary -Command "stop"
Invoke-AgentServiceCommandIfExists -Binary $agentBinary -Command "uninstall"

$explorer = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer"
Remove-ItemProperty -Path $explorer -Name "NoDrives" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path $explorer -Name "NoViewOnDrive" -ErrorAction SilentlyContinue

$policy = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services"
Remove-ItemProperty -Path $policy -Name "fAllowUnlistedRemotePrograms" -ErrorAction SilentlyContinue

$edgePolicy = "HKLM:\SOFTWARE\Policies\Microsoft\Edge"
Remove-ItemProperty -Path $edgePolicy -Name "HideFirstRunExperience" -ErrorAction SilentlyContinue

if (-not $KeepInstallDir -and (Test-Path $InstallDir)) {
  Remove-Item -LiteralPath $InstallDir -Recurse -Force
}

Write-Host "OnyxHub Agent 已卸载"
exit 0
