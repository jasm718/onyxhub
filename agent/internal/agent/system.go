package agent

import (
	"encoding/json"
	"fmt"
	"math"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"
)

type HostStatus struct {
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

func CollectHostStatus() (HostStatus, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return HostStatus{}, fmt.Errorf("读取主机名失败: %w", err)
	}

	status := HostStatus{
		Type:       "host_status",
		ReportedAt: time.Now().UTC(),
		Hostname:   hostname,
		GPUUsage:   0,
	}

	cpuUsage, err := collectCPUUsage()
	if err != nil {
		return HostStatus{}, fmt.Errorf("采集 CPU 使用率失败: %w", err)
	}
	status.CPUUsage = cpuUsage
	memoryUsage, err := collectMemoryUsage()
	if err != nil {
		return HostStatus{}, fmt.Errorf("采集内存使用率失败: %w", err)
	}
	status.MemoryUsage = memoryUsage
	disk, err := collectDisk()
	if err != nil {
		return HostStatus{}, fmt.Errorf("采集存储盘空间失败: %w", err)
	}
	status.DiskUsage = disk.Usage
	status.DiskTotal = disk.Total
	status.DiskUsed = disk.Used
	status.DiskFree = disk.Free
	status.DiskDrive = disk.Drive

	return status, nil
}

type diskStats struct {
	Usage float64 `json:"usage"`
	Total int64   `json:"total"`
	Used  int64   `json:"used"`
	Free  int64   `json:"free"`
	Drive string  `json:"drive"`
}

func collectCPUUsage() (float64, error) {
	out, err := runPowerShell(10*time.Second, `Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average | Select-Object -ExpandProperty Average`)
	if err != nil {
		return 0, err
	}
	return parsePercent(out)
}

func collectMemoryUsage() (float64, error) {
	out, err := runPowerShell(10*time.Second, `
$os = Get-CimInstance Win32_OperatingSystem
if ($null -eq $os.TotalVisibleMemorySize -or $os.TotalVisibleMemorySize -eq 0) { throw "TotalVisibleMemorySize is empty" }
[math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 2)
`)
	if err != nil {
		return 0, err
	}
	return parsePercent(out)
}

func collectDisk() (diskStats, error) {
	out, err := runPowerShell(10*time.Second, `
$drives = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | Where-Object { $_.Size -gt 0 })
if ($drives.Count -eq 0) { throw "fixed disk is empty" }
$total = [int64](($drives | Measure-Object -Property Size -Sum).Sum)
$free = [int64](($drives | Measure-Object -Property FreeSpace -Sum).Sum)
$used = [int64]($total - $free)
@{
  usage = [math]::Round(($used / $total) * 100, 2)
  total = $total
  used = $used
  free = $free
  drive = "ALL"
} | ConvertTo-Json -Compress
`)
	if err != nil {
		return diskStats{}, err
	}
	var stats diskStats
	if err := json.Unmarshal([]byte(strings.TrimSpace(out)), &stats); err != nil {
		return diskStats{}, fmt.Errorf("解析磁盘状态失败: %w", err)
	}
	if stats.Total <= 0 {
		return diskStats{}, fmt.Errorf("磁盘容量无效")
	}
	if stats.Free < 0 || stats.Used < 0 {
		return diskStats{}, fmt.Errorf("磁盘空间数值无效")
	}
	if strings.TrimSpace(stats.Drive) == "" {
		return diskStats{}, fmt.Errorf("磁盘盘符为空")
	}
	return stats, nil
}

func parsePercent(value string) (float64, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, fmt.Errorf("百分比输出为空")
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0, fmt.Errorf("解析百分比失败: %w", err)
	}
	if math.IsNaN(parsed) || math.IsInf(parsed, 0) {
		return 0, fmt.Errorf("百分比数值无效")
	}
	if parsed < 0 {
		return 0, nil
	}
	if parsed > 100 && runtime.GOOS == "windows" {
		return 100, nil
	}
	return parsed, nil
}
