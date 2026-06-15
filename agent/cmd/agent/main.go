package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"runtime"
	"strconv"
	"strings"
	"syscall"

	"onyxhub/agent/internal/agent"
	"onyxhub/agent/internal/applog"

	"golang.org/x/sys/windows/svc"
)

const serviceName = "OnyxHubAgent"

type serviceProgram struct{}

func main() {
	if runtime.GOOS != "windows" {
		log.Fatal("OnyxHub Agent 仅支持 Windows")
	}

	if len(os.Args) > 1 {
		installLogger, loggerErr := applog.NewInstallLogger(applog.ComponentInstaller)
		if loggerErr != nil {
			log.Fatalf("初始化安装日志失败: %v", loggerErr)
		}
		defer installLogger.Close()
		if err := runCommand(os.Args[1:], installLogger); err != nil {
			installLogger.Error("command_failed", "安装命令执行失败", applog.F("command", os.Args[1]), applog.F("error", err))
			log.Fatal(err)
		}
		return
	}

	isService, err := svc.IsWindowsService()
	if err != nil {
		log.Fatalf("检测运行模式失败: %v", err)
	}
	if isService {
		if err := svc.Run(serviceName, &serviceProgram{}); err != nil {
			log.Fatalf("agent service failed: %v", err)
		}
		return
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	runLogger, loggerErr := applog.NewRunLogger(applog.ComponentAgent)
	if loggerErr != nil {
		log.Fatalf("初始化运行日志失败: %v", loggerErr)
	}
	defer runLogger.Close()
	if err := run(ctx, runLogger); err != nil {
		runLogger.Error("agent_exit_error", "Agent 异常退出", applog.F("error", err))
		log.Fatalf("agent failed: %v", err)
	}
}

func runCommand(args []string, logger *applog.Logger) error {
	command := strings.ToLower(strings.TrimSpace(args[0]))
	if logger != nil {
		logger.Info("command_start", "安装命令开始", applog.F("command", command))
	}
	var err error
	if command == "configure" {
		if len(args) < 2 || len(args) > 3 {
			return fmt.Errorf("用法: onyxhub-agent.exe configure <server-address> [heartbeat-seconds]")
		}
		heartbeatSeconds := 3
		if len(args) == 3 {
			value, err := strconv.Atoi(args[2])
			if err != nil {
				return fmt.Errorf("心跳间隔无效: %w", err)
			}
			heartbeatSeconds = value
		}
		err = configureInstall(args[1], heartbeatSeconds, logger)
	} else if command == "cleanup" {
		err = cleanupInstall(logger)
	} else {
		err = runServiceCommand(command, logger)
	}
	if err != nil {
		return err
	}
	if logger != nil {
		logger.Info("command_succeeded", "安装命令成功", applog.F("command", command))
	}
	return nil
}

func (p *serviceProgram) Execute(args []string, changes <-chan svc.ChangeRequest, status chan<- svc.Status) (bool, uint32) {
	status <- svc.Status{State: svc.StartPending}

	ctx, cancel := context.WithCancel(context.Background())
	logger, err := applog.NewRunLogger(applog.ComponentAgent)
	if err != nil {
		log.Printf("初始化运行日志失败: %v", err)
		return false, 1
	}
	defer logger.Close()
	logger.Info("service_execute_start", "Agent 服务开始运行")
	done := make(chan error, 1)
	go func() {
		done <- run(ctx, logger)
	}()

	status <- svc.Status{State: svc.Running, Accepts: svc.AcceptStop | svc.AcceptShutdown}

	for {
		select {
		case change := <-changes:
			switch change.Cmd {
			case svc.Interrogate:
				status <- change.CurrentStatus
			case svc.Stop, svc.Shutdown:
				status <- svc.Status{State: svc.StopPending}
				logger.Info("service_stop_requested", "收到服务停止请求")
				cancel()
				err := <-done
				if err != nil && err != context.Canceled {
					logger.Error("service_stop_failed", "Agent 停止失败", applog.F("error", err))
				}
				logger.Info("service_stopped", "Agent 服务已停止")
				return false, 0
			default:
				logger.Warn("service_command_unsupported", "收到不支持的服务控制命令", applog.F("cmd", change.Cmd))
			}
		case err := <-done:
			if err != nil && err != context.Canceled {
				logger.Error("agent_exit_error", "Agent 异常退出", applog.F("error", err))
				return false, 1
			}
			logger.Info("agent_exit", "Agent 正常退出")
			return false, 0
		}
	}
}

func run(ctx context.Context, logger *applog.Logger) error {
	logger.Info("agent_start", "OnyxHub Agent 启动")

	cfg, err := agent.LoadConfig()
	if err != nil {
		logger.Error("config_load_failed", "读取 agent 配置失败", applog.F("error", err))
		return err
	}

	logger.Info("config_loaded", "agent 配置加载完成", applog.F("backend", cfg.BackendWebSocketURL), applog.F("heartbeatSeconds", cfg.HeartbeatIntervalSeconds))
	return agent.NewClient(cfg, logger).Run(ctx)
}
