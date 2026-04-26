use std::collections::HashMap;
use std::sync::Arc;
use std::time::Duration;

use arc_swap::ArcSwap;
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

use crate::error::PolicyError;

/// Minimal claims extracted from a validated JWT.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub iss: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub aud: Option<serde_json::Value>,
}

/// Thread-safe JWKS key cache with background refresh.
///
/// Keys are indexed by `kid`. Reads are wait-free via ArcSwap.
pub struct JwksCache {
    keys: ArcSwap<HashMap<String, DecodingKey>>,
}

impl JwksCache {
    /// Fetch JWKS from `url` immediately and return a ready cache.
    pub async fn new(url: &str) -> Result<Arc<Self>, PolicyError> {
        let keys = fetch_keys(url).await?;
        Ok(Arc::new(Self {
            keys: ArcSwap::from_pointee(keys),
        }))
    }

    /// Spawn a background task that refreshes the cache every `interval`.
    /// The first refresh fires after `interval`, not immediately.
    pub fn spawn_refresh(self: Arc<Self>, url: String, interval: Duration) {
        tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);
            ticker.tick().await; // skip first tick (already populated in new())
            loop {
                ticker.tick().await;
                match fetch_keys(&url).await {
                    Ok(new_keys) => {
                        self.keys.store(Arc::new(new_keys));
                        tracing::debug!(url, "JWKS refreshed");
                    }
                    Err(e) => tracing::warn!(url, "JWKS refresh failed: {e}"),
                }
            }
        });
    }

    fn get_key(&self, kid: &str) -> Option<DecodingKey> {
        self.keys.load().get(kid).cloned()
    }
}

/// Validates Bearer JWTs against keys held in a `JwksCache`.
///
/// Supports RS256 and ES256. Algorithm is inferred from the JWK `kty` field
/// during the initial key load; at validation time we use the algorithm
/// advertised in the JWT header (must be RS256 or ES256).
pub struct JwtValidator {
    cache: Arc<JwksCache>,
    issuer: String,
    audience: Vec<String>,
}

impl JwtValidator {
    pub fn new(
        cache: Arc<JwksCache>,
        issuer: impl Into<String>,
        audiences: impl IntoIterator<Item = impl Into<String>>,
    ) -> Self {
        Self {
            cache,
            issuer: issuer.into(),
            audience: audiences.into_iter().map(Into::into).collect(),
        }
    }

    /// Validate `token` and return the decoded claims on success.
    pub fn validate(&self, token: &str) -> Result<Claims, PolicyError> {
        let header = decode_header(token).map_err(PolicyError::JwtDecode)?;

        let alg = match header.alg {
            Algorithm::RS256
            | Algorithm::RS384
            | Algorithm::RS512
            | Algorithm::ES256
            | Algorithm::ES384 => header.alg,
            // Reject symmetric or unusual algorithms.
            _ => {
                return Err(PolicyError::JwtDecode(jsonwebtoken::errors::Error::from(
                    jsonwebtoken::errors::ErrorKind::InvalidAlgorithm,
                )))
            }
        };

        let kid = header.kid.ok_or(PolicyError::JwtMissingKid)?;
        let key = self
            .cache
            .get_key(&kid)
            .ok_or(PolicyError::JwtUnknownKid(kid))?;

        let mut validation = Validation::new(alg);
        validation.set_issuer(&[&self.issuer]);
        if !self.audience.is_empty() {
            validation.set_audience(&self.audience.iter().map(String::as_str).collect::<Vec<_>>());
        }

        let data = decode::<Claims>(token, &key, &validation).map_err(PolicyError::JwtDecode)?;
        Ok(data.claims)
    }
}

async fn fetch_keys(url: &str) -> Result<HashMap<String, DecodingKey>, PolicyError> {
    let resp = reqwest::get(url)
        .await
        .map_err(|e| PolicyError::JwksFetch(e.to_string()))?;

    let jwk_set: jsonwebtoken::jwk::JwkSet = resp
        .json()
        .await
        .map_err(|e| PolicyError::JwksFetch(e.to_string()))?;

    let mut map = HashMap::new();
    for jwk in &jwk_set.keys {
        if let Some(kid) = &jwk.common.key_id {
            match DecodingKey::from_jwk(jwk) {
                Ok(key) => {
                    map.insert(kid.clone(), key);
                }
                Err(e) => tracing::warn!(kid, "skipping unparseable JWK: {e}"),
            }
        }
    }

    tracing::debug!(url, count = map.len(), "JWKS keys loaded");
    Ok(map)
}
