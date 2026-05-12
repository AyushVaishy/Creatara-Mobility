'use client'

// WorldMap — SSR-safe dynamic import wrapper for WorldMapInner.
// Leaflet requires the browser DOM; this prevents server-side rendering.
import dynamic from 'next/dynamic'
import type { CityLatestResponse } from '@/types'
import { MapSkeleton } from '@/components/loaders/MapSkeleton'

interface WorldMapProps {
  citiesLatestMap?: Record<string, CityLatestResponse | null>
  selectedCityId?: string | null
  onCityClick: (cityId: string) => void
  className?: string
}

// Dynamically imported — Leaflet code never runs on the server.
const WorldMapInner = dynamic(
  () => import('./WorldMapInner').then((m) => ({ default: m.WorldMapInner })),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
)

export function WorldMap({ className, ...props }: WorldMapProps) {
  return (
    <div className={className ?? 'h-[60vh] min-h-[400px] w-full'}>
      <WorldMapInner {...props} />
    </div>
  )
}
