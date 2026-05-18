use thiserror::Error;

/// Errors that can occur during WASM plugin lifecycle operations.
///
/// This enum complements [`WasmError`] and represents higher-level,
/// plugin-management failures rather than raw wasmtime engine errors.
#[derive(Debug, Error)]
pub enum PluginError {
    /// The plugin's `.wasm` bytes could not be compiled or linked.
    #[error("plugin load failed: {0}")]
    LoadFailed(String),

    /// The plugin's exported function returned an error or trapped.
    #[error("plugin execution failed: {0}")]
    ExecutionFailed(String),

    /// The plugin did not complete within the configured time limit.
    #[error("plugin timed out after {timeout_ms}ms")]
    Timeout {
        /// The configured timeout that was exceeded.
        timeout_ms: u64,
    },

    /// The plugin exceeded a sandbox resource limit (memory or instructions).
    #[error("sandbox violation: {reason}")]
    SandboxViolation {
        /// Human-readable description of the violated limit.
        reason: String,
    },
}

#[derive(Debug, Error)]
pub enum WasmError {
    #[error("wasmtime engine error: {0}")]
    Engine(#[from] wasmtime::Error),

    #[error("plugin file not found: {0}")]
    NotFound(String),

    #[error("plugin compile error: {0}")]
    Compile(String),

    #[error("plugin instantiation error: {0}")]
    Instantiate(String),

    #[error("plugin call error: {0}")]
    Call(String),

    #[error("host function error: {0}")]
    HostFn(String),
}
