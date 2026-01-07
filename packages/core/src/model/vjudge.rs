use sea_orm::{ColumnTrait, DatabaseConnection};
use crate::declare::UniversalSubmission;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::edge::user_remote::{UserRemoteEdgeQuery, UserRemoteEdgeRaw};
use crate::graph::node::user::remote_account::{RemoteMode, VjudgeAuth, VjudgeNode, VjudgeNodePrivateRaw, VjudgeNodePublicRaw, VjudgeNodeRaw};
use crate::error::CoreError;
use crate::graph::node::{Node, NodeRaw};
use crate::model::problem::{CreateProblemProps, ProblemRepository, ProblemFactory, ProblemStatementProp};
use crate::graph::node::problem::ProblemNode;
use crate::graph::node::problem::tag::{ProblemTagNode, ProblemTagNodeRaw, ProblemTagNodePublicRaw, ProblemTagNodePrivateRaw};
use crate::service::iden::get_node_ids_from_iden;
use crate::env;
use crate::db::entity::node::problem_statement::ContentType;
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tokio::sync::Mutex as AsyncMutex;
use crate::utils::get_redis_connection;
use crate::graph::node::vjudge_task::{VjudgeTaskNode, VjudgeTaskNodeRaw, VjudgeTaskNodePublicRaw, VjudgeTaskNodePrivateRaw};
use crate::graph::edge::misc::MiscEdgeRaw;
use serde_json::json;
use crate::graph::edge::perm_system::SystemPerm;
use crate::model::perm::check_system_perm;
use enum_const::EnumConst;
use crate::utils::encrypt::gen_random_string;
use crate::service::socket::service::add_task;
use crate::model::record::{Record, RecordRepository, RecordNewProp, SubtaskUserRecord};
use crate::graph::node::record::RecordStatus;
use crate::Result;
use crate::model::ModelStore;

lazy_static::lazy_static! {
    static ref PROBLEM_UPDATE_LOCKS: Mutex<HashMap<String, Arc<AsyncMutex<()>>>> = Mutex::new(HashMap::new());
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
#[derive(Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Codeforces,
    Atcoder,
}

pub enum AddErrorResult {
    CoreError(CoreError),
    Warning(String, VjudgeNode),
}

impl From<CoreError> for AddErrorResult {
    fn from(err: CoreError) -> Self {
        AddErrorResult::CoreError(err)
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct SubmissionItem {
    pub remote_id: i64,
    pub remote_platform: String,
    pub remote_problem_id: String,
    pub language: String,
    pub code: String,
    pub status: String,
    pub message: String,
    pub score: i64,
    pub submit_time: String,
    pub url: String,
    pub passed: Vec<(String, String, i64, i64, i64)>, // (testcase_id, status, score, time, memory)
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserSubmissionProp {
    pub user_id: i64,
    pub ws_id: Option<String>,
    pub submissions: Vec<SubmissionItem>,
    pub task_id: Option<i64>,
}

pub struct VjudgeAccount {
    pub node_id: i64,
}

impl VjudgeAccount {
    pub fn new(node_id: i64) -> Self {
        Self { node_id }
    }

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

    pub async fn get(db: &DatabaseConnection, node_id: i64) -> Result<VjudgeNode> {
        VjudgeNode::from_db(db, node_id).await
    }

    pub fn can_manage(user_id: i64) -> bool {
        let system_node = env::DEFAULT_NODES.lock().unwrap().default_system_node;
        if system_node == -1 {
            log::warn!("System node not found when checking manage vjudge perm");
            return false;
        }
        let perm_val = SystemPerm::ManageVjudge.get_const_isize().unwrap() as i64;
        let res = check_system_perm(user_id, system_node, perm_val);
        res == 1
    }

    pub async fn create(
        db: &DatabaseConnection,
        user_id: i64,
        iden: String,
        platform: String,
        remote_mode: RemoteMode,
        auth: Option<VjudgeAuth>,
        bypass_check: bool,
        ws_id: Option<String>,
    ) -> Result<VjudgeNode, AddErrorResult> {
        let verified_code = if remote_mode == RemoteMode::PublicAccount {
            "".to_string()
        } else {
            gen_random_string(10)
        };
        let verified = remote_mode == RemoteMode::PublicAccount || bypass_check;
        match (&remote_mode, &auth) {
            (&RemoteMode::PublicAccount, &None) | (&RemoteMode::SyncCode, &None) => {
                return Err(CoreError::VjudgeError("Guard: You must ensure auth is provided in your mode.".to_string()).into());
            }
            _ => {}
        };
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
            private: VjudgeNodePrivateRaw {
                auth,
            },
        }.save(db).await?;

        UserRemoteEdgeRaw {
            u: user_id,
            v: vjudge_node.node_id,
        }.save(db).await?;

        match (&remote_mode, bypass_check, ws_id) {
            (&RemoteMode::PublicAccount, _, _) => Ok(vjudge_node),
            (_, true, _) => Ok(vjudge_node),
            (_, _, Some(ws_id)) => {
                let payload = serde_json::json!({
                   "operation": "verify",
                    "vjudge_node": vjudge_node,
                    "ws_id": ws_id,
                    "platform": vjudge_node.public.platform.to_lowercase(),
                    "method": Self::method(&vjudge_node)
                });
                let success = add_task(&payload).await;
                if !success {
                    return Err(AddErrorResult::Warning("Warning: No edge server online.".to_string(), vjudge_node));
                }
                Ok(vjudge_node)
            }
            (_, _, None) => {
                log::warn!("No websocket id provided when verifying vjudge account(no public account, no websocket listener).");
                let payload = serde_json::json!({
                    "operation": "verify",
                    "vjudge_node": vjudge_node,
                    "platform": vjudge_node.public.platform.clone().to_lowercase(),
                    "method": Self::method(&vjudge_node)
                });
                let success = add_task(&payload).await;
                if !success {
                    return Err(AddErrorResult::Warning("Warning: No edge server online.".to_string(), vjudge_node));
                }
                Ok(vjudge_node)
            }
        }
    }

    pub async fn verify(
        &self,
        db: &DatabaseConnection,
        ws_id: &str,
    ) -> bool {
        let vjudge_node = VjudgeNode::from_db(db, self.node_id).await;
        if vjudge_node.is_err() {
            return false;
        }
        let vjudge_node = vjudge_node.unwrap();

        let payload = serde_json::json!({
            "operation": "verify",
            "vjudge_node": vjudge_node,
            "platform": vjudge_node.public.platform.to_lowercase(),
            "method": Self::method(&vjudge_node),
            "ws_id": ws_id
        });

        add_task(&payload).await
    }

    pub async fn set_verified(
        &self,
        db: &DatabaseConnection,
    ) -> Result<()> {
        use crate::db::entity::node::user_remote::Column::Verified;
        VjudgeNode::from_db(db, self.node_id).await?.
            modify(db, Verified, true)
            .await?;
        Ok(())
    }

    pub async fn sync(
        &self,
        db: &DatabaseConnection,
        user_id: i64,
        platform: String,
        problem_id: i64,
        ws_id: Option<String>,
    ) -> Result<()> {
        let vjudge_node = VjudgeNode::from_db(db, self.node_id).await?;
        if vjudge_node.public.remote_mode == RemoteMode::PublicAccount {
            return Err(CoreError::VjudgeError("Public account cannot sync submission.".to_string()));
        }
        if vjudge_node.public.verified == false {
            return Err(CoreError::VjudgeError("Vjudge account is not verified.".to_string()));
        }
        use crate::db::entity::edge::user_remote::Column::VNodeId;
        let user_remote_edges = UserRemoteEdgeQuery::get_v_filter_extend_content(user_id, vec![
            VNodeId.eq(self.node_id),
        ], db, None, None).await?;
        if user_remote_edges.len() == 0 {
            return Err(CoreError::VjudgeError("User is not related to vjudge account.".to_string()));
        }

        let payload = serde_json::json!({
            "operation": "sync_user_remote_submission",
            "vjudge_node": vjudge_node,
            "user_id": user_id,
            "platform": platform,
            "problem_iden": problem_id,
            "ws_id": ws_id
        });
        let success = add_task(&payload).await;
        if !success {
            return Err(CoreError::VjudgeError("Edge server Error! Failed to sync submission.".to_string()));
        }
        Ok(())
    }

    pub async fn owned_by(
        &self,
        db: &DatabaseConnection,
        user_id: i64,
    ) -> Result<bool> {
        use crate::db::entity::edge::user_remote::Column as UserRemoteColumn;
        use sea_orm::sea_query::SimpleExpr;
        let edges = UserRemoteEdgeQuery::get_v_filter_extend::<SimpleExpr>(
            user_id,
            vec![UserRemoteColumn::VNodeId.eq(self.node_id)],
            db,
            None,
            None
        ).await?;
        Ok(!edges.is_empty())
    }

    pub async fn rm(&self, db: &DatabaseConnection) -> Result<()> {
        let node = VjudgeNode::from_db(db, self.node_id).await?;
        node.delete(db, self.node_id).await
    }

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

    pub async fn add_task(
        &self,
        db: &DatabaseConnection,
        user_id: i64,
        range: String,
        ws_id: Option<String>
    ) -> Result<VjudgeTask> {
        let task = VjudgeTaskNodeRaw {
            public: VjudgeTaskNodePublicRaw {
                status: "pending".to_string(),
                log: format!("Task created. Range: {}", range),
            },
            private: VjudgeTaskNodePrivateRaw {},
        }.save(db).await?;

        MiscEdgeRaw {
            u: self.node_id,
            v: task.node_id,
            misc_type: "vjudge_task".to_string(),
        }.save(db).await?;

        let vjudge_node = VjudgeNode::from_db(db, self.node_id).await?;
        
        let operation = if range == "one" {
            "syncOne"
        } else {
            "syncList"
        };

        let payload = serde_json::json!({
            "operation": operation,
            "vjudge_node": vjudge_node,
            "platform": vjudge_node.public.platform.to_lowercase(),
            "method": Self::method(&vjudge_node),
            "user_id": user_id,
            "range": range,
            "ws_id": ws_id,
            "task_id": task.node_id
        });
        let success = add_task(&payload).await;
        let new_status = if success { "dispatched" } else { "failed_to_dispatch" };
        let new_log = if success { "Task dispatched to edge server." } else { "Failed to dispatch to edge server." };
        
        use crate::db::entity::node::vjudge_task::Column;
        let task_node = task.modify(db, Column::Status, new_status.to_string()).await?;
        let _ = task_node.modify(db, Column::Log, format!("{}\n{}", task_node.public.log, new_log)).await?;
        
        Ok(VjudgeTask::new(task_node.node_id))
    }

    pub fn method(vjudge_node: &VjudgeNode) -> String {
        match (vjudge_node.public.remote_mode.clone(), vjudge_node.private.auth.clone(), vjudge_node.public.platform.to_lowercase().as_str()) {
            (RemoteMode::PublicAccount, _, _) => "public_account".to_string(),
            (RemoteMode::OnlySync, Some(VjudgeAuth::Token(_)), "codeforces") => "apikey".to_string(),
            (RemoteMode::SyncCode, Some(VjudgeAuth::Token(_)), "codeforces") => "token".to_string(),
            (_, Some(VjudgeAuth::Password(_)), "codeforces") => "password".to_string(),
            (RemoteMode::OnlySync, None, _) => "code".to_string(),
            (RemoteMode::OnlySync, Some(VjudgeAuth::Token(_)), _) => "apikey".to_string(),
            (RemoteMode::SyncCode, Some(VjudgeAuth::Token(_)), _) => "token".to_string(),
            (RemoteMode::SyncCode, Some(VjudgeAuth::Password(_)), _) => "password".to_string(),
            _ => "unknown".to_string(),
        }
    }
}

pub struct VjudgeTask {
    pub node_id: i64,
}

impl VjudgeTask {
    pub fn new(node_id: i64) -> Self {
        Self { node_id }
    }

    pub async fn list(
        db: &DatabaseConnection,
        vjudge_node_id: i64,
    ) -> Result<Vec<VjudgeTaskNode>> {
        use crate::graph::edge::misc::MiscEdgeQuery;
        use crate::db::entity::edge::misc::Column as MiscColumn;
        use sea_orm::sea_query::SimpleExpr;
        let tasks = MiscEdgeQuery::get_v_filter_extend::<SimpleExpr>(
            vjudge_node_id,
            vec![MiscColumn::MiscType.eq("vjudge_task")],
            db,
            None, 
            None
        ).await?;
        let mut task_nodes = vec![];
        for (node_id, _edge_id) in tasks {
            if let Ok(node) = VjudgeTaskNode::from_db(db, node_id).await {
                task_nodes.push(node);
            }
        }
        Ok(task_nodes)
    }
}

pub struct VjudgeService;

impl VjudgeService {
    pub async fn on_sync(
        store: &mut impl ModelStore,
        user_id: i64,
        platform: String,
        submissions: Vec<UniversalSubmission>,
    ) -> Vec<(UniversalSubmission, CoreError)> {
        let db = store.get_db().clone();
        let mut failed_list = vec![];
        for submission in submissions {
            let submission = submission.clone();
            let problem_id = ProblemRepository::resolve(store, &submission.problem_iden).await;
            if let Ok((_, statement_node)) = problem_id {
                let result = Record::create(
                    &db,
                    RecordNewProp {
                        platform: platform.clone(),
                        code: submission.code.clone().unwrap_or("[archived]".to_string()),
                        code_language: submission.language.clone(),
                        url: submission.url.clone(),
                        statement_node_id: statement_node,
                        public_status: false,
                    },
                    user_id,
                    submission.status,
                    submission.score,
                    submission.submit_time
                ).await;
                if let Err(err) = result {
                    failed_list.push((submission, err));
                }
            }
        }
        failed_list
    }

    pub async fn import_problem(
        store: &mut impl ModelStore,
        problem: &CreateProblemProps,
    ) -> Result<()> {
        let db = store.get_db().clone();
        let redis = store.get_redis();

        // Check if problem exists
        let iden_str = format!("problem/{}", problem.problem_iden);
        let node_ids = get_node_ids_from_iden(&db, redis, &iden_str).await;
        
        let mut p_node_id = -1;
        if let Ok(ids) = node_ids {
            for id in ids {
                let n_type = crate::graph::action::get_node_type(&db, id).await.unwrap_or("".to_string());
                if n_type == "problem" {
                    p_node_id = id;
                    break;
                }
            }
        }

        if p_node_id != -1 {
            Self::update_existing_problem(store, p_node_id, problem).await
        } else {
            let _problem = ProblemFactory::create_with_user(store, problem, true).await?;
            Ok(())
        }
    }

    async fn update_existing_problem(store: &mut impl ModelStore, p_node_id: i64, problem: &CreateProblemProps) -> Result<()> {
        let db = store.get_db().clone();
        let redis = store.get_redis();
        
        log::info!("Updating existing problem: {} (Node ID: {})", problem.problem_name, p_node_id);
        
        // 1. Update Problem Node Name
        let p_node = ProblemNode::from_db(&db, p_node_id).await;
        if let Ok(node) = p_node {
            use crate::db::entity::node::problem::Column::Name;
            let _ = node.modify(&db, Name, problem.problem_name.clone()).await;
        }

        // 2. Delete existing connections (statements, tags)
        let mut store_temp = (&db, &mut *redis);
        ProblemRepository::purge(&mut store_temp, p_node_id).await?;
        
        // 3. Re-add statements
        for statement in &problem.problem_statement {
            let schema = ProblemFactory::generate_statement_schema(statement.clone());
            let mut store_temp = (&db, &mut *redis);
            ProblemFactory::add_statement(&mut store_temp, p_node_id, schema).await?;
        }
        
        // 4. Re-add tags
        for i in &problem.tags {
            use crate::db::entity::node::problem_tag::Column as ProblemTagColumn;
            let id = ProblemTagNode::from_db_filter(&db, ProblemTagColumn::TagName.eq(i)).await;
            let tag_node_id = if let Ok(nodes) = id {
                if nodes.is_empty() {
                    let new_tag = ProblemTagNodeRaw {
                        public: ProblemTagNodePublicRaw {
                            tag_name: i.clone(),
                            tag_description: "".to_string(),
                        },
                        private: ProblemTagNodePrivateRaw {},
                    }.save(&db).await;
                    match new_tag {
                        Ok(t) => t.node_id,
                        Err(_) => continue,
                    }
                } else {
                    nodes[0].node_id
                }
            } else {
                continue;
            };
            use crate::graph::edge::problem_tag::ProblemTagEdgeRaw;
            let _ = ProblemTagEdgeRaw {
                u: p_node_id,
                v: tag_node_id,
            }.save(&db).await;
        }
        Ok(())
    }

    pub async fn update_batch(
        db: &DatabaseConnection,
        data: UserSubmissionProp,
    ) -> Result<()> {
        // Check for task_id and update status if present
        if let Some(task_id) = data.task_id {
            if let Ok(task_node) = VjudgeTaskNode::from_db(db, task_id).await {
                use crate::db::entity::node::vjudge_task::Column;
                let log_msg = format!("Received batch of {} submissions.", data.submissions.len());
                let _ = task_node.modify(db, Column::Log, format!("{}\n{}", task_node.public.log, log_msg)).await;
                let _ = task_node.modify(db, Column::UpdatedAt, chrono::Utc::now().naive_utc()).await;
            } else {
                log::warn!("Received update for non-existent task_id: {}", task_id);
            }
        }

        let mut handles = vec![];
        let ws_id = data.ws_id;
        let ws_notify = if let Some(id) = ws_id {
            Some(env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap().get(&id).cloned()).unwrap_or(None)
        } else {
            log::debug!("No websocket id provided for submission update.");
            None
        };
        if let Some(notify_ref) = &ws_notify {
            let _ = notify_ref.emit("submission_update", &serde_json::json!({
                "s": 0,
                "n": data.submissions.len()
            }));
        } else {
            log::debug!("No notify_ref available to send initial submission update.");
        }
        let mut log_data = format!("Processing {} submissions for user {}.\n", data.submissions.len(), data.user_id);
        for submission in data.submissions {
            let db = db.clone();
            let user_id = data.user_id;
            let notify_ref = ws_notify.clone();
            handles.push(tokio::spawn(async move {
                if let Err(e) = Self::process_one(db, user_id, submission.clone()).await {
                    log::warn!("Error processing submission: {:?}", e);
                    if let Some(notify_ref) = notify_ref {
                        let _ = notify_ref.emit("submission_update", &serde_json::json!({
                            "s": 1,
                            "m": format!("Failed to process submission: {}", &submission.remote_id)
                        }));
                    } else {
                        log::debug!("No notify_ref available to send error message for submission: {}", &submission.remote_id);
                    }
                    return format!("Failed to process submission {}: {:?}\n", &submission.remote_id, e);
                } else if let Some(notify_ref) = notify_ref {
                    let _ = notify_ref.emit("submission_update", &serde_json::json!({
                        "s": 2,
                        "m": format!("Successfully add submission: {}", &submission.remote_id)
                    }));
                    return format!("Successfully processed submission {}.\n", &submission.remote_id);
                }
                format!("Successfully processed submission {}.\n", &submission.remote_id)
            }));
        }

        for handle in handles {
            let data = handle.await;
            log_data += &data.unwrap_or("Failed to join submission processing task.\n".to_string());
        }
        // update task log if present
        if let Some(task_id) = data.task_id {
            if let Ok(task_node) = VjudgeTaskNode::from_db(db, task_id).await {
                use crate::db::entity::node::vjudge_task::Column;
                let _ = task_node.modify(db, Column::Log, log_data).await;
                let _ = task_node.modify(db, Column::Status, "completed".to_string()).await;
                let _ = task_node.modify(db, Column::UpdatedAt, chrono::Utc::now().naive_utc()).await;
            }
        }
        Ok(())
    }

    async fn process_one(
        db: DatabaseConnection,
        user_id: i64,
        submission: SubmissionItem,
    ) -> Result<()> {
        let remote_problem_id = submission.remote_problem_id.trim().to_string();
        let lock = {
            let mut map = PROBLEM_UPDATE_LOCKS.lock().unwrap();
            map.entry(remote_problem_id.clone())
                .or_insert_with(|| Arc::new(AsyncMutex::new(())))
                .clone()
        };
        //保证每时刻对于同一道题而言，不能存在多个并发，可能导致创建多道相同的题目。
        let _guard = lock.lock().await;
        
        let (problem_exists, problem_node_id, mut statement_node_id) = Self::resolve_problem(&db, &remote_problem_id).await;

        if !problem_exists {
            // 如果题目不存在，就以 System 用户的名义创建一个占位题目
            if let Ok((pid, sid)) = Self::create_placeholder_problem(&db, &remote_problem_id, &submission.remote_problem_id).await {
                // problem_node_id = pid; // unused
                statement_node_id = sid;
            } else {
                     return Ok(())
            }
        }
        
        if statement_node_id == -1 {
            // Try to find statement if problem existed but statement wasn't found in resolve
             if problem_node_id != -1 {
                use crate::graph::edge::problem_statement::ProblemStatementEdgeQuery;
                if let Ok(statements) = ProblemStatementEdgeQuery::get_v(problem_node_id, &db).await
                    && !statements.is_empty() {
                    statement_node_id = statements[0];
                }
             }
        }
        
        if statement_node_id == -1 {
             log::error!("Statement node not found for problem {}", problem_node_id);
                 return Ok(())
        }

        Self::upsert_record(&db, user_id, submission, statement_node_id).await
    }

    async fn resolve_problem(db: &DatabaseConnection, remote_problem_id: &str) -> (bool, i64, i64) {
        let mut redis = get_redis_connection();
        let mut store = (db, &mut redis);
        let node_ids = ProblemRepository::resolve(&mut store, remote_problem_id).await;
        
        if let Ok(ids) = node_ids {
            (true, ids.0, ids.1)
        } else {
            log::debug!("Failed to get node ids from iden for problem {}", remote_problem_id);
            log::debug!("Error: {:?}", node_ids.err());
            (false, -1, -1)
        }
    }

    async fn create_placeholder_problem(db: &DatabaseConnection, remote_problem_id: &str, submission_remote_problem_id: &str) -> Result<(i64, i64)> {
        let system_node_id = env::DEFAULT_NODES.lock().unwrap().default_system_node;
        log::info!("Problem {} not found, creating placeholder.", remote_problem_id);
        let placeholder_props = CreateProblemProps {
            user_id: system_node_id,
            problem_iden: format!("Rmj{}", remote_problem_id),
            problem_name: remote_problem_id.to_string(),
            problem_statement: vec![
                ProblemStatementProp {
                    statement_source: submission_remote_problem_id.to_lowercase().to_string(),
                    iden: remote_problem_id.to_string(),
                    problem_statements: vec![
                        ContentType {
                            iden: "statement".to_string(),
                            content: "Not yet crawled".to_string(),
                        }
                    ],
                    time_limit: 1000,
                    memory_limit: 256 * 1024,
                    sample_group: vec![],
                    page_source: None,
                    page_rendered: None,
                    problem_difficulty: None,
                    show_order: vec!["statement".to_string()],
                }
            ],
            creation_time: Some(chrono::Utc::now().naive_utc()),
            tags: vec!["un_crawl".to_string()],
        };
        
        let mut redis = get_redis_connection();
        let res = {
            let mut store = (db, &mut redis);
            ProblemFactory::create_with_user(&mut store, &placeholder_props, true).await
        };

        match res {
            Ok(node) => {
                let problem_node_id = node.node_id;
                use crate::graph::edge::problem_statement::ProblemStatementEdgeQuery;
                if let Ok(statements) = ProblemStatementEdgeQuery::get_v(problem_node_id, db).await
                    && !statements.is_empty() {
                       Ok((problem_node_id, statements[0]))
                } else {
                    Ok((problem_node_id, -1))
                }
            },
            Err(e) => {
                log::error!("Failed to create placeholder problem");
                log::error!("Error: {:?}", e);
                Err(e)
            }
        }
    }

    async fn upsert_record(db: &DatabaseConnection, user_id: i64, submission: SubmissionItem, statement_node_id: i64) -> Result<()> {
        // 判断是上传新纪录还是更新已有纪录
        let records = RecordRepository::by_url(db, &submission.url).await;
        let (record_exists, existing_record_id) = if let Ok(records) = records && let Some(records) = records {
            log::debug!("Found existing records {} for submission {}", records.node_id, submission.url);
            (true, records.node_id)
        } else {
            (false, -1)
        };
        let status = match submission.status.as_str() {
            "Accepted" => RecordStatus::Accepted,
            "WrongAnswer" => RecordStatus::WrongAnswer,
            "TimeLimitExceeded" => RecordStatus::TimeLimitExceeded,
            "MemoryLimitExceeded" => RecordStatus::MemoryLimitExceeded,
            "RuntimeError" => RecordStatus::RuntimeError,
            "CompilationError" => RecordStatus::CompileError,
            _ => RecordStatus::UnknownError,
        };
        // Convert timestamp
        let submit_time = chrono::DateTime::parse_from_rfc3339(&submission.submit_time)
            .map(|dt| dt.naive_utc())
            .unwrap_or(chrono::Utc::now().naive_utc());
        
        let record_id = if !record_exists {
            // 创建新记录
            let record_prop = RecordNewProp {
                platform: submission.remote_platform.clone(),
                code: submission.code.clone(),
                code_language: submission.language.clone(),
                url: submission.url.clone(),
                statement_node_id,
                public_status: true,
            };
            let result = Record::create(
                db,
                record_prop,
                user_id,
                status,
                submission.score,
                submit_time
            ).await?;
            result.node_id
        } else {
            existing_record_id
        };
        
        let mut record_map = std::collections::HashMap::new();
        for (testcase_id, status, score, time, memory) in &submission.passed {
            record_map.insert((*testcase_id).clone(), SubtaskUserRecord {
                time: *time,
                memory: *memory,
                status: (*status).clone().into(),
                subtask_status: vec![],
                score: *score,
            });
        }
        log::info!("Updating record {} for submission {}, statement_node_id={statement_node_id}", record_id, submission.remote_id);
        
        let mut redis = get_redis_connection();
        let mut store = (db, &mut redis);
        Record::new(record_id).update_remote_status(&mut store, statement_node_id, record_map).await?;
        Ok(())
    }
}