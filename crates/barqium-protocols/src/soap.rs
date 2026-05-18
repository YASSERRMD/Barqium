use bytes::Bytes;

/// SOAP protocol version detected from the content-type or envelope namespace.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SoapVersion {
    Soap11,
    Soap12,
}

/// A parsed SOAP envelope comprising a header section and a body section.
///
/// Both sections are stored as raw XML strings so the gateway can relay
/// them to the upstream SOAP service without re-serialising. The header
/// may be absent for SOAP messages that carry no `<Header>` element.
#[derive(Debug, Clone)]
pub struct SoapEnvelope {
    /// Raw XML content of the `<soap:Header>` element, if present.
    ///
    /// Does not include the surrounding `<soap:Header>` tags.
    pub header: Option<String>,

    /// Raw XML content of the `<soap:Body>` element.
    ///
    /// Does not include the surrounding `<soap:Body>` tags.
    pub body: String,
}

impl SoapEnvelope {
    /// Create an envelope with only a body and no header.
    pub fn new(body: impl Into<String>) -> Self {
        Self {
            header: None,
            body: body.into(),
        }
    }

    /// Attach a header fragment to this envelope.
    pub fn with_header(mut self, header: impl Into<String>) -> Self {
        self.header = Some(header.into());
        self
    }
}

/// A structured SOAP fault returned in the body of an error response.
///
/// Maps to the `<soap:Fault>` element defined in both SOAP 1.1 and SOAP 1.2.
/// For SOAP 1.2 the `faultactor` becomes the `Node` or `Role` sub-element.
#[derive(Debug, Clone)]
pub struct SoapFault {
    /// The fault code identifying the category of error.
    ///
    /// SOAP 1.1 examples: `soap:Server`, `soap:Client`.
    /// SOAP 1.2 examples: `env:Receiver`, `env:Sender`.
    pub faultcode: String,

    /// A human-readable explanation of the fault.
    pub faultstring: String,

    /// URI identifying the endpoint where the fault occurred, if known.
    ///
    /// Optional in both SOAP versions.
    pub faultactor: Option<String>,
}

impl SoapFault {
    /// Create a server-side fault with the given message.
    pub fn server_error(message: impl Into<String>) -> Self {
        Self {
            faultcode: "soap:Server".into(),
            faultstring: message.into(),
            faultactor: None,
        }
    }

    /// Create a client-side fault with the given message.
    pub fn client_error(message: impl Into<String>) -> Self {
        Self {
            faultcode: "soap:Client".into(),
            faultstring: message.into(),
            faultactor: None,
        }
    }
}

/// Information extracted from a SOAP request.
#[derive(Debug, Clone)]
pub struct SoapAction {
    pub version: SoapVersion,
    /// Value of the `SOAPAction` HTTP header (SOAP 1.1), or the `action`
    /// parameter in `Content-Type` (SOAP 1.2). Stripped of surrounding quotes.
    pub action: Option<String>,
    /// Local name of the first child element inside `<soap:Body>`.
    pub body_element: Option<String>,
}

/// Detect and parse SOAP metadata from the HTTP request.
///
/// Returns `None` if the request is not SOAP (wrong content-type and no
/// SOAPAction header).
pub fn parse_soap_action(
    content_type: &str,
    soap_action_header: Option<&str>,
    body: &Bytes,
) -> Option<SoapAction> {
    let version = detect_version(content_type, soap_action_header)?;
    let action = extract_action(version, content_type, soap_action_header);
    let body_element = extract_body_element(body);

    Some(SoapAction {
        version,
        action,
        body_element,
    })
}

/// Wrap an upstream error body in a SOAP Fault envelope.
///
/// `upstream_status` is the HTTP status code returned by the backend.
/// `upstream_body` is the raw error payload — it becomes the `<detail>` element.
pub fn wrap_fault(
    version: SoapVersion,
    upstream_status: u16,
    upstream_body: &str,
) -> (Bytes, &'static str) {
    let (ns, fault_code, content_type) = match version {
        SoapVersion::Soap11 => (
            "http://schemas.xmlsoap.org/soap/envelope/",
            "soap:Server",
            "text/xml; charset=utf-8",
        ),
        SoapVersion::Soap12 => (
            "http://www.w3.org/2003/05/soap-envelope",
            "env:Receiver",
            "application/soap+xml; charset=utf-8",
        ),
    };

    let escaped_body = escape_xml(upstream_body);
    let envelope = format!(
        r#"<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="{ns}">
  <soap:Body>
    <soap:Fault>
      <faultcode>{fault_code}</faultcode>
      <faultstring>Upstream error: HTTP {upstream_status}</faultstring>
      <detail>{escaped_body}</detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>"#
    );

    (Bytes::from(envelope), content_type)
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

fn detect_version(content_type: &str, soap_action_header: Option<&str>) -> Option<SoapVersion> {
    let ct = content_type.split(';').next().unwrap_or("").trim();
    if ct == "application/soap+xml" {
        return Some(SoapVersion::Soap12);
    }
    if ct == "text/xml" || soap_action_header.is_some() {
        return Some(SoapVersion::Soap11);
    }
    None
}

fn extract_action(
    version: SoapVersion,
    content_type: &str,
    soap_action_header: Option<&str>,
) -> Option<String> {
    match version {
        SoapVersion::Soap11 => soap_action_header
            .map(|h| h.trim_matches('"').to_string())
            .filter(|s| !s.is_empty()),
        SoapVersion::Soap12 => {
            // SOAP 1.2 encodes the action as a Content-Type parameter:
            //   application/soap+xml; charset=utf-8; action="urn:foo"
            for part in content_type.split(';') {
                let part = part.trim();
                if let Some(val) = part.strip_prefix("action=") {
                    return Some(val.trim_matches('"').to_string());
                }
            }
            None
        }
    }
}

/// Walk the raw XML bytes looking for `<soap:Body>` and return the local
/// name of the first child element within it.
///
/// This is a minimal scanner that avoids pulling in a full XML parser for
/// the common case. It handles `<soap:Body>`, `<env:Body>`, and `<Body>`.
fn extract_body_element(body: &Bytes) -> Option<String> {
    let text = std::str::from_utf8(body).ok()?;

    // Find opening Body tag.
    let body_start = text.find(":Body>").or_else(|| text.find("<Body>"))?;
    let after_body = &text[body_start + 6..]; // skip ":Body>" or "Body>"

    // Skip whitespace.
    let after_ws = after_body.trim_start();

    // Find the next opening tag.
    let tag_start = after_ws.strip_prefix('<')?;
    let tag_end = tag_start.find(|c: char| c == '>' || c.is_ascii_whitespace())?;
    let full_tag = &tag_start[..tag_end];

    // Strip namespace prefix.
    let local = full_tag.split(':').next_back().unwrap_or(full_tag);
    Some(local.to_string())
}

fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
