package service

import (
	"errors"
	"fmt"

	"onyxhub/backend/internal/models"

	"gorm.io/gorm"
)

type AuthorizationInput struct {
	UserID        string `json:"userId"`
	ApplicationID string `json:"applicationId"`
}

type AuthorizationItem struct {
	ID            string             `json:"id"`
	UserID        string             `json:"userId"`
	ApplicationID string             `json:"applicationId"`
	CreatedAt     string             `json:"createdAt"`
	User          PublicUser         `json:"user"`
	Application   models.Application `json:"application"`
}

func (s *Service) ListAuthorizations() ([]AuthorizationItem, error) {
	var authorizations []models.UserAppAuthorization
	if err := s.db.Order("created_at desc").Find(&authorizations).Error; err != nil {
		return nil, fmt.Errorf("查询授权列表失败: %w", err)
	}

	items := make([]AuthorizationItem, 0, len(authorizations))
	for _, authorization := range authorizations {
		var user models.User
		if err := s.db.First(&user, "id = ?", authorization.UserID).Error; err != nil {
			if isNotFound(err) {
				continue
			}
			return nil, fmt.Errorf("查询授权用户失败: %w", err)
		}

		var application models.Application
		if err := s.db.First(&application, "id = ?", authorization.ApplicationID).Error; err != nil {
			if isNotFound(err) {
				continue
			}
			return nil, fmt.Errorf("查询授权应用失败: %w", err)
		}

		items = append(items, AuthorizationItem{
			ID:            authorization.ID,
			UserID:        authorization.UserID,
			ApplicationID: authorization.ApplicationID,
			CreatedAt:     authorization.CreatedAt.Format(timeFormatRFC3339),
			User:          toPublicUser(user),
			Application:   application,
		})
	}

	return items, nil
}

func (s *Service) GrantAuthorization(actorUserID string, input AuthorizationInput) (models.UserAppAuthorization, error) {
	userID, err := requireID(input.UserID)
	if err != nil {
		return models.UserAppAuthorization{}, err
	}
	applicationID, err := requireID(input.ApplicationID)
	if err != nil {
		return models.UserAppAuthorization{}, err
	}

	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if isNotFound(err) {
			return models.UserAppAuthorization{}, errors.New("用户不存在")
		}
		return models.UserAppAuthorization{}, fmt.Errorf("查询用户失败: %w", err)
	}

	var application models.Application
	if err := s.db.First(&application, "id = ?", applicationID).Error; err != nil {
		if isNotFound(err) {
			return models.UserAppAuthorization{}, errors.New("应用不存在")
		}
		return models.UserAppAuthorization{}, fmt.Errorf("查询应用失败: %w", err)
	}

	var existing models.UserAppAuthorization
	if err := s.db.Where("user_id = ? AND application_id = ?", userID, applicationID).First(&existing).Error; err == nil {
		return models.UserAppAuthorization{}, errors.New("授权关系已存在")
	} else if !isNotFound(err) {
		return models.UserAppAuthorization{}, fmt.Errorf("检查授权关系失败: %w", err)
	}

	authorization := models.UserAppAuthorization{
		UserID:        userID,
		ApplicationID: applicationID,
	}

	if err := s.withTx(func(tx *gorm.DB) error {
		if err := tx.Create(&authorization).Error; err != nil {
			return fmt.Errorf("授权应用失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityAuthorizationGranted, models.ActorTypeAdmin, actorUserID, models.TargetTypeAuthorization, authorization.ID, "授权 "+user.Username+" 使用 "+application.Name)
	}); err != nil {
		return models.UserAppAuthorization{}, err
	}

	return authorization, nil
}

func (s *Service) RevokeAuthorization(actorUserID string, input AuthorizationInput) error {
	userID, err := requireID(input.UserID)
	if err != nil {
		return err
	}
	applicationID, err := requireID(input.ApplicationID)
	if err != nil {
		return err
	}

	var authorization models.UserAppAuthorization
	if err := s.db.Where("user_id = ? AND application_id = ?", userID, applicationID).First(&authorization).Error; err != nil {
		if isNotFound(err) {
			return errors.New("授权关系不存在")
		}
		return fmt.Errorf("查询授权关系失败: %w", err)
	}

	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil && !isNotFound(err) {
		return fmt.Errorf("查询用户失败: %w", err)
	}

	var application models.Application
	if err := s.db.First(&application, "id = ?", applicationID).Error; err != nil && !isNotFound(err) {
		return fmt.Errorf("查询应用失败: %w", err)
	}

	message := "取消授权"
	if user.Username != "" && application.Name != "" {
		message = "取消授权 " + user.Username + " 使用 " + application.Name
	}

	return s.withTx(func(tx *gorm.DB) error {
		if err := tx.Delete(&authorization).Error; err != nil {
			return fmt.Errorf("取消授权失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityAuthorizationRevoked, models.ActorTypeAdmin, actorUserID, models.TargetTypeAuthorization, authorization.ID, message)
	})
}
