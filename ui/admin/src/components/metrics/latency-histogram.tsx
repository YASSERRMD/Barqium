interface LatencyBar {
  label: string
  value: number
  colorClass: string
}

interface LatencyHistogramProps {
  p50: number
  p95: number
  p99: number
}

export function LatencyHistogram({ p50, p95, p99 }: LatencyHistogramProps) {
  const bars: LatencyBar[] = [
    { label: 'p50', value: p50, colorClass: 'bg-emerald-500' },
    { label: 'p95', value: p95, colorClass: 'bg-amber-500' },
    { label: 'p99', value: p99, colorClass: 'bg-red-500'   },
  ]

  const maxVal = Math.max(p50, p95, p99, 1)

  return (
    <div className="space-y-3">
      {bars.map(bar => (
        <div key={bar.label} className="flex items-center gap-3">
          <span className="w-8 text-xs font-code font-semibold text-gray-500 flex-shrink-0">{bar.label}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${bar.colorClass}`}
              style={{ width: `${(bar.value / maxVal) * 100}%` }}
            />
          </div>
          <span className="w-16 text-xs font-code text-right text-gray-600 dark:text-gray-300 flex-shrink-0">
            {bar.value} ms
          </span>
        </div>
      ))}
    </div>
  )
}
