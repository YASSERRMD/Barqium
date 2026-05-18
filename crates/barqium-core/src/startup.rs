//! Startup timing and feature enumeration.
//!
//! [`StartupMetrics`] is populated during gateway initialisation and exposed
//! via the `/health` endpoint so monitoring systems can track cold-start
//! latency regressions across deployments.

use std::time::Instant;

/// Timing and capability information recorded during gateway startup.
///
/// Populate this struct during `main()` initialisation and expose it via
/// the `/readyz` endpoint so orchestrators can verify the gateway started
/// within an expected time budget.
#[derive(Debug, Clone)]
pub struct StartupMetrics {
    /// Wall-clock time from process start to the first accepted connection, in ms.
    pub startup_time_ms: u64,

    /// Names of optional Cargo features that were compiled in.
    ///
    /// Used by monitoring dashboards to confirm the correct build variant
    /// is deployed. Example: `["full", "aws-lc"]` or `["edge"]`.
    pub features_enabled: Vec<String>,

    /// The instant at which the [`StartupMetrics`] was created.
    #[allow(dead_code)]
    started_at: Instant,
}

impl StartupMetrics {
    /// Begin recording startup metrics.
    ///
    /// Call this at the very start of `main()` to capture the cold-start
    /// instant. Call [`finish`](Self::finish) once the listener is bound.
    pub fn begin() -> StartupMetricsBuilder {
        StartupMetricsBuilder {
            started_at: Instant::now(),
            features_enabled: Self::detect_features(),
        }
    }

    /// Returns the list of active Cargo features based on compile-time `cfg!` checks.
    fn detect_features() -> Vec<String> {
        let mut features = Vec::new();
        if cfg!(feature = "edge") { features.push("edge".into()); }
        if cfg!(feature = "full") { features.push("full".into()); }
        if cfg!(feature = "aws-lc") { features.push("aws-lc".into()); }
        if cfg!(feature = "xdp") { features.push("xdp".into()); }
        if cfg!(feature = "quic-migration") { features.push("quic-migration".into()); }
        features
    }
}

/// Builder for [`StartupMetrics`] — captures timing from construction to finish.
#[derive(Debug)]
pub struct StartupMetricsBuilder {
    started_at: Instant,
    features_enabled: Vec<String>,
}

impl StartupMetricsBuilder {
    /// Finalise the metrics once the gateway is ready to accept traffic.
    pub fn finish(self) -> StartupMetrics {
        StartupMetrics {
            startup_time_ms: self.started_at.elapsed().as_millis() as u64,
            features_enabled: self.features_enabled,
            started_at: self.started_at,
        }
    }
}
