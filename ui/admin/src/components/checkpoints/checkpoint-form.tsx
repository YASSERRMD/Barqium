import { useState } from 'react'

interface CheckpointFormProps {
  onSubmit: (note: string) => Promise<void> | void
  onCancel: () => void
  submitLabel?: string
}

export function CheckpointForm({ onSubmit, onCancel, submitLabel = 'Create Checkpoint' }: CheckpointFormProps) {
  const [note, setNote]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await onSubmit(note.trim())
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="label" htmlFor="checkpoint-note">Note (optional)</label>
        <textarea
          id="checkpoint-note"
          className="input mt-1 resize-none h-24"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Describe what this checkpoint captures, e.g. 'Before route restructure'…"
          autoFocus
        />
        <p className="text-xs text-gray-400 mt-1">
          A short description helps identify this checkpoint later. Leave blank for an auto-generated label.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
