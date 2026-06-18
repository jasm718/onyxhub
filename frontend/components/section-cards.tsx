import {
  IconApps,
  IconClock,
  IconPlugConnected,
  IconPlugConnectedX,
  IconUsers,
} from "@tabler/icons-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from "@/components/ui/card"
import type { Overview } from "@/lib/api"
import { formatDuration, formatRelativeTime } from "@/lib/format"

function agentReportText(agentStatus: Overview["agentStatus"]) {
  if (!agentStatus?.reportedAt) {
    return "尚未收到上报"
  }
  return `最后上报 ${formatRelativeTime(agentStatus.reportedAt)}`
}

export function SectionCards({
  cards,
  agentStatus,
}: {
  cards: Overview["cards"]
  agentStatus: Overview["agentStatus"]
}) {
  const disabledApplications = Math.max(
    0,
    cards.totalApplications - cards.activeApplications
  )
  const disabledUsers = Math.max(0, cards.totalUsers - cards.activeUsers)

  return (
    <div className="grid shrink-0 grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
      <Card className="min-h-[180px] gap-0 border border-border/50 bg-card/50 ring-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2">
          <CardDescription>远程应用</CardDescription>
          <IconApps className="size-4 text-primary" />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-6 pt-0 pb-0">
          <div className="text-3xl font-semibold tabular-nums">
            {cards.totalApplications}
          </div>
        </CardContent>
        <CardFooter className="mt-auto items-start bg-card px-6 py-3 text-xs text-muted-foreground">
          <div className="flex gap-1.5 leading-relaxed">
            <span>启用{cards.activeApplications}</span>
            <span>·</span>
            <span>禁用{disabledApplications}</span>
          </div>
        </CardFooter>
      </Card>

      <Card className="min-h-[180px] gap-0 border border-border/50 bg-card/50 ring-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2">
          <CardDescription>活跃用户</CardDescription>
          <IconUsers className="size-4 text-chart-2" />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-6 pt-0 pb-0">
          <div className="text-3xl font-semibold tabular-nums">
            {cards.activeUsers}
          </div>
        </CardContent>
        <CardFooter className="mt-auto items-start bg-card px-6 py-3 text-xs text-muted-foreground">
          <div className="flex gap-1.5 leading-relaxed">
            <span>启用{cards.activeUsers}</span>
            <span>·</span>
            <span>禁用{disabledUsers}</span>
          </div>
        </CardFooter>
      </Card>

      <Card className="min-h-[180px] gap-0 border border-border/50 bg-card/50 ring-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2">
          <CardDescription>系统运行时间</CardDescription>
          <IconClock className="size-4 text-chart-4" />
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-6 pt-0 pb-0">
          <div className="text-3xl font-semibold tabular-nums">
            {formatDuration(cards.serviceUptimeSeconds)}
          </div>
        </CardContent>
        <CardFooter className="mt-auto items-start bg-card px-6 py-3 text-xs text-muted-foreground">
          <div className="leading-relaxed">按后端服务启动时间统计</div>
        </CardFooter>
      </Card>

      <Card className="min-h-[180px] gap-0 border border-border/50 bg-card/50 ring-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4 pb-2">
          <CardDescription>代理服务状态</CardDescription>
          {cards.agentOnline ? (
            <IconPlugConnected className="size-4 text-chart-3" />
          ) : (
            <IconPlugConnectedX className="size-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col px-6 pt-0 pb-0">
          <div className="text-3xl font-semibold tabular-nums">
            {cards.agentOnline ? "在线" : "离线"}
          </div>
        </CardContent>
        <CardFooter className="mt-auto items-start bg-card px-6 py-3 text-xs text-muted-foreground">
          <div className="leading-relaxed">{agentReportText(agentStatus)}</div>
        </CardFooter>
      </Card>
    </div>
  )
}
