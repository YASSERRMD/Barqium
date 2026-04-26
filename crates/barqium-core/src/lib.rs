//! Barqium proxy runtime: HTTP/1.1 + HTTP/2 listener, route matcher, upstream forwarder.

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
pub mod websocket;

pub use config::DataPlaneConfig;
pub use error::ProxyError;
pub use service::ProxyService;
pub use snapshot::{RouteMatch, SnapshotReader};
