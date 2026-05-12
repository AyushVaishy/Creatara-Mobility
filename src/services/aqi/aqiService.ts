import type { AQIApiResponse, AQINormalized, AQICategory, ServiceResult, CityConfig } from '@/types'
import { createAxiosClient, withRetry } from '@/lib/http'
import { ERROR_CODES, HTTP_STATUS, AQI_THRESHOLDS, AQI_COLORS } from '@/lib/constants'
import { createAppError } from '@/lib/utils/apiResponse'
import { logger } from '@/lib/utils/logger'

// ─── OpenAQ v3 types ──────────────────────────────────────────────────────────

interface OAQLocation {
  id: number
  name: string
  sensors: Array<{
    id: number
    name: string
    parameter: { id: number; name: string; units: string; displayName: string }
  }>
}

interface OAQLocationsResponse {
  results: OAQLocation[]
}

interface OAQLatestMeasurement {
  value: number
  sensorsId?: number
  parameter?: { name: string; units: string }
  datetime: { local: string; utc: string }
}

interface OAQLatestResponse {
  results: OAQLatestMeasurement[]
}

// ─── EPA AQI breakpoints ──────────────────────────────────────────────────────
// Source: US EPA Technical Assistance Document, May 2016

interface Breakpoint {
  cLow: number; cHigh: number
  iLow: number; iHigh: number
}

const PM25_BREAKPOINTS: Breakpoint[] = [
  { cLow: 0.0,  cHigh: 12.0,  iLow: 0,   iHigh: 50  },
  { cLow: 12.1, cHigh: 35.4,  iLow: 51,  iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4,  iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5,cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5,cHigh: 350.4, iLow: 301, iHigh: 400 },
  { cLow: 350.5,cHigh: 500.4, iLow: 401, iHigh: 500 },
]

/** Computes US EPA AQI from a PM2.5 concentration (μg/m³). */
export function pm25ToAQI(pm25: number): number {
  const c = Math.round(pm25 * 10) / 10 // truncate to 1 dp per EPA spec
  const bp = PM25_BREAKPOINTS.find((b) => c >= b.cLow && c <= b.cHigh)
  if (!bp) return c > 500.4 ? 500 : 0
  const aqi = ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (c - bp.cLow) + bp.iLow
  return Math.round(aqi)
}

export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= AQI_THRESHOLDS.GOOD)               return 'Good'
  if (aqi <= AQI_THRESHOLDS.MODERATE)           return 'Moderate'
  if (aqi <= AQI_THRESHOLDS.UNHEALTHY_SENSITIVE)return 'Unhealthy for Sensitive Groups'
  if (aqi <= AQI_THRESHOLDS.UNHEALTHY)          return 'Unhealthy'
  if (aqi <= AQI_THRESHOLDS.VERY_UNHEALTHY)     return 'Very Unhealthy'
  return 'Hazardous'
}

const HEALTH_ADVICE: Record<AQICategory, string> = {
  'Good':                           'Air quality is satisfactory. Outdoor activities are safe.',
  'Moderate':                       'Unusually sensitive people should consider limiting prolonged outdoor exertion.',
  'Unhealthy for Sensitive Groups': 'Sensitive groups should reduce prolonged outdoor exertion.',
  'Unhealthy':                      'Everyone should reduce prolonged outdoor exertion.',
  'Very Unhealthy':                 'Everyone should avoid prolonged outdoor exertion.',
  'Hazardous':                      'Health emergency — everyone should avoid all outdoor activities.',
}

/** Builds a normalised AQINormalized from raw pollutant values. */
export function buildAQINormalized(pm25: number, pm10: number, o3: number, no2: number): AQINormalized {
  const aqi      = pm25ToAQI(pm25)
  const category = getAQICategory(aqi)
  return {
    aqi,
    category,
    color:        AQI_COLORS[category],
    pm25:         Math.round(pm25 * 10) / 10,
    pm10:         Math.round(pm10 * 10) / 10,
    o3:           Math.round(o3  * 10) / 10,
    no2:          Math.round(no2 * 10) / 10,
    healthAdvice: HEALTH_ADVICE[category],
  }
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

function getAQIClient() {
  return createAxiosClient({
    baseURL:      process.env.OPENAQ_BASE_URL ?? 'https://api.openaq.org/v3',
    apiKey:       process.env.OPENAQ_API_KEY ?? '',
    apiKeyHeader: 'X-API-Key',
    timeout:      10_000,
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Two-step OpenAQ v3 flow:
 *  1. Find nearest monitoring station by coordinates.
 *  2. Fetch latest measurements for that station's sensors.
 */
export async function fetchAQIByCoords(
  city: CityConfig,
): Promise<ServiceResult<AQIApiResponse>> {
  const apiKey = process.env.OPENAQ_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: createAppError('OpenAQ API key not configured', ERROR_CODES.AQI_FETCH_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE),
    }
  }

  const client = getAQIClient()

  try {
    // Step 1 — find nearest station
    const locResponse = await withRetry(() =>
      client.get<OAQLocationsResponse>('/locations', {
        params: {
          coordinates: `${city.latitude},${city.longitude}`,
          radius:      25_000,
          limit:       1,
        },
      }),
    )

    const location = locResponse.data.results[0]
    if (!location) {
      logger.warn(`No OpenAQ station found near ${city.name}`, 'aqiService')
      return { success: false, error: createAppError(`No monitoring station found near ${city.name}`, ERROR_CODES.AQI_FETCH_FAILED, HTTP_STATUS.NOT_FOUND) }
    }

    // Step 2 — fetch latest measurements for the station
    const measResponse = await withRetry(() =>
      client.get<OAQLatestResponse>(`/locations/${location.id}/latest`),
    )

    // In OpenAQ v3, /latest returns sensorsId, not the full parameter object.
    // We map it back using the sensors array from step 1.
    const measurements = measResponse.data.results || []

    const getValue = (paramName: string): number => {
      // Find the sensor ID for this parameter from the location metadata
      const sensor = location.sensors?.find((s) => s.parameter.name.toLowerCase() === paramName)
      if (!sensor) return 0

      // Find the latest measurement for this sensor ID
      const m = measurements.find((r: any) => r.sensorsId === sensor.id)
      return m?.value ?? 0
    }

    const pm25 = getValue('pm25')
    const pm10 = getValue('pm10')
    const o3   = getValue('o3')
    const no2  = getValue('no2')
    const aqi  = pm25ToAQI(pm25)

    return {
      success: true,
      data: {
        cityId:   city.id,
        cityName: city.name,
        aqi,
        category: getAQICategory(aqi),
        pm25,
        pm10,
        o3,
        no2,
        timestamp: new Date(),
      },
    }
  } catch (error: unknown) {
    const message = (error as Error).message ?? 'AQI fetch failed'
    logger.error(message, 'aqiService', { cityId: city.id })
    return { success: false, error: createAppError(message, ERROR_CODES.AQI_FETCH_FAILED, HTTP_STATUS.BAD_REQUEST) }
  }
}

/** Fetches AQI and returns the fully normalised AQINormalized object. */
export async function fetchNormalizedAQI(
  city: CityConfig,
): Promise<ServiceResult<AQINormalized>> {
  const result = await fetchAQIByCoords(city)
  if (!result.success) return result

  const { pm25, pm10, o3, no2 } = result.data
  return { success: true, data: buildAQINormalized(pm25, pm10, o3, no2) }
}
