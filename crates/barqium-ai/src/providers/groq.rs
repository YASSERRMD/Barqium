use crate::provider::{AiProvider, ChatStream};
use crate::providers::openai::OpenAiProvider;
use crate::types::{ChatRequest, ChatResponse, Message, ModelPricing};
use crate::AiError;
use async_trait::async_trait;

const GROQ_BASE_URL: &str = "https://api.groq.com/openai/v1";

/// Groq LPU provider. Uses the OpenAI-compatible API surface.
pub struct GroqProvider(OpenAiProvider);

impl GroqProvider {
    pub fn new(api_key: impl Into<String>) -> Self {
        Self(OpenAiProvider::new(api_key).with_base_url(GROQ_BASE_URL))
    }
}

fn groq_pricing(model: &str) -> Option<ModelPricing> {
    // Prices as of mid-2025 in USD per 1k tokens.
    let (prompt, completion, ctx) = match model {
        "llama-3.3-70b-versatile" => (0.00059, 0.00079, 128_000),
        "llama-3.1-8b-instant" => (0.00005, 0.00008, 128_000),
        "llama3-70b-8192" => (0.00059, 0.00079, 8_192),
        "llama3-8b-8192" => (0.00005, 0.00008, 8_192),
        "mixtral-8x7b-32768" => (0.00024, 0.00024, 32_768),
        "gemma2-9b-it" => (0.00020, 0.00020, 8_192),
        _ => return None,
    };
    Some(ModelPricing {
        prompt_per_1k: prompt,
        completion_per_1k: completion,
        context_limit: ctx,
    })
}

#[async_trait]
impl AiProvider for GroqProvider {
    fn name(&self) -> &str {
        "groq"
    }

    fn pricing(&self, model: &str) -> Option<ModelPricing> {
        groq_pricing(model)
    }

    fn count_tokens(&self, messages: &[Message]) -> u32 {
        self.0.count_tokens(messages)
    }

    async fn chat(&self, req: ChatRequest) -> Result<ChatResponse, AiError> {
        let mut resp = self.0.chat(req).await?;
        resp.provider = "groq".into();
        Ok(resp)
    }

    async fn chat_stream(&self, req: ChatRequest) -> Result<ChatStream, AiError> {
        self.0.chat_stream(req).await
    }
}
