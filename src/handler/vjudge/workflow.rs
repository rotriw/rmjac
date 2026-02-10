
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

#[generate_handler(route = "/workflow", real_path = "/api/vjudge/workflow")]
pub mod handler {
    use sea_orm::Iden;
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
    #[export("node_id")]
    async fn post_execute_task(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        service_name: &str,
        body: serde_json::Value,
    ) -> ResultHandler<i64> {
        Ok(execute_vjudge_task(store.get_db(), &body, service_name).await?)
    }

    /// 获取可用的工作流服务列表
    ///
    /// 动态查询当前已通过 Socket.IO 注册的工作流服务
    #[handler]
    #[route("/services")]
    #[export("data")]
    async fn get_workflow_services() -> ResultHandler<Vec<WorkflowServiceInfo>> {
        let mut services = vec![];

        let workflow = rmjac_core::workflow::vjudge::workflow::global().await;
        let local_services = workflow.get_all_services().await;
        for service in local_services {
            let info = service.get_info();
            let exports = service.get_export_describe();
            let mut export_describe = "".to_string();
            for e in exports {
                if !export_describe.is_empty() {
                    export_describe += " | ";
                }
                export_describe +=  &e.describe().await;
            }
            services.push(WorkflowServiceInfo {
                name: info.name.clone(),
                description: info.description,
                allow_description: if info.allow_description.is_empty() {
                    None
                } else {
                    Some(info.allow_description)
                },
                source: "workflow".to_string(),
                import_require: service.get_import_require().describe(),
                export_describe,
            });
        }

        Ok(services)
    }
}
