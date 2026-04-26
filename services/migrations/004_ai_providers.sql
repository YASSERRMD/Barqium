BEGIN;

CREATE TABLE ai_providers (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  -- provider slug: openai | anthropic | groq | ollama | bedrock
  provider    TEXT        NOT NULL,
  base_url    TEXT,
  -- name of the environment variable holding the API key; key itself is never stored
  api_key_env TEXT,
  enabled     BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX ai_providers_tenant_idx ON ai_providers (tenant_id);

CREATE TABLE ai_model_policies (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider_id           UUID         NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model                 TEXT         NOT NULL,
  max_tokens_per_request INT         NOT NULL DEFAULT 4096,
  budget_usd_per_day    NUMERIC(10,4),
  fallback_model        TEXT,
  enabled               BOOLEAN      NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider_id, model)
);

CREATE INDEX ai_model_policies_provider_idx ON ai_model_policies (provider_id);

COMMIT;
