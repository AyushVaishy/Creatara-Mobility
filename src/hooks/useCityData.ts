'use client'

import { useMemo } from 'react'
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import type { CityConfig, CityIntelligence, CityLatestResponse, CityHistoryResponse } from '@/types'
import { GLOBAL_CITIES } from '@/lib/constants'
import { cityApi } from '@/lib/api/cityApi'

const STALE_5MIN  = 5  * 60 * 1000
const STALE_30MIN = 30 * 60 * 1000
const POLL_30SEC  = 30 * 1000

/** Static city list — long stale time, rarely changes. */
export function useAllCities() {
  return useQuery<CityConfig[]>({
    queryKey: ['cities'],
    queryFn: cityApi.getAllCities,
    staleTime: STALE_30MIN,
    placeholderData: GLOBAL_CITIES,
    retry: 2,
  })
}

/** Live city intelligence from external APIs — fetched on demand. */
export function useCityIntelligence(city: CityConfig | null) {
  return useQuery<CityIntelligence>({
    queryKey: ['city-intelligence', city?.id],
    queryFn: () => cityApi.getCityIntelligence(city!.id),
    enabled: !!city,
    staleTime: STALE_5MIN,
    retry: 2,
  })
}

/** Latest stored metric snapshot for a single city. */
export function useCityLatest(cityId: string | null) {
  return useQuery<CityLatestResponse>({
    queryKey: ['city-latest', cityId],
    queryFn: () => cityApi.getCityLatest(cityId!),
    enabled: !!cityId,
    staleTime: STALE_5MIN,
    retry: 2,
  })
}

/** N-day historical trend data for charts. */
export function useCityHistory(cityId: string | null, days: number = 7) {
  return useQuery<CityHistoryResponse>({
    queryKey: ['city-history', cityId, days],
    queryFn: () => cityApi.getCityHistory(cityId!, days),
    enabled: !!cityId,
    staleTime: STALE_5MIN,
    retry: 2,
  })
}

/**
 * Fetches latest metrics for all 10 cities in parallel.
 * Auto-polls every 30 s; returns stable dataMap + loading state.
 */
export function useAllCitiesLatest() {
  const results = useQueries({
    queries: GLOBAL_CITIES.map((city) => ({
      queryKey: ['city-latest', city.id] as const,
      queryFn: () => cityApi.getCityLatest(city.id),
      staleTime: STALE_5MIN,
      gcTime:    STALE_30MIN,
      refetchInterval: POLL_30SEC,
      refetchIntervalInBackground: false,
      retry: 2,
    })),
  })

  const dataMap = useMemo(
    () =>
      Object.fromEntries(
        GLOBAL_CITIES.map((city, i) => [city.id, results[i]?.data ?? null]),
      ) as Record<string, CityLatestResponse | null>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results.map((r) => r.dataUpdatedAt).join(',')],
  )

  const isLoading      = results.some((r) => r.isLoading)
  const isFetching     = results.some((r) => r.isFetching)
  const isError        = results.every((r) => r.isError)
  const loadedCount    = results.filter((r) => r.isSuccess).length
  const lastUpdatedAt  = Math.max(...results.map((r) => r.dataUpdatedAt ?? 0))

  return { dataMap, isLoading, isFetching, isError, loadedCount, lastUpdatedAt }
}

/** Invalidates all city-latest cache entries, triggering a background refetch. */
export function useRefreshAll() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['city-latest'] })
}
