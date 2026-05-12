import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChartPlaceholderProps {
  title?: string
  height?: string | number
  className?: string
}

export function ChartPlaceholder({
  title = 'Analytics Chart',
  height = 200,
  className,
}: ChartPlaceholderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60',
        'bg-muted/20 text-muted-foreground',
        className,
      )}
      style={{ height }}
    >
      <BarChart3 className="h-8 w-8 opacity-40" />
      <div className="text-center">
        <p className="text-xs font-medium">{title}</p>
        <p className="mt-0.5 text-[10px] opacity-60">Recharts will render here</p>
      </div>
    </div>
  )
}
