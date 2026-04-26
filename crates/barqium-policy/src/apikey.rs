use std::collections::HashMap;
use std::sync::Arc;

use arc_swap::ArcSwap;
use ring::digest::{digest, SHA256};

use crate::error::PolicyError;

/// Metadata associated with a valid API key.
#[derive(Debug, Clone)]
pub struct ApiKeyMeta {
    pub consumer_id: String,
}

/// In-memory API key store backed by ArcSwap for wait-free reads.
///
/// Keys are stored as SHA-256 hashes so raw secrets are not held in
/// process memory beyond the brief hashing window in `reload`.
pub struct ApiKeyStore {
    /// Maps SHA-256(raw_key) hex -> ApiKeyMeta.
    keys: ArcSwap<HashMap<String, ApiKeyMeta>>,
}

impl ApiKeyStore {
    #[must_use]
    pub fn new() -> Arc<Self> {
        Arc::new(Self::default())
    }

    /// Replace the entire key set atomically.
    ///
    /// `raw_keys` maps raw API key strings to their metadata.
    /// Raw keys are hashed before storage.
    pub fn reload(&self, raw_keys: impl IntoIterator<Item = (String, ApiKeyMeta)>) {
        let hashed: HashMap<String, ApiKeyMeta> = raw_keys
            .into_iter()
            .map(|(k, v)| (sha256_hex(&k), v))
            .collect();
        self.keys.store(Arc::new(hashed));
    }

    /// Validate `raw_key` with O(1) hash-indexed lookup.
    pub fn validate(&self, raw_key: &str) -> Result<ApiKeyMeta, PolicyError> {
        let hash = sha256_hex(raw_key);
        self.keys
            .load()
            .get(&hash)
            .cloned()
            .ok_or(PolicyError::ApiKeyNotFound)
    }
}

impl Default for ApiKeyStore {
    fn default() -> Self {
        Self {
            keys: ArcSwap::from_pointee(HashMap::new()),
        }
    }
}

fn sha256_hex(input: &str) -> String {
    let d = digest(&SHA256, input.as_bytes());
    d.as_ref().iter().map(|b| format!("{b:02x}")).collect()
}
