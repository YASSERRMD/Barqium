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

/// OpenAI-compatible base URL (also used by Azure OpenAI and compatible APIs).
const DEFAULT_BASE_URL: &str = "https://api.openai.com/v1";

pub struct OpenAiProvider {
    client: Client,
    api_key: String,
    base_url: String,
}

impl OpenAiProvider {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            api_key: api_key.into(),
            base_url: DEFAULT_BASE_URL.to_string(),
        }
    }

    pub fn with_base_url(mut self, base_url: impl Into<String>) -> Self {
        self.base_url = base_url.into();
        self
    }
}

// ---------------------------------------------------------------------------
// Wire types (OpenAI JSON schema)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct OaiRequest<'a> {
    model: &'a str,
    messages: Vec<OaiMessage<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
    stream: bool,
}

#[derive(Serialize)]
struct OaiMessage<'a> {
    role: &'a str,
    content: &'a str,
}

#[derive(Deserialize)]
struct OaiResponse {
    id: String,
    model: String,
    choices: Vec<OaiChoice>,
    usage: OaiUsage,
}

#[derive(Deserialize)]
struct OaiChoice {
    index: u32,
    message: OaiMessageOwned,
    finish_reason: Option<String>,
}

#[derive(Deserialize)]
struct OaiMessageOwned {
    role: String,
    content: Option<String>,
}

#[derive(Deserialize, Default)]
struct OaiUsage {
    prompt_tokens: u32,
    completion_tokens: u32,
    total_tokens: u32,
}

#[derive(Deserialize)]
struct OaiStreamChunk {
    id: String,
    choices: Vec<OaiStreamChoice>,
}

#[derive(Deserialize)]
struct OaiStreamChoice {
    delta: OaiDelta,
    finish_reason: Option<String>,
}

#[derive(Deserialize, Default)]
struct OaiDelta {
    role: Option<String>,
    content: Option<String>,
}

// ---------------------------------------------------------------------------

fn oai_role(role: &Role) -> &'static str {
    match role {
        Role::System => "system",
        Role::User => "user",
        Role::Assistant => "assistant",
        Role::Tool => "tool",
    }
}

fn parse_role(s: &str) -> Role {
    match s {
        "system" => Role::System,
        "assistant" => Role::Assistant,
        "tool" => Role::Tool,
        _ => Role::User,
    }
}

fn parse_finish(s: Option<&str>) -> FinishReason {
    match s {
        Some("length") => FinishReason::Length,
        Some("tool_calls") => FinishReason::ToolCall,
        Some("content_filter") => FinishReason::ContentFilter,
        _ => FinishReason::Stop,
    }
}

fn openai_pricing(model: &str) -> Option<ModelPricing> {
    // Prices as of mid-2025 in USD per 1k tokens.
    let (prompt, completion, ctx) = match model {
        "gpt-4o" | "gpt-4o-2024-11-20" => (0.0025, 0.010, 128_000),
        "gpt-4o-mini" | "gpt-4o-mini-2024-07-18" => (0.000150, 0.000600, 128_000),
        "gpt-4-turbo" | "gpt-4-turbo-2024-04-09" => (0.010, 0.030, 128_000),
        "gpt-3.5-turbo" => (0.000500, 0.001500, 16_385),
        "o1" | "o1-2024-12-17" => (0.015, 0.060, 200_000),
        "o1-mini" | "o1-mini-2024-09-12" => (0.003, 0.012, 128_000),
        _ => return None,
    };
    Some(ModelPricing {
        prompt_per_1k: prompt,
        completion_per_1k: completion,
        context_limit: ctx,
    })
}

#[async_trait]
impl AiProvider for OpenAiProvider {
    fn name(&self) -> &str {
        "openai"
    }

    fn pricing(&self, model: &str) -> Option<ModelPricing> {
        openai_pricing(model)
    }

    fn count_tokens(&self, messages: &[Message]) -> u32 {
        // Conservative heuristic: 1 token per 4 chars + 4 tokens per message overhead.
        messages
            .iter()
            .map(|m| (m.content.len() as u32 / 4) + 4)
            .sum::<u32>()
            + 2 // reply primer
    }

    async fn chat(&self, req: ChatRequest) -> Result<ChatResponse, AiError> {
        let messages: Vec<OaiMessage<'_>> = req
            .messages
            .iter()
            .map(|m| OaiMessage {
                role: oai_role(&m.role),
                content: &m.content,
            })
            .collect();

        let body = OaiRequest {
            model: &req.model,
            messages,
            max_tokens: req.max_tokens,
            temperature: req.temperature,
            stream: false,
        };

        debug!(
            provider = "openai",
            model = req.model,
            "sending chat request"
        );

        let resp = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&body)
            .send()
            .await?;

        let status = resp.status().as_u16();
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider {
                provider: "openai".into(),
                status,
                message: text,
            });
        }

        let oai: OaiResponse = resp.json().await?;
        let usage = TokenUsage {
            prompt_tokens: oai.usage.prompt_tokens,
            completion_tokens: oai.usage.completion_tokens,
            total_tokens: oai.usage.total_tokens,
        };
        let cost_usd = openai_pricing(&oai.model)
            .map(|p| p.cost(&usage))
            .unwrap_or(0.0);

        let choices = oai
            .choices
            .into_iter()
            .map(|c| Choice {
                index: c.index,
                message: Message {
                    role: parse_role(&c.message.role),
                    content: c.message.content.unwrap_or_default(),
                },
                finish_reason: parse_finish(c.finish_reason.as_deref()),
            })
            .collect();

        Ok(ChatResponse {
            id: oai.id,
            model: oai.model,
            choices,
            usage,
            provider: "openai".into(),
            cost_usd,
        })
    }

    async fn chat_stream(&self, req: ChatRequest) -> Result<ChatStream, AiError> {
        let messages: Vec<OaiMessage<'_>> = req
            .messages
            .iter()
            .map(|m| OaiMessage {
                role: oai_role(&m.role),
                content: &m.content,
            })
            .collect();

        // Owned copy for the async block below.
        let body_json = serde_json::to_value(OaiRequest {
            model: &req.model,
            messages,
            max_tokens: req.max_tokens,
            temperature: req.temperature,
            stream: true,
        })?;

        let resp = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .bearer_auth(&self.api_key)
            .json(&body_json)
            .send()
            .await?;

        let status = resp.status().as_u16();
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider {
                provider: "openai".into(),
                status,
                message: text,
            });
        }

        let byte_stream = resp.bytes_stream();
        let provider_name = "openai".to_string();

        let chunk_stream = byte_stream
            .map(move |result: Result<Bytes, reqwest::Error>| {
                let provider = provider_name.clone();
                match result {
                    Err(e) => {
                        vec![Err(AiError::Transport(e))]
                    }
                    Ok(bytes) => {
                        // Each SSE message is "data: {json}\n\n" or "data: [DONE]".
                        let text = String::from_utf8_lossy(&bytes);
                        text.lines()
                            .filter(|l| l.starts_with("data: "))
                            .filter_map(|l| {
                                let payload = &l["data: ".len()..];
                                if payload.trim() == "[DONE]" {
                                    return None;
                                }
                                let v: Value = match serde_json::from_str(payload) {
                                    Ok(v) => v,
                                    Err(e) => {
                                        return Some(Err(AiError::Serialization(e)));
                                    }
                                };
                                let chunk: OaiStreamChunk = match serde_json::from_value(v) {
                                    Ok(c) => c,
                                    Err(e) => {
                                        return Some(Err(AiError::Serialization(e)));
                                    }
                                };
                                let first = chunk.choices.into_iter().next()?;
                                Some(Ok(ChatChunk {
                                    id: chunk.id,
                                    provider: provider.clone(),
                                    delta: DeltaContent {
                                        role: first.delta.role.as_deref().map(parse_role),
                                        content: first.delta.content,
                                    },
                                    finish_reason: first
                                        .finish_reason
                                        .as_deref()
                                        .map(|r| parse_finish(Some(r))),
                                }))
                            })
                            .collect::<Vec<_>>()
                    }
                }
            })
            .flat_map(stream::iter);

        Ok(Box::pin(chunk_stream))
    }
}
