"use client"

export type AdminUser = {
  id: string
  username: string
  displayName: string
  windowsUsername: string
  role: "admin" | "user"
  status: "active" | "disabled"
  lastLoginAt?: string
  createdAt: string
  updatedAt: string
}

const tokenKey = "onyxhub_admin_token"
const userKey = "onyxhub_admin_user"

function assertBrowser() {
  if (typeof window === "undefined") {
    throw new Error("登录态只能在浏览器中访问")
  }
}

export function getAuthToken() {
  assertBrowser()
  try {
    return window.localStorage.getItem(tokenKey)
  } catch {
    return null
  }
}

export function getAuthUser(): AdminUser | null {
  assertBrowser()
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(userKey)
  } catch {
    return null
  }
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    clearAuth()
    return null
  }
}

export function setAuth(token: string, user: AdminUser) {
  assertBrowser()
  if (!token) {
    throw new Error("token 不能为空")
  }
  try {
    window.localStorage.setItem(tokenKey, token)
    window.localStorage.setItem(userKey, JSON.stringify(user))
  } catch (error) {
    throw new Error(`保存登录态失败: ${(error as Error).message}`)
  }
}

export function clearAuth() {
  assertBrowser()
  try {
    window.localStorage.removeItem(tokenKey)
    window.localStorage.removeItem(userKey)
  } catch {
    return
  }
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}
