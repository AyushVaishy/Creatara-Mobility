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
 * Fetches exchange rates for all city currencies.
 * Note: exchangeratesapi.io free tier uses EUR as base.
 * We request all city currencies + INR + USD in one call.
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

  const client = getCurrencyClient()

  // Always include INR and USD so cross-rates are always possible
  const symbols = [...new Set([...CITY_CURRENCIES, 'INR', 'USD'])].join(',')

  const baseURL = process.env.CURRENCY_BASE_URL ?? 'https://api.exchangeratesapi.io/v1'
  const isCurrencyApi = baseURL.includes('currencyapi.com')

  try {
    const params = isCurrencyApi
      ? { apikey: apiKey, currencies: symbols }
      : { access_key: apiKey, symbols }

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

    return {
      success: true,
      data: {
        base:      parsedBase,
        rates:     parsedRates,
        timestamp: parsedDate,
      },
    }
  } catch (error: unknown) {
    const message = (error as Error).message ?? 'Currency fetch failed'
    logger.error(message, 'currencyService')
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
