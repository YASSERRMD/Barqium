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

// ---- AI Providers ---------------------------------------------------------

export interface AiProvider {
  id: string
  tenant_id: string
  name: string
  slug: string
  base_url?: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateAiProviderBody {
  name: string
  slug: string
  base_url?: string
  api_key_env?: string
  enabled?: boolean
}

export const aiProviders = {
  list: (tenantId: string) => request<AiProvider[]>(`/tenants/${tenantId}/ai-providers`),
  create: (tenantId: string, body: CreateAiProviderBody) =>
    request<AiProvider>(`/tenants/${tenantId}/ai-providers`, { method: 'POST', body: JSON.stringify(body) }),
  delete: (tenantId: string, id: string) =>
    request<void>(`/tenants/${tenantId}/ai-providers/${id}`, { method: 'DELETE' }),
}

// ---- Rate Limit Policies --------------------------------------------------

export interface RateLimitPolicy {
  id: string
  tenant_id: string
  name: string
  scope: 'tenant' | 'consumer' | 'route' | 'ip'
  algorithm: 'token_bucket' | 'sliding_window' | 'fixed_window'
  rate_limit: number
  window_secs: number
  burst_limit?: number
  enabled: boolean
  created_at: string
}

export interface CreateRateLimitPolicyBody {
  name: string
  scope: RateLimitPolicy['scope']
  algorithm: RateLimitPolicy['algorithm']
  rate_limit: number
  window_secs: number
  burst_limit?: number
  enabled?: boolean
}

export const rateLimitPolicies = {
  list: (tenantId: string) => request<RateLimitPolicy[]>(`/tenants/${tenantId}/rate-limit-policies`),
  create: (tenantId: string, body: CreateRateLimitPolicyBody) =>
    request<RateLimitPolicy>(`/tenants/${tenantId}/rate-limit-policies`, { method: 'POST', body: JSON.stringify(body) }),
  delete: (tenantId: string, id: string) =>
    request<void>(`/tenants/${tenantId}/rate-limit-policies/${id}`, { method: 'DELETE' }),
}

// ---- WASM Plugins ---------------------------------------------------------

export interface WasmPlugin {
  id: string
  tenant_id: string
  name: string
  version: string
  trigger: 'on_request' | 'on_response' | 'both'
  sha256: string
  enabled: boolean
  created_at: string
}

export interface CreateWasmPluginBody {
  name: string
  version: string
  trigger: WasmPlugin['trigger']
  storage_url?: string
  enabled?: boolean
}

export const wasmPlugins = {
  list: (tenantId: string) => request<WasmPlugin[]>(`/tenants/${tenantId}/wasm-plugins`),
  create: (tenantId: string, body: CreateWasmPluginBody) =>
    request<WasmPlugin>(`/tenants/${tenantId}/wasm-plugins`, { method: 'POST', body: JSON.stringify(body) }),
  delete: (tenantId: string, id: string) =>
    request<void>(`/tenants/${tenantId}/wasm-plugins/${id}`, { method: 'DELETE' }),
}

// ---- Consumers ------------------------------------------------------------

export interface Consumer {
  id: string
  tenant_id: string
  name: string
  api_key_prefix?: string
  enabled: boolean
  created_at: string
}

export interface CreateConsumerBody {
  name: string
  enabled?: boolean
}

export const consumers = {
  list: (tenantId: string) => request<Consumer[]>(`/tenants/${tenantId}/consumers`),
  create: (tenantId: string, body: CreateConsumerBody) =>
    request<Consumer>(`/tenants/${tenantId}/consumers`, { method: 'POST', body: JSON.stringify(body) }),
  delete: (tenantId: string, id: string) =>
    request<void>(`/tenants/${tenantId}/consumers/${id}`, { method: 'DELETE' }),
}

// ---- Regions --------------------------------------------------------------

export interface Region {
  id: string
  name: string
  kafka_brokers: string
  is_primary: boolean
  created_at: string
}

export const regions = {
  list: () => request<Region[]>('/regions'),
  create: (body: { name: string; kafka_brokers: string; is_primary?: boolean }) =>
    request<Region>('/regions', { method: 'POST', body: JSON.stringify(body) }),
  delete: (id: string) => request<void>(`/regions/${id}`, { method: 'DELETE' }),
}
