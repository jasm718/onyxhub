"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconApps,
  IconChartBar,
  IconHistory,
  IconServer,
  IconUsers,
} from "@tabler/icons-react"

import { NavUser } from '@/components/nav-user'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const data = {
  user: {
    name: "管理员",
    email: "admin@onyxhub.local",
    avatar: "",
  },
  navMain: [
    {
      title: "仪表盘",
      url: "/dashboard",
      icon: IconChartBar,
    },
    {
      title: "应用管理",
      url: "/dashboard/applications",
      icon: IconApps,
    },
    {
      title: "用户管理",
      url: "/dashboard/users",
      icon: IconUsers,
    },
    {
      title: "活动日志",
      url: "/dashboard/activity-logs",
      icon: IconHistory,
    },
  ],
  navSettings: [
    {
      title: "存储设置",
      url: "/dashboard/settings/storage",
      icon: IconServer,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="h-10 data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                <img src="/brand/onyxhub-logo-32.png" alt="OnyxHub" className="size-8 object-contain" />
                <div className="flex flex-col">
                  <span className="text-base font-semibold">OnyxHub</span>
                  <span className="text-xs text-muted-foreground">应用虚拟化管理平台</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title}
                    isActive={pathname === item.url}
                    className="h-8 hover:bg-primary/10 hover:text-foreground active:bg-primary/10 active:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-foreground"
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>设置</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {data.navSettings.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    tooltip={item.title}
                    isActive={pathname === item.url}
                    className="h-8 hover:bg-primary/10 hover:text-foreground active:bg-primary/10 active:text-foreground data-[active=true]:bg-primary/10 data-[active=true]:text-foreground"
                  >
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
