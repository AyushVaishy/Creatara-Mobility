'use client'

import Image from 'next/image'
import { Thermometer, Wind, Droplets, Gauge, Eye } from 'lucide-react'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { formatTemperature } from '@/lib/utils'
import type { WeatherNormalized } from '@/types'

interface WeatherInsightsProps {
  weather: WeatherNormalized | null
  isLoading?: boolean
}

interface MetricCardProps {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accent?: string
  delay?: number
}

function MetricCard({ icon: Icon, label, value, sub, accent, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex flex-col gap-1 rounded-lg border border-border/30 bg-card/50 p-3 backdrop-blur-sm"
    >
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span>{label}</span>
      </div>
      <span
        className="text-base font-bold leading-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </span>
      {sub && <span className="text-[10px] text-muted-foreground capitalize">{sub}</span>}
    </motion.div>
  )
}

/** SVG semi-circle temperature gauge from -20°C to 50°C */
function TemperatureGauge({ temperature }: { temperature: number }) {
  const MIN = -20, MAX = 50, RANGE = MAX - MIN
  const pct  = Math.max(0, Math.min(1, (temperature - MIN) / RANGE))
  const cx   = 80, cy = 80, r = 56

  // Color zones
  const color =
    temperature <= 0  ? '#60a5fa' :
    temperature <= 15 ? '#34d399' :
    temperature <= 30 ? '#fb923c' :
    '#f87171'

  // Arc: angle π → 0 (left → right through top)  pct 0→1
  const currentAngle = Math.PI * (1 - pct)
  const endX = cx + r * Math.cos(currentAngle)
  const endY = cy - r * Math.sin(currentAngle)
  const startX = cx - r
  const startY = cy
  const trackEnd = cx + r

  const trackPath = `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${trackEnd} ${cy}`
  // For fill, large-arc is always 0 for a partial arc ≤ π within the semicircle
  const fillPath = pct > 0.005
    ? `M ${startX} ${startY} A ${r} ${r} 0 ${pct > 0.999 ? 1 : 0} 1 ${endX.toFixed(2)} ${endY.toFixed(2)}`
    : null

  // Zone ticks at -20, 0, 15, 30, 50 mapped to angles
  const ticks = [
    { label: '-20', pct: 0 },
    { label: '0',   pct: 20 / RANGE },
    { label: '15',  pct: 35 / RANGE },
    { label: '30',  pct: 50 / RANGE },
    { label: '50',  pct: 1 },
  ]

  return (
    <svg
      viewBox="0 0 160 95"
      className="w-full max-w-[160px]"
      aria-label={`Temperature: ${temperature}°C`}
      role="img"
    >
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="currentColor"
        strokeWidth={8}
        strokeLinecap="round"
        className="text-border/40"
      />
      {/* Active fill */}
      {fillPath && (
        <path
          d={fillPath}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
        />
      )}
      {/* Needle dot */}
      {pct > 0.005 && (
        <circle
          cx={endX.toFixed(2)}
          cy={endY.toFixed(2)}
          r={5}
          fill={color}
        />
      )}
      {/* Tick labels */}
      {ticks.map(({ label, pct: tp }) => {
        const a = Math.PI * (1 - tp)
        const tx = cx + (r + 12) * Math.cos(a)
        const ty = cy - (r + 12) * Math.sin(a)
        return (
          <text
            key={label}
            x={tx.toFixed(1)}
            y={ty.toFixed(1)}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={7}
            fill="currentColor"
            className="fill-muted-foreground opacity-60"
          >
            {label}
          </text>
        )
      })}
      {/* Center temperature value */}
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontSize={20}
        fontWeight="700"
        fill={color}
      >
        {Math.round(temperature)}°
      </text>
      <text
        x={cx}
        y={cy + 20}
        textAnchor="middle"
        fontSize={8}
        fill="currentColor"
        className="fill-muted-foreground opacity-60"
      >
        Celsius
      </text>
    </svg>
  )
}

export function WeatherInsights({ weather, isLoading }: WeatherInsightsProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-border/30 bg-card/50 p-3 space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!weather) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Weather Conditions
        </h3>
        {weather.iconUrl && (
          <div className="flex items-center gap-2">
            <Image
              src={weather.iconUrl}
              alt={weather.condition}
              width={32}
              height={32}
              unoptimized
              className="opacity-90"
            />
            <span className="text-sm capitalize text-muted-foreground">{weather.description}</span>
          </div>
        )}
      </div>

      {/* Temperature hero with gauge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="flex items-center justify-between gap-4 rounded-xl bg-gradient-to-br from-orange-500/10 via-background to-background border border-orange-500/20 px-4 py-3"
      >
        {/* SVG gauge on the left */}
        <div className="shrink-0">
          <TemperatureGauge temperature={weather.temperature} />
        </div>
        {/* Text info on the right */}
        <div className="flex-1 text-right space-y-1">
          <div className="text-3xl font-bold tracking-tight text-orange-400">
            {formatTemperature(weather.temperature)}
          </div>
          <div className="text-xs text-muted-foreground">
            Feels like {formatTemperature(weather.feelsLike)}
          </div>
          <div className="capitalize font-medium text-sm text-foreground">{weather.condition}</div>
          <div className="text-xs text-muted-foreground">Pressure: {weather.pressure} hPa</div>
          {weather.visibility && (
            <div className="text-xs text-muted-foreground">
              Visibility: {(weather.visibility / 1000).toFixed(1)} km
            </div>
          )}
        </div>
      </motion.div>

      {/* Metric cards grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MetricCard
          icon={Thermometer}
          label="Feels Like"
          value={formatTemperature(weather.feelsLike)}
          delay={0.05}
          accent="hsl(var(--foreground))"
        />
        <MetricCard
          icon={Droplets}
          label="Humidity"
          value={`${weather.humidity}%`}
          sub={weather.humidity > 70 ? 'High' : weather.humidity < 30 ? 'Low' : 'Normal'}
          delay={0.1}
          accent="#60a5fa"
        />
        <MetricCard
          icon={Wind}
          label="Wind Speed"
          value={`${Math.round(weather.windSpeed)} km/h`}
          sub={weather.windDirection ?? undefined}
          delay={0.15}
          accent="#a78bfa"
        />
        <MetricCard
          icon={Eye}
          label="Visibility"
          value={weather.visibility ? `${(weather.visibility / 1000).toFixed(1)} km` : '—'}
          delay={0.2}
        />
      </div>

      {/* Extra row: Pressure + wind direction */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          icon={Gauge}
          label="Pressure"
          value={`${weather.pressure} hPa`}
          sub={weather.pressure > 1013 ? 'High pressure' : 'Low pressure'}
          delay={0.25}
        />
        {weather.windDirection && (
          <MetricCard
            icon={Wind}
            label="Wind Direction"
            value={weather.windDirection}
            delay={0.3}
          />
        )}
      </div>
    </div>
  )
}
