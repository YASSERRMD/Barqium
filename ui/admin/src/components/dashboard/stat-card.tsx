import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

export interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  icon: React.ElementType
  trend?: 'up' | 'down' | 'neutral'
  trendLabel?: string
  color?: 'default' | 'success' | 'danger' | 'warning' | 'info'
  loading?: boolean
  className?: string
}

const colorMap = {
  default: 'bg-navy/8 text-navy dark:bg-white/8 dark:text-white',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  danger:  'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  info:    'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
}

export function StatCard({ label, value, unit, icon: Icon, trend, trendLabel, color = 'default', loading, className }: StatCardProps) {
  if (loading) {
    return (
      <div className={cn('card p-5', className)}>
        <div className="flex items-center gap-3 mb-3">
          <Skeleton variant="rectangular" className="w-9 h-9 rounded-lg" />
          <Skeleton variant="text" className="w-24 h-3" />
        </div>
        <Skeleton variant="text" className="w-20 h-7 mb-1" />
        <Skeleton variant="text" className="w-16 h-3" />
      </div>
    )
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div className={cn('card p-5 hover:shadow-md transition-shadow', className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', colorMap[color])}>
          <Icon size={17} />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
            trend === 'up'      && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
            trend === 'down'    && 'bg-red-50 text-red-500 dark:bg-red-950 dark:text-red-400',
            trend === 'neutral' && 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
          )}>
            <TrendIcon size={11} />
            {trendLabel}
          </div>
        )}
      </div>

      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold text-navy dark:text-white leading-none">
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}
      </p>
    </div>
  )
}
