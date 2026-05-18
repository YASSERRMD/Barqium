import { useMemo, useState } from 'react'
import { Plus, Server } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { SearchBar, FilterSelect } from '@/components/ui/search-bar'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { UpstreamForm } from '@/components/upstreams/upstream-form'
import { UpstreamRowActions } from '@/components/upstreams/upstream-row-actions'
import { UpstreamDetailPanel } from '@/components/upstreams/upstream-detail-panel'
import { UpstreamStatsBar } from '@/components/upstreams/upstream-stats-bar'
import { UpstreamHealthBadge } from '@/components/upstreams/upstream-health-badge'
import { UpstreamUrlDisplay } from '@/components/upstreams/upstream-url-display'
import { TimeoutBadge } from '@/components/upstreams/timeout-badge'
import { useUpstreams, useCreateUpstream, useUpdateUpstream } from '@/hooks/use-upstreams'
import { useTenants } from '@/hooks/use-tenants'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/date-utils'
import type { Upstream } from '@/api/client'

const PAGE_SIZE = 10

export function UpstreamsPage() {
  const [selectedTenant, setSelectedTenant] = useState('')
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('all')
  const [page, setPage]         = useState(1)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing]   = useState<Upstream | null>(null)
  const [selected, setSelected] = useState<Upstream | null>(null)

  const { toast } = useToast()
  const { data: tenantList = [] } = useTenants()
  const { data = [], isLoading, isError } = useUpstreams(selectedTenant)

  const createMut = useCreateUpstream(selectedTenant, () => {
    toast({ title: 'Upstream created', variant: 'success' })
    setCreating(false)
  })
  const editMut = useUpdateUpstream(selectedTenant, editing?.id ?? '', () => {
    toast({ title: 'Upstream updated', variant: 'success' })
    setEditing(null)
  })

  const filtered = useMemo(() => {
    let list = data
    if (search) list = list.filter(u =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.base_url.toLowerCase().includes(search.toLowerCase()),
    )
    if (status === 'active')   list = list.filter(u => u.enabled)
    if (status === 'inactive') list = list.filter(u => !u.enabled)
    return list
  }, [data, search, status])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Upstream>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: u => (
        <button
          className="flex items-center gap-2 text-left hover:text-gold transition-colors"
          onClick={() => setSelected(u)}
        >
          <div className="w-7 h-7 rounded-md bg-navy/8 dark:bg-white/8 flex items-center justify-center flex-shrink-0">
            <Server size={13} className="text-navy dark:text-gold" />
          </div>
          <div>
            <p className="font-medium text-navy dark:text-white text-sm">{u.name}</p>
            <p className="text-xs text-gray-400 font-code">{u.id.slice(0, 8)}…</p>
          </div>
        </button>
      ),
    },
    {
      key: 'base_url',
      header: 'Base URL',
      cell: u => <UpstreamUrlDisplay url={u.base_url} />,
    },
    {
      key: 'timeout',
      header: 'Timeout',
      width: '110px',
      cell: u => <TimeoutBadge timeoutMs={u.timeout_ms} />,
    },
    {
      key: 'health',
      header: 'Health',
      width: '120px',
      cell: u => <UpstreamHealthBadge upstream={u} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      cell: u => <Badge variant={u.enabled ? 'success' : 'ghost'} dot>{u.enabled ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'created',
      header: 'Created',
      width: '120px',
      cell: u => <span className="text-xs text-gray-500">{formatDate(u.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      cell: u => <UpstreamRowActions upstream={u} onEdit={() => setEditing(u)} />,
    },
  ]

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="Upstreams"
        subtitle="Manage upstream services and backend targets per tenant."
        action={
          <button
            className="btn-primary"
            onClick={() => setCreating(true)}
            disabled={!selectedTenant}
            title={!selectedTenant ? 'Select a tenant first' : undefined}
          >
            <Plus size={15} /> New Upstream
          </button>
        }
      />

      {/* Tenant selector */}
      <div className="mb-6">
        <label className="label" htmlFor="tenant-select">Tenant</label>
        <select
          id="tenant-select"
          className="input max-w-xs"
          value={selectedTenant}
          onChange={e => { setSelectedTenant(e.target.value); setPage(1); setSearch(''); setStatus('all') }}
        >
          <option value="">Select a tenant…</option>
          {tenantList.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
          ))}
        </select>
      </div>

      {!selectedTenant ? (
        <div className="card p-8 text-center text-gray-400">
          <Server size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a tenant to view its upstreams.</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          {data.length > 0 && (
            <div className="mb-6">
              <UpstreamStatsBar upstreams={data} />
            </div>
          )}

          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <SearchBar
              value={search}
              onChange={v => { setSearch(v); setPage(1) }}
              placeholder="Search upstreams…"
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
              <p className="text-sm text-red-600 dark:text-red-400">Failed to load upstreams. Is the control API running?</p>
            </div>
          )}

          <DataTable
            columns={columns}
            data={paginated}
            keyFn={u => u.id}
            loading={isLoading}
            emptyTitle={search || status !== 'all' ? 'No upstreams match your filters' : 'No upstreams yet'}
            emptyDescription={!search && status === 'all' ? 'Add your first upstream to start routing traffic.' : undefined}
            emptyAction={
              !search && status === 'all'
                ? <button className="btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={13} /> New Upstream</button>
                : undefined
            }
          />

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="New Upstream" description="Add a new upstream service for this tenant." size="md">
        <UpstreamForm
          onSubmit={body => createMut.mutateAsync(body)}
          onCancel={() => setCreating(false)}
          submitLabel="Create Upstream"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Upstream" size="md">
        {editing && (
          <UpstreamForm
            initial={editing}
            onSubmit={body => editMut.mutateAsync(body)}
            onCancel={() => setEditing(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Detail panel */}
      <UpstreamDetailPanel upstream={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
