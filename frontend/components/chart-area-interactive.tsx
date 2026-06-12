"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  Card,
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
import type { Overview } from "@/lib/api"
import { formatDuration } from "@/lib/format"

const chartConfig = {
  connectedSeconds: {
    label: "已连接时长",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

function axisDuration(value: number) {
  if (value < 3600) {
    return `${Math.round(value / 60)}分`
  }
  if (value < 86400) {
    return `${Math.round(value / 3600)}时`
  }
  return `${Math.round(value / 86400)}天`
}

function shortUsername(value: string) {
  return value.length > 10 ? `${value.slice(0, 9)}...` : value
}

export function ActiveConnectionChart({
  data,
}: {
  data: Overview["activeConnections"]
}) {
  const chartData = React.useMemo(
    () =>
      data.map((item) => ({
        username: item.username,
        connectedSeconds: item.connectedSeconds,
      })),
    [data]
  )

  return (
    <Card className="@container/card border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle>当前活跃连接</CardTitle>
        <CardDescription>按用户展示当前已连接时长</CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {chartData.length ? (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[300px] w-full"
          >
            <BarChart
              data={chartData}
              margin={{ left: 8, right: 8, top: 8, bottom: 8 }}
            >
              <CartesianGrid
                vertical={false}
                strokeDasharray="3 3"
                stroke="var(--border)"
              />
              <XAxis
                dataKey="username"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                tickFormatter={shortUsername}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={44}
                tickFormatter={(value) => axisDuration(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => String(value)}
                    formatter={(value) => (
                      <div className="flex min-w-36 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          已连接时长
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatDuration(Number(value))}
                        </span>
                      </div>
                    )}
                    indicator="dot"
                  />
                }
              />
              <Bar
                dataKey="connectedSeconds"
                fill="var(--chart-1)"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            暂无活跃连接
          </div>
        )}
      </CardContent>
    </Card>
  )
}
