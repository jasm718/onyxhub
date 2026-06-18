"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconLock, IconLogin2 } from "@tabler/icons-react"
import { toast } from "sonner"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { getAuthToken, setAuth } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [hydrated, setHydrated] = React.useState(false)
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    setHydrated(true)
    if (getAuthToken()) {
      router.replace("/dashboard")
    }
  }, [router])

  async function submitLogin() {
    if (!username.trim() || !password) {
      toast.error("请输入用户名和密码")
      return
    }

    setSubmitting(true)
    try {
      const result = await api.login(username.trim(), password)
      setAuth(result.token, result.user)
      toast.success("登录成功")
      const next = new URLSearchParams(window.location.search).get("next")
      router.replace(next || "/dashboard")
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await submitLogin()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm border-border/50 bg-card/80">
        <CardHeader className="space-y-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary">
            <IconLock className="size-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>OnyxHub 管理后台</CardTitle>
            <CardDescription>登录后管理 RemoteApp 分发平台</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                disabled={!hydrated || submitting}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!hydrated || submitting}
                className="h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
              />
            </div>
            <button
              className="inline-flex h-8 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary px-2.5 py-1 text-sm font-medium text-primary-foreground outline-none transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              type="submit"
              disabled={!hydrated || submitting}
            >
              <IconLogin2 className="size-4" />
              {submitting ? "登录中..." : "登录"}
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
