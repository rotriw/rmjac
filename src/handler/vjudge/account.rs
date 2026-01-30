use crate::handler::{HandlerError, HttpError, ResultHandler};
use crate::utils::perm::UserAuthCotext;
use macro_handler::{export, from_path, generate_handler, handler, perm, route};
use rmjac_core::error::CoreError;
use rmjac_core::model::ModelStore;
use rmjac_core::model::vjudge::VjudgeAccount;

#[generate_handler(route = "/account", real_path = "/api/vjudge/account")]
pub mod handler {
    use rmjac_core::graph::node::user::remote_account::VjudgeNode;

    use super::*;

    #[from_path(node_id)]
    #[export(account_node_id)]
    async fn before_resolve(node_id: &str) -> ResultHandler<i64> {
        let account_node_id = node_id.parse::<i64>().map_err(|e| {
            HttpError::CoreError(CoreError::StringError(format!("Invalid node_id: {}", e)))
        })?;
        Ok(account_node_id)
    }

    #[perm]
    async fn check_login(user_context: Option<UserAuthCotext>) -> bool {
        if let Some(uc) = user_context
            && uc.is_real
        {
            true
        } else {
            false
        }
    }

    #[handler]
    #[perm(check_login)]
    #[route("/{node_id}")]
    #[export("data")]
    async fn get_detail(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        account_node_id: i64,
    ) -> ResultHandler<VjudgeNode> {
        let uc = user_context.unwrap();
        // Permission check
        if !VjudgeAccount::can_manage(uc.user_id)
            && !VjudgeAccount::new(account_node_id)
                .owned_by(store.get_db(), uc.user_id)
                .await
                .unwrap_or(false)
        {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        }

        let node = VjudgeAccount::get(store.get_db(), account_node_id).await?;
        Ok(node)
    }

    #[handler]
    #[perm(check_login)]
    #[route("/delete/{node_id}")]
    #[export("message")]
    async fn post_delete_account(
        store: &mut impl ModelStore,
        user_context: Option<UserAuthCotext>,
        account_node_id: i64,
    ) -> ResultHandler<String> {
        let uc = user_context.unwrap();
        // Permission check
        if !VjudgeAccount::can_manage(uc.user_id)
            && !VjudgeAccount::new(account_node_id)
                .owned_by(store.get_db(), uc.user_id)
                .await
                .unwrap_or(false)
        {
            return Err(HttpError::HandlerError(HandlerError::PermissionDenied));
        }

        VjudgeAccount::new(account_node_id)
            .rm(store.get_db())
            .await?;
        Ok("deleted".to_string())
    }
    
}
