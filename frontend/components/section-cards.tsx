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
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card border-border/50 bg-card/50">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <IconApps className="size-4 text-primary" />
            已发布应用
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            24
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-primary/30 text-primary">
              <IconTrendingUp className="size-3" />
              +3 本月
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            应用运行正常 <IconCheck className="size-4 text-primary" />
          </div>
          <div className="text-muted-foreground">
            所有应用均可正常访问
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
            156
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-chart-2/30 text-chart-2">
              <IconTrendingUp className="size-3" />
              +12%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            用户活跃度上升 <IconArrowUpRight className="size-4 text-chart-2" />
          </div>
          <div className="text-muted-foreground">
            较上月增长 18 人
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
            89
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-chart-3/30 text-chart-3">
              <IconDeviceDesktop className="size-3" />
              在线
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            连接稳定 <IconCheck className="size-4 text-primary" />
          </div>
          <div className="text-muted-foreground">
            峰值并发 142 连接
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
            99.9%
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="border-chart-4/30 text-chart-4">
              <IconTrendingUp className="size-3" />
              稳定
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            运行 45 天 <IconCheck className="size-4 text-primary" />
          </div>
          <div className="text-muted-foreground">
            上次重启: 45 天前
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
