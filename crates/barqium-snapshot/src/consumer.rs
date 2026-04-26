use std::collections::HashMap;
use std::sync::Arc;

use prost::Message;
use rdkafka::consumer::{CommitMode, Consumer, StreamConsumer};
use rdkafka::message::Message as _;
use rdkafka::ClientConfig;
use tokio::sync::Mutex;
use tracing::{error, info, warn};

use crate::config::Config;
use crate::proto::config::ConfigEvent;
use crate::state::TenantState;
use crate::writer::write_snapshot;

pub type SharedState = Arc<Mutex<HashMap<String, TenantState>>>;

/// Creates an rdkafka StreamConsumer connected to the config.changes topic.
pub fn build_consumer(cfg: &Config) -> anyhow::Result<StreamConsumer> {
    let consumer: StreamConsumer = ClientConfig::new()
        .set("bootstrap.servers", &cfg.kafka_brokers)
        .set("group.id", &cfg.kafka_group_id)
        .set("auto.offset.reset", "earliest")
        .set("enable.auto.commit", "false")
        .create()?;

    consumer.subscribe(&[cfg.config_topic.as_str()])?;
    Ok(consumer)
}

/// Polls the config.changes topic, applies events to the shared state,
/// and re-writes the snapshot for the affected tenant after each event.
pub async fn run(cfg: Arc<Config>, consumer: StreamConsumer, state: SharedState) {
    info!(
        topic  = %cfg.config_topic,
        group  = %cfg.kafka_group_id,
        "snapshot consumer started"
    );

    loop {
        match consumer.recv().await {
            Err(e) => {
                error!("kafka recv error: {e}");
                // Back off briefly to avoid tight error loops.
                tokio::time::sleep(std::time::Duration::from_millis(500)).await;
            }
            Ok(msg) => {
                let Some(bytes) = msg.payload() else {
                    warn!("received empty kafka message; skipping");
                    if let Err(e) = consumer.commit_message(&msg, CommitMode::Async) {
                        error!("commit error: {e}");
                    }
                    continue;
                };

                match ConfigEvent::decode(bytes) {
                    Err(e) => {
                        error!("protobuf decode error: {e}");
                    }
                    Ok(event) => {
                        let tenant_id = event.tenant_id.clone();
                        let snapshot = {
                            let mut guard = state.lock().await;
                            let tenant = guard
                                .entry(tenant_id.clone())
                                .or_insert_with(|| TenantState::new(&tenant_id));
                            tenant.apply(&event);
                            tenant.to_snapshot()
                        };

                        if let Err(e) = write_snapshot(&cfg.snapshot_dir, &snapshot) {
                            error!(
                                tenant_id = %tenant_id,
                                "failed to write snapshot: {e}"
                            );
                        }
                    }
                }

                if let Err(e) = consumer.commit_message(&msg, CommitMode::Async) {
                    error!("kafka commit error: {e}");
                }
            }
        }
    }
}
