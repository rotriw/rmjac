//! VJudge Workflow API Handler
//!
//! 提供与新工作流系统集成的 API 端点
//! - 任务执行：通过 Socket.IO 调度到边缘服务（callback 模式）
//! - 任务状态查询：从数据库和内存缓存中读取
//! - 服务列表：动态查询已注册的工作流服务
//! - 实时状态推送：执行完成后通过 user_notify 推送给前端

use crate::handler::{HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, route, require_login};
use rmjac_core::error::CoreError;
use rmjac_core::model::ModelStore;
use rmjac_core::workflow::vjudge::{VjudgeWorkflow, VjudgeWorkflowSystem};
use rmjac_core::workflow::{WorkflowSystem, WorkflowValues, BaseValue};
use rmjac_core::service::socket::workflow::WorkflowServiceMetadata;
use rmjac_core::service::socket::workflow::{
    dispatch_workflow_task, notify_user_workflow_status,
    update_task_status_cache, get_task_status_cache,
    WorkflowStatusUpdate,
};
use rmjac_core::model::vjudge::VjudgeTask;
use rmjac_core::model::vjudge::workflow_dto::{
    WorkflowTaskRequest, WorkflowStatusDataDTO, WorkflowValueDTO,
    WorkflowTaskResponseDTO, WorkflowTaskStatusDTO, WorkflowServiceInfo, WorkflowTargetInfo,
    WorkflowTargetParamInfo,
};
use rmjac_core::graph::node::{Node, NodeRaw};
use rmjac_core::graph::node::vjudge_task::{
    VjudgeTaskNodeRaw, VjudgeTaskNodePublicRaw, VjudgeTaskNodePrivateRaw,
};
use rmjac_core::graph::edge::EdgeRaw;
use std::collections::HashMap;

fn build_status(dto: WorkflowStatusDataDTO) -> Result<WorkflowValues, HttpError> {
    // 使用新的 DTO 转换方法，直接得到 WorkflowValues
    let workflow_values = dto.to_workflow_values();
    Ok(workflow_values)
}

fn parse_service_name(name: &str) -> (String, String, Option<String>) {
    let parts: Vec<&str> = name.split(':').collect();
    if parts.len() >= 2 {
        return (
            parts[0].to_string(),
            parts[1].to_string(),
            parts.get(2).map(|s| s.to_string()),
        );
    }

    if name == "sync_list" {
        return ("".to_string(), "sync".to_string(), Some("list".to_string()));
    }
    if let Some(platform) = name.strip_prefix("verify_account_") {
        return (platform.to_string(), "verify".to_string(), Some("account".to_string()));
    }
    if let Some(platform) = name.strip_prefix("sync_list_") {
        return (platform.to_string(), "sync".to_string(), Some("list".to_string()));
    }
    if let Some(platform) = name.strip_prefix("sync_one_") {
        return (platform.to_string(), "sync".to_string(), Some("one".to_string()));
    }
    if let Some(platform) = name.strip_prefix("submit_") {
        return (platform.to_string(), "submit".to_string(), None);
    }
    if let Some(platform) = name.strip_prefix("fetch_result_") {
        return (platform.to_string(), "fetch".to_string(), Some("result".to_string()));
    }

    match name {
        "sync_complete" => ("local".to_string(), "sync".to_string(), Some("complete".to_string())),
        "submit_complete" => ("local".to_string(), "submit".to_string(), Some("complete".to_string())),
        "update_problem" => ("local".to_string(), "update".to_string(), Some("problem".to_string())),
        "update_verified" => ("local".to_string(), "update".to_string(), Some("verified".to_string())),
        "update_user_verified" => (
            "local".to_string(),
            "update".to_string(),
            Some("user_verified".to_string()),
        ),
        _ => ("local".to_string(), name.to_string(), None),
    }
}

fn infer_platform(service_name: &str) -> Option<String> {
    let (platform, _, _) = parse_service_name(service_name);
    if platform.is_empty() {
        None
    } else {
        Some(platform)
    }
}

fn build_params(service_name: &str) -> Vec<WorkflowTargetParamInfo> {
    if service_name == "sync_complete" {
        return vec![param("local_problem_id", "number", true)];
    }

    if service_name == "submit_complete" {
        return vec![
            param("record_id", "number", true),
            param("submission_id", "string", false),
        ];
    }

    if service_name == "update_problem" {
        return vec![
            param("problem_data", "string", true),
            param("platform", "string", false),
            param("remote_problem_id", "string", false),
        ];
    }

    if service_name == "update_verified" {
        return vec![
            param("account_id", "number", true),
            param("verified", "boolean", false),
        ];
    }

    if service_name == "update_user_verified" {
        return vec![
            param("user_id", "number", true),
            param("account_id", "number", true),
            param("verified", "boolean", false),
        ];
    }

    if service_name.starts_with("verify_account_") {
        return vec![
            param("platform", "string", true),
            param("account_id", "number", true),
        ];
    }

    if service_name.starts_with("sync_list_") {
        return vec![
            param("platform", "string", true),
            param("account_id", "number", true),
        ];
    }

    if service_name == "sync_list" {
        return vec![
            param("platform", "string", true),
            param("account_id", "number", true),
        ];
    }

    if service_name.starts_with("sync_one_") {
        return vec![
            param("platform", "string", true),
            param("remote_problem_id", "string", true),
            param("account_id", "number", true),
        ];
    }

    if service_name.starts_with("submit_") {
        return vec![
            param("code", "string", true),
            param("language", "string", true),
            param("vjudge_account_id", "number", true),
        ];
    }

    if service_name.starts_with("fetch_result_") {
        return vec![
            param("submission_id", "string", true),
            param("platform", "string", true),
        ];
    }

    Vec::new()
}

fn param(key: &str, value_type: &str, required: bool) -> WorkflowTargetParamInfo {
    WorkflowTargetParamInfo {
        key: key.to_string(),
        value_type: value_type.to_string(),
        required,
    }
}

fn build_import_require(service_name: &str) -> Option<serde_json::Value> {
    let (required_keys, required_status_types): (Vec<&str>, Option<Vec<&str>>) = match service_name {
        "sync_complete" => (vec!["local_problem_id"], Some(vec!["ProblemSynced"])),
        "submit_complete" => (vec!["record_id"], Some(vec!["SubmissionCreated"])),
        "update_problem" => (vec!["problem_data"], Some(vec!["ProblemFetched"])),
        "update_verified" => (vec!["account_id"], Some(vec!["AccountVerified"])),
        "update_user_verified" => (vec!["user_id", "account_id"], Some(vec!["AccountVerified"])),
        "sync_list" => (vec!["platform", "account_id"], Some(vec!["AccountVerified"])),
        _ if service_name.starts_with("verify_account_") => (
            vec!["platform", "account_id"],
            Some(vec!["Initial"]),
        ),
        _ if service_name.starts_with("sync_list_") => (
            vec!["platform", "account_id"],
            Some(vec!["AccountVerified"]),
        ),
        _ if service_name.starts_with("sync_one_") => (
            vec!["platform", "remote_problem_id", "account_id"],
            Some(vec!["AccountVerified"]),
        ),
        _ if service_name.starts_with("submit_") => (
            vec!["code", "language", "vjudge_account_id"],
            None,
        ),
        _ if service_name.starts_with("fetch_result_") => (
            vec!["submission_id", "platform"],
            None,
        ),
        _ => return None,
    };

    let mut value = serde_json::Map::new();
    value.insert(
        "requiredKeys".to_string(),
        serde_json::Value::Array(
            required_keys
                .into_iter()
                .map(|k| serde_json::Value::String(k.to_string()))
                .collect(),
        ),
    );
    if let Some(status_types) = required_status_types {
        value.insert(
            "requiredStatusTypes".to_string(),
            serde_json::Value::Array(
                status_types
                    .into_iter()
                    .map(|s| serde_json::Value::String(s.to_string()))
                    .collect(),
            ),
        );
    }
    Some(serde_json::Value::Object(value))
}

#[generate_handler(route = "/workflow", real_path = "/api/vjudge/workflow")]
pub mod handler {
    use rmjac_core::workflow::vjudge::executor::execute_vjudge_task;
    use super::*;

    #[perm]
    #[require_login]
    async fn check_login(user_context: UserAuthCotext) -> bool {
        user_context.is_real
    }

    /// 执行工作流任务
    ///
    /// 1. 创建任务节点（持久化）
    /// 2. 通过 Socket.IO 调度到边缘服务（callback 模式）
    /// 3. 更新任务状态
    /// 4. 通过 user_notify 推送实时状态
    #[handler]
    #[perm(check_login)]
    #[route("/execute")]
    #[export("data")]
    async fn post_execute_task(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        body: WorkflowTaskRequest,
    ) -> ResultHandler<WorkflowTaskResponseDTO> {
        Ok(execute_vjudge_task(store.get_db(), &body).await?)
    }

    /// 获取可达终点列表
    #[handler]
    #[perm(check_login)]
    #[route("/targets")]
    #[export("data")]
    async fn get_targets(
        user_context: UserAuthCotext,
        status_type: String,
        values: String,
    ) -> ResultHandler<Vec<WorkflowTargetInfo>> {
        let _status_type = status_type;
        let values_map: HashMap<String, WorkflowValueDTO> = serde_json::from_str(&values)
            .map_err(|e| HttpError::CoreError(CoreError::StringError(e.to_string())))?;
        let dto = WorkflowStatusDataDTO {
            values: values_map,
        };
        let status = build_status(dto)?;
        let workflow = VjudgeWorkflow::global().await;
        let system = workflow.system();
        let input_box: Box<dyn rmjac_core::workflow::Status> = Box::new(status.clone());
        let system_guard = system.read().await;
        let services = <VjudgeWorkflowSystem as WorkflowSystem>::get_reachable_targets(
            &*system_guard,
            &input_box,
        )
        .await;
        let targets = services
            .into_iter()
            .map(|service| {
                let info = service.get_info();
                let service_name = info.name.clone();
                WorkflowTargetInfo {
                    target: service_name.clone(),
                    name: service_name.clone(),
                    description: info.description,
                    allow_description: if info.allow_description.is_empty() {
                        None
                    } else {
                        Some(info.allow_description)
                    },
                    platform: if service.is_end() {
                        None
                    } else {
                        infer_platform(&service_name)
                    },
                    params: build_params(&service_name),
                }
            })
            .collect();
        Ok(targets)
    }

    /// 获取工作流任务状态
    ///
    /// 从数据库读取持久化状态，同时查询内存缓存获取最新工作流状态
    #[handler]
    #[perm(check_login)]
    #[route("/status/{task_id}")]
    #[export("data")]
    async fn get_task_status(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        task_id: String,
    ) -> ResultHandler<WorkflowTaskStatusDTO> {
        let task_node_id = task_id.parse::<i64>().map_err(|e| {
            HttpError::CoreError(CoreError::StringError(format!(
                "Invalid task_id: {}",
                e
            )))
        })?;

        // 从数据库读取任务节点
        let task_node = rmjac_core::graph::node::vjudge_task::VjudgeTaskNode::from_db(
            store.get_db(),
            task_node_id,
        )
        .await
        .map_err(HttpError::CoreError)?;

        // 从缓存中获取最新工作流状态
        let workflow_status = get_task_status_cache(&task_id).map(|(status, _)| status);

        Ok(WorkflowTaskStatusDTO {
            task_id,
            db_status: task_node.public.status,
            log: task_node.public.log,
            created_at: task_node.public.created_at.to_string(),
            updated_at: task_node.public.updated_at.to_string(),
            workflow_status,
        })
    }

    /// 获取可用的工作流服务列表
    ///
    /// 动态查询当前已通过 Socket.IO 注册的工作流服务
    #[handler]
    #[route("/services")]
    #[export("data")]
    async fn get_workflow_services() -> ResultHandler<Vec<WorkflowServiceInfo>> {
        let mut services = vec![];

        let workflow = VjudgeWorkflow::global().await;
        let local_services = workflow.get_local_services().await;
        for service in local_services {
            let info = service.get_info();
            let (mut platform, operation, method) = parse_service_name(&info.name);
            if service.is_end() {
                platform.clear();
            }
            services.push(WorkflowServiceInfo {
                name: info.name.clone(),
                description: info.description,
                allow_description: if info.allow_description.is_empty() {
                    None
                } else {
                    Some(info.allow_description)
                },
                platform,
                operation,
                method,
                available_sockets: 0,
                source: "workflow".to_string(),
                import_require: build_import_require(&info.name),
                export_describe: None,
            });
        }

        let wf_index = workflow.service_index().lock().unwrap().clone();
        let metadata_map = workflow.service_metadata().lock().unwrap().clone();
        for (key, value) in metadata_map {
            if services.iter().any(|s| s.name == key) {
                continue;
            }
            let metadata: WorkflowServiceMetadata = match serde_json::from_value(value) {
                Ok(m) => m,
                Err(_) => continue,
            };
            let (mut platform, operation, method) = parse_service_name(&key);
            if metadata.is_end {
                platform.clear();
            }
            services.push(WorkflowServiceInfo {
                name: key.clone(),
                description: metadata.description.clone(),
                allow_description: if metadata.allow_description.is_empty() {
                    None
                } else {
                    Some(metadata.allow_description.clone())
                },
                platform,
                operation,
                method,
                available_sockets: wf_index.get(&key).map(|v| v.len() as i32).unwrap_or(0),
                source: "workflow".to_string(),
                import_require: Some(metadata.import_require.clone()),
                export_describe: Some(metadata.export_describe.clone()),
            });
        }

        Ok(services)
    }
}
