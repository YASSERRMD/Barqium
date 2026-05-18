//! Hot-reload support for WASM plugins.
//!
//! When the gateway detects that a `.wasm` file in the watched directory has
//! been modified (via filesystem events), it recompiles and re-registers the
//! plugin without restarting the process.

use std::path::{Path, PathBuf};

/// Watches a directory for `.wasm` file changes and triggers plugin reloads.
///
/// # Usage
/// ```no_run
/// use barqium_wasm::hot_reload::HotReloadWatcher;
///
/// let watcher = HotReloadWatcher::new("/etc/barqium/plugins");
/// watcher.watch_directory().expect("failed to start hot-reload watcher");
/// ```
#[derive(Debug, Clone)]
pub struct HotReloadWatcher {
    /// The directory to watch for `.wasm` file changes.
    pub directory: PathBuf,
    /// Whether recursive subdirectory watching is enabled.
    pub recursive: bool,
}

impl HotReloadWatcher {
    /// Create a watcher for the given directory path.
    ///
    /// Recursive watching is disabled by default.
    pub fn new(directory: impl AsRef<Path>) -> Self {
        Self {
            directory: directory.as_ref().to_owned(),
            recursive: false,
        }
    }

    /// Enable recursive watching of subdirectories.
    pub fn with_recursive(mut self) -> Self {
        self.recursive = true;
        self
    }

    /// Start watching the configured directory for `.wasm` changes.
    ///
    /// This is a stub implementation. The production implementation will
    /// use the `notify` crate to receive `Create` and `Modify` events and
    /// dispatch them to the [`crate::runtime::PluginRuntime`] for hot-reload.
    ///
    /// # Errors
    /// Returns an error string if the directory does not exist or is not
    /// readable.
    pub fn watch_directory(&self) -> Result<(), String> {
        if !self.directory.exists() {
            return Err(format!(
                "plugin directory does not exist: {}",
                self.directory.display()
            ));
        }

        tracing::info!(
            dir = %self.directory.display(),
            recursive = self.recursive,
            "hot-reload watcher started (stub)"
        );

        // TODO: replace with `notify::recommended_watcher` when integrating
        // the `notify` crate. The callback should call
        // `PluginRuntime::reload_plugin(path)` for each changed `.wasm` file.

        Ok(())
    }
}
