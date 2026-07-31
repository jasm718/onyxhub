package db

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"onyxhub/backend/internal/auth"
	"onyxhub/backend/internal/config"
	"onyxhub/backend/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func Open(cfg config.Config) (*gorm.DB, error) {
	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0755); err != nil {
		return nil, fmt.Errorf("创建数据库目录失败: %w", err)
	}

	database, err := gorm.Open(sqlite.Open(cfg.DBPath), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("打开数据库失败: %w", err)
	}

	if err := database.Exec("PRAGMA foreign_keys = ON").Error; err != nil {
		return nil, fmt.Errorf("启用 SQLite foreign_keys 失败: %w", err)
	}

	if err := database.AutoMigrate(
		&models.User{},
		&models.Application{},
		&models.UserAppAuthorization{},
		&models.AgentStatus{},
		&models.AgentMetric{},
		&models.SystemSettings{},
		&models.Session{},
		&models.ActivityLog{},
	); err != nil {
		return nil, fmt.Errorf("数据库迁移失败: %w", err)
	}

	if err := dropApplicationCategoryColumn(database); err != nil {
		return nil, err
	}
	if err := dropAgentNetworkColumns(database); err != nil {
		return nil, err
	}
	if err := dropApplicationRemoteAppState(database); err != nil {
		return nil, err
	}
	if err := backfillActivityLogs(database); err != nil {
		return nil, err
	}
	if err := migrateAgentIssuesToActivityLogs(database); err != nil {
		return nil, err
	}
	if err := dropAgentIssuesTable(database); err != nil {
		return nil, err
	}
	if err := ensureApplicationIcons(database); err != nil {
		return nil, err
	}

	if err := ensureAdmin(database); err != nil {
		return nil, err
	}

	return database, nil
}

func dropApplicationRemoteAppState(database *gorm.DB) error {
	if err := dropColumnsIfExist(database, "applications", "remote_app_registered", "remote_app_alias"); err != nil {
		return fmt.Errorf("删除应用 RemoteApp 状态字段失败: %w", err)
	}
	return nil
}

type tableColumn struct {
	Name string `gorm:"column:name"`
}

func dropApplicationCategoryColumn(database *gorm.DB) error {
	var columns []tableColumn
	if err := database.Raw("PRAGMA table_info(applications)").Scan(&columns).Error; err != nil {
		return fmt.Errorf("读取应用表结构失败: %w", err)
	}

	for _, column := range columns {
		if column.Name == "category" {
			if err := database.Exec("ALTER TABLE applications DROP COLUMN category").Error; err != nil {
				return fmt.Errorf("删除应用分类字段失败: %w", err)
			}
			return nil
		}
	}
	return nil
}

func dropAgentNetworkColumns(database *gorm.DB) error {
	if err := dropColumnsIfExist(database, "agent_statuses", "network_rx", "network_tx"); err != nil {
		return err
	}
	if err := dropColumnsIfExist(database, "agent_metrics", "network_rx", "network_tx"); err != nil {
		return err
	}
	return nil
}

func dropColumnsIfExist(database *gorm.DB, table string, names ...string) error {
	var columns []tableColumn
	if err := database.Raw("PRAGMA table_info(" + table + ")").Scan(&columns).Error; err != nil {
		return fmt.Errorf("读取 %s 表结构失败: %w", table, err)
	}

	present := make(map[string]bool, len(columns))
	for _, column := range columns {
		present[column.Name] = true
	}

	for _, name := range names {
		if !present[name] {
			continue
		}
		if err := database.Exec("ALTER TABLE " + table + " DROP COLUMN " + name).Error; err != nil {
			return fmt.Errorf("删除 %s 表字段 %s 失败: %w", table, name, err)
		}
	}
	return nil
}

func migrateAgentIssuesToActivityLogs(database *gorm.DB) error {
	var columns []tableColumn
	if err := database.Raw("PRAGMA table_info(agent_issues)").Scan(&columns).Error; err != nil {
		return nil
	}
	if len(columns) == 0 {
		return nil
	}

	var issues []struct {
		ID        string     `gorm:"column:id"`
		Level     string     `gorm:"column:level"`
		Type      string     `gorm:"column:type"`
		Message   string     `gorm:"column:message"`
		CreatedAt time.Time  `gorm:"column:created_at"`
		ReadAt    *time.Time `gorm:"column:read_at"`
	}
	if err := database.Table("agent_issues").Find(&issues).Error; err != nil {
		return fmt.Errorf("读取旧异常日志失败: %w", err)
	}

	for _, issue := range issues {
		var exists int64
		if err := database.Model(&models.ActivityLog{}).Where("id = ?", issue.ID).Count(&exists).Error; err != nil {
			return fmt.Errorf("检查日志是否存在失败: %w", err)
		}
		if exists > 0 {
			continue
		}
		logItem := models.ActivityLog{
			ID:         issue.ID,
			Category:   models.LogCategoryAlert,
			Level:      issue.Level,
			Source:     models.LogSourceAgent,
			Type:       issue.Type,
			ActorType:  models.ActorTypeSystem,
			TargetType: models.TargetTypeSystem,
			TargetID:   models.SingleAgentID,
			Message:    issue.Message,
			Detail:     "",
			CreatedAt:  issue.CreatedAt,
			ReadAt:     issue.ReadAt,
		}
		if err := database.Create(&logItem).Error; err != nil {
			return fmt.Errorf("迁移异常日志失败: %w", err)
		}
	}
	return nil
}

func backfillActivityLogs(database *gorm.DB) error {
	var columns []tableColumn
	if err := database.Raw("PRAGMA table_info(activity_logs)").Scan(&columns).Error; err != nil {
		return fmt.Errorf("读取活动日志表结构失败: %w", err)
	}
	if len(columns) == 0 {
		return nil
	}

	if err := database.Exec(`
		UPDATE activity_logs
		SET
			category = COALESCE(category, ?),
			level = COALESCE(level, ?),
			source = COALESCE(source, ?),
			detail = COALESCE(detail, ''),
			read_at = read_at
		WHERE category IS NULL OR level IS NULL OR source IS NULL OR detail IS NULL
	`, models.LogCategoryActivity, models.LogLevelInfo, models.LogSourceBackend).Error; err != nil {
		return fmt.Errorf("回填活动日志字段失败: %w", err)
	}
	return nil
}

func dropAgentIssuesTable(database *gorm.DB) error {
	var columns []tableColumn
	if err := database.Raw("PRAGMA table_info(agent_issues)").Scan(&columns).Error; err != nil {
		return nil
	}
	if len(columns) == 0 {
		return nil
	}
	if err := database.Exec("DROP TABLE agent_issues").Error; err != nil {
		return fmt.Errorf("删除旧异常日志表失败: %w", err)
	}
	return nil
}

func ensureApplicationIcons(database *gorm.DB) error {
	if err := database.Model(&models.Application{}).
		Where("icon IS NULL OR icon = ?", "").
		Update("icon", models.DefaultApplicationIcon).Error; err != nil {
		return fmt.Errorf("初始化应用默认图标失败: %w", err)
	}
	return nil
}

func ensureAdmin(database *gorm.DB) error {
	var existing models.User
	err := database.Where("username = ?", "admin").First(&existing).Error
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("查询固定管理员失败: %w", err)
	}

	passwordHash, err := auth.HashPassword("123456")
	if err != nil {
		return fmt.Errorf("初始化固定管理员密码失败: %w", err)
	}

	admin := models.User{
		Username:     "admin",
		DisplayName:  "管理员",
		PasswordHash: passwordHash,
		Role:         models.RoleAdmin,
		Status:       models.StatusActive,
	}
	if err := database.Create(&admin).Error; err != nil {
		return fmt.Errorf("初始化固定管理员失败: %w", err)
	}
	return nil
}
