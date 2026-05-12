import type { Metadata } from 'next'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardProvider } from '@/store/dashboardStore'
import { DashboardView } from '@/components/layout/DashboardView'

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Live city intelligence — weather, AQI, currency, and analytics',
}

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardLayout>
        <DashboardView />
      </DashboardLayout>
    </DashboardProvider>
  )
}
