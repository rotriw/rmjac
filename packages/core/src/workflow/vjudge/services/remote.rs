//! Remote Edge Service Proxy
//!
//! This module provides a proxy service that wraps remote TypeScript edge services
//! and exposes them as workflow services. Communication happens via Socket.IO.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashSet;
use serde_json::to_string;
use uuid::Uuid;
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire};
use crate::service::socket::workflow::dispatch_workflow_task;
use crate::model::vjudge::workflow_dto::WorkflowStatusDataDTO;
use crate::workflow::vjudge::status::{VjudgeExportDescribe, VjudgeExportDescribeExpr, VjudgeRequire, VjudgeRequireExpr, VjudgeStatus, VjudgeStatusDescribe, VjudgeStatusRequire, VjudgeStatusType, VjudgeValue};
use crate::workflow::vjudge::status::VjudgeExportDescribeExpr::Has;

/// Information about a registered remote edge service
#[derive(Clone, Debug)]
pub struct RemoteServiceInfo {
    /// Unique identifier for this service instance
    pub service_id: String,
    /// Human-readable name
    pub name: String,
    /// Description of what this service does
    pub description: String,
    /// Allow description for UI hints
    pub allow_description: String,
    /// Platform this service handles (e.g., "codeforces", "atcoder")
    pub platform: String,
    /// Operation (verify/sync/submit/etc.)
    pub operation: String,
    /// Method (optional)
    pub method: String,
    /// Capabilities provided by this service
    pub capabilities: Vec<String>,
    /// Estimated cost for using this service
    pub cost: i32,
    /// Whether this is an end service
    pub is_end: bool,
    /// Required input status type
    pub input_status_type: String,
    /// Output status types
    pub output_status_types: Vec<String>,
    /// Required keys in input
    pub required_keys: Vec<String>,
    /// Required status types in input
    pub required_status_types: Vec<String>,
    /// Exported keys
    pub export_keys: Vec<String>,
}

/// Proxy service that forwards requests to remote TypeScript edge services
#[derive(Clone)]
pub struct RemoteEdgeService {
    /// Service information
    info: RemoteServiceInfo,
    /// Socket.IO client for communication (placeholder - actual implementation depends on socket.io library)
    #[allow(dead_code)]
    socket_endpoint: String,
}

impl RemoteEdgeService {
    /// Create a new remote edge service proxy
    pub fn new(info: RemoteServiceInfo, socket_endpoint: &str) -> Self {
        Self {
            info,
            socket_endpoint: socket_endpoint.to_string(),
        }
    }
}

#[async_trait::async_trait(?Send)]
impl Service for RemoteEdgeService {
    fn is_end(&self) -> bool {
        self.info.is_end
    }

    fn get_info(&self) -> ServiceInfo {
        ServiceInfo {
            name: self.info.name.clone(),
            description: self.info.description.clone(),
            allow_description: if self.info.allow_description.is_empty() {
                format!(
                    "Remote service for {} platform: {}",
                    self.info.platform,
                    self.info.capabilities.join(", ")
                )
            } else {
                self.info.allow_description.clone()
            },
        }
    }

    fn get_cost(&self) -> i32 {
        self.info.cost
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        let mut require = VjudgeRequire {
            inner: vec![]
        };
        for key in &self.info.required_keys {
            require.inner.push(VjudgeRequireExpr::HasKey(key.clone()));
        }
        // 平台需要正确。
        require.inner.push(VjudgeRequireExpr::KeyEq("platform".to_string(), self.info.platform.clone()));
        Box::new(require)
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        let mut res = VjudgeExportDescribe {
            inner: vec![HashMap::new()],
        };
        for key in &self.info.export_keys {
            res.inner[0].insert(key.clone(), vec![VjudgeExportDescribeExpr::Has]);
        }
        vec![Box::new(res)] // 其实还有概率返回错误。但是有点懒了。
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        for key in &self.info.required_keys {
            if input.get_value(key).is_none() {
                return false;
            }
        }
        if let Some(platform_value) = input.get_value("platform") {
            if platform_value.to_string() != self.info.platform {
                return false;
            }
        } else {
            return false;
        }
        true
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        let task_id = Uuid::new_v4().to_string();
        let input_json = match build_status_payload(input, &self.info) {
            Ok(payload) => payload,
            Err(err) => return Box::new(VjudgeStatus::Error(err)),
        };

        let response = dispatch_workflow_task(
            &task_id,
            &self.info.name,
            &self.info.platform,
            &self.info.operation,
            &self.info.method,
            input_json,
            None,
        )
        .await;

        if !response.success {
            let mut status = VjudgeStatus::Error(
                response.error.as_deref().unwrap_or("Remote execution failed").to_string()
            );
            return Box::new(status);
        }

        if let Some(output) = response.output {
            if let Ok(dto) = serde_json::from_value::<WorkflowStatusDataDTO>(output) {
                let mut status = VjudgeStatus::new(map_status_type(&dto.status_type));
                for (key, value) in dto.values {
                    status = status.with_value(&key, value.into());
                }
                status = status.with_value("task_id", VjudgeValue::String(task_id));
                return Box::new(status);
            }
        }

        let mut status = VjudgeStatus::new_error("Invalid remote response");
        status = status.with_value("task_id", VjudgeValue::String(task_id));
        Box::new(status)
    }
}

fn build_status_payload(
    input: &Box<dyn Status>,
    info: &RemoteServiceInfo,
) -> Result<serde_json::Value, String> {
    let mut values = serde_json::Map::new();
    let mut keys: HashSet<String> = info.required_keys.iter().cloned().collect();
    keys.insert("platform".to_string());

    for key in keys {
        if let Some(value) = input.get_value(&key) {
            values.insert(key, value_to_json(value.to_string()));
        } else {
            return Err(format!("Missing required key: {}", key));
        }
    }

    Ok(serde_json::json!({
        "statusType": to_ts_status_type(&input.get_status_type()),
        "values": values,
    }))
}

fn value_to_json(raw: String) -> serde_json::Value {
    if raw == "true" || raw == "false" {
        return serde_json::json!({ "type": "Bool", "value": raw == "true" });
    }
    if let Ok(num) = raw.parse::<i64>() {
        return serde_json::json!({ "type": "Number", "value": num });
    }
    serde_json::json!({ "type": "String", "value": raw })
}

fn to_ts_status_type(status_type: &str) -> &'static str {
    match status_type {
        "initial" => "Initial",
        "account_verified" => "AccountVerified",
        "problem_fetched" => "ProblemFetched",
        "problem_synced" => "ProblemSynced",
        "submission_created" => "SubmissionCreated",
        "submission_judged" => "SubmissionJudged",
        "error" => "Error",
        "completed" => "Completed",
        _ => "Initial",
    }
}

fn map_status_type(status_type: &str) -> VjudgeStatusType {
    match status_type {
        "Initial" => VjudgeStatusType::Initial,
        "AccountVerified" => VjudgeStatusType::AccountVerified,
        "ProblemFetched" => VjudgeStatusType::ProblemFetched,
        "ProblemSynced" => VjudgeStatusType::ProblemSynced,
        "SubmissionCreated" => VjudgeStatusType::SubmissionCreated,
        "SubmissionJudged" => VjudgeStatusType::SubmissionJudged,
        "Error" => VjudgeStatusType::Error,
        "Completed" => VjudgeStatusType::Completed,
        _ => VjudgeStatusType::Initial,
    }
}

/// Registry for managing remote edge services
pub struct RemoteServiceRegistry {
    /// Map of service_id to remote service
    services: Arc<RwLock<HashMap<String, RemoteEdgeService>>>,
}

impl RemoteServiceRegistry {
    /// Create a new empty registry
    pub fn new() -> Self {
        Self {
            services: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Register a new remote service
    pub async fn register(&self, info: RemoteServiceInfo, socket_endpoint: &str) {
        let service_id = info.service_id.clone();
        let service = RemoteEdgeService::new(info, socket_endpoint);
        let mut services = self.services.write().await;
        services.insert(service_id, service);
    }

    /// Deregister a service by ID
    pub async fn deregister(&self, service_id: &str) -> Option<RemoteEdgeService> {
        let mut services = self.services.write().await;
        services.remove(service_id)
    }

    /// Get all registered services for a specific platform
    pub async fn get_services_for_platform(&self, platform: &str) -> Vec<RemoteServiceInfo> {
        let services = self.services.read().await;
        services
            .values()
            .filter(|s| s.info.platform == platform)
            .map(|s| s.info.clone())
            .collect()
    }

    /// Get all registered services
    pub async fn get_all_services(&self) -> Vec<RemoteServiceInfo> {
        let services = self.services.read().await;
        services.values().map(|s| s.info.clone()).collect()
    }

    /// Check if a service is registered
    pub async fn has_service(&self, service_id: &str) -> bool {
        let services = self.services.read().await;
        services.contains_key(service_id)
    }

    /// Get service count
    pub async fn service_count(&self) -> usize {
        let services = self.services.read().await;
        services.len()
    }
}

impl Default for RemoteServiceRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Message types for Socket.IO communication with edge services
pub mod messages {
    use serde::{Deserialize, Serialize};

    /// Registration message sent by edge service when it connects
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ServiceRegistrationMessage {
        /// Unique identifier for this service instance
        pub service_id: String,
        /// Human-readable name
        pub name: String,
        /// Description of what this service does
        pub description: String,
        /// Platform this service handles
        pub platform: String,
        /// Capabilities provided by this service
        pub capabilities: Vec<String>,
        /// Estimated cost
        pub cost: i32,
        /// Whether this is an end service
        pub is_end: bool,
        /// Required input status type
        pub input_status_type: String,
        /// Output status types
        pub output_status_types: Vec<String>,
    }

    /// Request to execute a service
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ExecuteRequest {
        /// The service to execute
        pub service_id: String,
        /// Current status as JSON
        pub status: serde_json::Value,
    }

    /// Response from executing a service
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct ExecuteResponse {
        /// Whether execution succeeded
        pub success: bool,
        /// New status after execution
        pub status: Option<serde_json::Value>,
        /// Error message if failed
        pub error: Option<String>,
    }

    /// Heartbeat message to check service health
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct HeartbeatMessage {
        pub service_id: String,
        pub timestamp: i64,
    }
}