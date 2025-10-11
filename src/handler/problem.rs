use actix_web::{delete, get, post, web, HttpResponse, Result as ActixResult, Scope, services};
use sea_orm::DatabaseConnection;

use core::{
    model::problem::{
        create_problem, get_problem, get_problem_model, modify_problem_statement,
        modify_problem_statement_source, refresh_problem_node_cache, CreateProblemProps,
        delete_problem_connections, remove_statement_from_problem, remove_tag_from_problem,
    },
    service::iden::get_node_ids_from_iden,
    graph::action::get_node_type,
};

// Helper function to get Redis connection
fn get_redis_connection() -> redis::Connection {
    core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap()
}

#[derive(serde::Deserialize)]
struct CreateProblemRequest {
    problem_iden: String,
    problem_name: String,
    problem_statement: Vec<core::model::problem::ProblemStatementProp>,
    creation_time: Option<chrono::NaiveDateTime>,
    tags: Vec<String>,
}

#[post("/")]
pub async fn create_problem_handler(
    db: web::Data<DatabaseConnection>,
    req: web::Json<CreateProblemRequest>,
) -> ActixResult<HttpResponse> {
    let problem_props = CreateProblemProps {
        problem_iden: req.problem_iden.clone(),
        problem_name: req.problem_name.clone(),
        problem_statement: req.problem_statement.clone(),
        creation_time: req.creation_time,
        tags: req.tags.clone(),
    };

    match create_problem(&db, problem_props).await {
        Ok(problem) => Ok(HttpResponse::Ok().json(problem)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create problem: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct CreateProblemWithTokenRequest {
    problem_iden: String,
    problem_name: String,
    problem_statement: Vec<core::model::problem::ProblemStatementProp>,
    creation_time: Option<chrono::NaiveDateTime>,
    tags: Vec<String>,
    token: String,
}

#[post("/with-token")]
pub async fn create_problem_with_token_handler(
    db: web::Data<DatabaseConnection>,
    req: web::Json<CreateProblemWithTokenRequest>,
) -> ActixResult<HttpResponse> {
    let problem_props = core::model::problem::CreateProblemProps {
        problem_iden: req.problem_iden.clone(),
        problem_name: req.problem_name.clone(),
        problem_statement: req.problem_statement.clone(),
        creation_time: req.creation_time,
        tags: req.tags.clone(),
    };

    match core::model::problem::create_problem_with_token(&db, problem_props, &req.token).await {
        Ok(problem) => Ok(HttpResponse::Ok().json(problem)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create problem with token: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct GrantProblemAccessRequest {
    user_iden: String,
    problem_iden: String,
    can_view_private: bool,
}

#[post("/grant-access")]
pub async fn grant_problem_access_handler(
    db: web::Data<DatabaseConnection>,
    req: web::Json<GrantProblemAccessRequest>,
) -> ActixResult<HttpResponse> {
    let mut redis = get_redis_connection();

    // 获取用户和题目节点ID
    let user_node_ids = match get_node_ids_from_iden(&req.user_iden, &db, &mut redis).await {
        Ok(ids) => ids,
        Err(_) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to find user"
        }))),
    };

    let problem_node_ids = match get_node_ids_from_iden(&req.problem_iden, &db, &mut redis).await {
        Ok(ids) => ids,
        Err(_) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to find problem"
        }))),
    };

    if user_node_ids.is_empty() || problem_node_ids.is_empty() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "User or problem not found"
        })));
    }

    match core::model::problem::grant_problem_access(
        &db,
        user_node_ids[0],
        problem_node_ids[0],
        req.can_view_private,
    ).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Problem access granted successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to grant problem access: {}", e)
        }))),
    }
}

#[get("/{iden}")]
pub async fn get_problem_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
) -> ActixResult<HttpResponse> {
    let iden = path.into_inner();
    log::debug!("get_problem_handler iden: {}", &iden);
    let mut redis = get_redis_connection();

    match get_problem(&db, &mut redis, &iden).await {
        Ok((problem_model, _)) => Ok(HttpResponse::Ok().json(problem_model)),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Problem not found: {}", e)
        }))),
    }
}

#[get("/{iden}/check-permission")]
pub async fn check_problem_permission_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>, // (iden, user_node_id)
) -> ActixResult<HttpResponse> {
    let (iden, user_node_id_str) = path.into_inner();
    log::debug!("check_problem_permission_handler iden: {}, user_node_id: {}", &iden, &user_node_id_str);

    let user_node_id = match user_node_id_str.parse::<i64>() {
        Ok(id) => id,
        Err(_) => return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid user_node_id"
        }))),
    };

    let mut redis = get_redis_connection();

    // 首先获取题目
    match get_problem(&db, &mut redis, &iden).await {
        Ok((problem_model, _)) => {
            // 检查用户是否有题目访问权限
            match core::model::problem::check_problem_permission(
                &db,
                user_node_id,
                problem_model.problem_node.node_id,
                core::graph::edge::perm_view::ViewPerm::ReadProblem,
            ).await {
                Ok(true) => Ok(HttpResponse::Ok().json(serde_json::json!({
                    "has_permission": true,
                    "message": "User has permission to access this problem"
                }))),
                Ok(false) => Ok(HttpResponse::Forbidden().json(serde_json::json!({
                    "has_permission": false,
                    "message": "User does not have permission to access this problem"
                }))),
                Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to check permission: {}", e)
                }))),
            }
        },
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Problem not found: {}", e)
        }))),
    }
}

#[get("/node/{node_id}")]
pub async fn get_problem_by_node_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();
    let mut redis = get_redis_connection();

    match get_problem_model(&db, &mut redis, node_id).await {
        Ok(problem_model) => Ok(HttpResponse::Ok().json(problem_model)),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Problem not found: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct ModifyProblemStatementRequest {
    content: Vec<core::db::entity::node::problem_statement::ContentType>,
}

#[post("/statement/{node_id}/content")]
pub async fn modify_problem_statement_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
    req: web::Json<ModifyProblemStatementRequest>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();
    let mut redis = get_redis_connection();

    match modify_problem_statement(&db, &mut redis, node_id, req.content.clone()).await {
        Ok(statement) => Ok(HttpResponse::Ok().json(statement)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to modify problem statement: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct ModifyProblemStatementSourceRequest {
    source: String,
}

#[post("/statement/{node_id}/source")]
pub async fn modify_problem_statement_source_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
    req: web::Json<ModifyProblemStatementSourceRequest>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();
    let mut redis = get_redis_connection();

    match modify_problem_statement_source(&db, &mut redis, node_id, req.source.clone()).await {
        Ok(statement) => Ok(HttpResponse::Ok().json(statement)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to modify problem statement source: {}", e)
        }))),
    }
}

#[post("/node/{node_id}/refresh_cache")]
pub async fn refresh_problem_cache_handler(
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();
    let mut redis = get_redis_connection();

    match refresh_problem_node_cache(&mut redis, node_id).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Cache refreshed successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to refresh cache: {}", e)
        }))),
    }
}

#[delete("/{iden}")]
pub async fn delete_problem_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
) -> ActixResult<HttpResponse> {
    let iden = path.into_inner();
    let mut redis = get_redis_connection();

    match delete_problem_connections(&db, &mut redis, &iden).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Problem connections deleted successfully"
        }))),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Failed to delete problem: {}", e)
        }))),
    }
}

#[delete("/{problem_node_id}/statement/{statement_node_id}")]
pub async fn remove_statement_from_problem_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<(i64, i64)>,
) -> ActixResult<HttpResponse> {
    let (problem_node_id, statement_node_id) = path.into_inner();
    let mut redis = get_redis_connection();

    match remove_statement_from_problem(&db, &mut redis, problem_node_id, statement_node_id).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Statement removed from problem successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to remove statement: {}", e)
        }))),
    }
}

#[delete("/{problem_node_id}/tag/{tag_node_id}")]
pub async fn remove_tag_from_problem_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<(i64, i64)>,
) -> ActixResult<HttpResponse> {
    let (problem_node_id, tag_node_id) = path.into_inner();
    let mut redis = get_redis_connection();

    match remove_tag_from_problem(&db, &mut redis, problem_node_id, tag_node_id).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Tag removed from problem successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to remove tag: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct GetProblemNodeIdsRequest {
    iden: String,
}

#[post("/node_ids")]
pub async fn get_problem_node_ids_handler(
    db: web::Data<DatabaseConnection>,
    req: web::Json<GetProblemNodeIdsRequest>,
) -> ActixResult<HttpResponse> {
    let mut redis = get_redis_connection();

    match get_node_ids_from_iden(&req.iden, &db, &mut redis).await {
        Ok(node_ids) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "node_ids": node_ids
        }))),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Node IDs not found: {}", e)
        }))),
    }
}

#[get("/problem/node/{node_id}/type")]
pub async fn get_node_type_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();

    match get_node_type(&db, node_id).await {
        Ok(node_type) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "node_type": node_type
        }))),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Node type not found: {}", e)
        }))),
    }
}

#[get("/problems")]
pub async fn get_all_problems_handler(
    db: web::Data<DatabaseConnection>,
) -> ActixResult<HttpResponse> {
    use sea_orm::{EntityTrait, QueryOrder};
    use core::model::problem::get_problem_model;
    use core::db::entity::node::problem::Entity as ProblemEntity;

    let mut redis = get_redis_connection();

    match ProblemEntity::find()
        .order_by_asc(core::db::entity::node::problem::Column::CreationOrder)
        .all(&**db)
        .await
    {
        Ok(problems) => {
            let mut problem_list = Vec::new();

            for problem in problems {
                // Use existing get_problem_model function to get full problem data
                match get_problem_model(&**db, &mut redis, problem.node_id).await {
                    Ok(problem_model) => {
                        // Extract tags
                        let tags: Vec<String> = problem_model.tag.iter()
                            .map(|tag| tag.public.tag_name.clone())
                            .collect();

                        // Get first statement and limit for basic info
                        let (time_limit, memory_limit) = if let Some((_statement, limit)) = problem_model.problem_statement_node.first() {
                            (limit.public.time_limit, limit.public.memory_limit)
                        } else {
                            (1000, 256) // default values
                        };

                        // Determine difficulty based on time limit and memory limit
                        let difficulty = if time_limit <= 1000 && memory_limit <= 256 {
                            "入门"
                        } else if time_limit <= 2000 && memory_limit <= 512 {
                            "简单"
                        } else if time_limit <= 3000 && memory_limit <= 1024 {
                            "中等"
                        } else if time_limit <= 5000 && memory_limit <= 2048 {
                            "困难"
                        } else {
                            "极限"
                        };

                        // Create problem ID like P1001, P1002 etc. based on creation_order
                        let problem_id = format!("P{:04}", problem.creation_order);

                        let problem_data = serde_json::json!({
                            "id": problem_id,
                            "node_id": problem.node_id,
                            "name": problem_model.problem_node.public.name,
                            "description": format!("题目 {}", problem_model.problem_node.public.name),
                            "difficulty": difficulty,
                            "tags": tags,
                            "timeLimit": format!("{}s", time_limit / 1000),
                            "memoryLimit": format!("{}MB", memory_limit),
                            "submissionCount": 0, // TODO: implement submission tracking
                            "acceptedCount": 0,   // TODO: implement submission tracking
                            "creationTime": problem_model.problem_node.public.creation_time.format("%Y-%m-%d").to_string(),
                            "status": "published" // TODO: implement status tracking
                        });

                        problem_list.push(problem_data);
                    },
                    Err(e) => {
                        log::error!("Failed to get problem model for node_id {}: {}", problem.node_id, e);
                        // Skip this problem and continue with others
                        continue;
                    }
                }
            }

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "problems": problem_list,
                "total": problem_list.len()
            })))
        },
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch problems: {}", e)
        }))),
    }
}

pub fn service() -> Scope {
    let service1 = services![
        create_problem_handler,
        create_problem_with_token_handler,
        grant_problem_access_handler,
        get_problem_handler,
        check_problem_permission_handler,
        get_problem_by_node_handler,
        modify_problem_statement_handler,
        modify_problem_statement_source_handler,
        refresh_problem_cache_handler,
    ];

    let service2 = services![
        delete_problem_handler,
        remove_statement_from_problem_handler,
        remove_tag_from_problem_handler,
        get_problem_node_ids_handler,
        get_node_type_handler,
        get_all_problems_handler
    ];

    web::scope("/api/problem")
        .service(service1)
        .service(service2)
}