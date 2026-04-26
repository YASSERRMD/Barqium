use thiserror::Error;

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
