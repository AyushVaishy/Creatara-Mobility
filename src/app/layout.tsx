import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import { QueryProvider } from '@/components/layout/QueryProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@/app/globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Global City Insights Dashboard',
    template: '%s | Global City Insights',
  },
  description:
    'Real-time city intelligence dashboard — live weather, AQI, currency, and analytics for 10 global cities.',
  keywords: ['city', 'weather', 'AQI', 'air quality', 'dashboard', 'analytics', 'real-time'],
  authors: [{ name: 'City Insights Team' }],
  openGraph: {
    type: 'website',
    title: 'Global City Insights Dashboard',
    description: 'Real-time intelligence for 10 global cities',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
