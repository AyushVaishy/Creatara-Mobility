import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface CardSkeletonProps {
  className?: string
  lines?: number
}

export function CardSkeleton({ className, lines = 3 }: CardSkeletonProps) {
  return (
    <div className={cn('space-y-3 rounded-xl border border-border/40 bg-card p-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}
