//! JWT claims type documenting standard and Barqium-specific custom claims.

use serde::{Deserialize, Serialize};

/// Standard + Barqium-specific JWT claims.
///
/// This struct is used to decode and validate the payload of access tokens
/// issued by the OIDC provider. Standard claims follow RFC 7519.
/// Barqium-specific claims are prefixed with `barq_`.
///
/// # Standard claims (RFC 7519)
/// | Claim | Type   | Description                                    |
/// |-------|--------|------------------------------------------------|
/// | `sub` | String | Subject — stable user or service account ID    |
/// | `iss` | String | Issuer — OIDC provider URL                     |
/// | `aud` | String or array | Intended audience(s)                |
/// | `exp` | u64    | Expiry time (Unix timestamp)                   |
/// | `iat` | u64    | Issued-at time (Unix timestamp)                |
/// | `jti` | String | JWT ID — optional per-token unique identifier  |
///
/// # Custom claims
/// | Claim        | Type         | Description                           |
/// |--------------|--------------|---------------------------------------|
/// | `barq_roles` | Vec\<String> | Roles assigned to the token subject   |
/// | `barq_tenant`| Option\<String>| Tenant ID the token is scoped to    |
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    /// The subject — uniquely identifies the user or service.
    pub sub: String,

    /// The issuer — the OIDC provider that issued this token.
    pub iss: String,

    /// Intended audience(s). Must include the gateway's audience value.
    pub aud: serde_json::Value,

    /// Token expiry as a Unix timestamp (seconds since epoch).
    pub exp: u64,

    /// Token issued-at time as a Unix timestamp.
    #[serde(default)]
    pub iat: u64,

    /// Optional unique identifier for this specific token.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub jti: Option<String>,

    /// Barqium role list assigned to the token subject.
    ///
    /// Used by the ABAC policy engine to evaluate `Role` conditions.
    #[serde(default, rename = "barq_roles")]
    pub roles: Vec<String>,

    /// Optional tenant scope for multi-tenant deployments.
    ///
    /// When set, the token is valid only within the specified tenant.
    #[serde(default, rename = "barq_tenant", skip_serializing_if = "Option::is_none")]
    pub tenant: Option<String>,
}

impl JwtClaims {
    /// Return `true` if the subject holds the specified role.
    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }

    /// Return `true` if the token is scoped to the specified tenant.
    pub fn is_scoped_to(&self, tenant_id: &str) -> bool {
        self.tenant.as_deref() == Some(tenant_id)
    }
}
