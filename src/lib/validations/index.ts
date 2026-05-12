// Validation utilities - to be extended with Zod schemas

export function isValidCoordinates(lat: number, lng: number): boolean {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180
}

export function isValidCityId(id: string): boolean {
  return /^[a-z0-9-]+$/.test(id)
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
