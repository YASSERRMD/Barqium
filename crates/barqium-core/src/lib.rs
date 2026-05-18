//! Barqium proxy runtime: HTTP/1.1 + HTTP/2 listener, route matcher, upstream forwarder.

pub mod circuit_breaker;
pub mod config;
pub mod error;
pub mod forwarder;
pub mod grpc;
pub mod health;
pub mod listener;
pub mod quic;
pub mod service;
pub mod snapshot;
pub mod sse;
pub mod tls;
pub mod upstream_health;
pub mod websocket;

pub use circuit_breaker::{
    CircuitBreakerConfig, CircuitBreakerEvent, CircuitBreakerMetrics, CircuitBreakerRegistry,
    CircuitState,
};
pub use config::DataPlaneConfig;
pub use error::ProxyError;
pub use quic::{
    alt_svc_header_value, inject_alt_svc, quic_connection_migration_supported,
    Http3Frame, QuicConfig, QuicConnectionPool, QuicHealthCheck, QuicMetrics,
};
pub use service::ProxyService;
pub use snapshot::{RouteMatch, SnapshotReader};
pub use upstream_health::{
    HealthCheckConfig, HealthCheckMetrics, HealthCheckResult, HealthChecker, UpstreamHealth,
    UpstreamStatus,
};
