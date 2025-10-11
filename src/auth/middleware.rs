use actix_web::{
    dev::{forward_ready, Service, ServiceRequest, ServiceResponse, Transform},
    error::Error,
    web, HttpMessage, HttpResponse, Result,
};
use futures_util::future::{ok, Ready};
use sea_orm::DatabaseConnection;

use crate::{
    graph::edge::perm_view::{PermViewEdgeQuery, ViewPerm},
    graph::edge::perm_manage::{PermManageEdgeQuery, ManagePerm},
    model::perm::check_perm,
    auth::AuthContext,
};

/// 权限要求
#[derive(Debug, Clone)]
pub struct PermissionRequirement {
    pub view_perm: Option<ViewPerm>,
    pub manage_perm: Option<ManagePerm>,
    pub resource_from_path: Option<String>, // 从路径中提取资源ID的参数名
}

impl PermissionRequirement {
    /// 只需要查看权限
    pub fn view_only(perm: ViewPerm) -> Self {
        Self {
            view_perm: Some(perm),
            manage_perm: None,
            resource_from_path: None,
        }
    }

    /// 只需要管理权限
    pub fn manage_only(perm: ManagePerm) -> Self {
        Self {
            view_perm: None,
            manage_perm: Some(perm),
            resource_from_path: None,
        }
    }

    /// 需要查看和管理权限
    pub fn both(view: ViewPerm, manage: ManagePerm) -> Self {
        Self {
            view_perm: Some(view),
            manage_perm: Some(manage),
            resource_from_path: None,
        }
    }

    /// 从路径提取资源ID
    pub fn resource_from_path(mut self, path_param: &str) -> Self {
        self.resource_from_path = Some(path_param.to_string());
        self
    }
}

/// 权限验证中间件
pub struct AuthMiddleware {
    permission_requirement: PermissionRequirement,
    user_from_token: bool, // 是否从token中获取用户信息
}

impl AuthMiddleware {
    pub fn new(permission_requirement: PermissionRequirement) -> Self {
        Self {
            permission_requirement,
            user_from_token: true,
        }
    }

    pub fn with_token(mut self) -> Self {
        self.user_from_token = true;
        self
    }

    pub fn without_token(mut self) -> Self {
        self.user_from_token = false;
        self
    }
}

impl<S, B> Transform<S, ServiceRequest> for AuthMiddleware
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Transform = AuthMiddlewareService<S>;
    type InitError = ();

    fn new_transform(&self, service: S) -> Result<Self::Transform, Self::InitError> {
        Ok(AuthMiddlewareService {
            service,
            permission_requirement: self.permission_requirement.clone(),
            user_from_token: self.user_from_token,
        })
    }
}

pub struct AuthMiddlewareService<S> {
    service: S,
    permission_requirement: PermissionRequirement,
    user_from_token: bool,
}

impl<S, B> Service<ServiceRequest> for AuthMiddlewareService<S>
where
    S: Service<ServiceRequest, Response = ServiceResponse<B>, Error = Error>,
    S::Future: 'static,
    B: 'static,
{
    type Response = ServiceResponse<B>;
    type Error = Error;
    type Future = Ready<Result<Self::Response, Self::Error>>;

    fn poll_ready(&self, cx: &mut std::task::Context<'_>) -> std::task::Poll<Result<(), Self::Error>> {
        self.service.poll_ready(cx)
    }

    fn call(&self, req: ServiceRequest) -> Self::Future {
        // 获取数据库连接
        let db = req.app_data::<DatabaseConnection>().unwrap().clone();

        // 如果需要从token获取用户信息
        if self.user_from_token {
            if let Some(token) = extract_token_from_request(&req) {
                // 尝试验证token并获取用户
                let user_node_id = match authenticate_token(&db, &token) {
                    Ok(Some(id)) => id,
                    Ok(None) => {
                        // 没有找到用户，直接放行（可选：拒绝访问）
                        return ok(Ok(req.into_response(
                            HttpResponse::Unauthorized().json(serde_json::json!({
                                "error": "Invalid or expired token"
                            }))
                        )));
                    }
                    Err(_) => {
                        // token验证失败
                        return ok(Ok(req.into_response(
                            HttpResponse::InternalServerError().json(serde_json::json!({
                                "error": "Authentication failed"
                            }))
                        )));
                    }
                };

                // 将用户信息存入request extensions
                req.extensions_mut().insert(AuthUser {
                    user_node_id,
                    token: token.clone(),
                });
            }
        }

        // 如果有权限要求，进行权限检查
        if let Some(view_perm) = self.permission_requirement.view_perm {
            if let Err(response) = check_permission(&db, &req, view_perm, None) {
                return ok(Ok(response));
            }
        }

        if let Some(manage_perm) = self.permission_requirement.manage_perm {
            if let Err(response) = check_permission(&db, &req, None, Some(manage_perm)) {
                return ok(Ok(response));
            }
        }

        // 权限验证通过，继续处理请求
        forward_ready(req, self.service.clone())
    }
}

/// 从请求中提取token
fn extract_token_from_request(req: &ServiceRequest) -> Option<String> {
    // 尝试从Authorization头获取
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if auth_str.starts_with("Bearer ") {
                return Some(auth_str.trim_start_matches("Bearer ").to_string());
            }
        }
    }

    // 尝试从查询参数获取
    if let Some(query) = req.uri().query() {
        for param in query.split('&') {
            if let Some((key, value)) = param.split_once('=') {
                if key == "token" {
                    return Some(value.to_string());
                }
            }
        }
    }

    // 尝试从cookie获取
    if let Some(cookie_header) = req.headers().get("Cookie") {
        if let Ok(cookies) = cookie_header.to_str() {
            for cookie in cookies.split(';') {
                let cookie = cookie.trim();
                if let Some((key, value)) = cookie.split_once('=') {
                    if key.trim() == "auth_token" {
                        return Some(value.to_string());
                    }
                }
            }
        }
    }

    None
}

/// 通过token验证用户身份
fn authenticate_token(db: &DatabaseConnection, token: &str) -> Result<Option<i64>, Error> {
    use actix_web::rt::task::spawn_blocking;
    use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};

    // 同步调用异步函数
    let db = db.clone();
    let token = token.to_string();

    match spawn_blocking(async move {
        let mut redis = crate::env::REDIS_CLIENT.lock().unwrap().get_connection().unwrap();
        crate::auth::AuthManager::authenticate_user(&db, &mut redis, &token).await
    }).await.map_err(|_| {
        actix_web::error::ErrorInternalServerError("Authentication service error")
    })? {
        Ok(Some(ctx)) => Ok(Some(ctx.user_node_id)),
        Ok(None) => Ok(None),
        Err(e) => {
            log::error!("Token authentication error: {}", e);
            Err(actix_web::error::ErrorInternalServerError("Authentication error"))
        }
    }
}

/// 检查权限
fn check_permission(
    db: &DatabaseConnection,
    req: &ServiceRequest,
    required_view_perm: Option<ViewPerm>,
    required_manage_perm: Option<ManagePerm>,
) -> Result<(), HttpResponse> {
    // 从request extensions获取用户信息
    let user = req.extensions().get::<AuthUser>();
    if user.is_none() {
        return Err(HttpResponse::Unauthorized().json(serde_json::json!({
            "error": "User not authenticated"
        })));
    }

    let user_node_id = user.unwrap().user_node_id;

    // 从路径或请求参数中获取资源ID
    let resource_node_id = extract_resource_id(req);
    if resource_node_id.is_none() {
        return Err(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Resource ID not found in request"
        })));
    }

    let resource_node_id = resource_node_id.unwrap();

    // 使用tokio运行时检查权限
    let db = db.clone();
    match actix_web::rt::task::spawn_blocking(async move {
        if let Some(view_perm) = required_view_perm {
            match check_perm(
                &db,
                user_node_id,
                resource_node_id,
                PermViewEdgeQuery,
                view_perm.get_const_isize().unwrap() as i64,
            ).await {
                1 => Ok(()),
                _ => Err("View permission denied"),
            }
        } else if let Some(manage_perm) = required_manage_perm {
            match check_perm(
                &db,
                user_node_id,
                resource_node_id,
                PermManageEdgeQuery,
                manage_perm.get_const_isize().unwrap() as i64,
            ).await {
                1 => Ok(()),
                _ => Err("Manage permission denied"),
            }
        } else {
            Ok(())
        }
    }).await.map_err(|_| {
        HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Permission check service error"
        }))
    })? {
        Ok(_) => Ok(()),
        Err(e) => Err(HttpResponse::Forbidden().json(serde_json::json!({
            "error": e,
            "message": "Permission denied"
        }))),
    }
}

/// 从请求中提取资源ID
fn extract_resource_id(req: &ServiceRequest) -> Option<i64> {
    // 尝试从路径参数中提取
    let path = req.path();
    let segments: Vec<&str> = path.split('/').collect();

    for segment in segments {
        if let Ok(id) = segment.parse::<i64>() {
            return Some(id);
        }
    }

    // 尝试从查询参数中提取
    if let Some(query) = req.uri().query() {
        for param in query.split('&') {
            if let Some((key, value)) = param.split_once('=') {
                if key == "resource_id" || key == "node_id" {
                    if let Ok(id) = value.parse::<i64>() {
                        return Some(id);
                    }
                }
            }
        }
    }

    None
}

/// 认证用户信息
#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_node_id: i64,
    pub token: String,
}

/// 权限验证宏
#[macro_export]
macro_rules! require_permission {
    ($view_perm:expr) => {
        AuthMiddleware::new(PermissionRequirement::view_only($view_perm))
    };
    ($view_perm:expr, $manage_perm:expr) => {
        AuthMiddleware::new(PermissionRequirement::both($view_perm, $manage_perm))
    };
}