import { X, Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { MethodBadge } from './method-badge'
import { formatDateTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { Route } from '@/api/client'

interface RouteDetailPanelProps {
  route: Route | null
  onClose: () => void
  upstreamName?: string
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-gray-400 hover:text-gray-600 transition-colors ml-1" title="Copy">
      {copied ? <CheckCheck size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  )
}

interface FieldProps { label: string; value: string; mono?: boolean; copyable?: boolean }

function Field({ label, value, mono, copyable }: FieldProps) {
  return (
    <div>
      <p className="label">{label}</p>
      <p className={cn('text-sm text-navy dark:text-white flex items-center gap-1', mono && 'font-code text-xs')}>
        {value}
        {copyable && <CopyButton value={value} />}
      </p>
    </div>
  )
}

export function RouteDetailPanel({ route, onClose, upstreamName }: RouteDetailPanelProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity',
          route ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-250',
          route ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ zIndex: 1150 }}
      >
        {route && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <MethodBadge method={route.method} />
                <div>
                  <p className="font-semibold text-navy dark:text-white font-code text-sm">{route.path_prefix}</p>
                  {route.host && <p className="text-xs text-gray-500 mt-0.5">{route.host}</p>}
                </div>
              </div>
              <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close panel">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant={route.enabled ? 'success' : 'ghost'} dot>
                  {route.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="space-y-4">
                <Field label="Route ID"    value={route.id}          mono copyable />
                <Field label="Tenant ID"   value={route.tenant_id}   mono copyable />
                <Field label="Upstream ID" value={route.upstream_id} mono copyable />
                {upstreamName && <Field label="Upstream Name" value={upstreamName} />}
                <Field label="Host"        value={route.host || '(any)'} />
                <Field label="Created"     value={formatDateTime(route.created_at)} />
                <Field label="Updated"     value={formatDateTime(route.updated_at)} />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="label">Path Prefix</p>
                <p className="text-xs font-code bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 flex items-center gap-1">
                  <span className="flex-1">{route.path_prefix}</span>
                  <CopyButton value={route.path_prefix} />
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
