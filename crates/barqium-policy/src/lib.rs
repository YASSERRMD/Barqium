//! Policy chain evaluator: JWT validation, API key checks, rate limiting, ABAC.

pub mod abac;
pub mod api_key;
pub mod apikey;
pub mod audit;
pub mod codemode;
pub mod cors;
pub mod error;
pub mod jwt;
pub mod jwt_claims;
pub mod pii;
pub mod ratelimit;
pub mod redis_ratelimit;
pub mod security_headers;

pub use abac::{evaluate_all, Attributes, Condition, Effect, Operator, Policy, Rule};
pub use api_key::ApiKeyHasher;
pub use apikey::{ApiKeyMeta, ApiKeyStore};
pub use audit::{PolicyAuditEvent, PolicyDecision};
pub use codemode::CodeModeGate;
pub use cors::CorsConfig;
pub use error::PolicyError;
pub use jwt::{Claims, JwksCache, JwtValidator};
pub use jwt_claims::JwtClaims;
pub use pii::{redact, PiiSpan, RedactedText};
pub use ratelimit::{RateLimitConfig, RateLimiter};
pub use redis_ratelimit::{RedisRateLimitConfig, RedisRateLimiter};
pub use security_headers::SecurityHeaders;
