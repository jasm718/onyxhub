"use client"

import * as React from "react"
import { toast } from "sonner"

import { AgentMetricCharts } from "@/components/agent-metric-charts"
import { ActiveConnectionChart } from "@/components/chart-area-interactive"
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
    <DashboardShell>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {loading || !overview ? (
              <div className="px-4 lg:px-6">
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    正在加载仪表盘数据...
                  </CardContent>
                </Card>
              </div>
            ) : (
              <>
                <SectionCards cards={overview.cards} />
                <AgentMetricCharts metrics={overview.agentMetrics} cards={overview.cards} />
                <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
                  <div className="lg:col-span-2">
                    <ActiveConnectionChart data={overview.activeConnections} />
                  </div>
                  <div>
                    <ConnectionDurationStats stats={overview.connectionDurationStats} />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
