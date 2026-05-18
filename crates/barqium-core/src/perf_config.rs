//! Performance tuning configuration for the Barqium data plane.
//!
//! Use [`PerformanceConfig`] to configure Tokio worker threads, blocking
//! thread pool size, and socket-level buffer sizes. Use [`ConnectionPoolConfig`]
//! to tune the upstream HTTP connection pool.

/// Configuration for the upstream HTTP connection pool.
///
/// The connection pool is shared across all upstreams (unless per-upstream
/// pooling is enabled). Tuning `max_idle_per_host` can dramatically reduce
/// connection setup latency under sustained load.
#[derive(Debug, Clone)]
pub struct ConnectionPoolConfig {
    /// Maximum number of idle keep-alive connections per upstream host.
    ///
    /// Setting this too low causes connection churn; too high wastes file
    /// descriptors. Defaults to `10`.
    pub max_idle_per_host: usize,

    /// Maximum total number of connections (idle + active) in the pool.
    ///
    /// Set to `0` to disable the global cap. Defaults to `1024`.
    pub max_total_connections: usize,

    /// Idle timeout in seconds: connections unused for this long are closed.
    ///
    /// Prevents stale connections to upstreams that have closed their end.
    /// Defaults to `90` seconds.
    pub idle_timeout_secs: u64,
}

impl Default for ConnectionPoolConfig {
    fn default() -> Self {
        Self {
            max_idle_per_host: 10,
            max_total_connections: 1024,
            idle_timeout_secs: 90,
        }
    }
}

impl ConnectionPoolConfig {
    /// Create a pool config suitable for a high-throughput production service.
    pub fn high_throughput() -> Self {
        Self {
            max_idle_per_host: 50,
            max_total_connections: 4096,
            idle_timeout_secs: 30,
        }
    }
}

/// Low-level performance tuning parameters for the Tokio runtime and OS sockets.
///
/// These values are read at startup and passed to the Tokio runtime builder
/// and the `socket2` socket construction path.
///
/// # Defaults
/// All defaults target a production deployment on a host with 4–8 vCPUs and
/// a 10 Gbit NIC. Adjust `worker_threads` to `num_cpu::get()` for optimal
/// single-socket throughput.
#[derive(Debug, Clone)]
pub struct PerformanceConfig {
    /// Number of Tokio worker threads (async executor).
    ///
    /// Defaults to `0`, which lets Tokio use `num_cpus::get()` at runtime.
    /// Pin to a specific value when running in a cgroup with CPU quota.
    pub worker_threads: usize,

    /// Number of threads in the Tokio blocking thread pool.
    ///
    /// Blocking tasks (file I/O, DNS resolution) are dispatched here.
    /// Defaults to `512` — the Tokio default. Lower to reduce memory when
    /// running in resource-constrained environments.
    pub blocking_threads: usize,

    /// OS socket receive buffer size in bytes.
    ///
    /// Passed to `SO_RCVBUF`. A larger buffer absorbs burst traffic without
    /// dropping packets. Defaults to `2 MiB` (`2 * 1024 * 1024`).
    pub socket_recv_buffer_bytes: usize,

    /// OS socket send buffer size in bytes.
    ///
    /// Passed to `SO_SNDBUF`. Defaults to `2 MiB` (`2 * 1024 * 1024`).
    pub socket_send_buffer_bytes: usize,

    /// Enable `TCP_NODELAY` on accepted connections.
    ///
    /// Disables Nagle's algorithm to reduce latency for small payloads.
    /// Should be `true` for a low-latency API gateway. Defaults to `true`.
    pub tcp_nodelay: bool,
}

impl Default for PerformanceConfig {
    fn default() -> Self {
        Self {
            worker_threads: 0,
            blocking_threads: 512,
            socket_recv_buffer_bytes: 2 * 1024 * 1024,
            socket_send_buffer_bytes: 2 * 1024 * 1024,
            tcp_nodelay: true,
        }
    }
}

impl PerformanceConfig {
    /// Create a config with defaults suitable for production deployments.
    pub fn production() -> Self {
        Self::default()
    }

    /// Create a config tuned for development / local testing (fewer threads).
    pub fn development() -> Self {
        Self {
            worker_threads: 2,
            blocking_threads: 16,
            socket_recv_buffer_bytes: 64 * 1024,
            socket_send_buffer_bytes: 64 * 1024,
            tcp_nodelay: true,
        }
    }
}
