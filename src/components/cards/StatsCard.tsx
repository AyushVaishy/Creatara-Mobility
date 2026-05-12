import { memo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export const StatsCard = memo(function StatsCard({
  title, value, subtitle, icon: Icon, trend, className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/30 bg-card/50 p-4 backdrop-blur-sm',
        'transition-all duration-200 hover:border-border/50 hover:bg-card/80 hover:shadow-lg hover:shadow-black/15',
        className,
      )}
    >
      {/* Corner glow */}
      <div className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full bg-primary/8 blur-2xl" />

      <div className="relative flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
            {title}
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p
              className={cn(
                'mt-0.5 text-xs',
                trend === 'up'      && 'text-emerald-500',
                trend === 'down'    && 'text-red-400',
                (!trend || trend === 'neutral') && 'text-muted-foreground',
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
    </div>
  )
})
