"use client"

import * as React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toggle } from "@/components/ui/toggle"
import type { Overview } from "@/lib/api"

const chartConfig = {
  totalHours: {
    label: "连接时长",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

function shortUsername(value: string) {
  return value.length > 8 ? `${value.slice(0, 7)}...` : value
}

function formatHours(value: number) {
  return `${Number(value).toFixed(value >= 10 ? 0 : 1)}h`
}

function sortDurationData(
  data: Overview["connectionDurationStats"]["weekly"],
  durationAscending: boolean
) {
  return [...data].sort((a, b) => {
    const value = durationAscending
      ? a.totalHours - b.totalHours
      : b.totalHours - a.totalHours

    return value === 0 ? a.username.localeCompare(b.username, "zh-CN") : value
  })
}

function DurationBars({
  data,
}: {
  data: Overview["connectionDurationStats"]["weekly"]
}) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground md:h-full">
        暂无连接记录
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full md:h-full">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 0, right: 12, top: 8, bottom: 8 }}
      >
        <CartesianGrid
          horizontal={false}
          strokeDasharray="3 3"
          stroke="var(--border)"
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => formatHours(Number(value))}
        />
        <YAxis
          dataKey="username"
          type="category"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={72}
          tickFormatter={shortUsername}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => String(value)}
              formatter={(value) => (
                <div className="flex min-w-32 items-center justify-between gap-4">
                  <span className="text-muted-foreground">连接时长</span>
                  <span className="font-mono font-medium text-foreground tabular-nums">
                    {formatHours(Number(value))}
                  </span>
                </div>
              )}
              indicator="dot"
            />
          }
        />
        <Bar
          dataKey="totalHours"
          fill="var(--chart-2)"
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ChartContainer>
  )
}

export function ConnectionDurationStats({
  stats,
}: {
  stats: Overview["connectionDurationStats"]
}) {
  const [durationAscending, setDurationAscending] = React.useState(false)
  const weeklyData = React.useMemo(
    () => sortDurationData(stats.weekly, durationAscending),
    [stats.weekly, durationAscending]
  )
  const monthlyData = React.useMemo(
    () => sortDurationData(stats.monthly, durationAscending),
    [stats.monthly, durationAscending]
  )
  const SortIcon = durationAscending ? ArrowUp : ArrowDown

  return (
    <Card className="@container/card h-full min-h-0 gap-[6px] border border-border/50 bg-card/50 ring-0">
      <Tabs defaultValue="weekly" className="h-full min-h-0 flex-1 gap-0">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-[6px]">
          <CardTitle className="shrink-0">连接时长统计</CardTitle>
          <CardAction className="flex shrink-0 items-center gap-2 self-center">
            <Toggle
              pressed={durationAscending}
              onPressedChange={setDurationAscending}
              variant="outline"
              size="sm"
              aria-label={durationAscending ? "按时长升序" : "按时长降序"}
            >
              <SortIcon className="size-3.5" />
              {durationAscending ? "升序" : "降序"}
            </Toggle>
            <TabsList>
              <TabsTrigger value="weekly">本周</TabsTrigger>
              <TabsTrigger value="monthly">本月</TabsTrigger>
            </TabsList>
          </CardAction>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-0 sm:px-6">
          <TabsContent value="weekly" className="min-h-0 overflow-hidden">
            <DurationBars data={weeklyData} />
          </TabsContent>
          <TabsContent value="monthly" className="min-h-0 overflow-hidden">
            <DurationBars data={monthlyData} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
