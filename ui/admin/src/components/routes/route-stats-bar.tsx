import { GitBranch, CheckCircle2, XCircle } from 'lucide-react'
import { MethodBadge } from './method-badge'
import type { Route } from '@/api/client'

interface RouteStatsBarProps {
  routes: Route[]
}

export function RouteStatsBar({ routes }: RouteStatsBarProps) {
  const total    = routes.length
  const enabled  = routes.filter(r => r.enabled).length
  const disabled = total - enabled

  const methodCounts = routes.reduce<Record<string, number>>((acc, r) => {
    const m = r.method === '*' ? 'ANY' : r.method.toUpperCase()
    acc[m] = (acc[m] ?? 0) + 1
    return acc
  }, {})

  const topMethods = Object.entries(methodCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <div className="flex items-center gap-1.5">
        <GitBranch size={14} className="text-navy dark:text-gold" />
        <span className="text-sm font-semibold text-navy dark:text-white">{total}</span>
        <span className="text-xs text-gray-500">Total</span>
      </div>
      <div className="flex items-center gap-1.5">
        <CheckCircle2 size={14} className="text-emerald-500" />
        <span className="text-sm font-semibold text-navy dark:text-white">{enabled}</span>
        <span className="text-xs text-gray-500">Active</span>
      </div>
      <div className="flex items-center gap-1.5">
        <XCircle size={14} className="text-gray-400" />
        <span className="text-sm font-semibold text-navy dark:text-white">{disabled}</span>
        <span className="text-xs text-gray-500">Inactive</span>
      </div>
      {topMethods.length > 0 && (
        <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-gray-700 pl-6">
          <span className="text-xs text-gray-400 mr-1">Methods:</span>
          {topMethods.map(([method, count]) => (
            <span key={method} className="flex items-center gap-1">
              <MethodBadge method={method} />
              <span className="text-xs text-gray-500">{count}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
