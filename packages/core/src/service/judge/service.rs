use std::fmt::Debug;
use axum::http::HeaderValue;
use axum::routing::get;
use serde::{Deserialize, Serialize};
use socketioxide::extract::{SocketRef, Data};
use socketioxide::SocketIo;
use serde_json::Value;
use totp_rs::{Algorithm, Secret, TOTP};
use macro_socket_auth::auth_socket_connect;
use tower_http::cors::{AllowOrigin, CorsLayer};
use crate::{env, Result};
use crate::env::db::get_connect;
use crate::model::problem::{create_problem, CreateProblemProps};
use crate::utils::encrypt::change_string_format;

fn trust_auth(socket: &SocketRef) {
    log::info!("Socket {} authenticated successfully", socket.id);
    env::EDGE_AUTH_MAP.lock().unwrap().entry(socket.id.to_string()).or_insert(1);
    env::EDGE_SOCKETS.lock().unwrap().entry(socket.id.to_string()).or_insert(socket.clone());
    env::EDGE_VEC.lock().unwrap().push(socket.id.to_string());
}

async fn auth(socket: SocketRef, Data(key): Data<String>) {
    log::info!("{} auth", socket.id);
    log::debug!("auth key: {}", key);
    use crate::utils::encrypt::verify;
    let key = change_string_format(key);
    let pub_key = env::EDGE_AUTH_PUBLICKEY.lock().unwrap().clone();
    let auth = verify(pub_key, key, socket.id.to_string());
    if let Ok(auth) = auth {
        if auth == false {
            log::error!("Wrong sign code! private key LEAK?");
            socket.emit("auth_response", "Authentication Error");
            return ;
        }
    } else {
        log::info!("{} auth error: {:?}", socket.id, auth);
        socket.emit("auth_response", "Authentication Error/Failed");
        return ;
    }
    trust_auth(&socket);
    let _ = socket.emit("auth_response", "Authentication successful");
}

fn check_auth(socket: SocketRef) -> bool {
    if let Some(auth_count) = env::EDGE_AUTH_MAP.lock().unwrap().get(&socket.id.to_string()) {
        log::trace!("{} auth success: {:?}", socket.id, auth_count);
        if *auth_count > 0 {
            return true;
        }
    }
    log::warn!("Socket {} is not authenticated", socket.id);
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
async fn create_problem_back(socket: SocketRef, Data(problem): Data<String>) {
    let problem: CreateProblemProps = match serde_json::from_str(&problem) {
        Ok(p) => p,
        Err(err) => {
            socket.emit("create_problem_response", format!("Failed to parse problem data: {}", err).as_str()).unwrap_or(());
            log::error!("Failed to parse problem data: {}", err);
            return;
        }
    };
    log::info!("Creating problem from socket {}.", socket.id);
    let db = get_connect().await;
    if let Err(err) = db {
        log::error!("Failed to connect to database: {}", err);
        return;
    }
    let db = db.unwrap();
    let result = create_problem(&db, problem.clone()).await;
    if let Err(err) = result {
        log::error!("Failed to create problem: {}", err);
        return;
    }
    let problem = result.unwrap();
    // let data_id = socket_id;
    // log::info!("Problem created from({}) successfully: {:?}", data_id, problem);
    drop(problem);

}

fn erase_socket(socket: &SocketRef) {
    log::info!("Erasing socket: {}", socket.id);
    env::EDGE_SOCKETS.lock().unwrap().remove(&socket.id.to_string());
    env::EDGE_VEC.lock().unwrap().retain(|id| id != &socket.id.to_string());
}

pub async fn add_task<T: ?Sized + Serialize + Debug>(task: &T) -> bool {
    let now_id = *env::EDGE_NUM.lock().unwrap();
    if env::EDGE_SOCKETS.lock().unwrap().is_empty() {
        log::error!("No edge sockets available to add task.");
        return false;
    }
    let use_id = (now_id + 1) % (env::EDGE_SOCKETS.lock().unwrap().len() as i32);
    *env::EDGE_NUM.lock().unwrap() = use_id;
    let use_id = env::EDGE_VEC.lock().unwrap().get(use_id as usize).unwrap().clone();
    log::info!("add task to socket: {}", use_id);
    if let Some(socket) = env::EDGE_SOCKETS.lock().unwrap().get(&use_id) {
        if let Err(err) = socket.emit("task", task) {
            log::error!("Failed to emit task: {}", err);
            // erase this socket.
            erase_socket(socket);
            return false;
        }
    } else {
        log::error!("Socket not found for id: {}", use_id);
        return false;
    }
    log::info!("successfully added task {task:?} to socket: {use_id}");
    true
}

async fn on_connect(socket: SocketRef, Data(_data): Data<Value>) {
    log::info!("socket io connected: {:?} {:?}", socket.ns(), socket.id);
    socket.on("auth", auth);
    socket.on("update_status", update_status);
    socket.on("create_problem", create_problem_back);
}


pub async fn service_start(port: u16) -> Result<()> {
    log::info!("VJudge Task server will be started at ::{port}");
    let (layer, io) = SocketIo::new_layer();
    io.ns("/", on_connect);
    let cors = CorsLayer::new().allow_origin(AllowOrigin::any());
    let app = axum::Router::new()
        .route("/", get(|| async { "" }))
        .layer(layer)
        .layer(cors);
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await.unwrap();
    axum::serve(listener, app).await.unwrap();
    Ok(())

}