//! API key hashing and verification using SHA-256.
//!
//! Raw API keys should **never** be stored in the database. Instead, the
//! control plane hashes each key with SHA-256 and stores only the hex digest.
//! On each request the data plane re-hashes the presented key and compares
//! the digests in constant time to prevent timing attacks.

use ring::digest::{self, SHA256};

/// Hashes and verifies API keys using SHA-256.
///
/// # Usage
/// ```
/// # use barqium_policy::api_key::ApiKeyHasher;
/// let hasher = ApiKeyHasher::new();
/// let hash = hasher.hash("super-secret-key");
/// assert!(hasher.verify("super-secret-key", &hash));
/// assert!(!hasher.verify("wrong-key", &hash));
/// ```
#[derive(Debug, Clone, Default)]
pub struct ApiKeyHasher;

impl ApiKeyHasher {
    /// Create a new `ApiKeyHasher`.
    pub fn new() -> Self {
        Self
    }

    /// Compute the SHA-256 hash of `key` and return the lower-case hex string.
    ///
    /// The raw key is hashed with SHA-256 using the *ring* crate. The result
    /// is safe to store in a database or configuration file.
    pub fn hash(&self, key: &str) -> String {
        let digest = digest::digest(&SHA256, key.as_bytes());
        hex_encode(digest.as_ref())
    }

    /// Return `true` if `key` hashes to `expected_hash`.
    ///
    /// The comparison is performed in constant time via [`ring`]'s byte-level
    /// equality to prevent timing-based oracle attacks.
    pub fn verify(&self, key: &str, expected_hash: &str) -> bool {
        let actual = self.hash(key);
        // Constant-time comparison.
        ring::constant_time::verify_slices_are_equal(
            actual.as_bytes(),
            expected_hash.as_bytes(),
        )
        .is_ok()
    }
}

/// Encode a byte slice as a lower-case hexadecimal string.
fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hash_is_deterministic() {
        let h = ApiKeyHasher::new();
        assert_eq!(h.hash("abc"), h.hash("abc"));
    }

    #[test]
    fn verify_correct_key() {
        let h = ApiKeyHasher::new();
        let hash = h.hash("my-api-key");
        assert!(h.verify("my-api-key", &hash));
    }

    #[test]
    fn verify_wrong_key() {
        let h = ApiKeyHasher::new();
        let hash = h.hash("correct-key");
        assert!(!h.verify("wrong-key", &hash));
    }
}
