"use client"

import * as React from "react"
import {
  IconAlertTriangle,
  IconBell,
  IconInfoCircle,
} from "@tabler/icons-react"

import { ActivityList } from "@/components/recent-activity"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { api, type AgentIssue, type Notifications } from "@/lib/api"
import { formatRelativeTime } from "@/lib/format"

function issueBadge(level: string) {
  if (level === "error") {
    return <Badge variant="destructive">异常</Badge>
  }
  return <Badge variant="outline">提醒</Badge>
}

function IssueList({ issues }: { issues: AgentIssue[] }) {
  if (!issues.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        暂无异常信息
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {issues.map((issue) => (
        <div key={issue.id} className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <IconAlertTriangle className="size-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <p className="line-clamp-1 text-sm font-medium">
                {issue.type}
              </p>
              {issueBadge(issue.level)}
            </div>
            <p className="line-clamp-3 text-sm text-muted-foreground">
              {issue.message}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatRelativeTime(issue.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationCenter() {
  const [data, setData] = React.useState<Notifications | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  React.useEffect(() => {
    let cancelled = false

    async function loadNotifications() {
      try {
        const result = await api.notifications()
        if (!cancelled) {
          setData(result)
          setError("")
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadNotifications()
    const timer = window.setInterval(loadNotifications, 30000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const exceptions = data?.exceptions ?? []
  const recentActivities = data?.recentActivities ?? []
  const hasNotice = exceptions.length > 0

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <IconBell className="size-5" />
          {hasNotice ? (
            <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />
          ) : null}
          <span className="sr-only">通知</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[min(920px,calc(100vw-1rem))] max-w-none flex-col overflow-hidden p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b px-6 py-5">
          <div className="flex items-center justify-between gap-4 pr-8">
            <div>
              <SheetTitle>通知中心</SheetTitle>
              <SheetDescription>最近 7 天的异常信息和系统活动</SheetDescription>
            </div>
            {hasNotice ? (
              <Badge variant="destructive">{exceptions.length}</Badge>
            ) : (
              <Badge variant="outline">正常</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <IconInfoCircle className="size-4" />
              {error}
            </div>
          ) : null}
          {loading && !data ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              正在加载通知...
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <section className="min-w-0 space-y-4">
                <div>
                  <h3 className="text-sm font-medium">异常信息</h3>
                  <p className="text-xs text-muted-foreground">
                    Agent 与服务端最近上报的异常
                  </p>
                </div>
                <Separator />
                <IssueList issues={exceptions} />
              </section>

              <section className="min-w-0 space-y-4">
                <div>
                  <h3 className="text-sm font-medium">最近活动</h3>
                  <p className="text-xs text-muted-foreground">
                    用户、应用、授权和会话变化
                  </p>
                </div>
                <Separator />
                <ActivityList activities={recentActivities} />
              </section>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
