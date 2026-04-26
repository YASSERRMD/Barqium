//! Shared-memory snapshot types for the Barqium data plane.
//! Types here must be rkyv-compatible for zero-copy deserialization.
//!
//! The snapshot file layout on /dev/shm/barqium/:
//!   <tenant_id>.snapshot  — current active snapshot (written atomically)
//!
//! The writer (barqium-snapshot) serialises a RouteSnapshot with rkyv and
//! hands it to mmap-sync for atomic swap. The reader (barqium-core)
//! calls mmap_sync::Synchronizer::read() which returns an ArchivedRouteSnapshot
//! with zero-copy access.

use rkyv::{Archive, Deserialize, Serialize};

/// Full snapshot of active routes for one tenant.
/// Written atomically; read zero-copy by every data-plane worker.
#[derive(Archive, Serialize, Deserialize, serde::Serialize, serde::Deserialize, Clone, Debug)]
#[archive(check_bytes)]
pub struct RouteSnapshot {
    pub tenant_id: String,
    /// Sequence number from the last ConfigEvent processed into this snapshot.
    pub sequence: u64,
    /// Unix milliseconds when this snapshot was compiled.
    pub snapshot_at: i64,
    pub routes: Vec<RouteEntry>,
    pub upstreams: Vec<UpstreamEntry>,
}

/// A single route used for request matching in the data plane.
#[derive(Archive, Serialize, Deserialize, serde::Serialize, serde::Deserialize, Clone, Debug)]
#[archive(check_bytes)]
pub struct RouteEntry {
    pub id: String,
    pub tenant_id: String,
    /// HTTP method or "*" to match any method.
    pub method: String,
    /// URL path prefix, e.g. "/api/v1". Matched with starts_with.
    pub path_prefix: String,
    /// Host header value; empty string matches any host.
    pub host: String,
    pub upstream_id: String,
    /// Ordered policy IDs evaluated before the request is forwarded.
    pub policy_ids: Vec<String>,
    pub enabled: bool,
}

/// Upstream target used by the connection pool.
#[derive(Archive, Serialize, Deserialize, serde::Serialize, serde::Deserialize, Clone, Debug)]
#[archive(check_bytes)]
pub struct UpstreamEntry {
    pub id: String,
    pub name: String,
    /// Full URL including scheme and optional port, e.g. "https://backend:8080".
    pub url: String,
    pub timeout_ms: u32,
    pub enabled: bool,
}

impl RouteSnapshot {
    /// Returns the upstream for the given id, if present and enabled.
    #[must_use]
    pub fn upstream_by_id(&self, id: &str) -> Option<&UpstreamEntry> {
        self.upstreams.iter().find(|u| u.id == id && u.enabled)
    }
}

impl ArchivedRouteSnapshot {
    /// Zero-copy equivalent of RouteSnapshot::upstream_by_id.
    #[must_use]
    pub fn upstream_by_id(&self, id: &str) -> Option<&ArchivedUpstreamEntry> {
        self.upstreams
            .iter()
            .find(|u| u.id.as_str() == id && u.enabled)
    }
}
