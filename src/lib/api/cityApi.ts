import type {
  ApiResponse,
  CityConfig,
  CityIntelligence,
  CityLatestResponse,
  CityHistoryResponse,
} from '@/types'

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  const json = (await res.json()) as ApiResponse<T>
  if (!json.success || json.data === undefined) {
    throw new Error(json.error ?? 'Unknown API error')
  }
  return json.data
}

export const cityApi = {
  /** Returns the static list of configured cities from DB or fallback. */
  getAllCities: (): Promise<CityConfig[]> =>
    apiFetch<CityConfig[]>('/api/cities'),

  /** Returns the latest stored metric snapshot for a single city. */
  getCityLatest: (cityId: string): Promise<CityLatestResponse> =>
    apiFetch<CityLatestResponse>(`/api/cities/${cityId}/latest`),

  /** Fetches live intelligence from external APIs and persists to DB. */
  getCityIntelligence: (cityId: string): Promise<CityIntelligence> =>
    apiFetch<CityIntelligence>(`/api/cities/${cityId}?live=true`),

  /** Returns N-day historical trends with daily aggregation buckets. */
  getCityHistory: (cityId: string, days: number): Promise<CityHistoryResponse> =>
    apiFetch<CityHistoryResponse>(`/api/cities/${cityId}/history?days=${days}`),
}
