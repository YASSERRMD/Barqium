use std::collections::HashMap;
use std::sync::RwLock;

use crate::error::McpError;
use crate::types::{Tool, ToolTier};

/// An entry in the tool registry with RBAC metadata.
#[derive(Clone)]
pub struct RegistryEntry {
    pub tool: Tool,
    /// Which server this tool was discovered from.
    pub server_name: String,
    /// Visibility tier for Code Mode progressive disclosure.
    pub tier: ToolTier,
    /// Roles that are allowed to invoke this tool. Empty = everyone.
    pub allowed_roles: Vec<String>,
}

/// In-memory tool registry. Holds every tool discovered from connected MCP servers.
#[derive(Default)]
pub struct ToolRegistry {
    // key: "<server_name>/<tool_name>"
    entries: RwLock<HashMap<String, RegistryEntry>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    fn key(server: &str, tool: &str) -> String {
        format!("{server}/{tool}")
    }

    /// Register or update a tool discovered from `server_name`.
    pub fn upsert(
        &self,
        server_name: &str,
        tool: Tool,
        tier: ToolTier,
        allowed_roles: Vec<String>,
    ) {
        let key = Self::key(server_name, &tool.name);
        let entry = RegistryEntry {
            tool,
            server_name: server_name.to_string(),
            tier,
            allowed_roles,
        };
        self.entries
            .write()
            .expect("registry write lock")
            .insert(key, entry);
    }

    /// Remove all tools belonging to `server_name` (called on disconnect).
    pub fn remove_server(&self, server_name: &str) {
        self.entries
            .write()
            .expect("registry write lock")
            .retain(|k, _| !k.starts_with(&format!("{server_name}/")));
    }

    /// Return all tools visible at or below `max_tier` for the given roles.
    pub fn visible_tools(&self, max_tier: ToolTier, roles: &[String]) -> Vec<RegistryEntry> {
        self.entries
            .read()
            .expect("registry read lock")
            .values()
            .filter(|e| tier_level(e.tier) <= tier_level(max_tier))
            .filter(|e| is_allowed(&e.allowed_roles, roles))
            .cloned()
            .collect()
    }

    /// Look up a specific tool and check RBAC. Returns `AccessDenied` if the
    /// caller's roles don't satisfy the tool's `allowed_roles`.
    pub fn get_checked(
        &self,
        server_name: &str,
        tool_name: &str,
        caller_roles: &[String],
    ) -> Result<RegistryEntry, McpError> {
        let key = Self::key(server_name, tool_name);
        let entries = self.entries.read().expect("registry read lock");
        let entry = entries.get(&key).ok_or_else(|| McpError::ToolNotFound {
            server: server_name.to_string(),
            name: tool_name.to_string(),
        })?;

        if !is_allowed(&entry.allowed_roles, caller_roles) {
            return Err(McpError::AccessDenied {
                tool: tool_name.to_string(),
                required: format!("{:?}", entry.allowed_roles),
            });
        }

        Ok(entry.clone())
    }
}

fn tier_level(t: ToolTier) -> u8 {
    match t {
        ToolTier::ReadOnly => 0,
        ToolTier::Limited => 1,
        ToolTier::Full => 2,
    }
}

fn is_allowed(allowed: &[String], caller: &[String]) -> bool {
    // Empty allow-list means all roles are permitted.
    if allowed.is_empty() {
        return true;
    }
    caller.iter().any(|r| allowed.contains(r))
}
