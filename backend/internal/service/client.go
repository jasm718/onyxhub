package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"onyxhub/backend/internal/models"
)

type LaunchInfo struct {
	ApplicationID string `json:"applicationId"`
	Mode          string `json:"mode"`
	Username      string `json:"username"`
	Path          string `json:"path"`
	Arguments     string `json:"arguments"`
	WorkingDir    string `json:"workingDir"`
	RDPContent    string `json:"rdpContent"`
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

	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if isNotFound(err) {
			return LaunchInfo{}, errors.New("用户不存在")
		}
		return LaunchInfo{}, fmt.Errorf("查询用户失败: %w", err)
	}
	windowsUsername := publicWindowsUsername(user)
	if windowsUsername == "" {
		return LaunchInfo{}, errors.New("Windows 用户名不能为空")
	}

	settings, err := s.GetSystemSettings()
	if err != nil {
		return LaunchInfo{}, err
	}
	if settings.StorageRootPath != "" {
		if _, err := s.sendAgentCommandWithTimeout("prepare_user_environment", map[string]any{
			"windowsUsername": windowsUsername,
		}, 2*time.Minute); err != nil {
			return LaunchInfo{}, fmt.Errorf("准备用户环境失败: %w", err)
		}
	}

	mode := "desktop"
	if application.RemoteAppRegistered {
		mode = "remote_app"
	}
	rdpContent := buildRDPContent(application, windowsUsername, settings.RDPLocalDriveMappingEnabled)

	return LaunchInfo{
		ApplicationID: application.ID,
		Mode:          mode,
		Username:      windowsUsername,
		Path:          application.Path,
		Arguments:     application.Arguments,
		WorkingDir:    application.WorkingDir,
		RDPContent:    rdpContent,
	}, nil
}

func buildRDPContent(application models.Application, windowsUsername string, localDriveMappingEnabled bool) string {
	redirectDrives := "0"
	if localDriveMappingEnabled {
		redirectDrives = "1"
	}

	lines := []string{
		"screen mode id:i:2",
		"use multimon:i:0",
		"desktopwidth:i:1920",
		"desktopheight:i:1080",
		"session bpp:i:32",
		"redirectclipboard:i:1",
		"redirectprinters:i:0",
		"redirectcomports:i:0",
		"redirectsmartcards:i:0",
		"redirectdrives:i:" + redirectDrives,
		"prompt for credentials:i:1",
		"username:s:" + windowsUsername,
	}
	if application.RemoteAppRegistered {
		lines = append(lines,
			"remoteapplicationmode:i:1",
			"remoteapplicationprogram:s:||"+application.RemoteAppAlias,
			"remoteapplicationname:s:"+application.Name,
		)
		if application.WorkingDir != "" {
			lines = append(lines, "shell working directory:s:"+application.WorkingDir)
		}
		if application.Arguments != "" {
			lines = append(lines, "remoteapplicationcmdline:s:"+application.Arguments)
		}
	}
	return strings.Join(lines, "\r\n") + "\r\n"
}
