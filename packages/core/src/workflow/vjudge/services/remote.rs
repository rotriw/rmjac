//! Remote Edge Service Proxy
//!
//! Minimal proxy for TypeScript edge services via Socket.IO.

use std::collections::HashMap;

use serde_json::{Map as JsonMap, Value as JsonValue};
use uuid::Uuid;
use workflow::description::{WorkflowExportDescribe, WorkflowRequire};
use workflow::status::{WorkflowStatus, WorkflowValues};
use workflow::workflow::{Service, ServiceInfo, Status, StatusDescribe, StatusRequire, Value};

use crate::service::socket::workflow::dispatch_workflow_task;

/// Information about a registered remote edge service
#[derive(Clone, Debug)]
pub struct RemoteServiceInfo {
    pub service_name: String,
    pub description: String,
    pub allow_description: String,
    pub platform: String,
    pub operation: String,
    pub method: String,
    pub cost: i32,
    pub is_end: bool,
    pub required: Vec<String>,
    pub exported: Vec<String>,
    pub socket_id: String,
}

/// Proxy service that forwards requests to remote TypeScript edge services
#[derive(Clone)]
pub struct RemoteEdgeService {
    info: RemoteServiceInfo,
}

impl RemoteEdgeService {
    pub fn new(info: RemoteServiceInfo) -> Self {
        Self { info }
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
            description: self.info.description.clone(),
            allow_description: self.info.allow_description.clone(),
        }
    }

    fn get_cost(&self) -> i32 {
        self.info.cost
    }

    fn get_import_require(&self) -> Box<dyn StatusRequire> {
        let mut require = WorkflowRequire::new();
        for key in &self.info.required {
            require = require.with_key(key.clone());
        }
        Box::new(require.with_value("platform", self.info.platform.clone()))
    }

    fn get_export_describe(&self) -> Vec<Box<dyn StatusDescribe>> {
        let mut describe = WorkflowExportDescribe::new();
        for key in &self.info.exported {
            describe = describe.add_inner_has(key);
        }
        vec![Box::new(describe)]
    }

    async fn verify(&self, input: &Box<dyn Status>) -> bool {
        log::info!("RemoteEdgeService verifying required keys");
        for (k, v) in input.get_all_value() {
            log::info!("Input key: {}, value: {}", k, v.to_string());
        }
        for key in &self.info.required {
            if input.get_value(key).is_none() {
                return false;
            }
        }
        log::info!("RemoteEdgeService verifying platform match");
        if let Some(platform_value) = input.get_value("platform") {
            if platform_value.to_string() != self.info.platform {
                log::info!("Platform mismatch: expected {}, got {}", self.info.platform, platform_value.to_string());
                return false;
            }
        } else {
            return false;
        }
        true
    }

    async fn execute(&self, input: &Box<dyn Status>) -> Box<dyn Status> {
        let task_id = Uuid::new_v4().to_string();
        let input_json = status_to_request(input);

        let response = dispatch_workflow_task(
            &task_id,
            &self.info.service_name,
            &self.info.socket_id,
            input_json,
            None,
        )
        .await;

        if !response.success {
            return Box::new(WorkflowStatus::failed(
                response
                    .error
                    .unwrap_or_else(|| "Remote execution failed".to_string()),
            ));
        }

        if let Some(output) = response.output {
            let trusted_output = edge_output_to_status(output, &task_id);
            return trusted_output.concat(input);
        }

        input.clone_box()
    }
}

fn status_to_request(input: &Box<dyn Status>) -> JsonValue {
    let mut values = JsonMap::new();
    for (key, value) in input.get_all_value() {
        values.insert(
            key,
            serde_json::json!({
                "type": value.get_type().clone(),
                "value": value_to_json(&value)
            }),
        );
    }
    JsonValue::Object(JsonMap::from_iter([(
        "values".to_string(),
        JsonValue::Object(values),
    )]))
}

fn value_to_json(value: &Box<dyn Value>) -> JsonValue {
    let raw = value.to_string();
    serde_json::from_str(&raw).unwrap_or(JsonValue::String(raw))
}

fn edge_output_to_status(output: JsonValue, task_id: &str) -> Box<dyn Status> {
    let values_obj = output
        .get("values")
        .and_then(|v| v.as_object())
        .cloned()
        .or_else(|| output.as_object().cloned())
        .unwrap_or_else(|| {
            let mut map = JsonMap::new();
            map.insert("output".to_string(), output);
            map
        });

    let mut trusted_map = JsonMap::new();
    for (key, value) in values_obj {
        let actual = value
            .get("value")
            .cloned()
            .unwrap_or_else(|| value.clone());
        trusted_map.insert(key, actual);
    }
    trusted_map.insert("task_id".to_string(), JsonValue::String(task_id.to_string()));

    Box::new(WorkflowValues::from_json_trusted(
        JsonValue::Object(trusted_map),
        "edge_server",
    ))
}
