use crate::service::socket::vjudge_service::problem::handle_problem_create;
use crate::service::socket::vjudge_service::sync::handle_update_vjudge_submission;
use std::fmt::Debug;
use axum::routing::get;
use serde::{Deserialize, Serialize};
use socketioxide::extract::{SocketRef, Data};
use socketioxide::SocketIo;
use serde_json::Value;
use tower_http::cors::{AllowOrigin, CorsLayer};
use crate::model::vjudge::VjudgeAccount;
use crate::service::socket::vjudge_service::user::{handle_submit_done, handle_verified_result};
use crate::env;
use crate::env::db::get_connect;
use crate::model::user::UserAuthService;
use crate::Result;
use crate::utils::encrypt::change_string_format;

fn trust_auth(socket: &SocketRef) {
    log::info!("Socket {} authenticated successfully", socket.id);
    env::EDGE_AUTH_MAP.lock().unwrap().entry(socket.id.to_string()).or_insert(1);
    env::EDGE_SOCKETS.lock().unwrap().entry(socket.id.to_string()).or_insert(socket.clone());
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
            return ;
        }
    } else {
        log::warn!("{} auth error: {:?}", socket.id, auth);
        let _ = socket.emit("auth_response", "Authentication Error/Failed");
        return ;
    }
    trust_auth(&socket);
    let _ = socket.emit("auth_response", "Authentication successful");
}

pub fn check_auth(socket: SocketRef) -> bool {
    log::trace!("Checking auth for socket: {}", socket.id);
    if let Some(auth_count) = env::EDGE_AUTH_MAP.lock().unwrap().get(&socket.id.to_string()) {
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

#[derive(Deserialize, Serialize, Debug, Clone)]
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

pub async fn add_task<T: ?Sized + Serialize + Debug>(task: &T) -> bool {
    let now_id = *env::EDGE_NUM.lock().unwrap();
    if env::EDGE_SOCKETS.lock().unwrap().is_empty() {
        log::error!("No edge sockets available to add task.");
        return false;
    }
    let use_id = (now_id + 1) % (env::EDGE_SOCKETS.lock().unwrap().clone().len() as i32);
    *env::EDGE_NUM.lock().unwrap() = use_id;
    let use_id = env::EDGE_VEC.lock().unwrap().get(use_id as usize).unwrap().clone();
    log::trace!("Adding task to socket: {}", use_id);
    let mut require_erase = false;
    if let Some(socket) = env::EDGE_SOCKETS.lock().unwrap().get(&use_id).cloned() {
        if !socket.connected() {
            log::error!("Socket {} is not connected, erasing", use_id);
            require_erase = true;
        } else if let Err(err) = socket.emit("task", task) {
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


async fn on_connect(socket: SocketRef, Data(_data): Data<Value>) {
    log::debug!("Socket io connected: {:?} {:?}", socket.ns(), socket.id);
    socket.on("auth", auth);
    socket.on("fetch_done_success", handle_problem_create);
    socket.on("sync_done_success", handle_update_vjudge_submission);
    socket.on("submit_done_success", handle_submit_done);
    socket.on("verified_done_success", handle_verified_result);
    socket.on_disconnect(async |socket: SocketRef| {
        log::debug!("Socket io disconnected: {:?} {:?}", socket.ns(), socket.id);
        erase_socket(socket.id.as_str());
    });
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct UserVerifiedProp {
    pub token: String,
    pub user_id: i64,
}

pub async fn auth_user(socket: SocketRef, Data(user): Data<UserVerifiedProp>) {
    log::trace!("User notify {} auth", socket.id);
    let db = get_connect().await;
    if let Err(err) = db {
        log::error!("Failed to connect to database: {}", err);
        let _ = socket.disconnect();
        return ;
    }
    let result = UserAuthService::check_token(user.user_id, &user.token).await;
    if !result {
        log::trace!("User {} authentication failed", user.user_id);
        let _ = socket.disconnect();
    }
    else {
        log::debug!("User {} with socket {} authenticated successfully", user.user_id, socket.id);
        env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap().insert(socket.id.to_string(), socket.clone());
        env::USER_WEBSOCKET_CONNECTIONS_ACCOUNT.lock().unwrap().insert(socket.id.to_string(), user.user_id);
    }
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VJudgeVerifiedProp {
    pub node_id: i64,
}

pub async fn handle_vjudge_verified(socket: SocketRef, Data(data): Data<VJudgeVerifiedProp>) {
    log::debug!("Handling vjudge verified for socket {}.", socket.id);
    let db = get_connect().await;
    if let Err(err) = db {
        log::error!("Failed to connect to database: {}", err);
        return;
    }
    let db = db.unwrap(); // We know it's Ok here but let's be safe if I could match
    
    // Fix: Access db correctly if it is Ok
    // But wait, get_connect() returns Result<DatabaseConnection>.
    // The previous code had `if let Ok(db) = db`.
    
    let _user_id = {
        let data = env::USER_WEBSOCKET_CONNECTIONS_ACCOUNT.lock().unwrap();
        data.get(&socket.id.to_string()).cloned()
    };
    {
        if VjudgeAccount::new(data.node_id).verify(&db, &socket.id.to_string()).await {
            let _ = socket.emit("check_alive_success", &data.node_id);
        } else {
            let _ = socket.emit("check_alive_failed", &data.node_id);
        }
    }
}

async fn on_user_connect(socket: SocketRef, Data(_data): Data<Value>) {
    log::debug!("User notify connected: {:?} {:?}", &socket.ns(), socket.id);
    socket.on("auth", auth_user);
    socket.on("refresh_vjudge_account", handle_vjudge_verified);
    socket.on_disconnect(async |socket: SocketRef| {
       log::debug!("User notify disconnected: {:?} {:?}", socket.ns(), socket.id);
        env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap().remove(&socket.ns().to_string());
        env::USER_WEBSOCKET_CONNECTIONS_ACCOUNT.lock().unwrap().remove(&socket.ns().to_string());
    });
}

pub async fn service_start(port: u16) -> Result<()> {
    log::info!("VJudge Task server(with user.) will be started at ::{port}");
    let (layer, io) = SocketIo::new_layer();
    io.ns("/vjudge", on_connect);
    io.ns("/user_notify", on_user_connect);
    let cors = CorsLayer::new().allow_origin(AllowOrigin::any());
    let app = axum::Router::new()
        .route("/vjudge", get(|| async { "" }))
        .layer(layer)
        .layer(cors);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
    Ok(())

}