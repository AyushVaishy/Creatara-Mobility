'use client'

import { useState, useCallback } from 'react'
import type { City } from '@/types'

export function useSelectedCity() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const selectCity = useCallback((city: City) => {
    setSelectedCity(city)
    setIsModalOpen(true)
  }, [])

  const clearCity = useCallback(() => {
    setSelectedCity(null)
    setIsModalOpen(false)
  }, [])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return {
    selectedCity,
    isModalOpen,
    selectCity,
    clearCity,
    closeModal,
  }
}
