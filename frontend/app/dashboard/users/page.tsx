"use client"

import * as React from "react"
import { 
  IconDotsVertical,
  IconEdit,
  IconKey,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUser,
  IconUsers,
  IconShield,
  IconMail,
  IconClock
} from "@tabler/icons-react"

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const users = [
  {
    id: "1",
    name: "张三",
    email: "zhangsan@company.com",
    role: "user",
    status: "active",
    department: "研发部",
    applications: 8,
    lastLogin: "2024-01-30 14:32",
  },
  {
    id: "2",
    name: "李四",
    email: "lisi@company.com",
    role: "user",
    status: "active",
    department: "设计部",
    applications: 5,
    lastLogin: "2024-01-30 11:20",
  },
  {
    id: "3",
    name: "王五",
    email: "wangwu@company.com",
    role: "admin",
    status: "active",
    department: "IT部",
    applications: 15,
    lastLogin: "2024-01-30 16:45",
  },
  {
    id: "4",
    name: "赵六",
    email: "zhaoliu@company.com",
    role: "user",
    status: "inactive",
    department: "财务部",
    applications: 3,
    lastLogin: "2024-01-25 09:15",
  },
  {
    id: "5",
    name: "陈七",
    email: "chenqi@company.com",
    role: "user",
    status: "active",
    department: "研发部",
    applications: 12,
    lastLogin: "2024-01-30 13:50",
  },
  {
    id: "6",
    name: "刘八",
    email: "liuba@company.com",
    role: "user",
    status: "pending",
    department: "市场部",
    applications: 0,
    lastLogin: "-",
  },
  {
    id: "7",
    name: "孙九",
    email: "sunjiu@company.com",
    role: "user",
    status: "active",
    department: "运营部",
    applications: 6,
    lastLogin: "2024-01-29 17:30",
  },
  {
    id: "8",
    name: "周十",
    email: "zhoushi@company.com",
    role: "admin",
    status: "active",
    department: "IT部",
    applications: 20,
    lastLogin: "2024-01-30 15:00",
  },
]

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge className="bg-primary/20 text-primary">活跃</Badge>
    case "inactive":
      return <Badge variant="secondary">禁用</Badge>
    case "pending":
      return <Badge className="bg-chart-4/20 text-chart-4">待激活</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getRoleBadge(role: string) {
  switch (role) {
    case "admin":
      return (
        <Badge variant="outline" className="border-chart-3/30 text-chart-3">
          <IconShield className="mr-1 size-3" />
          管理员
        </Badge>
      )
    case "user":
      return (
        <Badge variant="outline">
          <IconUser className="mr-1 size-3" />
          用户
        </Badge>
      )
    default:
      return <Badge variant="outline">{role}</Badge>
  }
}

export default function UsersPage() {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [roleFilter, setRoleFilter] = React.useState("all")
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.department.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    return matchesSearch && matchesStatus && matchesRole
  })

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
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
                    <Button className="gap-2">
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
                        placeholder="搜索用户名、邮箱或部门..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-full sm:w-[130px]">
                        <SelectValue placeholder="状态" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部状态</SelectItem>
                        <SelectItem value="active">活跃</SelectItem>
                        <SelectItem value="inactive">禁用</SelectItem>
                        <SelectItem value="pending">待激活</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full sm:w-[130px]">
                        <SelectValue placeholder="角色" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">全部角色</SelectItem>
                        <SelectItem value="admin">管理员</SelectItem>
                        <SelectItem value="user">用户</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="rounded-lg border border-border/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead>用户</TableHead>
                          <TableHead>部门</TableHead>
                          <TableHead>角色</TableHead>
                          <TableHead className="text-center">状态</TableHead>
                          <TableHead className="text-center">授权应用</TableHead>
                          <TableHead className="hidden md:table-cell">最后登录</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="border-border/50">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="size-8">
                                  <AvatarFallback className="bg-secondary text-xs">
                                    {user.name.slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{user.name}</div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <IconMail className="size-3" />
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{user.department}</TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(user.status)}
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {user.applications}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <IconClock className="size-3" />
                                {user.lastLogin}
                              </span>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="size-8">
                                    <IconDotsVertical className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <IconEdit className="mr-2 size-4" />
                                    编辑信息
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <IconKey className="mr-2 size-4" />
                                    应用授权
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <IconShield className="mr-2 size-4" />
                                    修改角色
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    <IconTrash className="mr-2 size-4" />
                                    删除用户
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                    <span>共 {filteredUsers.length} 个用户</span>
                    <span>活跃用户: {filteredUsers.filter(u => u.status === "active").length}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
