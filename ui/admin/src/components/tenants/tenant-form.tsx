import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import type { Tenant, CreateTenantBody, UpdateTenantBody } from '@/api/client'

interface TenantFormProps {
  initial?: Partial<Tenant>
  onSubmit: (data: CreateTenantBody | UpdateTenantBody) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function TenantForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: TenantFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [slugEdited, setSlugEdited] = useState(!!initial?.slug)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleName = (v: string) => {
    setName(v)
    if (!slugEdited) setSlug(slugify(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setError(null)
    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), slug: slug.trim(), enabled })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="tenant-name">Name</label>
        <input
          id="tenant-name"
          className="input"
          value={name}
          onChange={e => handleName(e.target.value)}
          placeholder="Acme Corp"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label" htmlFor="tenant-slug">Slug</label>
        <input
          id="tenant-slug"
          className="input font-code text-sm"
          value={slug}
          onChange={e => { setSlug(e.target.value); setSlugEdited(true) }}
          placeholder="acme-corp"
          required
          pattern="[a-z0-9][a-z0-9\-]*"
          title="Lowercase letters, numbers and hyphens only"
        />
        <p className="text-xs text-gray-400 mt-1">Used in API paths · lowercase, hyphens only</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="label mb-0" htmlFor="tenant-enabled">Enabled</label>
        <input
          id="tenant-enabled"
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-navy cursor-pointer"
        />
        <span className="text-xs text-gray-500">{enabled ? 'Tenant is active' : 'Tenant is disabled'}</span>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={loading || !name.trim() || !slug.trim()}>
          {loading ? <><Spinner size="xs" /> Saving…</> : submitLabel}
        </button>
      </div>
    </form>
  )
}
