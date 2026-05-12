import mongoose, { type Document, type Model, Schema } from 'mongoose'

export interface ICityDocument extends Document {
  cityId: string
  name: string
  country: string
  countryCode: string
  latitude: number
  longitude: number
  timezone: string
  currency: string
  population: number
  createdAt: Date
  updatedAt: Date
}

const CitySchema = new Schema<ICityDocument>(
  {
    cityId:      { type: String, required: true, unique: true, index: true, trim: true },
    name:        { type: String, required: true, trim: true },
    country:     { type: String, required: true, trim: true },
    countryCode: { type: String, required: true, trim: true, uppercase: true, maxlength: 3 },
    latitude:    { type: Number, required: true, min: -90,  max: 90  },
    longitude:   { type: Number, required: true, min: -180, max: 180 },
    timezone:    { type: String, required: true, trim: true },
    currency:    { type: String, required: true, trim: true, uppercase: true, maxlength: 3 },
    population:  { type: Number, required: true, min: 0 },
  },
  {
    timestamps: true,
    collection: 'cities',
  },
)

export const City: Model<ICityDocument> =
  mongoose.models.City ?? mongoose.model<ICityDocument>('City', CitySchema)
