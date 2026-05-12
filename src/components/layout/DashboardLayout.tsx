import type { ReactNode } from 'react'
import { Navbar } from './Navbar'
import { ErrorBoundary } from './ErrorBoundary'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
  className?: string
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className={cn('flex-1', className)}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
