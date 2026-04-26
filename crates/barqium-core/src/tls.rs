use std::fs::File;
use std::io::BufReader;
use std::sync::Arc;

use rustls::pki_types::{CertificateDer, PrivateKeyDer};
use rustls::server::WebPkiClientVerifier;
use rustls::{RootCertStore, ServerConfig};
use rustls_pemfile::{certs, private_key};

use crate::error::ProxyError;

/// Builds a `rustls::ServerConfig` from PEM paths.
///
/// When `client_ca_path` is non-empty, the server requires and verifies a
/// client certificate signed by that CA (mTLS). ALPN is set to `["h2", "http/1.1"]`
/// so HTTP/2 connections also work over TLS.
pub fn build_server_config(
    cert_path: &str,
    key_path: &str,
    client_ca_path: &str,
) -> Result<Arc<ServerConfig>, ProxyError> {
    let certs = load_certs(cert_path)?;
    let key = load_private_key(key_path)?;

    let config_builder = ServerConfig::builder();

    let config = if client_ca_path.is_empty() {
        config_builder
            .with_no_client_auth()
            .with_single_cert(certs, key)
            .map_err(|e| ProxyError::Tls(format!("TLS config error: {e}")))?
    } else {
        let mut root_store = RootCertStore::empty();
        for cert in load_certs(client_ca_path)? {
            root_store
                .add(cert)
                .map_err(|e| ProxyError::Tls(format!("CA cert error: {e}")))?;
        }
        let verifier = WebPkiClientVerifier::builder(Arc::new(root_store))
            .build()
            .map_err(|e| ProxyError::Tls(format!("client verifier error: {e}")))?;
        config_builder
            .with_client_cert_verifier(verifier)
            .with_single_cert(certs, key)
            .map_err(|e| ProxyError::Tls(format!("TLS config error: {e}")))?
    };

    let mut config = config;
    config.alpn_protocols = vec![b"h2".to_vec(), b"http/1.1".to_vec()];

    Ok(Arc::new(config))
}

fn load_certs(path: &str) -> Result<Vec<CertificateDer<'static>>, ProxyError> {
    let f = File::open(path).map_err(|e| ProxyError::Tls(format!("open {path}: {e}")))?;
    certs(&mut BufReader::new(f))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| ProxyError::Tls(format!("parse certs {path}: {e}")))
}

fn load_private_key(path: &str) -> Result<PrivateKeyDer<'static>, ProxyError> {
    let f = File::open(path).map_err(|e| ProxyError::Tls(format!("open {path}: {e}")))?;
    private_key(&mut BufReader::new(f))
        .map_err(|e| ProxyError::Tls(format!("parse key {path}: {e}")))?
        .ok_or_else(|| ProxyError::Tls(format!("no private key found in {path}")))
}
