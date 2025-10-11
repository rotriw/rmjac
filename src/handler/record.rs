use actix_web::{delete, get, post, web, HttpResponse, Result as ActixResult, Scope, services};
use sea_orm::DatabaseConnection;

use core::{
    model::record::{
        create_record, get_records_by_statement, update_record_status, update_record_score,
        update_record_message, soft_delete_record, delete_records_for_statement, RecordNewProp,
    },
    graph::node::record::{RecordNode, RecordStatus},
    graph::node::Node,
};

#[derive(serde::Deserialize)]
struct CreateRecordRequest {
    platform: String,
    code: String,
    code_language: String,
    url: String,
    statement_node_id: i64,
    public_status: bool,
    track_service_id: i64,
}

#[post("/record")]
pub async fn create_record_handler(
    db: web::Data<DatabaseConnection>,
    req: web::Json<CreateRecordRequest>,
) -> ActixResult<HttpResponse> {
    let record_prop = RecordNewProp {
        platform: req.platform.clone(),
        code: req.code.clone(),
        code_language: req.code_language.clone(),
        url: req.url.clone(),
        statement_node_id: req.statement_node_id,
        public_status: req.public_status,
    };

    match create_record(&db, record_prop, req.track_service_id).await {
        Ok(record) => Ok(HttpResponse::Ok().json(record)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create record: {}", e)
        }))),
    }
}

#[get("/record/{node_id}")]
pub async fn get_record_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();

    match RecordNode::from_db(&db, node_id).await {
        Ok(record) => Ok(HttpResponse::Ok().json(record)),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Record not found: {}", e)
        }))),
    }
}

#[get("/records/statement/{statement_node_id}")]
pub async fn get_records_by_statement_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let statement_node_id = path.into_inner();

    match get_records_by_statement(&db, statement_node_id).await {
        Ok(records) => Ok(HttpResponse::Ok().json(records)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get records: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct UpdateRecordStatusRequest {
    status: i64,
}

#[post("/record/{node_id}/status")]
pub async fn update_record_status_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
    req: web::Json<UpdateRecordStatusRequest>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();
    let new_status = RecordStatus::from(req.status);

    match update_record_status(&db, node_id, new_status).await {
        Ok(record) => Ok(HttpResponse::Ok().json(record)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update record status: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct UpdateRecordScoreRequest {
    score: i64,
}

#[post("/record/{node_id}/score")]
pub async fn update_record_score_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
    req: web::Json<UpdateRecordScoreRequest>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();

    match update_record_score(&db, node_id, req.score).await {
        Ok(record) => Ok(HttpResponse::Ok().json(record)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update record score: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct UpdateRecordMessageRequest {
    message: Option<String>,
}

#[post("/record/{node_id}/message")]
pub async fn update_record_message_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
    req: web::Json<UpdateRecordMessageRequest>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();

    match update_record_message(&db, node_id, req.message.clone()).await {
        Ok(record) => Ok(HttpResponse::Ok().json(record)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update record message: {}", e)
        }))),
    }
}

#[delete("/record/{node_id}")]
pub async fn soft_delete_record_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();

    match soft_delete_record(&db, node_id).await {
        Ok(record) => Ok(HttpResponse::Ok().json(record)),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Failed to delete record: {}", e)
        }))),
    }
}

#[delete("/records/statement/{statement_node_id}")]
pub async fn delete_records_for_statement_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let statement_node_id = path.into_inner();

    match delete_records_for_statement(&db, statement_node_id).await {
        Ok(deleted_records) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Records deleted successfully",
            "deleted_count": deleted_records.len(),
            "deleted_records": deleted_records
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to delete records: {}", e)
        }))),
    }
}

#[get("/record/{node_id}/status")]
pub async fn get_record_status_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();

    match RecordNode::from_db(&db, node_id).await {
        Ok(record) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "status": record.public.record_status.to_string(),
            "status_code": i64::from(record.public.record_status)
        }))),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Record not found: {}", e)
        }))),
    }
}

#[get("/records/status/all")]
pub async fn get_all_record_statuses_handler() -> ActixResult<HttpResponse> {
    use core::graph::node::record::RecordStatus;

    let statuses = vec![
        serde_json::json!({
            "name": RecordStatus::Accepted.to_string(),
            "code": i64::from(RecordStatus::Accepted),
            "description": "Solution is correct"
        }),
        serde_json::json!({
            "name": RecordStatus::PartialAccepted.to_string(),
            "code": i64::from(RecordStatus::PartialAccepted),
            "description": "Solution is partially correct"
        }),
        serde_json::json!({
            "name": RecordStatus::WrongAnswer.to_string(),
            "code": i64::from(RecordStatus::WrongAnswer),
            "description": "Solution is incorrect"
        }),
        serde_json::json!({
            "name": RecordStatus::TimeLimitExceeded.to_string(),
            "code": i64::from(RecordStatus::TimeLimitExceeded),
            "description": "Solution took too long"
        }),
        serde_json::json!({
            "name": RecordStatus::MemoryLimitExceeded.to_string(),
            "code": i64::from(RecordStatus::MemoryLimitExceeded),
            "description": "Solution used too much memory"
        }),
        serde_json::json!({
            "name": RecordStatus::OutputLimitExceeded.to_string(),
            "code": i64::from(RecordStatus::OutputLimitExceeded),
            "description": "Solution produced too much output"
        }),
        serde_json::json!({
            "name": RecordStatus::RuntimeError.to_string(),
            "code": i64::from(RecordStatus::RuntimeError),
            "description": "Solution crashed during execution"
        }),
        serde_json::json!({
            "name": RecordStatus::CompileError.to_string(),
            "code": i64::from(RecordStatus::CompileError),
            "description": "Solution failed to compile"
        }),
        serde_json::json!({
            "name": RecordStatus::DangerousCode.to_string(),
            "code": i64::from(RecordStatus::DangerousCode),
            "description": "Solution contains potentially harmful code"
        }),
        serde_json::json!({
            "name": RecordStatus::RemoteServiceUnknownError.to_string(),
            "code": i64::from(RecordStatus::RemoteServiceUnknownError),
            "description": "Remote judge service error"
        }),
        serde_json::json!({
            "name": RecordStatus::SandboxError.to_string(),
            "code": i64::from(RecordStatus::SandboxError),
            "description": "Sandbox execution error"
        }),
        serde_json::json!({
            "name": RecordStatus::RemotePlatformRefused.to_string(),
            "code": i64::from(RecordStatus::RemotePlatformRefused),
            "description": "Remote platform rejected submission"
        }),
        serde_json::json!({
            "name": RecordStatus::RemotePlatformConnectionFailed.to_string(),
            "code": i64::from(RecordStatus::RemotePlatformConnectionFailed),
            "description": "Could not connect to remote platform"
        }),
        serde_json::json!({
            "name": RecordStatus::RemotePlatformUnknownError.to_string(),
            "code": i64::from(RecordStatus::RemotePlatformUnknownError),
            "description": "Unknown remote platform error"
        }),
        serde_json::json!({
            "name": RecordStatus::Waiting.to_string(),
            "code": i64::from(RecordStatus::Waiting),
            "description": "Submission is waiting to be judged"
        }),
        serde_json::json!({
            "name": RecordStatus::UnknownError.to_string(),
            "code": i64::from(RecordStatus::UnknownError),
            "description": "Unknown error occurred"
        }),
        serde_json::json!({
            "name": RecordStatus::Unverified.to_string(),
            "code": i64::from(RecordStatus::Unverified),
            "description": "Submission has not been verified"
        }),
        serde_json::json!({
            "name": RecordStatus::Deleted.to_string(),
            "code": i64::from(RecordStatus::Deleted),
            "description": "Submission has been deleted"
        }),
    ];

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "statuses": statuses
    })))
}

#[get("/records/public")]
pub async fn get_public_records_handler(
    db: web::Data<DatabaseConnection>,
) -> ActixResult<HttpResponse> {
    use sea_orm::{ColumnTrait, QueryFilter, EntityTrait};
    use core::db::entity::node::record::Entity;
    use core::db::entity::node::record::Column;

    match Entity::find()
        .filter(Column::PublicStatus.eq(true))
        .filter(Column::RecordStatus.ne(i64::from(RecordStatus::Deleted)))
        .all(&**db)
        .await
    {
        Ok(records) => {
            let record_nodes: Vec<RecordNode> = records
                .into_iter()
                .map(|model| model.into())
                .collect();
            Ok(HttpResponse::Ok().json(record_nodes))
        },
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to get public records: {}", e)
        }))),
    }
}

pub fn service() -> Scope {
    let service = services![
        create_record_handler,
        get_record_handler,
        get_records_by_statement_handler,
        update_record_status_handler,
        update_record_score_handler,
        update_record_message_handler,
        soft_delete_record_handler,
        delete_records_for_statement_handler,
        get_record_status_handler,
        get_all_record_statuses_handler,
        get_public_records_handler
    ];
    web::scope("/api/record").service(service)
}