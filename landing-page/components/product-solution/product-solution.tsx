"use client"

import { motion, useInView } from "framer-motion"
import { Database, HardDrive, Wrench } from "lucide-react"
import { useEffect, useRef, useState } from "react"

type DrivePrice = { technology: "HDD" | "SSD"; price: number; currency: string; last_updated: string }

const drivePriceQueries = { SSD: "/api/hardware-prices?technology=SSD" }
const DDR5_REFERENCE_PRICE = 1536

function SolutionItem({ title, children }: { title: string; children: string }) {
  return <div><h3 className="mb-1 font-semibold text-foreground">{title}</h3><p className="text-sm leading-relaxed text-muted-foreground">{children}</p></div>
}

function PriceBubbles({ prices, loading, updatedAt, formatPrice }: { prices: Partial<Record<DrivePrice["technology"], number>>; loading: boolean; updatedAt: string | null; formatPrice: (price: number | undefined) => string }) {
  return <div className="mt-8"><div className="flex flex-wrap gap-3"><div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-2 shadow-sm"><HardDrive className="size-4 text-teal" /><span className="text-xs text-muted-foreground">SSD 500G</span><span className="text-lg font-bold tracking-tight text-coral">{loading ? "获取中…" : formatPrice(prices.SSD)}</span></div><div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-4 py-2 shadow-sm"><HardDrive className="size-4 text-teal" /><span className="text-xs text-muted-foreground">DDR5 16G</span><span className="text-lg font-bold tracking-tight text-coral">￥{DDR5_REFERENCE_PRICE.toLocaleString("zh-CN")}</span></div></div><p className="mt-2 text-xs text-muted-foreground">{updatedAt ? `更新时间：${new Date(updatedAt).toLocaleString("zh-CN")}` : "参考时间：当前市场价格"} · 数据来源：<a href="https://pricepergig.com/en/api" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">PricePerGig</a></p></div>
}

function IsometricComputer({ x, y, color, delay = 0 }: { x: number; y: number; color: string; delay?: number }) {
  return <motion.g initial={{ opacity: 0, scale: 0.72, y: 12 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }} transition={{ delay, type: "spring", stiffness: 140, damping: 18 }}>
    <motion.g animate={{ y: [0, -3, 0] }} transition={{ duration: 3.4, delay: delay * 0.4, repeat: Infinity, ease: "easeInOut" }}>
      <ellipse cx={x + 40} cy={y + 67} rx="38" ry="7" fill="hsl(220 26% 14% / .16)" />
      <circle cx={x + 40} cy={y + 34} r="44" fill={color} opacity=".08" />
      <svg x={x - 8} y={y - 12} width="118" height="105" viewBox="100 250 180 150" overflow="visible" aria-hidden="true">
        <use href="/onlineworld-amico.svg#freepik--Computer--inject-1--inject-252" />
      </svg>
    </motion.g>
  </motion.g>
}

function DeploymentScene() {
  return <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-muted/30 p-5 lg:min-h-[360px] lg:p-8">
    <motion.svg viewBox="0 0 520 320" className="w-full max-w-[560px] overflow-visible" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}>
      <defs><radialGradient id="deployGlow"><stop offset="0%" stopColor="hsl(174 62% 56%)" stopOpacity=".18" /><stop offset="100%" stopColor="hsl(174 62% 56%)" stopOpacity="0" /></radialGradient><filter id="deployBlur"><feGaussianBlur stdDeviation="4" /></filter></defs>
      <ellipse cx="260" cy="160" rx="220" ry="125" fill="url(#deployGlow)" />
      <motion.path d="M150 155 H270 M270 155 L355 85 M270 155 L355 155 M270 155 L355 225" stroke="hsl(174 62% 56% / .3)" strokeWidth="8" fill="none" filter="url(#deployBlur)" />
      <motion.path d="M150 155 H270 M270 155 L355 85 M270 155 L355 155 M270 155 L355 225" stroke="hsl(174 62% 56%)" strokeWidth="2" strokeDasharray="7 7" fill="none" initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.35 }} />
      {[0, 1, 2].map((i) => <motion.circle key={i} r="5" fill="white" stroke="hsl(174 62% 56%)" strokeWidth="2" initial={{ cx: 150, cy: 155 }} animate={{ cx: [150, 220, 270, 315, 355], cy: [155, 155, 155, 155 - (i - 1) * 70, 155 - (i - 1) * 70] }} transition={{ duration: 2.4, delay: i * 0.55, repeat: Infinity, ease: "linear" }} />)}
      <g><rect x="65" y="112" width="90" height="86" rx="14" fill="hsl(220 26% 18%)" /><rect x="78" y="128" width="64" height="12" rx="3" fill="hsl(220 26% 30%)" /><rect x="78" y="148" width="48" height="8" rx="3" fill="hsl(220 26% 30%)" /><circle cx="132" cy="178" r="5" fill="hsl(174 62% 56%)" /><text x="110" y="224" textAnchor="middle" fill="currentColor" className="text-[12px]">统一部署</text></g>
      {[85, 155, 225].map((y, i) => <g key={y}><rect x="355" y={y} width="100" height="56" rx="12" fill="hsl(0 0% 100% / .72)" stroke="hsl(220 26% 80% / .8)" /><circle cx="375" cy={y + 28} r="8" fill={i === 1 ? "hsl(355 70% 68%)" : "hsl(174 62% 56%)"} fillOpacity=".8" /><text x="392" y={y + 25} fill="currentColor" className="text-[11px]">用户 {String.fromCharCode(65 + i)}</text><text x="392" y={y + 40} fill="hsl(220 10% 45%)" className="text-[9px]">统一版本</text></g>)}
    </motion.svg>
  </div>
}

function DataBoundaryScene() {
  return <div className="relative flex min-h-[320px] items-center justify-center overflow-hidden rounded-3xl border border-border/80 bg-card p-5 shadow-sm lg:min-h-[360px] lg:p-8">
    <motion.svg viewBox="0 0 520 320" className="w-full max-w-[560px] overflow-visible" initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.7 }}>
      <defs><radialGradient id="dataGlow"><stop offset="0%" stopColor="hsl(174 62% 56%)" stopOpacity=".2" /><stop offset="100%" stopColor="hsl(174 62% 56%)" stopOpacity="0" /></radialGradient></defs>
      <ellipse cx="260" cy="150" rx="210" ry="130" fill="url(#dataGlow)" />
      <motion.path d="M260 150 L125 80 M260 150 L395 80 M260 150 L125 235 M260 150 L395 235" stroke="hsl(174 62% 56% / .4)" strokeWidth="2" strokeDasharray="5 7" fill="none" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }} />
      {[0, 1, 2, 3].map((i) => <motion.circle key={i} r="4" fill="hsl(174 62% 56%)" initial={{ cx: 260, cy: 150 }} animate={{ cx: [260, [125, 395, 125, 395][i]], cy: [150, [80, 80, 235, 235][i]] }} transition={{ duration: 2, delay: i * 0.45, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }} />)}
      <g><rect x="195" y="105" width="130" height="90" rx="18" fill="hsl(220 26% 18%)" stroke="hsl(174 62% 56% / .7)" strokeWidth="2" /><rect x="215" y="126" width="90" height="12" rx="3" fill="hsl(220 26% 30%)" /><rect x="215" y="148" width="65" height="8" rx="3" fill="hsl(220 26% 30%)" /><circle cx="297" cy="175" r="5" fill="hsl(174 62% 56%)" /><text x="260" y="220" textAnchor="middle" fill="currentColor" className="text-[11px]">集中存储</text></g>
      {[{ x: 70, y: 45, name: "用户 A" }, { x: 380, y: 45, name: "用户 B" }, { x: 70, y: 200, name: "用户 C" }, { x: 380, y: 200, name: "用户 D" }].map((item) => <g key={item.name}><rect x={item.x} y={item.y} width="80" height="44" rx="12" fill="hsl(0 0% 100% / .72)" stroke="hsl(220 26% 80% / .8)" /><text x={item.x + 40} y={item.y + 19} textAnchor="middle" fill="currentColor" className="text-[11px]">{item.name}</text><text x={item.x + 40} y={item.y + 34} textAnchor="middle" fill="hsl(220 10% 45%)" className="text-[9px]">数据隔离</text></g>)}
    </motion.svg>
  </div>
}

function IsometricDeploymentScene() {
  const upperConnectionPaths = [
    "M297.73,257.89l10-5.78a4.79,4.79,0,0,1,4.33,0L326,260.15",
    "M293.67,255.55l14.08-8.13a4.79,4.79,0,0,1,4.33,0L326,255.5",
    "M312.05,242.69L326,250.7",
    "M312.09,238.04L326,246.05",
  ]
  const serverConnectionPaths = [
    "M184,323.57l10-5.79a4.79,4.79,0,0,1,4.33,0l59.52,34.37a2.21,2.21,0,0,0,3.31-1.91",
    "M179.91,321.22,194,313.09a4.79,4.79,0,0,1,4.33,0l63.58,36.71a2.21,2.21,0,0,0,3.31-1.91",
    "M175.85,318.87,194,308.4a4.79,4.79,0,0,1,4.33,0L266,347.46a2.2,2.2,0,0,0,3.3-1.91",
    "M171.78,316.53,194,303.71a4.79,4.79,0,0,1,4.33,0L270,345.11a2.2,2.2,0,0,0,3.3-1.91",
  ]

  return <div className="relative flex min-h-[320px] items-center justify-center lg:min-h-[380px]">
    <motion.div className="relative flex w-full max-w-[580px] items-center justify-center" initial={{ opacity: 0, scale: 0.92, y: 14 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }}>
      <motion.div className="relative mx-auto w-full max-w-[500px]">
        <img src="/server-amico.svg" alt="服务器管理插画" className="relative z-10 block h-auto w-full object-contain" />
        <svg viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden="true">
          {upperConnectionPaths.map((path, i) => { const start = i < 2 ? i * .45 : 5.2 + (i - 2) * .45; return <circle key={`upper-${path}`} opacity="0" r="3.5" fill="white" stroke="hsl(174 62% 56%)" strokeWidth="1.5" filter="drop-shadow(0 0 4px hsl(174 62% 56% / .8))">
            <animateMotion path={path} dur="2.6s" begin={`${start}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.02;.24;.26;1" dur="10.4s" begin={`${start}s`} repeatCount="indefinite" />
          </circle> })}
          {serverConnectionPaths.map((path, i) => { const start = i < 2 ? 2 + i * .45 : 7.2 + (i - 2) * .45; return <circle key={`lower-${path}`} opacity="0" r="3.5" fill="white" stroke="hsl(174 62% 56%)" strokeWidth="1.5" filter="drop-shadow(0 0 4px hsl(174 62% 56% / .8))">
            <animateMotion path={path} dur="2.6s" begin={`${start}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.02;.24;.26;1" dur="10.4s" begin={`${start}s`} repeatCount="indefinite" />
          </circle> })}
        </svg>
      </motion.div>
    </motion.div>
  </div>
}

function IsometricDataScene() {
  const originalConnectionLines = [
    { x: [157, 245], y: [301, 301] },
    { x: [342, 253], y: [301, 301] },
    { x: [250, 250], y: [287, 309] },
  ]

  return <div className="relative flex min-h-[320px] items-center justify-center lg:min-h-[380px]">
    <motion.div className="relative flex w-full max-w-[580px] items-center justify-center" initial={{ opacity: 0, scale: 0.92, y: 14 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }}>
      <motion.div className="relative mx-auto w-full max-w-[500px]">
        <img src="/cloud-hosting-rafiki.svg" alt="云端数据管理插画" className="relative z-10 block h-auto w-full object-contain" />
        <svg viewBox="0 0 500 500" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible" aria-hidden="true">
          {originalConnectionLines.map((line, lineIndex) => <g key={lineIndex}>
            <motion.circle r="7" fill="hsl(174 62% 56% / .18)" initial={{ cx: line.x[0], cy: line.y[0], opacity: 0 }} animate={{ cx: line.x, cy: line.y, opacity: [0, .8, 0] }} transition={{ duration: 2.4, delay: lineIndex * .5, repeat: Infinity, ease: "linear" }} />
            <motion.circle r="2.7" fill="white" stroke="hsl(174 62% 56%)" strokeWidth="1.5" initial={{ cx: line.x[0], cy: line.y[0], opacity: 0 }} animate={{ cx: line.x, cy: line.y, opacity: [0, 1, 1, 0] }} transition={{ duration: 2.4, delay: lineIndex * .5, repeat: Infinity, ease: "linear" }} />
          </g>)}
        </svg>
      </motion.div>
    </motion.div>
  </div>
}

export function ProductSolution() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-120px" })
  const [drivePrices, setDrivePrices] = useState<Partial<Record<DrivePrice["technology"], number>>>({})
  const [priceUpdatedAt, setPriceUpdatedAt] = useState<string | null>(null)
  const [priceLoading, setPriceLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all((Object.entries(drivePriceQueries) as Array<[DrivePrice["technology"], string]>).map(async ([technology, url]) => {
      const response = await fetch(url, { signal: controller.signal, cache: "no-store" })
      if (!response.ok) throw new Error(`Price API request failed: ${response.status}`)
      const rows = (await response.json()) as DrivePrice[]
      const validRows = rows.filter((row) => row.technology === technology && Number.isFinite(row.price) && row.price > 0)
      return { technology, average: validRows.length ? validRows.reduce((sum, row) => sum + row.price, 0) / validRows.length : null, updatedAt: validRows.map((row) => row.last_updated).sort().at(-1) ?? null }
    })).then((results) => {
      const nextPrices: Partial<Record<DrivePrice["technology"], number>> = {}
      let latestUpdate: string | null = null
      results.forEach(({ technology, average, updatedAt }) => { if (average !== null) nextPrices[technology] = average; if (updatedAt && (!latestUpdate || updatedAt > latestUpdate)) latestUpdate = updatedAt })
      setDrivePrices(nextPrices); setPriceUpdatedAt(latestUpdate)
    }).catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setDrivePrices({}) }).finally(() => setPriceLoading(false))
    return () => controller.abort()
  }, [])

  const formatPrice = (price: number | undefined) => price === undefined ? "—" : `￥${Math.round(price * 7).toLocaleString("zh-CN")}`

  return <div id="product-solution" ref={ref} className="relative scroll-mt-20 overflow-hidden">
    <section className="relative bg-muted/30 py-20 lg:py-28">
      <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-coral/5" />
      <div className="container relative z-10 mx-auto px-6 lg:px-12"><div className="grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <motion.div initial={{ opacity: 0, x: -28 }} animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -28 }} transition={{ duration: 0.65 }} className="max-w-xl">
          <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-teal/10 text-teal"><HardDrive className="size-6" /></div>
          <h2 className="mb-5 text-3xl font-bold leading-tight text-foreground md:text-4xl">硬件成本<span className="text-teal">贵</span>？</h2>
          <p className="mb-8 text-lg leading-relaxed text-muted-foreground">不再为每个岗位重复采购高性能工作站。OnyxHub 通过轻量虚拟层、多人复用和集中管理，让现有设备发挥更大价值。</p>
          <div className="space-y-5"><SolutionItem title="轻虚拟层">依托 Windows 特性，几乎无性能损耗。</SolutionItem><SolutionItem title="多人复用">任意 Windows 电脑即可分发虚拟应用，供多人使用。</SolutionItem><SolutionItem title="高可用性">旧电脑即可运行，充分利用现有资源。</SolutionItem></div>
          <PriceBubbles prices={drivePrices} loading={priceLoading} updatedAt={priceUpdatedAt} formatPrice={formatPrice} />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 36, scale: 0.97 }} animate={isInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 36, scale: 0.97 }} transition={{ duration: 0.8, delay: 0.12 }} className="relative flex min-h-[320px] items-center justify-center lg:min-h-[380px]"><div className="relative w-full max-w-[390px]"><div className="pointer-events-none absolute left-1/2 top-1/2 size-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal/10 blur-3xl" /><img src="/consultative-sales-amico.svg" alt="OnyxHub 成本优化方案插画" className="relative z-10 block h-auto w-full object-contain drop-shadow-xl" /></div></motion.div>
      </div></div>
    </section>

    <section className="border-t border-border/60 bg-background py-20 lg:py-28"><div className="container mx-auto px-6 lg:px-12"><div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20"><motion.div initial={{ opacity: 0, x: -28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-120px" }} transition={{ duration: 0.65 }} className="order-2 lg:order-1"><IsometricDataScene /></motion.div><motion.div initial={{ opacity: 0, x: 28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-120px" }} transition={{ duration: 0.65, delay: 0.1 }} className="order-1 lg:order-2"><div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-teal/10 text-teal"><Database className="size-6" /></div><h2 className="mb-5 text-3xl font-bold leading-tight text-foreground md:text-4xl">数据有<span className="text-teal">泄漏</span>风险？</h2><p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">让应用数据和业务文件回到统一边界，集中存储、隔离访问，减少终端数据暴露风险。</p><div className="space-y-6"><SolutionItem title="数据集中">应用数据、图纸文件全部存放于应用服务器上。</SolutionItem><SolutionItem title="数据不落地">服务器数据不与客户端数据互通。</SolutionItem><SolutionItem title="数据分隔">用户数据相互隔离，彼此不互通。</SolutionItem></div></motion.div></div></div></section>

    <section className="border-t border-border/60 bg-muted/30 py-20 lg:py-28"><div className="container mx-auto px-6 lg:px-12"><div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20"><motion.div initial={{ opacity: 0, x: -28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-120px" }} transition={{ duration: 0.65 }}><div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-teal/10 text-teal"><Wrench className="size-6" /></div><h2 className="mb-5 text-3xl font-bold leading-tight text-foreground md:text-4xl">IT维护太<span className="text-teal">费力</span>？</h2><p className="mb-8 max-w-lg text-lg leading-relaxed text-muted-foreground">减少重复部署和逐台维护，让应用交付更简单，团队始终使用统一版本。</p><div className="grid gap-6 sm:grid-cols-2"><SolutionItem title="部署简单">一键安装、卸载，部署即用。</SolutionItem><SolutionItem title="版本统一">多用户使用统一版本应用。</SolutionItem></div></motion.div><motion.div initial={{ opacity: 0, x: 28 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-120px" }} transition={{ duration: 0.65, delay: 0.1 }}><IsometricDeploymentScene /></motion.div></div></div></section>
  </div>
}


