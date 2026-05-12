'use client'

import { useState, useEffect } from 'react'
import { Globe, Moon, Sun, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'
import { useRefreshAll, useAllCitiesLatest } from '@/hooks/useCityData'
import { Button } from '@/components/ui/button'
import { SearchBar } from './SearchBar'
import { APP_NAME, CITY_COUNT } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface NavbarProps {
  className?: string
}

function useRelativeTime(ts: number) {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    if (!ts) return
    const calc = () => {
      const diff = Math.floor((Date.now() - ts) / 1000)
      if (diff < 5)  { setLabel('just now'); return }
      if (diff < 60) { setLabel(`${diff}s ago`); return }
      const m = Math.floor(diff / 60)
      setLabel(`${m}m ago`)
    }
    calc()
    const id = setInterval(calc, 10_000)
    return () => clearInterval(id)
  }, [ts])

  return label
}

export function Navbar({ className }: NavbarProps) {
  const { isDark, toggleTheme } = useTheme()
  const refreshAll = useRefreshAll()
  const { isFetching, lastUpdatedAt } = useAllCitiesLatest()
  const [refreshing, setRefreshing] = useState(false)
  const lastUpdatedLabel = useRelativeTime(lastUpdatedAt)

  const handleRefresh = async () => {
    setRefreshing(true)
    refreshAll()
    setTimeout(() => setRefreshing(false), 1200)
  }

  const spinning = refreshing || isFetching

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full',
        'border-b border-white/6 bg-background/80 backdrop-blur-xl',
        'supports-[backdrop-filter]:bg-background/60',
        className,
      )}
    >
      <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4 md:px-6">
        {/* Logo */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
            <Globe className="h-4 w-4 text-primary" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-foreground text-sm font-bold leading-none tracking-tight">
              {APP_NAME}
            </h1>
            <p className="mt-0.5 text-[10px] text-muted-foreground/70">
              Intelligence · {CITY_COUNT} cities
            </p>
          </div>
          <span className="text-foreground block text-sm font-bold sm:hidden">City Insights</span>
        </div>

        {/* Search — centered */}
        <SearchBar className="hidden max-w-xs flex-1 md:block" />

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Live badge + last updated */}
          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-1.5 rounded-full border border-border/40 bg-secondary/50 px-2.5 py-1 text-[11px] font-medium">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={spinning ? 'spin' : 'pulse'}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ duration: 0.15 }}
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    spinning ? 'bg-yellow-400' : 'animate-pulse bg-emerald-400',
                  )}
                />
              </AnimatePresence>
              <span className="text-muted-foreground">
                {spinning ? 'Updating…' : 'Live'}
              </span>
            </div>
            {lastUpdatedLabel && !spinning && (
              <span className="text-[10px] text-muted-foreground/60">
                {lastUpdatedLabel}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Refresh data"
            onClick={handleRefresh}
            disabled={spinning}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', spinning && 'animate-spin')} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={isDark ? 'sun' : 'moon'}
                initial={{ rotate: -30, opacity: 0 }}
                animate={{ rotate: 0,   opacity: 1 }}
                exit=  {{ rotate:  30,  opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                {isDark
                  ? <Sun  className="h-3.5 w-3.5" />
                  : <Moon className="h-3.5 w-3.5" />}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>

      {/* Mobile search row */}
      <div className="border-t border-white/5 px-4 py-2 md:hidden">
        <SearchBar className="w-full" />
      </div>
    </header>
  )
}
