param(
    [string]$QtPrefix = "C:\Qt\6.8.2\msvc2022_64",
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

$clientRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$buildDir = Join-Path $clientRoot "build\cmake"
$distDir = Join-Path $clientRoot "build\dist"
$exeName = "onyxhub-client.exe"

function Invoke-Checked {
    & $args[0] @($args | Select-Object -Skip 1)
    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}

$qtConfig = Join-Path $QtPrefix "lib\cmake\Qt6\Qt6Config.cmake"
if (-not (Test-Path $qtConfig)) {
    throw "Qt not found: $QtPrefix"
}

Invoke-Checked cmake `
    -S $clientRoot `
    -B $buildDir `
    -G "Visual Studio 17 2022" `
    -A x64 `
    "-DCMAKE_PREFIX_PATH=$QtPrefix" `
    "-DCMAKE_BUILD_TYPE=$Configuration"

Invoke-Checked cmake --build $buildDir --config $Configuration --target onyxhub-client

if (Test-Path $distDir) {
    Remove-Item -LiteralPath $distDir -Recurse -Force
}

New-Item -ItemType Directory -Force $distDir | Out-Null
New-Item -ItemType Directory -Force (Join-Path $distDir "qml") | Out-Null
New-Item -ItemType Directory -Force (Join-Path $distDir "imports") | Out-Null

$exePath = Join-Path $buildDir "$Configuration\$exeName"
$fluentUiPlugin = Join-Path $buildDir "third_party\FluentUI\src\$Configuration\fluentuiplugin.dll"
$fluentUiDist = Join-Path $distDir "imports\FluentUI"

Copy-Item $exePath (Join-Path $distDir $exeName) -Force
Copy-Item (Join-Path $buildDir "OnyxHub") (Join-Path $distDir "qml") -Recurse -Force
Copy-Item (Join-Path $buildDir "qml\FluentUI") (Join-Path $distDir "imports") -Recurse -Force

Copy-Item $fluentUiPlugin (Join-Path $fluentUiDist "fluentuiplugin.dll") -Force
New-Item -ItemType Directory -Force (Join-Path $fluentUiDist $Configuration) | Out-Null
Copy-Item $fluentUiPlugin (Join-Path $fluentUiDist "$Configuration\fluentuiplugin.dll") -Force

Invoke-Checked (Join-Path $QtPrefix "bin\windeployqt.exe") `
    --release `
    --qmldir (Join-Path $clientRoot "qml") `
    --qmldir (Join-Path $clientRoot "third_party\FluentUI\src\Qt6\imports") `
    (Join-Path $distDir $exeName)

Write-Host "Dist: $distDir"
