#!/usr/bin/env node

/**
 * Script to update fallback currency rates in the currency service.
 * Run this periodically to keep fallback rates current.
 *
 * Usage: npm run update-fallback-rates
 */

import { fetchExchangeRates } from '../src/services/currency/currencyService'
import { writeFileSync } from 'fs'
import { join } from 'path'

async function updateFallbackRates() {
  console.log('Fetching current exchange rates for fallback data...')

  try {
    const result = await fetchExchangeRates()

    if (!result.success) {
      console.error('Failed to fetch rates:', result.error?.message)
      process.exit(1)
    }

    const rates = result.data.rates
    const timestamp = new Date().toISOString()

    // Generate the fallback rates code
    const fallbackCode = `/**
 * Fallback exchange rates when API is unavailable or rate limited.
 * These are approximate rates that should be updated periodically.
 * Last updated: ${timestamp}
 */
function getFallbackRates(): CurrencyApiResponse | null {
  // Static fallback rates - update these periodically with real data
  const fallbackRates: Record<string, number> = {
${Object.entries(rates)
  .map(([currency, rate]) => `    ${currency}: ${rate.toFixed(4)},`)
  .join('\n')}
  }

  return {
    base: 'USD',
    rates: fallbackRates,
    timestamp: new Date(), // Current time for fallback
  }
}`

    // Read the current currency service file
    const currencyServicePath = join(__dirname, '../src/services/currency/currencyService.ts')
    let content = require('fs').readFileSync(currencyServicePath, 'utf8')

    // Replace the fallback function
    const fallbackRegex = /\/\*\*\s*\n \* Fallback exchange rates.*?\nfunction getFallbackRates\(\): CurrencyApiResponse \| null \{[\s\S]*?\n\}/
    content = content.replace(fallbackRegex, fallbackCode)

    // Write back the updated file
    writeFileSync(currencyServicePath, content, 'utf8')

    console.log(`✅ Fallback rates updated successfully (${timestamp})`)
    console.log(`📊 Updated ${Object.keys(rates).length} currency rates`)

  } catch (error) {
    console.error('Error updating fallback rates:', error)
    process.exit(1)
  }
}

updateFallbackRates()