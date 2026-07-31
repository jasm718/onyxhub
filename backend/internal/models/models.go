package models

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	RoleAdmin = "admin"
	RoleUser  = "user"

	StatusActive   = "active"
	StatusDisabled = "disabled"

	SessionStatusActive = "active"
	SessionStatusClosed = "closed"

	ActorTypeAdmin  = "admin"
	ActorTypeSystem = "system"

	TargetTypeUser          = "user"
	TargetTypeApplication   = "application"
	TargetTypeAuthorization = "authorization"
	TargetTypeSession       = "session"
	TargetTypeSystem        = "system"

	LogCategoryActivity = "activity"
	LogCategoryAlert    = "alert"

	LogLevelInfo  = "info"
	LogLevelWarn  = "warn"
	LogLevelError = "error"

	LogSourceAdmin   = "admin"
	LogSourceSystem  = "system"
	LogSourceAgent   = "agent"
	LogSourceBackend = "backend"

	ActivityUserCreated           = "user_created"
	ActivityUserUpdated           = "user_updated"
	ActivityUserDeleted           = "user_deleted"
	ActivityApplicationCreated    = "application_created"
	ActivityApplicationUpdated    = "application_updated"
	ActivityApplicationDeleted    = "application_deleted"
	ActivityApplicationEnabled    = "application_enabled"
	ActivityApplicationDisabled   = "application_disabled"
	ActivityAuthorizationGranted  = "authorization_granted"
	ActivityAuthorizationRevoked  = "authorization_revoked"
	ActivitySessionOpened         = "session_opened"
	ActivitySessionClosed         = "session_closed"
	ActivitySystemSettingsUpdated = "system_settings_updated"

	SingleAgentID          = "single_agent"
	SingleSystemSettingsID = "system_settings"

	DefaultApplicationIcon = "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABsElEQVR4AXyRsUvDUBjE30udXLSpFqQOin0UHbqLCG4Oin+GtU0dXJ0KDupSB2mCODg4C0JRcHIT1LGLbSMqCqLY106KYvP5LpCS1KaBI9e733dDqrGQZ7RkJ3XLPoPgQzD2f6BwOaBb9WKb0wW12yUIHhlTXfdQYCBWqub1+Pgnc9izzImpZj51DsEj01UHxj/iDkSt2rJu1iukaWnneyAuDbHnh+CRoQMDFjfI3QFOvMyIZ2RWrLY2JlsoegkdGLDujYLcAfVm0khe4T28X1/Au5e8zmPBdAbwY+TgcUyLsG3dtE9iVjWBDIJHpkX4FhhkngIDH5mJV/XBZonolkh7iZVqu5DyN5zTqcwl58F4x3gHBhBATUPs8LYzTZynidGXzIlEIyuO0XWr5wCgxnrqjpFzDd9PoQP9jvxdZyBq2XP+op/3s+4AaWyFEx3qln00ZD5Fw47RgQGLG3DuQHNNlNWHmmFElQj7eYuZ9U2U0kgVIHhk6MCAxQ1ydwAGUkVRvicHHWIJ9b8/RM37JQgeGTqZE0WwngIDbljgv01DGJrDFzk5eQgeGVMd63r+AAAA//8kagYzAAAABklEQVQDAFIO2elU1KXHAAAAAElFTkSuQmCC"
)

type User struct {
	ID              string     `gorm:"primaryKey;size:64" json:"id"`
	Username        string     `gorm:"size:128;not null;uniqueIndex" json:"username"`
	DisplayName     string     `gorm:"size:128;not null" json:"displayName"`
	WindowsUsername *string    `gorm:"size:128;uniqueIndex" json:"windowsUsername,omitempty"`
	PasswordHash    string     `gorm:"size:128;not null" json:"-"`
	RDPPassword     string     `gorm:"column:rdp_password;type:text" json:"-"`
	Role            string     `gorm:"size:32;not null;index" json:"role"`
	Status          string     `gorm:"size:32;not null;index" json:"status"`
	LastLoginAt     *time.Time `json:"lastLoginAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = NewID("usr")
	}
	return nil
}

type Application struct {
	ID         string    `gorm:"primaryKey;size:64" json:"id"`
	Name       string    `gorm:"size:128;not null" json:"name"`
	Path       string    `gorm:"size:512;not null;uniqueIndex" json:"path"`
	Icon       string    `gorm:"type:text;not null;default:iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAABsElEQVR4AXyRsUvDUBjE30udXLSpFqQOin0UHbqLCG4Oin+GtU0dXJ0KDupSB2mCODg4C0JRcHIT1LGLbSMqCqLY106KYvP5LpCS1KaBI9e733dDqrGQZ7RkJ3XLPoPgQzD2f6BwOaBb9WKb0wW12yUIHhlTXfdQYCBWqub1+Pgnc9izzImpZj51DsEj01UHxj/iDkSt2rJu1iukaWnneyAuDbHnh+CRoQMDFjfI3QFOvMyIZ2RWrLY2JlsoegkdGLDujYLcAfVm0khe4T28X1/Au5e8zmPBdAbwY+TgcUyLsG3dtE9iVjWBDIJHpkX4FhhkngIDH5mJV/XBZonolkh7iZVqu5DyN5zTqcwl58F4x3gHBhBATUPs8LYzTZynidGXzIlEIyuO0XWr5wCgxnrqjpFzDd9PoQP9jvxdZyBq2XP+op/3s+4AaWyFEx3qln00ZD5Fw47RgQGLG3DuQHNNlNWHmmFElQj7eYuZ9U2U0kgVIHhk6MCAxQ1ydwAGUkVRvicHHWIJ9b8/RM37JQgeGTqZE0WwngIDbljgv01DGJrDFzk5eQgeGVMd63r+AAAA//8kagYzAAAABklEQVQDAFIO2elU1KXHAAAAAElFTkSuQmCC" json:"icon"`
	Arguments  string    `gorm:"size:512" json:"arguments"`
	WorkingDir string    `gorm:"size:512" json:"workingDir"`
	Status     string    `gorm:"size:32;not null;index" json:"status"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

func (a *Application) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = NewID("app")
	}
	return nil
}

type UserAppAuthorization struct {
	ID            string    `gorm:"primaryKey;size:64" json:"id"`
	UserID        string    `gorm:"size:64;not null;uniqueIndex:idx_user_application" json:"userId"`
	ApplicationID string    `gorm:"size:64;not null;uniqueIndex:idx_user_application" json:"applicationId"`
	CreatedAt     time.Time `json:"createdAt"`
}

func (a *UserAppAuthorization) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		a.ID = NewID("auth")
	}
	return nil
}

type AgentStatus struct {
	ID          string    `gorm:"primaryKey;size:64" json:"id"`
	Hostname    string    `gorm:"size:128;not null" json:"hostname"`
	CPUUsage    float64   `json:"cpuUsage"`
	MemoryUsage float64   `json:"memoryUsage"`
	GPUUsage    float64   `json:"gpuUsage"`
	DiskUsage   float64   `json:"diskUsage"`
	DiskTotal   int64     `json:"diskTotal"`
	DiskUsed    int64     `json:"diskUsed"`
	DiskFree    int64     `json:"diskFree"`
	DiskDrive   string    `gorm:"size:16" json:"diskDrive"`
	ReportedAt  time.Time `gorm:"index" json:"reportedAt"`
}

type AgentMetric struct {
	ID          string    `gorm:"primaryKey;size:64" json:"id"`
	Hostname    string    `gorm:"size:128;not null;index" json:"hostname"`
	CPUUsage    float64   `json:"cpuUsage"`
	MemoryUsage float64   `json:"memoryUsage"`
	DiskUsage   float64   `json:"diskUsage"`
	ReportedAt  time.Time `gorm:"index" json:"reportedAt"`
}

func (m *AgentMetric) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = NewID("met")
	}
	return nil
}

type SystemSettings struct {
	ID                               string    `gorm:"primaryKey;size:64" json:"id"`
	StorageRootPath                  string    `gorm:"size:512" json:"storageRootPath"`
	StorageQuotaMB                   int       `json:"storageQuotaMb"`
	StorageVisibleDriveLetter        string    `gorm:"size:1" json:"storageVisibleDriveLetter"`
	RDPLocalDriveMappingEnabled      bool      `gorm:"not null;default:false" json:"rdpLocalDriveMappingEnabled"`
	DisconnectedSessionLogoffMinutes int       `json:"disconnectedSessionLogoffMinutes"`
	CreatedAt                        time.Time `json:"createdAt"`
	UpdatedAt                        time.Time `json:"updatedAt"`
}

func (s *SystemSettings) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = SingleSystemSettingsID
	}
	return nil
}

type Session struct {
	ID               string     `gorm:"primaryKey;size:64" json:"id"`
	RemoteSessionID  string     `gorm:"size:128;not null;uniqueIndex" json:"remoteSessionId"`
	WindowsSessionID int        `gorm:"not null;index" json:"windowsSessionId"`
	UserID           string     `gorm:"size:64;not null;index" json:"userId"`
	WindowsUsername  string     `gorm:"size:128;not null;index" json:"windowsUsername"`
	Status           string     `gorm:"size:32;not null;index" json:"status"`
	ConnectedAt      time.Time  `gorm:"not null;index" json:"connectedAt"`
	DisconnectedAt   *time.Time `json:"disconnectedAt,omitempty"`
	LastSeenAt       time.Time  `gorm:"not null;index" json:"lastSeenAt"`
	CreatedAt        time.Time  `json:"createdAt"`
	UpdatedAt        time.Time  `json:"updatedAt"`
}

func (s *Session) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = NewID("ses")
	}
	return nil
}

type ActivityLog struct {
	ID          string     `gorm:"primaryKey;size:64" json:"id"`
	Category    string     `gorm:"size:32;not null;default:activity;index" json:"category"`
	Level       string     `gorm:"size:32;not null;default:info;index" json:"level"`
	Source      string     `gorm:"size:32;not null;default:backend;index" json:"source"`
	Type        string     `gorm:"size:64;not null;index" json:"type"`
	ActorType   string     `gorm:"size:32;not null;index" json:"actorType"`
	ActorUserID string     `gorm:"size:64;index" json:"actorUserId"`
	TargetType  string     `gorm:"size:64;not null;index" json:"targetType"`
	TargetID    string     `gorm:"size:64;not null;index" json:"targetId"`
	Message     string     `gorm:"size:512;not null" json:"message"`
	Detail      string     `gorm:"size:2048;not null;default:''" json:"detail"`
	CreatedAt   time.Time  `gorm:"index" json:"createdAt"`
	ReadAt      *time.Time `gorm:"index" json:"readAt,omitempty"`
}

func (l *ActivityLog) BeforeCreate(tx *gorm.DB) error {
	if l.ID == "" {
		l.ID = NewID("log")
	}
	return nil
}

func NewID(prefix string) string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		panic(fmt.Errorf("生成 ID 失败: %w", err))
	}
	return prefix + "_" + hex.EncodeToString(b[:])
}

func RemoteSessionID(hostname string, windowsSessionID int, connectedAt time.Time) string {
	key := fmt.Sprintf("%s:%d:%s", strings.ToLower(strings.TrimSpace(hostname)), windowsSessionID, connectedAt.UTC().Format(time.RFC3339Nano))
	sum := sha256.Sum256([]byte(key))
	return "rs_" + hex.EncodeToString(sum[:16])
}

func IsValidRole(role string) bool {
	return role == RoleAdmin || role == RoleUser
}

func IsValidStatus(status string) bool {
	return status == StatusActive || status == StatusDisabled
}
