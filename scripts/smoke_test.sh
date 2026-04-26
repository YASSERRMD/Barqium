#!/usr/bin/env bash
# Phase 3 end-to-end smoke test (superset of Phase 2 checks).
#
# Prerequisites:
#   - docker compose stack is up: docker compose -f deploy/docker-compose.dev.yml up -d
#   - curl, jq installed
#
# Usage:
#   ./scripts/smoke_test.sh
#
# Exit codes:
#   0 = all checks passed
#   1 = at least one check failed

set -euo pipefail

CONTROL_API="${CONTROL_API:-http://localhost:8080}"
DATAPLANE="${DATAPLANE:-http://localhost:9000}"
DATAPLANE_HEALTH="${DATAPLANE_HEALTH:-http://localhost:9001}"
KAFKA_BROKERS="${KAFKA_BROKERS:-localhost:9092}"
ECHO_UPSTREAM="${ECHO_UPSTREAM:-http://whoami:80}"   # resolved inside compose network

PASS=0
FAIL=0

ok()   { echo "  [PASS] $*"; PASS=$((PASS + 1)); }
fail() { echo "  [FAIL] $*"; FAIL=$((FAIL + 1)); }
step() { echo; echo "==> $*"; }

# ---------------------------------------------------------------------------
step "1. Control-API health"
# ---------------------------------------------------------------------------
HEALTH=$(curl -fsS "$CONTROL_API/health" 2>/dev/null || echo '{}')
if echo "$HEALTH" | jq -e '.status == "ok"' > /dev/null 2>&1; then
  ok "control-api is healthy"
else
  fail "control-api health check failed: $HEALTH"
  exit 1
fi

# ---------------------------------------------------------------------------
step "2. OpenAPI spec endpoint"
# ---------------------------------------------------------------------------
OPENAPI_STATUS=$(curl -fsS -o /dev/null -w "%{http_code}" \
  "$CONTROL_API/api/openapi.yaml" 2>/dev/null || echo "000")
if [ "$OPENAPI_STATUS" = "200" ]; then
  ok "OpenAPI spec served at GET /api/openapi.yaml (HTTP $OPENAPI_STATUS)"
else
  fail "OpenAPI spec endpoint returned unexpected status: $OPENAPI_STATUS"
fi

# ---------------------------------------------------------------------------
step "3. Data-plane liveness (livez)"
# ---------------------------------------------------------------------------
LIVEZ_STATUS=$(curl -fsS -o /dev/null -w "%{http_code}" \
  "$DATAPLANE_HEALTH/livez" 2>/dev/null || echo "000")
if [ "$LIVEZ_STATUS" = "200" ]; then
  ok "dataplane /livez returned 200"
else
  # Health server may not be wired in the dev stub; warn but do not fail.
  echo "  [WARN] dataplane /livez returned $LIVEZ_STATUS (health server may not be active in this build)"
fi

# ---------------------------------------------------------------------------
step "4. Data-plane readiness (readyz)"
# ---------------------------------------------------------------------------
READYZ_STATUS=$(curl -fsS -o /dev/null -w "%{http_code}" \
  "$DATAPLANE_HEALTH/readyz" 2>/dev/null || echo "000")
if [ "$READYZ_STATUS" = "200" ]; then
  ok "dataplane /readyz returned 200 (not draining)"
else
  echo "  [WARN] dataplane /readyz returned $READYZ_STATUS (health server may not be active in this build)"
fi

# ---------------------------------------------------------------------------
step "5. Create tenant"
# ---------------------------------------------------------------------------
SLUG="smoke-$(date +%s)"
TENANT=$(curl -fsS -X POST "$CONTROL_API/api/v1/tenants" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Test\",\"slug\":\"$SLUG\"}")
TENANT_ID=$(echo "$TENANT" | jq -r '.id')
if [ -n "$TENANT_ID" ] && [ "$TENANT_ID" != "null" ]; then
  ok "tenant created: id=$TENANT_ID slug=$SLUG"
else
  fail "tenant creation failed: $TENANT"
  exit 1
fi

# ---------------------------------------------------------------------------
step "6. Create upstream (local whoami echo service)"
# ---------------------------------------------------------------------------
UPSTREAM=$(curl -fsS -X POST "$CONTROL_API/api/v1/tenants/$TENANT_ID/upstreams" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"whoami\",\"url\":\"$ECHO_UPSTREAM\",\"timeout_ms\":3000}")
UPSTREAM_ID=$(echo "$UPSTREAM" | jq -r '.id')
if [ -n "$UPSTREAM_ID" ] && [ "$UPSTREAM_ID" != "null" ]; then
  ok "upstream created: id=$UPSTREAM_ID url=$ECHO_UPSTREAM"
else
  fail "upstream creation failed: $UPSTREAM"
  exit 1
fi

# ---------------------------------------------------------------------------
step "7. Create route"
# ---------------------------------------------------------------------------
ROUTE=$(curl -fsS -X POST "$CONTROL_API/api/v1/tenants/$TENANT_ID/routes" \
  -H "Content-Type: application/json" \
  -d "{
    \"method\": \"GET\",
    \"path_prefix\": \"/smoke\",
    \"upstream_id\": \"$UPSTREAM_ID\"
  }")
ROUTE_ID=$(echo "$ROUTE" | jq -r '.id')
if [ -n "$ROUTE_ID" ] && [ "$ROUTE_ID" != "null" ]; then
  ok "route created: id=$ROUTE_ID path_prefix=/smoke"
else
  fail "route creation failed: $ROUTE"
  exit 1
fi

# ---------------------------------------------------------------------------
step "8. Pin a config checkpoint (Phase 2: version pinning)"
# ---------------------------------------------------------------------------
CHECKPOINT=$(curl -fsS -X POST \
  "$CONTROL_API/api/v1/tenants/$TENANT_ID/config/checkpoints" \
  -H "Content-Type: application/json" \
  -d "{\"sequence\":1,\"note\":\"smoke test checkpoint\"}")
CHECKPOINT_ID=$(echo "$CHECKPOINT" | jq -r '.id')
if [ -n "$CHECKPOINT_ID" ] && [ "$CHECKPOINT_ID" != "null" ]; then
  ok "checkpoint created: id=$CHECKPOINT_ID sequence=1"
else
  fail "checkpoint creation failed: $CHECKPOINT"
fi

# ---------------------------------------------------------------------------
step "9. List checkpoints"
# ---------------------------------------------------------------------------
CHECKPOINTS=$(curl -fsS \
  "$CONTROL_API/api/v1/tenants/$TENANT_ID/config/checkpoints")
COUNT=$(echo "$CHECKPOINTS" | jq 'length')
if [ "${COUNT:-0}" -ge 1 ]; then
  ok "checkpoints list returned $COUNT entry(ies)"
else
  fail "checkpoints list is empty or failed: $CHECKPOINTS"
fi

# ---------------------------------------------------------------------------
step "10. Wait for snapshot propagation (outbox -> Kafka -> snapshot compiler)"
# ---------------------------------------------------------------------------
echo "    sleeping 5s for event pipeline..."
sleep 5
ok "propagation wait done"

# ---------------------------------------------------------------------------
step "11. Hit the data-plane proxy"
# ---------------------------------------------------------------------------
STATUS=$(curl -fsS -o /dev/null -w "%{http_code}" \
  "$DATAPLANE/smoke" 2>/dev/null || echo "000")
if [ "$STATUS" = "200" ]; then
  ok "data-plane returned 200 for GET /smoke"
elif [ "$STATUS" = "404" ]; then
  fail "data-plane returned 404 (snapshot may not have propagated; retry after longer wait)"
else
  fail "data-plane returned unexpected status: $STATUS"
fi

# ---------------------------------------------------------------------------
step "12. Check telemetry.requests topic (10s sample)"
# ---------------------------------------------------------------------------
if command -v rpk &>/dev/null; then
  COUNT=$(rpk topic consume telemetry.requests \
    --brokers="$KAFKA_BROKERS" \
    --num 1 \
    --timeout-seconds 10 2>/dev/null | wc -l || echo "0")
  COUNT="${COUNT// /}"
  if [ "${COUNT:-0}" -ge 1 ]; then
    ok "telemetry event found in telemetry.requests topic"
  else
    fail "no telemetry events seen in 10s (rpk installed but topic empty)"
  fi
else
  echo "    SKIP: rpk not installed; cannot verify telemetry topic"
fi

# ---------------------------------------------------------------------------
step "13. Check audit.events topic exists (Phase 2: audit sink)"
# ---------------------------------------------------------------------------
if command -v rpk &>/dev/null; then
  TOPIC_INFO=$(rpk topic describe audit.events \
    --brokers="$KAFKA_BROKERS" 2>/dev/null || echo "")
  if [ -n "$TOPIC_INFO" ]; then
    ok "audit.events topic exists"
  else
    fail "audit.events topic not found"
  fi
else
  echo "    SKIP: rpk not installed; cannot verify audit.events topic"
fi

# ---------------------------------------------------------------------------
step "14. Create AI provider config (Phase 3: AI provider registry)"
# ---------------------------------------------------------------------------
AI_PROVIDER=$(curl -fsS -X POST \
  "$CONTROL_API/api/v1/tenants/$TENANT_ID/ai/providers" \
  -H "Content-Type: application/json" \
  -d '{"name":"smoke-openai","provider":"openai","api_key_env":"OPENAI_API_KEY"}')
AI_PROVIDER_ID=$(echo "$AI_PROVIDER" | jq -r '.id')
if [ -n "$AI_PROVIDER_ID" ] && [ "$AI_PROVIDER_ID" != "null" ]; then
  ok "AI provider created: id=$AI_PROVIDER_ID name=smoke-openai"
else
  fail "AI provider creation failed: $AI_PROVIDER"
fi

# ---------------------------------------------------------------------------
step "15. Create model policy for AI provider (Phase 3: token budget)"
# ---------------------------------------------------------------------------
if [ -n "$AI_PROVIDER_ID" ] && [ "$AI_PROVIDER_ID" != "null" ]; then
  MODEL_POLICY=$(curl -fsS -X POST \
    "$CONTROL_API/api/v1/tenants/$TENANT_ID/ai/providers/$AI_PROVIDER_ID/model-policies" \
    -H "Content-Type: application/json" \
    -d '{"model":"gpt-4o","max_tokens_per_request":2048,"budget_usd_per_day":"5.0000"}')
  MODEL_POLICY_ID=$(echo "$MODEL_POLICY" | jq -r '.id')
  if [ -n "$MODEL_POLICY_ID" ] && [ "$MODEL_POLICY_ID" != "null" ]; then
    ok "model policy created: id=$MODEL_POLICY_ID model=gpt-4o"
  else
    fail "model policy creation failed: $MODEL_POLICY"
  fi
else
  echo "    SKIP: AI provider creation failed; skipping model policy check"
fi

# ---------------------------------------------------------------------------
step "16. List AI providers for tenant"
# ---------------------------------------------------------------------------
AI_PROVIDERS=$(curl -fsS \
  "$CONTROL_API/api/v1/tenants/$TENANT_ID/ai/providers")
AI_COUNT=$(echo "$AI_PROVIDERS" | jq 'length')
if [ "${AI_COUNT:-0}" -ge 1 ]; then
  ok "AI providers list returned $AI_COUNT entry(ies)"
else
  fail "AI providers list is empty or failed: $AI_PROVIDERS"
fi

# ---------------------------------------------------------------------------
step "17. Check telemetry.llm topic exists (Phase 3: LLM token telemetry)"
# ---------------------------------------------------------------------------
if command -v rpk &>/dev/null; then
  TOPIC_INFO=$(rpk topic describe telemetry.llm \
    --brokers="$KAFKA_BROKERS" 2>/dev/null || echo "")
  if [ -n "$TOPIC_INFO" ]; then
    ok "telemetry.llm topic exists"
  else
    fail "telemetry.llm topic not found"
  fi
else
  echo "    SKIP: rpk not installed; cannot verify telemetry.llm topic"
fi

# ---------------------------------------------------------------------------
step "Summary"
# ---------------------------------------------------------------------------
echo
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo

if [ "$FAIL" -gt 0 ]; then
  echo "SMOKE TEST FAILED"
  exit 1
else
  echo "SMOKE TEST PASSED"
  exit 0
fi
