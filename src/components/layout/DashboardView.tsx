'use client'

import { useMemo, useCallback } from 'react'
import { Globe, Thermometer, Wind, Database, TableIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { WorldMap } from '@/components/map/WorldMap'
import { CityCard } from '@/components/cards/CityCard'
import { CityOverviewCard } from '@/components/cards/CityOverviewCard'
import { HeroLocationCard } from '@/components/cards/HeroLocationCard'
import { StatsCard } from '@/components/cards/StatsCard'
import { AllCitiesTable } from '@/components/cards/AllCitiesTable'
import { AnalyticsSheet } from '@/components/layout/AnalyticsSheet'
import { useDashboardStore } from '@/store/dashboardStore'
import { useAllCitiesLatest, useCityIntelligence } from '@/hooks/useCityData'
import { GLOBAL_CITIES, CITY_COUNT } from '@/lib/constants'

const fadeInUp = {
  initial:    { opacity: 0, y: 16 },
  animate:    { opacity: 1, y: 0  },
  transition: { duration: 0.4 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.07 } },
}

export function DashboardView() {
  const { selectedCity, isModalOpen, selectCity, clearSelection, openModal, closeModal } = useDashboardStore()
  const selectedCityId = selectedCity?.id ?? null

  const { dataMap, loadedCount, isFetching } = useAllCitiesLatest()
  const { data: intelligence, isLoading: intelligenceLoading } = useCityIntelligence(selectedCity)

  const stats = useMemo(() => {
    const metrics = Object.values(dataMap).map((d) => d?.metric).filter(Boolean)
    const temps   = metrics.map((m) => m?.temperature).filter((t): t is number => t !== null && t !== undefined)
    const aqis    = metrics.map((m) => m?.aqi).filter((a): a is number => a !== null && a !== undefined)
    const avgTemp = temps.length ? Math.round(temps.reduce((s, v) => s + v, 0) / temps.length) : null
    const avgAQI  = aqis.length  ? Math.round(aqis.reduce((s, v) => s + v, 0)  / aqis.length)  : null
    return { avgTemp, avgAQI }
  }, [dataMap])

  const handleCityClick = useCallback((cityId: string) => {
    const city = GLOBAL_CITIES.find((c) => c.id === cityId)
    if (city) selectCity(city)
  }, [selectCity])

  const handleViewAnalytics = useCallback(() => {
    if (selectedCity) openModal()
  }, [selectedCity, openModal])

  return (
    <div className="container mx-auto space-y-5 px-4 py-6 md:px-6">
      {/* Hero — user location */}
      <HeroLocationCard />

      {/* Stats row */}
      <motion.div
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
        initial="initial"
        animate="animate"
        variants={staggerContainer}
      >
        {[
          {
            title:    'Cities Tracked',
            value:    CITY_COUNT,
            icon:     Globe,
            subtitle: 'Global coverage',
          },
          {
            title:    'Avg Temperature',
            value:    stats.avgTemp !== null ? `${stats.avgTemp}°C` : '—°C',
            icon:     Thermometer,
            subtitle: loadedCount > 0 ? `From ${loadedCount} cities` : 'Loading…',
          },
          {
            title:    'Avg AQI',
            value:    stats.avgAQI !== null ? stats.avgAQI : '—',
            icon:     Wind,
            subtitle: stats.avgAQI !== null
              ? stats.avgAQI <= 50  ? 'Good air quality'
              : stats.avgAQI <= 100 ? 'Moderate'
              : 'Unhealthy'
              : 'Loading…',
            trend: stats.avgAQI !== null
              ? stats.avgAQI <= 50  ? ('up'      as const)
              : stats.avgAQI <= 100 ? ('neutral' as const)
              : ('down' as const)
              : undefined,
          },
          {
            title:    'Data Points',
            value:    loadedCount > 0 ? `${loadedCount}/${CITY_COUNT}` : '—',
            icon:     Database,
            subtitle: isFetching ? 'Refreshing…' : 'Live snapshots loaded',
          },
        ].map((stat) => (
          <motion.div key={stat.title} variants={fadeInUp}>
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </motion.div>

      {/* Main grid: Map + Sidebar */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Map */}
        <motion.div {...fadeInUp} className="flex flex-col">
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              World Map
            </h2>
            <span className="text-xs text-muted-foreground/60">
              Click a marker to explore
            </span>
          </div>
          <WorldMap
            citiesLatestMap={dataMap}
            selectedCityId={selectedCityId}
            onCityClick={handleCityClick}
            className="flex-1 w-full min-h-[400px] rounded-xl overflow-hidden transition-all duration-300"
          />
        </motion.div>

        {/* Sidebar */}
        <motion.div {...fadeInUp} className="flex flex-col gap-3 h-full">
          {selectedCity ? (
            <div className="flex flex-col h-full gap-3">
              <div className="flex shrink-0 items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {selectedCity.name}
                </h2>
                <button
                  onClick={clearSelection}
                  aria-label="Back to all cities"
                  className="text-xs text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  ← All cities
                </button>
              </div>
              <CityOverviewCard
                city={selectedCity}
                intelligence={intelligence ?? null}
                isLoading={intelligenceLoading}
                onViewAnalytics={handleViewAnalytics}
                className="flex-1 h-full"
              />
            </div>
          ) : (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Global Cities
              </h2>
              <div
                className="scrollbar-thin flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-0.5"
                role="list"
                aria-label="City list"
              >
                {GLOBAL_CITIES.map((city) => (
                  <div key={city.id} role="listitem">
                    <CityCard
                      city={city}
                      metric={dataMap[city.id]?.metric ?? null}
                      isSelected={selectedCityId === city.id}
                      onClick={() => selectCity(city)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Analytics sheet (side drawer) */}
      <AnalyticsSheet city={selectedCity} isOpen={isModalOpen} onClose={closeModal} />

      {/* All-cities metrics table */}
      <motion.div {...fadeInUp}>
        <div className="mb-2 flex items-center gap-2">
          <TableIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            All Cities — Metrics Table
          </h2>
        </div>
        <AllCitiesTable dataMap={dataMap} onCityClick={handleCityClick} />
      </motion.div>
    </div>
  )
}


