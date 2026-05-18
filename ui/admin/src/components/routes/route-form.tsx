import { useState } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { useUpstreams } from '@/hooks/use-upstreams'
import type { Route, CreateRouteBody, UpdateRouteBody } from '@/api/client'

const HTTP_METHODS = ['ANY', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const
type HttpMethod = (typeof HTTP_METHODS)[number]

interface RouteFormProps {
  tenantId: string
  initial?: Partial<Route>
  onSubmit: (data: CreateRouteBody | UpdateRouteBody) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}

export function validatePathPrefix(path: string): string | null {
  const trimmed = path.trim()
  if (!trimmed) return 'Path prefix is required'
  if (!trimmed.startsWith('/')) return 'Path prefix must start with /'
  if (trimmed.includes(' ')) return 'Path prefix must not contain spaces'
  if (/[^a-zA-Z0-9/_\-.:*{}]/.test(trimmed)) return 'Path prefix contains invalid characters'
  return null
}

export function RouteForm({ tenantId, initial, onSubmit, onCancel, submitLabel = 'Save' }: RouteFormProps) {
  const normalizeMethod = (m: string): HttpMethod =>
    m === '*' || !m ? 'ANY' : (m.toUpperCase() as HttpMethod)

  const [method, setMethod]         = useState<HttpMethod>(normalizeMethod(initial?.method ?? 'ANY'))
  const [pathPrefix, setPathPrefix] = useState(initial?.path_prefix ?? '/')
  const [host, setHost]             = useState(initial?.host ?? '')
  const [upstreamId, setUpstreamId] = useState(initial?.upstream_id ?? '')
  const [enabled, setEnabled]       = useState(initial?.enabled ?? true)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [pathError, setPathError]   = useState<string | null>(null)

  const { data: upstreamList = [] } = useUpstreams(tenantId)

  const handlePathChange = (v: string) => {
    setPathPrefix(v)
    setPathError(validatePathPrefix(v))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const pathErr = validatePathPrefix(pathPrefix)
    if (pathErr) { setPathError(pathErr); return }
    if (!upstreamId) return
    setError(null)
    setLoading(true)
    try {
      const apiMethod = method === 'ANY' ? '*' : method
      await onSubmit({
        method: apiMethod,
        path_prefix: pathPrefix.trim(),
        host: host.trim() || undefined,
        upstream_id: upstreamId,
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
      <div className="flex gap-3">
        <div className="w-32">
          <label className="label" htmlFor="route-method">Method</label>
          <select
            id="route-method"
            className="input"
            value={method}
            onChange={e => setMethod(e.target.value as HttpMethod)}
          >
            {HTTP_METHODS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="label" htmlFor="route-path">Path Prefix</label>
          <input
            id="route-path"
            className={`input font-code text-sm ${pathError ? 'border-red-400 focus:ring-red-300' : ''}`}
            value={pathPrefix}
            onChange={e => handlePathChange(e.target.value)}
            placeholder="/api/v1"
            required
            autoFocus
          />
          {pathError && <p className="text-xs text-red-500 mt-1">{pathError}</p>}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="route-host">
          Host <span className="text-gray-400 font-normal text-xs">(optional)</span>
        </label>
        <input
          id="route-host"
          className="input font-code text-sm"
          value={host}
          onChange={e => setHost(e.target.value)}
          placeholder="api.example.com"
        />
        <p className="text-xs text-gray-400 mt-1">Leave blank to match any host</p>
      </div>

      <div>
        <label className="label" htmlFor="route-upstream">Upstream</label>
        <select
          id="route-upstream"
          className="input"
          value={upstreamId}
          onChange={e => setUpstreamId(e.target.value)}
          required
        >
          <option value="">Select upstream…</option>
          {upstreamList.filter(u => u.enabled).map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
          {upstreamList.filter(u => !u.enabled).length > 0 && (
            <optgroup label="Disabled">
              {upstreamList.filter(u => !u.enabled).map(u => (
                <option key={u.id} value={u.id} disabled>{u.name} (disabled)</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <label className="label mb-0" htmlFor="route-enabled">Enabled</label>
        <input
          id="route-enabled"
          type="checkbox"
          checked={enabled}
          onChange={e => setEnabled(e.target.checked)}
          className="w-4 h-4 rounded accent-navy cursor-pointer"
        />
        <span className="text-xs text-gray-500">{enabled ? 'Route is active' : 'Route is disabled'}</span>
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
          disabled={loading || !upstreamId || !!pathError}
        >
          {loading ? <><Spinner size="xs" /> Saving…</> : submitLabel}
        </button>
      </div>
    </form>
  )
}
