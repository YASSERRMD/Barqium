use bytes::Bytes;
use http::{HeaderMap, StatusCode};
use http_body_util::{combinators::BoxBody, BodyExt, Empty};
use hyper::body::Incoming;
use hyper::header::{CONNECTION, UPGRADE};
use hyper::{Request, Response, Uri};
use hyper_util::rt::TokioIo;
use std::time::Duration;
use tokio::io::copy_bidirectional;
use tokio::net::TcpStream;

use crate::error::ProxyError;

/// Returns `true` when the request is an HTTP/1.1 WebSocket upgrade.
pub fn is_websocket_upgrade(headers: &HeaderMap) -> bool {
    let upgrade_is_ws = headers
        .get(UPGRADE)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.eq_ignore_ascii_case("websocket"))
        .unwrap_or(false);

    let connection_has_upgrade = headers
        .get(CONNECTION)
        .and_then(|v| v.to_str().ok())
        .map(|v| v.to_ascii_lowercase().contains("upgrade"))
        .unwrap_or(false);

    upgrade_is_ws && connection_has_upgrade
}

/// Proxies a WebSocket upgrade to the upstream.
///
/// Steps:
/// 1. Extract the downstream upgrade future from `req`.
/// 2. Open a direct TCP connection to the upstream.
/// 3. Perform the HTTP/1.1 handshake and forward the upgrade request.
/// 4. On 101 from upstream: return 101 to the client.
/// 5. Spawn a task that splices both upgraded streams bidirectionally.
pub async fn proxy_websocket(
    mut req: Request<Incoming>,
    upstream_url: &str,
    timeout_ms: u32,
) -> Result<Response<BoxBody<Bytes, ProxyError>>, ProxyError> {
    // Extract the downstream upgrade future while req is still accessible.
    let downstream_upgrade = hyper::upgrade::on(&mut req);

    let uri: Uri = upstream_url
        .parse()
        .map_err(|e| ProxyError::Snapshot(format!("invalid upstream URI: {e}")))?;

    let host = uri
        .host()
        .ok_or_else(|| ProxyError::Snapshot("upstream URI has no host".into()))?
        .to_owned();
    let port = uri.port_u16().unwrap_or(80);

    let timeout = Duration::from_millis(timeout_ms as u64);

    let stream = tokio::time::timeout(timeout, TcpStream::connect(format!("{host}:{port}")))
        .await
        .map_err(|_| ProxyError::UpstreamTimeout)?
        .map_err(|e| ProxyError::Snapshot(format!("upstream TCP connect failed: {e}")))?;

    let io = TokioIo::new(stream);
    let (mut sender, conn) = hyper::client::conn::http1::handshake(io)
        .await
        .map_err(|e| ProxyError::Snapshot(format!("upstream handshake failed: {e}")))?;

    // Drive the upstream connection; with_upgrades() keeps it alive after 101.
    tokio::spawn(conn.with_upgrades());

    let upstream_resp = sender
        .send_request(req)
        .await
        .map_err(|e| ProxyError::Snapshot(format!("upstream WebSocket send failed: {e}")))?;

    if upstream_resp.status() != StatusCode::SWITCHING_PROTOCOLS {
        return Ok(Response::builder()
            .status(StatusCode::BAD_GATEWAY)
            .header("content-type", "text/plain")
            .body(Empty::<Bytes>::new().map_err(|_| unreachable!()).boxed())
            .expect("static response is always valid"));
    }

    // Grab the upstream upgrade future before consuming the response.
    let upstream_upgrade = hyper::upgrade::on(upstream_resp);

    // Return 101 downstream; hyper triggers the downstream upgrade on seeing this.
    let resp = Response::builder()
        .status(StatusCode::SWITCHING_PROTOCOLS)
        .header(CONNECTION, "Upgrade")
        .header(UPGRADE, "websocket")
        .body(Empty::<Bytes>::new().map_err(|_| unreachable!()).boxed())
        .expect("static 101 response is always valid");

    // Splice both raw streams once both upgrades complete.
    tokio::spawn(async move {
        match tokio::join!(downstream_upgrade, upstream_upgrade) {
            (Ok(ds), Ok(us)) => {
                let mut ds_io = TokioIo::new(ds);
                let mut us_io = TokioIo::new(us);
                if let Err(e) = copy_bidirectional(&mut ds_io, &mut us_io).await {
                    tracing::debug!("WebSocket tunnel closed: {e}");
                }
            }
            (Err(e), _) | (_, Err(e)) => {
                tracing::warn!("WebSocket upgrade error: {e}");
            }
        }
    });

    Ok(resp)
}
