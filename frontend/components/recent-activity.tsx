"use client"

import { 
  IconApps, 
  IconLogin, 
  IconLogout, 
  IconSettings, 
  IconUserPlus,
  IconNetwork
} from "@tabler/icons-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const activities = [
  {
    id: 1,
    type: "login",
    user: "张三",
    application: "Microsoft Word",
    time: "2 分钟前",
    icon: IconLogin,
    color: "text-primary",
  },
  {
    id: 2,
    type: "logout",
    user: "李四",
    application: "Adobe Photoshop",
    time: "5 分钟前",
    icon: IconLogout,
    color: "text-muted-foreground",
  },
  {
    id: 3,
    type: "new_user",
    user: "王五",
    application: null,
    time: "10 分钟前",
    icon: IconUserPlus,
    color: "text-chart-2",
  },
  {
    id: 4,
    type: "app_publish",
    user: "管理员",
    application: "Visual Studio Code",
    time: "1 小时前",
    icon: IconApps,
    color: "text-chart-3",
  },
  {
    id: 5,
    type: "policy_update",
    user: "管理员",
    application: "开发组策略",
    time: "2 小时前",
    icon: IconNetwork,
    color: "text-chart-4",
  },
  {
    id: 6,
    type: "settings",
    user: "管理员",
    application: "系统设置",
    time: "3 小时前",
    icon: IconSettings,
    color: "text-muted-foreground",
  },
]

function getActivityDescription(activity: typeof activities[0]) {
  switch (activity.type) {
    case "login":
      return `${activity.user} 连接到 ${activity.application}`
    case "logout":
      return `${activity.user} 断开 ${activity.application}`
    case "new_user":
      return `新用户 ${activity.user} 已注册`
    case "app_publish":
      return `${activity.user} 发布了 ${activity.application}`
    case "policy_update":
      return `${activity.user} 更新了 ${activity.application}`
    case "settings":
      return `${activity.user} 修改了 ${activity.application}`
    default:
      return `${activity.user} 执行了操作`
  }
}

export function RecentActivity() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle>最近活动</CardTitle>
        <CardDescription>系统最近的操作记录</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-4">
              <div className={`flex size-9 items-center justify-center rounded-lg bg-secondary ${activity.color}`}>
                <activity.icon className="size-4" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {getActivityDescription(activity)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
