import type { CurrencyApiResponse, CurrencyNormalized, ServiceResult } from '@/types'
import { createAxiosClient, withRetry } from '@/lib/http'
import { ERROR_CODES, HTTP_STATUS, CITY_CURRENCIES } from '@/lib/constants'
import { createAppError } from '@/lib/utils/apiResponse'
import { logger } from '@/lib/utils/logger'

// ─── Raw API types ────────────────────────────────────────────────────────────

interface ExchangeRatesResponse {
  success: boolean
  base: string
  date: string
  rates: Record<string, number>
}

// ─── Cache Configuration ──────────────────────────────────────────────────────

interface CacheEntry {
  data: CurrencyApiResponse
  timestamp: number
  ttl: number // Time to live in milliseconds
}

class CurrencyCache {
  private cache = new Map<string, CacheEntry>()
  private readonly DEFAULT_TTL = 4 * 60 * 60 * 1000 // 4 hours
  private readonly MAX_CACHE_SIZE = 10

  private getCacheKey(base: string, symbols: string[]): string {
    return `${base}:${symbols.sort().join(',')}`
  }

  get(base: string, symbols: string[]): CurrencyApiResponse | null {
    const key = this.getCacheKey(base, symbols)
    const entry = this.cache.get(key)

    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    logger.info(`Currency cache hit for ${key}`, 'currencyCache')
    return entry.data
  }

  set(base: string, symbols: string[], data: CurrencyApiResponse, ttl?: number): void {
    const key = this.getCacheKey(base, symbols)

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([,a], [,b]) => a.timestamp - b.timestamp)[0][0]
      this.cache.delete(oldestKey)
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.DEFAULT_TTL
    })

    logger.info(`Currency cache set for ${key}, expires in ${Math.round((ttl ?? this.DEFAULT_TTL) / 60000)} minutes`, 'currencyCache')
  }

  clear(): void {
    this.cache.clear()
    logger.info('Currency cache cleared', 'currencyCache')
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instance - lazy loaded
let currencyCache: CurrencyCache | null = null

function getCurrencyCache(): CurrencyCache {
  if (!currencyCache) {
    currencyCache = new CurrencyCache()
  }
  return currencyCache
}

// ─── Rate Limiting ────────────────────────────────────────────────────────────

class RateLimiter {
  private requests: number[] = []
  private readonly WINDOW_MS = 60 * 60 * 1000 // 1 hour
  private readonly MAX_REQUESTS = 100 // Free tier limit estimate

  canMakeRequest(): boolean {
    const now = Date.now()
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.WINDOW_MS)

    return this.requests.length < this.MAX_REQUESTS
  }

  recordRequest(): void {
    this.requests.push(Date.now())
  }

  getRemainingRequests(): number {
    const now = Date.now()
    this.requests = this.requests.filter(time => now - time < this.WINDOW_MS)
    return Math.max(0, this.MAX_REQUESTS - this.requests.length)
  }

  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0
    const oldestRequest = Math.min(...this.requests)
    return Math.max(0, this.WINDOW_MS - (Date.now() - oldestRequest))
  }
}

// Global rate limiter - lazy loaded
let rateLimiterInstance: RateLimiter | null = null

function getRateLimiter(): RateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new RateLimiter()
  }
  return rateLimiterInstance
}

// ─── HTTP client ──────────────────────────────────────────────────────────────

function getCurrencyClient() {
  return createAxiosClient({
    baseURL: process.env.CURRENCY_BASE_URL ?? 'https://api.exchangeratesapi.io/v1',
    timeout: 8_000,
  })
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Calculates a cross-rate between two currencies using a rates table.
 * The rates table may have any base currency (commonly EUR for free-tier APIs).
 *
 * Formula: rate(from→to) = rates[to] / rates[from]
 */
export function getRate(
  rates: Record<string, number>,
  from: string,
  to: string,
): number | null {
  if (from === to) return 1
  const fromRate = rates[from]
  const toRate   = rates[to]
  if (!fromRate || !toRate) return null
  return Number((toRate / fromRate).toFixed(6))
}

/**
 * Returns how many INR you get per 1 unit of `currency`.
 * Returns null if either currency is absent from the rates table.
 */
export function getINRRate(
  rates: Record<string, number>,
  currency: string,
): number | null {
  return getRate(rates, currency, 'INR')
}

/**
 * Returns how many local units you get per 1 USD.
 */
export function getUSDRate(
  rates: Record<string, number>,
  currency: string,
): number | null {
  return getRate(rates, 'USD', currency)
}

/** Formats a rate to a human-readable string, e.g. "1 USD = 83.42 INR". */
export function formatRate(from: string, to: string, rate: number | null): string {
  if (rate === null) return `${from}/${to} unavailable`
  return `1 ${from} = ${rate.toFixed(4)} ${to}`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches exchange rates for all city currencies with intelligent caching.
 * Uses 4-hour cache to minimize API calls and respect free tier limits.
 * Falls back to cached data if rate limited.
 */
export async function fetchExchangeRates(
  _base = 'USD',
): Promise<ServiceResult<CurrencyApiResponse>> {
  const apiKey = process.env.CURRENCY_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: createAppError('Currency API key not configured', ERROR_CODES.CURRENCY_FETCH_FAILED, HTTP_STATUS.SERVICE_UNAVAILABLE),
    }
  }

  // Always include INR and USD so cross-rates are always done
  const symbols = Array.from(new Set([...CITY_CURRENCIES, 'INR', 'USD']))

  // Check cache first
  const cachedData = getCurrencyCache().get('USD', symbols)
  if (cachedData) {
    return { success: true, data: cachedData }
  }

  // Check rate limit
  if (!getRateLimiter().canMakeRequest()) {
    const remainingTime = getRateLimiter().getTimeUntilReset()
    const hoursLeft = Math.ceil(remainingTime / (60 * 60 * 1000))

    logger.warn(`Currency API rate limited. ${hoursLeft} hours until reset. Using fallback rates.`, 'currencyService')

    // Return fallback rates if available
    const fallbackData = getFallbackRates()
    if (fallbackData) {
      return { success: true, data: fallbackData }
    }

    return {
      success: false,
      error: createAppError(
        `API rate limited. Try again in ${hoursLeft} hours.`,
        ERROR_CODES.CURRENCY_FETCH_FAILED,
        HTTP_STATUS.TOO_MANY_REQUESTS
      ),
    }
  }

  const client = getCurrencyClient()
  const baseURL = process.env.CURRENCY_BASE_URL ?? 'https://api.exchangeratesapi.io/v1'
  const isCurrencyApi = baseURL.includes('currencyapi.com')

  try {
    const params = isCurrencyApi
      ? { apikey: apiKey, currencies: symbols.join(',') }
      : { access_key: apiKey, symbols: symbols.join(',') }

    logger.info(`Fetching fresh currency rates for ${symbols.length} currencies`, 'currencyService')

    const response = await withRetry(() =>
      client.get('/latest', { params }),
    )

    let parsedRates: Record<string, number> = {}
    let parsedBase = 'EUR'
    let parsedDate = new Date()

    if (isCurrencyApi) {
      // currencyapi.com format
      const data = response.data.data
      for (const key in data) {
        parsedRates[key] = data[key].value
      }
      parsedBase = 'USD' // currencyapi free tier base is usually USD
      parsedDate = new Date(response.data.meta?.last_updated_at ?? Date.now())
    } else {
      // exchangeratesapi.io format
      parsedRates = response.data.rates
      parsedBase = response.data.base ?? 'EUR'
      parsedDate = new Date(response.data.date ?? Date.now())
    }

    const result: CurrencyApiResponse = {
      base: parsedBase,
      rates: parsedRates,
      timestamp: parsedDate,
    }

    // Cache the result
    getCurrencyCache().set('USD', symbols, result)

    // Record the API call for rate limiting
    getRateLimiter().recordRequest()

    logger.info(`Successfully cached currency rates, next refresh in 4 hours`, 'currencyService')

    return { success: true, data: result }
  } catch (error: unknown) {
    const message = (error as Error).message ?? 'Currency fetch failed'
    logger.error(message, 'currencyService')

    // Try fallback rates on API failure
    const fallbackData = getFallbackRates()
    if (fallbackData) {
      logger.warn('API failed, using fallback currency rates', 'currencyService')
      return { success: true, data: fallbackData }
    }

    return {
      success: false,
      error: createAppError(message, ERROR_CODES.CURRENCY_FETCH_FAILED, HTTP_STATUS.BAD_REQUEST),
    }
  }
}

/**
 * Builds a normalised CurrencyNormalized object for a specific city currency,
 * given a rates response from fetchExchangeRates.
 */
export function buildCurrencyNormalized(
  cityCurrency: string,
  ratesData: CurrencyApiResponse,
): CurrencyNormalized {
  return {
    localCurrency: cityCurrency,
    rateFromUSD:   getUSDRate(ratesData.rates, cityCurrency),
    rateToINR:     getINRRate(ratesData.rates, cityCurrency),
    allRates:      ratesData.rates,
    ratesBase:     ratesData.base,
    fetchedAt:     ratesData.timestamp.toISOString(),
  }
}

/**
 * Fallback exchange rates when API is unavailable or rate limited.
 * These are approximate rates that should be updated periodically.
 * Last updated: 2024 rates (update these when you get fresh data)
 */
function getFallbackRates(): CurrencyApiResponse | null {
  // Static fallback rates - update these periodically with real data
  const fallbackRates: Record<string, number> = {
    USD: 1.0,
    EUR: 0.85,
    GBP: 0.73,
    JPY: 110.0,
    AED: 3.67,
    INR: 83.0,
    SGD: 1.35,
    AUD: 1.52,
    CAD: 1.35,
    // Add more currencies as needed
  }

  return {
    base: 'USD',
    rates: fallbackRates,
    timestamp: new Date(), // Current time for fallback
  }
}

/**
 * Clears the currency cache (useful for testing or manual refresh)
 */
export function clearCurrencyCache(): void {
  getCurrencyCache().clear()
}

/**
 * Gets cache statistics for monitoring
 */
export function getCurrencyCacheStats(): {
  size: number
  remainingRequests: number
  timeUntilReset: number
} {
  return {
    size: getCurrencyCache().size(),
    remainingRequests: getRateLimiter().getRemainingRequests(),
    timeUntilReset: getRateLimiter().getTimeUntilReset(),
  }
}
