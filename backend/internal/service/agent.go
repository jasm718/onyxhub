package service

import (
	"encoding/json"
	"fmt"
	"time"

	"onyxhub/backend/internal/models"

	"gorm.io/gorm"
)

type agentEnvelope struct {
	Type string `json:"type"`
}

type hostStatusMessage struct {
	Type        string    `json:"type"`
	ReportedAt  time.Time `json:"reportedAt"`
	Hostname    string    `json:"hostname"`
	CPUUsage    float64   `json:"cpuUsage"`
	MemoryUsage float64   `json:"memoryUsage"`
	GPUUsage    float64   `json:"gpuUsage"`
	DiskUsage   float64   `json:"diskUsage"`
	DiskTotal   int64     `json:"diskTotal"`
	DiskUsed    int64     `json:"diskUsed"`
	DiskFree    int64     `json:"diskFree"`
	DiskDrive   string    `json:"diskDrive"`
}

type sessionSnapshotMessage struct {
	Type       string                `json:"type"`
	ReportedAt time.Time             `json:"reportedAt"`
	Sessions   []sessionSnapshotItem `json:"sessions"`
}

type sessionSnapshotItem struct {
	WindowsSessionID *int      `json:"windowsSessionId"`
	WindowsUsername  string    `json:"windowsUsername"`
	ConnectedAt      time.Time `json:"connectedAt"`
}

func (s *Service) HandleAgentMessage(raw []byte) {
	var env agentEnvelope
	if err := json.Unmarshal(raw, &env); err != nil {
		logAgentError("json 解析失败: %v", err)
		return
	}

	switch env.Type {
	case "host_status":
		if err := s.handleHostStatus(raw); err != nil {
			logAgentError("%v", err)
		}
	case "session_snapshot":
		if err := s.handleSessionSnapshot(raw); err != nil {
			logAgentError("%v", err)
		}
	default:
		logAgentError("未知消息类型: %s", env.Type)
	}
}

func (s *Service) handleHostStatus(raw []byte) error {
	var msg hostStatusMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		return fmt.Errorf("host_status 格式错误: %w", err)
	}
	if trim(msg.Hostname) == "" {
		return fmt.Errorf("host_status 缺少 hostname")
	}
	if msg.ReportedAt.IsZero() {
		return fmt.Errorf("host_status 缺少 reportedAt")
	}
	if msg.CPUUsage < 0 || msg.CPUUsage > 100 || msg.MemoryUsage < 0 || msg.MemoryUsage > 100 || msg.DiskUsage < 0 || msg.DiskUsage > 100 {
		return fmt.Errorf("host_status 百分比数值无效")
	}
	if msg.DiskTotal <= 0 || msg.DiskUsed < 0 || msg.DiskFree < 0 {
		return fmt.Errorf("host_status 磁盘空间无效: total=%d used=%d free=%d", msg.DiskTotal, msg.DiskUsed, msg.DiskFree)
	}
	if trim(msg.DiskDrive) == "" {
		return fmt.Errorf("host_status 缺少 diskDrive")
	}

	status := models.AgentStatus{
		ID:          models.SingleAgentID,
		Hostname:    trim(msg.Hostname),
		CPUUsage:    msg.CPUUsage,
		MemoryUsage: msg.MemoryUsage,
		GPUUsage:    msg.GPUUsage,
		DiskUsage:   msg.DiskUsage,
		DiskTotal:   msg.DiskTotal,
		DiskUsed:    msg.DiskUsed,
		DiskFree:    msg.DiskFree,
		DiskDrive:   trim(msg.DiskDrive),
		ReportedAt:  msg.ReportedAt,
	}
	metric := models.AgentMetric{
		Hostname:    status.Hostname,
		CPUUsage:    status.CPUUsage,
		MemoryUsage: status.MemoryUsage,
		DiskUsage:   status.DiskUsage,
		ReportedAt:  status.ReportedAt,
	}
	return s.withTx(func(tx *gorm.DB) error {
		if err := tx.Save(&status).Error; err != nil {
			return fmt.Errorf("保存 agent 状态失败: %w", err)
		}
		if err := tx.Create(&metric).Error; err != nil {
			return fmt.Errorf("保存 agent 指标失败: %w", err)
		}
		if err := tx.Where("reported_at < ?", status.ReportedAt.Add(-6*time.Hour)).Delete(&models.AgentMetric{}).Error; err != nil {
			return fmt.Errorf("清理 agent 指标失败: %w", err)
		}
		return nil
	})
}

func (s *Service) handleSessionSnapshot(raw []byte) error {
	var msg sessionSnapshotMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		return fmt.Errorf("session_snapshot 格式错误: %w", err)
	}
	if msg.ReportedAt.IsZero() {
		return fmt.Errorf("session_snapshot 缺少 reportedAt")
	}

	var agentStatus models.AgentStatus
	if err := s.db.First(&agentStatus, "id = ?", models.SingleAgentID).Error; err != nil {
		if isNotFound(err) {
			return fmt.Errorf("session_snapshot 缺少 hostname，请先上报 host_status")
		}
		return fmt.Errorf("查询 agent 状态失败: %w", err)
	}

	present := make(map[string]bool)
	return s.withTx(func(tx *gorm.DB) error {
		for _, item := range msg.Sessions {
			remoteSessionID, user, ok := s.validSessionSnapshotItem(tx, agentStatus.Hostname, item)
			if !ok {
				continue
			}
			present[remoteSessionID] = true

			var session models.Session
			err := tx.First(&session, "remote_session_id = ?", remoteSessionID).Error
			if err != nil && !isNotFound(err) {
				return fmt.Errorf("查询 session 失败: %w", err)
			}
			if isNotFound(err) {
				session = models.Session{
					RemoteSessionID:  remoteSessionID,
					WindowsSessionID: *item.WindowsSessionID,
					UserID:           user.ID,
					WindowsUsername:  trim(item.WindowsUsername),
					Status:           models.SessionStatusActive,
					ConnectedAt:      item.ConnectedAt,
					LastSeenAt:       msg.ReportedAt,
				}
				if err := tx.Create(&session).Error; err != nil {
					return fmt.Errorf("创建 session 失败: %w", err)
				}
				if err := s.logActivity(tx, models.ActivitySessionOpened, models.ActorTypeSystem, "", models.TargetTypeSession, session.ID, "用户 "+user.Username+" 已连接"); err != nil {
					return err
				}
				continue
			}

			updates := map[string]any{
				"status":          models.SessionStatusActive,
				"last_seen_at":    msg.ReportedAt,
				"disconnected_at": nil,
			}
			if err := tx.Model(&session).Updates(updates).Error; err != nil {
				return fmt.Errorf("更新 session 失败: %w", err)
			}
		}

		var activeSessions []models.Session
		if err := tx.Where("status = ?", models.SessionStatusActive).Find(&activeSessions).Error; err != nil {
			return fmt.Errorf("查询 active session 失败: %w", err)
		}
		for _, session := range activeSessions {
			if present[session.RemoteSessionID] {
				continue
			}
			disconnectedAt := msg.ReportedAt
			if err := tx.Model(&session).Updates(map[string]any{
				"status":          models.SessionStatusClosed,
				"disconnected_at": disconnectedAt,
				"last_seen_at":    msg.ReportedAt,
			}).Error; err != nil {
				return fmt.Errorf("关闭 session 失败: %w", err)
			}
			if err := s.logActivity(tx, models.ActivitySessionClosed, models.ActorTypeSystem, "", models.TargetTypeSession, session.ID, "Windows 用户 "+session.WindowsUsername+" 已断开"); err != nil {
				return err
			}
		}

		return nil
	})
}

func (s *Service) validSessionSnapshotItem(tx *gorm.DB, hostname string, item sessionSnapshotItem) (string, models.User, bool) {
	if item.WindowsSessionID == nil {
		logAgentError("session_snapshot 缺少 windowsSessionId")
		return "", models.User{}, false
	}
	windowsUsername := trim(item.WindowsUsername)
	if windowsUsername == "" {
		logAgentError("session_snapshot 缺少 windowsUsername")
		return "", models.User{}, false
	}
	if item.ConnectedAt.IsZero() {
		logAgentError("session_snapshot 缺少 connectedAt")
		return "", models.User{}, false
	}

	var user models.User
	result := tx.Where("windows_username = ?", windowsUsername).Limit(1).Find(&user)
	if result.Error != nil {
		logAgentError("查询 windowsUsername 失败: %v", result.Error)
		return "", models.User{}, false
	}
	if result.RowsAffected == 0 {
		logAgentError("windowsUsername 找不到用户: %s", windowsUsername)
		return "", models.User{}, false
	}

	return models.RemoteSessionID(hostname, *item.WindowsSessionID, item.ConnectedAt), user, true
}
