import { NextResponse } from 'next/server'
import type { ApiResponse, PaginatedResponse, AppError } from '@/types'
import { HTTP_STATUS } from '@/lib/constants'

/** Sends a successful JSON response */
export function successResponse<T>(data: T, status: number = HTTP_STATUS.OK): NextResponse {
  const body: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  }
  return NextResponse.json(body, { status })
}

/** Sends a paginated JSON response */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): NextResponse {
  const body: PaginatedResponse<T> = {
    data: items,
    total,
    page,
    limit,
    hasMore: page * limit < total,
  }
  return NextResponse.json({ success: true, ...body, timestamp: new Date().toISOString() })
}

/** Sends an error JSON response */
export function errorResponse(
  message: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  code?: string,
  details?: unknown,
): NextResponse {
  const body: ApiResponse<null> = {
    success: false,
    error: message,
    message: code,
    timestamp: new Date().toISOString(),
    ...(details !== undefined && { data: null }),
  }
  return NextResponse.json(body, { status: statusCode })
}

/** Converts an AppError to a NextResponse */
export function appErrorResponse(error: AppError): NextResponse {
  return errorResponse(error.message, error.statusCode, error.code, error.details)
}

/** Creates a typed AppError object */
export function createAppError(
  message: string,
  code: string,
  statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
  details?: unknown,
): AppError {
  return { message, code, statusCode, details }
}
