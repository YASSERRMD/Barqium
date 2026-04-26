use std::future::Future;
use std::net::SocketAddr;
use std::pin::Pin;
use std::sync::Arc;

use hyper::body::Incoming;
use hyper::server::conn::http1;
use hyper::service::Service;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use tokio::net::TcpListener;
use tracing::info;

use crate::error::ProxyError;

/// Binds a TCP socket and serves HTTP/1.1 connections using the provided service.
///
/// The service is cloned for each accepted connection and run on a dedicated
/// tokio task. Connections that fail the HTTP/1.1 handshake are logged and
/// discarded.
pub async fn serve<S, B>(addr: &str, service: S) -> Result<(), ProxyError>
where
    S: Service<Request<Incoming>, Response = Response<B>> + Clone + Send + 'static,
    S::Error: Into<Box<dyn std::error::Error + Send + Sync>>,
    S::Future: Send + 'static,
    B: hyper::body::Body + Send + 'static,
    B::Data: Send,
    B::Error: Into<Box<dyn std::error::Error + Send + Sync>>,
{
    let listener = TcpListener::bind(addr)
        .await
        .map_err(|e| ProxyError::Bind {
            addr: addr.to_string(),
            source: e,
        })?;

    let local_addr = listener
        .local_addr()
        .expect("bound socket always has a local address");
    info!(addr = %local_addr, "HTTP/1.1 listener started");

    loop {
        let (stream, peer) = listener.accept().await.map_err(ProxyError::Accept)?;

        let io = TokioIo::new(stream);
        let svc = service.clone();

        tokio::spawn(async move {
            let conn = http1::Builder::new().serve_connection(io, svc);
            if let Err(e) = conn.await {
                // Disconnects and partial requests are common; log at debug.
                tracing::debug!(peer = %peer, "connection closed: {e}");
            }
        });
    }
}

/// A minimal placeholder service used until the route matcher and upstream
/// forwarder are wired in (P1-T12, P1-T13).
#[derive(Clone)]
pub struct PlaceholderService;

impl Service<Request<Incoming>> for PlaceholderService {
    type Response = Response<http_body_util::Full<bytes::Bytes>>;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn call(&self, _req: Request<Incoming>) -> Self::Future {
        use bytes::Bytes;
        use http_body_util::Full;

        Box::pin(async {
            let body = Full::new(Bytes::from_static(
                b"barqium: route matcher not yet loaded\n",
            ));
            let resp = Response::builder()
                .status(503)
                .header("content-type", "text/plain")
                .body(body)
                .expect("static response is always valid");
            Ok(resp)
        })
    }
}

/// Convenience alias for a boxed, type-erased peer address.
pub type PeerAddr = Arc<SocketAddr>;
