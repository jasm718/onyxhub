"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Star } from "lucide-react"

const testimonials = [
  {
    quote: "我们使用OnyxHub，将一台原有的高配置电脑给7-8个人使用，专门运行大型设计软件，节省了不少成本。",
    author: "陈先生",
    role: "上海某企业IT维护部门负责人",
    avatar: "陈",
    color: "bg-teal",
  },
  {
    quote: "虚拟应用的体验感跟原生应用区别不大，且能够将图纸统一存放，配合原有已有的加密软件效果可以的。",
    author: "李先生",
    role: "杭州某设计院IT运维主管",
    avatar: "李",
    color: "bg-coral",
  },
  {
    quote: "出差时候也能用到公司的高性能工作站，再也不需要用笔记本画图了",
    author: "王女士",
    role: "合肥某芯片设计制造企业员工",
    avatar: "王",
    color: "bg-gold",
  },
]

export function TestimonialsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="testimonials" ref={ref} className="scroll-mt-20 py-24 lg:py-32 bg-muted/30 relative overflow-hidden">
      {/* Subtle background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal/5 via-transparent to-coral/5" />

      <div className="container mx-auto px-6 lg:px-12 relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-medium mb-4">
            客户声音
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 text-balance">
            被认真做事的{" "}
            <span className="text-teal">团队所选择</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            听见来自不同领域的真实声音，感受 OnyxHub 带来的改变。
          </p>
        </motion.div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-card border border-border rounded-2xl p-8 relative"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-foreground leading-relaxed mb-6">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full ${testimonial.color} flex items-center justify-center text-foreground text-sm font-medium`}>
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-medium text-foreground">{testimonial.author}</div>
                  <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
