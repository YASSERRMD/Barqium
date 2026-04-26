use std::sync::Arc;

use tracing::{info, warn};

use crate::error::AiError;
use crate::provider::{AiProvider, ChatStream};
use crate::types::{ChatRequest, ChatResponse};

/// Wraps an ordered list of providers and retries through them on failure.
///
/// Errors that are permanent (budget exceeded, context too long) short-circuit
/// immediately without trying the next provider.
pub struct FallbackChain {
    providers: Vec<Arc<dyn AiProvider>>,
}

impl FallbackChain {
    pub fn new(providers: Vec<Arc<dyn AiProvider>>) -> Self {
        assert!(
            !providers.is_empty(),
            "fallback chain requires at least one provider"
        );
        Self { providers }
    }

    pub fn len(&self) -> usize {
        self.providers.len()
    }

    pub fn is_empty(&self) -> bool {
        self.providers.is_empty()
    }

    /// Sends a non-streaming request, trying each provider in order.
    pub async fn chat(&self, req: ChatRequest) -> Result<ChatResponse, AiError> {
        for (i, provider) in self.providers.iter().enumerate() {
            match provider.chat(req.clone()).await {
                Ok(resp) => {
                    if i > 0 {
                        info!(
                            provider = provider.name(),
                            attempt = i + 1,
                            "fallback succeeded"
                        );
                    }
                    return Ok(resp);
                }
                Err(e) if is_permanent(&e) => return Err(e),
                Err(e) => {
                    warn!(
                        provider = provider.name(),
                        attempt = i + 1,
                        error = %e,
                        "provider failed, trying next"
                    );
                }
            }
        }
        Err(AiError::AllProvidersFailed {
            attempts: self.providers.len(),
        })
    }

    /// Sends a streaming request, falling back only on setup errors (not mid-stream).
    pub async fn chat_stream(&self, req: ChatRequest) -> Result<ChatStream, AiError> {
        for (i, provider) in self.providers.iter().enumerate() {
            match provider.chat_stream(req.clone()).await {
                Ok(stream) => {
                    if i > 0 {
                        info!(
                            provider = provider.name(),
                            attempt = i + 1,
                            "stream fallback succeeded"
                        );
                    }
                    return Ok(stream);
                }
                Err(e) if is_permanent(&e) => return Err(e),
                Err(e) => {
                    warn!(
                        provider = provider.name(),
                        attempt = i + 1,
                        error = %e,
                        "stream provider failed, trying next"
                    );
                }
            }
        }
        Err(AiError::AllProvidersFailed {
            attempts: self.providers.len(),
        })
    }
}

fn is_permanent(e: &AiError) -> bool {
    matches!(
        e,
        AiError::BudgetExceeded { .. } | AiError::ContextLengthExceeded { .. }
    )
}
