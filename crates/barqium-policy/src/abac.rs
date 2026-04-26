use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Flat key-value bag of attributes fed into the policy evaluator.
///
/// Keys follow dot-notation namespaces:
/// - `sub.*`   — subject attributes extracted from a validated JWT or API-key record
/// - `res.*`   — resource attributes (tenant_id, route_id, upstream_id, …)
/// - `env.*`   — environment attributes (method, path, remote_ip, …)
pub type Attributes = HashMap<String, Value>;

/// Whether a rule grants or denies access when its conditions match.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Effect {
    Allow,
    Deny,
}

/// Comparison operators for attribute conditions.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Operator {
    /// Strict equality.
    Eq,
    /// Not equal.
    Neq,
    /// String prefix match.
    StartsWith,
    /// The attribute value (string or array) contains the given value.
    Contains,
    /// The attribute value is present in a JSON array of allowed values.
    In,
}

/// A single predicate that compares an attribute to a constant value.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Condition {
    /// Dot-notation attribute key, e.g. `sub.role` or `env.method`.
    pub attribute: String,
    pub operator: Operator,
    /// The right-hand side value to compare against.
    pub value: Value,
}

impl Condition {
    fn matches(&self, attrs: &Attributes) -> bool {
        let Some(attr_val) = attrs.get(&self.attribute) else {
            return false;
        };
        match &self.operator {
            Operator::Eq => attr_val == &self.value,
            Operator::Neq => attr_val != &self.value,
            Operator::StartsWith => {
                let (Some(a), Some(b)) = (attr_val.as_str(), self.value.as_str()) else {
                    return false;
                };
                a.starts_with(b)
            }
            Operator::Contains => match attr_val {
                Value::String(s) => self
                    .value
                    .as_str()
                    .map(|needle| s.contains(needle))
                    .unwrap_or(false),
                Value::Array(arr) => arr.contains(&self.value),
                _ => false,
            },
            Operator::In => {
                let Some(set) = self.value.as_array() else {
                    return false;
                };
                set.contains(attr_val)
            }
        }
    }
}

/// All conditions in a rule must match (AND semantics).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rule {
    pub conditions: Vec<Condition>,
    pub effect: Effect,
}

impl Rule {
    fn matches(&self, attrs: &Attributes) -> bool {
        self.conditions.iter().all(|c| c.matches(attrs))
    }
}

/// A policy is an ordered list of rules plus a fallback default effect.
///
/// Evaluation is first-match: rules are tested in declaration order; the
/// effect of the first matching rule is returned. If no rule matches the
/// `default_effect` is returned.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Policy {
    pub id: String,
    /// Rules evaluated in order; first match wins.
    pub rules: Vec<Rule>,
    /// Returned when no rule matches.
    pub default_effect: Effect,
}

impl Policy {
    /// Evaluates the policy against the supplied attribute bag.
    pub fn evaluate(&self, attrs: &Attributes) -> Effect {
        for rule in &self.rules {
            if rule.matches(attrs) {
                return rule.effect.clone();
            }
        }
        self.default_effect.clone()
    }

    /// Returns `true` when the policy allows access.
    pub fn allows(&self, attrs: &Attributes) -> bool {
        self.evaluate(attrs) == Effect::Allow
    }
}

/// Evaluates a slice of policies against the attribute bag.
///
/// A single `Deny` from any policy rejects the request (deny-overrides).
/// All policies must return `Allow` for access to be granted. Returns
/// `true` (allow) when the slice is empty.
pub fn evaluate_all(policies: &[Policy], attrs: &Attributes) -> bool {
    policies.iter().all(|p| p.allows(attrs))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn attrs(pairs: &[(&str, Value)]) -> Attributes {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.clone()))
            .collect()
    }

    #[test]
    fn eq_match_allows() {
        let policy = Policy {
            id: "p1".into(),
            rules: vec![Rule {
                conditions: vec![Condition {
                    attribute: "sub.role".into(),
                    operator: Operator::Eq,
                    value: json!("admin"),
                }],
                effect: Effect::Allow,
            }],
            default_effect: Effect::Deny,
        };
        assert!(policy.allows(&attrs(&[("sub.role", json!("admin"))])));
        assert!(!policy.allows(&attrs(&[("sub.role", json!("viewer"))])));
    }

    #[test]
    fn in_operator() {
        let policy = Policy {
            id: "p2".into(),
            rules: vec![Rule {
                conditions: vec![Condition {
                    attribute: "env.method".into(),
                    operator: Operator::In,
                    value: json!(["GET", "HEAD"]),
                }],
                effect: Effect::Allow,
            }],
            default_effect: Effect::Deny,
        };
        assert!(policy.allows(&attrs(&[("env.method", json!("GET"))])));
        assert!(!policy.allows(&attrs(&[("env.method", json!("DELETE"))])));
    }

    #[test]
    fn deny_overrides_in_evaluate_all() {
        let allow_all = Policy {
            id: "allow".into(),
            rules: vec![],
            default_effect: Effect::Allow,
        };
        let deny_all = Policy {
            id: "deny".into(),
            rules: vec![],
            default_effect: Effect::Deny,
        };
        assert!(!evaluate_all(&[allow_all, deny_all], &attrs(&[])));
    }

    #[test]
    fn missing_attribute_does_not_match() {
        let policy = Policy {
            id: "p3".into(),
            rules: vec![Rule {
                conditions: vec![Condition {
                    attribute: "sub.tenant_id".into(),
                    operator: Operator::Eq,
                    value: json!("t1"),
                }],
                effect: Effect::Allow,
            }],
            default_effect: Effect::Deny,
        };
        assert!(!policy.allows(&attrs(&[])));
    }
}
