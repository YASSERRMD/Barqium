//! Plugin sandbox configuration — resource limits applied per plugin invocation.

/// Resource limits applied to a single WASM plugin execution.
///
/// The sandbox configuration is checked by the wasmtime host before
/// calling the plugin's exported function. Violations result in a
/// [`crate::error::PluginError::SandboxViolation`].
#[derive(Debug, Clone)]
pub struct PluginSandbox {
    /// Maximum number of bytes the plugin's linear memory may grow to.
    ///
    /// wasmtime enforces this via its `StoreLimits` API. A value of
    /// `64 * 1024 * 1024` (64 MiB) is a reasonable default for most
    /// request-transformation plugins.
    pub memory_limit_bytes: u64,

    /// Maximum number of Wasm instructions the plugin may execute per call.
    ///
    /// Implemented via wasmtime's fuel consumption mechanism. Set to `0`
    /// to disable the limit (useful in development environments).
    pub max_instructions: u64,
}

impl Default for PluginSandbox {
    fn default() -> Self {
        Self {
            memory_limit_bytes: 64 * 1024 * 1024, // 64 MiB
            max_instructions: 1_000_000,
        }
    }
}

impl PluginSandbox {
    /// Create a sandbox with default limits (64 MiB memory, 1M instructions).
    pub fn new() -> Self {
        Self::default()
    }

    /// Create a sandbox with the given memory limit (bytes) and instruction cap.
    pub fn with_limits(memory_limit_bytes: u64, max_instructions: u64) -> Self {
        Self {
            memory_limit_bytes,
            max_instructions,
        }
    }

    /// Return `true` if the instruction limit is disabled.
    pub fn is_unlimited(&self) -> bool {
        self.max_instructions == 0
    }
}
