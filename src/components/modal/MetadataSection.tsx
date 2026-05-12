'use client'

import { motion } from 'framer-motion'
import { MapPin, Globe, Users, Navigation } from 'lucide-react'
import { formatNumber } from '@/lib/utils'
import type { CityConfig } from '@/types'

interface MetadataSectionProps {
  city: CityConfig
}

interface MetaRowProps {
  icon: React.ElementType
  label: string
  value: string
  delay?: number
}

function MetaRow({ icon: Icon, label, value, delay = 0 }: MetaRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center justify-between py-1.5 border-b border-border/20 last:border-0"
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
      </div>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </motion.div>
  )
}

export function MetadataSection({ city }: MetadataSectionProps) {
  const coordsStr = `${Math.abs(city.latitude).toFixed(4)}°${city.latitude >= 0 ? 'N' : 'S'}, ${Math.abs(city.longitude).toFixed(4)}°${city.longitude >= 0 ? 'E' : 'W'}`

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        City Metadata
      </h3>

      <div className="rounded-xl border border-border/30 bg-card/40 px-3 py-1 divide-y-0">
        <MetaRow icon={Globe}      label="Country"    value={city.country}                      delay={0} />
        <MetaRow icon={MapPin}     label="Timezone"   value={city.timezone}                     delay={0.05} />
        <MetaRow icon={Navigation} label="Coordinates" value={coordsStr}                        delay={0.1} />
        <MetaRow icon={Users}      label="Population" value={`${formatNumber(city.population)} residents`} delay={0.15} />
        <MetaRow icon={Globe}      label="Currency"   value={`${city.currency} (${city.countryCode})`}     delay={0.2} />
      </div>
    </div>
  )
}
