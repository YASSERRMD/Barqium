import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { ProviderLogo } from './provider-logo'
import type { AiProvider, CreateAiProviderBody } from '@/api/client'

const PROVIDER_SLUGS = ['openai', 'anthropic', 'groq', 'ollama', 'bedrock', 'cohere', 'mistral'] as const
type ProviderSlug = (typeof PROVIDER_SLUGS)[number]

interface ProviderFormProps {
  initial?: Partial<AiProvider>
  onSubmit: (data: CreateAiProviderBody) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function ProviderForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: ProviderFormProps) {
  const [name, setName]           = useState(initial?.name ?? '')
  const [slug, setSlug]           = useState<ProviderSlug>((initial?.slug as ProviderSlug) ?? 'openai')
  const [baseUrl, setBaseUrl]     = useState(initial?.base_url ?? '')
  const [apiKeyEnv, setApiKeyEnv] = useState('')
  const [enabled, setEnabled]     = useState(initial?.enabled ?? true)
  const [nameEdited, setNameEdited] = useState(!!initial?.name)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const handleSlugChange = (v: ProviderSlug) => {
    setSlug(v)
    if (!nameEdited) {
      setName(v.charAt(0).toUpperCase() + v.slice(1))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        slug,
        base_url: baseUrl.trim() || undefined,
        api_key_env: apiKeyEnv.trim() || undefined,
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
        <label className="label" htmlFor="provider-slug">Provider</label>
        <div className="flex items-center gap-3">
          <ProviderLogo slug={slug} size="sm" />
          <select
            id="provider-slug"
            className="input flex-1"
            value={slug}
            onChange={e => handleSlugChange(e.target.value as ProviderSlug)}
          >
            {PROVIDER_SLUGS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="provider-name">Display Name</label>
        <input
          id="provider-name"
          className="input"
          value={name}
          onChange={e => { setName(e.target.value); setNameEdited(true) }}
          placeholder="My OpenAI Instance"
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label" htmlFor="provider-base-url">
          Base URL <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          id="provider-base-url"
          className="input font-code text-sm"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
        />
        <p className="text-xs text-gray-400 mt-1">Override the default API endpoint (e.g., for proxies)</p>
      </div>

      <div>
        <label className="label" htmlFor="provider-api-key-env">
          API Key Env Var <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          id="provider-api-key-env"
          className="input font-code text-sm"
          value={apiKeyEnv}
          onChange={e => setApiKeyEnv(e.target.value)}
          placeholder="OPENAI_API_KEY"
        />
        <p className="text-xs text-gray-400 mt-1">Environment variable name containing the API key</p>
      </div>

      <div className="flex items-center gap-3">
        <label className="label mb-0" htmlFor="provider-enabled">Enabled</label>
        <input
          id="provider-enabled"
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-navy cursor-pointer"
        />
        <span className="text-xs text-gray-500">{enabled ? 'Provider is active' : 'Provider is disabled'}</span>
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
