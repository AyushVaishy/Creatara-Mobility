'use client'

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from 'react'
import { Search, MapPin, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { GLOBAL_CITIES } from '@/lib/constants'
import { useDashboardStore } from '@/store/dashboardStore'
import type { CityConfig } from '@/types'

interface SearchBarProps {
  className?: string
}

export function SearchBar({ className }: SearchBarProps) {
  const { selectCity } = useDashboardStore()
  const [query, setQuery]         = useState('')
  const [open, setOpen]           = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered: CityConfig[] = query.trim().length > 0
    ? GLOBAL_CITIES.filter((c) =>
        c.name.toLowerCase().includes(query.toLowerCase()) ||
        c.country.toLowerCase().includes(query.toLowerCase()),
      )
    : []

  const handleSelect = useCallback((city: CityConfig) => {
    selectCity(city)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }, [selectCity])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || filtered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIdx]) handleSelect(filtered[activeIdx])
    } else if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  // Cmd+K / Ctrl+K global shortcut
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Reset active index when filtered changes
  useEffect(() => setActiveIdx(0), [query])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Input */}
      <div
        className={cn(
          'flex h-8 items-center gap-2 rounded-lg border border-border/40 bg-muted/40 px-2.5',
          'transition-all duration-200',
          open && 'border-primary/40 bg-background ring-1 ring-primary/20',
        )}
      >
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search cities…"
          aria-label="Search cities"
        aria-haspopup="listbox"
          className={cn(
            'w-32 bg-transparent text-xs outline-none placeholder:text-muted-foreground',
            'transition-[width] duration-200 focus:w-44',
          )}
          spellCheck={false}
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); setOpen(false) }}
            className="ml-auto text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="ml-auto hidden rounded border border-border/40 px-1 py-0.5 text-[10px] text-muted-foreground lg:block">
            ⌘K
          </kbd>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && filtered.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit=  {{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            role="listbox"
            aria-label="City search results"
            className={cn(
              'absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-64 overflow-y-auto',
              'rounded-xl border border-border/40 bg-popover shadow-xl',
              'scrollbar-thin',
            )}
          >
            {filtered.map((city, idx) => (
              <li
                key={city.id}
                role="option"
                aria-selected={idx === activeIdx}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => handleSelect(city)}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm',
                  'transition-colors duration-100',
                  idx === activeIdx
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-muted/60',
                )}
              >
                <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="font-medium">{city.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{city.country}</span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
