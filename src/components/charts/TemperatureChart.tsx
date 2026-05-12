'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { motion } from 'framer-motion'
import type { TrendDataPoint } from '@/types'

interface TemperatureChartProps {
  data: TrendDataPoint[]
  height?: number
  className?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number | null }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  return (
    <div className="rounded-lg border border-border/50 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {value !== null && value !== undefined ? `${Math.round(value)}°C` : '—'}
      </p>
    </div>
  )
}

export function TemperatureChart({ data, height = 180, className }: TemperatureChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    value: d.value !== null ? Math.round(d.value * 10) / 10 : null,
  }))

  const validValues = chartData.map((d) => d.value).filter((v): v is number => v !== null)
  const avgTemp = validValues.length
    ? Math.round(validValues.reduce((s, v) => s + v, 0) / validValues.length)
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f97316" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}°`}
          />

          {avgTemp !== null && (
            <ReferenceLine
              y={avgTemp}
              stroke="hsl(var(--muted-foreground) / 0.4)"
              strokeDasharray="4 4"
              label={{ value: `avg ${avgTemp}°`, position: 'insideTopRight', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
            />
          )}

          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="value"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#tempGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#f97316', strokeWidth: 0 }}
            connectNulls
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
