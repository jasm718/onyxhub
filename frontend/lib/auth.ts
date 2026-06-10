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
  return window.localStorage.getItem(tokenKey)
}

export function getAuthUser(): AdminUser | null {
  assertBrowser()
  const raw = window.localStorage.getItem(userKey)
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
  window.localStorage.setItem(tokenKey, token)
  window.localStorage.setItem(userKey, JSON.stringify(user))
}

export function clearAuth() {
  assertBrowser()
  window.localStorage.removeItem(tokenKey)
  window.localStorage.removeItem(userKey)
}

export function isAuthenticated() {
  return Boolean(getAuthToken())
}
