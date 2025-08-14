use std::fmt::Debug;
use serde::Serialize;
use socketioxide::extract::{SocketRef, Data};
use socketioxide::SocketIo;
use serde_json::Value;
use totp_rs::{Algorithm, Secret, TOTP};
use macro_socket_auth::auth_socket_connect;
use crate::{env, Result};

async fn auth(socket: SocketRef, Data(key): Data<String>) {
    log::info!("{} auth message: {:?}", socket.id, key);
    let totp = TOTP::new(
        Algorithm::SHA1,
        12,
        1,
        30,
        Secret::Encoded(env::EDGE_AUTH.lock().unwrap().clone()).to_bytes().unwrap()
    );
    if let Err(err) = totp {
        return ;
    }
    let totp = totp.unwrap();
    if let Ok(x) = totp.check_current(&key) && x {
        log::info!("{} auth success: {:?}", socket.id, x);
    } else {
        log::info!("Invalid TOTP key: {}", key);
        return ;
    }
    env::EDGE_AUTH_MAP.lock().unwrap().entry(socket.id.to_string()).or_insert(1);
    env::EDGE_SOCKETS.lock().unwrap().entry(socket.id.to_string()).or_insert(socket.clone());
    env::EDGE_VEC.lock().unwrap().push(socket.id.to_string());
    socket.emit("auth_response", "Authentication successful");
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

#[auth_socket_connect]
async fn update_status(Data(key): Data<String>) {
    // todo
}

#[auth_socket_connect]
async fn create_problem(Data(key): Data<String>) {
    // todo
}



fn erase_socket(socket: &SocketRef) {
    log::info!("Erasing socket: {}", socket.id);
    env::EDGE_SOCKETS.lock().unwrap().remove(&socket.id.to_string());
    env::EDGE_VEC.lock().unwrap().retain(|id| id != &socket.id.to_string());
}

pub async fn add_task<T: ?Sized + Serialize + Debug>(task: &T) -> bool {
    let now_id = *env::EDGE_NUM.lock().unwrap();
    if env::EDGE_SOCKETS.lock().unwrap().len() == 0 {
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
            erase_socket(&socket);
            return false;
        }
    } else {
        log::error!("Socket not found for id: {}", use_id);
        return false;
    }
    log::info!("successfully added task {task:?} to socket: {use_id}");
    true
}

async fn on_connect(socket: SocketRef, Data(data): Data<Value>) {
    log::info!("socket io connected: {:?} {:?}", socket.ns(), socket.id);
    socket.on("auth", auth);
    socket.on("update_status", update_status);
    socket.on("create_problem", create_problem);
}

#[tokio::main]
pub async fn service_start(port: i8) -> Result<()> {
    log::info!("VJudge Task server will be started at ::{port}");
    let (layer, io) = SocketIo::new_layer();
    io.ns("/", on_connect);
    Ok(())
}