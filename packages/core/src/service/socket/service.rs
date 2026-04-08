use crate::Result;
use crate::env;
use crate::env::db::get_connect;
use crate::utils::encrypt::change_string_format;
use axum::routing::get;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use socketioxide::SocketIo;
use socketioxide::extract::{Data, SocketRef};
use std::fmt::Debug;
use std::time::Duration;
use serde::de::DeserializeOwned;
use tower_http::cors::{AllowOrigin, CorsLayer};
use crate::error::CoreError;

fn trust_auth(socket: &SocketRef) {
    log::info!("Socket {} authenticated successfully", socket.id);
    env::EDGE_AUTH_MAP
        .lock()
        .unwrap()
        .entry(socket.id.to_string())
        .or_insert(1);
    env::EDGE_SOCKETS
        .lock()
        .unwrap()
        .entry(socket.id.to_string())
        .or_insert(socket.clone());
    env::EDGE_VEC.lock().unwrap().push(socket.id.to_string());
}

async fn auth(socket: SocketRef, Data(key): Data<String>) {
    log::trace!("{} auth", socket.id);
    log::trace!("auth key: {}", key);
    use crate::utils::encrypt::verify;
    let key = change_string_format(key);
    let pub_key = env::EDGE_AUTH_PUBLICKEY.lock().unwrap().clone();
    let auth = verify(pub_key, key, socket.id.to_string());
    if let Ok(auth) = auth {
        if !auth {
            log::error!("Wrong sign code! private key LEAK?");
            let _ = socket.emit("auth_response", "Authentication Error");
            return;
        }
    } else {
        log::warn!("{} auth error: {:?}", socket.id, auth);
        let _ = socket.emit("auth_response", "Authentication Error/Failed");
        return;
    }

    // socket.join("verified_room");
    trust_auth(&socket);
    let _ = socket.emit("auth_response", "Authentication successful");
}

pub fn check_auth(socket: SocketRef) -> bool {
    log::trace!("Checking auth for socket: {}", socket.id);
    if let Some(auth_count) = env::EDGE_AUTH_MAP
        .lock()
        .unwrap()
        .get(&socket.id.to_string())
    {
        log::trace!("{} auth success: {:?}", socket.id, auth_count);
        if *auth_count > 0 {
            return true;
        }
    }
    log::debug!("Socket {} is not authenticated", socket.id);
    false
}

pub struct UpdateStatusProp {
    pub id: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct VerifiedResultProp {
    pub node_id: i64,
    pub result: bool,
    pub ws_id: String,
}
fn erase_socket(id: &str) {
    log::debug!("Erasing socket: {}", id);
    env::EDGE_SOCKETS.lock().unwrap().remove(&id.to_string());
    log::trace!("Erase socket {id} from map.");
    env::EDGE_VEC.lock().unwrap().retain(|n_id| id != n_id);
    log::debug!("Socket {} erased.", id);
}

pub async fn add_task<T: ?Sized + Serialize + Debug>(operator: &str, task: &T) -> bool {
    let now_id = *env::EDGE_NUM.lock().unwrap();
    if env::EDGE_SOCKETS.lock().unwrap().is_empty() {
        log::error!("No edge sockets available to add task.");
        return false;
    }
    let use_id = (now_id + 1) % (env::EDGE_SOCKETS.lock().unwrap().clone().len() as i32);
    *env::EDGE_NUM.lock().unwrap() = use_id;
    let use_id = env::EDGE_VEC
        .lock()
        .unwrap()
        .get(use_id as usize)
        .unwrap()
        .clone();
    log::trace!("Adding task to socket: {}", use_id);
    let mut require_erase = false;
    if let Some(socket) = env::EDGE_SOCKETS.lock().unwrap().get(&use_id).cloned() {
        if !socket.connected() {
            log::error!("Socket {} is not connected, erasing", use_id);
            require_erase = true;
        } else if let Err(err) = socket.emit(operator, task) {
            log::error!("Failed to emit task: {}", err);
            // erase this socket.
            require_erase = true;
        }
    } else {
        log::error!("Socket not found for id: {}", use_id);
        require_erase = true;
    }
    if require_erase {
        erase_socket(&use_id);
        return false;
    }
    log::debug!("Successfully added task to socket: {use_id}");
    log::trace!("Task detail: {task:?}");
    true
}

pub async fn exec_task<T: ?Sized + Serialize + Debug, O: DeserializeOwned>(operator: &str, task: &T) -> Result<O> {
    let now_id = *env::EDGE_NUM.lock().unwrap();
    if env::EDGE_SOCKETS.lock().unwrap().is_empty() {
        log::error!("No edge sockets available to exec task.");
        return Err(CoreError::StringError("No edge sockets available to exec task.".to_string()));
    }
    let use_id = (now_id + 1) % (env::EDGE_SOCKETS.lock().unwrap().clone().len() as i32);
    *env::EDGE_NUM.lock().unwrap() = use_id;
    let use_id = env::EDGE_VEC
        .lock()
        .unwrap()
        .get(use_id as usize)
        .unwrap()
        .clone();
    log::trace!("Executing task on socket: {}", use_id);
    let socket = env::EDGE_SOCKETS.lock().unwrap().get(&use_id).cloned();
    if let Some(socket) = socket {
        if !socket.connected() {
            log::error!("Socket {} is not connected, erasing", use_id);
            erase_socket(&use_id);
            Err(CoreError::StringError("Socket not connected.".to_string()))
        } else if let Ok(res) = socket.timeout(Duration::from_secs(120)).emit_with_ack(operator, task) {
            log::debug!("Successfully executed task on socket: {use_id}");
            log::trace!("Task detail: {task:?}");
            let res: O = res.await.unwrap();
            Ok(res)
        } else {
            log::error!("Failed to emit task: {}", operator);
            // erase this socket.
            erase_socket(&use_id);
            Err(CoreError::StringError("Failed to emit task.".to_string()))
        }
    } else {
        log::error!("Socket not found for id: {}", use_id);
        erase_socket(&use_id);
        Err(CoreError::StringError("Socket not found.".to_string()))
    }
}

async fn on_connect(socket: SocketRef, Data(_data): Data<Value>) {
    log::debug!("Socket io connected: {:?} {:?}", socket.ns(), socket.id);
    socket.on("auth", auth);

    socket.on_disconnect(async |socket: SocketRef| {
        log::debug!("Socket io disconnected: {:?} {:?}", socket.ns(), socket.id);
        erase_socket(socket.id.as_str());
    });
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
pub struct UserVerifiedProp {
    pub token: String,
    pub user_id: i64,
}

pub async fn service_start(port: u16) -> Result<()> {
    log::info!("VJudge Task server(with user.) will be started at ::{port}");
    let (layer, io) = SocketIo::new_layer();
    io.ns("/vjudge", on_connect);
    *env::SOCKETIO.lock().unwrap() = Some(io.clone());
    let cors = CorsLayer::new().allow_origin(AllowOrigin::any());
    let app = axum::Router::new()
        .route("/vjudge", get(|| async { "" }))
        .layer(layer)
        .layer(cors);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
    Ok(())
}
