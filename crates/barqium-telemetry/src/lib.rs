//! OTLP exporter and Kafka producer for Barqium request telemetry.

pub mod access_log;
pub mod error;
pub mod otlp;
pub mod producer;
pub mod proto;

pub use access_log::{AccessLogEntry, AccessLogProducer, Protocol};
pub use error::TelemetryError;
pub use otlp::{init, OtlpConfig, TelemetryGuard};
pub use producer::{KafkaProducerConfig, TelemetryProducer};
pub use proto::RequestTelemetry;
