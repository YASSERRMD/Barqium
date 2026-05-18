import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import type { RateLimitPolicy, CreateRateLimitPolicyBody } from '@/api/client'

type Algorithm = RateLimitPolicy['algorithm']
type Scope = RateLimitPolicy['scope']

interface RateLimitFormProps {
  initial?: Partial<RateLimitPolicy>
  onSubmit: (data: CreateRateLimitPolicyBody) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

const PRESETS = {
  strict:     { name: 'Strict',      rate_limit: 10,  window_secs: 60,   burst_limit: 15,  algorithm: 'sliding_window'  as Algorithm },
  normal:     { name: 'Normal',      rate_limit: 100, window_secs: 60,   burst_limit: 150, algorithm: 'token_bucket'    as Algorithm },
  permissive: { name: 'Permissive',  rate_limit: 500, window_secs: 60,   burst_limit: 750, algorithm: 'fixed_window'    as Algorithm },
}

export function RateLimitForm({ initial, onSubmit, onCancel, submitLabel = 'Save' }: RateLimitFormProps) {
  const [name, setName]           = useState(initial?.name ?? '')
  const [scope, setScope]         = useState<Scope>(initial?.scope ?? 'tenant')
  const [algorithm, setAlgorithm] = useState<Algorithm>(initial?.algorithm ?? 'token_bucket')
  const [rateLimit, setRateLimit] = useState(String(initial?.rate_limit ?? 100))
  const [windowSecs, setWindowSecs] = useState(String(initial?.window_secs ?? 60))
  const [burstLimit, setBurstLimit] = useState(String(initial?.burst_limit ?? ''))
  const [enabled, setEnabled]     = useState(initial?.enabled ?? true)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const applyPreset = (preset: keyof typeof PRESETS) => {
    const p = PRESETS[preset]
    if (!name) setName(p.name)
    setRateLimit(String(p.rate_limit))
    setWindowSecs(String(p.window_secs))
    setBurstLimit(String(p.burst_limit))
    setAlgorithm(p.algorithm)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setLoading(true)
    try {
      await onSubmit({
        name: name.trim(),
        scope,
        algorithm,
        rate_limit: parseInt(rateLimit, 10) || 100,
        window_secs: parseInt(windowSecs, 10) || 60,
        burst_limit: burstLimit ? parseInt(burstLimit, 10) : undefined,
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
      {/* Presets */}
      <div>
        <p className="label mb-2">Quick Presets</p>
        <div className="flex gap-2">
          {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map(preset => (
            <button
              key={preset}
              type="button"
              className="btn-ghost btn-xs capitalize"
              onClick={() => applyPreset(preset)}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="rl-name">Policy Name</label>
        <input
          id="rl-name"
          className="input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="My Rate Limit Policy"
          required
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="rl-scope">Scope</label>
          <select id="rl-scope" className="input" value={scope} onChange={e => setScope(e.target.value as Scope)}>
            <option value="tenant">Tenant</option>
            <option value="consumer">Consumer</option>
            <option value="route">Route</option>
            <option value="ip">IP</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="rl-algorithm">Algorithm</label>
          <select id="rl-algorithm" className="input" value={algorithm} onChange={e => setAlgorithm(e.target.value as Algorithm)}>
            <option value="token_bucket">Token Bucket</option>
            <option value="sliding_window">Sliding Window</option>
            <option value="fixed_window">Fixed Window</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="rl-rate">Rate Limit</label>
          <input id="rl-rate" type="number" className="input" value={rateLimit} onChange={e => setRateLimit(e.target.value)} min="1" required />
          <p className="text-xs text-gray-400 mt-1">requests</p>
        </div>
        <div>
          <label className="label" htmlFor="rl-window">Window (s)</label>
          <input id="rl-window" type="number" className="input" value={windowSecs} onChange={e => setWindowSecs(e.target.value)} min="1" required />
          <p className="text-xs text-gray-400 mt-1">seconds</p>
        </div>
        <div>
          <label className="label" htmlFor="rl-burst">
            Burst <span className="text-gray-400 text-xs font-normal">(opt)</span>
          </label>
          <input id="rl-burst" type="number" className="input" value={burstLimit} onChange={e => setBurstLimit(e.target.value)} min="1" placeholder="—" />
          <p className="text-xs text-gray-400 mt-1">requests</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="label mb-0" htmlFor="rl-enabled">Enabled</label>
        <input
          id="rl-enabled"
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-navy cursor-pointer"
        />
        <span className="text-xs text-gray-500">{enabled ? 'Policy is active' : 'Policy is disabled'}</span>
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
