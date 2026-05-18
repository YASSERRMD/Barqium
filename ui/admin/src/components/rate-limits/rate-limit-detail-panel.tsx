import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { AlgorithmBadge } from './algorithm-badge'
import { ScopeBadge } from './scope-badge'
import { RateLimitVisualizer } from './rate-limit-visualizer'
import { formatDateTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { RateLimitPolicy } from '@/api/client'

interface RateLimitDetailPanelProps {
  policy: RateLimitPolicy | null
  onClose: () => void
}

interface FieldProps { label: string; value: string; mono?: boolean }

function Field({ label, value, mono }: FieldProps) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className={cn('text-sm text-navy dark:text-white', mono && 'font-code text-xs')}>{value}</p>
    </div>
  )
}

function formatWindow(secs: number): string {
  if (secs < 60)   return `${secs} second${secs !== 1 ? 's' : ''}`
  if (secs < 3600) return `${Math.round(secs / 60)} minute${Math.round(secs / 60) !== 1 ? 's' : ''}`
  return `${Math.round(secs / 3600)} hour${Math.round(secs / 3600) !== 1 ? 's' : ''}`
}

export function RateLimitDetailPanel({ policy, onClose }: RateLimitDetailPanelProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity',
          policy ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-250',
          policy ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ zIndex: 1150 }}
      >
        {policy && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-semibold text-navy dark:text-white">{policy.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <ScopeBadge scope={policy.scope} />
                  <AlgorithmBadge algorithm={policy.algorithm} />
                </div>
              </div>
              <button className="btn-icon btn-ghost" onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant={policy.enabled ? 'success' : 'ghost'} dot>
                  {policy.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                <p className="label mb-3">Rate Limit Visualization</p>
                <RateLimitVisualizer policy={policy} />
              </div>

              <div className="space-y-4">
                <Field label="Policy ID"  value={policy.id}        mono />
                <Field label="Tenant ID"  value={policy.tenant_id} mono />
                <Field label="Rate Limit" value={`${policy.rate_limit} requests per ${formatWindow(policy.window_secs)}`} />
                {policy.burst_limit && (
                  <Field label="Burst Limit" value={`${policy.burst_limit} requests`} />
                )}
                <Field label="Window"    value={formatWindow(policy.window_secs)} />
                <Field label="Created"   value={formatDateTime(policy.created_at)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
