package service

import (
	"errors"
	"fmt"

	"onyxhub/backend/internal/models"
)

type LaunchInfo struct {
	ApplicationID string `json:"applicationId"`
	Path          string `json:"path"`
	Arguments     string `json:"arguments"`
	WorkingDir    string `json:"workingDir"`
}

func (s *Service) ListClientApplications(userID string) ([]models.Application, error) {
	userID, err := requireID(userID)
	if err != nil {
		return nil, err
	}

	var applications []models.Application
	err = s.db.
		Table("applications").
		Select("applications.*").
		Joins("JOIN user_app_authorizations ON user_app_authorizations.application_id = applications.id").
		Where("user_app_authorizations.user_id = ? AND applications.status = ?", userID, models.StatusActive).
		Order("applications.created_at desc").
		Find(&applications).Error
	if err != nil {
		return nil, fmt.Errorf("查询授权应用失败: %w", err)
	}
	return applications, nil
}

func (s *Service) GetLaunchInfo(userID string, applicationID string) (LaunchInfo, error) {
	userID, err := requireID(userID)
	if err != nil {
		return LaunchInfo{}, err
	}
	applicationID, err = requireID(applicationID)
	if err != nil {
		return LaunchInfo{}, err
	}

	var authorization models.UserAppAuthorization
	if err := s.db.Where("user_id = ? AND application_id = ?", userID, applicationID).First(&authorization).Error; err != nil {
		if isNotFound(err) {
			return LaunchInfo{}, errors.New("未授权访问该应用")
		}
		return LaunchInfo{}, fmt.Errorf("查询授权关系失败: %w", err)
	}

	var application models.Application
	if err := s.db.First(&application, "id = ?", applicationID).Error; err != nil {
		if isNotFound(err) {
			return LaunchInfo{}, errors.New("应用不存在")
		}
		return LaunchInfo{}, fmt.Errorf("查询应用失败: %w", err)
	}
	if application.Status == models.StatusDisabled {
		return LaunchInfo{}, errors.New("应用已禁用")
	}

	return LaunchInfo{
		ApplicationID: application.ID,
		Path:          application.Path,
		Arguments:     application.Arguments,
		WorkingDir:    application.WorkingDir,
	}, nil
}
