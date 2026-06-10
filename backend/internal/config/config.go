package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	HTTPAddr  string
	DBPath    string
	JWTSecret string
}

func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:  strings.TrimSpace(os.Getenv("ONYXHUB_HTTP_ADDR")),
		DBPath:    strings.TrimSpace(os.Getenv("ONYXHUB_DB_PATH")),
		JWTSecret: strings.TrimSpace(os.Getenv("ONYXHUB_JWT_SECRET")),
	}

	if cfg.HTTPAddr == "" {
		return Config{}, fmt.Errorf("缺少环境变量 ONYXHUB_HTTP_ADDR")
	}
	if cfg.DBPath == "" {
		return Config{}, fmt.Errorf("缺少环境变量 ONYXHUB_DB_PATH")
	}
	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("缺少环境变量 ONYXHUB_JWT_SECRET")
	}

	return cfg, nil
}
