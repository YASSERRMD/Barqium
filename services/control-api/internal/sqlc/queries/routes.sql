-- name: CreateRoute :one
INSERT INTO routes (tenant_id, method, path_prefix, host, upstream_id, enabled)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetRoute :one
SELECT * FROM routes
WHERE id = $1 AND tenant_id = $2;

-- name: ListRoutesByTenant :many
SELECT * FROM routes
WHERE tenant_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateRoute :one
UPDATE routes
SET method = $3, path_prefix = $4, host = $5, upstream_id = $6, enabled = $7
WHERE id = $1 AND tenant_id = $2
RETURNING *;

-- name: DeleteRoute :exec
DELETE FROM routes
WHERE id = $1 AND tenant_id = $2;
