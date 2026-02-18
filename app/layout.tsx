import type { Metadata, Viewport } from 'next'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { TournamentDashboard } from '@/components/TournamentDashboard'
import { ThemeProvider } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import './globals.css'

const geist = Geist({ subsets: ["latin"] });
const geistMono = Geist_Mono({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export const metadata: Metadata = {
  title: 'Swiss Chess Tournament Manager',
  description: 'Professional Swiss system tournament pairing engine with live standings, Excel import, and PDF export',
  keywords: ['chess', 'tournament', 'swiss', 'pairing', 'tournament manager'],
  authors: [{ name: 'Tournament Manager' }],
  creator: 'v0',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
  applicationName: 'Chess Tournament Manager',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}

