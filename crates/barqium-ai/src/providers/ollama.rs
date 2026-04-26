use crate::provider::{AiProvider, ChatStream};
use crate::providers::openai::OpenAiProvider;
use crate::types::{ChatRequest, ChatResponse, Message, ModelPricing};
use crate::AiError;
use async_trait::async_trait;

/// Default Ollama OpenAI-compatible endpoint when running locally.
const DEFAULT_BASE_URL: &str = "http://localhost:11434/v1";

/// Ollama local inference provider. Delegates to the OpenAI-compatible shim
/// that Ollama exposes at /v1/chat/completions.
pub struct OllamaProvider(OpenAiProvider);

impl OllamaProvider {
    pub fn new() -> Self {
        // Ollama's OpenAI shim does not require authentication.
        Self(OpenAiProvider::new("ollama").with_base_url(DEFAULT_BASE_URL))
    }

    pub fn with_base_url(base_url: impl Into<String>) -> Self {
        Self(OpenAiProvider::new("ollama").with_base_url(base_url))
    }
}

impl Default for OllamaProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl AiProvider for OllamaProvider {
    fn name(&self) -> &str {
        "ollama"
    }

    fn pricing(&self, _model: &str) -> Option<ModelPricing> {
        // Local inference has no per-token cost.
        None
    }

    fn count_tokens(&self, messages: &[Message]) -> u32 {
        self.0.count_tokens(messages)
    }

    async fn chat(&self, req: ChatRequest) -> Result<ChatResponse, AiError> {
        let mut resp = self.0.chat(req).await?;
        resp.provider = "ollama".into();
        resp.cost_usd = 0.0;
        Ok(resp)
    }

    async fn chat_stream(&self, req: ChatRequest) -> Result<ChatStream, AiError> {
        self.0.chat_stream(req).await
    }
}
