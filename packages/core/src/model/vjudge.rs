use sea_orm::DatabaseConnection;
use crate::db::entity::node::problem_statement::Column::Content;
use crate::db::iden::node::user_remote::UserRemoteAccount::Verified;
use crate::graph::node::user::remote_account::{RemoteMode, UserRemoteAccountAuth, UserRemoteAccountNode, UserRemoteAccountNodePrivateRaw, UserRemoteAccountNodePublicRaw, UserRemoteAccountNodeRaw};
use crate::error::CoreError;
use crate::graph::edge::problem_statement::ProblemStatementEdgeQuery;
use crate::graph::node::{Node, NodeRaw};
use crate::graph::node::problem::statement::ProblemStatementNode;
use crate::model::problem::refresh_problem_node_cache;
use crate::model::vjudge::AddErrorResult::Warning;
use crate::{env, Result};
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
    platform_type: Platform,
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