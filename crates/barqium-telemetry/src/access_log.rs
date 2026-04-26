use std::time::Duration;

use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::ClientConfig;
use serde::Serialize;
use tracing::warn;
use uuid::Uuid;

use crate::error::TelemetryError;

/// A structured access log entry emitted after every proxied request.
#[derive(Debug, Clone, Serialize)]
pub struct AccessLogEntry {
    /// RFC 3339 timestamp (UTC).
    pub timestamp: String,
    pub tenant_id: Option<Uuid>,
    pub upstream_id: Option<Uuid>,
    pub method: String,
    pub path: String,
    pub status: u16,
    /// Total gateway-to-client duration in milliseconds.
    pub duration_ms: u64,
    /// Protocol variant that served this request.
    pub protocol: Protocol,
    /// Downstream client address (IP only, no port).
    pub client_ip: Option<String>,
    pub request_id: Option<String>,
}

/// Protocol variant used to serve the request.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Protocol {
    H1,
    H2,
    H3,
    Grpc,
    Ws,
    Sse,
}

/// Async, fire-and-forget access log producer.
///
/// Serialises `AccessLogEntry` as JSON and enqueues to the `telemetry.access`
/// Kafka topic. Delivery failures are logged as warnings and do not affect
/// the request path.
#[derive(Clone)]
pub struct AccessLogProducer {
    producer: FutureProducer,
    topic: String,
}

impl AccessLogProducer {
    pub fn new(brokers: &str, topic: impl Into<String>) -> Result<Self, TelemetryError> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", brokers)
            .set("message.timeout.ms", "5000")
            .create()
            .map_err(|e| TelemetryError::Kafka(e.to_string()))?;
        Ok(Self {
            producer,
            topic: topic.into(),
        })
    }

    /// Enqueue `entry` to Kafka. Non-blocking: spawns a background task.
    pub fn emit(&self, entry: AccessLogEntry) {
        let producer = self.producer.clone();
        let topic = self.topic.clone();
        tokio::spawn(async move {
            match serde_json::to_vec(&entry) {
                Ok(payload) => {
                    let record = FutureRecord::to(&topic)
                        .payload(&payload)
                        .key(entry.request_id.as_deref().unwrap_or(""));
                    if let Err((e, _)) = producer.send(record, Duration::from_secs(5)).await {
                        warn!("access log delivery failed: {e}");
                    }
                }
                Err(e) => warn!("access log serialise failed: {e}"),
            }
        });
    }
}
