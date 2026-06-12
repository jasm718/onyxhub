"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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

function DurationBars({
  data,
}: {
  data: Overview["connectionDurationStats"]["weekly"]
}) {
  if (!data.length) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        暂无连接记录
      </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
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
  return (
    <Card className="@container/card border-border/50 bg-card/50">
      <Tabs defaultValue="weekly" className="gap-0">
        <CardHeader>
          <CardTitle>连接时长统计</CardTitle>
          <CardDescription>按用户统计连接时长</CardDescription>
          <CardAction>
            <TabsList>
              <TabsTrigger value="weekly">本周</TabsTrigger>
              <TabsTrigger value="monthly">本月</TabsTrigger>
            </TabsList>
          </CardAction>
        </CardHeader>
        <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
          <TabsContent value="weekly">
            <DurationBars data={stats.weekly} />
          </TabsContent>
          <TabsContent value="monthly">
            <DurationBars data={stats.monthly} />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}
