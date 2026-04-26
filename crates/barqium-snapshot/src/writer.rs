use std::path::Path;

use barqium_config::RouteSnapshot;
use rkyv::ser::{serializers::AllocSerializer, Serializer};

/// Serialises snapshot with rkyv and writes to <dir>/<tenant_id>.snapshot.
/// In P1-T10 this will be upgraded to mmap-sync atomic swap.
pub fn write_snapshot(dir: &str, snapshot: &RouteSnapshot) -> anyhow::Result<()> {
    let bytes = to_rkyv_bytes(snapshot)?;
    let path = Path::new(dir).join(format!("{}.snapshot", snapshot.tenant_id));

    // Ensure the directory exists.
    std::fs::create_dir_all(dir)?;
    std::fs::write(&path, &bytes)?;

    tracing::debug!(
        tenant_id = %snapshot.tenant_id,
        sequence  = snapshot.sequence,
        bytes     = bytes.len(),
        path      = %path.display(),
        "snapshot written"
    );
    Ok(())
}

/// Serialises a RouteSnapshot into rkyv-archived bytes.
pub fn to_rkyv_bytes(snapshot: &RouteSnapshot) -> anyhow::Result<Vec<u8>> {
    let mut serializer = AllocSerializer::<4096>::default();
    serializer
        .serialize_value(snapshot)
        .map_err(|e| anyhow::anyhow!("rkyv serialize error: {e:?}"))?;
    Ok(serializer.into_serializer().into_inner().to_vec())
}
