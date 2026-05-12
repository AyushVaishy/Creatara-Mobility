import fs from 'fs'
import path from 'path'
import { getAQICategory } from '@/services/aqi/aqiService'
import type { CityHistoryResponse, TrendDataPoint, LeanCityMetric } from '@/types'

let fallbackData: any = null

function loadFallbackData() {
  if (fallbackData) return fallbackData
  try {
    const filePath = path.join(process.cwd(), 'data', 'historical_weather.json')
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8')
      fallbackData = JSON.parse(content)
      return fallbackData
    }
  } catch (e) {
    console.error('Failed to load fallback history data:', e)
  }
  return null
}

export function buildFallbackHistory(cityId: string, cityName: string, period: number): CityHistoryResponse | null {
  const data = loadFallbackData()
  if (!data || !data[cityId]) return null

  const cityData = data[cityId]
  const hourly = cityData.hourly
  const aqiHourly = cityData.aqi?.hourly

  if (!hourly || !hourly.time) return null

  const times: string[] = hourly.time
  const temps: number[] = hourly.temperature_2m
  const hums: number[] = hourly.relative_humidity_2m
  const aqis: number[] = aqiHourly?.us_aqi || []

  // Create daily aggregates from hourly data
  const dailyMap = new Map<string, { temp: number[], hum: number[], aqi: number[] }>()

  for (let i = 0; i < times.length; i++) {
    const d = new Date(times[i])
    // Use local day format: YYYY-MM-DD
    const dayKey = d.toISOString().split('T')[0]
    
    if (!dailyMap.has(dayKey)) {
      dailyMap.set(dayKey, { temp: [], hum: [], aqi: [] })
    }
    
    const dayData = dailyMap.get(dayKey)!
    if (temps[i] !== null && temps[i] !== undefined) dayData.temp.push(temps[i])
    if (hums[i] !== null && hums[i] !== undefined) dayData.hum.push(hums[i])
    if (aqis[i] !== null && aqis[i] !== undefined) dayData.aqi.push(aqis[i])
  }

  // Get last `period` days
  const sortedDays = Array.from(dailyMap.keys()).sort().slice(-period)

  const tempTrend: TrendDataPoint[] = []
  const humTrend: TrendDataPoint[] = []
  const aqiTrend: TrendDataPoint[] = []

  let sumTemp = 0, countTemp = 0
  let sumHum = 0, countHum = 0
  let sumAqi = 0, countAqi = 0
  let dataPoints = 0

  sortedDays.forEach(day => {
    const vals = dailyMap.get(day)!
    const avgT = vals.temp.length ? vals.temp.reduce((a,b)=>a+b,0)/vals.temp.length : null
    const avgH = vals.hum.length ? vals.hum.reduce((a,b)=>a+b,0)/vals.hum.length : null
    const avgA = vals.aqi.length ? vals.aqi.reduce((a,b)=>a+b,0)/vals.aqi.length : null

    // e.g. "Mon"
    const label = new Date(day).toLocaleDateString('en-US', { weekday: 'short' })

    tempTrend.push({ timestamp: day, label, value: avgT ? Number(avgT.toFixed(1)) : null })
    humTrend.push({ timestamp: day, label, value: avgH ? Number(avgH.toFixed(1)) : null })
    aqiTrend.push({ timestamp: day, label, value: avgA ? Math.round(avgA) : null })

    if (avgT !== null) { sumTemp += avgT; countTemp++; dataPoints++; }
    if (avgH !== null) { sumHum += avgH; countHum++; }
    if (avgA !== null) { sumAqi += avgA; countAqi++; }
  })

  // Create records (just map daily averages back as a record for simplicity)
  const records = sortedDays.reverse().map((day) => {
    const vals = dailyMap.get(day)!
    const avgT = vals.temp.length ? vals.temp.reduce((a,b)=>a+b,0)/vals.temp.length : null
    const avgH = vals.hum.length ? vals.hum.reduce((a,b)=>a+b,0)/vals.hum.length : null
    const avgA = vals.aqi.length ? vals.aqi.reduce((a,b)=>a+b,0)/vals.aqi.length : null
    const aqiVal = avgA ? Math.round(avgA) : 0

    return {
      temperature: avgT ? Number(avgT.toFixed(1)) : null,
      humidity: avgH ? Math.round(avgH) : null,
      windSpeed: 10,
      aqi: aqiVal,
      aqiCategory: getAQICategory(aqiVal),
      weatherCondition: 'Clear',
      recordedAt: new Date(day)
    }
  }) as Pick<LeanCityMetric, 'temperature' | 'humidity' | 'windSpeed' | 'aqi' | 'aqiCategory' | 'weatherCondition' | 'recordedAt'>[]

  return {
    cityId,
    cityName,
    period: period as any,
    summary: {
      avgTemperature: countTemp ? Number((sumTemp / countTemp).toFixed(1)) : null,
      avgHumidity: countHum ? Math.round(sumHum / countHum) : null,
      avgAQI: countAqi ? Math.round(sumAqi / countAqi) : null,
      avgWindSpeed: 10,
      dataPoints,
      from: sortedDays[0],
      to: sortedDays[sortedDays.length - 1]
    },
    temperatureTrend: tempTrend,
    aqiTrend: aqiTrend,
    humidityTrend: humTrend,
    records
  }
}

export function buildFallbackLatest(cityId: string, cityName: string): any {
  const data = loadFallbackData()
  if (!data || !data[cityId]) return null

  const cityData = data[cityId]
  const hourly = cityData.hourly
  const aqiHourly = cityData.aqi?.hourly

  if (!hourly || !hourly.time) return null

  const lastIdx = hourly.time.length - 1
  const aqiLastIdx = aqiHourly?.time ? aqiHourly.time.length - 1 : 0
  
  const aqiVal = aqiHourly?.us_aqi ? Math.round(aqiHourly.us_aqi[aqiLastIdx]) : 0

  return {
    _id: `fallback-${Date.now()}`,
    cityId,
    temperature: hourly.temperature_2m[lastIdx] ?? 20,
    feelsLike: hourly.temperature_2m[lastIdx] ?? 20,
    humidity: hourly.relative_humidity_2m[lastIdx] ?? 50,
    windSpeed: 10,
    pressure: 1012,
    visibility: 10000,
    weatherCondition: 'Clear',
    weatherDescription: 'clear sky',
    weatherIcon: '01d',
    aqi: aqiVal,
    aqiCategory: getAQICategory(aqiVal),
    pm25: 10,
    pm10: 20,
    o3: 30,
    no2: 10,
    currencyRates: { 'USD': 1 },
    currencyBase: 'USD',
    recordedAt: new Date(hourly.time[lastIdx]),
    createdAt: new Date()
  }
}
