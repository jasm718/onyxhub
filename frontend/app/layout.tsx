import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'OnyxHub',
  description: '应用虚拟化管理平台',
  icons: {
    icon: [
      {
        url: '/brand/onyxhub-logo-32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/brand/onyxhub-logo-32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/brand/onyxhub-logo.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/brand/onyxhub-logo-180.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
