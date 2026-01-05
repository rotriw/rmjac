use crate::service::socket::service::check_auth;
use socketioxide::extract::{Data, SocketRef};
use macro_socket_auth::auth_socket_connect;
use crate::env::db::get_connect;
use crate::model::problem::CreateProblemProps;
use crate::model::vjudge::create_or_update_problem_from_vjudge;

#[auth_socket_connect]
async fn handle_problem_create(socket: SocketRef, Data(problem): Data<CreateProblemProps>) {
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
