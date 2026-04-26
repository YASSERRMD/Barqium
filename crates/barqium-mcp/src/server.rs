use std::sync::Arc;

use serde_json::{json, Value};
use tracing::{debug, warn};

use crate::error::McpError;
use crate::registry::ToolRegistry;
use crate::types::{
    RpcError, RpcRequest, RpcResponse, ServerCapabilities, ServerInfo, ToolCall, ToolContent,
    ToolResult, ToolTier, ToolsCapability,
};

type DispatchFn = Arc<
    dyn Fn(String, ToolCall) -> futures::future::BoxFuture<'static, Result<ToolResult, McpError>>
        + Send
        + Sync,
>;

/// The Barqium MCP server role.
///
/// Exposes a single JSON-RPC endpoint that aggregates tools from all connected
/// upstream MCP servers. Agents connect here and call tools without knowing
/// which upstream server handles each tool.
pub struct McpServer {
    registry: Arc<ToolRegistry>,
    info: ServerInfo,
    /// Optional upstream call dispatcher. Takes (server_name, ToolCall) and
    /// returns ToolResult. Injected at construction so the server stays
    /// transport-agnostic.
    dispatcher: DispatchFn,
}

impl McpServer {
    pub fn new(
        registry: Arc<ToolRegistry>,
        dispatcher: impl Fn(
                String,
                ToolCall,
            ) -> futures::future::BoxFuture<'static, Result<ToolResult, McpError>>
            + Send
            + Sync
            + 'static,
    ) -> Self {
        Self {
            registry,
            info: ServerInfo {
                name: "barqium".into(),
                version: env!("CARGO_PKG_VERSION").to_string(),
            },
            dispatcher: Arc::new(dispatcher),
        }
    }

    /// Handle a single JSON-RPC request from an agent. Returns the response JSON.
    pub async fn handle(
        &self,
        raw: &Value,
        caller_roles: &[String],
        max_tier: ToolTier,
    ) -> RpcResponse {
        let req: RpcRequest = match serde_json::from_value(raw.clone()) {
            Ok(r) => r,
            Err(e) => {
                return error_response(Value::Null, -32700, &format!("parse error: {e}"));
            }
        };

        let id = req.id.clone();
        match req.method.as_str() {
            "initialize" => self.handle_initialize(id),
            "tools/list" => self.handle_tools_list(id, caller_roles, max_tier),
            "tools/call" => self.handle_tools_call(id, req.params, caller_roles).await,
            _ => error_response(id, -32601, "method not found"),
        }
    }

    fn handle_initialize(&self, id: Value) -> RpcResponse {
        let caps = ServerCapabilities {
            tools: Some(ToolsCapability { list_changed: true }),
            ..Default::default()
        };
        ok_response(
            id,
            json!({
                "protocolVersion": "2024-11-05",
                "capabilities": caps,
                "serverInfo": self.info,
            }),
        )
    }

    fn handle_tools_list(
        &self,
        id: Value,
        caller_roles: &[String],
        max_tier: ToolTier,
    ) -> RpcResponse {
        let tools: Vec<Value> = self
            .registry
            .visible_tools(max_tier, caller_roles)
            .into_iter()
            .map(|e| serde_json::to_value(e.tool).unwrap_or(Value::Null))
            .collect();
        debug!(count = tools.len(), "tools/list");
        ok_response(id, json!({ "tools": tools }))
    }

    async fn handle_tools_call(
        &self,
        id: Value,
        params: Option<Value>,
        caller_roles: &[String],
    ) -> RpcResponse {
        let params = match params {
            Some(p) => p,
            None => return error_response(id, -32602, "missing params"),
        };

        let tool_name = match params["name"].as_str() {
            Some(n) => n.to_string(),
            None => return error_response(id, -32602, "missing tool name"),
        };
        let arguments = params["arguments"].clone();

        // Find the tool across all servers. We search visible entries first.
        // The registry key is "<server>/<tool>"; we scan for any server with this tool.
        let all = self.registry.visible_tools(ToolTier::Full, caller_roles);
        let entry = match all.into_iter().find(|e| e.tool.name == tool_name) {
            Some(e) => e,
            None => {
                return error_response(id, -32601, &format!("tool '{tool_name}' not found"));
            }
        };

        // RBAC check.
        match self
            .registry
            .get_checked(&entry.server_name, &tool_name, caller_roles)
        {
            Err(McpError::AccessDenied { .. }) => {
                return error_response(id, -32603, "access denied");
            }
            Err(e) => {
                warn!(error = %e, "tool lookup error");
                return error_response(id, -32603, &e.to_string());
            }
            Ok(_) => {}
        }

        let call = ToolCall {
            name: tool_name,
            arguments,
        };
        let server_name = entry.server_name.clone();
        let dispatcher = self.dispatcher.clone();

        match (dispatcher)(server_name, call).await {
            Ok(result) => ok_response(id, serde_json::to_value(result).unwrap_or(Value::Null)),
            Err(e) => {
                // Return a tool-level error as a successful RPC with isError=true.
                let err_result = ToolResult {
                    content: vec![ToolContent::Text {
                        text: e.to_string(),
                    }],
                    is_error: true,
                };
                ok_response(id, serde_json::to_value(err_result).unwrap_or(Value::Null))
            }
        }
    }
}

fn ok_response(id: Value, result: Value) -> RpcResponse {
    RpcResponse {
        jsonrpc: "2.0".into(),
        id,
        result: Some(result),
        error: None,
    }
}

fn error_response(id: Value, code: i32, message: &str) -> RpcResponse {
    RpcResponse {
        jsonrpc: "2.0".into(),
        id,
        result: None,
        error: Some(RpcError {
            code,
            message: message.to_string(),
            data: None,
        }),
    }
}
