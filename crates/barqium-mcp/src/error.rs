use thiserror::Error;

#[derive(Error, Debug)]
pub enum McpError {
    #[error("transport error: {0}")]
    Transport(#[from] reqwest::Error),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("RPC error {code}: {message}")]
    Rpc { code: i32, message: String },

    #[error("tool '{name}' not found on server '{server}'")]
    ToolNotFound { server: String, name: String },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("server '{server}' is not connected")]
    NotConnected { server: String },

    #[error("access denied: tool '{tool}' requires tier '{required}'")]
    AccessDenied { tool: String, required: String },
}
