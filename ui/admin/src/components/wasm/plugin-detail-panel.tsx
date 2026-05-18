import { X, Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { PluginTriggerBadge } from './plugin-trigger-badge'
import { PluginVersionBadge } from './plugin-version-badge'
import { PluginShaDisplay } from './plugin-sha-display'
import { formatDateTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { WasmPlugin } from '@/api/client'

interface PluginDetailPanelProps {
  plugin: WasmPlugin | null
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

export function PluginDetailPanel({ plugin, onClose }: PluginDetailPanelProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity',
          plugin ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-250',
          plugin ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ zIndex: 1150 }}
      >
        {plugin && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h3 className="font-semibold text-navy dark:text-white">{plugin.name}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <PluginVersionBadge version={plugin.version} />
                  <PluginTriggerBadge trigger={plugin.trigger} />
                </div>
              </div>
              <button className="btn-icon btn-ghost" onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant={plugin.enabled ? 'success' : 'ghost'} dot>
                  {plugin.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="space-y-4">
                <Field label="Plugin ID"  value={plugin.id}        mono copyable />
                <Field label="Name"       value={plugin.name} />
                <Field label="Version"    value={plugin.version} />
                <Field label="Tenant ID"  value={plugin.tenant_id} mono copyable />
                <Field label="Created"    value={formatDateTime(plugin.created_at)} />
              </div>

              {plugin.sha256 && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="label">SHA256 Checksum</p>
                  <div className="text-xs font-code bg-gray-50 dark:bg-gray-800 rounded-lg px-3 py-2 text-gray-700 dark:text-gray-300 break-all flex items-start gap-1">
                    <span className="flex-1">{plugin.sha256}</span>
                    <CopyButton value={plugin.sha256} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
