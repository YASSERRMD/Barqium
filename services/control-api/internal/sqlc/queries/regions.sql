-- name: CreateRegion :one
INSERT INTO regions (name, kafka_brokers, is_primary, mm2_group_id, enabled)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, name, kafka_brokers, is_primary, mm2_group_id, enabled, created_at, updated_at;

-- name: GetRegion :one
SELECT id, name, kafka_brokers, is_primary, mm2_group_id, enabled, created_at, updated_at
FROM regions
WHERE id = $1;

-- name: ListRegions :many
SELECT id, name, kafka_brokers, is_primary, mm2_group_id, enabled, created_at, updated_at
FROM regions
ORDER BY created_at DESC
LIMIT $1 OFFSET $2;

-- name: UpdateRegion :one
UPDATE regions
SET name = $2, kafka_brokers = $3, is_primary = $4, mm2_group_id = $5, enabled = $6, updated_at = now()
WHERE id = $1
RETURNING id, name, kafka_brokers, is_primary, mm2_group_id, enabled, created_at, updated_at;

-- name: DeleteRegion :exec
DELETE FROM regions WHERE id = $1;
