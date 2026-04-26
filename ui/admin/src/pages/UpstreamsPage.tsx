import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { upstreams, tenants, type Upstream, type CreateUpstreamBody } from '@/api/client'
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

function CreateUpstreamDialog({
  tenantId,
  onClose,
}: {
  tenantId: string
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [timeoutMs, setTimeoutMs] = useState('5000')

  const mutation = useMutation({
    mutationFn: (body: CreateUpstreamBody) => upstreams.create(tenantId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['upstreams', tenantId] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ name, base_url: baseUrl, timeout_ms: parseInt(timeoutMs, 10) })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="font-heading text-lg font-bold text-navy mb-4">New Upstream</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://backend:8000"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (ms)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(e.target.value)}
              min="100"
            />
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

export function UpstreamsPage() {
  const qc = useQueryClient()
  const [selectedTenant, setSelectedTenant] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data: tenantList } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenants.list(),
  })

  const { data, isLoading, isError } = useQuery({
    queryKey: ['upstreams', selectedTenant],
    queryFn: () => upstreams.list(selectedTenant),
    enabled: !!selectedTenant,
  })

  const deleteMutation = useMutation({
    mutationFn: (u: Upstream) => upstreams.delete(u.tenant_id, u.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['upstreams', selectedTenant] }),
  })

  const handleDelete = (u: Upstream) => {
    if (confirm(`Delete upstream "${u.name}"?`)) deleteMutation.mutate(u)
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">Upstreams</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage upstream services per tenant.</p>
        </div>
        <Button onClick={() => setShowCreate(true)} disabled={!selectedTenant}>
          <Plus size={16} />
          New Upstream
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
        <p className="text-gray-400 text-sm">Select a tenant to view its upstreams.</p>
      )}
      {selectedTenant && isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      {selectedTenant && isError && (
        <p className="text-red-600 text-sm">Failed to load upstreams.</p>
      )}

      {data && (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Base URL</TableHead>
                <TableHead>Timeout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                    No upstreams for this tenant.
                  </TableCell>
                </TableRow>
              )}
              {data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="font-code text-xs text-gray-600">{u.base_url}</TableCell>
                  <TableCell className="text-gray-500 text-xs">{u.timeout_ms}ms</TableCell>
                  <TableCell>
                    <Badge variant={u.enabled ? 'success' : 'outline'}>
                      {u.enabled ? 'enabled' : 'disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDelete(u)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Delete ${u.name}`}
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
        <CreateUpstreamDialog tenantId={selectedTenant} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
