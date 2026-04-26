use thiserror::Error;

/// Errors produced by the barqium-policy evaluator.
#[derive(Debug, Error)]
pub enum PolicyError {
    #[error("JWKS fetch failed: {0}")]
    JwksFetch(String),

    #[error("JWT decode error: {0}")]
    JwtDecode(#[source] jsonwebtoken::errors::Error),

    #[error("JWT is missing the kid header")]
    JwtMissingKid,

    #[error("JWT references unknown kid: {0}")]
    JwtUnknownKid(String),

    #[error("API key not found")]
    ApiKeyNotFound,

    #[error("rate limit exceeded")]
    RateLimitExceeded,
}
