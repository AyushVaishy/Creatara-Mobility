import type { WeatherApiResponse, WeatherNormalized, ServiceResult, CityConfig } from '@/types'
import { createAxiosClient, withRetry } from '@/lib/http'
import { ERROR_CODES, HTTP_STATUS } from '@/lib/constants'
import { createAppError } from '@/lib/utils/apiResponse'
import { logger } from '@/lib/utils/logger'

// ─── Raw OpenWeather API types ────────────────────────────────────────────────

interface OWMCurrentResponse {
  main: {
    temp: number
    feels_like: number
    humidity: number
    pressure: number
  }
  wind: { speed: number; deg?: number }
  visibility: number
  weather: Array<{ id: number; main: string; description: string; icon: string }>
  dt: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeatherClient() {
  return createAxiosClient({
    baseURL: process.env.OPENWEATHER_BASE_URL ?? 'https://api.openweathermap.org/data/2.5',
    timeout: 8_000,
  })
}

/** Maps wind degrees (0–360) to a compass label. */
export function windDegToDirection(deg?: number): string {
  if (deg === undefined) return 'N/A'
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

/** Returns the full HTTPS URL for an OpenWeather icon code. */
export function openWeatherIconUrl(iconCode: string): string {
  return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
}

/** Converts raw OWM response to normalised WeatherNormalized shape. */
function normalizeWeather(d: OWMCurrentResponse, cityId: string, cityName: string): { api: WeatherApiResponse; normalized: WeatherNormalized } {
  const icon = d.weather[0]?.icon ?? ''
  const api: WeatherApiResponse = {
    cityId,
    cityName,
    temperature:  d.main.temp,
    feelsLike:    d.main.feels_like,
    humidity:     d.main.humidity,
    windSpeed:    d.wind.speed,
    pressure:     d.main.pressure,
    visibility:   d.visibility,
    condition:    d.weather[0]?.main        ?? 'Unknown',
    description:  d.weather[0]?.description ?? 'Unknown',
    icon,
    timestamp:    new Date(d.dt * 1000),
  }
  const normalized: WeatherNormalized = {
    temperature:   Math.round(d.main.temp * 10) / 10,
    feelsLike:     Math.round(d.main.feels_like * 10) / 10,
    humidity:      d.main.humidity,
    windSpeed:     Math.round(d.wind.speed * 10) / 10,
    windDirection: windDegToDirection(d.wind.deg),
    pressure:      d.main.pressure,
    visibility:    Math.round(d.visibility / 100) / 10, // convert m → km
    condition:     d.weather[0]?.main        ?? 'Unknown',
    description:   d.weather[0]?.description ?? 'Unknown',
    icon,
    iconUrl:       openWeatherIconUrl(icon),
  }
  return { api, normalized }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetches and normalises current weather for a city by coordinates. */
export async function fetchWeatherByCoords(
  city: CityConfig,
): Promise<ServiceResult<WeatherApiResponse>> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: createAppError('OpenWeather API key not configured', ERROR_CODES.WEATHER_FETCH_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE),
    }
  }

  const client = getWeatherClient()
  try {
    const response = await withRetry(() =>
      client.get<OWMCurrentResponse>('/weather', {
        params: { lat: city.latitude, lon: city.longitude, appid: apiKey, units: 'metric' },
      }),
    )
    const { api } = normalizeWeather(response.data, city.id, city.name)
    return { success: true, data: api }
  } catch (error: unknown) {
    const message = (error as Error).message ?? 'Weather fetch failed'
    logger.error(message, 'weatherService', { cityId: city.id })
    return { success: false, error: createAppError(message, ERROR_CODES.WEATHER_FETCH_FAILED, HTTP_STATUS.BAD_REQUEST) }
  }
}

/** Fetches weather and returns the fully normalised WeatherNormalized object. */
export async function fetchNormalizedWeather(
  city: CityConfig,
): Promise<ServiceResult<WeatherNormalized>> {
  const apiKey = process.env.OPENWEATHER_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: createAppError('OpenWeather API key not configured', ERROR_CODES.WEATHER_FETCH_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE),
    }
  }

  const client = getWeatherClient()
  try {
    const response = await withRetry(() =>
      client.get<OWMCurrentResponse>('/weather', {
        params: { lat: city.latitude, lon: city.longitude, appid: apiKey, units: 'metric' },
      }),
    )
    const { normalized } = normalizeWeather(response.data, city.id, city.name)
    return { success: true, data: normalized }
  } catch (error: unknown) {
    const message = (error as Error).message ?? 'Weather fetch failed'
    logger.error(message, 'weatherService', { cityId: city.id })
    return { success: false, error: createAppError(message, ERROR_CODES.WEATHER_FETCH_FAILED, HTTP_STATUS.BAD_REQUEST) }
  }
}
