use std::net::SocketAddr;

/// Set `SO_REUSEPORT` on a TCP listener socket so that multiple tokio tasks
/// can each hold their own file descriptor for the same address, allowing the
/// kernel to distribute accepted connections without a single-threaded accept
/// loop becoming a bottleneck.
///
/// # Platform support
///
/// `SO_REUSEPORT` is available on Linux 3.9+ and macOS. On other platforms
/// the socket is returned unchanged and a debug log is emitted.
///
/// # Usage
///
/// Call this before `TcpListener::from_std`:
///
/// ```no_run
/// use std::net::SocketAddr;
/// use barqium_xdp::reuseport::build_reuseport_listener;
///
/// # async fn run() -> anyhow::Result<()> {
/// let addr: SocketAddr = "0.0.0.0:9000".parse()?;
/// let std_listener = build_reuseport_listener(addr)?;
/// let tokio_listener = tokio::net::TcpListener::from_std(std_listener)?;
/// # Ok(())
/// # }
/// ```
pub fn build_reuseport_listener(addr: SocketAddr) -> Result<std::net::TcpListener, std::io::Error> {
    use std::net::TcpListener;

    let socket = socket2::Socket::new(
        if addr.is_ipv6() {
            socket2::Domain::IPV6
        } else {
            socket2::Domain::IPV4
        },
        socket2::Type::STREAM,
        Some(socket2::Protocol::TCP),
    )?;

    socket.set_reuse_address(true)?;

    #[cfg(any(target_os = "linux", target_os = "macos", target_os = "freebsd"))]
    socket.set_reuse_port(true)?;

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "freebsd")))]
    tracing::debug!("SO_REUSEPORT not supported on this platform; using SO_REUSEADDR only");

    socket.set_nonblocking(true)?;
    socket.bind(&addr.into())?;
    socket.listen(1024)?;

    Ok(TcpListener::from(socket))
}
