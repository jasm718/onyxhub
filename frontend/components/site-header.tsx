"use client"

import { usePathname } from 'next/navigation'
import { IconSearch } from '@tabler/icons-react'
import { NotificationCenter } from '@/components/notification-center'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

const pageTitles: Record<string, string> = {
  '/dashboard': '仪表盘',
  '/dashboard/activity-logs': '活动日志',
  '/dashboard/applications': '应用管理',
  '/dashboard/users': '用户管理',
  '/dashboard/settings/storage': '存储设置',
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
          className="mx-2 self-center data-[orientation=vertical]:h-4 data-[orientation=vertical]:self-center"
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
          <NotificationCenter />
        </div>
      </div>
    </header>
  )
}
