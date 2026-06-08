"use client"

import * as React from "react"
import { 
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconNetwork,
  IconCheck,
  IconX,
  IconClock,
  IconDeviceDesktop,
  IconUsers,
  IconCopy
} from "@tabler/icons-react"

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

const policies = [
  {
    id: "1",
    name: "默认策略",
    description: "系统默认连接策略",
    status: "active",
    priority: 1,
    maxSessions: 5,
    sessionTimeout: 480,
    allowedHours: "00:00 - 23:59",
    users: 156,
    applications: 24,
  },
  {
    id: "2",
    name: "研发组策略",
    description: "研发部门专用策略，支持多会话和长连接",
    status: "active",
    priority: 2,
    maxSessions: 10,
    sessionTimeout: 720,
    allowedHours: "00:00 - 23:59",
    users: 34,
    applications: 15,
  },
  {
    id: "3",
    name: "设计组策略",
    description: "设计部门专用策略，优化图形应用体验",
    status: "active",
    priority: 3,
    maxSessions: 3,
    sessionTimeout: 480,
    allowedHours: "08:00 - 20:00",
    users: 23,
    applications: 8,
  },
  {
    id: "4",
    name: "访客策略",
    description: "临时访客使用的受限策略",
    status: "active",
    priority: 10,
    maxSessions: 1,
    sessionTimeout: 60,
    allowedHours: "09:00 - 18:00",
    users: 12,
    applications: 3,
  },
  {
    id: "5",
    name: "测试策略",
    description: "用于测试环境的策略配置",
    status: "inactive",
    priority: 99,
    maxSessions: 20,
    sessionTimeout: 1440,
    allowedHours: "00:00 - 23:59",
    users: 5,
    applications: 20,
  },
  {
    id: "6",
    name: "高安全策略",
    description: "财务和敏感数据访问策略",
    status: "active",
    priority: 4,
    maxSessions: 1,
    sessionTimeout: 120,
    allowedHours: "09:00 - 17:30",
    users: 8,
    applications: 5,
  },
]

export default function PoliciesPage() {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = policy.name.toLowerCase().includes(search.toLowerCase()) ||
      policy.description.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || policy.status === statusFilter
    return matchesSearch && matchesStatus
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
                        <IconNetwork className="size-5 text-primary" />
                        连接策略
                      </CardTitle>
                      <CardDescription>配置用户连接规则和会话限制</CardDescription>
                    </div>
                    <Button className="gap-2">
                      <IconPlus className="size-4" />
                      新建策略
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row">
                    <div className="relative flex-1">
                      <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="搜索策略名称或描述..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
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
                        <SelectItem value="inactive">已禁用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="rounded-lg border border-border/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead>策略名称</TableHead>
                          <TableHead className="text-center">优先级</TableHead>
                          <TableHead className="text-center">状态</TableHead>
                          <TableHead className="hidden text-center md:table-cell">最大会话</TableHead>
                          <TableHead className="hidden text-center lg:table-cell">超时时间</TableHead>
                          <TableHead className="hidden lg:table-cell">允许时段</TableHead>
                          <TableHead className="text-center">关联</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPolicies.map((policy) => (
                          <TableRow key={policy.id} className="border-border/50">
                            <TableCell>
                              <div>
                                <div className="font-medium">{policy.name}</div>
                                <div className="max-w-[200px] truncate text-xs text-muted-foreground">
                                  {policy.description}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="tabular-nums">
                                {policy.priority}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={policy.status === "active" ? "default" : "secondary"}
                                className={policy.status === "active" ? "bg-primary/20 text-primary" : ""}
                              >
                                {policy.status === "active" ? (
                                  <><IconCheck className="mr-1 size-3" />启用</>
                                ) : (
                                  <><IconX className="mr-1 size-3" />禁用</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden text-center md:table-cell">
                              <span className="flex items-center justify-center gap-1 tabular-nums">
                                <IconDeviceDesktop className="size-4 text-muted-foreground" />
                                {policy.maxSessions}
                              </span>
                            </TableCell>
                            <TableCell className="hidden text-center lg:table-cell">
                              <span className="flex items-center justify-center gap-1 tabular-nums">
                                <IconClock className="size-4 text-muted-foreground" />
                                {policy.sessionTimeout} 分钟
                              </span>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <Badge variant="outline" className="font-mono text-xs">
                                {policy.allowedHours}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <IconUsers className="size-3" />
                                  {policy.users}
                                </span>
                                <span className="text-muted-foreground">/</span>
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <IconDeviceDesktop className="size-3" />
                                  {policy.applications}
                                </span>
                              </div>
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
                                    编辑策略
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <IconCopy className="mr-2 size-4" />
                                    复制策略
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <IconUsers className="mr-2 size-4" />
                                    分配用户
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive">
                                    <IconTrash className="mr-2 size-4" />
                                    删除策略
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
                    <span>共 {filteredPolicies.length} 条策略</span>
                    <span>活跃策略: {filteredPolicies.filter(p => p.status === "active").length}</span>
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
