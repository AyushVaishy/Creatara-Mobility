'use client'

import { useState, useEffect } from 'react'
import { MapPin, Clock, Globe, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CityConfig } from '@/types'

interface CityHeaderProps {
  city: CityConfig
  lastUpdated?: string | null
}

function useLocalTime(timezone: string) {
  const [time, setTime] = useState<string>('')

  useEffect(() => {
    const format = () =>
      new Intl.DateTimeFormat('en-US', {
        hour:     '2-digit',
        minute:   '2-digit',
        second:   '2-digit',
        hour12:   true,
        timeZone: timezone,
      }).format(new Date())

    setTime(format())
    const id = setInterval(() => setTime(format()), 1000)
    return () => clearInterval(id)
  }, [timezone])

  return time
}

export function CityHeader({ city, lastUpdated }: CityHeaderProps) {
  const localTime = useLocalTime(city.timezone)

  const formattedUpdated = lastUpdated
    ? new Intl.DateTimeFormat('en-US', {
        month:  'short',
        day:    'numeric',
        hour:   '2-digit',
        minute: '2-digit',
      }).format(new Date(lastUpdated))
    : null

  return (
    <div className="flex flex-col gap-3">
      {/* City title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight tracking-tight">{city.name}</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Globe className="h-3 w-3 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{city.country}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge variant="outline" className="text-xs px-2 py-0.5">{city.countryCode}</Badge>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">{city.currency}</Badge>
        </div>
      </div>

      {/* Time + meta row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {localTime && (
          <span className="flex items-center gap-1.5 font-mono font-medium text-foreground">
            <Clock className="h-3 w-3" />
            {localTime}
          </span>
        )}
        <span className="text-muted-foreground/60">·</span>
        <span>{city.timezone}</span>
        {formattedUpdated && (
          <>
            <span className="text-muted-foreground/60">·</span>
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Updated {formattedUpdated}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
