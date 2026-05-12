'use client'

// WorldMapInner — actual Leaflet map, client-only.
// Imported exclusively via WorldMap.tsx dynamic() to avoid SSR issues.
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet'
import { useEffect, useRef, useCallback } from 'react'
import { RotateCcw, Plus, Minus } from 'lucide-react'
import type { CityLatestResponse } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import { getAQICategory, getAQIColor, formatTemperature } from '@/lib/utils'
import { GLOBAL_CITIES, DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/constants'
import { MapLegend } from './MapLegend'

interface WorldMapInnerProps {
  citiesLatestMap?: Record<string, CityLatestResponse | null>
  selectedCityId?: string | null
  onCityClick: (cityId: string) => void
}

/** Child component to capture the L.Map instance via useMap(). */
function MapRefCapture({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => { onReady(map) }, [map, onReady])
  return null
}

function buildMarkerIcon(aqi: number | null, isSelected: boolean): L.DivIcon {
  const color  = aqi !== null ? getAQIColor(getAQICategory(aqi)) : '#6b7280'
  const size   = isSelected ? 44 : 36
  const dot    = isSelected ? 14 : 10
  const glow   = isSelected ? `0 0 12px ${color}, 0 0 24px ${color}55` : `0 0 7px ${color}88`

  const selectedOuterRing = isSelected
    ? `<div style="position:absolute;inset:-7px;border-radius:50%;border:1px solid ${color};opacity:0.2;"></div>`
    : ''

  return L.divIcon({
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `
      <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
        ${selectedOuterRing}
        <div style="
          position:absolute;inset:0;border-radius:50%;
          border:1.5px solid ${color};
          animation:city-marker-pulse 2.2s ease-out infinite;
        "></div>
        <div style="
          width:${dot}px;height:${dot}px;border-radius:50%;
          background:${color};
          box-shadow:${glow};
          border:${isSelected ? '2px' : '1.5px'} solid rgba(255,255,255,0.88);
          position:relative;z-index:2;
          transition:all 0.2s ease;
        "></div>
      </div>`,
  })
}

export function WorldMapInner({ citiesLatestMap = {}, selectedCityId, onCityClick }: WorldMapInnerProps) {
  const { isDark } = useTheme()
  const mapRef = useRef<L.Map | null>(null)

  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

  const handleMapReady = useCallback((map: L.Map) => {
    mapRef.current = map
  }, [])

  const resetView = useCallback(() => {
    mapRef.current?.setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, { animate: true })
  }, [])

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl">
      <MapContainer
        center={DEFAULT_MAP_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        minZoom={2}
        maxZoom={10}
        zoomControl={false}
        scrollWheelZoom
        className="h-full w-full"
        style={{ background: isDark ? '#1a1f2e' : '#eef0f4' }}
      >
        <MapRefCapture onReady={handleMapReady} />

        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={tileUrl}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          maxZoom={19}
        />

        {GLOBAL_CITIES.map((city) => {
          const latest     = citiesLatestMap[city.id]
          const aqi        = latest?.metric?.aqi ?? null
          const temp       = latest?.metric?.temperature ?? null
          const isSelected = city.id === selectedCityId

          return (
            <Marker
              key={city.id}
              position={[city.latitude, city.longitude]}
              icon={buildMarkerIcon(aqi, isSelected)}
              eventHandlers={{ click: () => onCityClick(city.id) }}
            >
              <Tooltip
                direction="top"
                offset={[0, -10]}
                className="city-tooltip-premium"
              >
                <div style={{ minWidth: 110 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#f1f5f9' }}>
                    {city.name}
                  </div>
                  {temp !== null && (
                    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>
                      🌡 {formatTemperature(temp)}
                    </div>
                  )}
                  {aqi !== null && (
                    <div style={{ fontSize: 11, color: getAQIColor(getAQICategory(aqi)) }}>
                      ● AQI {aqi} · {getAQICategory(aqi)}
                    </div>
                  )}
                  {temp === null && aqi === null && (
                    <div style={{ fontSize: 11, color: '#475569' }}>No data yet</div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Custom zoom + reset controls */}
      <div className="absolute bottom-4 right-3 z-[1000] flex flex-col gap-1.5">
        <button
          onClick={resetView}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
          title="Reset view"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
          title="Zoom in"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/50 bg-background/90 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-background"
          title="Zoom out"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>

      <MapLegend />
    </div>
  )
}
