#!/usr/bin/env bash
# Phase 1 end-to-end smoke test.
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
step "2. Create tenant"
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
step "3. Create upstream (local whoami echo service)"
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
step "4. Create route"
# ---------------------------------------------------------------------------
ROUTE=$(curl -fsS -X POST "$CONTROL_API/api/v1/tenants/$TENANT_ID/routes" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"echo-get\",
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
step "5. Wait for snapshot propagation (outbox -> Kafka -> snapshot compiler)"
# ---------------------------------------------------------------------------
echo "    sleeping 5s for event pipeline..."
sleep 5
ok "propagation wait done"

# ---------------------------------------------------------------------------
step "6. Hit the data-plane proxy"
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
step "7. Check telemetry.requests topic (10s sample)"
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
