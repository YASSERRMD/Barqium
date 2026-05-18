import { useMemo, useState } from 'react'
import { Plus, Building2 } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { SearchBar, FilterSelect } from '@/components/ui/search-bar'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { TenantForm } from '@/components/tenants/tenant-form'
import { TenantRowActions } from '@/components/tenants/tenant-row-actions'
import { TenantDetailPanel } from '@/components/tenants/tenant-detail-panel'
import { TenantStatsBar } from '@/components/tenants/tenant-stats-bar'
import { useTenants, useCreateTenant, useUpdateTenant } from '@/hooks/use-tenants'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/date-utils'
import type { Tenant } from '@/api/client'

const PAGE_SIZE = 10

export function TenantsPage() {
  const [search, setSearch]     = useState('')
  const [status, setStatus]     = useState('all')
  const [page, setPage]         = useState(1)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing]   = useState<Tenant | null>(null)
  const [selected, setSelected] = useState<Tenant | null>(null)

  const { toast } = useToast()
  const { data = [], isLoading, isError } = useTenants()

  const createMut = useCreateTenant(() => { toast({ title: 'Tenant created', variant: 'success' }); setCreating(false) })
  const editMut   = useUpdateTenant(editing?.id ?? '', () => { toast({ title: 'Tenant updated', variant: 'success' }); setEditing(null) })

  const filtered = useMemo(() => {
    let list = data
    if (search) list = list.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase()))
    if (status === 'active')   list = list.filter(t => t.enabled)
    if (status === 'inactive') list = list.filter(t => !t.enabled)
    return list
  }, [data, search, status])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: t => (
        <button
          className="flex items-center gap-2 text-left hover:text-gold transition-colors"
          onClick={() => setSelected(t)}
        >
          <div className="w-7 h-7 rounded-md bg-navy/8 dark:bg-white/8 flex items-center justify-center flex-shrink-0">
            <Building2 size={13} className="text-navy dark:text-gold" />
          </div>
          <div>
            <p className="font-medium text-navy dark:text-white text-sm">{t.name}</p>
            <p className="text-xs text-gray-400 font-code">{t.slug}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      cell: t => <Badge variant={t.enabled ? 'success' : 'ghost'} dot>{t.enabled ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'created',
      header: 'Created',
      width: '120px',
      cell: t => <span className="text-xs text-gray-500">{formatDate(t.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '100px',
      align: 'right',
      cell: t => <TenantRowActions tenant={t} onEdit={() => setEditing(t)} />,
    },
  ]

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="Tenants"
        subtitle="Manage gateway tenants and their configuration."
        action={
          <button className="btn-primary" onClick={() => setCreating(true)}>
            <Plus size={15} /> New Tenant
          </button>
        }
      />

      {/* Stats */}
      {data.length > 0 && (
        <div className="mb-6">
          <TenantStatsBar tenants={data} />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={v => { setSearch(v); setPage(1) }}
          placeholder="Search tenants…"
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
          <p className="text-sm text-red-600 dark:text-red-400">Failed to load tenants. Is the control API running?</p>
        </div>
      )}

      <DataTable
        columns={columns}
        data={paginated}
        keyFn={t => t.id}
        loading={isLoading}
        emptyTitle={search || status !== 'all' ? 'No tenants match your filters' : 'No tenants yet'}
        emptyDescription={!search && status === 'all' ? 'Create your first tenant to get started.' : undefined}
        emptyAction={
          !search && status === 'all'
            ? <button className="btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={13} /> New Tenant</button>
            : undefined
        }
      />

      <Pagination
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
      />

      {/* Create modal */}
      <Modal open={creating} onClose={() => setCreating(false)} title="New Tenant" description="Add a new tenant to the gateway." size="md">
        <TenantForm
          onSubmit={body => createMut.mutateAsync(body)}
          onCancel={() => setCreating(false)}
          submitLabel="Create Tenant"
        />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Tenant" size="md">
        {editing && (
          <TenantForm
            initial={editing}
            onSubmit={body => editMut.mutateAsync(body)}
            onCancel={() => setEditing(null)}
            submitLabel="Save Changes"
          />
        )}
      </Modal>

      {/* Detail panel */}
      <TenantDetailPanel tenant={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
