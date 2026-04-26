use thiserror::Error;

/// Errors produced by the barqium-core proxy runtime.
#[derive(Debug, Error)]
pub enum ProxyError {
    #[error("bind error on {addr}: {source}")]
    Bind {
        addr: String,
        #[source]
        source: std::io::Error,
    },

    #[error("accept error: {0}")]
    Accept(#[source] std::io::Error),

    #[error("no route matched for {method} {path}")]
    NoRoute { method: String, path: String },

    #[error("upstream not found: {0}")]
    UpstreamNotFound(String),

    #[error("upstream request failed: {0}")]
    UpstreamRequest(#[source] hyper_util::client::legacy::Error),

    #[error("upstream timeout")]
    UpstreamTimeout,

    #[error("upstream body error: {0}")]
    UpstreamBody(#[source] hyper::Error),

    #[error("snapshot read error: {0}")]
    Snapshot(String),

    #[error("TLS error: {0}")]
    Tls(String),
}
