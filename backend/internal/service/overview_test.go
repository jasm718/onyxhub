package service

import (
	"path/filepath"
	"testing"
	"time"

	"onyxhub/backend/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func TestGetNotificationsOnlyReturnsUnreadAlerts(t *testing.T) {
	database, err := gorm.Open(sqlite.Open(filepath.Join(t.TempDir(), "test.db")), &gorm.Config{})
	if err != nil {
		t.Fatalf("open database returned error: %v", err)
	}
	if err := database.AutoMigrate(&models.ActivityLog{}); err != nil {
		t.Fatalf("migrate database returned error: %v", err)
	}

	now := time.Date(2026, 6, 18, 12, 0, 0, 0, time.UTC)
	readAt := now.Add(-time.Hour)
	logs := []models.ActivityLog{
		{ID: "log_unread", Category: models.LogCategoryAlert, Level: models.LogLevelError, Source: models.LogSourceAgent, Type: "unread", Message: "unread", CreatedAt: now},
		{ID: "log_read", Category: models.LogCategoryAlert, Level: models.LogLevelError, Source: models.LogSourceAgent, Type: "read", Message: "read", CreatedAt: now, ReadAt: &readAt},
		{ID: "log_activity", Category: models.LogCategoryActivity, Level: models.LogLevelInfo, Source: models.LogSourceBackend, Type: "activity", Message: "activity", CreatedAt: now},
	}
	if err := database.Create(&logs).Error; err != nil {
		t.Fatalf("create logs returned error: %v", err)
	}

	svc := &Service{db: database, now: func() time.Time { return now }}
	notifications, err := svc.GetNotifications()
	if err != nil {
		t.Fatalf("GetNotifications returned error: %v", err)
	}

	if notifications.UnreadCount != 1 {
		t.Fatalf("unexpected unread count: %d", notifications.UnreadCount)
	}
	if len(notifications.Items) != 1 {
		t.Fatalf("unexpected notification count: %d", len(notifications.Items))
	}
	if notifications.Items[0].ID != "log_unread" {
		t.Fatalf("unexpected notification id: %s", notifications.Items[0].ID)
	}

	sqlDB, err := database.DB()
	if err != nil {
		t.Fatalf("database DB returned error: %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("close database returned error: %v", err)
	}
}
