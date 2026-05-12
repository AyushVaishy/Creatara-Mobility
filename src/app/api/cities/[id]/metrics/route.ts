import type { NextRequest } from 'next/server'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { successResponse, errorResponse } from '@/lib/utils/apiResponse'
import { getMetricsByCityId, aggregateMetrics } from '@/lib/db/repositories/metricRepository'
import { GLOBAL_CITIES, ERROR_CODES, HTTP_STATUS, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '@/lib/constants'

interface RouteContext {
  params: Promise<{ id: string }>
}

export const GET = asyncHandler(async (req: NextRequest, context: RouteContext) => {
  const { id } = await context.params

  const cityExists = GLOBAL_CITIES.some((c) => c.id === id)
  if (!cityExists) {
    return errorResponse(`City '${id}' not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.CITY_NOT_FOUND)
  }

  const url       = new URL(req.url)
  const from      = url.searchParams.get('from')
  const to        = url.searchParams.get('to')
  const page      = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const limit     = Math.min(MAX_PAGE_SIZE, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_PAGE_SIZE), 10))
  const aggregate = url.searchParams.get('aggregate') === 'true'

  if (aggregate) {
    const agg = await aggregateMetrics({
      cityId: id,
      from:   from ? new Date(from) : undefined,
      to:     to   ? new Date(to)   : undefined,
    })
    return successResponse(agg)
  }

  const metrics = await getMetricsByCityId({
    cityId: id,
    from:   from ? new Date(from) : undefined,
    to:     to   ? new Date(to)   : undefined,
    limit,
    page,
  })

  return successResponse(metrics)
})
