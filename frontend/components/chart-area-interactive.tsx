"use client"

import * as React from "react"
import { ArrowDown, ArrowUp } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Overview } from "@/lib/api"
import { formatDuration } from "@/lib/format"

type DurationSort = "desc" | "asc"

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date: Date) {
  const day = date.getDay()
  const offset = day === 0 ? 6 : day - 1
  const start = startOfDay(date)
  start.setDate(start.getDate() - offset)
  return start
}

function formatFullDateTime(date: Date) {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}/${String(date.getDate()).padStart(2, "0")} ${formatTime(date)}`
}

function formatConnectionStartTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  const today = startOfDay(new Date())
  const current = startOfDay(date)
  const dayDiff = Math.floor((today.getTime() - current.getTime()) / 86400000)
  const time = formatTime(date)

  if (dayDiff === 0) {
    return `今天 ${time}`
  }
  if (dayDiff === 1) {
    return `昨天 ${time}`
  }
  if (dayDiff === 2) {
    return `前天 ${time}`
  }
  if (date >= startOfWeek(new Date())) {
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
    return `${weekdays[date.getDay()]} ${time}`
  }

  return formatFullDateTime(date)
}

export function ActiveConnectionTable({
  data,
}: {
  data: Overview["activeConnections"]
}) {
  const [durationSort, setDurationSort] = React.useState<DurationSort>("desc")
  const rows = React.useMemo(
    () =>
      data
        .map((item) => ({
          username: item.username,
          connectedSeconds: item.connectedSeconds,
          connectedAt: item.connectedAt,
        }))
        .sort((a, b) => {
          const value =
            durationSort === "asc"
              ? a.connectedSeconds - b.connectedSeconds
              : b.connectedSeconds - a.connectedSeconds

          return value === 0 ? a.username.localeCompare(b.username, "zh-CN") : value
        }),
    [data, durationSort]
  )
  const DurationSortIcon = durationSort === "asc" ? ArrowUp : ArrowDown

  return (
    <Card className="@container/card h-full min-h-0 gap-[6px] border border-border/50 bg-card/50 ring-0">
      <CardHeader>
        <CardTitle>当前活跃连接</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-0 sm:px-6">
        {rows.length ? (
          <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border/60">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="h-8">用户名</TableHead>
                  <TableHead className="h-8 text-right">
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1 font-medium text-foreground"
                      onClick={() =>
                        setDurationSort((value) =>
                          value === "desc" ? "asc" : "desc"
                        )
                      }
                    >
                      连接时长
                      <DurationSortIcon className="size-3.5" />
                    </button>
                  </TableHead>
                  <TableHead className="h-8 text-right">起始时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item, index) => (
                  <TableRow key={`${item.username}-${item.connectedAt}-${index}`}>
                    <TableCell className="py-2 font-medium">
                      {item.username}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-muted-foreground tabular-nums">
                      {formatDuration(item.connectedSeconds)}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-muted-foreground tabular-nums">
                      {formatConnectionStartTime(item.connectedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground md:h-full">
            暂无活跃连接
          </div>
        )}
      </CardContent>
    </Card>
  )
}
