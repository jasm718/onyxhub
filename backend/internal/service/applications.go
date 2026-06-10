package service

import (
	"errors"
	"fmt"

	"onyxhub/backend/internal/models"

	"gorm.io/gorm"
)

type CreateApplicationInput struct {
	Name       string `json:"name"`
	Path       string `json:"path"`
	Arguments  string `json:"arguments"`
	WorkingDir string `json:"workingDir"`
	Category   string `json:"category"`
	Status     string `json:"status"`
}

type UpdateApplicationInput struct {
	ID         string  `json:"id"`
	Name       *string `json:"name"`
	Path       *string `json:"path"`
	Arguments  *string `json:"arguments"`
	WorkingDir *string `json:"workingDir"`
	Category   *string `json:"category"`
	Status     *string `json:"status"`
}

func (s *Service) ListApplications() ([]models.Application, error) {
	var applications []models.Application
	if err := s.db.Order("created_at desc").Find(&applications).Error; err != nil {
		return nil, fmt.Errorf("查询应用列表失败: %w", err)
	}
	return applications, nil
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
		Name:       name,
		Path:       path,
		Arguments:  trim(input.Arguments),
		WorkingDir: trim(input.WorkingDir),
		Category:   trim(input.Category),
		Status:     status,
	}

	if err := s.withTx(func(tx *gorm.DB) error {
		if err := tx.Create(&application).Error; err != nil {
			return fmt.Errorf("创建应用失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityApplicationCreated, models.ActorTypeAdmin, actorUserID, models.TargetTypeApplication, application.ID, "新增应用 "+application.Name)
	}); err != nil {
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
	nextCategory := application.Category
	nextStatus := application.Status

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
	if input.Category != nil {
		nextCategory = trim(*input.Category)
	}
	if input.Status != nil {
		nextStatus = trim(*input.Status)
		if !models.IsValidStatus(nextStatus) {
			return models.Application{}, errors.New("状态无效")
		}
	}

	exists, err := s.applicationPathExists(nextPath, application.ID)
	if err != nil {
		return models.Application{}, fmt.Errorf("检查应用路径失败: %w", err)
	}
	if exists {
		return models.Application{}, errors.New("应用路径已存在")
	}

	updates := map[string]any{
		"name":        nextName,
		"path":        nextPath,
		"arguments":   nextArguments,
		"working_dir": nextWorkingDir,
		"category":    nextCategory,
		"status":      nextStatus,
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
