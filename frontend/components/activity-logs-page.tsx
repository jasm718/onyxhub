"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconAlertTriangle,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

export type ActivityLogFilter = "all" | "exceptions" | "activities"
export type ActivityLogTypeFilter = "all" | "info" | "warn" | "error"

const viewFilters: Array<{ value: ActivityLogFilter; label: string }> = [
  { value: "all", label: "全部记录" },
  { value: "exceptions", label: "异常记录" },
  { value: "activities", label: "信息记录" },
]

const typeFilters: Array<{ value: ActivityLogTypeFilter; label: string }> = [
  { value: "all", label: "全部类型" },
  { value: "info", label: "信息" },
  { value: "warn", label: "警告" },
  { value: "error", label: "异常" },
]

function normalizeViewFilter(value: string): ActivityLogFilter {
  if (value === "all" || value === "exceptions" || value === "activities") {
    return value
  }
  return "all"
}

function normalizeTypeFilter(value: string): ActivityLogTypeFilter {
  if (value === "all" || value === "info" || value === "warn" || value === "error") {
    return value
  }
  return "all"
}

function logMeta(item: ActivityLogItem) {
  if (item.level === "error") {
    return {
      icon: IconAlertTriangle,
      typeLabel: "异常",
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
  const haystack = [item.type, item.message, item.actorType, item.targetType, meta.typeLabel]
    .join(" ")
    .toLowerCase()
  return haystack.includes(keyword)
}

function ActivityLogTable({
  items,
}: {
  items: ActivityLogItem[]
}) {
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
            <TableHead>日志主题</TableHead>
            <TableHead>日志详情</TableHead>
            <TableHead className="hidden md:table-cell">类型</TableHead>
            <TableHead className="text-right">时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const meta = logMeta(item)
            const Icon = meta.icon

            return (
              <TableRow key={`${item.kind}-${item.id}`} className="border-border/50">
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
                    {meta.typeLabel}
                  </Badge>
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
  const [typeFilter, setTypeFilter] = React.useState<ActivityLogTypeFilter>("all")
  const [search, setSearch] = React.useState("")
  const [items, setItems] = React.useState<ActivityLogItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [page, setPage] = React.useState(1)

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
  }, [viewFilter, typeFilter, search])

  function changeViewFilter(nextFilter: string) {
    const normalized = normalizeViewFilter(nextFilter)
    setViewFilter(normalized)
    router.replace(`/dashboard/activity-logs?filter=${normalized}`)
  }

  const filteredItems = items.filter((item) => {
    const matchesType = typeFilter === "all" || item.level === typeFilter
    const matchesSearch = matchesKeyword(item, search.trim().toLowerCase())
    return matchesType && matchesSearch
  })

  const pageSize = 10
  const total = filteredItems.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const startIndex = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, total)
  const pageItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col bg-muted/30">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-4 py-6 lg:px-6 xl:mt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">活动日志</h1>
              <p className="mt-1 text-sm text-muted-foreground">系统运行信息与异常记录</p>
            </div>
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={loading}
              onClick={() => loadLogs(viewFilter)}
            >
              <IconRefresh className="size-4" />
              刷新
            </Button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索日志主题或详情..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(normalizeTypeFilter(value))}
              >
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  {typeFilters.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={viewFilter} onValueChange={changeViewFilter}>
                <SelectTrigger className="w-full md:w-[140px]">
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

          <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
            <div>
              {loading
                ? "正在加载日志..."
                : total === 0
                  ? "暂无日志"
                  : `显示 ${startIndex} 到 ${endIndex}，共 ${total} 条`}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline">分页</span>
              <span>
                {currentPage} / {totalPages}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              正在加载日志...
            </div>
          ) : (
            <>
              <ActivityLogTable items={pageItems} />

              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {total === 0 ? " " : `每页 ${pageSize} 条`}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-8 p-0"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    <IconChevronLeft className="size-4" />
                    <span className="sr-only">上一页</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="size-8 p-0"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  >
                    <IconChevronRight className="size-4" />
                    <span className="sr-only">下一页</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
