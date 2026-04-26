use std::ffi::OsString;
use std::path::PathBuf;

use barqium_config::RouteSnapshot;
use mmap_sync::synchronizer::Synchronizer;

use crate::error::ProxyError;

/// Minimal data extracted from a route match. All fields are owned copies
/// so this can safely outlive the snapshot ReadResult.
#[derive(Debug, Clone)]
pub struct RouteMatch {
    pub route_id: String,
    pub upstream_url: String,
    pub timeout_ms: u32,
    pub policy_ids: Vec<String>,
}

/// Wraps a per-tenant `Synchronizer` and exposes wait-free snapshot reads.
/// Create one `SnapshotReader` per tokio task (not shared across tasks) to
/// avoid mutex contention on the hot path.
pub struct SnapshotReader {
    sync: Synchronizer,
}

impl SnapshotReader {
    /// Opens the snapshot file at `<snapshot_dir>/<tenant_id>`.
    pub fn open(snapshot_dir: &str, tenant_id: &str) -> Self {
        let prefix: OsString = PathBuf::from(snapshot_dir).join(tenant_id).into_os_string();
        Self {
            sync: Synchronizer::new(&prefix),
        }
    }

    /// Reads the current snapshot and finds the best matching route.
    ///
    /// Returns `Ok(None)` when no snapshot exists yet or no route matches.
    ///
    /// # Safety
    /// The caller must ensure only barqium-snapshot writes to the snapshot
    /// files. Mixed writers would corrupt the rkyv layout.
    pub fn match_route(
        &mut self,
        method: &str,
        path: &str,
        host: &str,
    ) -> Result<Option<RouteMatch>, ProxyError> {
        // SAFETY: barqium-snapshot is the sole writer; rkyv layout is trusted.
        let result = unsafe {
            self.sync
                .read::<RouteSnapshot>(false)
                .map_err(|e| ProxyError::Snapshot(e.to_string()))?
        };

        // Deref gives &ArchivedRouteSnapshot.
        let snapshot = &*result;
        Ok(find_route(snapshot, method, path, host))
    }
}

/// Finds the first enabled route that matches method, path, and host.
/// Priority: longest path_prefix wins (first match in iteration order for
/// equal-length prefixes, until a proper priority field is added in Phase 2).
fn find_route(
    snapshot: &barqium_config::ArchivedRouteSnapshot,
    method: &str,
    path: &str,
    host: &str,
) -> Option<RouteMatch> {
    let mut best: Option<RouteMatch> = None;
    let mut best_prefix_len: usize = 0;

    for route in snapshot.routes.iter() {
        if !route.enabled {
            continue;
        }
        let r_method = route.method.as_str();
        if r_method != "*" && !r_method.eq_ignore_ascii_case(method) {
            continue;
        }
        let prefix = route.path_prefix.as_str();
        if !path.starts_with(prefix) {
            continue;
        }
        let r_host = route.host.as_str();
        if !r_host.is_empty() && r_host != host {
            continue;
        }
        if prefix.len() <= best_prefix_len {
            continue; // shorter prefix than current best
        }

        if let Some(upstream) = snapshot.upstream_by_id(route.upstream_id.as_str()) {
            best_prefix_len = prefix.len();
            best = Some(RouteMatch {
                route_id: route.id.to_string(),
                upstream_url: upstream.url.to_string(),
                timeout_ms: upstream.timeout_ms,
                policy_ids: route.policy_ids.iter().map(|s| s.to_string()).collect(),
            });
        }
    }
    best
}
