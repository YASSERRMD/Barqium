use std::collections::HashMap;
use std::sync::Arc;

use bytes::Bytes;
use dashmap::DashMap;
use serde::Deserialize;
use sha2::{Digest, Sha256};

/// A structured GraphQL request ready to be forwarded to an upstream endpoint.
///
/// This struct is produced by deserialising the inbound HTTP request body
/// after [`detect`] has confirmed the request is GraphQL.
#[derive(Debug, Clone)]
pub struct GraphQlQuery {
    /// The `operationName` field from the request body, if provided.
    ///
    /// Clients may omit this when the document contains a single operation.
    pub operation_name: Option<String>,

    /// The full GraphQL document string (query, mutation, or subscription).
    pub query: String,

    /// JSON-encoded variables object, if any.
    ///
    /// Stored as a raw [`serde_json::Value`] to preserve the original types
    /// when forwarding to the upstream GraphQL server.
    pub variables: Option<serde_json::Value>,
}

impl GraphQlQuery {
    /// Create a minimal query with no operation name and no variables.
    pub fn new(query: impl Into<String>) -> Self {
        Self {
            operation_name: None,
            query: query.into(),
            variables: None,
        }
    }
}

/// A complete GraphQL response returned to the client.
///
/// Follows the GraphQL over HTTP specification: both `data` and `errors`
/// may be present simultaneously.
#[derive(Debug, Clone)]
pub struct GraphQlResponse {
    /// The execution result produced by the upstream resolver, if any.
    ///
    /// Set to `serde_json::Value::Null` when the operation encountered a
    /// non-null propagating error.
    pub data: serde_json::Value,

    /// List of errors returned by the upstream GraphQL server.
    ///
    /// An empty `Vec` means the operation succeeded without errors.
    pub errors: Vec<GraphQlError>,
}

impl GraphQlResponse {
    /// Create a successful response with no errors.
    pub fn success(data: serde_json::Value) -> Self {
        Self {
            data,
            errors: Vec::new(),
        }
    }

    /// Return `true` if the response contains at least one error.
    pub fn has_errors(&self) -> bool {
        !self.errors.is_empty()
    }
}

/// A single error entry in a GraphQL response.
///
/// Conforms to the `errors` array format defined in the GraphQL spec
/// (section 7.1.2 — Response Format).
#[derive(Debug, Clone)]
pub struct GraphQlError {
    /// Human-readable description of the error.
    pub message: String,

    /// JSON Pointer path to the field that caused the error, if applicable.
    ///
    /// Each element is either a string (field name) or integer (list index).
    pub path: Vec<serde_json::Value>,

    /// Arbitrary additional information provided by the upstream server.
    pub extensions: Option<serde_json::Value>,
}

impl GraphQlError {
    /// Create a simple error with just a message.
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            path: Vec::new(),
            extensions: None,
        }
    }
}

/// Detected GraphQL operation type.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OperationType {
    Query,
    Mutation,
    Subscription,
    /// Body could not be parsed as GraphQL JSON.
    Unknown,
}

/// Result of inspecting a request for GraphQL content.
#[derive(Debug, Clone)]
pub struct GraphQlInfo {
    pub operation_type: OperationType,
    /// The `operationName` field if present.
    pub operation_name: Option<String>,
    /// The raw query string.
    pub query: Option<String>,
    /// `extensions.persistedQuery.sha256Hash` if the client sent one.
    pub persisted_hash: Option<String>,
}

/// Detect whether `content_type` signals a GraphQL request and parse the
/// body to determine the operation type.
///
/// Recognised content types:
///   - `application/graphql+json` (preferred, per the GraphQL-over-HTTP spec)
///   - `application/json` with a `query` key (Apollo-style — widely used)
///
/// # Returns
/// `Some(GraphQlInfo)` when a GraphQL request is detected with at least a
/// `query` field or a persisted-query hash. Returns `None` for non-GraphQL
/// requests, malformed JSON, or JSON bodies without a `query` key.
pub fn detect(content_type: &str, body: &Bytes) -> Option<GraphQlInfo> {
    let ct = content_type.split(';').next().unwrap_or("").trim();
    if ct != "application/graphql+json" && ct != "application/json" {
        return None;
    }

    #[derive(Deserialize)]
    struct GqlBody {
        query: Option<String>,
        #[serde(rename = "operationName")]
        operation_name: Option<String>,
        extensions: Option<serde_json::Value>,
    }

    let parsed: GqlBody = serde_json::from_slice(body).ok()?;

    // Must have either a query or a persisted-query hash to be GraphQL.
    let persisted_hash = parsed
        .extensions
        .as_ref()
        .and_then(|e| e.get("persistedQuery"))
        .and_then(|pq| pq.get("sha256Hash"))
        .and_then(|h| h.as_str())
        .map(str::to_string);

    if parsed.query.is_none() && persisted_hash.is_none() {
        return None;
    }

    let op_type = parsed
        .query
        .as_deref()
        .map(classify_operation)
        .unwrap_or(OperationType::Query);

    Some(GraphQlInfo {
        operation_type: op_type,
        operation_name: parsed.operation_name,
        query: parsed.query,
        persisted_hash,
    })
}

/// Classify the first keyword of a GraphQL document.
fn classify_operation(query: &str) -> OperationType {
    let trimmed = query.trim_start();
    if trimmed.starts_with("mutation") {
        OperationType::Mutation
    } else if trimmed.starts_with("subscription") {
        OperationType::Subscription
    } else {
        // Explicit `query` keyword or shorthand query.
        OperationType::Query
    }
}

// ---------------------------------------------------------------------------
// Persisted query allowlist (P4-T7)
// ---------------------------------------------------------------------------

/// Thread-safe allowlist for GraphQL persisted queries.
///
/// Entries map `sha256Hash` (hex-encoded) to the full query string.
/// When `enforce` is true, requests whose hash is not in the store are
/// rejected with a 403 response.
pub struct PersistedQueryStore {
    queries: Arc<DashMap<String, String>>,
    pub enforce: bool,
}

impl PersistedQueryStore {
    pub fn new(enforce: bool) -> Self {
        Self {
            queries: Arc::new(DashMap::new()),
            enforce,
        }
    }

    /// Seed the store from a pre-computed map of `hash -> query`.
    pub fn seed(&self, entries: HashMap<String, String>) {
        for (hash, query) in entries {
            self.queries.insert(hash, query);
        }
    }

    /// Insert a query and return its SHA-256 hash.
    pub fn register(&self, query: &str) -> String {
        let hash = sha256_hex(query);
        self.queries.insert(hash.clone(), query.to_string());
        hash
    }

    /// Look up the query for a given hash. Returns `None` when unknown.
    pub fn resolve(&self, hash: &str) -> Option<String> {
        self.queries.get(hash).map(|e| e.value().clone())
    }

    /// Returns `true` when the request should be allowed through.
    ///
    /// - If `enforce` is false, always returns `true`.
    /// - If the request carries an inline `query`, always allows it (the
    ///   hash check only applies to persisted-query-only flows).
    /// - If the request carries only a hash and `enforce` is true, the hash
    ///   must be in the store.
    pub fn is_allowed(&self, info: &GraphQlInfo) -> bool {
        if !self.enforce {
            return true;
        }
        // Inline query is always permitted.
        if info.query.is_some() {
            return true;
        }
        // Persisted-only: hash must be registered.
        info.persisted_hash
            .as_deref()
            .map(|h| self.queries.contains_key(h))
            .unwrap_or(false)
    }
}

fn sha256_hex(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}
