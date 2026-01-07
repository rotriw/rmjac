use crate::service::socket::service::check_auth;
use socketioxide::extract::{Data, SocketRef};
use macro_socket_auth::auth_socket_connect;
use crate::env::db::get_connect;
use crate::model::problem::CreateProblemProps;
use crate::model::vjudge::VjudgeService;
use crate::utils::get_redis_connection;

#[auth_socket_connect]
async fn handle_problem_create(socket: SocketRef, Data(problem): Data<CreateProblemProps>) {
    log::debug!("Creating/Updating problem from socket {}.", socket.id);
    let db = get_connect().await;
    if let Err(err) = db {
        log::error!("Failed to connect to database: {}", err);
        return;
    }
    let db = db.unwrap();
    let mut redis = get_redis_connection();
    let mut store = (&db, &mut redis);

    if let Err(err) = VjudgeService::import_problem(&mut store, &problem).await {
        log::error!("Failed to create/update problem: {}", err);
    }
}