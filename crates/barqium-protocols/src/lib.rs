//! Protocol adapters: HTTP/1, HTTP/2, gRPC, WebSocket, SSE, MCP, GraphQL, SOAP.

pub mod graphql;
pub mod soap;

pub use graphql::{detect as detect_graphql, GraphQlInfo, OperationType, PersistedQueryStore};
pub use soap::{parse_soap_action, wrap_fault, SoapVersion};
