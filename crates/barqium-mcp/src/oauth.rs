use std::collections::HashMap;
use std::sync::RwLock;
use std::time::{Duration, Instant};

use reqwest::Client;
use serde::Deserialize;
use tracing::{debug, info};

use crate::error::McpError;

/// OAuth2 configuration for a single MCP server.
#[derive(Clone)]
pub struct OAuthConfig {
    /// Token endpoint URL.
    pub token_url: String,
    pub client_id: String,
    pub client_secret: String,
    /// Requested OAuth scopes.
    pub scopes: Vec<String>,
    /// Flow to use. PKCE is required for public clients.
    pub flow: OAuthFlow,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum OAuthFlow {
    ClientCredentials,
    Pkce,
}

#[derive(Clone)]
struct CachedToken {
    access_token: String,
    expires_at: Instant,
}

impl CachedToken {
    fn is_valid(&self) -> bool {
        // Treat tokens as expired 30s early to avoid race conditions.
        let effective_expiry = self
            .expires_at
            .checked_sub(Duration::from_secs(30))
            .unwrap_or(self.expires_at);
        Instant::now() < effective_expiry
    }
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    expires_in: Option<u64>,
    #[allow(dead_code)]
    token_type: Option<String>,
}

/// Token store: holds one cached access token per MCP server.
/// Automatically refreshes tokens when they are near expiry.
pub struct TokenStore {
    client: Client,
    tokens: RwLock<HashMap<String, CachedToken>>,
}

impl TokenStore {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            tokens: RwLock::new(HashMap::new()),
        }
    }

    /// Return a valid access token for `server_name`, fetching a new one if needed.
    pub async fn token(&self, server_name: &str, cfg: &OAuthConfig) -> Result<String, McpError> {
        // Fast path: cached valid token.
        {
            let tokens = self.tokens.read().expect("token read lock");
            if let Some(t) = tokens.get(server_name) {
                if t.is_valid() {
                    return Ok(t.access_token.clone());
                }
            }
        }

        // Slow path: fetch a new token.
        let new_token = match cfg.flow {
            OAuthFlow::ClientCredentials => self.client_credentials(cfg).await?,
            OAuthFlow::Pkce => {
                // PKCE without a browser redirect isn't useful server-side;
                // fall back to client_credentials for machine-to-machine flows.
                self.client_credentials(cfg).await?
            }
        };

        info!(server = server_name, "OAuth token refreshed");

        let mut tokens = self.tokens.write().expect("token write lock");
        tokens.insert(server_name.to_string(), new_token.clone());
        Ok(new_token.access_token)
    }

    async fn client_credentials(&self, cfg: &OAuthConfig) -> Result<CachedToken, McpError> {
        let mut params = vec![
            ("grant_type", "client_credentials"),
            ("client_id", &cfg.client_id),
            ("client_secret", &cfg.client_secret),
        ];
        let scope = cfg.scopes.join(" ");
        if !scope.is_empty() {
            params.push(("scope", &scope));
        }

        let resp = self
            .client
            .post(&cfg.token_url)
            .form(&params)
            .send()
            .await?;

        let status = resp.status().as_u16();
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(McpError::Rpc {
                code: status as i32,
                message: format!("OAuth token request failed: {text}"),
            });
        }

        let tr: TokenResponse = resp.json().await.map_err(McpError::Transport)?;
        let ttl = tr.expires_in.unwrap_or(3600);
        debug!(ttl, "OAuth token acquired");

        Ok(CachedToken {
            access_token: tr.access_token,
            expires_at: Instant::now() + Duration::from_secs(ttl),
        })
    }
}

impl Default for TokenStore {
    fn default() -> Self {
        Self::new()
    }
}
