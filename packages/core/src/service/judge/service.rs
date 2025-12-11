use std::fmt::Debug;
use axum::routing::get;
use serde::{Deserialize, Serialize};
use socketioxide::extract::{SocketRef, Data};
use socketioxide::SocketIo;
use serde_json::Value;
use macro_socket_auth::auth_socket_connect;
use tower_http::cors::{AllowOrigin, CorsLayer};
use crate::model::vjudge::verified_account;
use crate::{env, Result};
use crate::env::db::get_connect;
use crate::model::problem::CreateProblemProps;
use crate::model::user::check_user_token;
use crate::utils::encrypt::change_string_format;
use crate::model::vjudge::{create_or_update_problem_from_vjudge, update_user_submission_from_vjudge, UserSubmissionProp};

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

fn check_auth(socket: SocketRef) -> bool {
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

#[auth_socket_connect]
async fn update_status(socket: SocketRef, Data(_key): Data<String>) {
    // todo
}

#[auth_socket_connect]
async fn create_problem_back(socket: SocketRef, Data(problem): Data<serde_json::Value>) {
    let problem = serde_json::from_value::<CreateProblemProps>(problem).unwrap();
    log::debug!("Creating/Updating problem from socket {}.", socket.id);
    let db = get_connect().await;
    if let Err(err) = db {
        log::error!("Failed to connect to database: {}", err);
        return;
    }
    let db = db.unwrap();
    
    if let Err(err) = create_or_update_problem_from_vjudge(&db, &problem).await {
        log::error!("Failed to create/update problem: {}", err);
    }
}


#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct VerifiedResultProp {
    pub user_id: i64,
    pub result: bool,
    pub ws_id: String,

}

#[auth_socket_connect]
async fn handle_verified_result(socket: SocketRef, Data(result): Data<VerifiedResultProp>) {
    let user_socket =  {
        let data = env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap();
        data.get(&result.ws_id).cloned()
    };
    if result.result {
        let db = get_connect().await;
        if let Err(err) = db {
            log::error!("Failed to connect to database: {}", err);
            if let Some(user_socket) = user_socket {
                let _ = user_socket.emit("vjudge_account_verified", "0Failed to connect to database, please retry.");
            }
            return;
        }
        let db = db.unwrap();
        let x = verified_account(&db, result.user_id).await;
        if let Err(err) = x {
            if let Some(user_socket) = &user_socket {
                let _ = user_socket.emit("vjudge_account_verified", &format!("0Failed to verify account, please retry. {:?}", err));
            }
        }
        if let Some(user_socket) = &user_socket {
            let _ = user_socket.emit("vjudge_account_verified", "1Account verified successfully.");
        }
    } else {
        if let Some(user_socket) = &user_socket {
            let _ = user_socket.emit("vjudge_account_verified", "0Account verified Failed.");
        }
    }
}

#[auth_socket_connect]
async fn update_user_submission_back(socket: SocketRef, Data(data): Data<UserSubmissionProp>) {
    log::debug!("Updating user submission from socket {}.", socket.id);
    let db = get_connect().await;
    if let Err(err) = db {
        log::error!("Failed to connect to database: {}", err);
        return;
    }
    let db = db.unwrap();
    
    if let Err(err) = update_user_submission_from_vjudge(&db, data).await {
        log::error!("Failed to update user submissions: {}", err);
    }
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
    socket.on("update_status", update_status);
    socket.on("create_problem", create_problem_back);
    socket.on("update_user_submission", update_user_submission_back);
    socket.on("verified_done", handle_verified_result);
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
    let result = check_user_token(user.user_id, &user.token).await;
    if !result {
        let _ = socket.disconnect();
    }
    else {
        log::debug!("User {} authenticated successfully", user.user_id);
        env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap().insert(socket.ns().to_string(), socket.clone());
    }
}

async fn on_user_connect(socket: SocketRef, Data(_data): Data<Value>) {
    log::debug!("User notify connected: {:?} {:?}", &socket.ns(), socket.id);
    socket.on("auth", auth_user);
    socket.on_disconnect(async |socket: SocketRef| {
       log::debug!("User notify disconnected: {:?} {:?}", socket.ns(), socket.id);
        env::USER_WEBSOCKET_CONNECTIONS.lock().unwrap().remove(&socket.ns().to_string());
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