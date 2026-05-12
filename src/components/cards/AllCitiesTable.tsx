'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { cn, formatTemperature, getAQICategory, getAQIColor } from '@/lib/utils'
import { GLOBAL_CITIES } from '@/lib/constants'
import type { CityLatestResponse } from '@/types'

interface AllCitiesTableProps {
  dataMap: Record<string, CityLatestResponse | null>
  onCityClick?: (cityId: string) => void
}

type SortKey = 'name' | 'temperature' | 'humidity' | 'windSpeed' | 'aqi' | 'pressure'
type SortDir = 'asc' | 'desc'

/** Compute city-currency → INR using cross-rate from stored rates object. */
function calcINRRate(rates: Record<string, number>, currency: string): number | null {
  if (currency === 'INR') return 1
  const fromRate = rates[currency]
  const inrRate  = rates['INR']
  if (!fromRate || !inrRate) return null
  return inrRate / fromRate
}

function formatRelativeTime(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60)  return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function SortIcon({ col, active, dir }: { col: string; active: string; dir: SortDir }) {
  if (col !== active) return <ArrowUpDown className="ml-1 inline h-2.5 w-2.5 opacity-30" />
  return dir === 'asc'
    ? <ArrowUp   className="ml-1 inline h-2.5 w-2.5 text-primary" />
    : <ArrowDown className="ml-1 inline h-2.5 w-2.5 text-primary" />
}

const COLUMNS: Array<{ key: SortKey; label: string; align?: 'left' | 'right' }> = [
  { key: 'name',        label: 'City',         align: 'left'  },
  { key: 'temperature', label: 'Temp',         align: 'right' },
  { key: 'humidity',    label: 'Humidity',     align: 'right' },
  { key: 'windSpeed',   label: 'Wind',         align: 'right' },
  { key: 'pressure',    label: 'Pressure',     align: 'right' },
  { key: 'aqi',         label: 'AQI',          align: 'right' },
]

export function AllCitiesTable({ dataMap, onCityClick }: AllCitiesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
        return prev
      }
      setSortDir('asc')
      return key
    })
  }, [])

  const rows = useMemo(() => {
    const data = GLOBAL_CITIES.map((city) => {
      const latest = dataMap[city.id]
      const m = latest?.metric ?? null
      return {
        city,
        temperature: m?.temperature ?? null,
        feelsLike:   m?.feelsLike   ?? null,
        humidity:    m?.humidity    ?? null,
        windSpeed:   m?.windSpeed   ?? null,
        pressure:    m?.pressure    ?? null,
        aqi:         m?.aqi         ?? null,
        aqiCategory: m?.aqi != null ? getAQICategory(m.aqi) : null,
        condition:   m?.weatherCondition ?? null,
        inrRate:     m?.currencyRates
          ? calcINRRate(m.currencyRates, city.currency)
          : null,
        recordedAt: m?.recordedAt ?? null,
      }
    })

    return [...data].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = a.city.name.localeCompare(b.city.name)
      } else {
        const av = a[sortKey] as number | null
        const bv = b[sortKey] as number | null
        if (av === null && bv === null) cmp = 0
        else if (av === null) cmp = 1   // nulls last
        else if (bv === null) cmp = -1
        else cmp = av - bv
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [dataMap, sortKey, sortDir])

  return (
    <div className="overflow-hidden rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/30 bg-muted/20">
              {COLUMNS.map(({ key, label, align }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className={cn(
                    'cursor-pointer select-none whitespace-nowrap px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground',
                    'hover:text-foreground transition-colors',
                    align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {label}
                  <SortIcon col={key} active={sortKey} dir={sortDir} />
                </th>
              ))}
              {/* Extra columns (not sortable) */}
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                1 {'{cur}'} → INR
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Updated
              </th>
              <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Condition
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map(({ city, temperature, feelsLike, humidity, windSpeed, pressure, aqi, aqiCategory, condition, inrRate, recordedAt }, idx) => {
              const aqiColor = aqi !== null ? getAQIColor(getAQICategory(aqi)) : undefined

              return (
                <motion.tr
                  key={city.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  onClick={() => onCityClick?.(city.id)}
                  className={cn(
                    'group cursor-pointer border-b border-border/15 transition-colors last:border-0',
                    'hover:bg-primary/5',
                  )}
                >
                  {/* City */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: aqiColor ?? '#6b7280' }}
                      />
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {city.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">{city.countryCode}</div>
                      </div>
                    </div>
                  </td>

                  {/* Temperature */}
                  <td className="px-3 py-2.5 text-right">
                    {temperature !== null ? (
                      <div>
                        <span className="font-bold text-orange-400">{formatTemperature(temperature)}</span>
                        {feelsLike !== null && (
                          <div className="text-[10px] text-muted-foreground">
                            feels {formatTemperature(feelsLike)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Humidity */}
                  <td className="px-3 py-2.5 text-right">
                    {humidity !== null ? (
                      <span className="font-medium text-blue-400">{humidity}%</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Wind */}
                  <td className="px-3 py-2.5 text-right">
                    {windSpeed !== null ? (
                      <span className="font-medium">{Math.round(windSpeed)} km/h</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Pressure */}
                  <td className="px-3 py-2.5 text-right">
                    {pressure !== null ? (
                      <span className="font-medium">{pressure} hPa</span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* AQI */}
                  <td className="px-3 py-2.5 text-right">
                    {aqi !== null && aqiColor ? (
                      <div className="flex flex-col items-end">
                        <span className="font-bold" style={{ color: aqiColor }}>{aqi}</span>
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{ backgroundColor: `${aqiColor}20`, color: aqiColor }}
                        >
                          {aqiCategory}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* INR rate */}
                  <td className="px-3 py-2.5 text-right">
                    {inrRate !== null ? (
                      <span className="font-medium text-emerald-400">
                        ₹{inrRate < 1 ? inrRate.toFixed(4) : inrRate.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>

                  {/* Last updated */}
                  <td className="px-3 py-2.5 text-right">
                    {recordedAt ? (
                      <span className="text-[11px] text-muted-foreground">
                        {formatRelativeTime(recordedAt)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40 text-[11px]">No data</span>
                    )}
                  </td>

                  {/* Condition */}
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] capitalize text-muted-foreground">
                      {condition ?? '—'}
                    </span>
                  </td>
                </motion.tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-border/20 px-4 py-2 text-[10px] text-muted-foreground/50">
        Click any row to select the city · Click column headers to sort · Showing {rows.length} cities
      </div>
    </div>
  )
}
