import type {
  CityConfig,
  CityIntelligence,
  CityMetadata,
  WeatherNormalized,
  AQINormalized,
  CurrencyNormalized,
  CurrencyApiResponse,
  AggregateOptions,
} from '@/types'
import { fetchNormalizedWeather } from '@/services/weather/weatherService'
import { fetchNormalizedAQI } from '@/services/aqi/aqiService'
import { fetchExchangeRates, buildCurrencyNormalized } from '@/services/currency/currencyService'
import { insertMetric } from '@/lib/db/repositories/metricRepository'
import { logger } from '@/lib/utils/logger'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildCityMetadata(city: CityConfig): CityMetadata {
  return {
    id:          city.id,
    name:        city.name,
    country:     city.country,
    countryCode: city.countryCode,
    timezone:    city.timezone,
    population:  city.population,
    coordinates: { lat: city.latitude, lon: city.longitude },
    currency:    city.currency,
  }
}

/**
 * Persists the fetched snapshot to MongoDB in a fire-and-forget manner.
 * Errors are logged but never bubble up to the caller.
 */
async function persistSnapshot(
  city: CityConfig,
  weather: WeatherNormalized | null,
  aqi: AQINormalized | null,
  currency: CurrencyNormalized | null,
): Promise<void> {
  try {
    await insertMetric({
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
    logger.debug(`Snapshot persisted for ${city.id}`, 'cityAggregator')
  } catch (err: unknown) {
    logger.warn(`Failed to persist snapshot for ${city.id}: ${(err as Error).message}`, 'cityAggregator')
  }
}

// ─── Main aggregator ─────────────────────────────────────────────────────────

/**
 * Fetches weather, AQI, and currency for a single city in parallel.
 *
 * Uses Promise.allSettled so that if one external API fails the other
 * two still return data — the response signals partial availability via
 * the `dataAvailability` and `warnings` fields.
 *
 * Currency is fetched once and shared across all cities in a batch call
 * (see aggregateAllCities). When calling for a single city, currency is
 * fetched inline.
 */
export async function aggregateCityData(
  city: CityConfig,
  options: AggregateOptions = {},
  sharedRates?: CurrencyApiResponse,
): Promise<CityIntelligence> {
  const { persist = true } = options

  logger.info(`Aggregating data for ${city.name}`, 'cityAggregator')

  // Run weather + AQI in parallel; currency is either shared or fetched inline
  const [weatherResult, aqiResult, currencyResult] = await Promise.allSettled([
    fetchNormalizedWeather(city),
    fetchNormalizedAQI(city),
    sharedRates
      ? Promise.resolve({ success: true as const, data: buildCurrencyNormalized(city.currency, sharedRates) })
      : fetchExchangeRates().then((r) =>
          r.success
            ? { success: true as const, data: buildCurrencyNormalized(city.currency, r.data) }
            : r,
        ),
  ])

  // Unwrap each settled result
  const weather: WeatherNormalized | null =
    weatherResult.status === 'fulfilled' && weatherResult.value.success
      ? weatherResult.value.data
      : null

  const aqi: AQINormalized | null =
    aqiResult.status === 'fulfilled' && aqiResult.value.success
      ? aqiResult.value.data
      : null

  const currency: CurrencyNormalized | null =
    currencyResult.status === 'fulfilled' && currencyResult.value.success
      ? (currencyResult.value.data as CurrencyNormalized)
      : null

  // Collect non-fatal warnings from failed services
  const warnings: string[] = []

  if (!weather) {
    const reason =
      weatherResult.status === 'rejected'
        ? (weatherResult.reason as Error)?.message
        : weatherResult.status === 'fulfilled' && !weatherResult.value.success
          ? weatherResult.value.error.message
          : 'Unknown error'
    warnings.push(`Weather unavailable: ${reason}`)
    logger.warn(`Weather fetch failed for ${city.name}: ${reason}`, 'cityAggregator')
  }

  if (!aqi) {
    const reason =
      aqiResult.status === 'rejected'
        ? (aqiResult.reason as Error)?.message
        : aqiResult.status === 'fulfilled' && !aqiResult.value.success
          ? aqiResult.value.error.message
          : 'Unknown error'
    warnings.push(`AQI unavailable: ${reason}`)
    logger.warn(`AQI fetch failed for ${city.name}: ${reason}`, 'cityAggregator')
  }

  if (!currency) {
    const reason =
      currencyResult.status === 'rejected'
        ? (currencyResult.reason as Error)?.message
        : currencyResult.status === 'fulfilled' && !currencyResult.value.success
          ? (currencyResult.value as { success: false; error: { message: string } }).error.message
          : 'Unknown error'
    warnings.push(`Currency unavailable: ${reason}`)
    logger.warn(`Currency fetch failed for ${city.name}: ${reason}`, 'cityAggregator')
  }

  // Persist to DB asynchronously (fire-and-forget)
  if (persist && (weather || aqi || currency)) {
    void persistSnapshot(city, weather, aqi, currency)
  }

  return {
    city:    buildCityMetadata(city),
    weather,
    aqi,
    currency,
    lastUpdated: new Date().toISOString(),
    dataAvailability: {
      weather:  weather  !== null,
      aqi:      aqi      !== null,
      currency: currency !== null,
    },
    warnings,
  }
}

/**
 * Aggregates data for multiple cities efficiently:
 * - Fetches exchange rates ONCE (shared across all cities)
 * - Fetches weather + AQI for all cities concurrently
 */
export async function aggregateAllCities(
  cities: CityConfig[],
  options: AggregateOptions = {},
): Promise<CityIntelligence[]> {
  logger.info(`Aggregating data for ${cities.length} cities`, 'cityAggregator')

  // Fetch rates once — shared across all city aggregations
  const ratesResult = await fetchExchangeRates()
  const sharedRates = ratesResult.success ? ratesResult.data : undefined

  if (!sharedRates) {
    logger.warn('Shared currency rates unavailable — currency data will be null for all cities', 'cityAggregator')
  }

  // Aggregate all cities concurrently
  const results = await Promise.allSettled(
    cities.map((city) => aggregateCityData(city, options, sharedRates)),
  )

  return results.map((result, index) => {
    if (result.status === 'fulfilled') return result.value

    // Should never happen since aggregateCityData itself handles errors,
    // but provides a safe fallback just in case.
    const city = cities[index]
    logger.error(`Unexpected aggregation failure for ${city.name}`, 'cityAggregator', result.reason)
    return {
      city:    buildCityMetadata(city),
      weather: null,
      aqi:     null,
      currency: null,
      lastUpdated: new Date().toISOString(),
      dataAvailability: { weather: false, aqi: false, currency: false },
      warnings: [`Aggregation failed: ${(result.reason as Error)?.message ?? 'unknown'}`],
    } satisfies CityIntelligence
  })
}
