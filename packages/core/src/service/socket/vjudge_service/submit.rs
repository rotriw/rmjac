use redis::io::tcp::socket2::SockAddr;
use serde::{Deserialize, Serialize};
use super::super::service::check_auth;
use crate::env::db::get_connect;
use crate::model::vjudge::VjudgeService;
use macro_socket_auth::auth_socket_connect;
use socketioxide::extract::{Data, SocketRef};
use crate::graph::node::record::RecordStatus;
use crate::model::record::Record;

#[derive(Debug, Deserialize, Serialize)]
pub struct UserSubmitSuccessProp {
    pub record_id: i64,
    pub url: String,
    pub msg: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UserTrackUpdateProp {
    pub record_id: i64,
    pub submission_id: i64,
    pub on: i64,
    pub status: String,
    pub time: String,
    pub memory: String,
}

#[auth_socket_connect]
pub async fn handle_track_update(
    socket: SocketRef,
    Data(data): Data<UserTrackUpdateProp>
) {
    log::debug!("Updating user track update from socket {}.", socket.id);
    // let db = get_connect().await.unwrap();
    // TODO: implement track update, but now we can use refresh.
}