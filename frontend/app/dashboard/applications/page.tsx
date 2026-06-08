"use client"

import * as React from "react"
import { 
  IconApps,
  IconDotsVertical,
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconCheck,
  IconX,
  IconUsers
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

const applications = [
  {
    id: "1",
    name: "Microsoft Word",
    path: "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
    status: "active",
    users: 45,
    connections: 12,
    category: "办公软件",
  },
  {
    id: "2",
    name: "Microsoft Excel",
    path: "C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE",
    status: "active",
    users: 52,
    connections: 18,
    category: "办公软件",
  },
  {
    id: "3",
    name: "Adobe Photoshop",
    path: "C:\\Program Files\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe",
    status: "active",
    users: 23,
    connections: 8,
    category: "设计工具",
  },
  {
    id: "4",
    name: "Visual Studio Code",
    path: "C:\\Program Files\\Microsoft VS Code\\Code.exe",
    status: "active",
    users: 34,
    connections: 15,
    category: "开发工具",
  },
  {
    id: "5",
    name: "AutoCAD 2024",
    path: "C:\\Program Files\\Autodesk\\AutoCAD 2024\\acad.exe",
    status: "inactive",
    users: 12,
    connections: 0,
    category: "设计工具",
  },
  {
    id: "6",
    name: "Notepad++",
    path: "C:\\Program Files\\Notepad++\\notepad++.exe",
    status: "active",
    users: 67,
    connections: 22,
    category: "开发工具",
  },
  {
    id: "7",
    name: "FileZilla",
    path: "C:\\Program Files\\FileZilla FTP Client\\filezilla.exe",
    status: "active",
    users: 15,
    connections: 5,
    category: "工具软件",
  },
  {
    id: "8",
    name: "PuTTY",
    path: "C:\\Program Files\\PuTTY\\putty.exe",
    status: "inactive",
    users: 28,
    connections: 0,
    category: "工具软件",
  },
]

export default function ApplicationsPage() {
  const [search, setSearch] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  
  const filteredApps = applications.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.path.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || app.status === statusFilter
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
                        <IconApps className="size-5 text-primary" />
                        应用管理
                      </CardTitle>
                      <CardDescription>管理和发布 RemoteApp 应用程序</CardDescription>
                    </div>
                    <Button className="gap-2">
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
                          <TableHead>应用名称</TableHead>
                          <TableHead className="hidden md:table-cell">路径</TableHead>
                          <TableHead>类别</TableHead>
                          <TableHead className="text-center">状态</TableHead>
                          <TableHead className="text-center">授权用户</TableHead>
                          <TableHead className="text-center">当前连接</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredApps.map((app) => (
                          <TableRow key={app.id} className="border-border/50">
                            <TableCell className="font-medium">{app.name}</TableCell>
                            <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                              {app.path}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-normal">
                                {app.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge 
                                variant={app.status === "active" ? "default" : "secondary"}
                                className={app.status === "active" ? "bg-primary/20 text-primary" : ""}
                              >
                                {app.status === "active" ? (
                                  <><IconCheck className="mr-1 size-3" />启用</>
                                ) : (
                                  <><IconX className="mr-1 size-3" />禁用</>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="flex items-center justify-center gap-1">
                                <IconUsers className="size-4 text-muted-foreground" />
                                {app.users}
                              </span>
                            </TableCell>
                            <TableCell className="text-center tabular-nums">
                              {app.connections}
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
                                    编辑
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <IconUsers className="mr-2 size-4" />
                                    用户授权
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-destructive">
                                    <IconTrash className="mr-2 size-4" />
                                    删除
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
                    <span>共 {filteredApps.length} 个应用</span>
                    <span>当前活跃连接: {filteredApps.reduce((sum, app) => sum + app.connections, 0)}</span>
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
