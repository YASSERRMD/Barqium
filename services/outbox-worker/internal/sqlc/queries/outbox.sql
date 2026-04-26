-- name: FetchPendingEvents :many
-- Grabs up to $1 unsent rows in insertion order.
-- SKIP LOCKED lets concurrent worker replicas coexist safely.
SELECT * FROM event_outbox
WHERE sent_at IS NULL
ORDER BY id
LIMIT $1
FOR UPDATE SKIP LOCKED;

-- name: MarkEventSent :exec
UPDATE event_outbox
SET sent_at         = now(),
    kafka_partition = $2,
    kafka_offset    = $3
WHERE id = $1;
