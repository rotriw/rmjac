use crate::handler::{ResultHandler, HttpError, HandlerError};
use serde::{Deserialize};
use rmjac_core::model::user::{User, UserUpdateProps, SimplyUser};
use rmjac_core::graph::node::user::UserNodePublicRaw;
use macro_handler::{generate_handler, handler, perm, route, export, from_path, require_login};
use rmjac_core::model::ModelStore;
use crate::utils::perm::UserAuthCotext;
use rmjac_core::db::entity::node::user::{get_user_by_email, get_user_by_iden};
use rmjac_core::error::CoreError;


#[generate_handler(route = "/manage", real_path = "/api/user/manage")]
pub mod handler {
    use sea_orm::DatabaseConnection;
    use rmjac_core::graph::node::Node;
    use rmjac_core::graph::node::user::{UserNode, UserNodePublic};
    use rmjac_core::service::perm::provider::{System, SystemPermService};
    use super::*;
    async fn resolve_user_id(store: &impl ModelStore, iden: &str) -> ResultHandler<i64> {
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
        Err(CoreError::UserNotFound)?
    }

    #[export(uid)]
    async fn before_resolve_logout_user(store: &mut impl ModelStore, user_iden: &str) -> ResultHandler<i64> {
        resolve_user_id(store, user_iden).await
    }

    #[perm]
    #[require_login]
    async fn perm(user_context: UserAuthCotext, uid: i64) -> bool {
        if user_context.user_id == uid {
            return true;
        }
        let node_id = default_node!(default_system_node);

        if SystemPermService::verify(user_context.user_id, node_id, System::ManageAllUser) {
            return true;
        }
        false
    }


    #[derive(Deserialize, Clone)]
    pub struct UserUpdateRequest {
        pub user: String,
        pub name: Option<String>,
        pub email: Option<String>,
        pub avatar: Option<String>,
        pub description: Option<String>,
        pub bio: Option<String>,
        pub user_profile_show: Option<String>,
        pub old_password: Option<String>,
        pub new_password: Option<String>,
    }

    #[export(user_model)]
    async fn before_get_user_node(db: &DatabaseConnection, uid: i64) -> ResultHandler<User> {
        let mut user = User::new(uid);
        Ok(user)
    }

    #[handler]
    #[export("user")]
    async fn post_manage_nickname(store: &mut impl ModelStore, user_model: User, new_username: &str) -> ResultHandler<UserNodePublic> {
        let res = user_model.update_config(store.get_db(), UserUpdateProps {
            name: Some(new_username.to_string()),
            ..Default::default()
        }).await?;
        Ok(res.public)
    }

    #[handler]
    #[export("user")]
    async fn post_manage_description(store: &mut impl ModelStore, user_model: User, new_description: &str) -> ResultHandler<UserNodePublic> {
        let res = user_model.update_config(store.get_db(), UserUpdateProps {
            description: Some(new_description.to_string()),
            ..Default::default()
        }).await?;
        Ok(res.public)
    }

    #[handler]
    #[route("/logout/{user_iden}")]
    #[perm(check_logout_perm)]
    #[export("message")]
    async fn post_logout(store: &mut impl ModelStore, user_id: i64) -> ResultHandler<String> {
        let user = User::new(user_id);
        user.revoke_all_tokens(store.get_db()).await?;
        Ok("user tokens have been revoked".to_string())
    }
}
