BEGIN;

-- Partitioned audit log table with 7-year retention.
--
-- Each partition covers one calendar month. The housekeeping job
-- (run monthly via pg_cron or a Kubernetes CronJob) drops partitions
-- older than 84 months (7 years) by executing:
--   DROP TABLE audit_log_YYYY_MM;
--
-- Partition key is created_at so range queries by date are efficient.
CREATE TABLE audit_log (
  id           BIGSERIAL    NOT NULL,
  tenant_id    UUID         NOT NULL,
  event_type   TEXT         NOT NULL,
  actor_id     TEXT,
  actor_role   TEXT,
  resource_id  TEXT,
  resource_type TEXT,
  action       TEXT         NOT NULL,
  -- Full event payload as stored in the Kafka message (Protobuf JSON).
  payload_json JSONB,
  -- Kafka metadata for deduplication and replay.
  kafka_topic      TEXT,
  kafka_partition  INTEGER,
  kafka_offset     BIGINT,
  -- Range-partition key; set by the consumer, not DEFAULT.
  created_at   TIMESTAMPTZ  NOT NULL,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Bootstrap partitions for the first four months of operation.
-- The audit-consumer will create monthly partitions dynamically.
CREATE TABLE audit_log_2026_04 PARTITION OF audit_log
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE audit_log_2026_05 PARTITION OF audit_log
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE audit_log_2026_06 PARTITION OF audit_log
  FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE audit_log_2026_07 PARTITION OF audit_log
  FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

-- Index on tenant + created_at for time-range queries per tenant.
CREATE INDEX audit_log_tenant_time_idx ON audit_log (tenant_id, created_at DESC);

-- Unique index on kafka_offset per partition for at-least-once deduplication.
CREATE UNIQUE INDEX audit_log_kafka_dedup_idx
  ON audit_log (kafka_topic, kafka_partition, kafka_offset);

COMMIT;
