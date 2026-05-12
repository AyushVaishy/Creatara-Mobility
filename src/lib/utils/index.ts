import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { AQICategory } from '@/types'
import { AQI_THRESHOLDS, AQI_COLORS } from '@/lib/constants'

// Tailwind class merging utility
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format temperature
export function formatTemperature(celsius: number, unit: 'C' | 'F' = 'C'): string {
  if (unit === 'F') {
    return `${Math.round((celsius * 9) / 5 + 32)}°F`
  }
  return `${Math.round(celsius)}°C`
}

// Format large numbers
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(num)
}

// Format date
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

// Get AQI category from value
export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= AQI_THRESHOLDS.GOOD) return 'Good'
  if (aqi <= AQI_THRESHOLDS.MODERATE) return 'Moderate'
  if (aqi <= AQI_THRESHOLDS.UNHEALTHY_SENSITIVE) return 'Unhealthy for Sensitive Groups'
  if (aqi <= AQI_THRESHOLDS.UNHEALTHY) return 'Unhealthy'
  if (aqi <= AQI_THRESHOLDS.VERY_UNHEALTHY) return 'Very Unhealthy'
  return 'Hazardous'
}

// Get AQI color
export function getAQIColor(category: AQICategory): string {
  return AQI_COLORS[category] ?? '#6b7280'
}

// Async sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Safe JSON parse
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

// Generate unique ID
export function generateId(prefix = ''): string {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Re-export new utilities so consumers can import from '@/lib/utils'
export { logger } from './logger'
export { successResponse, paginatedResponse, errorResponse, appErrorResponse, createAppError } from './apiResponse'
export { asyncHandler } from './asyncHandler'
