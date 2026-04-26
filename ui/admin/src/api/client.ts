// Typed API client for the Barqium control-api.
// Generated from the OpenAPI spec at /api/openapi.json when available.
// Hand-written against the v1 endpoint surface until P2-T19 ships the spec.

const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${text}`)
  }
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ---- Types ----------------------------------------------------------------

export interface Tenant {
  id: string
  name: string
  slug: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateTenantBody {
  name: string
  slug: string
  enabled?: boolean
}

export interface UpdateTenantBody {
  name?: string
  slug?: string
  enabled?: boolean
}

export interface Upstream {
  id: string
  tenant_id: string
  name: string
  base_url: string
  timeout_ms: number
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateUpstreamBody {
  name: string
  base_url: string
  timeout_ms?: number
  enabled?: boolean
}

export interface UpdateUpstreamBody {
  name?: string
  base_url?: string
  timeout_ms?: number
  enabled?: boolean
}

export interface Route {
  id: string
  tenant_id: string
  upstream_id: string
  method: string
  path_prefix: string
  host: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateRouteBody {
  method?: string
  path_prefix: string
  host?: string
  upstream_id: string
  enabled?: boolean
}

export interface UpdateRouteBody {
  method?: string
  path_prefix?: string
  host?: string
  upstream_id?: string
  enabled?: boolean
}

export interface ListQuery {
  limit?: number
  offset?: number
}

// ---- Tenants --------------------------------------------------------------

export const tenants = {
  list: (q?: ListQuery) =>
    request<Tenant[]>(`/tenants?limit=${q?.limit ?? 50}&offset=${q?.offset ?? 0}`),
  get: (id: string) => request<Tenant>(`/tenants/${id}`),
  create: (body: CreateTenantBody) =>
    request<Tenant>('/tenants', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: UpdateTenantBody) =>
    request<Tenant>(`/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/tenants/${id}`, { method: 'DELETE' }),
}

// ---- Upstreams ------------------------------------------------------------

export const upstreams = {
  list: (tenantId: string, q?: ListQuery) =>
    request<Upstream[]>(
      `/tenants/${tenantId}/upstreams?limit=${q?.limit ?? 50}&offset=${q?.offset ?? 0}`,
    ),
  get: (tenantId: string, id: string) =>
    request<Upstream>(`/tenants/${tenantId}/upstreams/${id}`),
  create: (tenantId: string, body: CreateUpstreamBody) =>
    request<Upstream>(`/tenants/${tenantId}/upstreams`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (tenantId: string, id: string, body: UpdateUpstreamBody) =>
    request<Upstream>(`/tenants/${tenantId}/upstreams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (tenantId: string, id: string) =>
    request<void>(`/tenants/${tenantId}/upstreams/${id}`, { method: 'DELETE' }),
}

// ---- Routes ---------------------------------------------------------------

export const routes = {
  list: (tenantId: string, q?: ListQuery) =>
    request<Route[]>(
      `/tenants/${tenantId}/routes?limit=${q?.limit ?? 50}&offset=${q?.offset ?? 0}`,
    ),
  get: (tenantId: string, id: string) =>
    request<Route>(`/tenants/${tenantId}/routes/${id}`),
  create: (tenantId: string, body: CreateRouteBody) =>
    request<Route>(`/tenants/${tenantId}/routes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  update: (tenantId: string, id: string, body: UpdateRouteBody) =>
    request<Route>(`/tenants/${tenantId}/routes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  delete: (tenantId: string, id: string) =>
    request<void>(`/tenants/${tenantId}/routes/${id}`, { method: 'DELETE' }),
}
