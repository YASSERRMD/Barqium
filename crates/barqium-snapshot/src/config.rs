use std::env;

/// Runtime configuration loaded from environment variables.
#[derive(Debug, Clone)]
pub struct Config {
    pub kafka_brokers: String,
    pub kafka_group_id: String,
    pub config_topic: String,
    pub snapshot_dir: String,
    pub log_level: String,
}

impl Config {
    /// Reads config from well-known environment variables.
    pub fn from_env() -> Self {
        Self {
            kafka_brokers: env::var("KAFKA_BROKERS").unwrap_or_else(|_| "localhost:9092".into()),
            kafka_group_id: env::var("KAFKA_GROUP_ID")
                .unwrap_or_else(|_| "barqium-snapshot".into()),
            config_topic: env::var("CONFIG_TOPIC").unwrap_or_else(|_| "config.changes".into()),
            snapshot_dir: env::var("SNAPSHOT_DIR").unwrap_or_else(|_| "/dev/shm/barqium".into()),
            log_level: env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        }
    }
}
