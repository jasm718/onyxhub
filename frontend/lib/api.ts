"use client"

import { clearAuth, getAuthToken, type AdminUser } from "@/lib/auth"

const defaultBaseUrl = "http://127.0.0.1:8080"

export type ApiResponse<T> = {
  code: number
  message: string
  data: T
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export type User = AdminUser

export type Application = {
  id: string
  name: string
  path: string
  icon: string
  arguments: string
  workingDir: string
  status: "active" | "disabled"
  createdAt: string
  updatedAt: string
}

export type Authorization = {
  id: string
  userId: string
  applicationId: string
  createdAt: string
  user: User
  application: Application
}

export type Overview = {
  cards: {
    totalUsers: number
    activeUsers: number
    totalApplications: number
    activeApplications: number
    activeSessions: number
    agentOnline: boolean
    serviceUptimeSeconds: number
    storageDiskTotal: number
    storageDiskUsed: number
    storageDiskFree: number
    storageDiskDrive: string
  }
  agentStatus: {
    id: string
    hostname: string
    cpuUsage: number
    memoryUsage: number
    gpuUsage: number
    diskUsage: number
    diskTotal: number
    diskUsed: number
    diskFree: number
    diskDrive: string
    reportedAt: string
  } | null
  agentMetrics: Array<{
    reportedAt: string
    cpuUsage: number
    memoryUsage: number
  }>
  activeConnections: Array<{
    username: string
    connectedSeconds: number
    connectedAt: string
  }>
  connectionDurationStats: {
    weekly: Array<{
      username: string
      totalHours: number
    }>
    monthly: Array<{
      username: string
      totalHours: number
    }>
  }
}

export type ActivityLogItem = {
  id: string
  category: "activity" | "alert" | string
  level: "info" | "warn" | "error" | string
  source: string
  type: string
  actorType: string
  targetType: string
  message: string
  detail: string
  createdAt: string
  readAt?: string
}

export type ActivityLogsResult = {
  items: ActivityLogItem[]
}

export type Notifications = {
  items: ActivityLogItem[]
  unreadCount: number
}

export type MarkLogReadResult = {
  updated: number
}

export type LoginResult = {
  token: string
  user: User
}

export type CreateUserInput = {
  username: string
  displayName: string
  password: string
  role: "admin" | "user"
  status: "active" | "disabled"
}

export type UpdateUserInput = {
  id: string
  username: string
  displayName: string
  password?: string
  role: "admin" | "user"
  status: "active" | "disabled"
}

export type CreateApplicationInput = {
  name: string
  path: string
  arguments: string
  workingDir: string
  status: "active" | "disabled"
}

export type UpdateApplicationInput = CreateApplicationInput & {
  id: string
}

export type InstalledApplication = {
  name: string
  path: string
  arguments: string
  workingDir: string
}

export type ApplicationIcon = {
  path: string
  mimeType: string
  iconBase64: string
}

export type SystemSettings = {
  id: string
  storageRootPath: string
  storageQuotaMb: number
  storageVisibleDriveLetter: string
  rdpLocalDriveMappingEnabled: boolean
  disconnectedSessionLogoffMinutes: number
  createdAt: string
  updatedAt: string
}

export type UpdateSystemSettingsInput = Partial<
  Pick<
    SystemSettings,
    | "storageRootPath"
    | "storageQuotaMb"
    | "storageVisibleDriveLetter"
    | "rdpLocalDriveMappingEnabled"
    | "disconnectedSessionLogoffMinutes"
  >
>

function apiBaseUrl() {
  return (process.env.NEXT_PUBLIC_ONYXHUB_API_BASE_URL || defaultBaseUrl).replace(/\/+$/, "")
}

function apiUrl(path: string) {
  if (!path.startsWith("/")) {
    throw new Error("API path 必须以 / 开头")
  }
  return `${apiBaseUrl()}${path}`
}

async function parseResponse<T>(response: Response): Promise<T> {
  let payload: ApiResponse<T>
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch (error) {
    throw new ApiError(`解析响应失败: ${(error as Error).message}`, response.status)
  }

  if (!response.ok || payload.code !== 0) {
    throw new ApiError(payload.message || "请求失败", response.status)
  }

  return payload.data
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("Content-Type", "application/json")

  if (auth) {
    const token = getAuthToken()
    if (!token) {
      throw new ApiError("未登录", 401)
    }
    headers.set("Authorization", `Bearer ${token}`)
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  })

  if (response.status === 401 || response.status === 403) {
    clearAuth()
  }

  return parseResponse<T>(response)
}

function post<T>(path: string, body: unknown, auth = true) {
  return request<T>(
    path,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    auth
  )
}

export const api = {
  login(username: string, password: string) {
    return post<LoginResult>("/api/admin/auth/login", { username, password }, false)
  },
  overview() {
    return request<Overview>("/api/admin/overview")
  },
  notifications() {
    return request<Notifications>("/api/admin/notifications")
  },
  markNotificationsRead() {
    return post<MarkLogReadResult>("/api/admin/notifications/mark-all-read", {})
  },
  markNotificationRead(id: string) {
    return post<MarkLogReadResult>("/api/admin/notifications/mark-read", { id })
  },
  activityLogs(filter?: "all" | "activity" | "alert" | "warn" | "error") {
    const query = filter ? `?filter=${encodeURIComponent(filter)}` : ""
    return request<ActivityLogsResult>(`/api/admin/activity-logs${query}`)
  },
  users() {
    return request<User[]>("/api/admin/users")
  },
  createUser(input: CreateUserInput) {
    return post<User>("/api/admin/users/create", input)
  },
  updateUser(input: UpdateUserInput) {
    const body: Record<string, unknown> = { ...input }
    if (!input.password) {
      delete body.password
    }
    return post<User>("/api/admin/users/update", body)
  },
  deleteUser(id: string) {
    return post<Record<string, never>>("/api/admin/users/delete", { id })
  },
  applications() {
    return request<Application[]>("/api/admin/applications")
  },
  createApplication(input: CreateApplicationInput) {
    return post<Application>("/api/admin/applications/create", input)
  },
  updateApplication(input: UpdateApplicationInput) {
    return post<Application>("/api/admin/applications/update", input)
  },
  deleteApplication(id: string) {
    return post<Record<string, never>>("/api/admin/applications/delete", { id })
  },
  enableApplication(id: string) {
    return post<Application>("/api/admin/applications/enable", { id })
  },
  disableApplication(id: string) {
    return post<Application>("/api/admin/applications/disable", { id })
  },
  scanInstalledApplications() {
    return post<InstalledApplication[]>("/api/admin/applications/scan-installed", {})
  },
  fetchApplicationIcon(path: string) {
    return post<ApplicationIcon>("/api/admin/applications/icon", { path })
  },
  authorizations() {
    return request<Authorization[]>("/api/admin/authorizations")
  },
  grantAuthorization(userId: string, applicationId: string) {
    return post<Authorization>("/api/admin/authorizations/grant", {
      userId,
      applicationId,
    })
  },
  revokeAuthorization(userId: string, applicationId: string) {
    return post<Record<string, never>>("/api/admin/authorizations/revoke", {
      userId,
      applicationId,
    })
  },
  systemSettings() {
    return request<SystemSettings>("/api/admin/settings/system")
  },
  updateSystemSettings(input: UpdateSystemSettingsInput) {
    return post<SystemSettings>("/api/admin/settings/system", input)
  },
}
