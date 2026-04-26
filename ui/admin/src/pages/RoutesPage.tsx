import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { routes, upstreams, tenants, type Route, type CreateRouteBody } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

function CreateRouteDialog({
  tenantId,
  onClose,
}: {
  tenantId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [method, setMethod] = useState('*')
  const [pathPrefix, setPathPrefix] = useState('/')
  const [host, setHost] = useState('')
  const [upstreamId, setUpstreamId] = useState('')

  const { data: upstreamList } = useQuery({
    queryKey: ['upstreams', tenantId],
    queryFn: () => upstreams.list(tenantId),
  })

  const mutation = useMutation({
    mutationFn: (body: CreateRouteBody) => routes.create(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['routes', tenantId] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ method, path_prefix: pathPrefix, host, upstream_id: upstreamId })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="font-heading text-lg font-bold text-navy mb-4">New Route</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="w-28">
              <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {['*', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Path Prefix</label>
              <input
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
                value={pathPrefix}
                onChange={(e) => setPathPrefix(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Host <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="api.example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upstream</label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              value={upstreamId}
              onChange={(e) => setUpstreamId(e.target.value)}
              required
            >
              <option value="">Select upstream...</option>
              {upstreamList?.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          {mutation.isError && (
            <p className="text-sm text-red-600">{String(mutation.error)}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function RoutesPage() {
  const qc = useQueryClient()
  const [selectedTenant, setSelectedTenant] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: tenantList } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenants.list(),
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['routes', selectedTenant],
    queryFn: () => routes.list(selectedTenant),
    enabled: !!selectedTenant,
  })

  const deleteMutation = useMutation({
    mutationFn: (r: Route) => routes.delete(r.tenant_id, r.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routes', selectedTenant] }),
  })

  const handleDelete = (r: Route) => {
    if (confirm(`Delete route "${r.method} ${r.path_prefix}"?`)) deleteMutation.mutate(r)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">Routes</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage traffic routes per tenant.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!selectedTenant}>
          <Plus size={16} />
          New Route
        </Button>
      </div>

      <div className="mb-4">
        <select
          className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
          value={selectedTenant}
          onChange={(e) => setSelectedTenant(e.target.value)}
        >
          <option value="">Select tenant...</option>
          {tenantList?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.slug})
            </option>
          ))}
        </select>
      </div>

      {!selectedTenant && (
        <p className="text-gray-400 text-sm">Select a tenant to view its routes.</p>
      )}
      {selectedTenant && isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      {selectedTenant && isError && (
        <p className="text-red-600 text-sm">Failed to load routes.</p>
      )}

      {data && (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead>Path Prefix</TableHead>
                <TableHead>Host</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                    No routes for this tenant.
                  </TableCell>
                </TableRow>
              )}
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant="outline">{r.method}</Badge>
                  </TableCell>
                  <TableCell className="font-code text-xs">{r.path_prefix}</TableCell>
                  <TableCell className="text-gray-500 text-xs">{r.host || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={r.enabled ? 'success' : 'outline'}>
                      {r.enabled ? 'enabled' : 'disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDelete(r)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Delete ${r.path_prefix}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {showCreate && selectedTenant && (
        <CreateRouteDialog tenantId={selectedTenant} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
