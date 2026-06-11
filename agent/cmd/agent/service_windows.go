package main

import (
	"errors"
	"fmt"
	"os"
	"syscall"
	"time"

	"onyxhub/agent/internal/applog"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

const (
	serviceDisplayName = "OnyxHub Agent"
	serviceDescription = "OnyxHub Windows host control agent"
)

func runServiceCommand(command string, logger *applog.Logger) error {
	switch command {
	case "install":
		return installService(logger)
	case "start":
		return startService(logger)
	case "stop":
		return stopService(logger)
	case "uninstall":
		return uninstallService(logger)
	default:
		return fmt.Errorf("未知命令: %s", command)
	}
}

func connectServiceManager() (*mgr.Mgr, error) {
	manager, err := mgr.Connect()
	if err != nil {
		return nil, fmt.Errorf("连接 Windows 服务管理器失败: %w", err)
	}
	return manager, nil
}

func openAgentService(manager *mgr.Mgr) (*mgr.Service, error) {
	service, err := manager.OpenService(serviceName)
	if err != nil {
		if errors.Is(err, windows.ERROR_SERVICE_DOES_NOT_EXIST) {
			return nil, nil
		}
		if errors.Is(err, windows.ERROR_SERVICE_MARKED_FOR_DELETE) {
			return nil, err
		}
		return nil, fmt.Errorf("打开服务失败: %w", err)
	}
	return service, nil
}

func installService(logger *applog.Logger) error {
	if logger != nil {
		logger.Info("service_install_start", "开始安装 Agent 服务")
	}
	manager, err := connectServiceManager()
	if err != nil {
		return err
	}
	defer manager.Disconnect()

	exePath, err := os.Executable()
	if err != nil {
		return fmt.Errorf("获取当前程序路径失败: %w", err)
	}

	if existing, err := openAgentService(manager); err != nil {
		return err
	} else if existing != nil {
		if logger != nil {
			logger.Info("service_install_existing", "检测到已存在服务，更新服务配置")
		}
		defer existing.Close()
		config, err := existing.Config()
		if err != nil {
			return fmt.Errorf("读取服务配置失败: %w", err)
		}
		config.StartType = mgr.StartAutomatic
		config.BinaryPathName = syscall.EscapeArg(exePath)
		config.DisplayName = serviceDisplayName
		config.Description = serviceDescription
		if err := existing.UpdateConfig(config); err != nil {
			return fmt.Errorf("更新服务配置失败: %w", err)
		}
		if err := existing.SetRecoveryActions(recoveryActions(), 86400); err != nil {
			return fmt.Errorf("配置服务失败自动重启失败: %w", err)
		}
		if logger != nil {
			logger.Info("service_install_succeeded", "Agent 服务配置更新完成", applog.F("path", exePath))
		}
		return nil
	}

	service, err := manager.CreateService(serviceName, exePath, mgr.Config{
		StartType:   mgr.StartAutomatic,
		DisplayName: serviceDisplayName,
		Description: serviceDescription,
	})
	if err != nil {
		return fmt.Errorf("创建服务失败: %w", err)
	}
	defer service.Close()

	if err := service.SetRecoveryActions(recoveryActions(), 86400); err != nil {
		return fmt.Errorf("配置服务失败自动重启失败: %w", err)
	}
	if logger != nil {
		logger.Info("service_install_succeeded", "Agent 服务安装完成", applog.F("path", exePath))
	}
	return nil
}

func recoveryActions() []mgr.RecoveryAction {
	return []mgr.RecoveryAction{
		{Type: mgr.ServiceRestart, Delay: 5 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 10 * time.Second},
		{Type: mgr.ServiceRestart, Delay: 30 * time.Second},
	}
}

func startService(logger *applog.Logger) error {
	if logger != nil {
		logger.Info("service_start_start", "开始启动 Agent 服务")
	}
	manager, err := connectServiceManager()
	if err != nil {
		return err
	}
	defer manager.Disconnect()

	service, err := openAgentService(manager)
	if err != nil {
		return err
	}
	if service == nil {
		return fmt.Errorf("服务不存在: %s", serviceName)
	}
	defer service.Close()

	if err := service.Start(); err != nil && !errors.Is(err, windows.ERROR_SERVICE_ALREADY_RUNNING) {
		return fmt.Errorf("启动服务失败: %w", err)
	}
	if err := waitServiceState(service, svc.Running, 10*time.Second); err != nil {
		return err
	}
	if logger != nil {
		logger.Info("service_start_succeeded", "Agent 服务启动完成")
	}
	return nil
}

func stopService(logger *applog.Logger) error {
	if logger != nil {
		logger.Info("service_stop_start", "开始停止 Agent 服务")
	}
	manager, err := connectServiceManager()
	if err != nil {
		return err
	}
	defer manager.Disconnect()

	service, err := openAgentService(manager)
	if err != nil {
		return err
	}
	if service == nil {
		if logger != nil {
			logger.Info("service_stop_skipped", "Agent 服务不存在，跳过停止")
		}
		return nil
	}
	defer service.Close()

	status, err := service.Query()
	if err != nil {
		return fmt.Errorf("查询服务状态失败: %w", err)
	}
	if status.State == svc.Stopped {
		if logger != nil {
			logger.Info("service_stop_skipped", "Agent 服务已停止")
		}
		return nil
	}

	if _, err := service.Control(svc.Stop); err != nil && !errors.Is(err, windows.ERROR_SERVICE_NOT_ACTIVE) {
		return fmt.Errorf("停止服务失败: %w", err)
	}
	if err := waitServiceState(service, svc.Stopped, 15*time.Second); err != nil {
		return err
	}
	if logger != nil {
		logger.Info("service_stop_succeeded", "Agent 服务停止完成")
	}
	return nil
}

func uninstallService(logger *applog.Logger) error {
	if logger != nil {
		logger.Info("service_uninstall_start", "开始卸载 Agent 服务")
	}
	manager, err := connectServiceManager()
	if err != nil {
		return err
	}
	defer manager.Disconnect()

	service, err := openAgentService(manager)
	if err != nil {
		return err
	}
	if service == nil {
		if logger != nil {
			logger.Info("service_uninstall_skipped", "Agent 服务不存在，跳过卸载")
		}
		return nil
	}

	if err := stopOpenService(service); err != nil {
		service.Close()
		return err
	}
	if err := service.Delete(); err != nil && !errors.Is(err, windows.ERROR_SERVICE_MARKED_FOR_DELETE) {
		service.Close()
		return fmt.Errorf("删除服务失败: %w", err)
	}
	if err := service.Close(); err != nil {
		return fmt.Errorf("关闭服务句柄失败: %w", err)
	}
	if err := waitServiceDeleted(manager, 15*time.Second); err != nil {
		return err
	}
	if logger != nil {
		logger.Info("service_uninstall_succeeded", "Agent 服务卸载完成")
	}
	return nil
}

func stopOpenService(service *mgr.Service) error {
	status, err := service.Query()
	if err != nil {
		return fmt.Errorf("查询服务状态失败: %w", err)
	}
	if status.State == svc.Stopped {
		return nil
	}

	if _, err := service.Control(svc.Stop); err != nil && !errors.Is(err, windows.ERROR_SERVICE_NOT_ACTIVE) {
		return fmt.Errorf("停止服务失败: %w", err)
	}
	return waitServiceState(service, svc.Stopped, 15*time.Second)
}

func waitServiceState(service *mgr.Service, expected svc.State, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		status, err := service.Query()
		if err != nil {
			return fmt.Errorf("查询服务状态失败: %w", err)
		}
		if status.State == expected {
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("等待服务状态超时: %v", expected)
		}
		time.Sleep(500 * time.Millisecond)
	}
}

func waitServiceDeleted(manager *mgr.Mgr, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for {
		service, err := openAgentService(manager)
		if err != nil {
			if errors.Is(err, windows.ERROR_SERVICE_MARKED_FOR_DELETE) {
				if time.Now().After(deadline) {
					return fmt.Errorf("旧服务未能及时删除: %s", serviceName)
				}
				time.Sleep(500 * time.Millisecond)
				continue
			}
			return err
		}
		if service == nil {
			return nil
		}
		service.Close()
		if time.Now().After(deadline) {
			return fmt.Errorf("旧服务未能及时删除: %s", serviceName)
		}
		time.Sleep(500 * time.Millisecond)
	}
}
