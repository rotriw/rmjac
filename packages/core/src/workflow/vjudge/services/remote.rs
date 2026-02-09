//! Remote Edge Service Proxy
//!
//! This module provides a proxy service that wraps remote TypeScript edge services
//! and exposes them as workflow services. Communication happens via Socket.IO.

use std::collections::HashMap;
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use serde_json::Value as JsonValue;
use uuid::Uuid;
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire, Value};
use workflow::value::{BaseValue, WorkflowValue};
use workflow::status::{WorkflowValues, WorkflowStatus};
use crate::model::vjudge::Platform;
use crate::service::socket::workflow::dispatch_workflow_task;
use crate::workflow::vjudge::status::{VjudgeExportDescribe, VjudgeExportDescribeExpr, VjudgeRequire, VjudgeRequireExpr};
use crate::workflow::vjudge::status::VjudgeExportDescribeExpr::Has;

/// Information about a registered remote edge service
#[derive(Clone, Debug)]
pub struct RemoteServiceInfo {
    /// Unique identifier for this service instance
    pub service_name: String,
    /// Description of what this service does
    pub description: String,
    pub platform: String,
    /// Allow description for UI hints
    pub allow_description: String,
    /// Estimated cost for using this service
    pub cost: i32,
    /// Whether this is an end service
    pub is_end: bool,
    /// Required keys in input
    pub required: Vec<String>,
    /// Exported keys
    pub exported: Vec<String>,
    pub socket_id: String,
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
            name: self.info.service_name.clone(),
            description: format!("{} {}", self.info.description.clone(), self.info.socket_id),
            allow_description: self.info.allow_description.clone(),
        }
    }

    fn get_cost(&self) -> i32 {
        self.info.cost
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        let mut require = VjudgeRequire {
            inner: vec![]
        };
        for key in &self.info.required {
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
        for key in &self.info.exported {
            res.inner[0].insert(format!("inner:{}", key.clone()), vec![VjudgeExportDescribeExpr::Has]);
        }
        vec![Box::new(res)] // 其实还有概率返回错误。但是有点懒了。
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        for key in &self.info.required {
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
            Err(err) => return Box::new(WorkflowStatus::failed(err)),
        };

        let response = dispatch_workflow_task(
            &task_id,
            &self.info.service_name,
            &self.info.platform,
            input_json,
            None,
        )
            .await;

        if !response.success {
            return Box::new(WorkflowStatus::failed(
                response.error.as_deref().unwrap_or("Remote execution failed").to_string(),
            ));
        }

        if let Some(output) = response.output {
            // 边缘服务器是受信任的来源，其输出应标记为 InnerFunction（可信）
            let trusted_output = parse_edge_output_as_trusted(output, &task_id);
            let result = trusted_output.concat(input);
            return result;
        }

        input.clone_box()
    }
}


/// 将边缘服务器返回的输出解析为受信任的 VjudgeStatus
///
/// 边缘服务器（TypeScript）返回的格式为 `{ values: { key: VjudgeValue } }`
/// 其中 VjudgeValue = `{ type: "String", value: "..." }` 等。
///
/// 由于边缘服务器是受信任来源，所有输出值都应标记为 InnerFunction。
fn parse_edge_output_as_trusted(output: JsonValue, task_id: &str) -> Box<dyn Status> {
    let values_obj = if let Some(obj) = output.get("values").and_then(|v| v.as_object()) {
        obj.clone()
    } else if let Some(obj) = output.as_object() {
        // 兜底：如果 output 本身就是一个扁平的 key-value 对象
        obj.clone()
    } else {
        log::warn!(
            "[RemoteEdge] Unexpected output format for task {}, wrapping as raw",
            task_id
        );
        let mut m = serde_json::Map::new();
        m.insert("output".to_string(), output);
        m
    };

    // 将所有值解析并标记为 InnerFunction（可信）
    let mut trusted_map = serde_json::Map::new();
    for (key, value) in &values_obj {
        // 边缘服务返回的 VjudgeValue 格式: { type: "String", value: "..." }
        // 提取内部的实际值
        let actual_value = extract_vjudge_value_payload(value);
        trusted_map.insert(key.clone(), actual_value);
    }

    // 附加 task_id
    trusted_map.insert("task_id".to_string(), JsonValue::String(task_id.to_string()));

    // 使用 WorkflowValues 并标记为可信（来自边缘服务器）
    Box::new(WorkflowValues::from_json_trusted(
        JsonValue::Object(trusted_map),
        "edge_server",
    ))
}

/// 从 TypeScript VjudgeValue 格式中提取实际值
///
/// TS 端序列化格式: `{ type: "String", value: "hello" }` → `"hello"`
/// 如果不是这种格式，直接返回原值
fn extract_vjudge_value_payload(value: &JsonValue) -> JsonValue {
    if let Some(obj) = value.as_object() {
        if let Some(type_field) = obj.get("type").and_then(|t| t.as_str()) {
            match type_field {
                "String" | "Number" | "Bool" | "List" | "Object" => {
                    if let Some(inner_val) = obj.get("value") {
                        return inner_val.clone();
                    }
                }
                "Inner" => {
                    // { type: "Inner", value: ... } 也是来自内部的值
                    if let Some(inner_val) = obj.get("value") {
                        return inner_val.clone();
                    }
                }
                _ => {}
            }
        }
    }
    // 不是 VjudgeValue 格式，直接使用原始值
    value.clone()
}

fn attach_task_id(mut output: JsonValue, task_id: &str) -> JsonValue {
    if let Some(obj) = output.as_object_mut() {
        obj.insert("task_id".to_string(), JsonValue::String(task_id.to_string()));
        return JsonValue::Object(obj.clone());
    }
    serde_json::json!({
        "task_id": task_id,
        "output": output,
    })
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