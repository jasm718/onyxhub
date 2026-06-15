package service

import (
	"fmt"
	"math"
	"sort"
	"time"

	"onyxhub/backend/internal/models"
)

const agentMetricWindow = 5 * time.Minute

type Overview struct {
	Cards                   OverviewCards           `json:"cards"`
	AgentStatus             *models.AgentStatus     `json:"agentStatus"`
	AgentMetrics            []AgentMetricPoint      `json:"agentMetrics"`
	ActiveConnections       []ActiveConnectionPoint `json:"activeConnections"`
	ConnectionDurationStats ConnectionDurationStats `json:"connectionDurationStats"`
}

type OverviewCards struct {
	TotalUsers         int64  `json:"totalUsers"`
	ActiveUsers        int64  `json:"activeUsers"`
	TotalApplications  int64  `json:"totalApplications"`
	ActiveApplications int64  `json:"activeApplications"`
	ActiveSessions     int64  `json:"activeSessions"`
	AgentOnline        bool   `json:"agentOnline"`
	AgentUptimeSeconds int64  `json:"agentUptimeSeconds"`
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

type ActiveConnectionPoint struct {
	Username         string    `json:"username"`
	ConnectedSeconds int64     `json:"connectedSeconds"`
	ConnectedAt      time.Time `json:"connectedAt"`
}

type ConnectionDurationStats struct {
	Weekly  []ConnectionDurationPoint `json:"weekly"`
	Monthly []ConnectionDurationPoint `json:"monthly"`
}

type ConnectionDurationPoint struct {
	Username   string  `json:"username"`
	TotalHours float64 `json:"totalHours"`
}

type OverviewNotifications struct {
	Exceptions           []models.AgentIssue `json:"exceptions"`
	UnreadExceptionCount int64               `json:"unreadExceptionCount"`
}

type ActivityLogItem struct {
	ID         string     `json:"id"`
	Kind       string     `json:"kind"`
	Level      string     `json:"level"`
	Type       string     `json:"type"`
	ActorType  string     `json:"actorType"`
	TargetType string     `json:"targetType"`
	Message    string     `json:"message"`
	CreatedAt  time.Time  `json:"createdAt"`
	ReadAt     *time.Time `json:"readAt,omitempty"`
}

type ActivityLogsResult struct {
	Items []ActivityLogItem `json:"items"`
}

type MarkAgentIssuesReadResult struct {
	Updated int64 `json:"updated"`
}

func (s *Service) GetOverview() (Overview, error) {
	var overview Overview

	if err := s.db.Model(&models.User{}).Where("role = ?", models.RoleUser).Count(&overview.Cards.TotalUsers).Error; err != nil {
		return Overview{}, fmt.Errorf("统计用户失败: %w", err)
	}
	if err := s.db.Model(&models.User{}).Where("role = ? AND status = ?", models.RoleUser, models.StatusActive).Count(&overview.Cards.ActiveUsers).Error; err != nil {
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
	overview.Cards.AgentUptimeSeconds = s.agentUptimeSeconds()

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

	activeConnections, err := s.activeConnections()
	if err != nil {
		return Overview{}, err
	}
	overview.ActiveConnections = activeConnections

	durationStats, err := s.connectionDurationStats()
	if err != nil {
		return Overview{}, err
	}
	overview.ConnectionDurationStats = durationStats

	return overview, nil
}

func (s *Service) GetNotifications() (OverviewNotifications, error) {
	since := s.now().AddDate(0, 0, -7)

	var exceptions []models.AgentIssue
	if err := s.db.Where("created_at >= ?", since).Order("created_at desc").Limit(50).Find(&exceptions).Error; err != nil {
		return OverviewNotifications{}, fmt.Errorf("查询异常信息失败: %w", err)
	}

	var unreadCount int64
	if err := s.db.Model(&models.AgentIssue{}).Where("read_at IS NULL").Count(&unreadCount).Error; err != nil {
		return OverviewNotifications{}, fmt.Errorf("统计未读异常失败: %w", err)
	}

	return OverviewNotifications{
		Exceptions:           exceptions,
		UnreadExceptionCount: unreadCount,
	}, nil
}

func (s *Service) ListActivityLogs(filter string) (ActivityLogsResult, error) {
	filter = trim(filter)
	if filter == "" {
		filter = "all"
	}
	if filter != "all" && filter != "exceptions" && filter != "activities" {
		return ActivityLogsResult{}, fmt.Errorf("活动日志筛选类型无效: %s", filter)
	}

	items := make([]ActivityLogItem, 0, 100)
	if filter != "activities" {
		var exceptions []models.AgentIssue
		if err := s.db.Order("created_at desc").Limit(100).Find(&exceptions).Error; err != nil {
			return ActivityLogsResult{}, fmt.Errorf("查询异常日志失败: %w", err)
		}
		for _, item := range exceptions {
			items = append(items, ActivityLogItem{
				ID:         item.ID,
				Kind:       "exception",
				Level:      item.Level,
				Type:       item.Type,
				ActorType:  models.ActorTypeSystem,
				TargetType: models.TargetTypeSystem,
				Message:    item.Message,
				CreatedAt:  item.CreatedAt,
				ReadAt:     item.ReadAt,
			})
		}
	}
	if filter != "exceptions" {
		var activities []models.ActivityLog
		if err := s.db.Order("created_at desc").Limit(100).Find(&activities).Error; err != nil {
			return ActivityLogsResult{}, fmt.Errorf("查询活动日志失败: %w", err)
		}
		for _, item := range activities {
			items = append(items, ActivityLogItem{
				ID:         item.ID,
				Kind:       "activity",
				Level:      "info",
				Type:       item.Type,
				ActorType:  item.ActorType,
				TargetType: item.TargetType,
				Message:    item.Message,
				CreatedAt:  item.CreatedAt,
			})
		}
	}

	sort.Slice(items, func(i, j int) bool {
		return items[i].CreatedAt.After(items[j].CreatedAt)
	})
	if len(items) > 100 {
		items = items[:100]
	}

	return ActivityLogsResult{Items: items}, nil
}

func (s *Service) MarkAllAgentIssuesRead() (MarkAgentIssuesReadResult, error) {
	now := s.now()
	result := s.db.Model(&models.AgentIssue{}).
		Where("read_at IS NULL").
		Update("read_at", now)
	if result.Error != nil {
		return MarkAgentIssuesReadResult{}, fmt.Errorf("标记异常已读失败: %w", result.Error)
	}
	return MarkAgentIssuesReadResult{Updated: result.RowsAffected}, nil
}

func (s *Service) agentMetrics() ([]AgentMetricPoint, error) {
	var rows []models.AgentMetric
	since := s.now().UTC().Add(-agentMetricWindow)
	if err := s.db.Where("reported_at >= ?", since).Order("reported_at asc").Find(&rows).Error; err != nil {
		return nil, fmt.Errorf("查询 agent 指标失败: %w", err)
	}

	items := make([]AgentMetricPoint, 0, len(rows))
	for _, row := range rows {
		items = append(items, AgentMetricPoint{
			ReportedAt:  row.ReportedAt,
			CPUUsage:    row.CPUUsage,
			MemoryUsage: row.MemoryUsage,
		})
	}
	return items, nil
}

func (s *Service) activeConnections() ([]ActiveConnectionPoint, error) {
	now := s.now()

	type row struct {
		Username    string    `gorm:"column:username"`
		ConnectedAt time.Time `gorm:"column:connected_at"`
	}

	var rows []row
	if err := s.db.Table("sessions").
		Select("users.username AS username, sessions.connected_at AS connected_at").
		Joins("JOIN users ON users.id = sessions.user_id").
		Where("sessions.status = ?", models.SessionStatusActive).
		Scan(&rows).Error; err != nil {
		return nil, fmt.Errorf("查询当前活跃连接失败: %w", err)
	}

	items := make([]ActiveConnectionPoint, 0, len(rows))
	for _, row := range rows {
		seconds := int64(now.Sub(row.ConnectedAt).Seconds())
		if seconds < 0 {
			seconds = 0
		}
		items = append(items, ActiveConnectionPoint{
			Username:         row.Username,
			ConnectedSeconds: seconds,
			ConnectedAt:      row.ConnectedAt,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].ConnectedSeconds == items[j].ConnectedSeconds {
			return items[i].Username < items[j].Username
		}
		return items[i].ConnectedSeconds > items[j].ConnectedSeconds
	})
	if len(items) > 12 {
		items = items[:12]
	}
	return items, nil
}

func (s *Service) connectionDurationStats() (ConnectionDurationStats, error) {
	now := s.now()
	weekStart := weekStart(now)
	monthStart := monthStart(now)
	earliestStart := weekStart
	if monthStart.Before(earliestStart) {
		earliestStart = monthStart
	}

	type row struct {
		Username       string     `gorm:"column:username"`
		ConnectedAt    time.Time  `gorm:"column:connected_at"`
		DisconnectedAt *time.Time `gorm:"column:disconnected_at"`
	}

	var rows []row
	if err := s.db.Table("sessions").
		Select("users.username AS username, sessions.connected_at AS connected_at, sessions.disconnected_at AS disconnected_at").
		Joins("JOIN users ON users.id = sessions.user_id").
		Where("sessions.connected_at < ?", now).
		Where("(sessions.disconnected_at IS NULL OR sessions.disconnected_at >= ?)", earliestStart).
		Scan(&rows).Error; err != nil {
		return ConnectionDurationStats{}, fmt.Errorf("查询连接时长失败: %w", err)
	}

	weeklyTotals := make(map[string]float64)
	monthlyTotals := make(map[string]float64)
	for _, row := range rows {
		addConnectionDuration(weeklyTotals, row.Username, row.ConnectedAt, row.DisconnectedAt, weekStart, now)
		addConnectionDuration(monthlyTotals, row.Username, row.ConnectedAt, row.DisconnectedAt, monthStart, now)
	}

	return ConnectionDurationStats{
		Weekly:  topConnectionDurationPoints(weeklyTotals, 12),
		Monthly: topConnectionDurationPoints(monthlyTotals, 12),
	}, nil
}

func addConnectionDuration(
	totals map[string]float64,
	username string,
	connectedAt time.Time,
	disconnectedAt *time.Time,
	start time.Time,
	now time.Time,
) {
	if connectedAt.Before(start) {
		connectedAt = start
	}
	endedAt := now
	if disconnectedAt != nil && disconnectedAt.Before(endedAt) {
		endedAt = *disconnectedAt
	}
	if endedAt.After(now) {
		endedAt = now
	}
	if endedAt.Before(connectedAt) {
		return
	}

	hours := endedAt.Sub(connectedAt).Hours()
	if hours <= 0 {
		return
	}
	totals[username] += hours
}

func topConnectionDurationPoints(totals map[string]float64, limit int) []ConnectionDurationPoint {
	items := make([]ConnectionDurationPoint, 0, len(totals))
	for username, hours := range totals {
		items = append(items, ConnectionDurationPoint{
			Username:   username,
			TotalHours: roundOneDecimal(hours),
		})
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].TotalHours == items[j].TotalHours {
			return items[i].Username < items[j].Username
		}
		return items[i].TotalHours > items[j].TotalHours
	})
	if limit > 0 && len(items) > limit {
		items = items[:limit]
	}
	return items
}

func weekStart(now time.Time) time.Time {
	loc := now.Location()
	normalized := time.Date(now.In(loc).Year(), now.In(loc).Month(), now.In(loc).Day(), 0, 0, 0, 0, loc)
	offset := (int(normalized.Weekday()) + 6) % 7
	return normalized.AddDate(0, 0, -offset)
}

func monthStart(now time.Time) time.Time {
	loc := now.Location()
	return time.Date(now.In(loc).Year(), now.In(loc).Month(), 1, 0, 0, 0, 0, loc)
}

func roundOneDecimal(value float64) float64 {
	if value < 0 {
		return 0
	}
	return math.Round(value*10) / 10
}
