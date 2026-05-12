'use client'

import { MapPin, Globe, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CardSkeleton } from '@/components/loaders/CardSkeleton'
import { cn, formatNumber } from '@/lib/utils'
import type { CityConfig } from '@/types'

interface CityDetailModalProps {
  city: CityConfig | null
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function CityDetailModal({ city, isOpen, onClose, className }: CityDetailModalProps) {
  if (!city) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn('max-w-lg border-border/40 bg-background/95 backdrop-blur-md', className)}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <MapPin className="h-3.5 w-3.5 text-primary" />
            </div>
            {city.name}
            <Badge variant="outline" className="ml-auto text-xs">
              {city.countryCode}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* City meta */}
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {city.country}
          </span>
          {city.population && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatNumber(city.population)} residents
            </span>
          )}
          <span>Timezone: {city.timezone}</span>
        </div>

        <Separator className="my-3" />

        {/* Data sections - placeholder until APIs are connected */}
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
          <CardSkeleton lines={2} />
        </div>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          Live data will appear here once APIs are connected
        </p>
      </DialogContent>
    </Dialog>
  )
}
