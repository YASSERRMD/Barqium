use std::env;

/// Runtime configuration for the Barqium data plane.
#[derive(Debug, Clone)]
pub struct DataPlaneConfig {
    /// Address to bind the HTTP listener, e.g. "0.0.0.0:8000".
    pub listen_addr: String,
    /// Directory where snapshot files are read from.
    pub snapshot_dir: String,
    /// Number of tokio worker threads (0 = number of CPUs).
    pub worker_threads: usize,
}

impl DataPlaneConfig {
    pub fn from_env() -> Self {
        Self {
            listen_addr: env::var("LISTEN_ADDR").unwrap_or_else(|_| "0.0.0.0:8000".into()),
            snapshot_dir: env::var("SNAPSHOT_DIR").unwrap_or_else(|_| "/dev/shm/barqium".into()),
            worker_threads: env::var("WORKER_THREADS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0),
        }
    }
}
