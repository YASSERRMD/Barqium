use wasmtime::{AsContext, Caller, Linker};

use crate::error::WasmError;
use crate::runtime::HostState;

/// Register all Barqium host functions into `linker`.
///
/// Plugins import these from the `barqium` namespace:
///
/// | Export | Signature | Description |
/// |---|---|---|
/// | `get_header` | `(ptr: i32, len: i32) -> i32` | Write header value into plugin memory; returns value length or -1 |
/// | `set_header` | `(kptr: i32, klen: i32, vptr: i32, vlen: i32)` | Insert/replace a header |
/// | `remove_header` | `(ptr: i32, len: i32)` | Remove a header by name |
/// | `get_var` | `(ptr: i32, len: i32) -> i32` | Read a request-scoped variable |
/// | `set_var` | `(kptr: i32, klen: i32, vptr: i32, vlen: i32)` | Set a request-scoped variable |
/// | `log` | `(ptr: i32, len: i32, level: i32)` | Emit a tracing log line (0=debug,1=info,2=warn) |
pub fn add_host_functions(linker: &mut Linker<HostState>) -> Result<(), WasmError> {
    // --- get_header ---
    linker
        .func_wrap(
            "barqium",
            "get_header",
            |mut caller: Caller<'_, HostState>, ptr: i32, len: i32| -> i32 {
                let key = read_str(&mut caller, ptr, len);
                match caller.data().headers.get(&key) {
                    Some(v) => v.len() as i32,
                    None => -1,
                }
            },
        )
        .map_err(|e| WasmError::HostFn(e.to_string()))?;

    // --- set_header ---
    linker
        .func_wrap(
            "barqium",
            "set_header",
            |mut caller: Caller<'_, HostState>, kptr: i32, klen: i32, vptr: i32, vlen: i32| {
                let key = read_str(&mut caller, kptr, klen);
                let val = read_str(&mut caller, vptr, vlen);
                caller.data_mut().headers.insert(key, val);
            },
        )
        .map_err(|e| WasmError::HostFn(e.to_string()))?;

    // --- remove_header ---
    linker
        .func_wrap(
            "barqium",
            "remove_header",
            |mut caller: Caller<'_, HostState>, ptr: i32, len: i32| {
                let key = read_str(&mut caller, ptr, len);
                caller.data_mut().headers.remove(&key);
            },
        )
        .map_err(|e| WasmError::HostFn(e.to_string()))?;

    // --- get_var ---
    linker
        .func_wrap(
            "barqium",
            "get_var",
            |mut caller: Caller<'_, HostState>, ptr: i32, len: i32| -> i32 {
                let key = read_str(&mut caller, ptr, len);
                match caller.data().vars.get(&key) {
                    Some(v) => v.len() as i32,
                    None => -1,
                }
            },
        )
        .map_err(|e| WasmError::HostFn(e.to_string()))?;

    // --- set_var ---
    linker
        .func_wrap(
            "barqium",
            "set_var",
            |mut caller: Caller<'_, HostState>, kptr: i32, klen: i32, vptr: i32, vlen: i32| {
                let key = read_str(&mut caller, kptr, klen);
                let val = read_str(&mut caller, vptr, vlen);
                caller.data_mut().vars.insert(key, val);
            },
        )
        .map_err(|e| WasmError::HostFn(e.to_string()))?;

    // --- log ---
    linker
        .func_wrap(
            "barqium",
            "log",
            |mut caller: Caller<'_, HostState>, ptr: i32, len: i32, level: i32| {
                let msg = read_str(&mut caller, ptr, len);
                caller.data_mut().log_buf.push(msg.clone());
                match level {
                    1 => tracing::info!(plugin_log = %msg),
                    2 => tracing::warn!(plugin_log = %msg),
                    _ => tracing::debug!(plugin_log = %msg),
                }
            },
        )
        .map_err(|e| WasmError::HostFn(e.to_string()))?;

    Ok(())
}

/// Read a UTF-8 string from plugin linear memory at `[ptr, ptr+len)`.
/// Returns an empty string if the memory region is out of bounds.
fn read_str(caller: &mut Caller<'_, HostState>, ptr: i32, len: i32) -> String {
    if ptr < 0 || len <= 0 {
        return String::new();
    }
    let mem = match caller.get_export("memory") {
        Some(wasmtime::Extern::Memory(m)) => m,
        _ => return String::new(),
    };
    let data = mem.data(caller.as_context());
    let start = ptr as usize;
    let end = start.saturating_add(len as usize);
    if end > data.len() {
        return String::new();
    }
    String::from_utf8_lossy(&data[start..end]).into_owned()
}
