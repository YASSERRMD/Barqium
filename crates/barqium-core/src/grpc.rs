use http::HeaderMap;
use hyper::header::CONTENT_TYPE;

/// Returns `true` when the request carries a gRPC content-type.
///
/// gRPC uses `application/grpc`, `application/grpc+proto`, or
/// `application/grpc+json`.  All three share the same prefix.
#[inline]
pub fn is_grpc(headers: &HeaderMap) -> bool {
    headers
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|ct| ct.starts_with("application/grpc"))
        .unwrap_or(false)
}
