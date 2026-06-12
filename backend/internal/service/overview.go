package service

import (
	"fmt"
	"time"

	"onyxhub/backend/internal/models"
)

const timeFormatRFC3339 = time.RFC3339Nano

type Overview struct {
	Cards               OverviewCards              `json:"cards"`
	AgentStatus         *models.AgentStatus        `json:"agentStatus"`
	AgentMetrics        []AgentMetricPoint         `json:"agentMetrics"`
	ConnectionDurations []ConnectionDurationByUser `json:"connectionDurations"`
	RecentActivities    []models.ActivityLog       `json:"recentActivities"`
}

type OverviewCards struct {
	TotalUsers         int64  `json:"totalUsers"`
	ActiveUsers        int64  `json:"activeUsers"`
	TotalApplications  int64  `json:"totalApplications"`
	ActiveApplications int64  `json:"activeApplications"`
	ActiveSessions     int64  `json:"activeSessions"`
	AgentOnline        bool   `json:"agentOnline"`
	StorageDiskTotal   int64  `json:"storageDiskTotal"`
	StorageDiskUsed    int64  `json:"storageDiskUsed"`
	StorageDiskFree    int64  `json:"storageDiskFree"`
	StorageDiskDrive   string `json:"storageDiskDrive"`
}

type AgentMetricPoint struct {
	ReportedAt  time.Time `json:"reportedAt"`
	CPUUsage    float64   `json:"cpuUsage"`
	MemoryUsage float64   `json:"memoryUsage"`
}

type ConnectionDurationByUser struct {
	Username     string `json:"username"`
	TotalSeconds int64  `json:"totalSeconds"`
}

func (s *Service) GetOverview() (Overview, error) {
	var overview Overview

	if err := s.db.Model(&models.User{}).Count(&overview.Cards.TotalUsers).Error; err != nil {
		return Overview{}, fmt.Errorf("统计用户失败: %w", err)
	}
	if err := s.db.Model(&models.User{}).Where("status = ?", models.StatusActive).Count(&overview.Cards.ActiveUsers).Error; err != nil {
		return Overview{}, fmt.Errorf("统计启用用户失败: %w", err)
	}
	if err := s.db.Model(&models.Application{}).Count(&overview.Cards.TotalApplications).Error; err != nil {
		return Overview{}, fmt.Errorf("统计应用失败: %w", err)
	}
	if err := s.db.Model(&models.Application{}).Where("status = ?", models.StatusActive).Count(&overview.Cards.ActiveApplications).Error; err != nil {
		return Overview{}, fmt.Errorf("统计启用应用失败: %w", err)
	}
	if err := s.db.Model(&models.Session{}).Where("status = ?", models.SessionStatusActive).Count(&overview.Cards.ActiveSessions).Error; err != nil {
		return Overview{}, fmt.Errorf("统计在线会话失败: %w", err)
	}
	overview.Cards.AgentOnline = s.agentConnected()

	var agentStatus models.AgentStatus
	if err := s.db.First(&agentStatus, "id = ?", models.SingleAgentID).Error; err == nil {
		overview.AgentStatus = &agentStatus
		overview.Cards.StorageDiskTotal = agentStatus.DiskTotal
		overview.Cards.StorageDiskUsed = agentStatus.DiskUsed
		overview.Cards.StorageDiskFree = agentStatus.DiskFree
		overview.Cards.StorageDiskDrive = agentStatus.DiskDrive
	} else if !isNotFound(err) {
		return Overview{}, fmt.Errorf("查询 agent 状态失败: %w", err)
	}

	metrics, err := s.agentMetrics()
	if err != nil {
		return Overview{}, err
	}
	overview.AgentMetrics = metrics

	durations, err := s.connectionDurations()
	if err != nil {
		return Overview{}, err
	}
	overview.ConnectionDurations = durations

	var logs []models.ActivityLog
	if err := s.db.Order("created_at desc").Limit(10).Find(&logs).Error; err != nil {
		return Overview{}, fmt.Errorf("查询最近活动失败: %w", err)
	}
	overview.RecentActivities = logs

	return overview, nil
}

func (s *Service) agentMetrics() ([]AgentMetricPoint, error) {
	var rows []models.AgentMetric
	if err := s.db.Order("reported_at desc").Limit(30).Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("查询 agent 指标失败: %w", err)
	}

	items := make([]AgentMetricPoint, 0, len(rows))
	for i := len(rows) - 1; i >= 0; i-- {
		row := rows[i]
		items = append(items, AgentMetricPoint{
			ReportedAt:  row.ReportedAt,
			CPUUsage:    row.CPUUsage,
			MemoryUsage: row.MemoryUsage,
		})
	}
	return items, nil
}

func (s *Service) connectionDurations() ([]ConnectionDurationByUser, error) {
	now := s.now()
	type durationRow struct {
		Username     string `gorm:"column:username"`
		TotalSeconds int64  `gorm:"column:total_seconds"`
	}

	var rows []durationRow
	if err := s.db.Table("sessions").
		Select(`
users.username AS username,
SUM(MAX(0, strftime('%s', COALESCE(sessions.disconnected_at, ?)) - strftime('%s', sessions.connected_at))) AS total_seconds
`, now).
		Joins("JOIN users ON users.id = sessions.user_id").
		Group("users.username").
		Order("total_seconds desc").
		Limit(12).
		Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("统计用户连接总时长失败: %w", err)
	}

	items := make([]ConnectionDurationByUser, 0, len(rows))
	for _, row := range rows {
		items = append(items, ConnectionDurationByUser{
			Username:     row.Username,
			TotalSeconds: row.TotalSeconds,
		})
	}
	return items, nil
}
