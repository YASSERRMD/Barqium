//! BPF/XDP fastest-path scaffold for Barqium.
//!
//! # Overview
//!
//! This crate provides two capabilities:
//!
//! 1. **SO_REUSEPORT socket setup** (`reuseport` module): enables the Linux
//!    kernel to distribute incoming connections across multiple listener tasks
//!    without a single accept bottleneck. This is transport-layer agnostic and
//!    works on macOS and Linux.
//!
//! 2. **XDP passthrough loader** (`xdp` module, Linux + `xdp` feature only):
//!    loads a minimal eBPF/XDP program via `aya` that passes all packets to the
//!    kernel network stack (XDP_PASS). This proves the aya pipeline compiles and
//!    links, and provides the hook point for future packet-steering programs that
//!    will route packets directly to the correct listener task without a syscall.
//!
//! # Usage
//!
//! ```toml
//! # Cargo.toml
//! barqium-xdp = { path = "../barqium-xdp" }
//! # For XDP loader on Linux:
//! barqium-xdp = { path = "../barqium-xdp", features = ["xdp"] }
//! ```

pub mod reuseport;

#[cfg(all(target_os = "linux", feature = "xdp"))]
pub mod xdp;
