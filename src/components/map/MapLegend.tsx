'use client'

import { cn } from '@/lib/utils'
import { AQI_COLORS } from '@/lib/constants'
import type { AQICategory } from '@/types'

const LEGEND_ITEMS: Array<{ label: string; color: string }> = (
  Object.entries(AQI_COLORS) as [AQICategory, string][]
).map(([label, color]) => ({ label, color }))

interface MapLegendProps {
  className?: string
}

export function MapLegend({ className }: MapLegendProps) {
  return (
    <div
      className={cn(
        'absolute bottom-4 left-3 z-[1000]',
        'rounded-lg border border-border/50 bg-background/90 p-2.5 shadow-md backdrop-blur-sm',
        className,
      )}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        AQI
      </p>
      <div className="flex flex-col gap-1">
        {LEGEND_ITEMS.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] text-foreground/70">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
