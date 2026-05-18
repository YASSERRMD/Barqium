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

    /// The client has been rate-limited.
    ///
    /// The `retry_after_secs` field carries the number of seconds the client
    /// should wait before retrying, suitable for setting the `Retry-After`
    /// HTTP response header.
    #[error("rate limit exceeded; retry after {retry_after_secs}s")]
    RateLimitExceeded {
        /// Suggested wait time in seconds before the client may retry.
        retry_after_secs: u64,
    },
}
