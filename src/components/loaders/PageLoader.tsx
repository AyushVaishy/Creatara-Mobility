import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageLoaderProps {
  message?: string
  className?: string
}

export function PageLoader({ message = 'Loading dashboard…', className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-4',
        className,
      )}
    >
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <Globe className="h-7 w-7 text-primary" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  )
}
