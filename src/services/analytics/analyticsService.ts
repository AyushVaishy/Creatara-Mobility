import type {
  CityHistoryResponse,
  CityLatestResponse,
  LeanCityMetric,
  HourlyTrend,
  HistoryPeriod,
} from '@/types'
import {
  getLatestMetricByCityId,
  getMetricsByCityId,
  getPeriodSummary,
  getDailyTrend,
  getHourlyTrends,
} from '@/lib/db/repositories/metricRepository'
import { GLOBAL_CITIES } from '@/lib/constants'
import { logger } from '@/lib/utils/logger'
import { buildFallbackHistory, buildFallbackLatest } from './localHistoryFallback'
import { aggregateAllCities } from '@/services/city/cityAggregator'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveCityName(cityId: string): string {
  return GLOBAL_CITIES.find((c) => c.id === cityId)?.name ?? cityId
}

function clampPeriod(raw: number): HistoryPeriod {
  if (raw <= 1)  return 1
  if (raw <= 7)  return 7
  if (raw <= 15) return 15
  return 30
}

// ─── Live Fallback Cache ──────────────────────────────────────────────────────

let liveDataCache: { timestamp: number; data: Record<string, LeanCityMetric> } | null = null
let liveDataPromise: Promise<Record<string, LeanCityMetric>> | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getLiveDataFallback(): Promise<Record<string, LeanCityMetric>> {
  if (liveDataCache && Date.now() - liveDataCache.timestamp < CACHE_TTL) {
    return liveDataCache.data
  }
  if (liveDataPromise) return liveDataPromise

  liveDataPromise = (async () => {
    logger.info('Fetching live data fallback for all cities (DB disconnected)', 'analyticsService')
    const results = await aggregateAllCities(GLOBAL_CITIES, { persist: false })
    
    const data: Record<string, LeanCityMetric> = {}
    for (const intel of results) {
       data[intel.city.id] = {
          _id: `live-fallback-${Date.now()}`,
          cityId: intel.city.id,
          temperature: intel.weather?.temperature ?? null,
          feelsLike: intel.weather?.feelsLike ?? null,
          humidity: intel.weather?.humidity ?? null,
          windSpeed: intel.weather?.windSpeed ?? null,
          pressure: intel.weather?.pressure ?? null,
          visibility: intel.weather?.visibility ?? null,
          weatherCondition: intel.weather?.condition ?? null,
          weatherDescription: intel.weather?.description ?? null,
          weatherIcon: intel.weather?.icon ?? null,
          aqi: intel.aqi?.aqi ?? null,
          aqiCategory: intel.aqi?.category ?? null,
          pm25: intel.aqi?.pm25 ?? null,
          pm10: intel.aqi?.pm10 ?? null,
          o3: intel.aqi?.o3 ?? null,
          no2: intel.aqi?.no2 ?? null,
          currencyRates: intel.currency?.allRates ?? {},
          currencyBase: intel.currency?.ratesBase ?? null,
          recordedAt: new Date(),
          createdAt: new Date(),
       } as unknown as LeanCityMetric
    }
    return data
  })()

  try {
     const data = await liveDataPromise
     liveDataCache = { timestamp: Date.now(), data }
     return data
  } finally {
     liveDataPromise = null
  }
}

// ─── Analytics service ────────────────────────────────────────────────────────

/**
 * Returns the latest stored metric for a city.
 * Never throws — returns null metric on any error.
 */
export async function getCityLatest(cityId: string): Promise<CityLatestResponse> {
  const cityName = resolveCityName(cityId)
  try {
    const metric = await getLatestMetricByCityId(cityId)
    return {
      cityId,
      cityName,
      metric:     metric as unknown as LeanCityMetric | null,
      recordedAt: metric?.recordedAt?.toISOString() ?? null,
    }
  } catch (err) {
    logger.warn(`getCityLatest DB failed for ${cityId}, attempting live fallback...`, 'analyticsService')
    try {
      const fallbackData = await getLiveDataFallback()
      const metric = fallbackData[cityId] || buildFallbackLatest(cityId, cityName)
      return {
        cityId,
        cityName,
        metric,
        recordedAt: metric?.recordedAt?.toISOString() ?? null,
      }
    } catch (liveErr) {
      logger.error(`Live fallback failed for ${cityId}, using static fallback`, 'analyticsService', liveErr)
      const fallbackMetric = buildFallbackLatest(cityId, cityName)
      return {
        cityId,
        cityName,
        metric: fallbackMetric,
        recordedAt: fallbackMetric?.recordedAt?.toISOString() ?? null,
      }
    }
  }
}

/**
 * Returns full history for a city over `days` days including daily trend
 * arrays, period summary, and raw records (max 200, newest first).
 */
export async function getCityHistory(
  cityId: string,
  days: number,
): Promise<CityHistoryResponse> {
  const period = clampPeriod(days)
  const cityName = resolveCityName(cityId)

  logger.info(`Building ${period}d history for ${cityId}`, 'analyticsService')

  try {
    const [summary, temperatureTrend, aqiTrend, humidityTrend, records] =
      await Promise.all([
        getPeriodSummary(cityId, period),
        getDailyTrend(cityId, 'temperature', period),
        getDailyTrend(cityId, 'aqi', period),
        getDailyTrend(cityId, 'humidity', period),
        getMetricsByCityId({ cityId, limit: 200, page: 1,
          from: new Date(Date.now() - period * 24 * 60 * 60 * 1000),
        }),
      ])

    return {
      cityId,
      cityName,
      period,
      summary,
      temperatureTrend,
      aqiTrend,
      humidityTrend,
      records: records.map((r) => ({
        temperature:      r.temperature,
        humidity:         r.humidity,
        windSpeed:        r.windSpeed,
        aqi:              r.aqi,
        aqiCategory:      r.aqiCategory,
        weatherCondition: r.weatherCondition,
        recordedAt:       r.recordedAt,
      })),
    }
  } catch (err) {
    logger.warn(`getCityHistory DB failed for ${cityId}, using fallback: ${(err as Error).message}`, 'analyticsService')
    const fallback = buildFallbackHistory(cityId, cityName, period)
    if (fallback) return fallback
    throw err
  }
}

/**
 * Returns 24-hour hourly trends (temperature, AQI, humidity) for a city.
 * Each array contains ≤24 data points, one per hour bucket.
 */
export async function getCityHourlyTrends(cityId: string): Promise<HourlyTrend> {
  try {
    const raw = await getHourlyTrends(cityId)
    return {
      cityId,
      temperature: raw.temperature,
      aqi:         raw.aqi,
      humidity:    raw.humidity,
    }
  } catch (err) {
    const cityName = resolveCityName(cityId)
    const fallback = buildFallbackHistory(cityId, cityName, 1)
    if (fallback) {
      return {
        cityId,
        temperature: fallback.temperatureTrend,
        aqi: fallback.aqiTrend,
        humidity: fallback.humidityTrend,
      }
    }
    throw err
  }
}

/**
 * Returns AQI trend for `days` days including the category label of the
 * most recent data point.
 */
export async function getAQITrend(cityId: string, days: number) {
  const period  = clampPeriod(days)
  try {
    const points  = await getDailyTrend(cityId, 'aqi', period)
    const latest  = await getLatestMetricByCityId(cityId)

    return {
      cityId,
      period,
      points,
      latestCategory: latest?.aqiCategory ?? null,
    }
  } catch (err) {
    const cityName = resolveCityName(cityId)
    const fallback = buildFallbackHistory(cityId, cityName, period)
    if (fallback) {
      const fallbackLatest = buildFallbackLatest(cityId, cityName)
      return {
        cityId,
        period,
        points: fallback.aqiTrend,
        latestCategory: fallbackLatest?.aqiCategory ?? null,
      }
    }
    throw err
  }
}

/**
 * Returns temperature trend for `days` days.
 */
export async function getTemperatureTrend(cityId: string, days: number) {
  const period = clampPeriod(days)
  try {
    const points = await getDailyTrend(cityId, 'temperature', period)
    return { cityId, period, unit: '°C' as const, points }
  } catch (err) {
    const cityName = resolveCityName(cityId)
    const fallback = buildFallbackHistory(cityId, cityName, period)
    if (fallback) {
      return { cityId, period, unit: '°C' as const, points: fallback.temperatureTrend }
    }
    throw err
  }
}
