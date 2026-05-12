import type { NextRequest } from 'next/server'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { successResponse, errorResponse } from '@/lib/utils/apiResponse'
import { aggregateCityData } from '@/services/city/cityAggregator'
import { GLOBAL_CITIES, ERROR_CODES, HTTP_STATUS } from '@/lib/constants'

interface RouteContext {
  params: Promise<{ cityName: string }>
}

/**
 * GET /api/test-city/[cityName]
 *
 * Development/testing endpoint that fetches and aggregates live data
 * for any of the 10 preconfigured cities.
 *
 * Accepts city ID (e.g. "new-york") or city name (e.g. "London") — case-insensitive.
 *
 * Query params:
 *   ?persist=false  — skip writing to MongoDB (default: true)
 *   ?force=true     — bypass any future caching layer
 *
 * Example:
 *   GET /api/test-city/tokyo
 *   GET /api/test-city/New%20York?persist=false
 */
export const GET = asyncHandler(async (req: NextRequest, context?: RouteContext) => {
  const { cityName } = await context!.params
  const url = new URL(req.url)

  const persist = url.searchParams.get('persist') !== 'false'

  // Match by ID (slug) or name (case-insensitive)
  const normalised = decodeURIComponent(cityName).trim().toLowerCase()
  const city = GLOBAL_CITIES.find(
    (c) => c.id === normalised || c.name.toLowerCase() === normalised,
  )

  if (!city) {
    return errorResponse(
      `City "${cityName}" not found. Valid IDs: ${GLOBAL_CITIES.map((c) => c.id).join(', ')}`,
      HTTP_STATUS.NOT_FOUND,
      ERROR_CODES.CITY_NOT_FOUND,
    )
  }

  const intelligence = await aggregateCityData(city, { persist })

  return successResponse({
    // Echo which city was resolved (helpful for debugging)
    resolved: city.id,
    ...intelligence,
  })
})
