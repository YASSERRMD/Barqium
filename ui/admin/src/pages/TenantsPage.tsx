import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { tenants, type Tenant, type CreateTenantBody } from '@/api/client'
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

function CreateTenantDialog({
  onClose,
}: {
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const mutation = useMutation({
    mutationFn: (body: CreateTenantBody) => tenants.create(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenants'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate({ name, slug })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="font-heading text-lg font-bold text-navy mb-4">New Tenant</h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <input
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              pattern="^[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?$"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Lowercase alphanumeric with hyphens.</p>
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

export function TenantsPage() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenants.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenants.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tenants'] }),
  })

  const handleDelete = (t: Tenant) => {
    if (confirm(`Delete tenant "${t.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(t.id)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">Tenants</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage gateway tenants.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} />
          New Tenant
        </Button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading...</p>}
      {isError && <p className="text-red-600 text-sm">Failed to load tenants.</p>}

      {data && (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                    No tenants yet.
                  </TableCell>
                </TableRow>
              )}
              {data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="font-code text-xs text-gray-600">{t.slug}</TableCell>
                  <TableCell>
                    <Badge variant={t.enabled ? 'success' : 'outline'}>
                      {t.enabled ? 'enabled' : 'disabled'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500 text-xs">
                    {new Date(t.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => handleDelete(t)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label={`Delete ${t.name}`}
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

      {showCreate && <CreateTenantDialog onClose={() => setShowCreate(false)} />}
    </div>
  )
}
