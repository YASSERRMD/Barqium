//! Recommended HTTP security response headers.
//!
//! This module defines a `SecurityHeaders` struct whose fields map to the
//! most impactful HTTP security headers as recommended by OWASP and the
//! Mozilla Observatory. Apply these headers to every response from the
//! gateway to harden the client-side attack surface.

/// A set of HTTP security headers to add to every gateway response.
///
/// Default values follow OWASP and Mozilla Observatory recommendations.
/// Individual fields can be overridden per-tenant via the control-plane API.
///
/// # Headers covered
/// | Header                     | Default value                              |
/// |----------------------------|--------------------------------------------|
/// | `Strict-Transport-Security`| `max-age=31536000; includeSubDomains`      |
/// | `X-Content-Type-Options`   | `nosniff`                                  |
/// | `X-Frame-Options`          | `DENY`                                     |
/// | `X-XSS-Protection`         | `1; mode=block`                            |
/// | `Referrer-Policy`          | `strict-origin-when-cross-origin`          |
/// | `Content-Security-Policy`  | `default-src 'self'`                       |
/// | `Permissions-Policy`       | `camera=(), microphone=(), geolocation=()` |
#[derive(Debug, Clone)]
pub struct SecurityHeaders {
    /// Value for `Strict-Transport-Security` (`max-age=…; includeSubDomains`).
    pub strict_transport_security: String,

    /// Value for `X-Content-Type-Options` (should be `nosniff`).
    pub x_content_type_options: String,

    /// Value for `X-Frame-Options` (`DENY` or `SAMEORIGIN`).
    pub x_frame_options: String,

    /// Value for `X-XSS-Protection` (legacy browsers).
    pub x_xss_protection: String,

    /// Value for `Referrer-Policy`.
    pub referrer_policy: String,

    /// Value for `Content-Security-Policy`.
    pub content_security_policy: String,

    /// Value for `Permissions-Policy`.
    pub permissions_policy: String,
}

impl Default for SecurityHeaders {
    fn default() -> Self {
        Self {
            strict_transport_security: "max-age=31536000; includeSubDomains".into(),
            x_content_type_options: "nosniff".into(),
            x_frame_options: "DENY".into(),
            x_xss_protection: "1; mode=block".into(),
            referrer_policy: "strict-origin-when-cross-origin".into(),
            content_security_policy: "default-src 'self'".into(),
            permissions_policy: "camera=(), microphone=(), geolocation=()".into(),
        }
    }
}

impl SecurityHeaders {
    /// Create a `SecurityHeaders` instance with OWASP-recommended defaults.
    pub fn recommended() -> Self {
        Self::default()
    }

    /// Return an iterator over `(header-name, header-value)` pairs.
    pub fn iter(&self) -> impl Iterator<Item = (&'static str, &str)> {
        [
            ("Strict-Transport-Security", self.strict_transport_security.as_str()),
            ("X-Content-Type-Options", self.x_content_type_options.as_str()),
            ("X-Frame-Options", self.x_frame_options.as_str()),
            ("X-XSS-Protection", self.x_xss_protection.as_str()),
            ("Referrer-Policy", self.referrer_policy.as_str()),
            ("Content-Security-Policy", self.content_security_policy.as_str()),
            ("Permissions-Policy", self.permissions_policy.as_str()),
        ]
        .into_iter()
    }
}
