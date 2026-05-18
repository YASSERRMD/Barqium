//! WASM plugin runtime for Barqium: wasmtime host, hot-reload watcher.

pub mod config;
pub mod error;
pub mod host;
pub mod host_functions;
pub mod hot_reload;
pub mod registry;
pub mod runtime;
pub mod sandbox;
pub mod trigger;
pub mod types;
pub mod version;
pub mod watcher;

use std::sync::atomic::{AtomicU64, Ordering};

/// Per-plugin runtime metrics.
///
/// Each plugin instance carries one of these to record invocation
/// counts, error counts and cumulative execution time without locking.
#[derive(Debug, Default)]
pub struct PluginMetrics {
    /// Total number of times this plugin has been invoked.
    pub invocation_count: AtomicU64,
    /// Number of invocations that returned an error.
    pub error_count: AtomicU64,
    /// Cumulative wall-clock execution time in microseconds.
    pub total_duration_us: AtomicU64,
}

impl PluginMetrics {
    /// Create a new zeroed metrics instance.
    pub fn new() -> Self {
        Self::default()
    }

    /// Record one successful invocation that took `duration_us` microseconds.
    pub fn record_success(&self, duration_us: u64) {
        self.invocation_count.fetch_add(1, Ordering::Relaxed);
        self.total_duration_us
            .fetch_add(duration_us, Ordering::Relaxed);
    }

    /// Record one failed invocation that took `duration_us` microseconds.
    pub fn record_error(&self, duration_us: u64) {
        self.invocation_count.fetch_add(1, Ordering::Relaxed);
        self.error_count.fetch_add(1, Ordering::Relaxed);
        self.total_duration_us
            .fetch_add(duration_us, Ordering::Relaxed);
    }

    /// Return the average execution time in microseconds, or `0` if never called.
    pub fn avg_duration_us(&self) -> u64 {
        let count = self.invocation_count.load(Ordering::Relaxed);
        if count == 0 {
            return 0;
        }
        self.total_duration_us.load(Ordering::Relaxed) / count
    }
}

pub use config::PluginConfig;
pub use error::{PluginError, WasmError};
pub use host_functions::HostFunctions;
pub use hot_reload::HotReloadWatcher;
pub use registry::{PluginEntry, PluginRegistry};
pub use runtime::PluginRuntime;
pub use sandbox::PluginSandbox;
pub use trigger::PluginTrigger;
pub use types::{Action, RequestContext, ResponseContext};
pub use version::{version_from_str, PluginVersion};
pub use watcher::spawn_watcher;
