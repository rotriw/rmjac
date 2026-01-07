use actix_web::{get, post, delete, put, web, HttpRequest, Scope, HttpMessage};
use sea_orm::DatabaseConnection;
use rmjac_core::error::CoreError;
use crate::handler::{ResultHandler, HttpError, HandlerError};
use crate::utils::perm::UserAuthCotext;
use rmjac_core::model::vjudge::{
    VjudgeAccount,
    VjudgeTask,
    Platform,
    AddErrorResult
};
use rmjac_core::graph::node::user::remote_account::{
    RemoteMode, VjudgeAuth
};
use rmjac_core::graph::node::vjudge_task::VjudgeTaskNode;
use rmjac_core::graph::node::Node;
use serde::{Deserialize};
use serde_json::json;

#[derive(Deserialize)]
pub struct BindAccountReq {
    pub platform: String,
    pub method: String,
    pub auth: Option<VjudgeAuth>,
    pub bypass_check: Option<bool>,
    pub ws_id: Option<String>,
    pub iden: String,
}

#[derive(Deserialize)]
pub struct UpdateAccountReq {
    pub node_id: i64,
    pub auth: Option<VjudgeAuth>,
}

#[derive(Deserialize)]
pub struct AssignTaskReq {
    pub vjudge_node_id: i64,
    pub range: String,
    pub ws_id: Option<String>,
}

#[derive(Deserialize)]
pub struct IdReq {
    pub node_id: i64,
}

#[derive(Deserialize)]
pub struct ListByIdsReq {
    pub ids: Vec<i64>,
}

// --- Bind Account Handler ---
pub struct BindAccount {
    db: DatabaseConnection,
    data: BindAccountReq,
    user_id: Option<i64>,
}

impl BindAccount {
    pub fn entry(_req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<BindAccountReq>) -> Self {
        Self {
            db: db.get_ref().clone(),
            data: data.into_inner(),
            user_id: None,
        }
    }

    pub async fn perm(mut self, req: HttpRequest) -> ResultHandler<Self> {
        let user_context = req.extensions().get::<UserAuthCotext>().cloned();
        if let Some(uc) = user_context && uc.is_real {
            self.user_id = Some(uc.user_id);
            Ok(self)
        } else {
            Err(HttpError::HandlerError(HandlerError::PermissionDenied))
        }
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let platform = match self.data.platform.to_lowercase().as_str() {
            "codeforces" => Platform::Codeforces,
            "atcoder" => Platform::Atcoder,
            _ => return Err(HttpError::HandlerError(HandlerError::InvalidInput("Invalid platform".to_string()))),
        };
        let remote_mode = match (platform, self.data.method.to_lowercase().as_str()) {
            (Platform::Codeforces, "password") => RemoteMode::SyncCode,
            (Platform::Codeforces, "token") => RemoteMode::SyncCode,
            (Platform::Codeforces, "apikey") => RemoteMode::OnlySync,
            (Platform::Atcoder, "password") => RemoteMode::SyncCode,
            (Platform::Atcoder, "token") => RemoteMode::SyncCode,
            _ => return Err(HttpError::HandlerError(HandlerError::InvalidInput("Invalid method for platform".to_string()))),
        };

        let result = VjudgeAccount::create(
            &self.db,
            self.user_id.unwrap(),
            self.data.iden,
            self.data.platform.clone(),
            remote_mode,
            self.data.auth.clone(),
            self.data.bypass_check.unwrap_or(false),
            self.data.ws_id.clone(),
        ).await;

        match result {
            Ok(node) => Ok(json!({
                "code": 0,
                "msg": "Success",
                "data": node
            }).to_string()),
            Err(AddErrorResult::CoreError(e)) => Err(HttpError::CoreError(e)),
            Err(AddErrorResult::Warning(msg, node)) => Ok(json!({
                "code": 1,
                "msg": msg,
                "data": node
            }).to_string()),
        }
    }
}

#[post("/bind")]
pub async fn bind_vjudge_account(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<BindAccountReq>,
) -> ResultHandler<String> {
    BindAccount::entry(req.clone(), db, data).perm(req).await?.exec().await
}

// --- My Accounts Handler ---
pub struct MyAccounts {
    db: DatabaseConnection,
    user_id: Option<i64>,
}

impl MyAccounts {
    pub fn entry(_req: HttpRequest, db: web::Data<DatabaseConnection>) -> Self {
        Self {
            db: db.get_ref().clone(),
            user_id: None,
        }
    }

    pub async fn perm(mut self, req: HttpRequest) -> ResultHandler<Self> {
        let user_context = req.extensions().get::<UserAuthCotext>().cloned();
        if let Some(uc) = user_context && uc.is_real {
            self.user_id = Some(uc.user_id);
            Ok(self)
        } else {
            Err(HttpError::HandlerError(HandlerError::PermissionDenied))
        }
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let accounts = VjudgeAccount::list(&self.db, self.user_id.unwrap()).await?;
        Ok(json!({
            "code": 0,
            "data": accounts
        }).to_string())
    }
}

#[get("/my_accounts")]
pub async fn list_my_vjudge_accounts(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
) -> ResultHandler<String> {
    MyAccounts::entry(req.clone(), db).perm(req).await?.exec().await
}


// --- List Accounts By Ids ---
pub struct AccountList {
    db: DatabaseConnection,
    data: ListByIdsReq,
    user_id: Option<i64>,
    is_admin: bool,
}

impl AccountList {
    pub fn entry(_req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<ListByIdsReq>) -> Self {
        Self {
            db: db.get_ref().clone(),
            data: data.into_inner(),
            user_id: None,
            is_admin: false,
        }
    }

    pub async fn perm(mut self, req: HttpRequest) -> ResultHandler<Self> {
        let user_context = req.extensions().get::<UserAuthCotext>().cloned();
        if let Some(uc) = user_context && uc.is_real {
            self.user_id = Some(uc.user_id);
            self.is_admin = VjudgeAccount::can_manage(uc.user_id);
            Ok(self)
        } else {
            Err(HttpError::HandlerError(HandlerError::PermissionDenied))
        }
    }

    pub async fn exec(self) -> ResultHandler<String> {
        let mut results = vec![];
        let uid = self.user_id.unwrap();
        for id in &self.data.ids {
            if self.is_admin || VjudgeAccount::new(*id).owned_by(&self.db, uid).await.unwrap_or(false) {
                if let Ok(node) = VjudgeAccount::get(&self.db, *id).await {
                    results.push(node);
                }
            }
        }
        Ok(json!({
            "code": 0,
            "data": results
        }).to_string())
    }
}

#[post("/list_by_ids")]
pub async fn list_vjudge_accounts_by_id(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<ListByIdsReq>,
) -> ResultHandler<String> {
    AccountList::entry(req.clone(), db, data).perm(req).await?.exec().await
}


// --- Account Management (Delete, Update, Detail) ---
pub struct AccountManage {
    db: DatabaseConnection,
    node_id: i64,
    update_data: Option<UpdateAccountReq>,
    user_id: Option<i64>,
}

impl AccountManage {
    pub fn entry_delete(_req: HttpRequest, db: web::Data<DatabaseConnection>, path: web::Path<i64>) -> Self {
        Self {
            db: db.get_ref().clone(),
            node_id: path.into_inner(),
            update_data: None,
            user_id: None,
        }
    }

    pub fn entry_update(_req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<UpdateAccountReq>) -> Self {
        let inner = data.into_inner();
        Self {
            db: db.get_ref().clone(),
            node_id: inner.node_id,
            update_data: Some(inner),
            user_id: None,
        }
    }

    pub fn entry_detail(_req: HttpRequest, db: web::Data<DatabaseConnection>, path: web::Path<i64>) -> Self {
        Self {
            db: db.get_ref().clone(),
            node_id: path.into_inner(),
            update_data: None,
            user_id: None,
        }
    }

    pub async fn perm(mut self, req: HttpRequest) -> ResultHandler<Self> {
        let user_context = req.extensions().get::<UserAuthCotext>().cloned();
        if let Some(uc) = user_context && uc.is_real {
            self.user_id = Some(uc.user_id);
            if VjudgeAccount::can_manage(uc.user_id) || VjudgeAccount::new(self.node_id).owned_by(&self.db, uc.user_id).await.unwrap_or(false) {
                Ok(self)
            } else {
                Err(HttpError::HandlerError(HandlerError::PermissionDenied))
            }
        } else {
            Err(HttpError::HandlerError(HandlerError::PermissionDenied))
        }
    }

    pub async fn exec_delete(self) -> ResultHandler<String> {
        VjudgeAccount::new(self.node_id).rm(&self.db).await?;
        Ok(json!({
            "code": 0,
            "msg": "Deleted"
        }).to_string())
    }

    pub async fn exec_update(self) -> ResultHandler<String> {
        VjudgeAccount::new(self.node_id).set_auth(&self.db, self.update_data.unwrap().auth).await?;
         Ok(json!({
            "code": 0,
            "msg": "Update success"
        }).to_string())
    }

    pub async fn exec_detail(self) -> ResultHandler<String> {
        let node = VjudgeAccount::get(&self.db, self.node_id).await?;
        Ok(json!({
            "code": 0,
            "data": node
        }).to_string())
    }
}

#[delete("/account/{node_id}")]
pub async fn delete_vjudge_account(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ResultHandler<String> {
    AccountManage::entry_delete(req.clone(), db, path).perm(req).await?.exec_delete().await
}

#[put("/account")]
pub async fn update_vjudge_account(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<UpdateAccountReq>,
) -> ResultHandler<String> {
    AccountManage::entry_update(req.clone(), db, data).perm(req).await?.exec_update().await
}

#[get("/account/{node_id}")]
pub async fn get_vjudge_account_detail(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ResultHandler<String> {
    AccountManage::entry_detail(req.clone(), db, path).perm(req).await?.exec_detail().await
}


// --- Task Management ---
pub struct TaskManage {
    db: DatabaseConnection,
    node_id: i64,
    assign_data: Option<AssignTaskReq>,
    user_id: Option<i64>,
}

impl TaskManage {
    pub fn entry_assign(_req: HttpRequest, db: web::Data<DatabaseConnection>, data: web::Json<AssignTaskReq>) -> Self {
        let inner = data.into_inner();
        Self {
            db: db.get_ref().clone(),
            node_id: inner.vjudge_node_id,
            assign_data: Some(inner),
            user_id: None,
        }
    }

    pub fn entry_list(_req: HttpRequest, db: web::Data<DatabaseConnection>, path: web::Path<i64>) -> Self {
        Self {
            db: db.get_ref().clone(),
            node_id: path.into_inner(),
            assign_data: None,
            user_id: None,
        }
    }

    pub async fn perm(mut self, req: HttpRequest) -> ResultHandler<Self> {
        let user_context = req.extensions().get::<UserAuthCotext>().cloned();
        if let Some(uc) = user_context && uc.is_real {
            self.user_id = Some(uc.user_id);
            if VjudgeAccount::can_manage(uc.user_id) || VjudgeAccount::new(self.node_id).owned_by(&self.db, uc.user_id).await.unwrap_or(false) {
                Ok(self)
            } else {
                Err(HttpError::HandlerError(HandlerError::PermissionDenied))
            }
        } else {
            Err(HttpError::HandlerError(HandlerError::PermissionDenied))
        }
    }

    pub async fn exec_assign(self) -> ResultHandler<String> {
        let data = self.assign_data.unwrap();
        // Check verified
        let node = VjudgeAccount::get(&self.db, self.node_id).await?;
        if !node.public.verified {
             return Err(HttpError::CoreError(CoreError::VjudgeError("Account not verified".to_string())));
        }

        let task = VjudgeAccount::new(self.node_id).add_task(
            &self.db,
            self.user_id.unwrap(),
            data.range.clone(),
            data.ws_id.clone()
        ).await?;
        
        // Fetch task node to return
        let task_node = VjudgeTaskNode::from_db(&self.db, task.node_id).await?;

        Ok(json!({
            "code": 0,
            "msg": "Task assigned",
            "data": task_node
        }).to_string())
    }

    pub async fn exec_list(self) -> ResultHandler<String> {
        let tasks = VjudgeTask::list(&self.db, self.node_id).await?;
         Ok(json!({
            "code": 0,
            "data": tasks
        }).to_string())
    }
}

#[post("/assign_task")]
pub async fn assign_vjudge_task_handler(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    data: web::Json<AssignTaskReq>,
) -> ResultHandler<String> {
    TaskManage::entry_assign(req.clone(), db, data).perm(req).await?.exec_assign().await
}

#[get("/tasks/{node_id}")]
pub async fn list_vjudge_tasks_handler(
    req: HttpRequest,
    db: web::Data<DatabaseConnection>,
    path: web::Path<i64>,
) -> ResultHandler<String> {
    TaskManage::entry_list(req.clone(), db, path).perm(req).await?.exec_list().await
}


pub fn service() -> Scope {
    web::scope("/api/vjudge")
        .service(bind_vjudge_account)
        .service(list_my_vjudge_accounts)
        .service(list_vjudge_accounts_by_id)
        .service(delete_vjudge_account)
        .service(update_vjudge_account)
        .service(get_vjudge_account_detail)
        .service(assign_vjudge_task_handler)
        .service(list_vjudge_tasks_handler)
}