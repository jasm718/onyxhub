"use client"

import * as React from "react"
import {
  IconClock,
  IconPlus,
  IconSearch,
  IconUsers,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard-shell"
import { Badge } from "@/components/ui/badge"
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
import { formatDateTime, roleLabel, statusLabel } from "@/lib/format"

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

export default function UsersPage() {
  const [users, setUsers] = React.useState<User[]>([])
  const [applications, setApplications] = React.useState<Application[]>([])
  const [authorizations, setAuthorizations] = React.useState<Authorization[]>([])
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [formOpen, setFormOpen] = React.useState(false)
  const [permissionOpen, setPermissionOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [permissionUser, setPermissionUser] = React.useState<User | null>(null)
  const [form, setForm] = React.useState<UserFormState>(emptyForm)

  const filteredUsers = users.filter((user) => {
    const keyword = search.trim().toLowerCase()
    if (!keyword) {
      return true
    }
    return [user.username, user.displayName, user.windowsUsername, user.role]
      .join(" ")
      .toLowerCase()
      .includes(keyword)
  })

  const authorizationByUser = React.useMemo(() => {
    const map = new Map<string, Authorization[]>()
    for (const item of authorizations) {
      const items = map.get(item.userId) || []
      items.push(item)
      map.set(item.userId, items)
    }
    return map
  }, [authorizations])

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
    setPermissionOpen(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
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

  async function handleDelete(user: User) {
    if (!window.confirm(`确认删除用户 ${user.displayName || user.username}？`)) {
      return
    }
    try {
      await api.deleteUser(user.id)
      toast.success("用户已删除")
      await loadData()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  async function toggleAuthorization(application: Application, granted: boolean) {
    if (!permissionUser) {
      return
    }

    try {
      if (granted) {
        await api.revokeAuthorization(permissionUser.id, application.id)
        toast.success("已取消授权")
      } else {
        await api.grantAuthorization(permissionUser.id, application.id)
        toast.success("已授权")
      }
      const nextAuthorizations = await api.authorizations()
      setAuthorizations(nextAuthorizations)
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

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
                      <IconUsers className="size-5 text-primary" />
                      用户管理
                    </CardTitle>
                    <CardDescription>管理平台用户和访问权限</CardDescription>
                  </div>
                  <Button className="gap-2" onClick={openCreateForm}>
                    <IconPlus className="size-4" />
                    添加用户
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                  <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="搜索用户名、展示名称或 Windows 用户名..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead>用户</TableHead>
                        <TableHead className="hidden md:table-cell">角色</TableHead>
                        <TableHead className="text-center">状态</TableHead>
                        <TableHead className="text-center">授权应用</TableHead>
                        <TableHead className="hidden md:table-cell">最后登录</TableHead>
                        <TableHead className="text-center">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            正在加载用户...
                          </TableCell>
                        </TableRow>
                      ) : filteredUsers.length ? (
                        filteredUsers.map((user) => {
                          const grants = authorizationByUser.get(user.id) || []
                          return (
                            <TableRow key={user.id} className="border-border/50">
                              <TableCell className="font-medium">
                                <div>{user.displayName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {user.username}
                                  {user.windowsUsername ? ` · ${user.windowsUsername}` : ""}
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                {roleLabel(user.role)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant={user.status === "active" ? "default" : "secondary"}
                                  className={user.status === "active" ? "bg-primary/20 text-primary" : ""}
                                >
                                  {statusLabel(user.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {grants.length ? grants.map((item) => item.application.name).join("、") : "-"}
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <IconClock className="size-3" />
                                  {formatDateTime(user.lastLoginAt)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center text-sm">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    onClick={() => openEditForm(user)}
                                  >
                                    编辑
                                  </Button>
                                  <span className="h-4 w-px bg-border" aria-hidden="true" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    onClick={() => openPermissions(user)}
                                  >
                                    应用权限
                                  </Button>
                                  <span className="h-4 w-px bg-border" aria-hidden="true" />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(user)}
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
                            暂无用户
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="mt-4 flex items-center text-sm text-muted-foreground">
                  <span>共 {filteredUsers.length} 个用户</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingUser ? "编辑用户" : "添加用户"}</SheetTitle>
            <SheetDescription>
              {editingUser ? "修改用户基础信息和状态" : "创建一个新的管理员或普通用户"}
            </SheetDescription>
          </SheetHeader>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">展示名称</Label>
                <Input
                  id="displayName"
                  value={form.displayName}
                  onChange={(event) => setForm({ ...form, displayName: event.target.value })}
                />
              </div>
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
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>角色</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value as "admin" | "user" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">管理员</SelectItem>
                    <SelectItem value="user">用户</SelectItem>
                  </SelectContent>
                </Select>
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

      <Sheet open={permissionOpen} onOpenChange={setPermissionOpen}>
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
                  <TableHead>应用</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                  <TableHead className="text-center">权限</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.length ? (
                  applications.map((application) => {
                    const granted = Boolean(
                      permissionUser &&
                        authorizations.some(
                          (item) =>
                            item.userId === permissionUser.id &&
                            item.applicationId === application.id
                        )
                    )
                    return (
                      <TableRow key={application.id}>
                        <TableCell>
                          <div className="font-medium">{application.name}</div>
                          <div className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {application.path}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {statusLabel(application.status)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            variant={granted ? "outline" : "default"}
                            onClick={() => toggleAuthorization(application, granted)}
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
                      暂无应用
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </SheetContent>
      </Sheet>
    </DashboardShell>
  )
}
