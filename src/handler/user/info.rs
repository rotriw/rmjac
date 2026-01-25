use crate::handler::HttpError;
use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, route};
use rmjac_core::db::entity::node::user::{get_user_by_email, get_user_by_iden};
use rmjac_core::error::CoreError;
use rmjac_core::model::ModelStore;
use rmjac_core::model::user::{SimplyUser, User};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct UserIden {
    pub id: String,
}

#[derive(Deserialize)]
pub struct SidebarQuery {
    pub path: String,
}

#[generate_handler(route = "info", real_path = "/api/user/info")]
pub mod handler {
    use rmjac_core::model::user::SidebarItem;

    use super::*;

    async fn resolve_user_id(store: &impl ModelStore, iden: &str) -> Result<i64, HttpError> {
        let db = store.get_db();
        if let Ok(user) = get_user_by_iden(db, iden).await {
            return Ok(user.node_id);
        }
        if let Ok(user) = get_user_by_email(db, iden).await {
            return Ok(user.node_id);
        }
        if let Ok(uid) = iden.parse::<i64>() {
            return Ok(uid);
        }
        Err(HttpError::CoreError(CoreError::UserNotFound))
    }

    #[from_path(iden)]
    #[export(user_id)]
    async fn before_resolve(store: &mut impl ModelStore, iden: &str) -> ResultHandler<i64> {
        resolve_user_id(store, iden).await
    }

    #[handler]
    #[route("/check_iden/{id}")]
    #[export("exists")]
    async fn get_check_iden(store: &mut impl ModelStore, id: String) -> ResultHandler<bool> {
        let exists = User::identifier_exists(store.get_db(), id.as_str()).await?;
        Ok(exists)
    }

    #[handler]
    #[route("/profile/{iden}")]
    #[export("user")]
    async fn get_profile(
        store: &mut impl ModelStore,
        user_id: i64,
    ) -> ResultHandler<SimplyUser> {
        let user = SimplyUser::load(store.get_db(), user_id).await?;
        Ok(user)
    }

    #[handler]
    #[route("/info")]
    #[export("is_login", "user")]
    async fn get_user_info(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
    ) -> ResultHandler<(bool, Option<SimplyUser>)> {
        if let Some(uc) = user_context
            && uc.is_real
        {
            let user = SimplyUser::load(store.get_db(), uc.user_id).await?;
            Ok((true, Some(user)))
        } else {
            Ok((false, None))
        }
    }

    #[handler]
    #[route("/sidebar")]
    #[export("is_login", "user", "sidebar")]
    async fn get_sidebar(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        _path: Option<String>,
    ) -> ResultHandler<(bool, Option<SimplyUser>, Vec<SidebarItem>)> {
        let basic_sidebar = vec![
            SidebarItem {
                title: "主页".to_string(),
                url: "/".to_string(),
                show: None,
                reg: None,
                icon: "Home".to_string(),
                number: None,
            },
            SidebarItem {
                title: "题单".to_string(),
                url: "/training".to_string(),
                show: None,
                reg: None,
                icon: "ClipboardCheckIcon".to_string(),
                number: None,
            },
            SidebarItem {
                title: "用户详情".to_string(),
                url: "[current]".to_string(),
                show: Some("/user/.*".to_string()),
                reg: Some("/user/.*".to_string()),
                icon: "User2".to_string(),
                number: None,
            },
            SidebarItem {
                title: "题目详情".to_string(),
                url: "[current]".to_string(),
                show: Some("/problem/.*".to_string()),
                reg: Some("/problem/.*".to_string()),
                icon: "BookMinusIcon".to_string(),
                number: None,
            },
            SidebarItem {
                title: "训练详情".to_string(),
                url: "[current]".to_string(),
                show: Some("/training/.*".to_string()),
                reg: Some("/training/.*".to_string()),
                icon: "BookMinusIcon".to_string(),
                number: None,
            },
        ];

        if let Some(uc) = &user_context
            && uc.is_real
        {
            let mut log_out = basic_sidebar.clone();
            log_out.push(SidebarItem {
                title: "我的记录".to_string(),
                url: "/record".to_string(),
                show: None,
                reg: None,
                icon: "DiscIcon".to_string(),
                number: None,
            });
            log_out.push(SidebarItem {
                title: "Vjudge 服务".to_string(),
                url: "/vjudge/account".to_string(),
                show: None,
                reg: None,
                icon: "Cloud".to_string(),
                number: None,
            });
            log_out.push(SidebarItem {
                title: "登出".to_string(),
                url: "/logout".to_string(),
                show: None,
                reg: None,
                icon: "LogOut".to_string(),
                number: None,
            });
            let user = SimplyUser::load(store.get_db(), uc.user_id).await?;
            Ok((true, Some(user), log_out))
        } else {
            let mut no_login_sidebar = basic_sidebar;
            no_login_sidebar.push(SidebarItem {
                title: "登录/注册".to_string(),
                url: "/login".to_string(),
                show: None,
                reg: None,
                icon: "LogInIcon".to_string(),
                number: None,
            });
            Ok((false, None, no_login_sidebar))
        }
    }
}
