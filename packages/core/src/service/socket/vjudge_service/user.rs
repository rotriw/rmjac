use crate::env;
use crate::env::db::get_connect;
use crate::graph::node::record::RecordStatus;
use crate::model::record::{Record, UpdateRecordRootStatusData};
use crate::model::vjudge::VjudgeAccount;
use crate::service::socket::service::VerifiedResultProp;
use crate::service::socket::service::check_auth;
use crate::utils::get_redis_connection;
use macro_socket_auth::auth_socket_connect;
use serde::{Deserialize, Serialize};
use socketioxide::extract::{Data, SocketRef};

#[auth_socket_connect]
async fn handle_verified_result(socket: SocketRef, Data(result): Data<VerifiedResultProp>) {
    log::info!("Handling verified result from socket {}.", socket.id);
    let user_socket = {
        let data = env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap();
        data.get(&result.ws_id).cloned()
    };
    if result.result {
        let db = get_connect().await;
        if let Err(err) = db {
            log::error!("Failed to connect to database: {}", err);
            if let Some(user_socket) = user_socket {
                let _ = user_socket.emit(
                    "vjudge_account_verified",
                    "0Failed to connect to database, please retry.",
                );
            }
            return;
        }
        let db = db.unwrap();
        let x = VjudgeAccount::new(result.node_id).set_verified(&db).await;
        if let Err(err) = x
            && let Some(user_socket) = &user_socket
        {
            let _ = user_socket.emit(
                "vjudge_account_verified",
                &format!("0Failed to verify account, please retry. {:?}", err),
            );
        }
        if let Some(user_socket) = &user_socket {
            let _ = user_socket.emit("vjudge_account_verified", "1Account verified successfully.");
        }
    } else if let Some(user_socket) = &user_socket {
        let _ = user_socket.emit("vjudge_account_verified", "0Account verified Failed.");
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct SubmitResultProp {
    pub ws_id: Option<String>,
    pub success: bool,
    pub remote_url: Option<String>,
    pub message: Option<String>,
    pub record_id: i64,
}

#[auth_socket_connect]
async fn handle_submit_done(socket: SocketRef, Data(data): Data<SubmitResultProp>) {
    // handle submit done
    log::debug!("Handling submit done from socket {}.", socket.id);
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
    let db = get_connect().await;
    let mut redis = get_redis_connection();
    if let Err(err) = db {
        log::error!("Failed to connect to database: {}", err);
        return;
    }
    let db = db.unwrap();
    if !data.success {
        if let Some(notify_ref) = ws_notify {
            let msg = format!(
                "0Submission failed: {}",
                data.message.clone().unwrap_or("Unknown error".to_string())
            );
            let _ = notify_ref.emit(
                "vjudge_submission_result",
                &serde_json::json!({
                    "i": data.record_id,
                    "m": msg,
                    "s": "failed"
                }),
            );
        }
        let mut store = (&db, &mut redis);
        let _ = Record::new(data.record_id)
            .update_root_status(
                &mut store,
                UpdateRecordRootStatusData {
                    record_id: data.record_id,
                    status: RecordStatus::RemoteServiceUnknownError,
                    time: -1,
                    memory: -1,
                    score: -1,
                },
            )
            .await;
        let _ = Record::new(data.record_id)
            .set_message(&db, data.message)
            .await;
        return;
    }

    let remote_url = data.remote_url.unwrap_or("".to_string());

    let mut store = (&db, &mut redis);
    let _ = Record::new(data.record_id)
        .update_root_status(
            &mut store,
            UpdateRecordRootStatusData {
                record_id: data.record_id,
                status: RecordStatus::Judging,
                time: -1,
                memory: -1,
                score: 0,
            },
        )
        .await;
    let _ = Record::new(data.record_id).set_url(&db, &remote_url).await;
    if let Some(notify_ref) = ws_notify {
        let _ = notify_ref.emit(
            "vjudge_submission_result",
            &serde_json::json!({
                "i": data.record_id,
                "s": "success",
                "r": remote_url,
            }),
        );
    }
}
