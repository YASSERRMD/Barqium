import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import type { WasmPlugin, CreateWasmPluginBody } from '@/api/client'

type Trigger = WasmPlugin['trigger']

interface PluginFormProps {
  initial?: Partial<WasmPlugin>
  onSubmit: (data: CreateWasmPluginBody) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

function validateSha256(sha: string): string | null {
  if (!sha) return null
  if (!/^[a-fA-F0-9]{64}$/.test(sha)) return 'SHA256 must be exactly 64 hex characters'
  return null
}

export function PluginForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: PluginFormProps) {
  const [name, setName]             = useState(initial?.name ?? '')
  const [version, setVersion]       = useState(initial?.version ?? '1.0.0')
  const [trigger, setTrigger]       = useState<Trigger>(initial?.trigger ?? 'on_request')
  const [storageUrl, setStorageUrl] = useState('')
  const [sha256, setSha256]         = useState('')
  const [enabled, setEnabled]       = useState(initial?.enabled ?? true)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [shaError, setShaError]     = useState<string | null>(null)

  const handleShaChange = (v: string) => {
    setSha256(v)
    setShaError(validateSha256(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const shaErr = validateSha256(sha256)
    if (shaErr) { setShaError(shaErr); return }
    if (!name.trim() || !version.trim()) return
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        version: version.trim(),
        trigger,
        storage_url: storageUrl.trim() || undefined,
        enabled,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="plugin-name">Plugin Name</label>
        <input
          id="plugin-name"
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="my-auth-plugin"
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="plugin-version">Version</label>
          <input
            id="plugin-version"
            className="input font-code"
            value={version}
            onChange={e => setVersion(e.target.value)}
            placeholder="1.0.0"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="plugin-trigger">Trigger</label>
          <select
            id="plugin-trigger"
            className="input"
            value={trigger}
            onChange={e => setTrigger(e.target.value as Trigger)}
          >
            <option value="on_request">On Request</option>
            <option value="on_response">On Response</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="plugin-storage-url">
          Storage URL <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          id="plugin-storage-url"
          className="input font-code text-sm"
          value={storageUrl}
          onChange={e => setStorageUrl(e.target.value)}
          placeholder="s3://bucket/plugin.wasm"
        />
      </div>

      <div>
        <label className="label" htmlFor="plugin-sha256">
          SHA256 <span className="text-gray-400 font-normal text-xs">(optional, for verification)</span>
        </label>
        <input
          id="plugin-sha256"
          className={`input font-code text-xs ${shaError ? 'border-red-400 focus:ring-red-300' : ''}`}
          value={sha256}
          onChange={e => handleShaChange(e.target.value)}
          placeholder="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
          maxLength={64}
        />
        {shaError && <p className="text-xs text-red-500 mt-1">{shaError}</p>}
        {sha256 && !shaError && (
          <p className="text-xs text-emerald-500 mt-1">Valid SHA256 checksum</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="label mb-0" htmlFor="plugin-enabled">Enabled</label>
        <input
          id="plugin-enabled"
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-navy cursor-pointer"
        />
        <span className="text-xs text-gray-500">{enabled ? 'Plugin is active' : 'Plugin is disabled'}</span>
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
          disabled={loading || !name.trim() || !version.trim() || !!shaError}
        >
          {loading ? <><Spinner size="xs" /> Saving…</> : submitLabel}
        </button>
      </div>
    </form>
  )
}
