"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"

export function CTASection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="contact" ref={ref} className="scroll-mt-20 py-24 lg:py-32 relative overflow-hidden">
      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl bg-foreground p-12 lg:p-20 overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-coral/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10 max-w-3xl mx-auto text-center">
            {/* Headline */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-background mb-6 text-balance"
            >
              准备好让你的组织{" "}
              <span className="text-teal">更进一步</span>了吗？
            </motion.h2>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg text-background/70 mb-10 leading-relaxed"
            >
              与 OnyxHub 联系，了解如何减少软硬件成本，并做到数据集中存储不落地，
              让每一次投资都沉淀为长期价值。
            </motion.p>

            {/* Contact QR code */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col items-center gap-3"
            >
              <img
                src="/contact-qrcode.png"
                alt="OnyxHub 联系方式二维码"
                className="size-36 rounded-xl bg-white p-2 shadow-lg sm:size-40"
              />
              <span className="text-sm text-background/70">企业微信扫码添加，获取演示、demo和报价</span>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-background/50 text-sm"
            >
              <span>专业团队为您服务</span>
              <span className="hidden sm:inline">•</span>
              <span>共创长期价值</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
