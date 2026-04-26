BEGIN;

CREATE TABLE regions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL UNIQUE,
  -- Comma-separated Kafka broker addresses for this region's Redpanda cluster.
  kafka_brokers   TEXT        NOT NULL,
  is_primary      BOOLEAN     NOT NULL DEFAULT false,
  -- Optional Kafka MirrorMaker2 consumer group ID used for this region.
  mm2_group_id    TEXT,
  enabled         BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one primary region is allowed; enforced at the application layer,
-- but the index speeds up the lookup.
CREATE INDEX regions_primary_idx ON regions (is_primary) WHERE is_primary = true;

COMMIT;
