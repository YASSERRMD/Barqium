use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use notify::{Config, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use tokio::sync::mpsc;
use tracing::{info, warn};

use crate::runtime::PluginRuntime;

/// Spawn a background task that watches `plugin_dir` for `.wasm` file changes
/// and calls `runtime.reload()` when a modification or creation is detected.
///
/// The task runs until the returned `tokio::task::JoinHandle` is aborted.
pub fn spawn_watcher(
    plugin_dir: impl AsRef<Path> + Send + 'static,
    runtime: Arc<PluginRuntime>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        let plugin_dir = plugin_dir.as_ref().to_path_buf();
        let (tx, mut rx) = mpsc::channel::<()>(4);

        let mut watcher: RecommendedWatcher = match notify::Watcher::new(
            {
                let tx = tx.clone();
                move |res: notify::Result<notify::Event>| {
                    if let Ok(event) = res {
                        let relevant = matches!(
                            event.kind,
                            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)
                        );
                        let wasm_affected = event
                            .paths
                            .iter()
                            .any(|p| p.extension().and_then(|e| e.to_str()) == Some("wasm"));
                        if relevant && wasm_affected {
                            let _ = tx.try_send(());
                        }
                    }
                }
            },
            Config::default().with_poll_interval(Duration::from_secs(2)),
        ) {
            Ok(w) => w,
            Err(e) => {
                warn!("WASM watcher init failed: {e}");
                return;
            }
        };

        if let Err(e) = watcher.watch(&plugin_dir, RecursiveMode::NonRecursive) {
            warn!(dir = %plugin_dir.display(), "WASM watcher could not watch dir: {e}");
            return;
        }

        info!(dir = %plugin_dir.display(), "WASM plugin hot-reload watcher started");

        // Debounce: wait 200ms after the last event before reloading.
        loop {
            if rx.recv().await.is_none() {
                break;
            }
            // Drain any burst of events within 200ms.
            let deadline = tokio::time::Instant::now() + Duration::from_millis(200);
            while let Ok(Some(())) = tokio::time::timeout_at(deadline, rx.recv()).await {}
            match runtime.reload() {
                Ok(()) => {}
                Err(e) => warn!("WASM reload failed: {e}"),
            }
        }
    })
}
