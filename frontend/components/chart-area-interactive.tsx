"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from '@/hooks/use-mobile'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import type { Overview } from "@/lib/api"

const chartConfig = {
  connections: {
    label: "开启连接",
    color: "var(--chart-1)",
  },
  users: {
    label: "关闭连接",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive({
  data,
}: {
  data: Overview["connectionTrend"]
}) {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) {
      setTimeRange("7d")
    }
  }, [isMobile])

  const chartData = React.useMemo(
    () =>
      data.map((item) => ({
        date: item.date,
        connections: item.opened,
        users: item.closed,
      })),
    [data]
  )

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const lastItem = chartData[chartData.length - 1]
    const referenceDate = lastItem ? new Date(lastItem.date) : new Date()
    let daysToSubtract = 30
    if (timeRange === "14d") {
      daysToSubtract = 14
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle>连接统计</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            展示系统连接数和活跃用户趋势
          </span>
          <span className="@[540px]/card:hidden">连接趋势</span>
        </CardDescription>
        <CardAction>
          <Tabs
            value={timeRange}
            onValueChange={setTimeRange}
            className="hidden @[767px]/card:flex"
          >
            <TabsList className="*:data-[slot=tabs-trigger]:px-4">
              <TabsTrigger value="30d">最近 30 天</TabsTrigger>
              <TabsTrigger value="14d">最近 14 天</TabsTrigger>
              <TabsTrigger value="7d">最近 7 天</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="选择时间范围"
            >
              <SelectValue placeholder="最近 30 天" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="30d" className="rounded-lg">
                最近 30 天
              </SelectItem>
              <SelectItem value="14d" className="rounded-lg">
                最近 14 天
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                最近 7 天
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillConnections" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("zh-CN", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("zh-CN", {
                      month: "long",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="users"
              type="natural"
              fill="url(#fillUsers)"
              stroke="var(--chart-2)"
              stackId="a"
            />
            <Area
              dataKey="connections"
              type="natural"
              fill="url(#fillConnections)"
              stroke="var(--chart-1)"
              stackId="b"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
