use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;

use arc_swap::ArcSwap;
use tracing::{info, warn};
use wasmtime::{Engine, Linker, Module, Store};

use crate::error::WasmError;
use crate::host::add_host_functions;
use crate::types::{Action, RequestContext, ResponseContext};

/// Per-plugin state stored alongside the wasmtime `Module`.
#[derive(Clone)]
pub struct PluginModule {
    pub name: String,
    pub module: Module,
}

/// Shared, hot-swappable plugin registry.
///
/// The registry holds a snapshot of all compiled `PluginModule`s. The hot-
/// reload watcher atomically replaces this snapshot when a `.wasm` file
/// changes on disk so in-flight requests finish on the old version while
/// new requests pick up the new version.
pub struct PluginRuntime {
    engine: Engine,
    plugins: ArcSwap<Vec<PluginModule>>,
    plugin_dir: PathBuf,
}

impl PluginRuntime {
    /// Create a runtime that loads `.wasm` files from `plugin_dir`.
    pub fn new(plugin_dir: impl AsRef<Path>) -> Result<Arc<Self>, WasmError> {
        let engine = Engine::default();
        let plugin_dir = plugin_dir.as_ref().to_path_buf();
        let plugins = load_all(&engine, &plugin_dir)?;

        Ok(Arc::new(Self {
            engine,
            plugins: ArcSwap::from_pointee(plugins),
            plugin_dir,
        }))
    }

    /// Run all loaded plugins' `on_request` export against `ctx`.
    ///
    /// The chain short-circuits on the first non-Continue action.
    pub fn on_request(&self, ctx: &mut RequestContext) -> Result<Action, WasmError> {
        let plugins = self.plugins.load();
        for p in plugins.iter() {
            let action = call_on_request(&self.engine, p, ctx)?;
            if action != Action::Continue {
                return Ok(action);
            }
        }
        Ok(Action::Continue)
    }

    /// Run all loaded plugins' `on_response` export against `ctx`.
    pub fn on_response(&self, ctx: &mut ResponseContext) -> Result<Action, WasmError> {
        let plugins = self.plugins.load();
        for p in plugins.iter() {
            let action = call_on_response(&self.engine, p, ctx)?;
            if action != Action::Continue {
                return Ok(action);
            }
        }
        Ok(Action::Continue)
    }

    /// Reload all plugins from disk (called by the file watcher on change).
    pub fn reload(&self) -> Result<(), WasmError> {
        let fresh = load_all(&self.engine, &self.plugin_dir)?;
        let count = fresh.len();
        self.plugins.store(Arc::new(fresh));
        info!(count, dir = %self.plugin_dir.display(), "WASM plugins reloaded");
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

fn load_all(engine: &Engine, dir: &Path) -> Result<Vec<PluginModule>, WasmError> {
    let mut modules = Vec::new();
    if !dir.exists() {
        return Ok(modules);
    }
    let entries = std::fs::read_dir(dir)
        .map_err(|e| WasmError::NotFound(format!("{}: {e}", dir.display())))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("wasm") {
            continue;
        }
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();
        match Module::from_file(engine, &path) {
            Ok(module) => {
                info!(plugin = %name, "WASM plugin loaded");
                modules.push(PluginModule { name, module });
            }
            Err(e) => {
                warn!(plugin = %name, "WASM plugin compile failed: {e}");
            }
        }
    }
    Ok(modules)
}

/// Host state threaded through wasmtime `Store` calls.
pub struct HostState {
    pub headers: HashMap<String, String>,
    pub vars: HashMap<String, String>,
    pub log_buf: Vec<String>,
    pub action: Action,
}

fn call_on_request(
    engine: &Engine,
    plugin: &PluginModule,
    ctx: &mut RequestContext,
) -> Result<Action, WasmError> {
    let state = HostState {
        headers: header_map_to_strings(&ctx.headers),
        vars: ctx.vars.clone(),
        log_buf: Vec::new(),
        action: Action::Continue,
    };
    let mut store = Store::new(engine, state);
    let mut linker = Linker::new(engine);
    add_host_functions(&mut linker)?;

    let instance = linker
        .instantiate(&mut store, &plugin.module)
        .map_err(|e| WasmError::Instantiate(e.to_string()))?;

    if let Ok(func) = instance.get_typed_func::<(), i32>(&mut store, "on_request") {
        let code = func
            .call(&mut store, ())
            .map_err(|e| WasmError::Call(e.to_string()))?;
        let action = action_from_code(code, store.data());
        // Write back any header mutations.
        strings_to_header_map(store.data().headers.clone(), &mut ctx.headers);
        ctx.vars = store.data().vars.clone();
        Ok(action)
    } else {
        Ok(Action::Continue)
    }
}

fn call_on_response(
    engine: &Engine,
    plugin: &PluginModule,
    ctx: &mut ResponseContext,
) -> Result<Action, WasmError> {
    let state = HostState {
        headers: header_map_to_strings(&ctx.headers),
        vars: ctx.vars.clone(),
        log_buf: Vec::new(),
        action: Action::Continue,
    };
    let mut store = Store::new(engine, state);
    let mut linker = Linker::new(engine);
    add_host_functions(&mut linker)?;

    let instance = linker
        .instantiate(&mut store, &plugin.module)
        .map_err(|e| WasmError::Instantiate(e.to_string()))?;

    if let Ok(func) = instance.get_typed_func::<(), i32>(&mut store, "on_response") {
        let code = func
            .call(&mut store, ())
            .map_err(|e| WasmError::Call(e.to_string()))?;
        let action = action_from_code(code, store.data());
        strings_to_header_map(store.data().headers.clone(), &mut ctx.headers);
        ctx.vars = store.data().vars.clone();
        Ok(action)
    } else {
        Ok(Action::Continue)
    }
}

fn action_from_code(code: i32, state: &HostState) -> Action {
    match code {
        0 => Action::Continue,
        1 => Action::Deny,
        _ => state.action.clone(),
    }
}

fn header_map_to_strings(map: &http::HeaderMap) -> HashMap<String, String> {
    map.iter()
        .filter_map(|(k, v)| {
            v.to_str()
                .ok()
                .map(|v| (k.as_str().to_string(), v.to_string()))
        })
        .collect()
}

fn strings_to_header_map(map: HashMap<String, String>, out: &mut http::HeaderMap) {
    for (k, v) in map {
        if let (Ok(name), Ok(value)) = (
            http::header::HeaderName::from_bytes(k.as_bytes()),
            http::HeaderValue::from_str(&v),
        ) {
            out.insert(name, value);
        }
    }
}
