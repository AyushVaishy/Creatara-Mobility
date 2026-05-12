'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, RefreshCw, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useCityIntelligence, useCityHistory } from '@/hooks/useCityData'
import { CityHeader } from './CityHeader'
import { WeatherInsights } from './WeatherInsights'
import { AQIInsights } from './AQIInsights'
import { CurrencyInsights } from './CurrencyInsights'
import { HistoricalCharts } from './HistoricalCharts'
import { MetadataSection } from './MetadataSection'
import type { CityConfig } from '@/types'

interface CityAnalyticsModalProps {
  city: CityConfig | null
  isOpen: boolean
  onClose: () => void
  className?: string
}

const contentVariants = {
  hidden:  { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1,   transition: { type: 'spring' as const, damping: 22, stiffness: 280 } },
  exit:    { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.2 } },
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

export function CityAnalyticsModal({ city, isOpen, onClose, className }: CityAnalyticsModalProps) {
  const queryClient = useQueryClient()

  const {
    data:      intelligence,
    isLoading: intelligenceLoading,
    isError:   intelligenceError,
    refetch:   refetchIntelligence,
  } = useCityIntelligence(city)

  const {
    data:      history,
    isLoading: historyLoading,
    isError:   historyError,
    refetch:   refetchHistory,
  } = useCityHistory(city?.id ?? null, 7)

  const isRefreshing = intelligenceLoading

  const handleRefresh = useCallback(() => {
    if (!city) return
    queryClient.invalidateQueries({ queryKey: ['city-intelligence', city.id] })
    queryClient.invalidateQueries({ queryKey: ['city-history', city.id] })
    refetchIntelligence()
    refetchHistory()
  }, [city, queryClient, refetchIntelligence, refetchHistory])

  if (!city) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          'flex max-h-[92dvh] w-full max-w-2xl flex-col gap-0 overflow-hidden',
          'border-border/40 bg-background/98 p-0 shadow-2xl backdrop-blur-md',
          className,
        )}
      >
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">{city.name} Analytics</DialogTitle>

        {/* ── Modal Header ──────────────────────────────────── */}
        <div className="flex-shrink-0 px-5 pt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground">Live Analytics</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleRefresh}
                disabled={isRefreshing}
                title="Refresh data"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onClose}
                title="Close"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <CityHeader city={city} lastUpdated={intelligence?.lastUpdated} />
        </div>

        {/* ── Scrollable Content ─────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
          <AnimatePresence mode="wait">
            {intelligenceError ? (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <IntelligenceError onRetry={() => void refetchIntelligence()} />
              </motion.div>
            ) : (
              <motion.div
                key="content"
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-5 pb-4"
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

                {/* Weather */}
                <WeatherInsights
                  weather={intelligence?.weather ?? null}
                  isLoading={intelligenceLoading}
                />

                {(intelligence?.weather || intelligenceLoading) && (
                  <Separator className="opacity-40" />
                )}

                {/* AQI */}
                <AQIInsights
                  aqi={intelligence?.aqi ?? null}
                  isLoading={intelligenceLoading}
                />

                {(intelligence?.aqi || intelligenceLoading) && (
                  <Separator className="opacity-40" />
                )}

                {/* Currency */}
                <CurrencyInsights
                  currency={intelligence?.currency ?? null}
                  cityName={city.name}
                  isLoading={intelligenceLoading}
                />

                <Separator className="opacity-40" />

                {/* Historical charts */}
                <HistoricalCharts
                  history={history ?? null}
                  isLoading={historyLoading}
                  isError={historyError}
                  onRetry={() => void refetchHistory()}
                />

                <Separator className="opacity-40" />

                {/* Metadata */}
                <MetadataSection city={city} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}
