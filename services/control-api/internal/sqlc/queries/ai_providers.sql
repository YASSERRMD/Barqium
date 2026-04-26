-- name: CreateAiProvider :one
INSERT INTO ai_providers (tenant_id, name, provider, base_url, api_key_env, enabled)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id, tenant_id, name, provider, base_url, api_key_env, enabled, created_at, updated_at;

-- name: GetAiProvider :one
SELECT id, tenant_id, name, provider, base_url, api_key_env, enabled, created_at, updated_at
FROM ai_providers
WHERE id = $1 AND tenant_id = $2;

-- name: ListAiProvidersByTenant :many
SELECT id, tenant_id, name, provider, base_url, api_key_env, enabled, created_at, updated_at
FROM ai_providers
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateAiProvider :one
UPDATE ai_providers
SET name = $3, provider = $4, base_url = $5, api_key_env = $6, enabled = $7, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING id, tenant_id, name, provider, base_url, api_key_env, enabled, created_at, updated_at;

-- name: DeleteAiProvider :exec
DELETE FROM ai_providers
WHERE id = $1 AND tenant_id = $2;

-- name: CreateAiModelPolicy :one
INSERT INTO ai_model_policies (tenant_id, provider_id, model, max_tokens_per_request, budget_usd_per_day, fallback_model, enabled)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id, tenant_id, provider_id, model, max_tokens_per_request, budget_usd_per_day::text, fallback_model, enabled, created_at, updated_at;

-- name: GetAiModelPolicy :one
SELECT id, tenant_id, provider_id, model, max_tokens_per_request, budget_usd_per_day::text, fallback_model, enabled, created_at, updated_at
FROM ai_model_policies
WHERE id = $1 AND tenant_id = $2;

-- name: ListAiModelPoliciesByProvider :many
SELECT id, tenant_id, provider_id, model, max_tokens_per_request, budget_usd_per_day::text, fallback_model, enabled, created_at, updated_at
FROM ai_model_policies
WHERE provider_id = $1 AND tenant_id = $2
ORDER BY created_at DESC
LIMIT $3 OFFSET $4;

-- name: UpdateAiModelPolicy :one
UPDATE ai_model_policies
SET model = $3, max_tokens_per_request = $4, budget_usd_per_day = $5, fallback_model = $6, enabled = $7, updated_at = now()
WHERE id = $1 AND tenant_id = $2
RETURNING id, tenant_id, provider_id, model, max_tokens_per_request, budget_usd_per_day::text, fallback_model, enabled, created_at, updated_at;

-- name: DeleteAiModelPolicy :exec
DELETE FROM ai_model_policies
WHERE id = $1 AND tenant_id = $2;
