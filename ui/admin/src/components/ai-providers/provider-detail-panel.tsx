import { X, Copy, CheckCheck } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ProviderLogo } from './provider-logo'
import { ProviderConfigSummary } from './provider-config-summary'
import { formatDateTime } from '@/lib/date-utils'
import { cn } from '@/lib/utils'
import type { AiProvider } from '@/api/client'

interface ProviderDetailPanelProps {
  provider: AiProvider | null
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

export function ProviderDetailPanel({ provider, onClose }: ProviderDetailPanelProps) {
  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity',
          provider ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
        style={{ zIndex: 1100 }}
        onClick={onClose}
      />

      <div
        className={cn(
          'fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-250',
          provider ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ zIndex: 1150 }}
      >
        {provider && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <ProviderLogo slug={provider.slug} size="sm" />
                <div>
                  <h3 className="font-semibold text-navy dark:text-white">{provider.name}</h3>
                  <p className="text-xs text-gray-500 font-code mt-0.5">{provider.slug}</p>
                </div>
              </div>
              <button className="btn-icon btn-ghost" onClick={onClose}>
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Badge variant={provider.enabled ? 'success' : 'ghost'} dot>
                  {provider.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>

              <div className="space-y-4">
                <Field label="Provider ID" value={provider.id}        mono copyable />
                <Field label="Name"        value={provider.name} />
                <Field label="Slug"        value={provider.slug}      mono />
                <Field label="Tenant ID"   value={provider.tenant_id} mono copyable />
                <Field label="Created"     value={formatDateTime(provider.created_at)} />
                <Field label="Updated"     value={formatDateTime(provider.updated_at)} />
              </div>

              <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                <p className="label mb-2">Configuration</p>
                <ProviderConfigSummary provider={provider} />
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
