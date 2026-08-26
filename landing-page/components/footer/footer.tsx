"use client"

import { motion } from "framer-motion"

export function Footer() {
  return (
    <footer className="bg-foreground py-7 text-background">
      <div className="container mx-auto px-6 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3">
                <img src="/brand/onyxhub-logo-32.png" alt="OnyxHub" className="size-8 rounded-lg" />
                <span className="text-xl font-bold">OnyxHub</span>
                <span className="hidden text-sm text-background/55 md:inline">更少成本，更多价值。</span>
              </div>
          </motion.div>

          <p className="text-xs text-background/45">&copy; {new Date().getFullYear()} OnyxHub. 保留所有权利。</p>
        </div>
      </div>
    </footer>
  )
}
