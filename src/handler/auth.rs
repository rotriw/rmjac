use actix_web::{get, web, HttpResponse, Result as ActixResult, Scope, services};
use sea_orm::DatabaseConnection;

use core::{
    graph::edge::perm_view::PermViewEdgeQuery,
    graph::edge::perm_manage::PermManageEdgeQuery,
    graph::edge::EdgeQueryPerm,
    service::iden::get_node_ids_from_iden,
};

// Helper function to get Redis connection
fn get_redis_connection() -> redis::Connection {
    core::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap()
}

#[get("/user/{user_iden}/permissions")]
pub async fn get_user_permissions_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
) -> ActixResult<HttpResponse> {
    let user_iden = path.into_inner();
    let mut redis = get_redis_connection();

    // 获取用户节点ID
    let user_node_ids = match get_node_ids_from_iden(&user_iden, &db, &mut redis).await {
        Ok(ids) => ids,
        Err(e) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to find user: {}", e)
        }))),
    };

    if user_node_ids.is_empty() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "User not found"
        })));
    }

    let user_node_id = user_node_ids[0];

    // 获取用户的所有查看权限
    let view_permissions = match PermViewEdgeQuery::get_perm_v(user_node_id, &db).await {
        Ok(permissions) => permissions,
        Err(e) => {
            log::error!("Failed to get view permissions: {}", e);
            vec![]
        }
    };

    // 获取用户的所有管理权限
    let manage_permissions = match PermManageEdgeQuery::get_perm_v(user_node_id, &db).await {
        Ok(permissions) => permissions,
        Err(e) => {
            log::error!("Failed to get manage permissions: {}", e);
            vec![]
        }
    };

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "user_iden": user_iden,
        "user_node_id": user_node_id,
        "view_permissions": view_permissions,
        "manage_permissions": manage_permissions
    })))
}

#[get("/permissions/view")]
pub async fn list_view_permissions_handler() -> ActixResult<HttpResponse> {
    let permissions = vec![
        serde_json::json!({
            "name": "ReadProblem",
            "description": "Read problem content",
            "value": 1
        }),
        serde_json::json!({
            "name": "ViewPublic",
            "description": "View public information",
            "value": 2
        }),
        serde_json::json!({
            "name": "ViewPrivate",
            "description": "View private information",
            "value": 4
        }),
        serde_json::json!({
            "name": "All",
            "description": "All view permissions",
            "value": -1
        }),
    ];

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "permissions": permissions
    })))
}

#[get("/permissions/manage")]
pub async fn list_manage_permissions_handler() -> ActixResult<HttpResponse> {
    let permissions = vec![
        serde_json::json!({
            "name": "ManageStatement",
            "description": "Manage problem statements",
            "value": 1
        }),
        serde_json::json!({
            "name": "ManageEdge",
            "description": "Manage connections between nodes",
            "value": 2
        }),
        serde_json::json!({
            "name": "ManagePublicDescription",
            "description": "Manage public descriptions",
            "value": 4
        }),
        serde_json::json!({
            "name": "ManagePrivateDescription",
            "description": "Manage private descriptions",
            "value": 8
        }),
    ];

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "permissions": permissions
    })))
}

#[get("/resource/{resource_iden}/permissions")]
pub async fn get_resource_permissions_handler(
    db: web::Data<DatabaseConnection>,
    path: web::Path<String>,
) -> ActixResult<HttpResponse> {
    let resource_iden = path.into_inner();
    let mut redis = get_redis_connection();

    // 获取资源节点ID
    let resource_node_ids = match get_node_ids_from_iden(&resource_iden, &db, &mut redis).await {
        Ok(ids) => ids,
        Err(e) => return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to find resource: {}", e)
        }))),
    };

    if resource_node_ids.is_empty() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Resource not found"
        })));
    }

    let resource_node_id = resource_node_ids[0];

    // 简化版本：只返回基本信息，权限查询功能后续可以扩展
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "resource_iden": resource_iden,
        "resource_node_id": resource_node_id,
        "message": "Resource found. Detailed permission queries require additional implementation."
    })))
}

pub fn service() -> Scope {
    let service = services![
        get_user_permissions_handler,
        list_view_permissions_handler,
        list_manage_permissions_handler,
        get_resource_permissions_handler
    ];
    web::scope("/api/auth").service(service)
}