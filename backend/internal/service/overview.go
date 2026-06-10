package service

import (
	"fmt"
	"time"

	"onyxhub/backend/internal/models"
)

const timeFormatRFC3339 = time.RFC3339Nano

type Overview struct {
	Cards            OverviewCards        `json:"cards"`
	AgentStatus      *models.AgentStatus  `json:"agentStatus"`
	ConnectionTrend  []ConnectionTrendDay `json:"connectionTrend"`
	RecentActivities []models.ActivityLog `json:"recentActivities"`
}

type OverviewCards struct {
	TotalUsers         int64 `json:"totalUsers"`
	ActiveUsers        int64 `json:"activeUsers"`
	TotalApplications  int64 `json:"totalApplications"`
	ActiveApplications int64 `json:"activeApplications"`
	ActiveSessions     int64 `json:"activeSessions"`
	AgentOnline        bool  `json:"agentOnline"`
}

type ConnectionTrendDay struct {
	Date   string `json:"date"`
	Opened int64  `json:"opened"`
	Closed int64  `json:"closed"`
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
	} else if !isNotFound(err) {
		return Overview{}, fmt.Errorf("查询 agent 状态失败: %w", err)
	}

	trend, err := s.connectionTrend()
	if err != nil {
		return Overview{}, err
	}
	overview.ConnectionTrend = trend

	var logs []models.ActivityLog
	if err := s.db.Order("created_at desc").Limit(10).Find(&logs).Error; err != nil {
		return Overview{}, fmt.Errorf("查询最近活动失败: %w", err)
	}
	overview.RecentActivities = logs

	return overview, nil
}

func (s *Service) connectionTrend() ([]ConnectionTrendDay, error) {
	now := s.now()
	start := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location()).AddDate(0, 0, -6)

	items := make([]ConnectionTrendDay, 0, 7)
	for i := 0; i < 7; i++ {
		dayStart := start.AddDate(0, 0, i)
		dayEnd := dayStart.AddDate(0, 0, 1)

		var opened int64
		if err := s.db.Model(&models.ActivityLog{}).
			Where("type = ? AND created_at >= ? AND created_at < ?", models.ActivitySessionOpened, dayStart, dayEnd).
			Count(&opened).Error; err != nil {
			return nil, fmt.Errorf("统计连接开启趋势失败: %w", err)
		}

		var closed int64
		if err := s.db.Model(&models.ActivityLog{}).
			Where("type = ? AND created_at >= ? AND created_at < ?", models.ActivitySessionClosed, dayStart, dayEnd).
			Count(&closed).Error; err != nil {
			return nil, fmt.Errorf("统计连接断开趋势失败: %w", err)
		}

		items = append(items, ConnectionTrendDay{
			Date:   dayStart.Format("2006-01-02"),
			Opened: opened,
			Closed: closed,
		})
	}

	return items, nil
}
