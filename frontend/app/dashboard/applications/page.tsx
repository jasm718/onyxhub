"use client"

import * as React from "react"
import {
  IconApps,
  IconCheck,
  IconPlus,
  IconSearch,
  IconUsers,
  IconX,
} from "@tabler/icons-react"
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  api,
  type Application,
  type Authorization,
} from "@/lib/api"
import { formatDateTime, statusLabel } from "@/lib/format"

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

export default function ApplicationsPage() {
  const [applications, setApplications] = React.useState<Application[]>([])
  const [authorizations, setAuthorizations] = React.useState<Authorization[]>([])
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [permissionOpen, setPermissionOpen] = React.useState(false)
  const [editingApplication, setEditingApplication] = React.useState<Application | null>(null)
  const [permissionApplication, setPermissionApplication] = React.useState<Application | null>(null)
  const [deletingApplication, setDeletingApplication] = React.useState<Application | null>(null)
  const [form, setForm] = React.useState<ApplicationFormState>(emptyForm)

  const filteredApps = applications.filter((application) => {
    const keyword = search.trim().toLowerCase()
    const matchesSearch =
      !keyword ||
      [application.name, application.path]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    const matchesStatus = statusFilter === "all" || application.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
      const [nextApplications, nextAuthorizations] = await Promise.all([
        api.applications(),
        api.authorizations(),
      ])
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

  async function revokeAuthorization(item: Authorization) {
    try {
      await api.revokeAuthorization(item.userId, item.applicationId)
      toast.success("已取消授权")
      const nextAuthorizations = await api.authorizations()
      setAuthorizations(nextAuthorizations)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  const permissionItems = permissionApplication
    ? authorizationByApplication.get(permissionApplication.id) || []
    : []

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <IconApps className="size-5 text-primary" />
                      应用管理
                    </CardTitle>
                    <CardDescription>管理和发布 RemoteApp 应用程序</CardDescription>
                  </div>
                  <Button className="gap-2" onClick={openCreateForm}>
                    <IconPlus className="size-4" />
                    添加应用
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索应用名称或路径..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="状态筛选" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="active">已启用</SelectItem>
                      <SelectItem value="disabled">已禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead>应用名称</TableHead>
                        <TableHead className="hidden md:table-cell">路径</TableHead>
                        <TableHead className="text-center">状态</TableHead>
                        <TableHead className="text-center">授权用户</TableHead>
                        <TableHead className="hidden lg:table-cell">更新时间</TableHead>
                        <TableHead className="text-center">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            正在加载应用...
                          </TableCell>
                        </TableRow>
                      ) : filteredApps.length ? (
                        filteredApps.map((application) => {
                          const grants = authorizationByApplication.get(application.id) || []
                          return (
                            <TableRow key={application.id} className="border-border/50">
                              <TableCell className="font-medium">
                                <div>{application.name}</div>
                                {application.remoteAppRegistered ? (
                                  <div className="text-xs text-muted-foreground">
                                    RemoteApp · {application.remoteAppAlias}
                                  </div>
                                ) : null}
                              </TableCell>
                              <TableCell className="hidden max-w-[220px] truncate text-muted-foreground md:table-cell">
                                {application.path}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={application.status === "active" ? "default" : "secondary"}
                                  className={application.status === "active" ? "bg-primary/20 text-primary" : ""}
                                >
                                  {application.status === "active" ? (
                                    <>
                                      <IconCheck className="mr-1 size-3" />
                                      启用
                                    </>
                                  ) : (
                                    <>
                                      <IconX className="mr-1 size-3" />
                                      禁用
                                    </>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="flex items-center justify-center gap-1">
                                  <IconUsers className="size-4 text-muted-foreground" />
                                  {grants.length}
                                </span>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-muted-foreground">
                                {formatDateTime(application.updatedAt)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center text-sm">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    onClick={() => openEditForm(application)}
                                  >
                                    编辑
                                  </Button>
                                  <span className="h-4 w-px bg-border" aria-hidden="true" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    onClick={() => openPermissions(application)}
                                  >
                                    权限
                                  </Button>
                                  <span className="h-4 w-px bg-border" aria-hidden="true" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    onClick={() => toggleStatus(application)}
                                  >
                                    {application.status === "active" ? "禁用" : "启用"}
                                  </Button>
                                  <span className="h-4 w-px bg-border" aria-hidden="true" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                    onClick={() => openDeleteConfirm(application)}
                                  >
                                    删除
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            暂无应用
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <span>共 {filteredApps.length} 个应用</span>
                </div>
              </CardContent>
            </Card>
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
              {permissionApplication ? `查看 ${permissionApplication.name} 的授权用户` : "查看应用授权用户"}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 rounded-lg border border-border/50">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>用户</TableHead>
                  <TableHead className="hidden md:table-cell">授权时间</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {permissionItems.length ? (
                  permissionItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-medium">{item.user.displayName}</div>
                        <div className="text-xs text-muted-foreground">{item.user.username}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeAuthorization(item)}
                        >
                          取消授权
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      暂无授权用户
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
