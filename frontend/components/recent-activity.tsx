"use client"

import {
  IconApps,
  IconKey,
  IconLogin,
  IconLogout,
  IconNetwork,
  IconSettings,
  IconUserEdit,
  IconUserMinus,
  IconUserPlus,
} from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { ActivityLog } from "@/lib/api"
import { formatRelativeTime } from "@/lib/format"

function getActivityMeta(type: string) {
  if (type === "session_opened") {
    return { icon: IconLogin, color: "text-primary" }
  }
  if (type === "session_closed") {
    return { icon: IconLogout, color: "text-muted-foreground" }
  }
  if (type === "user_created") {
    return { icon: IconUserPlus, color: "text-chart-2" }
  }
  if (type === "user_updated") {
    return { icon: IconUserEdit, color: "text-chart-2" }
  }
  if (type === "user_deleted") {
    return { icon: IconUserMinus, color: "text-destructive" }
  }
  if (type.startsWith("application_")) {
    return { icon: IconApps, color: "text-chart-3" }
  }
  if (type.startsWith("authorization_")) {
    return { icon: IconKey, color: "text-chart-4" }
  }
  if (type.includes("policy")) {
    return { icon: IconNetwork, color: "text-chart-4" }
  }
  return { icon: IconSettings, color: "text-muted-foreground" }
}

export function RecentActivity({ activities }: { activities: ActivityLog[] }) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle>最近活动</CardTitle>
        <CardDescription>系统最近的操作记录</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length ? (
            activities.map((activity) => {
              const meta = getActivityMeta(activity.type)
              return (
                <div key={activity.id} className="flex items-center gap-4">
                  <div
                    className={`flex size-9 items-center justify-center rounded-lg bg-secondary ${meta.color}`}
                  >
                    <meta.icon className="size-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {activity.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              暂无活动记录
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
