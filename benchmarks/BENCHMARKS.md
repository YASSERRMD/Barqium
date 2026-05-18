# Barqium Benchmarks

This directory contains [Criterion](https://bheisler.github.io/criterion.rs/book/)
micro-benchmarks for the Barqium data plane. Benchmarks target hot-path code
such as route matching, rate limiting, and snapshot deserialization.

## Running benchmarks

```bash
# Run all benchmarks (HTML report written to target/criterion/)
cargo bench

# Run a specific benchmark by name pattern
cargo bench -- route_matcher

# Run with a custom sample count (useful for CI)
cargo bench -- --sample-size 20
```

After a run, open `target/criterion/report/index.html` in a browser to view
interactive plots and statistical summaries.

## Benchmark inventory

| File | Benchmark name | What it measures |
|---|---|---|
| _(placeholder)_ | `route_matcher/linear` | Linear scan route lookup on a 100-route table |
| _(placeholder)_ | `route_matcher/radix` | Radix-tree lookup on a 1 000-route table |
| _(placeholder)_ | `rate_limiter/local` | In-process sliding-window rate limiter throughput |
| _(placeholder)_ | `snapshot/deserialize` | rkyv snapshot deserialization from memory |
| _(placeholder)_ | `snapshot/route_read` | Route lookup after zero-copy mmap snapshot swap |
| _(placeholder)_ | `policy/jwt_validate` | JWT HS256 validation including claim verification |
| _(placeholder)_ | `policy/pii_redact` | PII redaction on a 4 kB JSON payload |
| _(placeholder)_ | `quic/alt_svc_header` | `alt_svc_header_value()` string formatting |

## Comparing across commits

Criterion automatically stores baseline statistics in
`target/criterion/<benchmark>/base/`. To compare the current run against
the last baseline:

```bash
cargo bench -- --baseline base
```

To save the current run as the new baseline:

```bash
cargo bench -- --save-baseline base
```

## CI integration

Benchmarks are run in CI with `--sample-size 20` to keep wall-clock time
under two minutes. A performance regression alert is triggered when the
95th-percentile latency increases by more than 20% compared to the
`main` branch baseline.

## Adding a new benchmark

1. Create `benchmarks/<name>.rs`.
2. Add the following to the containing crate's `Cargo.toml`:

```toml
[[bench]]
name = "<name>"
harness = false
```

3. Implement the benchmark using the `criterion` crate:

```rust
use criterion::{criterion_group, criterion_main, Criterion};

fn my_benchmark(c: &mut Criterion) {
    c.bench_function("my_fn", |b| b.iter(|| my_fn()));
}

criterion_group!(benches, my_benchmark);
criterion_main!(benches);
```
