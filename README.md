# Barqium

Lightning balanced. The universal gateway for the agentic era.

**Owner:** Mohamed Yasser | Solutions Architect

## Architecture

| Layer | Technology | Role |
|---|---|---|
| Data plane | Rust + Tokio + hyper | Sub-millisecond request proxying |
| Control plane | Go + chi + Postgres | Operator configuration management |
| Event bus | Redpanda / Kafka | Config changes, audit, telemetry |
| Shared memory | mmap-sync + rkyv | Sub-microsecond config lookups |
| Admin panel | React + Vite + Tailwind | Operator web interface |

## Quick start

```bash
make bootstrap
docker compose -f deploy/docker-compose.dev.yml up
```

## Repository layout

```
crates/         Rust workspace (data plane)
services/       Go services (control plane)
ui/admin/       React admin panel
proto/          Protobuf contracts (cross-language)
deploy/         Docker Compose, Kubernetes, Helm
docs/           Architecture and operational docs
benchmarks/     Criterion benchmarks
```

See `docs/architecture/` for the full design.

**License:** Apache 2.0
