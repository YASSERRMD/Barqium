use opentelemetry::{global, trace::TracerProvider as _, KeyValue};
use opentelemetry_otlp::WithExportConfig;
use opentelemetry_sdk::{trace as sdktrace, Resource};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

use crate::error::TelemetryError;

/// Configuration for the OTLP exporter.
#[derive(Debug, Clone)]
pub struct OtlpConfig {
    /// Base OTLP HTTP endpoint, e.g. `http://localhost:4318`.
    pub endpoint: String,
    pub service_name: String,
    pub service_version: String,
}

/// RAII guard: shuts down the tracer provider when dropped.
pub struct TelemetryGuard {
    _tracer_provider: sdktrace::TracerProvider,
}

impl Drop for TelemetryGuard {
    fn drop(&mut self) {
        global::shutdown_tracer_provider();
    }
}

/// Initialise tracing with OTLP export and a JSON console layer.
///
/// Call once at process startup. Panics if a global subscriber is already set.
pub fn init(config: &OtlpConfig) -> Result<TelemetryGuard, TelemetryError> {
    let resource = Resource::new(vec![
        KeyValue::new("service.name", config.service_name.clone()),
        KeyValue::new("service.version", config.service_version.clone()),
    ]);

    let traces_url = format!("{}/v1/traces", config.endpoint.trim_end_matches('/'));

    let span_exporter = opentelemetry_otlp::new_exporter()
        .http()
        .with_endpoint(traces_url)
        .build_span_exporter()
        .map_err(|e| TelemetryError::Init(e.to_string()))?;

    let tracer_provider = sdktrace::TracerProvider::builder()
        .with_batch_exporter(span_exporter, opentelemetry_sdk::runtime::Tokio)
        .with_config(sdktrace::Config::default().with_resource(resource))
        .build();

    global::set_tracer_provider(tracer_provider.clone());

    let otel_layer = tracing_opentelemetry::layer()
        .with_tracer(tracer_provider.tracer(config.service_name.clone()));

    tracing_subscriber::registry()
        .with(EnvFilter::from_default_env())
        .with(tracing_subscriber::fmt::layer().json())
        .with(otel_layer)
        .init();

    Ok(TelemetryGuard {
        _tracer_provider: tracer_provider,
    })
}
