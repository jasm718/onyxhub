package service

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"onyxhub/backend/internal/models"

	"gorm.io/gorm"
)

type CreateApplicationInput struct {
	Name                string `json:"name"`
	Path                string `json:"path"`
	Arguments           string `json:"arguments"`
	WorkingDir          string `json:"workingDir"`
	Status              string `json:"status"`
	RemoteAppRegistered bool   `json:"remoteAppRegistered"`
	RemoteAppAlias      string `json:"remoteAppAlias"`
}

type UpdateApplicationInput struct {
	ID                  string  `json:"id"`
	Name                *string `json:"name"`
	Path                *string `json:"path"`
	Arguments           *string `json:"arguments"`
	WorkingDir          *string `json:"workingDir"`
	Status              *string `json:"status"`
	RemoteAppRegistered *bool   `json:"remoteAppRegistered"`
	RemoteAppAlias      *string `json:"remoteAppAlias"`
}

type InstalledApplication struct {
	Name       string `json:"name"`
	Path       string `json:"path"`
	Arguments  string `json:"arguments"`
	WorkingDir string `json:"workingDir"`
}

type FetchApplicationIconInput struct {
	Path string `json:"path"`
}

type ApplicationIcon struct {
	Path       string `json:"path"`
	MimeType   string `json:"mimeType"`
	IconBase64 string `json:"iconBase64"`
}

func (s *Service) ListApplications() ([]models.Application, error) {
	var applications []models.Application
	if err := s.db.Order("created_at desc").Find(&applications).Error; err != nil {
		return nil, fmt.Errorf("查询应用列表失败: %w", err)
	}
	return applications, nil
}

func (s *Service) ScanInstalledApplications() ([]InstalledApplication, error) {
	result, err := s.sendAgentCommandWithTimeout("scan_installed_apps", map[string]any{}, 2*time.Minute)
	if err != nil {
		return nil, fmt.Errorf("扫描已安装应用失败: %w", err)
	}
	items, err := decodeAgentData[[]InstalledApplication](result)
	if err != nil {
		return nil, err
	}
	return items, nil
}

func (s *Service) FetchApplicationIcon(input FetchApplicationIconInput) (ApplicationIcon, error) {
	path := trim(input.Path)
	if path == "" {
		return ApplicationIcon{}, errors.New("应用路径不能为空")
	}
	result, err := s.sendAgentCommandWithTimeout("fetch_application_icon", map[string]any{
		"path": path,
	}, 30*time.Second)
	if err != nil {
		return ApplicationIcon{}, fmt.Errorf("拉取应用图标失败: %w", err)
	}
	icon, err := decodeAgentData[ApplicationIcon](result)
	if err != nil {
		return ApplicationIcon{}, err
	}
	return icon, nil
}

func (s *Service) CreateApplication(actorUserID string, input CreateApplicationInput) (models.Application, error) {
	name := trim(input.Name)
	path := trim(input.Path)
	status := trim(input.Status)

	if name == "" {
		return models.Application{}, errors.New("应用名称不能为空")
	}
	if path == "" {
		return models.Application{}, errors.New("应用路径不能为空")
	}
	if !models.IsValidStatus(status) {
		return models.Application{}, errors.New("状态无效")
	}

	exists, err := s.applicationPathExists(path, "")
	if err != nil {
		return models.Application{}, fmt.Errorf("检查应用路径失败: %w", err)
	}
	if exists {
		return models.Application{}, errors.New("应用路径已存在")
	}

	application := models.Application{
		ID:                  models.NewID("app"),
		Name:                name,
		Path:                path,
		Arguments:           trim(input.Arguments),
		WorkingDir:          trim(input.WorkingDir),
		Status:              status,
		RemoteAppRegistered: input.RemoteAppRegistered,
		RemoteAppAlias:      trim(input.RemoteAppAlias),
	}
	if application.RemoteAppRegistered {
		if application.RemoteAppAlias == "" {
			application.RemoteAppAlias = application.ID
		}
		if err := validateRemoteAppAlias(application.RemoteAppAlias); err != nil {
			return models.Application{}, err
		}
		if _, err := s.sendAgentCommandWithTimeout("register_remote_app", remoteAppPayload(application), 30*time.Second); err != nil {
			return models.Application{}, fmt.Errorf("注册 RemoteApp 失败: %w", err)
		}
	}

	if err := s.withTx(func(tx *gorm.DB) error {
		if err := tx.Create(&application).Error; err != nil {
			return fmt.Errorf("创建应用失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityApplicationCreated, models.ActorTypeAdmin, actorUserID, models.TargetTypeApplication, application.ID, "新增应用 "+application.Name)
	}); err != nil {
		if application.RemoteAppRegistered {
			_, cleanupErr := s.sendAgentCommandWithTimeout("unregister_remote_app", map[string]any{
				"alias": application.RemoteAppAlias,
			}, 30*time.Second)
			if cleanupErr != nil {
				return models.Application{}, fmt.Errorf("%w；回滚 RemoteApp 注册失败: %v", err, cleanupErr)
			}
		}
		return models.Application{}, err
	}

	return application, nil
}

func (s *Service) UpdateApplication(actorUserID string, input UpdateApplicationInput) (models.Application, error) {
	id, err := requireID(input.ID)
	if err != nil {
		return models.Application{}, err
	}

	var application models.Application
	if err := s.db.First(&application, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			return models.Application{}, errors.New("应用不存在")
		}
		return models.Application{}, fmt.Errorf("查询应用失败: %w", err)
	}

	nextName := application.Name
	nextPath := application.Path
	nextArguments := application.Arguments
	nextWorkingDir := application.WorkingDir
	nextStatus := application.Status
	nextRemoteAppRegistered := application.RemoteAppRegistered
	nextRemoteAppAlias := application.RemoteAppAlias

	if input.Name != nil {
		nextName = trim(*input.Name)
		if nextName == "" {
			return models.Application{}, errors.New("应用名称不能为空")
		}
	}
	if input.Path != nil {
		nextPath = trim(*input.Path)
		if nextPath == "" {
			return models.Application{}, errors.New("应用路径不能为空")
		}
	}
	if input.Arguments != nil {
		nextArguments = trim(*input.Arguments)
	}
	if input.WorkingDir != nil {
		nextWorkingDir = trim(*input.WorkingDir)
	}
	if input.Status != nil {
		nextStatus = trim(*input.Status)
		if !models.IsValidStatus(nextStatus) {
			return models.Application{}, errors.New("状态无效")
		}
	}
	if input.RemoteAppRegistered != nil {
		nextRemoteAppRegistered = *input.RemoteAppRegistered
	}
	if input.RemoteAppAlias != nil {
		nextRemoteAppAlias = trim(*input.RemoteAppAlias)
	}

	exists, err := s.applicationPathExists(nextPath, application.ID)
	if err != nil {
		return models.Application{}, fmt.Errorf("检查应用路径失败: %w", err)
	}
	if exists {
		return models.Application{}, errors.New("应用路径已存在")
	}

	nextApplication := models.Application{
		ID:                  application.ID,
		Name:                nextName,
		Path:                nextPath,
		Arguments:           nextArguments,
		WorkingDir:          nextWorkingDir,
		Status:              nextStatus,
		RemoteAppRegistered: nextRemoteAppRegistered,
		RemoteAppAlias:      nextRemoteAppAlias,
	}
	if nextApplication.RemoteAppRegistered {
		if nextApplication.RemoteAppAlias == "" {
			nextApplication.RemoteAppAlias = application.ID
		}
		if err := validateRemoteAppAlias(nextApplication.RemoteAppAlias); err != nil {
			return models.Application{}, err
		}
	}

	if err := s.applyRemoteAppUpdate(application, nextApplication); err != nil {
		return models.Application{}, err
	}

	updates := map[string]any{
		"name":                  nextApplication.Name,
		"path":                  nextApplication.Path,
		"arguments":             nextApplication.Arguments,
		"working_dir":           nextApplication.WorkingDir,
		"status":                nextApplication.Status,
		"remote_app_registered": nextApplication.RemoteAppRegistered,
		"remote_app_alias":      nextApplication.RemoteAppAlias,
	}

	if err := s.withTx(func(tx *gorm.DB) error {
		if err := tx.Model(&application).Updates(updates).Error; err != nil {
			return fmt.Errorf("修改应用失败: %w", err)
		}
		if err := tx.First(&application, "id = ?", id).Error; err != nil {
			return fmt.Errorf("重新查询应用失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityApplicationUpdated, models.ActorTypeAdmin, actorUserID, models.TargetTypeApplication, application.ID, "修改应用 "+application.Name)
	}); err != nil {
		if rollbackErr := s.applyRemoteAppUpdate(nextApplication, application); rollbackErr != nil {
			return models.Application{}, fmt.Errorf("%w；回滚 RemoteApp 更新失败: %v", err, rollbackErr)
		}
		return models.Application{}, err
	}

	return application, nil
}

func (s *Service) DeleteApplication(actorUserID string, id string) error {
	id, err := requireID(id)
	if err != nil {
		return err
	}

	var application models.Application
	if err := s.db.First(&application, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			return errors.New("应用不存在")
		}
		return fmt.Errorf("查询应用失败: %w", err)
	}

	if application.RemoteAppRegistered {
		if _, err := s.sendAgentCommandWithTimeout("unregister_remote_app", map[string]any{
			"alias": application.RemoteAppAlias,
		}, 30*time.Second); err != nil {
			return fmt.Errorf("取消注册 RemoteApp 失败: %w", err)
		}
	}

	return s.withTx(func(tx *gorm.DB) error {
		if err := tx.Where("application_id = ?", application.ID).Delete(&models.UserAppAuthorization{}).Error; err != nil {
			return fmt.Errorf("删除应用授权关系失败: %w", err)
		}
		if err := tx.Delete(&application).Error; err != nil {
			return fmt.Errorf("删除应用失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityApplicationDeleted, models.ActorTypeAdmin, actorUserID, models.TargetTypeApplication, application.ID, "删除应用 "+application.Name)
	})
}

func (s *Service) SetApplicationStatus(actorUserID string, id string, status string) (models.Application, error) {
	id, err := requireID(id)
	if err != nil {
		return models.Application{}, err
	}
	if !models.IsValidStatus(status) {
		return models.Application{}, errors.New("状态无效")
	}

	var application models.Application
	if err := s.db.First(&application, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			return models.Application{}, errors.New("应用不存在")
		}
		return models.Application{}, fmt.Errorf("查询应用失败: %w", err)
	}

	activityType := models.ActivityApplicationEnabled
	message := "启用应用 " + application.Name
	if status == models.StatusDisabled {
		activityType = models.ActivityApplicationDisabled
		message = "禁用应用 " + application.Name
	}

	if err := s.withTx(func(tx *gorm.DB) error {
		if err := tx.Model(&application).Update("status", status).Error; err != nil {
			return fmt.Errorf("修改应用状态失败: %w", err)
		}
		if err := tx.First(&application, "id = ?", id).Error; err != nil {
			return fmt.Errorf("重新查询应用失败: %w", err)
		}
		return s.logActivity(tx, activityType, models.ActorTypeAdmin, actorUserID, models.TargetTypeApplication, application.ID, message)
	}); err != nil {
		return models.Application{}, err
	}

	return application, nil
}

func validateRemoteAppAlias(alias string) error {
	alias = trim(alias)
	if alias == "" {
		return errors.New("RemoteApp alias 不能为空")
	}
	for _, r := range alias {
		if r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_' || r == '-' {
			continue
		}
		return errors.New("RemoteApp alias 只能包含字母、数字、下划线或短横线")
	}
	return nil
}

func remoteAppPayload(application models.Application) map[string]any {
	return map[string]any{
		"alias":      application.RemoteAppAlias,
		"name":       application.Name,
		"path":       application.Path,
		"arguments":  application.Arguments,
		"workingDir": application.WorkingDir,
	}
}

func (s *Service) applyRemoteAppUpdate(current models.Application, next models.Application) error {
	if !current.RemoteAppRegistered && !next.RemoteAppRegistered {
		return nil
	}

	if current.RemoteAppRegistered && !next.RemoteAppRegistered {
		if _, err := s.sendAgentCommandWithTimeout("unregister_remote_app", map[string]any{
			"alias": current.RemoteAppAlias,
		}, 30*time.Second); err != nil {
			return fmt.Errorf("取消注册 RemoteApp 失败: %w", err)
		}
		return nil
	}

	if !current.RemoteAppRegistered && next.RemoteAppRegistered {
		if _, err := s.sendAgentCommandWithTimeout("register_remote_app", remoteAppPayload(next), 30*time.Second); err != nil {
			return fmt.Errorf("注册 RemoteApp 失败: %w", err)
		}
		return nil
	}

	if strings.EqualFold(current.RemoteAppAlias, next.RemoteAppAlias) {
		if _, err := s.sendAgentCommandWithTimeout("register_remote_app", remoteAppPayload(next), 30*time.Second); err != nil {
			return fmt.Errorf("更新 RemoteApp 注册失败: %w", err)
		}
		return nil
	}

	if _, err := s.sendAgentCommandWithTimeout("register_remote_app", remoteAppPayload(next), 30*time.Second); err != nil {
		return fmt.Errorf("注册新 RemoteApp 失败: %w", err)
	}
	if _, err := s.sendAgentCommandWithTimeout("unregister_remote_app", map[string]any{
		"alias": current.RemoteAppAlias,
	}, 30*time.Second); err != nil {
		return fmt.Errorf("取消旧 RemoteApp 注册失败: %w", err)
	}
	return nil
}
