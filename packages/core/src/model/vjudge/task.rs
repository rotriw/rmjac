//! VJudge 任务管理
//!
//! 负责 VJudge 同步任务的创建、查询、日志更新等操作

use deno_core::v8::Data;
use crate::graph::edge::misc::MiscEdgeQuery;
use crate::graph::edge::user_remote::UserRemoteEdgeQuery;
use crate::graph::edge::EdgeQuery;
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::graph::node::vjudge_task::{VjudgeTaskNode, VjudgeTaskNodePrivate, VjudgeTaskNodePrivateRaw, VjudgeTaskNodePublicRaw, VjudgeTaskNodeRaw};
use crate::graph::node::{Node, NodeRaw};
use crate::Result;
use sea_orm::{ColumnTrait, DatabaseConnection};
use serde::{Deserialize, Serialize};

/// 任务 + 关联账号信息（用于工单列表展示）
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeTaskWithAccount {
    pub task: VjudgeTaskNode,
    pub account_node_id: i64,
    pub platform: String,
    pub handle: String,
}

/// 分页查询结果
#[derive(Debug, Clone, Serialize, Deserialize, ts_rs::TS)]
#[ts(export)]
pub struct VjudgeTaskListResult {
    pub data: Vec<VjudgeTaskWithAccount>,
    pub total: u64,
}

/// VJudge 同步任务
pub struct VjudgeTask {
    pub node_id: i64,
}

impl VjudgeTask {
    pub async fn create(db: &DatabaseConnection, service_name: &str) -> Result<VjudgeTaskNode> {
        VjudgeTaskNodeRaw {
            public: VjudgeTaskNodePublicRaw {
                service_name: service_name.to_string(),
                status: "pending".to_string(),
                log: "".to_string(),
                workflow_snapshot: None,
            },
            private: VjudgeTaskNodePrivateRaw {}
        }.save(&db).await
    }

    pub fn new(node_id: i64) -> Self {
        Self { node_id }
    }

    /// 列出账号关联的所有任务
    pub async fn list(db: &DatabaseConnection, vjudge_node_id: i64) -> Result<Vec<VjudgeTaskNode>> {
        use crate::db::entity::edge::misc::Column as MiscColumn;
        use sea_orm::sea_query::SimpleExpr;
        let tasks = MiscEdgeQuery::get_v_filter_extend::<SimpleExpr>(
            vjudge_node_id,
            vec![MiscColumn::MiscType.eq("vjudge_task").or(MiscColumn::MiscType.eq("workflow_task"))],
            db,
            None,
            None,
        )
        .await?;
        let mut task_nodes = vec![];
        for (node_id, _edge_id) in tasks {
            if let Ok(node) = VjudgeTaskNode::from_db(db, node_id).await {
                task_nodes.push(node);
            }
        }
        Ok(task_nodes)
    }

    /// 按用户维度列出所有任务（支持状态筛选和分页）
    ///
    /// `status_filter`: "open" = pending/dispatching/running/cron_online,
    ///                  "closed" = completed/failed/cron_error,
    ///                  None = 全部
    pub async fn list_by_user(
        db: &DatabaseConnection,
        user_id: i64,
        status_filter: Option<&str>,
        page: u64,
        limit: u64,
    ) -> Result<VjudgeTaskListResult> {
        use crate::db::entity::edge::misc::Column as MiscColumn;
        use sea_orm::sea_query::SimpleExpr;

        // 1. 获取用户所有 VjudgeNode IDs
        let vjudge_ids = UserRemoteEdgeQuery::get_v(user_id, db).await?;
        if vjudge_ids.is_empty() {
            return Ok(VjudgeTaskListResult {
                data: vec![],
                total: 0,
            });
        }

        // 2. 预加载所有 VjudgeNode 信息（用于填充 platform/handle）
        let mut vjudge_map = std::collections::HashMap::new();
        for &vjudge_id in &vjudge_ids {
            if let Ok(node) = VjudgeNode::from_db(db, vjudge_id).await {
                vjudge_map.insert(vjudge_id, node);
            }
        }

        // 3. 收集所有任务（带关联的 vjudge_node_id）
        let mut all_tasks: Vec<VjudgeTaskWithAccount> = vec![];
        for &vjudge_id in &vjudge_ids {
            let tasks = MiscEdgeQuery::get_v_filter_extend::<SimpleExpr>(
                vjudge_id,
                vec![MiscColumn::MiscType.eq("vjudge_task").or(MiscColumn::MiscType.eq("workflow_task"))],
                db,
                None,
                None,
            )
            .await?;

            for (task_node_id, _edge_id) in tasks {
                if let Ok(task_node) = VjudgeTaskNode::from_db(db, task_node_id).await {
                    let (platform, handle) = vjudge_map
                        .get(&vjudge_id)
                        .map(|n| (n.public.platform.clone(), n.public.iden.clone()))
                        .unwrap_or_else(|| ("unknown".to_string(), "unknown".to_string()));

                    all_tasks.push(VjudgeTaskWithAccount {
                        task: task_node,
                        account_node_id: vjudge_id,
                        platform,
                        handle,
                    });
                }
            }
        }

        // 4. 状态筛选
        if let Some(filter) = status_filter {
            let open_statuses = ["pending", "dispatching", "running", "cron_online", "waiting"];
            let closed_statuses = ["completed", "failed", "cron_error"];

            all_tasks.retain(|t| match filter {
                "open" => open_statuses.contains(&t.task.public.status.as_str()),
                "closed" => closed_statuses.contains(&t.task.public.status.as_str()),
                _ => true,
            });
        }

        // 5. 按更新时间降序排列（最新的在前）
        all_tasks.sort_by(|a, b| b.task.public.updated_at.cmp(&a.task.public.updated_at));

        // 6. 分页
        let total = all_tasks.len() as u64;
        let offset = ((page.saturating_sub(1)) * limit) as usize;
        let data: Vec<VjudgeTaskWithAccount> = all_tasks
            .into_iter()
            .skip(offset)
            .take(limit as usize)
            .collect();

        Ok(VjudgeTaskListResult { data, total })
    }

    /// 更新任务日志
    pub async fn update_log(db: &DatabaseConnection, task_id: i64, log: String) -> Result<()> {
        use crate::db::entity::node::vjudge_task::Column;
        let task_node = VjudgeTaskNode::from_db(db, task_id).await?;
        let now_time = now_time!();
        let _ = task_node
            .modify(
                db,
                Column::Log,
                format!(
                    "{}\nTIME(UTC): {}, {}",
                    task_node.public.log,
                    now_time.to_string(),
                    log
                ),
            )
            .await?;
        Ok(())
    }

    /// 更新任务状态
    pub async fn update_status(db: &DatabaseConnection, task_id: i64, status: &str) -> Result<()> {
        use crate::db::entity::node::vjudge_task::Column;
        let task_node = VjudgeTaskNode::from_db(db, task_id).await?;
        let _ = task_node
            .modify(db, Column::Status, status.to_string())
            .await?;
        let _ = task_node
            .modify(db, Column::UpdatedAt, chrono::Utc::now().naive_utc())
            .await?;
        Ok(())
    }

    /// 更新工作流快照（持久化最终状态）
    pub async fn update_workflow_snapshot(
        db: &DatabaseConnection,
        task_id: i64,
        snapshot: String,
    ) -> Result<()> {
        use crate::db::entity::node::vjudge_task::Column;
        let task_node = VjudgeTaskNode::from_db(db, task_id).await?;
        let _ = task_node
            .modify(db, Column::WorkflowSnapshot, Some(snapshot))
            .await?;
        let _ = task_node
            .modify(db, Column::UpdatedAt, chrono::Utc::now().naive_utc())
            .await?;
        Ok(())
    }

    /// 获取任务节点
    pub async fn get_node(&self, db: &DatabaseConnection) -> Result<VjudgeTaskNode> {
        VjudgeTaskNode::from_db(db, self.node_id).await
    }
}
