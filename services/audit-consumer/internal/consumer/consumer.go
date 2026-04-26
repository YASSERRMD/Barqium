package consumer

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/segmentio/kafka-go"

	"github.com/yasserrmd/barqium/services/audit-consumer/internal/config"
)

// AuditEvent is the shape of an audit message on the Kafka topic.
// Fields match the AuditEvent Protobuf schema in proto/audit_event.proto.
type AuditEvent struct {
	TenantID     string          `json:"tenant_id"`
	EventType    string          `json:"event_type"`
	ActorID      string          `json:"actor_id"`
	ActorRole    string          `json:"actor_role"`
	ResourceID   string          `json:"resource_id"`
	ResourceType string          `json:"resource_type"`
	Action       string          `json:"action"`
	Payload      json.RawMessage `json:"payload"`
	OccurredAt   string          `json:"occurred_at"`
}

// Run consumes from the audit Kafka topic and sinks events to Postgres
// in batches. It loops until ctx is cancelled.
func Run(ctx context.Context, cfg *config.Config, pool *pgxpool.Pool) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        strings.Split(cfg.KafkaBrokers, ","),
		Topic:          cfg.KafkaTopic,
		GroupID:        cfg.KafkaGroupID,
		MinBytes:       1,
		MaxBytes:       10 << 20, // 10 MiB
		CommitInterval: time.Second,
	})
	defer func() {
		if err := reader.Close(); err != nil {
			slog.Warn("audit-consumer: reader close error", "err", err)
		}
	}()

	slog.Info("audit-consumer: started", "topic", cfg.KafkaTopic, "group", cfg.KafkaGroupID)

	batch := make([]kafka.Message, 0, cfg.BatchSize)

	flush := func() {
		if len(batch) == 0 {
			return
		}
		if err := insertBatch(ctx, pool, batch); err != nil {
			slog.Error("audit-consumer: batch insert failed", "err", err, "size", len(batch))
		} else {
			slog.Debug("audit-consumer: flushed batch", "size", len(batch))
		}
		batch = batch[:0]
	}

	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			flush()
			return
		case <-ticker.C:
			flush()
		default:
			fetchCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
			msg, err := reader.FetchMessage(fetchCtx)
			cancel()
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				continue
			}

			batch = append(batch, msg)

			if len(batch) >= cfg.BatchSize {
				flush()
				if err := reader.CommitMessages(ctx, batch...); err != nil {
					slog.Warn("audit-consumer: commit error", "err", err)
				}
			}
		}
	}
}

func insertBatch(ctx context.Context, pool *pgxpool.Pool, msgs []kafka.Message) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback(ctx) }()

	const q = `
INSERT INTO audit_log
  (tenant_id, event_type, actor_id, actor_role, resource_id, resource_type,
   action, payload_json, kafka_topic, kafka_partition, kafka_offset, created_at)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
ON CONFLICT (kafka_topic, kafka_partition, kafka_offset) DO NOTHING`

	for _, msg := range msgs {
		var ev AuditEvent
		if err := json.Unmarshal(msg.Value, &ev); err != nil {
			slog.Warn("audit-consumer: bad message", "offset", msg.Offset, "err", err)
			continue
		}

		occurredAt := time.Now()
		if ev.OccurredAt != "" {
			if t, err := time.Parse(time.RFC3339Nano, ev.OccurredAt); err == nil {
				occurredAt = t
			}
		}

		var payloadJSON pgtype.Text
		if len(ev.Payload) > 0 {
			payloadJSON = pgtype.Text{String: string(ev.Payload), Valid: true}
		}

		if _, err := tx.Exec(ctx, q,
			ev.TenantID,
			ev.EventType,
			ev.ActorID,
			ev.ActorRole,
			ev.ResourceID,
			ev.ResourceType,
			ev.Action,
			payloadJSON,
			msg.Topic,
			msg.Partition,
			msg.Offset,
			occurredAt,
		); err != nil {
			return fmt.Errorf("insert audit row: %w", err)
		}
	}

	return tx.Commit(ctx)
}
