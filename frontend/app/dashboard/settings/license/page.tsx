"use client"

import * as React from "react"
import { 
  IconKey,
  IconCheck,
  IconAlertTriangle,
  IconRefresh,
  IconUpload,
  IconCopy
} from "@tabler/icons-react"

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
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar'

export default function LicenseSettingsPage() {
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
                  <CardTitle className="flex items-center gap-2">
                    <IconKey className="size-5 text-primary" />
                    授权管理
                  </CardTitle>
                  <CardDescription>管理系统授权许可和使用限制</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 授权状态 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">当前授权</h3>
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex size-12 items-center justify-center rounded-lg bg-primary">
                            <IconCheck className="size-6 text-primary-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-semibold">企业版</span>
                              <Badge className="bg-primary/20 text-primary">已激活</Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              有效期至: 2025-12-31
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">剩余天数</div>
                          <div className="text-2xl font-semibold tabular-nums">335</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 使用情况 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">使用情况</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Card className="border-border/50 bg-secondary/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">授权用户数</span>
                            <Badge variant="outline" className="text-primary">
                              <IconCheck className="mr-1 size-3" />
                              正常
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <div className="text-2xl font-semibold tabular-nums">156 / 200</div>
                            <div className="text-xs text-muted-foreground">已使用 / 授权数量</div>
                          </div>
                          <Progress value={78} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                      <Card className="border-border/50 bg-secondary/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">并发连接数</span>
                            <Badge variant="outline" className="text-primary">
                              <IconCheck className="mr-1 size-3" />
                              正常
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <div className="text-2xl font-semibold tabular-nums">89 / 150</div>
                            <div className="text-xs text-muted-foreground">当前连接 / 授权数量</div>
                          </div>
                          <Progress value={59} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                      <Card className="border-border/50 bg-secondary/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">发布应用数</span>
                            <Badge variant="outline" className="text-chart-4">
                              <IconAlertTriangle className="mr-1 size-3" />
                              接近上限
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <div className="text-2xl font-semibold tabular-nums">24 / 30</div>
                            <div className="text-xs text-muted-foreground">已发布 / 授权数量</div>
                          </div>
                          <Progress value={80} className="mt-2 h-2" />
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 授权信息 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">授权详情</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>授权编号</Label>
                        <div className="flex gap-2">
                          <Input readOnly defaultValue="ONYX-ENT-2024-XXXX-XXXX" className="flex-1 font-mono" />
                          <Button variant="outline" size="icon">
                            <IconCopy className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>授权给</Label>
                        <Input readOnly defaultValue="示例公司有限公司" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>授权日期</Label>
                        <Input readOnly defaultValue="2024-01-01" />
                      </div>
                      <div className="space-y-2">
                        <Label>到期日期</Label>
                        <Input readOnly defaultValue="2025-12-31" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 功能授权 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">功能授权</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {[
                        { name: "RemoteApp 发布", enabled: true },
                        { name: "用户管理", enabled: true },
                        { name: "连接策略", enabled: true },
                        { name: "LDAP/AD 集成", enabled: true },
                        { name: "双因素认证", enabled: true },
                        { name: "审计日志", enabled: true },
                        { name: "高可用集群", enabled: false },
                        { name: "API 访问", enabled: true },
                        { name: "自定义品牌", enabled: false },
                      ].map((feature) => (
                        <div key={feature.name} className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/30 p-3">
                          {feature.enabled ? (
                            <IconCheck className="size-4 text-primary" />
                          ) : (
                            <IconAlertTriangle className="size-4 text-muted-foreground" />
                          )}
                          <span className={feature.enabled ? "" : "text-muted-foreground"}>
                            {feature.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 授权更新 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">更新授权</h3>
                    <div className="space-y-4 rounded-lg border border-border/50 bg-secondary/30 p-4">
                      <p className="text-sm text-muted-foreground">
                        如需升级授权或增加用户数量，请联系销售人员获取新的授权文件。
                      </p>
                      <div className="space-y-2">
                        <Label>授权文件</Label>
                        <div className="flex gap-2">
                          <Input readOnly placeholder="选择授权文件 (.lic)" className="flex-1" />
                          <Button variant="outline" className="gap-2">
                            <IconUpload className="size-4" />
                            上传
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" className="gap-2">
                      <IconRefresh className="size-4" />
                      刷新状态
                    </Button>
                    <Button>应用授权</Button>
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
