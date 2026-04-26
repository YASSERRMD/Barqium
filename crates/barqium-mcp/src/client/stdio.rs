use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;

use serde_json::{json, Value};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, ChildStdin, ChildStdout, Command};
use tokio::sync::Mutex;
use tracing::{debug, info};

use crate::error::McpError;
use crate::types::{ServerCapabilities, ServerInfo, Tool, ToolCall, ToolResult};

/// MCP client that communicates with a local MCP server subprocess over stdin/stdout.
///
/// The subprocess speaks the MCP stdio transport: newline-delimited JSON-RPC messages
/// written to stdin and read from stdout.
pub struct StdioMcpClient {
    id_counter: Arc<AtomicU64>,
    stdin: Arc<Mutex<ChildStdin>>,
    stdout: Arc<Mutex<BufReader<ChildStdout>>>,
    _child: Child,
    server_info: Option<ServerInfo>,
    capabilities: ServerCapabilities,
    tools: Vec<Tool>,
}

impl StdioMcpClient {
    /// Spawn `command` with `args` as a subprocess MCP server and initialize the session.
    pub async fn spawn(command: &str, args: &[&str]) -> Result<Self, McpError> {
        let mut child = Command::new(command)
            .args(args)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::inherit())
            .spawn()?;

        let stdin = child.stdin.take().expect("piped stdin");
        let stdout = child.stdout.take().expect("piped stdout");

        let mut client = Self {
            id_counter: Arc::new(AtomicU64::new(1)),
            stdin: Arc::new(Mutex::new(stdin)),
            stdout: Arc::new(Mutex::new(BufReader::new(stdout))),
            _child: child,
            server_info: None,
            capabilities: ServerCapabilities::default(),
            tools: Vec::new(),
        };

        client.initialize().await?;
        Ok(client)
    }

    fn next_id(&self) -> u64 {
        self.id_counter.fetch_add(1, Ordering::Relaxed)
    }

    async fn initialize(&mut self) -> Result<(), McpError> {
        let id = self.next_id();
        let result = self
            .rpc(
                id,
                "initialize",
                Some(json!({
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": { "name": "barqium", "version": "0.1.0" }
                })),
            )
            .await?;

        self.capabilities =
            serde_json::from_value(result["capabilities"].clone()).unwrap_or_default();
        self.server_info = serde_json::from_value(result["serverInfo"].clone()).ok();

        // Send initialized notification (no response expected).
        let notif = json!({ "jsonrpc": "2.0", "method": "notifications/initialized" });
        self.write_line(&notif).await?;

        if self.capabilities.tools.is_some() {
            self.refresh_tools().await?;
        }

        info!(tools = self.tools.len(), "stdio MCP server connected");
        Ok(())
    }

    pub async fn refresh_tools(&mut self) -> Result<(), McpError> {
        let id = self.next_id();
        let result = self.rpc(id, "tools/list", None).await?;
        self.tools = serde_json::from_value(result["tools"].clone()).unwrap_or_default();
        debug!(count = self.tools.len(), "stdio tools refreshed");
        Ok(())
    }

    pub fn tools(&self) -> &[Tool] {
        &self.tools
    }

    pub fn server_info(&self) -> Option<&ServerInfo> {
        self.server_info.as_ref()
    }

    pub async fn call_tool(&self, call: ToolCall) -> Result<ToolResult, McpError> {
        let id = self.next_id();
        let result = self
            .rpc(
                id,
                "tools/call",
                Some(json!({ "name": call.name, "arguments": call.arguments })),
            )
            .await?;
        Ok(serde_json::from_value(result)?)
    }

    async fn rpc(&self, id: u64, method: &str, params: Option<Value>) -> Result<Value, McpError> {
        let req = match params {
            Some(p) => json!({ "jsonrpc": "2.0", "id": id, "method": method, "params": p }),
            None => json!({ "jsonrpc": "2.0", "id": id, "method": method }),
        };
        self.write_line(&req).await?;

        // Read responses until we find one matching our id.
        let mut stdout = self.stdout.lock().await;
        loop {
            let mut line = String::new();
            let n = stdout.read_line(&mut line).await?;
            if n == 0 {
                return Err(McpError::Rpc {
                    code: -32700,
                    message: "subprocess closed stdout".into(),
                });
            }
            let v: Value = serde_json::from_str(line.trim())?;
            // Match on request id (may be integer or string).
            if v["id"] == json!(id) {
                if let Some(err) = v.get("error").and_then(|e| e.as_object()) {
                    return Err(McpError::Rpc {
                        code: err.get("code").and_then(|c| c.as_i64()).unwrap_or(-32603) as i32,
                        message: err
                            .get("message")
                            .and_then(|m| m.as_str())
                            .unwrap_or("unknown")
                            .into(),
                    });
                }
                return Ok(v["result"].clone());
            }
            // Skip notifications and responses for other ids.
        }
    }

    async fn write_line(&self, value: &Value) -> Result<(), McpError> {
        let mut line = serde_json::to_string(value)?;
        line.push('\n');
        let mut stdin = self.stdin.lock().await;
        stdin.write_all(line.as_bytes()).await?;
        stdin.flush().await?;
        Ok(())
    }
}
