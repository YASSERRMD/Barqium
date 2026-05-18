import { cn } from '@/lib/utils'

interface LiveIndicatorProps {
  connected: boolean
  className?: string
}

export function LiveIndicator({ connected, className }: LiveIndicatorProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        connected
          ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500',
        className,
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full flex-shrink-0',
          connected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400',
        )}
      />
      {connected ? 'LIVE' : 'PAUSED'}
    </span>
  )
}
