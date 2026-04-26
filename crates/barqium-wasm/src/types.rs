use http::HeaderMap;

/// The action a plugin returns after inspecting a request or response.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Action {
    /// Pass the request/response through unchanged.
    Continue,
    /// Replace status code and body (short-circuit the upstream).
    Respond { status: u16, body: Vec<u8> },
    /// Reject with a 403 Forbidden and no body.
    Deny,
}

/// Mutable view of an HTTP request handed to a plugin.
#[derive(Debug)]
pub struct RequestContext {
    pub method: String,
    pub path: String,
    pub headers: HeaderMap,
    /// Key-value store scoped to this request; plugins share it within a chain.
    pub vars: std::collections::HashMap<String, String>,
}

/// Mutable view of an HTTP response handed to a plugin.
#[derive(Debug)]
pub struct ResponseContext {
    pub status: u16,
    pub headers: HeaderMap,
    pub vars: std::collections::HashMap<String, String>,
}
