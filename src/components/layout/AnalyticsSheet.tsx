'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, AlertCircle } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useCityIntelligence, useCityHistory } from '@/hooks/useCityData'
import { CityHeader } from '@/components/modal/CityHeader'
import { WeatherInsights } from '@/components/modal/WeatherInsights'
import { AQIInsights } from '@/components/modal/AQIInsights'
import { CurrencyInsights } from '@/components/modal/CurrencyInsights'
import { HistoricalCharts } from '@/components/modal/HistoricalCharts'
import { MetadataSection } from '@/components/modal/MetadataSection'
import type { CityConfig } from '@/types'

interface AnalyticsSheetProps {
  city: CityConfig | null
  isOpen: boolean
  onClose: () => void
  className?: string
}

function IntelligenceError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
      <AlertCircle className="h-8 w-8 text-destructive/70" />
      <div>
        <p className="text-sm font-medium">Failed to load live data</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Check your API keys or network connection.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5">
        <RefreshCw className="h-3 w-3" />
        Retry
      </Button>
    </div>
  )
}

export function AnalyticsSheet({ city, isOpen, onClose, className }: AnalyticsSheetProps) {
  const queryClient = useQueryClient()

  const {
    data: intelligence,
    isLoading: intelligenceLoading,
    isError: intelligenceError,
    refetch: refetchIntelligence,
  } = useCityIntelligence(city)

  const {
    data: history,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useCityHistory(city?.id ?? null, 7)

  const handleRefresh = useCallback(() => {
    if (!city) return
    queryClient.invalidateQueries({ queryKey: ['city-intelligence', city.id] })
    queryClient.invalidateQueries({ queryKey: ['city-history', city.id] })
    void refetchIntelligence()
    void refetchHistory()
  }, [city, queryClient, refetchIntelligence, refetchHistory])

  if (!city) return null

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className={cn(
          'flex flex-col gap-0 overflow-hidden p-0',
          'border-l border-border/40 bg-background/98 backdrop-blur-xl',
          'w-full sm:!max-w-xl',
          className,
        )}
      >
        <SheetTitle className="sr-only">{city.name} Analytics</SheetTitle>

        {/* Sheet header */}
        <div className="flex-shrink-0 border-b border-border/30 px-5 pt-5 pb-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-muted-foreground">Live Analytics</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleRefresh}
                disabled={intelligenceLoading}
                title="Refresh data"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', intelligenceLoading && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onClose}
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <CityHeader city={city} lastUpdated={intelligence?.lastUpdated} />
        </div>

        {/* Scrollable content */}
        <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            {intelligenceError ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <IntelligenceError onRetry={() => void refetchIntelligence()} />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="space-y-5 pb-6"
              >
                {/* Warnings */}
                {intelligence?.warnings && intelligence.warnings.length > 0 && (
                  <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-3 py-2">
                    {intelligence.warnings.map((w, i) => (
                      <p key={i} className="text-[11px] text-yellow-600 dark:text-yellow-400">
                        ⚠ {w}
                      </p>
                    ))}
                  </div>
                )}

                <WeatherInsights
                  weather={intelligence?.weather ?? null}
                  isLoading={intelligenceLoading}
                />
                {(intelligence?.weather || intelligenceLoading) && (
                  <Separator className="opacity-40" />
                )}

                <AQIInsights
                  aqi={intelligence?.aqi ?? null}
                  isLoading={intelligenceLoading}
                />
                {(intelligence?.aqi || intelligenceLoading) && (
                  <Separator className="opacity-40" />
                )}

                <CurrencyInsights
                  currency={intelligence?.currency ?? null}
                  cityName={city.name}
                  isLoading={intelligenceLoading}
                />
                <Separator className="opacity-40" />

                <HistoricalCharts
                  history={history ?? null}
                  isLoading={historyLoading}
                  isError={historyError}
                  onRetry={() => void refetchHistory()}
                />
                <Separator className="opacity-40" />

                <MetadataSection city={city} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  )
}
