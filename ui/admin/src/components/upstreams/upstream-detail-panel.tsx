import { X, Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { UpstreamHealthBadge } from './upstream-health-badge'
import { TimeoutBadge } from './timeout-badge'
import { formatDateTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { Upstream } from '@/api/client'

interface UpstreamDetailPanelProps {
  upstream: Upstream | null
  onClose: () => void
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

export function UpstreamDetailPanel({ upstream, onClose }: UpstreamDetailPanelProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity',
          upstream ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-250',
          upstream ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ zIndex: 1150 }}
      >
        {upstream && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-semibold text-navy dark:text-white">{upstream.name}</h3>
                <p className="text-xs text-gray-500 font-code mt-0.5 truncate max-w-[200px]">{upstream.base_url}</p>
              </div>
              <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close panel">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-2 flex-wrap">
                <UpstreamHealthBadge upstream={upstream} />
                <TimeoutBadge timeoutMs={upstream.timeout_ms} />
              </div>

              <div className="space-y-4">
                <Field label="Upstream ID" value={upstream.id}         mono copyable />
                <Field label="Name"        value={upstream.name} />
                <Field label="Tenant ID"   value={upstream.tenant_id}  mono copyable />
                <Field label="Created"     value={formatDateTime(upstream.created_at)} />
                <Field label="Updated"     value={formatDateTime(upstream.updated_at)} />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="label">Base URL</p>
                <p className="text-xs font-code bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 break-all flex items-start gap-1">
                  <span className="flex-1">{upstream.base_url}</span>
                  <CopyButton value={upstream.base_url} />
                </p>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="label">Status</p>
                <Badge variant={upstream.enabled ? 'success' : 'ghost'} dot>
                  {upstream.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
