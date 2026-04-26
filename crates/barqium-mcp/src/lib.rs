//! MCP client and server roles, tool registry, per-tool RBAC, Code Mode disclosure.

pub mod error;
pub mod types;

pub use error::McpError;
pub use types::{
    ResourceLink, RpcError, RpcRequest, RpcResponse, ServerCapabilities, ServerInfo, Tool,
    ToolCall, ToolContent, ToolResult, ToolTier,
};
