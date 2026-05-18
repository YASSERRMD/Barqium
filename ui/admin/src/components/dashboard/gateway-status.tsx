import { CheckCircle2, XCircle, Clock, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface HealthResponse {
  status: string
  db: string
  uptime_seconds?: number
}

interface GatewayStatusCardProps {
  health?: HealthResponse
  isError?: boolean
  isLoading?: boolean
  lastUpdated?: Date
  onRefresh?: () => void
}

function formatUptime(seconds: number): string {
  if (seconds < 60)   return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  return `${h}h ${m}m`
}

export function GatewayStatusCard({ health, isError, isLoading, lastUpdated, onRefresh }: GatewayStatusCardProps) {
  const isHealthy = !isError && health?.status === 'ok'

  if (isLoading) {
    return (
      <div className="card p-5 flex items-center gap-4">
        <Skeleton variant="circular" width={44} height={44} />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="w-40" />
          <Skeleton variant="text" className="w-56 h-3" />
        </div>
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>
    )
  }

  return (
    <div className={cn(
      'card p-5 flex items-center gap-4 transition-colors',
      isHealthy ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800',
    )}>
      <div className={cn(
        'w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0',
        isHealthy ? 'bg-emerald-100 dark:bg-emerald-900' : 'bg-red-100 dark:bg-red-900',
      )}>
        {isHealthy
          ? <CheckCircle2 size={20} className="text-emerald-500" />
          : <XCircle size={20} className="text-red-500" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-navy dark:text-white text-sm">
          {isHealthy ? 'Control API healthy' : 'Control API unreachable'}
        </p>
        <div className="flex items-center gap-3 mt-0.5">
          {health?.db && (
            <span className="text-xs text-gray-500">
              DB: <span className="text-emerald-600 font-medium">{health.db}</span>
            </span>
          )}
          {health?.uptime_seconds !== undefined && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={11} />
              uptime {formatUptime(health.uptime_seconds)}
            </span>
          )}
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="btn-icon btn-ghost w-7 h-7 text-gray-400"
            title="Refresh health"
          >
            <RefreshCw size={13} />
          </button>
        )}
        <Badge variant={isHealthy ? 'success' : 'destructive'} dot>
          {isHealthy ? 'healthy' : 'unhealthy'}
        </Badge>
      </div>
    </div>
  )
}
