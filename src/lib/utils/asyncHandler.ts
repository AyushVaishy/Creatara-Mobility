import { NextRequest, NextResponse } from 'next/server'
import { errorResponse } from './apiResponse'
import { logger } from './logger'
import { HTTP_STATUS } from '@/lib/constants'

type SimpleRouteHandler = (req: NextRequest) => Promise<NextResponse>
type ContextRouteHandler<TContext> = (req: NextRequest, context: TContext) => Promise<NextResponse>

/**
 * Wraps a Next.js API route handler with centralised error catching.
 * Catches any thrown error and returns a consistent JSON error response.
 *
 * Usage:
 *   export const GET = asyncHandler(async (req) => { ... })
 */
export function asyncHandler(handler: SimpleRouteHandler): SimpleRouteHandler
export function asyncHandler<TContext>(handler: ContextRouteHandler<TContext>): ContextRouteHandler<TContext>
export function asyncHandler<TContext>(
  handler: SimpleRouteHandler | ContextRouteHandler<TContext>,
) {
  return async (req: NextRequest, context?: TContext) => {
    try {
      return await (handler as ContextRouteHandler<TContext>)(req, context as TContext)
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'An unexpected error occurred'
      const statusCode =
        (error as { statusCode?: number }).statusCode ?? HTTP_STATUS.INTERNAL_SERVER_ERROR

      logger.error(message, 'asyncHandler', {
        url: req.url,
        method: req.method,
        error,
      })

      return errorResponse(message, statusCode)
    }
  }
}
