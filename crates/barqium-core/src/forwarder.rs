use std::time::Duration;

use bytes::Bytes;
use http::{HeaderMap, HeaderValue};
use http_body_util::{combinators::BoxBody, BodyExt, Full};
use hyper::body::Incoming;
use hyper::{Request, Response, Uri};
use hyper_util::client::legacy::{connect::HttpConnector, Client};
use hyper_util::rt::TokioExecutor;

use crate::error::ProxyError;
use crate::grpc::is_grpc;
use crate::snapshot::RouteMatch;

// Hop-by-hop headers stripped before forwarding.
const HOP_BY_HOP: &[&str] = &[
    "connection",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "proxy-authenticate",
    "proxy-authorization",
    "keep-alive",
];

/// Connection-pooled HTTP client for upstream requests.
///
/// gRPC requests (content-type: application/grpc*) have their request version
/// set to HTTP/2 so the pool selects an h2 connection when the upstream
/// supports it (via ALPN on TLS or h2c negotiation on plain TCP).
#[derive(Clone)]
pub struct Forwarder {
    client: Client<HttpConnector, Incoming>,
}

impl Forwarder {
    #[must_use]
    pub fn new() -> Self {
        let client = Client::builder(TokioExecutor::new()).build(HttpConnector::new());
        Self { client }
    }

    /// Forwards `req` to the upstream in `route`.
    ///
    /// Strips hop-by-hop headers, rewrites the URI, and enforces the per-route
    /// timeout. For gRPC requests the request version is pinned to HTTP/2.
    pub async fn forward(
        &self,
        mut req: Request<Incoming>,
        route: &RouteMatch,
    ) -> Result<Response<BoxBody<Bytes, ProxyError>>, ProxyError> {
        if is_grpc(req.headers()) {
            *req.version_mut() = hyper::Version::HTTP_2;
        }

        *req.uri_mut() = build_upstream_uri(route.upstream_url.as_str(), req.uri())?;
        strip_hop_by_hop(req.headers_mut());

        let timeout = Duration::from_millis(route.timeout_ms as u64);

        let resp = tokio::time::timeout(timeout, self.client.request(req))
            .await
            .map_err(|_| ProxyError::UpstreamTimeout)?
            .map_err(ProxyError::UpstreamRequest)?;

        Ok(resp.map(|body| body.map_err(ProxyError::UpstreamBody).boxed()))
    }
}

impl Default for Forwarder {
    fn default() -> Self {
        Self::new()
    }
}

/// Builds the upstream URI by appending the original path+query to the base URL.
fn build_upstream_uri(upstream_url: &str, original: &Uri) -> Result<Uri, ProxyError> {
    let base = upstream_url.trim_end_matches('/');
    let pq = original
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/");
    format!("{base}{pq}")
        .parse::<Uri>()
        .map_err(|e| ProxyError::Snapshot(format!("invalid upstream URI: {e}")))
}

fn strip_hop_by_hop(headers: &mut HeaderMap<HeaderValue>) {
    for name in HOP_BY_HOP {
        headers.remove(*name);
    }
}

/// Returns a plain-text error response body.
#[must_use]
pub fn error_body(msg: &str) -> BoxBody<Bytes, ProxyError> {
    let bytes = Bytes::copy_from_slice(msg.as_bytes());
    Full::new(bytes).map_err(|_| unreachable!()).boxed()
}
