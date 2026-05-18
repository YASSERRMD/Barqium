use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};

use dashmap::DashMap;
use tracing::{info, warn};

/// Aggregate metrics for all circuit breakers in the registry.
///
/// Counters use relaxed atomics — they are read by monitoring/metrics
/// exporters and do not participate in any synchronisation protocol.
#[derive(Debug, Default)]
pub struct CircuitBreakerMetrics {
    /// Total number of calls (allowed or rejected) across all breakers.
    pub total_calls: AtomicU64,
    /// Number of calls that completed successfully.
    pub successful_calls: AtomicU64,
    /// Number of calls that were recorded as failures.
    pub failed_calls: AtomicU64,
    /// Number of state transitions (Closed→Open, Open→HalfOpen, HalfOpen→Closed).
    pub state_transitions: AtomicU64,
}

impl CircuitBreakerMetrics {
    /// Create a new zeroed metrics instance.
    pub fn new() -> Self {
        Self::default()
    }

    /// Increment the successful-calls counter.
    pub fn on_success(&self) {
        self.total_calls.fetch_add(1, Ordering::Relaxed);
        self.successful_calls.fetch_add(1, Ordering::Relaxed);
    }

    /// Increment the failed-calls counter.
    pub fn on_failure(&self) {
        self.total_calls.fetch_add(1, Ordering::Relaxed);
        self.failed_calls.fetch_add(1, Ordering::Relaxed);
    }

    /// Increment the state-transitions counter.
    pub fn on_transition(&self) {
        self.state_transitions.fetch_add(1, Ordering::Relaxed);
    }
}

/// An event emitted by the circuit breaker when its state changes or a
/// call is completed.
///
/// Subscribe to these events to feed circuit breaker activity into an
/// event bus or structured audit log.
#[derive(Debug, Clone)]
pub enum CircuitBreakerEvent {
    /// The circuit transitioned from Closed or HalfOpen to Open.
    Opened(Instant),
    /// The circuit transitioned from Open or HalfOpen back to Closed.
    Closed(Instant),
    /// The circuit transitioned from Open to HalfOpen (recovery probe).
    HalfOpened(Instant),
    /// A call through the circuit completed successfully.
    CallSucceeded,
    /// A call through the circuit failed.
    CallFailed,
}

/// Configuration parameters for a circuit breaker instance.
///
/// Passed to [`CircuitBreakerRegistry::new`] (or a future per-upstream
/// constructor) to tune the failure detection and recovery behaviour.
#[derive(Debug, Clone)]
pub struct CircuitBreakerConfig {
    /// Number of consecutive failures required to open the circuit.
    ///
    /// A lower value reacts faster to outages but may cause false positives
    /// under transient errors. Defaults to `5`.
    pub failure_threshold: u32,

    /// Seconds the circuit remains open before transitioning to half-open.
    ///
    /// During this window all requests are rejected immediately. Defaults
    /// to `30` seconds.
    pub recovery_timeout_secs: u64,

    /// Maximum number of probe requests allowed in the half-open state.
    ///
    /// Once this many requests succeed the circuit closes; any failure
    /// re-opens it. Defaults to `1`.
    pub half_open_max_calls: u32,
}

impl Default for CircuitBreakerConfig {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            recovery_timeout_secs: 30,
            half_open_max_calls: 1,
        }
    }
}

/// The observable state of a single circuit breaker.
///
/// State transitions follow the standard three-state model:
/// ```text
/// Closed --[failure_threshold exceeded]--> Open
/// Open   --[reset_timeout elapsed]-------> HalfOpen
/// HalfOpen --[success]-------------------> Closed
/// HalfOpen --[failure]-------------------> Open
/// ```
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CircuitState {
    /// Normal operation; requests are forwarded to the upstream.
    Closed,
    /// The upstream is considered unavailable; all requests are rejected.
    Open,
    /// A single probe request is allowed through to test recovery.
    HalfOpen,
}

impl std::fmt::Display for CircuitState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Closed => write!(f, "closed"),
            Self::Open => write!(f, "open"),
            Self::HalfOpen => write!(f, "half-open"),
        }
    }
}

/// Internal mutable state for a single upstream breaker.
struct BreakerState {
    /// Current state of the circuit.
    state: CircuitState,
    /// Number of consecutive failures since the last success.
    consecutive_failures: u32,
    /// The instant at which the breaker last transitioned to `Open`.
    opened_at: Option<Instant>,
}

impl BreakerState {
    /// Initialise a breaker in the `Closed` state.
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
    /// Create a new registry shared via `Arc`.
    ///
    /// # Parameters
    /// * `failure_threshold` – number of consecutive failures before the breaker opens.
    /// * `reset_timeout` – how long to wait in the `Open` state before probing recovery.
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
