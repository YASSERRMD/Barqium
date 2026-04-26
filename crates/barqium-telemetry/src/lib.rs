//! OTLP exporter and Kafka producer for Barqium request telemetry.

pub mod error;
pub mod otlp;

pub use error::TelemetryError;
pub use otlp::{init, OtlpConfig, TelemetryGuard};
