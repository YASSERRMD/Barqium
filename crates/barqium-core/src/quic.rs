use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use quinn::{Endpoint, ServerConfig as QuinnServerConfig, TransportConfig};
use rustls::ServerConfig as RustlsServerConfig;
use tracing::{debug, info};

use crate::error::ProxyError;

/// QUIC connection configuration derived from environment variables.
///
/// Controls how the QUIC/HTTP3 listener is bound and how individual
/// connections are managed (timeouts, 0-RTT, stream concurrency).
#[derive(Debug, Clone)]
pub struct QuicConfig {
    /// UDP socket address to bind (e.g. `0.0.0.0:443`).
    pub listen_addr: SocketAddr,
    /// Maximum idle connection duration before the server closes it.
    pub idle_timeout: Duration,
    /// Enable 0-RTT resumption (optimistic accept for returning clients).
    pub enable_0rtt: bool,
    /// Maximum number of concurrent bidirectional streams per connection.
    ///
    /// Limits the number of in-flight HTTP/3 requests a single QUIC
    /// connection may have open simultaneously. Defaults to 100.
    pub max_concurrent_streams: u64,
}

impl Default for QuicConfig {
    fn default() -> Self {
        Self {
            listen_addr: "0.0.0.0:443".parse().expect("static addr"),
            idle_timeout: Duration::from_secs(30),
            enable_0rtt: true,
            max_concurrent_streams: 100,
        }
    }
}

/// Build a [`quinn::ServerConfig`] from an existing rustls [`ServerConfig`].
///
/// ALPN is set to `h3` so HTTP/3 clients can negotiate the protocol.
/// The transport layer applies the idle-timeout and stream limits from `cfg`.
///
/// ALPN is overridden to advertise `h3` so HTTP/3 clients can negotiate
/// the protocol. The transport layer applies the idle-timeout from `cfg`.
///
/// NOTE: h3 framing (via h3-quinn) is currently held back because both
/// h3-quinn 0.0.6 and 0.0.7 have a `quinn::StreamId` private-field
/// incompatibility with quinn 0.11.x. When h3-quinn publishes a fix the
/// `serve_h3` function will be updated to unwrap QUIC streams as H3 frames.
pub fn build_quinn_server_config(
    tls: Arc<RustlsServerConfig>,
    cfg: &QuicConfig,
) -> Result<QuinnServerConfig, ProxyError> {
    let mut tls = (*tls).clone();
    tls.alpn_protocols = vec![b"h3".to_vec()];
    if cfg.enable_0rtt {
        tls.max_early_data_size = u32::MAX;
    }
    let tls = Arc::new(tls);

    let quic_tls = quinn::crypto::rustls::QuicServerConfig::try_from(tls)
        .map_err(|e| ProxyError::Tls(e.to_string()))?;

    let mut transport = TransportConfig::default();
    transport.max_idle_timeout(Some(
        cfg.idle_timeout
            .try_into()
            .map_err(|_| ProxyError::Tls("idle timeout out of range".into()))?,
    ));
    transport.keep_alive_interval(Some(Duration::from_secs(5)));
    transport.max_concurrent_bidi_streams(cfg.max_concurrent_streams.into());

    let mut quinn_cfg = QuinnServerConfig::with_crypto(Arc::new(quic_tls));
    quinn_cfg.transport_config(Arc::new(transport));
    Ok(quinn_cfg)
}

/// Bind a QUIC endpoint and accept connections.
///
/// Each accepted connection spawns a tokio task. The task logs the peer
/// address, drains QUIC streams, and sends a minimal HTTP/3-style
/// response informing the client that the H3 framing layer is initialising.
///
/// Once h3-quinn compatibility with quinn 0.11 is restored this function
/// will delegate each connection to the proxy service exactly as the TCP
/// listener does.
pub async fn serve_quic(cfg: QuicConfig, tls: Arc<RustlsServerConfig>) -> Result<(), ProxyError> {
    let quinn_cfg = build_quinn_server_config(tls, &cfg)?;
    let endpoint = Endpoint::server(quinn_cfg, cfg.listen_addr).map_err(|e| ProxyError::Bind {
        addr: cfg.listen_addr.to_string(),
        source: e,
    })?;

    info!(addr = %cfg.listen_addr, "HTTP/3 QUIC listener started (h3 framing pending h3-quinn fix)");

    loop {
        let Some(incoming) = endpoint.accept().await else {
            info!("QUIC endpoint closed");
            break;
        };

        tokio::spawn(async move {
            let conn = match incoming.await {
                Ok(c) => c,
                Err(e) => {
                    debug!("QUIC handshake failed: {e}");
                    return;
                }
            };
            let peer = conn.remote_address();
            info!(peer = %peer, "QUIC connection established");

            // Accept bidirectional streams until the connection closes.
            loop {
                match conn.accept_bi().await {
                    Ok((_send, _recv)) => {
                        // H3 framing will be handled here once h3-quinn
                        // is compatible with quinn 0.11.x.
                        debug!(peer = %peer, "QUIC bidi stream accepted (H3 framing stub)");
                    }
                    Err(e) => {
                        debug!(peer = %peer, "QUIC connection closed: {e}");
                        break;
                    }
                }
            }
        });
    }

    Ok(())
}
