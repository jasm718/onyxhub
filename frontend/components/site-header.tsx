"use client"

import { usePathname } from 'next/navigation'
import { IconBell, IconSearch } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

const pageTitles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/dashboard/applications': '应用管理',
  '/dashboard/users': '用户管理',
  '/dashboard/policies': '连接策略',
  '/dashboard/settings/general': '通用设置',
  '/dashboard/settings/storage': '存储设置',
  '/dashboard/settings/security': '安全设置',
  '/dashboard/settings/license': '授权',
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = pageTitles[pathname] || '仪表盘'

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/50 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative hidden md:block">
            <IconSearch className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="搜索..." 
              className="w-64 bg-secondary/50 pl-9 focus:bg-secondary" 
            />
          </div>
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="relative">
            <IconBell className="size-5" />
            <span className="absolute right-1 top-1 size-2 rounded-full bg-primary" />
            <span className="sr-only">通知</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
