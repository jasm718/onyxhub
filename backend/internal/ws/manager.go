package ws

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type MessageHandler func(raw []byte) error

type Manager struct {
	mu      sync.Mutex
	writeMu sync.Mutex

	conn    *websocket.Conn
	pending map[string]pendingCommand
	handler MessageHandler
}

type pendingCommand struct {
	conn *websocket.Conn
	ch   chan CommandResult
}

type CommandResult struct {
	Success   bool
	Message   string
	Data      json.RawMessage
	Err       error
	CommandID string
}

type envelope struct {
	Type string `json:"type"`
}

type commandResultMessage struct {
	Type      string          `json:"type"`
	CommandID string          `json:"commandId"`
	Success   bool            `json:"success"`
	Message   string          `json:"message"`
	Data      json.RawMessage `json:"data"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func NewManager() *Manager {
	return &Manager{
		pending: make(map[string]pendingCommand),
	}
}

func (m *Manager) SetMessageHandler(handler MessageHandler) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.handler = handler
}

func (m *Manager) IsConnected() bool {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.conn != nil
}

func (m *Manager) Handle(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		log.Printf("agent websocket upgrade failed: %v", err)
		return
	}

	m.mu.Lock()
	old := m.conn
	m.conn = conn
	m.mu.Unlock()

	if old != nil {
		_ = old.Close()
	}

	m.readLoop(conn)
}

func (m *Manager) SendCommand(ctx context.Context, name string, payload any) (CommandResult, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return CommandResult{}, errors.New("agent 命令名不能为空")
	}

	commandID := newCommandID()
	resultCh := make(chan CommandResult, 1)

	m.mu.Lock()
	if m.conn == nil {
		m.mu.Unlock()
		return CommandResult{}, errors.New("agent 未连接")
	}
	conn := m.conn
	m.pending[commandID] = pendingCommand{conn: conn, ch: resultCh}
	m.mu.Unlock()

	msg := map[string]any{
		"type":      "command",
		"commandId": commandID,
		"name":      name,
		"payload":   payload,
	}

	m.writeMu.Lock()
	err := conn.WriteJSON(msg)
	m.writeMu.Unlock()
	if err != nil {
		m.removePending(commandID)
		return CommandResult{}, fmt.Errorf("下发 agent 命令失败: %w", err)
	}

	select {
	case result := <-resultCh:
		if result.Err != nil {
			return CommandResult{}, result.Err
		}
		if !result.Success {
			if strings.TrimSpace(result.Message) == "" {
				return CommandResult{}, fmt.Errorf("agent 命令执行失败: %s", name)
			}
			return CommandResult{}, errors.New(result.Message)
		}
		return result, nil
	case <-ctx.Done():
		m.removePending(commandID)
		return CommandResult{}, fmt.Errorf("agent 命令超时: %s", name)
	}
}

func (m *Manager) readLoop(conn *websocket.Conn) {
	defer func() {
		_ = conn.Close()
		m.mu.Lock()
		if m.conn == conn {
			m.conn = nil
		}
		for commandID, pending := range m.pending {
			if pending.conn != conn {
				continue
			}
			delete(m.pending, commandID)
			pending.ch <- CommandResult{Err: errors.New("agent 连接已断开")}
		}
		m.mu.Unlock()
	}()

	for {
		_, raw, err := conn.ReadMessage()
		if err != nil {
			log.Printf("agent websocket read failed: %v", err)
			return
		}

		var env envelope
		if err := json.Unmarshal(raw, &env); err != nil {
			log.Printf("agent websocket message invalid json: %v", err)
			continue
		}

		if env.Type == "command_result" {
			m.handleCommandResult(raw)
			continue
		}

		m.mu.Lock()
		handler := m.handler
		m.mu.Unlock()
		if handler == nil {
			log.Printf("agent websocket message handler is nil")
			continue
		}
		if err := handler(raw); err != nil {
			log.Printf("agent websocket message handler failed: %v", err)
		}
	}
}

func (m *Manager) handleCommandResult(raw []byte) {
	var msg commandResultMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		log.Printf("agent command result invalid: %v", err)
		return
	}
	if msg.CommandID == "" {
		log.Printf("agent command result missing commandId")
		return
	}

	m.mu.Lock()
	pending, ok := m.pending[msg.CommandID]
	if ok {
		delete(m.pending, msg.CommandID)
	}
	m.mu.Unlock()
	if !ok {
		log.Printf("agent command result ignored, commandId=%s", msg.CommandID)
		return
	}

	pending.ch <- CommandResult{
		Success:   msg.Success,
		Message:   msg.Message,
		Data:      msg.Data,
		CommandID: msg.CommandID,
	}
}

func (m *Manager) removePending(commandID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.pending, commandID)
}

func newCommandID() string {
	var b [12]byte
	if _, err := rand.Read(b[:]); err != nil {
		return fmt.Sprintf("cmd_%d", time.Now().UnixNano())
	}
	return "cmd_" + hex.EncodeToString(b[:])
}
