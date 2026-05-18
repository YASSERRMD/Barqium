//! Plugin trigger — controls at which point in the request lifecycle a plugin runs.

use std::fmt;

/// Defines when a WASM plugin is invoked relative to the HTTP request/response cycle.
///
/// A plugin may be configured to run before the upstream call (`OnRequest`),
/// after the upstream call (`OnResponse`), or at both points (`Both`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum PluginTrigger {
    /// Run the plugin on the inbound request before it is forwarded upstream.
    OnRequest,
    /// Run the plugin on the upstream response before it is returned to the client.
    OnResponse,
    /// Run the plugin on both the inbound request and the upstream response.
    Both,
}

impl fmt::Display for PluginTrigger {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::OnRequest => write!(f, "on_request"),
            Self::OnResponse => write!(f, "on_response"),
            Self::Both => write!(f, "both"),
        }
    }
}

impl std::str::FromStr for PluginTrigger {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_ascii_lowercase().as_str() {
            "on_request" | "request" => Ok(Self::OnRequest),
            "on_response" | "response" => Ok(Self::OnResponse),
            "both" => Ok(Self::Both),
            other => Err(format!("unknown trigger '{other}'; expected on_request, on_response, or both")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_round_trips() {
        for trigger in [PluginTrigger::OnRequest, PluginTrigger::OnResponse, PluginTrigger::Both] {
            let s = trigger.to_string();
            let parsed: PluginTrigger = s.parse().expect("round-trip parse failed");
            assert_eq!(parsed, trigger);
        }
    }
}
