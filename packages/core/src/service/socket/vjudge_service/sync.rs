use socketioxide::extract::{Data, SocketRef};
use macro_socket_auth::auth_socket_connect;
use crate::env::db::get_connect;
use super::super::service::check_auth;
use crate::model::vjudge::{VjudgeService, UserSubmissionProp};


#[auth_socket_connect]
pub async fn handle_update_vjudge_submission(socket: SocketRef, Data(data): Data<UserSubmissionProp>) {
    log::debug!("Updating user submission from socket {}.", socket.id);
    let db = get_connect().await;
    if let Err(err) = db {
        log::error!("Failed to connect to database: {}", err);
        return;
    }
    let db = db.unwrap();

    if let Err(err) = VjudgeService::update_batch(&db, data).await {
        log::error!("Failed to update user submissions: {}", err);
    }
}