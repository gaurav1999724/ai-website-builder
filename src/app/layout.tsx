import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { AdminNav } from '@/components/admin-nav'
import { DebugSession } from '@/components/debug-session'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Website Builder',
  description: 'Generate beautiful websites with AI-powered code generation',
  keywords: ['AI', 'Website Builder', 'Code Generation', 'Web Development'],
  authors: [{ name: 'AI Website Builder Team' }],
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-black`}>
        <Providers>
          <AdminNav />
          {children}
          <DebugSession />
          <Toaster 
            position="top-right"
            expand={true}
            richColors={true}
            closeButton={true}
          />
        </Providers>
      </body>
    </html>
  )
}
