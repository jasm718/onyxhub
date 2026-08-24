"use client"

import { motion, useInView } from "framer-motion"
import { Check, LayoutDashboard, UsersRound } from "lucide-react"
import { useRef } from "react"

export function ProductSolution() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-120px" })

  return (
    <section ref={ref} className="relative overflow-hidden bg-muted/30 py-24 lg:py-32">
      <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-coral/5" />
      <div className="container relative z-10 mx-auto px-6 lg:px-12">
        <div className="grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <motion.div initial={{ opacity: 0, x: -28 }} animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -28 }} transition={{ duration: 0.65 }} className="max-w-xl">
            <span className="mb-5 inline-block rounded-full bg-muted px-4 py-1.5 text-sm font-medium text-muted-foreground">产品方案</span>
            <h2 className="mb-6 text-3xl font-bold leading-tight text-foreground text-balance md:text-4xl lg:text-5xl">让复杂的管理，变得<span className="text-teal">简单而优雅</span></h2>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">OnyxHub 将统一管理与顺畅使用融为一体，帮助企业用更少的投入，创造更多的价值。</p>

            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal"><LayoutDashboard className="size-5" /></div>
                <div><h3 className="mb-1 font-semibold text-foreground">管理者，一眼掌握全局</h3><p className="text-sm leading-relaxed text-muted-foreground">应用、用户与运行状态集中呈现，管理清晰，决策从容。</p></div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral/10 text-coral"><UsersRound className="size-5" /></div>
                <div><h3 className="mb-1 font-semibold text-foreground">用户，打开即用</h3><p className="text-sm leading-relaxed text-muted-foreground">统一入口访问所需应用，让工作体验始终稳定、顺畅。</p></div>
              </div>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {["数据集中存储", "终端不落地", "多用户应用复用"].map((item) => <span key={item} className="inline-flex items-center gap-2"><Check className="size-4 text-teal" />{item}</span>)}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 36, scale: 0.97 }} animate={isInView ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: 36, scale: 0.97 }} transition={{ duration: 0.8, delay: 0.12 }} className="relative min-h-[420px] sm:min-h-[520px] lg:min-h-[580px]">
            <div className="absolute right-0 top-10 z-0 w-[78%] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-foreground/10 transition-transform duration-500 hover:-translate-y-2 sm:w-[76%] lg:w-[70%]">
              <img src="/page1.png" alt="OnyxHub 管理后台仪表盘" className="block w-full" />
            </div>
            <div className="absolute left-0 top-[30%] z-10 w-[62%] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-foreground/15 transition-transform duration-500 hover:translate-y-2 sm:w-[60%] lg:w-[58%]">
              <img src="/page2.png" alt="OnyxHub 用户端登录界面" className="block w-full" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
