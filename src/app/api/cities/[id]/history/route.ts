import type { NextRequest } from 'next/server'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { successResponse, errorResponse } from '@/lib/utils/apiResponse'
import { getCityHistory } from '@/services/analytics/analyticsService'
import { GLOBAL_CITIES, ERROR_CODES, HTTP_STATUS } from '@/lib/constants'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/cities/[id]/history
 *
 * Query params:
 *   ?days=7   — number of days of history (1 | 7 | 15 | 30, default 7)
 *   ?hourly=true — append hourly trends to the response
 *
 * Returns:
 *   { city, period, summary, temperatureTrend, aqiTrend, humidityTrend, records }
 */
export const GET = asyncHandler(async (req: NextRequest, context?: RouteContext) => {
  const { id } = await context!.params
  const url    = new URL(req.url)
  const days   = Math.min(Math.max(Number(url.searchParams.get('days') ?? 7), 1), 30)

  const isKnownCity = GLOBAL_CITIES.some((c) => c.id === id)
  if (!isKnownCity) {
    return errorResponse(`City '${id}' not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.CITY_NOT_FOUND)
  }

  const history = await getCityHistory(id, days)
  return successResponse(history)
})
