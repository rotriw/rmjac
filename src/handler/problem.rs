use crate::handler::ResultHandler;
use actix_web::{HttpRequest, Scope, post, web};
use rmjac_core::db::entity::edge::record::Column as RecordEdgeColumn;
use rmjac_core::graph::node::record::RecordStatus;

// Handler modules
pub mod create;
pub mod list;
pub mod manage;
pub mod view;

// Test Handler
#[post("/test/add_task")]
pub async fn test_add_task(
    _req: HttpRequest,
    task: web::Json<serde_json::Value>,
) -> ResultHandler<String> {
    use rmjac_core::service::socket::service::add_task;
    let success = add_task(&task.into_inner()).await;
    Ok(Json! {
        "success": success,
    })
}

pub fn service() -> Scope {
    web::scope("/api/problem")
        .service(view::handler::export_http_service())
        .service(manage::handler::export_http_service())
        .service(create::handler::export_http_service())
        .service(list::handler::export_http_service())
        .service(test_add_task)
}
