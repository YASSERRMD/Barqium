//! Policy audit trail — records the result of every policy evaluation.

use std::time::SystemTime;

/// The outcome of a single policy evaluation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PolicyDecision {
    /// The request was allowed to proceed.
    Allow,
    /// The request was denied by a policy rule.
    Deny,
}

impl std::fmt::Display for PolicyDecision {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Allow => write!(f, "allow"),
            Self::Deny => write!(f, "deny"),
        }
    }
}

/// An audit record produced for each policy evaluation.
///
/// These events are emitted to the audit log (via the outbox-worker or a
/// direct OTLP span) so operators can review why a specific request was
/// allowed or denied.
#[derive(Debug, Clone)]
pub struct PolicyAuditEvent {
    /// The ID of the request this evaluation applies to.
    pub request_id: String,

    /// The subject (JWT `sub`) of the token, if authentication succeeded.
    pub subject: Option<String>,

    /// The tenant the request was scoped to, if applicable.
    pub tenant_id: Option<String>,

    /// The name of the policy rule that produced this decision.
    pub policy_name: String,

    /// The final allow/deny decision.
    pub decision: PolicyDecision,

    /// Human-readable reason for the decision (e.g. `"rate limit exceeded"`).
    pub reason: String,

    /// Wall-clock time at which the evaluation completed.
    pub evaluated_at: SystemTime,
}

impl PolicyAuditEvent {
    /// Create an allow event.
    pub fn allow(
        request_id: impl Into<String>,
        policy_name: impl Into<String>,
        reason: impl Into<String>,
    ) -> Self {
        Self {
            request_id: request_id.into(),
            subject: None,
            tenant_id: None,
            policy_name: policy_name.into(),
            decision: PolicyDecision::Allow,
            reason: reason.into(),
            evaluated_at: SystemTime::now(),
        }
    }

    /// Create a deny event.
    pub fn deny(
        request_id: impl Into<String>,
        policy_name: impl Into<String>,
        reason: impl Into<String>,
    ) -> Self {
        Self {
            request_id: request_id.into(),
            subject: None,
            tenant_id: None,
            policy_name: policy_name.into(),
            decision: PolicyDecision::Deny,
            reason: reason.into(),
            evaluated_at: SystemTime::now(),
        }
    }

    /// Attach a subject claim to this event.
    pub fn with_subject(mut self, subject: impl Into<String>) -> Self {
        self.subject = Some(subject.into());
        self
    }

    /// Attach a tenant ID to this event.
    pub fn with_tenant(mut self, tenant_id: impl Into<String>) -> Self {
        self.tenant_id = Some(tenant_id.into());
        self
    }
}
