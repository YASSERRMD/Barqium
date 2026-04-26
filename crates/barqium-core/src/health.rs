use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use bytes::Bytes;
use http::StatusCode;
use http_body_util::combinators::BoxBody;
use hyper::body::Incoming;
use hyper::{Request, Response};
use hyper_util::rt::{TokioExecutor, TokioIo};
use hyper_util::server::conn::auto::Builder as AutoBuilder;
use tokio::net::TcpListener;
use tracing::info;

use crate::error::ProxyError;
use crate::forwarder::error_body;

/// Shared readiness state for blue-green rollout.
///
/// When `draining` is `true` the health endpoint returns 503 so the load
/// balancer removes this instance from the pool before the process exits.
#[derive(Default)]
pub struct HealthState {
    draining: AtomicBool,
}

impl HealthState {
    #[must_use]
    pub fn new() -> Arc<Self> {
        Arc::new(Self {
            draining: AtomicBool::new(false),
        })
    }

    /// Returns `true` when the process is accepting traffic.
    pub fn is_ready(&self) -> bool {
        !self.draining.load(Ordering::Acquire)
    }

    /// Signals that the process is draining and should no longer receive traffic.
    pub fn start_drain(&self) {
        self.draining.store(true, Ordering::Release);
        info!("health: drain started; health endpoint will return 503");
    }
}

/// Serves a minimal `/health` (readiness) and `/livez` (liveness) endpoint
/// on `addr`. Runs until the task is cancelled.
///
/// - `/health` and `/readyz`: 200 when ready, 503 when draining.
/// - `/livez`: always 200 (liveness — the process is alive).
pub async fn serve_health(addr: &str, state: Arc<HealthState>) -> Result<(), ProxyError> {
    let listener = TcpListener::bind(addr)
        .await
        .map_err(|e| ProxyError::Bind {
            addr: addr.to_string(),
            source: e,
        })?;

    info!(addr, "health endpoint started");

    let builder = AutoBuilder::new(TokioExecutor::new());

    loop {
        let (stream, _peer) = listener.accept().await.map_err(ProxyError::Accept)?;
        let io = TokioIo::new(stream);
        let state = state.clone();
        let builder = builder.clone();

        tokio::spawn(async move {
            let svc = hyper::service::service_fn(move |req: Request<Incoming>| {
                let state = state.clone();
                async move {
                    let path = req.uri().path();
                    let resp: Response<BoxBody<Bytes, ProxyError>> = match path {
                        "/livez" => Response::builder()
                            .status(StatusCode::OK)
                            .header("content-type", "text/plain")
                            .body(error_body("ok\n"))
                            .expect("static response"),
                        _ => {
                            if state.is_ready() {
                                Response::builder()
                                    .status(StatusCode::OK)
                                    .header("content-type", "text/plain")
                                    .body(error_body("ready\n"))
                                    .expect("static response")
                            } else {
                                Response::builder()
                                    .status(StatusCode::SERVICE_UNAVAILABLE)
                                    .header("content-type", "text/plain")
                                    .body(error_body("draining\n"))
                                    .expect("static response")
                            }
                        }
                    };
                    Ok::<_, std::convert::Infallible>(resp)
                }
            });

            let _ = builder.serve_connection(io, svc).await;
        });
    }
}

/// Waits for SIGTERM and then begins the drain sequence.
///
/// 1. Calls `state.start_drain()` so the health endpoint starts returning 503.
/// 2. Sleeps for `drain_secs` to allow the load balancer to remove this node.
/// 3. Returns so the caller can initiate a graceful shutdown.
pub async fn wait_for_drain(state: Arc<HealthState>, drain_secs: u64) {
    #[cfg(unix)]
    {
        use tokio::signal::unix::{signal, SignalKind};
        let mut sigterm =
            signal(SignalKind::terminate()).expect("failed to install SIGTERM handler");
        tokio::select! {
            _ = sigterm.recv() => {
                info!("SIGTERM received");
            }
            _ = tokio::signal::ctrl_c() => {
                info!("SIGINT received");
            }
        }
    }
    #[cfg(not(unix))]
    {
        let _ = tokio::signal::ctrl_c().await;
        info!("SIGINT received");
    }

    state.start_drain();
    info!(drain_secs, "waiting for connections to drain");
    tokio::time::sleep(Duration::from_secs(drain_secs)).await;
}
