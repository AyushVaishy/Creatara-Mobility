import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface MapSkeletonProps {
  className?: string
}

export function MapSkeleton({ className }: MapSkeletonProps) {
  return (
    <div
      className={cn(
        'relative flex h-[60vh] min-h-[400px] w-full items-center justify-center',
        'rounded-xl border border-border/40 bg-muted/30',
        className,
      )}
    >
      <Skeleton className="absolute inset-0 rounded-xl" />
      <div className="relative z-10 flex flex-col items-center gap-2 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm font-medium">Loading map&hellip;</p>
      </div>
    </div>
  )
}
