//! Plugin configuration loaded from disk or the control-plane API.

/// Configuration for a single WASM plugin.
///
/// This struct is deserialised from a JSON configuration file or from
/// the control-plane API response. It carries everything the runtime
/// needs to load, compile, and execute the plugin.
#[derive(Debug, Clone)]
pub struct PluginConfig {
    /// Human-readable plugin name (e.g. `"pii-redactor"`).
    pub name: String,

    /// Semantic version of the plugin (e.g. `"2.1.0"`).
    pub version: String,

    /// When this plugin should be invoked (on request, response, or both).
    ///
    /// Parsed from the string `"on_request"`, `"on_response"`, or `"both"`.
    pub trigger: String,

    /// Raw WASM bytecode for the plugin module.
    ///
    /// Loaded from the `.wasm` file referenced by the configuration and
    /// passed directly to the wasmtime compiler.
    pub wasm_bytes: Vec<u8>,

    /// Arbitrary plugin-specific settings serialised as a JSON string.
    ///
    /// The plugin can read this value from its environment using the
    /// `get_config` host function. An empty string disables the feature.
    pub config_json: String,
}

impl PluginConfig {
    /// Create a minimal `PluginConfig` with empty wasm bytes and no config JSON.
    pub fn new(name: impl Into<String>, version: impl Into<String>, trigger: impl Into<String>) -> Self {
        Self {
            name: name.into(),
            version: version.into(),
            trigger: trigger.into(),
            wasm_bytes: Vec::new(),
            config_json: String::new(),
        }
    }

    /// Attach raw WASM bytecode to this config.
    pub fn with_wasm_bytes(mut self, bytes: Vec<u8>) -> Self {
        self.wasm_bytes = bytes;
        self
    }

    /// Attach a JSON configuration string to this config.
    pub fn with_config_json(mut self, json: impl Into<String>) -> Self {
        self.config_json = json.into();
        self
    }
}
