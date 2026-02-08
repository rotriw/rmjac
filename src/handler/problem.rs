use crate::handler::ResultHandler;
use actix_web::{HttpRequest, Scope, post, web};
use rmjac_core::db::entity::edge::record::Column as RecordEdgeColumn;
use rmjac_core::graph::node::record::RecordStatus;
use rmjac_core::workflow::vjudge::VjudgeWorkflow;

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
    let task_value = task.into_inner();
    let service_name = match task_value.get("service_name").and_then(|v| v.as_str()) {
        Some(value) if !value.is_empty() => value.to_string(),
        _ => {
            return Ok(crate::Json! {
                "success": false,
                "error": "missing service_name",
            })
        }
    };
    let platform = match task_value.get("platform").and_then(|v| v.as_str()) {
        Some(value) if !value.is_empty() => value.to_string(),
        _ => {
            return Ok(crate::Json! {
                "success": false,
                "error": "missing platform",
            })
        }
    };
    let operation = match task_value.get("operation").and_then(|v| v.as_str()) {
        Some(value) if !value.is_empty() => value.to_string(),
        _ => {
            return Ok(crate::Json! {
                "success": false,
                "error": "missing operation",
            })
        }
    };
    let method = match task_value.get("method").and_then(|v| v.as_str()) {
        Some(value) if !value.is_empty() => value.to_string(),
        _ => {
            return Ok(crate::Json! {
                "success": false,
                "error": "missing method",
            })
        }
    };
    let task_id = task_value
        .get("task_id")
        .and_then(|v| v.as_str())
        .map(|v| v.to_string())
        .unwrap_or_else(|| format!("test-{}", chrono::Utc::now().timestamp()));
    let input = task_value
        .get("input")
        .cloned()
        .unwrap_or_else(|| task_value.clone());

    let workflow = VjudgeWorkflow::global().await;
    let response = workflow
        .dispatch_task(
            &task_id,
            &service_name,
            &platform,
            &operation,
            &method,
            input,
            None,
        )
        .await;

    Ok(crate::Json! {
        "success": response.success,
        "task_id": response.task_id,
        "error": response.error,
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
