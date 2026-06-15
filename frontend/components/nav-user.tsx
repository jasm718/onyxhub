"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  IconDotsVertical,
  IconKey,
  IconLogout,
} from "@tabler/icons-react"
import { toast } from "sonner"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { api } from "@/lib/api"
import { clearAuth, getAuthUser, type AdminUser } from "@/lib/auth"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [currentUser, setCurrentUser] = React.useState(user)
  const [authUser, setAuthUser] = React.useState<AdminUser | null>(null)
  const [passwordOpen, setPasswordOpen] = React.useState(false)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  React.useEffect(() => {
    const storedUser = getAuthUser()
    if (storedUser) {
      setAuthUser(storedUser)
      setCurrentUser({
        name: storedUser.displayName || storedUser.username,
        email: storedUser.username,
        avatar: "",
      })
    }
  }, [])

  function handleLogout() {
    clearAuth()
    router.replace("/login")
  }

  function handlePasswordOpenChange(open: boolean) {
    setPasswordOpen(open)
    if (!open) {
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!authUser) {
      toast.error("未获取到当前管理员信息")
      return
    }
    if (!currentPassword) {
      toast.error("请输入当前密码")
      return
    }
    if (!newPassword) {
      toast.error("请输入新密码")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致")
      return
    }

    setSubmitting(true)
    try {
      await api.login(authUser.username, currentPassword)
      await api.updateUser({
        id: authUser.id,
        username: authUser.username,
        displayName: authUser.displayName,
        role: authUser.role,
        status: authUser.status,
        password: newPassword,
      })
      toast.success("密码已修改，请重新登录")
      setPasswordOpen(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      window.setTimeout(() => {
        clearAuth()
        router.replace("/login")
      }, 800)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <div className="flex h-12 w-full items-center gap-2 rounded-md p-2 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="rounded-lg">
                  {currentUser.name.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{currentUser.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {currentUser.email}
                </span>
              </div>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <IconDotsVertical className="size-4" />
                <span className="sr-only">打开管理员菜单</span>
              </button>
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="rounded-lg">
                    {currentUser.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{currentUser.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {currentUser.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                <IconKey />
                修改密码
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <IconLogout />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={passwordOpen} onOpenChange={handlePasswordOpenChange}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>修改密码</DialogTitle>
              <DialogDescription>
                修改成功后需要重新登录管理后台
              </DialogDescription>
            </DialogHeader>
            <form className="mt-6 space-y-4" onSubmit={handleChangePassword}>
              <div className="space-y-2">
                <Label htmlFor="current-password">当前密码</Label>
                <Input
                  id="current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
