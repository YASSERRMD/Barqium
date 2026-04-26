use std::collections::HashMap;

use barqium_config::{RouteEntry, RouteSnapshot, UpstreamEntry};

use crate::proto::config::{config_event::Payload, ConfigEvent, EventType};

/// Per-tenant in-memory state, updated by each ConfigEvent.
#[derive(Default)]
pub struct TenantState {
    pub tenant_id: String,
    pub sequence: u64,
    pub routes: HashMap<String, RouteEntry>,
    pub upstreams: HashMap<String, UpstreamEntry>,
}

impl TenantState {
    pub fn new(tenant_id: impl Into<String>) -> Self {
        Self {
            tenant_id: tenant_id.into(),
            ..Default::default()
        }
    }

    /// Applies a ConfigEvent, updating the in-memory state.
    pub fn apply(&mut self, event: &ConfigEvent) {
        if event.sequence > self.sequence {
            self.sequence = event.sequence;
        }

        match &event.payload {
            Some(Payload::RouteUpserted(r)) => {
                if let Some(proto) = &r.route {
                    let entry = RouteEntry {
                        id: proto.id.clone(),
                        tenant_id: proto.tenant_id.clone(),
                        method: proto.method.clone(),
                        path_prefix: proto.path_prefix.clone(),
                        host: proto.host.clone(),
                        upstream_id: proto.upstream_id.clone(),
                        policy_ids: proto.policy_ids.clone(),
                        enabled: proto.enabled,
                    };
                    self.routes.insert(proto.id.clone(), entry);
                }
            }
            Some(Payload::RouteDeleted(d)) => {
                self.routes.remove(&d.route_id);
            }
            Some(Payload::UpstreamUpserted(u)) => {
                if let Some(proto) = &u.upstream {
                    let entry = UpstreamEntry {
                        id: proto.id.clone(),
                        name: proto.name.clone(),
                        url: proto.url.clone(),
                        timeout_ms: proto.timeout_ms,
                        enabled: proto.enabled,
                    };
                    self.upstreams.insert(proto.id.clone(), entry);
                }
            }
            Some(Payload::UpstreamDeleted(d)) => {
                self.upstreams.remove(&d.upstream_id);
            }
            None => {
                tracing::warn!(
                    tenant_id = %self.tenant_id,
                    sequence  = event.sequence,
                    event_type = event.event_type,
                    "received ConfigEvent with no payload"
                );
            }
        }

        let et = EventType::try_from(event.event_type).unwrap_or(EventType::Unspecified);
        tracing::debug!(
            tenant_id = %self.tenant_id,
            sequence  = self.sequence,
            event_type = ?et,
            routes    = self.routes.len(),
            upstreams = self.upstreams.len(),
            "applied ConfigEvent"
        );
    }

    /// Compiles the current state into a RouteSnapshot ready for serialization.
    #[must_use]
    pub fn to_snapshot(&self) -> RouteSnapshot {
        use std::time::{SystemTime, UNIX_EPOCH};
        let now_ms = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis() as i64;

        RouteSnapshot {
            tenant_id: self.tenant_id.clone(),
            sequence: self.sequence,
            snapshot_at: now_ms,
            routes: self.routes.values().cloned().collect(),
            upstreams: self.upstreams.values().cloned().collect(),
        }
    }
}
