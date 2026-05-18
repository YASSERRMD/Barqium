//! In-process memory statistics for observability and capacity planning.
//!
//! [`MemoryStats`] is populated by calling [`MemoryStats::sample`] and can
//! be exported via the `/metrics` endpoint or the OTLP gauge exporter.

use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

/// Snapshot of in-process memory usage at a point in time.
///
/// Sizes are in bytes unless otherwise noted. Counters are best-effort
/// approximations — not suitable for security-sensitive decisions.
#[derive(Debug, Default)]
pub struct MemoryStats {
    /// Estimated heap bytes currently allocated by the Rust global allocator.
    ///
    /// Updated by instrumented `alloc`/`dealloc` wrappers. Set to `0` when
    /// the tracking allocator is not enabled (default in release builds).
    pub heap_allocated_bytes: AtomicU64,

    /// Size in bytes of the most recently written rkyv snapshot on disk/shm.
    ///
    /// Zero until the snapshot compiler has produced its first output.
    pub snapshot_size_bytes: AtomicU64,

    /// Estimated number of bytes used by the in-memory config cache
    /// (compiled route table + upstream map).
    pub config_cache_bytes: AtomicU64,
}

impl MemoryStats {
    /// Create a new zeroed stats instance wrapped in an `Arc` for sharing.
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    /// Update the heap allocation estimate.
    pub fn set_heap(&self, bytes: u64) {
        self.heap_allocated_bytes.store(bytes, Ordering::Relaxed);
    }

    /// Update the snapshot size estimate.
    pub fn set_snapshot_size(&self, bytes: u64) {
        self.snapshot_size_bytes.store(bytes, Ordering::Relaxed);
    }

    /// Update the config cache size estimate.
    pub fn set_config_cache(&self, bytes: u64) {
        self.config_cache_bytes.store(bytes, Ordering::Relaxed);
    }

    /// Return a tuple of `(heap, snapshot, cache)` bytes for structured logging.
    pub fn snapshot(&self) -> (u64, u64, u64) {
        (
            self.heap_allocated_bytes.load(Ordering::Relaxed),
            self.snapshot_size_bytes.load(Ordering::Relaxed),
            self.config_cache_bytes.load(Ordering::Relaxed),
        )
    }
}
