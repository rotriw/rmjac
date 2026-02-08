//! Workflow Socket.IO 集成
//!
//! 实现新工作流架构下的 Socket.IO 事件处理：
//! - `workflow_task`：向边缘服务发送任务请求（带 callback 回调）
//! - `workflow_service_register`：边缘服务注册工作流服务
//! - `workflow_service_unregister`：边缘服务注销工作流服务
//! - 用户实时状态推送

use crate::env;
use crate::workflow::vjudge::VjudgeWorkflow;
use serde::{Deserialize, Serialize};
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
    pub platform: String,
    pub operation: String,
    pub method: String,
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

// ============================================================================
// 服务注册/注销管理
// ============================================================================

/// 构建工作流服务 key
fn workflow_service_key(platform: &str, operation: &str, method: &str) -> String {
    format!(
        "{}:{}:{}",
        platform.to_lowercase(),
        operation,
        method.to_lowercase()
    )
}

/// 注册边缘服务的工作流服务
pub async fn register_workflow_services(socket_id: &str, services: &[WorkflowServiceMetadata]) {
    let workflow = VjudgeWorkflow::global().await;
    let mut keys = vec![];
    for svc in services {
        let key = workflow_service_key(&svc.platform, &svc.operation, &svc.method);
        keys.push(key);
    }

    workflow.register_remote_service_keys(socket_id, keys);

    // 保存完整元数据
    for svc in services {
        let key = workflow_service_key(&svc.platform, &svc.operation, &svc.method);
        if let Ok(val) = serde_json::to_value(svc) {
            workflow.register_service_metadata(&key, val);
        }
    }

    log::info!(
        "[Workflow] Registered {} services for socket {}",
        services.len(),
        socket_id
    );
}

/// 注销指定服务名列表
pub async fn unregister_workflow_services(socket_id: &str, service_names: &[String]) {
    let workflow = VjudgeWorkflow::global().await;
    workflow.unregister_remote_service_keys(socket_id, service_names);

    log::info!(
        "[Workflow] Unregistered {} services for socket {}",
        service_names.len(),
        socket_id
    );
}

/// 清理某个 socket 的所有工作流服务注册信息（断线时调用）
pub async fn deregister_workflow_socket(socket_id: &str) {
    let workflow = VjudgeWorkflow::global().await;
    workflow.deregister_socket(socket_id);
}

// ============================================================================
// 工作流任务派发（使用 callback 模式）
// ============================================================================

/// 查找能处理指定服务 key 的边缘 socket
fn find_workflow_socket(service_key: &str) -> Option<SocketRef> {
    let workflow = VjudgeWorkflow::try_global()?;
    let candidate_ids = workflow
        .service_index()
        .lock()
        .unwrap()
        .get(service_key)
        .cloned()
        .unwrap_or_default();

    if candidate_ids.is_empty() {
        return None;
    }

    // 轮询选择（简单取第一个已连接的 socket）
    for id in &candidate_ids {
        if let Some(socket) = env::EDGE_SOCKETS.lock().unwrap().get(id).cloned() {
            if socket.connected() {
                return Some(socket);
            }
        }
    }

    None
}

/// 向边缘服务发送工作流任务并等待 callback 响应
///
/// 使用 Socket.IO 的 ack (callback) 模式进行同步请求/响应。
/// 如果超时则返回错误响应。
pub async fn dispatch_workflow_task(
    task_id: &str,
    service_name: &str,
    platform: &str,
    operation: &str,
    method: &str,
    input: Value,
    timeout_ms: Option<u64>,
) -> WorkflowTaskResponse {
    let service_key = workflow_service_key(platform, operation, method);
    log::info!(
        "[Workflow:Dispatch] === dispatch_workflow_task START === task_id={}, service_key={}",
        task_id, service_key
    );

    // 打印当前注册表状态，便于排查
    {
        if let Some(workflow) = VjudgeWorkflow::try_global() {
            let wf_index = workflow.service_index().lock().unwrap();
            let wf_registry = workflow.service_registry().lock().unwrap();
            let edge_sockets = env::EDGE_SOCKETS.lock().unwrap();
            log::info!(
                "[Workflow:Dispatch] Registry state: WORKFLOW_SERVICE_INDEX={:?}, WORKFLOW_SERVICE_REGISTRY={:?}",
                wf_index.keys().collect::<Vec<_>>(),
                wf_registry.keys().collect::<Vec<_>>()
            );
            log::info!(
                "[Workflow:Dispatch] Registry state: EDGE_SOCKETS ids={:?}",
                edge_sockets.keys().collect::<Vec<_>>()
            );
            // 打印目标 service_key 的具体 socket 列表
            if let Some(wf_sockets) = wf_index.get(&service_key) {
                log::info!("[Workflow:Dispatch] WORKFLOW_SERVICE_INDEX[{}] = {:?}", service_key, wf_sockets);
            }
        } else {
            log::warn!("[Workflow:Dispatch] VjudgeWorkflow not initialized; skipping registry dump.");
        }
    }

    let socket = match find_workflow_socket(&service_key) {
        Some(s) => {
            log::info!(
                "[Workflow:Dispatch] Found socket: id={}, connected={}, ns={}",
                s.id, s.connected(), s.ns()
            );
            s
        }
        None => {
            log::error!(
                "[Workflow:Dispatch] No edge socket available for service: {}",
                service_key
            );
            return WorkflowTaskResponse {
                task_id: task_id.to_string(),
                success: false,
                output: None,
                error: Some(format!(
                    "No edge service available for: {}",
                    service_key
                )),
            };
        }
    };

    let request = WorkflowTaskRequest {
        task_id: task_id.to_string(),
        service_name: service_name.to_string(),
        platform: platform.to_string(),
        operation: operation.to_string(),
        method: method.to_string(),
        input,
        timeout: timeout_ms,
    };

    log::info!(
        "[Workflow:Dispatch] Request payload: task_id={}, service_name={}, platform={}, operation={}, method={}, timeout={:?}",
        request.task_id, request.service_name, request.platform, request.operation, request.method, request.timeout
    );
    log::debug!(
        "[Workflow:Dispatch] Request input JSON: {}",
        serde_json::to_string(&request.input).unwrap_or_else(|e| format!("<serialize error: {}>", e))
    );

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
// 用户实时状态推送
// ============================================================================

/// 向指定用户 WebSocket 推送工作流状态更新
pub fn notify_user_workflow_status(ws_id: &str, update: &WorkflowStatusUpdate) {
    let user_socket = {
        env::USER_WEBSOCKET_CONNECTIONS
            .lock()
            .unwrap()
            .get(ws_id)
            .cloned()
    };

    if let Some(socket) = user_socket {
        if let Err(err) = socket.emit("vjudge_workflow_update", update) {
            log::error!(
                "[Workflow] Failed to push status update to user ws {}: {}",
                ws_id,
                err
            );
        } else {
            log::debug!(
                "[Workflow] Pushed status update for task {} to ws {}",
                update.task_id,
                ws_id
            );
        }
    } else {
        log::debug!(
            "[Workflow] No user websocket found for ws_id: {}",
            ws_id
        );
    }
}

/// 向指定用户 ID 推送工作流状态更新（查找所有该用户的 WebSocket 连接）
pub fn notify_user_workflow_status_by_user_id(user_id: i64, update: &WorkflowStatusUpdate) {
    let connections = env::USER_WEBSOCKET_CONNECTIONS_ACCOUNT.lock().unwrap();
    let sockets = env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap();

    for (ws_id, uid) in connections.iter() {
        if *uid == user_id {
            if let Some(socket) = sockets.get(ws_id) {
                if let Err(err) = socket.emit("vjudge_workflow_update", update) {
                    log::error!(
                        "[Workflow] Failed to push status to user {} ws {}: {}",
                        user_id,
                        ws_id,
                        err
                    );
                }
            }
        }
    }
}

/// 更新工作流任务缓存状态
pub fn update_task_status_cache(task_id: &str, status_data: Value) {
    if let Some(workflow) = VjudgeWorkflow::try_global() {
        workflow.update_task_status_cache(task_id, status_data);
    }
}

/// 获取工作流任务缓存状态
pub fn get_task_status_cache(task_id: &str) -> Option<(Value, chrono::NaiveDateTime)> {
    VjudgeWorkflow::try_global().and_then(|workflow| workflow.get_task_status_cache(task_id))
}

/// 清除工作流任务缓存状态
pub fn remove_task_status_cache(task_id: &str) {
    if let Some(workflow) = VjudgeWorkflow::try_global() {
        workflow.remove_task_status_cache(task_id);
    }
}
