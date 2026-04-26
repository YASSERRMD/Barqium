-- name: CreateUpstream :one
INSERT INTO upstreams (tenant_id, name, url, timeout_ms, enabled)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetUpstream :one
SELECT * FROM upstreams
WHERE id = $1 AND tenant_id = $2;

-- name: ListUpstreamsByTenant :many
SELECT * FROM upstreams
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateUpstream :one
UPDATE upstreams
SET name = $3, url = $4, timeout_ms = $5, enabled = $6
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteUpstream :exec
DELETE FROM upstreams
WHERE id = $1 AND tenant_id = $2;
