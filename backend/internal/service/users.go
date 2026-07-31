package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"onyxhub/backend/internal/auth"
	"onyxhub/backend/internal/models"

	"gorm.io/gorm"
)

type CreateUserInput struct {
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Password    string `json:"password"`
	Role        string `json:"role"`
	Status      string `json:"status"`
}

type UpdateUserInput struct {
	ID          string  `json:"id"`
	Username    *string `json:"username"`
	DisplayName *string `json:"displayName"`
	Password    *string `json:"password"`
	Role        *string `json:"role"`
	Status      *string `json:"status"`
}

const maxWindowsUsernameLength = 20

func (s *Service) ListUsers() ([]PublicUser, error) {
	var users []models.User
	if err := s.db.Where("role = ?", models.RoleUser).Order("created_at desc").Find(&users).Error; err != nil {
		return nil, fmt.Errorf("查询用户列表失败: %w", err)
	}
	return toPublicUsers(users), nil
}

func (s *Service) CreateUser(actorUserID string, input CreateUserInput) (PublicUser, error) {
	username := trim(input.Username)
	displayName := trim(input.DisplayName)
	password := input.Password
	role := trim(input.Role)
	status := trim(input.Status)

	if username == "" {
		return PublicUser{}, errors.New("用户名不能为空")
	}
	if displayName == "" {
		return PublicUser{}, errors.New("展示名称不能为空")
	}
	if password == "" {
		return PublicUser{}, errors.New("密码不能为空")
	}
	if !models.IsValidRole(role) {
		return PublicUser{}, errors.New("角色无效")
	}
	if !models.IsValidStatus(status) {
		return PublicUser{}, errors.New("状态无效")
	}

	exists, err := s.usernameExists(username, "")
	if err != nil {
		return PublicUser{}, fmt.Errorf("检查用户名失败: %w", err)
	}
	if exists {
		return PublicUser{}, errors.New("用户名已存在")
	}

	windowsUsername := ""
	if role == models.RoleUser {
		var err error
		windowsUsername, err = requireWindowsUsername(username)
		if err != nil {
			return PublicUser{}, err
		}

		windowsExists, err := s.windowsUsernameExists(windowsUsername, "")
		if err != nil {
			return PublicUser{}, fmt.Errorf("检查 Windows 用户名失败: %w", err)
		}
		if windowsExists {
			return PublicUser{}, errors.New("Windows 用户名已存在")
		}

		result, err := s.sendAgentCommandWithTimeout("check_windows_user", map[string]any{
			"windowsUsername": windowsUsername,
		}, 30*time.Second)
		if err != nil {
			return PublicUser{}, fmt.Errorf("检查 Windows 用户失败: %w", err)
		}
		data, err := decodeAgentData[map[string]any](result)
		if err != nil {
			return PublicUser{}, fmt.Errorf("检查 Windows 用户失败: %w", err)
		}
		exists, ok := data["exists"].(bool)
		if !ok {
			return PublicUser{}, errors.New("检查 Windows 用户结果无效")
		}
		if exists {
			return PublicUser{}, errors.New("Windows 用户已存在")
		}
	}

	passwordHash, err := auth.HashPassword(password)
	if err != nil {
		return PublicUser{}, fmt.Errorf("密码哈希失败: %w", err)
	}

	rdpPassword := ""
	encryptedRDPPassword := ""
	if role == models.RoleUser {
		rdpPassword, err = generateRDPPassword()
		if err != nil {
			return PublicUser{}, err
		}
		encryptedRDPPassword, err = s.encryptRDPPassword(rdpPassword)
		if err != nil {
			return PublicUser{}, err
		}
		if _, err := s.sendAgentCommandWithTimeout("create_windows_user", map[string]any{
			"windowsUsername": windowsUsername,
			"password":        rdpPassword,
			"displayName":     displayName,
		}, 30*time.Second); err != nil {
			return PublicUser{}, fmt.Errorf("创建 Windows 用户失败: %w", err)
		}

		if _, err := s.sendAgentCommandWithTimeout("prepare_user_environment", map[string]any{
			"windowsUsername": windowsUsername,
		}, 2*time.Minute); err != nil {
			cleanupCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			_, cleanupErr := s.sendAgentCommand(cleanupCtx, "delete_windows_user", map[string]any{
				"windowsUsername": windowsUsername,
			})
			if cleanupErr != nil {
				return PublicUser{}, fmt.Errorf("准备用户环境失败: %w；回滚 Windows 用户失败: %v", err, cleanupErr)
			}
			return PublicUser{}, fmt.Errorf("准备用户环境失败: %w", err)
		}
	}

	user := models.User{
		Username:        username,
		DisplayName:     displayName,
		WindowsUsername: nullableString(windowsUsername),
		PasswordHash:    passwordHash,
		RDPPassword:     encryptedRDPPassword,
		Role:            role,
		Status:          status,
	}

	if err := s.withTx(func(tx *gorm.DB) error {
		if err := tx.Create(&user).Error; err != nil {
			return fmt.Errorf("创建用户失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityUserCreated, models.ActorTypeAdmin, actorUserID, models.TargetTypeUser, user.ID, "新增用户 "+user.Username)
	}); err != nil {
		if role == models.RoleUser {
			cleanupCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			_, cleanupErr := s.sendAgentCommand(cleanupCtx, "delete_windows_user", map[string]any{
				"windowsUsername": windowsUsername,
			})
			if cleanupErr != nil {
				return PublicUser{}, fmt.Errorf("%w；回滚 Windows 用户失败: %v", err, cleanupErr)
			}
		}
		return PublicUser{}, err
	}

	return toPublicUser(user), nil
}

func (s *Service) UpdateUser(actorUserID string, input UpdateUserInput) (PublicUser, error) {
	id, err := requireID(input.ID)
	if err != nil {
		return PublicUser{}, err
	}

	var user models.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			return PublicUser{}, errors.New("用户不存在")
		}
		return PublicUser{}, fmt.Errorf("查询用户失败: %w", err)
	}

	nextUsername := user.Username
	nextDisplayName := user.DisplayName
	nextWindowsUsername := publicWindowsUsername(user)
	nextRole := user.Role
	nextStatus := user.Status

	if input.Username != nil {
		nextUsername = trim(*input.Username)
		if nextUsername == "" {
			return PublicUser{}, errors.New("用户名不能为空")
		}
		if user.Role == models.RoleUser && nextUsername != user.Username {
			return PublicUser{}, errors.New("暂不支持修改用户名")
		}
	}
	if input.DisplayName != nil {
		nextDisplayName = trim(*input.DisplayName)
		if nextDisplayName == "" {
			return PublicUser{}, errors.New("展示名称不能为空")
		}
	}
	if input.Role != nil {
		nextRole = trim(*input.Role)
		if !models.IsValidRole(nextRole) {
			return PublicUser{}, errors.New("角色无效")
		}
		if nextRole != user.Role {
			return PublicUser{}, errors.New("暂不支持修改用户角色")
		}
	}
	if input.Status != nil {
		nextStatus = trim(*input.Status)
		if !models.IsValidStatus(nextStatus) {
			return PublicUser{}, errors.New("状态无效")
		}
	}
	usernameExists, err := s.usernameExists(nextUsername, user.ID)
	if err != nil {
		return PublicUser{}, fmt.Errorf("检查用户名失败: %w", err)
	}
	if usernameExists {
		return PublicUser{}, errors.New("用户名已存在")
	}

	windowsExists, err := s.windowsUsernameExists(nextWindowsUsername, user.ID)
	if err != nil {
		return PublicUser{}, fmt.Errorf("检查 Windows 用户名失败: %w", err)
	}
	if windowsExists {
		return PublicUser{}, errors.New("Windows 用户名已存在")
	}

	updates := map[string]any{
		"username":         nextUsername,
		"display_name":     nextDisplayName,
		"windows_username": nullableString(nextWindowsUsername),
		"role":             nextRole,
		"status":           nextStatus,
	}
	if input.Password != nil {
		if *input.Password == "" {
			return PublicUser{}, errors.New("密码不能为空")
		}
		passwordHash, err := auth.HashPassword(*input.Password)
		if err != nil {
			return PublicUser{}, fmt.Errorf("密码哈希失败: %w", err)
		}
		updates["password_hash"] = passwordHash
	}

	if err := s.withTx(func(tx *gorm.DB) error {
		if err := tx.Model(&user).Updates(updates).Error; err != nil {
			return fmt.Errorf("修改用户失败: %w", err)
		}
		if err := tx.First(&user, "id = ?", id).Error; err != nil {
			return fmt.Errorf("重新查询用户失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityUserUpdated, models.ActorTypeAdmin, actorUserID, models.TargetTypeUser, user.ID, "修改用户 "+user.Username)
	}); err != nil {
		return PublicUser{}, err
	}

	return toPublicUser(user), nil
}

func (s *Service) DeleteUser(actorUserID string, id string) error {
	id, err := requireID(id)
	if err != nil {
		return err
	}

	var user models.User
	if err := s.db.First(&user, "id = ?", id).Error; err != nil {
		if isNotFound(err) {
			return errors.New("用户不存在")
		}
		return fmt.Errorf("查询用户失败: %w", err)
	}

	var activeSessions int64
	if err := s.db.Model(&models.Session{}).Where("user_id = ? AND status = ?", user.ID, models.SessionStatusActive).Count(&activeSessions).Error; err != nil {
		return fmt.Errorf("检查用户在线状态失败: %w", err)
	}
	if activeSessions > 0 {
		return errors.New("用户当前在线，无法删除")
	}

	windowsUsername := publicWindowsUsername(user)
	if windowsUsername == "" {
		return errors.New("Windows 用户名不能为空")
	}
	if !s.agentConnected() {
		return errors.New("agent 未连接，无法删除 Windows 用户")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	if _, err := s.sendAgentCommand(ctx, "cleanup_user_environment", map[string]any{
		"windowsUsername": windowsUsername,
	}); err != nil {
		return fmt.Errorf("清理用户环境失败: %w", err)
	}

	ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if _, err := s.sendAgentCommand(ctx, "delete_windows_user", map[string]any{
		"windowsUsername": windowsUsername,
	}); err != nil {
		return fmt.Errorf("删除 Windows 用户失败: %w", err)
	}

	return s.withTx(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", user.ID).Delete(&models.UserAppAuthorization{}).Error; err != nil {
			return fmt.Errorf("删除用户授权关系失败: %w", err)
		}
		if err := tx.Delete(&user).Error; err != nil {
			return fmt.Errorf("删除用户失败: %w", err)
		}
		return s.logActivity(tx, models.ActivityUserDeleted, models.ActorTypeAdmin, actorUserID, models.TargetTypeUser, user.ID, "删除用户 "+user.Username)
	})
}

func requireWindowsUsername(username string) (string, error) {
	username = trim(username)
	if username == "" {
		return "", errors.New("Windows 用户名不能为空")
	}
	if len([]rune(username)) > maxWindowsUsernameLength {
		return "", fmt.Errorf("Windows 用户名长度不能超过 %d 位", maxWindowsUsernameLength)
	}
	if strings.ContainsAny(username, `\/":;|=,+*?<>[]`) {
		return "", errors.New("Windows 用户名包含非法字符")
	}
	return username, nil
}
