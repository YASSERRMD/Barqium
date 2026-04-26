use std::sync::Arc;
use std::time::Duration;

use dashmap::DashMap;
use tracing::{debug, warn};

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
        self.healthy.insert(upstream_id.to_string(), healthy);
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
