import { cn } from '@/lib/utils'

export type ReplicationStatus = 'idle' | 'syncing' | 'error'

interface RegionStatusIndicatorProps {
  status: ReplicationStatus
  className?: string
}

const statusConfig: Record<ReplicationStatus, { label: string; dotClass: string; textClass: string }> = {
  idle:    { label: 'Idle',    dotClass: 'bg-gray-400 dark:bg-gray-500',   textClass: 'text-gray-500 dark:text-gray-400' },
  syncing: { label: 'Syncing', dotClass: 'bg-emerald-500 animate-pulse',    textClass: 'text-emerald-600 dark:text-emerald-400' },
  error:   { label: 'Error',   dotClass: 'bg-red-500',                      textClass: 'text-red-600 dark:text-red-400' },
}

export function RegionStatusIndicator({ status, className }: RegionStatusIndicatorProps) {
  const cfg = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dotClass)} />
      <span className={cn('text-xs font-medium', cfg.textClass)}>{cfg.label}</span>
    </span>
  )
}
