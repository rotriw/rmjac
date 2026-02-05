use crate::handler::ResultHandler;
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, generate_handler, handler, perm, require_login, route};
use rmjac_core::db::entity::node::user::{get_user_by_email, get_user_by_iden};
use rmjac_core::error::CoreError;
use rmjac_core::model::ModelStore;
use rmjac_core::model::user::{User, UserUpdateProps};
use serde::Deserialize;

#[generate_handler(route = "/manage", real_path = "/api/user/manage")]
pub mod handler {
    use super::*;
    use rmjac_core::graph::node::Node;
    use rmjac_core::graph::node::user::{UserNode, UserNodePublic};
    use rmjac_core::service::perm::provider::{System, SystemPermService};
    use sea_orm::DatabaseConnection;
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
    async fn before_resolve_logout_user(
        store: &mut impl ModelStore,
        user_iden: &str,
    ) -> ResultHandler<i64> {
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
    #[handler]
    #[perm(perm)]
    #[route("/nick_name")]
    #[export("user")]
    async fn post_manage_nickname(
        store: &mut impl ModelStore,
        user_name: &str,
        user_id: i64,
    ) -> ResultHandler<UserNodePublic> {
        let res = User::new(user_id)
            .update_config(
                store.get_db(),
                UserUpdateProps {
                    name: Some(user_name.to_string()),
                    ..Default::default()
                },
            )
            .await?;
        Ok(res.public)
    }

    #[handler]
    #[perm(perm)]
    #[export("user")]
    #[route("/description")]
    async fn post_manage_description(
        store: &mut impl ModelStore,
        user_id: i64,
        new_description: &str,
    ) -> ResultHandler<UserNodePublic> {
        let res = User::new(user_id)
            .update_config(
                store.get_db(),
                UserUpdateProps {
                    description: Some(new_description.to_string()),
                    ..Default::default()
                },
            )
            .await?;
        Ok(res.public)
    }

    #[handler]
    #[perm(perm)]
    #[export("user")]
    #[route("/avatar")]
    async fn post_manage_avatar(
        store: &mut impl ModelStore,
        user_id: i64,
        new_avatar: &str,
    ) -> ResultHandler<UserNodePublic> {
        let res = User::new(user_id)
            .update_config(
                store.get_db(),
                UserUpdateProps {
                    avatar: Some(new_avatar.to_string()),
                    ..Default::default()
                },
            )
            .await?;
        Ok(res.public)
    }

    #[handler]
    #[route("/logout/{user_iden}")]
    #[perm(perm)]
    #[export("message")]
    async fn post_logout(store: &mut impl ModelStore, user_id: i64) -> ResultHandler<String> {
        let user = User::new(user_id);
        user.revoke_all_tokens(store.get_db()).await?;
        Ok("user tokens have been revoked".to_string())
    }
}
