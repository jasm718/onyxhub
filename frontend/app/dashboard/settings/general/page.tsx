"use client"

import * as React from "react"
import { 
  IconDeviceDesktop,
  IconSettings,
  IconBrandWindows,
  IconNetwork,
  IconRefresh
} from "@tabler/icons-react"

import { AuthGuard } from '@/components/auth-guard'
import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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

export default function GeneralSettingsPage() {
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
                    <IconSettings className="size-5 text-primary" />
                    通用设置
                  </CardTitle>
                  <CardDescription>配置平台基本信息和系统参数</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 平台信息 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">平台信息</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="platform-name">平台名称</Label>
                        <Input id="platform-name" defaultValue="OnyxHub" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="platform-url">访问地址</Label>
                        <Input id="platform-url" defaultValue="https://remoteapp.company.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="platform-desc">平台描述</Label>
                      <Input id="platform-desc" defaultValue="企业远程应用分发平台" />
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 服务器配置 */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <IconDeviceDesktop className="size-4" />
                      服务器配置
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="server-host">服务器地址</Label>
                        <Input id="server-host" defaultValue="192.168.1.100" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="server-port">RDP 端口</Label>
                        <Input id="server-port" type="number" defaultValue="3389" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="gateway-host">网关地址</Label>
                        <Input id="gateway-host" defaultValue="gateway.company.com" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gateway-port">网关端口</Label>
                        <Input id="gateway-port" type="number" defaultValue="443" />
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 远程桌面设置 */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <IconBrandWindows className="size-4" />
                      RemoteApp 设置
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>默认颜色深度</Label>
                        <Select defaultValue="32">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="16">16 位</SelectItem>
                            <SelectItem value="24">24 位</SelectItem>
                            <SelectItem value="32">32 位</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>默认分辨率</Label>
                        <Select defaultValue="fullscreen">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1024x768">1024 x 768</SelectItem>
                            <SelectItem value="1280x720">1280 x 720</SelectItem>
                            <SelectItem value="1920x1080">1920 x 1080</SelectItem>
                            <SelectItem value="fullscreen">全屏</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>音频重定向</Label>
                        <Select defaultValue="local">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">本地播放</SelectItem>
                            <SelectItem value="remote">远程播放</SelectItem>
                            <SelectItem value="disabled">禁用</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>打印机重定向</Label>
                        <Select defaultValue="enabled">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="enabled">启用</SelectItem>
                            <SelectItem value="disabled">禁用</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 网络设置 */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <IconNetwork className="size-4" />
                      网络设置
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>连接超时 (秒)</Label>
                        <Input type="number" defaultValue="30" />
                      </div>
                      <div className="space-y-2">
                        <Label>心跳间隔 (秒)</Label>
                        <Input type="number" defaultValue="60" />
                      </div>
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
