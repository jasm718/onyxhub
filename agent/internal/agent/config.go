package agent

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	BackendWebSocketURL      string        `json:"backendWebSocketUrl"`
	HeartbeatIntervalSeconds int           `json:"heartbeatIntervalSeconds"`
	HeartbeatInterval        time.Duration `json:"-"`
}

func LoadConfig() (Config, error) {
	path := strings.TrimSpace(os.Getenv("ONYXHUB_AGENT_CONFIG"))
	if path == "" {
		executable, err := os.Executable()
		if err != nil {
			return Config{}, fmt.Errorf("获取当前程序路径失败: %w", err)
		}
		path = filepath.Join(filepath.Dir(executable), "agent.json")
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		return Config{}, fmt.Errorf("读取 agent 配置失败: %w", err)
	}
	raw = bytes.TrimPrefix(raw, []byte{0xEF, 0xBB, 0xBF})

	var cfg Config
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return Config{}, fmt.Errorf("解析 agent 配置失败: %w", err)
	}
	applyEnvOverrides(&cfg)
	if err := cfg.validate(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func applyEnvOverrides(cfg *Config) {
	if v := strings.TrimSpace(os.Getenv("ONYXHUB_BACKEND_WS_URL")); v != "" {
		cfg.BackendWebSocketURL = v
	}
	if v := strings.TrimSpace(os.Getenv("ONYXHUB_AGENT_HEARTBEAT_SECONDS")); v != "" {
		seconds, err := strconv.Atoi(v)
		if err == nil {
			cfg.HeartbeatIntervalSeconds = seconds
		}
	}
}

func (c *Config) validate() error {
	c.BackendWebSocketURL = strings.TrimSpace(c.BackendWebSocketURL)

	if c.BackendWebSocketURL == "" {
		return errors.New("agent 配置缺少 backendWebSocketUrl")
	}
	if c.HeartbeatIntervalSeconds <= 0 {
		c.HeartbeatIntervalSeconds = 30
	}
	c.HeartbeatInterval = time.Duration(c.HeartbeatIntervalSeconds) * time.Second
	return nil
}
