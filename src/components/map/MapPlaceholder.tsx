'use client'

import { MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GLOBAL_CITIES } from '@/lib/constants'

interface MapPlaceholderProps {
  className?: string
  onCitySelect?: (cityId: string) => void
}

export function MapPlaceholder({ className, onCitySelect }: MapPlaceholderProps) {
  return (
    <div
      className={cn(
        'relative flex h-[60vh] min-h-[400px] w-full flex-col items-center justify-center gap-4',
        'rounded-xl border border-border/40 bg-gradient-to-br from-slate-900/50 to-slate-800/50',
        'overflow-hidden backdrop-blur-sm',
        className,
      )}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148,163,184,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148,163,184,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Placeholder city dots */}
      {GLOBAL_CITIES.map((city) => (
        <button
          key={city.id}
          onClick={() => onCitySelect?.(city.id)}
          className="group absolute flex flex-col items-center gap-1 transition-transform hover:scale-110"
          style={{
            // Simple mercator approximation for visual layout
            left: `${((city.longitude + 180) / 360) * 100}%`,
            top: `${((90 - city.latitude) / 180) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
          title={city.name}
        >
          <MapPin className="h-3 w-3 text-primary drop-shadow-glow transition-colors group-hover:text-primary/80" />
          <span className="hidden rounded bg-background/80 px-1 py-0.5 text-[9px] font-medium backdrop-blur-sm group-hover:block">
            {city.name}
          </span>
        </button>
      ))}

      {/* Center message */}
      <div className="relative z-10 text-center">
        <MapPin className="mx-auto mb-2 h-8 w-8 text-primary/60" />
        <p className="text-sm font-medium text-muted-foreground">Interactive Map</p>
        <p className="mt-1 text-xs text-muted-foreground/60">React Leaflet will render here</p>
      </div>
    </div>
  )
}
