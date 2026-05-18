//! Protocol adapters: HTTP/1, HTTP/2, gRPC, WebSocket, SSE, MCP, GraphQL, SOAP.

pub mod graphql;
pub mod handler;
pub mod protocol;
pub mod soap;

use std::sync::atomic::{AtomicU64, Ordering};

/// Per-protocol request counters for the current gateway instance.
///
/// Counters are keyed by [`protocol::Protocol`] variant. Each counter
/// uses relaxed atomics; they are intended for monitoring only and do
/// not participate in any synchronisation protocol.
#[derive(Debug, Default)]
pub struct ProtocolMetrics {
    /// Number of requests handled over plain HTTP/1.1.
    pub http1_requests: AtomicU64,
    /// Number of requests handled over HTTP/2.
    pub http2_requests: AtomicU64,
    /// Number of requests handled over HTTP/3 (QUIC).
    pub http3_requests: AtomicU64,
    /// Number of gRPC calls handled.
    pub grpc_requests: AtomicU64,
    /// Number of WebSocket upgrade requests handled.
    pub websocket_requests: AtomicU64,
    /// Number of Server-Sent Events streams opened.
    pub sse_requests: AtomicU64,
    /// Number of GraphQL operations handled.
    pub graphql_requests: AtomicU64,
    /// Number of SOAP requests handled.
    pub soap_requests: AtomicU64,
}

impl ProtocolMetrics {
    /// Create a new zeroed metrics instance.
    pub fn new() -> Self {
        Self::default()
    }

    /// Increment the counter for the given protocol.
    pub fn record(&self, protocol: &protocol::Protocol) {
        let counter = match protocol {
            protocol::Protocol::Http1 => &self.http1_requests,
            protocol::Protocol::Http2 => &self.http2_requests,
            protocol::Protocol::Http3 => &self.http3_requests,
            protocol::Protocol::Grpc => &self.grpc_requests,
            protocol::Protocol::WebSocket => &self.websocket_requests,
            protocol::Protocol::Sse => &self.sse_requests,
            protocol::Protocol::GraphQl => &self.graphql_requests,
            protocol::Protocol::Soap => &self.soap_requests,
        };
        counter.fetch_add(1, Ordering::Relaxed);
    }
}

pub use graphql::{detect as detect_graphql, GraphQlError, GraphQlInfo, GraphQlQuery, GraphQlResponse, OperationType, PersistedQueryStore};
pub use handler::ProtocolHandler;
pub use protocol::{detect_protocol, Protocol};
pub use soap::{parse_soap_action, wrap_fault, SoapEnvelope, SoapFault, SoapVersion};
