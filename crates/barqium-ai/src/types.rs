use serde::{Deserialize, Serialize};

/// A single message in a conversation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
    Tool,
}

/// Outbound request to an AI provider.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    /// Provider-specific model identifier, e.g. "gpt-4o", "claude-opus-4-7".
    pub model: String,
    pub messages: Vec<Message>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temperature: Option<f32>,
    /// When true, the provider streams SSE chunks.
    #[serde(default)]
    pub stream: bool,
    /// Optional system-level budget cap in USD for this single request.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub budget_usd: Option<f64>,
}

/// Non-streaming response from an AI provider.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    /// Canonical model name echoed back by the provider.
    pub model: String,
    pub choices: Vec<Choice>,
    pub usage: TokenUsage,
    /// Name of the provider that fulfilled the request.
    pub provider: String,
    /// Estimated cost in USD for this response.
    pub cost_usd: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Choice {
    pub index: u32,
    pub message: Message,
    pub finish_reason: FinishReason,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FinishReason {
    Stop,
    Length,
    ToolCall,
    ContentFilter,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// A single chunk emitted during a streaming response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatChunk {
    pub id: String,
    pub provider: String,
    pub delta: DeltaContent,
    /// Set on the final chunk when the stream is closing.
    pub finish_reason: Option<FinishReason>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DeltaContent {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<Role>,
    /// Incremental text token.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>,
}

/// Per-model pricing used for budget enforcement and cost reporting.
#[derive(Debug, Clone)]
pub struct ModelPricing {
    /// Cost in USD per 1 000 prompt tokens.
    pub prompt_per_1k: f64,
    /// Cost in USD per 1 000 completion tokens.
    pub completion_per_1k: f64,
    /// Maximum context window in tokens.
    pub context_limit: u32,
}

impl ModelPricing {
    pub fn cost(&self, usage: &TokenUsage) -> f64 {
        (usage.prompt_tokens as f64 / 1_000.0) * self.prompt_per_1k
            + (usage.completion_tokens as f64 / 1_000.0) * self.completion_per_1k
    }

    /// Estimated pre-request cost using only the prompt token count.
    pub fn estimated_cost(&self, prompt_tokens: u32, max_completion: u32) -> f64 {
        (prompt_tokens as f64 / 1_000.0) * self.prompt_per_1k
            + (max_completion as f64 / 1_000.0) * self.completion_per_1k
    }
}
