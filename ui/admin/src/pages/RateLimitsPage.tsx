import { useMemo, useState } from 'react'
import { Plus, Shield } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { SearchBar, FilterSelect } from '@/components/ui/search-bar'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { AlgorithmBadge } from '@/components/rate-limits/algorithm-badge'
import { ScopeBadge } from '@/components/rate-limits/scope-badge'
import { RateLimitForm } from '@/components/rate-limits/rate-limit-form'
import { RateLimitRowActions } from '@/components/rate-limits/rate-limit-row-actions'
import { RateLimitDetailPanel } from '@/components/rate-limits/rate-limit-detail-panel'
import { RateLimitVisualizer } from '@/components/rate-limits/rate-limit-visualizer'
import { useRateLimits, useCreateRateLimit } from '@/hooks/use-rate-limits'
import { useTenants } from '@/hooks/use-tenants'
import { useToast } from '@/components/ui/toast'
import type { RateLimitPolicy } from '@/api/client'

const PAGE_SIZE = 10

export function RateLimitsPage() {
  const [selectedTenant, setSelectedTenant] = useState('')
  const [search, setSearch]     = useState('')
  const [scope, setScope]       = useState('all')
  const [algorithm, setAlgorithm] = useState('all')
  const [page, setPage]         = useState(1)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<RateLimitPolicy | null>(null)

  const { toast } = useToast()
  const { data: tenantList = [] } = useTenants()
  const { data = [], isLoading, isError } = useRateLimits(selectedTenant)

  const createMut = useCreateRateLimit(selectedTenant, () => {
    toast({ title: 'Rate limit policy created', variant: 'success' })
    setCreating(false)
  })

  const filtered = useMemo(() => {
    let list = data
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    if (scope !== 'all')     list = list.filter(p => p.scope === scope)
    if (algorithm !== 'all') list = list.filter(p => p.algorithm === algorithm)
    return list
  }, [data, search, scope, algorithm])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<RateLimitPolicy>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: p => (
        <button
          className="text-left hover:text-gold transition-colors font-medium text-navy dark:text-white text-sm"
          onClick={() => setSelected(p)}
        >
          {p.name}
        </button>
      ),
    },
    {
      key: 'scope',
      header: 'Scope',
      width: '120px',
      cell: p => <ScopeBadge scope={p.scope} />,
    },
    {
      key: 'algorithm',
      header: 'Algorithm',
      width: '160px',
      cell: p => <AlgorithmBadge algorithm={p.algorithm} />,
    },
    {
      key: 'limit',
      header: 'Limit',
      cell: p => <RateLimitVisualizer policy={p} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      cell: p => <Badge variant={p.enabled ? 'success' : 'ghost'} dot>{p.enabled ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      align: 'right',
      cell: p => <RateLimitRowActions policy={p} />,
    },
  ]

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="Rate Limits"
        subtitle="Define request rate limiting policies per tenant."
        action={
          <button
            className="btn-primary"
            onClick={() => setCreating(true)}
            disabled={!selectedTenant}
            title={!selectedTenant ? 'Select a tenant first' : undefined}
          >
            <Plus size={15} /> New Policy
          </button>
        }
      />

      {/* Tenant selector */}
      <div className="mb-6">
        <label className="label" htmlFor="rl-tenant-select">Tenant</label>
        <select
          id="rl-tenant-select"
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
          <Shield size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a tenant to view its rate limit policies.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <SearchBar
              value={search}
              onChange={v => { setSearch(v); setPage(1) }}
              placeholder="Search policies…"
              className="w-64"
            />
            <FilterSelect
              label="Scope"
              value={scope}
              onChange={v => { setScope(v); setPage(1) }}
              options={[
                { label: 'All Scopes', value: 'all'      },
                { label: 'Tenant',     value: 'tenant'   },
                { label: 'Consumer',   value: 'consumer' },
                { label: 'Route',      value: 'route'    },
                { label: 'IP',         value: 'ip'       },
              ]}
            />
            <FilterSelect
              label="Algorithm"
              value={algorithm}
              onChange={v => { setAlgorithm(v); setPage(1) }}
              options={[
                { label: 'All Algorithms',  value: 'all'             },
                { label: 'Token Bucket',    value: 'token_bucket'    },
                { label: 'Sliding Window',  value: 'sliding_window'  },
                { label: 'Fixed Window',    value: 'fixed_window'    },
              ]}
            />
          </div>

          {isError && (
            <div className="card p-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Failed to load rate limit policies.</p>
            </div>
          )}

          <DataTable
            columns={columns}
            data={paginated}
            keyFn={p => p.id}
            loading={isLoading}
            emptyTitle="No rate limit policies"
            emptyDescription={!search && scope === 'all' && algorithm === 'all' ? 'Create a policy to start limiting requests.' : undefined}
            emptyAction={
              !search && scope === 'all' && algorithm === 'all'
                ? <button className="btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={13} /> New Policy</button>
                : undefined
            }
          />

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="New Rate Limit Policy" description="Configure a request rate limiting policy." size="lg">
        <RateLimitForm
          onSubmit={body => createMut.mutateAsync(body)}
          onCancel={() => setCreating(false)}
          submitLabel="Create Policy"
        />
      </Modal>

      <RateLimitDetailPanel policy={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
