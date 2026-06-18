"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconCircleX,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, type ActivityLogItem } from "@/lib/api"
import { formatRelativeTime } from "@/lib/format"

export type ActivityLogFilter = "all" | "activity" | "alert" | "warn" | "error"

const viewFilters: Array<{ value: ActivityLogFilter; label: string }> = [
  { value: "all", label: "全部记录" },
  { value: "activity", label: "活动" },
  { value: "alert", label: "告警" },
  { value: "warn", label: "警告" },
  { value: "error", label: "错误" },
]

function normalizeViewFilter(value: string): ActivityLogFilter {
  if (value === "all" || value === "activity" || value === "alert" || value === "warn" || value === "error") {
    return value
  }
  return "all"
}

function logMeta(item: ActivityLogItem) {
  if (item.level === "error") {
    return {
      icon: IconCircleX,
      typeLabel: "错误",
      iconClassName: "text-red-500",
    }
  }

  if (item.level === "warn") {
    return {
      icon: IconAlertTriangle,
      typeLabel: "警告",
      iconClassName: "text-yellow-500",
    }
  }

  return {
    icon: IconCheck,
    typeLabel: "信息",
    iconClassName: "text-green-500",
  }
}

function matchesKeyword(item: ActivityLogItem, keyword: string) {
  if (!keyword) {
    return true
  }

  const meta = logMeta(item)
  const haystack = [item.type, item.message, item.detail, item.source, item.actorType, item.targetType, meta.typeLabel]
    .join(" ")
    .toLowerCase()
  return haystack.includes(keyword)
}

function ActivityLogTable({ items }: { items: ActivityLogItem[] }) {
  if (!items.length) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        暂无日志记录
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/50">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead>主题</TableHead>
            <TableHead>详情</TableHead>
            <TableHead className="hidden md:table-cell">分类</TableHead>
            <TableHead className="hidden md:table-cell">来源</TableHead>
            <TableHead className="hidden lg:table-cell">补充</TableHead>
            <TableHead className="text-right">时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const meta = logMeta(item)
            const Icon = meta.icon

            return (
              <TableRow key={item.id} className="border-border/50">
                <TableCell className="whitespace-normal">
                  <div className="flex min-w-0 items-center gap-2">
                    <Icon className={`size-4 shrink-0 ${meta.iconClassName}`} />
                    <span className="truncate text-sm font-medium">{item.type}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[360px] truncate text-muted-foreground">
                  {item.message}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline" className="border-border/60 text-muted-foreground">
                    {item.category === "alert" ? "告警" : "活动"}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">
                  {item.source}
                </TableCell>
                <TableCell className="hidden lg:table-cell max-w-[280px] truncate text-muted-foreground">
                  {item.detail || "-"}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {formatRelativeTime(item.createdAt)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

export function ActivityLogsPage({ initialFilter }: { initialFilter: string }) {
  const router = useRouter()
  const [viewFilter, setViewFilter] = React.useState<ActivityLogFilter>(() =>
    normalizeViewFilter(initialFilter)
  )
  const [search, setSearch] = React.useState("")
  const [items, setItems] = React.useState<ActivityLogItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  const loadLogs = React.useCallback(async (nextFilter: ActivityLogFilter) => {
    setLoading(true)
    try {
      const result = await api.activityLogs(nextFilter)
      setItems(result.items)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadLogs(viewFilter)
  }, [viewFilter, loadLogs])

  React.useEffect(() => {
    setPage(1)
  }, [viewFilter, search, pageSize])

  function changeViewFilter(nextFilter: string) {
    const normalized = normalizeViewFilter(nextFilter)
    setViewFilter(normalized)
    router.replace(`/dashboard/activity-logs?filter=${normalized}`)
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch = matchesKeyword(item, search.trim().toLowerCase())
    return matchesSearch
  })

  const total = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col">
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 py-6 lg:px-6 xl:mt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">活动日志</h1>
              <p className="mt-1 text-sm text-muted-foreground">系统活动、告警和异常记录</p>
            </div>
            <Button variant="outline" className="gap-1.5" disabled={loading} onClick={() => loadLogs(viewFilter)}>
              <IconRefresh className="size-4" />
              刷新
            </Button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索主题、详情或来源..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={viewFilter} onValueChange={changeViewFilter}>
                <SelectTrigger className="w-full md:w-[160px]">
                  <SelectValue placeholder="全部记录" />
                </SelectTrigger>
                <SelectContent>
                  {viewFilters.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              正在加载日志...
            </div>
          ) : (
            <>
              <ActivityLogTable items={pageItems} />

              <div className="flex items-center justify-end">
                <div className="flex w-full items-center gap-8 lg:w-fit">
                  <div className="hidden items-center gap-2 lg:flex">
                    <Label htmlFor="logs-rows-per-page" className="text-sm font-medium">
                      每页行数
                    </Label>
                    <Select value={`${pageSize}`} onValueChange={(value) => setPageSize(Number(value))}>
                      <SelectTrigger size="sm" className="w-20" id="logs-rows-per-page">
                        <SelectValue placeholder={pageSize} />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {[10, 20, 30, 40, 50].map((value) => (
                          <SelectItem key={value} value={`${value}`}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex w-fit items-center justify-center text-sm font-medium">
                    第 {currentPage} 页，共 {totalPages} 页
                  </div>
                  <div className="ml-auto flex items-center gap-2 lg:ml-0">
                    <Button
                      variant="outline"
                      className="hidden h-8 w-8 p-0 lg:flex"
                      onClick={() => setPage(1)}
                      disabled={currentPage <= 1}
                    >
                      <span className="sr-only">首页</span>
                      <IconChevronsLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                    >
                      <IconChevronLeft className="size-4" />
                      <span className="sr-only">上一页</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                    >
                      <IconChevronRight className="size-4" />
                      <span className="sr-only">下一页</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hidden size-8 lg:flex"
                      onClick={() => setPage(totalPages)}
                      disabled={currentPage >= totalPages}
                    >
                      <span className="sr-only">末页</span>
                      <IconChevronsRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
