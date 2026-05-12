'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TemperatureChart } from '@/components/charts/TemperatureChart'
import { AQIChart } from '@/components/charts/AQIChart'
import type { CityHistoryResponse } from '@/types'

interface HistoricalChartsProps {
  history: CityHistoryResponse | null
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  className?: string
}

type ActiveChart = 'temperature' | 'aqi'

export function HistoricalCharts({
  history,
  isLoading,
  isError,
  onRetry,
  className,
}: HistoricalChartsProps) {
  const [active, setActive] = useState<ActiveChart>('temperature')

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-7 w-48 rounded-lg" />
        </div>
        <Skeleton className="h-44 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className={cn('rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center', className)}>
        <p className="text-xs text-muted-foreground">Historical data unavailable.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs font-medium text-primary hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  if (!history) return null

  const hasTemperatureData = history.temperatureTrend.some((p) => p.value !== null)
  const hasAQIData         = history.aqiTrend.some((p) => p.value !== null)

  const { summary } = history

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {history.period}-Day Historical Trends
        </h3>
        {/* Chart toggle */}
        <div className="flex rounded-lg border border-border/40 bg-muted/40 p-0.5">
          {(['temperature', 'aqi'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11px] font-medium transition-all',
                active === tab
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab === 'temperature' ? '🌡 Temp' : '💨 AQI'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area */}
      <div className="rounded-xl border border-border/30 bg-card/40 p-3">
        {active === 'temperature' ? (
          hasTemperatureData ? (
            <TemperatureChart data={history.temperatureTrend} height={160} />
          ) : (
            <NoDataPlaceholder label="temperature" />
          )
        ) : (
          hasAQIData ? (
            <AQIChart data={history.aqiTrend} height={160} />
          ) : (
            <NoDataPlaceholder label="AQI" />
          )
        )}
      </div>

      {/* Period summary stats */}
      {summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            {
              label: 'Avg Temp',
              value: summary.avgTemperature != null ? `${Math.round(summary.avgTemperature)}°C` : '—',
            },
            {
              label: 'Avg Humidity',
              value: summary.avgHumidity != null ? `${Math.round(summary.avgHumidity)}%` : '—',
            },
            {
              label: 'Avg AQI',
              value: summary.avgAQI != null ? Math.round(summary.avgAQI).toString() : '—',
            },
            {
              label: 'Data Points',
              value: summary.dataPoints.toString(),
            },
          ].map(({ label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="rounded-lg border border-border/30 bg-card/50 p-2.5 text-center"
            >
              <div className="text-[10px] text-muted-foreground">{label}</div>
              <div className="mt-0.5 text-sm font-bold">{value}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function NoDataPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center">
      <p className="text-xs text-muted-foreground">
        No {label} data collected yet. Run the cron job or wait for auto-collection.
      </p>
    </div>
  )
}
