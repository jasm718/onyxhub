package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	HTTPAddr           string
	DBPath             string
	JWTSecret          string
	CORSAllowedOrigins []string
}

func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:           strings.TrimSpace(os.Getenv("ONYXHUB_HTTP_ADDR")),
		DBPath:             strings.TrimSpace(os.Getenv("ONYXHUB_DB_PATH")),
		JWTSecret:          strings.TrimSpace(os.Getenv("ONYXHUB_JWT_SECRET")),
		CORSAllowedOrigins: parseCSV(os.Getenv("ONYXHUB_CORS_ALLOWED_ORIGINS")),
	}
	if len(cfg.CORSAllowedOrigins) == 0 {
		cfg.CORSAllowedOrigins = []string{
			"http://localhost:3000",
			"http://127.0.0.1:3000",
			"http://localhost:3001",
			"http://127.0.0.1:3001",
		}
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

func parseCSV(value string) []string {
	parts := strings.Split(value, ",")
	items := make([]string, 0, len(parts))
	for _, part := range parts {
		item := strings.TrimSpace(part)
		if item != "" {
			items = append(items, item)
		}
	}
	return items
}
