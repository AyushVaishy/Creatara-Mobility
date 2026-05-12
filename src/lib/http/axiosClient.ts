import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { DEFAULT_TIMEOUT_MS, MAX_RETRIES, RETRY_BASE_DELAY } from '@/lib/constants'

export interface AxiosClientOptions {
  baseURL: string
  apiKey?: string
  apiKeyHeader?: string   // e.g. 'x-api-key' or 'Authorization'
  apiKeyPrefix?: string   // e.g. 'Bearer '
  timeout?: number
  headers?: Record<string, string>
}

/**
 * Creates a configured Axios instance with interceptors and retry logic.
 * Use one instance per external API to isolate configuration.
 */
export function createAxiosClient(options: AxiosClientOptions): AxiosInstance {
  const {
    baseURL,
    apiKey,
    apiKeyHeader = 'x-api-key',
    apiKeyPrefix = '',
    timeout = DEFAULT_TIMEOUT_MS,
    headers = {},
  } = options

  const instance = axios.create({
    baseURL,
    timeout,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
      ...(apiKey && { [apiKeyHeader]: `${apiKeyPrefix}${apiKey}` }),
    },
  })

  // Request interceptor — log outgoing requests in development
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`)
      }
      return config
    },
    (error) => Promise.reject(error),
  )

  // Response interceptor — normalise errors
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      const status  = error.response?.status
      const message = error.response?.data?.message ?? error.message ?? 'Unknown error'

      // Structured error object passed downstream
      const enriched = Object.assign(error, {
        statusCode: status ?? 500,
        errorMessage: message,
        isAxiosError: true,
      })

      return Promise.reject(enriched)
    },
  )

  return instance
}

/**
 * Executes an Axios request with exponential-backoff retry.
 * Retries only on network errors or 429 / 5xx responses.
 */
export async function withRetry<T>(
  fn: () => Promise<AxiosResponse<T>>,
  retries = MAX_RETRIES,
): Promise<AxiosResponse<T>> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error
      const status = (error as { statusCode?: number }).statusCode

      // Do not retry on client errors (except 429 rate limit)
      if (status && status >= 400 && status < 500 && status !== 429) {
        throw error
      }

      if (attempt < retries) {
        const delay = RETRY_BASE_DELAY * 2 ** attempt
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  throw lastError
}
