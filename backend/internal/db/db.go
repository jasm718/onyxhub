package db

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"

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

	if err := ensureAdmin(database); err != nil {
		return nil, err
	}

	return database, nil
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
