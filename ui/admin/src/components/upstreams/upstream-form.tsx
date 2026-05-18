import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import type { Upstream, CreateUpstreamBody, UpdateUpstreamBody } from '@/api/client'

interface UpstreamFormProps {
  initial?: Partial<Upstream>
  onSubmit: (data: CreateUpstreamBody | UpdateUpstreamBody) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

function validateUrl(url: string): string | null {
  if (!url.trim()) return 'Base URL is required'
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'Base URL must start with http:// or https://'
  }
  return null
}

export function UpstreamForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: UpstreamFormProps) {
  const [name, setName]           = useState(initial?.name ?? '')
  const [baseUrl, setBaseUrl]     = useState(initial?.base_url ?? '')
  const [timeoutMs, setTimeoutMs] = useState(String(initial?.timeout_ms ?? 5000))
  const [enabled, setEnabled]     = useState(initial?.enabled ?? true)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [urlError, setUrlError]   = useState<string | null>(null)

  const handleUrlChange = (v: string) => {
    setBaseUrl(v)
    setUrlError(validateUrl(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const urlErr = validateUrl(baseUrl)
    if (urlErr) { setUrlError(urlErr); return }
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    try {
      await onSubmit({ name: name.trim(), base_url: baseUrl.trim(), timeout_ms: parseInt(timeoutMs, 10) || 5000, enabled })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="upstream-name">Name</label>
        <input
          id="upstream-name"
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="my-backend"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label" htmlFor="upstream-base-url">Base URL</label>
        <input
          id="upstream-base-url"
          className={`input font-code text-sm ${urlError ? 'border-red-400 focus:ring-red-300' : ''}`}
          value={baseUrl}
          onChange={e => handleUrlChange(e.target.value)}
          placeholder="https://api.example.com"
          required
        />
        {urlError && <p className="text-xs text-red-500 mt-1">{urlError}</p>}
      </div>

      <div>
        <label className="label" htmlFor="upstream-timeout">Timeout (ms)</label>
        <input
          id="upstream-timeout"
          type="number"
          className="input"
          value={timeoutMs}
          onChange={e => setTimeoutMs(e.target.value)}
          min="100"
          max="300000"
          step="100"
        />
        <p className="text-xs text-gray-400 mt-1">Request timeout in milliseconds (default: 5000)</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="label mb-0" htmlFor="upstream-enabled">Enabled</label>
        <input
          id="upstream-enabled"
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-navy cursor-pointer"
        />
        <span className="text-xs text-gray-500">{enabled ? 'Upstream is active' : 'Upstream is disabled'}</span>
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !name.trim() || !!urlError}
        >
          {loading ? <><Spinner size="xs" /> Saving…</> : submitLabel}
        </button>
      </div>
    </form>
  )
}
