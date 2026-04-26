use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use bytes::Bytes;
use futures::StreamExt;
use reqwest::Client;
use serde_json::{json, Value};
use tracing::{debug, info};

use crate::error::McpError;
use crate::types::{
    RpcRequest, RpcResponse, ServerCapabilities, ServerInfo, Tool, ToolCall, ToolResult,
};

/// MCP client that communicates with a remote server over HTTP POST + SSE.
///
/// Follows the MCP HTTP transport spec:
///   - All JSON-RPC requests POST to the server endpoint.
///   - The server may stream SSE events back (e.g. progress notifications).
pub struct HttpMcpClient {
    client: Client,
    endpoint: String,
    id_counter: Arc<AtomicU64>,
    server_info: Option<ServerInfo>,
    capabilities: ServerCapabilities,
    tools: Vec<Tool>,
}

impl HttpMcpClient {
    pub fn new(endpoint: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            endpoint: endpoint.into(),
            id_counter: Arc::new(AtomicU64::new(1)),
            server_info: None,
            capabilities: ServerCapabilities::default(),
            tools: Vec::new(),
        }
    }

    fn next_id(&self) -> u64 {
        self.id_counter.fetch_add(1, Ordering::Relaxed)
    }

    /// Perform the MCP `initialize` handshake and fetch the tool list.
    pub async fn connect(&mut self) -> Result<(), McpError> {
        let id = self.next_id();
        let resp = self
            .send(RpcRequest::new(
                id,
                "initialize",
                Some(json!({
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": { "name": "barqium", "version": "0.1.0" }
                })),
            ))
            .await?;

        let result = resp.result.ok_or_else(|| McpError::Rpc {
            code: -32600,
            message: "initialize returned no result".into(),
        })?;

        self.capabilities =
            serde_json::from_value(result["capabilities"].clone()).unwrap_or_default();
        self.server_info = serde_json::from_value(result["serverInfo"].clone()).ok();

        // Send the initialized notification (fire-and-forget, no response expected).
        let notif = RpcRequest::new(serde_json::Value::Null, "notifications/initialized", None);
        let _ = self.client.post(&self.endpoint).json(&notif).send().await;

        // Fetch tools if the server supports them.
        if self.capabilities.tools.is_some() {
            self.refresh_tools().await?;
        }

        info!(
            endpoint = self.endpoint,
            tools = self.tools.len(),
            "MCP server connected"
        );
        Ok(())
    }

    /// Re-fetch the tool list from the server.
    pub async fn refresh_tools(&mut self) -> Result<(), McpError> {
        let id = self.next_id();
        let resp = self.send(RpcRequest::new(id, "tools/list", None)).await?;

        let result = resp.result.unwrap_or(json!({"tools": []}));
        self.tools = serde_json::from_value(result["tools"].clone()).unwrap_or_default();
        debug!(count = self.tools.len(), "tools refreshed");
        Ok(())
    }

    /// Returns the list of tools advertised by this server.
    pub fn tools(&self) -> &[Tool] {
        &self.tools
    }

    pub fn server_info(&self) -> Option<&ServerInfo> {
        self.server_info.as_ref()
    }

    /// Invoke a tool and return its result.
    pub async fn call_tool(&self, call: ToolCall) -> Result<ToolResult, McpError> {
        let id = self.next_id();
        let resp = self
            .send(RpcRequest::new(
                id,
                "tools/call",
                Some(json!({ "name": call.name, "arguments": call.arguments })),
            ))
            .await?;

        match resp.result {
            Some(v) => Ok(serde_json::from_value(v)?),
            None => {
                let err = resp.error.unwrap_or(crate::types::RpcError {
                    code: -32603,
                    message: "unknown error".into(),
                    data: None,
                });
                Err(McpError::Rpc {
                    code: err.code,
                    message: err.message,
                })
            }
        }
    }

    /// Low-level: POST a JSON-RPC request and await the response.
    async fn send(&self, req: RpcRequest) -> Result<RpcResponse, McpError> {
        let http_resp = self.client.post(&self.endpoint).json(&req).send().await?;

        let status = http_resp.status().as_u16();
        if !http_resp.status().is_success() {
            let text = http_resp.text().await.unwrap_or_default();
            return Err(McpError::Rpc {
                code: status as i32,
                message: text,
            });
        }

        let body = http_resp.text().await?;
        // Handle SSE response: extract the first `data:` line.
        let json_str = if body.contains("data:") {
            body.lines()
                .find(|l| l.starts_with("data:"))
                .map(|l| l["data:".len()..].trim())
                .unwrap_or(&body)
                .to_string()
        } else {
            body
        };

        Ok(serde_json::from_str(&json_str)?)
    }

    /// Subscribe to SSE events from the server (e.g. progress, tool list changes).
    /// Calls `on_event` for each parsed JSON notification.
    pub async fn subscribe_sse(
        &self,
        on_event: impl Fn(Value) + Send + 'static,
    ) -> Result<(), McpError> {
        let resp = self
            .client
            .get(format!("{}/sse", self.endpoint))
            .header("Accept", "text/event-stream")
            .send()
            .await?;

        let mut stream = resp.bytes_stream();
        while let Some(result) = stream.next().await {
            let bytes: Bytes = result?;
            let text = String::from_utf8_lossy(&bytes);
            for line in text.lines() {
                if let Some(data) = line.strip_prefix("data:") {
                    if let Ok(v) = serde_json::from_str::<Value>(data.trim()) {
                        on_event(v);
                    }
                }
            }
        }
        Ok(())
    }
}
