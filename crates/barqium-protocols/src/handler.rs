//! Protocol handler trait — each protocol adapter implements this interface.

use bytes::Bytes;

/// The result of processing a request through a protocol handler.
#[derive(Debug)]
pub struct HandlerResponse {
    /// HTTP status code for the response.
    pub status: u16,
    /// Response headers as name–value pairs.
    pub headers: Vec<(String, String)>,
    /// Response body bytes.
    pub body: Bytes,
}

impl HandlerResponse {
    /// Create a simple 200 OK response with the given body.
    pub fn ok(body: impl Into<Bytes>) -> Self {
        Self {
            status: 200,
            headers: Vec::new(),
            body: body.into(),
        }
    }
}

/// A request passed into a [`ProtocolHandler`].
#[derive(Debug)]
pub struct HandlerRequest {
    /// HTTP method (e.g. `"POST"`).
    pub method: String,
    /// Request path.
    pub path: String,
    /// Request headers as name–value pairs.
    pub headers: Vec<(String, String)>,
    /// Request body bytes.
    pub body: Bytes,
}

/// The common interface for all protocol adapters (GraphQL, gRPC, SOAP, etc.).
///
/// Each adapter implements this trait and is registered in the gateway's
/// handler registry. The proxy service selects the appropriate handler
/// after calling [`crate::protocol::detect_protocol`].
///
/// # Async
/// The trait uses an associated `Future` pattern. Implementors should be
/// `Send + Sync` so they can be shared across tokio tasks.
pub trait ProtocolHandler: Send + Sync {
    /// Handle an inbound request and return an outbound response.
    ///
    /// # Errors
    /// Returns a `String` error description. The proxy service maps this to
    /// an appropriate HTTP 5xx response.
    fn handle<'a>(
        &'a self,
        req: HandlerRequest,
    ) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<HandlerResponse, String>> + Send + 'a>>;
}
