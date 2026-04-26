use std::collections::HashMap;

use crate::error::AiError;
use crate::types::{Message, ModelPricing, TokenUsage};

/// Token counter backed by a per-character heuristic (4 chars per token).
/// Accurate enough for budget pre-flight checks without a tokenizer binary.
pub fn count_tokens_heuristic(messages: &[Message]) -> u32 {
    messages
        .iter()
        .map(|m| (m.content.len() as u32 / 4) + 4)
        .sum::<u32>()
        + 2
}

/// Static pricing registry keyed by "<provider>/<model>".
/// Providers populate this at startup so the budget enforcer can look up
/// rates without holding a reference to a specific provider instance.
#[derive(Default, Clone)]
pub struct PricingRegistry {
    table: HashMap<String, ModelPricing>,
}

impl PricingRegistry {
    pub fn new() -> Self {
        Self::default()
    }

    /// Register pricing for a model under a given provider name.
    pub fn register(&mut self, provider: &str, model: &str, pricing: ModelPricing) {
        self.table.insert(format!("{provider}/{model}"), pricing);
    }

    pub fn get(&self, provider: &str, model: &str) -> Option<&ModelPricing> {
        self.table.get(&format!("{provider}/{model}"))
    }
}

/// Budget enforcer: checks estimated cost before a request is sent and
/// actual cost after a response is received.
pub struct BudgetEnforcer {
    /// Hard limit in USD for a single request. None = no limit.
    pub per_request_limit_usd: Option<f64>,
}

impl BudgetEnforcer {
    pub fn new(per_request_limit_usd: Option<f64>) -> Self {
        Self {
            per_request_limit_usd,
        }
    }

    /// Pre-flight check: estimates cost from prompt tokens and max_completion.
    /// Returns `BudgetExceeded` if the estimate exceeds the limit.
    pub fn check_preflight(
        &self,
        pricing: &ModelPricing,
        prompt_tokens: u32,
        max_completion: u32,
    ) -> Result<(), AiError> {
        let Some(limit) = self.per_request_limit_usd else {
            return Ok(());
        };
        let estimated = pricing.estimated_cost(prompt_tokens, max_completion);
        if estimated > limit {
            return Err(AiError::BudgetExceeded {
                cost: estimated,
                limit,
            });
        }
        Ok(())
    }

    /// Post-response check: validates actual cost against limit.
    pub fn check_actual(&self, pricing: &ModelPricing, usage: &TokenUsage) -> Result<f64, AiError> {
        let cost = pricing.cost(usage);
        if let Some(limit) = self.per_request_limit_usd {
            if cost > limit {
                return Err(AiError::BudgetExceeded { cost, limit });
            }
        }
        Ok(cost)
    }
}

/// Checks the context window limit before sending a request.
pub fn check_context_limit(
    model: &str,
    pricing: &ModelPricing,
    prompt_tokens: u32,
) -> Result<(), AiError> {
    if prompt_tokens > pricing.context_limit {
        return Err(AiError::ContextLengthExceeded {
            model: model.to_string(),
            tokens: prompt_tokens,
            limit: pricing.context_limit,
        });
    }
    Ok(())
}
