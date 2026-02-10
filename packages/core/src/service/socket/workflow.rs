//! Workflow Socket.IO 集成
//!
//! 实现新工作流架构下的 Socket.IO 事件处理：
//! - `workflow_task`：向边缘服务发送任务请求（带 callback 回调）
//! - `workflow_service_register`：边缘服务注册工作流服务
//! - `workflow_service_unregister`：边缘服务注销工作流服务
//! - 用户实时状态推送

use crate::env;
use crate::workflow::vjudge::{RemoteEdgeService, RemoteServiceInfo, VjudgeWorkflowRegistry};
use crate::workflow::vjudge::workflow;
use serde::{Deserialize, Serialize};
use ::workflow::workflow::WorkflowSystem;
use serde_json::Value;
use socketioxide::extract::SocketRef;
use std::time::Duration;
use tokio::time::timeout;

// ============================================================================
// 类型定义（与 TypeScript 边缘服务对齐）
// ============================================================================

/// 工作流服务元数据（边缘服务注册时提供）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowServiceMetadata {
    pub name: String,
    pub description: String,
    #[serde(rename = "allowDescription")]
    pub allow_description: String,
    pub platform: String,
    pub operation: String,
    pub method: String,
    pub cost: i32,
    #[serde(rename = "isEnd")]
    pub is_end: bool,
    #[serde(rename = "importRequire")]
    pub import_require: Value,
    #[serde(rename = "exportDescribe")]
    pub export_describe: Vec<Value>,
}

/// 工作流服务注册消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowServiceRegistrationMessage {
    pub services: Vec<WorkflowServiceMetadata>,
}

/// 工作流服务注销消息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowServiceUnregistrationMessage {
    #[serde(rename = "serviceNames")]
    pub service_names: Vec<String>,
}

/// 工作流任务请求（发送到边缘服务）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTaskRequest {
    #[serde(rename = "taskId")]
    pub task_id: String,
    #[serde(rename = "serviceName")]
    pub service_name: String,
    pub input: Value,
    pub timeout: Option<u64>,
}

/// 工作流任务响应（边缘服务回调返回）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTaskResponse {
    #[serde(rename = "taskId")]
    pub task_id: String,
    pub success: bool,
    pub output: Option<Value>,
    pub error: Option<String>,
}

/// 工作流状态推送消息（发送到前端用户 WebSocket）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowStatusUpdate {
    /// 任务 ID
    pub task_id: String,
    /// 当前状态类型
    pub status_type: String,
    /// 是否为终止状态
    pub is_final: bool,
    /// 成功/失败
    pub success: bool,
    /// 输出数据（可选）
    pub output: Option<Value>,
    /// 错误信息（可选）
    pub error: Option<String>,
    /// 时间戳
    pub timestamp: String,
}

/// 注册边缘服务的工作流服务
pub async fn register_workflow_services(socket_id: &str, services: &[WorkflowServiceMetadata]) {
    let workflow = workflow::global().await;
    let registry = VjudgeWorkflowRegistry::default();
    let mut keys = Vec::new();
    for service in services {
        workflow::register_service(Box::new(RemoteEdgeService::new(RemoteServiceInfo {
            service_name: service.name.clone(),
            description: service.description.clone(),
            allow_description: service.allow_description.clone(),
            platform: service.platform.clone(),
            operation: service.operation.clone(),
            method: service.method.clone(),
            cost: service.cost,
            is_end: service.is_end,
            required: service
                .import_require
                .get("requiredKeys")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(|s| s.to_string()))
                        .collect()
                })
                .unwrap_or_default(),
            exported: service
                .export_describe
                .iter()
                .filter_map(|v| v.get("key").and_then(|k| k.as_str()).map(|s| s.to_string()))
                .collect(),
            socket_id: socket_id.to_string(),
        }))).await;
        keys.push(service.name.clone());
    }
    if !keys.is_empty() {
        registry.register_remote_service_keys(socket_id, keys);
    }
}

/// 注销指定服务名列表
pub async fn unregister_workflow_services(socket_id: &str, service_names: &[String]) {
    let workflow = VjudgeWorkflowRegistry::default();
    workflow.unregister_remote_service_keys(socket_id, service_names);

    log::info!(
        "[Workflow] Unregistered {} services for socket {}",
        service_names.len(),
        socket_id
    );
}

/// 清理某个 socket 的所有工作流服务注册信息（断线时调用）
pub async fn deregister_workflow_socket(socket_id: &str) {
    let workflow = VjudgeWorkflowRegistry::default();
    workflow.deregister_socket(socket_id);
}

// ============================================================================
// 工作流任务派发（使用 callback 模式）
// ============================================================================

/// 向边缘服务发送工作流任务并等待 callback 响应
///
/// 使用 Socket.IO 的 ack (callback) 模式进行同步请求/响应。
/// 如果超时则返回错误响应。
pub async fn dispatch_workflow_task(
    task_id: &str,
    service_name: &str,
    socket_id: &str,
    input: Value,
    timeout_ms: Option<u64>,
) -> WorkflowTaskResponse {

    let socket = env::EDGE_SOCKETS.lock().unwrap().get(socket_id).unwrap().clone();

    let request = WorkflowTaskRequest {
        task_id: task_id.to_string(),
        service_name: service_name.to_string(),
        input,
        timeout: timeout_ms,
    };

    let timeout_ms_val = timeout_ms.unwrap_or(30_000);
    let timeout_duration = Duration::from_millis(timeout_ms_val);
    log::info!(
        "[Workflow:Dispatch] Sending emit_with_ack to socket {} with ack_timeout={}ms, tokio_timeout={}ms",
        socket.id, timeout_ms_val, timeout_ms_val
    );

    // 使用 Socket.IO 的 ack (callback) 模式
    // emit with ack: 发送 "workflow_task" 事件并等待 edge 服务的 callback 响应
    // 注意: socketioxide 默认 ack 超时仅 5 秒，需要用 socket.timeout() 覆盖
    // 同时外层仍保留 tokio::time::timeout 作为兜底保护
    let send_start = std::time::Instant::now();
    let ack_result = timeout(timeout_duration, async {
        log::debug!("[Workflow:Dispatch] Calling socket.timeout().emit_with_ack()...");
        match socket
            .timeout(timeout_duration)
            .emit_with_ack::<_, WorkflowTaskResponse>("workflow_task", &request)
        {
            Ok(ack_stream) => {
                log::info!("[Workflow:Dispatch] emit_with_ack sent successfully, waiting for ack from edge...");
                let ack_wait_start = std::time::Instant::now();
                let result = ack_stream.await;
                log::info!(
                    "[Workflow:Dispatch] Ack stream resolved after {:?}, is_ok={}",
                    ack_wait_start.elapsed(),
                    result.is_ok()
                );
                result
            }
            Err(send_err) => {
                log::error!("[Workflow:Dispatch] Failed to send task {}: {:?}", task_id, send_err);
                Ok(WorkflowTaskResponse {
                    task_id: task_id.to_string(),
                    success: false,
                    output: None,
                    error: Some(format!("Failed to send: {:?}", send_err)),
                })
            }
        }
    })
    .await;
    let total_elapsed = send_start.elapsed();

    match ack_result {
        Ok(Ok(response)) => {
            log::info!(
                "[Workflow:Dispatch] Task {} completed: success={}, total_elapsed={:?}, has_output={}, has_error={}",
                task_id, response.success, total_elapsed, response.output.is_some(), response.error.is_some()
            );
            if let Some(ref err) = response.error {
                log::warn!("[Workflow:Dispatch] Task {} response has error field: {}", task_id, err);
            }
            if let Some(ref output) = response.output {
                log::debug!("[Workflow:Dispatch] Task {} output: {}", task_id,
                    serde_json::to_string(output).unwrap_or_else(|e| format!("<serialize error: {}>", e))
                );
            }
            response
        }
        Ok(Err(err)) => {
            log::error!(
                "[Workflow:Dispatch] Task {} ack error after {:?}: {:?}",
                task_id, total_elapsed, err
            );
            log::error!(
                "[Workflow:Dispatch] This usually means: (1) edge service didn't call callback, (2) ack timeout too short, (3) response deserialization failed"
            );
            WorkflowTaskResponse {
                task_id: task_id.to_string(),
                success: false,
                output: None,
                error: Some(format!("Socket communication error: {:?}", err)),
            }
        }
        Err(_) => {
            log::error!(
                "[Workflow:Dispatch] Task {} tokio timeout after {:?} (configured={}ms)",
                task_id, total_elapsed, timeout_ms_val
            );
            log::error!(
                "[Workflow:Dispatch] Tokio timeout fired before ack timeout - this is unusual, check if ack_timeout was set correctly"
            );
            WorkflowTaskResponse {
                task_id: task_id.to_string(),
                success: false,
                output: None,
                error: Some(format!(
                    "Task timed out after {}ms",
                    timeout_duration.as_millis()
                )),
            }
        }
    }
}

// ============================================================================
// 状态缓存与通知（stub 实现）
// ============================================================================

use std::collections::HashMap;
use std::sync::Mutex;
use lazy_static::lazy_static;

lazy_static! {
    static ref TASK_STATUS_CACHE: Mutex<HashMap<String, (Value, String)>> = Mutex::new(HashMap::new());
}

/// 更新任务状态缓存
pub fn update_task_status_cache(task_id: &str, status: Value, timestamp: &str) {
    let mut cache = TASK_STATUS_CACHE.lock().unwrap();
    cache.insert(task_id.to_string(), (status, timestamp.to_string()));
}

/// 获取任务状态缓存
pub fn get_task_status_cache(task_id: &str) -> Option<(Value, String)> {
    let cache = TASK_STATUS_CACHE.lock().unwrap();
    cache.get(task_id).cloned()
}

/// 向用户推送工作流状态更新
pub async fn notify_user_workflow_status(_user_id: i64, _update: &WorkflowStatusUpdate) {
    // TODO: 通过 user WebSocket 推送状态更新
    log::debug!("[Workflow] notify_user_workflow_status: not yet implemented");
}