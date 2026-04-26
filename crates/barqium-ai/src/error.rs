use thiserror::Error;

#[derive(Error, Debug)]
pub enum AiError {
    #[error("provider '{provider}' returned HTTP {status}: {message}")]
    Provider {
        provider: String,
        status: u16,
        message: String,
    },

    #[error("rate limited by provider '{provider}'")]
    RateLimited {
        provider: String,
        retry_after_secs: Option<u64>,
    },

    #[error("context length exceeded: {tokens} tokens > {limit} limit for model '{model}'")]
    ContextLengthExceeded {
        model: String,
        tokens: u32,
        limit: u32,
    },

    #[error("budget exceeded: estimated ${cost:.6} > limit ${limit:.6}")]
    BudgetExceeded { cost: f64, limit: f64 },

    #[error("no provider available after {attempts} attempt(s)")]
    AllProvidersFailed { attempts: usize },

    #[error("streaming error from provider '{provider}': {message}")]
    Stream { provider: String, message: String },

    #[error("transport error: {0}")]
    Transport(#[from] reqwest::Error),

    #[error("serialization error: {0}")]
    Serialization(#[from] serde_json::Error),

    #[error("unsupported operation: {0}")]
    Unsupported(String),
}
