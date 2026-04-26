use std::collections::HashMap;

use uuid::Uuid;

type Detector = fn(&str) -> Vec<(usize, usize)>;

/// Detected PII span: byte offsets in the original text.
#[derive(Debug, Clone)]
pub struct PiiSpan {
    pub label: &'static str,
    pub start: usize,
    pub end: usize,
}

/// The result of a redaction pass.
#[derive(Debug, Clone)]
pub struct RedactedText {
    /// The text with PII replaced by opaque tokens, e.g. `[EMAIL:abc123]`.
    pub redacted: String,
    /// Map from opaque token back to the original value.
    /// Used for reversible tokenisation within a session.
    pub token_map: HashMap<String, String>,
}

impl RedactedText {
    /// Restore original PII values by reversing the token map.
    pub fn restore(&self) -> String {
        let mut text = self.redacted.clone();
        for (token, original) in &self.token_map {
            text = text.replace(token.as_str(), original.as_str());
        }
        text
    }
}

// ---------------------------------------------------------------------------
// Simple built-in detectors (no regex, no ML — rules-based on common patterns)
// ---------------------------------------------------------------------------

fn detect_email(text: &str) -> Vec<(usize, usize)> {
    let mut spans = Vec::new();
    let mut i = 0;
    while i < text.len() {
        if let Some(at) = text[i..].find('@') {
            let at = i + at;
            // Walk left for local part.
            let start = text[..at]
                .rfind(|c: char| {
                    !c.is_alphanumeric() && c != '.' && c != '_' && c != '-' && c != '+'
                })
                .map(|p| p + 1)
                .unwrap_or(0);
            // Walk right for domain.
            let end = text[at + 1..]
                .find(|c: char| !c.is_alphanumeric() && c != '.' && c != '-')
                .map(|p| at + 1 + p)
                .unwrap_or(text.len());
            if end > at + 2 && at > start {
                spans.push((start, end));
            }
            i = end;
        } else {
            break;
        }
    }
    spans
}

fn detect_phone(text: &str) -> Vec<(usize, usize)> {
    let mut spans = Vec::new();
    let chars: Vec<char> = text.chars().collect();
    let mut i = 0;
    while i < chars.len() {
        // Look for a run of digits, spaces, dashes, parentheses of length >= 10.
        if chars[i].is_ascii_digit() || chars[i] == '+' {
            let start = i;
            let mut digit_count = 0usize;
            let mut j = i;
            while j < chars.len()
                && (chars[j].is_ascii_digit()
                    || chars[j] == ' '
                    || chars[j] == '-'
                    || chars[j] == '('
                    || chars[j] == ')'
                    || chars[j] == '+'
                    || chars[j] == '.')
            {
                if chars[j].is_ascii_digit() {
                    digit_count += 1;
                }
                j += 1;
            }
            if (10..=15).contains(&digit_count) {
                let byte_start: usize = chars[..start].iter().map(|c| c.len_utf8()).sum();
                let byte_end: usize = chars[..j].iter().map(|c| c.len_utf8()).sum();
                spans.push((byte_start, byte_end));
            }
            i = if j > i { j } else { i + 1 };
        } else {
            i += 1;
        }
    }
    spans
}

/// Redact PII in `text`, replacing each detected span with an opaque token.
/// Returns the redacted text and a map for reversing the substitutions.
pub fn redact(text: &str) -> RedactedText {
    let detectors: &[(&str, Detector)] = &[("EMAIL", detect_email), ("PHONE", detect_phone)];

    let mut all_spans: Vec<(&str, usize, usize)> = Vec::new();
    for (label, detect) in detectors {
        for (start, end) in detect(text) {
            all_spans.push((label, start, end));
        }
    }

    // Sort by start offset, then by longest span first (for overlap resolution).
    all_spans.sort_by(|a, b| a.1.cmp(&b.1).then(b.2.cmp(&a.2)));

    let mut result = String::with_capacity(text.len());
    let mut token_map: HashMap<String, String> = HashMap::new();
    let mut cursor = 0;

    for (label, start, end) in all_spans {
        if start < cursor {
            continue;
        }
        result.push_str(&text[cursor..start]);
        let original = text[start..end].to_string();
        let token = format!("[{label}:{}]", &Uuid::new_v4().to_string()[..8]);
        token_map.insert(token.clone(), original);
        result.push_str(&token);
        cursor = end;
    }
    result.push_str(&text[cursor..]);

    RedactedText {
        redacted: result,
        token_map,
    }
}
