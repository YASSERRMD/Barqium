# Barqium Build Tracker

**Last updated:** 2026-04-26 12:30 (UTC)
**Current phase:** Phase 2 — Maturity
**Current branch:** phase_2_maturity

---

## Phase Status

| Phase | Status | Branch | Started | Merged | Notes |
|---|---|---|---|---|---|
| 1 — Foundation | done | phase_1_foundation | 2026-04-26 | 2026-04-26 | 20 of 20 tasks done |
| 2 — Maturity | in_progress | phase_2_maturity | 2026-04-26 | — | 18 of 20 tasks done |
| 3 — AI and MCP | pending | — | — | — | scope to be expanded after P2 merge |
| 4 — Frontier | pending | — | — | — | rolling phase |

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
| P2-T19 | OpenAPI spec generation from control-api (swaggo or huma) | pending | — | — | pending | |
| P2-T20 | Update docker-compose.dev.yml and smoke test for Phase 2 services | pending | — | — | pending | |

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
