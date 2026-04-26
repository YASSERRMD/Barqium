//! Unified AI provider abstraction: OpenAI, Anthropic, Bedrock, Groq, Ollama, vLLM.

pub mod error;
pub mod provider;
pub mod providers;
pub mod types;

pub use error::AiError;
pub use provider::{AiProvider, ChatStream};
pub use types::{
    ChatChunk, ChatRequest, ChatResponse, Choice, DeltaContent, FinishReason, Message,
    ModelPricing, Role, TokenUsage,
};
