import type { NextRequest } from 'next/server'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { successResponse } from '@/lib/utils/apiResponse'
import { getAllCities, seedCities } from '@/lib/db/repositories/cityRepository'
import { aggregateAllCities } from '@/services/city/cityAggregator'
import { GLOBAL_CITIES } from '@/lib/constants'

/**
 * GET /api/cities
 *   ?live=true  — fetch live data for all 10 cities in parallel (expensive!)
 *   default     — return city config from DB (or static fallback)
 */
export const GET = asyncHandler(async (req: NextRequest) => {
  const url  = new URL(req.url)
  const live = url.searchParams.get('live') === 'true'

  if (live) {
    const intelligence = await aggregateAllCities(GLOBAL_CITIES, { persist: true })
    return successResponse(intelligence)
  }

  try {
    const cities = await getAllCities()
    return successResponse(cities)
  } catch {
    return successResponse(GLOBAL_CITIES)
  }
})

// POST /api/cities — seed cities into DB (admin/dev use)
export const POST = asyncHandler(async () => {
  await seedCities()
  const cities = await getAllCities()
  return successResponse(cities, 201)
})
