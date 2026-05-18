import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ApiKeyDisplay } from './api-key-display'
import { formatDateTime, formatDistanceToNow } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { Consumer } from '@/api/client'

interface ConsumerDetailPanelProps {
  consumer: Consumer | null
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

export function ConsumerDetailPanel({ consumer, onClose }: ConsumerDetailPanelProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity',
          consumer ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-250',
          consumer ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ zIndex: 1150 }}
      >
        {consumer && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy/8 dark:bg-white/8 flex items-center justify-center font-bold text-sm text-navy dark:text-gold">
                  {consumer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-navy dark:text-white">{consumer.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Created {formatDistanceToNow(consumer.created_at)} ago
                  </p>
                </div>
              </div>
              <button className="btn-icon btn-ghost" onClick={onClose} aria-label="Close panel">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant={consumer.enabled ? 'success' : 'ghost'} dot>
                  {consumer.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="space-y-4">
                <Field label="Consumer ID" value={consumer.id}        mono />
                <Field label="Name"        value={consumer.name} />
                <Field label="Tenant ID"   value={consumer.tenant_id} mono />
                <Field label="Created"     value={formatDateTime(consumer.created_at)} />
              </div>

              {consumer.api_key_prefix && (
                <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                  <p className="label mb-2">API Key</p>
                  <ApiKeyDisplay prefix={consumer.api_key_prefix} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
