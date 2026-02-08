//! VJudge 账号管理
//!
//! 负责 VJudge 远程账号的创建、验证、同步等操作

use crate::error::CoreError;
use crate::env;
use crate::graph::edge::misc::MiscEdgeRaw;
use crate::graph::edge::user_remote::{UserRemoteEdgeQuery, UserRemoteEdgeRaw};
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::node::user::remote_account::{
    RemoteMode, VjudgeAuth, VjudgeNode, VjudgeNodePrivateRaw, VjudgeNodePublicRaw, VjudgeNodeRaw,
};
use crate::graph::node::vjudge_task::{
    VjudgeTaskNodePrivateRaw, VjudgeTaskNodePublicRaw, VjudgeTaskNodeRaw,
};
use crate::graph::node::{Node, NodeRaw};
use crate::service::cron::init::handle_vjudge_task;
use crate::service::cron::tasks::upload_recent::UploadRecentTaskProps;
use crate::service::perm::provider::{System, SystemPermService};
use crate::utils::encrypt::gen_random_string;
use crate::Result;
use sea_orm::{ColumnTrait, DatabaseConnection};
use workflow::workflow::{NowStatus, TaskStatus};
use crate::workflow::vjudge::VjudgeWorkflow;
use super::error::AddErrorResult;
use super::task::VjudgeTask;
use super::types::VjudgeOperation;

/// VJudge 账号管理
pub struct VjudgeAccount {
    pub node_id: i64,
}

impl VjudgeAccount {
    pub fn new(node_id: i64) -> Self {
        Self { node_id }
    }

    /// 列出用户的所有 VJudge 账号
    pub async fn list(db: &DatabaseConnection, user_id: i64) -> Result<Vec<VjudgeNode>> {
        let ids = UserRemoteEdgeQuery::get_v(user_id, db).await?;
        let mut accounts = vec![];
        for id in ids {
            if let Ok(account) = VjudgeNode::from_db(db, id).await {
                accounts.push(account);
            }
        }
        Ok(accounts)
    }

    /// 获取单个 VJudge 账号
    pub async fn get(db: &DatabaseConnection, node_id: i64) -> Result<VjudgeNode> {
        VjudgeNode::from_db(db, node_id).await
    }

    /// 检查用户是否有管理 VJudge 的权限
    pub fn can_manage(user_id: i64) -> bool {
        let system_node = env::DEFAULT_NODES.lock().unwrap().default_system_node;
        if system_node == -1 {
            log::warn!("System node not found when checking manage vjudge perm");
            return false;
        }
        SystemPermService::verify(user_id, system_node, System::ManageVjudge)
    }

    /// 创建新的 VJudge 账号
    pub async fn create(
        db: &DatabaseConnection,
        user_id: i64,
        iden: String,
        platform: String,
        remote_mode: RemoteMode,
        auth: Option<VjudgeAuth>,
        bypass_check: bool,
        ws_id: Option<String>,
        is_public_account: bool,
    ) -> std::result::Result<VjudgeNode, AddErrorResult> {
        let verified_code = if remote_mode == RemoteMode::OnlyTrust {
            gen_random_string(10)
        } else {
            "".to_string()
        };
        let verified = is_public_account || bypass_check;
        let vjudge_node = VjudgeNodeRaw {
            public: VjudgeNodePublicRaw {
                platform: platform.clone(),
                verified_code,
                verified,
                iden,
                creation_time: chrono::Utc::now().naive_utc(),
                updated_at: chrono::Utc::now().naive_utc(),
                remote_mode: remote_mode.clone(),
            },
            private: VjudgeNodePrivateRaw { auth },
        }
        .save(db)
        .await?;

        UserRemoteEdgeRaw {
            u: user_id,
            v: vjudge_node.node_id,
        }
        .save(db)
        .await?;

        match (&remote_mode, bypass_check, ws_id) {
            (_, true, _) => Ok(vjudge_node),
            (_, _, _) => {
                // TODO: use workflow make task function.
                Ok(vjudge_node)
            }
        }
    }

    /// 验证账号
    pub async fn verify(&self, db: &DatabaseConnection, ws_id: &str) -> bool {
        let vjudge_node = VjudgeNode::from_db(db, self.node_id).await;
        if vjudge_node.is_err() {
            return false;
        }
        let vjudge_node = vjudge_node.unwrap();

        let platform = vjudge_node.public.platform.to_lowercase();
        let method = Self::method(&vjudge_node);
        let task_id = format!("vjudge-verify-{}-{}", self.node_id, chrono::Utc::now().timestamp());

        let workflow = VjudgeWorkflow::global().await;
        let response = workflow
            .dispatch_task(
                &task_id,
                &format!("{}:verify:{}", platform, method),
                &platform,
                "verify",
                &method,
                serde_json::json!({
                    "operation": VjudgeOperation::Verify.as_str(),
                    "vjudge_node": vjudge_node,
                    "platform": platform,
                    "method": method,
                    "ws_id": ws_id,
                }),
                None,
            )
            .await;

        response.success
    }

    /// 设置账号已验证
    pub async fn set_verified(&self, db: &DatabaseConnection) -> Result<()> {
        use crate::db::entity::node::user_remote::Column::Verified;
        VjudgeNode::from_db(db, self.node_id)
            .await?
            .modify(db, Verified, true)
            .await?;
        Ok(())
    }

    /// 同步提交记录
    pub async fn sync(
        &self,
        db: &DatabaseConnection,
        user_id: i64,
        platform: &str,
        problem_id: &str,
        ws_id: Option<String>,
    ) -> Result<()> {
        let vjudge_node = VjudgeNode::from_db(db, self.node_id).await?;
        use crate::db::entity::edge::user_remote::Column::VNodeId;
        let user_remote_edges = UserRemoteEdgeQuery::get_v_filter_extend_content(
            user_id,
            vec![VNodeId.eq(self.node_id)],
            db,
            None,
            None,
        )
        .await?;
        if user_remote_edges.is_empty() {
            return Err(CoreError::VjudgeError(
                "User is not related to vjudge account.".to_string(),
            ));
        }

        let platform_lower = platform.to_lowercase();
        let method = Self::method(&vjudge_node);
        let task_id = format!(
            "vjudge-sync-{}-{}",
            self.node_id,
            chrono::Utc::now().timestamp()
        );

        let workflow = VjudgeWorkflow::global().await;
        let response = workflow
            .dispatch_task(
                &task_id,
                &format!("{}:syncList:{}", platform_lower, method),
                &platform_lower,
                "syncList",
                &method,
                serde_json::json!({
                    "operation": VjudgeOperation::SyncList.as_str(),
                    "vjudge_node": vjudge_node,
                    "user_id": user_id,
                    "platform": platform,
                    "problem_iden": problem_id,
                    "ws_id": ws_id,
                }),
                None,
            )
            .await;
        if !response.success {
            return Err(CoreError::VjudgeError(
                "Edge server Error! Failed to sync submission.".to_string(),
            ));
        }
        Ok(())
    }

    /// 检查账号是否属于指定用户
    pub async fn owned_by(&self, db: &DatabaseConnection, user_id: i64) -> Result<bool> {
        use crate::db::entity::edge::user_remote::Column as UserRemoteColumn;
        use sea_orm::sea_query::SimpleExpr;
        let edges = UserRemoteEdgeQuery::get_v_filter_extend::<SimpleExpr>(
            user_id,
            vec![UserRemoteColumn::VNodeId.eq(self.node_id)],
            db,
            None,
            None,
        )
        .await?;
        Ok(!edges.is_empty())
    }

    /// 删除账号
    pub async fn rm(&self, db: &DatabaseConnection) -> Result<()> {
        let node = VjudgeNode::from_db(db, self.node_id).await?;
        node.delete(db, self.node_id).await
    }

    /// 设置认证信息
    pub async fn set_auth(&self, db: &DatabaseConnection, auth: Option<VjudgeAuth>) -> Result<()> {
        let node = VjudgeNode::from_db(db, self.node_id).await?;
        if let Some(auth) = auth {
            use crate::db::entity::node::user_remote::Column;
            let auth_str = serde_json::to_string(&auth)
                .map_err(|e| CoreError::StringError(format!("Failed to serialize auth: {}", e)))?;
            let _ = node.modify(db, Column::Auth, auth_str).await?;
        }
        Ok(())
    }

    /// 添加同步任务
    pub async fn add_task(
        &self,
        db: &DatabaseConnection,
        user_id: i64,
        range: String,
        ws_id: Option<String>,
    ) -> Result<VjudgeTask> {
        let task = VjudgeTaskNodeRaw {
            public: VjudgeTaskNodePublicRaw {
                status: "pending".to_string(),
                log: format!("Task created. Range: {}", range),
                service_name: "".to_string(),
                workflow_snapshot: None,
            },
            private: VjudgeTaskNodePrivateRaw {},
        }
        .save(db)
        .await?;

        MiscEdgeRaw {
            u: self.node_id,
            v: task.node_id,
            misc_type: "vjudge_task".to_string(),
        }
        .save(db)
        .await?;

        let vjudge_node = VjudgeNode::from_db(db, self.node_id).await?;

        let operation = if range == "one" {
            VjudgeOperation::SyncOne
        } else {
            VjudgeOperation::SyncList
        };

        let platform = vjudge_node.public.platform.to_lowercase();
        let method = Self::method(&vjudge_node);
        let operation_str = operation.as_str();
        let service_key = format!("{}:{}:{}", platform, operation_str, method);
        let task_id = task.node_id.to_string();

        let workflow = VjudgeWorkflow::global().await;
        let response = workflow
            .dispatch_task(
                &task_id,
                &service_key,
                &platform,
                operation_str,
                &method,
                serde_json::json!({
                    "operation": operation_str,
                    "vjudge_node": vjudge_node,
                    "platform": platform,
                    "method": method,
                    "user_id": user_id,
                    "range": range,
                    "ws_id": ws_id,
                    "task_id": task.node_id,
                }),
                None,
            )
            .await;
        let success = response.success;
        let new_status = if success {
            "dispatched"
        } else {
            "failed_to_dispatch"
        };
        let new_log = if success {
            "Task dispatched to edge server."
        } else {
            "Failed to dispatch to edge server."
        };

        use crate::db::entity::node::vjudge_task::Column;
        let task_node = task
            .modify(db, Column::Status, new_status.to_string())
            .await?;
        let _ = task_node
            .modify(
                db,
                Column::Log,
                format!("{}\n{}", task_node.public.log, new_log),
            )
            .await?;

        Ok(VjudgeTask::new(task_node.node_id))
    }

    /// 获取远程模式对应的方法字符串
    pub fn method(vjudge_node: &VjudgeNode) -> String {
        vjudge_node.public.remote_mode.clone().into()
    }

    /// 设置定时任务
    pub async fn set_cron_task(
        db: &DatabaseConnection,
        vjudge_node: &VjudgeNode,
        user_id: i64,
    ) -> Result<()> {
        let cron = "0 * * * * * *";
        let data = UploadRecentTaskProps {
            vjudge_node: vjudge_node.clone(),
            range: "1:50".to_string(),
            user_id,
        };
        let new_task = VjudgeTaskNodeRaw {
            public: VjudgeTaskNodePublicRaw {
                status: "cron_online".to_string(),
                log: format!(
                    "cron:{}\n[TASK_INFO]\nupload_recent\n{}\n[TASK_DONE]",
                    cron,
                    serde_json::to_string(&data)?
                ),
                service_name: "".to_string(),
                workflow_snapshot: None,
            },
            private: VjudgeTaskNodePrivateRaw {},
        }
        .save(db)
        .await?;

        MiscEdgeRaw {
            u: vjudge_node.node_id,
            v: new_task.node_id,
            misc_type: "vjudge_task".to_string(),
        }
        .save(db)
        .await?;

        handle_vjudge_task(new_task).await;

        Ok(())
    }
}
