pub mod status;
pub mod services;
pub mod system;
pub mod workflow;
pub mod executor;

use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use serde_json::Value as JsonValue;
use crate::workflow::WorkflowValues;

use crate::service::socket::workflow::dispatch_workflow_task;

pub use system::VjudgeWorkflowSystem;
pub use system::VjudgeWorkflowSystem as VjudgeWorkflow;
pub use services::RemoteEdgeService;
pub use services::remote::RemoteServiceInfo;
pub use status::vjudge_value_to_workflow_value;

#[derive(Clone, Default)]
pub struct VjudgeWorkflowRegistry {
    socket_services: Arc<RwLock<HashMap<String, Vec<String>>>>,
}

impl VjudgeWorkflowRegistry {
    pub async fn global() -> Arc<VjudgeWorkflowSystem> {
        workflow::global().await
    }

    pub fn try_global() -> Option<Arc<VjudgeWorkflowSystem>> {
        workflow::try_global()
    }

    pub async fn dispatch_task(
        &self,
        task_id: &str,
        service_name: &str,
        _platform: &str,
        _operation: &str,
        _method: &str,
        input: JsonValue,
        timeout_ms: Option<u64>,
    ) -> crate::service::socket::workflow::WorkflowTaskResponse {
        let socket_id = self.find_socket(service_name);
        if socket_id.is_none() {
            return crate::service::socket::workflow::WorkflowTaskResponse {
                task_id: task_id.to_string(),
                success: false,
                output: None,
                error: Some("No available socket for service".to_string()),
            };
        }
        dispatch_workflow_task(
            task_id,
            service_name,
            &socket_id.unwrap(),
            wrap_input_values(input),
            timeout_ms,
        )
        .await
    }

    pub fn register_remote_service_keys(&self, socket_id: &str, keys: Vec<String>) {
        let mut map = self.socket_services.write().unwrap();
        map.insert(socket_id.to_string(), keys);
    }

    pub fn unregister_remote_service_keys(&self, socket_id: &str, keys: &[String]) {
        let mut map = self.socket_services.write().unwrap();
        if let Some(existing) = map.get_mut(socket_id) {
            existing.retain(|k| !keys.contains(k));
        }
    }

    pub fn deregister_socket(&self, socket_id: &str) {
        self.socket_services.write().unwrap().remove(socket_id);
    }

    pub fn remove_socket_registration(&self, socket_id: &str) {
        self.deregister_socket(socket_id);
    }

    pub fn find_socket(&self, service_name: &str) -> Option<String> {
        let map = self.socket_services.read().unwrap();
        map.iter()
            .find(|(_, keys)| keys.contains(&service_name.to_string()))
            .map(|(socket_id, _)| socket_id.clone())
    }
}

fn wrap_input_values(input: JsonValue) -> JsonValue {
    let values = WorkflowValues::from_json_trusted(input, "api").to_json();
    serde_json::json!({ "values": values })
}
