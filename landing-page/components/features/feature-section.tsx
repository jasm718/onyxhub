"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Zap, Shield, LineChart, Layers, Globe, Lock } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "数据集中存储",
    description: "将业务数据统一沉淀在集中环境中，减少分散存储，让重要信息更容易管理与维护。",
    color: "teal",
    stat: "集中",
    statLabel: "统一沉淀"
  },
  {
    icon: Shield,
    title: "终端不落地",
    description: "数据不在终端设备留存，降低设备遗留信息带来的管理负担，让使用过程更加轻盈。",
    color: "coral",
    stat: "不落地",
    statLabel: "轻量使用"
  },
  {
    icon: LineChart,
    title: "统一管控",
    description: "围绕集中数据建立清晰的管理边界，让信息流转、使用与维护都更加有序。",
    color: "gold",
    stat: "统一",
    statLabel: "清晰可控"
  },
  {
    icon: Layers,
    title: "减少设备投入",
    description: "不再为每个使用场景重复配置高规格设备，以更合理的方式满足企业实际需求。",
    color: "teal",
    stat: "精简",
    statLabel: "硬件投入"
  },
  {
    icon: Globe,
    title: "提升资源利用率",
    description: "让现有资源服务更多业务场景，减少闲置与重复建设，释放企业已有投入的价值。",
    color: "coral",
    stat: "高效",
    statLabel: "资源复用"
  },
  {
    icon: Lock,
    title: "控制长期成本",
    description: "从设备采购、维护到扩展，持续减少不必要的支出，让企业预算更可控、增长更从容。",
    color: "gold",
    stat: "可控",
    statLabel: "长期成本"
  },
]

const colorClasses = {
  teal: {
    bg: "bg-teal/10",
    text: "text-teal",
    border: "border-teal/20",
    glow: "shadow-teal/5"
  },
  coral: {
    bg: "bg-coral/10",
    text: "text-coral",
    border: "border-coral/20",
    glow: "shadow-coral/5"
  },
  gold: {
    bg: "bg-gold/10",
    text: "text-gold",
    border: "border-gold/20",
    glow: "shadow-gold/5"
  },
}

function FeatureCard({ feature, index }: { feature: typeof features[0]; index: number }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const colors = colorClasses[feature.color as keyof typeof colorClasses]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className={`group relative p-6 rounded-2xl bg-card border border-border hover:border-${feature.color}/30 transition-all duration-300 hover:shadow-xl ${colors.glow}`}
    >
      {/* Icon */}
      <div className={`w-12 h-12 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
        <feature.icon className="w-6 h-6" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
      <p className="text-muted-foreground leading-relaxed mb-4">{feature.description}</p>

      {/* Stat */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${colors.bg} ${colors.border} border`}>
        <span className={`text-sm font-bold ${colors.text}`}>{feature.stat}</span>
        <span className="text-xs text-muted-foreground">{feature.statLabel}</span>
      </div>

      {/* Hover glow effect */}
      <div className={`absolute inset-0 rounded-2xl ${colors.bg} opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10 blur-xl`} />
    </motion.div>
  )
}

export function FeatureSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Angled divider top */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-background transform -skew-y-2 origin-top-left -translate-y-12" />

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        {/* Section header */}
        <motion.div
          ref={sectionRef}
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-4">
            核心价值
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
            为每一次重要的{" "}
            <span className="text-teal">突破而生</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            从数据管理到资源投入，OnyxHub 聚焦企业最重要的现实问题：
            让信息更集中，让成本更可控，让组织走向更高质量的增长。
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>

      {/* Angled divider bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-background transform skew-y-2 origin-bottom-right translate-y-12" />
    </section>
  )
}
