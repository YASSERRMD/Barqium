import { useMemo, useState } from 'react'
import { Plus, Users } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { SearchBar, FilterSelect } from '@/components/ui/search-bar'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { ConsumerForm } from '@/components/consumers/consumer-form'
import { ConsumerRowActions } from '@/components/consumers/consumer-row-actions'
import { ConsumerDetailPanel } from '@/components/consumers/consumer-detail-panel'
import { ConsumerStatsBar } from '@/components/consumers/consumer-stats-bar'
import { ApiKeyDisplay } from '@/components/consumers/api-key-display'
import { ApiKeyGenerateModal } from '@/components/consumers/api-key-generate-modal'
import { useConsumers, useCreateConsumer } from '@/hooks/use-consumers'
import { useTenants } from '@/hooks/use-tenants'
import { useToast } from '@/components/ui/toast'
import { formatDistanceToNow } from '@/lib/date-utils'
import type { Consumer } from '@/api/client'

const PAGE_SIZE = 10

export function ConsumersPage() {
  const [selectedTenant, setSelectedTenant] = useState('')
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('all')
  const [page, setPage]         = useState(1)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<Consumer | null>(null)
  const [generatingKeyFor, setGeneratingKeyFor] = useState<Consumer | null>(null)

  const { toast } = useToast()
  const { data: tenantList = [] } = useTenants()
  const { data = [], isLoading, isError } = useConsumers(selectedTenant)

  const createMut = useCreateConsumer(selectedTenant, () => {
    toast({ title: 'Consumer created', variant: 'success' })
    setCreating(false)
  })

  const filtered = useMemo(() => {
    let list = data
    if (search) list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    if (status === 'active')   list = list.filter(c => c.enabled)
    if (status === 'inactive') list = list.filter(c => !c.enabled)
    return list
  }, [data, search, status])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Consumer>[] = [
    {
      key: 'name',
      header: 'Consumer',
      cell: c => (
        <button
          className="flex items-center gap-2 text-left hover:text-gold transition-colors"
          onClick={() => setSelected(c)}
        >
          <div className="w-7 h-7 rounded-full bg-navy/8 dark:bg-white/8 flex items-center justify-center font-bold text-xs text-navy dark:text-gold flex-shrink-0">
            {c.name.charAt(0).toUpperCase()}
          </div>
          <p className="font-medium text-navy dark:text-white text-sm">{c.name}</p>
        </button>
      ),
    },
    {
      key: 'api_key',
      header: 'API Key',
      cell: c => <ApiKeyDisplay prefix={c.api_key_prefix} />,
    },
    {
      key: 'created',
      header: 'Created',
      width: '140px',
      cell: c => (
        <span className="text-xs text-gray-500" title={c.created_at}>
          {formatDistanceToNow(c.created_at)} ago
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      cell: c => <Badge variant={c.enabled ? 'success' : 'ghost'} dot>{c.enabled ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'right',
      cell: c => (
        <ConsumerRowActions
          consumer={c}
          onGenerateKey={() => setGeneratingKeyFor(c)}
        />
      ),
    },
  ]

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="Consumers"
        subtitle="Manage API consumers and their authentication credentials."
        action={
          <button
            className="btn-primary"
            onClick={() => setCreating(true)}
            disabled={!selectedTenant}
            title={!selectedTenant ? 'Select a tenant first' : undefined}
          >
            <Plus size={15} /> New Consumer
          </button>
        }
      />

      {/* Tenant selector */}
      <div className="mb-6">
        <label className="label" htmlFor="consumer-tenant-select">Tenant</label>
        <select
          id="consumer-tenant-select"
          className="input max-w-xs"
          value={selectedTenant}
          onChange={e => { setSelectedTenant(e.target.value); setPage(1) }}
        >
          <option value="">Select a tenant…</option>
          {tenantList.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
          ))}
        </select>
      </div>

      {!selectedTenant ? (
        <div className="card p-8 text-center text-gray-400">
          <Users size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a tenant to view its consumers.</p>
        </div>
      ) : (
        <>
          {data.length > 0 && (
            <div className="mb-6">
              <ConsumerStatsBar consumers={data} />
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <SearchBar
              value={search}
              onChange={v => { setSearch(v); setPage(1) }}
              placeholder="Search consumers…"
              className="w-64"
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={v => { setStatus(v); setPage(1) }}
              options={[
                { label: 'All',      value: 'all'      },
                { label: 'Active',   value: 'active'   },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </div>

          {isError && (
            <div className="card p-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Failed to load consumers.</p>
            </div>
          )}

          <DataTable
            columns={columns}
            data={paginated}
            keyFn={c => c.id}
            loading={isLoading}
            emptyTitle="No consumers yet"
            emptyDescription={!search && status === 'all' ? 'Create a consumer to issue API keys.' : undefined}
            emptyAction={
              !search && status === 'all'
                ? <button className="btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={13} /> New Consumer</button>
                : undefined
            }
          />

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New Consumer" description="Create a consumer to issue API credentials." size="md">
        <ConsumerForm
          onSubmit={body => createMut.mutateAsync(body)}
          onCancel={() => setCreating(false)}
          submitLabel="Create Consumer"
        />
      </Modal>

      <ConsumerDetailPanel consumer={selected} onClose={() => setSelected(null)} />

      {generatingKeyFor && (
        <ApiKeyGenerateModal
          consumer={generatingKeyFor}
          onClose={() => setGeneratingKeyFor(null)}
        />
      )}
    </div>
  )
}
