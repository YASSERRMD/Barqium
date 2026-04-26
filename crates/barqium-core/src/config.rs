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
    /// PEM path for the server TLS certificate chain. Empty = plain TCP.
    pub tls_cert: String,
    /// PEM path for the server TLS private key. Empty = plain TCP.
    pub tls_key: String,
    /// PEM path for a CA bundle used to verify client certificates (mTLS).
    /// Empty = client certs not required even when TLS is active.
    pub tls_client_ca: String,
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
            tls_cert: env::var("TLS_CERT").unwrap_or_default(),
            tls_key: env::var("TLS_KEY").unwrap_or_default(),
            tls_client_ca: env::var("TLS_CLIENT_CA").unwrap_or_default(),
        }
    }

    /// Returns `true` when the TLS cert + key are both configured.
    pub fn tls_enabled(&self) -> bool {
        !self.tls_cert.is_empty() && !self.tls_key.is_empty()
    }

    /// Returns `true` when mTLS (client certificate verification) is enabled.
    pub fn mtls_enabled(&self) -> bool {
        self.tls_enabled() && !self.tls_client_ca.is_empty()
    }
}
