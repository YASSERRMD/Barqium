import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import type { Consumer, CreateConsumerBody } from '@/api/client'

interface ConsumerFormProps {
  initial?: Partial<Consumer>
  onSubmit: (data: CreateConsumerBody) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function ConsumerForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: ConsumerFormProps) {
  const [name, setName]       = useState(initial?.name ?? '')
  const [enabled, setEnabled] = useState(initial?.enabled ?? true)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), enabled })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="consumer-name">Name</label>
        <input
          id="consumer-name"
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="my-service"
          required
          autoFocus
        />
        <p className="text-xs text-gray-400 mt-1">A unique name to identify this consumer</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="label mb-0" htmlFor="consumer-enabled">Enabled</label>
        <input
          id="consumer-enabled"
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-navy cursor-pointer"
        />
        <span className="text-xs text-gray-500">{enabled ? 'Consumer is active' : 'Consumer is disabled'}</span>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
          {loading ? <><Spinner size="xs" /> Saving…</> : submitLabel}
        </button>
      </div>
    </form>
  )
}
