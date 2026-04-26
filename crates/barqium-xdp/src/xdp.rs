//! XDP passthrough loader (Linux + `xdp` feature only).
//!
//! Loads a minimal eBPF XDP program compiled to bytecode that returns
//! `XDP_PASS` for every packet, proving the aya pipeline is wired correctly.
//! Future programs loaded here can steer packets directly to sockets via
//! `XDP_REDIRECT`, bypassing multiple kernel layers for the fast path.

use aya::{programs::Xdp, programs::XdpFlags, Ebpf};
use thiserror::Error;
use tracing::info;

#[derive(Debug, Error)]
pub enum XdpError {
    #[error("aya load error: {0}")]
    Load(#[from] aya::EbpfError),

    #[error("program not found in object: {name}")]
    NotFound { name: String },

    #[error("attach failed: {0}")]
    Attach(#[source] aya::programs::ProgramError),
}

/// A loaded XDP program that is detached when dropped.
pub struct XdpHandle {
    _bpf: Ebpf,
    iface: String,
}

impl Drop for XdpHandle {
    fn drop(&mut self) {
        info!(iface = %self.iface, "XDP program detached");
    }
}

/// Load and attach the passthrough XDP program to `iface`.
///
/// `bytecode` must be the ELF bytecode of a compiled eBPF object that exports
/// a program named `xdp_pass`. In production, this would be compiled via
/// `aya-build` from a `src/bpf/` directory.
pub fn load_passthrough(iface: &str, bytecode: &[u8]) -> Result<XdpHandle, XdpError> {
    let mut bpf = Ebpf::load(bytecode)?;

    let prog: &mut Xdp = bpf
        .program_mut("xdp_pass")
        .ok_or_else(|| XdpError::NotFound {
            name: "xdp_pass".to_string(),
        })?
        .try_into()
        .map_err(XdpError::Load)?;

    prog.load()?;
    prog.attach(iface, XdpFlags::default())
        .map_err(XdpError::Attach)?;

    info!(iface, "XDP passthrough program attached");

    Ok(XdpHandle {
        _bpf: bpf,
        iface: iface.to_string(),
    })
}
