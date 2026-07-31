"use client"

import * as React from "react"
import { IconRefresh, IconServer } from "@tabler/icons-react"
import { toast } from "sonner"

import { DashboardShell } from "@/components/dashboard-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { api, type SystemSettings } from "@/lib/api"

type FormState = {
  storageRootPath: string
  storageQuotaMb: string
  storageVisibleDriveLetter: string
  rdpLocalDriveMappingEnabled: boolean
  disconnectedSessionLogoffMinutes: string
}

const emptyForm: FormState = {
  storageRootPath: "",
  storageQuotaMb: "0",
  storageVisibleDriveLetter: "H",
  rdpLocalDriveMappingEnabled: false,
  disconnectedSessionLogoffMinutes: "0",
}

function toForm(settings: SystemSettings): FormState {
  return {
    storageRootPath: settings.storageRootPath || "",
    storageQuotaMb: String(settings.storageQuotaMb ?? 0),
    storageVisibleDriveLetter: settings.storageVisibleDriveLetter || "H",
    rdpLocalDriveMappingEnabled: settings.rdpLocalDriveMappingEnabled,
    disconnectedSessionLogoffMinutes: String(settings.disconnectedSessionLogoffMinutes ?? 0),
  }
}

export default function StorageSettingsPage() {
  const [form, setForm] = React.useState<FormState>(emptyForm)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)

  async function loadSettings() {
    setLoading(true)
    try {
      const settings = await api.systemSettings()
      setForm(toForm(settings))
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    loadSettings()
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const settings = await api.updateSystemSettings({
        storageRootPath: form.storageRootPath,
        storageQuotaMb: Number(form.storageQuotaMb),
        storageVisibleDriveLetter: form.storageVisibleDriveLetter,
        rdpLocalDriveMappingEnabled: form.rdpLocalDriveMappingEnabled,
        disconnectedSessionLogoffMinutes: Number(form.disconnectedSessionLogoffMinutes),
      })
      setForm(toForm(settings))
      toast.success("设置已保存")
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardShell>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-6">
            <Card className="border-border/50 bg-card/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconServer className="size-5 text-primary" />
                  存储设置
                </CardTitle>
                <CardDescription>配置用户存储隔离和断开会话清理</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="storageRootPath">存储根目录</Label>
                    <Input
                      id="storageRootPath"
                      disabled={loading}
                      value={form.storageRootPath}
                      onChange={(event) => setForm({ ...form, storageRootPath: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="storageQuotaMb">用户配额 MB</Label>
                      <Input
                        id="storageQuotaMb"
                        type="number"
                        min={0}
                        disabled={loading}
                        value={form.storageQuotaMb}
                        onChange={(event) => setForm({ ...form, storageQuotaMb: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>可见盘符</Label>
                      <Select
                        disabled={loading}
                        value={form.storageVisibleDriveLetter}
                        onValueChange={(value) => setForm({ ...form, storageVisibleDriveLetter: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {"HIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
                            <SelectItem key={letter} value={letter}>
                              {letter}:
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                      <Label htmlFor="rdpLocalDriveMappingEnabled">RDP 本地磁盘映射</Label>
                      <Switch
                        id="rdpLocalDriveMappingEnabled"
                        checked={form.rdpLocalDriveMappingEnabled}
                        onCheckedChange={(checked) =>
                          setForm({ ...form, rdpLocalDriveMappingEnabled: Boolean(checked) })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="disconnectedSessionLogoffMinutes">断开会话清理分钟</Label>
                      <Input
                        id="disconnectedSessionLogoffMinutes"
                        type="number"
                        min={0}
                        disabled={loading}
                        value={form.disconnectedSessionLogoffMinutes}
                        onChange={(event) =>
                          setForm({ ...form, disconnectedSessionLogoffMinutes: event.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">填写 0 表示关闭断开会话自动清理。</p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" className="gap-2" onClick={loadSettings} disabled={loading || submitting}>
                      <IconRefresh className="size-4" />
                      重载
                    </Button>
                    <Button type="submit" disabled={loading || submitting}>
                      {submitting ? "保存中..." : "保存设置"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
