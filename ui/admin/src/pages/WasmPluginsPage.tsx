import { useMemo, useState } from 'react'
import { Plus, Puzzle } from 'lucide-react'
import { PageHeader } from '@/components/ui/empty-state'
import { DataTable, type Column } from '@/components/ui/data-table'
import { SearchBar, FilterSelect } from '@/components/ui/search-bar'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Pagination } from '@/components/ui/pagination'
import { PluginForm } from '@/components/wasm/plugin-form'
import { PluginRowActions } from '@/components/wasm/plugin-row-actions'
import { PluginDetailPanel } from '@/components/wasm/plugin-detail-panel'
import { PluginTriggerBadge } from '@/components/wasm/plugin-trigger-badge'
import { PluginVersionBadge } from '@/components/wasm/plugin-version-badge'
import { PluginShaDisplay } from '@/components/wasm/plugin-sha-display'
import { useWasmPlugins, useCreateWasmPlugin } from '@/hooks/use-wasm-plugins'
import { useTenants } from '@/hooks/use-tenants'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/date-utils'
import type { WasmPlugin } from '@/api/client'

const PAGE_SIZE = 10

export function WasmPluginsPage() {
  const [selectedTenant, setSelectedTenant] = useState('')
  const [search, setSearch]     = useState('')
  const [trigger, setTrigger]   = useState('all')
  const [page, setPage]         = useState(1)
  const [creating, setCreating] = useState(false)
  const [selected, setSelected] = useState<WasmPlugin | null>(null)

  const { toast } = useToast()
  const { data: tenantList = [] } = useTenants()
  const { data = [], isLoading, isError } = useWasmPlugins(selectedTenant)

  const createMut = useCreateWasmPlugin(selectedTenant, () => {
    toast({ title: 'WASM plugin added', variant: 'success' })
    setCreating(false)
  })

  const filtered = useMemo(() => {
    let list = data
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
    if (trigger !== 'all') list = list.filter(p => p.trigger === trigger)
    return list
  }, [data, search, trigger])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns: Column<WasmPlugin>[] = [
    {
      key: 'name',
      header: 'Plugin',
      cell: p => (
        <button
          className="flex items-center gap-2 text-left hover:text-gold transition-colors"
          onClick={() => setSelected(p)}
        >
          <div className="w-7 h-7 rounded-md bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <Puzzle size={13} className="text-purple-500" />
          </div>
          <div>
            <p className="font-medium text-navy dark:text-white text-sm">{p.name}</p>
            <PluginVersionBadge version={p.version} />
          </div>
        </button>
      ),
    },
    {
      key: 'trigger',
      header: 'Trigger',
      width: '140px',
      cell: p => <PluginTriggerBadge trigger={p.trigger} />,
    },
    {
      key: 'sha256',
      header: 'SHA256',
      cell: p => <PluginShaDisplay sha256={p.sha256} />,
    },
    {
      key: 'status',
      header: 'Status',
      width: '100px',
      cell: p => <Badge variant={p.enabled ? 'success' : 'ghost'} dot>{p.enabled ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'created',
      header: 'Created',
      width: '120px',
      cell: p => <span className="text-xs text-gray-500">{formatDate(p.created_at)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      align: 'right',
      cell: p => <PluginRowActions plugin={p} />,
    },
  ]

  return (
    <div className="p-8 max-w-[1200px] mx-auto animate-fade-in">
      <PageHeader
        title="WASM Plugins"
        subtitle="Manage WebAssembly plugins for request/response processing."
        action={
          <button
            className="btn-primary"
            onClick={() => setCreating(true)}
            disabled={!selectedTenant}
            title={!selectedTenant ? 'Select a tenant first' : undefined}
          >
            <Plus size={15} /> Add Plugin
          </button>
        }
      />

      {/* Tenant selector */}
      <div className="mb-6">
        <label className="label" htmlFor="wasm-tenant-select">Tenant</label>
        <select
          id="wasm-tenant-select"
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
          <Puzzle size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a tenant to view its WASM plugins.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-4">
            <SearchBar
              value={search}
              onChange={v => { setSearch(v); setPage(1) }}
              placeholder="Search plugins…"
              className="w-64"
            />
            <FilterSelect
              label="Trigger"
              value={trigger}
              onChange={v => { setTrigger(v); setPage(1) }}
              options={[
                { label: 'All Triggers',  value: 'all'         },
                { label: 'On Request',    value: 'on_request'  },
                { label: 'On Response',   value: 'on_response' },
                { label: 'Both',          value: 'both'        },
              ]}
            />
          </div>

          {isError && (
            <div className="card p-4 border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800 mb-4">
              <p className="text-sm text-red-600 dark:text-red-400">Failed to load WASM plugins.</p>
            </div>
          )}

          <DataTable
            columns={columns}
            data={paginated}
            keyFn={p => p.id}
            loading={isLoading}
            emptyTitle="No WASM plugins"
            emptyDescription={!search && trigger === 'all' ? 'Add your first WASM plugin to extend gateway behavior.' : undefined}
            emptyAction={
              !search && trigger === 'all'
                ? <button className="btn-primary btn-sm" onClick={() => setCreating(true)}><Plus size={13} /> Add Plugin</button>
                : undefined
            }
          />

          <Pagination page={page} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
        </>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Add WASM Plugin" description="Upload a WebAssembly plugin for this tenant." size="md">
        <PluginForm
          onSubmit={body => createMut.mutateAsync(body)}
          onCancel={() => setCreating(false)}
          submitLabel="Add Plugin"
        />
      </Modal>

      <PluginDetailPanel plugin={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
