"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"

import { getAuthToken } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const token = getAuthToken()
    if (!token) {
      const next = encodeURIComponent(pathname || "/dashboard")
      router.replace(`/login?next=${next}`)
      return
    }
    setReady(true)
  }, [pathname, router])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        正在检查登录状态...
      </div>
    )
  }

  return <>{children}</>
}
