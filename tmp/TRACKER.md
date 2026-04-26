# Barqium Build Tracker

**Last updated:** 2026-04-26 20:00 (UTC)
**Current phase:** Phase 4 — Frontier
**Current branch:** phase_4_frontier

---

## Phase Status

| Phase | Status | Branch | Started | Merged | Notes |
|---|---|---|---|---|---|
| 1 — Foundation | done | phase_1_foundation | 2026-04-26 | 2026-04-26 | 20 of 20 tasks done |
| 2 — Maturity | done | phase_2_maturity | 2026-04-26 | — | 20 of 20 tasks done, PR pending |
| 3 — AI and MCP | done | phase_3_ai_mcp | 2026-04-26 | — | 20 of 20 tasks done, PR pending |
| 4 — Frontier | in_progress | phase_4_frontier | 2026-04-26 | — | 0 of 20 tasks done |

---

## Active Phase Tasks (Phase 2)

| ID | Task | Status | Owner | Commit | Test Status | Notes |
|---|---|---|---|---|---|---|
| P2-T1 | HTTP/2 listener in barqium-core (hyper h2, protocol negotiation) | done | YASSERRMD | fbcca66 | passed | |
| P2-T2 | gRPC proxy: content-type detection, HTTP/2 stream passthrough | done | YASSERRMD | 3c0914a | passed | |
| P2-T3 | WebSocket upgrade and bidirectional stream forwarding | done | YASSERRMD | 8f13cac | passed | |
| P2-T4 | SSE passthrough with streaming body (chunked transfer) | done | YASSERRMD | 135e934 | passed | |
| P2-T5 | mTLS: rustls client-certificate auth on the listener | done | YASSERRMD | — | passed | |
| P2-T6 | OIDC middleware for control-api (Bearer token validation via JWKS) | done | YASSERRMD | — | passed | |
| P2-T7 | ABAC policy type definitions and evaluator in barqium-policy | done | YASSERRMD | — | passed | |
| P2-T8 | Multi-tenant RBAC: per-tenant resource scoping in control-api | done | YASSERRMD | — | passed | |
| P2-T9 | Admin SPA scaffold (React 18 + Vite + Tailwind + shadcn/ui) | done | YASSERRMD | — | passed | |
| P2-T10 | Admin SPA: OpenAPI client codegen from control-api spec | done | YASSERRMD | — | passed | |
| P2-T11 | Admin SPA: tenants management page (list + create + delete) | done | YASSERRMD | — | passed | |
| P2-T12 | Admin SPA: upstreams management page (CRUD per tenant) | done | YASSERRMD | — | passed | |
| P2-T13 | Admin SPA: routes management page (CRUD per tenant) | done | YASSERRMD | — | passed | |
| P2-T14 | Admin SPA: dashboard (gateway health + live request metrics) | done | YASSERRMD | — | passed | |
| P2-T15 | Config-version pinning: snapshot sequence tracking + rollback endpoint | done | YASSERRMD | — | passed | |
| P2-T16 | Audit topic consumer and Postgres sink (7-year retention) | done | YASSERRMD | — | passed | |
| P2-T17 | Distributed rate limiting via Redis (sliding window, replaces local limiter on hot path) | done | YASSERRMD | — | passed | |
| P2-T18 | Blue-green data-plane rollout: health endpoint + graceful connection drain | done | YASSERRMD | — | passed | |
| P2-T19 | OpenAPI spec generation from control-api (swaggo or huma) | done | YASSERRMD | — | passed | |
| P2-T20 | Update docker-compose.dev.yml and smoke test for Phase 2 services | done | YASSERRMD | fd5fef2 | passed | |

---

## Active Phase Tasks (Phase 3)

| ID | Task | Status | Owner | Commit | Test Status | Notes |
|---|---|---|---|---|---|---|
| P3-T1 | barqium-ai crate: provider trait, request/response types, error types | done | YASSERRMD | — | passed | |
| P3-T2 | OpenAI provider: chat completions + streaming (SSE passthrough) | done | YASSERRMD | — | passed | |
| P3-T3 | Anthropic provider: messages API + streaming | done | YASSERRMD | — | passed | |
| P3-T4 | Groq + Ollama providers (OpenAI-compatible adapters) | done | YASSERRMD | — | passed | |
| P3-T5 | Bedrock provider: AWS SigV4 auth + converse API | done | YASSERRMD | — | passed | |
| P3-T6 | Token counting: tiktoken-rs for OpenAI, heuristic counter for Claude | done | YASSERRMD | — | passed | |
| P3-T7 | Cost ceiling: USD rate table per model, per-request budget enforcement | done | YASSERRMD | — | passed | |
| P3-T8 | Fallback chains: ordered provider list with retry-on-error/timeout | done | YASSERRMD | — | passed | |
| P3-T9 | Semantic cache: HNSW in-memory index, embedding lookup, cache-hit passthrough | done | YASSERRMD | — | passed | |
| P3-T10 | barqium-mcp crate: MCP types (Tool, ToolCall, ToolResult, ServerInfo, capabilities) | done | YASSERRMD | — | passed | |
| P3-T11 | MCP client role - HTTP+SSE transport: connect to remote MCP servers | done | YASSERRMD | — | passed | |
| P3-T12 | MCP client role - stdio transport: spawn and communicate with local MCP servers | done | YASSERRMD | — | passed | |
| P3-T13 | MCP server role: expose Barqium as an MCP server, route tool calls to upstreams | done | YASSERRMD | — | passed | |
| P3-T14 | Tool registry: store registered tools in Postgres, CRUD in control-api | done | YASSERRMD | — | passed | |
| P3-T15 | Tool-level RBAC: per-tool allow/deny wired into ABAC evaluator | done | YASSERRMD | — | passed | |
| P3-T16 | Federated OAuth: per-server OAuth2 client-credentials + PKCE, token auto-refresh | done | YASSERRMD | — | passed | |
| P3-T17 | Code Mode progressive disclosure: tool visibility tiers, per-session gate | done | YASSERRMD | 934f0f1 | passed | |
| P3-T18 | PII redaction: regex + entity scanner, reversible tokenisation with session key | done | YASSERRMD | 934f0f1 | passed | |
| P3-T19 | AI routes in control-api: provider config CRUD, model policies per tenant | done | YASSERRMD | 9701beb | passed | |
| P3-T20 | Update docker-compose and smoke test for Phase 3 services | done | YASSERRMD | 3c51dbe | passed | |

---

## Completed Phase Tasks (Phase 1)

| ID | Task | Status | Owner | Commit | Test Status | Notes |
|---|---|---|---|---|---|---|
| P1-T1 | Init monorepo | done | YASSERRMD | 149bb15 | passed | |
| P1-T2 | Protobuf contracts | done | YASSERRMD | 3ac225b | passed | |
| P1-T3 | Postgres schema | done | YASSERRMD | dd09d4b | passed | |
| P1-T4 | control-api bootstrap | done | YASSERRMD | 9372937 | passed | |
| P1-T5 | control-api tenants CRUD | done | YASSERRMD | 71c8a7e | passed | |
| P1-T6 | control-api routes CRUD | done | YASSERRMD | fcc8b12 | passed | |
| P1-T7 | outbox-worker | done | YASSERRMD | 161d0c1 | passed | |
| P1-T8 | barqium-config rkyv types | done | YASSERRMD | ff0366c | passed | |
| P1-T9 | barqium-snapshot Kafka consumer | done | YASSERRMD | b4c07bd | passed | |
| P1-T10 | barqium-snapshot atomic-swap | done | YASSERRMD | 61950c8 | passed | |
| P1-T11 | barqium-core HTTP/1.1 listener | done | YASSERRMD | df90540 | passed | |
| P1-T12 | barqium-core route matcher | done | YASSERRMD | 8c86447 | passed | |
| P1-T13 | barqium-core upstream forwarder | done | YASSERRMD | cbd2f73 | passed | |
| P1-T14 | barqium-policy JWT validator | done | YASSERRMD | 628b879 | passed | |
| P1-T15 | barqium-policy API key validator | done | YASSERRMD | a954b68 | passed | |
| P1-T16 | barqium-policy rate limiter (local) | done | YASSERRMD | 12eff66 | passed | |
| P1-T17 | barqium-telemetry OTLP exporter | done | YASSERRMD | ea28677 | passed | |
| P1-T18 | barqium-telemetry Kafka producer | done | YASSERRMD | 044a745 | passed | |
| P1-T19 | docker-compose.dev.yml | done | YASSERRMD | 6c7107c | passed | |
| P1-T20 | End-to-end smoke test | done | YASSERRMD | f77c4b3 | passed | |

---

## Active Phase Tasks (Phase 4)

| ID | Task | Status | Owner | Commit | Test Status | Notes |
|---|---|---|---|---|---|---|
| P4-T1 | HTTP/3: quinn + h3 deps, QUIC listener skeleton in barqium-core | pending | — | — | pending | |
| P4-T2 | HTTP/3: route requests through existing proxy service via H3 handler | pending | — | — | pending | |
| P4-T3 | barqium-wasm crate: wasmtime dep, WasmPlugin trait, PluginRuntime scaffold | pending | — | — | pending | |
| P4-T4 | WASM host functions: header get/set/remove, log, get/set request vars | pending | — | — | pending | |
| P4-T5 | WASM hot reload: notify file watcher + ArcSwap module live swap | pending | — | — | pending | |
| P4-T6 | GraphQL operation detection: content-type + body parse, query/mutation/subscription | pending | — | — | pending | |
| P4-T7 | GraphQL persisted queries: SHA-256 allowlist enforcement, 403 on unknown | pending | — | — | pending | |
| P4-T8 | SOAP/XML mediation: envelope parsing, SOAPAction header routing | pending | — | — | pending | |
| P4-T9 | SOAP fault normalization: wrap upstream errors in soap:Fault envelope | pending | — | — | pending | |
| P4-T10 | Cross-region foundation: migration 005 regions table + control-api CRUD | pending | — | — | pending | |
| P4-T11 | MirrorMaker2 topology: second Redpanda node + MM2 in docker-compose | pending | — | — | pending | |
| P4-T12 | Edge binary profile: Cargo feature flags (default/full/edge), stripped build | pending | — | — | pending | |
| P4-T13 | AVX-512 TLS acceleration: aws-lc-rs optional feature gate in barqium-core | pending | — | — | pending | |
| P4-T14 | BPF/XDP scaffold: barqium-xdp crate with aya, SO_REUSEPORT on TCP listener | pending | — | — | pending | |
| P4-T15 | Structured access logs to Kafka: AccessLogProducer, telemetry.access topic | pending | — | — | pending | |
| P4-T16 | Dynamic upstream health checks: HealthChecker background task per upstream | pending | — | — | pending | |
| P4-T17 | Circuit breaker: closed/open/half-open state machine per upstream | pending | — | — | pending | |
| P4-T18 | Rate limit policy CRUD in control-api: migration 006 + REST handler | pending | — | — | pending | |
| P4-T19 | WASM plugin registry in control-api: migration 007 + REST handler | pending | — | — | pending | |
| P4-T20 | Phase 4 docker-compose and extended smoke test (21+ checks) | pending | — | — | pending | |

---

## Decisions Pending
_None._

---

## Blockers
_None._

---

## Recent Decisions (last 5)
- 2026-04-26: ADR-006 accepted: reqwest for outbound HTTP in Rust.
- 2026-04-26: ADR-001 through ADR-005 accepted (see DECISIONS.md).

---

## Backlog
_Nothing yet._
