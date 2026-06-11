package agent

import (
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
	if err == nil {
		status.CPUUsage = cpuUsage
	}
	memoryUsage, err := collectMemoryUsage()
	if err == nil {
		status.MemoryUsage = memoryUsage
	}
	diskUsage, err := collectDiskUsage()
	if err == nil {
		status.DiskUsage = diskUsage
	}

	return status, nil
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

func collectDiskUsage() (float64, error) {
	out, err := runPowerShell(10*time.Second, `
$drive = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
if ($null -eq $drive -or $drive.Size -eq 0) { throw "C drive is empty" }
[math]::Round((($drive.Size - $drive.FreeSpace) / $drive.Size) * 100, 2)
`)
	if err != nil {
		return 0, err
	}
	return parsePercent(out)
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
