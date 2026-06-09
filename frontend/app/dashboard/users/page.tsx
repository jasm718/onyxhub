"use client"

import * as React from "react"
import { 
  IconPlus,
  IconSearch,
  IconUsers,
  IconClock
} from "@tabler/icons-react"

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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

const users = [
  {
    id: "1",
    name: "张三",
    email: "zhangsan@company.com",
    role: "user",
    status: "active",
    department: "研发部",
    applications: ["Word", "AutoCAD"],
    lastLogin: "2024-01-30 14:32",
  },
  {
    id: "2",
    name: "李四",
    email: "lisi@company.com",
    role: "user",
    status: "active",
    department: "设计部",
    applications: ["SolidWorks"],
    lastLogin: "2024-01-30 11:20",
  },
  {
    id: "3",
    name: "王五",
    email: "wangwu@company.com",
    role: "admin",
    status: "active",
    department: "IT部",
    applications: ["SolidWorks", "AutoCAD", "Word"],
    lastLogin: "2024-01-30 16:45",
  },
  {
    id: "4",
    name: "赵六",
    email: "zhaoliu@company.com",
    role: "user",
    status: "inactive",
    department: "财务部",
    applications: ["Word"],
    lastLogin: "2024-01-25 09:15",
  },
  {
    id: "5",
    name: "陈七",
    email: "chenqi@company.com",
    role: "user",
    status: "active",
    department: "研发部",
    applications: ["SolidWorks", "AutoCAD"],
    lastLogin: "2024-01-30 13:50",
  },
  {
    id: "6",
    name: "刘八",
    email: "liuba@company.com",
    role: "user",
    status: "pending",
    department: "市场部",
    applications: ["AutoCAD"],
    lastLogin: "-",
  },
  {
    id: "7",
    name: "孙九",
    email: "sunjiu@company.com",
    role: "user",
    status: "active",
    department: "运营部",
    applications: ["SolidWorks", "Word"],
    lastLogin: "2024-01-29 17:30",
  },
  {
    id: "8",
    name: "周十",
    email: "zhoushi@company.com",
    role: "admin",
    status: "active",
    department: "IT部",
    applications: ["AutoCAD", "Word"],
    lastLogin: "2024-01-30 15:00",
  },
]

export default function UsersPage() {
  const [search, setSearch] = React.useState("")
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.department.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
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
                  </div>
                  
                  <div className="rounded-lg border border-border/50">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50 hover:bg-transparent">
                          <TableHead>用户</TableHead>
                          <TableHead className="text-center">授权应用</TableHead>
                          <TableHead className="hidden md:table-cell">最后登录</TableHead>
                          <TableHead className="text-center">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id} className="border-border/50">
                            <TableCell className="font-medium">
                              {user.name}
                            </TableCell>
                            <TableCell className="text-center">
                              {user.applications.join("、")}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <IconClock className="size-3" />
                                {user.lastLogin}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center text-sm">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  编辑
                                </Button>
                                <span className="h-4 w-px bg-border" aria-hidden="true" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                  应用权限
                                </Button>
                                <span className="h-4 w-px bg-border" aria-hidden="true" />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-destructive hover:text-destructive"
                                >
                                  删除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
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
      </SidebarInset>
    </SidebarProvider>
  )
}
