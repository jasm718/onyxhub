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
import { Checkbox } from "@/components/ui/checkbox"
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
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
const maxApplicationNameLength = 20
const applicationNameRuleMessage = `应用名称最长 ${maxApplicationNameLength} 位`
const applicationPathRuleMessage = "应用路径只允许 .exe 或 .lnk 文件,格式如：C:\\windows\\system32\\notepad.exe 。"
const applicationPathPattern = /^[A-Za-z]:\\(?:[^<>:"|?*\\/\r\n]+\\)*[^<>:"|?*\\/\r\n]+\.(?:exe|lnk)$/i

function normalizeApplicationForm(form: ApplicationFormState): ApplicationFormState {
  return {
    ...form,
    name: form.name.trim(),
    path: form.path.trim(),
  }
}

function validateApplicationForm(form: ApplicationFormState) {
  const nextForm = normalizeApplicationForm(form)

  if (!nextForm.name) {
    return "应用名称不能为空"
  }
  if (nextForm.name.length > maxApplicationNameLength) {
    return applicationNameRuleMessage
  }
  if (!nextForm.path) {
    return "应用路径不能为空"
  }
  if (!applicationPathPattern.test(nextForm.path)) {
    return applicationPathRuleMessage
  }

  return null
}

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
  const [permissionSubmitting, setPermissionSubmitting] = React.useState(false)
  const [selectedUserIds, setSelectedUserIds] = React.useState<string[]>([])
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

  const selectedUserIdSet = React.useMemo(
    () => new Set(selectedUserIds),
    [selectedUserIds]
  )
  const grantedUserIdSet = React.useMemo(
    () =>
      new Set(
        permissionApplication
          ? (authorizationByApplication.get(permissionApplication.id) || []).map(
              (item) => item.userId
            )
          : []
      ),
    [authorizationByApplication, permissionApplication]
  )
  const selectedUsers = React.useMemo(
    () => users.filter((user) => selectedUserIdSet.has(user.id)),
    [selectedUserIdSet, users]
  )
  const grantTargets = React.useMemo(
    () => selectedUsers.filter((user) => !grantedUserIdSet.has(user.id)),
    [grantedUserIdSet, selectedUsers]
  )
  const revokeTargets = React.useMemo(
    () => selectedUsers.filter((user) => grantedUserIdSet.has(user.id)),
    [grantedUserIdSet, selectedUsers]
  )

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
    setSelectedUserIds([])
    setPermissionOpen(true)
  }

  function toggleUserSelection(userId: string, checked: boolean) {
    setSelectedUserIds((current) => {
      if (checked) {
        return current.includes(userId) ? current : [...current, userId]
      }
      return current.filter((id) => id !== userId)
    })
  }

  function toggleAllUsers(checked: boolean) {
    setSelectedUserIds(checked ? users.map((user) => user.id) : [])
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextForm = normalizeApplicationForm(form)
    const validationError = validateApplicationForm(nextForm)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(true)
    try {
      try {
        await api.fetchApplicationIcon(nextForm.path)
      } catch (error) {
        toast.error("应用路径检查失败")
        return
      }

      if (editingApplication) {
        await api.updateApplication(nextForm)
        toast.success("应用已更新")
      } else {
        await api.createApplication(nextForm)
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

  async function applyUserPermissions(action: "grant" | "revoke") {
    if (!permissionApplication) {
      return
    }

    const targets = action === "grant" ? grantTargets : revokeTargets
    if (!targets.length) {
      return
    }

    setPermissionSubmitting(true)
    try {
      for (const user of targets) {
        if (action === "grant") {
          await api.grantAuthorization(user.id, permissionApplication.id)
        } else {
          await api.revokeAuthorization(user.id, permissionApplication.id)
        }
      }
      const nextAuthorizations = await api.authorizations()
      setAuthorizations(nextAuthorizations)
      setSelectedUserIds([])
      toast.success(action === "grant" ? "已授权" : "已解除")
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setPermissionSubmitting(false)
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
              <img
                src={`data:image/png;base64,${application.icon}`}
                alt=""
                className="size-6 shrink-0 rounded-[4px]"
              />
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
              {editingApplication ? "修改应用基础信息" : "创建一个新的应用"}
            </SheetDescription>
          </SheetHeader>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">应用名称</Label>
              <Input
                id="name"
                value={form.name}
                maxLength={maxApplicationNameLength}
                title={applicationNameRuleMessage}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">{applicationNameRuleMessage}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="path">应用路径</Label>
              <Input
                id="path"
                value={form.path}
                title={applicationPathRuleMessage}
                onChange={(event) => setForm({ ...form, path: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">{applicationPathRuleMessage}</p>
            </div>
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

      <Sheet
        open={permissionOpen}
        onOpenChange={(open: boolean) => {
          setPermissionOpen(open)
          if (!open) {
            setSelectedUserIds([])
          }
        }}
      >
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
                  <TableHead className="w-10">
                    <div className="flex justify-center">
                      <Checkbox
                        aria-label="全选用户"
                        checked={
                          users.length
                            ? selectedUserIds.length === users.length
                              ? true
                              : selectedUserIds.length > 0
                                ? "indeterminate"
                                : false
                            : false
                        }
                        onCheckedChange={(checked) => toggleAllUsers(checked === true)}
                        disabled={!users.length || permissionSubmitting}
                      />
                    </div>
                  </TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead className="hidden md:table-cell">授权状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionApplication ? (
                  users.length ? (
                    users.map((user) => {
                      const granted = grantedUserIdSet.has(user.id)
                      return (
                        <TableRow
                          key={user.id}
                          data-state={selectedUserIdSet.has(user.id) && "selected"}
                        >
                          <TableCell className="w-10">
                            <div className="flex justify-center">
                              <Checkbox
                                aria-label={`选择 ${user.displayName || user.username}`}
                                checked={selectedUserIdSet.has(user.id)}
                                onCheckedChange={(checked) =>
                                  toggleUserSelection(user.id, checked === true)
                                }
                                disabled={permissionSubmitting}
                              />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.username}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                          <Badge
                            variant={granted ? "default" : "secondary"}
                            className={granted ? "bg-primary/20 text-primary" : ""}
                          >
                            {granted ? "已授权" : "无授权"}
                          </Badge>
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
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => applyUserPermissions("revoke")}
              disabled={!revokeTargets.length || permissionSubmitting}
            >
              解除
            </Button>
            <Button
              type="button"
              onClick={() => applyUserPermissions("grant")}
              disabled={!grantTargets.length || permissionSubmitting}
            >
              授权
            </Button>
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
