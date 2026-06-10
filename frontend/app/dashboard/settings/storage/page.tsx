"use client"

import * as React from "react"
import { 
  IconServer,
  IconFolder,
  IconDatabase,
  IconRefresh,
  IconTrash,
  IconAlertCircle
} from "@tabler/icons-react"

import { AuthGuard } from '@/components/auth-guard'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

export default function StorageSettingsPage() {
  return (
    <AuthGuard>
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
                  <CardTitle className="flex items-center gap-2">
                    <IconServer className="size-5 text-primary" />
                    存储设置
                  </CardTitle>
                  <CardDescription>配置数据存储和文件管理</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 存储状态 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">存储状态</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Card className="border-border/50 bg-secondary/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">系统盘 (C:)</span>
                            <Badge variant="outline" className="text-primary">正常</Badge>
                          </div>
                          <div className="mt-2">
                            <div className="text-2xl font-semibold">45.2 GB</div>
                            <div className="text-xs text-muted-foreground">已使用 / 120 GB 总计</div>
                          </div>
                          <Progress value={38} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                      <Card className="border-border/50 bg-secondary/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">数据盘 (D:)</span>
                            <Badge variant="outline" className="text-chart-4">警告</Badge>
                          </div>
                          <div className="mt-2">
                            <div className="text-2xl font-semibold">380 GB</div>
                            <div className="text-xs text-muted-foreground">已使用 / 500 GB 总计</div>
                          </div>
                          <Progress value={76} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                      <Card className="border-border/50 bg-secondary/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">备份盘 (E:)</span>
                            <Badge variant="outline" className="text-primary">正常</Badge>
                          </div>
                          <div className="mt-2">
                            <div className="text-2xl font-semibold">125 GB</div>
                            <div className="text-xs text-muted-foreground">已使用 / 1 TB 总计</div>
                          </div>
                          <Progress value={12} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 应用存储路径 */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <IconFolder className="size-4" />
                      存储路径配置
                    </h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>应用程序路径</Label>
                        <div className="flex gap-2">
                          <Input defaultValue="D:\RemoteApps\Applications" className="flex-1" />
                          <Button variant="outline">浏览</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>用户配置文件路径</Label>
                        <div className="flex gap-2">
                          <Input defaultValue="D:\RemoteApps\UserProfiles" className="flex-1" />
                          <Button variant="outline">浏览</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>临时文件路径</Label>
                        <div className="flex gap-2">
                          <Input defaultValue="D:\RemoteApps\Temp" className="flex-1" />
                          <Button variant="outline">浏览</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>日志文件路径</Label>
                        <div className="flex gap-2">
                          <Input defaultValue="D:\RemoteApps\Logs" className="flex-1" />
                          <Button variant="outline">浏览</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 数据库设置 */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <IconDatabase className="size-4" />
                      数据库设置
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>数据库类型</Label>
                        <Select defaultValue="sqlite">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sqlite">SQLite</SelectItem>
                            <SelectItem value="sqlserver">SQL Server</SelectItem>
                            <SelectItem value="postgresql">PostgreSQL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>数据库文件</Label>
                        <Input defaultValue="D:\RemoteApps\Data\onyxhub.db" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-lg border border-border/50 bg-secondary/30 p-4">
                      <IconAlertCircle className="size-5 text-chart-4" />
                      <div className="flex-1">
                        <div className="text-sm font-medium">数据库状态</div>
                        <div className="text-xs text-muted-foreground">
                          上次备份: 2024-01-30 03:00 | 数据库大小: 128 MB
                        </div>
                      </div>
                      <Button variant="outline" size="sm">立即备份</Button>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 清理设置 */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <IconTrash className="size-4" />
                      清理设置
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>临时文件保留天数</Label>
                        <Input type="number" defaultValue="7" />
                      </div>
                      <div className="space-y-2">
                        <Label>日志文件保留天数</Label>
                        <Input type="number" defaultValue="30" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="gap-2">
                        <IconTrash className="size-4" />
                        清理临时文件
                      </Button>
                      <Button variant="outline" className="gap-2">
                        <IconTrash className="size-4" />
                        清理过期日志
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" className="gap-2">
                      <IconRefresh className="size-4" />
                      重置
                    </Button>
                    <Button>保存设置</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
