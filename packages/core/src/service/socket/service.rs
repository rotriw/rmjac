use crate::Result;
use crate::env;
use crate::env::db::get_connect;
use crate::model::user::UserAuthService;
use crate::model::vjudge::VjudgeAccount;
use crate::utils::encrypt::change_string_format;
use axum::routing::get;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use socketioxide::SocketIo;
use socketioxide::extract::{Data, SocketRef};
use std::fmt::Debug;
use tower_http::cors::{AllowOrigin, CorsLayer};
use crate::service::socket::workflow::{WorkflowServiceRegistrationMessage, WorkflowServiceUnregistrationMessage, register_workflow_services, unregister_workflow_services, deregister_workflow_socket};
use crate::workflow::vjudge::VjudgeWorkflowRegistry;
use macro_socket_auth::auth_socket_connect;

fn trust_auth(socket: &SocketRef) {
    let edge_count = env::EDGE_SOCKETS.lock().unwrap().len();
    log::info!(
        "[VJudge:Socket] Socket {} authenticated successfully (total edge sockets: {})",
        socket.id, edge_count + 1
    );
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

fn service_key(platform: &str, operation: &str, method: &str) -> String {
    format!("{}:{}:{}", platform.to_lowercase(), operation, method.to_lowercase())
}

fn extract_service_key<T: ?Sized + Serialize>(task: &T) -> Option<String> {
    let value = serde_json::to_value(task).ok()?;
    let value = match value {
        Value::String(text) => serde_json::from_str::<Value>(&text).ok()?,
        other => other,
    };
    let obj = value.as_object()?;
    let platform = obj.get("platform")?.as_str()?;
    let operation = obj.get("operation")?.as_str()?;
    let method = obj
        .get("method")
        .and_then(|value| value.as_str())
        .unwrap_or("");
    Some(service_key(platform, operation, method))
}

fn deregister_socket_services(socket_id: &str) {
    let workflow = VjudgeWorkflowRegistry::default();
    workflow.remove_socket_registration(socket_id);
}

async fn auth(socket: SocketRef, Data(key): Data<String>) {
    log::info!("[VJudge:Socket] Received 'auth' from socket {}", socket.id);
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
    deregister_socket_services(id);
    log::debug!("Socket {} erased.", id);
}

use crate::model::vjudge::platform::{
    EdgePlatformFieldInfo, EdgePlatformInfo, EdgePlatformMethodInfo, EdgeServiceRegisterItem,
};

#[auth_socket_connect]
async fn handle_register_services(socket: SocketRef, Data(items): Data<Vec<EdgeServiceRegisterItem>>) {
    let mut keys = vec![];
    for item in items {
        let method = item.method.unwrap_or_default();
        keys.push(service_key(&item.platform, &item.operation, &method));
    }

    let socket_id = socket.id.to_string();
    deregister_socket_services(&socket_id);

    if !keys.is_empty() {
        let workflow = VjudgeWorkflowRegistry::default();
        workflow.register_remote_service_keys(&socket_id, keys.clone());
    }
    log::info!("[VJudge:Socket] Received 'register_services' from socket {}: registered keys", socket_id);
}

#[auth_socket_connect]
async fn handle_workflow_service_register(
    socket: SocketRef,
    Data(message): Data<WorkflowServiceRegistrationMessage>,
) {
    let service_names: Vec<String> = message.services.iter().map(|s| {
        format!("{}:{}:{}", s.platform, s.operation, s.method)
    }).collect();
    log::info!(
        "[VJudge:Socket] Received 'workflow_service_register' from socket {}: {} services = {:?}",
        socket.id,
        message.services.len(),
        service_names
    );
    register_workflow_services(&socket.id.to_string(), &message.services).await;
}

#[auth_socket_connect]
async fn handle_workflow_service_unregister(
    socket: SocketRef,
    Data(message): Data<WorkflowServiceUnregistrationMessage>,
) {
    log::info!(
        "[VJudge:Socket] Received 'workflow_service_unregister' from socket {}: {:?}",
        socket.id,
        message.service_names
    );
    unregister_workflow_services(&socket.id.to_string(), &message.service_names).await;
}

async fn on_connect(socket: SocketRef, Data(_data): Data<Value>) {
    log::info!(
        "[VJudge:Socket] === NEW CONNECTION === ns={:?}, socket_id={:?}, transport={:?}",
        socket.ns(), socket.id, socket.transport_type()
    );
    socket.on("auth", auth);
    socket.on("register_services", handle_register_services);
    socket.on("workflow_service_register", handle_workflow_service_register);
    socket.on("workflow_service_unregister", handle_workflow_service_unregister);

    socket.on_disconnect(async |socket: SocketRef| {
        log::info!("[VJudge:Socket] === DISCONNECTED === ns={:?}, socket_id={:?}", socket.ns(), socket.id);
        deregister_workflow_socket(socket.ns()).await;
        erase_socket(socket.id.as_str());
    });
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
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
        return;
    }
    let result = UserAuthService::check_token(user.user_id, &user.token).await;
    if !result {
        log::trace!("User {} authentication failed", user.user_id);
        let _ = socket.disconnect();
    } else {
        log::debug!(
            "User {} with socket {} authenticated successfully",
            user.user_id,
            socket.id
        );
        env::USER_WEBSOCKET_CONNECTIONS
            .lock()
            .unwrap()
            .insert(socket.id.to_string(), socket.clone());
        env::USER_WEBSOCKET_CONNECTIONS_ACCOUNT
            .lock()
            .unwrap()
            .insert(socket.id.to_string(), user.user_id);
    }
}

#[derive(Deserialize, Serialize, Debug, Clone, ts_rs::TS)]
#[ts(export)]
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
    let db = db.unwrap();
    let _user_id = {
        let data = env::USER_WEBSOCKET_CONNECTIONS_ACCOUNT.lock().unwrap();
        data.get(&socket.id.to_string()).cloned()
    };
    {
        if VjudgeAccount::new(data.node_id)
            .verify(&db, &socket.id.to_string())
            .await
        {
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
        log::debug!(
            "User notify disconnected: {:?} {:?}",
            socket.ns(),
            socket.id
        );
        env::USER_WEBSOCKET_CONNECTIONS
            .lock()
            .unwrap()
            .remove(&socket.ns().to_string());
        env::USER_WEBSOCKET_CONNECTIONS_ACCOUNT
            .lock()
            .unwrap()
            .remove(&socket.ns().to_string());
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
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .unwrap();
    axum::serve(listener, app).await.unwrap();
    Ok(())
}
