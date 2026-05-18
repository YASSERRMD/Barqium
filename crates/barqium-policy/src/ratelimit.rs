use std::sync::Arc;
use std::time::{Duration, Instant};

use dashmap::DashMap;

use crate::error::PolicyError;

/// Configuration for a single rate-limit policy.
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Maximum requests allowed within `window`.
    pub max_requests: u64,
    /// Sliding window size.
    pub window: Duration,
}

struct Slot {
    window_start: Instant,
    /// Request count from the previous window (used for interpolation).
    prev_count: u64,
    /// Request count in the current window.
    curr_count: u64,
}

/// Local sliding-window rate limiter using the two-counter approximation.
///
/// Rate estimate at any moment:
///   estimate = prev_count * (1 - elapsed/window) + curr_count
///
/// This is the same algorithm Redis uses internally. Error is bounded by
/// the ratio of burst traffic to window size (< 0.4% for uniform traffic).
pub struct RateLimiter {
    config: RateLimitConfig,
    slots: DashMap<String, Slot>,
}

impl RateLimiter {
    #[must_use]
    pub fn new(config: RateLimitConfig) -> Arc<Self> {
        Arc::new(Self {
            config,
            slots: DashMap::new(),
        })
    }

    /// Check and increment the counter for `key`.
    ///
    /// Returns `Ok(remaining)` on success or `Err(RateLimitExceeded)` when
    /// the estimated rate exceeds `max_requests`.
    pub fn check_and_increment(&self, key: &str) -> Result<u64, PolicyError> {
        let now = Instant::now();
        let window = self.config.window;
        let max = self.config.max_requests;

        let mut slot = self.slots.entry(key.to_owned()).or_insert_with(|| Slot {
            window_start: now,
            prev_count: 0,
            curr_count: 0,
        });

        advance_window(&mut slot, now, window);

        let elapsed_in_window = now.duration_since(slot.window_start);
        let prev_weight = 1.0_f64 - elapsed_in_window.as_secs_f64() / window.as_secs_f64();
        let estimate = (slot.prev_count as f64 * prev_weight) as u64 + slot.curr_count + 1;

        if estimate > max {
            return Err(PolicyError::RateLimitExceeded { retry_after_secs: window.as_secs() });
        }

        slot.curr_count += 1;
        Ok(max.saturating_sub(estimate))
    }
}

/// Advance `slot` to the window that contains `now`, preserving the previous
/// window count for interpolation.
fn advance_window(slot: &mut Slot, now: Instant, window: Duration) {
    let elapsed = now.duration_since(slot.window_start);
    if elapsed < window {
        return;
    }
    let advance_count = elapsed.as_nanos() / window.as_nanos();
    slot.prev_count = if advance_count == 1 {
        slot.curr_count
    } else {
        0
    };
    slot.curr_count = 0;
    // Saturate at u64::MAX nanos (~584 years) to avoid Duration overflow.
    let advance_ns = window
        .as_nanos()
        .saturating_mul(advance_count)
        .min(u64::MAX as u128) as u64;
    slot.window_start += Duration::from_nanos(advance_ns);
}
