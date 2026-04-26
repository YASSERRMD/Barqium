use std::collections::HashMap;
use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::time::Duration;

use barqium_config::RouteSnapshot;
use mmap_sync::synchronizer::Synchronizer;
use tracing::debug;

/// Grace period given to in-flight readers before the old mapping is unmapped.
/// 10ms matches the budget Cloudflare uses in the BLISS pattern.
const GRACE: Duration = Duration::from_millis(10);

/// Owns one `Synchronizer` per tenant rooted at `snapshot_dir`.
/// The synchronizer maintains the two-file ring and the pointer file that
/// implements the wait-free atomic-swap protocol.
pub struct SnapshotStore {
    dir: PathBuf,
    inner: HashMap<String, Synchronizer>,
}

impl SnapshotStore {
    pub fn new(snapshot_dir: impl AsRef<Path>) -> anyhow::Result<Self> {
        let dir = snapshot_dir.as_ref().to_path_buf();
        std::fs::create_dir_all(&dir)?;
        Ok(Self {
            dir,
            inner: HashMap::new(),
        })
    }

    /// Atomically replaces the snapshot for `snapshot.tenant_id`.
    /// Readers on the data plane see the new version within GRACE ms.
    pub fn write(&mut self, snapshot: &RouteSnapshot) -> anyhow::Result<()> {
        let dir = &self.dir;
        let sync = self
            .inner
            .entry(snapshot.tenant_id.clone())
            .or_insert_with(|| {
                let prefix: OsString = dir.join(&snapshot.tenant_id).into_os_string();
                Synchronizer::new(&prefix)
            });

        let (bytes, swapped) = sync
            .write(snapshot, GRACE)
            .map_err(|e| anyhow::anyhow!("mmap-sync write: {e:?}"))?;

        debug!(
            tenant_id = %snapshot.tenant_id,
            sequence  = snapshot.sequence,
            bytes,
            swapped,
            "snapshot written via mmap-sync atomic swap"
        );
        Ok(())
    }
}
