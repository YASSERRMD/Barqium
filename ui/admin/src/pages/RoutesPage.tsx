import { useMemo, useState } from 'react'
import { Plus, GitBranch } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { SearchBar, FilterSelect } from '@/components/ui/search-bar'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { RouteForm } from '@/components/routes/route-form'
import { RouteRowActions } from '@/components/routes/route-row-actions'
import { RouteDetailPanel } from '@/components/routes/route-detail-panel'
import { RouteStatsBar } from '@/components/routes/route-stats-bar'
import { MethodBadge } from '@/components/routes/method-badge'
import { RoutePathDisplay } from '@/components/routes/route-path-display'
import { useRoutes, useCreateRoute, useUpdateRoute } from '@/hooks/use-routes'
import { useTenants } from '@/hooks/use-tenants'
import { useUpstreams } from '@/hooks/use-upstreams'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/date-utils'
import type { Route } from '@/api/client'

const PAGE_SIZE = 10
const METHOD_OPTIONS = [
  { label: 'All Methods', value: 'all' },
  { label: 'ANY / *',     value: 'any' },
  { label: 'GET',         value: 'GET' },
  { label: 'POST',        value: 'POST' },
  { label: 'PUT',         value: 'PUT' },
  { label: 'DELETE',      value: 'DELETE' },
  { label: 'PATCH',       value: 'PATCH' },
]

export function RoutesPage() {
  const [selectedTenant, setSelectedTenant] = useState('')
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('all')
  const [method, setMethod]     = useState('all')
  const [page, setPage]         = useState(1)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing]   = useState<Route | null>(null)
  const [selected, setSelected] = useState<Route | null>(null)

  const { toast } = useToast()
  const { data: tenantList = [] } = useTenants()
  const { data = [], isLoading, isError } = useRoutes(selectedTenant)
  const { data: upstreamList = [] } = useUpstreams(selectedTenant)

  const upstreamMap = useMemo(
    () => Object.fromEntries(upstreamList.map(u => [u.id, u.name])),
    [upstreamList],
  )

  const createMut = useCreateRoute(selectedTenant, () => {
    toast({ title: 'Route created', variant: 'success' })
    setCreating(false)
  })
  const editMut = useUpdateRoute(selectedTenant, editing?.id ?? '', () => {
    toast({ title: 'Route updated', variant: 'success' })
    setEditing(null)
  })

  const filtered = useMemo(() => {
    let list = data
    if (search) list = list.filter(r =>
      r.path_prefix.toLowerCase().includes(search.toLowerCase()) ||
      r.host?.toLowerCase().includes(search.toLowerCase()),
    )
    if (status === 'active')   list = list.filter(r => r.enabled)
    if (status === 'inactive') list = list.filter(r => !r.enabled)
    if (method !== 'all') {
      list = list.filter(r => {
        const m = (r.method === '*' || !r.method) ? 'any' : r.method.toUpperCase()
        return method === 'any' ? m === 'any' : m === method.toUpperCase()
      })
    }
    return list
  }, [data, search, status, method])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Route>[] = [
    {
      key: 'route',
      header: 'Route',
      cell: r => (
        <button
          className="flex items-center gap-2 text-left hover:text-gold transition-colors"
          onClick={() => setSelected(r)}
        >
          <MethodBadge method={r.method} />
          <RoutePathDisplay pathPrefix={r.path_prefix} host={r.host} />
        </button>
      ),
    },
    {
      key: 'upstream',
      header: 'Upstream',
      cell: r => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {upstreamMap[r.upstream_id] ?? <span className="text-gray-300 italic">unknown</span>}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      cell: r => <Badge variant={r.enabled ? 'success' : 'ghost'} dot>{r.enabled ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'created',
      header: 'Created',
      width: '120px',
      cell: r => <span className="text-xs text-gray-500">{formatDate(r.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      cell: r => <RouteRowActions route={r} onEdit={() => setEditing(r)} />,
    },
  ]

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="Routes"
        subtitle="Define routing rules that map traffic to upstream services."
        action={
          <button
            className="btn-primary"
            onClick={() => setCreating(true)}
            disabled={!selectedTenant}
            title={!selectedTenant ? 'Select a tenant first' : undefined}
          >
            <Plus size={15} /> New Route
          </button>
        }
      />

      {/* Tenant selector */}
      <div className="mb-6">
        <label className="label" htmlFor="route-tenant-select">Tenant</label>
        <select
          id="route-tenant-select"
          className="input max-w-xs"
          value={selectedTenant}
          onChange={e => { setSelectedTenant(e.target.value); setPage(1); setSearch(''); setStatus('all'); setMethod('all') }}
        >
          <option value="">Select a tenant…</option>
          {tenantList.map(t => (
            <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
          ))}
        </select>
      </div>

      {!selectedTenant ? (
        <div className="card p-8 text-center text-gray-400">
          <GitBranch size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a tenant to view its routes.</p>
        </div>
      ) : (
        <>
          {data.length > 0 && (
            <div className="mb-6">
              <RouteStatsBar routes={data} />
            </div>
          )}

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <SearchBar
              value={search}
              onChange={v => { setSearch(v); setPage(1) }}
              placeholder="Search path or host…"
              className="w-64"
            />
            <FilterSelect
              label="Method"
              value={method}
              onChange={v => { setMethod(v); setPage(1) }}
              options={METHOD_OPTIONS}
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
              <p className="text-sm text-red-600 dark:text-red-400">Failed to load routes. Is the control API running?</p>
            </div>
          )}

          <DataTable
            columns={columns}
            data={paginated}
            keyFn={r => r.id}
            loading={isLoading}
            emptyTitle={search || status !== 'all' || method !== 'all' ? 'No routes match your filters' : 'No routes yet'}
            emptyDescription={!search && status === 'all' && method === 'all' ? 'Create your first route to start routing traffic.' : undefined}
            emptyAction={
              !search && status === 'all' && method === 'all'
                ? <button className="btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={13} /> New Route</button>
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

      <Modal open={creating} onClose={() => setCreating(false)} title="New Route" description="Add a routing rule for this tenant." size="md">
        <RouteForm
          tenantId={selectedTenant}
          onSubmit={body => createMut.mutateAsync(body)}
          onCancel={() => setCreating(false)}
          submitLabel="Create Route"
        />
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Route" size="md">
        {editing && (
          <RouteForm
            tenantId={selectedTenant}
            initial={editing}
            onSubmit={body => editMut.mutateAsync(body)}
            onCancel={() => setEditing(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      <RouteDetailPanel
        route={selected}
        onClose={() => setSelected(null)}
        upstreamName={selected ? upstreamMap[selected.upstream_id] : undefined}
      />
    </div>
  )
}
