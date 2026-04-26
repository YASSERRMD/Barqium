use std::time::{SystemTime, UNIX_EPOCH};

use async_trait::async_trait;
use bytes::Bytes;
use futures::stream::{self, StreamExt};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::debug;

use crate::error::AiError;
use crate::provider::{AiProvider, ChatStream};
use crate::types::{
    ChatChunk, ChatRequest, ChatResponse, Choice, DeltaContent, FinishReason, Message,
    ModelPricing, Role, TokenUsage,
};

pub struct BedrockProvider {
    client: Client,
    region: String,
    access_key: String,
    secret_key: String,
}

impl BedrockProvider {
    pub fn new(
        region: impl Into<String>,
        access_key: impl Into<String>,
        secret_key: impl Into<String>,
    ) -> Self {
        Self {
            client: Client::new(),
            region: region.into(),
            access_key: access_key.into(),
            secret_key: secret_key.into(),
        }
    }

    fn endpoint(&self, model_id: &str) -> String {
        format!(
            "https://bedrock-runtime.{}.amazonaws.com/model/{}/converse",
            self.region, model_id
        )
    }

    fn endpoint_stream(&self, model_id: &str) -> String {
        format!(
            "https://bedrock-runtime.{}.amazonaws.com/model/{}/converse-stream",
            self.region, model_id
        )
    }
}

// ---------------------------------------------------------------------------
// Wire types (Bedrock Converse API)
// ---------------------------------------------------------------------------

#[derive(Serialize)]
struct ConverseRequest<'a> {
    messages: Vec<ConverseMessage<'a>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    system: Option<Vec<ConverseSystemBlock<'a>>>,
    #[serde(rename = "inferenceConfig", skip_serializing_if = "Option::is_none")]
    inference_config: Option<InferenceConfig>,
}

#[derive(Serialize)]
struct ConverseMessage<'a> {
    role: &'a str,
    content: Vec<ConverseContentBlock<'a>>,
}

#[derive(Serialize)]
struct ConverseContentBlock<'a> {
    text: &'a str,
}

#[derive(Serialize)]
struct ConverseSystemBlock<'a> {
    text: &'a str,
}

#[derive(Serialize)]
struct InferenceConfig {
    #[serde(rename = "maxTokens", skip_serializing_if = "Option::is_none")]
    max_tokens: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    temperature: Option<f32>,
}

#[derive(Deserialize)]
struct ConverseResponse {
    output: ConverseOutput,
    #[serde(rename = "stopReason")]
    stop_reason: Option<String>,
    usage: ConverseUsage,
}

#[derive(Deserialize)]
struct ConverseOutput {
    message: ConverseMessageOwned,
}

#[derive(Deserialize)]
struct ConverseMessageOwned {
    content: Vec<ConverseContentOwned>,
}

#[derive(Deserialize)]
struct ConverseContentOwned {
    text: Option<String>,
}

#[derive(Deserialize, Default)]
struct ConverseUsage {
    #[serde(rename = "inputTokens")]
    input_tokens: u32,
    #[serde(rename = "outputTokens")]
    output_tokens: u32,
    #[serde(rename = "totalTokens")]
    total_tokens: u32,
}

// ---------------------------------------------------------------------------
// Minimal AWS SigV4 implementation for Bedrock HTTPS calls.
// Only supports the subset needed: POST with JSON body, service = bedrock-runtime.
// ---------------------------------------------------------------------------

fn sigv4_sign(
    method: &str,
    url: &str,
    region: &str,
    body: &[u8],
    access_key: &str,
    secret_key: &str,
) -> (String, String, String) {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let date_time = format_datetime(secs);
    let date = &date_time[..8];

    let parsed = url::Url::parse(url).expect("valid bedrock URL");
    let host = parsed.host_str().unwrap_or("");
    let path = parsed.path();

    // Canonical request
    let payload_hash = hex_sha256(body);
    let canonical_headers =
        format!("content-type:application/json\nhost:{host}\nx-amz-date:{date_time}\n");
    let signed_headers = "content-type;host;x-amz-date";
    let canonical_request =
        format!("{method}\n{path}\n\n{canonical_headers}\n{signed_headers}\n{payload_hash}");

    // String to sign
    let cr_hash = hex_sha256(canonical_request.as_bytes());
    let credential_scope = format!("{date}/{region}/bedrock-runtime/aws4_request");
    let string_to_sign = format!("AWS4-HMAC-SHA256\n{date_time}\n{credential_scope}\n{cr_hash}");

    // Signing key
    let k_date = hmac_sha256(format!("AWS4{secret_key}").as_bytes(), date.as_bytes());
    let k_region = hmac_sha256(&k_date, region.as_bytes());
    let k_service = hmac_sha256(&k_region, b"bedrock-runtime");
    let k_signing = hmac_sha256(&k_service, b"aws4_request");
    let signature = hex_encode(&hmac_sha256(&k_signing, string_to_sign.as_bytes()));

    let credential = format!("{access_key}/{credential_scope}");
    let auth = format!(
        "AWS4-HMAC-SHA256 Credential={credential}, SignedHeaders={signed_headers}, Signature={signature}"
    );

    (auth, date_time, host.to_string())
}

fn format_datetime(secs: u64) -> String {
    // Simplified ISO 8601 basic format: YYYYMMDDTHHmmssZ
    let s = secs;
    let (y, mo, d, h, mi, sec) = seconds_to_ymd_hms(s);
    format!("{y:04}{mo:02}{d:02}T{h:02}{mi:02}{sec:02}Z")
}

fn seconds_to_ymd_hms(s: u64) -> (u64, u64, u64, u64, u64, u64) {
    let sec = s % 60;
    let min = (s / 60) % 60;
    let hour = (s / 3600) % 24;
    let days = s / 86400;
    // Days since 1970-01-01
    let (y, mo, d) = days_to_ymd(days);
    (y, mo, d, hour, min, sec)
}

fn days_to_ymd(mut days: u64) -> (u64, u64, u64) {
    let mut year = 1970u64;
    loop {
        let dy = if is_leap(year) { 366 } else { 365 };
        if days < dy {
            break;
        }
        days -= dy;
        year += 1;
    }
    let leap = is_leap(year);
    let months = [
        31,
        if leap { 29 } else { 28 },
        31,
        30,
        31,
        30,
        31,
        31,
        30,
        31,
        30,
        31,
    ];
    let mut month = 1u64;
    for &dm in &months {
        if days < dm {
            break;
        }
        days -= dm;
        month += 1;
    }
    (year, month, days + 1)
}

fn is_leap(y: u64) -> bool {
    y.is_multiple_of(4) && (!y.is_multiple_of(100) || y.is_multiple_of(400))
}

fn hex_sha256(data: &[u8]) -> String {
    let hash = sha256_raw(data);
    hex_encode(&hash)
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().fold(String::new(), |mut s, b| {
        let _ = std::fmt::Write::write_fmt(&mut s, format_args!("{b:02x}"));
        s
    })
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> [u8; 32] {
    const BLOCK: usize = 64;
    let mut k = [0u8; BLOCK];
    if key.len() > BLOCK {
        let h = sha256_raw(key);
        k[..32].copy_from_slice(&h);
    } else {
        k[..key.len()].copy_from_slice(key);
    }
    let mut ipad = [0x36u8; BLOCK];
    let mut opad = [0x5cu8; BLOCK];
    for i in 0..BLOCK {
        ipad[i] ^= k[i];
        opad[i] ^= k[i];
    }
    let mut inner = Vec::with_capacity(BLOCK + data.len());
    inner.extend_from_slice(&ipad);
    inner.extend_from_slice(data);
    let inner_hash = sha256_raw(&inner);
    let mut outer = Vec::with_capacity(BLOCK + 32);
    outer.extend_from_slice(&opad);
    outer.extend_from_slice(&inner_hash);
    sha256_raw(&outer)
}

fn sha256_raw(data: &[u8]) -> [u8; 32] {
    // Standard SHA-256 implementation.
    const K: [u32; 64] = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
        0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
        0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
        0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
        0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
        0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
        0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
        0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
        0xc67178f2,
    ];
    let mut h: [u32; 8] = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab,
        0x5be0cd19,
    ];
    let bit_len = (data.len() as u64) * 8;
    let mut msg = data.to_vec();
    msg.push(0x80);
    while (msg.len() % 64) != 56 {
        msg.push(0);
    }
    msg.extend_from_slice(&bit_len.to_be_bytes());

    for chunk in msg.chunks(64) {
        let mut w = [0u32; 64];
        for (i, word) in chunk.chunks(4).enumerate().take(16) {
            w[i] = u32::from_be_bytes([word[0], word[1], word[2], word[3]]);
        }
        for i in 16..64 {
            let s0 = w[i - 15].rotate_right(7) ^ w[i - 15].rotate_right(18) ^ (w[i - 15] >> 3);
            let s1 = w[i - 2].rotate_right(17) ^ w[i - 2].rotate_right(19) ^ (w[i - 2] >> 10);
            w[i] = w[i - 16]
                .wrapping_add(s0)
                .wrapping_add(w[i - 7])
                .wrapping_add(s1);
        }
        let (mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut hh) =
            (h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7]);
        for i in 0..64 {
            let s1 = e.rotate_right(6) ^ e.rotate_right(11) ^ e.rotate_right(25);
            let ch = (e & f) ^ ((!e) & g);
            let temp1 = hh
                .wrapping_add(s1)
                .wrapping_add(ch)
                .wrapping_add(K[i])
                .wrapping_add(w[i]);
            let s0 = a.rotate_right(2) ^ a.rotate_right(13) ^ a.rotate_right(22);
            let maj = (a & b) ^ (a & c) ^ (b & c);
            let temp2 = s0.wrapping_add(maj);
            hh = g;
            g = f;
            f = e;
            e = d.wrapping_add(temp1);
            d = c;
            c = b;
            b = a;
            a = temp1.wrapping_add(temp2);
        }
        h[0] = h[0].wrapping_add(a);
        h[1] = h[1].wrapping_add(b);
        h[2] = h[2].wrapping_add(c);
        h[3] = h[3].wrapping_add(d);
        h[4] = h[4].wrapping_add(e);
        h[5] = h[5].wrapping_add(f);
        h[6] = h[6].wrapping_add(g);
        h[7] = h[7].wrapping_add(hh);
    }
    let mut out = [0u8; 32];
    for (i, &val) in h.iter().enumerate() {
        out[i * 4..(i + 1) * 4].copy_from_slice(&val.to_be_bytes());
    }
    out
}

fn bedrock_pricing(model_id: &str) -> Option<ModelPricing> {
    // Prices as of mid-2025 in USD per 1k tokens (us-east-1 on-demand).
    let (prompt, completion, ctx) = match model_id {
        m if m.contains("claude-opus-4") => (0.015, 0.075, 200_000),
        m if m.contains("claude-sonnet-4") => (0.003, 0.015, 200_000),
        m if m.contains("claude-haiku-4") => (0.0008, 0.004, 200_000),
        m if m.contains("claude-3-5-sonnet") => (0.003, 0.015, 200_000),
        m if m.contains("claude-3-5-haiku") => (0.0008, 0.004, 200_000),
        m if m.contains("claude-3-opus") => (0.015, 0.075, 200_000),
        m if m.contains("claude-3-haiku") => (0.00025, 0.00125, 200_000),
        m if m.contains("llama3") => (0.00065, 0.00065, 128_000),
        m if m.contains("mistral") => (0.00045, 0.00070, 32_000),
        _ => return None,
    };
    Some(ModelPricing {
        prompt_per_1k: prompt,
        completion_per_1k: completion,
        context_limit: ctx,
    })
}

fn parse_stop_reason(s: Option<&str>) -> FinishReason {
    match s {
        Some("max_tokens") => FinishReason::Length,
        Some("tool_use") => FinishReason::ToolCall,
        _ => FinishReason::Stop,
    }
}

fn split_system(messages: &[Message]) -> (Option<&str>, Vec<&Message>) {
    let mut system = None;
    let rest = messages
        .iter()
        .filter(|m| {
            if m.role == Role::System {
                system = Some(m.content.as_str());
                false
            } else {
                true
            }
        })
        .collect();
    (system, rest)
}

#[async_trait]
impl AiProvider for BedrockProvider {
    fn name(&self) -> &str {
        "bedrock"
    }

    fn pricing(&self, model: &str) -> Option<ModelPricing> {
        bedrock_pricing(model)
    }

    fn count_tokens(&self, messages: &[Message]) -> u32 {
        messages
            .iter()
            .map(|m| (m.content.len() as u32 / 4) + 4)
            .sum::<u32>()
            + 2
    }

    async fn chat(&self, req: ChatRequest) -> Result<ChatResponse, AiError> {
        let (system, turns) = split_system(&req.messages);
        let messages: Vec<ConverseMessage<'_>> = turns
            .iter()
            .map(|m| ConverseMessage {
                role: if m.role == Role::Assistant {
                    "assistant"
                } else {
                    "user"
                },
                content: vec![ConverseContentBlock { text: &m.content }],
            })
            .collect();

        let body = ConverseRequest {
            messages,
            system: system.map(|s| vec![ConverseSystemBlock { text: s }]),
            inference_config: Some(InferenceConfig {
                max_tokens: req.max_tokens,
                temperature: req.temperature,
            }),
        };

        let body_bytes = serde_json::to_vec(&body)?;
        let url = self.endpoint(&req.model);
        let (auth, date_time, _host) = sigv4_sign(
            "POST",
            &url,
            &self.region,
            &body_bytes,
            &self.access_key,
            &self.secret_key,
        );

        debug!(
            provider = "bedrock",
            model = req.model,
            "sending converse request"
        );

        let resp = self
            .client
            .post(&url)
            .header("authorization", auth)
            .header("x-amz-date", date_time)
            .header("content-type", "application/json")
            .body(Bytes::from(body_bytes))
            .send()
            .await?;

        let status = resp.status().as_u16();
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider {
                provider: "bedrock".into(),
                status,
                message: text,
            });
        }

        let cr: ConverseResponse = resp.json().await?;
        let usage = TokenUsage {
            prompt_tokens: cr.usage.input_tokens,
            completion_tokens: cr.usage.output_tokens,
            total_tokens: cr.usage.total_tokens,
        };
        let cost_usd = bedrock_pricing(&req.model)
            .map(|p| p.cost(&usage))
            .unwrap_or(0.0);

        let text = cr
            .output
            .message
            .content
            .into_iter()
            .filter_map(|c| c.text)
            .collect::<Vec<_>>()
            .join("");

        Ok(ChatResponse {
            id: uuid::Uuid::new_v4().to_string(),
            model: req.model.clone(),
            choices: vec![Choice {
                index: 0,
                message: Message {
                    role: Role::Assistant,
                    content: text,
                },
                finish_reason: parse_stop_reason(cr.stop_reason.as_deref()),
            }],
            usage,
            provider: "bedrock".into(),
            cost_usd,
        })
    }

    async fn chat_stream(&self, req: ChatRequest) -> Result<ChatStream, AiError> {
        let (system, turns) = split_system(&req.messages);
        let messages: Vec<ConverseMessage<'_>> = turns
            .iter()
            .map(|m| ConverseMessage {
                role: if m.role == Role::Assistant {
                    "assistant"
                } else {
                    "user"
                },
                content: vec![ConverseContentBlock { text: &m.content }],
            })
            .collect();

        let body = ConverseRequest {
            messages,
            system: system.map(|s| vec![ConverseSystemBlock { text: s }]),
            inference_config: Some(InferenceConfig {
                max_tokens: req.max_tokens,
                temperature: req.temperature,
            }),
        };

        let body_bytes = serde_json::to_vec(&body)?;
        let url = self.endpoint_stream(&req.model);
        let (auth, date_time, _host) = sigv4_sign(
            "POST",
            &url,
            &self.region,
            &body_bytes,
            &self.access_key,
            &self.secret_key,
        );

        let resp = self
            .client
            .post(&url)
            .header("authorization", auth)
            .header("x-amz-date", date_time)
            .header("content-type", "application/json")
            .body(Bytes::from(body_bytes))
            .send()
            .await?;

        let status = resp.status().as_u16();
        if !resp.status().is_success() {
            let text = resp.text().await.unwrap_or_default();
            return Err(AiError::Provider {
                provider: "bedrock".into(),
                status,
                message: text,
            });
        }

        // Bedrock converse-stream uses HTTP/2 event-stream framing.
        // Each frame payload contains a JSON object with a "contentBlockDelta" key.
        let stream_id = uuid::Uuid::new_v4().to_string();
        let provider_name = "bedrock".to_string();

        let chunk_stream = resp
            .bytes_stream()
            .map(move |result: Result<Bytes, reqwest::Error>| {
                let provider = provider_name.clone();
                let id = stream_id.clone();
                match result {
                    Err(e) => vec![Err(AiError::Transport(e))],
                    Ok(bytes) => {
                        // Best-effort JSON parse of event-stream frames.
                        let text = String::from_utf8_lossy(&bytes);
                        text.lines()
                            .filter(|l| !l.is_empty())
                            .filter_map(|l| {
                                let v: serde_json::Value = serde_json::from_str(l).ok()?;
                                let text = v["contentBlockDelta"]["delta"]["text"]
                                    .as_str()
                                    .map(String::from)?;
                                Some(Ok(ChatChunk {
                                    id: id.clone(),
                                    provider: provider.clone(),
                                    delta: DeltaContent {
                                        role: None,
                                        content: Some(text),
                                    },
                                    finish_reason: None,
                                }))
                            })
                            .collect::<Vec<_>>()
                    }
                }
            })
            .flat_map(stream::iter);

        Ok(Box::pin(chunk_stream))
    }
}
