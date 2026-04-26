use std::collections::HashMap;
use std::sync::RwLock;

use barqium_mcp::types::ToolTier;

/// Session-level Code Mode gate.
///
/// Each session starts at `ReadOnly`. The gate advances to `Limited` or `Full`
/// only after an explicit confirmation step from the caller.
/// Once advanced, a tier cannot be downgraded within the same session.
pub struct CodeModeGate {
    sessions: RwLock<HashMap<String, ToolTier>>,
}

impl CodeModeGate {
    pub fn new() -> Self {
        Self {
            sessions: RwLock::new(HashMap::new()),
        }
    }

    /// Return the current tier for `session_id`. Defaults to `ReadOnly`.
    pub fn tier(&self, session_id: &str) -> ToolTier {
        self.sessions
            .read()
            .expect("gate read lock")
            .get(session_id)
            .copied()
            .unwrap_or(ToolTier::ReadOnly)
    }

    /// Advance the session to `target_tier` if it is higher than the current tier.
    /// Returns the new tier.
    pub fn advance(&self, session_id: &str, target_tier: ToolTier) -> ToolTier {
        let mut sessions = self.sessions.write().expect("gate write lock");
        let current = sessions
            .get(session_id)
            .copied()
            .unwrap_or(ToolTier::ReadOnly);
        let new_tier = max_tier(current, target_tier);
        sessions.insert(session_id.to_string(), new_tier);
        new_tier
    }

    /// Remove the session (called on session close).
    pub fn remove(&self, session_id: &str) {
        self.sessions
            .write()
            .expect("gate write lock")
            .remove(session_id);
    }
}

impl Default for CodeModeGate {
    fn default() -> Self {
        Self::new()
    }
}

fn max_tier(a: ToolTier, b: ToolTier) -> ToolTier {
    if tier_ord(b) > tier_ord(a) {
        b
    } else {
        a
    }
}

fn tier_ord(t: ToolTier) -> u8 {
    match t {
        ToolTier::ReadOnly => 0,
        ToolTier::Limited => 1,
        ToolTier::Full => 2,
    }
}
