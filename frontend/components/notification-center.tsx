"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconBell,
  IconCheck,
  IconChevronRight,
  IconCircleX,
  IconInfoCircle,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { api, type ActivityLogItem, type Notifications } from "@/lib/api"
import { formatRelativeTime } from "@/lib/format"

const issueExitMs = 280

function issueIconMeta(issue: ActivityLogItem) {
  if (issue.level === "error") {
    return {
      icon: IconCircleX,
      className: "text-destructive",
    }
  }

  return {
    icon: IconAlertTriangle,
    className: "text-yellow-500",
  }
}

function IssueList({
  issues,
  exitingIssueIds,
  markingIssueId,
  onMarkRead,
}: {
  issues: ActivityLogItem[]
  exitingIssueIds: Set<string>
  markingIssueId: string
  onMarkRead: (issueId: string) => void
}) {
  if (!issues.length) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        无告警信息
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {issues.map((issue) => {
        const meta = issueIconMeta(issue)
        const Icon = meta.icon
        const isExiting = exitingIssueIds.has(issue.id)

        return (
          <div
            key={issue.id}
            className={[
              "grid overflow-hidden transition-[grid-template-rows,opacity,transform] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-safe:will-change-transform",
              isExiting ? "grid-rows-[0fr] -translate-y-1 opacity-0" : "grid-rows-[1fr] translate-y-0 opacity-100",
            ].join(" ")}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={[
                  "rounded-md p-2 transition-[transform,opacity,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-safe:will-change-transform",
                  isExiting ? "translate-x-2 scale-[0.985] opacity-0 blur-[1px]" : "translate-x-0 scale-100 opacity-100 blur-0",
                  issue.readAt
                    ? "border border-border/50"
                    : "border border-l-2 border-l-primary bg-primary/5",
                ].join(" ")}
              >
                <div className="flex gap-3">
                  <div className={`flex size-8 shrink-0 items-start justify-center pt-1 ${meta.className}`}>
                    <Icon className="size-4" />
                  </div>
                  <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2">
                    <div className="min-w-0 space-y-1">
                      <div className="line-clamp-1 text-sm font-semibold">
                        {issue.type}
                      </div>
                      <div className="line-clamp-2 text-sm text-muted-foreground">
                        {issue.message}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRelativeTime(issue.createdAt)}
                    </div>
                    <div className="col-start-2 row-start-2 flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={Boolean(issue.readAt) || markingIssueId === issue.id || isExiting}
                        onClick={() => onMarkRead(issue.id)}
                      >
                        已读
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
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
  const [markingIssueId, setMarkingIssueId] = React.useState("")
  const [exitingIssueIds, setExitingIssueIds] = React.useState<Set<string>>(() => new Set())

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

  function waitIssueExit() {
    return new Promise((resolve) => window.setTimeout(resolve, issueExitMs))
  }

  async function markAllRead() {
    setMarkingRead(true)
    try {
      setError("")
      const ids = items.map((issue) => issue.id)
      await api.markNotificationsRead()
      if (ids.length) {
        setExitingIssueIds(new Set(ids))
        await waitIssueExit()
      }
      setData((current) => current ? { ...current, items: [], unreadCount: 0 } : current)
      setExitingIssueIds(new Set())
      void loadNotifications()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setMarkingRead(false)
    }
  }

  async function markIssueRead(issueId: string) {
    setMarkingIssueId(issueId)
    try {
      setError("")
      await api.markNotificationRead(issueId)
      setExitingIssueIds((current) => new Set(current).add(issueId))
      await waitIssueExit()
      setData((current) => {
        if (!current) {
          return current
        }
        return {
          ...current,
          items: current.items.filter((issue) => issue.id !== issueId),
          unreadCount: Math.max(0, current.unreadCount - 1),
        }
      })
      setExitingIssueIds((current) => {
        const next = new Set(current)
        next.delete(issueId)
        return next
      })
      void loadNotifications()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setMarkingIssueId("")
    }
  }

  function viewAllAlerts() {
    setOpen(false)
    router.push("/dashboard/activity-logs?filter=alert")
  }

  const items = data?.items ?? []
  const unreadCount = data?.unreadCount ?? items.filter((issue) => !issue.readAt).length
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
        className="flex w-[min(465px,calc(100vw-1rem))] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-w-none"
      >
        <SheetHeader className="px-6 pt-5 pb-2">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <SheetTitle className="flex items-center gap-2 text-xl">
                系统告警
                <Badge variant="secondary">{unreadCount}</Badge>
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="flex items-center justify-between gap-2 border-b px-6 pb-2 pt-1">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!unreadCount || markingRead}
            onClick={markAllRead}
          >
            <IconCheck className="size-3.5" />
            {markingRead ? "处理中..." : "全部已读"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={viewAllAlerts}
          >
            查看所有
            <IconChevronRight className="size-3.5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-3">
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
            <IssueList
              issues={items}
              exitingIssueIds={exitingIssueIds}
              markingIssueId={markingIssueId}
              onMarkRead={markIssueRead}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
