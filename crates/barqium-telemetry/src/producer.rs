use std::time::Duration;

use prost::Message;
use rdkafka::producer::{FutureProducer, FutureRecord};
use rdkafka::ClientConfig;

use crate::error::TelemetryError;
use crate::proto::RequestTelemetry;

/// Configuration for the telemetry Kafka producer.
#[derive(Debug, Clone)]
pub struct KafkaProducerConfig {
    pub brokers: String,
    pub topic: String,
}

/// Async, fire-and-forget Kafka producer for request telemetry.
///
/// `emit` spawns a Tokio task per event and does not block callers.
/// Delivery failures are logged as warnings.
#[derive(Clone)]
pub struct TelemetryProducer {
    producer: FutureProducer,
    topic: String,
}

impl TelemetryProducer {
    pub fn new(config: &KafkaProducerConfig) -> Result<Self, TelemetryError> {
        let producer: FutureProducer = ClientConfig::new()
            .set("bootstrap.servers", &config.brokers)
            .set("message.timeout.ms", "5000")
            .create()
            .map_err(|e| TelemetryError::Kafka(e.to_string()))?;
        Ok(Self {
            producer,
            topic: config.topic.clone(),
        })
    }

    /// Serialise `event` with Protobuf and enqueue to Kafka.
    ///
    /// Non-blocking: enqueues with zero timeout and spawns delivery tracking.
    /// If the internal queue is full the event is dropped with a warning.
    pub fn emit(&self, event: RequestTelemetry) {
        let payload = event.encode_to_vec();
        let producer = self.producer.clone();
        let topic = self.topic.clone();
        tokio::spawn(async move {
            let record = FutureRecord::<String, [u8]>::to(&topic).payload(&payload);
            if let Err((e, _)) = producer.send(record, Duration::ZERO).await {
                tracing::warn!(topic, "telemetry emit failed: {e}");
            }
        });
    }
}
