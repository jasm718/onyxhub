"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconChevronRight,
  IconInfoCircle,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  return (
    <Badge variant="outline" className="h-5 border-border/60 text-muted-foreground">
      {level === "error" ? "异常" : "提醒"}
    </Badge>
  )
}

function IssueList({ issues }: { issues: AgentIssue[] }) {
  if (!issues.length) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
        暂无异常信息
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {issues.map((issue) => (
        <div
          key={issue.id}
          className={
            issue.readAt
              ? "rounded-md border border-border/50"
              : "rounded-md border border-l-2 border-l-primary bg-primary/5"
          }
        >
          <div className="space-y-3 rounded-md p-2">
            <div className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                <IconAlertTriangle className="size-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="line-clamp-1 text-sm font-semibold">
                  {issue.type}
                </div>
                <div className="line-clamp-2 text-sm text-muted-foreground">
                  {issue.message}
                </div>
                <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <span>{formatRelativeTime(issue.createdAt)}</span>
                  {issueBadge(issue.level)}
                  {issue.readAt ? <span>已读</span> : <span>未读</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function NotificationCenter() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [data, setData] = React.useState<Notifications | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")
  const [markingRead, setMarkingRead] = React.useState(false)

  const loadNotifications = React.useCallback(
    async (isCancelled?: () => boolean) => {
      try {
        const result = await api.notifications()
        if (!isCancelled?.()) {
          setData(result)
          setError("")
        }
      } catch (err) {
        if (!isCancelled?.()) {
          setError((err as Error).message)
        }
      } finally {
        if (!isCancelled?.()) {
          setLoading(false)
        }
      }
    },
    []
  )

  React.useEffect(() => {
    let cancelled = false

    loadNotifications(() => cancelled)
    const timer = window.setInterval(() => {
      loadNotifications(() => cancelled)
    }, 30000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [loadNotifications])

  async function markAllRead() {
    setMarkingRead(true)
    try {
      await api.markNotificationsRead()
      await loadNotifications()
      toast.success("异常信息已全部标记为已读")
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setMarkingRead(false)
    }
  }

  function viewAllExceptions() {
    setOpen(false)
    router.push("/dashboard/activity-logs?filter=exceptions")
  }

  const exceptions = data?.exceptions ?? []
  const unreadCount =
    data?.unreadExceptionCount ?? exceptions.filter((issue) => !issue.readAt).length
  const hasNotice = unreadCount > 0

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <IconBell className="size-5" />
          {hasNotice ? (
            <span className="absolute right-1 top-1 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive/60" />
              <span className="relative inline-flex size-2 rounded-full bg-destructive" />
            </span>
          ) : null}
          <span className="sr-only">通知</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[min(620px,calc(100vw-1rem))] max-w-none flex-col overflow-hidden p-0 sm:max-w-none"
      >
        <SheetHeader className="border-b px-6 py-5">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <SheetTitle className="text-xl">通知中心</SheetTitle>
              <SheetDescription>仅展示系统异常信息</SheetDescription>
            </div>
            {hasNotice ? (
              <Badge variant="destructive">{unreadCount} 未读</Badge>
            ) : (
              <Badge variant="outline">正常</Badge>
            )}
          </div>
        </SheetHeader>

        <div className="flex items-center gap-2 border-b px-6 py-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={viewAllExceptions}
          >
            查看所有
            <IconChevronRight className="size-3.5" />
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!unreadCount || markingRead}
            onClick={markAllRead}
          >
            <IconCheck className="size-3.5" />
            {markingRead ? "处理中..." : "全部已读"}
          </Button>
        </div>

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
            <IssueList issues={exceptions} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
