package worker

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	kafka "github.com/segmentio/kafka-go"

	"github.com/yasserrmd/barqium/services/outbox-worker/internal/sqlc/sqlcgen"
)

// Worker polls the event_outbox table and publishes rows to Kafka.
type Worker struct {
	pool     *pgxpool.Pool
	writers  map[string]*kafka.Writer
	brokers  []string
	batch    int
	interval time.Duration
}

// New creates a Worker. brokers is a comma-separated list of host:port.
func New(pool *pgxpool.Pool, brokers string, batchSize int, pollInterval time.Duration) *Worker {
	return &Worker{
		pool:     pool,
		writers:  make(map[string]*kafka.Writer),
		brokers:  strings.Split(brokers, ","),
		batch:    batchSize,
		interval: pollInterval,
	}
}

// Run starts the polling loop, returning when ctx is cancelled.
func (w *Worker) Run(ctx context.Context) {
	slog.Info("outbox-worker started", "brokers", w.brokers, "batch", w.batch, "interval", w.interval)
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			w.closeWriters()
			slog.Info("outbox-worker stopped")
			return
		case <-ticker.C:
			if err := w.processBatch(ctx); err != nil {
				slog.Error("outbox-worker: batch error", "error", err)
			}
		}
	}
}

func (w *Worker) processBatch(ctx context.Context) error {
	tx, err := w.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if err := tx.Rollback(ctx); err != nil && err != pgx.ErrTxClosed {
			slog.Error("outbox-worker: rollback error", "error", err)
		}
	}()

	q := sqlcgen.New(tx)
	rows, err := q.FetchPendingEvents(ctx, int32(w.batch))
	if err != nil {
		return fmt.Errorf("fetch pending: %w", err)
	}
	if len(rows) == 0 {
		return nil
	}

	slog.Debug("outbox-worker: publishing", "count", len(rows))

	for _, row := range rows {
		writer := w.writerFor(row.KafkaTopic)

		msg := kafka.Message{
			// Partition by tenant so all events for a tenant are ordered.
			Key:   []byte(row.TenantID.String()),
			Value: row.Payload,
		}

		if err := writer.WriteMessages(ctx, msg); err != nil {
			return fmt.Errorf("write to topic %s: %w", row.KafkaTopic, err)
		}

		// kafka-go does not expose per-message partition/offset after write,
		// so we leave them null; sent_at alone is sufficient for draining.
		if err := q.MarkEventSent(ctx, sqlcgen.MarkEventSentParams{
			ID:             row.ID,
			KafkaPartition: nil,
			KafkaOffset:    nil,
		}); err != nil {
			return fmt.Errorf("mark sent (id=%d): %w", row.ID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}

	slog.Info("outbox-worker: batch published", "count", len(rows))
	return nil
}

func (w *Worker) writerFor(topic string) *kafka.Writer {
	if wr, ok := w.writers[topic]; ok {
		return wr
	}
	wr := &kafka.Writer{
		Addr:         kafka.TCP(w.brokers...),
		Topic:        topic,
		Balancer:     &kafka.Hash{},
		RequiredAcks: kafka.RequireOne,
		// Async = false: wait for broker ack before returning from WriteMessages.
		Async: false,
	}
	w.writers[topic] = wr
	return wr
}

func (w *Worker) closeWriters() {
	for topic, wr := range w.writers {
		if err := wr.Close(); err != nil {
			slog.Error("outbox-worker: close writer", "topic", topic, "error", err)
		}
	}
}
