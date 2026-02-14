
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

    /// 校验任务归属（当前用户必须拥有该任务关联的 VJudge 账号）
    async fn check_task_owner(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        task_id: i64,
    ) -> ResultHandler<()> {
        use crate::handler::HttpError;
        use rmjac_core::error::CoreError;
        use rmjac_core::graph::edge::misc::MiscEdgeQuery;
        use rmjac_core::graph::edge::user_remote::UserRemoteEdgeQuery;
        use rmjac_core::graph::edge::EdgeQuery;
        use rmjac_core::db::entity::edge::misc::Column as MiscColumn;
        use sea_orm::sea_query::SimpleExpr;
        use sea_orm::ColumnTrait;

        let vjudge_ids = UserRemoteEdgeQuery::get_v(user_context.user_id, store.get_db()).await?;
        if vjudge_ids.is_empty() {
            return Err(HttpError::CoreError(CoreError::StringError(
                "Permission denied".to_string(),
            )));
        }

        let owner_edges = MiscEdgeQuery::get_u_filter_extend::<SimpleExpr>(
            task_id,
            vec![
                MiscColumn::MiscType
                    .eq("vjudge_task")
                    .or(MiscColumn::MiscType.eq("workflow_task")),
            ],
            store.get_db(),
            None,
            None,
        )
        .await?;

        let owners: Vec<i64> = owner_edges
            .into_iter()
            .map(|(node_id, _edge_id)| node_id)
            .collect();

        if owners.iter().any(|node_id| vjudge_ids.contains(node_id)) {
            Ok(())
        } else {
            Err(HttpError::CoreError(CoreError::StringError(
                "Permission denied".to_string(),
            )))
        }
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

    /// 获取工作流任务状态
    ///
    /// 返回 VJudge 任务的数据库状态与持久化的 workflow 快照。
    /// 若快照为空，则仅返回基础信息，供前端用 log 解析执行过程。
    #[handler]
    #[perm(check_login)]
    #[route("/status/{task_id}")]
    #[export("data")]
    async fn get_task_status(
        store: &mut impl ModelStore,
        user_context: UserAuthCotext,
        task_id: i64,
    ) -> ResultHandler<WorkflowTaskStatusDTO> {
        // check_task_owner(store, user_context, task_id).await?;
        let task_node = rmjac_core::graph::node::vjudge_task::VjudgeTaskNode::from_db(
            store.get_db(),
            task_id,
        )
        .await?;

        let workflow_status = task_node
            .public
            .workflow_snapshot
            .as_ref()
            .and_then(|raw| serde_json::from_str::<serde_json::Value>(raw).ok());

        Ok(WorkflowTaskStatusDTO {
            task_id: task_node.node_id.to_string(),
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
    async fn get_end_workflow_services(is_end: Option<bool>) -> ResultHandler<Vec<WorkflowServiceInfo>> {
        let mut services = vec![];
        let must_end = is_end.unwrap_or(true);

        let workflow = rmjac_core::workflow::vjudge::workflow::global().await;
        let local_services = workflow.get_all_services().await;
        for service in local_services {
            if must_end && !service.is_end() {
                continue;
            }
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
