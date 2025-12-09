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
use crate::model::record::{create_record_with_status, RecordNewProp};
use crate::service::judge::service::add_task;
use crate::utils::encrypt::gen_random_string;

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
