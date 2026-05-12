import type { NextRequest } from 'next/server'
import { asyncHandler } from '@/lib/utils/asyncHandler'
import { successResponse, errorResponse } from '@/lib/utils/apiResponse'
import { collectAllCities } from '@/lib/cron/cityDataCollector'
import { getCronStatus } from '@/lib/cron/cronScheduler'
import { HTTP_STATUS } from '@/lib/constants'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/run
 *
 * Manually triggers a full city data collection run.
 * Intended for local development and testing only.
 *
 * The route is intentionally unprotected for dev convenience —
 * add auth middleware before exposing in production.
 *
 * Returns: CronRunSummary
 */
export const POST = asyncHandler(async (_req: NextRequest) => {
  // Block in production unless an override header is present
  if (
    process.env.NODE_ENV === 'production' &&
    _req.headers.get('x-cron-secret') !== process.env.CRON_SECRET
  ) {
    return errorResponse('Forbidden — provide x-cron-secret header', HTTP_STATUS.FORBIDDEN)
  }

  const summary = await collectAllCities()
  return successResponse(summary, HTTP_STATUS.OK)
})

/**
 * GET /api/cron/run
 *
 * Returns the current status of all registered cron jobs.
 * Useful for monitoring dashboards and health checks.
 */
export const GET = asyncHandler(async () => {
  const status = getCronStatus()
  return successResponse({ jobs: status })
})
