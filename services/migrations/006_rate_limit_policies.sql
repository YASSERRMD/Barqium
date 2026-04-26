-- Rate limit policies scoped per tenant.
-- Each policy specifies an algorithm, scope, and request budget.

CREATE TYPE rate_limit_scope AS ENUM ('tenant', 'consumer', 'route', 'ip');
CREATE TYPE rate_limit_algorithm AS ENUM ('token_bucket', 'sliding_window', 'fixed_window');

CREATE TABLE rate_limit_policies (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT        NOT NULL,
    scope       rate_limit_scope      NOT NULL DEFAULT 'tenant',
    algorithm   rate_limit_algorithm  NOT NULL DEFAULT 'sliding_window',
    -- Maximum requests allowed per window.
    rate_limit  INT         NOT NULL CHECK (rate_limit > 0),
    -- Window size in seconds.
    window_secs INT         NOT NULL CHECK (window_secs > 0),
    -- Optional burst allowance for token_bucket algorithm.
    burst_limit INT         CHECK (burst_limit IS NULL OR burst_limit >= rate_limit),
    enabled     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name)
);

CREATE INDEX idx_rate_limit_policies_tenant ON rate_limit_policies(tenant_id);
