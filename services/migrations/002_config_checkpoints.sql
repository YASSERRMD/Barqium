BEGIN;

-- Operator-pinned config checkpoints for the data plane.
--
-- A checkpoint records the sequence number and the Kafka offset of the
-- last event_outbox row applied at the time the checkpoint was taken.
-- This allows operators to identify what state the data plane was in at
-- a given moment and request a rollback to that state.
CREATE TABLE config_checkpoints (
  id             UUID        NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  -- Snapshot sequence number reported by the data plane at checkpoint time.
  sequence       BIGINT      NOT NULL,
  -- Last outbox row included in this snapshot (used to replay for rollback).
  outbox_last_id BIGINT,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT config_checkpoints_tenant_sequence_uniq UNIQUE (tenant_id, sequence)
);

CREATE INDEX config_checkpoints_tenant_idx
  ON config_checkpoints (tenant_id, created_at DESC);

COMMIT;
