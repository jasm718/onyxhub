"use client"

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "-"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatRelativeTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000))
  if (seconds < 60) {
    return "刚刚"
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes} 分钟前`
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours} 小时前`
  }
  const days = Math.floor(hours / 24)
  if (days < 30) {
    return `${days} 天前`
  }

  return formatDateTime(value)
}

export function statusLabel(status: string) {
  if (status === "active") {
    return "启用"
  }
  if (status === "disabled") {
    return "禁用"
  }
  return status
}

export function roleLabel(role: string) {
  if (role === "admin") {
    return "管理员"
  }
  if (role === "user") {
    return "用户"
  }
  return role
}

export function formatBytes(bytes?: number | null) {
  if (bytes === null || bytes === undefined || bytes < 0) {
    return "-"
  }

  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  const digits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(digits)} ${units[unitIndex]}`
}

export function formatDuration(seconds?: number | null) {
  if (!seconds || seconds < 0) {
    return "0 分钟"
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${Math.max(1, minutes)} 分钟`
  }

  const hours = Math.floor(minutes / 60)
  const restMinutes = minutes % 60
  if (hours < 24) {
    return restMinutes > 0 ? `${hours} 小时 ${restMinutes} 分钟` : `${hours} 小时`
  }

  const days = Math.floor(hours / 24)
  const restHours = hours % 24
  return restHours > 0 ? `${days} 天 ${restHours} 小时` : `${days} 天`
}
