use actix_web::{delete, get, post, web, HttpResponse, Result as ActixResult, Scope, services};
use sea_orm::DatabaseConnection;
use chrono::NaiveDateTime;

use core::{
    model::training::{
        create_training, delete_training_connections, remove_problem_from_training,
        remove_problem_from_training_by_node_id, get_training, add_problem_into_training_list,
    },
    service::iden::get_node_ids_from_iden,
    graph::action::get_node_type,
    graph::node::training::TrainingNode,
    graph::node::Node,
};

#[derive(serde::Deserialize)]
struct CreateTrainingRequest {
    title: String,
    user_iden: String,
    pb_iden: String,
    description_public: String,
    description_private: String,
    start_time: NaiveDateTime,
    end_time: NaiveDateTime,
    training_type: String,
    problem_list: core::model::training::TrainingList,
    write_perm_user: Vec<i64>,
    read_perm_user: Vec<i64>,
}

#[post("/training")]
pub async fn create_training_handler(
    db: web::Data<DatabaseConnection>,
    req: web::Json<CreateTrainingRequest>,
) -> ActixResult<HttpResponse> {
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    match create_training(
        &db,
        &mut redis,
        &req.title,
        &req.user_iden,
        &req.pb_iden,
        &req.description_public,
        &req.description_private,
        req.start_time,
        req.end_time,
        &req.training_type,
        &req.problem_list,
        req.write_perm_user.clone(),
        req.read_perm_user.clone(),
    ).await {
        Ok(training) => Ok(HttpResponse::Ok().json(training)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create training: {}", e)
        }))),
    }
}

#[delete("/training/{user_iden}/{training_iden}")]
pub async fn delete_training_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>,
) -> ActixResult<HttpResponse> {
    let (user_iden, training_iden) = path.into_inner();
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    match delete_training_connections(&db, &mut redis, &user_iden, &training_iden).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Training connections deleted successfully"
        }))),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Failed to delete training: {}", e)
        }))),
    }
}

#[delete("/training/{user_iden}/{training_iden}/problem/{problem_iden}")]
pub async fn remove_problem_from_training_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String, String)>,
) -> ActixResult<HttpResponse> {
    let (user_iden, training_iden, problem_iden) = path.into_inner();
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    match remove_problem_from_training(&db, &mut redis, &user_iden, &training_iden, &problem_iden).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Problem removed from training successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to remove problem from training: {}", e)
        }))),
    }
}

#[delete("/training/{training_node_id}/problem/{problem_node_id}")]
pub async fn remove_problem_from_training_by_node_id_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<(i64, i64)>,
) -> ActixResult<HttpResponse> {
    let (training_node_id, problem_node_id) = path.into_inner();
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    match remove_problem_from_training_by_node_id(&db, &mut redis, training_node_id, problem_node_id).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Problem removed from training successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to remove problem from training: {}", e)
        }))),
    }
}

#[get("/training/node/{node_id}")]
pub async fn get_training_by_node_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();

    match TrainingNode::from_db(&db, node_id).await {
        Ok(training_node) => {
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "training_node": training_node
            })))
        },
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Training not found: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct GetTrainingNodeIdsRequest {
    iden: String,
}

#[post("/training/node_ids")]
pub async fn get_training_node_ids_handler(
    db: web::Data<DatabaseConnection>,
    req: web::Json<GetTrainingNodeIdsRequest>,
) -> ActixResult<HttpResponse> {
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    match get_node_ids_from_iden(&req.iden, &db, &mut redis).await {
        Ok(node_ids) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "node_ids": node_ids
        }))),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Node IDs not found: {}", e)
        }))),
    }
}

#[get("/training/node/{node_id}/type")]
pub async fn get_training_node_type_handler(
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

#[post("/training/node/{node_id}/clear_cache")]
pub async fn clear_training_cache_handler(
    path: web::Path<i64>,
) -> ActixResult<HttpResponse> {
    let node_id = path.into_inner();
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    match redis::Commands::del::<String, i32>(&mut redis, format!("training_{node_id}")) {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Training cache cleared successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to clear training cache: {}", e)
        }))),
    }
}

#[get("/training/{user_iden}/{training_iden}")]
pub async fn get_training_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>,
) -> ActixResult<HttpResponse> {
    let (user_iden, training_iden) = path.into_inner();
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    match get_training(&db, &mut redis, &user_iden, &training_iden).await {
        Ok(training) => Ok(HttpResponse::Ok().json(training)),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Training not found: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct AddProblemToTrainingRequest {
    problem_iden: String,
}

#[post("/training/{training_node_id}/add_problem")]
pub async fn add_problem_to_training_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
    req: web::Json<AddProblemToTrainingRequest>,
) -> ActixResult<HttpResponse> {
    let training_node_id = path.into_inner();
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    match add_problem_into_training_list(&db, &mut redis, training_node_id, &req.problem_iden).await {
        Ok(problem_list) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Problem added to training successfully",
            "problem_list": problem_list
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to add problem to training: {}", e)
        }))),
    }
}

#[get("/trainings")]
pub async fn get_all_trainings_handler(
    db: web::Data<DatabaseConnection>,
) -> ActixResult<HttpResponse> {
    use sea_orm::{EntityTrait, QueryOrder};
    use core::db::entity::node::training::Entity as TrainingEntity;

    match TrainingEntity::find()
        .order_by_asc(core::db::entity::node::training::Column::NodeId)
        .all(&**db)
        .await
    {
        Ok(trainings) => {
            let training_list: Vec<serde_json::Value> = trainings
                .into_iter()
                .map(|training| {
                    serde_json::json!({
                        "node_id": training.node_id,
                        "name": training.name,
                        "iden": training.iden,
                        "description": training.description_public,
                        "training_type": training.training_type,
                        "start_time": training.start_time,
                        "end_time": training.end_time,
                    })
                })
                .collect();

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "trainings": training_list,
                "total": training_list.len()
            })))
        },
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch trainings: {}", e)
        }))),
    }
}

#[get("/training/{training_iden}/check-permission/{user_node_id}")]
pub async fn check_training_permission_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<(String, String)>, // (training_iden, user_node_id)
) -> ActixResult<HttpResponse> {
    let (training_iden, user_node_id_str) = path.into_inner();
    log::debug!("check_training_permission_handler training_iden: {}, user_node_id: {}", &training_iden, &user_node_id_str);

    let user_node_id = match user_node_id_str.parse::<i64>() {
        Ok(id) => id,
        Err(_) => return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid user_node_id"
        }))),
    };

    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    // 首先获取训练
    match get_training(&db, &mut redis, "default", &training_iden).await {
        Ok(training) => {
            // 检查用户是否有训练访问权限
            match core::model::training::check_training_permission(
                &db,
                user_node_id,
                training.training_node.node_id,
                core::graph::edge::perm_view::ViewPerm::ViewPublic,
            ).await {
                Ok(true) => Ok(HttpResponse::Ok().json(serde_json::json!({
                    "has_permission": true,
                    "message": "User has permission to access this training"
                }))),
                Ok(false) => Ok(HttpResponse::Forbidden().json(serde_json::json!({
                    "has_permission": false,
                    "message": "User does not have permission to access this training"
                }))),
                Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to check permission: {}", e)
                }))),
            }
        },
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": format!("Training not found: {}", e)
        }))),
    }
}

#[derive(serde::Deserialize)]
struct GrantTrainingAccessRequest {
    user_iden: String,
    training_iden: String,
}

#[post("/training/grant-access")]
pub async fn grant_training_access_handler(
    db: web::Data<DatabaseConnection>,
    req: web::Json<GrantTrainingAccessRequest>,
) -> ActixResult<HttpResponse> {
    let mut redis = core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();

    // 获取用户和训练节点ID
    let user_node_ids = match get_node_ids_from_iden(&req.user_iden, &db, &mut redis).await {
        Ok(ids) => ids,
        Err(_) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to find user"
        }))),
    };

    let training_node_ids = match get_node_ids_from_iden(&req.training_iden, &db, &mut redis).await {
        Ok(ids) => ids,
        Err(_) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to find training"
        }))),
    };

    if user_node_ids.is_empty() || training_node_ids.is_empty() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "User or training not found"
        })));
    }

    match core::model::training::grant_training_access(
        &db,
        user_node_ids[0],
        training_node_ids[0],
    ).await {
        Ok(()) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Training access granted successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to grant training access: {}", e)
        }))),
    }
}

pub fn service() -> Scope {
    let service1 = services![
        create_training_handler,
        delete_training_handler,
        remove_problem_from_training_handler,
        remove_problem_from_training_by_node_id_handler,
        get_training_by_node_handler,
        get_training_node_ids_handler,
        get_training_node_type_handler,
    ];

    let service2 = services![
        clear_training_cache_handler,
        get_training_handler,
        add_problem_to_training_handler,
        get_all_trainings_handler,
        check_training_permission_handler,
        grant_training_access_handler
    ];

    web::scope("/api/training")
        .service(service1)
        .service(service2)
}