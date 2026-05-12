'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { MapPin, Wind, Droplets, Navigation, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useCityIntelligence } from '@/hooks/useCityData'
import { formatTemperature, getAQICategory, getAQIColor } from '@/lib/utils'

function LiveClock({ timezone }: { timezone: string }) {
  const format = useCallback(() => {
    try {
      return new Date().toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    } catch {
      return new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    }
  }, [timezone])

  const [time, setTime] = useState<string>(format)

  useEffect(() => {
    const id = setInterval(() => setTime(format()), 1000)
    return () => clearInterval(id)
  }, [format])

  return <span className="font-mono tabular-nums">{time}</span>
}

function HeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-card/80 via-card/50 to-card/80 p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="mt-4 flex gap-2 border-t border-border/20 pt-3">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  )
}

export function HeroLocationCard() {
  const { nearestCity, loading: geoLoading, denied } = useGeolocation()
  const { data: intelligence, isLoading: dataLoading } = useCityIntelligence(nearestCity)

  const isLoading = geoLoading || (!nearestCity && !denied)

  if (isLoading) return <HeroSkeleton />
  if (!nearestCity) return null

  const weather = intelligence?.weather ?? null
  const aqi = intelligence?.aqi ?? null
  const aqiColor = aqi ? getAQIColor(getAQICategory(aqi.aqi)) : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-to-br from-card/90 via-card/60 to-card/90 p-5 backdrop-blur-xl md:p-6"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-cyan-500/8 blur-3xl" />
        <div className="absolute inset-0 grid-dots opacity-60" />
      </div>

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Left: city identity */}
        <div className="flex-1">
          {/* Location badge */}
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-400">
            <Navigation className="h-2.5 w-2.5" />
            {denied ? 'Nearest City' : 'Your Location'}
          </div>

          {/* City name */}
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {nearestCity.name}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{nearestCity.country}</p>

          {/* Live clock */}
          <div className="mt-3 flex items-center gap-1.5 text-sm text-foreground/80">
            <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
            <LiveClock timezone={nearestCity.timezone} />
            <span className="text-[11px] text-muted-foreground/60">
              {nearestCity.timezone.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Right: temperature + icon */}
        <div className="flex items-start gap-3">
          {dataLoading ? (
            <div className="space-y-2 text-right">
              <Skeleton className="ml-auto h-16 w-32" />
              <Skeleton className="ml-auto h-4 w-24" />
            </div>
          ) : weather ? (
            <div className="text-right">
              <div className="text-5xl font-bold leading-none text-foreground md:text-6xl">
                {formatTemperature(weather.temperature)}
              </div>
              <div className="mt-1.5 capitalize text-sm text-muted-foreground">{weather.description}</div>
              <div className="mt-0.5 text-xs text-muted-foreground/70">
                Feels {formatTemperature(weather.feelsLike)}
              </div>
            </div>
          ) : (
            <div className="text-4xl font-bold text-muted-foreground/40">—°C</div>
          )}

          {weather?.iconUrl && (
            <Image
              src={weather.iconUrl}
              alt={weather.condition}
              width={64}
              height={64}
              unoptimized
              className="mt-1 drop-shadow-lg"
            />
          )}
        </div>
      </div>

      <div className="relative mt-4 flex flex-wrap items-center gap-2.5 border-t border-border/20 pt-3">
        {/* AQI chip */}
        {aqi && aqiColor && (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `${aqiColor}18`,
              color: aqiColor,
              border: `1px solid ${aqiColor}35`,
            }}
          >
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ backgroundColor: aqiColor }}
            />
            AQI {aqi.aqi} · {aqi.category}
          </div>
        )}

        {weather?.windSpeed !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Wind className="h-3 w-3 text-muted-foreground/60" />
            {Math.round(weather.windSpeed)} km/h
          </div>
        )}

        {weather?.humidity !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Droplets className="h-3 w-3 text-muted-foreground/60" />
            {weather.humidity}% humidity
          </div>
        )}

        <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground/40">
          <MapPin className="h-2.5 w-2.5" />
          {nearestCity.latitude.toFixed(2)}°, {nearestCity.longitude.toFixed(2)}°
        </div>
      </div>
    </motion.div>
  )
}
