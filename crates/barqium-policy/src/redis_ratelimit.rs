use std::time::{SystemTime, UNIX_EPOCH};

use redis::aio::ConnectionManager;

use crate::error::PolicyError;

/// Configuration for the distributed sliding-window rate limiter.
#[derive(Debug, Clone)]
pub struct RedisRateLimitConfig {
    /// Maximum number of requests allowed in `window_secs`.
    pub max_requests: u64,
    /// Length of the sliding window in seconds.
    pub window_secs: u64,
}

/// Distributed sliding-window rate limiter backed by Redis.
///
/// Uses a Sorted Set keyed by `rate:{key}` where each member is the
/// request timestamp in microseconds. The algorithm:
/// 1. Remove members older than `now - window_secs`.
/// 2. Count remaining members.
/// 3. If count >= max_requests, return `Err(RateLimitExceeded)`.
/// 4. Add the current timestamp as a new member with the same score.
/// 5. Set key TTL to `window_secs + 1` to garbage-collect idle sets.
///
/// All five steps execute inside a MULTI/EXEC transaction, making the
/// check-then-set atomic. The sorted set approach gives an exact sliding
/// window without approximation.
#[derive(Clone)]
pub struct RedisRateLimiter {
    conn: ConnectionManager,
    config: RedisRateLimitConfig,
}

impl RedisRateLimiter {
    /// Creates a new `RedisRateLimiter`.
    ///
    /// `conn` must already be connected; use `redis::Client::get_connection_manager`.
    pub fn new(conn: ConnectionManager, config: RedisRateLimitConfig) -> Self {
        Self { conn, config }
    }

    /// Checks whether `key` is within the rate limit, incrementing the counter.
    ///
    /// Returns `Ok(())` when allowed, `Err(PolicyError::RateLimitExceeded)` when denied.
    pub async fn check_and_increment(&self, key: &str) -> Result<(), PolicyError> {
        let now_us: i64 = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_micros() as i64;

        let window_us = (self.config.window_secs as i64) * 1_000_000;
        let cutoff = now_us - window_us;
        let redis_key = format!("rate:{key}");
        let ttl = self.config.window_secs + 1;

        let count: u64 = self
            .sliding_window_check(&redis_key, cutoff, now_us, ttl as i64)
            .await?;

        if count > self.config.max_requests {
            return Err(PolicyError::RateLimitExceeded);
        }
        Ok(())
    }

    async fn sliding_window_check(
        &self,
        key: &str,
        cutoff: i64,
        now_us: i64,
        ttl: i64,
    ) -> Result<u64, PolicyError> {
        let mut conn = self.conn.clone();

        // Lua script for atomic ZREMRANGEBYSCORE + ZCARD + ZADD + EXPIRE.
        // Returns the count AFTER adding the new member (so the limit is
        // inclusive: count == max_requests is still allowed).
        let script = redis::Script::new(
            r#"
local key    = KEYS[1]
local cutoff = tonumber(ARGV[1])
local now_us = tonumber(ARGV[2])
local ttl    = tonumber(ARGV[3])

redis.call('ZREMRANGEBYSCORE', key, '-inf', cutoff)
local count = redis.call('ZCARD', key)
redis.call('ZADD', key, now_us, now_us)
redis.call('EXPIRE', key, ttl)
return count
"#,
        );

        let count: u64 = script
            .key(key)
            .arg(cutoff)
            .arg(now_us)
            .arg(ttl)
            .invoke_async(&mut conn)
            .await
            .map_err(|_e| PolicyError::RateLimitExceeded)?;

        Ok(count)
    }
}
