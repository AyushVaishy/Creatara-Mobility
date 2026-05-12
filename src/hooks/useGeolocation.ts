'use client'

import { useState, useEffect } from 'react'
import { GLOBAL_CITIES } from '@/lib/constants'
import type { CityConfig } from '@/types'

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findNearestCity(lat: number, lon: number): CityConfig {
  return GLOBAL_CITIES.reduce((nearest, city) => {
    const d = haversine(lat, lon, city.latitude, city.longitude)
    const nd = haversine(lat, lon, nearest.latitude, nearest.longitude)
    return d < nd ? city : nearest
  })
}

export interface GeolocationState {
  lat: number | null
  lon: number | null
  nearestCity: CityConfig | null
  loading: boolean
  denied: boolean
  error: string | null
}

export function useGeolocation(): GeolocationState {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fallbackCity = GLOBAL_CITIES.find((c) => c.id === 'delhi') ?? GLOBAL_CITIES[0]

  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lon: null,
    nearestCity: null,
    loading: true,
    denied: false,
    error: null,
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setState({
        lat: fallbackCity.latitude,
        lon: fallbackCity.longitude,
        nearestCity: fallbackCity,
        loading: false,
        denied: true,
        error: 'Geolocation not supported',
      })
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords
        const nearestCity = findNearestCity(lat, lon)
        setState({ lat, lon, nearestCity, loading: false, denied: false, error: null })
      },
      () => {
        setState({
          lat: fallbackCity.latitude,
          lon: fallbackCity.longitude,
          nearestCity: fallbackCity,
          loading: false,
          denied: true,
          error: 'Location access denied',
        })
      },
      { timeout: 8000, enableHighAccuracy: false, maximumAge: 300_000 },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return state
}
