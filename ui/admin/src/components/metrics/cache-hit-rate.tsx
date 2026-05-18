interface CacheHitRateProps {
  hitRate: number
  totalRequests: number
  cacheHits: number
}

export function CacheHitRate({ hitRate, totalRequests, cacheHits }: CacheHitRateProps) {
  const clampedRate = Math.min(100, Math.max(0, hitRate))
  const circumference = 2 * Math.PI * 36
  const offset = circumference * (1 - clampedRate / 100)

  const rateColor =
    clampedRate >= 70 ? '#10b981' :
    clampedRate >= 40 ? '#f59e0b' :
    '#ef4444'

  return (
    <div className="flex items-center gap-6">
      {/* Donut */}
      <div className="relative flex-shrink-0" style={{ width: 88, height: 88 }}>
        <svg width={88} height={88} viewBox="0 0 88 88" className="-rotate-90">
          <circle
            cx={44} cy={44} r={36}
            fill="none"
            stroke="currentColor"
            strokeWidth={10}
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx={44} cy={44} r={36}
            fill="none"
            stroke={rateColor}
            strokeWidth={10}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-code text-lg font-bold text-navy dark:text-white leading-none">
            {clampedRate.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        <div>
          <p className="text-xs text-gray-500">Cache Hits</p>
          <p className="font-code text-sm font-bold text-navy dark:text-white">
            {cacheHits.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Requests</p>
          <p className="font-code text-sm font-bold text-navy dark:text-white">
            {totalRequests.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Semantic Cache</p>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: rateColor }}
          >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: rateColor }} />
            {clampedRate >= 70 ? 'Excellent' : clampedRate >= 40 ? 'Good' : 'Low'}
          </span>
        </div>
      </div>
    </div>
  )
}
