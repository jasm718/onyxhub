package db

import (
	"path/filepath"
	"testing"

	"onyxhub/backend/internal/config"
	"onyxhub/backend/internal/models"
)

func TestOpenInitializesApplicationIconDefault(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "onyxhub.db")
	cfg := config.Config{
		HTTPAddr:  "127.0.0.1:0",
		DBPath:    dbPath,
		JWTSecret: "test-secret",
	}

	database, err := Open(cfg)
	if err != nil {
		t.Fatalf("Open returned error: %v", err)
	}

	if err := database.Exec(
		"INSERT INTO applications (id, name, path, status) VALUES (?, ?, ?, ?)",
		"app_default_icon",
		"c:\\app\\default.exe",
		"active",
		models.StatusActive,
	).Error; err != nil {
		t.Fatalf("insert application returned error: %v", err)
	}

	var icon string
	if err := database.Raw("SELECT icon FROM applications WHERE id = ?", "app_default_icon").Scan(&icon).Error; err != nil {
		t.Fatalf("query icon returned error: %v", err)
	}
	if icon != models.DefaultApplicationIcon {
		t.Fatalf("unexpected default icon: %q", icon)
	}

	if err := database.Model(&models.Application{}).Where("id = ?", "app_default_icon").Update("icon", "").Error; err != nil {
		t.Fatalf("clear icon returned error: %v", err)
	}
	sqlDB, err := database.DB()
	if err != nil {
		t.Fatalf("database DB returned error: %v", err)
	}
	if err := sqlDB.Close(); err != nil {
		t.Fatalf("close database returned error: %v", err)
	}

	database, err = Open(cfg)
	if err != nil {
		t.Fatalf("reopen returned error: %v", err)
	}
	defer func() {
		sqlDB, err := database.DB()
		if err != nil {
			t.Fatalf("database DB after reopen returned error: %v", err)
		}
		if err := sqlDB.Close(); err != nil {
			t.Fatalf("close reopened database returned error: %v", err)
		}
	}()
	if err := database.Raw("SELECT icon FROM applications WHERE id = ?", "app_default_icon").Scan(&icon).Error; err != nil {
		t.Fatalf("query backfilled icon returned error: %v", err)
	}
	if icon != models.DefaultApplicationIcon {
		t.Fatalf("unexpected backfilled icon: %q", icon)
	}
}
