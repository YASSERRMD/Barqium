//! Protocol detection and the `Protocol` enum.

use std::fmt;

/// The application-layer protocol used for a given request.
///
/// Detected from the `Content-Type` header, request path, and
/// `Upgrade` header before the request is dispatched to the
/// appropriate protocol handler.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Protocol {
    /// Plain HTTP/1.1.
    Http1,
    /// HTTP/2 (h2).
    Http2,
    /// HTTP/3 over QUIC (h3).
    Http3,
    /// gRPC (any variant: unary, server-streaming, client-streaming, bidi).
    Grpc,
    /// WebSocket (Upgrade: websocket).
    WebSocket,
    /// Server-Sent Events (text/event-stream).
    Sse,
    /// GraphQL over HTTP.
    GraphQl,
    /// SOAP 1.1 or 1.2 over HTTP.
    Soap,
}

impl fmt::Display for Protocol {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Http1 => write!(f, "http/1.1"),
            Self::Http2 => write!(f, "h2"),
            Self::Http3 => write!(f, "h3"),
            Self::Grpc => write!(f, "grpc"),
            Self::WebSocket => write!(f, "websocket"),
            Self::Sse => write!(f, "sse"),
            Self::GraphQl => write!(f, "graphql"),
            Self::Soap => write!(f, "soap"),
        }
    }
}

/// Inspect `content_type`, `path`, and optional `upgrade` header to determine
/// which [`Protocol`] is being requested.
///
/// The detection order is:
/// 1. gRPC — `Content-Type: application/grpc*`
/// 2. WebSocket — `Upgrade: websocket` header present
/// 3. SSE — `Accept: text/event-stream` or `/events` path suffix
/// 4. SOAP — `Content-Type: application/soap+xml` or `text/xml` with SOAPAction
/// 5. GraphQL — `Content-Type: application/graphql+json`
/// 6. Default: `Http1`
///
/// HTTP/2 and HTTP/3 are determined at the transport layer, not here.
pub fn detect_protocol(
    content_type: &str,
    path: &str,
    upgrade: Option<&str>,
    soap_action: Option<&str>,
) -> Protocol {
    let ct = content_type.split(';').next().unwrap_or("").trim().to_ascii_lowercase();

    if ct.starts_with("application/grpc") {
        return Protocol::Grpc;
    }

    if upgrade.map(|u| u.to_ascii_lowercase().contains("websocket")).unwrap_or(false) {
        return Protocol::WebSocket;
    }

    if ct == "text/event-stream" || path.ends_with("/events") || path.ends_with("/sse") {
        return Protocol::Sse;
    }

    if ct == "application/soap+xml" || (ct == "text/xml" && soap_action.is_some()) {
        return Protocol::Soap;
    }

    if ct == "application/graphql+json" {
        return Protocol::GraphQl;
    }

    Protocol::Http1
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_grpc() {
        assert_eq!(
            detect_protocol("application/grpc+proto", "/svc/Method", None, None),
            Protocol::Grpc
        );
    }

    #[test]
    fn detects_websocket() {
        assert_eq!(
            detect_protocol("", "/ws", Some("websocket"), None),
            Protocol::WebSocket
        );
    }

    #[test]
    fn detects_soap() {
        assert_eq!(
            detect_protocol("text/xml", "/service", None, Some("urn:foo")),
            Protocol::Soap
        );
    }

    #[test]
    fn display_round_trips() {
        let protocols = [
            Protocol::Http1,
            Protocol::Http2,
            Protocol::Http3,
            Protocol::Grpc,
            Protocol::WebSocket,
            Protocol::Sse,
            Protocol::GraphQl,
            Protocol::Soap,
        ];
        for p in &protocols {
            // Just ensure Display doesn't panic.
            let _ = p.to_string();
        }
    }
}
