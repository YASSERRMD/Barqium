import { cn } from '@/lib/utils'
import type { RateLimitPolicy } from '@/api/client'

interface RateLimitVisualizerProps {
  policy: RateLimitPolicy
  className?: string
}

function formatWindow(secs: number): string {
  if (secs < 60)    return `${secs}s`
  if (secs < 3600)  return `${Math.round(secs / 60)}m`
  return `${Math.round(secs / 3600)}h`
}

export function RateLimitVisualizer({ policy, className }: RateLimitVisualizerProps) {
  const { rate_limit, window_secs, burst_limit } = policy

  const burstRatio = burst_limit ? Math.min(burst_limit / rate_limit, 2) : 1
  const rps = rate_limit / window_secs

  const intensity =
    rps > 10    ? 'bg-emerald-400 dark:bg-emerald-500' :
    rps > 1     ? 'bg-amber-400 dark:bg-amber-500'     :
                  'bg-red-400 dark:bg-red-500'

  const fillWidth = Math.min((rate_limit / Math.max(rate_limit, 1000)) * 100, 100)

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{rate_limit} req / {formatWindow(window_secs)}</span>
        {burst_limit && <span className="text-amber-500">burst: {burst_limit}</span>}
      </div>

      {/* Rate bar */}
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', intensity)}
          style={{ width: `${Math.max(fillWidth, 4)}%` }}
        />
      </div>

      {/* Burst overlay */}
      {burst_limit && burstRatio > 1 && (
        <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-amber-300 dark:bg-amber-600 transition-all"
            style={{ width: `${Math.min(fillWidth * burstRatio, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}
