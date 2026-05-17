use std::sync::Arc;
use std::time::{Duration, Instant};

use dashmap::DashMap;
use tracing::{info, warn};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    Closed,
    Open,
    HalfOpen,
}

struct BreakerState {
    state: CircuitState,
    consecutive_failures: u32,
    opened_at: Option<Instant>,
}

impl BreakerState {
    fn new() -> Self {
        Self {
            state: CircuitState::Closed,
            consecutive_failures: 0,
            opened_at: None,
        }
    }
}

/// Per-upstream circuit breaker registry.
///
/// - **Closed**: requests flow normally. On `failure_threshold` consecutive
///   failures the breaker opens.
/// - **Open**: all requests are rejected immediately. After `reset_timeout` the
///   breaker transitions to half-open to probe recovery.
/// - **Half-open**: the next request is allowed through. Success closes the
///   breaker; failure re-opens it.
pub struct CircuitBreakerRegistry {
    breakers: DashMap<String, BreakerState>,
    failure_threshold: u32,
    reset_timeout: Duration,
}

impl CircuitBreakerRegistry {
    #[must_use]
    pub fn new(failure_threshold: u32, reset_timeout: Duration) -> Arc<Self> {
        Arc::new(Self {
            breakers: DashMap::new(),
            failure_threshold,
            reset_timeout,
        })
    }

    /// Returns `true` when the upstream is allowed to receive a request.
    pub fn allow(&self, upstream_id: &str) -> bool {
        // Perform all state mutations inside a tight scope so the DashMap
        // shard lock is released before we emit log events.
        let (allowed, transitioned_to_half_open) = {
            let mut entry = self
                .breakers
                .entry(upstream_id.to_string())
                .or_insert_with(BreakerState::new);

            match entry.state {
                CircuitState::Closed | CircuitState::HalfOpen => (true, false),
                CircuitState::Open => {
                    let elapsed = entry
                        .opened_at
                        .map(|t| t.elapsed())
                        .unwrap_or(Duration::ZERO);
                    if elapsed >= self.reset_timeout {
                        entry.state = CircuitState::HalfOpen;
                        entry.consecutive_failures = 0;
                        (true, true)
                    } else {
                        (false, false)
                    }
                }
            }
        };

        if transitioned_to_half_open {
            info!(upstream_id, "circuit breaker -> half-open");
        }
        allowed
    }

    /// Record a successful response from an upstream.
    pub fn record_success(&self, upstream_id: &str) {
        let was_open = {
            let mut entry = self
                .breakers
                .entry(upstream_id.to_string())
                .or_insert_with(BreakerState::new);
            let was = entry.state != CircuitState::Closed;
            entry.state = CircuitState::Closed;
            entry.consecutive_failures = 0;
            was
        };

        if was_open {
            info!(upstream_id, "circuit breaker -> closed");
        }
    }

    /// Record a failure (5xx or timeout) from an upstream.
    pub fn record_failure(&self, upstream_id: &str) {
        let log_open = {
            let mut entry = self
                .breakers
                .entry(upstream_id.to_string())
                .or_insert_with(BreakerState::new);

            entry.consecutive_failures += 1;

            if entry.state == CircuitState::HalfOpen
                || entry.consecutive_failures >= self.failure_threshold
            {
                let failures = entry.consecutive_failures;
                entry.state = CircuitState::Open;
                entry.opened_at = Some(Instant::now());
                Some(failures)
            } else {
                None
            }
        };

        if let Some(failures) = log_open {
            warn!(upstream_id, failures, "circuit breaker -> open");
        }
    }

    /// Returns the current state of the circuit for `upstream_id`.
    #[must_use]
    pub fn state(&self, upstream_id: &str) -> CircuitState {
        self.breakers
            .get(upstream_id)
            .map(|e| e.state)
            .unwrap_or(CircuitState::Closed)
    }
}
