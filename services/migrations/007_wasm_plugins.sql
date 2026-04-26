-- WASM plugin registry.
-- Stores metadata and the binary artefact (or an external storage reference)
-- for tenant-scoped WASM plugins loaded by the data-plane at startup/reload.

CREATE TYPE wasm_plugin_trigger AS ENUM ('on_request', 'on_response', 'both');

CREATE TABLE wasm_plugins (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    -- Semver string, e.g. "1.2.3".
    version     TEXT        NOT NULL DEFAULT '0.1.0',
    trigger     wasm_plugin_trigger NOT NULL DEFAULT 'both',
    -- SHA-256 hex digest of the wasm binary, for integrity verification.
    sha256      TEXT        NOT NULL,
    -- Optional: path on shared storage (S3/GCS) where the .wasm file lives.
    -- NULL means the binary is embedded in `wasm_binary`.
    storage_url TEXT,
    -- Inline binary payload (NULL when storage_url is set).
    wasm_binary BYTEA,
    -- JSON object of config values passed to the plugin via host vars.
    config      JSONB       NOT NULL DEFAULT '{}',
    enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name, version),
    -- Exactly one of storage_url or wasm_binary must be set.
    CONSTRAINT wasm_source_check CHECK (
        (storage_url IS NOT NULL AND wasm_binary IS NULL) OR
        (storage_url IS NULL AND wasm_binary IS NOT NULL)
    )
);

CREATE INDEX idx_wasm_plugins_tenant ON wasm_plugins(tenant_id);
