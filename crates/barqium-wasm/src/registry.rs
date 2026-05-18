//! Plugin registry — maps plugin IDs to compiled plugin entries.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};

/// Metadata and compiled artefacts for a single plugin.
#[derive(Debug, Clone)]
pub struct PluginEntry {
    /// Unique identifier for the plugin (e.g. `"my-plugin-v1"`).
    pub plugin_id: String,
    /// Human-readable display name.
    pub name: String,
    /// Semantic version string (e.g. `"1.2.3"`).
    pub version: String,
    /// Arbitrary key–value metadata attached to the plugin at load time.
    pub metadata: HashMap<String, String>,
}

impl PluginEntry {
    /// Create a new plugin entry with the given id, name and version.
    pub fn new(plugin_id: impl Into<String>, name: impl Into<String>, version: impl Into<String>) -> Self {
        Self {
            plugin_id: plugin_id.into(),
            name: name.into(),
            version: version.into(),
            metadata: HashMap::new(),
        }
    }

    /// Attach a metadata key–value pair to this entry.
    pub fn with_meta(mut self, key: impl Into<String>, value: impl Into<String>) -> Self {
        self.metadata.insert(key.into(), value.into());
        self
    }
}

/// Thread-safe registry mapping `plugin_id` → [`PluginEntry`].
///
/// The registry is read-heavy (every request reads from it) so internal
/// mutation is guarded by an `RwLock` to allow concurrent reads.
#[derive(Debug, Default, Clone)]
pub struct PluginRegistry {
    inner: Arc<RwLock<HashMap<String, PluginEntry>>>,
}

impl PluginRegistry {
    /// Create an empty registry.
    pub fn new() -> Self {
        Self::default()
    }

    /// Register a plugin entry, replacing any existing entry with the same id.
    pub fn register(&self, entry: PluginEntry) {
        let mut map = self.inner.write().expect("plugin registry lock poisoned");
        map.insert(entry.plugin_id.clone(), entry);
    }

    /// Remove the plugin with the given id, returning it if found.
    pub fn unregister(&self, plugin_id: &str) -> Option<PluginEntry> {
        let mut map = self.inner.write().expect("plugin registry lock poisoned");
        map.remove(plugin_id)
    }

    /// Look up a plugin by id, returning a clone if found.
    pub fn get(&self, plugin_id: &str) -> Option<PluginEntry> {
        let map = self.inner.read().expect("plugin registry lock poisoned");
        map.get(plugin_id).cloned()
    }

    /// Return the number of registered plugins.
    pub fn len(&self) -> usize {
        let map = self.inner.read().expect("plugin registry lock poisoned");
        map.len()
    }

    /// Return `true` if no plugins are registered.
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Return the IDs of all registered plugins.
    pub fn plugin_ids(&self) -> Vec<String> {
        let map = self.inner.read().expect("plugin registry lock poisoned");
        map.keys().cloned().collect()
    }
}
