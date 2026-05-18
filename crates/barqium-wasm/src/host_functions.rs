//! Host-side functions exposed to WASM plugins via the wasmtime linker.
//!
//! Each function documented here is registered in the wasmtime `Linker`
//! under the `"env"` module and is callable from within the plugin's
//! Wasm module using the corresponding import declaration.

/// Catalogue of host functions available to WASM plugins.
///
/// Use this struct as a documentation anchor. The actual implementations
/// live in `host.rs` and are registered on the wasmtime `Linker` at
/// engine initialisation time.
///
/// # Available host functions
///
/// | Wasm import name     | Rust handler      | Description                          |
/// |----------------------|-------------------|--------------------------------------|
/// | `barqium_log`        | [`HostFunctions::log`]         | Emit a log message at INFO level      |
/// | `barqium_get_header` | [`HostFunctions::get_header`]  | Read a request/response header value |
/// | `barqium_set_header` | [`HostFunctions::set_header`]  | Write a request/response header value|
/// | `barqium_get_body`   | [`HostFunctions::get_body`]    | Read the full request or response body|
#[derive(Debug, Clone)]
pub struct HostFunctions;

impl HostFunctions {
    /// Emit a UTF-8 message to the gateway's structured log at INFO level.
    ///
    /// The plugin passes a pointer and length into its linear memory.
    /// The host copies the bytes, validates them as UTF-8, and calls
    /// `tracing::info!`.
    ///
    /// **Wasm signature**: `(ptr: i32, len: i32) -> ()`
    pub fn log(_msg: &str) {
        // Stub: real implementation registered in host.rs via Linker.
    }

    /// Read the value of a named HTTP header from the active request or
    /// response context. Returns an empty string if the header is absent.
    ///
    /// **Wasm signature**: `(name_ptr: i32, name_len: i32, out_ptr: i32, out_len: i32) -> i32`
    /// (returns the number of bytes written into the output buffer)
    pub fn get_header(_name: &str) -> String {
        // Stub: real implementation registered in host.rs via Linker.
        String::new()
    }

    /// Set or overwrite an HTTP header in the active request or response
    /// context. The change is visible to subsequent plugins in the chain.
    ///
    /// **Wasm signature**: `(name_ptr: i32, name_len: i32, value_ptr: i32, value_len: i32) -> ()`
    pub fn set_header(_name: &str, _value: &str) {
        // Stub: real implementation registered in host.rs via Linker.
    }

    /// Copy the full HTTP body (request or response) into the plugin's
    /// linear memory. Returns the number of bytes written.
    ///
    /// **Wasm signature**: `(out_ptr: i32, out_capacity: i32) -> i32`
    pub fn get_body() -> Vec<u8> {
        // Stub: real implementation registered in host.rs via Linker.
        Vec::new()
    }
}
