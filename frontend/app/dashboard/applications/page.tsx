"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react"
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type Table as TanStackTable,
} from "@tanstack/react-table"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  api,
  type Application,
  type Authorization,
  type User,
} from "@/lib/api"
import { statusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type ApplicationFormState = {
  id: string
  name: string
  path: string
  arguments: string
  workingDir: string
  status: "active" | "disabled"
  remoteAppRegistered: boolean
  remoteAppAlias: string
}

const emptyForm: ApplicationFormState = {
  id: "",
  name: "",
  path: "",
  arguments: "",
  workingDir: "",
  status: "active",
  remoteAppRegistered: false,
  remoteAppAlias: "",
}

function toForm(application: Application): ApplicationFormState {
  return {
    id: application.id,
    name: application.name,
    path: application.path,
    arguments: application.arguments,
    workingDir: application.workingDir,
    status: application.status,
    remoteAppRegistered: application.remoteAppRegistered,
    remoteAppAlias: application.remoteAppAlias,
  }
}

const applicationsPageSize = 10

function ApplicationsTableToolbar({
  table,
  onCreate,
}: {
  table: TanStackTable<Application>
  onCreate: () => void
}) {
  const isFiltered = Boolean(table.getState().globalFilter)

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索应用名称或路径..."
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(event) => table.setGlobalFilter(event.target.value)}
            className="h-8 w-full pl-8"
          />
        </div>
        {isFiltered ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              table.setGlobalFilter("")
            }}
          >
            重置
            <RotateCcw className="size-4" />
          </Button>
        ) : null}
      </div>

      <Button className="h-8 shrink-0 gap-2" onClick={onCreate}>
        <Plus className="size-4" />
        添加应用
      </Button>
    </div>
  )
}

function getPageNumbers(currentPage: number, totalPages: number) {
  const pages: Array<number | "..."> = []
  const siblingCount = 1
  const startPage = Math.max(2, currentPage - siblingCount)
  const endPage = Math.min(totalPages - 1, currentPage + siblingCount)

  pages.push(1)

  if (startPage > 2) {
    pages.push("...")
  }

  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page)
  }

  if (endPage < totalPages - 1) {
    pages.push("...")
  }

  if (totalPages > 1) {
    pages.push(totalPages)
  }

  return pages
}

function ApplicationsTablePagination({
  table,
  className,
}: {
  table: TanStackTable<Application>
  className?: string
}) {
  const filteredRows = table.getFilteredRowModel().rows.length
  const currentPage = table.getState().pagination.pageIndex + 1
  const totalPages = Math.max(table.getPageCount(), 1)
  const pageNumbers = getPageNumbers(currentPage, totalPages)

  return (
    <div
      className={cn(
        "flex flex-col gap-4 px-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="text-sm text-muted-foreground">
        共 {filteredRows} 个应用
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex items-center gap-2">
          <div className="w-20 text-center text-sm font-medium">
            {currentPage} / {totalPages} 页
          </div>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 sm:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">第一页</span>
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">上一页</span>
            <ChevronLeft className="size-4" />
          </Button>
          {pageNumbers.map((pageNumber, index) =>
            pageNumber === "..." ? (
              <span
                key={`ellipsis-${index}`}
                className="px-1 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={pageNumber}
                variant={currentPage === pageNumber ? "default" : "outline"}
                className="h-8 min-w-8 px-2"
                onClick={() => table.setPageIndex(pageNumber - 1)}
              >
                <span className="sr-only">第 {pageNumber} 页</span>
                {pageNumber}
              </Button>
            )
          )}
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">下一页</span>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="hidden size-8 sm:flex"
            onClick={() => table.setPageIndex(Math.max(table.getPageCount() - 1, 0))}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">最后一页</span>
            <ChevronsRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ApplicationsPage() {
  const [applications, setApplications] = React.useState<Application[]>([])
  const [authorizations, setAuthorizations] = React.useState<Authorization[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: applicationsPageSize,
  })
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [permissionOpen, setPermissionOpen] = React.useState(false)
  const [editingApplication, setEditingApplication] = React.useState<Application | null>(null)
  const [permissionApplication, setPermissionApplication] = React.useState<Application | null>(null)
  const [deletingApplication, setDeletingApplication] = React.useState<Application | null>(null)
  const [form, setForm] = React.useState<ApplicationFormState>(emptyForm)

  const authorizationByApplication = React.useMemo(() => {
    const map = new Map<string, Authorization[]>()
    for (const item of authorizations) {
      const items = map.get(item.applicationId) || []
      items.push(item)
      map.set(item.applicationId, items)
    }
    return map
  }, [authorizations])

  async function loadData() {
    setLoading(true)
    try {
      const [nextApplications, nextAuthorizations, nextUsers] = await Promise.all([
        api.applications(),
        api.authorizations(),
        api.users(),
      ])
      setApplications(nextApplications)
      setAuthorizations(nextAuthorizations)
      setUsers(nextUsers)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  function openCreateForm() {
    setEditingApplication(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEditForm(application: Application) {
    setEditingApplication(application)
    setForm(toForm(application))
    setFormOpen(true)
  }

  function openPermissions(application: Application) {
    setPermissionApplication(application)
    setPermissionOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      if (editingApplication) {
        await api.updateApplication(form)
        toast.success("应用已更新")
      } else {
        await api.createApplication(form)
        toast.success("应用已创建")
      }
      setFormOpen(false)
      await loadData()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function openDeleteConfirm(application: Application) {
    setDeletingApplication(application)
  }

  async function handleDelete() {
    if (!deletingApplication) {
      return
    }
    try {
      await api.deleteApplication(deletingApplication.id)
      toast.success("应用已删除")
      setDeletingApplication(null)
      await loadData()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  async function toggleStatus(application: Application) {
    try {
      if (application.status === "active") {
        await api.disableApplication(application.id)
        toast.success("应用已禁用")
      } else {
        await api.enableApplication(application.id)
        toast.success("应用已启用")
      }
      await loadData()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  async function toggleAuthorization(user: User, granted: boolean) {
    if (!permissionApplication) {
      return
    }

    try {
      if (granted) {
        await api.revokeAuthorization(user.id, permissionApplication.id)
        toast.success("已取消授权")
      } else {
        await api.grantAuthorization(user.id, permissionApplication.id)
        toast.success("已授权")
      }
      const nextAuthorizations = await api.authorizations()
      setAuthorizations(nextAuthorizations)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const permissionAuthorizations = permissionApplication
    ? authorizationByApplication.get(permissionApplication.id) || []
    : []

  const columns = React.useMemo<ColumnDef<Application>[]>(
    () => [
      {
        accessorKey: "name",
        header: "应用",
        cell: ({ row }) => {
          const application = row.original
          return (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{application.name}</span>
              {application.remoteAppRegistered && application.remoteAppAlias ? (
                <span className="hidden truncate text-xs text-muted-foreground md:inline">
                  {application.remoteAppAlias}
                </span>
              ) : null}
            </div>
          )
        },
        enableHiding: false,
      },
      {
        accessorKey: "path",
        header: "路径",
        cell: ({ row }) => (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block max-w-full truncate text-muted-foreground">
                  {row.original.path}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="start"
                className="max-w-[520px] whitespace-normal break-all text-left"
              >
                {row.original.path}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
      },
      {
        accessorKey: "status",
        header: "状态",
        cell: ({ row }) => {
          const isActive = row.original.status === "active"
          return (
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={isActive ? "bg-primary/20 text-primary" : ""}
            >
              {statusLabel(row.original.status)}
            </Badge>
          )
        },
      },
      {
        id: "authorizedUsers",
        header: "授权",
        cell: ({ row }) => {
          const count =
            authorizationByApplication.get(row.original.id)?.length ?? 0
          return (
            <div className="flex items-center gap-2">
              <Users className="size-4 text-muted-foreground" />
              <span>{count}</span>
            </div>
          )
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const application = row.original
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground data-[state=open]:bg-muted"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">打开操作菜单</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-36 rounded-[6px] bg-popover"
                >
                  <DropdownMenuItem onClick={() => openEditForm(application)}>
                    <Pencil className="size-4" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openPermissions(application)}>
                    <Shield className="size-4" />
                    权限
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleStatus(application)}>
                    <Power className="size-4" />
                    {application.status === "active" ? "禁用" : "启用"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => openDeleteConfirm(application)}
                  >
                    <Trash2 className="size-4" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [authorizationByApplication]
  )

  const table = useReactTable({
    data: applications,
    columns,
    state: {
      globalFilter,
      pagination,
    },
    getRowId: (row) => row.id,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, filterValue) => {
      const keyword = String(filterValue ?? "").trim().toLowerCase()
      if (!keyword) {
        return true
      }

      return [
        row.original.name,
        row.original.path,
        row.original.remoteAppAlias,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })
  const currentRows = table.getRowModel().rows
  const visibleColumnCount = table.getVisibleLeafColumns().length
  const emptyRowCount = loading
    ? 0
    : Math.max(applicationsPageSize - Math.max(currentRows.length, 1), 0)

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:gap-6 lg:px-6 xl:mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">应用管理</h2>
                <p className="text-muted-foreground">
                  发布并管理虚拟云应用程序
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div role="toolbar">
                <ApplicationsTableToolbar table={table} onCreate={openCreateForm} />
              </div>
              <div className="overflow-hidden rounded-[6px] border">
                <Table className="table-fixed">
                  <TableHeader className="bg-muted/50">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            colSpan={header.colSpan}
                            className={cn(
                              header.column.id === "name" && "w-[24%]",
                              header.column.id === "path" && "w-[48%]",
                              header.column.id === "status" && "w-[12%]",
                              header.column.id === "authorizedUsers" && "w-[8%]",
                              header.column.id === "actions" && "w-[8%] text-right"
                            )}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          正在加载应用...
                        </TableCell>
                      </TableRow>
                    ) : currentRows.length ? (
                      currentRows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              key={cell.id}
                              className={cn(
                                cell.column.id === "actions" && "text-right"
                              )}
                            >
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={visibleColumnCount}
                          className="h-12 text-center text-muted-foreground"
                        >
                          暂无应用
                        </TableCell>
                      </TableRow>
                    )}
                    {Array.from({ length: emptyRowCount }).map((_, index) => (
                      <TableRow
                        key={`empty-row-${index}`}
                        aria-hidden="true"
                        className="hover:bg-transparent"
                      >
                        <TableCell colSpan={visibleColumnCount} className="h-12">
                          &nbsp;
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ApplicationsTablePagination table={table} />
            </div>
          </div>
        </div>
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingApplication ? "编辑应用" : "添加应用"}</SheetTitle>
            <SheetDescription>
              {editingApplication ? "修改 RemoteApp 应用信息" : "发布一个新的 RemoteApp 应用"}
            </SheetDescription>
          </SheetHeader>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">应用名称</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="path">应用路径</Label>
              <Input
                id="path"
                value={form.path}
                onChange={(event) => setForm({ ...form, path: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arguments">启动参数</Label>
              <Input
                id="arguments"
                value={form.arguments}
                onChange={(event) => setForm({ ...form, arguments: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workingDir">工作目录</Label>
              <Input
                id="workingDir"
                value={form.workingDir}
                onChange={(event) => setForm({ ...form, workingDir: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>状态</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm({ ...form, status: value as "active" | "disabled" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">启用</SelectItem>
                  <SelectItem value="disabled">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <Label htmlFor="remoteAppRegistered">注册 RemoteApp</Label>
              <Switch
                id="remoteAppRegistered"
                checked={form.remoteAppRegistered}
                onCheckedChange={(checked) =>
                  setForm({ ...form, remoteAppRegistered: Boolean(checked) })
                }
              />
            </div>
            {form.remoteAppRegistered ? (
              <div className="space-y-2">
                <Label htmlFor="remoteAppAlias">RemoteApp Alias</Label>
                <Input
                  id="remoteAppAlias"
                  value={form.remoteAppAlias}
                  placeholder="留空自动生成"
                  onChange={(event) => setForm({ ...form, remoteAppAlias: event.target.value })}
                />
              </div>
            ) : null}
            <SheetFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={permissionOpen} onOpenChange={setPermissionOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>授权用户</SheetTitle>
            <SheetDescription>
              {permissionApplication
                ? `为 ${permissionApplication.name} 选择可授权用户`
                : "为应用选择可授权用户"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>用户</TableHead>
                  <TableHead className="hidden md:table-cell">状态</TableHead>
                  <TableHead className="text-center">权限</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionApplication ? (
                  users.length ? (
                    users.map((user) => {
                      const granted = permissionAuthorizations.some(
                        (item) => item.userId === user.id
                      )
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.username}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <Badge
                              variant={user.status === "active" ? "default" : "secondary"}
                              className={
                                user.status === "active" ? "bg-primary/20 text-primary" : ""
                              }
                            >
                              {statusLabel(user.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              variant={granted ? "outline" : "default"}
                              onClick={() => toggleAuthorization(user, granted)}
                            >
                              {granted ? "取消授权" : "授权"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        暂无用户
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      暂无用户
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deletingApplication)}
        onOpenChange={(open: boolean) => !open && setDeletingApplication(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除应用</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingApplication
                ? `确认删除应用 ${deletingApplication.name}？此操作不可恢复。`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">取消</AlertDialogCancel>
            <AlertDialogAction type="button" onClick={handleDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardShell>
  )
}
