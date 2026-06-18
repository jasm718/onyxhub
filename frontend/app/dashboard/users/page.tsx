"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RotateCcw,
  Search,
  Shield,
  Trash2,
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
  api,
  type Application,
  type Authorization,
  type User,
} from "@/lib/api"
import { formatDateTime, statusLabel } from "@/lib/format"
import { cn } from "@/lib/utils"

type UserFormState = {
  id: string
  username: string
  displayName: string
  password: string
  role: "admin" | "user"
  status: "active" | "disabled"
}

const emptyForm: UserFormState = {
  id: "",
  username: "",
  displayName: "",
  password: "",
  role: "user",
  status: "active",
}

function toForm(user: User): UserFormState {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    password: "",
    role: user.role,
    status: user.status,
  }
}

const usersPageSize = 10
const maxUsernameLength = 15
const minPasswordLength = 6
const usernameRuleMessage = `最长 ${maxUsernameLength} 位，只能包含大小写字母和数字`
const passwordRuleMessage = `最短 ${minPasswordLength} 位，只能包含大小写字母、数字、@ . _ -`
const usernamePattern = /^[A-Za-z0-9]+$/
const passwordPattern = /^[A-Za-z0-9@._-]+$/

function validateUserForm(form: UserFormState, editingUser: User | null) {
  if (!form.username) {
    return "登录名不能为空"
  }
  if (form.username.length > maxUsernameLength || !usernamePattern.test(form.username)) {
    return usernameRuleMessage
  }

  if (!editingUser || form.password) {
    if (!form.password) {
      return "密码不能为空"
    }
    if (form.password.length < minPasswordLength || !passwordPattern.test(form.password)) {
      return passwordRuleMessage
    }
  }

  return null
}

function UsersTableToolbar({
  table,
  onCreate,
}: {
  table: TanStackTable<User>
  onCreate: () => void
}) {
  const isFiltered = Boolean(table.getState().globalFilter)

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="搜索登录名、展示名称..."
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
        添加用户
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

function UsersTablePagination({
  table,
  className,
}: {
  table: TanStackTable<User>
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
        共 {filteredRows} 个用户
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

export default function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([])
  const [applications, setApplications] = React.useState<Application[]>([])
  const [authorizations, setAuthorizations] = React.useState<Authorization[]>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: usersPageSize,
  })
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [permissionOpen, setPermissionOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [permissionUser, setPermissionUser] = React.useState<User | null>(null)
  const [deletingUser, setDeletingUser] = React.useState<User | null>(null)
  const [permissionSubmitting, setPermissionSubmitting] = React.useState(false)
  const [selectedApplicationIds, setSelectedApplicationIds] = React.useState<string[]>([])
  const [form, setForm] = React.useState<UserFormState>(emptyForm)

  const authorizationByUser = React.useMemo(() => {
    const map = new Map<string, Authorization[]>()
    for (const item of authorizations) {
      const items = map.get(item.userId) || []
      items.push(item)
      map.set(item.userId, items)
    }
    return map
  }, [authorizations])

  const selectedApplicationIdSet = React.useMemo(
    () => new Set(selectedApplicationIds),
    [selectedApplicationIds]
  )
  const grantedApplicationIdSet = React.useMemo(
    () =>
      new Set(
        permissionUser
          ? (authorizationByUser.get(permissionUser.id) || []).map((item) => item.applicationId)
          : []
      ),
    [authorizationByUser, permissionUser]
  )
  const selectedApplications = React.useMemo(
    () => applications.filter((application) => selectedApplicationIdSet.has(application.id)),
    [applications, selectedApplicationIdSet]
  )
  const grantTargets = React.useMemo(
    () =>
      selectedApplications.filter((application) => !grantedApplicationIdSet.has(application.id)),
    [grantedApplicationIdSet, selectedApplications]
  )
  const revokeTargets = React.useMemo(
    () =>
      selectedApplications.filter((application) => grantedApplicationIdSet.has(application.id)),
    [grantedApplicationIdSet, selectedApplications]
  )

  async function loadData() {
    setLoading(true)
    try {
      const [nextUsers, nextApplications, nextAuthorizations] = await Promise.all([
        api.users(),
        api.applications(),
        api.authorizations(),
      ])
      setUsers(nextUsers)
      setApplications(nextApplications)
      setAuthorizations(nextAuthorizations)
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
    setEditingUser(null)
    setForm(emptyForm)
    setFormOpen(true)
  }

  function openEditForm(user: User) {
    setEditingUser(user)
    setForm(toForm(user))
    setFormOpen(true)
  }

  function openPermissions(user: User) {
    setPermissionUser(user)
    setSelectedApplicationIds([])
    setPermissionOpen(true)
  }

  function toggleApplicationSelection(applicationId: string, checked: boolean) {
    setSelectedApplicationIds((current) => {
      if (checked) {
        return current.includes(applicationId) ? current : [...current, applicationId]
      }
      return current.filter((id) => id !== applicationId)
    })
  }

  function toggleAllApplications(checked: boolean) {
    setSelectedApplicationIds(checked ? applications.map((application) => application.id) : [])
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateUserForm(form, editingUser)
    if (validationError) {
      toast.error(validationError)
      return
    }
    setSubmitting(true)
    try {
      if (editingUser) {
        await api.updateUser(form)
        toast.success("用户已更新")
      } else {
        await api.createUser(form)
        toast.success("用户已创建")
      }
      setFormOpen(false)
      await loadData()
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  function openDeleteConfirm(user: User) {
    setDeletingUser(user)
  }

  async function handleDelete() {
    if (!deletingUser) {
      return
    }
    try {
      await api.deleteUser(deletingUser.id)
      toast.success("用户已删除")
      setDeletingUser(null)
      await loadData()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  async function toggleStatus(user: User) {
    try {
      await api.updateUser({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        status: user.status === "active" ? "disabled" : "active",
      })
      toast.success(user.status === "active" ? "用户已禁用" : "用户已启用")
      await loadData()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  async function applyApplicationPermissions(action: "grant" | "revoke") {
    if (!permissionUser) {
      return
    }

    const targets = action === "grant" ? grantTargets : revokeTargets
    if (!targets.length) {
      return
    }

    setPermissionSubmitting(true)
    try {
      for (const application of targets) {
        if (action === "grant") {
          await api.grantAuthorization(permissionUser.id, application.id)
        } else {
          await api.revokeAuthorization(permissionUser.id, application.id)
        }
      }
      const nextAuthorizations = await api.authorizations()
      setAuthorizations(nextAuthorizations)
      setSelectedApplicationIds([])
      toast.success(action === "grant" ? "已授权" : "已解除")
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setPermissionSubmitting(false)
    }
  }

  const columns = React.useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "displayName",
        header: "用户",
        cell: ({ row }) => {
          const user = row.original
          return (
            <div className="min-w-0">
              <div className="truncate font-medium">{user.displayName}</div>
            </div>
          )
        },
      },
      {
        accessorKey: "username",
        header: "登录名",
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate">{row.original.username}</div>
          </div>
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
        id: "authorizedApplications",
        header: "授权应用",
        cell: ({ row }) => {
          const text =
            authorizationByUser
              .get(row.original.id)
              ?.map((item) => item.application.name)
              .join("、") || "-"
          return (
            <span className="block max-w-full truncate text-muted-foreground">
              {text}
            </span>
          )
        },
      },
      {
        accessorKey: "lastLoginAt",
        header: "最后登录",
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
            <Clock className="size-3 shrink-0" />
            <span className="truncate">{formatDateTime(row.original.lastLoginAt)}</span>
          </span>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const user = row.original
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
                  <DropdownMenuItem onClick={() => openEditForm(user)}>
                    <Pencil className="size-4" />
                    编辑
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openPermissions(user)}>
                    <Shield className="size-4" />
                    权限
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toggleStatus(user)}>
                    <Power className="size-4" />
                    {user.status === "active" ? "禁用" : "启用"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => openDeleteConfirm(user)}
                  >
                    <Trash2 className="size-4" />
                    删除
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
        enableHiding: false,
      },
    ],
    [authorizationByUser]
  )

  const table = useReactTable({
    data: users,
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
        row.original.username,
        row.original.displayName,
        row.original.windowsUsername,
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
    : Math.max(usersPageSize - Math.max(currentRows.length, 1), 0)

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 md:gap-6 lg:px-6 xl:mt-8">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">用户管理</h2>
                <p className="text-muted-foreground">
                  管理平台用户和访问权限
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div role="toolbar">
                <UsersTableToolbar table={table} onCreate={openCreateForm} />
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
                              header.column.id === "displayName" && "w-[22%]",
                              header.column.id === "username" && "w-[16%]",
                              header.column.id === "status" && "w-[12%]",
                              header.column.id === "authorizedApplications" && "w-[30%]",
                              header.column.id === "lastLoginAt" && "w-[18%]",
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
                          正在加载用户...
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
                          暂无用户
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
              <UsersTablePagination table={table} />
            </div>
          </div>
        </div>
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingUser ? "编辑用户" : "添加用户"}</SheetTitle>
            <SheetDescription>
              {editingUser ? "修改用户基础信息" : "创建一个新的用户"}
            </SheetDescription>
          </SheetHeader>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">登录名</Label>
              <Input
                id="username"
                value={form.username}
                disabled={Boolean(editingUser)}
                maxLength={maxUsernameLength}
                pattern={usernamePattern.source}
                title={usernameRuleMessage}
                onChange={(event) => setForm({ ...form, username: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">{usernameRuleMessage}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">实际名称</Label>
              <Input
                id="displayName"
                value={form.displayName}
                onChange={(event) => setForm({ ...form, displayName: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {editingUser ? "新密码" : "密码"}
              </Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                placeholder={editingUser ? "留空表示不修改" : ""}
                minLength={minPasswordLength}
                pattern={passwordPattern.source}
                title={passwordRuleMessage}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {passwordRuleMessage}
                {editingUser ? "，留空表示不修改" : ""}
              </p>
            </div>
            <input type="hidden" value={form.role} readOnly />
            <input type="hidden" value={form.status} readOnly />
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
            setSelectedApplicationIds([])
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>应用权限</SheetTitle>
            <SheetDescription>
              {permissionUser ? `配置 ${permissionUser.displayName || permissionUser.username} 的应用授权` : "配置用户应用授权"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">
                    <div className="flex justify-center">
                      <Checkbox
                        aria-label="全选应用"
                        checked={
                          applications.length
                            ? selectedApplicationIds.length === applications.length
                              ? true
                              : selectedApplicationIds.length > 0
                                ? "indeterminate"
                                : false
                            : false
                        }
                        onCheckedChange={(checked) =>
                          toggleAllApplications(checked === true)
                        }
                        disabled={!applications.length || permissionSubmitting}
                      />
                    </div>
                  </TableHead>
                  <TableHead>应用</TableHead>
                  <TableHead className="text-center">授权状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length ? (
                  applications.map((application) => {
                    const granted = grantedApplicationIdSet.has(application.id)
                    return (
                      <TableRow
                        key={application.id}
                        data-state={selectedApplicationIdSet.has(application.id) && "selected"}
                      >
                        <TableCell className="w-10">
                          <div className="flex justify-center">
                            <Checkbox
                              aria-label={`选择 ${application.name}`}
                              checked={selectedApplicationIdSet.has(application.id)}
                              onCheckedChange={(checked) =>
                                toggleApplicationSelection(application.id, checked === true)
                              }
                              disabled={permissionSubmitting}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{application.name}</div>
                          <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {application.path}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
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
                      暂无应用
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
              onClick={() => applyApplicationPermissions("revoke")}
              disabled={!revokeTargets.length || permissionSubmitting}
            >
              解除
            </Button>
            <Button
              type="button"
              onClick={() => applyApplicationPermissions("grant")}
              disabled={!grantTargets.length || permissionSubmitting}
            >
              授权
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(deletingUser)}
        onOpenChange={(open: boolean) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除用户</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingUser ? `确认删除用户 ${deletingUser.displayName || deletingUser.username}？此操作不可恢复。` : ""}
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
