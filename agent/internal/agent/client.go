package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"onyxhub/agent/internal/applog"

	"github.com/gorilla/websocket"
)

type Client struct {
	cfg      Config
	executor *Executor
	logger   *applog.Logger
}

type inboundEnvelope struct {
	Type      string          `json:"type"`
	CommandID string          `json:"commandId"`
	Name      string          `json:"name"`
	Payload   json.RawMessage `json:"payload"`
}

type commandResult struct {
	Type      string `json:"type"`
	CommandID string `json:"commandId"`
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	Data      any    `json:"data"`
}

func NewClient(cfg Config, logger *applog.Logger) *Client {
	return &Client{
		cfg:      cfg,
		executor: NewExecutor(),
		logger:   logger,
	}
}

func (c *Client) Run(ctx context.Context) error {
	backoff := []time.Duration{
		1 * time.Second,
		2 * time.Second,
		5 * time.Second,
		10 * time.Second,
		30 * time.Second,
		60 * time.Second,
	}

	attempt := 0
	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		err := c.runOnce(ctx)
		if err != nil && !errors.Is(err, context.Canceled) {
			c.logger.Warn("websocket_disconnect", "agent 连接已断开", applog.F("error", err))
		}

		delay := backoff[min(attempt, len(backoff)-1)]
		attempt++
		c.logger.Info("websocket_reconnect_wait", "等待重连 backend", applog.F("delay", delay))
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
}

func (c *Client) runOnce(ctx context.Context) error {
	conn, _, err := websocket.DefaultDialer.DialContext(ctx, c.cfg.BackendWebSocketURL, nil)
	if err != nil {
		c.logger.Error("websocket_connect_failed", "连接 backend 失败", applog.F("backend", c.cfg.BackendWebSocketURL), applog.F("error", err))
		return fmt.Errorf("连接 backend websocket 失败: %w", err)
	}
	defer conn.Close()
	c.logger.Info("websocket_connect", "连接 backend 成功", applog.F("backend", c.cfg.BackendWebSocketURL))

	connCtx, cancel := context.WithCancel(ctx)
	defer cancel()

	var writeMu sync.Mutex
	writeJSON := func(value any) error {
		writeMu.Lock()
		defer writeMu.Unlock()
		if err := conn.SetWriteDeadline(time.Now().Add(10 * time.Second)); err != nil {
			return err
		}
		return conn.WriteJSON(value)
	}

	if err := c.reportFullSnapshot(writeJSON); err != nil {
		return err
	}

	errCh := make(chan error, 2)
	go func() {
		errCh <- c.reportLoop(connCtx, writeJSON)
	}()
	go func() {
		errCh <- c.readLoop(connCtx, conn, writeJSON)
	}()
	go func() {
		<-connCtx.Done()
		_ = conn.Close()
	}()

	select {
	case <-ctx.Done():
		cancel()
		_ = conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""), time.Now().Add(time.Second))
		return ctx.Err()
	case err := <-errCh:
		cancel()
		return err
	}
}

func (c *Client) readLoop(ctx context.Context, conn *websocket.Conn, writeJSON func(any) error) error {
	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		_, raw, err := conn.ReadMessage()
		if err != nil {
			return fmt.Errorf("读取 websocket 消息失败: %w", err)
		}

		var msg inboundEnvelope
		if err := json.Unmarshal(raw, &msg); err != nil {
			c.logger.Warn("websocket_invalid_json", "忽略无效 websocket 消息", applog.F("error", err))
			continue
		}
		if msg.Type != "command" {
			c.logger.Warn("websocket_unknown_message", "忽略未知 websocket 消息类型", applog.F("type", msg.Type))
			continue
		}
		if msg.CommandID == "" || msg.Name == "" {
			c.logger.Warn("command_invalid", "忽略无效命令", applog.F("commandId", msg.CommandID), applog.F("name", msg.Name))
			continue
		}

		go c.handleCommand(ctx, msg, writeJSON)
	}
}

func (c *Client) handleCommand(ctx context.Context, msg inboundEnvelope, writeJSON func(any) error) {
	startedAt := time.Now()
	c.logger.Info("command_received", "收到 agent 命令", applog.F("commandId", msg.CommandID), applog.F("name", msg.Name))
	data, err := c.executor.Execute(ctx, msg.Name, msg.Payload)
	result := commandResult{
		Type:      "command_result",
		CommandID: msg.CommandID,
		Success:   err == nil,
		Data:      data,
	}
	if err != nil {
		result.Message = err.Error()
		result.Data = nil
		c.logger.Error("command_failed", "agent 命令执行失败", applog.F("commandId", msg.CommandID), applog.F("name", msg.Name), applog.F("duration", time.Since(startedAt)), applog.F("error", err))
	} else {
		c.logger.Info("command_succeeded", "agent 命令执行成功", applog.F("commandId", msg.CommandID), applog.F("name", msg.Name), applog.F("duration", time.Since(startedAt)))
	}
	if err := writeJSON(result); err != nil {
		c.logger.Error("command_result_send_failed", "发送命令结果失败", applog.F("commandId", msg.CommandID), applog.F("error", err))
	}
}

func (c *Client) reportLoop(ctx context.Context, writeJSON func(any) error) error {
	ticker := time.NewTicker(c.cfg.HeartbeatInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := c.reportFullSnapshot(writeJSON); err != nil {
				return err
			}
		}
	}
}

func (c *Client) reportFullSnapshot(writeJSON func(any) error) error {
	status, err := CollectHostStatus()
	if err != nil {
		return err
	}
	if err := writeJSON(status); err != nil {
		return fmt.Errorf("上报 host_status 失败: %w", err)
	}

	snapshot, err := c.executor.ListTerminalSessions()
	if err != nil {
		return err
	}
	if err := writeJSON(map[string]any{
		"type":       "session_snapshot",
		"reportedAt": time.Now().UTC(),
		"sessions":   snapshot,
	}); err != nil {
		return fmt.Errorf("上报 session_snapshot 失败: %w", err)
	}
	return nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
