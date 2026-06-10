package main

import (
	"log"

	"onyxhub/backend/internal/config"
	"onyxhub/backend/internal/db"
	httpserver "onyxhub/backend/internal/http"
	"onyxhub/backend/internal/service"
	agentws "onyxhub/backend/internal/ws"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("读取配置失败: %v", err)
	}

	database, err := db.Open(cfg)
	if err != nil {
		log.Fatalf("初始化数据库失败: %v", err)
	}

	agent := agentws.NewManager()
	svc := service.New(database, cfg.JWTSecret, agent)
	agent.SetMessageHandler(svc.HandleAgentMessage)

	router := httpserver.NewRouter(svc, cfg.JWTSecret, agent, cfg.CORSAllowedOrigins)
	log.Printf("OnyxHub backend listening on %s", cfg.HTTPAddr)
	if err := router.Run(cfg.HTTPAddr); err != nil {
		log.Fatalf("启动服务失败: %v", err)
	}
}
