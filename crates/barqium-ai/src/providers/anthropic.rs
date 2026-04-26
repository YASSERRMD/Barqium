use async_trait::async_trait;
use bytes::Bytes;
use futures::stream::{self, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tracing::debug;

use crate::error::AiError;
use crate::provider::{AiProvider, ChatStream};
use crate::types::{
    ChatChunk, ChatRequest, ChatResponse, Choice, DeltaContent, FinishReason, Message,
    ModelPricing, Role, TokenUsage,
};

const BASE_URL: &str = "https://api.anthropic.com/v1";
const ANTHROPIC_VERSION: &str = "2023-06-01";

pub struct AnthropicProvider {
    client: Client,
    api_key: String,
}

impl AnthropicProvider {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.into(),
        }
    }
}

// ---------------------------------------------------------------------------
// Wire types (Anthropic Messages API schema)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct AnthropicRequest<'a> {
    model: &'a str,
    messages: Vec<AnthropicMessage<'a>>,
    max_tokens: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<&'a str>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    stream: bool,
}

#[derive(Serialize)]
struct AnthropicMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Deserialize)]
struct AnthropicResponse {
    id: String,
    model: String,
    content: Vec<AnthropicContent>,
    stop_reason: Option<String>,
    usage: AnthropicUsage,
}

#[derive(Deserialize)]
struct AnthropicContent {
    #[serde(rename = "type")]
    content_type: String,
    text: Option<String>,
}

#[derive(Deserialize, Default)]
struct AnthropicUsage {
    input_tokens: u32,
    output_tokens: u32,
}

// ---------------------------------------------------------------------------
// SSE event types for streaming
// ---------------------------------------------------------------------------

#[derive(Deserialize)]
struct StreamEvent {
    #[serde(rename = "type")]
    event_type: String,
    #[allow(dead_code)]
    index: Option<u32>,
    delta: Option<StreamDelta>,
    // usage is present on message_delta events; not used in the stream path yet
    #[allow(dead_code)]
    usage: Option<AnthropicUsage>,
}

#[derive(Deserialize)]
struct StreamDelta {
    #[serde(rename = "type")]
    delta_type: String,
    text: Option<String>,
    stop_reason: Option<String>,
}

// ---------------------------------------------------------------------------

fn anthropic_role(role: &Role) -> &'static str {
    match role {
        Role::User | Role::Tool => "user",
        Role::Assistant => "assistant",
        Role::System => "user", // system goes to system field
    }
}

fn parse_stop_reason(s: Option<&str>) -> FinishReason {
    match s {
        Some("max_tokens") => FinishReason::Length,
        Some("tool_use") => FinishReason::ToolCall,
        _ => FinishReason::Stop,
    }
}

fn anthropic_pricing(model: &str) -> Option<ModelPricing> {
    // Prices as of mid-2025 in USD per 1k tokens.
    let (prompt, completion, ctx) = match model {
        "claude-opus-4-7" | "claude-opus-4-7-20251001" => (0.015, 0.075, 200_000),
        "claude-sonnet-4-6" | "claude-sonnet-4-6-20251022" => (0.003, 0.015, 200_000),
        "claude-haiku-4-5" | "claude-haiku-4-5-20251001" => (0.0008, 0.004, 200_000),
        "claude-3-5-sonnet-20241022" | "claude-3-5-sonnet-20240620" => (0.003, 0.015, 200_000),
        "claude-3-5-haiku-20241022" => (0.0008, 0.004, 200_000),
        "claude-3-opus-20240229" => (0.015, 0.075, 200_000),
        "claude-3-haiku-20240307" => (0.00025, 0.00125, 200_000),
        _ => return None,
    };
    Some(ModelPricing {
        prompt_per_1k: prompt,
        completion_per_1k: completion,
        context_limit: ctx,
    })
}

/// Splits messages into an optional system prompt and the remaining turns.
/// Anthropic requires system content in a separate top-level field.
fn split_system<'a>(messages: &'a [Message]) -> (Option<&'a str>, Vec<&'a Message>) {
    let mut system = None;
    let rest: Vec<&'a Message> = messages
        .iter()
        .filter(|m| {
            if m.role == Role::System {
                system = Some(m.content.as_str());
                false
            } else {
                true
            }
        })
        .collect();
    (system, rest)
}

#[async_trait]
impl AiProvider for AnthropicProvider {
    fn name(&self) -> &str {
        "anthropic"
    }

    fn pricing(&self, model: &str) -> Option<ModelPricing> {
        anthropic_pricing(model)
    }

    fn count_tokens(&self, messages: &[Message]) -> u32 {
        // Anthropic does not expose a public tokenizer. Use the same conservative
        // heuristic as the OpenAI provider (4 chars per token, 4 overhead per msg).
        messages
            .iter()
            .map(|m| (m.content.len() as u32 / 4) + 4)
            .sum::<u32>()
            + 2
    }

    async fn chat(&self, req: ChatRequest) -> Result<ChatResponse, AiError> {
        let (system, turns) = split_system(&req.messages);
        let messages: Vec<AnthropicMessage<'_>> = turns
            .iter()
            .map(|m| AnthropicMessage {
                role: anthropic_role(&m.role),
                content: &m.content,
            })
            .collect();

        let body = AnthropicRequest {
            model: &req.model,
            messages,
            max_tokens: req.max_tokens.unwrap_or(4096),
            system,
            temperature: req.temperature,
            stream: false,
        };

        debug!(
            provider = "anthropic",
            model = req.model,
            "sending chat request"
        );

        let resp = self
            .client
            .post(format!("{BASE_URL}/messages"))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .json(&body)
            .send()
            .await?;

        let status = resp.status().as_u16();
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider {
                provider: "anthropic".into(),
                status,
                message: text,
            });
        }

        let ar: AnthropicResponse = resp.json().await?;
        let usage = TokenUsage {
            prompt_tokens: ar.usage.input_tokens,
            completion_tokens: ar.usage.output_tokens,
            total_tokens: ar.usage.input_tokens + ar.usage.output_tokens,
        };
        let cost_usd = anthropic_pricing(&ar.model)
            .map(|p| p.cost(&usage))
            .unwrap_or(0.0);

        let text = ar
            .content
            .into_iter()
            .filter(|c| c.content_type == "text")
            .filter_map(|c| c.text)
            .collect::<Vec<_>>()
            .join("");

        Ok(ChatResponse {
            id: ar.id,
            model: ar.model,
            choices: vec![Choice {
                index: 0,
                message: Message {
                    role: Role::Assistant,
                    content: text,
                },
                finish_reason: parse_stop_reason(ar.stop_reason.as_deref()),
            }],
            usage,
            provider: "anthropic".into(),
            cost_usd,
        })
    }

    async fn chat_stream(&self, req: ChatRequest) -> Result<ChatStream, AiError> {
        let (system, turns) = split_system(&req.messages);

        let body_json = serde_json::to_value(AnthropicRequest {
            model: &req.model,
            messages: turns
                .iter()
                .map(|m| AnthropicMessage {
                    role: anthropic_role(&m.role),
                    content: &m.content,
                })
                .collect(),
            max_tokens: req.max_tokens.unwrap_or(4096),
            system,
            temperature: req.temperature,
            stream: true,
        })?;

        let resp = self
            .client
            .post(format!("{BASE_URL}/messages"))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_VERSION)
            .json(&body_json)
            .send()
            .await?;

        let status = resp.status().as_u16();
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider {
                provider: "anthropic".into(),
                status,
                message: text,
            });
        }

        let byte_stream = resp.bytes_stream();
        let provider_name = "anthropic".to_string();
        // Anthropic sends a message_start event first which carries the message id.
        // We synthesise a stable id from a uuid since we process chunks independently.
        let stream_id = uuid::Uuid::new_v4().to_string();

        let chunk_stream = byte_stream
            .map(move |result: Result<Bytes, reqwest::Error>| {
                let provider = provider_name.clone();
                let id = stream_id.clone();
                match result {
                    Err(e) => vec![Err(AiError::Transport(e))],
                    Ok(bytes) => {
                        let text = String::from_utf8_lossy(&bytes);
                        // Anthropic SSE: event lines (ignored) + data: {json}
                        text.lines()
                            .filter(|l| l.starts_with("data: "))
                            .filter_map(|l| {
                                let payload = &l["data: ".len()..];
                                let v: Value = serde_json::from_str(payload).ok()?;
                                let ev: StreamEvent = serde_json::from_value(v).ok()?;
                                match ev.event_type.as_str() {
                                    "content_block_delta" => {
                                        let delta = ev.delta?;
                                        if delta.delta_type != "text_delta" {
                                            return None;
                                        }
                                        Some(Ok(ChatChunk {
                                            id: id.clone(),
                                            provider: provider.clone(),
                                            delta: DeltaContent {
                                                role: None,
                                                content: delta.text,
                                            },
                                            finish_reason: None,
                                        }))
                                    }
                                    "message_delta" => {
                                        let delta = ev.delta?;
                                        Some(Ok(ChatChunk {
                                            id: id.clone(),
                                            provider: provider.clone(),
                                            delta: DeltaContent::default(),
                                            finish_reason: Some(parse_stop_reason(
                                                delta.stop_reason.as_deref(),
                                            )),
                                        }))
                                    }
                                    _ => None,
                                }
                            })
                            .collect::<Vec<_>>()
                    }
                }
            })
            .flat_map(stream::iter);

        Ok(Box::pin(chunk_stream))
    }
}
