package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"onyxhub/backend/internal/models"

	"gorm.io/gorm"
)

type UpdateSystemSettingsInput struct {
	StorageRootPath                  *string `json:"storageRootPath"`
	StorageQuotaMB                   *int    `json:"storageQuotaMb"`
	StorageVisibleDriveLetter        *string `json:"storageVisibleDriveLetter"`
	RDPLocalDriveMappingEnabled      *bool   `json:"rdpLocalDriveMappingEnabled"`
	DisconnectedSessionLogoffMinutes *int    `json:"disconnectedSessionLogoffMinutes"`
}

func defaultSystemSettings() models.SystemSettings {
	return models.SystemSettings{
		ID:                               models.SingleSystemSettingsID,
		StorageRootPath:                  "",
		StorageQuotaMB:                   0,
		StorageVisibleDriveLetter:        "H",
		RDPLocalDriveMappingEnabled:      false,
		DisconnectedSessionLogoffMinutes: 0,
	}
}

func (s *Service) GetSystemSettings() (models.SystemSettings, error) {
	var settings models.SystemSettings
	err := s.db.First(&settings, "id = ?", models.SingleSystemSettingsID).Error
	if err == nil {
		return settings, nil
	}
	if !isNotFound(err) {
		return models.SystemSettings{}, fmt.Errorf("查询系统设置失败: %w", err)
	}

	settings = defaultSystemSettings()
	if err := s.db.Create(&settings).Error; err != nil {
		return models.SystemSettings{}, fmt.Errorf("初始化系统设置失败: %w", err)
	}
	return settings, nil
}

func (s *Service) UpdateSystemSettings(actorUserID string, input UpdateSystemSettingsInput) (models.SystemSettings, error) {
	current, err := s.GetSystemSettings()
	if err != nil {
		return models.SystemSettings{}, err
	}

	next := current
	if input.StorageRootPath != nil {
		next.StorageRootPath = trim(*input.StorageRootPath)
	}
	if input.StorageQuotaMB != nil {
		next.StorageQuotaMB = *input.StorageQuotaMB
	}
	if input.StorageVisibleDriveLetter != nil {
		next.StorageVisibleDriveLetter = strings.ToUpper(trim(*input.StorageVisibleDriveLetter))
	}
	if input.RDPLocalDriveMappingEnabled != nil {
		next.RDPLocalDriveMappingEnabled = *input.RDPLocalDriveMappingEnabled
	}
	if input.DisconnectedSessionLogoffMinutes != nil {
		next.DisconnectedSessionLogoffMinutes = *input.DisconnectedSessionLogoffMinutes
	}
	if err := validateSystemSettings(next); err != nil {
		return models.SystemSettings{}, err
	}

	storageChanged := next.StorageRootPath != current.StorageRootPath ||
		next.StorageQuotaMB != current.StorageQuotaMB ||
		next.StorageVisibleDriveLetter != current.StorageVisibleDriveLetter
	cleanupChanged := next.DisconnectedSessionLogoffMinutes != current.DisconnectedSessionLogoffMinutes

	if storageChanged {
		if next.StorageRootPath == "" {
			if _, err := s.sendAgentCommandWithTimeout("clear_machine_storage_isolation_policies", map[string]any{}, 30*time.Second); err != nil {
				return models.SystemSettings{}, fmt.Errorf("清理存储隔离设置失败: %w", err)
			}
		} else {
			if _, err := s.sendAgentCommandWithTimeout("apply_storage_isolation_settings", map[string]any{
				"storageRootPath":             next.StorageRootPath,
				"storageQuotaMb":              next.StorageQuotaMB,
				"storageVisibleDriveLetter":   next.StorageVisibleDriveLetter,
				"rdpLocalDriveMappingEnabled": next.RDPLocalDriveMappingEnabled,
			}, 2*time.Minute); err != nil {
				return models.SystemSettings{}, fmt.Errorf("应用存储隔离设置失败: %w", err)
			}
			if _, err := s.sendAgentCommandWithTimeout("sync_all_user_storage", map[string]any{}, 5*time.Minute); err != nil {
				return models.SystemSettings{}, fmt.Errorf("同步用户存储失败: %w", err)
			}
		}
	}

	if cleanupChanged {
		if _, err := s.sendAgentCommandWithTimeout("start_disconnected_session_cleanup", map[string]any{
			"logoffMinutes": next.DisconnectedSessionLogoffMinutes,
		}, 30*time.Second); err != nil {
			return models.SystemSettings{}, fmt.Errorf("更新断开会话清理设置失败: %w", err)
		}
	}

	if err := s.withTx(func(tx *gorm.DB) error {
		updates := map[string]any{
			"storage_root_path":                   next.StorageRootPath,
			"storage_quota_mb":                    next.StorageQuotaMB,
			"storage_visible_drive_letter":        next.StorageVisibleDriveLetter,
			"rdp_local_drive_mapping_enabled":     next.RDPLocalDriveMappingEnabled,
			"disconnected_session_logoff_minutes": next.DisconnectedSessionLogoffMinutes,
		}
		if err := tx.Model(&current).Updates(updates).Error; err != nil {
			return fmt.Errorf("保存系统设置失败: %w", err)
		}
		if err := tx.First(&next, "id = ?", models.SingleSystemSettingsID).Error; err != nil {
			return fmt.Errorf("重新查询系统设置失败: %w", err)
		}
		return s.logActivity(tx, models.ActivitySystemSettingsUpdated, models.ActorTypeAdmin, actorUserID, models.TargetTypeSystem, models.SingleSystemSettingsID, "更新系统设置")
	}); err != nil {
		return models.SystemSettings{}, err
	}

	return next, nil
}

func validateSystemSettings(settings models.SystemSettings) error {
	if settings.StorageQuotaMB < 0 {
		return errors.New("存储配额不能小于 0")
	}
	if settings.DisconnectedSessionLogoffMinutes < 0 {
		return errors.New("断开会话清理时间不能小于 0")
	}
	if settings.StorageRootPath != "" {
		if settings.StorageVisibleDriveLetter == "" {
			return errors.New("可见盘符不能为空")
		}
		if len(settings.StorageVisibleDriveLetter) != 1 {
			return errors.New("可见盘符格式无效")
		}
		drive := settings.StorageVisibleDriveLetter[0]
		if drive < 'H' || drive > 'Z' {
			return errors.New("可见盘符必须为 H-Z")
		}
	}
	return nil
}
