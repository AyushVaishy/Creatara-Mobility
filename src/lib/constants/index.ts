export * from './cities'

export const APP_NAME = 'Global City Insights Dashboard'
export const APP_VERSION = '1.0.0'

// Data refresh intervals (ms)
export const WEATHER_REFRESH_INTERVAL = 10 * 60 * 1000  // 10 min
export const AQI_REFRESH_INTERVAL     = 15 * 60 * 1000  // 15 min
export const CURRENCY_REFRESH_INTERVAL = 60 * 60 * 1000 // 60 min

// Cron schedule strings
export const CRON_WEATHER_SCHEDULE  = '*/10 * * * *'   // every 10 min
export const CRON_AQI_SCHEDULE      = '*/15 * * * *'   // every 15 min
export const CRON_CURRENCY_SCHEDULE = '0 * * * *'      // every hour

// HTTP
export const DEFAULT_TIMEOUT_MS = 10_000
export const MAX_RETRIES        = 3
export const RETRY_BASE_DELAY   = 1_000

// Pagination
export const DEFAULT_PAGE_SIZE = 24
export const MAX_PAGE_SIZE     = 100

// Analytics
export const HISTORY_DAYS_DEFAULT = 7
export const HISTORY_DAYS_MAX     = 90

// UI
export const SIDEBAR_WIDTH = 380
export const MAP_HEIGHT    = '60vh'

// AQI thresholds (US EPA)
export const AQI_THRESHOLDS = {
  GOOD: 50,
  MODERATE: 100,
  UNHEALTHY_SENSITIVE: 150,
  UNHEALTHY: 200,
  VERY_UNHEALTHY: 300,
} as const

// AQI color map
export const AQI_COLORS = {
  Good:                           '#22c55e',
  Moderate:                       '#eab308',
  'Unhealthy for Sensitive Groups': '#f97316',
  Unhealthy:                      '#ef4444',
  'Very Unhealthy':               '#a855f7',
  Hazardous:                      '#7f1d1d',
} as const

// HTTP status codes
export const HTTP_STATUS = {
  OK:                    200,
  CREATED:               201,
  NO_CONTENT:            204,
  BAD_REQUEST:           400,
  UNAUTHORIZED:          401,
  FORBIDDEN:             403,
  NOT_FOUND:             404,
  TOO_MANY_REQUESTS:     429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE:   503,
} as const

// Error codes (internal)
export const ERROR_CODES = {
  DB_CONNECTION_FAILED:   'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED:        'DB_QUERY_FAILED',
  CITY_NOT_FOUND:         'CITY_NOT_FOUND',
  WEATHER_FETCH_FAILED:   'WEATHER_FETCH_FAILED',
  AQI_FETCH_FAILED:       'AQI_FETCH_FAILED',
  CURRENCY_FETCH_FAILED:  'CURRENCY_FETCH_FAILED',
  GEODB_FETCH_FAILED:     'GEODB_FETCH_FAILED',
  INVALID_CITY_ID:        'INVALID_CITY_ID',
  RATE_LIMIT_EXCEEDED:    'RATE_LIMIT_EXCEEDED',
  EXTERNAL_API_ERROR:     'EXTERNAL_API_ERROR',
  VALIDATION_ERROR:       'VALIDATION_ERROR',
} as const
