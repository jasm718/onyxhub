import { 
  IconApps, 
  IconArrowUpRight, 
  IconNetwork, 
  IconTrendingUp, 
  IconUsers,
  IconDeviceDesktop,
  IconClock,
  IconCheck,
  IconAlertCircle
} from "@tabler/icons-react"

import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { Overview } from "@/lib/api"

export function SectionCards({ cards }: { cards: Overview["cards"] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card border-border/50 bg-card/50">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconApps className="size-4 text-primary" />
            已发布应用
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {cards.totalApplications}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-primary/30 text-primary">
              <IconTrendingUp className="size-3" />
              {cards.activeApplications} 启用
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            应用发布状态 <IconCheck className="size-4 text-primary" />
          </div>
          <div className="text-muted-foreground">
            当前启用 {cards.activeApplications} 个应用
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card border-border/50 bg-card/50">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconUsers className="size-4 text-chart-2" />
            活跃用户
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {cards.activeUsers}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-chart-2/30 text-chart-2">
              <IconTrendingUp className="size-3" />
              共 {cards.totalUsers}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            启用用户统计 <IconArrowUpRight className="size-4 text-chart-2" />
          </div>
          <div className="text-muted-foreground">
            全部用户 {cards.totalUsers} 人
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card border-border/50 bg-card/50">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconNetwork className="size-4 text-chart-3" />
            当前连接数
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {cards.activeSessions}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-chart-3/30 text-chart-3">
              <IconDeviceDesktop className="size-3" />
              {cards.agentOnline ? "在线" : "离线"}
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            当前会话 <IconCheck className="size-4 text-primary" />
          </div>
          <div className="text-muted-foreground">
            agent {cards.agentOnline ? "已连接" : "未连接"}
          </div>
        </CardFooter>
      </Card>
      
      <Card className="@container/card border-border/50 bg-card/50">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconClock className="size-4 text-chart-4" />
            系统运行时间
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {cards.agentOnline ? "在线" : "离线"}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-chart-4/30 text-chart-4">
              {cards.agentOnline ? (
                <IconTrendingUp className="size-3" />
              ) : (
                <IconAlertCircle className="size-3" />
              )}
              Agent
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            主机控制服务 {cards.agentOnline ? "正常" : "未连接"}{" "}
            {cards.agentOnline ? (
              <IconCheck className="size-4 text-primary" />
            ) : (
              <IconAlertCircle className="size-4 text-chart-4" />
            )}
          </div>
          <div className="text-muted-foreground">
            数据来自后端实时状态
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
