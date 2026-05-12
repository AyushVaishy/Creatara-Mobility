'use client'

import { memo } from 'react'
import { Thermometer, Wind } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn, formatTemperature, getAQICategory, getAQIColor } from '@/lib/utils'
import type { CityConfig, LeanCityMetric } from '@/types'

interface CityCardProps {
  city: CityConfig
  metric?: LeanCityMetric | null
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

export const CityCard = memo(function CityCard({ city, metric, isSelected, onClick, className }: CityCardProps) {
  const temp     = metric?.temperature ?? null
  const wind     = metric?.windSpeed ?? null
  const aqi      = metric?.aqi ?? null
  const aqiColor = aqi !== null ? getAQIColor(getAQICategory(aqi)) : undefined

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      aria-label={`Select ${city.name}`}
      aria-pressed={isSelected}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-xl border transition-all duration-200',
        'border-border/30 bg-card/40 backdrop-blur-sm',
        'hover:border-primary/30 hover:bg-card/70 hover:shadow-lg hover:shadow-black/20',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected && 'border-primary/50 bg-primary/5 shadow-md shadow-primary/10',
        className,
      )}
    >
      {/* AQI accent strip on left edge */}
      {aqiColor && (
        <div
          className="absolute left-0 top-0 h-full w-0.5 transition-opacity duration-200"
          style={{ backgroundColor: aqiColor, opacity: isSelected ? 1 : 0.6 }}
        />
      )}

      <div className="pl-4 pr-3 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold">{city.name}</h3>
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{city.country}</p>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 text-[10px] opacity-70 group-hover:opacity-100"
          >
            {city.countryCode}
          </Badge>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Thermometer className="h-3 w-3" />
            <span className="font-medium">{temp !== null ? formatTemperature(temp) : '—'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wind className="h-3 w-3" />
            <span>{wind !== null ? `${Math.round(wind)} km/h` : '—'}</span>
          </div>
          <div
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={
              aqiColor
                ? { backgroundColor: `${aqiColor}22`, color: aqiColor }
                : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }
            }
          >
            {aqi !== null ? `AQI ${aqi}` : 'AQI —'}
          </div>
        </div>
      </div>
    </div>
  )
})
