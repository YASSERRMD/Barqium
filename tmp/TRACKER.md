# Barqium Build Tracker

**Last updated:** 2026-04-26 00:30 (UTC)
**Current phase:** Phase 1 — Foundation
**Current branch:** phase_1_foundation

---

## Phase Status

| Phase | Status | Branch | Started | Merged | Notes |
|---|---|---|---|---|---|
| 1 — Foundation | in_progress | phase_1_foundation | 2026-04-26 | — | 1 of 20 tasks done |
| 2 — Maturity | pending | — | — | — | scope to be expanded after P1 merge |
| 3 — AI and MCP | pending | — | — | — | scope to be expanded after P2 merge |
| 4 — Frontier | pending | — | — | — | rolling phase |

---

## Active Phase Tasks (Phase 1)

| ID | Task | Status | Owner | Commit | Test Status | Notes |
|---|---|---|---|---|---|---|
| P1-T1 | Init monorepo (Cargo workspace + Go workspace + tooling) | done | YASSERRMD | 149bb15 | passed | cargo check, fmt, clippy, go vet all clean |
| P1-T2 | Define Protobuf contracts (ConfigEvent, RouteSnapshot, AuditEvent, RequestTelemetry) | in_progress | YASSERRMD | — | pending | |
| P1-T3 | Postgres schema for tenants, routes, upstreams, consumers, policies, event_outbox | pending | — | — | pending | |
| P1-T4 | control-api bootstrap (chi router, health endpoint) | pending | — | — | pending | |
| P1-T5 | control-api tenants CRUD with validation | pending | — | — | pending | |
| P1-T6 | control-api routes CRUD with FK validation | pending | — | — | pending | |
| P1-T7 | outbox-worker that polls and publishes to Kafka | pending | — | — | pending | |
| P1-T8 | barqium-config rkyv types for the snapshot | pending | — | — | pending | |
| P1-T9 | barqium-snapshot consumer from Kafka, builds snapshot file | pending | — | — | pending | |
| P1-T10 | barqium-snapshot atomic-swap protocol on /dev/shm/barqium/ | pending | — | — | pending | |
| P1-T11 | barqium-core HTTP/1.1 listener with hyper | pending | — | — | pending | |
| P1-T12 | barqium-core route matcher reading shared-memory snapshot | pending | — | — | pending | |
| P1-T13 | barqium-core upstream forwarder with connection pool | pending | — | — | pending | |
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
