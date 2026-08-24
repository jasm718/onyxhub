import React from "react"
import type { Metadata } from 'next'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'

import './globals.css'

const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'],
  variable: '--font-sans'
})
const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono'
})

export const metadata: Metadata = {
  title: 'OnyxHub｜让每一次协作更有价值',
  description: 'OnyxHub 以更先进的理念连接人与工作，让复杂的业务流程变得清晰、高效、可持续，为组织构建面向未来的数字化体验。',
  generator: 'v0.app',
  keywords: ['OnyxHub', '智能协作', '组织效率', '数字化体验', '企业增长'],
  openGraph: {
    title: 'OnyxHub｜让每一次协作更有价值',
    description: '以更先进的理念连接人与工作，为组织构建面向未来的数字化体验。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnyxHub｜让每一次协作更有价值',
    description: '以更先进的理念连接人与工作，为组织构建面向未来的数字化体验。',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  )
}
