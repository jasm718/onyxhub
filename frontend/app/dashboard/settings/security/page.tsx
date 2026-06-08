"use client"

import * as React from "react"
import { 
  IconShield,
  IconLock,
  IconKey,
  IconRefresh,
  IconCheck,
  IconAlertTriangle
} from "@tabler/icons-react"

import { AppSidebar } from '@/components/app-sidebar'
import { SiteHeader } from '@/components/site-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
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

export default function SecuritySettingsPage() {
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
                    <IconShield className="size-5 text-primary" />
                    安全设置
                  </CardTitle>
                  <CardDescription>配置系统安全策略和访问控制</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 安全状态 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">安全状态</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
                        <IconCheck className="size-5 text-primary" />
                        <div>
                          <div className="text-sm font-medium">SSL/TLS</div>
                          <div className="text-xs text-muted-foreground">已启用</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
                        <IconCheck className="size-5 text-primary" />
                        <div>
                          <div className="text-sm font-medium">双因素认证</div>
                          <div className="text-xs text-muted-foreground">已启用</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
                        <IconAlertTriangle className="size-5 text-chart-4" />
                        <div>
                          <div className="text-sm font-medium">IP 白名单</div>
                          <div className="text-xs text-muted-foreground">未配置</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary/30 p-3">
                        <IconCheck className="size-5 text-primary" />
                        <div>
                          <div className="text-sm font-medium">审计日志</div>
                          <div className="text-xs text-muted-foreground">已启用</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 认证设置 */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <IconLock className="size-4" />
                      认证设置
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>认证方式</Label>
                        <Select defaultValue="ldap">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="local">本地认证</SelectItem>
                            <SelectItem value="ldap">LDAP/AD</SelectItem>
                            <SelectItem value="oauth">OAuth 2.0</SelectItem>
                            <SelectItem value="saml">SAML</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>会话超时 (分钟)</Label>
                        <Input type="number" defaultValue="480" />
                      </div>
                    </div>
                    <div className="space-y-4 rounded-lg border border-border/50 bg-secondary/30 p-4">
                      <h4 className="text-sm font-medium">LDAP 配置</h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>服务器地址</Label>
                          <Input defaultValue="ldap.company.com" />
                        </div>
                        <div className="space-y-2">
                          <Label>端口</Label>
                          <Input type="number" defaultValue="389" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Base DN</Label>
                        <Input defaultValue="dc=company,dc=com" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>绑定用户</Label>
                          <Input defaultValue="cn=admin,dc=company,dc=com" />
                        </div>
                        <div className="space-y-2">
                          <Label>绑定密码</Label>
                          <Input type="password" defaultValue="********" />
                        </div>
                      </div>
                      <Button variant="outline" size="sm">测试连接</Button>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 密码策略 */}
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-2 text-sm font-medium">
                      <IconKey className="size-4" />
                      密码策略
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>最小密码长度</Label>
                        <Input type="number" defaultValue="8" />
                      </div>
                      <div className="space-y-2">
                        <Label>密码有效期 (天)</Label>
                        <Input type="number" defaultValue="90" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox id="require-uppercase" defaultChecked />
                        <Label htmlFor="require-uppercase" className="font-normal">要求包含大写字母</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="require-lowercase" defaultChecked />
                        <Label htmlFor="require-lowercase" className="font-normal">要求包含小写字母</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="require-number" defaultChecked />
                        <Label htmlFor="require-number" className="font-normal">要求包含数字</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="require-special" defaultChecked />
                        <Label htmlFor="require-special" className="font-normal">要求包含特殊字符</Label>
                      </div>
                    </div>
                  </div>
                  
                  <Separator className="bg-border/50" />
                  
                  {/* 登录限制 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">登录限制</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>最大登录失败次数</Label>
                        <Input type="number" defaultValue="5" />
                      </div>
                      <div className="space-y-2">
                        <Label>锁定时间 (分钟)</Label>
                        <Input type="number" defaultValue="30" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox id="enable-2fa" defaultChecked />
                        <Label htmlFor="enable-2fa" className="font-normal">启用双因素认证</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="enable-captcha" />
                        <Label htmlFor="enable-captcha" className="font-normal">启用验证码</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id="single-session" />
                        <Label htmlFor="single-session" className="font-normal">限制单一会话登录</Label>
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
  )
}
