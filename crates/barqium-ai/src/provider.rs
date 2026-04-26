use std::pin::Pin;

use async_trait::async_trait;
use futures::Stream;

use crate::error::AiError;
use crate::types::{ChatChunk, ChatRequest, ChatResponse, ModelPricing};

/// Streaming response type: pinned boxed async stream of chunks.
pub type ChatStream = Pin<Box<dyn Stream<Item = Result<ChatChunk, AiError>> + Send + 'static>>;

/// Unified interface all AI providers must implement.
///
/// Implementations are expected to be cheaply cloneable (Arc-wrapped internals).
#[async_trait]
pub trait AiProvider: Send + Sync {
    /// Short lowercase identifier, e.g. "openai", "anthropic", "groq".
    fn name(&self) -> &str;

    /// Returns the pricing table for a given model, or None if unknown.
    fn pricing(&self, model: &str) -> Option<ModelPricing>;

    /// Counts the number of tokens in a slice of messages using this
    /// provider's tokenizer. Used for pre-flight budget checks.
    fn count_tokens(&self, messages: &[crate::types::Message]) -> u32;

    /// Non-streaming chat completion.
    async fn chat(&self, req: ChatRequest) -> Result<ChatResponse, AiError>;

    /// Streaming chat completion. Returns a stream of incremental chunks.
    async fn chat_stream(&self, req: ChatRequest) -> Result<ChatStream, AiError>;
}
