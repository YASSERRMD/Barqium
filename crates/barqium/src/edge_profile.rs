//! Edge deployment profile — stripped-down binary for edge/CDN nodes.
//!
//! The `edge` Cargo feature flag disables all heavyweight optional crates
//! (AI providers, MCP client/server, WASM plugin runtime, advanced protocols)
//! to produce a minimal binary with the smallest possible attack surface and
//! fastest cold-start time.
//!
//! # Enabling the edge profile
//!
//! ```bash
//! # Build a stripped edge binary
//! cargo build --release --no-default-features --features edge
//!
//! # Combined with AWS-LC TLS acceleration
//! cargo build --release --no-default-features --features "edge,aws-lc"
//! ```

/// Documents the capabilities included and excluded by the `edge` feature flag.
///
/// Instantiating this struct has no side effects; it is purely a documentation
/// and introspection vehicle. Use [`EdgeProfile::is_active`] to check at
/// runtime whether the current binary was compiled with `--features edge`.
///
/// # Included in the edge profile
/// - HTTP/1.1, HTTP/2, HTTP/3 (QUIC) proxying
/// - JWT, API key, and mTLS authentication
/// - Sliding-window rate limiting (Redis-backed)
/// - SO_REUSEPORT multi-listener
/// - OTLP telemetry
///
/// # Excluded from the edge profile (disabled to minimise footprint)
/// - WASM plugin runtime (`barqium-wasm` crate)
/// - AI provider adapters (`barqium-ai` crate)
/// - MCP client/server (`barqium-mcp` crate)
/// - GraphQL and SOAP protocol handlers
/// - PII redaction (regex-heavy)
#[derive(Debug, Clone, Default)]
pub struct EdgeProfile;

impl EdgeProfile {
    /// Return `true` if this binary was compiled with the `edge` feature flag.
    pub fn is_active() -> bool {
        cfg!(feature = "edge")
    }

    /// Return a human-readable summary of which features are included/excluded.
    pub fn summary() -> &'static str {
        if cfg!(feature = "edge") {
            "edge: HTTP/1.1+2+3, JWT, rate-limit, OTLP — no WASM/AI/MCP/GraphQL/SOAP"
        } else {
            "full: all features enabled"
        }
    }
}
