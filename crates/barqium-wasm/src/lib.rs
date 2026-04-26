//! WASM plugin runtime for Barqium: wasmtime host, hot-reload watcher.

pub mod error;
pub mod host;
pub mod runtime;
pub mod types;
pub mod watcher;

pub use error::WasmError;
pub use runtime::PluginRuntime;
pub use types::{Action, RequestContext, ResponseContext};
pub use watcher::spawn_watcher;
