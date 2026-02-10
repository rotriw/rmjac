//! VJudge 服务层
//!
//! 负责提交记录的同步、题目导入、批量更新等核心业务逻辑

use crate::db::entity::node::problem_statement::ContentType;
use crate::declare::UniversalSubmission;
use crate::env;
use crate::error::CoreError;
use crate::workflow::vjudge::VjudgeWorkflowRegistry;
use crate::graph::edge::problem_statement::ProblemStatementEdgeQuery;
use crate::graph::edge::problem_tag::ProblemTagEdgeRaw;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::node::problem::tag::{
    ProblemTagNode, ProblemTagNodePrivateRaw, ProblemTagNodePublicRaw, ProblemTagNodeRaw,
};
use crate::graph::node::problem::ProblemNode;
use crate::graph::node::user::remote_account::VjudgeNode;
use crate::graph::node::vjudge_task::VjudgeTaskNode;
use crate::graph::node::{Node, NodeRaw};
use crate::model::problem::{
    CreateProblemProps, ProblemFactory, ProblemImport, ProblemStatement, ProblemStatementProp,
};
use crate::model::record::{Record, RecordFactory, RecordImport, RecordNewProp, SubtaskUserRecord};
use crate::model::ModelStore;
use crate::service::iden::get_node_ids_from_iden;
use crate::utils::get_redis_connection;
use crate::Result;
use sea_orm::{ColumnTrait, DatabaseConnection};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tokio::sync::Mutex as AsyncMutex;

use super::account::VjudgeAccount;
use super::task::VjudgeTask;
use super::types::{SubmissionItem, UserSubmissionProp, VjudgeOperation};

lazy_static::lazy_static! {
    /// 题目更新锁，防止同一题目并发创建
    static ref PROBLEM_UPDATE_LOCKS: Mutex<HashMap<String, Arc<AsyncMutex<()>>>> = Mutex::new(HashMap::new());
}

/// VJudge 核心服务
pub struct VjudgeService;

impl VjudgeService {
    /// 刷新单条记录
    pub async fn refresh_one(
        user_id: i64,
        platform: &str,
        vjudge_node: &VjudgeNode,
        url: &str,
    ) -> Result<()> {
        let method = VjudgeAccount::method(&vjudge_node);
        let platform_lower = platform.to_lowercase();
        let task_id = format!(
            "vjudge-sync-one-{}-{}",
            vjudge_node.node_id,
            chrono::Utc::now().timestamp()
        );
        let workflow = VjudgeWorkflowRegistry::default();
        let _ = workflow
            .dispatch_task(
                &task_id,
                &format!("{}:syncOne:{}", platform_lower, method),
                &platform_lower,
                "syncOne",
                &method,
                serde_json::json!({
                    "operation": VjudgeOperation::SyncOne.as_str(),
                    "platform": platform,
                    "vjudge_node": vjudge_node,
                    "user_id": user_id,
                    "url": url,
                    "method": method,
                }),
                None,
            )
            .await;

        Ok(())
    }

    /// 处理同步回调（来自边缘服务）
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
            let problem_id = ProblemImport::resolve(store, &submission.problem_iden).await;
            if let Ok((_, statement_node)) = problem_id {
                let result = RecordFactory::create(
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
                    submission.submit_time,
                )
                .await;
                if let Err(err) = result {
                    failed_list.push((submission, err));
                }
            }
        }
        failed_list
    }

    /// 导入题目（来自边缘服务）
    pub async fn import_problem(
        store: &mut impl ModelStore,
        problem: &CreateProblemProps,
    ) -> Result<()> {
        log::debug!("Importing problem: {}", problem.problem_name);
        let db = store.get_db().clone();
        let redis = store.get_redis();

        // Check if problem exists
        let iden_str = format!("problem/{}", problem.problem_iden);
        let node_ids = get_node_ids_from_iden(&db, redis, &iden_str).await;

        let mut p_node_id = -1;
        if let Ok(ids) = node_ids {
            for id in ids {
                let n_type = crate::graph::action::get_node_type(&db, id)
                    .await
                    .unwrap_or("".to_string());
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

    /// 更新已存在的题目
    async fn update_existing_problem(
        store: &mut impl ModelStore,
        p_node_id: i64,
        problem: &CreateProblemProps,
    ) -> Result<()> {
        let db = store.get_db().clone();
        let _redis = store.get_redis();

        log::info!(
            "Updating existing problem: {} (Node ID: {})",
            problem.problem_name,
            p_node_id
        );

        // 1. Update Problem Node Name
        let p_node = ProblemNode::from_db(&db, p_node_id).await;
        if let Ok(node) = p_node {
            use crate::db::entity::node::problem::Column::Name;
            let _ = node.modify(&db, Name, problem.problem_name.clone()).await;
        }
        for statement in &problem.problem_statement {
            let (_, stmt) = ProblemImport::resolve(store, &statement.iden).await?;
            if stmt == -1 {
                let schema = ProblemFactory::generate_statement_schema(statement.clone());
                ProblemFactory::add_statement(store, p_node_id, schema).await?;
            } else {
                let stmt = ProblemStatement::new(stmt);
                stmt.set_content(store, statement.problem_statements.clone())
                    .await?;
                stmt.set_source(store, &statement.statement_source).await?;
                if let Some(judge_option) = &statement.judge_option {
                    stmt.set_judge_option(store, judge_option.clone()).await?;
                }
            }
        }
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
                    }
                    .save(&db)
                    .await;
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
            let _ = ProblemTagEdgeRaw {
                u: p_node_id,
                v: tag_node_id,
            }
            .save(&db)
            .await;
        }
        Ok(())
    }

    /// 批量更新提交记录（来自边缘服务）
    pub async fn update_batch(db: &DatabaseConnection, data: UserSubmissionProp) -> Result<()> {
        // Check for task_id and update status if present
        if let Some(task_id) = data.task_id {
            if let Ok(task_node) = VjudgeTaskNode::from_db(db, task_id).await {
                use crate::db::entity::node::vjudge_task::Column;
                let log_msg = format!("Received batch of {} submissions.", data.submissions.len());
                let _ = task_node
                    .modify(
                        db,
                        Column::Log,
                        format!("{}\n{}", task_node.public.log, log_msg),
                    )
                    .await;
                let _ = task_node
                    .modify(db, Column::UpdatedAt, chrono::Utc::now().naive_utc())
                    .await;
            } else {
                log::warn!("Received update for non-existent task_id: {}", task_id);
            }
        }

        let mut handles = vec![];
        let ws_id = data.ws_id;
        let ws_notify = if let Some(id) = ws_id {
            env::USER_WEBSOCKET_CONNECTIONS
                .lock()
                .unwrap()
                .get(&id)
                .cloned()
        } else {
            log::debug!("No websocket id provided for submission update.");
            None
        };
        if let Some(notify_ref) = &ws_notify {
            let _ = notify_ref.emit(
                "submission_update",
                &serde_json::json!({
                    "s": 0,
                    "n": data.submissions.len()
                }),
            );
        } else {
            log::debug!("No notify_ref available to send initial submission update.");
        }
        let mut log_data = format!(
            "Processing {} submissions for user {}.\n",
            data.submissions.len(),
            data.user_id
        );
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
                        log::debug!(
                            "No notify_ref available to send error message for submission: {}",
                            &submission.remote_id
                        );
                    }
                    return format!(
                        "Failed to process submission {}: {:?}\n",
                        &submission.remote_id, e
                    );
                } else if let Some(notify_ref) = notify_ref {
                    let _ = notify_ref.emit(
                        "submission_update",
                        &serde_json::json!({
                            "s": 2,
                            "m": format!("Successfully add submission: {}", &submission.remote_id)
                        }),
                    );
                    return format!(
                        "Successfully processed submission {}.\n",
                        &submission.remote_id
                    );
                }
                format!(
                    "Successfully processed submission {}.\n",
                    &submission.remote_id
                )
            }));
        }

        for handle in handles {
            let data = handle.await;
            log_data += &data.unwrap_or("Failed to join submission processing task.\n".to_string());
        }
        // update task log if present
        if let Some(task_id) = data.task_id
            && let Ok(task_node) = VjudgeTaskNode::from_db(db, task_id).await
        {
            use crate::db::entity::node::vjudge_task::Column;
            VjudgeTask::update_log(db, task_id, log_data.clone()).await?;
            let _ = task_node
                .modify(db, Column::Status, "completed".to_string())
                .await;
            let _ = task_node
                .modify(db, Column::UpdatedAt, chrono::Utc::now().naive_utc())
                .await;
        }
        Ok(())
    }

    /// 处理单条提交记录
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

        let (problem_exists, problem_node_id, mut statement_node_id) =
            Self::resolve_problem(&db, &remote_problem_id).await;

        if !problem_exists {
            // 如果题目不存在，就以 System 用户的名义创建一个占位题目
            if let Ok((_pid, sid)) = Self::create_placeholder_problem(
                &db,
                &remote_problem_id,
                &submission.remote_problem_id,
            )
            .await
            {
                statement_node_id = sid;
            } else {
                return Ok(());
            }
        }

        if statement_node_id == -1 {
            // Try to find statement if problem existed but statement wasn't found in resolve
            if problem_node_id != -1 {
                if let Ok(statements) = ProblemStatementEdgeQuery::get_v(problem_node_id, &db).await {
                    if !statements.is_empty() {
                        statement_node_id = statements[0];
                    }
                }
            }
        }

        if statement_node_id == -1 {
            log::error!("Statement node not found for problem {}", problem_node_id);
            return Ok(());
        }

        Self::upsert_record(&db, user_id, submission, statement_node_id).await
    }

    /// 解析题目标识
    async fn resolve_problem(db: &DatabaseConnection, remote_problem_id: &str) -> (bool, i64, i64) {
        let mut redis = get_redis_connection();
        let mut store = (db, &mut redis);
        let node_ids = ProblemImport::resolve(&mut store, remote_problem_id).await;

        if let Ok(ids) = node_ids {
            (true, ids.0, ids.1)
        } else {
            log::debug!(
                "Failed to get node ids from iden for problem {}",
                remote_problem_id
            );
            log::debug!("Error: {:?}", node_ids.err());
            (false, -1, -1)
        }
    }

    /// 创建占位题目
    async fn create_placeholder_problem(
        db: &DatabaseConnection,
        remote_problem_id: &str,
        submission_remote_problem_id: &str,
    ) -> Result<(i64, i64)> {
        let system_node_id = env::DEFAULT_NODES.lock().unwrap().default_system_node;
        log::info!(
            "Problem {} not found, creating placeholder.",
            remote_problem_id
        );
        let placeholder_props = CreateProblemProps {
            user_id: system_node_id,
            problem_iden: format!("Rmj{}", remote_problem_id),
            problem_name: remote_problem_id.to_string(),
            problem_statement: vec![ProblemStatementProp {
                statement_source: submission_remote_problem_id.to_lowercase().to_string(),
                iden: remote_problem_id.to_string(),
                problem_statements: vec![ContentType {
                    iden: "statement".to_string(),
                    content: "Not yet crawled".to_string(),
                }],
                time_limit: 1000,
                memory_limit: 256 * 1024,
                sample_group: vec![],
                page_source: None,
                page_rendered: None,
                problem_difficulty: None,
                judge_option: None,
                show_order: vec!["statement".to_string()],
            }],
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
                if let Ok(statements) = ProblemStatementEdgeQuery::get_v(problem_node_id, db).await {
                    if !statements.is_empty() {
                        return Ok((problem_node_id, statements[0]));
                    }
                }
                Ok((problem_node_id, -1))
            }
            Err(e) => {
                log::error!("Failed to create placeholder problem");
                log::error!("Error: {:?}", e);
                Err(e)
            }
        }
    }

    /// 插入或更新提交记录
    async fn upsert_record(
        db: &DatabaseConnection,
        user_id: i64,
        submission: SubmissionItem,
        statement_node_id: i64,
    ) -> Result<()> {
        // 判断是上传新纪录还是更新已有纪录
        let records = RecordImport::by_url(db, &submission.url).await;
        let (record_exists, existing_record_id) = if let Ok(records) = records
            && let Some(records) = records
        {
            log::debug!(
                "Found existing records {} for submission {}",
                records.node_id,
                submission.url
            );
            (true, records.node_id)
        } else {
            (false, -1)
        };
        let status = submission.status.into();
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
            let result = RecordFactory::create(
                db,
                record_prop,
                user_id,
                status,
                submission.score,
                submit_time,
            )
            .await?;
            result.node_id
        } else {
            existing_record_id
        };

        let mut record_map = std::collections::HashMap::new();
        for (testcase_id, status, score, time, memory) in &submission.passed {
            record_map.insert(
                (*testcase_id).clone(),
                SubtaskUserRecord {
                    time: *time,
                    memory: *memory,
                    status: (*status).clone().into(),
                    subtask_status: vec![],
                    score: *score,
                },
            );
        }
        log::info!(
            "Updating record {} for submission {}, statement_node_id={statement_node_id}",
            record_id,
            submission.remote_id
        );

        let mut redis = get_redis_connection();
        let mut store = (db, &mut redis);
        Record::new(record_id)
            .update_remote_status(&mut store, statement_node_id, record_map)
            .await?;
        Ok(())
    }
}
