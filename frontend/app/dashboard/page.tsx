"use client"

import * as React from "react"
import { toast } from "sonner"

import { AgentMetricCharts } from "@/components/agent-metric-charts"
import { ActiveConnectionTable } from "@/components/chart-area-interactive"
import { ConnectionDurationStats } from "@/components/connection-duration-stats"
import { DashboardShell } from "@/components/dashboard-shell"
import { SectionCards } from "@/components/section-cards"
import { Card, CardContent } from "@/components/ui/card"
import { api, type Overview } from "@/lib/api"

export default function Page() {
  const [overview, setOverview] = React.useState<Overview | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    async function loadOverview() {
      try {
        const data = await api.overview()
        if (!cancelled) {
          setOverview(data)
        }
      } catch (error) {
        if (!cancelled) {
          toast.error((error as Error).message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadOverview()
    const timer = window.setInterval(loadOverview, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  return (
    <DashboardShell insetClassName="md:h-[calc(100svh-1rem)] md:min-h-0 md:overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col md:h-[calc(100%-var(--header-height))] md:overflow-hidden">
        <div className="@container/main flex min-h-0 flex-1 flex-col md:overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-3 py-3 md:gap-4 md:overflow-hidden md:py-4">
            {loading || !overview ? (
              <div className="px-4 lg:px-6">
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    正在加载仪表盘数据...
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3 md:gap-4 md:overflow-hidden">
                <SectionCards cards={overview.cards} />
                <AgentMetricCharts metrics={overview.agentMetrics} cards={overview.cards} />
                <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 px-4 md:overflow-hidden lg:grid-cols-2 lg:px-6 [&>*]:min-h-0">
                  <ActiveConnectionTable data={overview.activeConnections} />
                  <ConnectionDurationStats stats={overview.connectionDurationStats} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
