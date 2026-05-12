import mongoose, { type Document, type Model, Schema } from 'mongoose'

export interface ICityMetricDocument extends Document {
  cityId: string
  // Weather
  temperature:        number | null
  feelsLike:          number | null
  humidity:           number | null
  windSpeed:          number | null
  pressure:           number | null
  visibility:         number | null
  weatherCondition:   string | null
  weatherDescription: string | null
  weatherIcon:        string | null
  // AQI
  aqi:                number | null
  aqiCategory:        string | null
  pm25:               number | null
  pm10:               number | null
  o3:                 number | null
  no2:                number | null
  // Currency
  currencyRates:      Map<string, number>
  currencyBase:       string | null
  // Timing
  recordedAt:         Date
  createdAt:          Date
}

/** Plain-object version used when creating new records (no Mongoose Document methods needed). */
export type ICityMetricInput = Omit<
  {
    [K in keyof ICityMetricDocument]: ICityMetricDocument[K]
  },
  keyof Document | 'createdAt' | 'currencyRates'
> & {
  currencyRates?: Map<string, number> | Record<string, number>
}

const CityMetricSchema = new Schema<ICityMetricDocument>(
  {
    cityId:             { type: String, required: true, index: true },
    temperature:        { type: Number, default: null },
    feelsLike:          { type: Number, default: null },
    humidity:           { type: Number, default: null },
    windSpeed:          { type: Number, default: null },
    pressure:           { type: Number, default: null },
    visibility:         { type: Number, default: null },
    weatherCondition:   { type: String, default: null },
    weatherDescription: { type: String, default: null },
    weatherIcon:        { type: String, default: null },
    aqi:                { type: Number, default: null },
    aqiCategory:        { type: String, default: null },
    pm25:               { type: Number, default: null },
    pm10:               { type: Number, default: null },
    o3:                 { type: Number, default: null },
    no2:                { type: Number, default: null },
    currencyRates:      { type: Map, of: Number, default: {} },
    currencyBase:       { type: String, default: null },
    recordedAt:         { type: Date, required: true, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'city_metrics',
  },
)

// Primary query pattern: city + time range
CityMetricSchema.index({ cityId: 1, recordedAt: -1 })

// TTL: auto-purge records older than 90 days
CityMetricSchema.index({ recordedAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 })

export const CityMetric: Model<ICityMetricDocument> =
  mongoose.models.CityMetric ??
  mongoose.model<ICityMetricDocument>('CityMetric', CityMetricSchema)
