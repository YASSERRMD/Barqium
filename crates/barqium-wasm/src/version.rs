//! Plugin versioning utilities.

/// A semantic version string for a WASM plugin (e.g. `"1.2.3"`).
///
/// The version is stored as an owned `String` and validated on parse so
/// callers can rely on it conforming to the `MAJOR.MINOR.PATCH` format.
pub type PluginVersion = String;

/// Errors returned by [`version_from_str`].
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum VersionParseError {
    /// The string was empty.
    Empty,
    /// The string did not match the `MAJOR.MINOR.PATCH` pattern.
    InvalidFormat(String),
    /// One of the numeric components could not be parsed as a `u32`.
    NonNumericComponent { component: String, raw: String },
}

impl std::fmt::Display for VersionParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Empty => write!(f, "version string is empty"),
            Self::InvalidFormat(s) => {
                write!(f, "expected MAJOR.MINOR.PATCH format, got: {s}")
            }
            Self::NonNumericComponent { component, raw } => {
                write!(f, "component '{component}' in '{raw}' is not a number")
            }
        }
    }
}

impl std::error::Error for VersionParseError {}

/// Parse a version string of the form `"MAJOR.MINOR.PATCH"` into a
/// [`PluginVersion`].
///
/// # Errors
/// Returns a [`VersionParseError`] if `s` is empty, does not contain exactly
/// three dot-separated components, or any component is not a valid `u32`.
///
/// # Examples
/// ```
/// # use barqium_wasm::version::version_from_str;
/// let v = version_from_str("2.0.1").unwrap();
/// assert_eq!(v, "2.0.1");
/// ```
pub fn version_from_str(s: &str) -> Result<PluginVersion, VersionParseError> {
    if s.is_empty() {
        return Err(VersionParseError::Empty);
    }

    let parts: Vec<&str> = s.splitn(4, '.').collect();
    if parts.len() != 3 {
        return Err(VersionParseError::InvalidFormat(s.to_owned()));
    }

    for part in &parts {
        part.parse::<u32>().map_err(|_| VersionParseError::NonNumericComponent {
            component: part.to_string(),
            raw: s.to_owned(),
        })?;
    }

    Ok(s.to_owned())
}
