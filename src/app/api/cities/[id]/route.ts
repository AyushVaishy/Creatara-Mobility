import type { NextRequest } from 'next/server'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { successResponse, errorResponse } from '@/lib/utils/apiResponse'
import { getCityById } from '@/lib/db/repositories/cityRepository'
import { getLatestMetricByCityId, aggregateMetrics } from '@/lib/db/repositories/metricRepository'
import { aggregateCityData } from '@/services/city/cityAggregator'
import { GLOBAL_CITIES, ERROR_CODES, HTTP_STATUS } from '@/lib/constants'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/cities/[id]
 *
 * Query params:
 *   ?live=true   — bypass DB cache and fetch from external APIs right now
 *   ?history=true — include 7-day aggregated historical metrics in response
 */
export const GET = asyncHandler(async (req: NextRequest, context?: RouteContext) => {
  const { id } = await context!.params
  const url  = new URL(req.url)
  const live    = url.searchParams.get('live')    === 'true'
  const history = url.searchParams.get('history') === 'true'

  // Resolve city from DB first, then static config as fallback
  const dbCity     = await getCityById(id).catch(() => null)
  const staticCity = GLOBAL_CITIES.find((c) => c.id === id)

  if (!dbCity && !staticCity) {
    return errorResponse(`City '${id}' not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.CITY_NOT_FOUND)
  }

  // ?live=true — fetch fresh data from external APIs
  if (live && staticCity) {
    const intelligence = await aggregateCityData(staticCity, { persist: true })
    return successResponse(intelligence)
  }

  // Default — serve from DB (latest persisted snapshot)
  const latestMetric = await getLatestMetricByCityId(id).catch(() => null)
  const aggregation  = history
    ? await aggregateMetrics({ cityId: id }).catch(() => null)
    : null

  return successResponse({
    city:        dbCity ?? staticCity,
    metric:      latestMetric,
    aggregation,
  })
})
