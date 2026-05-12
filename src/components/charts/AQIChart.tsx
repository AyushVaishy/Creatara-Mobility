'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { motion } from 'framer-motion'
import type { TrendDataPoint } from '@/types'
import { getAQICategory, getAQIColor } from '@/lib/utils'

interface AQIChartProps {
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
  const category = value !== null && value !== undefined ? getAQICategory(value) : null
  const color    = category ? getAQIColor(category) : '#6b7280'

  return (
    <div className="rounded-lg border border-border/50 bg-background/95 px-3 py-2 shadow-lg backdrop-blur-sm">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      {value !== null && value !== undefined ? (
        <>
          <p className="text-sm font-bold" style={{ color }}>AQI {Math.round(value)}</p>
          <p className="text-[10px] text-muted-foreground">{category}</p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">No data</p>
      )}
    </div>
  )
}

export function AQIChart({ data, height = 180, className }: AQIChartProps) {
  const chartData = data.map((d) => ({
    label: d.label,
    value: d.value !== null ? Math.round(d.value) : null,
  }))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      className={className}
    >
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />

          <YAxis
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            domain={[0, 'auto']}
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.3)' }} />

          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {chartData.map((entry, idx) => {
              const color = entry.value !== null
                ? getAQIColor(getAQICategory(entry.value))
                : '#6b7280'
              return <Cell key={idx} fill={color} fillOpacity={0.85} />
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}
