import { NextRequest, NextResponse } from 'next/server'
import { getCurrencyCacheStats } from '@/services/currency/currencyService'

/**
 * GET /api/currency/status
 * Returns currency cache and rate limiting statistics
 */
export async function GET(request: NextRequest) {
  try {
    const stats = getCurrencyCacheStats()

    return NextResponse.json({
      success: true,
      data: {
        cacheSize: stats.size,
        remainingRequests: stats.remainingRequests,
        timeUntilResetHours: Math.ceil(stats.timeUntilReset / (60 * 60 * 1000)),
        cacheHitRate: 'N/A', // Could be tracked separately if needed
        lastUpdated: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get currency status',
      },
      { status: 500 }
    )
  }
}