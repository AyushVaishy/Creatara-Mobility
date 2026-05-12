import type { ServiceResult } from '@/types'
import { createAxiosClient, withRetry } from '@/lib/http'
import { ERROR_CODES, HTTP_STATUS } from '@/lib/constants'
import { createAppError } from '@/lib/utils/apiResponse'
import { logger } from '@/lib/utils/logger'

export interface GeoCity {
  id:          number
  wikiDataId:  string
  name:        string
  country:     string
  countryCode: string
  latitude:    number
  longitude:   number
  population:  number
  timezone:    string
}

interface GeoDBResponse {
  data: GeoCity[]
  metadata: { currentOffset: number; totalCount: number }
}

function getGeoClient() {
  return createAxiosClient({
    baseURL:      process.env.GEODB_BASE_URL ?? 'https://wft-geo-db.p.rapidapi.com/v1/geo',
    apiKey:       process.env.GEODB_API_KEY ?? '',
    apiKeyHeader: 'X-RapidAPI-Key',
    timeout:      8_000,
    headers: {
      'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com',
    },
  })
}

/** Searches GeoDB Cities API for cities matching a text query. */
export async function searchCities(
  query: string,
  limit = 5,
): Promise<ServiceResult<GeoCity[]>> {
  const apiKey = process.env.GEODB_API_KEY

  if (!apiKey) {
    return {
      success: false,
      error: createAppError(
        'GeoDB API key not configured',
        ERROR_CODES.GEODB_FETCH_FAILED,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      ),
    }
  }

  const client = getGeoClient()

  try {
    const response = await withRetry(() =>
      client.get<GeoDBResponse>('/cities', {
        params: {
          namePrefix: query,
          limit,
          sort:       '-population',
          types:      'CITY',
        },
      }),
    )

    return { success: true, data: response.data.data }
  } catch (error: unknown) {
    const message = (error as Error).message ?? 'GeoDB fetch failed'
    logger.error(message, 'geoService', { query })
    return {
      success: false,
      error: createAppError(message, ERROR_CODES.GEODB_FETCH_FAILED, HTTP_STATUS.BAD_REQUEST),
    }
  }
}

/** Fetches details for a specific city by its GeoDB ID. */
export async function getCityDetails(
  cityId: number,
): Promise<ServiceResult<GeoCity>> {
  const apiKey = process.env.GEODB_API_KEY

  if (!apiKey) {
    return {
      success: false,
      error: createAppError(
        'GeoDB API key not configured',
        ERROR_CODES.GEODB_FETCH_FAILED,
        HTTP_STATUS.SERVICE_UNAVAILABLE,
      ),
    }
  }

  const client = getGeoClient()

  try {
    const response = await withRetry(() =>
      client.get<{ data: GeoCity }>(`/cities/${cityId}`),
    )

    return { success: true, data: response.data.data }
  } catch (error: unknown) {
    const message = (error as Error).message ?? 'GeoDB city details fetch failed'
    logger.error(message, 'geoService', { cityId })
    return {
      success: false,
      error: createAppError(message, ERROR_CODES.GEODB_FETCH_FAILED, HTTP_STATUS.BAD_REQUEST),
    }
  }
}
