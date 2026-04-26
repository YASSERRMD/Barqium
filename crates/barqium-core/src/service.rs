use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

use bytes::Bytes;
use http::StatusCode;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use tokio::sync::Mutex;
use tracing::debug;

use crate::error::ProxyError;
use crate::forwarder::{error_body, Forwarder};
use crate::snapshot::SnapshotReader;

/// Full proxy service: reads the snapshot, matches the route, forwards to
/// the upstream, and returns the response.
#[derive(Clone)]
pub struct ProxyService {
    reader: Arc<Mutex<SnapshotReader>>,
    forwarder: Arc<Forwarder>,
}

impl ProxyService {
    #[must_use]
    pub fn new(snapshot_dir: &str, tenant_id: &str) -> Self {
        Self {
            reader: Arc::new(Mutex::new(SnapshotReader::open(snapshot_dir, tenant_id))),
            forwarder: Arc::new(Forwarder::new()),
        }
    }
}

impl hyper::service::Service<Request<Incoming>> for ProxyService {
    type Response = Response<BoxBody<Bytes, ProxyError>>;
    type Error = std::convert::Infallible;
    type Future = Pin<Box<dyn Future<Output = Result<Self::Response, Self::Error>> + Send>>;

    fn call(&self, req: Request<Incoming>) -> Self::Future {
        let reader = self.reader.clone();
        let forwarder = self.forwarder.clone();

        Box::pin(async move {
            let method = req.method().as_str().to_uppercase();
            let path = req.uri().path().to_owned();
            let host = req
                .headers()
                .get(hyper::header::HOST)
                .and_then(|v| v.to_str().ok())
                .unwrap_or("")
                .to_owned();

            // Route lookup: lock briefly, then release before I/O.
            let route_match = {
                let mut guard = reader.lock().await;
                match guard.match_route(&method, &path, &host) {
                    Ok(Some(m)) => m,
                    Ok(None) => {
                        return Ok(status_response(StatusCode::NOT_FOUND, "no route matched\n"))
                    }
                    Err(e) => {
                        tracing::warn!(method, path, "snapshot read error: {e}");
                        return Ok(status_response(
                            StatusCode::SERVICE_UNAVAILABLE,
                            "snapshot unavailable\n",
                        ));
                    }
                }
            };

            debug!(
                method,
                path,
                route_id = %route_match.route_id,
                upstream = %route_match.upstream_url,
                "route matched"
            );

            match forwarder.forward(req, &route_match).await {
                Ok(resp) => Ok(resp),
                Err(e) => {
                    tracing::warn!(upstream = %route_match.upstream_url, "upstream error: {e}");
                    Ok(status_response(StatusCode::BAD_GATEWAY, "upstream error\n"))
                }
            }
        })
    }
}

fn status_response(status: StatusCode, body: &'static str) -> Response<BoxBody<Bytes, ProxyError>> {
    Response::builder()
        .status(status)
        .header("content-type", "text/plain")
        .body(error_body(body))
        .expect("static response is always valid")
}
