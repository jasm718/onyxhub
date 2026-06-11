package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"

	"onyxhub/agent/internal/applog"

	"golang.org/x/sys/windows/registry"
)

func configureInstall(serverAddress string, heartbeatSeconds int, logger *applog.Logger) error {
	if heartbeatSeconds <= 0 {
		return errors.New("心跳间隔必须大于 0")
	}

	backendURL, err := normalizeBackendWebSocketURL(serverAddress)
	if err != nil {
		return err
	}
	if logger != nil {
		logger.Info("configure_start", "开始配置 OnyxHub Agent", applog.F("serverAddress", serverAddress), applog.F("backend", backendURL), applog.F("heartbeatSeconds", heartbeatSeconds))
	}

	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("获取当前程序路径失败: %w", err)
	}
	installDir := filepath.Dir(exePath)
	configDir := filepath.Dir(exePath)
	logDir := filepath.Join(installDir, "Logs")
	if err := os.MkdirAll(installDir, 0755); err != nil {
		return fmt.Errorf("创建安装目录失败: %w", err)
	}
	if err := os.MkdirAll(logDir, 0755); err != nil {
		return fmt.Errorf("创建日志目录失败: %w", err)
	}
	if err := os.MkdirAll(configDir, 0755); err != nil {
		return fmt.Errorf("创建配置目录失败: %w", err)
	}

	config := map[string]any{
		"backendWebSocketUrl":      backendURL,
		"heartbeatIntervalSeconds": heartbeatSeconds,
	}
	raw, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return fmt.Errorf("生成 agent 配置失败: %w", err)
	}
	if err := os.WriteFile(filepath.Join(configDir, "agent.json"), raw, 0644); err != nil {
		return fmt.Errorf("写入 agent 配置失败: %w", err)
	}
	if logger != nil {
		logger.Info("configure_write_config", "agent 配置写入完成", applog.F("path", filepath.Join(configDir, "agent.json")), applog.F("logDir", logDir))
	}

	if err := configureTerminalServicesPolicy(); err != nil {
		return err
	}
	if logger != nil {
		logger.Info("configure_policy", "远程应用策略配置完成")
	}
	return nil
}

func normalizeBackendWebSocketURL(value string) (string, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return "", errors.New("服务端地址不能为空")
	}
	if containsInvalidServerAddressChar(value) {
		return "", errors.New("服务端地址不能包含空白字符或引号")
	}
	if !strings.Contains(value, "://") {
		value = "ws://" + value
	}

	explicitPort, err := hasExplicitPort(value)
	if err != nil {
		return "", err
	}

	parsed, err := url.Parse(value)
	if err != nil {
		return "", fmt.Errorf("服务端地址格式无效: %w", err)
	}

	scheme := strings.ToLower(parsed.Scheme)
	switch scheme {
	case "http":
		scheme = "ws"
	case "https":
		scheme = "wss"
	case "ws", "wss":
	default:
		return "", fmt.Errorf("服务端地址协议无效: %s", parsed.Scheme)
	}

	host := strings.TrimSpace(parsed.Hostname())
	if host == "" {
		return "", errors.New("服务端地址缺少主机名")
	}
	if parsed.EscapedPath() != "" && parsed.EscapedPath() != "/" {
		return "", errors.New("服务端地址不能包含路径")
	}
	if parsed.RawQuery != "" || parsed.Fragment != "" {
		return "", errors.New("服务端地址不能包含查询参数或片段")
	}

	port := "8080"
	if explicitPort {
		port = parsed.Port()
		if port == "" {
			return "", errors.New("服务端端口无效")
		}
		portNumber, err := strconv.Atoi(port)
		if err != nil || portNumber < 1 || portNumber > 65535 {
			return "", errors.New("服务端端口无效")
		}
	}
	return fmt.Sprintf("%s://%s/ws/agent", scheme, net.JoinHostPort(host, port)), nil
}

func containsInvalidServerAddressChar(value string) bool {
	for _, r := range value {
		if unicode.IsSpace(r) || r == '"' {
			return true
		}
	}
	return false
}

func hasExplicitPort(value string) (bool, error) {
	authority := value
	if index := strings.Index(authority, "://"); index >= 0 {
		authority = authority[index+3:]
	}
	if index := strings.Index(authority, "/"); index >= 0 {
		authority = authority[:index]
	}
	if strings.HasPrefix(authority, "[") {
		end := strings.Index(authority, "]")
		if end < 0 {
			return false, fmt.Errorf("服务端地址格式无效: %s", value)
		}
		return strings.HasPrefix(authority[end+1:], ":"), nil
	}
	host, port, err := net.SplitHostPort(authority)
	if err == nil {
		return host != "" && port != "", nil
	}
	lastColon := strings.LastIndex(authority, ":")
	return lastColon > 0 && lastColon == strings.Index(authority, ":"), nil
}

func configureTerminalServicesPolicy() error {
	key, _, err := registry.CreateKey(
		registry.LOCAL_MACHINE,
		`SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services`,
		registry.SET_VALUE,
	)
	if err != nil {
		return fmt.Errorf("打开远程应用策略注册表失败: %w", err)
	}
	defer key.Close()

	if err := key.SetDWordValue("fAllowUnlistedRemotePrograms", 1); err != nil {
		return fmt.Errorf("写入远程应用策略失败: %w", err)
	}
	_ = key.DeleteValue("MaxDisconnectionTime")
	_ = key.DeleteValue("fResetBroken")
	return nil
}

func cleanupInstall(logger *applog.Logger) error {
	if logger != nil {
		logger.Info("cleanup_start", "开始卸载清理")
	}
	if err := deleteRegistryValues(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\Explorer`, "NoDrives", "NoViewOnDrive"); err != nil {
		return err
	}
	if err := deleteRegistryValues(registry.LOCAL_MACHINE, `SOFTWARE\Policies\Microsoft\Windows NT\Terminal Services`, "fAllowUnlistedRemotePrograms", "MaxDisconnectionTime", "fResetBroken"); err != nil {
		return err
	}
	if err := deleteRegistryTree(registry.LOCAL_MACHINE, `SOFTWARE\Microsoft\Windows NT\CurrentVersion\Terminal Server\TSAppAllowList\Applications`); err != nil {
		return err
	}
	if logger != nil {
		logger.Info("cleanup_succeeded", "卸载清理完成")
	}
	return nil
}

func deleteRegistryTree(root registry.Key, path string) error {
	key, err := registry.OpenKey(root, path, registry.ENUMERATE_SUB_KEYS|registry.QUERY_VALUE|registry.WRITE)
	if err != nil {
		if errors.Is(err, registry.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("打开注册表树失败: %s: %w", path, err)
	}
	names, err := key.ReadSubKeyNames(-1)
	closeErr := key.Close()
	if err != nil {
		return fmt.Errorf("读取注册表子项失败: %s: %w", path, err)
	}
	if closeErr != nil {
		return fmt.Errorf("关闭注册表树失败: %s: %w", path, closeErr)
	}
	for _, name := range names {
		if err := deleteRegistryTree(root, path+`\`+name); err != nil {
			return err
		}
	}
	if err := registry.DeleteKey(root, path); err != nil {
		if errors.Is(err, registry.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("删除注册表树失败: %s: %w", path, err)
	}
	return nil
}

func deleteRegistryValues(root registry.Key, path string, names ...string) error {
	key, err := registry.OpenKey(root, path, registry.SET_VALUE)
	if err != nil {
		if errors.Is(err, registry.ErrNotExist) {
			return nil
		}
		return fmt.Errorf("打开注册表失败: %s: %w", path, err)
	}
	defer key.Close()
	for _, name := range names {
		if err := key.DeleteValue(name); err != nil && !errors.Is(err, registry.ErrNotExist) {
			return fmt.Errorf("删除注册表值失败: %s\\%s: %w", path, name, err)
		}
	}
	return nil
}
