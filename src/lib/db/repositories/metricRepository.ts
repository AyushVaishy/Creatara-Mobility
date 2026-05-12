import { CityMetric, type ICityMetricDocument, type ICityMetricInput } from '@/models'
import { connectDB } from '@/lib/db/mongoose'
import type { MetricQueryOptions, MetricAggregation, TrendDataPoint, PeriodSummary } from '@/types'
import { DEFAULT_PAGE_SIZE, HISTORY_DAYS_DEFAULT } from '@/lib/constants'

// ─── Write operations ─────────────────────────────────────────────────────────

/** Inserts a new metric snapshot. */
export async function insertMetric(
  data: ICityMetricInput,
): Promise<ICityMetricDocument> {
  await connectDB()
  const metric = new CityMetric(data)
  return metric.save() as Promise<ICityMetricDocument>
}

/**
 * Inserts a metric snapshot only if no record exists for this city
 * within the last `windowMinutes` minutes (default 25 min).
 * Prevents duplicate entries when cron runs close together.
 * Returns null if the insert was skipped.
 */
export async function insertMetricDeduped(
  data: ICityMetricInput,
  windowMinutes = 25,
): Promise<ICityMetricDocument | null> {
  await connectDB()
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000)

  const existing = await CityMetric.exists({
    cityId: data.cityId,
    recordedAt: { $gte: windowStart },
  })

  if (existing) return null
  return insertMetric(data)
}

// ─── Read operations ──────────────────────────────────────────────────────────

/** Returns paginated metrics for a city within a time range. */
export async function getMetricsByCityId(
  options: MetricQueryOptions,
): Promise<ICityMetricDocument[]> {
  const {
    cityId,
    from  = new Date(Date.now() - HISTORY_DAYS_DEFAULT * 24 * 60 * 60 * 1000),
    to    = new Date(),
    limit = DEFAULT_PAGE_SIZE,
    page  = 1,
  } = options

  await connectDB()

  return CityMetric.find({
    cityId,
    recordedAt: { $gte: from, $lte: to },
  })
    .sort({ recordedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean() as unknown as ICityMetricDocument[]
}

/** Returns the most recent metric for a city. */
export async function getLatestMetricByCityId(
  cityId: string,
): Promise<ICityMetricDocument | null> {
  await connectDB()
  return CityMetric.findOne({ cityId })
    .sort({ recordedAt: -1 })
    .lean() as Promise<ICityMetricDocument | null>
}

/** Returns the most recent metric for every distinct cityId. */
export async function getLatestMetricAllCities(): Promise<ICityMetricDocument[]> {
  await connectDB()
  const results = await CityMetric.aggregate([
    { $sort: { recordedAt: -1 } },
    { $group: { _id: '$cityId', doc: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$doc' } },
  ])
  return results as ICityMetricDocument[]
}

// ─── Aggregation / trend queries ──────────────────────────────────────────────

/** Aggregates average metrics over a time range for a single city. */
export async function aggregateMetrics(
  options: MetricQueryOptions,
): Promise<MetricAggregation | null> {
  const {
    cityId,
    from = new Date(Date.now() - HISTORY_DAYS_DEFAULT * 24 * 60 * 60 * 1000),
    to   = new Date(),
  } = options

  await connectDB()

  const result = await CityMetric.aggregate([
    { $match: { cityId, recordedAt: { $gte: from, $lte: to } } },
    {
      $group: {
        _id:            '$cityId',
        avgTemperature: { $avg: '$temperature' },
        avgHumidity:    { $avg: '$humidity' },
        avgAQI:         { $avg: '$aqi' },
        avgWindSpeed:   { $avg: '$windSpeed' },
        dataPoints:     { $sum: 1 },
      },
    },
  ])

  if (!result[0]) return null

  return {
    cityId:         result[0]._id as string,
    avgTemperature: result[0].avgTemperature as number | null,
    avgHumidity:    result[0].avgHumidity    as number | null,
    avgAQI:         result[0].avgAQI         as number | null,
    avgWindSpeed:   result[0].avgWindSpeed   as number | null,
    dataPoints:     result[0].dataPoints     as number,
    from,
    to,
  }
}

/**
 * Computes a period-level summary (averages + data point count).
 * Reuses aggregateMetrics and maps to the PeriodSummary shape.
 */
export async function getPeriodSummary(
  cityId: string,
  days: number,
): Promise<PeriodSummary> {
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const to   = new Date()
  const agg  = await aggregateMetrics({ cityId, from, to })

  return {
    avgTemperature: agg?.avgTemperature ?? null,
    avgHumidity:    agg?.avgHumidity    ?? null,
    avgAQI:         agg?.avgAQI         ?? null,
    avgWindSpeed:   agg?.avgWindSpeed   ?? null,
    dataPoints:     agg?.dataPoints     ?? 0,
    from: from.toISOString(),
    to:   to.toISOString(),
  }
}

/**
 * Builds a daily trend for the given `field` over `days` days.
 * Each bucket is one calendar day (UTC), averaged across all readings.
 */
export async function getDailyTrend(
  cityId: string,
  field: 'temperature' | 'aqi' | 'humidity' | 'windSpeed',
  days: number,
): Promise<TrendDataPoint[]> {
  await connectDB()
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const result = await CityMetric.aggregate([
    { $match: { cityId, recordedAt: { $gte: from }, [field]: { $ne: null } } },
    {
      $group: {
        _id: {
          year:  { $year:  '$recordedAt' },
          month: { $month: '$recordedAt' },
          day:   { $dayOfMonth: '$recordedAt' },
        },
        value:        { $avg: `$${field}` },
        bucketStart:  { $min: '$recordedAt' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ])

  return result.map((r) => {
    const d = r.bucketStart as Date
    return {
      timestamp: d.toISOString(),
      label:     d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
      value:     typeof r.value === 'number' ? Math.round(r.value * 10) / 10 : null,
    }
  })
}

/**
 * Builds an hourly trend for the last 24 h for temperature, AQI, and humidity.
 * Each bucket is one hour (UTC).
 */
export async function getHourlyTrends(
  cityId: string,
): Promise<{ temperature: TrendDataPoint[]; aqi: TrendDataPoint[]; humidity: TrendDataPoint[] }> {
  await connectDB()
  const from = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const result = await CityMetric.aggregate([
    { $match: { cityId, recordedAt: { $gte: from } } },
    {
      $group: {
        _id: {
          year:  { $year:  '$recordedAt' },
          month: { $month: '$recordedAt' },
          day:   { $dayOfMonth: '$recordedAt' },
          hour:  { $hour:  '$recordedAt' },
        },
        avgTemperature: { $avg: '$temperature' },
        avgAQI:         { $avg: '$aqi' },
        avgHumidity:    { $avg: '$humidity' },
        bucketStart:    { $min: '$recordedAt' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } },
  ])

  const round = (v: unknown) =>
    typeof v === 'number' ? Math.round(v * 10) / 10 : null

  const buildPoint = (r: (typeof result)[0], value: number | null): TrendDataPoint => {
    const d = r.bucketStart as Date
    return {
      timestamp: d.toISOString(),
      label: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }),
      value,
    }
  }

  return {
    temperature: result.map((r) => buildPoint(r, round(r.avgTemperature))),
    aqi:         result.map((r) => buildPoint(r, round(r.avgAQI))),
    humidity:    result.map((r) => buildPoint(r, round(r.avgHumidity))),
  }
}
