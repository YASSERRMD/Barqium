use tracing::info;

/// Collect and return a human-readable build information string.
///
/// Includes the Rust compiler version, the active Cargo feature profile
/// (`edge`, `full`, or `custom`), and the TLS backend (`aws-lc-rs` or
/// `ring (default)`). Printed at gateway startup so operators can
/// instantly confirm the correct build is deployed.
pub fn build_info() -> String {
    let rust_version = env!("CARGO_PKG_RUST_VERSION", "unknown");

    let profile = if cfg!(feature = "edge") {
        "edge"
    } else if cfg!(feature = "full") {
        "full"
    } else {
        "custom"
    };

    let tls_backend = if cfg!(feature = "aws-lc") {
        "aws-lc-rs"
    } else {
        "ring (default)"
    };

    let features: Vec<&str> = {
        let mut f = vec![];
        if cfg!(feature = "edge") { f.push("edge"); }
        if cfg!(feature = "full") { f.push("full"); }
        if cfg!(feature = "aws-lc") { f.push("aws-lc"); }
        if cfg!(feature = "xdp") { f.push("xdp"); }
        if cfg!(feature = "quic-migration") { f.push("quic-migration"); }
        f
    };

    format!(
        "barqium v{version} | rust={rust} | profile={profile} | tls={tls} | features=[{feats}]",
        version = env!("CARGO_PKG_VERSION"),
        rust = rust_version,
        profile = profile,
        tls = tls_backend,
        feats = features.join(","),
    )
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    // Print build info at startup for operational visibility.
    let info = build_info();
    info!("{info}");

    let tls_backend = if cfg!(feature = "aws-lc") {
        // Install AWS-LC as the rustls crypto provider for AVX-512-accelerated
        // AES-GCM and ECDSA operations.
        #[cfg(feature = "aws-lc")]
        {
            use rustls::crypto::CryptoProvider;
            if aws_lc_rs::default_provider().install_default().is_err() {
                tracing::warn!("aws-lc-rs provider already installed or failed to install");
            }
        }
        "aws-lc-rs"
    } else {
        "ring (default)"
    };

    info!(tls_backend, "barqium started");

    Ok(())
}
