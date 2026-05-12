// ============================================================
// Core Domain Types
// ============================================================

export interface City {
  id: string
  name: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  timezone: string
  population?: number
}

export interface WeatherData {
  cityId: string
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  description: string
  icon: string
  pressure: number
  visibility: number
  timestamp: Date
}

export interface AQIData {
  cityId: string
  aqi: number
  category: AQICategory
  pm25: number
  pm10: number
  o3: number
  no2: number
  timestamp: Date
}

export type AQICategory = 'Good' | 'Moderate' | 'Unhealthy for Sensitive Groups' | 'Unhealthy' | 'Very Unhealthy' | 'Hazardous'

export interface CurrencyData {
  base: string
  rates: Record<string, number>
  timestamp: Date
}

export interface CityInsight {
  city: City
  weather?: WeatherData
  aqi?: AQIData
  currency?: CurrencyData
  lastUpdated: Date
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ============================================================
// UI State Types
// ============================================================

export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface ErrorState {
  message: string
  code?: string | number
}

export interface SelectedCityState {
  city: City | null
  isModalOpen: boolean
}

// ============================================================
// Chart Types
// ============================================================

export interface ChartDataPoint {
  label: string
  value: number
  timestamp?: string
}

export interface HistoricalDataPoint {
  date: string
  temperature?: number
  aqi?: number
  humidity?: number
}

// ============================================================
// Extended City Type (with currency)
// ============================================================

export interface CityConfig {
  id: string
  name: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  timezone: string
  currency: string
  population: number
}

// ============================================================
// Mongoose Document Types
// ============================================================

export interface ICityDocument {
  _id: string
  cityId: string
  name: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  timezone: string
  currency: string
  population: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Plain-object (lean) shape of a CityMetric record as returned by API routes.
 * Does NOT extend Mongoose Document — safe for JSON serialisation.
 */
export interface LeanCityMetric {
  _id: string
  cityId: string
  temperature: number | null
  feelsLike: number | null
  humidity: number | null
  windSpeed: number | null
  pressure: number | null
  visibility: number | null
  weatherCondition: string | null
  weatherDescription: string | null
  weatherIcon: string | null
  aqi: number | null
  aqiCategory: string | null
  pm25: number | null
  pm10: number | null
  o3: number | null
  no2: number | null
  currencyRates: Record<string, number>
  currencyBase: string | null
  recordedAt: Date
  createdAt: Date
}

/** @deprecated Use LeanCityMetric for plain objects or import ICityMetricDocument from '@/models' for Mongoose documents */
export type ICityMetricDocument = LeanCityMetric

// ============================================================
// Service Response Types
// ============================================================

export interface WeatherApiResponse {
  cityId: string
  cityName: string
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  pressure: number
  visibility: number
  condition: string
  description: string
  icon: string
  timestamp: Date
}

export interface AQIApiResponse {
  cityId: string
  cityName: string
  aqi: number
  category: AQICategory
  pm25: number
  pm10: number
  o3: number
  no2: number
  timestamp: Date
}

export interface CurrencyApiResponse {
  base: string
  rates: Record<string, number>
  timestamp: Date
}

// ============================================================
// Error Types
// ============================================================

export interface AppError {
  message: string
  code: string
  statusCode: number
  details?: unknown
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: AppError }

// ============================================================
// Repository Query Types
// ============================================================

export interface MetricQueryOptions {
  cityId: string
  from?: Date
  to?: Date
  limit?: number
  page?: number
}

export interface MetricAggregation {
  cityId: string
  avgTemperature: number | null
  avgHumidity: number | null
  avgAQI: number | null
  avgWindSpeed: number | null
  dataPoints: number
  from: Date
  to: Date
}

// ============================================================
// Normalised service response shapes (used in CityIntelligence)
// ============================================================

export interface WeatherNormalized {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  windDirection?: string
  pressure: number
  visibility: number
  condition: string
  description: string
  icon: string
  iconUrl: string
}

export interface AQINormalized {
  aqi: number
  category: AQICategory
  /** Hex colour matching the AQI category */
  color: string
  pm25: number
  pm10: number
  o3: number
  no2: number
  /** Human-readable health advisory */
  healthAdvice: string
}

export interface CurrencyNormalized {
  /** ISO code of the city's local currency, e.g. "JPY" */
  localCurrency: string
  /** Exchange rate: 1 USD → local currency */
  rateFromUSD: number | null
  /** Exchange rate: 1 local unit → INR */
  rateToINR: number | null
  /** Full rates table (base EUR from free-tier APIs) */
  allRates: Record<string, number>
  ratesBase: string
  fetchedAt: string
}

export interface CityMetadata {
  id: string
  name: string
  country: string
  countryCode: string
  timezone: string
  population: number
  coordinates: { lat: number; lon: number }
  currency: string
}

// ============================================================
// Unified city intelligence response
// ============================================================

export interface CityIntelligence {
  city: CityMetadata
  weather: WeatherNormalized | null
  aqi: AQINormalized | null
  currency: CurrencyNormalized | null
  /** ISO timestamp of when this payload was assembled */
  lastUpdated: string
  /** Which services returned data successfully */
  dataAvailability: {
    weather: boolean
    aqi: boolean
    currency: boolean
  }
  /** Non-fatal errors from individual services */
  warnings: string[]
}

// ============================================================
// Aggregation service options
// ============================================================

export interface AggregateOptions {
  /** Persist the fetched data to MongoDB (default: true) */
  persist?: boolean
  /** If true, skip DB cache and always hit external APIs */
  forceRefresh?: boolean
}

// ============================================================
// Historical analytics types
// ============================================================

/** How many days of history to fetch */
export type HistoryPeriod = 1 | 7 | 15 | 30

/** A single time-bucketed data point used in trend charts */
export interface TrendDataPoint {
  /** ISO timestamp representing the bucket start */
  timestamp: string
  /** Human-readable label for the x-axis (e.g. "Mon", "14:00") */
  label: string
  value: number | null
}

export interface TemperatureTrend {
  cityId: string
  period: HistoryPeriod
  unit: '°C'
  points: TrendDataPoint[]
}

export interface AQITrend {
  cityId: string
  period: HistoryPeriod
  points: TrendDataPoint[]
  /** Category label of the latest data point */
  latestCategory: string | null
}

export interface HumidityTrend {
  cityId: string
  period: HistoryPeriod
  points: TrendDataPoint[]
}

export interface HourlyTrend {
  cityId: string
  /** 24 hourly buckets (last 24 h) */
  temperature: TrendDataPoint[]
  aqi: TrendDataPoint[]
  humidity: TrendDataPoint[]
}

/** Averages over the full period */
export interface PeriodSummary {
  avgTemperature: number | null
  avgHumidity: number | null
  avgAQI: number | null
  avgWindSpeed: number | null
  dataPoints: number
  from: string
  to: string
}

/** Unified history API response shape */
export interface CityHistoryResponse {
  cityId: string
  cityName: string
  period: HistoryPeriod
  summary: PeriodSummary
  temperatureTrend: TrendDataPoint[]
  aqiTrend: TrendDataPoint[]
  humidityTrend: TrendDataPoint[]
  /** Raw metric records (newest first, max 200) */
  records: Pick<
    LeanCityMetric,
    | 'temperature'
    | 'humidity'
    | 'windSpeed'
    | 'aqi'
    | 'aqiCategory'
    | 'weatherCondition'
    | 'recordedAt'
  >[]
}

/** Response for GET /api/cities/[id]/latest */
export interface CityLatestResponse {
  cityId: string
  cityName: string
  metric: LeanCityMetric | null
  /** ISO timestamp of when the record was stored */
  recordedAt: string | null
}

// ============================================================
// Cron job types
// ============================================================

export type CronJobName = 'city-data-collector'

export interface CronJobStatus {
  name: CronJobName
  schedule: string
  running: boolean
  lastRunAt: string | null
  lastRunDurationMs: number | null
  lastError: string | null
  totalRuns: number
  successfulRuns: number
}

/** Summary returned by POST /api/cron/run */
export interface CronRunSummary {
  triggeredAt: string
  durationMs: number
  totalCities: number
  successfulCities: number
  failedCities: string[]
  results: Array<{
    cityId: string
    cityName: string
    persisted: boolean
    warnings: string[]
  }>
}
