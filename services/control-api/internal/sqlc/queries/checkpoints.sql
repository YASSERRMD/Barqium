-- name: CreateCheckpoint :one
INSERT INTO config_checkpoints (tenant_id, sequence, outbox_last_id, note)
VALUES (@tenant_id, @sequence, @outbox_last_id, @note)
RETURNING *;

-- name: ListCheckpoints :many
SELECT * FROM config_checkpoints
WHERE tenant_id = @tenant_id
ORDER BY created_at DESC
LIMIT sqlc.arg(lim) OFFSET sqlc.arg(off);

-- name: GetCheckpointBySequence :one
SELECT * FROM config_checkpoints
WHERE tenant_id = @tenant_id AND sequence = @sequence;

-- name: DeleteCheckpoint :exec
DELETE FROM config_checkpoints
WHERE id = @id AND tenant_id = @tenant_id;
