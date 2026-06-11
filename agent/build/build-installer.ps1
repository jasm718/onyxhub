param(
  [string]$IsccPath,
  [string]$AppVersion = "1.0.0"
)

$ErrorActionPreference = "Stop"

function Resolve-IsccPath {
  param(
    [string]$ConfiguredPath
  )

  if (-not [string]::IsNullOrWhiteSpace($ConfiguredPath)) {
    if (-not (Test-Path -LiteralPath $ConfiguredPath)) {
      throw "找不到 Inno Setup 编译器: $ConfiguredPath"
    }
    return (Resolve-Path -LiteralPath $ConfiguredPath).Path
  }

  $command = Get-Command iscc.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $candidates = @(
    "${env:ProgramFiles(x86)}\Inno Setup 6\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 6\ISCC.exe",
    "${env:ProgramFiles(x86)}\Inno Setup 5\ISCC.exe",
    "$env:ProgramFiles\Inno Setup 5\ISCC.exe"
  )
  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).Path
    }
  }

  throw "找不到 Inno Setup 编译器，请安装 Inno Setup 或通过 -IsccPath 指定 ISCC.exe"
}

$scriptDir = Split-Path -Parent $PSCommandPath
$agentRoot = (Resolve-Path (Join-Path $scriptDir "..")).Path
$tmpDir = Join-Path $scriptDir "tmp"
$distDir = Join-Path $scriptDir "dist"
$installerScript = Join-Path $scriptDir "installer\OnyxHubAgent.iss"
$binary = Join-Path $tmpDir "onyxhub-agent.exe"
$setup = Join-Path $distDir "OnyxHubAgentSetup-windows-x64.exe"
$checksum = "$setup.sha256"

if (-not (Test-Path -LiteralPath $installerScript)) {
  throw "找不到安装器脚本: $installerScript"
}

New-Item -ItemType Directory -Force -Path $tmpDir, $distDir | Out-Null

Push-Location $agentRoot
try {
  go build -o $binary .\cmd\agent
  if ($LASTEXITCODE -ne 0) {
    throw "agent 编译失败，退出码: $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

$resolvedIscc = Resolve-IsccPath -ConfiguredPath $IsccPath

if (Test-Path -LiteralPath $setup) {
  Remove-Item -LiteralPath $setup -Force
}
if (Test-Path -LiteralPath $checksum) {
  Remove-Item -LiteralPath $checksum -Force
}

& $resolvedIscc "/DSourceDir=$agentRoot" "/DOutputDir=$distDir" "/DAppVersion=$AppVersion" $installerScript
if ($LASTEXITCODE -ne 0) {
  throw "Inno Setup 编译失败，退出码: $LASTEXITCODE"
}

if (-not (Test-Path -LiteralPath $setup)) {
  throw "安装包未生成: $setup"
}

$hash = Get-FileHash -LiteralPath $setup -Algorithm SHA256
"$($hash.Hash.ToLowerInvariant())  OnyxHubAgentSetup-windows-x64.exe" | Set-Content -LiteralPath $checksum -Encoding ASCII

Write-Host "安装包已生成: $setup"
Write-Host "校验文件已生成: $checksum"
