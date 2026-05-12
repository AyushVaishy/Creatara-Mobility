import type { NextRequest } from 'next/server'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { successResponse, errorResponse } from '@/lib/utils/apiResponse'
import { getCityLatest } from '@/services/analytics/analyticsService'
import { GLOBAL_CITIES, ERROR_CODES, HTTP_STATUS } from '@/lib/constants'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/cities/[id]/latest
 *
 * Returns the most recently stored metric snapshot for the given city.
 * Returns null metric (not a 404) if no data has been collected yet.
 *
 * Response shape: { cityId, cityName, metric, recordedAt }
 */
export const GET = asyncHandler(async (_req: NextRequest, context?: RouteContext) => {
  const { id } = await context!.params

  const isKnownCity = GLOBAL_CITIES.some((c) => c.id === id)
  if (!isKnownCity) {
    return errorResponse(`City '${id}' not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.CITY_NOT_FOUND)
  }

  const latest = await getCityLatest(id)
  return successResponse(latest)
})
