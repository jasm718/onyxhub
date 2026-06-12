"use client"

import * as React from "react"
import {
  IconCpu,
  IconDatabase,
  IconGauge,
} from "@tabler/icons-react"
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts"

import { Badge } from "@/components/ui/badge"
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
import type { Overview } from "@/lib/api"
import { formatBytes } from "@/lib/format"

type MetricKey = "cpuUsage" | "memoryUsage"

type ChartPoint = {
  reportedAt: string
  label: string
  cpuUsage: number
  memoryUsage: number
}

type MetricCard = {
  title: string
  description: string
  dataKey: MetricKey
  color: string
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
}

const cards: MetricCard[] = [
  {
    title: "CPU",
    description: "CPU使用率",
    dataKey: "cpuUsage",
    color: "var(--chart-1)",
    icon: IconCpu,
  },
  {
    title: "内存",
    description: "内存使用率",
    dataKey: "memoryUsage",
    color: "var(--chart-2)",
    icon: IconGauge,
  },
]

const storageChartConfig = {
  used: {
    label: "已用",
    color: "var(--muted-foreground)",
  },
  free: {
    label: "未使用",
    color: "var(--primary)",
  },
} satisfies ChartConfig

function formatMetric(value: number | undefined) {
  if (value === undefined) {
    return "-"
  }
  return `${Math.round(value)}%`
}

function metricDomain(data: ChartPoint[], dataKey: MetricKey): [number, number] {
  const values = data
    .map((item) => item[dataKey])
    .filter((value) => Number.isFinite(value))

  if (!values.length) {
    return [0, 100]
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = 5
  const minSpan = 20
  let lower = Math.max(0, Math.floor(min - padding))
  let upper = Math.min(100, Math.ceil(max + padding))

  if (upper - lower < minSpan) {
    const center = (upper + lower) / 2
    lower = Math.max(0, Math.floor(center - minSpan / 2))
    upper = Math.min(100, Math.ceil(center + minSpan / 2))
  }
  if (upper - lower < minSpan) {
    if (lower === 0) {
      upper = Math.min(100, minSpan)
    } else if (upper === 100) {
      lower = Math.max(0, 100 - minSpan)
    }
  }

  return [lower, upper]
}

function metricTicks([lower, upper]: [number, number]) {
  return [lower, Math.round((lower + upper) / 2), upper]
}

function storageLabel(name: unknown) {
  if (name === "used") {
    return storageChartConfig.used.label
  }
  if (name === "free") {
    return storageChartConfig.free.label
  }
  return String(name)
}

function MetricChartCard({
  card,
  data,
}: {
  card: MetricCard
  data: ChartPoint[]
}) {
  const latest = data.at(-1)?.[card.dataKey]
  const domain = metricDomain(data, card.dataKey)
  const ticks = metricTicks(domain)
  const config = {
    [card.dataKey]: {
      label: card.title,
      color: card.color,
    },
  } satisfies ChartConfig

  return (
    <Card className="@container/card border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <card.icon className="size-4" style={{ color: card.color }} />
          {card.description}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {formatMetric(latest)}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        {data.length ? (
          <ChartContainer config={config} className="h-[120px] w-full">
            <LineChart data={data} margin={{ left: 0, right: 8, top: 8, bottom: 10 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" hide />
              <YAxis
                domain={domain}
                ticks={ticks}
                tickFormatter={(value) => String(value)}
                tickLine={false}
                axisLine={false}
                tickMargin={4}
                width={34}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel={false}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ""}
                    formatter={(value, name, item) => (
                      <div className="flex min-w-28 items-center justify-between gap-4">
                        <span className="text-muted-foreground">
                          {config[String(name) as MetricKey]?.label ?? item.name}
                        </span>
                        <span className="font-mono font-medium text-foreground tabular-nums">
                          {formatMetric(Number(value))}
                        </span>
                      </div>
                    )}
                    indicator="line"
                  />
                }
              />
              <Line
                dataKey={card.dataKey}
                type="monotone"
                stroke={card.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            暂无指标
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StorageChartCard({ cards }: { cards: Overview["cards"] }) {
  const hasStorage = cards.storageDiskTotal > 0
  const storageUsage = hasStorage
    ? Math.round((cards.storageDiskUsed / cards.storageDiskTotal) * 100)
    : 0
  const chartData = hasStorage
    ? [
        {
          key: "used",
          value: cards.storageDiskUsed,
          fill: "var(--color-used)",
        },
        {
          key: "free",
          value: cards.storageDiskFree,
          fill: "var(--color-free)",
        },
      ]
    : []

  return (
    <Card className="@container/card border-border/50 bg-card/50">
      <CardHeader className="pb-2">
        <CardDescription className="flex items-center gap-2">
          <IconDatabase className="size-4 text-primary" />
          存储使用率
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {hasStorage ? formatBytes(cards.storageDiskTotal) : "-"}
        </CardTitle>
        <CardAction>
          <Badge variant="outline" className="border-primary/30 text-primary">
            {hasStorage ? `${storageUsage}% 已用` : "未上报"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex items-center gap-4 px-6 pb-3">
        {hasStorage ? (
          <>
            <ChartContainer
              config={storageChartConfig}
              className="aspect-square h-[120px] shrink-0"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="key"
                      formatter={(value, name) => (
                        <div className="flex min-w-32 items-center justify-between gap-4">
                          <span className="text-muted-foreground">
                            {storageLabel(name)}
                          </span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatBytes(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="key"
                  innerRadius={34}
                  outerRadius={52}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {chartData.map((item) => (
                    <Cell key={item.key} fill={item.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className="ml-auto flex min-w-0 flex-1 flex-col items-end gap-2 text-sm">
              <div className="inline-flex items-baseline justify-end gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-[2px] bg-muted-foreground" />
                <span>已用</span>
                <span className="font-medium tabular-nums">
                  {formatBytes(cards.storageDiskUsed)}
                </span>
              </div>
              <div className="inline-flex items-baseline justify-end gap-2 text-primary">
                <span className="size-2.5 rounded-[2px] bg-primary" />
                <span>未使用</span>
                <span className="font-medium tabular-nums">
                  {formatBytes(cards.storageDiskFree)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-[120px] w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            等待 agent 上报存储信息
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function AgentMetricCharts({
  metrics,
  cards: overviewCards,
}: {
  metrics: Overview["agentMetrics"]
  cards: Overview["cards"]
}) {
  const data = React.useMemo<ChartPoint[]>(
    () =>
      metrics.map((item) => {
        const date = new Date(item.reportedAt)
        return {
          reportedAt: item.reportedAt,
          label: Number.isNaN(date.getTime())
            ? item.reportedAt
            : date.toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
          cpuUsage: item.cpuUsage,
          memoryUsage: item.memoryUsage,
        }
      }),
    [metrics]
  )

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
      {cards.map((card) => (
        <MetricChartCard key={card.dataKey} card={card} data={data} />
      ))}
      <StorageChartCard cards={overviewCards} />
    </div>
  )
}
