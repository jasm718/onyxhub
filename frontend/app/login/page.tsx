"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { IconLock, IconLogin2 } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { getAuthToken, setAuth } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    if (getAuthToken()) {
      router.replace("/dashboard")
    }
  }, [router])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            <Button className="w-full gap-2" type="submit" disabled={submitting}>
              <IconLogin2 className="size-4" />
              {submitting ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
