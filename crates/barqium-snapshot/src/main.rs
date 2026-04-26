use std::collections::HashMap;
use std::sync::Arc;

use tokio::sync::Mutex;
use tracing::info;

use barqium_snapshot::{
    config::Config,
    consumer::{build_consumer, run, SharedState},
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let cfg = Arc::new(Config::from_env());

    tracing_subscriber::fmt()
        .with_env_filter(&cfg.log_level)
        .json()
        .init();

    info!("barqium-snapshot starting");

    let state: SharedState = Arc::new(Mutex::new(HashMap::new()));
    let consumer = build_consumer(&cfg)?;

    run(cfg, consumer, state).await;
    Ok(())
}
