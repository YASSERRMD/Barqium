use http::{HeaderMap, HeaderName, HeaderValue};

/// Returns `true` when the response carries an SSE content-type.
#[inline]
pub fn is_sse_response(headers: &HeaderMap) -> bool {
    headers
        .get(http::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|ct| ct.starts_with("text/event-stream"))
        .unwrap_or(false)
}

/// Sets `X-Accel-Buffering: no` on SSE responses so intermediate nginx/CDN
/// layers do not buffer the event stream.
pub fn annotate_sse_response(headers: &mut HeaderMap) {
    static NAME: HeaderName = HeaderName::from_static("x-accel-buffering");
    headers.insert(NAME.clone(), HeaderValue::from_static("no"));
}
