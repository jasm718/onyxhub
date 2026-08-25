"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Zap, Shield, LineChart, Layers, Globe, Lock } from "lucide-react"

const features = [
  {
    icon: Zap,
    title: "硬件投入更低",
    description: "减少高性能工作站的重复采购，用更少的设备覆盖更多岗位，让预算投入更可控。",
    color: "teal",
    stat: "-70%",
    statLabel: "硬件成本"
  },
  {
    icon: Shield,
    title: "硬件资源利用率更高",
    description: "让现有电脑承担更多应用场景，减少设备闲置和重复建设，释放已有硬件的价值。",
    color: "coral",
    stat: "更高",
    statLabel: "设备利用率"
  },
  {
    icon: LineChart,
    title: "应用复用效率更高",
    description: "同一套应用可以分发给多个用户使用，减少重复部署和新增硬件采购。",
    color: "gold",
    stat: "分钟级",
    statLabel: "快速启用"
  },
  {
    icon: Layers,
    title: "维护工作更少",
    description: "减少逐台配置、排查和重复操作，让 IT 团队把时间投入到更重要的业务上。",
    color: "teal",
    stat: "更省",
    statLabel: "运维时间"
  },
  {
    icon: Globe,
    title: "协作体验更顺",
    description: "团队使用一致的应用环境，减少版本差异带来的沟通成本，让协作更加稳定流畅。",
    color: "coral",
    stat: "统一",
    statLabel: "协作环境"
  },
  {
    icon: Lock,
    title: "数据安全更稳",
    description: "重要数据集中管理且不在终端留存，减少泄漏风险，让企业更安心地开展业务。",
    color: "gold",
    stat: "-50%",
    statLabel: "泄漏风险"
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
            让每一份投入都更有价值
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            从成本、效率到安全，OnyxHub 把产品能力转化为看得见、可持续的经营价值。
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
