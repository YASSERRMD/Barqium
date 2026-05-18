import { useState } from 'react'
import { Plus, Cpu } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import { ProviderLogo } from '@/components/ai-providers/provider-logo'
import { ProviderForm } from '@/components/ai-providers/provider-form'
import { ProviderRowActions } from '@/components/ai-providers/provider-row-actions'
import { ProviderDetailPanel } from '@/components/ai-providers/provider-detail-panel'
import { ProviderConfigSummary } from '@/components/ai-providers/provider-config-summary'
import { useAiProviders, useCreateAiProvider } from '@/hooks/use-ai-providers'
import { useTenants } from '@/hooks/use-tenants'
import { useToast } from '@/components/ui/toast'
import type { AiProvider } from '@/api/client'

export function AIProvidersPage() {
  const [selectedTenant, setSelectedTenant] = useState('')
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<AiProvider | null>(null)

  const { toast } = useToast()
  const { data: tenantList = [] } = useTenants()
  const { data = [], isLoading, isError } = useAiProviders(selectedTenant)

  const createMut = useCreateAiProvider(selectedTenant, () => {
    toast({ title: 'AI Provider added', variant: 'success' })
    setCreating(false)
  })

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="AI Providers"
        subtitle="Configure AI model providers and their API connections."
        action={
          <button
            className="btn-primary"
            onClick={() => setCreating(true)}
            disabled={!selectedTenant}
            title={!selectedTenant ? 'Select a tenant first' : undefined}
          >
            <Plus size={15} /> Add Provider
          </button>
        }
      />

      {/* Tenant selector */}
      <div className="mb-8">
        <label className="label" htmlFor="ai-tenant-select">Tenant</label>
        <select
          id="ai-tenant-select"
          className="input max-w-xs"
          value={selectedTenant}
          onChange={e => { setSelectedTenant(e.target.value) }}
        >
          <option value="">Select a tenant…</option>
          {tenantList.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
          ))}
        </select>
      </div>

      {!selectedTenant ? (
        <div className="card p-8 text-center text-gray-400">
          <Cpu size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a tenant to view its AI providers.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="md" />
        </div>
      ) : isError ? (
        <div className="card p-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load AI providers. Is the control API running?</p>
        </div>
      ) : data.length === 0 ? (
        <div className="card p-12 text-center">
          <Cpu size={40} className="mx-auto mb-4 text-gray-300" />
          <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1">No AI providers yet</p>
          <p className="text-sm text-gray-400 mb-5">Add your first AI provider to start routing model requests.</p>
          <button className="btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={13} /> Add Provider
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map(provider => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onClick={() => setSelected(provider)}
            />
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="Add AI Provider" description="Connect an AI model provider to this tenant." size="md">
        <ProviderForm
          onSubmit={body => createMut.mutateAsync(body)}
          onCancel={() => setCreating(false)}
          submitLabel="Add Provider"
        />
      </Modal>

      {/* Detail panel */}
      <ProviderDetailPanel provider={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

interface ProviderCardProps {
  provider: AiProvider
  onClick: () => void
}

function ProviderCard({ provider, onClick }: ProviderCardProps) {
  return (
    <div
      className="card p-5 hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <ProviderLogo slug={provider.slug} size="md" />
          <div>
            <p className="font-semibold text-navy dark:text-white text-sm leading-tight">{provider.name}</p>
            <p className="text-xs text-gray-400 font-code mt-0.5">{provider.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
          <ProviderRowActions provider={provider} />
        </div>
      </div>

      <div className="mb-4">
        <ProviderConfigSummary provider={provider} />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
        <Badge variant={provider.enabled ? 'success' : 'ghost'} dot>
          {provider.enabled ? 'Active' : 'Inactive'}
        </Badge>
        <ProviderHealthIndicator enabled={provider.enabled} />
      </div>
    </div>
  )
}

function ProviderHealthIndicator({ enabled }: { enabled: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-400 animate-pulse' : 'bg-gray-300'}`}
      />
      <span className="text-xs text-gray-400">{enabled ? 'Online' : 'Offline'}</span>
    </div>
  )
}
