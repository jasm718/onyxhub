package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"onyxhub/backend/internal/auth"
	"onyxhub/backend/internal/models"
	agentws "onyxhub/backend/internal/ws"

	"gorm.io/gorm"
)

const timeFormatRFC3339 = time.RFC3339Nano

type Service struct {
	db               *gorm.DB
	jwtSecret        string
	agent            *agentws.Manager
	now              func() time.Time
	serviceStartedAt time.Time
}

func New(database *gorm.DB, jwtSecret string, agent *agentws.Manager) *Service {
	startedAt := time.Now()
	return &Service{
		db:               database,
		jwtSecret:        jwtSecret,
		agent:            agent,
		now:              time.Now,
		serviceStartedAt: startedAt,
	}
}

func trim(s string) string {
	return strings.TrimSpace(s)
}

func nullableString(s string) *string {
	v := trim(s)
	if v == "" {
		return nil
	}
	return &v
}

func requireID(id string) (string, error) {
	id = trim(id)
	if id == "" {
		return "", errors.New("id 不能为空")
	}
	return id, nil
}

func (s *Service) windowsUsernameExists(username string, excludeUserID string) (bool, error) {
	username = trim(username)
	if username == "" {
		return false, nil
	}
	var count int64
	query := s.db.Model(&models.User{}).Where("windows_username = ?", username)
	if excludeUserID != "" {
		query = query.Where("id <> ?", excludeUserID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *Service) usernameExists(username string, excludeUserID string) (bool, error) {
	var count int64
	query := s.db.Model(&models.User{}).Where("username = ?", username)
	if excludeUserID != "" {
		query = query.Where("id <> ?", excludeUserID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *Service) applicationPathExists(path string, excludeApplicationID string) (bool, error) {
	var count int64
	query := s.db.Model(&models.Application{}).Where("path = ?", path)
	if excludeApplicationID != "" {
		query = query.Where("id <> ?", excludeApplicationID)
	}
	if err := query.Count(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func isNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}

type LogInput struct {
	Category    string
	Level       string
	Source      string
	Type        string
	ActorType   string
	ActorUserID string
	TargetType  string
	TargetID    string
	Message     string
	Detail      string
}

func (s *Service) writeLog(tx *gorm.DB, input LogInput) error {
	if s == nil || s.db == nil {
		return errors.New("服务未初始化")
	}

	category := trim(input.Category)
	if category == "" {
		return errors.New("日志分类不能为空")
	}
	level := trim(input.Level)
	if level == "" {
		return errors.New("日志级别不能为空")
	}
	source := trim(input.Source)
	if source == "" {
		return errors.New("日志来源不能为空")
	}
	logType := trim(input.Type)
	if logType == "" {
		return errors.New("日志类型不能为空")
	}
	actorType := trim(input.ActorType)
	if actorType == "" {
		actorType = models.ActorTypeSystem
	}
	targetType := trim(input.TargetType)
	if targetType == "" {
		targetType = models.TargetTypeSystem
	}
	message := trim(input.Message)
	if message == "" {
		return errors.New("日志内容不能为空")
	}

	logItem := models.ActivityLog{
		Category:    category,
		Level:       level,
		Source:      source,
		Type:        logType,
		ActorType:   actorType,
		ActorUserID: trim(input.ActorUserID),
		TargetType:  targetType,
		TargetID:    trim(input.TargetID),
		Message:     message,
		Detail:      trim(input.Detail),
	}
	db := s.db
	if tx != nil {
		db = tx
	}
	if err := db.Create(&logItem).Error; err != nil {
		return fmt.Errorf("记录日志失败: %w", err)
	}
	return nil
}

func (s *Service) logActivity(tx *gorm.DB, activityType string, actorType string, actorUserID string, targetType string, targetID string, message string) error {
	return s.writeLog(tx, LogInput{
		Category:    models.LogCategoryActivity,
		Level:       models.LogLevelInfo,
		Source:      models.LogSourceBackend,
		Type:        activityType,
		ActorType:   actorType,
		ActorUserID: actorUserID,
		TargetType:  targetType,
		TargetID:    targetID,
		Message:     message,
	})
}

func (s *Service) reportLog(tx *gorm.DB, category string, level string, source string, logType string, message string, detail string, targetType string, targetID string) error {
	if source == "" {
		source = models.LogSourceBackend
	}
	log.Printf("log[%s][%s] %s: %s", category, level, logType, message)
	return s.writeLog(tx, LogInput{
		Category:   category,
		Level:      level,
		Source:     source,
		Type:       logType,
		ActorType:  models.ActorTypeSystem,
		TargetType: targetType,
		TargetID:   targetID,
		Message:    message,
		Detail:     detail,
	})
}

func (s *Service) reportSystemAlert(tx *gorm.DB, level string, logType string, message string, detail string) error {
	return s.reportLog(tx, models.LogCategoryAlert, level, models.LogSourceBackend, logType, message, detail, models.TargetTypeSystem, models.SingleAgentID)
}

func (s *Service) withTx(fn func(tx *gorm.DB) error) error {
	return s.db.Transaction(fn)
}

func (s *Service) agentConnected() bool {
	return s.agent != nil && s.agent.IsConnected()
}

func (s *Service) serviceUptimeSeconds() int64 {
	if s.serviceStartedAt.IsZero() {
		return 0
	}

	seconds := int64(s.now().Sub(s.serviceStartedAt).Seconds())
	if seconds < 0 {
		return 0
	}
	return (seconds / 60) * 60
}

func (s *Service) sendAgentCommand(ctx context.Context, name string, payload any) (agentws.CommandResult, error) {
	if s.agent == nil {
		return agentws.CommandResult{}, errors.New("agent 未连接")
	}
	return s.agent.SendCommand(ctx, name, payload)
}

func (s *Service) sendAgentCommandWithTimeout(name string, payload any, timeout time.Duration) (agentws.CommandResult, error) {
	if timeout <= 0 {
		return agentws.CommandResult{}, errors.New("agent 命令超时时间无效")
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	return s.sendAgentCommand(ctx, name, payload)
}

func decodeAgentData[T any](result agentws.CommandResult) (T, error) {
	var out T
	if len(result.Data) == 0 || string(result.Data) == "null" {
		return out, nil
	}
	if err := json.Unmarshal(result.Data, &out); err != nil {
		return out, fmt.Errorf("解析 agent 命令结果失败: %w", err)
	}
	return out, nil
}

func (s *Service) DB() *gorm.DB {
	return s.db
}

func (s *Service) Now() time.Time {
	return s.now()
}

func publicWindowsUsername(u models.User) string {
	if u.WindowsUsername == nil {
		return ""
	}
	return *u.WindowsUsername
}

type PublicUser struct {
	ID              string     `json:"id"`
	Username        string     `json:"username"`
	DisplayName     string     `json:"displayName"`
	WindowsUsername string     `json:"windowsUsername"`
	Role            string     `json:"role"`
	Status          string     `json:"status"`
	LastLoginAt     *time.Time `json:"lastLoginAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

func toPublicUser(u models.User) PublicUser {
	return PublicUser{
		ID:              u.ID,
		Username:        u.Username,
		DisplayName:     u.DisplayName,
		WindowsUsername: publicWindowsUsername(u),
		Role:            u.Role,
		Status:          u.Status,
		LastLoginAt:     u.LastLoginAt,
		CreatedAt:       u.CreatedAt,
		UpdatedAt:       u.UpdatedAt,
	}
}

func toPublicUsers(users []models.User) []PublicUser {
	items := make([]PublicUser, 0, len(users))
	for _, user := range users {
		items = append(items, toPublicUser(user))
	}
	return items
}

type LoginResult struct {
	Token string     `json:"token"`
	User  PublicUser `json:"user"`
}

func (s *Service) login(username string, password string, requiredRole string) (LoginResult, error) {
	username = trim(username)
	if username == "" || password == "" {
		return LoginResult{}, errors.New("账号或密码错误")
	}

	var user models.User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		if isNotFound(err) {
			return LoginResult{}, errors.New("账号或密码错误")
		}
		return LoginResult{}, fmt.Errorf("查询用户失败: %w", err)
	}
	if user.Role != requiredRole {
		return LoginResult{}, errors.New("账号或密码错误")
	}
	if user.Status == models.StatusDisabled {
		return LoginResult{}, errors.New("用户已禁用")
	}
	if !auth.CheckPassword(password, user.PasswordHash) {
		return LoginResult{}, errors.New("账号或密码错误")
	}

	now := s.now()
	if err := s.db.Model(&user).Update("last_login_at", now).Error; err != nil {
		return LoginResult{}, fmt.Errorf("更新最后登录时间失败: %w", err)
	}
	user.LastLoginAt = &now

	token, err := auth.GenerateToken(s.jwtSecret, user.ID, user.Username, user.Role)
	if err != nil {
		return LoginResult{}, fmt.Errorf("签发 token 失败: %w", err)
	}

	return LoginResult{Token: token, User: toPublicUser(user)}, nil
}

func (s *Service) AdminLogin(username string, password string) (LoginResult, error) {
	return s.login(username, password, models.RoleAdmin)
}

func (s *Service) ClientLogin(username string, password string) (LoginResult, error) {
	return s.login(username, password, models.RoleUser)
}
