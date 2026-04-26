-- Barqium initial schema
-- Migration: 001_initial_schema
-- Applied by: barqium outbox-worker at startup via golang-migrate

BEGIN;

-- Extension for UUID generation (available without contrib in PG 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helper: keep updated_at current automatically
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- tenants
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT        NOT NULL,
  -- URL-safe short identifier, used in routing and topics
  slug       TEXT        NOT NULL,
  enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tenants_slug_unique UNIQUE (slug)
);

CREATE TRIGGER tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- upstreams
-- ---------------------------------------------------------------------------
CREATE TABLE upstreams (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  url        TEXT        NOT NULL,
  timeout_ms INTEGER     NOT NULL DEFAULT 5000 CHECK (timeout_ms > 0),
  enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT upstreams_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX upstreams_tenant_id_idx ON upstreams (tenant_id);

CREATE TRIGGER upstreams_updated_at
  BEFORE UPDATE ON upstreams
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- routes
-- ---------------------------------------------------------------------------
CREATE TABLE routes (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  -- HTTP method or "*" to match any
  method      TEXT        NOT NULL DEFAULT '*',
  path_prefix TEXT        NOT NULL,
  -- Empty means match any Host header
  host        TEXT        NOT NULL DEFAULT '',
  upstream_id UUID        NOT NULL REFERENCES upstreams (id),
  enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT routes_tenant_method_path_host_unique
    UNIQUE (tenant_id, method, path_prefix, host)
);

CREATE INDEX routes_tenant_id_idx ON routes (tenant_id);
CREATE INDEX routes_upstream_id_idx ON routes (upstream_id);

CREATE TRIGGER routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- consumers  (authenticated identities — API clients, agents, humans)
-- ---------------------------------------------------------------------------
CREATE TABLE consumers (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT consumers_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX consumers_tenant_id_idx ON consumers (tenant_id);

CREATE TRIGGER consumers_updated_at
  BEFORE UPDATE ON consumers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- policies
-- ---------------------------------------------------------------------------
CREATE TABLE policies (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  UUID        NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name       TEXT        NOT NULL,
  -- Discriminator: 'jwt' | 'api_key' | 'rate_limit'
  type       TEXT        NOT NULL,
  config     JSONB       NOT NULL DEFAULT '{}',
  enabled    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT policies_tenant_name_unique UNIQUE (tenant_id, name)
);

CREATE INDEX policies_tenant_id_idx ON policies (tenant_id);

CREATE TRIGGER policies_updated_at
  BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- route_policies  (ordered policy chain per route)
-- ---------------------------------------------------------------------------
CREATE TABLE route_policies (
  route_id   UUID    NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
  policy_id  UUID    NOT NULL REFERENCES policies (id) ON DELETE CASCADE,
  -- Lower position evaluates first
  position   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (route_id, policy_id)
);

CREATE INDEX route_policies_route_id_idx ON route_policies (route_id);

-- ---------------------------------------------------------------------------
-- event_outbox  (transactional outbox — see ADR-004)
-- Rows are inserted inside the same transaction as the config change.
-- The outbox-worker polls this table and publishes to Kafka.
-- ---------------------------------------------------------------------------
CREATE TABLE event_outbox (
  id              BIGSERIAL   NOT NULL PRIMARY KEY,
  tenant_id       UUID        NOT NULL,
  kafka_topic     TEXT        NOT NULL,
  -- Serialised Protobuf payload (wire format)
  payload         BYTEA       NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Null until the row is published
  sent_at         TIMESTAMPTZ,
  -- Filled after acknowledgement from Kafka broker
  kafka_partition INTEGER,
  kafka_offset    BIGINT
);

-- The worker queries: WHERE sent_at IS NULL ORDER BY id LIMIT 500
CREATE INDEX event_outbox_pending_idx
  ON event_outbox (id)
  WHERE sent_at IS NULL;

COMMIT;
