'use client'

// Dashboard state store - using React state/context for now
// Can be migrated to Zustand or Jotai if state complexity grows

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { CityConfig } from '@/types'

interface DashboardState {
  selectedCity: CityConfig | null
  isSidebarOpen: boolean
  isModalOpen: boolean
  searchQuery: string
}

interface DashboardActions {
  selectCity: (city: CityConfig) => void
  clearSelection: () => void
  toggleSidebar: () => void
  setSearchQuery: (query: string) => void
  /** Explicitly open the analytics sheet for the currently selected city. */
  openModal: () => void
  closeModal: () => void
}

type DashboardContextType = DashboardState & DashboardActions

const DashboardContext = createContext<DashboardContextType | null>(null)

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DashboardState>({
    selectedCity: null,
    isSidebarOpen: false,
    isModalOpen: false,
    searchQuery: '',
  })

  const selectCity = useCallback((city: CityConfig) => {
    // Only update the selected city — does NOT open the modal.
    // Call openModal() explicitly to open the analytics sheet.
    setState((prev) => ({ ...prev, selectedCity: city }))
  }, [])

  const clearSelection = useCallback(() => {
    setState((prev) => ({ ...prev, selectedCity: null, isModalOpen: false }))
  }, [])

  const toggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, isSidebarOpen: !prev.isSidebarOpen }))
  }, [])

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }))
  }, [])

  const openModal = useCallback(() => {
    setState((prev) => ({ ...prev, isModalOpen: true }))
  }, [])

  const closeModal = useCallback(() => {
    setState((prev) => ({ ...prev, isModalOpen: false }))
  }, [])

  return (
    <DashboardContext.Provider
      value={{ ...state, selectCity, clearSelection, toggleSidebar, setSearchQuery, openModal, closeModal }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboardStore() {
  const context = useContext(DashboardContext)
  if (!context) {
    throw new Error('useDashboardStore must be used within DashboardProvider')
  }
  return context
}
