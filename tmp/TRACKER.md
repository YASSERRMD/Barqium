# Barqium Build Tracker

**Last updated:** 2026-04-26 02:00 (UTC)
**Current phase:** Phase 1 — Foundation
**Current branch:** phase_1_foundation

---

## Phase Status

| Phase | Status | Branch | Started | Merged | Notes |
|---|---|---|---|---|---|
| 1 — Foundation | in_progress | phase_1_foundation | 2026-04-26 | — | 13 of 20 tasks done |
| 2 — Maturity | pending | — | — | — | scope to be expanded after P1 merge |
| 3 — AI and MCP | pending | — | — | — | scope to be expanded after P2 merge |
| 4 — Frontier | pending | — | — | — | rolling phase |

---

## Active Phase Tasks (Phase 1)

| ID | Task | Status | Owner | Commit | Test Status | Notes |
|---|---|---|---|---|---|---|
| P1-T1 | Init monorepo (Cargo workspace + Go workspace + tooling) | done | YASSERRMD | 149bb15 | passed | cargo check, fmt, clippy, go vet all clean |
| P1-T2 | Define Protobuf contracts (ConfigEvent, RouteSnapshot, AuditEvent, RequestTelemetry) | done | YASSERRMD | 3ac225b | passed | proto/config_event.proto, audit_event.proto, telemetry.proto |
| P1-T3 | Postgres schema for tenants, routes, upstreams, consumers, policies, event_outbox | done | YASSERRMD | dd09d4b | passed | services/migrations/001_initial_schema.sql |
| P1-T4 | control-api bootstrap (chi router, health endpoint) | done | YASSERRMD | 9372937 | passed | chi router, /health, main.go wired |
| P1-T5 | control-api tenants CRUD with validation | done | YASSERRMD | 71c8a7e | passed | slug regex, 409 on duplicate, PATCH partial update |
| P1-T6 | control-api routes CRUD with FK validation | done | YASSERRMD | fcc8b12 | passed | upstreams CRUD included; FK validation via GetUpstream |
| P1-T7 | outbox-worker that polls and publishes to Kafka | done | YASSERRMD | 161d0c1 | passed | FOR UPDATE SKIP LOCKED, per-topic kafka.Writer |
| P1-T8 | barqium-config rkyv types for the snapshot | done | YASSERRMD | ff0366c | passed | RouteSnapshot, RouteEntry, UpstreamEntry with rkyv + serde |
| P1-T9 | barqium-snapshot consumer from Kafka, builds snapshot file | done | YASSERRMD | b4c07bd | passed | prost decode, TenantState::apply, rdkafka StreamConsumer |
| P1-T10 | barqium-snapshot atomic-swap protocol on /dev/shm/barqium/ | done | YASSERRMD | 61950c8 | passed | SnapshotStore with per-tenant Synchronizer, 10ms grace |
| P1-T11 | barqium-core HTTP/1.1 listener with hyper | done | YASSERRMD | df90540 | passed | hyper 1.x serve_connection, TokioIo, PlaceholderService |
| P1-T12 | barqium-core route matcher reading shared-memory snapshot | done | YASSERRMD | 8c86447 | passed | SnapshotReader, find_route longest-prefix, ProxyService |
| P1-T13 | barqium-core upstream forwarder with connection pool | done | YASSERRMD | — | passed | Forwarder hyper-util legacy client, hop-by-hop strip, timeout |
| P1-T14 | barqium-policy JWT validator with JWKS cache | pending | — | — | pending | |
| P1-T15 | barqium-policy API key validator | pending | — | — | pending | |
| P1-T16 | barqium-policy sliding-window rate limiter (local) | pending | — | — | pending | |
| P1-T17 | barqium-telemetry OTLP exporter for traces and metrics | pending | — | — | pending | |
| P1-T18 | barqium-telemetry Kafka producer for telemetry.requests | pending | — | — | pending | |
| P1-T19 | docker-compose.dev.yml for local stack | pending | — | — | pending | |
| P1-T20 | End-to-end smoke test: tenant + route + traffic + telemetry | pending | — | — | pending | |

---

## Decisions Pending
_None._

---

## Blockers
_None._

---

## Recent Decisions (last 5)
- 2026-04-26: ADR-001 through ADR-005 accepted (Rust data plane, Go control plane, mmap-sync, Kafka event bus, transactional outbox, Protobuf 3).

---

## Backlog
_Nothing yet._
