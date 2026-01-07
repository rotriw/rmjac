use actix_web::{web, Scope, HttpMessage};
use rmjac_core::error::CoreError;
use crate::handler::{BasicHandler, ResultHandler, HttpError, HandlerError};
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
use serde::Deserialize;
use macro_handler::{generate_handler, handler, from_path, export, perm, route};

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
pub struct ListByIdsReq {
    pub ids: Vec<i64>,
}

// Bind Account Handler - 绑定账号
#[generate_handler]
mod bind {
    use super::*;

    #[handler("/bind")]
    pub struct Bind {
        basic: BasicHandler,
    }

    impl Bind {
        #[perm]
        async fn check_bind_perm(&self) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/")]
        async fn post_bind(&self, data: BindAccountReq) -> ResultHandler<String> {
            let user_id = self.basic.user_context.as_ref().unwrap().user_id;
            
            let platform = match data.platform.to_lowercase().as_str() {
                "codeforces" => Platform::Codeforces,
                "atcoder" => Platform::Atcoder,
                _ => return Err(HttpError::HandlerError(HandlerError::InvalidInput("Invalid platform".to_string()))),
            };
            let remote_mode = match (platform, data.method.to_lowercase().as_str()) {
                (Platform::Codeforces, "password") => RemoteMode::SyncCode,
                (Platform::Codeforces, "token") => RemoteMode::SyncCode,
                (Platform::Codeforces, "apikey") => RemoteMode::OnlySync,
                (Platform::Atcoder, "password") => RemoteMode::SyncCode,
                (Platform::Atcoder, "token") => RemoteMode::SyncCode,
                _ => return Err(HttpError::HandlerError(HandlerError::InvalidInput("Invalid method for platform".to_string()))),
            };

            let result = VjudgeAccount::create(
                &self.basic.db,
                user_id,
                data.iden,
                data.platform.clone(),
                remote_mode,
                data.auth.clone(),
                data.bypass_check.unwrap_or(false),
                data.ws_id.clone(),
            ).await;

            match result {
                Ok(node) => Ok(Json! {
                    "code": 0,
                    "msg": "Success",
                    "data": node
                }),
                Err(AddErrorResult::CoreError(e)) => Err(HttpError::CoreError(e)),
                Err(AddErrorResult::Warning(msg, node)) => Ok(Json! {
                    "code": 1,
                    "msg": msg,
                    "data": node
                }),
            }
        }
    }
}

// My Accounts Handler - 我的账号列表
#[generate_handler]
mod my_accounts {
    use super::*;

    #[handler("/my_accounts")]
    pub struct MyAccounts {
        basic: BasicHandler,
    }

    impl MyAccounts {
        #[perm]
        async fn check_perm(&self) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/")]
        async fn get_my_accounts(&self) -> ResultHandler<String> {
            let user_id = self.basic.user_context.as_ref().unwrap().user_id;
            let accounts = VjudgeAccount::list(&self.basic.db, user_id).await?;
            Ok(Json! {
                "code": 0,
                "data": accounts
            })
        }
    }
}

// List By Ids Handler - 根据ID列表查询账号
#[generate_handler]
mod list_by_ids {
    use super::*;

    #[handler("/list")]
    pub struct ListByIds {
        basic: BasicHandler,
    }

    impl ListByIds {
        #[perm]
        async fn check_perm(&self) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/list_by_ids")]
        async fn post_list_by_ids(&self, data: ListByIdsReq) -> ResultHandler<String> {
            let uc = self.basic.user_context.as_ref().unwrap();
            let is_admin = VjudgeAccount::can_manage(uc.user_id);
            
            let mut results = vec![];
            for id in &data.ids {
                if (is_admin || VjudgeAccount::new(*id).owned_by(&self.basic.db, uc.user_id).await.unwrap_or(false))
                    && let Ok(node) = VjudgeAccount::get(&self.basic.db, *id).await {
                    results.push(node);
                }
            }
            Ok(Json! {
                "code": 0,
                "data": results
            })
        }
    }
}

// Account Management Handler - 账号管理（增删改查）
#[generate_handler]
mod account {
    use super::*;

    #[handler("/account")]
    pub struct Account {
        basic: BasicHandler,
    }

    impl Account {
        #[from_path(node_id)]
        #[export(account_node_id)]
        async fn before_resolve(&self, node_id: &str) -> ResultHandler<i64> {
            let account_node_id = node_id.parse::<i64>()
                .map_err(|e| HttpError::CoreError(CoreError::StringError(format!("Invalid node_id: {}", e))))?;
            Ok(account_node_id)
        }

        #[perm]
        async fn check_manage_perm(&self, account_node_id: i64) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                VjudgeAccount::can_manage(uc.user_id) || 
                    VjudgeAccount::new(account_node_id).owned_by(&self.basic.db, uc.user_id).await.unwrap_or(false)
            } else {
                false
            }
        }

        #[handler]
        #[route("/{node_id}")]
        async fn get_detail(&self, account_node_id: i64) -> ResultHandler<String> {
            let node = VjudgeAccount::get(&self.basic.db, account_node_id).await?;
            Ok(Json! {
                "code": 0,
                "data": node
            })
        }

        #[handler]
        #[route("/{node_id}")]
        async fn delete_account(&self, account_node_id: i64) -> ResultHandler<String> {
            VjudgeAccount::new(account_node_id).rm(&self.basic.db).await?;
            Ok(Json! {
                "code": 0,
                "msg": "Deleted"
            })
        }
    }
}

// Account Update Handler - 账号更新（需要body数据）
#[generate_handler]
mod account_update {
    use super::*;

    #[handler("/update")]
    pub struct AccountUpdate {
        basic: BasicHandler,
    }

    impl AccountUpdate {
        #[perm]
        async fn check_perm(&self) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/account")]
        async fn put_update(&self, data: UpdateAccountReq) -> ResultHandler<String> {
            let uc = self.basic.user_context.as_ref().unwrap();
            
            // 检查权限
            if !VjudgeAccount::can_manage(uc.user_id) && 
               !VjudgeAccount::new(data.node_id).owned_by(&self.basic.db, uc.user_id).await.unwrap_or(false) {
                return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
            }
            
            VjudgeAccount::new(data.node_id).set_auth(&self.basic.db, data.auth).await?;
            Ok(Json! {
                "code": 0,
                "msg": "Update success"
            })
        }
    }
}

// Task Management Handler - 任务管理
#[generate_handler]
mod task {
    use super::*;

    #[handler("/tasks")]
    pub struct Task {
        basic: BasicHandler,
    }

    impl Task {
        #[from_path(node_id)]
        #[export(vjudge_node_id)]
        async fn before_resolve(&self, node_id: &str) -> ResultHandler<i64> {
            let vjudge_node_id = node_id.parse::<i64>()
                .map_err(|e| HttpError::CoreError(CoreError::StringError(format!("Invalid node_id: {}", e))))?;
            Ok(vjudge_node_id)
        }

        #[perm]
        async fn check_task_perm(&self, vjudge_node_id: i64) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                VjudgeAccount::can_manage(uc.user_id) || 
                    VjudgeAccount::new(vjudge_node_id).owned_by(&self.basic.db, uc.user_id).await.unwrap_or(false)
            } else {
                false
            }
        }

        #[handler]
        #[route("/{node_id}")]
        async fn get_tasks(&self, vjudge_node_id: i64) -> ResultHandler<String> {
            let tasks = VjudgeTask::list(&self.basic.db, vjudge_node_id).await?;
            Ok(Json! {
                "code": 0,
                "data": tasks
            })
        }
    }
}

// Assign Task Handler - 分配任务
#[generate_handler]
mod assign_task {
    use super::*;

    #[handler("/assign_task")]
    pub struct AssignTask {
        basic: BasicHandler,
    }

    impl AssignTask {
        #[perm]
        async fn check_perm(&self) -> bool {
            if let Some(uc) = &self.basic.user_context && uc.is_real {
                true
            } else {
                false
            }
        }

        #[handler]
        #[route("/")]
        async fn post_assign(&self, data: AssignTaskReq) -> ResultHandler<String> {
            let uc = self.basic.user_context.as_ref().unwrap();
            
            // 检查权限
            if !VjudgeAccount::can_manage(uc.user_id) && 
               !VjudgeAccount::new(data.vjudge_node_id).owned_by(&self.basic.db, uc.user_id).await.unwrap_or(false) {
                return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
            }
            
            // Check verified
            let node = VjudgeAccount::get(&self.basic.db, data.vjudge_node_id).await?;
            if !node.public.verified {
                return Err(HttpError::CoreError(CoreError::VjudgeError("Account not verified".to_string())));
            }

            let task = VjudgeAccount::new(data.vjudge_node_id).add_task(
                &self.basic.db,
                uc.user_id,
                data.range.clone(),
                data.ws_id.clone()
            ).await?;
            
            // Fetch task node to return
            let task_node = VjudgeTaskNode::from_db(&self.basic.db, task.node_id).await?;

            Ok(Json! {
                "code": 0,
                "msg": "Task assigned",
                "data": task_node
            })
        }
    }
}

pub fn service() -> Scope {
    web::scope("/api/vjudge")
        .service(bind::Bind::export_http_service())
        .service(my_accounts::MyAccounts::export_http_service())
        .service(list_by_ids::ListByIds::export_http_service())
        .service(account::Account::export_http_service())
        .service(account_update::AccountUpdate::export_http_service())
        .service(task::Task::export_http_service())
        .service(assign_task::AssignTask::export_http_service())
}
