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
