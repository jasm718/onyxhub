import { ActivityLogsPage } from "@/components/activity-logs-page"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const params = await searchParams

  return <ActivityLogsPage initialFilter={params.filter ?? "all"} />
}
