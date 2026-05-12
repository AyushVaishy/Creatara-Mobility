'use client'

import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { getAQIColor } from '@/lib/utils'
import type { AQINormalized } from '@/types'

interface AQIInsightsProps {
  aqi: AQINormalized | null
  isLoading?: boolean
}

const AQI_LEVEL_FILL = {
  'Good':                             1,
  'Moderate':                         2,
  'Unhealthy for Sensitive Groups':   3,
  'Unhealthy':                        4,
  'Very Unhealthy':                   5,
  'Hazardous':                        6,
} as const

export function AQIInsights({ aqi, isLoading }: AQIInsightsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    )
  }

  if (!aqi) return null

  const color  = getAQIColor(aqi.category)
  const level  = AQI_LEVEL_FILL[aqi.category] ?? 1
  const pct    = Math.min((aqi.aqi / 300) * 100, 100)

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Air Quality Index
      </h3>

      {/* AQI hero card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative overflow-hidden rounded-xl border p-4"
        style={{ borderColor: `${color}40`, background: `${color}0d` }}
      >
        {/* Soft glow */}
        <div
          className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full opacity-20 blur-2xl"
          style={{ background: color }}
        />

        <div className="flex items-start justify-between gap-4">
          {/* AQI value */}
          <div>
            <div className="text-4xl font-bold" style={{ color }}>
              {aqi.aqi}
            </div>
            <div
              className="mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
              style={{ backgroundColor: `${color}22`, color }}
            >
              {aqi.category}
            </div>
          </div>

          {/* Level dots */}
          <div className="flex flex-col items-center gap-1 pt-1">
            {[6, 5, 4, 3, 2, 1].map((l) => (
              <div
                key={l}
                className="h-2 w-2 rounded-full transition-all"
                style={{
                  backgroundColor: l <= level ? color : 'hsl(var(--muted))',
                  opacity: l <= level ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* Health advice */}
        <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
          {aqi.healthAdvice}
        </p>
      </motion.div>

      {/* Pollutants grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: 'PM2.5', value: aqi.pm25, unit: 'µg/m³' },
          { label: 'PM10',  value: aqi.pm10, unit: 'µg/m³' },
          { label: 'O₃',    value: aqi.o3,   unit: 'µg/m³' },
          { label: 'NO₂',   value: aqi.no2,  unit: 'µg/m³' },
        ].map(({ label, value, unit }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i + 0.2 }}
            className="rounded-lg border border-border/30 bg-card/50 p-2.5 text-center"
          >
            <div className="text-[10px] text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-sm font-bold">
              {value != null ? value.toFixed(1) : '—'}
            </div>
            <div className="text-[9px] text-muted-foreground">{unit}</div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
