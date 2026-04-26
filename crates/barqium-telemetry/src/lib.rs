//! OTLP exporter and Kafka producer for Barqium request telemetry.

pub mod error;
pub mod otlp;
pub mod producer;
pub mod proto;

pub use error::TelemetryError;
pub use otlp::{init, OtlpConfig, TelemetryGuard};
pub use producer::{KafkaProducerConfig, TelemetryProducer};
pub use proto::RequestTelemetry;
