use thiserror::Error;

#[derive(Debug, Error)]
pub enum TelemetryError {
    #[error("telemetry init failed: {0}")]
    Init(String),

    #[error("Kafka producer error: {0}")]
    Kafka(String),
}
