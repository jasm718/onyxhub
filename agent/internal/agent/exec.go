package agent

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Executor struct {
	mu                 sync.Mutex
	storage            StorageSettings
	cleanupCancel      context.CancelFunc
	cleanupLogoffAfter time.Duration
}

type TerminalSession struct {
	WindowsSessionID int       `json:"windowsSessionId"`
	WindowsUsername  string    `json:"windowsUsername"`
	ConnectedAt      time.Time `json:"connectedAt"`
	State            string    `json:"state"`
}

type StorageSettings struct {
	StorageRootPath             string `json:"storageRootPath"`
	StorageQuotaMB              int    `json:"storageQuotaMb"`
	StorageVisibleDriveLetter   string `json:"storageVisibleDriveLetter"`
	RDPLocalDriveMappingEnabled bool   `json:"rdpLocalDriveMappingEnabled"`
}

type InstalledApplication struct {
	Name       string `json:"name"`
	Path       string `json:"path"`
	Arguments  string `json:"arguments"`
	WorkingDir string `json:"workingDir"`
}

func NewExecutor() *Executor {
	return &Executor{}
}

func (e *Executor) Execute(ctx context.Context, name string, raw json.RawMessage) (any, error) {
	switch strings.TrimSpace(name) {
	case "check_windows_user":
		var payload usernamePayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return e.CheckWindowsUser(ctx, payload.WindowsUsername)
	case "create_windows_user":
		var payload createWindowsUserPayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.CreateWindowsUser(ctx, payload)
	case "delete_windows_user":
		var payload usernamePayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.DeleteWindowsUser(ctx, payload.WindowsUsername)
	case "set_windows_user_password":
		var payload setPasswordPayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.SetWindowsUserPassword(ctx, payload)
	case "ensure_windows_user_profile":
		var payload usernamePayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.EnsureWindowsUserProfile(ctx, payload.WindowsUsername)
	case "set_windows_user_home_directory":
		var payload userHomePayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.SetWindowsUserHomeDirectory(ctx, payload)
	case "clear_windows_user_home_directory":
		var payload usernamePayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.ClearWindowsUserHomeDirectory(ctx, payload.WindowsUsername)
	case "scan_installed_apps":
		return e.ScanInstalledApps(ctx)
	case "fetch_application_icon":
		var payload pathPayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return e.FetchApplicationIcon(ctx, payload.Path)
	case "register_remote_app":
		var payload remoteAppPayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.RegisterRemoteApp(ctx, payload)
	case "unregister_remote_app":
		var payload aliasPayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.UnregisterRemoteApp(ctx, payload.Alias)
	case "list_remote_apps":
		return e.ListRemoteApps(ctx)
	case "enable_unlisted_remote_apps":
		return nil, e.EnableUnlistedRemoteApps(ctx)
	case "prepare_user_environment", "generate_rdp_launch_info":
		var payload usernamePayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.PrepareUserEnvironment(ctx, payload.WindowsUsername)
	case "cleanup_user_environment":
		var payload usernamePayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.CleanupUserEnvironment(ctx, payload.WindowsUsername)
	case "sync_all_user_storage":
		return nil, e.SyncAllUserStorage(ctx)
	case "list_terminal_sessions":
		return e.ListTerminalSessions()
	case "logoff_terminal_session":
		var payload sessionIDPayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.LogoffTerminalSession(ctx, payload.WindowsSessionID)
	case "start_disconnected_session_cleanup":
		var payload disconnectedCleanupPayload
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.StartDisconnectedSessionCleanup(payload.LogoffMinutes)
	case "stop_disconnected_session_cleanup":
		e.StopDisconnectedSessionCleanup()
		return nil, nil
	case "install_initialize":
		return nil, e.InstallInitialize(ctx)
	case "clear_disconnected_session_machine_policy":
		return nil, e.ClearDisconnectedSessionMachinePolicy(ctx)
	case "apply_storage_isolation_settings":
		var payload StorageSettings
		if err := decodePayload(raw, &payload); err != nil {
			return nil, err
		}
		return nil, e.ApplyStorageIsolationSettings(ctx, payload)
	case "clear_machine_storage_isolation_policies":
		return nil, e.ClearMachineStorageIsolationPolicies(ctx)
	case "uninstall_cleanup":
		return nil, e.UninstallCleanup(ctx)
	default:
		return nil, fmt.Errorf("未知 agent 命令: %s", name)
	}
}

type usernamePayload struct {
	WindowsUsername string `json:"windowsUsername"`
}

type createWindowsUserPayload struct {
	WindowsUsername string `json:"windowsUsername"`
	Password        string `json:"password"`
	DisplayName     string `json:"displayName"`
}

type setPasswordPayload struct {
	WindowsUsername string `json:"windowsUsername"`
	Password        string `json:"password"`
}

type userHomePayload struct {
	WindowsUsername string `json:"windowsUsername"`
	HomeDirectory   string `json:"homeDirectory"`
}

type pathPayload struct {
	Path string `json:"path"`
}

type aliasPayload struct {
	Alias string `json:"alias"`
}

type sessionIDPayload struct {
	WindowsSessionID int `json:"windowsSessionId"`
}

type disconnectedCleanupPayload struct {
	LogoffMinutes int `json:"logoffMinutes"`
}

type remoteAppPayload struct {
	Alias      string `json:"alias"`
	Name       string `json:"name"`
	Path       string `json:"path"`
	Arguments  string `json:"arguments"`
	WorkingDir string `json:"workingDir"`
}

func decodePayload(raw json.RawMessage, dst any) error {
	if len(raw) == 0 || string(raw) == "null" {
		raw = []byte("{}")
	}
	if err := json.Unmarshal(raw, dst); err != nil {
		return fmt.Errorf("命令 payload 格式错误: %w", err)
	}
	return nil
}

func runPowerShell(timeout time.Duration, script string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return runPowerShellContext(ctx, script)
}

func runPowerShellContext(ctx context.Context, script string) (string, error) {
	cmd := exec.CommandContext(ctx, "powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = strings.TrimSpace(stdout.String())
		}
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("%s", msg)
	}
	return strings.TrimSpace(stdout.String()), nil
}

func runCommandContext(ctx context.Context, name string, args ...string) (string, error) {
	cmd := exec.CommandContext(ctx, name, args...)
	var stdout bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			msg = strings.TrimSpace(stdout.String())
		}
		if msg == "" {
			msg = err.Error()
		}
		return "", fmt.Errorf("%s", msg)
	}
	return strings.TrimSpace(stdout.String()), nil
}

func psQuote(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

func requireWindowsUsername(username string) (string, error) {
	username = strings.TrimSpace(username)
	if username == "" {
		return "", errors.New("Windows 用户名不能为空")
	}
	if strings.ContainsAny(username, `\/":;|=,+*?<>[]`) {
		return "", errors.New("Windows 用户名包含非法字符")
	}
	return username, nil
}

func requirePath(path string) (string, error) {
	path = strings.TrimSpace(path)
	if path == "" {
		return "", errors.New("路径不能为空")
	}
	if !filepath.IsAbs(path) {
		return "", errors.New("路径必须是绝对路径")
	}
	return path, nil
}

func (e *Executor) CheckWindowsUser(ctx context.Context, username string) (map[string]any, error) {
	username, err := requireWindowsUsername(username)
	if err != nil {
		return nil, err
	}
	script := fmt.Sprintf(`
$u = Get-LocalUser -Name %s -ErrorAction SilentlyContinue
if ($null -eq $u) {
  @{exists=$false} | ConvertTo-Json -Compress
} else {
  @{exists=$true; enabled=$u.Enabled; name=$u.Name; fullName=$u.FullName} | ConvertTo-Json -Compress
}
`, psQuote(username))
	out, err := runPowerShellContext(ctx, script)
	if err != nil {
		return nil, err
	}
	var result map[string]any
	if err := json.Unmarshal([]byte(out), &result); err != nil {
		return nil, fmt.Errorf("解析 Windows 用户检查结果失败: %w", err)
	}
	return result, nil
}

func (e *Executor) CreateWindowsUser(ctx context.Context, payload createWindowsUserPayload) error {
	username, err := requireWindowsUsername(payload.WindowsUsername)
	if err != nil {
		return err
	}
	if payload.Password == "" {
		return errors.New("Windows 用户密码不能为空")
	}
	displayName := strings.TrimSpace(payload.DisplayName)
	if displayName == "" {
		displayName = username
	}
	script := fmt.Sprintf(`
$name = %s
$password = ConvertTo-SecureString %s -AsPlainText -Force
if (Get-LocalUser -Name $name -ErrorAction SilentlyContinue) { throw "Windows 用户已存在: $name" }
New-LocalUser -Name $name -Password $password -FullName %s -AccountNeverExpires -PasswordNeverExpires:$false | Out-Null
$rdpSid = New-Object System.Security.Principal.SecurityIdentifier("S-1-5-32-555")
$rdpGroup = $rdpSid.Translate([System.Security.Principal.NTAccount]).Value.Split('\')[-1]
Add-LocalGroupMember -Group $rdpGroup -Member $name -ErrorAction Stop
`, psQuote(username), psQuote(payload.Password), psQuote(displayName))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) DeleteWindowsUser(ctx context.Context, username string) error {
	username, err := requireWindowsUsername(username)
	if err != nil {
		return err
	}
	script := fmt.Sprintf(`
$name = %s
if (-not (Get-LocalUser -Name $name -ErrorAction SilentlyContinue)) { throw "Windows 用户不存在: $name" }
Remove-LocalUser -Name $name -ErrorAction Stop
`, psQuote(username))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) SetWindowsUserPassword(ctx context.Context, payload setPasswordPayload) error {
	username, err := requireWindowsUsername(payload.WindowsUsername)
	if err != nil {
		return err
	}
	if payload.Password == "" {
		return errors.New("Windows 用户密码不能为空")
	}
	script := fmt.Sprintf(`
$name = %s
$u = Get-LocalUser -Name $name -ErrorAction Stop
$password = ConvertTo-SecureString %s -AsPlainText -Force
$u | Set-LocalUser -Password $password -ErrorAction Stop
`, psQuote(username), psQuote(payload.Password))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) EnsureWindowsUserProfile(ctx context.Context, username string) error {
	username, err := requireWindowsUsername(username)
	if err != nil {
		return err
	}
	script := fmt.Sprintf(`
$name = %s
if (-not (Get-LocalUser -Name $name -ErrorAction SilentlyContinue)) { throw "Windows 用户不存在: $name" }
$profile = Join-Path $env:SystemDrive "Users\$name"
if (-not (Test-Path $profile)) { New-Item -ItemType Directory -Path $profile -Force | Out-Null }
`, psQuote(username))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) SetWindowsUserHomeDirectory(ctx context.Context, payload userHomePayload) error {
	username, err := requireWindowsUsername(payload.WindowsUsername)
	if err != nil {
		return err
	}
	home, err := requirePath(payload.HomeDirectory)
	if err != nil {
		return err
	}
	script := fmt.Sprintf(`
$name = %s
$home = %s
if (-not (Get-LocalUser -Name $name -ErrorAction SilentlyContinue)) { throw "Windows 用户不存在: $name" }
New-Item -ItemType Directory -Path $home -Force | Out-Null
wmic useraccount where name=$name set HomeDirectory=$home | Out-Null
`, psQuote(username), psQuote(home))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) ClearWindowsUserHomeDirectory(ctx context.Context, username string) error {
	username, err := requireWindowsUsername(username)
	if err != nil {
		return err
	}
	script := fmt.Sprintf(`
$name = %s
if (-not (Get-LocalUser -Name $name -ErrorAction SilentlyContinue)) { throw "Windows 用户不存在: $name" }
wmic useraccount where name=$name set HomeDirectory="" | Out-Null
`, psQuote(username))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) ScanInstalledApps(ctx context.Context) ([]InstalledApplication, error) {
	script := `
$roots = @(
  "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
  "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*"
)
$items = foreach ($root in $roots) {
  Get-ItemProperty $root -ErrorAction SilentlyContinue | Where-Object {
    $_.DisplayName -and $_.DisplayIcon
  } | ForEach-Object {
    $path = ($_.DisplayIcon -split ",")[0].Trim('"')
    if ($path -and (Test-Path $path)) {
      [PSCustomObject]@{
        name = $_.DisplayName
        path = $path
        arguments = ""
        workingDir = Split-Path -Parent $path
      }
    }
  }
}
$items | Sort-Object name -Unique | ConvertTo-Json -Compress
`
	out, err := runPowerShellContext(ctx, script)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(out) == "" {
		return []InstalledApplication{}, nil
	}
	var items []InstalledApplication
	if strings.HasPrefix(strings.TrimSpace(out), "{") {
		var item InstalledApplication
		if err := json.Unmarshal([]byte(out), &item); err != nil {
			return nil, fmt.Errorf("解析已安装应用失败: %w", err)
		}
		return []InstalledApplication{item}, nil
	}
	if err := json.Unmarshal([]byte(out), &items); err != nil {
		return nil, fmt.Errorf("解析已安装应用失败: %w", err)
	}
	return items, nil
}

func (e *Executor) FetchApplicationIcon(ctx context.Context, path string) (map[string]string, error) {
	path, err := requirePath(path)
	if err != nil {
		return nil, err
	}
	if _, err := os.Stat(path); err != nil {
		return nil, fmt.Errorf("应用文件不存在: %w", err)
	}
	script := fmt.Sprintf(`
Add-Type -AssemblyName System.Drawing
$path = %s
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($path)
if ($null -eq $icon) { throw "无法提取应用图标" }
$bitmap = $icon.ToBitmap()
$stream = New-Object System.IO.MemoryStream
$bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
[Convert]::ToBase64String($stream.ToArray())
`, psQuote(path))
	out, err := runPowerShellContext(ctx, script)
	if err != nil {
		return nil, err
	}
	if _, err := base64.StdEncoding.DecodeString(out); err != nil {
		return nil, fmt.Errorf("图标数据不是有效 base64: %w", err)
	}
	return map[string]string{
		"path":       path,
		"mimeType":   "image/png",
		"iconBase64": out,
	}, nil
}

func (e *Executor) RegisterRemoteApp(ctx context.Context, payload remoteAppPayload) error {
	alias := strings.TrimSpace(payload.Alias)
	if err := validateAlias(alias); err != nil {
		return err
	}
	name := strings.TrimSpace(payload.Name)
	if name == "" {
		return errors.New("RemoteApp 名称不能为空")
	}
	path, err := requirePath(payload.Path)
	if err != nil {
		return err
	}
	if _, err := os.Stat(path); err != nil {
		return fmt.Errorf("RemoteApp 程序不存在: %w", err)
	}
	script := fmt.Sprintf(`
$alias = %s
$base = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Terminal Server\TSAppAllowList\Applications\$alias"
New-Item -Path $base -Force | Out-Null
New-ItemProperty -Path $base -Name "Name" -Value %s -PropertyType String -Force | Out-Null
New-ItemProperty -Path $base -Name "Path" -Value %s -PropertyType String -Force | Out-Null
New-ItemProperty -Path $base -Name "VPath" -Value %s -PropertyType String -Force | Out-Null
New-ItemProperty -Path $base -Name "IconPath" -Value %s -PropertyType String -Force | Out-Null
New-ItemProperty -Path $base -Name "CommandLineSetting" -Value 1 -PropertyType DWord -Force | Out-Null
New-ItemProperty -Path $base -Name "RequiredCommandLine" -Value %s -PropertyType String -Force | Out-Null
`, psQuote(alias), psQuote(name), psQuote(path), psQuote(path), psQuote(path), psQuote(strings.TrimSpace(payload.Arguments)))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) UnregisterRemoteApp(ctx context.Context, alias string) error {
	alias = strings.TrimSpace(alias)
	if err := validateAlias(alias); err != nil {
		return err
	}
	script := fmt.Sprintf(`
$path = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Terminal Server\TSAppAllowList\Applications\%s"
if (-not (Test-Path $path)) { throw "RemoteApp 不存在: %s" }
Remove-Item -Path $path -Recurse -Force
`, strings.ReplaceAll(alias, "'", "''"), strings.ReplaceAll(alias, "'", "''"))
	_, err := runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) ListRemoteApps(ctx context.Context) ([]map[string]string, error) {
	script := `
$root = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Terminal Server\TSAppAllowList\Applications"
if (-not (Test-Path $root)) { @() | ConvertTo-Json -Compress; exit 0 }
Get-ChildItem $root | ForEach-Object {
  $item = Get-ItemProperty $_.PSPath
  [PSCustomObject]@{
    alias = $_.PSChildName
    name = [string]$item.Name
    path = [string]$item.Path
  }
} | ConvertTo-Json -Compress
`
	out, err := runPowerShellContext(ctx, script)
	if err != nil {
		return nil, err
	}
	if strings.TrimSpace(out) == "" {
		return []map[string]string{}, nil
	}
	if strings.HasPrefix(strings.TrimSpace(out), "{") {
		var item map[string]string
		if err := json.Unmarshal([]byte(out), &item); err != nil {
			return nil, fmt.Errorf("解析 RemoteApp 列表失败: %w", err)
		}
		return []map[string]string{item}, nil
	}
	var items []map[string]string
	if err := json.Unmarshal([]byte(out), &items); err != nil {
		return nil, fmt.Errorf("解析 RemoteApp 列表失败: %w", err)
	}
	return items, nil
}

func (e *Executor) EnableUnlistedRemoteApps(ctx context.Context) error {
	script := `
$path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services"
New-Item -Path $path -Force | Out-Null
New-ItemProperty -Path $path -Name "fAllowUnlistedRemotePrograms" -Value 1 -PropertyType DWord -Force | Out-Null
`
	_, err := runPowerShellContext(ctx, script)
	return err
}

func validateAlias(alias string) error {
	if alias == "" {
		return errors.New("RemoteApp alias 不能为空")
	}
	ok, err := regexp.MatchString(`^[A-Za-z0-9_-]+$`, alias)
	if err != nil {
		return err
	}
	if !ok {
		return errors.New("RemoteApp alias 只能包含字母、数字、下划线或短横线")
	}
	return nil
}

func (e *Executor) PrepareUserEnvironment(ctx context.Context, username string) error {
	username, err := requireWindowsUsername(username)
	if err != nil {
		return err
	}
	if err := e.EnsureWindowsUserProfile(ctx, username); err != nil {
		return err
	}
	e.mu.Lock()
	settings := e.storage
	e.mu.Unlock()
	if strings.TrimSpace(settings.StorageRootPath) == "" {
		return nil
	}
	userDir := filepath.Join(settings.StorageRootPath, username)
	script := fmt.Sprintf(`
$name = %s
$path = %s
if (-not (Get-LocalUser -Name $name -ErrorAction SilentlyContinue)) { throw "Windows 用户不存在: $name" }
New-Item -ItemType Directory -Path $path -Force | Out-Null
icacls $path /inheritance:r /grant:r "${env:COMPUTERNAME}\${name}:(OI)(CI)F" "Administrators:(OI)(CI)F" "SYSTEM:(OI)(CI)F" | Out-Null
`, psQuote(username), psQuote(userDir))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) CleanupUserEnvironment(ctx context.Context, username string) error {
	username, err := requireWindowsUsername(username)
	if err != nil {
		return err
	}
	e.mu.Lock()
	settings := e.storage
	e.mu.Unlock()
	if strings.TrimSpace(settings.StorageRootPath) == "" {
		return nil
	}
	userDir := filepath.Join(settings.StorageRootPath, username)
	script := fmt.Sprintf(`
$path = %s
if (Test-Path $path) {
  Remove-Item -LiteralPath $path -Recurse -Force
}
`, psQuote(userDir))
	_, err = runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) SyncAllUserStorage(ctx context.Context) error {
	e.mu.Lock()
	settings := e.storage
	e.mu.Unlock()
	if strings.TrimSpace(settings.StorageRootPath) == "" {
		return nil
	}
	usersScript := `Get-LocalUser | Where-Object {$_.Enabled} | Select-Object -ExpandProperty Name | ConvertTo-Json -Compress`
	out, err := runPowerShellContext(ctx, usersScript)
	if err != nil {
		return err
	}
	var users []string
	if strings.HasPrefix(strings.TrimSpace(out), `"`) {
		var user string
		if err := json.Unmarshal([]byte(out), &user); err != nil {
			return err
		}
		users = []string{user}
	} else if strings.TrimSpace(out) != "" {
		if err := json.Unmarshal([]byte(out), &users); err != nil {
			return err
		}
	}
	for _, user := range users {
		if err := e.PrepareUserEnvironment(ctx, user); err != nil {
			return err
		}
	}
	return nil
}

func (e *Executor) ApplyStorageIsolationSettings(ctx context.Context, settings StorageSettings) error {
	settings.StorageRootPath = strings.TrimSpace(settings.StorageRootPath)
	settings.StorageVisibleDriveLetter = strings.ToUpper(strings.TrimSpace(settings.StorageVisibleDriveLetter))
	if settings.StorageRootPath == "" {
		return errors.New("存储根目录不能为空")
	}
	if _, err := requirePath(settings.StorageRootPath); err != nil {
		return err
	}
	if filepath.Clean(settings.StorageRootPath) == filepath.VolumeName(settings.StorageRootPath)+`\` {
		return errors.New("存储根目录不能是盘符根目录")
	}
	if len(settings.StorageVisibleDriveLetter) != 1 || settings.StorageVisibleDriveLetter[0] < 'H' || settings.StorageVisibleDriveLetter[0] > 'Z' {
		return errors.New("可见盘符必须为 H-Z")
	}
	if strings.EqualFold(filepath.VolumeName(settings.StorageRootPath), settings.StorageVisibleDriveLetter+":") {
		return errors.New("可见盘符不能与存储根目录盘符相同")
	}
	script := fmt.Sprintf(`
$root = %s
$drive = $root.Substring(0, 1)
$driveRoot = "$($drive):"
$volume = Get-Volume -DriveLetter $drive -ErrorAction Stop
if ($volume.DriveType -ne "Fixed") { throw "存储根目录必须位于本地固定磁盘" }
if ($volume.FileSystem -ne "NTFS") { throw "存储根目录所在文件系统必须是 NTFS" }
New-Item -ItemType Directory -Path $root -Force | Out-Null
icacls $root /inheritance:r /grant:r "Administrators:(OI)(CI)F" "SYSTEM:(OI)(CI)F" | Out-Null
fsutil quota track $driveRoot | Out-Null
fsutil quota enforce $driveRoot | Out-Null
$explorer = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer"
New-Item -Path $explorer -Force | Out-Null
Remove-ItemProperty -Path $explorer -Name "NoDrives" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path $explorer -Name "NoViewOnDrive" -ErrorAction SilentlyContinue
`, psQuote(settings.StorageRootPath))
	if _, err := runPowerShellContext(ctx, script); err != nil {
		return err
	}
	e.mu.Lock()
	e.storage = settings
	e.mu.Unlock()
	return nil
}

func (e *Executor) ClearMachineStorageIsolationPolicies(ctx context.Context) error {
	script := `
$explorer = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer"
Remove-ItemProperty -Path $explorer -Name "NoDrives" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path $explorer -Name "NoViewOnDrive" -ErrorAction SilentlyContinue
`
	_, err := runPowerShellContext(ctx, script)
	if err != nil {
		return err
	}
	e.mu.Lock()
	e.storage = StorageSettings{}
	e.mu.Unlock()
	return nil
}

func (e *Executor) ListTerminalSessions() ([]TerminalSession, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	out, err := runCommandContext(ctx, "quser")
	if err != nil {
		return nil, err
	}
	return parseQuserOutput(out), nil
}

func parseQuserOutput(out string) []TerminalSession {
	lines := strings.Split(out, "\n")
	items := make([]TerminalSession, 0)
	for _, line := range lines {
		line = strings.TrimSpace(strings.TrimPrefix(line, ">"))
		if line == "" || strings.Contains(strings.ToLower(line), "username") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 4 {
			continue
		}
		idIndex := -1
		for i, field := range fields {
			if _, err := strconv.Atoi(field); err == nil {
				idIndex = i
				break
			}
		}
		if idIndex <= 0 || idIndex+1 >= len(fields) {
			continue
		}
		sessionID, _ := strconv.Atoi(fields[idIndex])
		state := strings.ToLower(fields[idIndex+1])
		if state == "active" {
			state = "active"
		} else {
			state = "disconnected"
		}
		connectedAt := parseQuserLogonTime(strings.Join(fields[minInt(idIndex+3, len(fields)):], " "))
		items = append(items, TerminalSession{
			WindowsSessionID: sessionID,
			WindowsUsername:  fields[0],
			ConnectedAt:      connectedAt,
			State:            state,
		})
	}
	return items
}

func parseQuserLogonTime(value string) time.Time {
	value = strings.TrimSpace(value)
	layouts := []string{
		"1/2/2006 3:04 PM",
		"1/2/2006 15:04",
		"2006/1/2 15:04",
		"2006-01-02 15:04",
	}
	for _, layout := range layouts {
		if t, err := time.ParseInLocation(layout, value, time.Local); err == nil {
			return t.UTC()
		}
	}
	return time.Unix(0, 0).UTC()
}

func (e *Executor) LogoffTerminalSession(ctx context.Context, id int) error {
	if id <= 0 {
		return errors.New("windowsSessionId 必须大于 0")
	}
	_, err := runCommandContext(ctx, "logoff", strconv.Itoa(id))
	return err
}

func (e *Executor) StartDisconnectedSessionCleanup(logoffMinutes int) error {
	if logoffMinutes < 0 {
		return errors.New("logoffMinutes 不能小于 0")
	}
	e.StopDisconnectedSessionCleanup()
	if logoffMinutes == 0 {
		return nil
	}
	ctx, cancel := context.WithCancel(context.Background())
	e.mu.Lock()
	e.cleanupCancel = cancel
	e.cleanupLogoffAfter = time.Duration(logoffMinutes) * time.Minute
	e.mu.Unlock()
	go e.cleanupLoop(ctx)
	return nil
}

func (e *Executor) StopDisconnectedSessionCleanup() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if e.cleanupCancel != nil {
		e.cleanupCancel()
		e.cleanupCancel = nil
	}
}

func (e *Executor) cleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	disconnectedSince := map[int]time.Time{}
	for {
		select {
		case <-ctx.Done():
			return
		case now := <-ticker.C:
			sessions, err := e.ListTerminalSessions()
			if err != nil {
				continue
			}
			for _, session := range sessions {
				if session.State != "disconnected" {
					delete(disconnectedSince, session.WindowsSessionID)
					continue
				}
				if disconnectedSince[session.WindowsSessionID].IsZero() {
					disconnectedSince[session.WindowsSessionID] = now
					continue
				}
				e.mu.Lock()
				logoffAfter := e.cleanupLogoffAfter
				e.mu.Unlock()
				if now.Sub(disconnectedSince[session.WindowsSessionID]) >= logoffAfter {
					_ = e.LogoffTerminalSession(ctx, session.WindowsSessionID)
					delete(disconnectedSince, session.WindowsSessionID)
				}
			}
		}
	}
}

func (e *Executor) InstallInitialize(ctx context.Context) error {
	if err := e.EnableUnlistedRemoteApps(ctx); err != nil {
		return err
	}
	return e.ClearDisconnectedSessionMachinePolicy(ctx)
}

func (e *Executor) ClearDisconnectedSessionMachinePolicy(ctx context.Context) error {
	script := `
$path = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services"
New-Item -Path $path -Force | Out-Null
Remove-ItemProperty -Path $path -Name "MaxDisconnectionTime" -ErrorAction SilentlyContinue
Remove-ItemProperty -Path $path -Name "fResetBroken" -ErrorAction SilentlyContinue
`
	_, err := runPowerShellContext(ctx, script)
	return err
}

func (e *Executor) UninstallCleanup(ctx context.Context) error {
	e.StopDisconnectedSessionCleanup()
	if err := e.ClearMachineStorageIsolationPolicies(ctx); err != nil {
		return err
	}
	script := `
$policy = "HKLM:\SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services"
Remove-ItemProperty -Path $policy -Name "fAllowUnlistedRemotePrograms" -ErrorAction SilentlyContinue
$apps = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Terminal Server\TSAppAllowList\Applications"
if (Test-Path $apps) { Remove-Item -Path $apps -Recurse -Force }
`
	_, err := runPowerShellContext(ctx, script)
	return err
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
