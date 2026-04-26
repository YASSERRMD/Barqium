# Barqium Decision Log

This file records every non-trivial architectural decision made during the build of Barqium. Each decision uses the lightweight ADR format below. Add new decisions at the bottom and reference them by ID from the tracker.

---

## ADR Template

```markdown
## ADR-NNN: <title>
**Date:** YYYY-MM-DD
**Status:** proposed | accepted | superseded by ADR-XXX | rejected
**Context:** <what is the problem or the question>
**Decision:** <what we chose to do>
**Consequences:** <what becomes true because of this choice; trade-offs>
**Alternatives considered:** <list with one-line reason each was not chosen>
```

---

## ADR-001: Use Rust for the data plane and Go for the control plane
**Date:** 2026-04-26
**Status:** accepted
**Context:** The data plane handles every customer request. It needs predictable sub-millisecond latency, no GC pauses, and high concurrent connection counts. The control plane handles operator CRUD and configuration validation; productivity and ecosystem matter more than raw latency.
**Decision:** Data plane in Rust (edition 2021, MSRV 1.75) using Tokio and hyper. Control plane in Go 1.22+ using chi router.
**Consequences:** Two language toolchains in the repo. Strong language fit for each role. Rust hot path has zero GC and zero managed-runtime overhead. Go control plane gives fast iteration on admin features.
**Alternatives considered:** All-Go (rejected: GC pauses on the hot path, see Hyperion as proof). All-Rust (rejected: slower iteration on admin/UI backend, smaller pool of developers for that layer). C++ data plane (rejected: memory safety risk, longer dev cycles).

---

## ADR-002: Use Cloudflare's mmap-sync for shared-memory configuration distribution
**Date:** 2026-04-26
**Status:** accepted
**Context:** The data plane needs sub-microsecond config lookups across multiple Rust workers on the same node. Network round trips to a config store (etcd, Redis) add hundreds of microseconds per request at high RPS.
**Decision:** Use `mmap-sync` with `rkyv` for zero-copy deserialization, backed by tmpfs at `/dev/shm/barqium/`. Snapshot compiler writes new versions; data plane workers read with wait-free guarantees.
**Consequences:** Adds `rkyv` and `mmap-sync` as workspace dependencies. Snapshot schema must be rkyv-compatible. Provides production-proven sub-microsecond reads (Cloudflare BLISS uses this in production at every request, every microsecond). Forces the snapshot compiler to be a separate process colocated with the data plane.
**Alternatives considered:** etcd watch (rejected: network round trip per lookup). Redis with subscriptions (rejected: same). Postgres LISTEN/NOTIFY (rejected: documented database-wide global lock causing production outages, see Recall.ai postmortem). In-process polling of Postgres (rejected: DB load and latency).

---

## ADR-003: Use Kafka or Redpanda as the event bus between management and operational stacks
**Date:** 2026-04-26
**Status:** accepted
**Context:** Configuration changes from the control plane need to reach the snapshot compiler with retention, replay, and ordering guarantees. The data plane also needs a destination for high-volume telemetry streams.
**Decision:** Redpanda for development (single binary, Kafka-compatible). Kafka for production. Topics: `config.changes`, `audit.operators`, `telemetry.requests`, `telemetry.llm`.
**Consequences:** Adds a stateful infrastructure component to the deployment. Provides replayable event history (90 days for config, 7 years for audit). Decouples the management stack from the operational stack completely. Telemetry can be consumed by ClickHouse, Elasticsearch, or any Kafka consumer without changing the data plane.
**Alternatives considered:** RabbitMQ (rejected: not log-structured, weaker replay semantics). Redis Streams (rejected: weaker durability and replication story for compliance topics). NATS JetStream (considered; could revisit). Direct Postgres LISTEN/NOTIFY between stacks (rejected: scalability cliff under load).

---

## ADR-004: Postgres as the authoritative configuration store with the transactional outbox pattern
**Date:** 2026-04-26
**Status:** accepted
**Context:** The control plane writes configuration. We need atomic guarantees: either both the database state and the event publish succeed, or neither does.
**Decision:** Postgres 16 holds the source of truth. Every write goes inside a transaction that also inserts a row into `event_outbox`. A background outbox-worker polls `event_outbox` and publishes to Kafka with at-least-once semantics, marking rows as sent on success.
**Consequences:** No risk of database state diverging from the event stream. Even if the API process crashes between commit and publish, the next outbox-worker run drains the queue. Adds one polling worker to the management stack.
**Alternatives considered:** Direct publish from the API after commit (rejected: lost events on crash). Two-phase commit between Postgres and Kafka (rejected: operationally fragile). Debezium CDC (considered for future; adds complexity now).

---

## ADR-005: Protobuf 3 as the wire format for events
**Date:** 2026-04-26
**Status:** accepted
**Context:** Events flow between Go (publisher) and Rust (consumer). The schema must be unambiguous, versioned, and efficient.
**Decision:** Protobuf 3 with `.proto` files in the `proto/` directory at the repo root. Both Go and Rust generate code from the same definitions. CBOR-encoded payloads inside Protobuf for entity bodies that need open-schema flexibility.
**Consequences:** Cross-language schema sharing is automatic. Schema evolution rules are well-understood. Adds a build step (protoc).
**Alternatives considered:** JSON (rejected: weaker schema enforcement, larger payloads). Avro (rejected: schema registry adds operational burden). MessagePack (rejected: weaker tooling for cross-language schemas).

---

## ADR-006: Use reqwest for outbound HTTP in Rust crates
**Date:** 2026-04-26
**Status:** accepted
**Context:** barqium-policy needs to fetch JWKS endpoints over HTTPS. Building an HTTPS client from hyper + rustls + tokio-rustls from scratch is hundreds of lines of connector code for a well-solved problem.
**Decision:** Add `reqwest 0.12` with `rustls-tls` and `json` features (no default features to avoid openssl). Used only in non-hot-path operations: JWKS refresh, webhook delivery.
**Consequences:** Adds reqwest to workspace. All hot-path request handling still uses hyper directly. reqwest is not used inside the request loop.
**Alternatives considered:** hyper + hyper-rustls directly (rejected: extra boilerplate with no benefit; reqwest wraps the same stack). ureq (rejected: blocking only, incompatible with tokio).
