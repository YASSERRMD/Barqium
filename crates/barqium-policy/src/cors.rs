//! CORS (Cross-Origin Resource Sharing) policy configuration.

/// CORS policy applied to inbound requests.
///
/// This struct is evaluated by the proxy service for every HTTP request
/// that carries an `Origin` header. The policy controls which origins,
/// methods, and headers are allowed, and whether credentials may be
/// included in cross-origin requests.
///
/// # Example
/// ```
/// # use barqium_policy::cors::CorsConfig;
/// let cors = CorsConfig::permissive();
/// assert!(cors.is_origin_allowed("https://example.com"));
/// ```
#[derive(Debug, Clone)]
pub struct CorsConfig {
    /// List of allowed origin values (exact match or `"*"` for wildcard).
    ///
    /// Use `["*"]` to allow any origin. For production deployments, list
    /// explicit origins to avoid exposing internal APIs.
    pub allowed_origins: Vec<String>,

    /// HTTP methods the browser is allowed to use in cross-origin requests.
    ///
    /// Defaults to `["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]`.
    pub allowed_methods: Vec<String>,

    /// HTTP request headers the browser may include in cross-origin requests.
    ///
    /// Defaults to `["Content-Type", "Authorization"]`.
    pub allowed_headers: Vec<String>,

    /// Whether the browser may send cookies or HTTP authentication in
    /// cross-origin requests (`Access-Control-Allow-Credentials: true`).
    ///
    /// Must be `false` when `allowed_origins` contains `"*"`.
    pub allow_credentials: bool,

    /// How long (seconds) the browser may cache the preflight response.
    ///
    /// Maps to `Access-Control-Max-Age`. Defaults to `3600`.
    pub max_age_secs: u32,
}

impl Default for CorsConfig {
    fn default() -> Self {
        Self {
            allowed_origins: vec!["*".into()],
            allowed_methods: vec![
                "GET".into(),
                "POST".into(),
                "PUT".into(),
                "PATCH".into(),
                "DELETE".into(),
                "OPTIONS".into(),
            ],
            allowed_headers: vec!["Content-Type".into(), "Authorization".into()],
            allow_credentials: false,
            max_age_secs: 3600,
        }
    }
}

impl CorsConfig {
    /// Create a permissive CORS policy that allows any origin.
    pub fn permissive() -> Self {
        Self::default()
    }

    /// Create a restrictive CORS policy that denies all cross-origin requests.
    pub fn deny_all() -> Self {
        Self {
            allowed_origins: Vec::new(),
            allowed_methods: Vec::new(),
            allowed_headers: Vec::new(),
            allow_credentials: false,
            max_age_secs: 0,
        }
    }

    /// Return `true` if `origin` is listed in `allowed_origins` or if the
    /// wildcard `"*"` is present.
    pub fn is_origin_allowed(&self, origin: &str) -> bool {
        self.allowed_origins.iter().any(|o| o == "*" || o == origin)
    }
}
