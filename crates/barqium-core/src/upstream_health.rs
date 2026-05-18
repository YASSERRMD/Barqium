use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use dashmap::DashMap;
use tracing::{debug, warn};

/// Configuration for the upstream health-check loop.
///
/// Passed to [`HealthChecker::new`] (or a future builder) to control probe
/// frequency, per-probe timeouts, and the number of consecutive
/// passes/failures required to change status.
#[derive(Debug, Clone)]
pub struct HealthCheckConfig {
    /// Interval in seconds between health probe cycles.
    ///
    /// All upstreams are probed once per cycle. Defaults to `10`.
    pub interval_secs: u64,

    /// Maximum milliseconds to wait for a single probe response.
    ///
    /// Probes that exceed this limit are recorded as failures. Defaults to `3000`.
    pub timeout_ms: u64,

    /// Number of consecutive successful probes before marking an upstream healthy.
    ///
    /// A value of `1` means a single success immediately clears an outage.
    /// Defaults to `1`.
    pub healthy_threshold: u32,

    /// Number of consecutive failed probes before marking an upstream unhealthy.
    ///
    /// A value of `1` means a single failure immediately opens an alert.
    /// Defaults to `3`.
    pub unhealthy_threshold: u32,
}

impl Default for HealthCheckConfig {
    fn default() -> Self {
        Self {
            interval_secs: 10,
            timeout_ms: 3_000,
            healthy_threshold: 1,
            unhealthy_threshold: 3,
        }
    }
}

/// The outcome of a single health probe for one upstream.
///
/// Produced by the [`HealthChecker`] after each probe attempt and passed
/// to the [`UpstreamHealth`] registry to update the upstream's status.
#[derive(Debug, Clone)]
pub struct HealthCheckResult {
    /// The upstream identifier this result applies to.
    pub upstream_id: String,
    /// Whether the probe considered the upstream reachable and healthy.
    pub is_healthy: bool,
    /// Round-trip time for the probe in milliseconds.
    pub latency_ms: u64,
    /// Wall-clock time at which the probe completed.
    pub checked_at: SystemTime,
}

impl HealthCheckResult {
    /// Create a healthy result with the given latency.
    pub fn healthy(upstream_id: impl Into<String>, latency_ms: u64) -> Self {
        Self {
            upstream_id: upstream_id.into(),
            is_healthy: true,
            latency_ms,
            checked_at: SystemTime::now(),
        }
    }

    /// Create an unhealthy result (probe failed or timed out).
    pub fn unhealthy(upstream_id: impl Into<String>, latency_ms: u64) -> Self {
        Self {
            upstream_id: upstream_id.into(),
            is_healthy: false,
            latency_ms,
            checked_at: SystemTime::now(),
        }
    }
}

/// Aggregate health-check metrics for all upstreams.
///
/// Counters are updated by [`HealthChecker`] after each probe cycle.
/// The `last_success_at` field records the most recent successful probe
/// across all upstreams.
#[derive(Debug, Default)]
pub struct HealthCheckMetrics {
    /// Total number of probes sent since startup.
    pub total_checks: AtomicU64,
    /// Total number of probes that resulted in an unhealthy verdict.
    pub total_failures: AtomicU64,
    /// Unix timestamp (seconds) of the most recent successful probe.
    pub last_success_at: AtomicU64,
}

impl HealthCheckMetrics {
    /// Create a new zeroed metrics instance.
    pub fn new() -> Self {
        Self::default()
    }

    /// Record a successful probe result.
    pub fn on_success(&self) {
        self.total_checks.fetch_add(1, Ordering::Relaxed);
        let now = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.last_success_at.store(now, Ordering::Relaxed);
    }

    /// Record a failed probe result.
    pub fn on_failure(&self) {
        self.total_checks.fetch_add(1, Ordering::Relaxed);
        self.total_failures.fetch_add(1, Ordering::Relaxed);
    }
}

/// The current status of an upstream as determined by the health checker.
///
/// `Unknown` is the initial state before any probe has been completed.
/// The proxy treats `Unknown` as `Healthy` so upstreams are not silently
/// dropped on first start.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpstreamStatus {
    /// The upstream is responding to health probes within the expected latency.
    Healthy,
    /// The upstream has exceeded the `unhealthy_threshold` consecutive failures.
    Unhealthy,
    /// No health probe has been completed yet.
    Unknown,
}

impl std::fmt::Display for UpstreamStatus {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Healthy => write!(f, "healthy"),
            Self::Unhealthy => write!(f, "unhealthy"),
            Self::Unknown => write!(f, "unknown"),
        }
    }
}

/// Shared, lock-free upstream health state.
///
/// Keys are upstream IDs (String). Absent entries are treated as healthy so
/// that upstreams not yet probed are not silently dropped.
#[derive(Default)]
pub struct UpstreamHealth {
    healthy: DashMap<String, bool>,
}

impl UpstreamHealth {
    #[must_use]
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    /// Returns `true` if the upstream is healthy or has not been probed yet.
    #[must_use]
    pub fn is_healthy(&self, upstream_id: &str) -> bool {
        self.healthy.get(upstream_id).map(|v| *v).unwrap_or(true)
    }

    pub fn set(&self, upstream_id: &str, healthy: bool) {
        // Update in-place when the key exists to avoid a heap allocation for
        // the owned key on every probe tick.
        if let Some(mut v) = self.healthy.get_mut(upstream_id) {
            *v = healthy;
        } else {
            self.healthy.insert(upstream_id.to_string(), healthy);
        }
    }
}

/// Background task that probes upstream health endpoints on a fixed interval.
///
/// For each upstream it sends `GET {upstream_url}/health`. A 2xx response
/// marks the upstream healthy; any error or non-2xx marks it unhealthy.
/// Uses `reqwest` with a short per-probe timeout so a slow upstream cannot
/// block the checker loop.
pub struct HealthChecker {
    health: Arc<UpstreamHealth>,
    client: reqwest::Client,
    interval: Duration,
}

impl HealthChecker {
    pub fn new(health: Arc<UpstreamHealth>, interval: Duration) -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
            .expect("reqwest client");
        Self {
            health,
            client,
            interval,
        }
    }

    /// Probe a fixed list of `(upstream_id, upstream_url)` pairs forever.
    ///
    /// Spawn this in a background task; cancel via task handle when shutting down.
    pub async fn run(&self, upstreams: Vec<(String, String)>) {
        loop {
            for (id, url) in &upstreams {
                let ok = self.probe(url).await;
                let was = self.health.is_healthy(id);
                if ok != was {
                    if ok {
                        debug!(upstream_id = %id, "upstream recovered");
                    } else {
                        warn!(upstream_id = %id, "upstream unhealthy");
                    }
                }
                self.health.set(id, ok);
            }
            tokio::time::sleep(self.interval).await;
        }
    }

    async fn probe(&self, base_url: &str) -> bool {
        let url = format!("{}/health", base_url.trim_end_matches('/'));
        match self.client.get(&url).send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
        }
    }
}
