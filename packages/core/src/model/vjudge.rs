use sea_orm::{ColumnTrait, DatabaseConnection};
use crate::declare::UniversalSubmission;
use crate::graph::edge::{EdgeQuery, EdgeRaw};
use crate::graph::edge::user_remote::{UserRemoteEdgeQuery, UserRemoteEdgeRaw};
use crate::graph::node::user::remote_account::{RemoteMode, UserRemoteAccountAuth, UserRemoteAccountNode, UserRemoteAccountNodePrivateRaw, UserRemoteAccountNodePublicRaw, UserRemoteAccountNodeRaw};
use crate::error::CoreError;
use crate::graph::node::{Node, NodeRaw};
use crate::model::problem::get_problem_node_and_statement;
use crate::model::vjudge::AddErrorResult::Warning;
use crate::Result;
use crate::model::record::{create_record_with_status, RecordNewProp, get_records_by_statement, update_record_status, update_record_score, update_record_status_no_subtask_remote_judge, SubtaskUserRecord, get_record_by_submission_url};
use crate::graph::node::record::RecordStatus;
use crate::service::judge::service::add_task;
use crate::utils::encrypt::gen_random_string;
use crate::model::problem::{CreateProblemProps, delete_problem_connections, generate_problem_statement_schema, add_problem_statement_for_problem, create_problem_with_user, ProblemStatementProp};
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

lazy_static::lazy_static! {
    static ref PROBLEM_UPDATE_LOCKS: Mutex<HashMap<String, Arc<AsyncMutex<()>>>> = Mutex::new(HashMap::new());
}


#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Platform {
    Codeforces,
    Atcoder,
}

pub enum AddErrorResult {
    CoreError(CoreError),
    Warning(String, UserRemoteAccountNode),
}

impl From<CoreError> for AddErrorResult {
    fn from(err: CoreError) -> Self {
        AddErrorResult::CoreError(err)
    }
}

pub async fn add_unverified_account_for_user(
    db: &DatabaseConnection,
    user_id: i64,
    _platform_type: Platform,
    platform: String,
    remote_mode: RemoteMode,
    auth: Option<UserRemoteAccountAuth>,
    bypass_check: bool,
    ws_id: Option<String>,
) -> Result<UserRemoteAccountNode, AddErrorResult>  {
    let iden = format!("vjudge_{}_{}", user_id, &platform);
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
    let vjudge_node = UserRemoteAccountNodeRaw {
        public: UserRemoteAccountNodePublicRaw {
            platform,
            verified_code,
            verified,
            iden,
            creation_time: chrono::Utc::now().naive_utc(),
            updated_at: chrono::Utc::now().naive_utc(),
            remote_mode: remote_mode.clone(),
        },
        private: UserRemoteAccountNodePrivateRaw {
            auth,
        },
    }.save(db).await?;

    UserRemoteEdgeRaw {
        u: user_id,
        v: vjudge_node.node_id,
    }.save(db).await?;

    use crate::service::judge::service::add_task;

    match (&remote_mode, bypass_check, ws_id) {
        (&RemoteMode::PublicAccount, _, _) => Ok(vjudge_node),
        (_, true, _) => Ok(vjudge_node),
        (_, _, Some(ws_id)) => {
            let success = add_task(&Json! {
                "operation": "verify_remote_account",
                "vjudge_node": vjudge_node,
                "ws_id": ws_id,
            }).await;
            if !success {
                return Err(Warning("Warning: No edge server online.".to_string(), vjudge_node));
            }
            Ok(vjudge_node)
        }
        (_, _, None) => {
            log::warn!("No websocket id provided when verifying vjudge account(no public account, no websocket listener).");
            let success = add_task(&Json! {
                "operation": "verify_remote_account",
                "vjudge_node": vjudge_node,
            }).await;
            if !success {
                return Err(Warning("Warning: No edge server online.".to_string(), vjudge_node));
            }
            Ok(vjudge_node)
        }
    }
}


pub async fn verified_account(
    db: &DatabaseConnection,
    node_id: i64,
) -> Result<(), CoreError> {
    use crate::db::entity::node::user_remote::Column::Verified;
    UserRemoteAccountNode::from_db(db, node_id).await?
        .modify(db, Verified, true)
        .await?;
    Ok(())
}

pub async fn send_submission_sync_user_remote_submission(
    db: &DatabaseConnection,
    vjudge_node_id: i64,
    user_id: i64,
    platform: String,
    problem_id: i64,
    ws_id: Option<String>,
) -> Result<(), CoreError> {
    let vjudge_node = UserRemoteAccountNode::from_db(db, vjudge_node_id).await?;
    if vjudge_node.public.remote_mode == RemoteMode::PublicAccount {
        return Err(CoreError::VjudgeError("Public account cannot sync submission.".to_string()));
    }
    // check user_id is own vjudge_node_id, and verify vjudge_node is verified
    if vjudge_node.public.verified == false {
        return Err(CoreError::VjudgeError("Vjudge account is not verified.".to_string()));
    }
    use crate::db::entity::edge::user_remote::Column::VNodeId;
    let user_remote_edges = UserRemoteEdgeQuery::get_v_filter_extend_content(user_id, vec![
        VNodeId.eq(vjudge_node_id),
    ], db, None, None).await?;
    if user_remote_edges.len() == 0 {
        return Err(CoreError::VjudgeError("User is not related to vjudge account.".to_string()));
    }

    let success = add_task(&Json! {
        "operation": "sync_user_remote_submission",
        "vjudge_node": vjudge_node,
        "user_id": user_id,
        "platform": platform,
        "problem_iden": problem_id,
        "ws_id": ws_id,
    }).await;
    if !success {
        return Err(CoreError::VjudgeError("Edge server Error! Failed to sync submission.".to_string()));
    }
    Ok(())
}

pub async fn handle_submission_sync_user_remote_submission(
    db: &DatabaseConnection,
    redis: &mut redis::Connection,
    user_id: i64,
    platform: String,
    submissions: Vec<UniversalSubmission>,
) -> Vec<(UniversalSubmission, CoreError)> {
    let mut failed_list = vec![];
    for submission in submissions {
        let submission = submission.clone();
        let problem_id = get_problem_node_and_statement(db, redis, &submission.problem_iden).await;
        if let Ok((_, statement_node)) = problem_id {
            // refresh problem cache
            let result = create_record_with_status(
                db,
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

pub async fn create_or_update_problem_from_vjudge(
    db: &DatabaseConnection,
    problem: &CreateProblemProps,
) -> Result<()> {
    let mut redis = env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    // Check if problem exists
    let iden_str = format!("problem/{}", problem.problem_iden);
    let node_ids = get_node_ids_from_iden(db, &mut redis, &iden_str).await;
    
    if let Ok(ids) = node_ids {
        if !ids.is_empty() {
             // Update existing problem
            let mut p_node_id = -1;
            for id in ids {
                let n_type = crate::graph::action::get_node_type(db, id).await.unwrap_or("".to_string());
                if n_type == "problem" {
                    p_node_id = id;
                    break;
                }
            }
            
            if p_node_id != -1 {
                log::info!("Updating existing problem: {} (Node ID: {})", problem.problem_name, p_node_id);
                
                // 1. Update Problem Node Name
                let p_node = ProblemNode::from_db(db, p_node_id).await;
                 if let Ok(node) = p_node {
                     use crate::db::entity::node::problem::Column::Name;
                     let _ = node.modify(db, Name, problem.problem_name.clone()).await;
                 }

                // 2. Delete existing connections (statements, tags)
                let _ = delete_problem_connections(db, &mut redis, p_node_id).await;

                // 3. Re-add statements
                for statement in &problem.problem_statement {
                    let schema = generate_problem_statement_schema(statement.clone());
                    let _ = add_problem_statement_for_problem(db, &mut redis, p_node_id, schema).await;
                }

                // 4. Re-add tags
                for i in &problem.tags {
                    use crate::db::entity::node::problem_tag::Column as ProblemTagColumn;
                    let id = ProblemTagNode::from_db_filter(db, ProblemTagColumn::TagName.eq(i)).await;
                     let tag_node_id = if let Ok(nodes) = id {
                        if nodes.is_empty() {
                            let new_tag = ProblemTagNodeRaw {
                                public: ProblemTagNodePublicRaw {
                                    tag_name: i.clone(),
                                    tag_description: "".to_string(),
                                },
                                private: ProblemTagNodePrivateRaw {},
                            }.save(db).await;
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
                    }.save(db).await;
                }
                
                return Ok(());
            }
        }
    }

    let result = create_problem_with_user(db, &mut redis, problem, true).await;
    if let Err(err) = result {
        log::error!("Failed to create problem: {}", err);
        return Err(err);
    }
    let problem = result.unwrap();
    drop(problem);
    Ok(())
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
}

pub async fn update_user_submission_from_vjudge(
    db: &DatabaseConnection,
    data: UserSubmissionProp,
) -> Result<()> {
    let mut handles = vec![];
    log::info!("{}.", data.ws_id.clone().unwrap_or("No WS ID provided".to_string()));
    let ws_id = data.ws_id;
    let ws_notify = if let Some(id) = ws_id {
        Some(env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap().get(&id).cloned()).unwrap_or(None)
    } else {
        log::warn!("No websocket id provided for submission update.");
        None
    };
    if let Some(notifyRef) = &ws_notify {
        let _ = notifyRef.emit("submission_update", &Json!{
            "s": 0,
            "n": data.submissions.len(),
        });
    } else {
        log::debug!("No notifyRef available to send initial submission update.");
    }
    for submission in data.submissions {
        let db = db.clone();
        let user_id = data.user_id;
        let notifyRef = ws_notify.clone();
        handles.push(tokio::spawn(async move {
            if let Err(e) = process_single_submission(db, user_id, submission.clone()).await {
                log::error!("Error processing submission: {:?}", e);
                if let Some(notifyRef) = notifyRef {
                    let _ = notifyRef.emit("submission_update", &Json!{
                        "s": 1,
                        "m": format!("Failed to process submission: {}", &submission.remote_id),
                    });
                } else {
                    log::debug!("No notifyRef available to send error message for submission: {}", &submission.remote_id);
                }
            } else if let Some(notifyRef) = notifyRef {
                let _ = notifyRef.emit("submission_update", &Json! {
                    "s": 2,
                    "m": format!("Successfully add submission: {}", &submission.remote_id),
                });
            }
        }));
    }
    for handle in handles {
        let _ = handle.await;
    }
    Ok(())
}

async fn process_single_submission(
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
    let _guard = lock.lock().await;

    let mut redis = get_redis_connection();

    // let problem_iden_str = format!("problem/{}", remote_problem_id);?
    // Check if problem exists
    let node_ids = get_problem_node_and_statement(&db, &mut redis, &remote_problem_id).await;
    let mut problem_exists = false;
    let mut problem_node_id = -1;
    let mut statement_node_id = -1;

    if let Ok(ids) = node_ids {
        problem_exists = true;
        problem_node_id = ids.0;
        statement_node_id = ids.1;
    } else {
        log::debug!("Failed to get node ids from iden for problem {}", remote_problem_id);
        log::debug!("Error: {:?}", node_ids.err());
    }

    if !problem_exists {
        log::info!("Problem {} not found, creating placeholder.", remote_problem_id);
        let placeholder_props = CreateProblemProps {
            user_id: user_id,
            problem_iden: format!("Rmj{}", remote_problem_id.clone()),
            problem_name: remote_problem_id.clone(),
            problem_statement: vec![
                ProblemStatementProp {
                    statement_source: "vjudge".to_string(),
                    iden: remote_problem_id.clone(),
                    problem_statements: vec![
                        ContentType {
                            iden: "statement".to_string(),
                            content: "Not yet crawled".to_string(),
                        }
                    ],
                    time_limit: 1000,
                    memory_limit: 256 * 1024,
                    sample_group: vec![],
                    show_order: vec!["statement".to_string()],
                }
            ],
            creation_time: Some(chrono::Utc::now().naive_utc()),
            tags: vec!["un_crawl".to_string()],
        };
        
        let res = create_problem_with_user(&db, &mut redis, &placeholder_props, true).await;
        if let Ok(node) = res {
            problem_node_id = node.node_id;
            // Need to find statement node id
                use crate::graph::edge::problem_statement::ProblemStatementEdgeQuery;
                if let Ok(statements) = ProblemStatementEdgeQuery::get_v(problem_node_id, &db).await {
                    if !statements.is_empty() {
                        statement_node_id = statements[0];
                    }
                }
        } else {
            log::error!("Failed to create placeholder problem");
            log::error!("Error: {:?}", res.err());
            return Ok(());
        }
    }

    if statement_node_id == -1 {
            // Try fetching if problem exists but statement not found via iden (should not happen if consistent)
            use crate::graph::edge::problem_statement::ProblemStatementEdgeQuery;
            if let Ok(statements) = ProblemStatementEdgeQuery::get_v(problem_node_id, &db).await {
                if !statements.is_empty() {
                    statement_node_id = statements[0];
                }
            }
    }
    
    if statement_node_id == -1 {
        log::error!("Statement node not found for problem {}", problem_node_id);
        return Ok(());
    }

    // Check if record exists
    let records = get_record_by_submission_url(&db, &submission.url).await;
    let (record_exists, existing_record_id) = if let Ok(records) = records && let Some(records) = records {
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
    // Assuming submission.submit_time is ISO string
    let submit_time = chrono::DateTime::parse_from_rfc3339(&submission.submit_time)
        .map(|dt| dt.naive_utc())
        .unwrap_or(chrono::Utc::now().naive_utc());


    let record_id = if !record_exists {
        // Create record
        let record_prop = RecordNewProp {
            platform: submission.remote_platform.clone(),
            code: submission.code.clone(),
            code_language: submission.language.clone(),
            url: submission.url.clone(),
            statement_node_id: statement_node_id,
            public_status: true,
        };
        
        let result = create_record_with_status(
            &db,
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
    log::info!("Updating record {} for submission {}", record_id, submission.remote_id);
    update_record_status_no_subtask_remote_judge(&db, &mut redis, record_id, statement_node_id, record_map).await?;
    
    Ok(())
}
