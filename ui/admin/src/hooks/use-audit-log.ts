import { useQuery } from '@tanstack/react-query'

// Audit log entry type (the server returns these from the audit endpoint)
export interface AuditLogEntry {
  id: string
  tenant_id?: string
  actor: string
  actor_type: 'user' | 'api_key' | 'system'
  event_type: string
  resource_type: string
  resource_id?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
  created_at: string
}

export interface AuditLogQuery {
  limit?: number
  offset?: number
  event_type?: string
  actor?: string
  date_from?: string
  date_to?: string
}

// Mock implementation — replace with real API call when audit endpoint is available
async function fetchAuditLog(query: AuditLogQuery): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams()
  if (query.limit)      params.set('limit', String(query.limit))
  if (query.offset)     params.set('offset', String(query.offset))
  if (query.event_type) params.set('event_type', query.event_type)
  if (query.actor)      params.set('actor', query.actor)
  if (query.date_from)  params.set('date_from', query.date_from)
  if (query.date_to)    params.set('date_to', query.date_to)

  const res = await fetch(`/api/v1/audit?${params}`)
  if (!res.ok) {
    if (res.status === 404) return []
    throw new Error(`${res.status} ${res.statusText}`)
  }
  return res.json()
}

export function useAuditLog(query: AuditLogQuery = {}) {
  return useQuery({
    queryKey: ['audit-log', query],
    queryFn: () => fetchAuditLog({ limit: 50, ...query }),
    staleTime: 10_000,
    retry: false,
  })
}
