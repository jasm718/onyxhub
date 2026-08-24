"use client"

import { motion } from "framer-motion"
import { Github, Twitter, Linkedin, Youtube } from "lucide-react"

const footerLinks = {
  产品理念: ["核心价值", "品牌主张", "客户声音", "联系我们"],
  关于我们: ["关于 OnyxHub", "品牌故事", "合作伙伴", "加入我们"],
  联系方式: ["商务合作", "客户咨询", "媒体联系", "意见反馈"],
  关注我们: ["微信公众号", "视频号", "官方社区", "最新动态"],
}

const socialLinks = [
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Youtube, href: "#", label: "YouTube" },
]

export function Footer() {
  return (
    <footer className="bg-foreground text-background pt-20 pb-8">
      <div className="container mx-auto px-6 lg:px-12">
        {/* Main footer content */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1 mb-8 lg:mb-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              {/* Logo */}
              <div className="flex items-center gap-2 mb-4">
                <img src="/brand/onyxhub-logo-32.png" alt="OnyxHub" className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold">OnyxHub</span>
              </div>
              <p className="text-background/60 text-sm leading-relaxed mb-6 max-w-xs">
                以更先进的理念连接人与工作，
                让每一次协作都更有价值。
              </p>
              {/* Social links */}
              <div className="flex gap-4">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center text-background/60 hover:bg-background/20 hover:text-background transition-colors"
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links], index) => (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <h4 className="font-semibold text-sm mb-4 text-background">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm text-background/60 hover:text-teal transition-colors"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-background/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-background/50">
              &copy; {new Date().getFullYear()} OnyxHub. 保留所有权利。
            </p>
            <div className="flex items-center gap-6 text-sm text-background/50">
              <a href="#" className="hover:text-background transition-colors">
                隐私政策
              </a>
              <a href="#" className="hover:text-background transition-colors">
                服务条款
              </a>
              <a href="#" className="hover:text-background transition-colors">
                联系我们
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
