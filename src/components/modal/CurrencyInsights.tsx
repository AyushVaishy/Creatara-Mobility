'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { CurrencyNormalized } from '@/types'

interface CurrencyInsightsProps {
  currency: CurrencyNormalized | null
  cityName?: string
  isLoading?: boolean
}

const CURRENCY_DISPLAY_NAMES: Record<string, string> = {
  USD: 'US Dollar',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  AED: 'UAE Dirham',
  INR: 'Indian Rupee',
  EUR: 'Euro',
  SGD: 'Singapore Dollar',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
}

/** How many of the local currency you get for 1 INR — useful to show both directions */
function invertRate(rate: number | null): number | null {
  return rate && rate > 0 ? 1 / rate : null
}

export function CurrencyInsights({ currency, cityName, isLoading }: CurrencyInsightsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!currency) return null

  const { localCurrency, rateToINR, rateFromUSD } = currency
  const fullName = CURRENCY_DISPLAY_NAMES[localCurrency] ?? localCurrency

  const inrPerUnit = rateToINR
  const unitsPerINR = invertRate(rateToINR)

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Currency &amp; Exchange
      </h3>

      {/* Hero rate card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-background to-background p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] text-muted-foreground">
              {cityName ?? 'City'} · {localCurrency}
            </div>
            <div className="mt-0.5 text-sm font-medium text-foreground">{fullName}</div>
            {rateToINR !== null ? (
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-emerald-400">
                  ₹{rateToINR.toFixed(rateToINR < 1 ? 4 : 2)}
                </span>
                <span className="text-xs text-muted-foreground">per 1 {localCurrency}</span>
              </div>
            ) : (
              <div className="mt-2 text-sm text-muted-foreground">Rate unavailable</div>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <div className="text-[10px] text-muted-foreground">vs INR</div>
          </div>
        </div>
      </motion.div>

      {/* Rate comparison grid */}
      <div className="grid grid-cols-2 gap-2">
        {/* INR → local */}
        <motion.div
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-lg border border-border/30 bg-card/50 p-3"
        >
          <div className="text-[10px] text-muted-foreground">1 INR →</div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {unitsPerINR !== null
              ? `${unitsPerINR.toFixed(4)} ${localCurrency}`
              : '—'}
          </div>
        </motion.div>

        {/* USD → local */}
        <motion.div
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-lg border border-border/30 bg-card/50 p-3"
        >
          <div className="text-[10px] text-muted-foreground">1 USD →</div>
          <div className="mt-0.5 text-sm font-bold text-foreground">
            {rateFromUSD !== null
              ? `${rateFromUSD.toFixed(2)} ${localCurrency}`
              : '—'}
          </div>
        </motion.div>
      </div>

      {/* Base currency note */}
      <p className="text-[10px] text-muted-foreground">
        Base: {currency.ratesBase} · Fetched {new Date(currency.fetchedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  )
}
