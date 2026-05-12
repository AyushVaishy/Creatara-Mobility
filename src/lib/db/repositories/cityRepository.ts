import { City, type ICityDocument } from '@/models'
import { connectDB } from '@/lib/db/mongoose'
import { GLOBAL_CITIES } from '@/lib/constants'
import { logger } from '@/lib/utils/logger'

/** Returns all city documents, seeding the collection if empty. */
export async function getAllCities(): Promise<ICityDocument[]> {
  await connectDB()
  const cities = await City.find({}).lean()

  if (cities.length === 0) {
    logger.info('Cities collection empty — seeding from config', 'cityRepository')
    await seedCities()
    return City.find({}).lean() as unknown as ICityDocument[]
  }

  return cities as unknown as ICityDocument[]
}

/** Returns a single city by its slug ID (e.g. 'new-york'). */
export async function getCityById(cityId: string): Promise<ICityDocument | null> {
  await connectDB()
  return City.findOne({ cityId }).lean() as Promise<ICityDocument | null>
}

/** Upserts all cities from the GLOBAL_CITIES config. */
export async function seedCities(): Promise<void> {
  await connectDB()

  const ops = GLOBAL_CITIES.map((city) => ({
    updateOne: {
      filter: { cityId: city.id },
      update: {
        $set: {
          cityId:      city.id,
          name:        city.name,
          country:     city.country,
          countryCode: city.countryCode,
          latitude:    city.latitude,
          longitude:   city.longitude,
          timezone:    city.timezone,
          currency:    city.currency,
          population:  city.population,
        },
      },
      upsert: true,
    },
  }))

  const result = await City.bulkWrite(ops)
  logger.info(
    `Cities seeded — upserted: ${result.upsertedCount}, modified: ${result.modifiedCount}`,
    'cityRepository',
  )
}
