'use client'

import Image from 'next/image'
import { Thermometer, Wind, Droplets, Gauge, Globe, ExternalLink, BarChart2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { cn, formatTemperature, getAQIColor, formatNumber } from '@/lib/utils'
import type { CityConfig, CityIntelligence } from '@/types'

interface CityOverviewCardProps {
  city: CityConfig
  intelligence: CityIntelligence | null
  isLoading?: boolean
  className?: string
  /** Called when user clicks "View Analytics" — opens the full modal */
  onViewAnalytics?: () => void
}

function DataRow({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType
  label: string
  value: string
  accent?: string
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </div>
      <span className="text-xs font-medium" style={accent ? { color: accent } : undefined}>
        {value}
      </span>
    </div>
  )
}

export function CityOverviewCard({ city, intelligence, isLoading, className, onViewAnalytics }: CityOverviewCardProps) {
  const w   = intelligence?.weather
  const aqi = intelligence?.aqi
  const cur = intelligence?.currency
  const aqiColor = aqi ? getAQIColor(aqi.category) : undefined

  return (
    <Card
      className={cn(
        'border-border/40 bg-card/60 p-4 backdrop-blur-sm flex flex-col',
        'transition-all duration-200',
        className,
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Globe className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-none">{city.name}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">{city.country}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">{city.currency}</Badge>
          <Badge variant="secondary" className="text-[10px]">{city.countryCode}</Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : intelligence ? (
        <>
          <div className="flex-1 flex flex-col justify-start">
            {/* Temperature hero */}
            {w && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 flex items-end justify-between rounded-lg bg-primary/5 px-3 py-2.5"
              >
                <div>
                  <div className="text-3xl font-bold tracking-tight">
                    {formatTemperature(w.temperature)}
                  </div>
                  <div className="text-xs text-muted-foreground capitalize">{w.description}</div>
                </div>
                {w.iconUrl && (
                  <Image
                    src={w.iconUrl}
                    alt={w.condition}
                    width={48}
                    height={48}
                    className="opacity-90"
                    unoptimized
                  />
                )}
              </motion.div>
            )}

            {/* Weather metrics */}
            {w && (
              <>
                <DataRow icon={Thermometer} label="Feels like" value={formatTemperature(w.feelsLike)} />
                <DataRow icon={Droplets}    label="Humidity"   value={`${w.humidity}%`} />
                <DataRow icon={Wind}        label="Wind"       value={`${Math.round(w.windSpeed)} km/h${w.windDirection ? ` ${w.windDirection}` : ''}`} />
                <DataRow icon={Gauge}       label="Pressure"   value={`${w.pressure} hPa`} />
              </>
            )}

            {/* AQI */}
            {aqi && (
              <>
                <Separator className="my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Air Quality</span>
                  <div
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                    style={{ backgroundColor: `${aqiColor}22`, color: aqiColor }}
                  >
                    AQI {aqi.aqi} · {aqi.category}
                  </div>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{aqi.healthAdvice}</p>
              </>
            )}

            {/* Currency */}
            {cur && cur.rateToINR !== null && (
              <>
                <Separator className="my-2" />
                <DataRow
                  icon={ExternalLink}
                  label={`1 ${cur.localCurrency} →`}
                  value={`₹ ${cur.rateToINR.toFixed(2)}`}
                />
              </>
            )}

            {/* Population */}
            {city.population && (
              <div className="mt-2 mb-2 text-[10px] text-muted-foreground">
                Population: {formatNumber(city.population)}
              </div>
            )}
          </div>

          {/* View Analytics CTA */}
          <div className="mt-auto pt-3">
            {onViewAnalytics && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 text-xs"
                onClick={onViewAnalytics}
              >
                <BarChart2 className="h-3.5 w-3.5" />
                View Full Analytics
              </Button>
            )}
          </div>
        </>
      ) : (
        <p className="text-center text-xs text-muted-foreground py-4">
          Select a city on the map to load live data.
        </p>
      )}
    </Card>
  )
}
