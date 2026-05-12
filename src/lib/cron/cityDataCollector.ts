import type { CronRunSummary } from '@/types'
import { insertMetricDeduped } from '@/lib/db/repositories/metricRepository'
import { GLOBAL_CITIES } from '@/lib/constants'
import { logger } from '@/lib/utils/logger'
import type { WeatherNormalized, AQINormalized, CurrencyNormalized, CityConfig } from '@/types'
import { fetchExchangeRates, buildCurrencyNormalized } from '@/services/currency/currencyService'
import { fetchNormalizedWeather } from '@/services/weather/weatherService'
import { fetchNormalizedAQI } from '@/services/aqi/aqiService'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Persists a snapshot using deduplication (skips if a record already exists
 * within the last 25 minutes for this city).
 *
 * Returns true if the record was written, false if deduplicated or failed.
 */
async function persistDedupedSnapshot(
  city: CityConfig,
  weather: WeatherNormalized | null,
  aqi: AQINormalized | null,
  currency: CurrencyNormalized | null,
): Promise<boolean> {
  try {
    const result = await insertMetricDeduped({
      cityId:             city.id,
      temperature:        weather?.temperature        ?? null,
      feelsLike:          weather?.feelsLike          ?? null,
      humidity:           weather?.humidity           ?? null,
      windSpeed:          weather?.windSpeed          ?? null,
      pressure:           weather?.pressure           ?? null,
      visibility:         weather?.visibility         ?? null,
      weatherCondition:   weather?.condition          ?? null,
      weatherDescription: weather?.description        ?? null,
      weatherIcon:        weather?.icon               ?? null,
      aqi:                aqi?.aqi                    ?? null,
      aqiCategory:        aqi?.category               ?? null,
      pm25:               aqi?.pm25                   ?? null,
      pm10:               aqi?.pm10                   ?? null,
      o3:                 aqi?.o3                     ?? null,
      no2:                aqi?.no2                    ?? null,
      currencyRates:      new Map(Object.entries(currency?.allRates ?? {})),
      currencyBase:       currency?.ratesBase         ?? null,
      recordedAt:         new Date(),
    })

    if (!result) {
      logger.debug(`Deduped snapshot skipped for ${city.id} (recent record exists)`, 'cityDataCollector')
      return false
    }

    logger.debug(`Snapshot persisted for ${city.id}`, 'cityDataCollector')
    return true
  } catch (err) {
    logger.warn(`Failed to persist snapshot for ${city.id}: ${(err as Error).message}`, 'cityDataCollector')
    return false
  }
}

// ─── Main collector ───────────────────────────────────────────────────────────

/**
 * Collects live data for all 10 configured cities and persists snapshots.
 *
 * Strategy:
 * 1. Fetch exchange rates once (shared across all cities)
 * 2. For each city, fetch weather + AQI in parallel
 * 3. Persist using deduplication guard
 * 4. Return a detailed summary (useful for both cron logs and the manual trigger endpoint)
 *
 * Never throws — all errors are caught and surfaced in the summary.
 */
export async function collectAllCities(): Promise<CronRunSummary> {
  const startedAt = Date.now()
  const triggeredAt = new Date().toISOString()

  logger.info(`City data collection started (${GLOBAL_CITIES.length} cities)`, 'cityDataCollector')

  // ── Step 1: fetch rates once ─────────────────────────────────────────────
  const ratesResult = await fetchExchangeRates()
  const sharedRates = ratesResult.success ? ratesResult.data : undefined

  if (!sharedRates) {
    logger.warn('Exchange rates unavailable — currency will be null for all cities', 'cityDataCollector')
  }

  // ── Step 2: collect each city ────────────────────────────────────────────
  const cityResults = await Promise.allSettled(
    GLOBAL_CITIES.map(async (city) => {
      const warnings: string[] = []

      // Fetch weather + AQI in parallel; currency is built from shared rates
      const [weatherResult, aqiResult] = await Promise.allSettled([
        fetchNormalizedWeather(city),
        fetchNormalizedAQI(city),
      ])

      const weather: WeatherNormalized | null =
        weatherResult.status === 'fulfilled' && weatherResult.value.success
          ? weatherResult.value.data
          : null

      const aqi: AQINormalized | null =
        aqiResult.status === 'fulfilled' && aqiResult.value.success
          ? aqiResult.value.data
          : null

      const currency: CurrencyNormalized | null = sharedRates
        ? buildCurrencyNormalized(city.currency, sharedRates)
        : null

      // Collect warnings from failed services
      if (!weather) {
        const msg =
          weatherResult.status === 'rejected'
            ? (weatherResult.reason as Error)?.message
            : weatherResult.status === 'fulfilled' && !weatherResult.value.success
              ? weatherResult.value.error.message
              : 'Unknown error'
        warnings.push(`Weather unavailable: ${msg}`)
      }

      if (!aqi) {
        const msg =
          aqiResult.status === 'rejected'
            ? (aqiResult.reason as Error)?.message
            : aqiResult.status === 'fulfilled' && !aqiResult.value.success
              ? aqiResult.value.error.message
              : 'Unknown error'
        warnings.push(`AQI unavailable: ${msg}`)
      }

      if (!currency) warnings.push('Currency unavailable: exchange rates not fetched')

      // Persist with deduplication
      const persisted = await persistDedupedSnapshot(city, weather, aqi, currency)

      return { cityId: city.id, cityName: city.name, persisted, warnings }
    }),
  )

  // ── Step 3: build summary ────────────────────────────────────────────────
  const results = cityResults.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    // Unexpected failure from the outer Promise.allSettled wrapper
    const city = GLOBAL_CITIES[i]
    logger.error(`Unexpected failure collecting ${city.name}`, 'cityDataCollector', r.reason)
    return {
      cityId:   city.id,
      cityName: city.name,
      persisted: false,
      warnings: [`Unexpected error: ${(r.reason as Error)?.message ?? 'unknown'}`],
    }
  })

  const successfulCities = results.filter((r) => r.persisted).length
  const failedCities     = results.filter((r) => !r.persisted).map((r) => r.cityId)
  const durationMs       = Date.now() - startedAt

  logger.info(
    `Collection complete — ${successfulCities}/${GLOBAL_CITIES.length} persisted in ${durationMs}ms`,
    'cityDataCollector',
  )

  return {
    triggeredAt,
    durationMs,
    totalCities:      GLOBAL_CITIES.length,
    successfulCities,
    failedCities,
    results,
  }
}
