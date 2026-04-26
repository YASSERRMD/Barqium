use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt::init();

    // Report active feature profile at startup.
    let profile = if cfg!(feature = "edge") {
        "edge"
    } else if cfg!(feature = "full") {
        "full"
    } else {
        "custom"
    };

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

    info!(profile, tls_backend, "barqium starting");

    Ok(())
}
